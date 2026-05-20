// =============================================================
// redesign/api/types.ts
// -------------------------------------------------------------
// TypeScript shape contract derived from redesign/scenarios.js.
//
// SOURCE OF TRUTH:
//   redesign/scenarios.js (mock fixture). DO NOT delete that file
//   and keep this file in sync when the fixture evolves.
//
// RELATIONSHIP TO daemon/src/events/types.ts:
//   - daemon emits *delta* events (agent.change, todo.change, ...)
//   - this file describes the *aggregated view state* the UI consumes
//   - redesign/api/websocket.ts contains the reducer that bridges the two
// =============================================================

// -------------------------------------------------------------
// Agents (room cats)
// -------------------------------------------------------------
export type AgentStatus = "idle" | "busy" | "review" | "failed" | "completed";

export interface AgentState {
  status: AgentStatus;
  /** PreToolUse hook payload — current tool name (Read / Edit / Bash …). */
  currentTool?: string;
  /** assistant stream-json の reasoning 1文目 (NLP-light: "。" or 改行で切る). */
  currentReasoning?: string;
  /** "now" / "13分前" / "—" など、表示用相対時刻文字列. */
  lastSeenAt?: string;
  /** active scenario の演出: 別 agent の desk まで歩く target. */
  walkTo?: string;
}

// -------------------------------------------------------------
// Plan / TodoWrite
// -------------------------------------------------------------
export type TodoStatus = "pending" | "in_progress" | "completed";

export interface TodoItem {
  status: TodoStatus;
  text: string;
}

export type MilestoneStatus = "todo" | "doing" | "done";

export interface MilestoneChild {
  t: string;
  st: TodoStatus;
}

export interface Milestone {
  id: string;
  title: string;
  /** 0..1 progress fraction. */
  progress: number;
  /** "3/7" 形式の進捗カウンタ表示用. */
  count: string;
  status: MilestoneStatus;
  children: MilestoneChild[];
}

// -------------------------------------------------------------
// Consistency findings
// -------------------------------------------------------------
export type FindingSeverity = "high" | "medium" | "low";
export type FindingStatus = "open" | "ack" | "fixed" | "dismissed";

export interface Finding {
  id: string;
  sev: FindingSeverity;
  status: FindingStatus;
  file: string;
  lines: string;
  title: string;
  detail: string;
  suggest: string;
  source: string;
}

// -------------------------------------------------------------
// Worktrees
// -------------------------------------------------------------
export type WorktreeUse = "primary" | "parallel" | "experiment" | "hotfix";
export type WorktreeStatus = "idle" | "busy" | "review" | "failed";

export interface Worktree {
  branch: string;
  path: string;
  use: WorktreeUse;
  status: WorktreeStatus;
  parentAgent: string;
  diskMB: number;
  locked: boolean;
  createdAt: string;
  lastCommit: string;
}

// -------------------------------------------------------------
// Live stream rail
// -------------------------------------------------------------
export type StreamKind = "tool" | "reason" | "fail" | "intro";

export interface StreamMsg {
  ts: string;
  who: string;
  kind: StreamKind;
  tool?: string;
  text: string;
}

// -------------------------------------------------------------
// Gantt
// -------------------------------------------------------------
export type GanttBarKind = "busy" | "review" | "tdd" | "fail";

export interface GanttBar {
  /** 0..100 percent; 100 = nowPct anchor. */
  s: number;
  e: number;
  kind: GanttBarKind;
}

export interface GanttRow {
  worktree: string;
  agentId: string;
  label: string;
  bars: GanttBar[];
  live?: boolean;
}

export interface GanttData {
  windowLabel: string;
  nowPct: number;
  rows: GanttRow[];
}

// -------------------------------------------------------------
// Retro session (artefact replay)
// -------------------------------------------------------------
export type RetroLensId =
  | "retro-pj"
  | "retro-proc"
  | "retro-meta"
  | "retro-research"
  | "retro-counter"
  | "retro-pm"
  | "retro-agg"
  | "user";

export type RetroLensSeverity = "high" | "med" | "low";

export interface RetroLensCard {
  id: RetroLensId;
  lensName: string;
  count: number;
  sev: RetroLensSeverity[];
  isUser?: boolean;
}

export type RetroTranscriptKind =
  | "intro"
  | "report"
  | "finding"
  | "rebuttal"
  | "verdict";

