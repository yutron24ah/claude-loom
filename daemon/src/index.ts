// daemon/src/index.ts
// AppRouter type + Drizzle schema types re-exported for frontend consumption.
// Frontend can import type { AppRouter, Session, TodoChangeEvent, ... } from "@claude-loom/daemon"
export type { AppRouter } from "./router.js";
export type * from "./db/schema.js";
// Event types for frontend subscription hooks (M3.1 t1 + t3, M3.2 t1 — expanded as needed)
export type { TodoChangeEvent, PlanConflictEvent, SessionChangeEvent } from "./events/types.js";
// Note attachment constants — re-exported as SSoT (SPEC §3.6.10, LOW 1 M3.2 t3 follow-up)
// WHY: frontend consumers import from here to avoid duplicate definitions in ui/
export { NOTE_ATTACHED_TYPE } from "./routes/note.js";
export type { NoteAttachedType } from "./routes/note.js";
