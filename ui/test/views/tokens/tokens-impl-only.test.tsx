/**
 * TokensView impl_only fill — M0.19 t7c Section C
 *
 * WHY: qa-suite cases TK-GRAPH-01 / TK-INLINE-01 were marked
 * `implementation-only` (impl exists, no test). This file adds Vitest coverage.
 *
 * Cases covered:
 *   TK-GRAPH-01  — グラフ表示 (daily cost bar graph renders with data)
 *   TK-INLINE-01 — inline style audit (inline styles only on dynamic values)
 */
// covers: TK-GRAPH-01, TK-INLINE-01
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      tokens: {
        period: '直近 7 days',
        byAgent: [
          { agentId: 'pm', model: 'opus', input: 100000, output: 20000, cacheWrite: 10000, cacheRead: 500000 },
          { agentId: 'dev', model: 'sonnet', input: 200000, output: 40000, cacheWrite: 20000, cacheRead: 1000000 },
        ],
        daily: [
          { day: 'Mon', cost: 1.50, cacheRatio: 0.80 },
          { day: 'Tue', cost: 2.20, cacheRatio: 0.75 },
          { day: 'Wed', cost: 0.90, cacheRatio: 0.85 },
          { day: 'Thu', cost: 3.10, cacheRatio: 0.72 },
          { day: 'Fri', cost: 1.80, cacheRatio: 0.88 },
          { day: 'Sat', cost: 0.50, cacheRatio: 0.60 },
          { day: 'Sun', cost: 2.40, cacheRatio: 0.79 },
        ],
      },
      pricing: {
        opus:   { input: 15.00, output: 75.00, cacheWrite: 18.75, cacheRead: 1.50 },
        sonnet: { input:  3.00, output: 15.00, cacheWrite:  3.75, cacheRead: 0.30 },
        haiku:  { input:  0.80, output:  4.00, cacheWrite:  1.00, cacheRead: 0.08 },
      },
    } as unknown as Scenario),
}));

import { TokensView } from '../../../src/views/tokens/TokensView';

afterEach(() => {
  cleanup();
});

describe('TokensView impl_only fill', () => {
  it('renders 7-day bar graph with all day bars present', () => {
    // covers: TK-GRAPH-01
    // WHY: TokensView renders a daily cost bar chart (グラフ表示) where each day
    // has a data-testid="daily-bar-{day}" element. Verify all 7 bars render.
    render(<TokensView />);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    days.forEach((day) => {
      const bar = screen.queryByTestId(`daily-bar-${day}`);
      expect(bar).toBeInTheDocument();
    });
  });

  it('bar graph elements have data-cache-ratio attribute', () => {
    // covers: TK-GRAPH-01 (cache ratio visual indicator on bar)
    render(<TokensView />);
    // Sat has the lowest cache ratio (0.60 = 60)
    const satBar = screen.getByTestId('daily-bar-Sat');
    expect(satBar.getAttribute('data-cache-ratio')).toBe('60');
    // Fri has the highest (0.88 = 88)
    const friBar = screen.getByTestId('daily-bar-Fri');
    expect(friBar.getAttribute('data-cache-ratio')).toBe('88');
  });

  it('bar graph renders cost labels for each day', () => {
    // covers: TK-GRAPH-01 (cost labels on bars)
    render(<TokensView />);
    // Check some cost labels are rendered
    expect(screen.getByText('$1.50')).toBeDefined();
    expect(screen.getByText('$2.20')).toBeDefined();
    expect(screen.getByText('$3.10')).toBeDefined();
  });

  it('renders tokens-view root without inline style on outer container', () => {
    // covers: TK-INLINE-01
    // WHY: Structural layout uses CSS classes. Inline styles only on dynamic values
    // (e.g. bar heights computed from cost values, efficiency hint conditional display).
    const { container } = render(<TokensView />);
    // Tokens view renders a root container — check it uses class-based layout
    const rootEl = container.firstElementChild;
    expect(rootEl).toBeInTheDocument();
    // Root element should not have an inline style for structural layout
    expect(rootEl?.getAttribute('style')).toBeFalsy();
  });

  it('efficiency hints section appears when cache ratio is below threshold (Sat 0.60)', () => {
    // covers: TK-GRAPH-01 (conditional efficiency hint based on graph data)
    render(<TokensView />);
    const hintsSection = screen.queryByTestId('efficiency-hints');
    expect(hintsSection).toBeInTheDocument();
    expect(hintsSection?.textContent).toContain('Sat');
  });
});
