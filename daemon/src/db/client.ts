import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import * as schema from "./schema.js";

export type DBClient = ReturnType<typeof createDBClient>;

export function createDBClient(dbPath?: string) {
  const path = dbPath ?? `${homedir()}/.claude-loom/loom.db`;
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  return drizzle(sqlite, { schema });
}

const _dirname = dirname(fileURLToPath(import.meta.url));

export function runMigrations(
  db: DBClient,
  migrationsFolder = resolve(_dirname, "./migrations"),
) {
  migrate(db, { migrationsFolder });
}
