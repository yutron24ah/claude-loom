/**
 * tRPC sub-router: prefs
 * SPEC §6.9 / §6.9.1 / §6.9.2 / §6.9.4
 * SCREEN_REQUIREMENTS §3.8/§3.10/§3.11 / §4.7/§4.9/§4.10 (Q2/Q4/Q5)
 * M1.5 Task 4
 *
 * Procedures:
 *   user.get             — query: read ~/.claude-loom/user-prefs.json
 *   user.set             — mutation: merge + atomic write
 *   project.get          — query: read <project>/.claude-loom/project-prefs.json
 *   project.set          — mutation: merge + atomic write
 *   learnedGuidance.toggle — mutation: toggle active flag on a learned_guidance entry
 *   learnedGuidance.delete — mutation: hard delete a learned_guidance entry
 *
 * Note: subscription emit (broadcaster.emitLearnedGuidanceChange) is deferred to Task 9.
 */
import { z } from "zod";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { nanoid } from "nanoid";
import { router, publicProcedure, TRPCErrorClass } from "../trpc.js";

// ---------------------------------------------------------------------------
// File paths
// ---------------------------------------------------------------------------

const USER_PREFS_PATH = join(homedir(), ".claude-loom", "user-prefs.json");

// SECURITY: projectId は basename only、path traversal 防止
// 形式: nanoid (英数字 + ハイフン + アンダースコア) のみ許容
const projectIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]+$/, "projectId must be alphanumeric with - or _ only")
  .min(1)
  .max(64);

/** Resolve project root from projectId.
 *  M1.5 inline: scan ~/.claude-loom registered projects OR fall back to cwd.
 *  Full DB-backed resolution deferred to Task 10 wire-up.
 *  For single-project usage, cwd = repo root is the common case.
 *  SECURITY: projectIdSchema (basename only) 経由で zod validation 済 input 前提。
 */
function resolveProjectRoot(projectId: string): string {
  // Defense in depth: even if input bypassed zod, basename strip
  const safe = projectId.replace(/[^A-Za-z0-9_-]/g, "");
  if (safe !== projectId || safe.length === 0) {
    throw new Error(`Invalid projectId: ${projectId}`);
  }
  // Try registered projects in ~/.claude-loom/projects/<projectId>/root
  const registeredRoot = join(homedir(), ".claude-loom", "projects", safe, "root");
  if (existsSync(registeredRoot)) {
    return readFileSync(registeredRoot, "utf-8").trim();
  }
  // Fallback: cwd (works for the self-hosted claude-loom workflow)
  return process.cwd();
}

function projectPrefsPath(projectId: string): string {
  const root = resolveProjectRoot(projectId);
  return join(root, ".claude-loom", "project-prefs.json");
}

// ---------------------------------------------------------------------------
// Atomic write helper (M1 config.ts pattern: nanoid tmp + rename)
// ---------------------------------------------------------------------------

function atomicWriteJson(filePath: string, data: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmpPath = join(dirname(filePath), `.prefs-${nanoid(8)}.tmp`);
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  renameSync(tmpPath, filePath);
}

function readJsonOrDefault<T>(filePath: string, defaultValue: T): T {
  if (!existsSync(filePath)) return defaultValue;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return defaultValue;
  }
}

// ---------------------------------------------------------------------------
// Zod schemas (SPEC §6.9.1 / §6.9.2 / §6.9.4)
// ---------------------------------------------------------------------------

const lensConfigSchema = z.object({
  weight: z.number().optional(),
  enabled: z.boolean().optional(),
});

const autoApplySchema = z.object({
  categories: z.array(z.string()).optional(),
  max_risk: z.enum(["never", "low", "medium", "high"]).optional(),
});

const communicationStyleSchema = z.object({
  verbosity: z.enum(["terse", "balanced", "verbose"]).optional(),
  language_preference: z.string().optional(),
});

