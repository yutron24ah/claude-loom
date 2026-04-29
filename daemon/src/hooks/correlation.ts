import { createDBClient } from "../db/client.js";
import { subagents } from "../db/schema.js";
import { eq } from "drizzle-orm";

/**
 * subagent dispatch event を parent session に紐付ける。
 * SPEC §6.4: PreToolUse(Task) と SubagentStart の FIFO matching で parent_session_id を推定。
 *
 * M1 では FIFO queue を session_id ごとに in-memory 管理し、PreToolUse(Task) 時に
 * push、SubagentStart 時に pop して紐付ける。
 */
const fifoQueues = new Map<string, string[]>(); // parent session_id → 待機中 task_id[]

// subagent session_id → DB subagent_id mapping (for stop event lookup)
const subagentSessionToId = new Map<string, string>();

export function pushTaskDispatch(parentSessionId: string, taskId: string) {
  const queue = fifoQueues.get(parentSessionId) ?? [];
  queue.push(taskId);
  fifoQueues.set(parentSessionId, queue);
}

export function popTaskDispatch(parentSessionId: string): string | undefined {
  const queue = fifoQueues.get(parentSessionId);
  if (!queue || queue.length === 0) return undefined;
  return queue.shift();
}

/**
 * Subagent session を DB に登録、FIFO で parent と紐付け。
 * NOTE: subagents table uses subagentId (nanoid PK), not a subagentSessionId column.
 * We store the hook session_id in promptSummary for tracing, and pool_slot_id for the taskId mapping.
 */
export async function correlateSubagent(opts: {
  subagentSessionId: string;
  hookEventName: "SubagentStart" | "SubagentStop";
  parentSessionIdHint?: string;
}): Promise<{ parentSessionId?: string; taskId?: string }> {
  const dbPath = process.env.CLAUDE_LOOM_DB_PATH;
  const db = createDBClient(dbPath);

  if (opts.hookEventName === "SubagentStart" && opts.parentSessionIdHint) {
    const taskId = popTaskDispatch(opts.parentSessionIdHint);
    if (taskId) {
      const [inserted] = await db.insert(subagents).values({
        parentSessionId: opts.parentSessionIdHint,
        agentType: "subagent",
        promptSummary: opts.subagentSessionId, // store hook session_id for tracing
        poolSlotId: taskId, // store taskId in poolSlotId for tracing
        status: "running",
        startedAt: new Date(),
        lastActiveAt: new Date(),
      } as any).returning();
      subagentSessionToId.set(opts.subagentSessionId, inserted.subagentId);
      return { parentSessionId: opts.parentSessionIdHint, taskId };
    }
  } else if (opts.hookEventName === "SubagentStop") {
    const dbId = subagentSessionToId.get(opts.subagentSessionId);
    if (dbId) {
      await db.update(subagents)
        .set({ status: "done", endedAt: new Date() })
        .where(eq(subagents.subagentId, dbId));
      subagentSessionToId.delete(opts.subagentSessionId);
    }
  }
  return {};
}
