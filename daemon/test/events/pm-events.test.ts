/**
 * M0.15 t13 — REQ-074: pm.* event schema validation tests.
 *
 * WHY: Three new WS event types (pm.message / pm.permission_request /
 * pm.permission_resolved) must be validated via zod before broadcast.
 * These schemas mirror the daemon side of the PM chat protocol defined
 * in redesign/scenarios.js BACKEND INTEGRATION NOTES ⑬.
 *
 * Principle §8: test behavior (schema validation contract), not implementation.
 * Principle §6: illegal states (unknown who / risk enum) rejected at zod boundary.
 */
import { describe, it, expect } from "vitest";

describe("pmMessageEventSchema", () => {
  it("valid pm.message with who=pm parses successfully", async () => {
    const { pmMessageEventSchema } = await import("../../src/events/types.js");
    const result = pmMessageEventSchema.safeParse({
      type: "pm.message",
      timestamp: Date.now(),
      payload: {
        who: "pm",
        text: "M0.15 t13 実装 task を dispatch します",
        ts: "14:23",
      },
    });
    expect(result.success).toBe(true);
  });

  it("valid pm.message with who=user parses successfully", async () => {
    const { pmMessageEventSchema } = await import("../../src/events/types.js");
    const result = pmMessageEventSchema.safeParse({
      type: "pm.message",
      timestamp: Date.now(),
      payload: {
        who: "user",
        text: "実装を進めてください",
        ts: "14:24",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid who value (not user or pm)", async () => {
    const { pmMessageEventSchema } = await import("../../src/events/types.js");
    const result = pmMessageEventSchema.safeParse({
      type: "pm.message",
      timestamp: Date.now(),
      payload: {
        who: "admin", // not in enum
        text: "hello",
        ts: "14:25",
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("pmPermissionRequestEventSchema", () => {
  it("valid pm.permission_request with risk=high parses successfully", async () => {
    const { pmPermissionRequestEventSchema } = await import("../../src/events/types.js");
    const result = pmPermissionRequestEventSchema.safeParse({
      type: "pm.permission_request",
      timestamp: Date.now(),
      payload: {
        id: "req-001",
        tool: "Bash",
        args: "git push --force",
        risk: "high",
        from: "loom-developer",
      },
    });
    expect(result.success).toBe(true);
  });

  it("valid pm.permission_request with risk=med and low parses successfully", async () => {
    const { pmPermissionRequestEventSchema } = await import("../../src/events/types.js");
    for (const risk of ["med", "low"] as const) {
      const result = pmPermissionRequestEventSchema.safeParse({
        type: "pm.permission_request",
        timestamp: Date.now(),
        payload: {
          id: `req-${risk}`,
          tool: "Read",
          args: "src/index.ts",
          risk,
          from: "loom-developer",
        },
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid risk value (not low/med/high)", async () => {
    const { pmPermissionRequestEventSchema } = await import("../../src/events/types.js");
    const result = pmPermissionRequestEventSchema.safeParse({
      type: "pm.permission_request",
      timestamp: Date.now(),
      payload: {
        id: "req-bad",
        tool: "Bash",
        args: "rm -rf /",
        risk: "critical", // not in enum
        from: "dev",
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("pmPermissionResolvedEventSchema", () => {
  it("valid pm.permission_resolved with allow=true parses successfully", async () => {
    const { pmPermissionResolvedEventSchema } = await import("../../src/events/types.js");
    const result = pmPermissionResolvedEventSchema.safeParse({
      type: "pm.permission_resolved",
      timestamp: Date.now(),
      payload: {
        id: "req-001",
        allow: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it("valid pm.permission_resolved with allow=false parses successfully", async () => {
    const { pmPermissionResolvedEventSchema } = await import("../../src/events/types.js");
    const result = pmPermissionResolvedEventSchema.safeParse({
      type: "pm.permission_resolved",
      timestamp: Date.now(),
      payload: {
        id: "req-002",
        allow: false,
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing allow field", async () => {
    const { pmPermissionResolvedEventSchema } = await import("../../src/events/types.js");
    const result = pmPermissionResolvedEventSchema.safeParse({
      type: "pm.permission_resolved",
      timestamp: Date.now(),
      payload: {
        id: "req-003",
        // allow is missing
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("loomEventSchema — pm.* types in discriminated union", () => {
  it("pm.message is accepted by loomEventSchema discriminated union", async () => {
    const { loomEventSchema } = await import("../../src/events/types.js");
    const result = loomEventSchema.safeParse({
      type: "pm.message",
      timestamp: Date.now(),
      payload: { who: "pm", text: "hello", ts: "10:00" },
    });
    expect(result.success).toBe(true);
  });

  it("pm.permission_request is accepted by loomEventSchema discriminated union", async () => {
    const { loomEventSchema } = await import("../../src/events/types.js");
    const result = loomEventSchema.safeParse({
      type: "pm.permission_request",
      timestamp: Date.now(),
      payload: { id: "r1", tool: "Bash", args: "ls", risk: "low", from: "dev" },
    });
    expect(result.success).toBe(true);
  });

  it("pm.permission_resolved is accepted by loomEventSchema discriminated union", async () => {
    const { loomEventSchema } = await import("../../src/events/types.js");
    const result = loomEventSchema.safeParse({
      type: "pm.permission_resolved",
      timestamp: Date.now(),
      payload: { id: "r1", allow: true },
    });
    expect(result.success).toBe(true);
  });
});

describe("broadcaster — pm.* emit methods", () => {
  it("broadcaster has emitPmMessage method", async () => {
    const { broadcaster } = await import("../../src/events/broadcaster.js");
    expect(typeof broadcaster.emitPmMessage).toBe("function");
  });

  it("broadcaster has emitPmPermissionRequest method", async () => {
    const { broadcaster } = await import("../../src/events/broadcaster.js");
    expect(typeof broadcaster.emitPmPermissionRequest).toBe("function");
  });

  it("broadcaster has emitPmPermissionResolved method", async () => {
    const { broadcaster } = await import("../../src/events/broadcaster.js");
    expect(typeof broadcaster.emitPmPermissionResolved).toBe("function");
  });

  it("emitPmMessage emits pm.message event on the named channel", async () => {
    const { broadcaster } = await import("../../src/events/broadcaster.js");
    const received: unknown[] = [];
    const handler = (e: unknown) => received.push(e);
    broadcaster.on("pm.message", handler);

    broadcaster.emitPmMessage({ who: "pm", text: "test message", ts: "12:00" });

    expect(received).toHaveLength(1);
    const ev = received[0] as { type: string; payload: { who: string; text: string } };
    expect(ev.type).toBe("pm.message");
    expect(ev.payload.who).toBe("pm");
    expect(ev.payload.text).toBe("test message");

    broadcaster.off("pm.message", handler);
  });

  it("emitPmPermissionRequest emits on pm.permission_request channel", async () => {
    const { broadcaster } = await import("../../src/events/broadcaster.js");
    const received: unknown[] = [];
    const handler = (e: unknown) => received.push(e);
    broadcaster.on("pm.permission_request", handler);

    broadcaster.emitPmPermissionRequest({
      id: "req-test",
      tool: "Bash",
      args: "cat file.txt",
      risk: "low",
      from: "loom-developer",
    });

    expect(received).toHaveLength(1);
    const ev = received[0] as { type: string; payload: { id: string; risk: string } };
    expect(ev.type).toBe("pm.permission_request");
    expect(ev.payload.id).toBe("req-test");
    expect(ev.payload.risk).toBe("low");

    broadcaster.off("pm.permission_request", handler);
  });

  it("emitPmPermissionResolved emits on pm.permission_resolved channel", async () => {
    const { broadcaster } = await import("../../src/events/broadcaster.js");
    const received: unknown[] = [];
    const handler = (e: unknown) => received.push(e);
    broadcaster.on("pm.permission_resolved", handler);

    broadcaster.emitPmPermissionResolved({ id: "req-test", allow: true });

    expect(received).toHaveLength(1);
    const ev = received[0] as { type: string; payload: { id: string; allow: boolean } };
    expect(ev.type).toBe("pm.permission_resolved");
    expect(ev.payload.id).toBe("req-test");
    expect(ev.payload.allow).toBe(true);

    broadcaster.off("pm.permission_resolved", handler);
  });
});
