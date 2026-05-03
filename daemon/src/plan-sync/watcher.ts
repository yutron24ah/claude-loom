/**
 * plan-sync/watcher.ts — chokidar-based PLAN.md file watcher with LWW conflict detection.
 *
 * WHY: SPEC §3.6.9.2 β-3 hybrid debounce + LWW mtime:
 *   - chokidar watches PLAN.md for change events
 *   - 500ms self-managed setTimeout debounce collapses rapid changes into 1 parse
 *   - After debounce fires: parse file, load DB items, compare mtimes
 *   - file mtime > max(dbUpdatedAt) → file wins (no conflict), apply diff
 *   - max(dbUpdatedAt) > file mtime → conflict → broadcast plan.conflict event
 *   - tie (same ms) → DB wins, no conflict broadcast (spec §3.6.9.2)
 *
 * Cleanup: caller (index.ts or test) calls the returned cleanup() to unwatch.
 */
import { readFile, stat } from "node:fs/promises";
import chokidar from "chokidar";
import { eq } from "drizzle-orm";
import { createDBClient } from "../db/client.js";
import { planItems } from "../db/schema.js";
import { broadcaster } from "../events/broadcaster.js";
import { parsePlanMarkdown, diffPlanItems } from "./parser.js";
import type { ParsedPlanItem } from "./parser.js";

export interface PlanWatcherOptions {
  planPath: string;
  projectId: string;
}

export type PlanWatcherCleanup = () => Promise<void>;

/**
 * Start watching PLAN.md for changes.
 * Returns a cleanup function that stops the watcher.
 */
export function createPlanWatcher(options: PlanWatcherOptions): PlanWatcherCleanup {
  const { planPath, projectId } = options;
  const db = createDBClient();

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const watcher = chokidar.watch(planPath, {
    // WHY: ignoreInitial=true avoids a spurious parse on watcher startup
    ignoreInitial: true,
    persistent: false,
  });

  watcher.on("change", () => {
    // Debounce: reset timer on every change event
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void handleChange();
    }, 500);
  });

  async function handleChange(): Promise<void> {
    try {
      // Read file content and mtime in parallel
      const [content, fileStat] = await Promise.all([
        readFile(planPath, "utf-8"),
        stat(planPath),
      ]);
      const fileMtime = fileStat.mtimeMs;

      // Parse file markers
      const fileItems = parsePlanMarkdown(content);

      // Load DB items for this project
      const dbRows = await db
        .select()
        .from(planItems)
        .where(eq(planItems.projectId, projectId))
        .orderBy(planItems.position);

      // Build ParsedPlanItem list from DB rows for diffing
      // WHY: we map DB rows to ParsedPlanItem shape (only id, status, title needed for diff)
      const dbParsed: ParsedPlanItem[] = dbRows.map((row) => ({
        id: String(row.id),
        status: row.status as ParsedPlanItem["status"],
        title: row.title,
      }));

      const diff = diffPlanItems(fileItems, dbParsed);
      const hasChanges =
        diff.added.length > 0 || diff.removed.length > 0 || diff.updated.length > 0;

      if (!hasChanges) {
        // No structural change — nothing to do
        return;
      }

      // Find the most recent updatedAt across all affected DB rows.
      // WHY: LWW comparison needs the freshest DB timestamp for updated/removed items.
      // added items have no DB mtime (they are absent from DB) and always file-win — excluded here.
      const affectedIds = [
        ...diff.updated.map((i) => i.id),
        ...diff.removed.map((i) => i.id),
      ];
      let maxDbMtime = 0;
      for (const row of dbRows) {
        const rowId = String(row.id);
        if (affectedIds.includes(rowId)) {
          const rowMtime = row.updatedAt instanceof Date
            ? row.updatedAt.getTime()
            : Number(row.updatedAt);
          if (rowMtime > maxDbMtime) {
            maxDbMtime = rowMtime;
          }
        }
      }

      // LWW: DB wins on tie or when DB is newer (spec §3.6.9.2)
      if (maxDbMtime >= fileMtime) {
        if (maxDbMtime > fileMtime) {
          // Conflict: DB has a more recent update than the file — notify UI
          broadcaster.emitPlanConflict({
            projectId,
            conflictType: "file_vs_db",
            fileMtime,
            dbMtime: maxDbMtime,
            affectedItemIds: affectedIds,
          });
        }
        // Tie (maxDbMtime === fileMtime): DB wins silently, no broadcast
        return;
      }

      // File wins when file is strictly newer (fileMtime > maxDbMtime).
      // WHY: only emit plan.change when the file unambiguously has newer data.
      // Actual DB apply is left to caller / future mutation logic;
      // for now, broadcast plan.change for each updated item.
      for (const item of diff.updated) {
        broadcaster.emitPlanChange({
          itemId: item.id,
          projectId,
          status: item.status,
          title: item.title,
        });
      }
    } catch {
      // WHY: file read errors (e.g. PLAN.md temporarily missing during save)
      // are silently ignored — next change event will retry.
    }
  }

  return async function cleanup(): Promise<void> {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    await watcher.close();
  };
}
