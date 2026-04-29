/**
 * Task 9 TDD: 3 new event types + broadcaster emit + subscription procedures
 * RED: tests written before implementation exists
 * M1.5 Tasks 9A/9B/9C
 */
import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Task 9A: new event types / schemas in events/types.ts
// ---------------------------------------------------------------------------

describe("events/types - new M1.5 schemas", () => {
  it("exports learnedGuidanceChangeEventSchema", async () => {
    const mod = await import("../src/events/types.js");
    expect((mod as any).learnedGuidanceChangeEventSchema).toBeDefined();
  });

  it("learnedGuidanceChangeEventSchema validates correct payload", async () => {
    const mod = await import("../src/events/types.js");
    const schema = (mod as any).learnedGuidanceChangeEventSchema;
    const result = schema.safeParse({
      type: "learned_guidance.change",
      timestamp: Date.now(),
      payload: {
        scope: "user",
        agentName: "loom-developer",
        guidanceId: "g-001",
        action: "toggled",
        active: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it("learnedGuidanceChangeEventSchema validates project scope with projectId", async () => {
    const mod = await import("../src/events/types.js");
    const schema = (mod as any).learnedGuidanceChangeEventSchema;
    const result = schema.safeParse({
      type: "learned_guidance.change",
      timestamp: Date.now(),
      payload: {
        scope: "project",
        projectId: "my-project",
        agentName: "loom-developer",
        guidanceId: "g-002",
        action: "deleted",
      },
    });
    expect(result.success).toBe(true);
  });

  it("learnedGuidanceChangeEventSchema rejects invalid action", async () => {
    const mod = await import("../src/events/types.js");
    const schema = (mod as any).learnedGuidanceChangeEventSchema;
    const result = schema.safeParse({
      type: "learned_guidance.change",
      timestamp: Date.now(),
      payload: {
        scope: "user",
        agentName: "loom-developer",
        guidanceId: "g-001",
        action: "invalid-action",
      },
    });
    expect(result.success).toBe(false);
  });

  it("exports worktreeChangeEventSchema", async () => {
    const mod = await import("../src/events/types.js");
    expect((mod as any).worktreeChangeEventSchema).toBeDefined();
  });

  it("worktreeChangeEventSchema validates correct payload", async () => {
    const mod = await import("../src/events/types.js");
    const schema = (mod as any).worktreeChangeEventSchema;
    const result = schema.safeParse({
      type: "worktree.change",
      timestamp: Date.now(),
      payload: {
        projectId: "proj-abc",
        action: "created",
        path: "/tmp/worktrees/feature-branch",
        branch: "feature/my-feature",
      },
    });
    expect(result.success).toBe(true);
  });

  it("worktreeChangeEventSchema validates all action variants", async () => {
    const mod = await import("../src/events/types.js");
    const schema = (mod as any).worktreeChangeEventSchema;
    const actions = ["created", "removed", "locked", "unlocked"];
    for (const action of actions) {
      const result = schema.safeParse({
        type: "worktree.change",
        timestamp: Date.now(),
        payload: { projectId: "p", action, path: "/tmp/wt" },
      });
      expect(result.success, `action '${action}' should be valid`).toBe(true);
    }
  });

  it("worktreeChangeEventSchema rejects invalid action", async () => {
    const mod = await import("../src/events/types.js");
    const schema = (mod as any).worktreeChangeEventSchema;
    const result = schema.safeParse({
      type: "worktree.change",
      timestamp: Date.now(),
      payload: { projectId: "p", action: "copied", path: "/tmp/wt" },
    });
    expect(result.success).toBe(false);
  });

  it("exports disciplineMetricUpdateEventSchema", async () => {
    const mod = await import("../src/events/types.js");
    expect((mod as any).disciplineMetricUpdateEventSchema).toBeDefined();
  });

  it("disciplineMetricUpdateEventSchema validates correct payload", async () => {
    const mod = await import("../src/events/types.js");
    const schema = (mod as any).disciplineMetricUpdateEventSchema;
    const result = schema.safeParse({
      type: "discipline_metric.update",
      timestamp: Date.now(),
      payload: {
        projectId: "proj-abc",
        metric: "tdd_compliance",
        value: 0.95,
        timestamp: Date.now(),
      },
    });
    expect(result.success).toBe(true);
  });

  it("loomEventSchema discriminated union includes 3 new types", async () => {
    const { loomEventSchema } = await import("../src/events/types.js");

    // learned_guidance.change
    const r1 = loomEventSchema.safeParse({
      type: "learned_guidance.change",
      timestamp: Date.now(),
      payload: { scope: "user", agentName: "dev", guidanceId: "g1", action: "toggled", active: false },
    });
    expect(r1.success).toBe(true);

    // worktree.change
    const r2 = loomEventSchema.safeParse({
      type: "worktree.change",
      timestamp: Date.now(),
      payload: { projectId: "p", action: "created", path: "/tmp/wt" },
    });
    expect(r2.success).toBe(true);

    // discipline_metric.update
    const r3 = loomEventSchema.safeParse({
      type: "discipline_metric.update",
      timestamp: Date.now(),
      payload: { projectId: "p", metric: "tdd", value: 1, timestamp: Date.now() },
    });
    expect(r3.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 9B: broadcaster emit functions
// ---------------------------------------------------------------------------

describe("broadcaster - M1.5 new emit functions", () => {
  it("has emitLearnedGuidanceChange method", async () => {
    const { broadcaster } = await import("../src/events/broadcaster.js");
    expect(typeof (broadcaster as any).emitLearnedGuidanceChange).toBe("function");
  });

  it("emitLearnedGuidanceChange emits to learned_guidance.change channel", async () => {
    const { broadcaster } = await import("../src/events/broadcaster.js");
    const received: any[] = [];
    const handler = (e: any) => received.push(e);
    broadcaster.on("learned_guidance.change", handler);

    (broadcaster as any).emitLearnedGuidanceChange({
      scope: "user",
      agentName: "loom-developer",
      guidanceId: "g-001",
      action: "toggled",
      active: true,
    });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe("learned_guidance.change");
    expect(received[0].payload.guidanceId).toBe("g-001");
    expect(received[0].timestamp).toBeGreaterThan(0);

    broadcaster.off("learned_guidance.change", handler);
  });

  it("emitLearnedGuidanceChange also emits to wildcard '*'", async () => {
    const { broadcaster } = await import("../src/events/broadcaster.js");
    const received: any[] = [];
    const handler = (e: any) => {
      if (e.type === "learned_guidance.change") received.push(e);
    };
    broadcaster.on("*", handler);

    (broadcaster as any).emitLearnedGuidanceChange({
      scope: "project",
      projectId: "my-proj",
      agentName: "loom-developer",
      guidanceId: "g-002",
      action: "deleted",
    });

    expect(received).toHaveLength(1);

    broadcaster.off("*", handler);
  });

  it("has emitWorktreeChange method", async () => {
    const { broadcaster } = await import("../src/events/broadcaster.js");
    expect(typeof (broadcaster as any).emitWorktreeChange).toBe("function");
  });

  it("emitWorktreeChange emits to worktree.change channel", async () => {
    const { broadcaster } = await import("../src/events/broadcaster.js");
    const received: any[] = [];
    const handler = (e: any) => received.push(e);
    broadcaster.on("worktree.change", handler);

    (broadcaster as any).emitWorktreeChange({
      projectId: "proj-abc",
      action: "created",
      path: "/tmp/wt/feature",
      branch: "feature/x",
    });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe("worktree.change");
    expect(received[0].payload.action).toBe("created");
    expect(received[0].payload.branch).toBe("feature/x");

    broadcaster.off("worktree.change", handler);
  });

  it("has emitDisciplineMetricUpdate method", async () => {
    const { broadcaster } = await import("../src/events/broadcaster.js");
    expect(typeof (broadcaster as any).emitDisciplineMetricUpdate).toBe("function");
  });

  it("emitDisciplineMetricUpdate emits to discipline_metric.update channel", async () => {
    const { broadcaster } = await import("../src/events/broadcaster.js");
    const received: any[] = [];
    const handler = (e: any) => received.push(e);
    broadcaster.on("discipline_metric.update", handler);

    (broadcaster as any).emitDisciplineMetricUpdate({
      projectId: "proj-abc",
      metric: "tdd_compliance",
      value: 0.87,
      timestamp: Date.now(),
    });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe("discipline_metric.update");
    expect(received[0].payload.metric).toBe("tdd_compliance");
    expect(received[0].payload.value).toBe(0.87);

    broadcaster.off("discipline_metric.update", handler);
  });
});

// ---------------------------------------------------------------------------
// Task 9C: eventsRouter new subscription procedures
// ---------------------------------------------------------------------------

describe("eventsRouter - M1.5 new subscriptions", () => {
  it("eventsRouter has onLearnedGuidanceChange procedure", async () => {
    const { eventsRouter } = await import("../src/routes/events.js");
    const def = (eventsRouter as any)._def;
    expect(def.procedures).toHaveProperty("onLearnedGuidanceChange");
  });

  it("eventsRouter has onWorktreeChange procedure", async () => {
    const { eventsRouter } = await import("../src/routes/events.js");
    const def = (eventsRouter as any)._def;
    expect(def.procedures).toHaveProperty("onWorktreeChange");
  });

  it("eventsRouter has onDisciplineMetricUpdate procedure", async () => {
    const { eventsRouter } = await import("../src/routes/events.js");
    const def = (eventsRouter as any)._def;
    expect(def.procedures).toHaveProperty("onDisciplineMetricUpdate");
  });

  it("onLearnedGuidanceChange is a subscription type", async () => {
    const { eventsRouter } = await import("../src/routes/events.js");
    const def = (eventsRouter as any)._def;
    expect(def.procedures.onLearnedGuidanceChange._def.type).toBe("subscription");
  });

  it("onWorktreeChange is a subscription type", async () => {
    const { eventsRouter } = await import("../src/routes/events.js");
    const def = (eventsRouter as any)._def;
    expect(def.procedures.onWorktreeChange._def.type).toBe("subscription");
  });

  it("onDisciplineMetricUpdate is a subscription type", async () => {
    const { eventsRouter } = await import("../src/routes/events.js");
    const def = (eventsRouter as any)._def;
    expect(def.procedures.onDisciplineMetricUpdate._def.type).toBe("subscription");
  });

  it("eventsRouter has all 8 subscription procedures (5 existing + 3 new)", async () => {
    const { eventsRouter } = await import("../src/routes/events.js");
    const def = (eventsRouter as any)._def;
    const procs = Object.keys(def.procedures);
    // existing 5
    expect(procs).toContain("onAgentChange");
    expect(procs).toContain("onPlanChange");
    expect(procs).toContain("onFindingNew");
    expect(procs).toContain("onApprovalRequest");
    expect(procs).toContain("onAny");
    // new 3
    expect(procs).toContain("onLearnedGuidanceChange");
    expect(procs).toContain("onWorktreeChange");
    expect(procs).toContain("onDisciplineMetricUpdate");
    expect(procs.length).toBeGreaterThanOrEqual(8);
  });
});

// ---------------------------------------------------------------------------
// Task 10: appRouter wire-up (6 new routers)
// ---------------------------------------------------------------------------

describe("appRouter - M1.5 6 new router wire-up", () => {
  it("appRouter includes retro router", async () => {
    const { appRouter } = await import("../src/router.js");
    const def = (appRouter as any)._def;
    const procKeys = Object.keys(def.procedures);
    // retro procedures: list, detail, userDecision, trigger
    expect(procKeys.some((k) => k.startsWith("retro."))).toBe(true);
  });

  it("appRouter includes prefs router", async () => {
    const { appRouter } = await import("../src/router.js");
    const def = (appRouter as any)._def;
    const procKeys = Object.keys(def.procedures);
    expect(procKeys.some((k) => k.startsWith("prefs."))).toBe(true);
  });

  it("appRouter includes personality router", async () => {
    const { appRouter } = await import("../src/router.js");
    const def = (appRouter as any)._def;
    const procKeys = Object.keys(def.procedures);
    expect(procKeys.some((k) => k.startsWith("personality."))).toBe(true);
  });

  it("appRouter includes worktree router", async () => {
    const { appRouter } = await import("../src/router.js");
    const def = (appRouter as any)._def;
    const procKeys = Object.keys(def.procedures);
    expect(procKeys.some((k) => k.startsWith("worktree."))).toBe(true);
  });

  it("appRouter includes coexistence router", async () => {
    const { appRouter } = await import("../src/router.js");
    const def = (appRouter as any)._def;
    const procKeys = Object.keys(def.procedures);
    expect(procKeys.some((k) => k.startsWith("coexistence."))).toBe(true);
  });

  it("appRouter includes discipline router", async () => {
    const { appRouter } = await import("../src/router.js");
    const def = (appRouter as any)._def;
    const procKeys = Object.keys(def.procedures);
    expect(procKeys.some((k) => k.startsWith("discipline."))).toBe(true);
  });

  it("appRouter has at least 15 top-level routers", async () => {
    const { appRouter } = await import("../src/router.js");
    const def = (appRouter as any)._def;
    const procKeys = Object.keys(def.procedures);
    // Extract top-level router names (before first dot, or no dot for health)
    const topLevel = new Set(procKeys.map((k) => k.split(".")[0]));
    // health + 9 existing + 6 new = at least 16 (health is a direct procedure)
    expect(topLevel.size).toBeGreaterThanOrEqual(15);
  });
});
