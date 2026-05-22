/**
 * WorktreeView branch query test (M0.19 t6 — REQ: WT-QUERY-01)
 *
 * WHY: Verify that WorktreeView reads `?branch=<name>` from the URL and
 * highlights/focuses the matching worktree row. The qa-suite case WT-QUERY-01
 * specifies: step = '/worktree?branch=feature/x', expected = 'その branch の
 * subroom がフォーカス'.
 *
 * Implementation: WorktreeView uses react-router useSearchParams() to read the
 * `branch` query param. The focused row receives `data-testid="worktree-focused"`.
 * Tests use MemoryRouter to inject the URL search param.
 */
// covers: WT-QUERY-01
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Scenario } from '@claude-loom/redesign/api/types';

afterEach(() => {
  cleanup();
});

vi.mock('../../../src/live/useWorktreeMutations', () => ({
  useWorktreeMutations: () => ({
    createWorktree: vi.fn(),
    destroyWorktree: vi.fn(),
    lockWorktree: vi.fn(),
    unlockWorktree: vi.fn(),
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
          lastCommit: 'chore: initial',
          diskMB: 500,
          createdAt: '2026-01-01',
        },
        {
          branch: 'feature/x',
          path: '/repo-wt/feature-x',
          use: 'parallel',
          status: 'busy',
          locked: false,
          parentAgent: 'dev',
          lastCommit: 'feat: add query param',
          diskMB: 300,
          createdAt: '2026-01-02',
        },
        {
          branch: 'hotfix/y',
          path: '/repo-wt/hotfix-y',
          use: 'hotfix',
          status: 'review',
          locked: false,
          parentAgent: 'rev-code',
          lastCommit: 'fix: security patch',
          diskMB: 280,
          createdAt: '2026-01-03',
        },
      ],
    } as unknown as Scenario),
}));

import { WorktreeView } from '../../../src/views/worktree/WorktreeView';

// ---------------------------------------------------------------------------
// WT-QUERY-01: branch query フォーカス
// ---------------------------------------------------------------------------
describe('WorktreeView × branch query (WT-QUERY-01)', () => {
  it('focuses the matching worktree row when ?branch= param is present', () => {
    render(
      <MemoryRouter initialEntries={['/worktree?branch=feature%2Fx']}>
        <WorktreeView />
      </MemoryRouter>,
    );
    const focused = screen.getByTestId('worktree-focused');
    expect(focused).toBeInTheDocument();
    // The focused element should contain the branch name
    expect(focused.textContent).toContain('feature/x');
  });

  it('focused row has a visual indicator class for the queried branch', () => {
    render(
      <MemoryRouter initialEntries={['/worktree?branch=feature%2Fx']}>
        <WorktreeView />
      </MemoryRouter>,
    );
    const focused = screen.getByTestId('worktree-focused');
    // Should have a focus/highlight class to indicate it is the selected branch
    expect(focused.classList.contains('wt-table__row--focused')).toBe(true);
  });

  it('does not apply focused class when no ?branch= param is present', () => {
    render(
      <MemoryRouter initialEntries={['/worktree']}>
        <WorktreeView />
      </MemoryRouter>,
    );
    const focused = screen.queryByTestId('worktree-focused');
    expect(focused).toBeNull();
  });

  it('does not apply focused class when ?branch= does not match any worktree', () => {
    render(
      <MemoryRouter initialEntries={['/worktree?branch=nonexistent%2Fbranch']}>
        <WorktreeView />
      </MemoryRouter>,
    );
    const focused = screen.queryByTestId('worktree-focused');
    expect(focused).toBeNull();
  });

  it('only one row is focused even when multiple worktrees exist', () => {
    render(
      <MemoryRouter initialEntries={['/worktree?branch=feature%2Fx']}>
        <WorktreeView />
      </MemoryRouter>,
    );
    const focused = screen.getAllByTestId('worktree-focused');
    expect(focused.length).toBe(1);
  });
});
