// daemon/src/index.ts
// AppRouter type + Drizzle schema types re-exported for frontend consumption.
// Frontend can import type { AppRouter, Session, TodoChangeEvent, ... } from "@claude-loom/daemon"
export type { AppRouter } from "./router.js";
export type * from "./db/schema.js";
// Event types for frontend subscription hooks (M3.1 t1 + t3 — expanded as needed)
export type { TodoChangeEvent, PlanConflictEvent } from "./events/types.js";
