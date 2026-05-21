/**
 * WorktreeView × write API hookup (REQ-077, M0.15 t16)
 *
 * WHY: Verifies that the lock/unlock and destroy buttons in WorktreeView
 * call the correct useWorktreeMutations functions. Previously these buttons
 * were disabled (write hookup deferred to Phase 5 t16).
 *
 * Mock strategy: mock useScenario and useWorktreeMutations at module boundary.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

const lockFn = vi.fn();
const unlockFn = vi.fn();
const destroyFn = vi.fn();
const createFn = vi.fn();

// WHY: Mock mutation hook to verify wiring without real daemon.
vi.mock('../../../src/live/useWorktreeMutations', () => ({
  useWorktreeMutations: () => ({
    createWorktree: createFn,
    destroyWorktree: destroyFn,
    lockWorktree: lockFn,
    unlockWorktree: unlockFn,
    isCreatePending: false,
    isDestroyPending: false,
    isLockPending: false,
    isUnlockPending: false,
  }),
}));

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      worktrees: [
        {
          branch: 'main',
          path: '/repo',
          use: 'primary',
          status: 'idle',
          locked: false,
          parentAgent: 'pm',
          lastCommit: 'abc1234 initial',
          diskMB: 120,
        },
        {
          branch: 'feat/t16',
          path: '/repo-worktrees/feat-t16',
          use: 'parallel',
          status: 'busy',
          locked: true,
          parentAgent: 'dev',
          lastCommit: 'def5678 wip',
          diskMB: 95,
        },
      ],
    }) as unknown as Scenario,
}));

import { WorktreeView } from '../../../src/views/worktree/WorktreeView';

afterEach(() => {
  cleanup();
  lockFn.mockClear();
  unlockFn.mockClear();
  destroyFn.mockClear();
  createFn.mockClear();
});

describe('WorktreeView × write API', () => {
  it('lock button on unlocked worktree calls lockWorktree', () => {
    // covers: WT-CREATE-01
    render(<WorktreeView />);
    // "main" branch row is unlocked → lock button shown
    // Find button with title="lock" in the main row
    const lockBtns = screen.getAllByTitle('lock');
    expect(lockBtns.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(lockBtns[0]);
    expect(lockFn).toHaveBeenCalledTimes(1);
    expect(lockFn).toHaveBeenCalledWith(expect.objectContaining({ branch: 'main' }));
  });

  it('unlock button on locked worktree calls unlockWorktree', () => {
    render(<WorktreeView />);
    const unlockBtns = screen.getAllByTitle('unlock');
    expect(unlockBtns.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(unlockBtns[0]);
    expect(unlockFn).toHaveBeenCalledTimes(1);
    expect(unlockFn).toHaveBeenCalledWith(expect.objectContaining({ branch: 'feat/t16' }));
  });

  it('destroy button calls destroyWorktree with branch path', () => {
    // covers: WT-DELETE-01
    render(<WorktreeView />);
    const destroyBtns = screen.getAllByTitle('destroy');
    // Destroy first worktree (main)
    fireEvent.click(destroyBtns[0]);
    expect(destroyFn).toHaveBeenCalledTimes(1);
    expect(destroyFn).toHaveBeenCalledWith(expect.objectContaining({ path: '/repo' }));
  });
});
