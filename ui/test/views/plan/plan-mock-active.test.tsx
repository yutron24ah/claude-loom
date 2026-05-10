/**
 * PlanView × scenario.active — redesign port smoke tests (M0.15 t3)
 *
 * WHY: The existing plan.test.tsx mocks usePlanItems / useTodoWrite / usePlanMutations
 * (the old live hooks). This suite mocks useScenario (the new redesign hook) to verify
 * the redesign-driven PlanView renders todos, milestones, children, and timestamp
 * from the scenario data shape.
 *
 * These tests cover REQ-063 acceptance criteria.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// WHY: Mock useScenario so the component never touches the real WS store.
// The mock fixture mirrors the `active` scenario shape from scenarios.js.
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      todos: [
        { status: 'completed', text: 'M0.13 §3.6 ガント仕様確定' },
        { status: 'in_progress', text: 'TodoWrite mirror UI 結線' },
        { status: 'pending', text: 'consistency JSON tail watcher' },
        { status: 'pending', text: 'freee OAuth callback の error path 確認' },
      ],
      todosUpdatedAt: 'now',
      milestones: [
        {
          id: 'M0.13',
          title: 'Process Discipline',
          progress: 0.62,
          count: '4/7',
          status: 'doing',
          children: [
            { t: 'discipline metrics 4種を header に表示', st: 'completed' },
            { t: 'TDD 順序 violation 検出 hook', st: 'in_progress' },
            { t: 'retro 統合(履歴 drill-down)', st: 'pending' },
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
    }) as unknown as Scenario,
}));

import { PlanView } from '../../../src/views/plan/PlanView';

afterEach(() => {
  cleanup();
});

describe('PlanView × scenario.active', () => {
  it('renders all 4 todos with status icons', () => {
    render(<PlanView />);
    const items = screen.getAllByTestId('todo-item');
    expect(items).toHaveLength(4);

    // Each todo renders its status glyph via data-status attribute on the span
    const completedGlyphs = items.filter((el) =>
      el.querySelector('[data-status="completed"]'),
    );
    expect(completedGlyphs).toHaveLength(1);

    const inProgressGlyphs = items.filter((el) =>
      el.querySelector('[data-status="in_progress"]'),
    );
    expect(inProgressGlyphs).toHaveLength(1);

    const pendingGlyphs = items.filter((el) =>
      el.querySelector('[data-status="pending"]'),
    );
    expect(pendingGlyphs).toHaveLength(2);
  });

  it('renders 2 milestones with progress bars', () => {
    render(<PlanView />);
    const milestones = screen.getAllByTestId('plan-milestone');
    expect(milestones).toHaveLength(2);

    // M0.13 progress bar at 62%
    const progressBars = screen.getAllByTestId('milestone-progress-bar');
    expect(progressBars).toHaveLength(2);

    // First milestone has non-zero progress fill
    const firstFill = milestones[0].querySelector('[data-testid="milestone-progress-fill"]');
    expect(firstFill).toBeInTheDocument();
    const width = (firstFill as HTMLElement).style.width;
    // 62% → "62%" width style
    expect(width).toBe('62%');
  });

  it('renders milestone children (nested)', () => {
    render(<PlanView />);
    // M0.13 has 3 children, M0.14 has 0
    const children = screen.getAllByTestId('milestone-child');
    expect(children).toHaveLength(3);

    // First child is completed (strikethrough)
    const firstChild = children[0];
    expect(firstChild).toHaveTextContent('discipline metrics 4種を header に表示');
    const firstGlyph = firstChild.querySelector('[data-status="completed"]');
    expect(firstGlyph).toBeInTheDocument();
  });

  it('renders todosUpdatedAt timestamp', () => {
    render(<PlanView />);
    // The "updated: now" text should appear somewhere in the todos panel
    expect(screen.getByTestId('todos-updated-at')).toBeInTheDocument();
    expect(screen.getByTestId('todos-updated-at')).toHaveTextContent('now');
  });
});
