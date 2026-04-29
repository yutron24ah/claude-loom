/**
 * Project detection: git root + .claude-loom/project.json marker
 * SPEC §6.7
 * M1 Task 13
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const projectMarkerSchema = z.object({
  schema: z.string(),
  project_id: z.string().optional(),
  name: z.string().optional(),
});

/**
 * 与えられた path から git root を見つける（.git 探索 OR git CLI）。
 */
export function findGitRoot(startPath: string): string | null {
  try {
    const result = execSync("git rev-parse --show-toplevel", {
      cwd: startPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    return result || null;
  } catch {
    return null;
  }
}

/**
 * project root を判定：
 * 1. git root を探す
 * 2. <git_root>/.claude-loom/project.json があれば marker から project_id 取得
 * 3. なければ root_path = git_root として default
 */
export function detectProject(startPath: string): {
  rootPath: string | null;
  projectId: string | null;
  hasMarker: boolean;
  markerData: z.infer<typeof projectMarkerSchema> | null;
} {
  const gitRoot = findGitRoot(startPath);
  if (!gitRoot) {
    return { rootPath: null, projectId: null, hasMarker: false, markerData: null };
  }

  const markerPath = join(gitRoot, ".claude-loom", "project.json");
  if (!existsSync(markerPath)) {
    return { rootPath: gitRoot, projectId: null, hasMarker: false, markerData: null };
  }

  try {
    const raw = readFileSync(markerPath, "utf-8");
    const parsed = projectMarkerSchema.parse(JSON.parse(raw));
    return {
      rootPath: gitRoot,
      projectId: parsed.project_id ?? null,
      hasMarker: true,
      markerData: parsed,
    };
  } catch {
    return { rootPath: gitRoot, projectId: null, hasMarker: false, markerData: null };
  }
}
