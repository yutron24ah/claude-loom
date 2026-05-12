// =============================================================
// redesign/api/websocket.ts
// -------------------------------------------------------------
// Production hook that replaces redesign/scenarios.js's useScenario.
//
//   - ?mock=idle | ?mock=active | ?mock=failed  →  fixture from scenarios.js
//   - otherwise  →  live store fed by daemon WS broadcasts
//
// MVP scope (matches user instruction "agent.change WS event だけで
// 猫が動くまで"): the live reducer wires agent.change today; other event
// types (todo.change, finding.new, …) are appended one at a time as the
// rest of the screens come online.
// =============================================================
import { useSyncExternalStore } from "react";
import type {
  AgentChangeBroadcast,
  AgentChangePayload,
  AgentState,
  AgentStatus,
  ApprovalRequestPayload,
  DisciplineMetricUpdatePayload,
  FindingNewPayload,
  LearnedGuidanceChangePayload,
  Milestone,
  MilestoneStatus,
  PMMessage,
  PMPermissionRequest,
  PMRisk,
  PlanChangePayload,
  PmMessageEventPayload,
  PmPermissionRequestEventPayload,
  PmPermissionResolvedEventPayload,
  Scenario,
  ScenarioKey,
  SessionChangePayload,
  SessionItem,
  TaskToolHealth,
  TodoChangePayload,
  TodoStatus,
  Verdict,
  Worktree,
  WorktreeChangePayload,
} from "./types";
import { SCENARIOS } from "../scenarios.js";

// -------------------------------------------------------------
// Mock fallback (visual regression / dev / QA path — never delete)
// -------------------------------------------------------------
const MOCK_KEYS: ReadonlySet<ScenarioKey> = new Set<ScenarioKey>([
  "idle",
  "active",
  "failed",
]);

function readMockKey(): ScenarioKey | null {
  if (typeof window === "undefined") return null;
  const k = new URLSearchParams(window.location.search).get("mock");
  return k && MOCK_KEYS.has(k as ScenarioKey) ? (k as ScenarioKey) : null;
}

// -------------------------------------------------------------
// Live store (small pub/sub holding the latest aggregated Scenario)
// -------------------------------------------------------------
type Listener = () => void;

// WHY: client-side rule-based risk classification for approval.request events.
// The daemon cannot know risk without the client's context (e.g., cwd for
// Write path checks). Simple regex matching covers the most dangerous patterns.
const HIGH_RISK_PATTERNS = [
  /rm\s+-rf/,
  /git\s+push.*--force/,
  /DELETE\s+FROM/i,
  /DROP\s+TABLE/i,
  /curl.*\|.*sh/,
];
const MED_RISK_PATTERNS = [
  /\bsudo\b/,
  /curl\b|wget\b/,
];

function computeRisk(toolName: string, args: string): PMRisk {
  const combined = `${toolName} ${args}`;
  if (HIGH_RISK_PATTERNS.some(re => re.test(combined))) return "high";
  if (MED_RISK_PATTERNS.some(re => re.test(combined))) return "med";
  return "low";
}

function mapAgentStatus(s: string): AgentStatus {
  // daemon agent.change emits { idle | busy | failed | completed }.
  // The redesign view also recognises "review" which the dev-time stream
  // synthesises from PostToolUse hooks; we tolerate it pass-through.
  if (s === "busy" || s === "failed" || s === "completed" || s === "review") {
    return s;
  }
  return "idle";
}

class LiveScenarioStore {
  private snapshot: Scenario;
  private readonly listeners = new Set<Listener>();
  private ws: WebSocket | null = null;
  private wsTriedAt = 0;

  constructor(seed: Scenario) {
    // Seed from the idle fixture so the UI has something to render before
    // the first event arrives. We mark the connection as disconnected so
    // the top-bar status reflects reality until the WS actually opens.
    this.snapshot = { ...seed, conn: "disconnected" };
  }

