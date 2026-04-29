/**
 * Tests for daemon/src/project/detect.ts
 * Task 13: git root + .claude-loom/project.json marker project detection
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, mkdtempSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";

import { findGitRoot, detectProject } from "../src/project/detect.js";

// macOS: /tmp is a symlink to /private/tmp. Resolve real path for comparison.
function realTmpDir(): string {
  return realpathSync(tmpdir());
}

describe("project/detect.ts (Task 13)", () => {
  let tmpDir: string;

  beforeEach(() => {
    // mkdtempSync may return symlinked path on macOS; resolve it
    const base = mkdtempSync(join(realTmpDir(), "loom-detect-test-"));
    tmpDir = realpathSync(base);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("findGitRoot", () => {
    it("returns null for a path with no git repo", () => {
      // tmpDir has no .git — should return null
      const result = findGitRoot(tmpDir);
      expect(result).toBeNull();
    });

    it("returns the git root (string) for a path inside a git repo", () => {
      // Use the actual claude-loom repo root
      const cwdRoot = "/Users/kokiiphone/Documents/work/claude-loom";
      const result = findGitRoot(cwdRoot);
      expect(result).not.toBeNull();
      expect(typeof result).toBe("string");
      expect(result!.length).toBeGreaterThan(0);
    });
  });

  describe("detectProject", () => {
    it("returns null rootPath when no git repo found", () => {
      const result = detectProject(tmpDir);
      expect(result.rootPath).toBeNull();
      expect(result.projectId).toBeNull();
      expect(result.hasMarker).toBe(false);
      expect(result.markerData).toBeNull();
    });

    it("returns rootPath non-null but no projectId when git root has no .claude-loom/project.json", () => {
      // Initialize a git repo in tmpDir
      execSync("git init", { cwd: tmpDir, stdio: "ignore" });

      const result = detectProject(tmpDir);
      // rootPath should resolve to the real path of the tmpDir
      expect(result.rootPath).not.toBeNull();
      // On macOS, git rev-parse returns resolved path; compare realpath
      expect(realpathSync(result.rootPath!)).toBe(tmpDir);
      expect(result.projectId).toBeNull();
      expect(result.hasMarker).toBe(false);
      expect(result.markerData).toBeNull();
    });

    it("returns rootPath and projectId when .claude-loom/project.json exists with project_id", () => {
      // Initialize a git repo
      execSync("git init", { cwd: tmpDir, stdio: "ignore" });

      // Create .claude-loom/project.json
      const markerDir = join(tmpDir, ".claude-loom");
      mkdirSync(markerDir, { recursive: true });
      writeFileSync(
        join(markerDir, "project.json"),
        JSON.stringify({
          schema: "1.0.0",
          project_id: "test-project-123",
          name: "Test Project",
        })
      );

      const result = detectProject(tmpDir);
      expect(result.rootPath).not.toBeNull();
      expect(realpathSync(result.rootPath!)).toBe(tmpDir);
      expect(result.projectId).toBe("test-project-123");
      expect(result.hasMarker).toBe(true);
      expect(result.markerData).not.toBeNull();
      expect(result.markerData?.project_id).toBe("test-project-123");
      expect(result.markerData?.schema).toBe("1.0.0");
    });

    it("returns hasMarker false when project.json is malformed JSON", () => {
      execSync("git init", { cwd: tmpDir, stdio: "ignore" });

      const markerDir = join(tmpDir, ".claude-loom");
      mkdirSync(markerDir, { recursive: true });
      writeFileSync(join(markerDir, "project.json"), "{ not valid json }");

      const result = detectProject(tmpDir);
      expect(result.rootPath).not.toBeNull();
      expect(result.projectId).toBeNull();
      expect(result.hasMarker).toBe(false);
    });

    it("returns hasMarker false when project.json is missing required schema field", () => {
      execSync("git init", { cwd: tmpDir, stdio: "ignore" });

      const markerDir = join(tmpDir, ".claude-loom");
      mkdirSync(markerDir, { recursive: true });
      // Missing 'schema' field — should fail zod validation
      writeFileSync(
        join(markerDir, "project.json"),
        JSON.stringify({ project_id: "no-schema" })
      );

      const result = detectProject(tmpDir);
      expect(result.rootPath).not.toBeNull();
      expect(result.projectId).toBeNull();
      expect(result.hasMarker).toBe(false);
    });

    it("detects claude-loom repo git root (no project.json marker, rootPath non-null)", () => {
      // The claude-loom repo itself is a git repo but doesn't have .claude-loom/project.json
      // (it has project-prefs.json instead). So rootPath should be non-null, hasMarker false.
      const result = detectProject("/Users/kokiiphone/Documents/work/claude-loom");
      expect(result.rootPath).not.toBeNull();
      // rootPath should be the claude-loom repo root
      expect(result.rootPath!.endsWith("claude-loom")).toBe(true);
    });
  });
});
