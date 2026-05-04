/**
 * phase-b-runner.ts — Phase B semantic analysis via claude -p subprocess
 * SPEC §7.4
 *
 * WHY separated from phase-a-runner: SRP — Phase B owns the Claude CLI invocation
 * side-effect path (subprocess + JSON parse + DB insert + broadcast). Phase A is
 * pure grep screening. Keeping them separate means Phase A tests never need to
 * stub claude CLI.
 *
 * WHY external prompt template file (not inline string literal): §3.6.10 SSoT —
 * prompt template is its own concern (version-controlled, editable without code
 * change). Embedded string literals make iteration harder.
 *
 * Accepts pre-injected DB client for testability (no module-level singleton).
 */
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";

import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createDBClient } from "../db/client.js";
import { consistencyFindings } from "../db/schema.js";
import { FINDING_TYPE, FINDING_SEVERITY, FINDING_STATUS, FindingTypeSchema, FindingSeveritySchema } from "../constants/consistency.js";
import { runClaudeCLI, DEFAULT_CLAUDE_TIMEOUT } from "../lib/claude-cli.js";
import { broadcaster } from "../events/broadcaster.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DB = ReturnType<typeof createDBClient>;

// Zod schema for a single finding returned by claude -p
// WHY defensive validate (not type cast): claude output format may vary by version.
// Invalid entries are skipped (graceful skip) per task spec.
const ClaudeFindingSchema = z.object({
  target_path: z.string(),
  finding_type: FindingTypeSchema,
  severity: FindingSeveritySchema,
  description: z.string(),
  suggested_change: z.string().nullable().optional(),
});

type ClaudeFinding = z.infer<typeof ClaudeFindingSchema>;

// ---------------------------------------------------------------------------
// Prompt template loader (external file, §3.6.10)
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_TEMPLATE_PATH = join(__dirname, "prompts", "phase-b-system.md");

async function loadPromptTemplate(): Promise<string> {
  return readFile(PROMPT_TEMPLATE_PATH, "utf-8");
}

// ---------------------------------------------------------------------------
// CLI not found error (for route-level degraded mode detection)
// ---------------------------------------------------------------------------

export class CliNotFoundError extends Error {
  readonly code = "CLI_NOT_FOUND";
  constructor() {
    super("cli_not_found");
    this.name = "CliNotFoundError";
  }
}

// ---------------------------------------------------------------------------
// runPhaseB
// ---------------------------------------------------------------------------

/**
 * Run Phase B semantic analysis for candidate files flagged by Phase A.
 *
 * For each candidate file:
 *   1. Build prompt from external template + SPEC diff + file content
 *   2. Invoke claude -p via runClaudeCLI
 *   3. Parse + validate findings (skip invalid entries)
 *   4. INSERT valid findings into consistency_findings
 *   5. Emit finding.new event via broadcaster
 *
 * Returns the total number of findings inserted.
 *
 * WHY throws CliNotFoundError (not returns 0 silently): the route layer needs to
 * distinguish "CLI absent" (set phaseBExecuted:false + degradedReason) from
 * "ran but found 0 findings" (phaseBExecuted:true, findingsCreated:0).
 *
 * @param specChangeId    FK reference to spec_changes row
 * @param candidateFiles  File paths flagged by Phase A (may be empty)
 * @param specDiff        Raw diff string from the spec_changes row
 * @param db              Pre-injected DB client
 * @param claudeCmd       Override claude CLI command (default: 'claude')
 * @param timeoutMs       CLI subprocess timeout ms (default: DEFAULT_CLAUDE_TIMEOUT)
 */
export async function runPhaseB(
  specChangeId: number,
  candidateFiles: string[],
  specDiff: string,
  db: DB,
  claudeCmd?: string,
  timeoutMs: number = DEFAULT_CLAUDE_TIMEOUT,
): Promise<number> {
  if (candidateFiles.length === 0) {
    return 0;
  }

  const systemTemplate = await loadPromptTemplate();
  let totalInserted = 0;

  for (const filePath of candidateFiles) {
    // Read file content (best-effort — skip on read error)
    let fileContent: string;
    try {
      fileContent = await readFile(filePath, "utf-8");
    } catch {
      // WHY skip: same rationale as Phase A — doc files may not exist in all environments
      continue;
    }

    // Build prompt: system template + SPEC diff + file content
    const prompt = buildPrompt(systemTemplate, specDiff, filePath, fileContent);

    // Invoke claude -p
    const cliResult = await runClaudeCLI(prompt, {
      cmd: claudeCmd,
      timeout: timeoutMs,
    });

    if (!cliResult.ok) {
      if (cliResult.reason === "cli_not_found") {
        // Signal degraded mode to route layer via typed error
        throw new CliNotFoundError();
      }
      // Other errors (timeout, parse_error, subprocess_error) — log and skip this file
      // WHY skip not throw: a single file failure shouldn't abort the whole batch
      continue;
    }

    // Parse and validate findings array
    const rawFindings = Array.isArray(cliResult.output) ? cliResult.output : [];
    const validFindings: ClaudeFinding[] = [];

    for (const raw of rawFindings) {
      const parsed = ClaudeFindingSchema.safeParse(raw);
      if (parsed.success) {
        validFindings.push(parsed.data);
      }
      // WHY silently skip: defensive per task spec — invalid entries from claude are
      // not fatal; we keep whatever is valid.
    }

    // INSERT valid findings + broadcast
    const now = new Date();
    for (const finding of validFindings) {
      const [inserted] = await db
        .insert(consistencyFindings)
        .values({
          specChangeId,
          targetPath: finding.target_path,
          severity: finding.severity,
          findingType: finding.finding_type,
          description: finding.description,
          suggestedChange: finding.suggested_change ?? null,
          status: FINDING_STATUS.OPEN,
          createdAt: now,
        })
        .returning();

      totalInserted += 1;

      // Emit WS event immediately after INSERT (SPEC §7.5 Step 5)
      broadcaster.emitFindingNew({
        findingId: String(inserted.id),
        severity: finding.severity,
        targetDoc: finding.target_path,
        message: finding.description,
      });
    }
  }

  return totalInserted;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Build the prompt string for claude -p.
 * WHY: separates prompt construction from CLI invocation — makes testing easier
 * (unit test can verify prompt content without subprocess).
 */
function buildPrompt(
  systemTemplate: string,
  specDiff: string,
  filePath: string,
  fileContent: string,
): string {
  // WHY truncate at 30KB: single file < 30KB assumption per task spec.
  // Prevents hitting claude CLI input limits with unexpectedly large files.
  const MAX_FILE_BYTES = 30 * 1024;
  const truncatedContent =
    fileContent.length > MAX_FILE_BYTES
      ? fileContent.slice(0, MAX_FILE_BYTES) + "\n[... content truncated ...]"
      : fileContent;

  return [
    systemTemplate,
    "",
    `SPEC diff:`,
    specDiff,
    "",
    `Target file (${filePath}):`,
    truncatedContent,
  ].join("\n");
}
