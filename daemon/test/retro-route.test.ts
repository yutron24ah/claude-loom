/**
 * Task 3 TDD: retro tRPC router
 * RED: tests written before route file exists
 * M1.5 Q1 — retro UI backend
 */
import { describe, it, expect } from "vitest";

describe("retroRouter", () => {
  it("exports retroRouter from routes/retro.ts", async () => {
    const mod = await import("../src/routes/retro.js");
    expect(mod.retroRouter).toBeDefined();
  });

  it("retroRouter has list, detail, userDecision, trigger procedures", async () => {
    const { retroRouter } = await import("../src/routes/retro.js");
    const def = (retroRouter as any)._def;
    expect(def.procedures).toHaveProperty("list");
    expect(def.procedures).toHaveProperty("detail");
    expect(def.procedures).toHaveProperty("userDecision");
    expect(def.procedures).toHaveProperty("trigger");
  });

  it("retroRouter.list is a query procedure", async () => {
    const { retroRouter } = await import("../src/routes/retro.js");
    const def = (retroRouter as any)._def;
    expect(def.procedures.list._def.type).toBe("query");
  });

  it("retroRouter.detail is a query procedure", async () => {
    const { retroRouter } = await import("../src/routes/retro.js");
    const def = (retroRouter as any)._def;
    expect(def.procedures.detail._def.type).toBe("query");
  });

  it("retroRouter.userDecision is a mutation procedure", async () => {
    const { retroRouter } = await import("../src/routes/retro.js");
    const def = (retroRouter as any)._def;
    expect(def.procedures.userDecision._def.type).toBe("mutation");
  });

  it("retroRouter.trigger is a mutation procedure", async () => {
    const { retroRouter } = await import("../src/routes/retro.js");
    const def = (retroRouter as any)._def;
    expect(def.procedures.trigger._def.type).toBe("mutation");
  });

  it("retroRouter.list accepts optional projectId and limit", async () => {
    const { retroRouter } = await import("../src/routes/retro.js");
    const def = (retroRouter as any)._def;
    const listInput = def.procedures.list._def.inputs[0];
    // zod schema should parse with optional fields
    const result = listInput.safeParse({ projectId: "proj-1", limit: 10 });
    expect(result.success).toBe(true);
    const resultEmpty = listInput.safeParse({});
    expect(resultEmpty.success).toBe(true);
  });

  it("retroRouter.detail accepts retroId string", async () => {
    const { retroRouter } = await import("../src/routes/retro.js");
    const def = (retroRouter as any)._def;
    const detailInput = def.procedures.detail._def.inputs[0];
    const result = detailInput.safeParse({ retroId: "2026-04-29-001" });
    expect(result.success).toBe(true);
  });

  it("retroRouter.userDecision accepts retroId, findingId, decision enum", async () => {
    const { retroRouter } = await import("../src/routes/retro.js");
    const def = (retroRouter as any)._def;
    const input = def.procedures.userDecision._def.inputs[0];
    const validDecisions = ["accept", "reject", "defer", "discuss"];
    for (const decision of validDecisions) {
      const result = input.safeParse({
        retroId: "2026-04-29-001",
        findingId: "finding-1",
        decision,
      });
      expect(result.success, `decision "${decision}" should be valid`).toBe(true);
    }
    // invalid decision
    const bad = input.safeParse({
      retroId: "2026-04-29-001",
      findingId: "finding-1",
      decision: "approve",
    });
    expect(bad.success).toBe(false);
  });

  it("retroRouter.trigger accepts optional scope", async () => {
    const { retroRouter } = await import("../src/routes/retro.js");
    const def = (retroRouter as any)._def;
    const input = def.procedures.trigger._def.inputs[0];
    const result = input.safeParse({});
    expect(result.success).toBe(true);
    const withScope = input.safeParse({ scope: "m1.5" });
    expect(withScope.success).toBe(true);
  });
});
