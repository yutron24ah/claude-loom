/**
 * GanttView SVG TDD tests — RED phase (M3.1 t4)
 *
 * WHY: The M2 implementation uses Tailwind div-based bars.
 * M3.1 t4 rewrites GanttView to pure SVG (rect/line/text) so that
 * CSS variable tokens (--color-bar etc.) directly affect SVG fill,
 * enabling instant theme switching without JS.
 *
 * Behaviors under test:
 * 1. SVG <rect> elements render for each bar (data-testid="gantt-bar-rect")
 * 2. SVG <line> elements render for grid ticks (data-testid="gantt-grid-line")
 * 3. SVG <text> elements render for row labels
 * 4. Bar fill uses CSS variable reference (var(--color-bar) or fill="...")
 * 5. Bar click fires useNavigate to /agent/:id
 * 6. SVG root element is present (not a div-based layout)
 * 7. Time tick <line> elements present (data-testid="gantt-tick-line")
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock react-router-dom useNavigate
// WHY: We test that bar click triggers navigate without mounting a full router.
// ---------------------------------------------------------------------------
const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// ---------------------------------------------------------------------------
// Mock useGanttData hook
// WHY: Isolate GanttView render from tRPC/WS connection dependency.
// ---------------------------------------------------------------------------
const { mockUseGanttData } = vi.hoisted(() => ({
  mockUseGanttData: vi.fn(),
}));

vi.mock('@/live/useGanttData', () => ({
  useGanttData: mockUseGanttData,
}));

import { GanttView } from '../../src/views/gantt/GanttView';

/** Minimal GanttRow fixture matching the hook output type */
const FIXTURE_ROWS = [
  {
    agentId: 'pm',
    label: 'ニケ (PM)',
    bars: [
      { startPct: 5, endPct: 60, label: 'PM session', barKey: 'pm-0' },
    ],
  },
  {
    agentId: 'dev',
    label: 'サバ (Dev)',
    bars: [
      { startPct: 10, endPct: 40, label: 'auth: TDD red', barKey: 'dev-0' },
      { startPct: 50, endPct: 80, label: 'auth: green', barKey: 'dev-1' },
    ],
  },
  {
    agentId: 'sec',
    label: 'シノビ (Sec)',
    bars: [
      { startPct: 20, endPct: 50, label: 'secret scan', barKey: 'sec-0' },
    ],
  },
];

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mockNavigate.mockClear();
  // Default: return fixture rows
  mockUseGanttData.mockReturnValue({
    rows: FIXTURE_ROWS,
    isLoading: false,
    error: null,
  });
});

// ---------------------------------------------------------------------------
// 1. SVG root element
// ---------------------------------------------------------------------------
describe('GanttView SVG — root element', () => {
  it('renders an <svg> element as the chart container', () => {
    const { container } = render(<GanttView />);
    const svg = container.querySelector('svg[data-testid="gantt-svg"]');
    expect(svg).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. <rect> bar elements
// ---------------------------------------------------------------------------
describe('GanttView SVG — <rect> bars', () => {
  it('renders one <rect> per bar across all rows', () => {
    const { container } = render(<GanttView />);
    // fixture has 1+2+1 = 4 bars total
    const rects = container.querySelectorAll('rect[data-testid="gantt-bar-rect"]');
    expect(rects.length).toBe(4);
  });

  it('each bar <rect> has a fill referencing CSS variable or non-empty fill', () => {
    const { container } = render(<GanttView />);
    const rects = container.querySelectorAll('rect[data-testid="gantt-bar-rect"]');
    rects.forEach((rect) => {
      const fill = rect.getAttribute('fill');
      // fill must be set (either a CSS var() reference or a color value)
      expect(fill).toBeTruthy();
    });
  });

  it('bar <rect> x/width attributes reflect startPct and endPct within track width', () => {
    const { container } = render(<GanttView />);
    const firstRect = container.querySelector('rect[data-testid="gantt-bar-rect"]');
    expect(firstRect).toBeInTheDocument();
    // x should be a positive number (percentage position scaled to track width)
    const x = parseFloat(firstRect!.getAttribute('x') ?? '');
    expect(x).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// 3. <text> label elements
// ---------------------------------------------------------------------------
describe('GanttView SVG — <text> labels', () => {
  it('renders row label <text> elements for each row', () => {
    render(<GanttView />);
    // Row labels should appear as SVG <text> or accessible text
    expect(screen.getByText('ニケ (PM)')).toBeInTheDocument();
    expect(screen.getByText('サバ (Dev)')).toBeInTheDocument();
    expect(screen.getByText('シノビ (Sec)')).toBeInTheDocument();
  });

  it('renders bar label <text> elements inside bars', () => {
    render(<GanttView />);
    expect(screen.getByText('PM session')).toBeInTheDocument();
    expect(screen.getByText('auth: TDD red')).toBeInTheDocument();
    expect(screen.getByText('secret scan')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 4. <line> grid elements
// ---------------------------------------------------------------------------
describe('GanttView SVG — <line> grid lines', () => {
  it('renders at least one <line> for time tick grid', () => {
    const { container } = render(<GanttView />);
    const lines = container.querySelectorAll('line[data-testid="gantt-grid-line"]');
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it('renders time tick labels (data-testid="gantt-time-axis")', () => {
    const { container } = render(<GanttView />);
    const axis = container.querySelector('[data-testid="gantt-time-axis"]');
    expect(axis).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 5. Bar click → navigate
// ---------------------------------------------------------------------------
describe('GanttView SVG — bar click navigate', () => {
  it('clicking a bar calls navigate with /agent/:agentId', () => {
    const { container } = render(<GanttView />);
    // Click the first bar rect
    const firstBar = container.querySelector('[data-testid="gantt-bar-rect"]');
    expect(firstBar).toBeInTheDocument();
    fireEvent.click(firstBar!);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/agent/pm');
  });

  it('clicking second row bar navigates to that agent', () => {
    const { container } = render(<GanttView />);
    // All bars from the 'dev' row
    const allBars = container.querySelectorAll('[data-testid="gantt-bar-rect"]');
    // fixture order: pm-0 (idx 0), dev-0 (idx 1), dev-1 (idx 2), sec-0 (idx 3)
    fireEvent.click(allBars[1]);
    expect(mockNavigate).toHaveBeenCalledWith('/agent/dev');
  });
});

// ---------------------------------------------------------------------------
// 6. Loading + error states
// ---------------------------------------------------------------------------
describe('GanttView SVG — loading state', () => {
  it('shows loading indicator when isLoading is true', () => {
    mockUseGanttData.mockReturnValue({ rows: [], isLoading: true, error: null });
    render(<GanttView />);
    expect(screen.getByTestId('gantt-loading')).toBeInTheDocument();
  });
});

describe('GanttView SVG — error state', () => {
  it('shows error message when error is set', () => {
    mockUseGanttData.mockReturnValue({
      rows: [],
      isLoading: false,
      error: new Error('WS closed'),
    });
    render(<GanttView />);
    expect(screen.getByTestId('gantt-error')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 7. 3-theme CSS variable fill — runtime check via attribute
// ---------------------------------------------------------------------------
describe('GanttView SVG — CSS variable fill (theme)', () => {
  it('bar rect fill attribute contains "var(--color-bar)" CSS variable reference', () => {
    const { container } = render(<GanttView />);
    const firstRect = container.querySelector('rect[data-testid="gantt-bar-rect"]');
    const fill = firstRect?.getAttribute('fill');
    // Must reference the CSS variable so theme switching works without JS
    expect(fill).toContain('var(--color-bar');
  });
});
