/**
 * M4 t2: consistency router spec-changes tests
 * TDD RED phase — written before implementation exists
 * Tests: recordSpecChange / getLatestSpecChange / dismissSpecChange procedures
 *
 * WHY: uses buildServer + HTTP injection pattern consistent with codebase convention.
 * DB isolation via CLAUDE_LOOM_DB_PATH env var per ingest.test.ts pattern.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildServer } from "../../src/server.js";
import type { FastifyInstance } from "fastify";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

let app: FastifyInstance;
let dbPath: string;

beforeEach(async () => {
  const dir = join(tmpdir(), `consistency-spec-changes-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  dbPath = join(dir, "test.db");
  process.env.CLAUDE_LOOM_DB_PATH = dbPath;
  app = await buildServer();
  await app.ready();
});

afterEach(async () => {
  await app.close();
  delete process.env.CLAUDE_LOOM_DB_PATH;
});

// Helper: create a project via tRPC and return its projectId
async function createProject(rootPath?: string): Promise<string> {
  const path = rootPath ?? `/tmp/proj-${randomUUID()}`;
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

// ---------------------------------------------------------------------------
// Procedure shape tests (no DB needed)
// ---------------------------------------------------------------------------

describe("consistencyRouter shape — M4 t2 procedures", () => {
  it("consistencyRouter has recordSpecChange procedure (mutation)", async () => {
    const { consistencyRouter } = await import("../../src/routes/consistency.js");
    const def = (consistencyRouter as any)._def;
    expect(def.procedures).toHaveProperty("recordSpecChange");
    expect(def.procedures.recordSpecChange._def.type).toBe("mutation");
  });

  it("consistencyRouter has getLatestSpecChange procedure (query)", async () => {
    const { consistencyRouter } = await import("../../src/routes/consistency.js");
    const def = (consistencyRouter as any)._def;
    expect(def.procedures).toHaveProperty("getLatestSpecChange");
    expect(def.procedures.getLatestSpecChange._def.type).toBe("query");
  });

  it("consistencyRouter has dismissSpecChange procedure (mutation)", async () => {
    const { consistencyRouter } = await import("../../src/routes/consistency.js");
    const def = (consistencyRouter as any)._def;
    expect(def.procedures).toHaveProperty("dismissSpecChange");
    expect(def.procedures.dismissSpecChange._def.type).toBe("mutation");
  });
});

// ---------------------------------------------------------------------------
// M4 t7: WS subscription shape tests
// ---------------------------------------------------------------------------

describe("consistencyRouter shape — M4 t7 subscription procedures", () => {
  it("consistencyRouter has subscribeFindings subscription procedure", async () => {
    const { consistencyRouter } = await import("../../src/routes/consistency.js");
    const def = (consistencyRouter as any)._def;
    expect(def.procedures).toHaveProperty("subscribeFindings");
    expect(def.procedures.subscribeFindings._def.type).toBe("subscription");
  });

  it("consistencyRouter has subscribeSpecChanges subscription procedure", async () => {
    const { consistencyRouter } = await import("../../src/routes/consistency.js");
    const def = (consistencyRouter as any)._def;
    expect(def.procedures).toHaveProperty("subscribeSpecChanges");
    expect(def.procedures.subscribeSpecChanges._def.type).toBe("subscription");
  });
});

// ---------------------------------------------------------------------------
// Integration tests via HTTP
// ---------------------------------------------------------------------------

describe("consistencyRouter.recordSpecChange", () => {
  it("creates a new spec_change row and returns it", async () => {
    const projectId = await createProject();

    const response = await app.inject({
      method: "POST",
      url: "/trpc/consistency.recordSpecChange",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({
        projectId,
        specPath: "/path/to/SPEC.md",
        beforeHash: "aaa111",
        afterHash: "bbb222",
        diff: "@@ -1 +1 @@\n-old\n+new",
      }),
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body).result.data;
    expect(data).toHaveProperty("id");
    expect(data.projectId).toBe(projectId);
    expect(data.specPath).toBe("/path/to/SPEC.md");
    expect(data.beforeHash).toBe("aaa111");
    expect(data.afterHash).toBe("bbb222");
    expect(data.diff).toBe("@@ -1 +1 @@\n-old\n+new");
    expect(data.status).toBe("pending");
    expect(data.detectedAt).toBeDefined();
  });

  it("status defaults to pending", async () => {
    const projectId = await createProject();

    const response = await app.inject({
      method: "POST",
      url: "/trpc/consistency.recordSpecChange",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({
        projectId,
        specPath: "/SPEC.md",
        beforeHash: "hash1",
        afterHash: "hash2",
        diff: "some diff",
      }),
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body).result.data;
    expect(data.status).toBe("pending");
  });
});

describe("consistencyRouter.getLatestSpecChange", () => {
  it("returns null when no spec_changes exist for project", async () => {
    const projectId = await createProject();

    const response = await app.inject({
      method: "GET",
      url: `/trpc/consistency.getLatestSpecChange?input=${encodeURIComponent(JSON.stringify({ projectId }))}`,
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body).result.data;
    expect(data).toBeNull();
  });

  it("returns the most recent spec_change row for the project", async () => {
    const projectId = await createProject();

    // Insert first
    await app.inject({
      method: "POST",
      url: "/trpc/consistency.recordSpecChange",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({
        projectId,
        specPath: "/SPEC.md",
        beforeHash: "hash0",
        afterHash: "hash1",
        diff: "diff1",
      }),
    });

    // Insert second
    const secondResp = await app.inject({
      method: "POST",
      url: "/trpc/consistency.recordSpecChange",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({
        projectId,
        specPath: "/SPEC.md",
        beforeHash: "hash1",
        afterHash: "hash2",
        diff: "diff2",
      }),
    });
    const secondId = JSON.parse(secondResp.body).result.data.id;

    // Get latest
    const response = await app.inject({
      method: "GET",
      url: `/trpc/consistency.getLatestSpecChange?input=${encodeURIComponent(JSON.stringify({ projectId }))}`,
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body).result.data;
    expect(data).not.toBeNull();
    expect(data.id).toBe(secondId);
    expect(data.afterHash).toBe("hash2");
  });

  it("does not return rows from other projects", async () => {
    const projectA = await createProject();
    const projectB = await createProject();

    // Insert for project A
    await app.inject({
      method: "POST",
      url: "/trpc/consistency.recordSpecChange",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({
        projectId: projectA,
        specPath: "/SPEC.md",
        beforeHash: "a0",
        afterHash: "a1",
        diff: "diff for A",
      }),
    });

    // Query for project B
    const response = await app.inject({
      method: "GET",
      url: `/trpc/consistency.getLatestSpecChange?input=${encodeURIComponent(JSON.stringify({ projectId: projectB }))}`,
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body).result.data;
    expect(data).toBeNull();
  });
});

describe("consistencyRouter.dismissSpecChange", () => {
  it("updates status to dismissed and returns updated row", async () => {
    const projectId = await createProject();

    // Create a spec change
    const createResp = await app.inject({
      method: "POST",
      url: "/trpc/consistency.recordSpecChange",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({
        projectId,
        specPath: "/SPEC.md",
        beforeHash: "h1",
        afterHash: "h2",
        diff: "some diff",
      }),
    });
    const created = JSON.parse(createResp.body).result.data;
    expect(created.status).toBe("pending");

    // Dismiss it
    const dismissResp = await app.inject({
      method: "POST",
      url: "/trpc/consistency.dismissSpecChange",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ specChangeId: created.id }),
    });

    expect(dismissResp.statusCode).toBe(200);
    const updated = JSON.parse(dismissResp.body).result.data;
    expect(updated.id).toBe(created.id);
    expect(updated.status).toBe("dismissed");
  });

  it("returns 500/NOT_FOUND when specChangeId does not exist", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/trpc/consistency.dismissSpecChange",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ specChangeId: 99999 }),
    });

    // tRPC wraps errors as 200 with error payload or non-200 status
    const body = JSON.parse(response.body);
    // Either status != 200 OR body contains error
    const isError =
      response.statusCode !== 200 ||
      (body.error !== undefined);
    expect(isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// constants/consistency.ts tests
// ---------------------------------------------------------------------------

describe("constants/consistency.ts", () => {
  it("SPEC_CHANGE_STATUS has PENDING, ANALYZED, DISMISSED keys", async () => {
    const { SPEC_CHANGE_STATUS } = await import("../../src/constants/consistency.js");
    expect(SPEC_CHANGE_STATUS.PENDING).toBe("pending");
    expect(SPEC_CHANGE_STATUS.ANALYZED).toBe("analyzed");
    expect(SPEC_CHANGE_STATUS.DISMISSED).toBe("dismissed");
  });

  it("FINDING_STATUS has OPEN, ACKNOWLEDGED, FIXED, DISMISSED keys", async () => {
    const { FINDING_STATUS } = await import("../../src/constants/consistency.js");
    expect(FINDING_STATUS.OPEN).toBe("open");
    expect(FINDING_STATUS.ACKNOWLEDGED).toBe("acknowledged");
    expect(FINDING_STATUS.FIXED).toBe("fixed");
    expect(FINDING_STATUS.DISMISSED).toBe("dismissed");
  });

  it("FINDING_SEVERITY has HIGH, MEDIUM, LOW keys", async () => {
    const { FINDING_SEVERITY } = await import("../../src/constants/consistency.js");
    expect(FINDING_SEVERITY.HIGH).toBe("high");
    expect(FINDING_SEVERITY.MEDIUM).toBe("medium");
    expect(FINDING_SEVERITY.LOW).toBe("low");
  });

  it("FINDING_TYPE has all 5 expected keys", async () => {
    const { FINDING_TYPE } = await import("../../src/constants/consistency.js");
    expect(FINDING_TYPE.TERM_REMOVED).toBe("term_removed");
    expect(FINDING_TYPE.TERM_RENAMED).toBe("term_renamed");
    expect(FINDING_TYPE.SECTION_CHANGED).toBe("section_changed");
    expect(FINDING_TYPE.SEMANTIC_DRIFT).toBe("semantic_drift");
    expect(FINDING_TYPE.TERM_MENTION).toBe("term_mention");
  });

  it("exports zod schemas for all enums", async () => {
    const mod = await import("../../src/constants/consistency.js");
    expect(mod.SpecChangeStatusSchema).toBeDefined();
    expect(mod.FindingStatusSchema).toBeDefined();
    expect(mod.FindingSeveritySchema).toBeDefined();
    expect(mod.FindingTypeSchema).toBeDefined();
  });

  it("SpecChangeStatusSchema validates 'pending'", async () => {
    const { SpecChangeStatusSchema } = await import("../../src/constants/consistency.js");
    expect(SpecChangeStatusSchema.parse("pending")).toBe("pending");
  });

  it("SpecChangeStatusSchema rejects invalid value", async () => {
    const { SpecChangeStatusSchema } = await import("../../src/constants/consistency.js");
    expect(() => SpecChangeStatusSchema.parse("unknown")).toThrow();
  });
});
