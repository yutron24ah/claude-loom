/**
 * GanttView TDD tests — Red phase (Task 9 Subagent B)
 * WHY: verify Gantt bars render with mock data.
 * Written FIRST (Red) before GanttView implementation.
 *
 * Behavior under test:
 * 1. Component renders without crashing
 * 2. Title/heading is visible
 * 3. At least 5 Gantt bars are rendered (mock data: 5-8 bars)
 * 4. Bar labels from mock data are visible
 * 5. Time axis labels present
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { GanttView } from '../../src/views/gantt/GanttView';

afterEach(() => {
  cleanup();
});

describe('GanttView — basic render', () => {
  it('renders without crashing', () => {
    const { container } = render(<GanttView />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders a title mentioning Gantt / ガント', () => {
    render(<GanttView />);
    // title should reference Gantt or 進捗
    const heading = screen.getByRole('heading', { name: /ガント|gantt|進捗/i });
    expect(heading).toBeInTheDocument();
  });
});

describe('GanttView — bar count from mock data', () => {
  it('renders at least 5 gantt bars (data-testid="gantt-bar")', () => {
    const { container } = render(<GanttView />);
    const bars = container.querySelectorAll('[data-testid="gantt-bar"]');
    expect(bars.length).toBeGreaterThanOrEqual(5);
  });

  it('renders at most 8 gantt bars', () => {
    const { container } = render(<GanttView />);
    const bars = container.querySelectorAll('[data-testid="gantt-bar"]');
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