export interface RetroTranscriptEntry {
  ts: number;
  who: string;
  kind: RetroTranscriptKind;
  text: string;
  refId?: string;
  sev?: RetroLensSeverity;
}

export type RetroFindingCategory = "process" | "review" | "meta";

export interface RetroFinding {
  id: string;
  sev: RetroLensSeverity;
  lens: RetroLensId;
  title: string;
  target: string;
  status: "open" | "deferred" | "accepted" | "dismissed";
  category: RetroFindingCategory;
}

export interface RetroSession {
  id: string;
  title: string;
  startedAt: string;
  durationSec: number;
  verdict: "PASS" | "FAIL";
  actionPlan: { immediate: number; milestone: number; deferred: number };
  lenses: RetroLensCard[];
  transcript: RetroTranscriptEntry[];
  findings: RetroFinding[];
}

// -------------------------------------------------------------
// Learned guidance (per-agent prompt augmentation)
// -------------------------------------------------------------
export type GuidanceCategory = "tdd" | "review" | "security" | "test" | "process";
export type GuidanceScope = "user" | "project";
export type GuidanceTtl = "permanent" | "expired" | (string & {});

export interface GuidanceItem {
  agentId: string;
  active: boolean;
  category: GuidanceCategory;
  /** Source of the guidance: "retro-2026-04-25", "finding-F-08", etc. */
  from: string;
  scope: GuidanceScope;
  text: string;
  addedAt: string;
  useCount: number;
  ttl: GuidanceTtl;
  diff?: { before: string; after: string };
}

// -------------------------------------------------------------
// Customization (per-agent model + personality preset)
// -------------------------------------------------------------
export type ModelId = "opus" | "sonnet" | "haiku";
export type PresetId = "default" | "friendly-mentor" | "strict-drill" | "detective";

export interface CustomizationLayer {
  scope: "default" | "user" | "project";
  model?: ModelId;
  preset?: PresetId;
  note?: string;
}

export interface AgentCustomization {
  effective: { model: ModelId; preset: PresetId };
  /** Override chain: default → user → project (push order). */
  chain: CustomizationLayer[];
}

// -------------------------------------------------------------
// Discipline metrics (top-bar gauges)
// -------------------------------------------------------------
export type TaskToolHealth = "ok" | "warn" | "fail";
export type Verdict = "PASS" | "FAIL" | "PENDING";

export interface DisciplineMetrics {
  /** 0..1 parallel utilization. */
  parallel: number;
  taskTool: TaskToolHealth;
  taskToolLabel: string;
  tddViolations: number;
  verdict: Verdict;
}

// -------------------------------------------------------------
// Sessions archive
// -------------------------------------------------------------
export type SessionVerdict = "PASS" | "FAIL";

export interface SessionItem {
  id: string;
  startedAt: string;
  durationSec: number;
  agentRoot: string;
  turns: number;
  verdict: SessionVerdict;
  filesTouched: string[];
  relatedFindings: string[];
  relatedRetro?: string;
  summary: string;
  /** WHY: M0.18 t5 — reviewer agent DB legacy field. Displayed via
   * projectReviewerAgent() as skill identifier. Optional: absent in older records. */
  reviewer_agent?: string;
}

// -------------------------------------------------------------
// Tokens (cost analytics)
// -------------------------------------------------------------
export interface ModelPricing {
  /** USD / MTok */
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
}

export type Pricing = Record<ModelId, ModelPricing>;

export interface TokensByAgent {
  agentId: string;
  model: ModelId;
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
}

export interface TokensDailyBar {
  day: string;
  cost: number;
  cacheRatio: number;
}

export interface TokensRollup {
  period: string;
  byAgent: TokensByAgent[];
  daily: TokensDailyBar[];
}

// -------------------------------------------------------------
// Project settings
// -------------------------------------------------------------
export interface ProjectSettings {
  daemonPort: number;
  worktreeBase: string;
  retroSchedule: { enabled: boolean; cron: string; label: string };
  consistencyScope: string[];
  hooks: { preToolUse: boolean; postToolUse: boolean; subagentStop: boolean };
  logRetention: { days: number };
  defaultReviewers: string[];
  parallelLimit: number;
}

// -------------------------------------------------------------
// PM chat (right column, Slack-style)
// -------------------------------------------------------------
export type PMRisk = "low" | "med" | "high";

export interface PMMessage {
  who: "user" | "pm";
  ts: string;
  text: string;
}

