/**
 * SSoT enum constants for notes table (SPEC §6.2, §3.6.10)
 * WHY: Extracted from routes/note.ts into a pure constants file so that
 * the UI can import these values without pulling in Node.js-only dependencies
 * (better-sqlite3, fastify, etc.) that come through the trpc → routes chain.
 * The constants file has no imports, making it safe to bundle in browser contexts.
 */

export const NOTE_ATTACHED_TYPE = {
  PROJECT: "project",
  SESSION: "session",
  SUBAGENT: "subagent",
  TASK: "task",
  POOL_SLOT: "pool_slot",
  PLAN_ITEM: "plan_item",
} as const;

export type NoteAttachedType = typeof NOTE_ATTACHED_TYPE[keyof typeof NOTE_ATTACHED_TYPE];
