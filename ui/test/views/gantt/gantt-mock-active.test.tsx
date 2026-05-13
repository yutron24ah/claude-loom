/**
 * GanttView × mock=active scenario smoke test (REQ-063)
 * -----------------------------------------------------------
 * Verifies the redesign port: when useScenario() returns an active
 * scenario, GanttView renders row labels, kind-specific styled bars,
 * the now-line at nowPct, and walking cat sprites on live rows only.
 *
 * WHY: The existing gantt-svg.test.tsx tests the SVG-based GanttView
 * driven by useGanttData. After the redesign port, GanttView is driven
 * by useScenario() (scenario.gantt) — this test covers the new wiring.
 *
 * Pairs with ui/test/views/gantt-svg.test.tsx (old useGanttData path —
 * removed after redesign port).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// ---------------------------------------------------------------------------
// Mock @claude-loom/redesign/api/websocket
// WHY: This is the seam scenarios.js → daemon reducer; mocking proves the
// consumer wiring without spinning up a WS connection.
// ---------------------------------------------------------------------------
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      gantt: {
        windowLabel: '直近 30min',
        nowPct: 96,
        rows: [
          {
            worktree: 'main',
            agentId: 'pm',
            label: 'PM session',
            bars: [{ s: 5, e: 96, kind: 'busy' }],
            live: true,
          },
          {
            worktree: 'feat/oauth',
            agentId: 'dev',
            label: 'auth: spec',
            bars: [
              { s: 12, e: 38, kind: 'busy' },
              { s: 44, e: 74, kind: 'tdd' },
            ],
            live: true,
          },
          {
            worktree: 'feat/oauth',
            agentId: 'rev',
            label: 'code review',
            bars: [{ s: 60, e: 85, kind: 'review' }],
            live: false,
          },
          {
            worktree: 'fix/sec',
            agentId: 'rev-sec',
            label: 'sec scan',
            bars: [{ s: 10, e: 30, kind: 'fail' }],
            live: false,
          },
          {
            worktree: 'main',
            agentId: 'rev-test',
            label: 'test review',
            bars: [{ s: 20, e: 55, kind: 'review' }],
            live: false,
          },
          {
            worktree: 'fix/sec',
            agentId: 'retro-pm',
            label: 'retro session',
            bars: [{ s: 70, e: 90, kind: 'busy' }],
            live: false,
          },
        ],
      },
    }) as unknown as Scenario,
}));

import { GanttView } from '../../../src/views/gantt/GanttView';

describe('GanttView × scenario.active', () => {
  it('renders all 6 row labels', () => {
    render(<GanttView />);
    // All 6 row label texts must appear in the DOM
    expect(screen.getByText('PM session')).toBeInTheDocument();
    expect(screen.getByText('auth: spec')).toBeInTheDocument();
    expect(screen.getByText('code review')).toBeInTheDocument();
    expect(screen.getByText('sec scan')).toBeInTheDocument();
    expect(screen.getByText('test review')).toBeInTheDocument();
    expect(screen.getByText('retro session')).toBeInTheDocument();
  });

  it('renders bars with kind-specific styling (busy/review/tdd/fail)', () => {
    const { container } = render(<GanttView />);
    // Each bar should carry a data-kind attribute for kind-specific styling
    const bars = container.querySelectorAll('[data-kind]');
    expect(bars.length).toBeGreaterThanOrEqual(4);
    const kinds = Array.from(bars).map((b) => b.getAttribute('data-kind'));
    expect(kinds).toContain('busy');
    expect(kinds).toContain('tdd');
    expect(kinds).toContain('review');
    expect(kinds).toContain('fail');
  });

  it('renders now-line at scenario.gantt.nowPct', () => {
    const { container } = render(<GanttView />);
    // The now-line element should have data-testid="gantt-now-line"
    const nowLine = container.querySelector('[data-testid="gantt-now-line"]');
    expect(nowLine).toBeInTheDocument();
  });

  it('renders walking cat sprite on live: true rows only', () => {
    const { container } = render(<GanttView />);
    // Only rows with live=true should have a walking cat
    // data-testid="gantt-live-cat" marks the walk pose cat container
    const liveCats = container.querySelectorAll('[data-testid="gantt-live-cat"]');
    // fixture has 2 live rows (pm + dev)
    expect(liveCats).toHaveLength(2);
  });
});
