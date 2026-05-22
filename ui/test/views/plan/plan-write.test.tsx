/**
 * PlanView × write API hookup (REQ-077, M0.15 t16)
 *
 * WHY: Verifies that the "+ milestone" button in PlanView's edit tab
 * calls usePlanMutations.upsertItem(). Previously the button was noop.
 *
 * Mock strategy: mock useScenario and usePlanMutations at module boundary.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

const upsertFn = vi.fn();
const updateStatusFn = vi.fn();
const deleteFn = vi.fn();

// WHY: Mock the plan mutations hook to verify wiring without real daemon.
vi.mock('../../../src/live/usePlanMutations', () => ({
  usePlanMutations: () => ({
    upsertItem: upsertFn,
    updateItemStatus: updateStatusFn,
    deleteItem: deleteFn,
    isUpsertPending: false,
    isUpdateStatusPending: false,
  }),
}));

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      milestones: [
        {
          id: 'M0.15',
          title: 'Redesign UI',
          progress: 0.7,
          count: '14/20',
          status: 'doing' as const,
          children: [
            { t: 'task 1', st: 'completed' as const },
            { t: 'task 2', st: 'in_progress' as const },
          ],
        },
      ],
      todos: [],
      todosUpdatedAt: null,
    }) as unknown as Scenario,
}));

import { PlanView } from '../../../src/views/plan/PlanView';

afterEach(() => {
  cleanup();
  upsertFn.mockClear();
  updateStatusFn.mockClear();
  deleteFn.mockClear();
});

describe('PlanView × write API', () => {
  it('clicking + milestone button calls upsertItem', () => {
    // covers: PL-NEW-01
    render(<PlanView />);
    const addBtn = screen.getByRole('button', { name: /\+ milestone/i });
    fireEvent.click(addBtn);
    expect(upsertFn).toHaveBeenCalledTimes(1);
    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.any(String), status: 'pending' }),
    );
  });

  it('edit tab shows edit buttons for each milestone', () => {
    render(<PlanView />);
    // Switch to edit tab
    const editTabBtn = screen.getByRole('button', { name: '編集' });
    fireEvent.click(editTabBtn);
    const editBtns = screen.getAllByRole('button', { name: 'edit' });
    expect(editBtns.length).toBeGreaterThanOrEqual(1);
  });
});
