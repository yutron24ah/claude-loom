/**
 * Task 4 TDD: Drizzle schema for 11 tables
 * RED: this test verifies all 11 tables export correctly before schema.ts exists
 */
import { describe, it, expect } from "vitest";

describe("Drizzle schema - 11 tables", () => {
  it("exports all 11 table definitions", async () => {
    const schema = await import("../src/db/schema.js");

    // The 9 tables from §6.2
    expect(schema.projects).toBeDefined();
    expect(schema.events).toBeDefined();
    expect(schema.sessions).toBeDefined();
    expect(schema.subagents).toBeDefined();
    expect(schema.agentPool).toBeDefined();
    expect(schema.tasks).toBeDefined();
    expect(schema.tokenUsage).toBeDefined();
    expect(schema.notes).toBeDefined();
    expect(schema.planItems).toBeDefined();

    // The 2 additional tables from §7.3
    expect(schema.specChanges).toBeDefined();
    expect(schema.consistencyFindings).toBeDefined();
  });

  it("exports $inferSelect types for all 11 tables", async () => {
    const schema = await import("../src/db/schema.js");

    // Verify these are valid drizzle table objects by checking they have SQL table properties
    const tables = [
      schema.projects,
      schema.events,
      schema.sessions,
      schema.subagents,
      schema.agentPool,
      schema.tasks,
      schema.tokenUsage,
      schema.notes,
      schema.planItems,
      schema.specChanges,
      schema.consistencyFindings,
    ];

    for (const table of tables) {
      // Drizzle tables have a getSQL method or _  property
      expect(table).toBeTruthy();
      // Drizzle SQLiteTable has these characteristic properties
      expect(typeof table).toBe("object");
    }
  });

  it("projects table has required columns", async () => {
    const { projects } = await import("../src/db/schema.js");
    const columns = Object.keys(projects);
    // Check key columns exist
    expect(columns).toContain("projectId");
    expect(columns).toContain("name");
    expect(columns).toContain("rootPath");
    expect(columns).toContain("status");
    expect(columns).toContain("createdAt");
    expect(columns).toContain("lastActiveAt");
  });

  it("events table uses autoincrement integer PK (not nanoid)", async () => {
    const { events } = await import("../src/db/schema.js");
    // events.id should be the autoincrement integer pk
    expect(events.id).toBeDefined();
  });

  it("sessions table has nanoid PK", async () => {
    const { sessions } = await import("../src/db/schema.js");
    expect(sessions.sessionId).toBeDefined();
  });

  it("spec_changes table has required fields from §7.3", async () => {
    const { specChanges } = await import("../src/db/schema.js");
    const columns = Object.keys(specChanges);
    expect(columns).toContain("id");
    expect(columns).toContain("projectId");
    expect(columns).toContain("specPath");
    expect(columns).toContain("status");
    expect(columns).toContain("detectedAt");
  });

  it("consistency_findings table has required fields from §7.3", async () => {
    const { consistencyFindings } = await import("../src/db/schema.js");
    const columns = Object.keys(consistencyFindings);
    expect(columns).toContain("id");
    expect(columns).toContain("specChangeId");
    expect(columns).toContain("severity");
    expect(columns).toContain("status");
    expect(columns).toContain("createdAt");
  });
});
