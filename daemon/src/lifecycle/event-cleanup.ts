import { createDBClient } from "../db/client.js";
import { events } from "../db/schema.js";
import { lt, sql } from "drizzle-orm";
import { statSync } from "node:fs";
import { homedir } from "node:os";

const DEFAULT_RETENTION_DAYS = 30;
const DEFAULT_MAX_SIZE_MB = 200;
const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily

export async function runEventCleanup(opts: {
  retentionDays?: number;
  maxSizeMb?: number;
  dbPath?: string;
}) {
  const dbPath = opts.dbPath ?? `${homedir()}/.claude-loom/loom.db`;
  const db = createDBClient(dbPath);
  const retentionDays = opts.retentionDays ?? DEFAULT_RETENTION_DAYS;
  const maxSizeMb = opts.maxSizeMb ?? DEFAULT_MAX_SIZE_MB;

  // 1. Delete events older than retentionDays
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const ageResult = await db.delete(events).where(lt(events.createdAt, cutoff));
  const ageDeleted = (ageResult as any).changes ?? 0;

  // 2. File size check — delete oldest 10000 if over limit
  let sizeOver = 0;
  try {
    const sizeBytes = statSync(dbPath).size;
    if (sizeBytes > maxSizeMb * 1024 * 1024) {
      const result = await db.run(
        sql`DELETE FROM events WHERE id IN (SELECT id FROM events ORDER BY created_at ASC LIMIT 10000)`
      );
      sizeOver = (result as any).changes ?? 0;
    }
  } catch {
    // DB file size check failed — skip size cleanup
  }

  return { ageDeleted, sizeOver };
}

export function scheduleEventCleanup(opts: {
  retentionDays?: number;
  maxSizeMb?: number;
  dbPath?: string;
  intervalMs?: number; // override for testing
}) {
  const intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS;
  const interval = setInterval(() => {
    runEventCleanup(opts).catch(() => {});
  }, intervalMs);

  return {
    stop() {
      clearInterval(interval);
    },
  };
}
