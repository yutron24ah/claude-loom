// daemon/src/index.ts
// AppRouter type + Drizzle schema types re-exported for frontend consumption.
// Frontend can import type { AppRouter, Session, ... } from "@claude-loom/daemon"
export type { AppRouter } from "./router.js";
export type * from "./db/schema.js";