  getSnapshot = (): Scenario => this.snapshot;

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };

  private emit() {
    for (const l of this.listeners) l();
  }

  applyAgentChange(payload: AgentChangePayload): void {
    const prev: AgentState = this.snapshot.agents[payload.agentId] ?? {
      status: "idle",
    };
    const meta = payload.metadata ?? {};
    const next: AgentState = {
      status: mapAgentStatus(payload.status),
      currentTool:
        typeof meta.currentTool === "string" ? meta.currentTool : prev.currentTool,
      currentReasoning:
        typeof meta.currentReasoning === "string"
          ? meta.currentReasoning
          : prev.currentReasoning,
      lastSeenAt:
        typeof meta.lastSeenAt === "string" ? meta.lastSeenAt : prev.lastSeenAt,
      walkTo: typeof meta.walkTo === "string" ? meta.walkTo : prev.walkTo,
    };
    this.snapshot = {
      ...this.snapshot,
      agents: { ...this.snapshot.agents, [payload.agentId]: next },
    };
    this.emit();
  }

  applyTodoChange(payload: TodoChangePayload): void {
    this.snapshot = {
      ...this.snapshot,
      todos: payload.todos,
      todosUpdatedAt: "now",
    };
    this.emit();
  }

  applyPlanChange(payload: PlanChangePayload): void {
    // WHY: plan.change status uses 'doing' (PLAN.md domain) while the UI
    // MilestoneStatus also uses 'doing'. Direct assignment is safe.
    const updatedMilestones = this.snapshot.milestones.map(
      (m): Milestone => {
        if (m.id === payload.itemId) {
          return { ...m, status: payload.status as MilestoneStatus };
        }
        return m;
      },
    );

    // If no milestone matched by id, append as a child to milestones[0].
    const matched = this.snapshot.milestones.some(m => m.id === payload.itemId);
    if (!matched && updatedMilestones.length > 0) {
      // Map plan status → TodoStatus for child entries
      const todoStatusMap: Record<string, TodoStatus> = {
        done: "completed",
        doing: "in_progress",
        todo: "pending",
      };
      const childStatus: TodoStatus = todoStatusMap[payload.status] ?? "pending";
      const first = updatedMilestones[0];
      updatedMilestones[0] = {
        ...first,
        children: [
          ...first.children,
          { t: payload.title, st: childStatus },
        ],
      };
    }

    this.snapshot = { ...this.snapshot, milestones: updatedMilestones };
    this.emit();
  }

  applyWorktreeChange(payload: WorktreeChangePayload): void {
    let worktrees = this.snapshot.worktrees;
    switch (payload.action) {
      case "created": {
        const newWt: Worktree = {
          path: payload.path,
          branch: payload.branch ?? "",
          use: "parallel",
          status: "idle",
          parentAgent: "dev",
          diskMB: 0,
          locked: false,
          createdAt: new Date().toISOString(),
          lastCommit: "",
        };
        worktrees = [...worktrees, newWt];
        break;
      }
      case "removed":
        worktrees = worktrees.filter(w => w.path !== payload.path);
        break;
      case "locked":
        worktrees = worktrees.map(w =>
          w.path === payload.path ? { ...w, locked: true } : w,
        );
        break;
      case "unlocked":
        worktrees = worktrees.map(w =>
          w.path === payload.path ? { ...w, locked: false } : w,
        );
        break;
    }
    this.snapshot = { ...this.snapshot, worktrees };
    this.emit();
  }

  applyLearnedGuidanceChange(payload: LearnedGuidanceChangePayload): void {
    let guidance = this.snapshot.guidance;
    if (payload.action === "toggled") {
      guidance = guidance.map(g => {
        // WHY: GuidanceItem doesn't have an id field in the current type, but
        // the reducer expects one (guidanceId-derived). We cast to check for it.
        const gWithId = g as typeof g & { id?: string };
        if (gWithId.agentId === payload.agentName && gWithId.id === payload.guidanceId) {
          return { ...g, active: payload.active ?? !g.active };
        }
        return g;
      });
    } else if (payload.action === "deleted") {
      guidance = guidance.filter(g => {
        const gWithId = g as typeof g & { id?: string };
        return !(gWithId.agentId === payload.agentName && gWithId.id === payload.guidanceId);
      });
    }
    this.snapshot = { ...this.snapshot, guidance };
    this.emit();
  }

  applyDisciplineMetricUpdate(payload: DisciplineMetricUpdatePayload): void {
    const prev = this.snapshot.disciplineMetrics;
    let next = { ...prev };
    switch (payload.metric) {
      case "parallel":
        next = { ...next, parallel: payload.value };
        break;
      case "tddViolations":
        next = { ...next, tddViolations: Math.trunc(payload.value) };
        break;
      case "verdict": {
        // WHY: numeric encoding allows daemon to emit numeric metric values
        // uniformly. 1=PASS, 0=FAIL, -1=PENDING.
        const verdictMap: Record<number, Verdict> = { 1: "PASS", 0: "FAIL", [-1]: "PENDING" };
        const v: Verdict = verdictMap[payload.value] ?? prev.verdict;
        next = { ...next, verdict: v };
        break;
      }
      case "taskTool": {
        // WHY: 1=ok/OK, 0=warn/DEGRADED, -1=fail/FAILED
        const healthMap: Record<number, { status: TaskToolHealth; label: string }> = {
          1:  { status: "ok",   label: "OK" },
          0:  { status: "warn", label: "DEGRADED" },
          [-1]: { status: "fail",  label: "FAILED" },
        };
        const h = healthMap[payload.value] ?? { status: prev.taskTool, label: prev.taskToolLabel };
        next = { ...next, taskTool: h.status, taskToolLabel: h.label };
        break;
      }
      default:
        // Unknown metric — log and leave snapshot unchanged.
        console.warn(`[LiveScenarioStore] unknown discipline metric: ${payload.metric}`);
        return;
    }
    this.snapshot = { ...this.snapshot, disciplineMetrics: next };
    this.emit();
  }

  applyApprovalRequest(payload: ApprovalRequestPayload): void {
    const args = String(payload.metadata?.args ?? "");
    const risk = computeRisk(payload.toolName, args);
    const request: PMPermissionRequest = {
      id: String(payload.eventId),
      tool: payload.toolName,
      args,
      risk,
      from: String(payload.metadata?.fromAgent ?? "unknown"),
    };
    this.snapshot = {
      ...this.snapshot,
      pm: {
        ...this.snapshot.pm,
        pendingApprovals: [...this.snapshot.pm.pendingApprovals, request],
      },
    };
    this.emit();
  }

  applySessionChange(payload: SessionChangePayload): void {
    let sessions = this.snapshot.sessions;
    switch (payload.action) {
      case "started": {
        const newSession: SessionItem = {
          id: payload.sessionId,
          startedAt: new Date().toISOString(),
          durationSec: 0,
          agentRoot: payload.role ?? "unknown",
          turns: 0,
          verdict: "PASS",
          filesTouched: [],
          relatedFindings: [],
          summary: "",
        };
        sessions = [newSession, ...sessions];
        break;
      }
      case "ended":
        sessions = sessions.map(s => {
          if (s.id !== payload.sessionId) return s;
          const verdict: SessionItem["verdict"] =
            payload.status === "failed" ? "FAIL" : "PASS";
          return { ...s, verdict };
        });
        break;
      case "updated":
        sessions = sessions.map(s => {
          if (s.id !== payload.sessionId) return s;
          return {
            ...s,
            ...(payload.role !== undefined ? { agentRoot: payload.role } : {}),
          };
        });
        break;
    }
    this.snapshot = { ...this.snapshot, sessions };
    this.emit();
  }

  // M0.15 t13 REQ-074 — PM chat reducers
  // WHY: pm.message events append to pm.messages list; immutable snapshot update
  // keeps the useSyncExternalStore pattern consistent.
  applyPmMessage(payload: PmMessageEventPayload): void {
    const msg: PMMessage = { who: payload.who, text: payload.text, ts: payload.ts };
    this.snapshot = {
      ...this.snapshot,
      pm: {
        ...this.snapshot.pm,
        messages: [...this.snapshot.pm.messages, msg],
      },
    };
    this.emit();
  }

  // WHY: pm.permission_request appends to pendingApprovals.
  // The risk field is server-provided here (unlike approval.request which
  // uses client-side computeRisk). PM chat uses server risk since the daemon
  // hook script already classified the risk at block time.
  applyPmPermissionRequest(payload: PmPermissionRequestEventPayload): void {
    const request: PMPermissionRequest = {
      id: payload.id,
      tool: payload.tool,
      args: payload.args,
      risk: payload.risk,
      from: payload.from,
    };
    this.snapshot = {
      ...this.snapshot,
      pm: {
        ...this.snapshot.pm,
        pendingApprovals: [...this.snapshot.pm.pendingApprovals, request],
      },
    };
    this.emit();
  }

  // WHY: pm.permission_resolved removes the matching entry from pendingApprovals.
  // This is the complement of applyPmPermissionRequest — user clicked allow or reject.
  applyPmPermissionResolved(payload: PmPermissionResolvedEventPayload): void {
    this.snapshot = {
      ...this.snapshot,
      pm: {
        ...this.snapshot.pm,
        pendingApprovals: this.snapshot.pm.pendingApprovals.filter(
          (a) => a.id !== payload.id,
        ),
      },
    };
    this.emit();
  }

  applyFindingNew(payload: FindingNewPayload): void {
    const newFinding = {
      id: payload.findingId,
      sev: payload.severity,
      status: "open" as const,
      file: payload.targetDoc,
      lines: "",
      title: payload.message,
      detail: "",
      suggest: "",
      source: "ws.live (now)",
    };
    const severityOrder = { high: 0, medium: 1, low: 2 };
    const findings = [...this.snapshot.findings, newFinding].sort(
      (a, b) => severityOrder[a.sev] - severityOrder[b.sev],
    );
    this.snapshot = { ...this.snapshot, findings };
    this.emit();
  }

  connect(url: string): void {
    if (typeof window === "undefined") return;
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) return;

    // Prevent reconnection storms during dev — back off if we just tried.
    const now = Date.now();
    if (now - this.wsTriedAt < 1000) return;
    this.wsTriedAt = now;

    const ws = new WebSocket(url);
    ws.addEventListener("open", () => {
      this.snapshot = { ...this.snapshot, conn: "connected" };
      this.emit();
    });
    ws.addEventListener("close", () => {
      this.snapshot = { ...this.snapshot, conn: "disconnected" };
      this.emit();
    });
    ws.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as { type?: string; payload?: unknown };
        if (!msg.type || !msg.payload) return;
        switch (msg.type) {
          case "agent.change":
            this.applyAgentChange(msg.payload as AgentChangePayload);
            break;
          case "todo.change":
            this.applyTodoChange(msg.payload as TodoChangePayload);
            break;
          case "plan.change":
            this.applyPlanChange(msg.payload as PlanChangePayload);
            break;
          case "worktree.change":
            this.applyWorktreeChange(msg.payload as WorktreeChangePayload);
            break;
          case "learned_guidance.change":
            this.applyLearnedGuidanceChange(msg.payload as LearnedGuidanceChangePayload);
            break;
          case "discipline_metric.update":
            this.applyDisciplineMetricUpdate(msg.payload as DisciplineMetricUpdatePayload);
            break;
          case "approval.request":
            this.applyApprovalRequest(msg.payload as ApprovalRequestPayload);
            break;
          case "session.change":
            this.applySessionChange(msg.payload as SessionChangePayload);
            break;
          case "finding.new":
            this.applyFindingNew(msg.payload as FindingNewPayload);
            break;
          case "pm.message":
            this.applyPmMessage(msg.payload as PmMessageEventPayload);
            break;
          case "pm.permission_request":
            this.applyPmPermissionRequest(msg.payload as PmPermissionRequestEventPayload);
            break;
          case "pm.permission_resolved":
            this.applyPmPermissionResolved(msg.payload as PmPermissionResolvedEventPayload);
            break;
          default:
            // Ignore unknown event types gracefully.
            break;
        }
      } catch {
        // Malformed frames must never break the mock fallback path.
      }
    });
    this.ws = ws;
  }
}

