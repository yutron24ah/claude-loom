/**
 * Task 11: hooks/ingest.ts POST /event handler tests
 * TDD: RED phase — write failing tests first
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buildServer } from "../src/server.js";
import type { FastifyInstance } from "fastify";
import Database from "better-sqlite3";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

let app: FastifyInstance;
let dbPath: string;

beforeEach(async () => {
  const dir = join(tmpdir(), `ingest-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  dbPath = join(dir, "test.db");

  // Set env var so createDBClient uses our test db
  process.env.CLAUDE_LOOM_DB_PATH = dbPath;

  app = await buildServer();
  await app.ready();
});

afterEach(async () => {
  await app.close();
  delete process.env.CLAUDE_LOOM_DB_PATH;
});

describe("POST /event handler (Task 11)", () => {
  it("returns 400 for invalid body", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/event",
      payload: { invalid: true },
    });
    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toBe("invalid event");
  });

  it("returns 400 when sessionId is missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/event",
      payload: {
        eventType: "session_start",
        payload: {},
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for unknown eventType", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/event",
      payload: {
        sessionId: "test-session",
        eventType: "unknown_event",
        payload: {},
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it("persists event and returns ok + eventId for valid session_start", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/event",
      payload: {
        sessionId: "test-session-123",
        eventType: "session_start",
        payload: { cwd: "/tmp/project" },
      },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.ok).toBe(true);
    expect(typeof body.eventId).toBe("number");
  });

  it("persists pre_tool event with toolName", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/event",
      payload: {
        sessionId: "test-session-456",
        eventType: "pre_tool",
        toolName: "Bash",
        payload: { command: "ls" },
      },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.ok).toBe(true);
    expect(typeof body.eventId).toBe("number");
  });

  it("persists stop event and event row exists in DB", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/event",
      payload: {
        sessionId: "stop-session-789",
        eventType: "stop",
        payload: { reason: "user_interrupt" },
      },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();

    // Verify the row in DB
    const db = new Database(dbPath);
    const row = db.prepare("SELECT * FROM events WHERE id = ?").get(body.eventId) as any;
    db.close();
    expect(row).toBeTruthy();
    expect(row.session_id).toBe("stop-session-789");
    expect(row.event_type).toBe("stop");
  });

  it("accepts all valid eventTypes", async () => {
    const eventTypes = ["session_start", "pre_tool", "post_tool", "stop", "subagent_stop"] as const;
    for (const eventType of eventTypes) {
      const response = await app.inject({
        method: "POST",
        url: "/event",
        payload: {
          sessionId: "session-all-types",
          eventType,
          payload: {},
        },
      });
      expect(response.statusCode).toBe(200);
    }
  });
});
