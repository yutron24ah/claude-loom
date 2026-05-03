/**
 * TDD tests for useGanttData hook (RED phase — written before GREEN).
 *
 * WHY: planItemsToRows() and mergeRows() are the core behavior of M3.1 t4:
 * they transform plan_items → GanttRow[] and merge plan/agent rows.
 * gantt-svg.test.tsx fully mocks useGanttData, so these functions would
 * have zero coverage without a dedicated unit test.
 *
 * Behaviors under test:
 * 1. planItemsToRows with 0 items returns []
 * 2. planItemsToRows distributes items evenly (startPct/endPct math correct)
 * 3. useGanttData when planItems has items → plan rows come before mock agent rows
 * 4. useGanttData isLoading passthrough
 * 5. useGanttData error passthrough
 *
 * We mock usePlanItems so no tRPC/WS connection is needed.
 * Mock pattern follows ui/test/live/use-plan-items.test.ts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock @/live/usePlanItems — provides plan_items data to useGanttData.
// WHY: vi.hoisted ensures mock fn is created before vi.mock factory runs.
// ---------------------------------------------------------------------------
const { mockUsePlanItems } = vi.hoisted(() => ({
  mockUsePlanItems: vi.fn().mockReturnValue({ data: [], isLoading: false, error: null }),
}));

vi.mock('@/live/usePlanItems', () => ({
  usePlanItems: mockUsePlanItems,
}));

// Import after mock is set up
import { useGanttData } from '@/live/useGanttData';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal plan_item shape that planItemsToRows expects */
function makePlanItem(
  id: number,
  title: string,
  status: string = 'todo',
  parentId: number | null = null,
) {
  return { id, title, status, parentId };
}

// ---------------------------------------------------------------------------
// 1. planItemsToRows with 0 items
// ---------------------------------------------------------------------------
describe('useGanttData — planItemsToRows with 0 items', () => {
  beforeEach(() => {
    mockUsePlanItems.mockClear();
  });

  it('returns [] when no planItems are provided', () => {
    mockUsePlanItems.mockReturnValue({ data: [], isLoading: false, error: null });
    const { result } = renderHook(() => useGanttData());
    // With no plan items, plan rows are empty; only MOCK_AGENT_ROWS remain
    // We verify no plan- prefixed rows appear
    const planRows = result.current.rows.filter((r) => r.agentId.startsWith('plan-'));
    expect(planRows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. planItemsToRows distributes items evenly (startPct/endPct math)
// ---------------------------------------------------------------------------
describe('useGanttData — planItemsToRows even distribution', () => {
  beforeEach(() => {
    mockUsePlanItems.mockClear();
  });

  it('distributes 2 top-level items evenly: first item startPct < 50, second startPct >= 50', () => {
    mockUsePlanItems.mockReturnValue({
      data: [
        makePlanItem(1, 'M1 milestone', 'done', null),
        makePlanItem(2, 'M2 milestone', 'doing', null),
      ],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useGanttData());
    const planRows = result.current.rows.filter((r) => r.agentId.startsWith('plan-'));
    expect(planRows).toHaveLength(2);

    // Each plan row has exactly one bar
    const [firstBar] = planRows[0].bars;
    const [secondBar] = planRows[1].bars;

    // slot width = 100/2 = 50; first startPct = 0*50+2 = 2, endPct = 1*50-2 = 48
    expect(firstBar.startPct).toBe(2);
    expect(firstBar.endPct).toBe(48);

    // second startPct = 1*50+2 = 52, endPct = 2*50-2 = 98
    expect(secondBar.startPct).toBe(52);
    expect(secondBar.endPct).toBe(98);
  });

  it('child items (parentId != null) are excluded from top-level rows', () => {
    mockUsePlanItems.mockReturnValue({
      data: [
        makePlanItem(1, 'M1 milestone', 'done', null),
        makePlanItem(2, 'sub-task', 'todo', 1), // child — should be excluded
      ],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useGanttData());
    const planRows = result.current.rows.filter((r) => r.agentId.startsWith('plan-'));
    // Only 1 top-level item
    expect(planRows).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 3. useGanttData merges plan rows before mock agent rows
// ---------------------------------------------------------------------------
describe('useGanttData — plan rows come before agent rows', () => {
  beforeEach(() => {
    mockUsePlanItems.mockClear();
  });

  it('plan rows appear before MOCK_AGENT_ROWS in merged result', () => {
    mockUsePlanItems.mockReturnValue({
      data: [makePlanItem(10, 'Sprint A', 'doing', null)],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useGanttData());
    const rows = result.current.rows;

    // Plan row must be first
    expect(rows[0].agentId).toBe('plan-10');
    // Mock agent rows follow (first mock agent is 'pm')
    const pmIdx = rows.findIndex((r) => r.agentId === 'pm');
    expect(pmIdx).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 4. isLoading passthrough
// ---------------------------------------------------------------------------
describe('useGanttData — isLoading passthrough', () => {
  beforeEach(() => {
    mockUsePlanItems.mockClear();
  });

  it('returns isLoading: true and empty rows when usePlanItems is loading', () => {
    mockUsePlanItems.mockReturnValue({ data: undefined, isLoading: true, error: null });

    const { result } = renderHook(() => useGanttData());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.rows).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. error passthrough
// ---------------------------------------------------------------------------
describe('useGanttData — error passthrough', () => {
  beforeEach(() => {
    mockUsePlanItems.mockClear();
  });

  it('returns the error from usePlanItems when it errors', () => {
    const testError = new Error('tRPC connection failed');
    mockUsePlanItems.mockReturnValue({ data: undefined, isLoading: false, error: testError });

    const { result } = renderHook(() => useGanttData());
    expect(result.current.error).toBe(testError);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.rows).toHaveLength(0);
  });
});