const learnedGuidanceEntrySchema = z.object({
  id: z.string(),
  added_at: z.string().optional(),
  from_retro: z.string().optional(),
  from_finding_id: z.string().optional(),
  category: z.string().optional(),
  guidance: z.string(),
  active: z.boolean(),
  ttl_sessions: z.number().nullable().optional(),
  use_count: z.number().optional(),
});

const personalitySchema = z.union([
  z.string(),
  z.object({
    preset: z.string(),
    custom: z.string().optional(),
  }),
  z.null(),
]);

const agentPrefsSchema = z.object({
  model: z.enum(["opus", "sonnet", "haiku"]).nullable().optional(),
  personality: personalitySchema.optional(),
  learned_guidance: z.array(learnedGuidanceEntrySchema).optional(),
});

// User prefs (§6.9.1)
export const userPrefsSchema = z.object({
  $schema: z.string().optional(),
  schema_version: z.number().optional(),
  default_retro_mode: z.enum(["conversation", "report"]).optional(),
  lenses: z.record(lensConfigSchema).optional(),
  auto_apply: autoApplySchema.optional(),
  approval_history: z.record(z.object({
    presented_count: z.number().optional(),
    approved_count: z.number().optional(),
    rejected_count: z.number().optional(),
    last_updated: z.number().optional(),
  })).optional(),
  communication_style: communicationStyleSchema.optional(),
  retro_session_history: z.array(z.unknown()).optional(),
  agents: z.record(agentPrefsSchema).optional(),
});

// Project prefs (§6.9.2)
export const projectPrefsSchema = z.object({
  $schema: z.string().optional(),
  schema_version: z.number().optional(),
  lenses: z.record(lensConfigSchema).optional(),
  auto_apply: autoApplySchema.optional(),
  last_retro: z.object({
    id: z.string().optional(),
    milestone: z.string().optional(),
    completed_at: z.number().optional(),
  }).optional(),
  learned_patterns: z.object({
    common_blockers: z.array(z.unknown()).optional(),
    frequent_finding_categories: z.array(z.unknown()).optional(),
  }).optional(),
  agents: z.record(agentPrefsSchema).optional(),
  worktree: z.object({
    base_path: z.string().optional(),
    auto_cleanup: z.boolean().optional(),
    max_concurrent: z.number().optional(),
  }).optional(),
});

export type UserPrefs = z.infer<typeof userPrefsSchema>;
export type ProjectPrefs = z.infer<typeof projectPrefsSchema>;
export type LearnedGuidanceEntry = z.infer<typeof learnedGuidanceEntrySchema>;

// Partial schemas for patch inputs
const partialUserPrefsSchema = userPrefsSchema.partial();
const partialProjectPrefsSchema = projectPrefsSchema.partial();

// Shared scope schema
const scopeSchema = z.enum(["user", "project"]);

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_USER_PREFS: UserPrefs = {
  schema_version: 1,
  default_retro_mode: "conversation",
  lenses: {
    "pj-axis": { weight: 1.0, enabled: true },
    "process-axis": { weight: 1.0, enabled: true },
    researcher: { weight: 1.0, enabled: true },
    "meta-axis": { weight: 1.0, enabled: true },
  },
  auto_apply: { categories: [], max_risk: "never" },
  approval_history: {},
  communication_style: { verbosity: "balanced", language_preference: "ja" },
  retro_session_history: [],
  agents: {},
};

