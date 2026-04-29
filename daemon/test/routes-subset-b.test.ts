/**
 * Task 8 Subset B TDD: tRPC sub-routers plan / consistency / approval
 * RED: tests written before route files exist
 */
import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// plan router
// ---------------------------------------------------------------------------
describe("planRouter", () => {
  it("exports planRouter from routes/plan.ts", async () => {
    const mod = await import("../src/routes/plan.js");
    expect(mod.planRouter).toBeDefined();
  });

  it("planRouter has list, upsert, updateStatus, delete procedures", async () => {
    const { planRouter } = await import("../src/routes/plan.js");
    const def = (planRouter as any)._def;
    expect(def.procedures).toHaveProperty("list");
    expect(def.procedures).toHaveProperty("upsert");
    expect(def.procedures).toHaveProperty("updateStatus");
    expect(def.procedures).toHaveProperty("delete");
  });

  it("planRouter.list is a query procedure", async () => {
    const { planRouter } = await import("../src/routes/plan.js");
    const def = (planRouter as any)._def;
    expect(def.procedures.list._def.type).toBe("query");
  });

  it("planRouter.upsert is a mutation procedure", async () => {
    const { planRouter } = await import("../src/routes/plan.js");
    const def = (planRouter as any)._def;
    expect(def.procedures.upsert._def.type).toBe("mutation");
  });

  it("planRouter.updateStatus is a mutation procedure", async () => {
    const { planRouter } = await import("../src/routes/plan.js");
    const def = (planRouter as any)._def;
    expect(def.procedures.updateStatus._def.type).toBe("mutation");
  });

  it("planRouter.delete is a mutation procedure", async () => {
    const { planRouter } = await import("../src/routes/plan.js");
    const def = (planRouter as any)._def;
    expect(def.procedures.delete._def.type).toBe("mutation");
  });
});

// ---------------------------------------------------------------------------
// consistency router
// ---------------------------------------------------------------------------
describe("consistencyRouter", () => {
  it("exports consistencyRouter from routes/consistency.ts", async () => {
    const mod = await import("../src/routes/consistency.js");
    expect(mod.consistencyRouter).toBeDefined();
  });

  it("consistencyRouter has list, acknowledge, dismiss procedures", async () => {
    const { consistencyRouter } = await import("../src/routes/consistency.js");
    const def = (consistencyRouter as any)._def;
    expect(def.procedures).toHaveProperty("list");
    expect(def.procedures).toHaveProperty("acknowledge");
    expect(def.procedures).toHaveProperty("dismiss");
  });

  it("consistencyRouter.list is a query procedure", async () => {
    const { consistencyRouter } = await import("../src/routes/consistency.js");
    const def = (consistencyRouter as any)._def;
    expect(def.procedures.list._def.type).toBe("query");
  });

  it("consistencyRouter.acknowledge is a mutation procedure", async () => {
    const { consistencyRouter } = await import("../src/routes/consistency.js");
    const def = (consistencyRouter as any)._def;
    expect(def.procedures.acknowledge._def.type).toBe("mutation");
  });

  it("consistencyRouter.dismiss is a mutation procedure", async () => {
    const { consistencyRouter } = await import("../src/routes/consistency.js");
    const def = (consistencyRouter as any)._def;
    expect(def.procedures.dismiss._def.type).toBe("mutation");
  });
});

// ---------------------------------------------------------------------------
// approval router
// ---------------------------------------------------------------------------
describe("approvalRouter", () => {
  it("exports approvalRouter from routes/approval.ts", async () => {
    const mod = await import("../src/routes/approval.js");
    expect(mod.approvalRouter).toBeDefined();
  });

  it("approvalRouter has list, decide procedures", async () => {
    const { approvalRouter } = await import("../src/routes/approval.js");
    const def = (approvalRouter as any)._def;
    expect(def.procedures).toHaveProperty("list");
    expect(def.procedures).toHaveProperty("decide");
  });

  it("approvalRouter.list is a query procedure", async () => {
    const { approvalRouter } = await import("../src/routes/approval.js");
    const def = (approvalRouter as any)._def;
    expect(def.procedures.list._def.type).toBe("query");
  });

  it("approvalRouter.decide is a mutation procedure", async () => {
    const { approvalRouter } = await import("../src/routes/approval.js");
    const def = (approvalRouter as any)._def;
    expect(def.procedures.decide._def.type).toBe("mutation");
  });
});
