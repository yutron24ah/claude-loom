/**
 * Task 8 Subset C TDD: tRPC sub-routers for note + config
 * RED: tests written before route files exist
 */
import { describe, it, expect } from "vitest";

describe("noteRouter", () => {
  it("exports noteRouter from routes/note.ts", async () => {
    const mod = await import("../src/routes/note.js");
    expect(mod.noteRouter).toBeDefined();
  });

  it("noteRouter has list, create, update, delete procedures", async () => {
    const { noteRouter } = await import("../src/routes/note.js");
    const def = (noteRouter as any)._def;
    expect(def.procedures).toHaveProperty("list");
    expect(def.procedures).toHaveProperty("create");
    expect(def.procedures).toHaveProperty("update");
    expect(def.procedures).toHaveProperty("delete");
  });

  it("noteRouter.list is a query procedure", async () => {
    const { noteRouter } = await import("../src/routes/note.js");
    const def = (noteRouter as any)._def;
    expect(def.procedures.list._def.type).toBe("query");
  });

  it("noteRouter.create is a mutation procedure", async () => {
    const { noteRouter } = await import("../src/routes/note.js");
    const def = (noteRouter as any)._def;
    expect(def.procedures.create._def.type).toBe("mutation");
  });

  it("noteRouter.update is a mutation procedure", async () => {
    const { noteRouter } = await import("../src/routes/note.js");
    const def = (noteRouter as any)._def;
    expect(def.procedures.update._def.type).toBe("mutation");
  });

  it("noteRouter.delete is a mutation procedure", async () => {
    const { noteRouter } = await import("../src/routes/note.js");
    const def = (noteRouter as any)._def;
    expect(def.procedures.delete._def.type).toBe("mutation");
  });
});

describe("configRouter", () => {
  it("exports configRouter from routes/config.ts", async () => {
    const mod = await import("../src/routes/config.js");
    expect(mod.configRouter).toBeDefined();
  });

  it("configRouter has get, set procedures", async () => {
    const { configRouter } = await import("../src/routes/config.js");
    const def = (configRouter as any)._def;
    expect(def.procedures).toHaveProperty("get");
    expect(def.procedures).toHaveProperty("set");
  });

  it("configRouter.get is a query procedure", async () => {
    const { configRouter } = await import("../src/routes/config.js");
    const def = (configRouter as any)._def;
    expect(def.procedures.get._def.type).toBe("query");
  });

  it("configRouter.set is a mutation procedure", async () => {
    const { configRouter } = await import("../src/routes/config.js");
    const def = (configRouter as any)._def;
    expect(def.procedures.set._def.type).toBe("mutation");
  });
});
