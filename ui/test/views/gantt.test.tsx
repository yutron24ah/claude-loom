/**
 * GanttView basic render tests — updated for M3.1 t4 SVG rewrite.
 *
 * WHY: M3.1 t4 replaced Tailwind-div mock with pure SVG implementation.
 * This file retains the M2-era "basic render" contract tests but
 * adapts assertions to the SVG-based component:
 *   - data-testid="gantt-bar" → data-testid="gantt-bar-rect" (SVG <rect>)
 *   - div-based rows → SVG <g data-testid="gantt-row">
 *   - Requires useNavigate mock + useGanttData mock (no WS needed)
 *
 * Comprehensive SVG-specific tests live in gantt-svg.test.tsx.
 * This file keeps the M2 behavioral contract: title / bar count / row count / axis.
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Mock react-router-dom useNavigate (GanttView now uses it for bar clicks)
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock useGanttData with 6 rows having 7 bars total (same cardinality as M2 mock)
const { mockUseGanttData } = vi.hoisted(() => ({
  mockUseGanttData: vi.fn(),
}));

vi.mock('@/live/useGanttData', () => ({
  useGanttData: mockUseGanttData,
}));

import { GanttView } from '../../src/views/gantt/GanttView';

const MOCK_ROWS = [
  {
    agentId: 'pm',
    label: 'ニケ (PM)',
    bars: [{ startPct: 5, endPct: 95, label: 'PM session', barKey: 'pm-0' }],
  },
  {
    agentId: 'dev',
    label: 'サバ (Dev)',
    bars: [
      { startPct: 12, endPct: 38, label: 'auth: login spec', barKey: 'dev-0' },
      { startPct: 44, endPct: 74, label: 'auth: TDD red', barKey: 'dev-1' },
    ],
  },
  {
    agentId: 'code-rev',
    label: 'ペン (Code Rev)',
    bars: [{ startPct: 40, endPct: 56, label: 'review: PR #42', barKey: 'code-rev-0' }],
  },
  {
    agentId: 'sec-rev',
    label: 'シノビ (Sec)',
    bars: [{ startPct: 18, endPct: 34, label: 'secret scan', barKey: 'sec-rev-0' }],
  },
  {
    agentId: 'test-rev',
    label: 'メメ (Test Rev)',
    bars: [
      { startPct: 22, endPct: 48, label: 'coverage check', barKey: 'test-rev-0' },
      { startPct: 60, endPct: 80, label: 'verdict', barKey: 'test-rev-1' },
    ],
  },
  {
    agentId: 'agg',
    label: 'マル (Aggregator)',
    bars: [{ startPct: 86, endPct: 95, label: 'retro summary', barKey: 'agg-0' }],
  },
];

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mockUseGanttData.mockReturnValue({ rows: MOCK_ROWS, isLoading: false, error: null });
});

describe('GanttView — basic render', () => {
  it('renders without crashing', () => {
    const { container } = render(<GanttView />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders a title mentioning Gantt / ガント', () => {
    render(<GanttView />);
    const heading = screen.getByRole('heading', { name: /ガント|gantt|進捗/i });
    expect(heading).toBeInTheDocument();
  });
});

describe('GanttView — bar count from mock data', () => {
  it('renders at least 5 gantt bars (data-testid="gantt-bar-rect")', () => {
    const { container } = render(<GanttView />);
    // M3.1: bars are SVG <rect> with data-testid="gantt-bar-rect"
    const bars = container.querySelectorAll('[data-testid="gantt-bar-rect"]');
    expect(bars.length).toBeGreaterThanOrEqual(5);
  });

  it('renders at most 8 gantt bars', () => {
    const { container } = render(<GanttView />);
    const bars = container.querySelectorAll('[data-testid="gantt-bar-rect"]');
    expect(bars.length).toBeLessThanOrEqual(8);
  });
});

describe('GanttView — mock data bar labels', () => {
  it('shows agent row labels (data-testid="gantt-row")', () => {
    const { container } = render(<GanttView />);
    const rows = container.querySelectorAll('[data-testid="gantt-row"]');
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it('renders time axis section', () => {
    const { container } = render(<GanttView />);
    const axis = container.querySelector('[data-testid="gantt-time-axis"]');
    expect(axis).toBeInTheDocument();
  });
});
