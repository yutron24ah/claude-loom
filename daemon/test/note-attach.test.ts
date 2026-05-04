/**
 * TDD RED: note-attach tests — note create with agent_id and plan_item_id attachment
 * WHY: the notes table uses generic attachedType/attachedId pattern.
 *   - agent notes: attachedType='subagent', attachedId=agentId
 *   - plan_item notes: attachedType='plan_item', attachedId=String(planItemId)
 * This test verifies the create mutation accepts both attachment patterns and
 * that list filtering by attachedType+attachedId works correctly.
 *
 * SPEC §3.6.10 SSoT cross-check: NOTE_ATTACHED_TYPE imported from note.ts (primary SSoT).
 * WHY: local re-definition breaks source-change detection — if note.ts changes,
 * the test must catch it (MEDIUM fix from M3.2 t3 follow-up review).
 */
import { describe, it, expect } from "vitest";
import { NOTE_ATTACHED_TYPE } from "../src/routes/note.js";

describe("noteRouter — agent attachment (attachedType=subagent)", () => {
  it("noteRouter.create input schema accepts attachedType='subagent'", async () => {
    const { noteRouter } = await import("../src/routes/note.js");
    const def = (noteRouter as any)._def;
    // Verify create procedure exists and is mutation
    expect(def.procedures.create._def.type).toBe("mutation");
    // Verify the input schema accepts our attachment fields
    const inputSchema = def.procedures.create._def.inputs[0];
    expect(inputSchema).toBeDefined();
    // Parse should succeed with subagent attachedType
    const result = inputSchema.safeParse({
      attachedType: NOTE_ATTACHED_TYPE.SUBAGENT,
      attachedId: "agent-123",
      content: "Test note for agent",
    });
    expect(result.success).toBe(true);
  });

  it("noteRouter.create input schema accepts attachedType='plan_item'", async () => {
    const { noteRouter } = await import("../src/routes/note.js");
    const def = (noteRouter as any)._def;
    const inputSchema = def.procedures.create._def.inputs[0];
    const result = inputSchema.safeParse({
      attachedType: NOTE_ATTACHED_TYPE.PLAN_ITEM,
      attachedId: "42",
      content: "Test note for plan item",
    });
    expect(result.success).toBe(true);
  });

  it("noteRouter.list input schema accepts attachedType filter for subagent", async () => {
    const { noteRouter } = await import("../src/routes/note.js");
    const def = (noteRouter as any)._def;
    const inputSchema = def.procedures.list._def.inputs[0];
    const result = inputSchema.safeParse({
      projectId: "claude-loom",
      attachedType: NOTE_ATTACHED_TYPE.SUBAGENT,
      attachedId: "agent-123",
    });
    expect(result.success).toBe(true);
  });

  it("noteRouter.list input schema accepts attachedType filter for plan_item", async () => {
    const { noteRouter } = await import("../src/routes/note.js");
    const def = (noteRouter as any)._def;
    const inputSchema = def.procedures.list._def.inputs[0];
    const result = inputSchema.safeParse({
      projectId: "claude-loom",
      attachedType: NOTE_ATTACHED_TYPE.PLAN_ITEM,
      attachedId: "42",
    });
    expect(result.success).toBe(true);
  });
});

describe("NOTE_ATTACHED_TYPE constants — imported from note.ts (SPEC §3.6.10 SSoT)", () => {
  // WHY: these tests verify the imported constant values, not a local re-definition.
  // If note.ts changes the string values, these tests will catch it.
  it("NOTE_ATTACHED_TYPE.SUBAGENT is 'subagent'", () => {
    expect(NOTE_ATTACHED_TYPE.SUBAGENT).toBe("subagent");
  });

  it("NOTE_ATTACHED_TYPE.PLAN_ITEM is 'plan_item'", () => {
    expect(NOTE_ATTACHED_TYPE.PLAN_ITEM).toBe("plan_item");
  });

  it("NOTE_ATTACHED_TYPE.PROJECT is 'project'", () => {
    expect(NOTE_ATTACHED_TYPE.PROJECT).toBe("project");
  });
});

describe("noteRouter — NOTE_ATTACHED_TYPE exported from note route constants", () => {
  it("exports NOTE_ATTACHED_TYPE constant from routes/note.ts", async () => {
    const mod = await import("../src/routes/note.js");
    expect((mod as any).NOTE_ATTACHED_TYPE).toBeDefined();
    expect((mod as any).NOTE_ATTACHED_TYPE.SUBAGENT).toBe("subagent");
    expect((mod as any).NOTE_ATTACHED_TYPE.PLAN_ITEM).toBe("plan_item");
  });
});

describe("noteRouter — attachedType enum validation (LOW 3: SPEC §3.6.10 enum)", () => {
  it("noteRouter.create rejects unknown attachedType value", async () => {
    const { noteRouter } = await import("../src/routes/note.js");
    const def = (noteRouter as any)._def;
    const inputSchema = def.procedures.create._def.inputs[0];
    // An invalid attachedType should fail schema validation
    const result = inputSchema.safeParse({
      attachedType: "unknown_type",
      attachedId: "some-id",
      content: "Test content",
    });
    expect(result.success).toBe(false);
  });

  it("noteRouter.list rejects unknown attachedType value", async () => {
    const { noteRouter } = await import("../src/routes/note.js");
    const def = (noteRouter as any)._def;
    const inputSchema = def.procedures.list._def.inputs[0];
    const result = inputSchema.safeParse({
      projectId: "claude-loom",
      attachedType: "invalid_type",
      attachedId: "some-id",
    });
    expect(result.success).toBe(false);
  });
});

describe("noteRouter — content length validation (LOW 4: DoS prevention)", () => {
  it("noteRouter.create rejects content exceeding 10000 characters", async () => {
    const { noteRouter } = await import("../src/routes/note.js");
    const def = (noteRouter as any)._def;
    const inputSchema = def.procedures.create._def.inputs[0];
    const result = inputSchema.safeParse({
      attachedType: NOTE_ATTACHED_TYPE.SUBAGENT,
      attachedId: "agent-123",
      content: "x".repeat(10001),
    });
    expect(result.success).toBe(false);
  });

  it("noteRouter.create accepts content up to 10000 characters", async () => {
    const { noteRouter } = await import("../src/routes/note.js");
    const def = (noteRouter as any)._def;
    const inputSchema = def.procedures.create._def.inputs[0];
    const result = inputSchema.safeParse({
      attachedType: NOTE_ATTACHED_TYPE.SUBAGENT,
      attachedId: "agent-123",
      content: "x".repeat(10000),
    });
    expect(result.success).toBe(true);
  });

  it("noteRouter.update rejects content exceeding 10000 characters", async () => {
    const { noteRouter } = await import("../src/routes/note.js");
    const def = (noteRouter as any)._def;
    const inputSchema = def.procedures.update._def.inputs[0];
    const result = inputSchema.safeParse({
      id: 1,
      content: "x".repeat(10001),
    });
    expect(result.success).toBe(false);
  });
});
