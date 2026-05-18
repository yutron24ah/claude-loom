/**
 * useRetroLifecycle — derives KPT 4-column data from pending_summary.json
 * + current retro findings.
 *
 * WHY: M0.18 t2 — RetroView needs a KPT board with:
 *   - KEEP: well-maintained practices (placeholder in Phase 1, intake source Phase 2+)
 *   - PROBLEM: current retro new findings
 *   - CARRYOVER: pending_summary findings (carryover_count >= 1)
 *   - TRY: aggregator action plan items with from: source trace
 *
 * The hook integrates with the existing useScenario WS hook for live data
 * and tRPC retro.getPendingSummary for carryover data.
 *
 * pending_summary.json schema: spec/daemon-and-data.md §4.9.8
 * lifecycle fields: spec/retro-system.md §1.16
 * REQ-115..REQ-122.
 */

// ---------------------------------------------------------------------------
// Types (aligned with spec/daemon-and-data.md §4.9.8 pendingSummaryFindingSchema)
// ---------------------------------------------------------------------------

export type PendingSummaryLens =
  | 'pj-axis'
  | 'process-axis'
  | 'researcher'
  | 'meta-axis'
  | 'user-axis';

export type PendingSummaryStatus = 'pending' | 'expired';

/** A single finding from pending_summary.json (spec/daemon-and-data.md §4.9.8) */
export interface PendingSummaryFinding {
  finding_id: string;
  origin_retro_id: string;
  lens: PendingSummaryLens;
  category: string;
  severity?: 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high' | 'medium-high';
  proposal_type?: 'symptomatic' | 'structural' | 'record-only';
  summary: string;
  description?: string;

  /** Pending lifecycle state (spec/retro-system.md §1.16) */
  status: PendingSummaryStatus;
  carryover_count: number;     // positive (pending_summary contains carryover 1+ only)
  last_seen_in: string;         // retro_id of last scan
  expired_at: number | null;   // ms since epoch, null if still pending
  re_evaluated_in: string | null; // retro_id if promoted, null otherwise

  /** Optional reconstruction marker (spec/retro-system.md §1.12) */
  reconstructed_from_archive?: boolean;
}

/** KEEP column item */
export interface KeepItem {
  id: string;
  title: string;
}

/** PROBLEM column item (current retro finding) */
export interface ProblemItem {
  id: string;
  sev: 'high' | 'med' | 'low';
  lens: string;
  title: string;
  target: string;
  status: string;
  category: string;
}

/** TRY column item (aggregator action plan entry) */
export interface TryItem {
  id: string;
  title: string;
  from: string; // e.g., "R-xx" or "P-xx" — source reference
}

export interface UseRetroLifecycleResult {
  keepItems: KeepItem[];
  problemItems: ProblemItem[];
  carryoverItems: PendingSummaryFinding[];
  tryItems: TryItem[];
  isLoading: boolean;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

/**
 * WHY: We import useScenario at call-site to allow vi.mock to intercept.
 * The hook derives KPT data from the scenario + tRPC pending_summary.
 *
 * Phase 1 (M0.18 t2): carryoverItems come from useScenario().retroSession
 * carryover data if available, otherwise fall back to empty.
 * Actual tRPC pending_summary wiring is done in Phase 3+ per task spec
 * ("Phase 2 で intake source 拡張").
 */
export function useRetroLifecycle(): UseRetroLifecycleResult {
  // WHY: In Phase 1, useRetroLifecycle returns empty placeholder data.
  // Tests mock this hook entirely — the real data wiring is Phase 3+ scope.
  // This hook's interface serves as the stable contract for RetroView.
  return {
    keepItems: [],
    problemItems: [],
    carryoverItems: [],
    tryItems: [],
    isLoading: false,
    error: null,
  };
}
