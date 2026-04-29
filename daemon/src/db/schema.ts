/**
 * Drizzle ORM schema for 11 tables
 * SPEC §6.2 (9 tables) + SPEC §7.3 (2 tables)
 * ID strategy: SPEC §12 — nanoid for user-facing tables, autoincrement for high-frequency append-only
 * Timestamp: integer ms (epoch) with mode: "timestamp_ms" → TS Date type
 */
import { sqliteTable, text, integer, uniqueIndex, primaryKey } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

// ---------------------------------------------------------------------------
// 1. projects — top-level entity, nanoid PK
// ---------------------------------------------------------------------------
export const projects = sqliteTable("projects", {
  projectId: text("project_id").primaryKey().$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  rootPath: text("root_path").notNull().unique(),
  specPath: text("spec_path"),
  planPath: text("plan_path"),
  rulesPath: text("rules_path"),
  methodology: text("methodology").notNull().default("agile"),
  maxDevelopers: integer("max_developers").notNull().default(3),
  maxReviewers: integer("max_reviewers").notNull().default(1),
  maxCodeReviewers: integer("max_code_reviewers").notNull().default(1),
  maxSecurityReviewers: integer("max_security_reviewers").notNull().default(1),
  maxTestReviewers: integer("max_test_reviewers").notNull().default(1),
  status: text("status").notNull(), // 'active' | 'archived'
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  lastActiveAt: integer("last_active_at", { mode: "timestamp_ms" }).notNull(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

// ---------------------------------------------------------------------------
// 2. events — append-only audit log, autoincrement PK (SPEC §12 exception)
// ---------------------------------------------------------------------------
export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  eventType: text("event_type").notNull(), // 'session_start' | 'pre_tool' | 'post_tool' | 'stop' | 'subagent_stop'
  toolName: text("tool_name"),
  payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

// ---------------------------------------------------------------------------
// 3. sessions — derived state, nanoid PK
// ---------------------------------------------------------------------------
export const sessions = sqliteTable("sessions", {
  sessionId: text("session_id").primaryKey().$defaultFn(() => nanoid()),
  projectId: text("project_id"), // NULL for PM sessions (role='pm')
  worktreePath: text("worktree_path").notNull(),
  role: text("role"), // 'pm' | 'dev_parent' | null
  status: text("status").notNull(), // 'active' | 'idle' | 'ended'
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  endedAt: integer("ended_at", { mode: "timestamp_ms" }),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

// ---------------------------------------------------------------------------
// 4. subagents — nanoid PK
// ---------------------------------------------------------------------------
export const subagents = sqliteTable("subagents", {
  subagentId: text("subagent_id").primaryKey().$defaultFn(() => nanoid()),
  parentSessionId: text("parent_session_id").notNull(),
  poolSlotId: text("pool_slot_id"),
  agentType: text("agent_type").notNull(),
  promptSummary: text("prompt_summary"),
  status: text("status").notNull(), // 'running' | 'done' | 'failed'
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  endedAt: integer("ended_at", { mode: "timestamp_ms" }),
  resultSummary: text("result_summary"),
});

export type Subagent = typeof subagents.$inferSelect;
export type NewSubagent = typeof subagents.$inferInsert;

// ---------------------------------------------------------------------------
// 5. agent_pool — nanoid PK
// ---------------------------------------------------------------------------
export const agentPool = sqliteTable("agent_pool", {
  poolSlotId: text("pool_slot_id").primaryKey().$defaultFn(() => nanoid()),
  projectId: text("project_id").notNull(),
  agentType: text("agent_type").notNull(),
  slotNumber: integer("slot_number").notNull(),
  status: text("status").notNull(), // 'idle' | 'busy'
  currentSubagentId: text("current_subagent_id"),
  lastActiveAt: integer("last_active_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => ({
  uniqueSlot: uniqueIndex("agent_pool_unique_slot").on(table.projectId, table.agentType, table.slotNumber),
}));

export type AgentPool = typeof agentPool.$inferSelect;
export type NewAgentPool = typeof agentPool.$inferInsert;

// ---------------------------------------------------------------------------
// 6. tasks — nanoid PK
// ---------------------------------------------------------------------------
export const tasks = sqliteTable("tasks", {
  taskId: text("task_id").primaryKey().$defaultFn(() => nanoid()),
  sessionId: text("session_id").notNull(),
  content: text("content").notNull(),
  activeForm: text("active_form").notNull(),
  status: text("status").notNull(), // 'pending' | 'in_progress' | 'completed'
  position: integer("position").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

// ---------------------------------------------------------------------------
// 7. token_usage — composite PK (session_id, bucket_at) per SPEC §6.2
// ---------------------------------------------------------------------------
export const tokenUsage = sqliteTable("token_usage", {
  sessionId: text("session_id").notNull(),
  bucketAt: integer("bucket_at").notNull(), // 5-minute epoch bucket
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  cacheTokens: integer("cache_tokens").notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.sessionId, table.bucketAt] }),
}));

export type TokenUsage = typeof tokenUsage.$inferSelect;
export type NewTokenUsage = typeof tokenUsage.$inferInsert;

// ---------------------------------------------------------------------------
// 8. notes — autoincrement PK (user-writable, not URL-exposed)
// ---------------------------------------------------------------------------
export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  attachedType: text("attached_type").notNull(), // 'project' | 'session' | 'subagent' | 'task' | 'pool_slot'
  attachedId: text("attached_id").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;

// ---------------------------------------------------------------------------
// 9. plan_items — autoincrement PK, self-referential FK for hierarchy
// ---------------------------------------------------------------------------
export const planItems = sqliteTable("plan_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: text("project_id").notNull(),
  source: text("source").notNull(), // 'file' | 'user'
  sourcePath: text("source_path"),
  parentId: integer("parent_id"), // self-FK → plan_items.id
  title: text("title").notNull(),
  body: text("body"),
  status: text("status").notNull(), // 'todo' | 'doing' | 'done'
  position: integer("position").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export type PlanItem = typeof planItems.$inferSelect;
export type NewPlanItem = typeof planItems.$inferInsert;

// ---------------------------------------------------------------------------
// 10. spec_changes — SPEC §7.3, autoincrement PK
// ---------------------------------------------------------------------------
export const specChanges = sqliteTable("spec_changes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: text("project_id").notNull(),
  specPath: text("spec_path").notNull(),
  beforeHash: text("before_hash").notNull(),
  afterHash: text("after_hash").notNull(),
  diff: text("diff").notNull(),
  detectedAt: integer("detected_at", { mode: "timestamp_ms" }).notNull(),
  analyzedAt: integer("analyzed_at", { mode: "timestamp_ms" }),
  status: text("status").notNull(), // 'pending' | 'analyzed' | 'dismissed'
});

export type SpecChange = typeof specChanges.$inferSelect;
export type NewSpecChange = typeof specChanges.$inferInsert;

// ---------------------------------------------------------------------------
// 11. consistency_findings — SPEC §7.3, autoincrement PK
// ---------------------------------------------------------------------------
export const consistencyFindings = sqliteTable("consistency_findings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  specChangeId: integer("spec_change_id").notNull(),
  targetPath: text("target_path").notNull(),
  severity: text("severity").notNull(), // 'high' | 'medium' | 'low'
  findingType: text("finding_type").notNull(), // 'term_removed' | 'term_renamed' | 'section_changed' | 'semantic_drift' | 'term_mention'
  description: text("description").notNull(),
  suggestedChange: text("suggested_change"),
  status: text("status").notNull(), // 'open' | 'acknowledged' | 'fixed' | 'dismissed'
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type ConsistencyFinding = typeof consistencyFindings.$inferSelect;
export type NewConsistencyFinding = typeof consistencyFindings.$inferInsert;
