/**
 * M4 t7: spec_change_detected event — schema validation + broadcaster emit
 * TDD RED phase — written before implementation exists.
 *
 * WHY: Principle §8 (test behavior, not implementation).
 * Tests the public shape: schema parsing + broadcaster emit contract.
 */
import { describe, it, expect } from "vitest";

describe("specChangeDetectedEventSchema — schema validation", () => {
  it("exports specChangeDetectedEventSchema from events/types.ts", async () => {
    const mod = await import("../../src/events/types.js");
    expect((mod as any).specChangeDetectedEventSchema).toBeDefined();
  });

  it("valid spec_change_detected event parses successfully", async () => {
    const { specChangeDetectedEventSchema } = await import("../../src/events/types.js") as any;
    const result = specChangeDetectedEventSchema.safeParse({
      type: "spec_change_detected",
      timestamp: Date.now(),
      payload: {
        specChangeId: 1,
        projectId: "proj-abc",
        specPath: "SPEC.md",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects event with missing required payload fields", async () => {
    const { specChangeDetectedEventSchema } = await import("../../src/events/types.js") as any;
    // Missing projectId
    const result = specChangeDetectedEventSchema.safeParse({
      type: "spec_change_detected",
      timestamp: Date.now(),
      payload: {
        specChangeId: 1,
        specPath: "SPEC.md",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong event type literal", async () => {
    const { specChangeDetectedEventSchema } = await import("../../src/events/types.js") as any;
    const result = specChangeDetectedEventSchema.safeParse({
      type: "wrong_type",
      timestamp: Date.now(),
      payload: {
        specChangeId: 1,
        projectId: "proj-abc",
        specPath: "SPEC.md",
      },
    });
    expect(result.success).toBe(false);
  });

  it("loomEventSchema discriminated union includes spec_change_detected", async () => {
    const { loomEventSchema } = await import("../../src/events/types.js");
    const result = loomEventSchema.safeParse({
      type: "spec_change_detected",
      timestamp: Date.now(),
      payload: {
        specChangeId: 2,
        projectId: "proj-xyz",
        specPath: "SPEC.md",
      },
    });
    expect(result.success).toBe(true);
  });

  it("exports SpecChangeDetectedEvent type (inferred from schema)", async () => {
    // Type-level test: ensure the type can be imported without TS error.
    // WHY: compile-time check surfaced at import time.
    const mod = await import("../../src/events/types.js") as any;
    expect(mod.specChangeDetectedEventSchema).toBeDefined();
  });
});

describe("broadcaster.emitSpecChangeDetected — emit wire", () => {
  it("broadcaster exports emitSpecChangeDetected method", async () => {
    const { broadcaster } = await import("../../src/events/broadcaster.js");
    expect(typeof (broadcaster as any).emitSpecChangeDetected).toBe("function");
  });

  it("emitSpecChangeDetected emits spec_change_detected event on broadcaster", async () => {
    const { broadcaster } = await import("../../src/events/broadcaster.js");
    const received: any[] = [];
    const handler = (e: any) => received.push(e);
    broadcaster.on("spec_change_detected", handler);

    (broadcaster as any).emitSpecChangeDetected({
      specChangeId: 42,
      projectId: "proj-test",
      specPath: "SPEC.md",
    });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe("spec_change_detected");
    expect(received[0].payload.specChangeId).toBe(42);
    expect(received[0].payload.projectId).toBe("proj-test");
    expect(received[0].payload.specPath).toBe("SPEC.md");
    expect(received[0].timestamp).toBeGreaterThan(0);

    broadcaster.off("spec_change_detected", handler);
  });

  it("emitSpecChangeDetected also emits to wildcard '*' listener", async () => {
    const { broadcaster } = await import("../../src/events/broadcaster.js");
    const received: any[] = [];
    const handler = (e: any) => {
      if (e.type === "spec_change_detected") received.push(e);
    };
    broadcaster.on("*", handler);

    (broadcaster as any).emitSpecChangeDetected({
      specChangeId: 7,
      projectId: "proj-wildcard",
      specPath: "docs/SPEC.md",
    });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe("spec_change_detected");

    broadcaster.off("*", handler);
  });
});
