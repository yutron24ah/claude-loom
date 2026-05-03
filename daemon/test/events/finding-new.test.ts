/**
 * M4 t7: finding.new event — existing schema validation + broadcaster wire.
 * TDD RED phase — written to verify the existing schema + new broadcaster path
 * that t3 dev will call (emitFindingNew already exists; this test confirms the wire).
 *
 * WHY: findingNewEventSchema already exists (M2 §3.6.9.4), broadcaster.emitFindingNew
 * already exists. This test suite makes explicit the expected contract so
 * that if any future refactor breaks it, the CI catches it immediately.
 * Principle §8: test behavior (what the emitter produces), not implementation.
 */
import { describe, it, expect } from "vitest";
import { FINDING_SEVERITY } from "../../src/constants/consistency.js";

describe("findingNewEventSchema — existing schema (re-verified for M4 t7 wire)", () => {
  it("valid finding.new event parses successfully", async () => {
    const { findingNewEventSchema } = await import("../../src/events/types.js");
    const result = findingNewEventSchema.safeParse({
      type: "finding.new",
      timestamp: Date.now(),
      payload: {
        findingId: "f-001",
        severity: FINDING_SEVERITY.HIGH,
        targetDoc: "CLAUDE.md",
        message: "term 'agent' redefined in §2 conflicts with §5",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown severity value", async () => {
    const { findingNewEventSchema } = await import("../../src/events/types.js");
    const result = findingNewEventSchema.safeParse({
      type: "finding.new",
      timestamp: Date.now(),
      payload: {
        findingId: "f-bad",
        severity: "critical", // not in enum
        targetDoc: "SPEC.md",
        message: "msg",
      },
    });
    expect(result.success).toBe(false);
  });

  it("severity enum values match FINDING_SEVERITY constants", async () => {
    // WHY: §3.6.10 — constants are SSoT; schema enum must stay in sync.
    const { findingNewEventSchema } = await import("../../src/events/types.js");
    for (const sev of [FINDING_SEVERITY.HIGH, FINDING_SEVERITY.MEDIUM, FINDING_SEVERITY.LOW]) {
      const result = findingNewEventSchema.safeParse({
        type: "finding.new",
        timestamp: 0,
        payload: { findingId: "f-x", severity: sev, targetDoc: "SPEC.md", message: "m" },
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("broadcaster.emitFindingNew — existing wire (re-verified for M4 t7)", () => {
  it("broadcaster has emitFindingNew method", async () => {
    const { broadcaster } = await import("../../src/events/broadcaster.js");
    expect(typeof broadcaster.emitFindingNew).toBe("function");
  });

  it("emitFindingNew emits finding.new event with correct payload", async () => {
    const { broadcaster } = await import("../../src/events/broadcaster.js");
    const received: any[] = [];
    const handler = (e: any) => received.push(e);
    broadcaster.on("finding.new", handler);

    broadcaster.emitFindingNew({
      findingId: "f-emit-test",
      severity: FINDING_SEVERITY.MEDIUM,
      targetDoc: "PLAN.md",
      message: "plan section misaligns with spec",
    });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe("finding.new");
    expect(received[0].payload.findingId).toBe("f-emit-test");
    expect(received[0].payload.severity).toBe(FINDING_SEVERITY.MEDIUM);
    expect(received[0].payload.targetDoc).toBe("PLAN.md");
    expect(received[0].timestamp).toBeGreaterThan(0);

    broadcaster.off("finding.new", handler);
  });

  it("emitFindingNew also emits to wildcard '*' listener", async () => {
    const { broadcaster } = await import("../../src/events/broadcaster.js");
    const received: any[] = [];
    const handler = (e: any) => {
      if (e.type === "finding.new") received.push(e);
    };
    broadcaster.on("*", handler);

    broadcaster.emitFindingNew({
      findingId: "f-wildcard",
      severity: FINDING_SEVERITY.LOW,
      targetDoc: "SPEC.md",
      message: "low severity issue",
    });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe("finding.new");

    broadcaster.off("*", handler);
  });
});
