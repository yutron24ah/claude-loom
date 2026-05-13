/**
 * TokensView × scenario.active — redesign port smoke tests (M0.15 t9)
 *
 * WHY: The existing tokens.test.tsx covers the old TokenMeterView (useTokenUsage hook,
 * sparkline, RPG style). This suite mocks useScenario (the new redesign hook) to verify
 * the redesign-driven TokensView renders:
 *   - 7-day daily cost bar chart with cost values
 *   - per-agent table with model + tokens
 *   - cache-hit ratio per day
 *   - USD cost computed from pricing × tokens
 *   - efficiency hint when cache-hit < 0.7 (Sat 0.62)
 *
 * REQ-068 acceptance criteria.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// WHY: Mock useScenario so the component never touches the real WS store.
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      tokens: {
        period: '直近 7 days',
        byAgent: [
          { agentId: 'pm',       model: 'opus',   input: 142000, output: 38000,  cacheWrite: 28000, cacheRead: 920000  },
          { agentId: 'dev',      model: 'sonnet', input: 380000, output: 92000,  cacheWrite: 64000, cacheRead: 2400000 },
          { agentId: 'rev-code', model: 'sonnet', input: 220000, output: 44000,  cacheWrite: 18000, cacheRead: 1200000 },
          { agentId: 'rev-sec',  model: 'opus',   input: 88000,  output: 21000,  cacheWrite: 12000, cacheRead: 680000  },
          { agentId: 'rev-test', model: 'haiku',  input: 110000, output: 18000,  cacheWrite: 6000,  cacheRead: 720000  },
          { agentId: 'retro-pm', model: 'opus',   input: 46000,  output: 14000,  cacheWrite: 4000,  cacheRead: 180000  },
        ],
        daily: [
          { day: 'Wed', cost: 2.10, cacheRatio: 0.78 },
          { day: 'Thu', cost: 3.40, cacheRatio: 0.81 },
          { day: 'Fri', cost: 1.95, cacheRatio: 0.74 },
          { day: 'Sat', cost: 0.42, cacheRatio: 0.62 },
          { day: 'Sun', cost: 0.88, cacheRatio: 0.71 },
          { day: 'Mon', cost: 4.20, cacheRatio: 0.83 },
          { day: 'Tue', cost: 3.80, cacheRatio: 0.85 },
        ],
      },
      pricing: {
        opus:   { input: 15.00, output: 75.00, cacheWrite: 18.75, cacheRead: 1.50 },
        sonnet: { input:  3.00, output: 15.00, cacheWrite:  3.75, cacheRead: 0.30 },
        haiku:  { input:  0.80, output:  4.00, cacheWrite:  1.00, cacheRead: 0.08 },
      },
    } as unknown as Scenario),
}));

// Import after mock
import { TokensView } from '../../../src/views/tokens/TokensView';

afterEach(() => {
  cleanup();
});

describe('TokensView × scenario.active', () => {
  it('renders 7-day daily cost bar chart', () => {
    render(<TokensView />);
    // Each day label appears in the chart
    expect(screen.getByTestId('daily-bar-Wed')).toBeDefined();
    expect(screen.getByTestId('daily-bar-Thu')).toBeDefined();
    expect(screen.getByTestId('daily-bar-Sat')).toBeDefined();
    expect(screen.getByTestId('daily-bar-Tue')).toBeDefined();
    // Cost label $2.10 for Wed
    expect(screen.getByText('$2.10')).toBeDefined();
    // Cost label $3.40 for Thu
    expect(screen.getByText('$3.40')).toBeDefined();
  });

  it('renders per-agent table with model + tokens', () => {
    render(<TokensView />);
    // Agent rows present
    expect(screen.getByTestId('agent-row-pm')).toBeDefined();
    expect(screen.getByTestId('agent-row-dev')).toBeDefined();
    expect(screen.getByTestId('agent-row-rev-code')).toBeDefined();
    // Model labels present
    expect(screen.getAllByText('opus').length).toBeGreaterThan(0);
    expect(screen.getAllByText('sonnet').length).toBeGreaterThan(0);
    expect(screen.getAllByText('haiku').length).toBeGreaterThan(0);
  });

  it('renders cache-hit ratio per day', () => {
    render(<TokensView />);
    // Each daily bar has a data-cache-ratio attribute
    expect(screen.getByTestId('daily-bar-Wed').getAttribute('data-cache-ratio')).toBe('78');
    expect(screen.getByTestId('daily-bar-Sat').getAttribute('data-cache-ratio')).toBe('62');
    expect(screen.getByTestId('daily-bar-Mon').getAttribute('data-cache-ratio')).toBe('83');
  });

  it('renders cost USD computed from pricing × tokens', () => {
    render(<TokensView />);
    // pm agent: opus pricing
    // cost = (142000 * 15 + 38000 * 75 + 28000 * 18.75 + 920000 * 1.50) / 1_000_000
    //       = (2_130_000 + 2_850_000 + 525_000 + 1_380_000) / 1_000_000
    //       = 6_885_000 / 1_000_000 = 6.885 → JS toFixed(2) = $6.88
    const pmRow = screen.getByTestId('agent-row-pm');
    expect(pmRow.querySelector('[data-testid="agent-cost-pm"]')?.textContent).toContain('6.88');
  });

  it('renders efficiency hint when cache-hit < 0.7 (Sat 0.62)', () => {
    render(<TokensView />);
    // Sat has cacheRatio 0.62 < 0.7 => efficiency hint section should exist
    const hintSection = screen.getByTestId('efficiency-hints');
    expect(hintSection).toBeDefined();
    // The low cache-hit day should be mentioned
    expect(hintSection.textContent).toContain('Sat');
  });
});
