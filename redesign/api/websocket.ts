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
  Scenario,
  ScenarioKey,
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
        const msg = JSON.parse(String(ev.data)) as Partial<AgentChangeBroadcast> & {
          type?: string;
        };
        if (msg.type === "agent.change" && msg.payload) {
          this.applyAgentChange(msg.payload as AgentChangePayload);
        }
        // todo.change / plan.change / finding.new / worktree.change /
        // approval.request / pm.message wiring lands as each screen
        // graduates from "★ 動く確信:高" stub to live data.
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
