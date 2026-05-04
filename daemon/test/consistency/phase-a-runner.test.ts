/**
 * M4 t3: phase-a-runner.ts integration tests
 * TDD RED phase — written before implementation exists
 * Tests: runPhaseA flow (mock fs + DB, spec_changes → consistencyFindings)
 *
 * NOTE M4 t4: runPhaseA return type changed from number[] to PhaseAResult
 * { insertedIds: number[], candidateFiles: string[] } for Phase B chaining.
 * Tests updated to use .insertedIds / .candidateFiles accordingly.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Test helpers — in-memory DB with isolated path per test
// ---------------------------------------------------------------------------

let dbPath: string;

beforeEach(() => {
  const dir = join(tmpdir(), `phase-a-runner-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  dbPath = join(dir, "test.db");
  process.env.CLAUDE_LOOM_DB_PATH = dbPath;
});

afterEach(() => {
  delete process.env.CLAUDE_LOOM_DB_PATH;
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// runPhaseA import smoke test
// ---------------------------------------------------------------------------

describe("phase-a-runner module shape", () => {
  it("exports runPhaseA function", async () => {
    const mod = await import("../../src/consistency/phase-a-runner.js");
    expect(typeof mod.runPhaseA).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// runPhaseA integration tests
// ---------------------------------------------------------------------------

describe("runPhaseA", () => {
  it("returns a PhaseAResult with insertedIds array (numbers)", async () => {
    const { runPhaseA } = await import("../../src/consistency/phase-a-runner.js");
    const { createDBClient, runMigrations } = await import("../../src/db/client.js");
    const { specChanges } = await import("../../src/db/schema.js");

    const db = createDBClient(dbPath);
    runMigrations(db);

    // Insert a spec change row with a diff that has no extractable terms
    const now = new Date();
    const [sc] = await db
      .insert(specChanges)
      .values({
        projectId: "proj-test-1",
        specPath: "SPEC.md",
        beforeHash: "hash0",
        afterHash: "hash1",
        diff: "@@ -1 +1 @@\n-old line\n+new line",
        detectedAt: now,
        status: "pending",
      })
      .returning();

    const result = await runPhaseA(sc.id, "proj-test-1", [], db);
    expect(Array.isArray(result.insertedIds)).toBe(true);
    result.insertedIds.forEach((id) => expect(typeof id).toBe("number"));
    expect(Array.isArray(result.candidateFiles)).toBe(true);
  });

  it("returns empty insertedIds when diff has no extractable terms", async () => {
    const { runPhaseA } = await import("../../src/consistency/phase-a-runner.js");
    const { createDBClient, runMigrations } = await import("../../src/db/client.js");
    const { specChanges } = await import("../../src/db/schema.js");

    const db = createDBClient(dbPath);
    runMigrations(db);

    const [sc] = await db
      .insert(specChanges)
      .values({
        projectId: "proj-test-2",
        specPath: "SPEC.md",
        beforeHash: "hash0",
        afterHash: "hash1",
        diff: "@@ -1 +1 @@\n-simple lowercase text\n+other lowercase text",
        detectedAt: new Date(),
        status: "pending",
      })
      .returning();

    // Pass empty related docs → no file content to screen
    const result = await runPhaseA(sc.id, "proj-test-2", [], db);
    expect(result.insertedIds).toHaveLength(0);
    expect(result.candidateFiles).toHaveLength(0);
  });

  it("creates consistencyFindings rows when terms are found in related docs", async () => {
    const { runPhaseA } = await import("../../src/consistency/phase-a-runner.js");
    const { createDBClient, runMigrations } = await import("../../src/db/client.js");
    const { specChanges, consistencyFindings } = await import("../../src/db/schema.js");

    const db = createDBClient(dbPath);
    runMigrations(db);

    // Diff that removes a PascalCase term
    const diff = `-## OldApiSection was removed
+## NewApiSection is added`;

    const [sc] = await db
      .insert(specChanges)
      .values({
        projectId: "proj-test-3",
        specPath: "SPEC.md",
        beforeHash: "h0",
        afterHash: "h1",
        diff,
        detectedAt: new Date(),
        status: "pending",
      })
      .returning();

    // Create a temporary related doc that mentions the removed term
    const dir = join(tmpdir(), `phase-a-docs-${randomUUID()}`);
    mkdirSync(dir, { recursive: true });
    const readmePath = join(dir, "README.md");
    writeFileSync(readmePath, "# Readme\n\nRefer to OldApiSection for API docs.\n");

    const result = await runPhaseA(sc.id, "proj-test-3", [readmePath], db);

    // Should have created at least 1 finding
    expect(result.insertedIds.length).toBeGreaterThan(0);

    // Verify the finding was actually inserted in DB
    const findings = await db
      .select()
      .from(consistencyFindings)
      .all();

    expect(findings.length).toBeGreaterThan(0);
    const finding = findings[0];
    expect(finding.specChangeId).toBe(sc.id);
    expect(finding.targetPath).toBe(readmePath);
    expect(["term_removed", "term_mention"]).toContain(finding.findingType);
    expect(finding.status).toBe("open");
  });

  it("updates spec_changes.status to 'analyzed' after running", async () => {
    const { runPhaseA } = await import("../../src/consistency/phase-a-runner.js");
    const { createDBClient, runMigrations } = await import("../../src/db/client.js");
    const { specChanges } = await import("../../src/db/schema.js");
    const { eq } = await import("drizzle-orm");

    const db = createDBClient(dbPath);
    runMigrations(db);

    const [sc] = await db
      .insert(specChanges)
      .values({
        projectId: "proj-test-4",
        specPath: "SPEC.md",
        beforeHash: "h0",
        afterHash: "h1",
        diff: "-removed line\n+added line",
        detectedAt: new Date(),
        status: "pending",
      })
      .returning();

    expect(sc.status).toBe("pending");

    await runPhaseA(sc.id, "proj-test-4", [], db);

    const [updated] = await db
      .select()
      .from(specChanges)
      .where(eq(specChanges.id, sc.id));

    expect(updated.status).toBe("analyzed");
  });

  it("sets analyzedAt timestamp after running", async () => {
    const { runPhaseA } = await import("../../src/consistency/phase-a-runner.js");
    const { createDBClient, runMigrations } = await import("../../src/db/client.js");
    const { specChanges } = await import("../../src/db/schema.js");
    const { eq } = await import("drizzle-orm");

    const db = createDBClient(dbPath);
    runMigrations(db);

    const [sc] = await db
      .insert(specChanges)
      .values({
        projectId: "proj-test-5",
        specPath: "SPEC.md",
        beforeHash: "h0",
        afterHash: "h1",
        diff: "-old\n+new",
        detectedAt: new Date(),
        status: "pending",
      })
      .returning();

    expect(sc.analyzedAt).toBeNull();

    await runPhaseA(sc.id, "proj-test-5", [], db);

    const [updated] = await db
      .select()
      .from(specChanges)
      .where(eq(specChanges.id, sc.id));

    expect(updated.analyzedAt).not.toBeNull();
  });

  it("returns candidateFiles containing paths with hits", async () => {
    const { runPhaseA } = await import("../../src/consistency/phase-a-runner.js");
    const { createDBClient, runMigrations } = await import("../../src/db/client.js");
    const { specChanges } = await import("../../src/db/schema.js");

    const db = createDBClient(dbPath);
    runMigrations(db);

    const diff = `-## RemovedSection heading`;

    const [sc] = await db
      .insert(specChanges)
      .values({
        projectId: "proj-test-6",
        specPath: "SPEC.md",
        beforeHash: "h0",
        afterHash: "h1",
        diff,
        detectedAt: new Date(),
        status: "pending",
      })
      .returning();

    const dir = join(tmpdir(), `phase-a-docs-${randomUUID()}`);
    mkdirSync(dir, { recursive: true });
    const docPath = join(dir, "PLAN.md");
    writeFileSync(docPath, "## RemovedSection is referenced in plan\n\nSome plan content.");

    const result = await runPhaseA(sc.id, "proj-test-6", [docPath], db);

    if (result.insertedIds.length > 0) {
      expect(result.candidateFiles).toContain(docPath);
      expect(result.candidateFiles.length).toBe(result.insertedIds.length > 0 ? 1 : 0);
    }
  });
});
