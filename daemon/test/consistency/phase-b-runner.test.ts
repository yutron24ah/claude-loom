/**
 * M4 t4: phase-b-runner.ts tests (claude -p subprocess semantic analysis)
 * TDD RED phase — written before implementation exists
 *
 * WHY vi.mock for claude-cli: never invoke real claude CLI in tests (CI safety).
 * WHY in-memory DB: full DB integration without external deps.
 * WHY temp files for candidateFiles: phase-b-runner reads file content from disk
 * to build the prompt; tests must create real temp files for paths to be readable.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Mock claude-cli module BEFORE any imports that depend on it
// ---------------------------------------------------------------------------
const mockRunClaudeCLI = vi.fn();
vi.mock("../../src/lib/claude-cli.js", () => ({
  runClaudeCLI: mockRunClaudeCLI,
  DEFAULT_CLAUDE_TIMEOUT: 30000,
}));

let dbPath: string;
let tmpDir: string;

beforeEach(() => {
  vi.resetModules();
  mockRunClaudeCLI.mockReset();
  const id = randomUUID();
  tmpDir = join(tmpdir(), `phase-b-runner-${id}`);
  mkdirSync(tmpDir, { recursive: true });
  dbPath = join(tmpDir, "test.db");
  process.env.CLAUDE_LOOM_DB_PATH = dbPath;
});

afterEach(() => {
  delete process.env.CLAUDE_LOOM_DB_PATH;
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helper: create a temp file with given content, return its path
// ---------------------------------------------------------------------------
function createTempFile(name: string, content: string): string {
  const filePath = join(tmpDir, name);
  writeFileSync(filePath, content);
  return filePath;
}

// ---------------------------------------------------------------------------
// Shape tests
// ---------------------------------------------------------------------------

describe("phase-b-runner module shape", () => {
  it("exports runPhaseB function", async () => {
    const mod = await import("../../src/consistency/phase-b-runner.js");
    expect(typeof mod.runPhaseB).toBe("function");
  });

  it("exports CliNotFoundError class", async () => {
    const mod = await import("../../src/consistency/phase-b-runner.js");
    expect(typeof mod.CliNotFoundError).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// runPhaseB — success path
// ---------------------------------------------------------------------------

describe("runPhaseB — success path", () => {
  it("returns 0 when candidateFiles is empty", async () => {
    const { runPhaseB } = await import("../../src/consistency/phase-b-runner.js");
    const { createDBClient, runMigrations } = await import("../../src/db/client.js");

    const db = createDBClient(dbPath);
    runMigrations(db);

    const result = await runPhaseB(1, [], "- old line\n+ new line", db);
    expect(result).toBe(0);
    expect(mockRunClaudeCLI).not.toHaveBeenCalled();
  });

  it("returns count of inserted findings when claude returns findings", async () => {
    const { runPhaseB } = await import("../../src/consistency/phase-b-runner.js");
    const { createDBClient, runMigrations } = await import("../../src/db/client.js");
    const { specChanges } = await import("../../src/db/schema.js");

    const db = createDBClient(dbPath);
    runMigrations(db);

    // Insert a spec_changes row first (FK reference)
    const [sc] = await db
      .insert(specChanges)
      .values({
        projectId: "proj-b-1",
        specPath: "SPEC.md",
        beforeHash: "h0",
        afterHash: "h1",
        diff: "-old term\n+new term",
        detectedAt: new Date(),
        status: "pending",
      })
      .returning();

    // Create temp file so runner can read it
    const planMdPath = createTempFile("PLAN.md", "# Plan\n\nOld term is referenced here.");

    // Mock claude CLI to return valid findings array
    mockRunClaudeCLI.mockResolvedValue({
      ok: true,
      output: [
        {
          target_path: planMdPath,
          finding_type: "semantic_drift",
          severity: "medium",
          description: "Term has drifted in meaning",
          suggested_change: "Update to reflect new definition",
        },
        {
          target_path: planMdPath,
          finding_type: "term_mention",
          severity: "low",
          description: "Old term still mentioned",
          suggested_change: null,
        },
      ],
    });

    const result = await runPhaseB(sc.id, [planMdPath], sc.diff, db);
    expect(result).toBe(2);
    expect(mockRunClaudeCLI).toHaveBeenCalledTimes(1);
  });

  it("inserts consistency_findings rows into DB", async () => {
    const { runPhaseB } = await import("../../src/consistency/phase-b-runner.js");
    const { createDBClient, runMigrations } = await import("../../src/db/client.js");
    const { specChanges, consistencyFindings } = await import("../../src/db/schema.js");

    const db = createDBClient(dbPath);
    runMigrations(db);

    const [sc] = await db
      .insert(specChanges)
      .values({
        projectId: "proj-b-2",
        specPath: "SPEC.md",
        beforeHash: "h0",
        afterHash: "h1",
        diff: "-removed-term\n+new-term",
        detectedAt: new Date(),
        status: "pending",
      })
      .returning();

    const claudeMdPath = createTempFile("CLAUDE.md", "# Claude\n\nRemoved term is here.");

    mockRunClaudeCLI.mockResolvedValue({
      ok: true,
      output: [
        {
          target_path: claudeMdPath,
          finding_type: "term_removed",
          severity: "high",
          description: "Critical term removed",
          suggested_change: "Restore or update references",
        },
      ],
    });

    await runPhaseB(sc.id, [claudeMdPath], sc.diff, db);

    const findings = await db.select().from(consistencyFindings).all();
    expect(findings.length).toBe(1);
    expect(findings[0].specChangeId).toBe(sc.id);
    expect(findings[0].targetPath).toBe(claudeMdPath);
    expect(findings[0].findingType).toBe("term_removed");
    expect(findings[0].severity).toBe("high");
    expect(findings[0].status).toBe("open");
    expect(findings[0].description).toBe("Critical term removed");
    expect(findings[0].suggestedChange).toBe("Restore or update references");
  });

  it("skips invalid finding_type gracefully (defensive parse)", async () => {
    const { runPhaseB } = await import("../../src/consistency/phase-b-runner.js");
    const { createDBClient, runMigrations } = await import("../../src/db/client.js");
    const { specChanges, consistencyFindings } = await import("../../src/db/schema.js");

    const db = createDBClient(dbPath);
    runMigrations(db);

    const [sc] = await db
      .insert(specChanges)
      .values({
        projectId: "proj-b-3",
        specPath: "SPEC.md",
        beforeHash: "h0",
        afterHash: "h1",
        diff: "-foo\n+bar",
        detectedAt: new Date(),
        status: "pending",
      })
      .returning();

    const readmePath = createTempFile("README.md", "# README\nSome content here.");

    // Claude returns one valid + one invalid finding_type
    mockRunClaudeCLI.mockResolvedValue({
      ok: true,
      output: [
        {
          target_path: readmePath,
          finding_type: "invalid_unknown_type", // should be skipped
          severity: "low",
          description: "Unknown type",
          suggested_change: null,
        },
        {
          target_path: readmePath,
          finding_type: "semantic_drift",
          severity: "medium",
          description: "Valid finding",
          suggested_change: null,
        },
      ],
    });

    const result = await runPhaseB(sc.id, [readmePath], sc.diff, db);
    // Only valid finding should be inserted
    expect(result).toBe(1);

    const findings = await db.select().from(consistencyFindings).all();
    expect(findings.length).toBe(1);
    expect(findings[0].findingType).toBe("semantic_drift");
  });

  it("skips file silently when it cannot be read", async () => {
    const { runPhaseB } = await import("../../src/consistency/phase-b-runner.js");
    const { createDBClient, runMigrations } = await import("../../src/db/client.js");

    const db = createDBClient(dbPath);
    runMigrations(db);

    // Non-existent file path
    const result = await runPhaseB(1, ["/nonexistent/path/file.md"], "diff", db);
    expect(result).toBe(0);
    expect(mockRunClaudeCLI).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// runPhaseB — degraded mode (CLI not found)
// ---------------------------------------------------------------------------

describe("runPhaseB — degraded mode", () => {
  it("throws CliNotFoundError when CLI not found", async () => {
    const { runPhaseB, CliNotFoundError } = await import("../../src/consistency/phase-b-runner.js");
    const { createDBClient, runMigrations } = await import("../../src/db/client.js");
    const { specChanges } = await import("../../src/db/schema.js");

    const db = createDBClient(dbPath);
    runMigrations(db);

    const [sc] = await db
      .insert(specChanges)
      .values({
        projectId: "proj-b-degraded-1",
        specPath: "SPEC.md",
        beforeHash: "h0",
        afterHash: "h1",
        diff: "-foo\n+bar",
        detectedAt: new Date(),
        status: "pending",
      })
      .returning();

    const filePath = createTempFile("degraded.md", "Some content.");
    mockRunClaudeCLI.mockResolvedValue({ ok: false, reason: "cli_not_found" });

    await expect(runPhaseB(sc.id, [filePath], sc.diff, db)).rejects.toThrow(CliNotFoundError);
  });

  it("returns 0 (skips file) when CLI times out for that file", async () => {
    const { runPhaseB } = await import("../../src/consistency/phase-b-runner.js");
    const { createDBClient, runMigrations } = await import("../../src/db/client.js");
    const { specChanges } = await import("../../src/db/schema.js");

    const db = createDBClient(dbPath);
    runMigrations(db);

    const [sc] = await db
      .insert(specChanges)
      .values({
        projectId: "proj-b-degraded-2",
        specPath: "SPEC.md",
        beforeHash: "h0",
        afterHash: "h1",
        diff: "-foo\n+bar",
        detectedAt: new Date(),
        status: "pending",
      })
      .returning();

    const filePath = createTempFile("timeout.md", "Some content.");
    mockRunClaudeCLI.mockResolvedValue({ ok: false, reason: "timeout" });

    // Timeout is not fatal for a single file — skip and return 0
    const result = await runPhaseB(sc.id, [filePath], sc.diff, db);
    expect(result).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// runPhaseB — broadcast (emitFindingNew called per finding)
// ---------------------------------------------------------------------------

describe("runPhaseB — broadcast", () => {
  it("calls emitFindingNew for each inserted finding", async () => {
    // Spy on broadcaster before importing phase-b-runner
    const { broadcaster } = await import("../../src/events/broadcaster.js");
    const emitSpy = vi.spyOn(broadcaster, "emitFindingNew");

    const { runPhaseB } = await import("../../src/consistency/phase-b-runner.js");
    const { createDBClient, runMigrations } = await import("../../src/db/client.js");
    const { specChanges } = await import("../../src/db/schema.js");

    const db = createDBClient(dbPath);
    runMigrations(db);

    const [sc] = await db
      .insert(specChanges)
      .values({
        projectId: "proj-b-broadcast",
        specPath: "SPEC.md",
        beforeHash: "h0",
        afterHash: "h1",
        diff: "-old\n+new",
        detectedAt: new Date(),
        status: "pending",
      })
      .returning();

    const fooPath = createTempFile("foo.md", "Foo content.");

    mockRunClaudeCLI.mockResolvedValue({
      ok: true,
      output: [
        {
          target_path: fooPath,
          finding_type: "semantic_drift",
          severity: "high",
          description: "Drift detected",
          suggested_change: null,
        },
        {
          target_path: fooPath,
          finding_type: "term_mention",
          severity: "low",
          description: "Mention detected",
          suggested_change: null,
        },
      ],
    });

    await runPhaseB(sc.id, [fooPath], sc.diff, db);

    expect(emitSpy).toHaveBeenCalledTimes(2);
    emitSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// runPhaseB — prompt template
// ---------------------------------------------------------------------------

describe("runPhaseB — prompt template", () => {
  it("includes specDiff and file path in the prompt passed to runClaudeCLI", async () => {
    const { runPhaseB } = await import("../../src/consistency/phase-b-runner.js");
    const { createDBClient, runMigrations } = await import("../../src/db/client.js");
    const { specChanges } = await import("../../src/db/schema.js");

    const db = createDBClient(dbPath);
    runMigrations(db);

    const [sc] = await db
      .insert(specChanges)
      .values({
        projectId: "proj-b-prompt",
        specPath: "SPEC.md",
        beforeHash: "h0",
        afterHash: "h1",
        diff: "-OldTerm was removed from spec\n+NewTerm added",
        detectedAt: new Date(),
        status: "pending",
      })
      .returning();

    const targetPath = createTempFile("target.md", "# Target\n\nSome content.");
    mockRunClaudeCLI.mockResolvedValue({ ok: true, output: [] });

    await runPhaseB(sc.id, [targetPath], sc.diff, db);

    expect(mockRunClaudeCLI).toHaveBeenCalledTimes(1);
    const prompt: string = mockRunClaudeCLI.mock.calls[0][0];
    // Prompt must contain the SPEC diff
    expect(prompt).toContain("OldTerm was removed from spec");
    // Prompt must contain the target file path
    expect(prompt).toContain(targetPath);
  });
});
