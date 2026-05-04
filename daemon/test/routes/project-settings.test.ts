/**
 * M5 t3: project.getDetail + project.updateSettings procedure tests
 * TDD RED phase — written before implementation exists
 *
 * Tests:
 *  - projectRouter.getDetail: shape + behavior (returns project row with all fields)
 *  - projectRouter.updateSettings: shape + validation + update behavior
 *
 * Pattern: same buildServer + inject pattern as phase-a-route.test.ts
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildServer } from "../../src/server.js";
import type { FastifyInstance } from "fastify";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import superjson from "superjson";

/** Serialize input for tRPC GET query ?input= param (superjson transformer required). */
function sjInput(value: unknown): string {
  return encodeURIComponent(JSON.stringify(superjson.serialize(value)));
}

/** Serialize payload for tRPC POST mutation body (superjson transformer required). */
function sjPayload(value: unknown): string {
  return JSON.stringify(superjson.serialize(value));
}

let app: FastifyInstance;
let dbPath: string;

beforeEach(async () => {
  const dir = join(tmpdir(), `project-settings-${randomUUID()}`);
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createProject(): Promise<string> {
  const rootPath = `/tmp/proj-${randomUUID()}`;
  const resp = await app.inject({
    method: "POST",
    url: "/trpc/project.upsert",
    headers: { "content-type": "application/json" },
    payload: sjPayload({
      name: "Test Project",
      rootPath,
      specPath: `${rootPath}/SPEC.md`,
      status: "active",
    }),
  });
  const body = JSON.parse(resp.body);
  return body.result.data.json.projectId;
}

// ---------------------------------------------------------------------------
// projectRouter.getDetail — procedure shape
// ---------------------------------------------------------------------------

describe("projectRouter.getDetail procedure shape", () => {
  it("projectRouter has getDetail procedure (query)", async () => {
    const { projectRouter } = await import("../../src/routes/project.js");
    const def = (projectRouter as any)._def;
    expect(def.procedures).toHaveProperty("getDetail");
    expect(def.procedures.getDetail._def.type).toBe("query");
  });
});

// ---------------------------------------------------------------------------
// projectRouter.getDetail — integration
// ---------------------------------------------------------------------------

describe("projectRouter.getDetail", () => {
  it("returns project row for valid projectId", async () => {
    const projectId = await createProject();

    const resp = await app.inject({
      method: "GET",
      url: `/trpc/project.getDetail?input=${sjInput({ projectId })}`,
      headers: { "content-type": "application/json" },
    });

    expect(resp.statusCode).toBe(200);
    const data = JSON.parse(resp.body).result.data.json;
    expect(data).toHaveProperty("projectId", projectId);
    expect(data).toHaveProperty("name");
    expect(data).toHaveProperty("rootPath");
    expect(data).toHaveProperty("status");
    expect(data).toHaveProperty("createdAt");
  });

  it("returns null for non-existent projectId", async () => {
    const resp = await app.inject({
      method: "GET",
      url: `/trpc/project.getDetail?input=${sjInput({ projectId: "nonexistent-id-xyz" })}`,
      headers: { "content-type": "application/json" },
    });

    expect(resp.statusCode).toBe(200);
    const data = JSON.parse(resp.body).result.data.json;
    expect(data).toBeNull();
  });

  it("requires projectId in input", async () => {
    const resp = await app.inject({
      method: "GET",
      url: `/trpc/project.getDetail?input=${sjInput({})}`,
      headers: { "content-type": "application/json" },
    });

    // should return a validation error
    const body = JSON.parse(resp.body);
    const isError = resp.statusCode !== 200 || body.error !== undefined;
    expect(isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// projectRouter.updateSettings — procedure shape
// ---------------------------------------------------------------------------

describe("projectRouter.updateSettings procedure shape", () => {
  it("projectRouter has updateSettings procedure (mutation)", async () => {
    const { projectRouter } = await import("../../src/routes/project.js");
    const def = (projectRouter as any)._def;
    expect(def.procedures).toHaveProperty("updateSettings");
    expect(def.procedures.updateSettings._def.type).toBe("mutation");
  });
});

// ---------------------------------------------------------------------------
// projectRouter.updateSettings — integration
// ---------------------------------------------------------------------------

describe("projectRouter.updateSettings", () => {
  it("updates project name successfully", async () => {
    const projectId = await createProject();

    const resp = await app.inject({
      method: "POST",
      url: "/trpc/project.updateSettings",
      headers: { "content-type": "application/json" },
      payload: sjPayload({
        projectId,
        name: "Updated Name",
      }),
    });

    expect(resp.statusCode).toBe(200);
    const data = JSON.parse(resp.body).result.data.json;
    expect(data).toHaveProperty("projectId", projectId);
    expect(data).toHaveProperty("name", "Updated Name");
  });

  it("updates specPath successfully", async () => {
    const projectId = await createProject();

    const resp = await app.inject({
      method: "POST",
      url: "/trpc/project.updateSettings",
      headers: { "content-type": "application/json" },
      payload: sjPayload({
        projectId,
        specPath: "docs/SPEC.md",
      }),
    });

    expect(resp.statusCode).toBe(200);
    const data = JSON.parse(resp.body).result.data.json;
    expect(data).toHaveProperty("specPath", "docs/SPEC.md");
  });

  it("updates maxDevelopers pool setting", async () => {
    const projectId = await createProject();

    const resp = await app.inject({
      method: "POST",
      url: "/trpc/project.updateSettings",
      headers: { "content-type": "application/json" },
      payload: sjPayload({
        projectId,
        maxDevelopers: 5,
      }),
    });

    expect(resp.statusCode).toBe(200);
    const data = JSON.parse(resp.body).result.data.json;
    expect(data).toHaveProperty("maxDevelopers", 5);
  });

  it("returns error for non-existent projectId", async () => {
    const resp = await app.inject({
      method: "POST",
      url: "/trpc/project.updateSettings",
      headers: { "content-type": "application/json" },
      payload: sjPayload({
        projectId: "nonexistent-project-xyz",
        name: "Should Fail",
      }),
    });

    const body = JSON.parse(resp.body);
    const isError = resp.statusCode !== 200 || body.error !== undefined;
    expect(isError).toBe(true);
  });

  it("requires projectId in input", async () => {
    const resp = await app.inject({
      method: "POST",
      url: "/trpc/project.updateSettings",
      headers: { "content-type": "application/json" },
      payload: sjPayload({
        name: "No ID",
      }),
    });

    const body = JSON.parse(resp.body);
    const isError = resp.statusCode !== 200 || body.error !== undefined;
    expect(isError).toBe(true);
  });

  it("getDetail reflects updateSettings changes", async () => {
    const projectId = await createProject();

    // Update settings
    await app.inject({
      method: "POST",
      url: "/trpc/project.updateSettings",
      headers: { "content-type": "application/json" },
      payload: sjPayload({
        projectId,
        name: "Changed Name",
      }),
    });

    // Get detail
    const detailResp = await app.inject({
      method: "GET",
      url: `/trpc/project.getDetail?input=${sjInput({ projectId })}`,
      headers: { "content-type": "application/json" },
    });

    const data = JSON.parse(detailResp.body).result.data.json;
    expect(data).toHaveProperty("name", "Changed Name");
  });
});
