/**
 * M4 t1 TDD: spec-edit-detect — PostToolUse(Edit|Write) hook で SPEC.md 編集検知 + spec_changes INSERT
 * RED phase: tests written before implementation. All tests should FAIL initially.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildServer } from "../../src/server.js";
import type { FastifyInstance } from "fastify";
import Database from "better-sqlite3";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

let app: FastifyInstance;
let dbPath: string;
let tempDir: string;

beforeEach(async () => {
  tempDir = join(tmpdir(), `spec-edit-test-${randomUUID()}`);
  mkdirSync(tempDir, { recursive: true });
  dbPath = join(tempDir, "test.db");

  process.env.CLAUDE_LOOM_DB_PATH = dbPath;

  app = await buildServer();
  await app.ready();
});

afterEach(async () => {
  await app.close();
  delete process.env.CLAUDE_LOOM_DB_PATH;
});

describe("SPEC_CHANGE_STATUS constants", () => {
  it("exports SPEC_CHANGE_STATUS with pending, analyzed, dismissed values", async () => {
    // WHY: §3.6.10 — string literal SSoT must live in constants/consistency.ts (primary SSoT)
    const mod = await import("../../src/constants/consistency.js");
    expect(mod.SPEC_CHANGE_STATUS).toBeDefined();
    expect(mod.SPEC_CHANGE_STATUS.PENDING).toBe("pending");
    expect(mod.SPEC_CHANGE_STATUS.ANALYZED).toBe("analyzed");
    expect(mod.SPEC_CHANGE_STATUS.DISMISSED).toBe("dismissed");
  });

  it("SPEC_CHANGE_STATUS is a readonly/const object (not array)", async () => {
    const mod = await import("../../src/constants/consistency.js");
    expect(typeof mod.SPEC_CHANGE_STATUS).toBe("object");
    expect(Array.isArray(mod.SPEC_CHANGE_STATUS)).toBe(false);
  });
});

describe("POST /event — spec_edit_candidate detection", () => {
  it("does NOT insert spec_changes for non-spec file Edit event", async () => {
    const specFilePath = join(tempDir, "README.md");
    writeFileSync(specFilePath, "# README");

    const response = await app.inject({
      method: "POST",
      url: "/event",
      payload: {
        sessionId: "sess-non-spec",
        eventType: "post_tool",
        toolName: "Edit",
        payload: {
          filePath: specFilePath,
          specEditCandidate: true,
          // No projectId → no spec_changes insert
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const db = new Database(dbPath);
    const rows = db.prepare("SELECT * FROM spec_changes").all();
    db.close();
    // No project registered, so no spec_changes should be inserted
    expect(rows).toHaveLength(0);
  });

  it("inserts spec_changes row when SPEC.md is edited (projectId + specPath match)", async () => {
    // Setup: insert a project row directly with specPath='SPEC.md'
    const specFilePath = join(tempDir, "SPEC.md");
    writeFileSync(specFilePath, "# SPEC\n\nInitial content.");

    const db = new Database(dbPath);
    const projectId = `proj-${randomUUID()}`;
    db.prepare(`
      INSERT INTO projects (project_id, name, root_path, spec_path, methodology, max_developers, max_reviewers,
        max_code_reviewers, max_security_reviewers, max_test_reviewers, status, created_at, last_active_at)
      VALUES (?, ?, ?, ?, 'agile', 3, 1, 1, 1, 1, 'active', ?, ?)
    `).run(projectId, "Test Project", tempDir, "SPEC.md", Date.now(), Date.now());
    db.close();

    // First edit: send post_tool event with specEditCandidate=true
    const response = await app.inject({
      method: "POST",
      url: "/event",
      payload: {
        sessionId: "sess-spec-edit",
        eventType: "post_tool",
        toolName: "Edit",
        payload: {
          filePath: specFilePath,
          specEditCandidate: true,
          projectRootPath: tempDir,
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.ok).toBe(true);

    const db2 = new Database(dbPath);
    const rows = db2.prepare("SELECT * FROM spec_changes").all() as any[];
    db2.close();

    expect(rows).toHaveLength(1);
    expect(rows[0].project_id).toBe(projectId);
    expect(rows[0].spec_path).toBe("SPEC.md");
    expect(rows[0].status).toBe("pending");
    expect(rows[0].before_hash).toBeDefined();
    expect(rows[0].after_hash).toBeDefined();
    expect(rows[0].diff).toBeDefined();
  });

  it("does NOT insert spec_changes when file content has not changed (same hash)", async () => {
    const specFilePath = join(tempDir, "SPEC.md");
    const specContent = "# SPEC\n\nContent that does not change.";
    writeFileSync(specFilePath, specContent);

    const db = new Database(dbPath);
    const projectId = `proj-${randomUUID()}`;
    db.prepare(`
      INSERT INTO projects (project_id, name, root_path, spec_path, methodology, max_developers, max_reviewers,
        max_code_reviewers, max_security_reviewers, max_test_reviewers, status, created_at, last_active_at)
      VALUES (?, ?, ?, ?, 'agile', 3, 1, 1, 1, 1, 'active', ?, ?)
    `).run(projectId, "Test Project", tempDir, "SPEC.md", Date.now(), Date.now());
    db.close();

    // First edit: creates the spec_changes row with the initial hash
    await app.inject({
      method: "POST",
      url: "/event",
      payload: {
        sessionId: "sess-spec-no-change-1",
        eventType: "post_tool",
        toolName: "Edit",
        payload: {
          filePath: specFilePath,
          specEditCandidate: true,
          projectRootPath: tempDir,
        },
      },
    });

    // Second edit with same content: should NOT insert another row (hash identical)
    await app.inject({
      method: "POST",
      url: "/event",
      payload: {
        sessionId: "sess-spec-no-change-2",
        eventType: "post_tool",
        toolName: "Edit",
        payload: {
          filePath: specFilePath,
          specEditCandidate: true,
          projectRootPath: tempDir,
        },
      },
    });

    const db2 = new Database(dbPath);
    const rows = db2.prepare("SELECT * FROM spec_changes").all() as any[];
    db2.close();

    // Only 1 row: first edit creates it, second is no-op (same hash)
    expect(rows).toHaveLength(1);
  });

  it("inserts a NEW spec_changes row when SPEC.md content changes after previous edit", async () => {
    const specFilePath = join(tempDir, "SPEC.md");
    writeFileSync(specFilePath, "# SPEC\n\nVersion 1.");

    const db = new Database(dbPath);
    const projectId = `proj-${randomUUID()}`;
    db.prepare(`
      INSERT INTO projects (project_id, name, root_path, spec_path, methodology, max_developers, max_reviewers,
        max_code_reviewers, max_security_reviewers, max_test_reviewers, status, created_at, last_active_at)
      VALUES (?, ?, ?, ?, 'agile', 3, 1, 1, 1, 1, 'active', ?, ?)
    `).run(projectId, "Test Project", tempDir, "SPEC.md", Date.now(), Date.now());
    db.close();

    // First edit
    await app.inject({
      method: "POST",
      url: "/event",
      payload: {
        sessionId: "sess-v1",
        eventType: "post_tool",
        toolName: "Edit",
        payload: {
          filePath: specFilePath,
          specEditCandidate: true,
          projectRootPath: tempDir,
        },
      },
    });

    // Change file content
    writeFileSync(specFilePath, "# SPEC\n\nVersion 2. Updated content.");

    // Second edit with different content
    await app.inject({
      method: "POST",
      url: "/event",
      payload: {
        sessionId: "sess-v2",
        eventType: "post_tool",
        toolName: "Write",
        payload: {
          filePath: specFilePath,
          specEditCandidate: true,
          projectRootPath: tempDir,
        },
      },
    });

    const db2 = new Database(dbPath);
    const rows = db2.prepare("SELECT * FROM spec_changes ORDER BY id ASC").all() as any[];
    db2.close();

    expect(rows).toHaveLength(2);
    // Second row's before_hash should equal first row's after_hash
    expect(rows[1].before_hash).toBe(rows[0].after_hash);
    // after_hash must be different
    expect(rows[0].after_hash).not.toBe(rows[1].after_hash);
    expect(rows[1].status).toBe("pending");
  });

  it("uses custom spec_path from project when set (not just SPEC.md)", async () => {
    const customSpecPath = "docs/MY_SPEC.md";
    const specFilePath = join(tempDir, customSpecPath);
    mkdirSync(join(tempDir, "docs"), { recursive: true });
    writeFileSync(specFilePath, "# Custom Spec\n\nContent.");

    const db = new Database(dbPath);
    const projectId = `proj-${randomUUID()}`;
    db.prepare(`
      INSERT INTO projects (project_id, name, root_path, spec_path, methodology, max_developers, max_reviewers,
        max_code_reviewers, max_security_reviewers, max_test_reviewers, status, created_at, last_active_at)
      VALUES (?, ?, ?, ?, 'agile', 3, 1, 1, 1, 1, 'active', ?, ?)
    `).run(projectId, "Test Project", tempDir, customSpecPath, Date.now(), Date.now());
    db.close();

    const response = await app.inject({
      method: "POST",
      url: "/event",
      payload: {
        sessionId: "sess-custom-spec",
        eventType: "post_tool",
        toolName: "Write",
        payload: {
          filePath: specFilePath,
          specEditCandidate: true,
          projectRootPath: tempDir,
        },
      },
    });

    expect(response.statusCode).toBe(200);

    const db2 = new Database(dbPath);
    const rows = db2.prepare("SELECT * FROM spec_changes").all() as any[];
    db2.close();

    expect(rows).toHaveLength(1);
    expect(rows[0].spec_path).toBe(customSpecPath);
  });

  it("ignores spec_edit_candidate events for non-Edit/Write toolNames", async () => {
    const specFilePath = join(tempDir, "SPEC.md");
    writeFileSync(specFilePath, "# SPEC\n\nContent.");

    const db = new Database(dbPath);
    const projectId = `proj-${randomUUID()}`;
    db.prepare(`
      INSERT INTO projects (project_id, name, root_path, spec_path, methodology, max_developers, max_reviewers,
        max_code_reviewers, max_security_reviewers, max_test_reviewers, status, created_at, last_active_at)
      VALUES (?, ?, ?, ?, 'agile', 3, 1, 1, 1, 1, 'active', ?, ?)
    `).run(projectId, "Test Project", tempDir, "SPEC.md", Date.now(), Date.now());
    db.close();

    // Bash toolName should NOT trigger spec detection even if specEditCandidate=true
    await app.inject({
      method: "POST",
      url: "/event",
      payload: {
        sessionId: "sess-bash",
        eventType: "post_tool",
        toolName: "Bash",
        payload: {
          filePath: specFilePath,
          specEditCandidate: true,
          projectRootPath: tempDir,
        },
      },
    });

    const db2 = new Database(dbPath);
    const rows = db2.prepare("SELECT * FROM spec_changes").all() as any[];
    db2.close();

    expect(rows).toHaveLength(0);
  });

  it("diff string is non-empty when content changes", async () => {
    const specFilePath = join(tempDir, "SPEC.md");
    writeFileSync(specFilePath, "# SPEC\n\nOriginal content.");

    const db = new Database(dbPath);
    const projectId = `proj-${randomUUID()}`;
    db.prepare(`
      INSERT INTO projects (project_id, name, root_path, spec_path, methodology, max_developers, max_reviewers,
        max_code_reviewers, max_security_reviewers, max_test_reviewers, status, created_at, last_active_at)
      VALUES (?, ?, ?, ?, 'agile', 3, 1, 1, 1, 1, 'active', ?, ?)
    `).run(projectId, "Test Project", tempDir, "SPEC.md", Date.now(), Date.now());
    db.close();

    await app.inject({
      method: "POST",
      url: "/event",
      payload: {
        sessionId: "sess-diff-check",
        eventType: "post_tool",
        toolName: "Edit",
        payload: {
          filePath: specFilePath,
          specEditCandidate: true,
          projectRootPath: tempDir,
        },
      },
    });

    const db2 = new Database(dbPath);
    const row = db2.prepare("SELECT * FROM spec_changes LIMIT 1").get() as any;
    db2.close();

    expect(row).toBeTruthy();
    expect(typeof row.diff).toBe("string");
    // First edit: before was empty/null, after has content → diff should mention the spec path or content
    expect(row.diff.length).toBeGreaterThan(0);
  });
});

describe("computeSpecHash utility", () => {
  it("returns sha256 hex string for given content", async () => {
    const mod = await import("../../src/hooks/ingest.js");
    // WHY: computeSpecHash is exported for testability per §8 (test behavior, not impl)
    // The hash function itself is the behavior we verify here.
    expect(mod.computeSpecHash).toBeDefined();
    const hash = mod.computeSpecHash("hello world");
    expect(typeof hash).toBe("string");
    expect(hash).toHaveLength(64); // sha256 hex = 64 chars
    // Idempotent
    expect(mod.computeSpecHash("hello world")).toBe(hash);
    // Different content → different hash
    expect(mod.computeSpecHash("other content")).not.toBe(hash);
  });
});

describe("hash chain isolation — specPath scoping", () => {
  it("does not mix before_hash from a different specPath row for the same project", async () => {
    // WHY: The hash chain must be scoped to the same specPath.
    // If specPath changes or multiple spec files exist, mixing rows would produce a corrupt chain.
    const specPathA = "SPEC.md";
    const specPathB = "docs/OTHER.md";
    const specFileA = join(tempDir, specPathA);
    const specFileB = join(tempDir, specPathB);
    mkdirSync(join(tempDir, "docs"), { recursive: true });
    writeFileSync(specFileA, "# SPEC A content.");
    writeFileSync(specFileB, "# SPEC B content.");

    const db = new Database(dbPath);
    const projectId = `proj-${randomUUID()}`;
    // Project initially uses specPathA
    db.prepare(`
      INSERT INTO projects (project_id, name, root_path, spec_path, methodology, max_developers, max_reviewers,
        max_code_reviewers, max_security_reviewers, max_test_reviewers, status, created_at, last_active_at)
      VALUES (?, ?, ?, ?, 'agile', 3, 1, 1, 1, 1, 'active', ?, ?)
    `).run(projectId, "Test Project", tempDir, specPathA, Date.now(), Date.now());
    db.close();

    // Insert a spec_changes row for specPathA (simulating a prior edit)
    await app.inject({
      method: "POST",
      url: "/event",
      payload: {
        sessionId: "sess-chain-a",
        eventType: "post_tool",
        toolName: "Edit",
        payload: {
          filePath: specFileA,
          specEditCandidate: true,
          projectRootPath: tempDir,
        },
      },
    });

    // Now update project to use specPathB
    const db2 = new Database(dbPath);
    db2.prepare("UPDATE projects SET spec_path = ? WHERE project_id = ?").run(specPathB, projectId);
    db2.close();

    // Edit specPathB — its before_hash must be computeHash("") (empty, not from specPathA row)
    await app.inject({
      method: "POST",
      url: "/event",
      payload: {
        sessionId: "sess-chain-b",
        eventType: "post_tool",
        toolName: "Write",
        payload: {
          filePath: specFileB,
          specEditCandidate: true,
          projectRootPath: tempDir,
        },
      },
    });

    const db3 = new Database(dbPath);
    const rows = db3.prepare("SELECT * FROM spec_changes ORDER BY id ASC").all() as any[];
    db3.close();

    expect(rows).toHaveLength(2);
    const rowA = rows[0];
    const rowB = rows[1];

    expect(rowA.spec_path).toBe(specPathA);
    expect(rowB.spec_path).toBe(specPathB);

    // rowB.before_hash must NOT equal rowA.after_hash (different specPath, chain is isolated)
    // rowB.before_hash must be hash of empty string (no prior row for specPathB)
    const { computeSpecHash } = await import("../../src/hooks/ingest.js");
    expect(rowB.before_hash).toBe(computeSpecHash(""));
    expect(rowB.before_hash).not.toBe(rowA.after_hash);
  });
});
