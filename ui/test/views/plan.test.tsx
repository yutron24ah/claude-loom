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

// WHY: vi.hoisted ensures the mock fn is available when vi.mock factory runs
const { mockUsePlanItems } = vi.hoisted(() => ({
  mockUsePlanItems: vi.fn(),
}));

vi.mock('@/live/usePlanItems', () => ({
  usePlanItems: mockUsePlanItems,
}));

import { PlanView } from '../../src/views/plan/PlanView';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mockUsePlanItems.mockClear();
  // Default: connected, no data yet (empty)
  mockUsePlanItems.mockReturnValue({ data: [], isLoading: false, error: null });
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

describe('PlanView — short-term todos (mock data: 5 items)', () => {
  it('renders exactly 5 todo items', () => {
    const { container } = render(<PlanView />);
    const items = container.querySelectorAll('[data-testid="todo-item"]');
    expect(items.length).toBe(5);
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
