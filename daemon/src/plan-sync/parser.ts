/**
 * plan-sync/parser.ts — pure PLAN.md parser.
 *
 * WHY: keeps file I/O out of this module so tests can pass markdown strings
 * directly without touching the filesystem. The caller (watcher.ts) handles
 * reading PLAN.md and passes the string here.
 *
 * Marker format (per SPEC §3.6.9.2):
 *   <!-- id: <task-id> status: <todo|doing|done> -->
 *
 * Title is extracted from the preceding non-empty line by stripping markdown
 * list markers (`- `, `* `) and bold markers (`**...**`).
 */

export type PlanItemStatus = "todo" | "doing" | "done";

/** A task item extracted from PLAN.md marker. */
export interface ParsedPlanItem {
  id: string;
  status: PlanItemStatus;
  title: string;
}

/** Diff between file state and DB state. */
export interface PlanDiff {
  /** Items present in file but absent from DB. */
  added: ParsedPlanItem[];
  /** Items present in DB but absent from file. */
  removed: ParsedPlanItem[];
  /** Items present in both but with changed status or title. */
  updated: ParsedPlanItem[];
}

/**
 * Parse PLAN.md content and extract all task items from HTML comment markers.
 * Returns an array of ParsedPlanItem extracted in document order.
 */
export function parsePlanMarkdown(content: string): ParsedPlanItem[] {
  const lines = content.split("\n");
  const items: ParsedPlanItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = /<!--\s*id:\s*(\S+)\s+status:\s*(\S+)\s*-->/.exec(line);
    if (!match) continue;

    const id = match[1].trim();
    const rawStatus = match[2].trim() as PlanItemStatus;

    // Extract title from the preceding non-empty line
    let title = "";
    for (let j = i - 1; j >= 0; j--) {
      const prev = lines[j].trim();
      if (prev.length > 0) {
        title = cleanTitle(prev);
        break;
      }
    }

    items.push({ id, status: rawStatus, title });
  }

  return items;
}

/**
 * Strip markdown list markers and bold syntax from a title line.
 * WHY: PLAN.md uses `- **Title**` or `- Title` for task entries.
 */
function cleanTitle(raw: string): string {
  // Remove leading list markers: `- ` or `* `
  let s = raw.replace(/^[-*]\s+/, "");
  // Remove bold markers: **...**
  s = s.replace(/\*\*(.*?)\*\*/g, "$1");
  return s.trim();
}

/**
 * Compute diff between file-parsed items and DB items.
 * Both inputs are arrays of ParsedPlanItem, keyed by id.
 * Returns { added, removed, updated } as three disjoint sets.
 */
export function diffPlanItems(
  fileItems: ParsedPlanItem[],
  dbItems: ParsedPlanItem[],
): PlanDiff {
  const fileMap = new Map(fileItems.map((i) => [i.id, i]));
  const dbMap = new Map(dbItems.map((i) => [i.id, i]));

  const added: ParsedPlanItem[] = [];
  const removed: ParsedPlanItem[] = [];
  const updated: ParsedPlanItem[] = [];

  // Items in file but not in DB → added
  for (const [id, fileItem] of fileMap) {
    if (!dbMap.has(id)) {
      added.push(fileItem);
    }
  }

  // Items in DB but not in file → removed
  for (const [id, dbItem] of dbMap) {
    if (!fileMap.has(id)) {
      removed.push(dbItem);
    }
  }

  // Items in both — check for status or title change
  for (const [id, fileItem] of fileMap) {
    const dbItem = dbMap.get(id);
    if (!dbItem) continue;
    if (fileItem.status !== dbItem.status || fileItem.title !== dbItem.title) {
      updated.push(fileItem);
    }
  }

  return { added, removed, updated };
}
