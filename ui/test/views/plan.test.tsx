/**
 * PlanView TDD tests — updated to match live-query implementation (Task 10).
 *
 * WHY: PlanView now uses usePlanItems hook for the right pane. These tests
 * mock usePlanItems to provide controlled data, isolating PlanView rendering
 * from the tRPC context requirement.
 *
 * Behavior under test:
 * 1. Component renders without crashing
 * 2. Short-term todos section is present with 5 items (mock data, unchanged)
 * 3. Long-term plan items section is present
 * 4. Plan item statuses (todo/doing/done) shown when data provided
 * 5. Section headings visible
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { PlanItem } from '@claude-loom/daemon';

// WHY: vi.hoisted ensures the mock fns are available when vi.mock factory runs
const { mockUsePlanItems, mockUseTodoWrite, mockUsePlanMutations } = vi.hoisted(() => ({
  mockUsePlanItems: vi.fn(),
  mockUseTodoWrite: vi.fn(),
  mockUsePlanMutations: vi.fn(),
}));

vi.mock('@/live/usePlanItems', () => ({
  usePlanItems: mockUsePlanItems,
}));

vi.mock('@/live/useTodoWrite', () => ({
  useTodoWrite: mockUseTodoWrite,
}));

// WHY: PlanView now calls usePlanMutations (M3.1 t2); mock to avoid tRPC context error
vi.mock('@/live/usePlanMutations', () => ({
  usePlanMutations: mockUsePlanMutations,
}));

import { PlanView } from '../../src/views/plan/PlanView';

afterEach(() => {
  cleanup();
});

/** Default mock todos (3 items) for the short-term pane in plan.test.tsx. */
const DEFAULT_MOCK_TODOS = [
  { status: 'in_progress' as const, text: 'Task A' },
  { status: 'pending' as const, text: 'Task B' },
  { status: 'completed' as const, text: 'Task C' },
];

beforeEach(() => {
  mockUsePlanItems.mockClear();
  mockUseTodoWrite.mockClear();
  mockUsePlanMutations.mockClear();
  // Default: connected, no data yet (empty plan items)
  mockUsePlanItems.mockReturnValue({ data: [], isLoading: false, error: null });
  // Default: 3 mock todos for short-term pane
  mockUseTodoWrite.mockReturnValue({ todos: DEFAULT_MOCK_TODOS, isLoading: false });
  // Default: no-op mutations (M3.1 t2 — PlanView calls usePlanMutations)
  mockUsePlanMutations.mockReturnValue({
    upsertItem: vi.fn(),
    updateItemStatus: vi.fn(),
    deleteItem: vi.fn(),
    isUpsertPending: false,
    isUpdateStatusPending: false,
  });
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

describe('PlanView — basic render', () => {
  it('renders without crashing', () => {
    const { container } = render(<PlanView />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders short-term section heading', () => {
    render(<PlanView />);
    // short-term section: TodoWrite mirror
    const section = screen.getByTestId('plan-short-term');
    expect(section).toBeInTheDocument();
  });

  it('renders long-term section heading', () => {
    render(<PlanView />);
    const section = screen.getByTestId('plan-long-term');
    expect(section).toBeInTheDocument();
  });
});

// ---- M0.11.4 t13: design structure assertions (RED first) ----
describe('PlanView — RPG design structure (M0.11.4 t13)', () => {
  it('wraps short-term pane in rpg-frame', () => {
    render(<PlanView />);
    const section = screen.getByTestId('plan-short-term');
    expect(section.classList.contains('rpg-frame')).toBe(true);
  });

  it('wraps long-term pane in rpg-frame', () => {
    render(<PlanView />);
    const section = screen.getByTestId('plan-long-term');
    expect(section.classList.contains('rpg-frame')).toBe(true);
  });

  it('renders short-term title with rpg-title class', () => {
    const { container } = render(<PlanView />);
    const shortTermSection = container.querySelector('[data-testid="plan-short-term"]');
    const title = shortTermSection?.querySelector('.rpg-title');
    expect(title).toBeInTheDocument();
  });

  it('renders long-term title with rpg-title class', () => {
    const { container } = render(<PlanView />);
    const longTermSection = container.querySelector('[data-testid="plan-long-term"]');
    const title = longTermSection?.querySelector('.rpg-title');
    expect(title).toBeInTheDocument();
  });

  it('renders "+ 追加" button with btn-px class', () => {
    const { container } = render(<PlanView />);
    const btn = container.querySelector('button.btn-px');
    expect(btn).toBeInTheDocument();
    expect(btn?.textContent).toContain('+ 追加');
  });
});

describe('PlanView — short-term todos (via useTodoWrite mock)', () => {
  it('renders todo items from useTodoWrite hook', () => {
    const { container } = render(<PlanView />);
    const items = container.querySelectorAll('[data-testid="todo-item"]');
    // DEFAULT_MOCK_TODOS has 3 items
    expect(items.length).toBe(3);
  });

  it('renders in_progress todo item', () => {
    render(<PlanView />);
    // At least one item with in_progress status indicator
    const items = screen.getAllByTestId('todo-item');
    const inProgress = items.find(el => el.querySelector('[data-status="in_progress"]'));
    expect(inProgress).toBeTruthy();
  });

  it('renders completed todo item with strikethrough styling', () => {
    render(<PlanView />);
    const items = screen.getAllByTestId('todo-item');
    const completed = items.find(el => el.querySelector('[data-status="completed"]'));
    expect(completed).toBeTruthy();
  });

  it('renders empty state when useTodoWrite returns no todos', () => {
    mockUseTodoWrite.mockReturnValue({ todos: [], isLoading: false });
    const { container } = render(<PlanView />);
    const items = container.querySelectorAll('[data-testid="todo-item"]');
    expect(items.length).toBe(0);
  });
});

describe('PlanView — long-term plan items (live data via usePlanItems mock)', () => {
  it('renders at least 1 milestone (level 0) item when data provided', () => {
    const items = [
      makePlanItem({ id: 1, parentId: null, title: 'M0.13 milestone' }),
    ];
    mockUsePlanItems.mockReturnValue({ data: items, isLoading: false, error: null });
    const { container } = render(<PlanView />);
    const milestones = container.querySelectorAll('[data-level="0"]');
    expect(milestones.length).toBeGreaterThanOrEqual(1);
  });

  it('renders child task items (level 1) when parentId is set', () => {
    const items = [
      makePlanItem({ id: 1, parentId: null }),
      makePlanItem({ id: 2, parentId: 1, title: 'child task' }),
    ];
    mockUsePlanItems.mockReturnValue({ data: items, isLoading: false, error: null });
    const { container } = render(<PlanView />);
    const tasks = container.querySelectorAll('[data-level="1"]');
    expect(tasks.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the expected number of plan items from live data', () => {
    // 9 items: 1 milestone + 8 tasks
    const items = [
      makePlanItem({ id: 1, parentId: null }),
      ...Array.from({ length: 8 }, (_, i) =>
        makePlanItem({ id: i + 2, parentId: 1, title: `task ${i + 1}` })),
    ];
    mockUsePlanItems.mockReturnValue({ data: items, isLoading: false, error: null });
    const { container } = render(<PlanView />);
    const allPlanItems = container.querySelectorAll('[data-testid="plan-item"]');
    expect(allPlanItems.length).toBe(9);
  });
});
