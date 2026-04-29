/**
 * tRPC sub-router: worktree
 * SPEC §3.6.6 — git worktree CLI wrapper
 * M1.5 Task 6 (Subset B)
 *
 * Uses child_process.execFile (NOT execSync/exec) to prevent shell injection.
 * Project root is resolved from DB by projectId, or from process.cwd() as fallback.
 */
import { z } from "zod";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { join, basename } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { router, publicProcedure } from "../trpc.js";
import { broadcaster } from "../events/broadcaster.js";
import { createDBClient } from "../db/client.js";
import { projects } from "../db/schema.js";
import { findGitRoot } from "../project/detect.js";

const execFile = promisify(execFileCb);

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const worktreeSchema = z.object({
  path: z.string(),
  branch: z.string().nullable(),
  locked: z.boolean(),
  head: z.string().nullable(),
  prunable: z.boolean(),
});

export type Worktree = z.infer<typeof worktreeSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DB_SENTINEL = "_cwd_";

/**
 * Resolve project root path from projectId.
 * - If projectId === DB_SENTINEL, use process.cwd() (for tests / fallback).
 * - Otherwise, look up the project's rootPath in the DB.
 * Falls back to cwd if DB lookup fails or project not found.
 */
async function resolveProjectRoot(projectId: string): Promise<string> {
  if (projectId === DB_SENTINEL) {
    return process.cwd();
  }

  try {
    const db = createDBClient();
    const project = await db
      .select({ rootPath: projects.rootPath })
      .from(projects)
      .where(eq(projects.projectId, projectId))
      .get();

    if (project?.rootPath) {
      return project.rootPath;
    }
  } catch {
    // DB not available in test environment; fall through to git root detection
  }

  // Fallback: detect git root from cwd
  const gitRoot = findGitRoot(process.cwd());
  if (gitRoot) return gitRoot;

  throw new TRPCError({
    code: "NOT_FOUND",
    message: `Project '${projectId}' not found and no git root detected`,
  });
}

/**
 * Read project-prefs.json to get max_concurrent worktrees.
 * Returns null if not set.
 */
function readMaxConcurrentWorktrees(projectRoot: string): number | null {
  const prefsPath = join(projectRoot, ".claude-loom", "project-prefs.json");
  if (!existsSync(prefsPath)) return null;
  try {
    const raw = readFileSync(prefsPath, "utf-8");
    const prefs = JSON.parse(raw) as Record<string, unknown>;
    const worktreeConfig = prefs["worktree"] as Record<string, unknown> | undefined;
    const maxConcurrent = worktreeConfig?.["max_concurrent"];
    if (typeof maxConcurrent === "number") return maxConcurrent;
    return null;
  } catch {
    return null;
  }
}

/**
 * Run a git command using execFile in a given directory.
 * Throws TRPCError on failure.
 */
async function runGit(
  args: string[],
  cwd: string,
  errorCode: TRPCError["code"] = "INTERNAL_SERVER_ERROR",
  errorMessage?: string
): Promise<string> {
  try {
    const { stdout } = await execFile("git", args, { cwd });
    return stdout;
  } catch (err: unknown) {
    const message =
      errorMessage ??
      `git ${args[0]} failed: ${err instanceof Error ? err.message : String(err)}`;
    throw new TRPCError({ code: errorCode, message });
  }
}

/**
 * Parse `git worktree list --porcelain` output into Worktree objects.
 *
 * Porcelain format example:
 * ```
 * worktree /path/to/main
 * HEAD abc1234
 * branch refs/heads/main
 *
 * worktree /path/to/other
 * HEAD def5678
 * branch refs/heads/feature
 * locked reason here
 * prunable reason here
 * ```
 */
function parsePorcelainWorktrees(output: string): Worktree[] {
  const worktrees: Worktree[] = [];
  // Split on blank lines between worktree blocks
  const blocks = output.trim().split(/\n\n+/);

  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.trim().split("\n");

    let path: string | null = null;
    let head: string | null = null;
    let branch: string | null = null;
    let locked = false;
    let prunable = false;

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        path = line.slice("worktree ".length).trim();
      } else if (line.startsWith("HEAD ")) {
        head = line.slice("HEAD ".length).trim();
      } else if (line.startsWith("branch ")) {
        // branch refs/heads/main → main
        const ref = line.slice("branch ".length).trim();
        branch = ref.replace(/^refs\/heads\//, "");
      } else if (line === "detached") {
        branch = null; // detached HEAD
      } else if (line.startsWith("locked")) {
        locked = true;
      } else if (line.startsWith("prunable")) {
        prunable = true;
      }
    }

    if (path !== null) {
      worktrees.push({ path, head, branch, locked, prunable });
    }
  }

  return worktrees;
}

/**
 * Compute a target path for a new worktree.
 * If basePath provided, uses <basePath>/<branch-slug>.
 * Otherwise, uses sibling pattern: <parentDir>/<repoName>-<branch-slug>.
 */
