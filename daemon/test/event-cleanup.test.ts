/**
 * Task 16: lifecycle/event-cleanup.ts tests
 * TDD: RED phase — write failing tests first
 * SPEC §6.6: rolling delete — 30 days OR 200 MB limit
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runEventCleanup, scheduleEventCleanup } from "../src/lifecycle/event-cleanup.js";
import { createDBClient, runMigrations } from "../src/db/client.js";
import { events } from "../src/db/schema.js";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";

function makeTestDb() {
  const dir = join(tmpdir(), `cleanup-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  const dbPath = join(dir, "test.db");
  const db = createDBClient(dbPath);
  runMigrations(db);
  return { db, dbPath, dir };
}

describe("lifecycle/event-cleanup.ts (Task 16)", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("exports runEventCleanup and scheduleEventCleanup functions", async () => {
    const mod = await import("../src/lifecycle/event-cleanup.js");
    expect(typeof mod.runEventCleanup).toBe("function");
    expect(typeof mod.scheduleEventCleanup).toBe("function");
  });

  it("returns { ageDeleted: 0, sizeOver: 0 } when no events exist", async () => {
    const { dbPath, dir } = makeTestDb();
    try {
      const result = await runEventCleanup({
        retentionDays: 30,
        maxSizeMb: 200,
        dbPath,
      });
      expect(result.ageDeleted).toBe(0);
      expect(result.sizeOver).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("deletes events older than retentionDays", async () => {
    const { db, dbPath, dir } = makeTestDb();
    try {
      const now = Date.now();
      const thirtyOneDaysAgo = new Date(now - 31 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

      // Insert 2 old events (31 days old) and 1 recent event
      await db.insert(events).values([
        {
          sessionId: "old-session-1",
          eventType: "stop",
          toolName: null,
          payload: {},
          createdAt: thirtyOneDaysAgo,
        },
        {
          sessionId: "old-session-2",
          eventType: "session_start",
          toolName: null,
          payload: {},
          createdAt: thirtyOneDaysAgo,
        },
        {
          sessionId: "recent-session",
          eventType: "post_tool",
          toolName: "Bash",
          payload: {},
          createdAt: oneDayAgo,
        },
      ]);

      const result = await runEventCleanup({
        retentionDays: 30,
        maxSizeMb: 200,
        dbPath,
      });

      expect(result.ageDeleted).toBe(2);
      expect(result.sizeOver).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not delete events within retention window", async () => {
    const { db, dbPath, dir } = makeTestDb();
    try {
      const now = Date.now();
      const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000);

      await db.insert(events).values({
        sessionId: "fresh-session",
        eventType: "pre_tool",
        toolName: "Read",
        payload: {},
        createdAt: tenDaysAgo,
      });

      const result = await runEventCleanup({
        retentionDays: 30,
        maxSizeMb: 200,
        dbPath,
      });

      expect(result.ageDeleted).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("scheduleEventCleanup returns a stop() function", () => {
    vi.useFakeTimers();
    const { dbPath, dir } = makeTestDb();
    try {
      const handle = scheduleEventCleanup({ dbPath });
      expect(typeof handle.stop).toBe("function");
      handle.stop();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("scheduleEventCleanup stop() prevents further cleanups", async () => {
    vi.useFakeTimers();
    const { db, dbPath, dir } = makeTestDb();
    try {
      const runSpy = vi.fn().mockResolvedValue({ ageDeleted: 0, sizeOver: 0 });

      // Use a very short interval for testing
      const handle = scheduleEventCleanup({ dbPath, intervalMs: 1000 });
      // Stop immediately
      handle.stop();

      // Advance timers — spy should not have been called
      vi.advanceTimersByTime(5000);
      await vi.runAllTimersAsync();

      // No cleanup should have run
      expect(runSpy).not.toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("runEventCleanup with custom retentionDays=7 deletes 8-day-old events", async () => {
    const { db, dbPath, dir } = makeTestDb();
    try {
      const now = Date.now();
      const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000);
      const fiveDaysAgo = new Date(now - 5 * 24 * 60 * 60 * 1000);

      await db.insert(events).values([
        {
          sessionId: "old-7",
          eventType: "stop",
          toolName: null,
          payload: {},
          createdAt: eightDaysAgo,
        },
        {
          sessionId: "fresh-7",
          eventType: "stop",
          toolName: null,
          payload: {},
          createdAt: fiveDaysAgo,
        },
      ]);

      const result = await runEventCleanup({
        retentionDays: 7,
        maxSizeMb: 200,
        dbPath,
      });

      expect(result.ageDeleted).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