const DEFAULT_PROJECT_PREFS: ProjectPrefs = {
  schema_version: 1,
  lenses: {},
  auto_apply: { categories: [], max_risk: "never" },
  learned_patterns: { common_blockers: [], frequent_finding_categories: [] },
  agents: {},
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function readUserPrefs(): UserPrefs {
  return readJsonOrDefault(USER_PREFS_PATH, DEFAULT_USER_PREFS);
}

function writeUserPrefs(prefs: UserPrefs): void {
  atomicWriteJson(USER_PREFS_PATH, prefs);
}

function readProjectPrefs(projectId: string): ProjectPrefs {
  return readJsonOrDefault(projectPrefsPath(projectId), DEFAULT_PROJECT_PREFS);
}

function writeProjectPrefs(projectId: string, prefs: ProjectPrefs): void {
  atomicWriteJson(projectPrefsPath(projectId), prefs);
}

/**
 * Deep merge — plain object fields merged recursively, arrays replaced.
 * This is intentionally simple: full override semantics for arrays,
 * recursive merge for objects.
 */
function deepMerge<T extends Record<string, unknown>>(
  base: T,
  patch: Partial<T>
): T {
  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(patch) as Array<keyof T>) {
    const patchVal = patch[key];
    const baseVal = base[key];
    if (
      patchVal !== null &&
      typeof patchVal === "object" &&
      !Array.isArray(patchVal) &&
      baseVal !== null &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal)
    ) {
      result[key as string] = deepMerge(
        baseVal as Record<string, unknown>,
        patchVal as Record<string, unknown>
      );
    } else if (patchVal !== undefined) {
      result[key as string] = patchVal;
    }
  }
  return result as T;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const userRouter = router({
  /**
   * user.get: Read ~/.claude-loom/user-prefs.json (default if absent).
   */
  get: publicProcedure.query(async (): Promise<UserPrefs> => {
    return readUserPrefs();
  }),

  /**
   * user.set: Merge patch + atomic write.
   */
  set: publicProcedure
    .input(z.object({ patch: partialUserPrefsSchema }))
    .mutation(async ({ input }): Promise<UserPrefs> => {
      const current = readUserPrefs();
      const merged = deepMerge(current as Record<string, unknown>, input.patch as Record<string, unknown>);
      // SECURITY: defense in depth — validate merged result before write
      const validation = userPrefsSchema.safeParse(merged);
      if (!validation.success) {
        throw new TRPCErrorClass({
          code: "BAD_REQUEST",
          message: `Merged user-prefs invalid: ${validation.error.message}`,
        });
      }
      writeUserPrefs(validation.data);
      return validation.data;
    }),
});

const projectRouter = router({
  /**
   * project.get: Read <project>/.claude-loom/project-prefs.json (default if absent).
   */
  get: publicProcedure
    .input(z.object({ projectId: projectIdSchema }))
    .query(async ({ input }): Promise<ProjectPrefs> => {
      return readProjectPrefs(input.projectId);
    }),

  /**
   * project.set: Merge patch + atomic write.
   */
  set: publicProcedure
    .input(
      z.object({
        projectId: projectIdSchema,
        patch: partialProjectPrefsSchema,
      })
    )
    .mutation(async ({ input }): Promise<ProjectPrefs> => {
      const current = readProjectPrefs(input.projectId);
      const merged = deepMerge(current as Record<string, unknown>, input.patch as Record<string, unknown>);
      // SECURITY: defense in depth — validate merged result before write
      const validation = projectPrefsSchema.safeParse(merged);
      if (!validation.success) {
        throw new TRPCErrorClass({
          code: "BAD_REQUEST",
          message: `Merged project-prefs invalid: ${validation.error.message}`,
        });
      }
      writeProjectPrefs(input.projectId, validation.data);
      return validation.data;
    }),
});

