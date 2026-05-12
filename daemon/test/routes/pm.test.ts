/**
 * M0.15 t13 — REQ-074: pm sub-router endpoint tests.
 *
 * WHY: 4 endpoints (POST /pm/start, POST /pm/say, POST /pm/permission/:reqId,
 * POST /pm/stop) are stub implementations for M0.15. Actual claude CLI spawn
 * (Phase 5 t17) is NOT tested here — only the broadcast + response contract.
 *
 * Principle §8: test behavior (HTTP + broadcast side-effects), not internals.
 * Principle §4: minimal stub impl — only what's needed for this task.
 * Principle §9: fail fast — missing required body fields → 400.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { buildServer } from "../../src/server.js";

let app: FastifyInstance;
let dbPath: string;

beforeEach(async () => {
  const dir = join(tmpdir(), `pm-route-${randomUUID()}`);
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
// POST /pm/start
// ---------------------------------------------------------------------------

describe("POST /pm/start", () => {
  it("returns 200 with started: true", async () => {
    const resp = await app.inject({
      method: "POST",
      url: "/pm/start",
    });
    expect(resp.statusCode).toBe(200);
    const body = JSON.parse(resp.body);
    expect(body.started).toBe(true);
  });

  it("emits pm.message system event on start", async () => {
    const { broadcaster } = await import("../../src/events/broadcaster.js");
    const received: unknown[] = [];
    const handler = (e: unknown) => received.push(e);
    broadcaster.on("pm.message", handler);

    await app.inject({ method: "POST", url: "/pm/start" });

    // At least one pm.message event emitted
    expect(received.length).toBeGreaterThanOrEqual(1);
    const ev = received[0] as { type: string; payload: { who: string } };
    expect(ev.type).toBe("pm.message");
    // system message should be from "pm"
    expect(ev.payload.who).toBe("pm");

    broadcaster.off("pm.message", handler);
  });
});

// ---------------------------------------------------------------------------
// POST /pm/say
// ---------------------------------------------------------------------------

describe("POST /pm/say", () => {
  it("returns 200 with echoed message info when text is provided", async () => {
    const resp = await app.inject({
      method: "POST",
      url: "/pm/say",
      payload: { text: "テスト送信" },
    });
    expect(resp.statusCode).toBe(200);
    const body = JSON.parse(resp.body);
    expect(body.sent).toBe(true);
  });

  it("returns 400 when text field is missing", async () => {
    const resp = await app.inject({
      method: "POST",
      url: "/pm/say",
      payload: {},
    });
    expect(resp.statusCode).toBe(400);
  });

  it("emits pm.message event for user message on /pm/say", async () => {
    const { broadcaster } = await import("../../src/events/broadcaster.js");
    const received: unknown[] = [];
    const handler = (e: unknown) => received.push(e);
    broadcaster.on("pm.message", handler);

    await app.inject({
      method: "POST",
      url: "/pm/say",
      payload: { text: "hello PM" },
    });

    expect(received.length).toBeGreaterThanOrEqual(1);
    const userMsg = (received as Array<{ type: string; payload: { who: string; text: string } }>)
      .find(e => e.payload.who === "user");
    expect(userMsg).toBeDefined();
    expect(userMsg!.payload.text).toBe("hello PM");

    broadcaster.off("pm.message", handler);
  });
});

// ---------------------------------------------------------------------------
// POST /pm/permission/:reqId
// ---------------------------------------------------------------------------

describe("POST /pm/permission/:reqId", () => {
  it("returns 200 with resolved: true when allow=true", async () => {
    const resp = await app.inject({
      method: "POST",
      url: "/pm/permission/req-001",
      payload: { allow: true },
    });
    expect(resp.statusCode).toBe(200);
    const body = JSON.parse(resp.body);
    expect(body.resolved).toBe(true);
  });

  it("returns 200 when allow=false (reject)", async () => {
    const resp = await app.inject({
      method: "POST",
      url: "/pm/permission/req-002",
      payload: { allow: false },
    });
    expect(resp.statusCode).toBe(200);
  });

  it("returns 400 when allow field is missing", async () => {
    const resp = await app.inject({
      method: "POST",
      url: "/pm/permission/req-003",
      payload: {},
    });
    expect(resp.statusCode).toBe(400);
  });

  it("emits pm.permission_resolved event with correct id and allow value", async () => {
    const { broadcaster } = await import("../../src/events/broadcaster.js");
    const received: unknown[] = [];
    const handler = (e: unknown) => received.push(e);
    broadcaster.on("pm.permission_resolved", handler);

    await app.inject({
      method: "POST",
      url: "/pm/permission/req-signal",
      payload: { allow: true },
    });

    expect(received).toHaveLength(1);
    const ev = received[0] as { type: string; payload: { id: string; allow: boolean } };
    expect(ev.type).toBe("pm.permission_resolved");
    expect(ev.payload.id).toBe("req-signal");
    expect(ev.payload.allow).toBe(true);

    broadcaster.off("pm.permission_resolved", handler);
  });
});

// ---------------------------------------------------------------------------
// POST /pm/stop
// ---------------------------------------------------------------------------

describe("POST /pm/stop", () => {
  it("returns 200 with stopped: true", async () => {
    const resp = await app.inject({
      method: "POST",
      url: "/pm/stop",
    });
    expect(resp.statusCode).toBe(200);
    const body = JSON.parse(resp.body);
    expect(body.stopped).toBe(true);
  });

  it("emits pm.message system event on stop", async () => {
    const { broadcaster } = await import("../../src/events/broadcaster.js");
    const received: unknown[] = [];
    const handler = (e: unknown) => received.push(e);
    broadcaster.on("pm.message", handler);

    await app.inject({ method: "POST", url: "/pm/stop" });

    expect(received.length).toBeGreaterThanOrEqual(1);
    const ev = received[0] as { type: string; payload: { who: string } };
    expect(ev.type).toBe("pm.message");
    expect(ev.payload.who).toBe("pm");

    broadcaster.off("pm.message", handler);
  });
});

// ---------------------------------------------------------------------------
// pmRouter shape
// ---------------------------------------------------------------------------

describe("pmRouter — router structure", () => {
  it("appRouter has pm sub-router", async () => {
    const { appRouter } = await import("../../src/router.js");
    const def = (appRouter as unknown as { _def: { procedures: Record<string, unknown> } })._def;
    // pm sub-router contributes pm.start procedure
    expect(def.procedures).toHaveProperty("pm.start");
  });
});
