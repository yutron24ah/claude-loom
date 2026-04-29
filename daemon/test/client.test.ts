/**
 * Task 5 TDD: DB client wrapper
 * RED: tests for createDBClient before client.ts exists
 */
import { describe, it, expect, afterEach } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("DB client wrapper", () => {
  const testDbPath = join(tmpdir(), `loom-test-${Date.now()}.db`);

  afterEach(() => {
    // Clean up test DB
    if (existsSync(testDbPath)) {
      rmSync(testDbPath);
    }
    const walPath = testDbPath + "-wal";
    const shmPath = testDbPath + "-shm";
    if (existsSync(walPath)) rmSync(walPath);
    if (existsSync(shmPath)) rmSync(shmPath);
  });

  it("createDBClient creates a DB file at the given path", async () => {
    const { createDBClient } = await import("../src/db/client.js");
    const db = createDBClient(testDbPath);
    expect(db).toBeDefined();
    expect(existsSync(testDbPath)).toBe(true);
  });

  it("createDBClient returns a drizzle ORM instance", async () => {
    const { createDBClient } = await import("../src/db/client.js");
    const db = createDBClient(testDbPath);
    // drizzle DB instance has select, insert, delete methods
    expect(typeof db.select).toBe("function");
    expect(typeof db.insert).toBe("function");
    expect(typeof db.delete).toBe("function");
  });

  it("runMigrations applies schema migrations", async () => {
    const { createDBClient, runMigrations } = await import("../src/db/client.js");
    const db = createDBClient(testDbPath);
    // Should not throw when migrations folder exists
    expect(() => runMigrations(db)).not.toThrow();
  });
});