let liveStore: LiveScenarioStore | null = null;

function getLiveStore(): LiveScenarioStore {
  if (!liveStore) {
    liveStore = new LiveScenarioStore(SCENARIOS.idle);
    // Auto-connect to the daemon broadcaster. The daemon serves WS at
    // 127.0.0.1:5757; in dev the Vite proxy forwards /trpc, but the
    // generic broadcast channel is its own path which lands here later.
    if (typeof window !== "undefined") {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host || "127.0.0.1:5757";
      // Endpoint placeholder — will be confirmed against daemon
      // broadcaster (events/broadcaster.ts) when the next event type is wired.
      liveStore.connect(`${proto}//${host}/events`);
    }
  }
  return liveStore;
}

// -------------------------------------------------------------
// Public API
// -------------------------------------------------------------
export function useScenario(): Scenario {
  const live = getLiveStore();
  const snapshot = useSyncExternalStore(
    live.subscribe,
    live.getSnapshot,
    live.getSnapshot,
  );
  const mockKey = readMockKey();
  if (mockKey) {
    return SCENARIOS[mockKey];
  }
  return snapshot;
}

export function useScenarioMockKey(): ScenarioKey | null {
  return readMockKey();
}

export function getScenarioStore(): LiveScenarioStore {
  return getLiveStore();
}

export const SCENARIO_KEYS: readonly ScenarioKey[] = [
  "idle",
  "active",
  "failed",
];

// WHY: export for test-only usage. Tests instantiate LiveScenarioStore
// directly to verify reducer logic without a real WebSocket connection.
// This is not a public API surface — consumers should use useScenario().
export { LiveScenarioStore };
