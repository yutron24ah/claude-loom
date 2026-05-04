/**
 * TDD tests for session.subscribe procedure and sessionChangeEventSchema (RED phase).
 *
 * WHY: M3.2 t1 — session subscription. Verifies that:
 *   1. sessionRouter has a `subscribe` subscription procedure
 *   2. sessionChangeEventSchema exists and validates correct payloads
 *   3. sessionChangeEventSchema rejects invalid action values (enum guard)
 *   4. broadcaster has emitSessionChange method
 *   5. emitSessionChange emits session.change event with correct payload
 *   6. loomEventSchema discriminated union includes session.change type
 *
 * SPEC §3.6.10: action enum ('started'|'ended'|'updated') must be defined as
 * enum/const, never compared as raw string literals in implementation.
 */
import { describe, it, expect } from "vitest";

describe("sessionRouter — subscribe procedure", () => {
  it("exports sessionRouter from routes/session.ts", async () => {
    const mod = await import("../src/routes/session.js");
    expect(mod.sessionRouter).toBeDefined();
  });

  it("sessionRouter has subscribe procedure", async () => {
    const { sessionRouter } = await import("../src/routes/session.js");
    const def = (sessionRouter as any)._def;
    expect(def.procedures).toHaveProperty("subscribe");
  });

  it("sessionRouter.subscribe is a subscription procedure", async () => {
    const { sessionRouter } = await import("../src/routes/session.js");
    const def = (sessionRouter as any)._def;
    expect(def.procedures.subscribe._def.type).toBe("subscription");
  });
});

describe("sessionChangeEventSchema", () => {
  it("exports sessionChangeEventSchema from events/types.ts", async () => {
    const mod = await import("../src/events/types.js");
    expect(mod.sessionChangeEventSchema).toBeDefined();
  });

  it("validates a valid started event", async () => {
    const { sessionChangeEventSchema } = await import("../src/events/types.js");
    const valid = {
      type: "session.change",
      timestamp: Date.now(),
      payload: {
        sessionId: "sess-001",
        action: "started",
        projectId: "proj-001",
        role: "pm",
        status: "active",
      },
    };
    const result = sessionChangeEventSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("validates a valid ended event", async () => {
    const { sessionChangeEventSchema } = await import("../src/events/types.js");
    const valid = {
      type: "session.change",
      timestamp: Date.now(),
      payload: {
        sessionId: "sess-002",
        action: "ended",
      },
    };
    const result = sessionChangeEventSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("validates a valid updated event", async () => {
    const { sessionChangeEventSchema } = await import("../src/events/types.js");
    const valid = {
      type: "session.change",
      timestamp: Date.now(),
      payload: {
        sessionId: "sess-003",
        action: "updated",
        status: "idle",
      },
    };
    const result = sessionChangeEventSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects invalid action value (string literal guard — SPEC §3.6.10)", async () => {
    const { sessionChangeEventSchema } = await import("../src/events/types.js");
    const invalid = {
      type: "session.change",
      timestamp: Date.now(),
      payload: {
        sessionId: "sess-004",
        action: "deleted",  // not in enum
      },
    };
    const result = sessionChangeEventSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects missing sessionId", async () => {
    const { sessionChangeEventSchema } = await import("../src/events/types.js");
    const invalid = {
      type: "session.change",
      timestamp: Date.now(),
      payload: {
        action: "started",
      },
    };
    const result = sessionChangeEventSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("loomEventSchema — session.change discriminated union", () => {
  it("loomEventSchema includes session.change variant", async () => {
    const { loomEventSchema } = await import("../src/events/types.js");
    const event = {
      type: "session.change",
      timestamp: Date.now(),
      payload: {
        sessionId: "sess-005",
        action: "started",
      },
    };
    const result = loomEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });
});

describe("broadcaster.emitSessionChange", () => {
  it("broadcaster has emitSessionChange method", async () => {
    const { broadcaster } = await import("../src/events/broadcaster.js");
    expect(typeof broadcaster.emitSessionChange).toBe("function");
  });

  it("emitSessionChange emits session.change event to listeners", async () => {
    const { broadcaster } = await import("../src/events/broadcaster.js");
    const received: unknown[] = [];
    const handler = (e: unknown) => received.push(e);
    broadcaster.on("session.change", handler);

    broadcaster.emitSessionChange({
      sessionId: "sess-test-1",
      action: "started",
      projectId: "proj-test",
      role: "pm",
      status: "active",
    });

    expect(received).toHaveLength(1);
    const evt = received[0] as { type: string; payload: { sessionId: string; action: string } };
    expect(evt.type).toBe("session.change");
    expect(evt.payload.sessionId).toBe("sess-test-1");
    expect(evt.payload.action).toBe("started");

    broadcaster.off("session.change", handler);
  });

  it("emitSessionChange also emits to wildcard '*' listener", async () => {
    const { broadcaster } = await import("../src/events/broadcaster.js");
    const received: unknown[] = [];
    const handler = (e: unknown) => received.push(e);
    broadcaster.on("*", handler);

    broadcaster.emitSessionChange({
      sessionId: "sess-test-2",
      action: "ended",
    });

    // Filter only session.change events (other tests may have emitted)
    const sessionEvents = (received as { type: string }[]).filter(
      (e) => e.type === "session.change"
    );
    expect(sessionEvents).toHaveLength(1);

    broadcaster.off("*", handler);
  });
});
