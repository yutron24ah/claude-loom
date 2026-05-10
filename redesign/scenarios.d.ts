// =============================================================
// redesign/scenarios.d.ts
// -------------------------------------------------------------
// TypeScript ambient types for the sibling scenarios.js (which is plain
// JS so the prototype HTML can <script src="scenarios.js"> it directly).
//
// The IIFE inside scenarios.js attaches to window.* for the prototype,
// AND we appended top-level ESM exports so production code can do
//
//   import { SCENARIOS } from "../scenarios.js";
//
// This .d.ts file describes the shape of those ESM exports.
// =============================================================
import type { Scenario, ScenarioKey } from "./api/types";

export const SCENARIOS: Record<ScenarioKey, Scenario>;

export interface ScenarioStoreLike {
  readonly SCENARIOS: Record<ScenarioKey, Scenario>;
  get(): ScenarioKey;
  set(k: ScenarioKey): void;
  sub(fn: () => void): () => void;
}

export const ScenarioStore: ScenarioStoreLike;

// The hooks below only function inside the prototype HTML (they read
// window.React). Production code should use the hooks in api/websocket.ts.
export const useScenario: () => Scenario;
export const useScenarioKey: () => [ScenarioKey, (k: ScenarioKey) => void];
export const ScenarioPicker: (props: { style?: React.CSSProperties }) => unknown;

export const STATUS_COLOR: Record<string, string>;
export const PRESETS: ReadonlyArray<{ id: string; emoji: string; name: string; desc: string }>;
export const MODELS: ReadonlyArray<{ id: string; color: string }>;
export const PRICING: import("./api/types").Pricing;
export const costOf: (
  t: { input: number; output: number; cacheWrite: number; cacheRead: number },
  modelId: string,
) => number;
export const indexRoster: () => Record<string, unknown>;
