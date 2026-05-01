/**
 * PlanView live-query TDD tests (RED phase — written before implementation).
 *
 * WHY: Verifies that PlanView correctly handles all query states when
 * wired to live tRPC via usePlanItems hook:
 *   - loading state → shows "読み込み中…"
 *   - error state → shows "接続エラー"
 *   - empty data → shows empty state message
 *   - data → renders plan items from daemon response
 *
 * We mock usePlanItems entirely so no WS connection is needed.
 * PlanView still renders short-term todos (mock) but the right pane
 * now shows live plan items. We test the live pane behavior.
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { PlanItem } from '@claude-loom/daemon';

// WHY: vi.mock is hoisted to the top of the file, so we use vi.hoisted
// to create the mock function before the mock factory executes.
const { mockUsePlanItems } = vi.hoisted(() => ({
  mockUsePlanItems: vi.fn(),
}));

vi.mock('@/live/usePlanItems', () => ({
  usePlanItems: mockUsePlanItems,
}));

// Import after mock is set up
import { PlanView } from '../../src/views/plan/PlanView';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mockUsePlanItems.mockClear();
});

// Helper to create a minimal PlanItem
function makePlanItem(overrides: Partial<PlanItem> = {}): PlanItem {
  return {
    id: 1,
    projectId: 'claude-loom',
    source: 'file',
    sourcePath: null,
    parentId: null,
    title: 'Test milestone',
    body: null,
    status: 'todo',
    position: 0,
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('PlanView (live) — loading state', () => {
  it('shows "読み込み中…" when isLoading is true', () => {
    mockUsePlanItems.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<PlanView />);
    expect(screen.getByText('読み込み中…')).toBeInTheDocument();
  });

  it('does not show plan items while loading', () => {
    mockUsePlanItems.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { container } = render(<PlanView />);
    const planItems = container.querySelectorAll('[data-testid="plan-item"]');
    expect(planItems.length).toBe(0);
  });
});

describe('PlanView (live) — error state', () => {
  it('shows "接続エラー" when error is set', () => {
    mockUsePlanItems.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('WebSocket closed'),
    });
    render(<PlanView />);
    expect(screen.getByText('接続エラー')).toBeInTheDocument();
  });

  it('does not show plan items on error', () => {
    mockUsePlanItems.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('failed'),
    });
    const { container } = render(<PlanView />);
    const planItems = container.querySelectorAll('[data-testid="plan-item"]');
    expect(planItems.length).toBe(0);
  });
});

describe('PlanView (live) — empty state', () => {
  it('shows empty state message when data is empty array', () => {
    mockUsePlanItems.mockReturnValue({ data: [], isLoading: false, error: null });
    render(<PlanView />);
    expect(screen.getByTestId('plan-empty-state')).toBeInTheDocument();
  });
});

describe('PlanView (live) — data state', () => {
  it('renders plan items returned from daemon', () => {
    const items = [
      makePlanItem({ id: 1, title: 'M2 milestone', status: 'doing', parentId: null }),
      makePlanItem({ id: 2, title: 'Task A', status: 'todo', parentId: 1 }),
      makePlanItem({ id: 3, title: 'Task B', status: 'done', parentId: 1 }),
    ];
    mockUsePlanItems.mockReturnValue({ data: items, isLoading: false, error: null });
    const { container } = render(<PlanView />);
    const planItems = container.querySelectorAll('[data-testid="plan-item"]');
    expect(planItems.length).toBe(3);
  });

  it('renders item titles from daemon data', () => {
    const items = [makePlanItem({ title: 'ライブデータ milestone' })];
    mockUsePlanItems.mockReturnValue({ data: items, isLoading: false, error: null });
    render(<PlanView />);
    expect(screen.getByText('ライブデータ milestone')).toBeInTheDocument();
  });

  it('does not show loading or error state when data is present', () => {
    const items = [makePlanItem()];
    mockUsePlanItems.mockReturnValue({ data: items, isLoading: false, error: null });
    render(<PlanView />);
    expect(screen.queryByText('読み込み中…')).not.toBeInTheDocument();
    expect(screen.queryByText('接続エラー')).not.toBeInTheDocument();
  });

  it('marks child items (parentId != null) with level 1 attribute', () => {
    const items = [
      makePlanItem({ id: 1, parentId: null }),
      makePlanItem({ id: 2, parentId: 1 }),
    ];
    mockUsePlanItems.mockReturnValue({ data: items, isLoading: false, error: null });
    const { container } = render(<PlanView />);
    const level1 = container.querySelectorAll('[data-level="1"]');
    expect(level1.length).toBe(1);
  });
});

describe('PlanView (live) — short-term pane unchanged', () => {
  it('still renders the short-term todos pane (mock data intact)', () => {
    mockUsePlanItems.mockReturnValue({ data: [], isLoading: false, error: null });
    render(<PlanView />);
    expect(screen.getByTestId('plan-short-term')).toBeInTheDocument();
  });

  it('still renders exactly 5 mock todo items', () => {
    mockUsePlanItems.mockReturnValue({ data: [], isLoading: false, error: null });
    const { container } = render(<PlanView />);
    const todoItems = container.querySelectorAll('[data-testid="todo-item"]');
    expect(todoItems.length).toBe(5);
  });
});
