// daemon/src/index.ts
// AppRouter type + Drizzle schema types re-exported for frontend consumption.
// Frontend can import type { AppRouter, Session, TodoChangeEvent, ... } from "@claude-loom/daemon"
export type { AppRouter } from "./router.js";
export type * from "./db/schema.js";
// Event types for frontend subscription hooks (M3.1 t1 + t3, M3.2 t1, M4 t7 — expanded as needed)
export type {
  TodoChangeEvent,
  PlanConflictEvent,
  SessionChangeEvent,
  FindingNewEvent,
  SpecChangeDetectedEvent,
} from "./events/types.js";
// Note attachment constants — re-exported as SSoT (SPEC §3.6.10, LOW 1 M3.2 t3 follow-up)
// WHY: frontend consumers import from here to avoid duplicate definitions in ui/
export { NOTE_ATTACHED_TYPE } from "./routes/note.js";
export type { NoteAttachedType } from "./routes/note.js";
// Consistency constants — re-exported as SSoT (SPEC §3.6.10, M4 t5)
// WHY: frontend uses FINDING_STATUS / SEVERITY / TYPE / SPEC_CHANGE_STATUS via this entry point
export {
  FINDING_STATUS,
  FINDING_SEVERITY,
  FINDING_TYPE,
  SPEC_CHANGE_STATUS,
} from "./constants/consistency.js";
export type {
  FindingStatus,
  FindingSeverity,
  FindingType,
  SpecChangeStatus,
} from "./constants/consistency.js";
// M5 t4: TokenUsage type re-export for frontend polling UI
export type { TokenUsage, NewTokenUsage } from "./db/schema.js";
