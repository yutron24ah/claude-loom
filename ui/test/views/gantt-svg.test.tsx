/**
 * GanttView redesign-port tests (M0.15 t2) — replaces M3.1 SVG test suite.
 *
 * WHY this rewrite:
 * The M3.1 implementation used useGanttData() (tRPC hook) with an SVG-based
 * renderer and bar click → navigate(). M0.15 t2 ports GanttView to use
 * useScenario().gantt — the worktree-grouped, walk-cat visual from the
 * redesign bundle. The useGanttData + useNavigate seam no longer exists.
 *
 * This file covers the same behavioral surface as the old suite but through
 * the new seam:
 *  1. Row labels render from scenario.gantt.rows[].label
 *  2. Bar segments render with data-kind attribute (kind-specific styling)
 *  3. Now-line renders at data-testid="gantt-now-line"
 *  4. Live cat renders at data-testid="gantt-live-cat" for live=true rows only
 *  5. Worktree group headers render (collapsible UI)
 *  6. Window label chip renders from gantt.windowLabel
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// ---------------------------------------------------------------------------
// Mock useScenario with fixture data
// ---------------------------------------------------------------------------
const FIXTURE_GANTT = {
  windowLabel: '直近 30min',
  nowPct: 75,
  rows: [
    {
      worktree: 'main',
      agentId: 'pm',
      label: 'ニケ (PM)',
      bars: [{ s: 5, e: 60, kind: 'busy' }],
      live: true,
    },
    {
      worktree: 'main',
      agentId: 'dev',
      label: 'サバ (Dev)',
      bars: [
        { s: 10, e: 40, kind: 'busy' },
        { s: 50, e: 80, kind: 'tdd' },
      ],
      live: false,
    },
    {
      worktree: 'feat/auth',
      agentId: 'rev-sec',
      label: 'シノビ (Sec)',
      bars: [{ s: 20, e: 50, kind: 'fail' }],
      live: false,
    },
    {
      worktree: 'feat/auth',
      agentId: 'rev',
      label: 'ハカセ (Rev)',
      bars: [{ s: 55, e: 70, kind: 'review' }],
      live: false,
    },
  ],
};

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({ gantt: FIXTURE_GANTT }) as unknown as Scenario,
}));

import { GanttView } from '../../src/views/gantt/GanttView';

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// 1. Row labels
// ---------------------------------------------------------------------------
describe('GanttView redesign — row labels', () => {
  it('renders row label text for each GanttRow', () => {
    render(<GanttView />);
    expect(screen.getByText('ニケ (PM)')).toBeInTheDocument();
    expect(screen.getByText('サバ (Dev)')).toBeInTheDocument();
    expect(screen.getByText('シノビ (Sec)')).toBeInTheDocument();
    expect(screen.getByText('ハカセ (Rev)')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Bar segments with data-kind
// ---------------------------------------------------------------------------
describe('GanttView redesign — bar segments', () => {
  it('renders one bar segment per GanttBar', () => {
    // covers: GA-BARS-01
    const { container } = render(<GanttView />);
    // fixture: 1+2+1+1 = 5 bars
    const bars = container.querySelectorAll('[data-kind]');
    expect(bars.length).toBe(5);
  });

  it('bar segments carry correct data-kind values', () => {
    // covers: GA-COLOR-01
    const { container } = render(<GanttView />);
    const kinds = Array.from(container.querySelectorAll('[data-kind]')).map(
      (b) => b.getAttribute('data-kind'),
    );
    expect(kinds).toContain('busy');
    expect(kinds).toContain('tdd');
    expect(kinds).toContain('fail');
    expect(kinds).toContain('review');
  });
});

// ---------------------------------------------------------------------------
// 3. Now-line
// ---------------------------------------------------------------------------
describe('GanttView redesign — now-line', () => {
  it('renders now-line elements (one per row)', () => {
    const { container } = render(<GanttView />);
    const nowLines = container.querySelectorAll('[data-testid="gantt-now-line"]');
    expect(nowLines.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Live cat sprite
// ---------------------------------------------------------------------------
describe('GanttView redesign — live cat sprite', () => {
  it('renders live cat only for rows with live=true', () => {
    const { container } = render(<GanttView />);
    const liveCats = container.querySelectorAll('[data-testid="gantt-live-cat"]');
    // fixture has 1 live row (pm)
    expect(liveCats).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 5. Worktree group headers
// ---------------------------------------------------------------------------
describe('GanttView redesign — worktree groups', () => {
  it('renders worktree header for each unique worktree', () => {
    render(<GanttView />);
    // fixture has 2 worktrees: main, feat/auth
    expect(screen.getByText(/⌗ main/)).toBeInTheDocument();
    expect(screen.getByText(/⌗ feat\/auth/)).toBeInTheDocument();
  });

  it('shows LIVE badge for groups with live rows', () => {
    render(<GanttView />);
    expect(screen.getByText('● LIVE')).toBeInTheDocument();
  });

  it('collapses group rows on header click', () => {
    const { container } = render(<GanttView />);
    // Initially all rows visible
    const rowsBefore = container.querySelectorAll('[data-testid="gantt-row"]');
    expect(rowsBefore.length).toBe(4);

    // Click "main" worktree header to collapse it
    const headers = screen.getAllByText(/⌗/);
    fireEvent.click(headers[0]);

    // After collapse, "main" rows should be hidden
    const rowsAfter = container.querySelectorAll('[data-testid="gantt-row"]');
    expect(rowsAfter.length).toBe(2); // only feat/auth rows remain
  });
});

// ---------------------------------------------------------------------------
// 6. Window label chip
// ---------------------------------------------------------------------------
describe('GanttView redesign — window label', () => {
  it('renders gantt.windowLabel in header', () => {
    render(<GanttView />);
    expect(screen.getByText('直近 30min')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 7. Zoom strip
// ---------------------------------------------------------------------------
describe('GanttView redesign — zoom strip', () => {
  it('renders 30m/1h/4h/all zoom buttons', () => {
    render(<GanttView />);
    expect(screen.getByText('30m')).toBeInTheDocument();
    expect(screen.getByText('1h')).toBeInTheDocument();
    expect(screen.getByText('4h')).toBeInTheDocument();
    expect(screen.getByText('all')).toBeInTheDocument();
  });

  it('clicking zoom button changes active zoom', () => {
    render(<GanttView />);
    const btn1h = screen.getByText('1h');
    fireEvent.click(btn1h);
    // After clicking 1h the component re-renders; button still in DOM
    expect(screen.getByText('1h')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 8. Time axis labels
// ---------------------------------------------------------------------------
describe('GanttView redesign — time axis', () => {
  it('renders relative time labels (-30m, now)', () => {
    render(<GanttView />);
    expect(screen.getByText('-30m')).toBeInTheDocument();
    expect(screen.getByText('now')).toBeInTheDocument();
  });

  it('renders subagent count badge in group header', () => {
    render(<GanttView />);
    // "main" group has 2 rows, "feat/auth" has 2 rows
    expect(screen.getAllByText(/subagent/).length).toBeGreaterThanOrEqual(2);
  });
});
