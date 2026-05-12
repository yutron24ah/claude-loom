/**
 * PlanView scenario-state TDD tests — updated for redesign port (M0.15 t3).
 *
 * WHY rewrite: The original tests covered usePlanItems live-query states
 * (loading / error / empty). The M0.15 redesign port replaces those hooks with
 * useScenario(); the concept of "loading from tRPC" no longer applies to PlanView.
 *
 * These tests now exercise scenario-driven display states:
 * - empty scenario (no milestones, no todos)
 * - single milestone with children
 * - multiple milestones, progress bar widths
 * - tab switching (active vs done archive)
 * - todos panel structure
 *
 * WHY: Test behavior, not implementation — we assert on visible DOM output,
 * not internal hook invocations (Principle 8).
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// WHY: Mock usePlanMutations so tests don't need a tRPC provider (M0.15 t16).
vi.mock('../../src/live/usePlanMutations', () => ({
  usePlanMutations: () => ({
    upsertItem: vi.fn(),
    updateItemStatus: vi.fn(),
    deleteItem: vi.fn(),
    isUpsertPending: false,
    isUpdateStatusPending: false,
  }),
}));

const { mockUseScenario } = vi.hoisted(() => ({
  mockUseScenario: vi.fn(),
}));

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: mockUseScenario,
}));

import { PlanView } from '../../src/views/plan/PlanView';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mockUseScenario.mockReset();
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
describe('PlanView (scenario) — empty state', () => {
  it('renders with no milestones and no todos', () => {
    mockUseScenario.mockReturnValue({
      todos: [],
      todosUpdatedAt: '—',
      milestones: [],
    } as unknown as Scenario);
    const { container } = render(<PlanView />);
    expect(container.querySelectorAll('[data-testid="plan-milestone"]').length).toBe(0);
    expect(container.querySelectorAll('[data-testid="todo-item"]').length).toBe(0);
  });

  it('shows empty milestone message when no active milestones', () => {
    mockUseScenario.mockReturnValue({
      todos: [],
      todosUpdatedAt: '—',
      milestones: [],
    } as unknown as Scenario);
    render(<PlanView />);
    expect(screen.getByText('active な milestone はありません')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Milestone data display
// ---------------------------------------------------------------------------
describe('PlanView (scenario) — milestone display', () => {
  it('renders plan milestones from scenario data', () => {
    mockUseScenario.mockReturnValue({
      todos: [],
      todosUpdatedAt: '—',
      milestones: [
        { id: 'M2', title: 'M2 milestone', progress: 0.5, count: '3/6', status: 'doing', children: [] },
        { id: 'M3', title: 'M3 todo', progress: 0, count: '0/4', status: 'todo', children: [] },
      ],
    } as unknown as Scenario);
    const { container } = render(<PlanView />);
    const milestones = container.querySelectorAll('[data-testid="plan-milestone"]');
    expect(milestones.length).toBe(2);
  });

  it('renders milestone titles from scenario data', () => {
    mockUseScenario.mockReturnValue({
      todos: [],
      todosUpdatedAt: '—',
      milestones: [
        { id: 'M1', title: 'ライブデータ milestone', progress: 0.3, count: '1/3', status: 'doing', children: [] },
      ],
    } as unknown as Scenario);
    render(<PlanView />);
    expect(screen.getByText('ライブデータ milestone')).toBeInTheDocument();
  });

  it('renders progress bar for each milestone', () => {
    mockUseScenario.mockReturnValue({
      todos: [],
      todosUpdatedAt: '—',
      milestones: [
        { id: 'M1', title: 'A', progress: 0.75, count: '3/4', status: 'doing', children: [] },
      ],
    } as unknown as Scenario);
    const { container } = render(<PlanView />);
    const bars = container.querySelectorAll('[data-testid="milestone-progress-bar"]');
    expect(bars.length).toBe(1);
  });

  it('renders progress fill width reflecting progress fraction', () => {
    mockUseScenario.mockReturnValue({
      todos: [],
      todosUpdatedAt: '—',
      milestones: [
        { id: 'M1', title: 'A', progress: 0.75, count: '3/4', status: 'doing', children: [] },
      ],
    } as unknown as Scenario);
    const { container } = render(<PlanView />);
    const fill = container.querySelector('[data-testid="milestone-progress-fill"]') as HTMLElement;
    expect(fill).toBeInTheDocument();
    expect(fill.style.width).toBe('75%');
  });

  it('does not render milestone loading or error UI (no live query)', () => {
    mockUseScenario.mockReturnValue({
      todos: [],
      todosUpdatedAt: '—',
      milestones: [],
    } as unknown as Scenario);
    render(<PlanView />);
    // WHY: M0.15 redesign port removes tRPC-based loading/error states from PlanView
    expect(screen.queryByText('読み込み中…')).not.toBeInTheDocument();
    expect(screen.queryByText('接続エラー')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Done archive tab
// ---------------------------------------------------------------------------
describe('PlanView (scenario) — done archive tab', () => {
  it('shows done archive milestones when done tab selected', () => {
    mockUseScenario.mockReturnValue({
      todos: [],
      todosUpdatedAt: '—',
      milestones: [
        { id: 'M-done', title: '完了 milestone', progress: 1.0, count: '4/4', status: 'done', children: [] },
        { id: 'M-active', title: 'Active milestone', progress: 0.5, count: '2/4', status: 'doing', children: [] },
      ],
    } as unknown as Scenario);
    const { container } = render(<PlanView />);
    // Click '完了 archive' tab
    fireEvent.click(screen.getByText('完了 archive'));
    const milestones = container.querySelectorAll('[data-testid="plan-milestone"]');
    // Only the done milestone (progress >= 1) should show
    expect(milestones.length).toBe(1);
    expect(screen.getByText('完了 milestone')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Todos panel
// ---------------------------------------------------------------------------
describe('PlanView (scenario) — short-term pane via useScenario', () => {
  it('renders the short-term todos pane', () => {
    mockUseScenario.mockReturnValue({
      todos: [],
      todosUpdatedAt: '—',
      milestones: [],
    } as unknown as Scenario);
    render(<PlanView />);
    expect(screen.getByTestId('plan-short-term')).toBeInTheDocument();
  });

  it('renders todo items from scenario.todos', () => {
    mockUseScenario.mockReturnValue({
      todos: [
        { status: 'in_progress', text: 'Task A' },
        { status: 'pending', text: 'Task B' },
      ],
      todosUpdatedAt: 'now',
      milestones: [],
    } as unknown as Scenario);
    const { container } = render(<PlanView />);
    const todoItems = container.querySelectorAll('[data-testid="todo-item"]');
    expect(todoItems.length).toBe(2);
  });

  it('renders no todo items when scenario.todos is empty', () => {
    mockUseScenario.mockReturnValue({
      todos: [],
      todosUpdatedAt: '—',
      milestones: [],
    } as unknown as Scenario);
    const { container } = render(<PlanView />);
    const todoItems = container.querySelectorAll('[data-testid="todo-item"]');
    expect(todoItems.length).toBe(0);
  });

  it('does NOT show hardcoded session label "session: pm-2026-05-01-am"', () => {
    // WHY: regression guard — hardcoded mock labels must never appear.
    mockUseScenario.mockReturnValue({
      todos: [],
      todosUpdatedAt: '—',
      milestones: [],
    } as unknown as Scenario);
    render(<PlanView />);
    expect(screen.queryByText('session: pm-2026-05-01-am')).not.toBeInTheDocument();
  });
});
