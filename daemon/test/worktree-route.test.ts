/**
 * Task 6 TDD: tRPC sub-router worktree (git CLI wrapper)
 * RED: tests written before route file exists
 * M1.5 Subset B
 */
import { describe, it, expect } from "vitest";

describe("worktreeRouter", () => {
  it("exports worktreeRouter from routes/worktree.ts", async () => {
    const mod = await import("../src/routes/worktree.js");
    expect(mod.worktreeRouter).toBeDefined();
  });

  it("worktreeRouter has list, create, remove, lock, unlock procedures", async () => {
    const { worktreeRouter } = await import("../src/routes/worktree.js");
    const def = (worktreeRouter as any)._def;
    expect(def.procedures).toHaveProperty("list");
    expect(def.procedures).toHaveProperty("create");
    expect(def.procedures).toHaveProperty("remove");
    expect(def.procedures).toHaveProperty("lock");
    expect(def.procedures).toHaveProperty("unlock");
  });

  it("worktreeRouter.list is a query procedure", async () => {
    const { worktreeRouter } = await import("../src/routes/worktree.js");
    const def = (worktreeRouter as any)._def;
    expect(def.procedures.list._def.type).toBe("query");
  });

  it("worktreeRouter.create is a mutation procedure", async () => {
    const { worktreeRouter } = await import("../src/routes/worktree.js");
    const def = (worktreeRouter as any)._def;
    expect(def.procedures.create._def.type).toBe("mutation");
  });

  it("worktreeRouter.remove is a mutation procedure", async () => {
    const { worktreeRouter } = await import("../src/routes/worktree.js");
    const def = (worktreeRouter as any)._def;
    expect(def.procedures.remove._def.type).toBe("mutation");
  });

  it("worktreeRouter.lock is a mutation procedure", async () => {
    const { worktreeRouter } = await import("../src/routes/worktree.js");
    const def = (worktreeRouter as any)._def;
    expect(def.procedures.lock._def.type).toBe("mutation");
  });

  it("worktreeRouter.unlock is a mutation procedure", async () => {
    const { worktreeRouter } = await import("../src/routes/worktree.js");
    const def = (worktreeRouter as any)._def;
    expect(def.procedures.unlock._def.type).toBe("mutation");
  });

  it("worktree source file imports execFile and does not import execSync from child_process", async () => {
    const fs = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const { resolve } = await import("node:path");
    const __dir = fileURLToPath(new URL(".", import.meta.url));
    const src = await fs.readFile(resolve(__dir, "../src/routes/worktree.ts"), "utf-8");
    // Must import execFile from child_process
    expect(src).toMatch(/execFile.*from.*child_process|from.*child_process.*execFile/);
    // Must NOT import execSync directly (it may appear in comments)
    // Check: no "import { ... execSync ..." line from child_process
    expect(src).not.toMatch(/import\s*\{[^}]*execSync[^}]*\}\s*from\s*['"]node:child_process['"]/);
  });

  it("worktree source file has >= 5 publicProcedure calls", async () => {
    const fs = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const { resolve } = await import("node:path");
    const __dir = fileURLToPath(new URL(".", import.meta.url));
    const src = await fs.readFile(resolve(__dir, "../src/routes/worktree.ts"), "utf-8");
    const matches = src.match(/publicProcedure/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(5);
  });

  it("worktreeRouter.list returns worktree array with expected fields", async () => {
    const { worktreeRouter } = await import("../src/routes/worktree.js");
    const caller = worktreeRouter.createCaller({});
    // Use the current repo root path directly (no DB lookup needed for this test)
    // The router accepts projectId; with no DB the router falls back to cwd
    const result = await caller.list({ projectId: "_cwd_" });
    expect(Array.isArray(result)).toBe(true);
    // Current repo should have at least 1 worktree (main)
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("path");
    expect(result[0]).toHaveProperty("branch");
    expect(result[0]).toHaveProperty("locked");
    expect(result[0]).toHaveProperty("head");
    expect(result[0]).toHaveProperty("prunable");
  });
});
