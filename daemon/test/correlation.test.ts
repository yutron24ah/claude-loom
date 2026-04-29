/**
 * Task 12: hooks/correlation.ts subagent FIFO logic tests
 * TDD: RED phase — write failing tests first
 * SPEC §6.4: PreToolUse(Task) + SubagentStart FIFO matching
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createDBClient, runMigrations } from "../src/db/client.js";
import {
  pushTaskDispatch,
  popTaskDispatch,
  correlateSubagent,
} from "../src/hooks/correlation.js";

let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `correlation-test-${randomUUID()}`);
  mkdirSync(testDir, { recursive: true });
  const dbPath = join(testDir, "test.db");
  // Run migrations on the test db
  const db = createDBClient(dbPath);
  runMigrations(db);
  process.env.CLAUDE_LOOM_DB_PATH = dbPath;
});

afterEach(() => {
  delete process.env.CLAUDE_LOOM_DB_PATH;
  rmSync(testDir, { recursive: true, force: true });
});

describe("hooks/correlation.ts (Task 12)", () => {
  describe("FIFO queue: pushTaskDispatch / popTaskDispatch", () => {
    it("popTaskDispatch returns undefined for empty queue", () => {
      const result = popTaskDispatch("session-empty-" + Date.now());
      expect(result).toBeUndefined();
    });

    it("pushTaskDispatch then popTaskDispatch returns pushed taskId", () => {
      const sessionId = "session-fifo-" + Date.now();
      pushTaskDispatch(sessionId, "task-001");
      const popped = popTaskDispatch(sessionId);
      expect(popped).toBe("task-001");
    });

    it("FIFO ordering: first in, first out", () => {
      const sessionId = "session-fifo-order-" + Date.now();
      pushTaskDispatch(sessionId, "task-A");
      pushTaskDispatch(sessionId, "task-B");
      pushTaskDispatch(sessionId, "task-C");

      expect(popTaskDispatch(sessionId)).toBe("task-A");
      expect(popTaskDispatch(sessionId)).toBe("task-B");
      expect(popTaskDispatch(sessionId)).toBe("task-C");
      expect(popTaskDispatch(sessionId)).toBeUndefined();
    });

    it("queues are per-session: different sessions do not interfere", () => {
      const sessionA = "session-A-" + Date.now();
      const sessionB = "session-B-" + Date.now();

      pushTaskDispatch(sessionA, "task-for-A");
      pushTaskDispatch(sessionB, "task-for-B");

      expect(popTaskDispatch(sessionA)).toBe("task-for-A");
      expect(popTaskDispatch(sessionB)).toBe("task-for-B");
    });

    it("queue is empty after all tasks are popped", () => {
      const sessionId = "session-drain-" + Date.now();
      pushTaskDispatch(sessionId, "task-X");
      popTaskDispatch(sessionId);
      expect(popTaskDispatch(sessionId)).toBeUndefined();
    });
  });

  describe("correlateSubagent", () => {
    it("returns empty object when no parent hint provided for SubagentStart", async () => {
      const result = await correlateSubagent({
        subagentSessionId: "sub-session-no-hint",
        hookEventName: "SubagentStart",
        // no parentSessionIdHint
      });
      expect(result).toEqual({});
    });

    it("returns empty object when queue is empty for parent session", async () => {
      const result = await correlateSubagent({
        subagentSessionId: "sub-session-empty-queue",
        hookEventName: "SubagentStart",
        parentSessionIdHint: "parent-session-no-tasks-" + Date.now(),
      });
      expect(result).toEqual({});
    });

    it("correlates subagent with parent when task exists in queue", async () => {
      const parentSession = "parent-correlate-" + Date.now();
      const subSession = "sub-correlate-" + Date.now();
      const taskId = "task-correlate-" + Date.now();

      pushTaskDispatch(parentSession, taskId);

      const result = await correlateSubagent({
        subagentSessionId: subSession,
        hookEventName: "SubagentStart",
        parentSessionIdHint: parentSession,
      });

      expect(result.parentSessionId).toBe(parentSession);
      expect(result.taskId).toBe(taskId);
    });

    it("SubagentStop returns empty object (no error)", async () => {
      const result = await correlateSubagent({
        subagentSessionId: "sub-session-stop-" + Date.now(),
        hookEventName: "SubagentStop",
      });
      // SubagentStop just updates status, returns {}
      expect(result).toEqual({});
    });

    it("pops task from queue after correlating (FIFO consumed)", async () => {
      const parentSession = "parent-consumed-" + Date.now();
      const taskId = "task-consumed-" + Date.now();

      pushTaskDispatch(parentSession, taskId);

      // First correlate should consume the task
      await correlateSubagent({
        subagentSessionId: "sub-first-" + Date.now(),
        hookEventName: "SubagentStart",
        parentSessionIdHint: parentSession,
      });

      // Second correlate should find no task
      const result2 = await correlateSubagent({
        subagentSessionId: "sub-second-" + Date.now(),
        hookEventName: "SubagentStart",
        parentSessionIdHint: parentSession,
      });
      expect(result2).toEqual({});
    });
  });
});
