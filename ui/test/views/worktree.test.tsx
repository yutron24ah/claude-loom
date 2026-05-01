/**
 * WorktreeView TDD tests — Red phase (Task 9 Subagent C)
 * WHY: verify worktree list renders with status indicators and branch names.
 * SCREEN_REQUIREMENTS §3.9 / §4.8
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { WorktreeView } from '../../src/views/worktree/WorktreeView';

afterEach(() => {
  cleanup();
});

describe('WorktreeView — basic render', () => {
  it('renders the worktree section heading', () => {
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
