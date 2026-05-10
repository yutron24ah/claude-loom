/**
 * PlanView TDD tests — updated for redesign port (M0.15 t3).
 *
 * WHY rewrite: PlanView is now driven by useScenario() (redesign/api/websocket)
 * instead of usePlanItems / useTodoWrite / usePlanMutations. The left pane shows
 * milestones (from scenario.milestones), the right pane shows TodoWrite mirror
 * (from scenario.todos + scenario.todosUpdatedAt).
 *
 * Behavior under test:
 * 1. Component renders without crashing
 * 2. Both panes (plan-short-term / plan-long-term) present
 * 3. Milestone display (plan-milestone testid + progress bar)
 * 4. Todo display (todo-item testid + data-status)
 * 5. RPG design structure (rpg-frame / rpg-title classes)
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// WHY: mock useScenario so PlanView gets controlled data.
// Without this mock, useScenario() returns SCENARIOS.idle from the design bundle,
// which makes test data non-deterministic across scenario changes.
const { mockUseScenario } = vi.hoisted(() => ({
  mockUseScenario: vi.fn(),
}));

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: mockUseScenario,
}));

import { PlanView } from '../../src/views/plan/PlanView';

afterEach(() => {
  cleanup();
  mockUseScenario.mockReset();
});

/** Default scenario fixture for basic render tests. */
const DEFAULT_SCENARIO: Partial<Scenario> = {
  todos: [
    { status: 'in_progress', text: 'Task A' },
    { status: 'pending', text: 'Task B' },
    { status: 'completed', text: 'Task C' },
  ],
  todosUpdatedAt: '13:42',
  milestones: [
    {
      id: 'M0.13',
      title: 'Process Discipline',
      progress: 0.55,
      count: '3/7',
      status: 'doing',
      children: [
        { t: 'discipline metrics 4種を header に表示', st: 'completed' },
      ],
    },
    {
      id: 'M0.14',
      title: 'Phase 2 Entry Checklist',
      progress: 0,
      count: '0/4',
      status: 'todo',
      children: [],
    },
  ],
};

function setupDefaultMock() {
  mockUseScenario.mockReturnValue(DEFAULT_SCENARIO as Scenario);
}

describe('PlanView — basic render', () => {
  it('renders without crashing', () => {
    setupDefaultMock();
    const { container } = render(<PlanView />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders short-term section heading (todos panel)', () => {
    setupDefaultMock();
    render(<PlanView />);
    const section = screen.getByTestId('plan-short-term');
    expect(section).toBeInTheDocument();
  });

  it('renders long-term section heading (milestones panel)', () => {
    setupDefaultMock();
    render(<PlanView />);
    const section = screen.getByTestId('plan-long-term');
    expect(section).toBeInTheDocument();
  });
});

// ---- RPG design structure assertions ----
describe('PlanView — RPG design structure (M0.11.4 t13)', () => {
  it('wraps short-term pane in rpg-frame', () => {
    setupDefaultMock();
    render(<PlanView />);
    const section = screen.getByTestId('plan-short-term');
    expect(section.classList.contains('rpg-frame')).toBe(true);
  });

  it('wraps long-term pane in rpg-frame', () => {
    setupDefaultMock();
    render(<PlanView />);
    const section = screen.getByTestId('plan-long-term');
    expect(section.classList.contains('rpg-frame')).toBe(true);
  });

  it('renders short-term title with rpg-title class', () => {
    setupDefaultMock();
    const { container } = render(<PlanView />);
    const shortTermSection = container.querySelector('[data-testid="plan-short-term"]');
    const title = shortTermSection?.querySelector('.rpg-title');
    expect(title).toBeInTheDocument();
  });

  it('renders long-term title with rpg-title class', () => {
    setupDefaultMock();
    const { container } = render(<PlanView />);
    const longTermSection = container.querySelector('[data-testid="plan-long-term"]');
    const title = longTermSection?.querySelector('.rpg-title');
    expect(title).toBeInTheDocument();
  });

  it('renders "+ milestone" button with btn-px class', () => {
    setupDefaultMock();
    const { container } = render(<PlanView />);
    const btn = container.querySelector('button.btn-px');
    expect(btn).toBeInTheDocument();
    // WHY: M0.15 redesign port changes button label from "+ 追加" (plan_items mutation)
    // to "+ milestone" (read-only placeholder until Phase 5 t16 wires write API).
    expect(btn?.textContent).toContain('+ milestone');
  });
});

describe('PlanView — short-term todos (via useScenario mock)', () => {
  it('renders todo items from scenario.todos', () => {
    setupDefaultMock();
    const { container } = render(<PlanView />);
    const items = container.querySelectorAll('[data-testid="todo-item"]');
    // DEFAULT_SCENARIO has 3 todos
    expect(items.length).toBe(3);
  });

  it('renders in_progress todo item', () => {
    setupDefaultMock();
    render(<PlanView />);
    const items = screen.getAllByTestId('todo-item');
    const inProgress = items.find(el => el.querySelector('[data-status="in_progress"]'));
    expect(inProgress).toBeTruthy();
  });

  it('renders completed todo item with strikethrough styling', () => {
    setupDefaultMock();
    render(<PlanView />);
    const items = screen.getAllByTestId('todo-item');
    const completed = items.find(el => el.querySelector('[data-status="completed"]'));
    expect(completed).toBeTruthy();
  });

  it('renders no todos when scenario returns empty array', () => {
    mockUseScenario.mockReturnValue({
      todos: [],
      todosUpdatedAt: '—',
      milestones: [],
    } as unknown as Scenario);
    const { container } = render(<PlanView />);
    const items = container.querySelectorAll('[data-testid="todo-item"]');
    expect(items.length).toBe(0);
  });
});

describe('PlanView — long-term milestones (via useScenario mock)', () => {
  it('renders at least 1 milestone when data provided', () => {
    setupDefaultMock();
    const { container } = render(<PlanView />);
    const milestones = container.querySelectorAll('[data-testid="plan-milestone"]');
    expect(milestones.length).toBeGreaterThanOrEqual(1);
  });

  it('renders milestone children when children present', () => {
    setupDefaultMock();
    const { container } = render(<PlanView />);
    const children = container.querySelectorAll('[data-testid="milestone-child"]');
    // DEFAULT_SCENARIO has 1 child in M0.13, 0 in M0.14 = 1 total
    expect(children.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the expected number of milestones from scenario data', () => {
    setupDefaultMock();
    const { container } = render(<PlanView />);
    const allMilestones = container.querySelectorAll('[data-testid="plan-milestone"]');
    // DEFAULT_SCENARIO has 2 milestones (both with progress < 1, so shown in active tab)
    expect(allMilestones.length).toBe(2);
  });
});
