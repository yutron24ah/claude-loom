/**
 * M4 t6: finding-to-plan.ts unit tests
 * TDD RED phase — written before implementation exists.
 *
 * WHY: findingToPlanItem is a pure function converting a ConsistencyFinding
 * into a NewPlanItem shape. Unit tests verify title/body format, constants
 * compliance, and edge cases (long description, all severity/finding_type combos).
 *
 * §3.6.10: No raw string literals — title format uses FINDING_TO_PLAN_TITLE_PREFIX.
 */
import { describe, it, expect } from "vitest";
import type { ConsistencyFinding } from "../../src/db/schema.js";

// Helpers — stub finding factory
function makeFinding(overrides: Partial<ConsistencyFinding> = {}): ConsistencyFinding {
  return {
    id: 1,
    specChangeId: 42,
    targetPath: "docs/SPEC.md",
    severity: "high",
    findingType: "term_removed",
    description: "The term OldApiSection was removed from the spec",
    suggestedChange: "Replace OldApiSection with NewApiSection",
    status: "open",
    createdAt: new Date("2026-05-02T00:00:00Z"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Module shape test
// ---------------------------------------------------------------------------

describe("finding-to-plan module shape", () => {
  it("exports findingToPlanItem function", async () => {
    const mod = await import("../../src/lib/finding-to-plan.js");
    expect(typeof mod.findingToPlanItem).toBe("function");
  });

  it("exports FINDING_TO_PLAN_TITLE_PREFIX constant from constants/consistency", async () => {
    const { FINDING_TO_PLAN_TITLE_PREFIX } = await import("../../src/constants/consistency.js");
    expect(typeof FINDING_TO_PLAN_TITLE_PREFIX).toBe("string");
    expect(FINDING_TO_PLAN_TITLE_PREFIX.length).toBeGreaterThan(0);
  });

  it("exports PLAN_ITEM_SOURCE constant from constants/consistency", async () => {
    const { PLAN_ITEM_SOURCE } = await import("../../src/constants/consistency.js");
    expect(typeof PLAN_ITEM_SOURCE).toBe("object");
    expect(typeof PLAN_ITEM_SOURCE.CONSISTENCY).toBe("string");
    expect(typeof PLAN_ITEM_SOURCE.MANUAL).toBe("string");
    expect(typeof PLAN_ITEM_SOURCE.SPEC).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// findingToPlanItem — title format
// ---------------------------------------------------------------------------

describe("findingToPlanItem — title format", () => {
  it("uses FINDING_TO_PLAN_TITLE_PREFIX in the title", async () => {
    const { findingToPlanItem } = await import("../../src/lib/finding-to-plan.js");
    const { FINDING_TO_PLAN_TITLE_PREFIX } = await import("../../src/constants/consistency.js");

    const finding = makeFinding();
    const planItem = findingToPlanItem(finding, "proj-test");

    expect(planItem.title).toContain(FINDING_TO_PLAN_TITLE_PREFIX);
  });

  it("includes targetPath in the title", async () => {
    const { findingToPlanItem } = await import("../../src/lib/finding-to-plan.js");

    const finding = makeFinding({ targetPath: "docs/PLAN.md" });
    const planItem = findingToPlanItem(finding, "proj-test");

    expect(planItem.title).toContain("docs/PLAN.md");
  });

  it("includes description (up to 80 chars) in the title", async () => {
    const { findingToPlanItem } = await import("../../src/lib/finding-to-plan.js");

    const description = "Short description";
    const finding = makeFinding({ description });
    const planItem = findingToPlanItem(finding, "proj-test");

    expect(planItem.title).toContain(description);
  });

  it("truncates description to 80 chars in title for long descriptions", async () => {
    const { findingToPlanItem } = await import("../../src/lib/finding-to-plan.js");

    const longDescription = "A".repeat(120);
    const finding = makeFinding({ description: longDescription });
    const planItem = findingToPlanItem(finding, "proj-test");

    // The truncated portion (80 chars of 'A') should appear
    expect(planItem.title).toContain("A".repeat(80));
    // The full 120-char description should NOT appear
    expect(planItem.title).not.toContain("A".repeat(120));
  });

  it("title does not exceed a reasonable length for normal descriptions", async () => {
    const { findingToPlanItem } = await import("../../src/lib/finding-to-plan.js");

    const finding = makeFinding();
    const planItem = findingToPlanItem(finding, "proj-test");

    // Title should be compact — prefix + targetPath + colon + space + 80 chars max
    // The overall length can vary; just ensure no untrimmed overflow
    expect(planItem.title.length).toBeLessThan(200);
  });
});

// ---------------------------------------------------------------------------
// findingToPlanItem — body content
// ---------------------------------------------------------------------------

describe("findingToPlanItem — body content", () => {
  it("includes severity in body", async () => {
    const { findingToPlanItem } = await import("../../src/lib/finding-to-plan.js");

    const finding = makeFinding({ severity: "high" });
    const planItem = findingToPlanItem(finding, "proj-test");

    expect(planItem.body).toContain("high");
  });

  it("includes findingType in body", async () => {
    const { findingToPlanItem } = await import("../../src/lib/finding-to-plan.js");

    const finding = makeFinding({ findingType: "section_changed" });
    const planItem = findingToPlanItem(finding, "proj-test");

    expect(planItem.body).toContain("section_changed");
  });

  it("includes suggestedChange in body when present", async () => {
    const { findingToPlanItem } = await import("../../src/lib/finding-to-plan.js");

    const finding = makeFinding({ suggestedChange: "Update the doc to use NewApiSection" });
    const planItem = findingToPlanItem(finding, "proj-test");

    expect(planItem.body).toContain("Update the doc to use NewApiSection");
  });

  it("body is a string when suggestedChange is null", async () => {
    const { findingToPlanItem } = await import("../../src/lib/finding-to-plan.js");

    const finding = makeFinding({ suggestedChange: null });
    const planItem = findingToPlanItem(finding, "proj-test");

    expect(typeof planItem.body).toBe("string");
  });

  it("includes full description in body", async () => {
    const { findingToPlanItem } = await import("../../src/lib/finding-to-plan.js");

    const finding = makeFinding({ description: "The term SpecialTerm was removed" });
    const planItem = findingToPlanItem(finding, "proj-test");

    expect(planItem.body).toContain("The term SpecialTerm was removed");
  });
});

// ---------------------------------------------------------------------------
// findingToPlanItem — plan_item field values
// ---------------------------------------------------------------------------

describe("findingToPlanItem — plan_item field values", () => {
  it("status is 'todo'", async () => {
    const { findingToPlanItem } = await import("../../src/lib/finding-to-plan.js");

    const finding = makeFinding();
    const planItem = findingToPlanItem(finding, "proj-test");

    expect(planItem.status).toBe("todo");
  });

  it("source is PLAN_ITEM_SOURCE.CONSISTENCY", async () => {
    const { findingToPlanItem } = await import("../../src/lib/finding-to-plan.js");
    const { PLAN_ITEM_SOURCE } = await import("../../src/constants/consistency.js");

    const finding = makeFinding();
    const planItem = findingToPlanItem(finding, "proj-test");

    expect(planItem.source).toBe(PLAN_ITEM_SOURCE.CONSISTENCY);
  });

  it("parentId is null (root-level plan item)", async () => {
    const { findingToPlanItem } = await import("../../src/lib/finding-to-plan.js");

    const finding = makeFinding();
    const planItem = findingToPlanItem(finding, "proj-test");

    expect(planItem.parentId).toBeNull();
  });

  it("sourcePath is the finding's targetPath", async () => {
    const { findingToPlanItem } = await import("../../src/lib/finding-to-plan.js");

    const finding = makeFinding({ targetPath: "agents/loom-pm.md" });
    const planItem = findingToPlanItem(finding, "proj-test");

    expect(planItem.sourcePath).toBe("agents/loom-pm.md");
  });

  it("returns a NewPlanItem shape (no id field)", async () => {
    const { findingToPlanItem } = await import("../../src/lib/finding-to-plan.js");

    const finding = makeFinding();
    const planItem = findingToPlanItem(finding, "proj-test");

    // NewPlanItem should not include 'id' (DB auto-assigns it)
    expect("id" in planItem).toBe(false);
  });

  it("position defaults to 0", async () => {
    const { findingToPlanItem } = await import("../../src/lib/finding-to-plan.js");

    const finding = makeFinding();
    const planItem = findingToPlanItem(finding, "proj-test");

    expect(planItem.position).toBe(0);
  });

  it("projectId is set to the supplied projectId parameter", async () => {
    const { findingToPlanItem } = await import("../../src/lib/finding-to-plan.js");

    const finding = makeFinding();
    const planItem = findingToPlanItem(finding, "my-project-123");

    expect(planItem.projectId).toBe("my-project-123");
  });
});

// ---------------------------------------------------------------------------
// findingToPlanItem — all severity values
// ---------------------------------------------------------------------------

describe("findingToPlanItem — severity enum coverage", () => {
  for (const severity of ["high", "medium", "low"] as const) {
    it(`handles severity=${severity}`, async () => {
      const { findingToPlanItem } = await import("../../src/lib/finding-to-plan.js");

      const finding = makeFinding({ severity });
      const planItem = findingToPlanItem(finding, "proj-test");

      expect(planItem.body).toContain(severity);
      expect(planItem.status).toBe("todo");
    });
  }
});

// ---------------------------------------------------------------------------
// findingToPlanItem — all findingType values
// ---------------------------------------------------------------------------

describe("findingToPlanItem — findingType enum coverage", () => {
  const types = [
    "term_removed",
    "term_renamed",
    "section_changed",
    "semantic_drift",
    "term_mention",
  ] as const;

  for (const findingType of types) {
    it(`handles findingType=${findingType}`, async () => {
      const { findingToPlanItem } = await import("../../src/lib/finding-to-plan.js");

      const finding = makeFinding({ findingType });
      const planItem = findingToPlanItem(finding, "proj-test");

      expect(planItem.body).toContain(findingType);
    });
  }
});
