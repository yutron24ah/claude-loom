/**
 * GanttView impl_only fill — M0.19 t7c Section C
 *
 * WHY: qa-suite cases GA-TOOLTIP-01 / GA-INLINE-01 were marked
 * `implementation-only` (impl exists, no test). This file adds Vitest coverage.
 *
 * Cases covered:
 *   GA-TOOLTIP-01  — ホバー詳細 (hover tooltip on bar, title attribute)
 *   GA-INLINE-01   — inline style audit (inline styles only on dynamic values)
 */
// covers: GA-TOOLTIP-01, GA-INLINE-01
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

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
            label: 'PM session',
            bars: [
              { s: 10, e: 70, kind: 'busy' },
              { s: 72, e: 80, kind: 'tdd' },
            ],
            live: true,
          },
          {
            worktree: 'main',
            agentId: 'dev',
            label: 'dev work',
            bars: [{ s: 20, e: 60, kind: 'review' }],
            live: false,
          },
        ],
      },
    }) as unknown as Scenario,
}));

import { GanttView } from '../../../src/views/gantt/GanttView';

afterEach(() => {
  cleanup();
});

describe('GanttView impl_only fill', () => {
  it('renders bar segments with title attribute for tooltip on hover', () => {
    // covers: GA-TOOLTIP-01
    // WHY: GanttBarSegment renders <div title={bar.kind}> which provides
    // the hover tooltip detail (browser tooltip). Verifies the implementation.
    const { container } = render(<GanttView />);
    const barsWithTitle = container.querySelectorAll('[data-kind][title]');
    expect(barsWithTitle.length).toBeGreaterThanOrEqual(1);
    // Verify the title attribute matches the kind (hover detail)
    const firstBar = barsWithTitle[0];
    const kind = firstBar.getAttribute('data-kind');
    const titleAttr = firstBar.getAttribute('title');
    expect(titleAttr).toBe(kind);
  });

  it('renders gantt-screen root without inline style (CSS class-based layout)', () => {
    // covers: GA-INLINE-01
    // WHY: Structural layout uses CSS classes, not inline styles on the root element.
    // Dynamic values (zoom button bg, bar positions, now-line position) have inline styles.
    const { container } = render(<GanttView />);
    const ganttScreen = container.querySelector('.gantt-screen');
    expect(ganttScreen).toBeInTheDocument();
    // Root element should not have an inline style attribute
    expect(ganttScreen?.getAttribute('style')).toBeFalsy();
  });

  it('renders zoom strip buttons with inline bg color for active state', () => {
    // covers: GA-INLINE-01 (dynamic inline styles on active state are expected)
    const { container } = render(<GanttView />);
    // Zoom buttons should exist (dynamic inline background-color on active button)
    const zoomBtns = container.querySelectorAll('.gantt-zoom-btn');
    expect(zoomBtns.length).toBe(4); // 30m, 1h, 4h, all
    // The active zoom button (30m by default) should have a different background style
    const activeBtn = Array.from(zoomBtns).find(
      (b) => (b as HTMLElement).style.color === 'white',
    );
    expect(activeBtn).toBeDefined();
  });
});
