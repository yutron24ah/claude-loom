/**
 * M4 t5 follow-up: consistency_findings mutation tests
 * TDD RED phase — written before MEDIUM findings #1/#2 refactor
 *
 * WHY: Integration tests for acknowledge / markFixed / dismiss mutations
 * and FindingStatusSchema list filter. Ensures status transitions work
 * correctly (behavior contract) so the FINDING_STATUS constants refactor
 * and setFindingStatus helper extraction preserve semantics.
 *
 * DB isolation: same pattern as consistency-spec-changes.test.ts — uses
 * shared home-dir DB but unique projectId per test. Direct DB inserts use
 * the same default DB path so server and test share the same SQLite file.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildServer } from "../../src/server.js";
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildServer();
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createProject(): Promise<string> {
  const path = `/tmp/proj-${randomUUID()}`;
  const response = await app.inject({
    method: "POST",
    url: "/trpc/project.upsert",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify({
      name: "Test Project",
      rootPath: path,
      specPath: `${path}/SPEC.md`,
      status: "active",
    }),
  });
  expect(response.statusCode).toBe(200);
  return JSON.parse(response.body).result.data.projectId;
}

async function createSpecChange(projectId: string): Promise<number> {
  const response = await app.inject({
    method: "POST",
    url: "/trpc/consistency.recordSpecChange",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify({
      projectId,
      specPath: "/SPEC.md",
      beforeHash: "aaa",
      afterHash: "bbb",
      diff: "@@ -1 +1 @@\n-old\n+new",
    }),
  });
  expect(response.statusCode).toBe(200);
  return JSON.parse(response.body).result.data.id;
}

/**
 * Insert a finding directly via the server's DB (createDBClient() with no args
 * writes to ~/.claude-loom/loom.db, which is the same file the server routes use).
 * WHY: No tRPC endpoint for direct finding insertion (only runAnalysis creates
 * findings, which requires file-system access). Direct DB insert is the simplest
 * isolation-compatible approach for these behavioral tests.
 */
async function createFindingDirectly(specChangeId: number): Promise<number> {
  const { createDBClient, runMigrations } = await import("../../src/db/client.js");
  const { consistencyFindings } = await import("../../src/db/schema.js");
  const { FINDING_STATUS, FINDING_SEVERITY, FINDING_TYPE } = await import(
    "../../src/constants/consistency.js"
  );

  // Use the same DB as the server (no explicit path → same default path)
  const db = createDBClient();
  runMigrations(db);

  // WHY constants: §3.6.10 — no raw string literals even in test helpers.
  const [finding] = await db
    .insert(consistencyFindings)
    .values({
      specChangeId,
      targetPath: "docs/SPEC.md",
      severity: FINDING_SEVERITY.HIGH,
      findingType: FINDING_TYPE.TERM_REMOVED,
      description: "Test finding for status mutation tests",
      suggestedChange: null,
      status: FINDING_STATUS.OPEN,
      createdAt: new Date(),
    })
    .returning();
  return finding.id;
}

// ---------------------------------------------------------------------------
// consistency.acknowledge
// ---------------------------------------------------------------------------

