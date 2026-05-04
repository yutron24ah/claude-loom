/**
 * TDD tests for plan-sync/parser.ts
 * RED phase — parser module does not exist yet.
 *
 * WHY: parser is a pure function (string → struct) that extracts task markers
 * from PLAN.md content and computes diffs against DB state. Testing pure
 * functions is straightforward and avoids file I/O in tests.
 */
import { describe, it, expect } from "vitest";
import { parsePlanMarkdown, diffPlanItems } from "../../src/plan-sync/parser.js";
import type { ParsedPlanItem, PlanDiff } from "../../src/plan-sync/parser.js";

describe("parsePlanMarkdown", () => {
  it("returns empty array for empty string", () => {
    const result = parsePlanMarkdown("");
    expect(result).toEqual([]);
  });

  it("returns empty array for content with no markers", () => {
    const content = "# PLAN\n\n## M0 — Setup\n\n- task one\n- task two\n";
    const result = parsePlanMarkdown(content);
    expect(result).toEqual([]);
  });

  it("extracts a single task marker with status todo", () => {
    const content = [
      "# PLAN",
      "",
      "- **Task Alpha**",
      "<!-- id: task-alpha status: todo -->",
    ].join("\n");

    const result = parsePlanMarkdown(content);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<ParsedPlanItem>({
      id: "task-alpha",
      status: "todo",
      title: "Task Alpha",
    });
  });

  it("extracts a task with status doing", () => {
    const content = [
      "- Some Title",
      "<!-- id: task-1 status: doing -->",
    ].join("\n");

    const result = parsePlanMarkdown(content);
    expect(result[0].status).toBe("doing");
  });

  it("extracts a task with status done", () => {
    const content = [
      "- Task Done",
      "<!-- id: t-done status: done -->",
    ].join("\n");

    const result = parsePlanMarkdown(content);
    expect(result[0].status).toBe("done");
  });

  it("extracts multiple tasks", () => {
    const content = [
      "# PLAN",
      "",
      "## M1",
      "",
      "- **Alpha**",
      "<!-- id: m1-alpha status: todo -->",
      "",
      "- **Beta**",
      "<!-- id: m1-beta status: doing -->",
      "",
      "- **Gamma**",
      "<!-- id: m1-gamma status: done -->",
    ].join("\n");

    const result = parsePlanMarkdown(content);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("m1-alpha");
    expect(result[1].id).toBe("m1-beta");
    expect(result[2].id).toBe("m1-gamma");
  });

  it("strips markdown bold markers from title", () => {
    const content = [
      "- **Bold Title**",
      "<!-- id: t-bold status: todo -->",
    ].join("\n");

    const result = parsePlanMarkdown(content);
    expect(result[0].title).toBe("Bold Title");
  });

  it("uses the preceding non-empty line as title when available", () => {
    const content = [
      "- Plain Title",
      "<!-- id: t-plain status: todo -->",
    ].join("\n");

    const result = parsePlanMarkdown(content);
    expect(result[0].title).toBe("Plain Title");
  });

  it("handles markers with extra whitespace in attributes", () => {
    const content = "<!-- id:  t-space  status:  done  -->\n";
    const result = parsePlanMarkdown(content);
    // parser should handle trimmed attribute parsing
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("t-space");
    expect(result[0].status).toBe("done");
  });
});

describe("diffPlanItems", () => {
  it("returns empty diff for identical sets", () => {
    const fileItems: ParsedPlanItem[] = [
      { id: "t1", status: "todo", title: "Task 1" },
    ];
    const dbItems: ParsedPlanItem[] = [
      { id: "t1", status: "todo", title: "Task 1" },
    ];
    const diff = diffPlanItems(fileItems, dbItems);
    expect(diff).toEqual<PlanDiff>({ added: [], removed: [], updated: [] });
  });

  it("detects added items (present in file, absent from DB)", () => {
    const fileItems: ParsedPlanItem[] = [
      { id: "t1", status: "todo", title: "Task 1" },
      { id: "t2", status: "todo", title: "Task 2 new" },
    ];
    const dbItems: ParsedPlanItem[] = [
      { id: "t1", status: "todo", title: "Task 1" },
    ];
    const diff = diffPlanItems(fileItems, dbItems);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].id).toBe("t2");
    expect(diff.removed).toHaveLength(0);
    expect(diff.updated).toHaveLength(0);
  });

  it("detects removed items (present in DB, absent from file)", () => {
    const fileItems: ParsedPlanItem[] = [
      { id: "t1", status: "todo", title: "Task 1" },
    ];
    const dbItems: ParsedPlanItem[] = [
      { id: "t1", status: "todo", title: "Task 1" },
      { id: "t-removed", status: "done", title: "Removed" },
    ];
    const diff = diffPlanItems(fileItems, dbItems);
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0].id).toBe("t-removed");
    expect(diff.added).toHaveLength(0);
    expect(diff.updated).toHaveLength(0);
  });

  it("detects updated items (status changed)", () => {
    const fileItems: ParsedPlanItem[] = [
      { id: "t1", status: "doing", title: "Task 1" },
    ];
    const dbItems: ParsedPlanItem[] = [
      { id: "t1", status: "todo", title: "Task 1" },
    ];
    const diff = diffPlanItems(fileItems, dbItems);
    expect(diff.updated).toHaveLength(1);
    expect(diff.updated[0].id).toBe("t1");
    expect(diff.updated[0].status).toBe("doing");
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it("detects updated items (title changed)", () => {
    const fileItems: ParsedPlanItem[] = [
      { id: "t1", status: "todo", title: "New Title" },
    ];
    const dbItems: ParsedPlanItem[] = [
      { id: "t1", status: "todo", title: "Old Title" },
    ];
    const diff = diffPlanItems(fileItems, dbItems);
    expect(diff.updated).toHaveLength(1);
    expect(diff.updated[0].title).toBe("New Title");
  });

  it("handles mixed add/remove/update in one diff", () => {
    const fileItems: ParsedPlanItem[] = [
      { id: "t1", status: "done", title: "Task 1" }, // updated
      { id: "t3", status: "todo", title: "Task 3" }, // added
    ];
    const dbItems: ParsedPlanItem[] = [
      { id: "t1", status: "todo", title: "Task 1" }, // will be updated
      { id: "t2", status: "todo", title: "Task 2" }, // will be removed
    ];
    const diff = diffPlanItems(fileItems, dbItems);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].id).toBe("t3");
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0].id).toBe("t2");
    expect(diff.updated).toHaveLength(1);
    expect(diff.updated[0].id).toBe("t1");
  });

  it("returns empty diff for empty inputs", () => {
    const diff = diffPlanItems([], []);
    expect(diff).toEqual<PlanDiff>({ added: [], removed: [], updated: [] });
  });
});
