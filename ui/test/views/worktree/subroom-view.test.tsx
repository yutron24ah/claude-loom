/**
 * SubroomView TDD tests — M0.11.4 t9 + M0.15 t4 redesign port update
 *
 * WHY: M0.15 t4 replaced hardcoded SESSIONS fixture with useScenario() data.
 * This file retains the M0.11.4 behavioral contract tests but adapts them
 * to mock useScenario() — the structural sections (NOW / ACTIVITY / THIS BRANCH
 * / PARENT) remain to ensure the same visual contract is upheld.
 *
 * Design source: /tmp/claude-room-handoff/claude-room/project/subroom.jsx (179 lines)
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Mock useScenario with worktrees containing feat/oauth and fix/test-flake
// WHY: SubroomView now derives session data from scenario.worktrees[]
// ---------------------------------------------------------------------------
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      worktrees: [
        {
          branch: 'feat/oauth',
          path: '~/wt/feat-oauth',
          use: 'parallel',
          status: 'busy',
          parentAgent: 'dev',
          diskMB: 480,
          locked: false,
          createdAt: '2026-04-28',
          lastCommit: 'test: add duplicate email rejection',
        },
        {
          branch: 'fix/test-flake',
          path: '~/wt/fix-flake',
          use: 'parallel',
          status: 'review',
          parentAgent: 'rev-test',
          diskMB: 470,
          locked: false,
          createdAt: '2026-04-29',
          lastCommit: 'wip: investigate flaky test',
        },
      ],
    } as unknown as Scenario),
}));

import { SubroomView } from '../../../src/views/worktree/SubroomView';
import { ROSTER } from '../../../src/data/roster';

const devCat = ROSTER.find((r) => r.id === 'dev')!;
const pmCat = ROSTER.find((r) => r.id === 'pm')!;

// ---------------------------------------------------------------------------
// Basic render
// ---------------------------------------------------------------------------
describe('SubroomView — basic render', () => {
  it('renders without throwing given required props', () => {
    expect(() =>
      render(<SubroomView branch="feat/oauth" parentCat={devCat} />)
    ).not.toThrow();
  });

  it('renders the .rpg-frame wrapper', () => {
    const { container } = render(<SubroomView branch="feat/oauth" parentCat={devCat} />);
    expect(container.querySelector('.rpg-frame')).not.toBeNull();
  });

  it('shows @{branch} in the header', () => {
    const { container } = render(<SubroomView branch="feat/oauth" parentCat={devCat} />);
    expect(container.textContent).toContain('@feat/oauth');
  });
});

// ---------------------------------------------------------------------------
// Header strip — branch + status
// ---------------------------------------------------------------------------
describe('SubroomView — header strip', () => {
  it('shows SUBROOM label in header', () => {
    const { container } = render(<SubroomView branch="feat/oauth" parentCat={devCat} />);
    expect(container.textContent).toContain('SUBROOM');
  });

  it('shows status text in header (default busy)', () => {
    const { container } = render(<SubroomView branch="feat/oauth" parentCat={devCat} />);
    expect(container.textContent?.toLowerCase()).toContain('busy');
  });

  it('shows review status when status=review', () => {
    const { container } = render(
      <SubroomView branch="feat/oauth" parentCat={devCat} status="review" />
    );
    expect(container.textContent?.toLowerCase()).toContain('review');
  });

  it('shows idle status when status=idle', () => {
    const { container } = render(
      <SubroomView branch="fix/test-flake" parentCat={devCat} status="idle" />
    );
    expect(container.textContent?.toLowerCase()).toContain('idle');
  });
});

// ---------------------------------------------------------------------------
// NOW section — current task (from lastCommit via scenario.worktrees)
// ---------------------------------------------------------------------------
describe('SubroomView — NOW current task', () => {
  it('contains a NOW section marker', () => {
    const { container } = render(<SubroomView branch="feat/oauth" parentCat={devCat} />);
    expect(container.textContent).toContain('NOW');
  });

  it('shows TDD label in task area', () => {
    const { container } = render(<SubroomView branch="feat/oauth" parentCat={devCat} />);
    expect(container.textContent).toContain('TDD');
  });
});

// ---------------------------------------------------------------------------
// ACTIVITY section
// ---------------------------------------------------------------------------
describe('SubroomView — ACTIVITY log', () => {
  it('contains an ACTIVITY section marker', () => {
    const { container } = render(<SubroomView branch="feat/oauth" parentCat={devCat} />);
    expect(container.textContent).toContain('ACTIVITY');
  });
});

// ---------------------------------------------------------------------------
// Mini gantt
// ---------------------------------------------------------------------------
describe('SubroomView — mini gantt', () => {
  it('contains a THIS BRANCH gantt section', () => {
    const { container } = render(<SubroomView branch="feat/oauth" parentCat={devCat} />);
    expect(container.textContent).toContain('THIS BRANCH');
  });
});

// ---------------------------------------------------------------------------
// PARENT meta panel
// ---------------------------------------------------------------------------
describe('SubroomView — PARENT meta', () => {
  it('shows PARENT label', () => {
    const { container } = render(<SubroomView branch="feat/oauth" parentCat={devCat} />);
    expect(container.textContent).toContain('PARENT');
  });

  it('shows parentCat name in meta panel', () => {
    const { container } = render(<SubroomView branch="feat/oauth" parentCat={devCat} />);
    expect(container.textContent).toContain(devCat.name);
  });

  it('shows different parentCat name when provided', () => {
    const { container } = render(<SubroomView branch="feat/oauth" parentCat={pmCat} />);
    expect(container.textContent).toContain(pmCat.name);
  });

  it('shows worktree path footer', () => {
    const { container } = render(<SubroomView branch="feat/oauth" parentCat={devCat} />);
    expect(container.textContent).toContain('worktree path');
  });
});

// ---------------------------------------------------------------------------
// Unknown branch fallback (scenario has no matching worktree)
// ---------------------------------------------------------------------------
describe('SubroomView — unknown branch fallback', () => {
  it('renders gracefully for unknown branch', () => {
    expect(() =>
      render(<SubroomView branch="unknown/branch" parentCat={devCat} />)
    ).not.toThrow();
  });

  it('shows @{branch} even for unknown branch', () => {
    const { container } = render(<SubroomView branch="unknown/branch" parentCat={devCat} />);
    expect(container.textContent).toContain('@unknown/branch');
  });
});

// ---------------------------------------------------------------------------
// Width prop
// ---------------------------------------------------------------------------
describe('SubroomView — width prop', () => {
  it('applies custom width to the container', () => {
    const { container } = render(
      <SubroomView branch="feat/oauth" parentCat={devCat} width={500} />
    );
    const frame = container.querySelector('.rpg-frame') as HTMLElement;
    expect(frame?.style.width).toBe('500px');
  });

  it('defaults to 720px width', () => {
    const { container } = render(<SubroomView branch="feat/oauth" parentCat={devCat} />);
    const frame = container.querySelector('.rpg-frame') as HTMLElement;
    expect(frame?.style.width).toBe('720px');
  });
});
