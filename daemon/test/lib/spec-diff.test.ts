/**
 * M4 t2: spec-diff.ts unit tests
 * TDD RED phase — written before implementation exists
 * Tests: hash calculation + unified diff computation
 */
import { describe, it, expect } from "vitest";
import { computeHash, computeDiff, type DiffResult } from "../../src/lib/spec-diff.js";

describe("computeHash", () => {
  it("returns a 64-char hex string (sha256)", () => {
    const hash = computeHash("hello world");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns deterministic hash for same input", () => {
    const a = computeHash("same content");
    const b = computeHash("same content");
    expect(a).toBe(b);
  });

  it("returns different hashes for different inputs", () => {
    const a = computeHash("content A");
    const b = computeHash("content B");
    expect(a).not.toBe(b);
  });

  it("handles empty string", () => {
    const hash = computeHash("");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("sha256 of empty string is known constant", () => {
    // sha256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    const hash = computeHash("");
    expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
});

describe("computeDiff", () => {
  it("returns DiffResult with unified diff string and change counts", () => {
    const result = computeDiff("line1\nline2\n", "line1\nline3\n");
    expect(result).toHaveProperty("diff");
    expect(result).toHaveProperty("additions");
    expect(result).toHaveProperty("deletions");
    expect(typeof result.diff).toBe("string");
    expect(typeof result.additions).toBe("number");
    expect(typeof result.deletions).toBe("number");
  });

  it("empty diff when before and after are identical", () => {
    const content = "line1\nline2\nline3\n";
    const result = computeDiff(content, content);
    expect(result.additions).toBe(0);
    expect(result.deletions).toBe(0);
    expect(result.diff).toBe("");
  });

  it("add-only: tracks added lines", () => {
    const before = "line1\n";
    const after = "line1\nline2\nline3\n";
    const result = computeDiff(before, after);
    expect(result.additions).toBe(2);
    expect(result.deletions).toBe(0);
    expect(result.diff).toContain("+line2");
    expect(result.diff).toContain("+line3");
  });

  it("remove-only: tracks removed lines", () => {
    const before = "line1\nline2\nline3\n";
    const after = "line1\n";
    const result = computeDiff(before, after);
    expect(result.additions).toBe(0);
    expect(result.deletions).toBe(2);
    expect(result.diff).toContain("-line2");
    expect(result.diff).toContain("-line3");
  });

  it("modify-mix: tracks both additions and deletions", () => {
    const before = "line1\nold-line\nline3\n";
    const after = "line1\nnew-line\nline3\n";
    const result = computeDiff(before, after);
    expect(result.additions).toBeGreaterThan(0);
    expect(result.deletions).toBeGreaterThan(0);
    expect(result.diff).toContain("-old-line");
    expect(result.diff).toContain("+new-line");
  });

  it("handles empty before (pure addition)", () => {
    const result = computeDiff("", "new content\n");
    expect(result.additions).toBeGreaterThan(0);
    expect(result.deletions).toBe(0);
  });

  it("handles empty after (pure deletion)", () => {
    const result = computeDiff("old content\n", "");
    expect(result.additions).toBe(0);
    expect(result.deletions).toBeGreaterThan(0);
  });

  it("diff string uses unified diff format with @@ hunk header", () => {
    const before = "line1\nline2\n";
    const after = "line1\nline2-modified\n";
    const result = computeDiff(before, after);
    // Unified diff has @@ hunk headers
    expect(result.diff).toContain("@@");
  });
});