function _computeWorktreePath(
  projectRoot: string,
  branch: string,
  basePath?: string
): string {
  const slug = branch.replace(/[^a-zA-Z0-9._-]/g, "-");
  if (basePath) {
    return join(basePath, slug);
  }
  // Sibling pattern: <parentDir of projectRoot>/<repoName>-<branch-slug>
  const parts = projectRoot.split("/");
  const repoName = parts[parts.length - 1] ?? basename(projectRoot);
  const parentDir = parts.slice(0, -1).join("/") || "/";
  return join(parentDir, `${repoName}-${slug}`);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const worktreeRouter = router({
  /**
   * list: return all git worktrees for a project.
   * Parses `git worktree list --porcelain`.
   * Enforces max_concurrent limit from project-prefs if set.
   */
  list: publicProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ input }): Promise<Worktree[]> => {
      const root = await resolveProjectRoot(input.projectId);
      const output = await runGit(
        ["worktree", "list", "--porcelain"],
        root,
        "INTERNAL_SERVER_ERROR",
        `Failed to list worktrees for project '${input.projectId}'`
      );
      return parsePorcelainWorktrees(output);
    }),

  /**
   * create: add a new git worktree for a project.
   * `git worktree add <path> <branch>`
   * Enforces max_concurrent limit.
   * TODO: call broadcaster.emitWorktreeChange() after success (Task 9)
   */
  create: publicProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        branch: z.string().min(1),
        basePath: z.string().optional(),
      })
    )
    .mutation(async ({ input }): Promise<Worktree> => {
      const root = await resolveProjectRoot(input.projectId);

      // Check max_concurrent limit
      const maxConcurrent = readMaxConcurrentWorktrees(root);
      if (maxConcurrent !== null) {
        const existingOutput = await runGit(["worktree", "list", "--porcelain"], root);
        const existing = parsePorcelainWorktrees(existingOutput);
        if (existing.length >= maxConcurrent) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Max concurrent worktrees (${maxConcurrent}) reached for project '${input.projectId}'`,
          });
        }
      }

      const targetPath = _computeWorktreePath(root, input.branch, input.basePath);

      await runGit(
        ["worktree", "add", targetPath, input.branch],
        root,
        "INTERNAL_SERVER_ERROR",
        `Failed to create worktree at '${targetPath}' for branch '${input.branch}'`
      );

      // Return the new worktree info
      broadcaster.emitWorktreeChange({
        projectId: input.projectId,
        action: "created",
        path: targetPath,
        branch: input.branch,
      });
      return {
        path: targetPath,
        branch: input.branch,
        locked: false,
        head: null, // HEAD not known until git resolves it
        prunable: false,
      };
    }),

  /**
   * remove: remove a git worktree.
   * Checks for uncommitted changes first (warning in result).
   * TODO: call broadcaster.emitWorktreeChange() after success (Task 9)
   */
  remove: publicProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        path: z.string().min(1),
      })
    )
    .mutation(
      async ({ input }): Promise<{ success: boolean; removed: string[]; warning?: string }> => {
        const root = await resolveProjectRoot(input.projectId);

        // Check for uncommitted changes in the worktree
        let warning: string | undefined;
        try {
          const { stdout: statusOut } = await execFile(
            "git",
            ["status", "--porcelain"],
            { cwd: input.path }
          );
          if (statusOut.trim().length > 0) {
            warning = `Worktree '${input.path}' has uncommitted changes`;
          }
        } catch {
          // worktree path may not exist yet or be inaccessible; skip status check
        }

        await runGit(
          ["worktree", "remove", input.path],
          root,
          "INTERNAL_SERVER_ERROR",
          `Failed to remove worktree '${input.path}'`
        );

        broadcaster.emitWorktreeChange({
          projectId: input.projectId,
          action: "removed",
          path: input.path,
        });
        return { success: true, removed: [input.path], warning };
      }
    ),

  /**
   * lock: lock a git worktree (prevent pruning).
   * `git worktree lock [--reason <reason>] <path>`
   * TODO: call broadcaster.emitWorktreeChange() after success (Task 9)
   */
  lock: publicProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        path: z.string().min(1),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }): Promise<{ success: boolean }> => {
      const root = await resolveProjectRoot(input.projectId);

      const args = ["worktree", "lock"];
      if (input.reason) {
        args.push("--reason", input.reason);
      }
      args.push(input.path);

      await runGit(
        args,
        root,
        "INTERNAL_SERVER_ERROR",
        `Failed to lock worktree '${input.path}'`
      );

      broadcaster.emitWorktreeChange({
        projectId: input.projectId,
        action: "locked",
        path: input.path,
      });
      return { success: true };
    }),

  /**
   * unlock: unlock a git worktree.
   * `git worktree unlock <path>`
   * TODO: call broadcaster.emitWorktreeChange() after success (Task 9)
   */
  unlock: publicProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        path: z.string().min(1),
      })
    )
    .mutation(async ({ input }): Promise<{ success: boolean }> => {
      const root = await resolveProjectRoot(input.projectId);

      await runGit(
        ["worktree", "unlock", input.path],
        root,
        "INTERNAL_SERVER_ERROR",
        `Failed to unlock worktree '${input.path}'`
      );

      broadcaster.emitWorktreeChange({
        projectId: input.projectId,
        action: "unlocked",
        path: input.path,
      });
      return { success: true };
    }),
});