const learnedGuidanceRouter = router({
  /**
   * learnedGuidance.toggle: Toggle the `active` flag on a learned_guidance entry.
   * Operates on agents.<agentName>.learned_guidance[] by guidanceId match.
   */
  toggle: publicProcedure
    .input(
      z.object({
        scope: scopeSchema,
        projectId: projectIdSchema.optional(),
        agentName: z.string(),
        guidanceId: z.string(),
        active: z.boolean(),
      })
    )
    .mutation(async ({ input }): Promise<{ success: boolean }> => {
      if (input.scope === "user") {
        const prefs = readUserPrefs();
        const agent = prefs.agents?.[input.agentName];
        const guidance = agent?.learned_guidance?.find(
          (g) => g.id === input.guidanceId
        );
        if (!guidance) {
          throw new TRPCErrorClass({
            code: "NOT_FOUND",
            message: `Guidance not found: ${input.guidanceId} for agent ${input.agentName} in user prefs`,
          });
        }
        guidance.active = input.active;
        writeUserPrefs(prefs);
      } else {
        if (!input.projectId) {
          throw new TRPCErrorClass({
            code: "BAD_REQUEST",
            message: "projectId is required for project scope",
          });
        }
        const prefs = readProjectPrefs(input.projectId);
        const agent = prefs.agents?.[input.agentName];
        const guidance = agent?.learned_guidance?.find(
          (g) => g.id === input.guidanceId
        );
        if (!guidance) {
          throw new TRPCErrorClass({
            code: "NOT_FOUND",
            message: `Guidance not found: ${input.guidanceId} for agent ${input.agentName} in project prefs`,
          });
        }
        guidance.active = input.active;
        writeProjectPrefs(input.projectId, prefs);
      }

      // TODO(Task 9): broadcaster.emitLearnedGuidanceChange({ scope: input.scope, agentName: input.agentName, guidanceId: input.guidanceId, active: input.active })

      return { success: true };
    }),

  /**
   * learnedGuidance.delete: Hard delete a learned_guidance entry by guidanceId.
   */
  delete: publicProcedure
    .input(
      z.object({
        scope: scopeSchema,
        projectId: projectIdSchema.optional(),
        agentName: z.string(),
        guidanceId: z.string(),
      })
    )
    .mutation(async ({ input }): Promise<{ success: boolean }> => {
      if (input.scope === "user") {
        const prefs = readUserPrefs();
        const agent = prefs.agents?.[input.agentName];
        if (!agent?.learned_guidance) {
          throw new TRPCErrorClass({
            code: "NOT_FOUND",
            message: `Guidance not found: ${input.guidanceId} for agent ${input.agentName} in user prefs`,
          });
        }
        const idx = agent.learned_guidance.findIndex(
          (g) => g.id === input.guidanceId
        );
        if (idx === -1) {
          throw new TRPCErrorClass({
            code: "NOT_FOUND",
            message: `Guidance not found: ${input.guidanceId} for agent ${input.agentName} in user prefs`,
          });
        }
        agent.learned_guidance.splice(idx, 1);
        writeUserPrefs(prefs);
      } else {
        if (!input.projectId) {
          throw new TRPCErrorClass({
            code: "BAD_REQUEST",
            message: "projectId is required for project scope",
          });
        }
        const prefs = readProjectPrefs(input.projectId);
        const agent = prefs.agents?.[input.agentName];
        if (!agent?.learned_guidance) {
          throw new TRPCErrorClass({
            code: "NOT_FOUND",
            message: `Guidance not found: ${input.guidanceId} for agent ${input.agentName} in project prefs`,
          });
        }
        const idx = agent.learned_guidance.findIndex(
          (g) => g.id === input.guidanceId
        );
        if (idx === -1) {
          throw new TRPCErrorClass({
            code: "NOT_FOUND",
            message: `Guidance not found: ${input.guidanceId} for agent ${input.agentName} in project prefs`,
          });
        }
        agent.learned_guidance.splice(idx, 1);
        writeProjectPrefs(input.projectId, prefs);
      }

      // TODO(Task 9): broadcaster.emitLearnedGuidanceChange({ scope: input.scope, agentName: input.agentName, guidanceId: input.guidanceId, deleted: true })

      return { success: true };
    }),
});

export const prefsRouter = router({
  user: userRouter,
  project: projectRouter,
  learnedGuidance: learnedGuidanceRouter,
});