export interface PMPermissionRequest {
  id: string;
  tool: string;
  args: string;
  risk: PMRisk;
  from: string;
}

export interface PMState {
  running: boolean;
  messages: PMMessage[];
  pendingApprovals: PMPermissionRequest[];
}

// -------------------------------------------------------------
// Top-level Scenario / view state
// -------------------------------------------------------------
export type ScenarioKey = "idle" | "active" | "failed";
export type ConnectionStatus = "connected" | "disconnected";
export type ConsistencyState = "empty" | "running" | "has-findings";

export interface Scenario {
  key: ScenarioKey;
  label: string;
  /** "14:23" 形式の表示用時刻 (server-side で計算済). */
  now: string;
  conn: ConnectionStatus;
  project: string;
  branch: string;

  agents: Record<string, AgentState>;
  todos: TodoItem[];
  todosUpdatedAt: string;
  milestones: Milestone[];
  findings: Finding[];
  worktrees: Worktree[];
  stream: StreamMsg[];
  gantt: GanttData;
  retroSession: RetroSession;
  guidance: GuidanceItem[];
  customization: Record<string, AgentCustomization>;
  disciplineMetrics: DisciplineMetrics;
  consistencyState: ConsistencyState;
  sessions: SessionItem[];
  tokens: TokensRollup;
  settings: ProjectSettings;
  pricing: Pricing;
  pm: PMState;
}

// -------------------------------------------------------------
// Domain event minimal contract
// -------------------------------------------------------------
// daemon/src/events/types.ts is the SSoT for the actual zod schemas, but
// it is not yet re-exported from the daemon entry point (only Todo /
// PlanConflict / SessionChange / FindingNew / SpecChangeDetected are).
// We mirror the agent.change shape here as a structural type so the
// reducer in websocket.ts compiles against the same surface daemon emits.
// =======================================================================
export type AgentChangeBroadcastStatus =
  | "idle"
  | "busy"
  | "failed"
  | "completed";

export interface AgentChangePayload {
  agentId: string;
  status: AgentChangeBroadcastStatus;
  role?: string;
  metadata?: {
    currentTool?: string;
    currentReasoning?: string;
    lastSeenAt?: string;
    walkTo?: string;
    [k: string]: unknown;
  };
}

export interface AgentChangeBroadcast {
  type: "agent.change";
  timestamp: number;
  payload: AgentChangePayload;
}

// WHY: 8 new payload types mirror daemon/src/events/types.ts zod schemas.
// Structural type compatibility is intentional (no runtime zod parsing on
// the client — the daemon guarantees shape before emitting over WS).

export interface TodoChangePayload {
  sessionId: string;
  todos: { status: "pending" | "in_progress" | "completed"; text: string }[];
}

export interface PlanChangePayload {
  itemId: string;
  projectId: string;
  /** WHY: plan.change uses 'doing' (PLAN.md lifecycle), not 'in_progress'. */
  status: "todo" | "doing" | "done";
  title: string;
}

export interface WorktreeChangePayload {
  projectId: string;
  action: "created" | "removed" | "locked" | "unlocked";
  path: string;
  branch?: string;
}

export interface LearnedGuidanceChangePayload {
  scope: "user" | "project";
  projectId?: string;
  agentName: string;
  guidanceId: string;
  action: "toggled" | "deleted";
  active?: boolean;
}

export interface DisciplineMetricUpdatePayload {
  projectId: string;
  metric: string;
  value: number;
  timestamp: number;
}

export interface ApprovalRequestPayload {
  eventId: number;
  sessionId: string;
  toolName: string;
  metadata?: Record<string, unknown>;
}

export interface SessionChangePayload {
  sessionId: string;
  action: "started" | "ended" | "updated";
  projectId?: string;
  role?: string;
  status?: string;
}

export interface FindingNewPayload {
  findingId: string;
  severity: "low" | "medium" | "high";
  targetDoc: string;
  message: string;
}

// WHY: PM chat event payload types mirror daemon/src/events/types.ts zod schemas.
// Structural type compatibility intentional — no runtime zod parsing on client.
// M0.15 t13 REQ-074.
export interface PmMessageEventPayload {
  who: "user" | "pm";
  text: string;
  ts: string;
}

export interface PmPermissionRequestEventPayload {
  id: string;
  tool: string;
  args: string;
  risk: PMRisk;
  from: string;
}

export interface PmPermissionResolvedEventPayload {
  id: string;
  allow: boolean;
}
