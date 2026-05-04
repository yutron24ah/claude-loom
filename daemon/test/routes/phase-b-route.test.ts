/**
 * M4 t4: consistency.runAnalysis route tests — Phase B extension
 * TDD RED phase — tests for Phase B integration in the route layer
 *
 * WHY vi.mock for phase-b-runner: never invoke real claude CLI in route-level tests.
 * Route tests verify the orchestration logic (Phase A → Phase B → response shape).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import superjson from "superjson";

/** Serialize payload for tRPC POST mutation body (superjson transformer required). */
function sjPayload(value: unknown): string {
  return JSON.stringify(superjson.serialize(value));
}

let app: FastifyInstance;
let dbPath: string;

// We use a module-level flag to control what the mock returns, set before each test.
// WHY: vi.mock is hoisted; we can't use a local variable from beforeEach in the factory.
let mockPhaseBBehavior: "success" | "cli_not_found" | "throw_unknown" = "success";
let mockPhaseBCount = 0;

vi.mock("../../src/consistency/phase-b-runner.js", async (importOriginal) => {
  // Import the real module to get the CliNotFoundError class
  const real = await importOriginal<typeof import("../../src/consistency/phase-b-runner.js")>();

  return {
    ...real,
    runPhaseB: vi.fn(async () => {
      if (mockPhaseBBehavior === "cli_not_found") {
        throw new real.CliNotFoundError();
      }
      if (mockPhaseBBehavior === "throw_unknown") {
        throw new Error("Unexpected error");
      }
      return mockPhaseBCount;
    }),
  };
});

beforeEach(async () => {
  mockPhaseBBehavior = "success";
  mockPhaseBCount = 0;
  const dir = join(tmpdir(), `phase-b-route-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  dbPath = join(dir, "test.db");
  process.env.CLAUDE_LOOM_DB_PATH = dbPath;

  const { buildServer } = await import("../../src/server.js");
  app = await buildServer();
  await app.ready();
});

afterEach(async () => {
  await app.close();
  delete process.env.CLAUDE_LOOM_DB_PATH;
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helper: create spec_change via route
// ---------------------------------------------------------------------------
async function createSpecChange(): Promise<{ projectId: string; specChangeId: number }> {
  const rootPath = `/tmp/proj-b-route-${randomUUID()}`;
  const projectResp = await app.inject({
    method: "POST",
    url: "/trpc/project.upsert",
    headers: { "content-type": "application/json" },
    payload: sjPayload({
      name: "Test Project B",
      rootPath,
      specPath: `${rootPath}/SPEC.md`,
      status: "active",
    }),
  });
  const { projectId } = JSON.parse(projectResp.body).result.data.json;

  const scResp = await app.inject({
    method: "POST",
    url: "/trpc/consistency.recordSpecChange",
    headers: { "content-type": "application/json" },
    payload: sjPayload({
      projectId,
      specPath: "SPEC.md",
      beforeHash: "h0",
      afterHash: "h1",
      diff: "@@ -1 +1 @@\n-OldTerm removed\n+NewTerm added",
    }),
  });
  const { id: specChangeId } = JSON.parse(scResp.body).result.data.json;

  return { projectId, specChangeId };
}

// ---------------------------------------------------------------------------
// Phase B integration in runAnalysis
// ---------------------------------------------------------------------------

describe("consistencyRouter.runAnalysis — Phase B integration", () => {
  it("returns phaseBExecuted:true when Phase B runs successfully", async () => {
    mockPhaseBBehavior = "success";
    mockPhaseBCount = 2;

    const { specChangeId } = await createSpecChange();
    const resp = await app.inject({
      method: "POST",
      url: "/trpc/consistency.runAnalysis",
      headers: { "content-type": "application/json" },
      payload: sjPayload({ specChangeId }),
    });

    expect(resp.statusCode).toBe(200);
    const data = JSON.parse(resp.body).result.data.json;
    expect(data).toHaveProperty("findingsCreated");
    expect(data).toHaveProperty("phaseBExecuted");
    expect(data.phaseBExecuted).toBe(true);
  });

  it("returns phaseBExecuted:false with degradedReason when CLI not found", async () => {
    mockPhaseBBehavior = "cli_not_found";

    const { specChangeId } = await createSpecChange();
    const resp = await app.inject({
      method: "POST",
      url: "/trpc/consistency.runAnalysis",
      headers: { "content-type": "application/json" },
      payload: sjPayload({ specChangeId }),
    });

    // Route should still return 200 (graceful degradation)
    expect(resp.statusCode).toBe(200);
    const data = JSON.parse(resp.body).result.data.json;
    expect(data.phaseBExecuted).toBe(false);
    expect(data).toHaveProperty("degradedReason");
    expect(data.degradedReason).toBe("cli_not_found");
  });

  it("findingsCreated includes Phase B count", async () => {
    mockPhaseBBehavior = "success";
    mockPhaseBCount = 2;

    const { specChangeId } = await createSpecChange();
    const resp = await app.inject({
      method: "POST",
      url: "/trpc/consistency.runAnalysis",
      headers: { "content-type": "application/json" },
      payload: sjPayload({ specChangeId }),
    });

    expect(resp.statusCode).toBe(200);
    const data = JSON.parse(resp.body).result.data.json;
    expect(typeof data.findingsCreated).toBe("number");
    // findingsCreated includes Phase B count (2 from mock)
    expect(data.findingsCreated).toBeGreaterThanOrEqual(2);
  });

  it("re-throws unexpected Phase B errors (non-degraded)", async () => {
    mockPhaseBBehavior = "throw_unknown";

    const { specChangeId } = await createSpecChange();
    const resp = await app.inject({
      method: "POST",
      url: "/trpc/consistency.runAnalysis",
      headers: { "content-type": "application/json" },
      payload: sjPayload({ specChangeId }),
    });

    // Unexpected error should propagate as 5xx or tRPC error
    const body = JSON.parse(resp.body);
    const isError = resp.statusCode !== 200 || body.error !== undefined;
    expect(isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Config field: consistency.claude_cmd
// ---------------------------------------------------------------------------

describe("config — consistency.claude_cmd field", () => {
  it("config schema accepts consistency.claude_cmd field", async () => {
    const { configSchema } = await import("../../src/config.js");
    const result = configSchema.safeParse({
      consistency: { claude_cmd: "claude" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.consistency?.claude_cmd).toBe("claude");
    }
  });

  it("config.consistency.claude_cmd defaults to 'claude'", async () => {
    const { configSchema } = await import("../../src/config.js");
    const result = configSchema.parse({});
    expect(result.consistency?.claude_cmd).toBe("claude");
  });
});
