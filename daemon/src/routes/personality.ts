/**
 * tRPC sub-router: personality
 * SPEC §6.9.4.4 — read-only preset list + detail
 * M1.5 Task 5 (Subset B)
 *
 * Reads from <repo-root>/prompts/personalities/*.md
 * Extracts: name (filename without .md), description (frontmatter or leading HTML comment),
 *           summary (first 100 chars of body), full body
 */
import { z } from "zod";
import { readdir, readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc.js";
import { findGitRoot } from "../project/detect.js";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const presetSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  summary: z.string(),
});

const presetDetailSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  body: z.string(),
});

export type Preset = z.infer<typeof presetSchema>;
export type PresetDetail = z.infer<typeof presetDetailSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the personalities directory from the git root.
 * Falls back to cwd-based heuristic if git root is not available.
 */
function resolvePersonalitiesDir(): string {
  const gitRoot = findGitRoot(process.cwd());
  const base = gitRoot ?? process.cwd();
  return join(base, "prompts", "personalities");
}

/**
 * Extract description from a markdown file content.
 * Supports:
 *  1. HTML comment on first line: <!-- description: ... -->
 *  2. YAML frontmatter description field (--- / description: ... / ---)
 *  3. First h1 heading after stripping frontmatter (# Personality: <name>)
 *  4. Falls back to empty string
 */
function extractDescription(content: string): string {
  // Try HTML comment with explicit "description:" key
  const htmlCommentDesc = content.match(/<!--\s*description:\s*(.+?)\s*-->/is);
  if (htmlCommentDesc) {
    return htmlCommentDesc[1].trim();
  }

  // Try any HTML comment on leading lines (used in default.md as the personality comment)
  const leadingHtmlComment = content.match(/^<!--(.+?)-->/s);
  if (leadingHtmlComment) {
    // Use full comment content trimmed
    const commentText = leadingHtmlComment[1].trim();
    // Take first non-empty line from comment
    const firstLine = commentText
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0);
    if (firstLine) return firstLine;
  }

  // Try YAML frontmatter: ---\n...\ndescription: ...\n...\n---
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatter) {
    const descMatch = frontmatter[1].match(/^description:\s*(.+)$/m);
    if (descMatch) return descMatch[1].trim();
  }

  // Try first H1/H2 heading: # Personality: <name>
  const headingMatch = content.match(/^#+\s+(.+)$/m);
  if (headingMatch) return headingMatch[1].trim();

  return "";
}

/**
 * Extract body text for summary: strip frontmatter and leading HTML comments,
 * then return first 100 chars of actual content.
 */
function extractSummary(content: string): string {
  let body = content;

  // Strip leading HTML comments
  body = body.replace(/^(<!--[\s\S]*?-->\s*)+/, "");

  // Strip YAML frontmatter
  body = body.replace(/^---\n[\s\S]*?\n---\s*\n?/, "");

  // Collapse whitespace and take first 100 chars
  const trimmed = body.trim();
  return trimmed.length > 100 ? trimmed.slice(0, 100) : trimmed;
}

/**
 * Load a single preset from a .md file path.
 */
async function loadPreset(filePath: string): Promise<Preset> {
  const content = await readFile(filePath, "utf-8");
  const name = basename(filePath, ".md");
  const description = extractDescription(content);
  const summary = extractSummary(content);
  return { name, description, summary };
}

/**
 * Load full preset detail from a .md file path.
 */
async function loadPresetDetail(filePath: string): Promise<PresetDetail> {
  const content = await readFile(filePath, "utf-8");
  const name = basename(filePath, ".md");
  const description = extractDescription(content);
  return { name, description, body: content };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const personalityRouter = router({
  /**
   * list: return all presets from prompts/personalities/*.md
   * Each entry: { name, description, summary }
   */
  list: publicProcedure.query(async (): Promise<Preset[]> => {
    const dir = resolvePersonalitiesDir();
    let files: string[];
    try {
      const entries = await readdir(dir);
      files = entries.filter((f) => f.endsWith(".md")).sort();
    } catch {
      // directory missing → return empty list rather than crashing
      return [];
    }

    const presets = await Promise.all(files.map((f) => loadPreset(join(dir, f))));
    return presets;
  }),

  /**
   * detail: return full preset body + metadata for a named preset.
   * Throws TRPCError NOT_FOUND if the preset does not exist.
   */
  detail: publicProcedure
    .input(z.object({ name: z.string().min(1).regex(/^[\w-]+$/, "Invalid preset name") }))
    .query(async ({ input }): Promise<PresetDetail> => {
      const dir = resolvePersonalitiesDir();
      const filePath = join(dir, `${input.name}.md`);
      try {
        return await loadPresetDetail(filePath);
      } catch (err: unknown) {
        const nodeErr = err as NodeJS.ErrnoException;
        if (nodeErr.code === "ENOENT") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Personality preset '${input.name}' not found`,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to read preset '${input.name}'`,
          cause: err,
        });
      }
    }),
});
