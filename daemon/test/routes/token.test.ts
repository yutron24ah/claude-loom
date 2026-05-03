/**
 * tokenRouter TDD tests — RED phase (M5 t4).
 *
 * WHY: Verify getUsageSummary and getUsageSeries procedures:
 * - correct aggregation of input/output/cache tokens
 * - filter by projectId / sessionId / sinceMs
 * - empty result when no data
 * - time series bucketed data for sparkline
 *
 * SPEC §3.6.10: TOKEN_TYPE constants used (no raw string literals).
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
  const dir = join(tmpdir(), `token-route-${randomUUID()}`);
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
// Procedure shape tests
// ---------------------------------------------------------------------------

describe("tokenRouter — procedure shape", () => {
  it("tokenRouter has getUsageSummary procedure (query)", async () => {
    const { tokenRouter } = await import("../../src/routes/token.js");
    const def = (tokenRouter as any)._def;
    expect(def.procedures).toHaveProperty("getUsageSummary");
    expect(def.procedures.getUsageSummary._def.type).toBe("query");
  });

  it("tokenRouter has getUsageSeries procedure (query)", async () => {
    const { tokenRouter } = await import("../../src/routes/token.js");
    const def = (tokenRouter as any)._def;
    expect(def.procedures).toHaveProperty("getUsageSeries");
    expect(def.procedures.getUsageSeries._def.type).toBe("query");
  });
});

// ---------------------------------------------------------------------------
// Integration: getUsageSummary
// ---------------------------------------------------------------------------

describe("tokenRouter.getUsageSummary", () => {
  it("returns zero totals when no token_usage rows exist", async () => {
    const resp = await app.inject({
      method: "GET",
      url: "/trpc/token.getUsageSummary?input=" +
        encodeURIComponent(JSON.stringify({ sinceMs: 0 })),
    });

    expect(resp.statusCode).toBe(200);
    const data = JSON.parse(resp.body).result.data;
    expect(data).toHaveProperty("inputTokens");
    expect(data).toHaveProperty("outputTokens");
    expect(data).toHaveProperty("cacheTokens");
    expect(data.inputTokens).toBe(0);
    expect(data.outputTokens).toBe(0);
    expect(data.cacheTokens).toBe(0);
  });

  it("aggregates tokens from inserted rows", async () => {
    // Insert token_usage directly via DB (not route — no insert route in scope)
    // WHY: use dbPath (CLAUDE_LOOM_DB_PATH) so test uses the same isolated DB as the route.
    const { createDBClient } = await import("../../src/db/client.js");
    const { tokenUsage } = await import("../../src/db/schema.js");
    const db = createDBClient(dbPath);

    const sessionId = `sess-${randomUUID()}`;
    const now = Date.now();
    await db.insert(tokenUsage).values([
      { sessionId, bucketAt: now - 1000, inputTokens: 100, outputTokens: 200, cacheTokens: 50 },
      { sessionId, bucketAt: now - 2000, inputTokens: 150, outputTokens: 300, cacheTokens: 75 },
    ]);

    const resp = await app.inject({
      method: "GET",
      url: "/trpc/token.getUsageSummary?input=" +
        encodeURIComponent(JSON.stringify({ sinceMs: now - 10000 })),
    });

    expect(resp.statusCode).toBe(200);
    const data = JSON.parse(resp.body).result.data;
    expect(data.inputTokens).toBe(250);
    expect(data.outputTokens).toBe(500);
    expect(data.cacheTokens).toBe(125);
  });

  it("filters by sessionId when provided", async () => {
    const { createDBClient } = await import("../../src/db/client.js");
    const { tokenUsage } = await import("../../src/db/schema.js");
    const db = createDBClient(dbPath);

    const sessionA = `sess-a-${randomUUID()}`;
    const sessionB = `sess-b-${randomUUID()}`;
    const now = Date.now();
    await db.insert(tokenUsage).values([
      { sessionId: sessionA, bucketAt: now - 1000, inputTokens: 100, outputTokens: 200, cacheTokens: 0 },
      { sessionId: sessionB, bucketAt: now - 1000, inputTokens: 999, outputTokens: 999, cacheTokens: 999 },
    ]);

    const resp = await app.inject({
      method: "GET",
      url: "/trpc/token.getUsageSummary?input=" +
        encodeURIComponent(JSON.stringify({ sessionId: sessionA, sinceMs: now - 10000 })),
    });

    expect(resp.statusCode).toBe(200);
    const data = JSON.parse(resp.body).result.data;
    expect(data.inputTokens).toBe(100);
    expect(data.outputTokens).toBe(200);
    expect(data.cacheTokens).toBe(0);
  });

  it("filters out rows older than sinceMs", async () => {
    const { createDBClient } = await import("../../src/db/client.js");
    const { tokenUsage } = await import("../../src/db/schema.js");
    const db = createDBClient(dbPath);

    const sessionId = `sess-${randomUUID()}`;
    const now = Date.now();
    await db.insert(tokenUsage).values([
      { sessionId, bucketAt: now - 100, inputTokens: 50, outputTokens: 100, cacheTokens: 10 },
      { sessionId: `sess-old-${randomUUID()}`, bucketAt: now - 1000000, inputTokens: 9999, outputTokens: 9999, cacheTokens: 9999 },
    ]);

    const resp = await app.inject({
      method: "GET",
      url: "/trpc/token.getUsageSummary?input=" +
        encodeURIComponent(JSON.stringify({ sinceMs: now - 500 })),
    });

    expect(resp.statusCode).toBe(200);
    const data = JSON.parse(resp.body).result.data;
    expect(data.inputTokens).toBe(50);
    expect(data.outputTokens).toBe(100);
    expect(data.cacheTokens).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Integration: getUsageSeries
// ---------------------------------------------------------------------------

describe("tokenRouter.getUsageSeries", () => {
  it("returns empty array when no token_usage rows exist", async () => {
    const resp = await app.inject({
      method: "GET",
      url: "/trpc/token.getUsageSeries?input=" +
        encodeURIComponent(JSON.stringify({ sinceMs: 0 })),
    });

    expect(resp.statusCode).toBe(200);
    const data = JSON.parse(resp.body).result.data;
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(0);
  });

  it("returns array of { bucketAt, inputTokens, outputTokens, cacheTokens } per bucket", async () => {
    const { createDBClient } = await import("../../src/db/client.js");
    const { tokenUsage } = await import("../../src/db/schema.js");
    const db = createDBClient(dbPath);

    const sessionId = `sess-${randomUUID()}`;
    const now = Date.now();
    const bucket1 = now - 2000;
    const bucket2 = now - 1000;
    await db.insert(tokenUsage).values([
      { sessionId, bucketAt: bucket1, inputTokens: 10, outputTokens: 20, cacheTokens: 5 },
      { sessionId, bucketAt: bucket2, inputTokens: 30, outputTokens: 40, cacheTokens: 15 },
    ]);

    const resp = await app.inject({
      method: "GET",
      url: "/trpc/token.getUsageSeries?input=" +
        encodeURIComponent(JSON.stringify({ sinceMs: now - 10000 })),
    });

    expect(resp.statusCode).toBe(200);
    const data = JSON.parse(resp.body).result.data;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(2);

    const point = data[0];
    expect(point).toHaveProperty("bucketAt");
    expect(point).toHaveProperty("inputTokens");
    expect(point).toHaveProperty("outputTokens");
    expect(point).toHaveProperty("cacheTokens");
  });

  it("aggregates multiple sessions per bucket", async () => {
    const { createDBClient } = await import("../../src/db/client.js");
    const { tokenUsage } = await import("../../src/db/schema.js");
    const db = createDBClient(dbPath);

    const bucket = Date.now() - 500;
    await db.insert(tokenUsage).values([
      { sessionId: `sess-x-${randomUUID()}`, bucketAt: bucket, inputTokens: 100, outputTokens: 0, cacheTokens: 0 },
      { sessionId: `sess-y-${randomUUID()}`, bucketAt: bucket, inputTokens: 200, outputTokens: 0, cacheTokens: 0 },
    ]);

    const resp = await app.inject({
      method: "GET",
      url: "/trpc/token.getUsageSeries?input=" +
        encodeURIComponent(JSON.stringify({ sinceMs: bucket - 1000 })),
    });

    expect(resp.statusCode).toBe(200);
    const data = JSON.parse(resp.body).result.data;
    // Both rows are at the same bucket — should be aggregated
    const bucketRow = data.find((d: any) => d.bucketAt === bucket);
    expect(bucketRow).toBeDefined();
    expect(bucketRow.inputTokens).toBe(300);
  });
});
