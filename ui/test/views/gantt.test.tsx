/**
 * GanttView basic render tests — updated for M0.15 t2 redesign port.
 *
 * WHY: M0.15 t2 replaced the useGanttData-based SVG implementation with
 * a useScenario-driven implementation (scenario.gantt). This file retains
 * "renders without crashing" and structural smoke assertions, updated to
 * the new component interface.
 *
 * Full behavioral tests live in test/views/gantt/gantt-mock-active.test.tsx.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// WHY: mock the redesign hook so tests don't spin up a WS connection.
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      gantt: {
        windowLabel: '直近 30min',
        nowPct: 80,
        rows: [
          {
            worktree: 'main',
            agentId: 'pm',
            label: 'ニケ (PM)',
            bars: [{ s: 5, e: 95, kind: 'busy' }],
            live: false,
          },
          {
            worktree: 'main',
            agentId: 'dev',
            label: 'サバ (Dev)',
            bars: [
              { s: 12, e: 38, kind: 'busy' },
              { s: 44, e: 74, kind: 'tdd' },
            ],
            live: true,
          },
          {
            worktree: 'feat/review',
            agentId: 'rev',
            label: 'ハカセ (Reviewer)',
            bars: [{ s: 40, e: 56, kind: 'review' }],
            live: false,
          },
          {
            worktree: 'feat/review',
            agentId: 'rev-sec',
            label: 'シノビ (Sec)',
            bars: [{ s: 18, e: 34, kind: 'fail' }],
            live: false,
          },
          {
            worktree: 'fix/test',
            agentId: 'rev-test',
            label: 'メメ (Test Rev)',
            bars: [
              { s: 22, e: 48, kind: 'review' },
              { s: 60, e: 80, kind: 'review' },
            ],
            live: false,
          },
          {
            worktree: 'fix/test',
            agentId: 'retro-agg',
            label: 'マル (Aggregator)',
            bars: [{ s: 86, e: 95, kind: 'busy' }],
            live: false,
          },
        ],
      },
    }) as unknown as Scenario,
}));

import { GanttView } from '../../src/views/gantt/GanttView';

afterEach(() => {
  cleanup();
});

describe('GanttView — basic render', () => {
  it('renders without crashing', () => {
    // covers: GA-MOUNT-01
    const { container } = render(<GanttView />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders a title mentioning GANTT', () => {
    render(<GanttView />);
    // redesign uses a plain div with "❖ GANTT — agent_history"
    expect(screen.getByText(/GANTT/i)).toBeInTheDocument();
  });
});

describe('GanttView — bar count from mock data', () => {
  it('renders at least 5 gantt bars (data-kind attribute)', () => {
    const { container } = render(<GanttView />);
    // M0.15 t2: bars are div elements with data-kind attribute
    const bars = container.querySelectorAll('[data-kind]');
    expect(bars.length).toBeGreaterThanOrEqual(5);
  });

  it('renders at most 8 gantt bars', () => {
    const { container } = render(<GanttView />);
    const bars = container.querySelectorAll('[data-kind]');
    expect(bars.length).toBeLessThanOrEqual(8);
  });
});

describe('GanttView — mock data row labels', () => {
  it('shows agent row containers (data-testid="gantt-row")', () => {
    const { container } = render(<GanttView />);
    const rows = container.querySelectorAll('[data-testid="gantt-row"]');
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it('renders window label chip', () => {
    render(<GanttView />);
    expect(screen.getByText('直近 30min')).toBeInTheDocument();
  });
});

describe('GanttView — redesign structure (M0.15 t2)', () => {
  it('renders zoom strip with 30m/1h/4h/all buttons', () => {
    render(<GanttView />);
    expect(screen.getByText('30m')).toBeInTheDocument();
    expect(screen.getByText('1h')).toBeInTheDocument();
    expect(screen.getByText('4h')).toBeInTheDocument();
    expect(screen.getByText('all')).toBeInTheDocument();
  });

  it('renders now-line element', () => {
    const { container } = render(<GanttView />);
    const nowLine = container.querySelector('[data-testid="gantt-now-line"]');
    expect(nowLine).toBeInTheDocument();
  });

  it('renders live cat sprite on live=true rows only', () => {
    const { container } = render(<GanttView />);
    const liveCats = container.querySelectorAll('[data-testid="gantt-live-cat"]');
    // mock has 1 live row (dev)
    expect(liveCats).toHaveLength(1);
  });
});
