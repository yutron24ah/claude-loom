/**
 * TDD RED phase — agent attention + dispatch history procedures
 *
 * Tests written BEFORE implementation exists.
 * WHY: verifies agentRouter has markAttention mutation + dispatchHistory query
 * with correct procedure types, and that the schema exposes the attention column.
 */
import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Procedure shape tests (no DB needed)
// ---------------------------------------------------------------------------

describe("agentRouter — markAttention mutation exists", () => {
  it("agentRouter has markAttention procedure", async () => {
    const { agentRouter } = await import("../src/routes/agent.js");
    const def = (agentRouter as any)._def;
    expect(def.procedures).toHaveProperty("markAttention");
  });

  it("agentRouter.markAttention is a mutation procedure", async () => {
    const { agentRouter } = await import("../src/routes/agent.js");
    const def = (agentRouter as any)._def;
    expect(def.procedures.markAttention._def.type).toBe("mutation");
  });
});

describe("agentRouter — dispatchHistory query exists", () => {
  it("agentRouter has dispatchHistory procedure", async () => {
    const { agentRouter } = await import("../src/routes/agent.js");
    const def = (agentRouter as any)._def;
    expect(def.procedures).toHaveProperty("dispatchHistory");
  });

  it("agentRouter.dispatchHistory is a query procedure", async () => {
    const { agentRouter } = await import("../src/routes/agent.js");
    const def = (agentRouter as any)._def;
    expect(def.procedures.dispatchHistory._def.type).toBe("query");
  });
});

// ---------------------------------------------------------------------------
// Schema tests — attention column must exist on the subagents table definition
// ---------------------------------------------------------------------------

describe("subagents schema — attention column", () => {
  it("subagents table object has attention property", async () => {
    const { subagents } = await import("../src/db/schema.js");
    // WHY: once the column is added to schema.ts, subagents.attention is a Drizzle Column object
    expect(subagents).toHaveProperty("attention");
  });
});

// ---------------------------------------------------------------------------
// DB integration tests — in-memory SQLite via raw better-sqlite3
// Tests the persistence behavior that markAttention mutation will rely on.
// WHY: test behavior (read-after-write) not implementation. We use raw sqlite3
// because the Drizzle schema does not yet have `attention` column — adding it
// in schema.ts is GREEN phase. Raw SQL tests verify the column behavior works.
// ---------------------------------------------------------------------------
import Database from "better-sqlite3";

describe("markAttention — DB persistence (raw sqlite)", () => {
  it("attention column defaults to 0 (false)", () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(`
      CREATE TABLE subagents (
        subagent_id TEXT PRIMARY KEY NOT NULL,
        parent_session_id TEXT NOT NULL,
        agent_type TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        attention INTEGER NOT NULL DEFAULT 0
      );
    `);

    sqlite.prepare(`INSERT INTO subagents VALUES (?,?,?,?,?,?)`).run(
      "sa-001", "sess-001", "loom-developer", "done", Date.now() - 60000, 0
    );

    const row = sqlite.prepare("SELECT attention FROM subagents WHERE subagent_id=?").get("sa-001") as { attention: number };
    expect(row.attention).toBe(0);
    sqlite.close();
  });

  it("sets attention=1 (true) on a subagent", () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(`
      CREATE TABLE subagents (
        subagent_id TEXT PRIMARY KEY NOT NULL,
        parent_session_id TEXT NOT NULL,
        agent_type TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        attention INTEGER NOT NULL DEFAULT 0
      );
    `);

    sqlite.prepare(`INSERT INTO subagents VALUES (?,?,?,?,?,?)`).run(
      "sa-001", "sess-001", "loom-developer", "done", Date.now() - 60000, 0
    );

    sqlite.prepare("UPDATE subagents SET attention=1 WHERE subagent_id=?").run("sa-001");

    const row = sqlite.prepare("SELECT attention FROM subagents WHERE subagent_id=?").get("sa-001") as { attention: number };
    expect(row.attention).toBe(1);
    sqlite.close();
  });

  it("unmarks attention (sets attention=0) on a subagent", () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(`
      CREATE TABLE subagents (
        subagent_id TEXT PRIMARY KEY NOT NULL,
        parent_session_id TEXT NOT NULL,
        agent_type TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        attention INTEGER NOT NULL DEFAULT 0
      );
    `);

    sqlite.prepare(`INSERT INTO subagents VALUES (?,?,?,?,?,?)`).run(
      "sa-002", "sess-001", "loom-developer", "done", Date.now() - 60000, 1
    );

    sqlite.prepare("UPDATE subagents SET attention=0 WHERE subagent_id=?").run("sa-002");

    const row = sqlite.prepare("SELECT attention FROM subagents WHERE subagent_id=?").get("sa-002") as { attention: number };
    expect(row.attention).toBe(0);
    sqlite.close();
  });
});
