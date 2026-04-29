/**
 * Task 4 TDD: prefs tRPC router
 * RED: tests written before route file exists
 * M1.5 Q2/Q4/Q5 — user-prefs / project-prefs CRUD + learned_guidance
 *
 * Note: prefsRouter uses nested routers (user / project / learnedGuidance).
 * In tRPC v11, nested router procedures are exposed in _def.procedures with dot-notation keys:
 *   "user.get", "user.set", "project.get", "project.set",
 *   "learnedGuidance.toggle", "learnedGuidance.delete"
 */
import { describe, it, expect } from "vitest";

describe("prefsRouter", () => {
  it("exports prefsRouter from routes/prefs.ts", async () => {
    const mod = await import("../src/routes/prefs.js");
    expect(mod.prefsRouter).toBeDefined();
  });

  it("prefsRouter has user.get, user.set, project.get, project.set, learnedGuidance.toggle, learnedGuidance.delete procedures", async () => {
    const { prefsRouter } = await import("../src/routes/prefs.js");
    const def = (prefsRouter as any)._def;
    expect(def.procedures).toHaveProperty("user.get");
    expect(def.procedures).toHaveProperty("user.set");
    expect(def.procedures).toHaveProperty("project.get");
    expect(def.procedures).toHaveProperty("project.set");
    expect(def.procedures).toHaveProperty("learnedGuidance.toggle");
    expect(def.procedures).toHaveProperty("learnedGuidance.delete");
  });

  // ---- user procedures ----
  it("prefsRouter user.get is a query procedure", async () => {
    const { prefsRouter } = await import("../src/routes/prefs.js");
    const def = (prefsRouter as any)._def;
    expect(def.procedures["user.get"]._def.type).toBe("query");
  });

  it("prefsRouter user.set is a mutation procedure", async () => {
    const { prefsRouter } = await import("../src/routes/prefs.js");
    const def = (prefsRouter as any)._def;
    expect(def.procedures["user.set"]._def.type).toBe("mutation");
  });

  it("prefsRouter user.set accepts patch object", async () => {
    const { prefsRouter } = await import("../src/routes/prefs.js");
    const def = (prefsRouter as any)._def;
    const setInput = def.procedures["user.set"]._def.inputs[0];
    const result = setInput.safeParse({ patch: { default_retro_mode: "report" } });
    expect(result.success).toBe(true);
  });

  it("prefsRouter user.set rejects invalid retro_mode", async () => {
    const { prefsRouter } = await import("../src/routes/prefs.js");
    const def = (prefsRouter as any)._def;
    const setInput = def.procedures["user.set"]._def.inputs[0];
    const result = setInput.safeParse({ patch: { default_retro_mode: "invalid" } });
    expect(result.success).toBe(false);
  });

  // ---- project procedures ----
  it("prefsRouter project.get is a query procedure", async () => {
    const { prefsRouter } = await import("../src/routes/prefs.js");
    const def = (prefsRouter as any)._def;
    expect(def.procedures["project.get"]._def.type).toBe("query");
  });

  it("prefsRouter project.set is a mutation procedure", async () => {
    const { prefsRouter } = await import("../src/routes/prefs.js");
    const def = (prefsRouter as any)._def;
    expect(def.procedures["project.set"]._def.type).toBe("mutation");
  });

  it("prefsRouter project.get requires projectId", async () => {
    const { prefsRouter } = await import("../src/routes/prefs.js");
    const def = (prefsRouter as any)._def;
    const getInput = def.procedures["project.get"]._def.inputs[0];
    const ok = getInput.safeParse({ projectId: "claude-loom-self" });
    expect(ok.success).toBe(true);
    const bad = getInput.safeParse({});
    expect(bad.success).toBe(false);
  });

  // ---- learnedGuidance procedures ----
  it("prefsRouter learnedGuidance.toggle is a mutation procedure", async () => {
    const { prefsRouter } = await import("../src/routes/prefs.js");
    const def = (prefsRouter as any)._def;
    expect(def.procedures["learnedGuidance.toggle"]._def.type).toBe("mutation");
  });

  it("prefsRouter learnedGuidance.delete is a mutation procedure", async () => {
    const { prefsRouter } = await import("../src/routes/prefs.js");
    const def = (prefsRouter as any)._def;
    expect(def.procedures["learnedGuidance.delete"]._def.type).toBe("mutation");
  });

  it("prefsRouter learnedGuidance.toggle accepts user scope without projectId", async () => {
    const { prefsRouter } = await import("../src/routes/prefs.js");
    const def = (prefsRouter as any)._def;
    const toggleInput = def.procedures["learnedGuidance.toggle"]._def.inputs[0];
    const ok = toggleInput.safeParse({
      scope: "user",
      agentName: "loom-developer",
      guidanceId: "guidance-001",
      active: true,
    });
    expect(ok.success).toBe(true);
  });

  it("prefsRouter learnedGuidance.toggle accepts project scope with projectId", async () => {
    const { prefsRouter } = await import("../src/routes/prefs.js");
    const def = (prefsRouter as any)._def;
    const toggleInput = def.procedures["learnedGuidance.toggle"]._def.inputs[0];
    const withProject = toggleInput.safeParse({
      scope: "project",
      projectId: "claude-loom-self",
      agentName: "loom-developer",
      guidanceId: "guidance-001",
      active: false,
    });
    expect(withProject.success).toBe(true);
  });

  it("prefsRouter learnedGuidance.toggle rejects invalid scope", async () => {
    const { prefsRouter } = await import("../src/routes/prefs.js");
    const def = (prefsRouter as any)._def;
    const toggleInput = def.procedures["learnedGuidance.toggle"]._def.inputs[0];
    const badScope = toggleInput.safeParse({
      scope: "global",
      agentName: "loom-developer",
      guidanceId: "guidance-001",
      active: true,
    });
    expect(badScope.success).toBe(false);
  });

  it("prefsRouter learnedGuidance.delete accepts scope, agentName, guidanceId", async () => {
    const { prefsRouter } = await import("../src/routes/prefs.js");
    const def = (prefsRouter as any)._def;
    const deleteInput = def.procedures["learnedGuidance.delete"]._def.inputs[0];
    const ok = deleteInput.safeParse({
      scope: "project",
      projectId: "claude-loom-self",
      agentName: "loom-developer",
      guidanceId: "guidance-001",
    });
    expect(ok.success).toBe(true);
  });
});
