/**
 * Task 5 TDD: tRPC sub-router personality (read-only preset list)
 * RED: tests written before route file exists
 * M1.5 Subset B
 */
import { describe, it, expect } from "vitest";

describe("personalityRouter", () => {
  it("exports personalityRouter from routes/personality.ts", async () => {
    const mod = await import("../src/routes/personality.js");
    expect(mod.personalityRouter).toBeDefined();
  });

  it("personalityRouter has list and detail procedures", async () => {
    const { personalityRouter } = await import("../src/routes/personality.js");
    const def = (personalityRouter as any)._def;
    expect(def.procedures).toHaveProperty("list");
    expect(def.procedures).toHaveProperty("detail");
  });

  it("personalityRouter.list is a query procedure", async () => {
    const { personalityRouter } = await import("../src/routes/personality.js");
    const def = (personalityRouter as any)._def;
    expect(def.procedures.list._def.type).toBe("query");
  });

  it("personalityRouter.detail is a query procedure", async () => {
    const { personalityRouter } = await import("../src/routes/personality.js");
    const def = (personalityRouter as any)._def;
    expect(def.procedures.detail._def.type).toBe("query");
  });

  it("personalityRouter.list returns array of presets with name/description/summary", async () => {
    const { personalityRouter } = await import("../src/routes/personality.js");
    const caller = personalityRouter.createCaller({});
    const result = await caller.list();
    expect(Array.isArray(result)).toBe(true);
    // Should have at least 1 preset (4 exist per spec)
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("description");
    expect(result[0]).toHaveProperty("summary");
  });

  it("personalityRouter.detail returns NOT_FOUND for unknown preset", async () => {
    const { personalityRouter } = await import("../src/routes/personality.js");
    const { TRPCError } = await import("@trpc/server");
    const caller = personalityRouter.createCaller({});
    await expect(caller.detail({ name: "nonexistent-preset-xyz" })).rejects.toThrow(TRPCError);
  });

  it("personalityRouter.detail returns body for known preset", async () => {
    const { personalityRouter } = await import("../src/routes/personality.js");
    const caller = personalityRouter.createCaller({});
    // 'default' preset must exist per spec
    const result = await caller.detail({ name: "default" });
    expect(result).toHaveProperty("name", "default");
    expect(result).toHaveProperty("description");
    expect(result).toHaveProperty("body");
    expect(typeof result.body).toBe("string");
  });
});