describe("consistencyRouter.acknowledge", () => {
  it("sets finding status to 'acknowledged' and returns updated finding", async () => {
    const projectId = await createProject();
    const specChangeId = await createSpecChange(projectId);
    const findingId = await createFindingDirectly(specChangeId);

    const response = await app.inject({
      method: "POST",
      url: "/trpc/consistency.acknowledge",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ id: findingId }),
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body).result.data;
    expect(data.id).toBe(findingId);
    expect(data.status).toBe("acknowledged");
  });

  it("returns NOT_FOUND error for non-existent finding id", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/trpc/consistency.acknowledge",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ id: 99999999 }),
    });

    const body = JSON.parse(response.body);
    const isError =
      response.statusCode !== 200 || body.error !== undefined;
    expect(isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// consistencyRouter.markFixed
// ---------------------------------------------------------------------------

describe("consistencyRouter.markFixed", () => {
  it("sets finding status to 'fixed' and returns updated finding", async () => {
    const projectId = await createProject();
    const specChangeId = await createSpecChange(projectId);
    const findingId = await createFindingDirectly(specChangeId);

    const response = await app.inject({
      method: "POST",
      url: "/trpc/consistency.markFixed",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ id: findingId }),
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body).result.data;
    expect(data.id).toBe(findingId);
    expect(data.status).toBe("fixed");
  });

  it("returns NOT_FOUND error for non-existent finding id", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/trpc/consistency.markFixed",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ id: 99999999 }),
    });

    const body = JSON.parse(response.body);
    const isError =
      response.statusCode !== 200 || body.error !== undefined;
    expect(isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// consistencyRouter.dismiss (finding)
// ---------------------------------------------------------------------------

describe("consistencyRouter.dismiss (finding)", () => {
  it("sets finding status to 'dismissed' and returns updated finding", async () => {
    const projectId = await createProject();
    const specChangeId = await createSpecChange(projectId);
    const findingId = await createFindingDirectly(specChangeId);

    const response = await app.inject({
      method: "POST",
      url: "/trpc/consistency.dismiss",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ id: findingId }),
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body).result.data;
    expect(data.id).toBe(findingId);
    expect(data.status).toBe("dismissed");
  });

  it("returns NOT_FOUND error for non-existent finding id", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/trpc/consistency.dismiss",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ id: 99999999 }),
    });

    const body = JSON.parse(response.body);
    const isError =
      response.statusCode !== 200 || body.error !== undefined;
    expect(isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// consistencyRouter.list with status filter (FindingStatusSchema)
// ---------------------------------------------------------------------------

describe("consistencyRouter.list with status filter", () => {
  it("returns findings filtered by status 'open' (only open findings)", async () => {
    const projectId = await createProject();
    const specChangeId = await createSpecChange(projectId);
    const findingId = await createFindingDirectly(specChangeId);

    // Acknowledge one finding
    await app.inject({
      method: "POST",
      url: "/trpc/consistency.acknowledge",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ id: findingId }),
    });

    // Create a second finding that stays 'open'
    await createFindingDirectly(specChangeId);

    // Filter for open only — the acknowledged one should NOT appear
    const response = await app.inject({
      method: "GET",
      url: `/trpc/consistency.list?input=${encodeURIComponent(JSON.stringify({ projectId, status: "open" }))}`,
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body).result.data;
    expect(Array.isArray(data)).toBe(true);
    // All returned findings should have status 'open'
    for (const f of data) {
      expect(f.status).toBe("open");
    }
  });

  it("returns findings filtered by status 'acknowledged'", async () => {
    const projectId = await createProject();
    const specChangeId = await createSpecChange(projectId);
    const findingId = await createFindingDirectly(specChangeId);

    // Acknowledge the finding
    await app.inject({
      method: "POST",
      url: "/trpc/consistency.acknowledge",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ id: findingId }),
    });

    const response = await app.inject({
      method: "GET",
      url: `/trpc/consistency.list?input=${encodeURIComponent(JSON.stringify({ projectId, status: "acknowledged" }))}`,
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body).result.data;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
    for (const f of data) {
      expect(f.status).toBe("acknowledged");
    }
  });

  it("rejects invalid status value (FindingStatusSchema enforcement)", async () => {
    const projectId = await createProject();

    const response = await app.inject({
      method: "GET",
      url: `/trpc/consistency.list?input=${encodeURIComponent(JSON.stringify({ projectId, status: "not-a-status" }))}`,
    });

    // Should return a validation error (FindingStatusSchema rejects unknown values)
    const body = JSON.parse(response.body);
    const isError =
      response.statusCode !== 200 || body.error !== undefined;
    expect(isError).toBe(true);
  });
});
