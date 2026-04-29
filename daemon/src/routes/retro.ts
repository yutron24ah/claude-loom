/**
 * tRPC sub-router: retro
 * SPEC §3.9 + SCREEN_REQUIREMENTS §3.7 / §4.6 (Q1 retro UI backend)
 * M1.5 Task 3
 *
 * Procedures:
 *   list        — query: glob docs/retro/<id>-report.md + project-prefs last_retro
 *   detail      — query: archive markdown + pending.json
 *   userDecision — mutation: update pending.json finding decision
 *   trigger     — mutation: generate new retro_id, initialize state
 *
 * Note: subscription emit (broadcaster.emitRetroStateChange) is deferred to Task 9.
 */
import { z } from "zod";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
  readdirSync,
} from "node:fs";
import { join, dirname, basename } from "node:path";
import { homedir } from "node:os";
import { nanoid } from "nanoid";
import { router, publicProcedure, TRPCErrorClass } from "../trpc.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RetroSession {
  retroId: string;
  projectId?: string;
  /** Milestone tag extracted from report frontmatter if present */
  milestone?: string;
  /** Date string from retroId prefix (YYYY-MM-DD) */
  date: string;
  /** Number of findings in the report */
  findingCount: number;
  /** Whether a pending.json exists for this retro */
  hasPending: boolean;
}

export interface PendingFinding {
  id: string;
  lens?: string;
  severity?: string;
  category?: string;
  summary?: string;
  guidance?: string;
  /** User decision: null = not yet decided */
  user_decision?: "accept" | "reject" | "defer" | "discuss" | null;
}

