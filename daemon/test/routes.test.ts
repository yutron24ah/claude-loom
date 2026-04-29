/**
 * Task 8 TDD: tRPC sub-routers for project / session / agent
 * RED: tests written before route files exist
 */
import { describe, it, expect } from "vitest";

describe("projectRouter", () => {
  it("exports projectRouter from routes/project.ts", async () => {
    const mod = await import("../src/routes/project.js");
    expect(mod.projectRouter).toBeDefined();
  });

  it("projectRouter has list, current, upsert, archive procedures", async () => {
    const { projectRouter } = await import("../src/routes/project.js");
    const def = (projectRouter as any)._def;
    expect(def.procedures).toHaveProperty("list");
    expect(def.procedures).toHaveProperty("current");
    expect(def.procedures).toHaveProperty("upsert");
    expect(def.procedures).toHaveProperty("archive");
  });

  it("projectRouter.list is a query procedure", async () => {
    const { projectRouter } = await import("../src/routes/project.js");
    const def = (projectRouter as any)._def;
    expect(def.procedures.list._def.type).toBe("query");
  });

  it("projectRouter.upsert is a mutation procedure", async () => {
    const { projectRouter } = await import("../src/routes/project.js");
    const def = (projectRouter as any)._def;
    expect(def.procedures.upsert._def.type).toBe("mutation");
  });

  it("projectRouter.archive is a mutation procedure", async () => {
    const { projectRouter } = await import("../src/routes/project.js");
    const def = (projectRouter as any)._def;
    expect(def.procedures.archive._def.type).toBe("mutation");
  });

  it("projectRouter.current is a query procedure", async () => {
    const { projectRouter } = await import("../src/routes/project.js");
    const def = (projectRouter as any)._def;
    expect(def.procedures.current._def.type).toBe("query");
  });
});

describe("sessionRouter", () => {
  it("exports sessionRouter from routes/session.ts", async () => {
    const mod = await import("../src/routes/session.js");
    expect(mod.sessionRouter).toBeDefined();
  });

  it("sessionRouter has list, detail, events procedures", async () => {
    const { sessionRouter } = await import("../src/routes/session.js");
    const def = (sessionRouter as any)._def;
    expect(def.procedures).toHaveProperty("list");
    expect(def.procedures).toHaveProperty("detail");
    expect(def.procedures).toHaveProperty("events");
  });

  it("sessionRouter.list is a query procedure", async () => {
    const { sessionRouter } = await import("../src/routes/session.js");
    const def = (sessionRouter as any)._def;
    expect(def.procedures.list._def.type).toBe("query");
  });

  it("sessionRouter.detail is a query procedure", async () => {
    const { sessionRouter } = await import("../src/routes/session.js");
    const def = (sessionRouter as any)._def;
    expect(def.procedures.detail._def.type).toBe("query");
  });

  it("sessionRouter.events is a query procedure", async () => {
    const { sessionRouter } = await import("../src/routes/session.js");
    const def = (sessionRouter as any)._def;
    expect(def.procedures.events._def.type).toBe("query");
  });
});

describe("agentRouter", () => {
  it("exports agentRouter from routes/agent.ts", async () => {
    const mod = await import("../src/routes/agent.js");
    expect(mod.agentRouter).toBeDefined();
  });

  it("agentRouter has list, detail, pool procedures", async () => {
    const { agentRouter } = await import("../src/routes/agent.js");
    const def = (agentRouter as any)._def;
    expect(def.procedures).toHaveProperty("list");
    expect(def.procedures).toHaveProperty("detail");
    expect(def.procedures).toHaveProperty("pool");
  });

  it("agentRouter.list is a query procedure", async () => {
    const { agentRouter } = await import("../src/routes/agent.js");
    const def = (agentRouter as any)._def;
    expect(def.procedures.list._def.type).toBe("query");
  });

  it("agentRouter.detail is a query procedure", async () => {
    const { agentRouter } = await import("../src/routes/agent.js");
    const def = (agentRouter as any)._def;
    expect(def.procedures.detail._def.type).toBe("query");
  });

  it("agentRouter.pool is a query procedure", async () => {
    const { agentRouter } = await import("../src/routes/agent.js");
    const def = (agentRouter as any)._def;
    expect(def.procedures.pool._def.type).toBe("query");
  });
});
