/**
 * Task 8 TDD: discipline tRPC router
 * RED: tests written before route file exists
 * M1.5 Q6 — process discipline metrics + violations
 *
 * NOTE: tRPC v11 flattens nested routers with dot-notation keys in _def.procedures
 * e.g. metrics.live, metrics.history, violations.list, violations.ack
 */
import { describe, it, expect } from "vitest";

describe("disciplineRouter", () => {
  it("exports disciplineRouter from routes/discipline.ts", async () => {
    const mod = await import("../src/routes/discipline.js");
    expect(mod.disciplineRouter).toBeDefined();
  });

  it("disciplineRouter has metrics.live, metrics.history, violations.list, violations.ack procedures", async () => {
    const { disciplineRouter } = await import("../src/routes/discipline.js");
    const def = (disciplineRouter as any)._def;
    const keys = Object.keys(def.procedures);
    expect(keys).toContain("metrics.live");
    expect(keys).toContain("metrics.history");
    expect(keys).toContain("violations.list");
    expect(keys).toContain("violations.ack");
  });

  it("disciplineRouter.metrics.live is a query procedure", async () => {
    const { disciplineRouter } = await import("../src/routes/discipline.js");
    const def = (disciplineRouter as any)._def;
    expect(def.procedures["metrics.live"]._def.type).toBe("query");
  });

  it("disciplineRouter.metrics.history is a query procedure", async () => {
    const { disciplineRouter } = await import("../src/routes/discipline.js");
    const def = (disciplineRouter as any)._def;
    expect(def.procedures["metrics.history"]._def.type).toBe("query");
  });

  it("disciplineRouter.violations.list is a query procedure", async () => {
    const { disciplineRouter } = await import("../src/routes/discipline.js");
    const def = (disciplineRouter as any)._def;
    expect(def.procedures["violations.list"]._def.type).toBe("query");
  });

  it("disciplineRouter.violations.ack is a mutation procedure", async () => {
    const { disciplineRouter } = await import("../src/routes/discipline.js");
    const def = (disciplineRouter as any)._def;
    expect(def.procedures["violations.ack"]._def.type).toBe("mutation");
  });

  it("disciplineRouter.metrics.history accepts projectId and optional milestone", async () => {
    const { disciplineRouter } = await import("../src/routes/discipline.js");
    const def = (disciplineRouter as any)._def;
    const historyInput = def.procedures["metrics.history"]._def.inputs[0];
    // with only projectId
    const r1 = historyInput.safeParse({ projectId: "proj-1" });
    expect(r1.success).toBe(true);
    // with optional milestone
    const r2 = historyInput.safeParse({ projectId: "proj-1", milestone: "m1.5" });
    expect(r2.success).toBe(true);
  });

  it("disciplineRouter.violations.list accepts projectId and optional type", async () => {
    const { disciplineRouter } = await import("../src/routes/discipline.js");
    const def = (disciplineRouter as any)._def;
    const listInput = def.procedures["violations.list"]._def.inputs[0];
    const r1 = listInput.safeParse({ projectId: "proj-1" });
    expect(r1.success).toBe(true);
    const r2 = listInput.safeParse({ projectId: "proj-1", type: "tdd_violation" });
    expect(r2.success).toBe(true);
  });

  it("disciplineRouter.violations.ack accepts violationId string", async () => {
    const { disciplineRouter } = await import("../src/routes/discipline.js");
    const def = (disciplineRouter as any)._def;
    const ackInput = def.procedures["violations.ack"]._def.inputs[0];
    const result = ackInput.safeParse({ violationId: "event-42" });
    expect(result.success).toBe(true);
  });
});
