/**
 * Task 7 TDD: coexistence tRPC router
 * RED: tests written before route file exists
 * M1.5 Q5 — coexistence_mode + enabled_features + detect
 */
import { describe, it, expect } from "vitest";

describe("coexistenceRouter", () => {
  it("exports coexistenceRouter from routes/coexistence.ts", async () => {
    const mod = await import("../src/routes/coexistence.js");
    expect(mod.coexistenceRouter).toBeDefined();
  });

  it("coexistenceRouter has get, set, detect procedures", async () => {
    const { coexistenceRouter } = await import("../src/routes/coexistence.js");
    const def = (coexistenceRouter as any)._def;
    expect(def.procedures).toHaveProperty("get");
    expect(def.procedures).toHaveProperty("set");
    expect(def.procedures).toHaveProperty("detect");
  });

  it("coexistenceRouter.get is a query procedure", async () => {
    const { coexistenceRouter } = await import("../src/routes/coexistence.js");
    const def = (coexistenceRouter as any)._def;
    expect(def.procedures.get._def.type).toBe("query");
  });

  it("coexistenceRouter.set is a mutation procedure", async () => {
    const { coexistenceRouter } = await import("../src/routes/coexistence.js");
    const def = (coexistenceRouter as any)._def;
    expect(def.procedures.set._def.type).toBe("mutation");
  });

  it("coexistenceRouter.detect is a query procedure", async () => {
    const { coexistenceRouter } = await import("../src/routes/coexistence.js");
    const def = (coexistenceRouter as any)._def;
    expect(def.procedures.detect._def.type).toBe("query");
  });

  it("coexistenceRouter.get accepts projectId string", async () => {
    const { coexistenceRouter } = await import("../src/routes/coexistence.js");
    const def = (coexistenceRouter as any)._def;
    const getInput = def.procedures.get._def.inputs[0];
    const result = getInput.safeParse({ projectId: "proj-1" });
    expect(result.success).toBe(true);
  });

  it("coexistenceRouter.set accepts projectId, mode enum, enabledFeatures array", async () => {
    const { coexistenceRouter } = await import("../src/routes/coexistence.js");
    const def = (coexistenceRouter as any)._def;
    const setInput = def.procedures.set._def.inputs[0];

    const validModes = ["full", "coexist", "custom"];
    for (const mode of validModes) {
      const result = setInput.safeParse({
        projectId: "proj-1",
        mode,
        enabledFeatures: ["all"],
      });
      expect(result.success, `mode "${mode}" should be valid`).toBe(true);
    }

    // invalid mode
    const bad = setInput.safeParse({
      projectId: "proj-1",
      mode: "invalid",
      enabledFeatures: [],
    });
    expect(bad.success).toBe(false);
  });

  it("coexistenceRouter.detect accepts projectId string", async () => {
    const { coexistenceRouter } = await import("../src/routes/coexistence.js");
    const def = (coexistenceRouter as any)._def;
    const detectInput = def.procedures.detect._def.inputs[0];
    const result = detectInput.safeParse({ projectId: "proj-1" });
    expect(result.success).toBe(true);
  });
});