export interface PendingState {
  retro_id: string;
  created_at?: string;
  findings: PendingFinding[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve repo root (cwd at daemon startup) */
function repoRoot(): string {
  return process.cwd();
}

/** Path to docs/retro/<retroId>-report.md */
function archivePath(retroId: string): string {
  return join(repoRoot(), "docs", "retro", `${retroId}-report.md`);
}

/** Path to <project>/.claude-loom/retro/<retroId>/pending.json
 *  For now we use repoRoot() as the project root (M1.5 scope).
 *  Full project-id → root resolution deferred to Task 10 wire-up.
 */
function pendingPath(retroId: string, projectRoot?: string): string {
  const base = projectRoot ?? repoRoot();
  return join(base, ".claude-loom", "retro", retroId, "pending.json");
}

/** Path to project-prefs.json */
function projectPrefsPath(projectRoot?: string): string {
  const base = projectRoot ?? repoRoot();
  return join(base, ".claude-loom", "project-prefs.json");
}

/** Extract finding count from archive markdown (rough heuristic on "###" headings or "id:" keys) */
function extractFindingCount(content: string): number {
  // Count occurrences of '  "id":' in JSON blocks (retro report format)
  // or "finding-" prefix strings
  const idMatches = content.match(/"id":\s*"(?:finding|pj|proc|res|meta)/g);
  if (idMatches) return idMatches.length;
  // Fallback: count ## headings that look like finding sections
  const headingMatches = content.match(/^###\s+.+$/gm);
  return headingMatches ? Math.max(0, headingMatches.length - 1) : 0;
}

/** Extract milestone from archive markdown frontmatter or body */
function extractMilestone(content: string): string | undefined {
  // Try "milestone:" or "scope:" or "対象 milestone"
  const milestoneMatch = content.match(/\*\*milestone[^:]*\*\*[:\s]+([^\n]+)/i) ||
    content.match(/milestone:\s*([^\n]+)/i) ||
    content.match(/scope[^:]*:\s*([^\n]*milestone[^\n]*)/i);
  if (milestoneMatch) return milestoneMatch[1].trim();
  return undefined;
}

/** Atomic JSON write — tmp + rename (M1 config.ts pattern) */
function atomicWriteJson(filePath: string, data: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmpPath = join(dirname(filePath), `.tmp-${nanoid(8)}.json`);
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  renameSync(tmpPath, filePath);
}

/** Read and parse JSON file, return null if not found */
function readJsonOrNull<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

/** Generate a new retro_id in <YYYY-MM-DD>-NNN format */
function generateRetroId(): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const retroDir = join(repoRoot(), "docs", "retro");

  let existingCount = 0;
  if (existsSync(retroDir)) {
    const files = readdirSync(retroDir);
    existingCount = files.filter(
      (f) => f.startsWith(today) && f.endsWith("-report.md")
    ).length;
  }

  const seq = String(existingCount + 1).padStart(3, "0");
  return `${today}-${seq}`;
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

// SECURITY: retroId は basename only、path traversal 防止
// 形式: YYYY-MM-DD-NNN（generateRetroId と整合）
const retroIdSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}-\d{3}$/, "retroId must match YYYY-MM-DD-NNN format");

const retroSessionSchema = z.object({
  retroId: z.string(),
  projectId: z.string().optional(),
  milestone: z.string().optional(),
  date: z.string(),
  findingCount: z.number(),
  hasPending: z.boolean(),
});

const pendingFindingSchema = z.object({
  id: z.string(),
  lens: z.string().optional(),
  severity: z.string().optional(),
  category: z.string().optional(),
  summary: z.string().optional(),
  guidance: z.string().optional(),
  user_decision: z
    .enum(["accept", "reject", "defer", "discuss"])
    .nullable()
    .optional(),
});

const pendingStateSchema = z.object({
  retro_id: z.string(),
  created_at: z.string().optional(),
  findings: z.array(pendingFindingSchema),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const retroRouter = router({
  /**
   * list: Return a summary of past retro sessions.
   * Globs docs/retro/*-report.md files + checks project-prefs last_retro.
   */
  list: publicProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }): Promise<RetroSession[]> => {
      const retroDir = join(repoRoot(), "docs", "retro");

      if (!existsSync(retroDir)) {
        return [];
      }

      const files = readdirSync(retroDir).filter((f) =>
        f.endsWith("-report.md")
      );

      const sessions: RetroSession[] = [];

      for (const file of files) {
        const retroId = basename(file, "-report.md");
        const filePath = join(retroDir, file);
        let content = "";
        try {
          content = readFileSync(filePath, "utf-8");
        } catch {
          continue;
        }

        // Extract date from retroId prefix (YYYY-MM-DD)
        const dateMatch = retroId.match(/^(\d{4}-\d{2}-\d{2})/);
        const date = dateMatch ? dateMatch[1] : retroId;

        const findingCount = extractFindingCount(content);
        const milestone = extractMilestone(content);
        const hasPending = existsSync(pendingPath(retroId));

        sessions.push({
          retroId,
          projectId: input.projectId,
          milestone,
          date,
          findingCount,
          hasPending,
        });
      }

      // Sort descending by retroId (date prefix sorts correctly)
      sessions.sort((a, b) => b.retroId.localeCompare(a.retroId));

      // Also incorporate project-prefs last_retro if not already listed
      const prefs = readJsonOrNull<{ last_retro?: { id?: string; milestone?: string; completed_at?: number } }>(
        projectPrefsPath()
      );
      if (prefs?.last_retro?.id) {
        const alreadyListed = sessions.some((s) => s.retroId === prefs.last_retro!.id);
        if (!alreadyListed) {
          const lastRetroId = prefs.last_retro.id;
          const dateMatch = lastRetroId.match(/^(\d{4}-\d{2}-\d{2})/);
          sessions.unshift({
            retroId: lastRetroId,
            projectId: input.projectId,
            milestone: prefs.last_retro.milestone,
            date: dateMatch ? dateMatch[1] : lastRetroId,
            findingCount: 0,
            hasPending: existsSync(pendingPath(lastRetroId)),
          });
        }
      }

      if (input.limit !== undefined) {
        return sessions.slice(0, input.limit);
      }

      return sessions;
    }),

  /**
   * detail: Return archive markdown + pending state for a retro.
   */
  detail: publicProcedure
    .input(z.object({ retroId: retroIdSchema }))
    .query(
      async ({
        input,
      }): Promise<{ archive: string; pending: PendingState | null }> => {
        const archiveFile = archivePath(input.retroId);

        if (!existsSync(archiveFile)) {
          throw new TRPCErrorClass({
            code: "NOT_FOUND",
            message: `Retro archive not found: ${input.retroId}`,
          });
        }

        const archive = readFileSync(archiveFile, "utf-8");

        const pendingFile = pendingPath(input.retroId);
        const pending = readJsonOrNull<PendingState>(pendingFile);

        return { archive, pending };
      }
    ),

  /**
   * userDecision: Update a finding's user_decision in pending.json.
   */
  userDecision: publicProcedure
    .input(
      z.object({
        retroId: retroIdSchema,
        findingId: z.string(),
        decision: z.enum(["accept", "reject", "defer", "discuss"]),
      })
    )
    .mutation(async ({ input }): Promise<{ success: boolean }> => {
      const pendingFile = pendingPath(input.retroId);

      if (!existsSync(pendingFile)) {
        throw new TRPCErrorClass({
          code: "NOT_FOUND",
          message: `Pending state not found for retro: ${input.retroId}`,
        });
      }

      const state = readJsonOrNull<PendingState>(pendingFile);
      if (!state) {
        throw new TRPCErrorClass({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to parse pending.json for retro: ${input.retroId}`,
        });
      }

      const finding = state.findings.find((f) => f.id === input.findingId);
      if (!finding) {
        throw new TRPCErrorClass({
          code: "NOT_FOUND",
          message: `Finding not found: ${input.findingId} in retro ${input.retroId}`,
        });
      }

      finding.user_decision = input.decision;

      atomicWriteJson(pendingFile, state);

      // TODO(Task 9): broadcaster.emitRetroStateChange({ retroId: input.retroId, findingId: input.findingId, decision: input.decision })

      return { success: true };
    }),

  /**
   * trigger: Generate a new retro_id and initialize state.
   * Actual lens parallel dispatch is deferred to M2/M3 (requires UI flow).
   */
  trigger: publicProcedure
    .input(
      z.object({
        scope: z.string().optional(),
      })
    )
    .mutation(async ({ input }): Promise<{ retroId: string }> => {
      const retroId = generateRetroId();

      // Initialize pending state file
      const initialState: PendingState = {
        retro_id: retroId,
        created_at: new Date().toISOString(),
        findings: [],
      };

      const pendingFile = pendingPath(retroId);
      atomicWriteJson(pendingFile, initialState);

      // TODO(Task 9): broadcaster.emitRetroTriggered({ retroId, scope: input.scope })

      return { retroId };
    }),
});
