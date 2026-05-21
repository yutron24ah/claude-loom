/**
 * WorktreeView TDD tests — updated for M0.15 t4 redesign port
 *
 * WHY: M0.15 t4 replaced hardcoded MOCK_WORKTREES with useScenario() data.
 * This file retains the M0.11.4 behavioral contract tests but adapts them
 * to the new redesign-driven WorktreeView:
 *   - WorktreeView now requires useScenario() mock (no more hardcoded fixture)
 *   - worktree-status-active / worktree-status-locked are still present (backward compat)
 *   - worktree-item is now per-row (same as before)
 *
 * Mock provides the same 4-worktree fixture structure to keep the
 * "3-5 worktree items" assertion valid.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

afterEach(() => {
  cleanup();
});

// WHY: Mock useWorktreeMutations so tests don't need a tRPC provider (M0.15 t16).
vi.mock('../../src/live/useWorktreeMutations', () => ({
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

// ---------------------------------------------------------------------------
// Mock useScenario with 4 worktrees (mirrors old MOCK_WORKTREES cardinality)
// Uses same fixture as original: main + feat/m0.13 + exp/retro-ui-redesign (locked) + hotfix/secret-scan
// ---------------------------------------------------------------------------
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      worktrees: [
        {
          branch: 'main',
          path: '~/work/loom',
          use: 'parallel',
          status: 'busy',
          parentAgent: 'pm',
          diskMB: 612,
          locked: false,
          createdAt: '2026-03-10',
          lastCommit: 'feat: add discipline header',
        },
        {
          branch: 'feat/m0.13-discipline',
          path: '~/wt/m0.13',
          use: 'parallel',
          status: 'busy',
          parentAgent: 'rev-code',
          diskMB: 480,
          locked: false,
          createdAt: '2026-04-28',
          lastCommit: 'test: coverage check',
        },
        {
          branch: 'exp/retro-ui-redesign',
          path: '~/wt/retro-redesign',
          use: 'experiment',
          status: 'idle',
          parentAgent: 'rev-code',
          diskMB: 502,
          locked: true,
          createdAt: '2026-04-26',
          lastCommit: 'wip: retro UI',
        },
        {
          branch: 'hotfix/secret-scan',
          path: '~/wt/hotfix-sec',
          use: 'hotfix',
          status: 'idle',
          parentAgent: 'rev-sec',
          diskMB: 489,
          locked: false,
          createdAt: '2026-04-29',
          lastCommit: 'fix: prefix match',
        },
      ],
    } as unknown as Scenario),
}));

import { WorktreeView } from '../../src/views/worktree/WorktreeView';

describe('WorktreeView — basic render', () => {
  it('renders the worktree section heading', () => {
    // covers: WT-MOUNT-01
    render(<WorktreeView />);
    expect(screen.getByTestId('worktree-view')).toBeInTheDocument();
  });

  it('renders the section title mentioning Worktree', () => {
    render(<WorktreeView />);
    expect(screen.getByTestId('worktree-title')).toBeInTheDocument();
  });
});

describe('WorktreeView — mock data worktree count', () => {
  it('renders 3-5 worktree items (data-testid=worktree-item)', () => {
    render(<WorktreeView />);
    const items = screen.getAllByTestId('worktree-item');
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.length).toBeLessThanOrEqual(5);
  });

  it('renders branch names for each worktree', () => {
    render(<WorktreeView />);
    const branches = screen.getAllByTestId('worktree-branch');
    expect(branches.length).toBeGreaterThanOrEqual(3);
  });
});

describe('WorktreeView — status display', () => {
  it('renders at least one active worktree status badge', () => {
    render(<WorktreeView />);
    const activeBadges = screen.getAllByTestId('worktree-status-active');
    expect(activeBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders at least one locked worktree status badge', () => {
    render(<WorktreeView />);
    const lockedBadges = screen.getAllByTestId('worktree-status-locked');
    expect(lockedBadges.length).toBeGreaterThanOrEqual(1);
  });
});

// WHY: M0.17 R3 Phase E redesign port replaced rpg-frame/rpg-title root with wt-screen/wt-header__title
// per redesign/screens/worktree.jsx which uses position:absolute/inset:0 full-bleed screen pattern.
describe('WorktreeView — RPG design tokens (M0.11.4 t15)', () => {
  it('wraps outer container in wt-screen class (redesign port: replaces rpg-frame)', () => {
    render(<WorktreeView />);
    const frame = document.querySelector('.wt-screen');
    expect(frame).toBeTruthy();
  });

  it('renders worktree title with wt-header__title class (redesign port: replaces rpg-title)', () => {
    render(<WorktreeView />);
    const title = document.querySelector('.wt-header__title');
    expect(title).toBeTruthy();
  });

  it('renders chip elements for agent/status display', () => {
    render(<WorktreeView />);
    const chips = document.querySelectorAll('.chip');
    expect(chips.length).toBeGreaterThanOrEqual(1);
  });
});
