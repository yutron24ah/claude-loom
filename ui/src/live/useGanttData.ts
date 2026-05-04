/**
 * useGanttData — data hook for GanttView SVG.
 *
 * WHY: Decouples data fetching from SVG rendering per SRP.
 * Transforms plan_items from tRPC into GanttRow[] structures
 * that GanttView renders as SVG rect/line/text elements.
 *
 * M3.1 scope: plan_items query + mock agent timeline overlay.
 * Real agent timeline wire-up is deferred to M3.2 (tracked separately).
 * Mock rows ensure Gantt has visual content while daemon data loads.
 */
import { usePlanItems } from './usePlanItems';

/** A single bar segment within a Gantt row. */
export interface GanttBar {
  /** Bar start position as percentage 0-100 relative to track width */
  startPct: number;
  /** Bar end position as percentage 0-100 relative to track width */
  endPct: number;
  /** Display label for this bar */
  label: string;
  /** Stable key for React reconciliation */
  barKey: string;
}

/** One agent/item row in the Gantt chart. */
export interface GanttRow {
  /** Agent or item identifier — used for navigate(/agent/:agentId) */
  agentId: string;
  /** Human-readable row label */
  label: string;
  /** Bars to render within this row */
  bars: GanttBar[];
}

export interface UseGanttDataResult {
  rows: GanttRow[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Mock agent timeline rows.
 * WHY: M3.1 scope uses fixed mock data for agent activity.
 * M3.2 will replace with real agent timeline subscription.
 * Position values are derived from typical session patterns.
 */
const MOCK_AGENT_ROWS: GanttRow[] = [
  {
    agentId: 'pm',
    label: 'ニケ (PM)',
    bars: [{ startPct: 5, endPct: 95, label: 'PM session', barKey: 'pm-0' }],
  },
  {
    agentId: 'dev',
    label: 'サバ (Dev)',
    bars: [
      { startPct: 12, endPct: 38, label: 'auth: TDD red', barKey: 'dev-0' },
      { startPct: 44, endPct: 74, label: 'auth: green', barKey: 'dev-1' },
    ],
  },
  {
    agentId: 'code-rev',
    label: 'ペン (Code Rev)',
    bars: [{ startPct: 40, endPct: 56, label: 'review: PR #42', barKey: 'code-rev-0' }],
  },
  {
    agentId: 'sec-rev',
    label: 'シノビ (Sec)',
    bars: [{ startPct: 18, endPct: 34, label: 'secret scan', barKey: 'sec-rev-0' }],
  },
  {
    agentId: 'test-rev',
    label: 'メメ (Test Rev)',
    bars: [
      { startPct: 22, endPct: 48, label: 'coverage check', barKey: 'test-rev-0' },
      { startPct: 60, endPct: 80, label: 'verdict', barKey: 'test-rev-1' },
    ],
  },
  {
    agentId: 'agg',
    label: 'マル (Aggregator)',
    bars: [{ startPct: 86, endPct: 95, label: 'retro summary', barKey: 'agg-0' }],
  },
];

/**
 * Transform plan_items into GanttRows showing milestone progress.
 * WHY: plan_items have no timestamp-based position yet (M3.2 concern),
 * so we distribute them evenly across the timeline for M3.1 visualization.
 */
function planItemsToRows(
  items: Array<{ id: number; title: string; status: string; parentId: number | null }>,
): GanttRow[] {
  // Only top-level items (no parent) become Gantt rows in M3.1
  const topLevel = items.filter((i) => i.parentId === null);
  if (topLevel.length === 0) return [];

  const slotWidth = 100 / topLevel.length;

  return topLevel.map((item, idx): GanttRow => {
    const startPct = idx * slotWidth + 2;
    const endPct = (idx + 1) * slotWidth - 2;
    return {
      agentId: `plan-${item.id}`,
      label: item.title,
      bars: [
        {
          startPct,
          endPct,
          label: item.status,
          barKey: `plan-${item.id}-0`,
        },
      ],
    };
  });
}

/**
 * Merge plan_items rows with mock agent timeline rows.
 * WHY: Shows both project structure (from daemon) and agent activity
 * (mock M3.1) in a single Gantt. Plan rows come first.
 */
function mergeRows(planRows: GanttRow[], agentRows: GanttRow[]): GanttRow[] {
  return [...planRows, ...agentRows];
}

/**
 * Query Gantt data from plan_items + agent mock timeline.
 */
export function useGanttData(): UseGanttDataResult {
  const { data: planItems, isLoading, error } = usePlanItems();

  if (isLoading) {
    return { rows: [], isLoading: true, error: null };
  }

  if (error) {
    return { rows: [], isLoading: false, error };
  }

  const planRows = planItemsToRows(planItems ?? []);
  const rows = mergeRows(planRows, MOCK_AGENT_ROWS);

  return { rows, isLoading: false, error: null };
}
