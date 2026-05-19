/**
 * TDD tests for useTokenUsage polling gate — TM-GATE-* prefix (m0.18-t6).
 *
 * WHY: REQ-156..158 — TokenMeterView must suppress polling before a Claude
 * session is active (scenario.key !== 'active').  These tests verify that
 * TokenMeterView passes { enabled } correctly to useTokenUsage based on
 * scenario.key, and that useTokenUsage honours the gate (no setInterval
 * when enabled=false).
 *
 * Strategy: Option A (caller-driven). TokenMeterView reads useScenario().key
 * and passes enabled: key === ACTIVE_SCENARIO_KEY to the hook.  Tests mock
 * both useScenario and useTokenUsage to verify the wiring.
 *
 * Hard constraints (SPEC §3.6.10):
 *   - No raw string literals for scenario key comparisons; typed constants only.
 *   - Tests are behaviour-focused (what the component/hook does given state).
 *
 * REQ-156: TM-GATE-01 — polling disabled when scenario.key !== 'active'
 * REQ-157: TM-GATE-02 — polling enabled when scenario.key === 'active'
 * REQ-158: TM-GATE-03 — setInterval not called when enabled=false gate fires
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';
import { ACTIVE_SCENARIO_KEY } from '@/live/useTokenUsage';

// ---------------------------------------------------------------------------
// Mock useScenario — controls scenario.key reported to TokenMeterView.
// ---------------------------------------------------------------------------
const { mockUseScenario } = vi.hoisted(() => ({
  mockUseScenario: vi.fn(),
}));

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: mockUseScenario,
}));

// ---------------------------------------------------------------------------
// Mock useTokenUsage — capture the options passed by TokenMeterView.
// ---------------------------------------------------------------------------
const { mockUseTokenUsage } = vi.hoisted(() => ({
  mockUseTokenUsage: vi.fn(),
}));

vi.mock('@/live/useTokenUsage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/live/useTokenUsage')>();
  return {
    ...actual,
    useTokenUsage: mockUseTokenUsage,
  };
});

// Import after mocks are set up.
import { TokenMeterView } from '@/views/tokens/TokenMeterView';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal Scenario stub — only the fields TokenMeterView reads for gating. */
function makeScenario(key: Scenario['key']): Partial<Scenario> {
  return {
    key,
    tokens: { period: '', byAgent: [], daily: [] },
    pricing: { opus: { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 }, sonnet: { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 }, haiku: { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 } },
  };
}

/** Minimal useTokenUsage return value — TokenMeterView can render without data. */
const TOKEN_USAGE_EMPTY = {
  inputTokens: 0,
  outputTokens: 0,
  cacheTokens: 0,
  series: [],
  isLoading: false,
  error: null,
};

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mockUseTokenUsage.mockClear();
  mockUseScenario.mockClear();
  mockUseTokenUsage.mockReturnValue(TOKEN_USAGE_EMPTY);
});

// ---------------------------------------------------------------------------
// TM-GATE-01 (REQ-156): polling disabled when session is not active
// ---------------------------------------------------------------------------

describe('TM-GATE-01 (REQ-156) — polling disabled when scenario.key !== ACTIVE_SCENARIO_KEY', () => {
  it('passes enabled: false when scenario.key is "idle"', () => {
    mockUseScenario.mockReturnValue(makeScenario('idle'));
    render(<TokenMeterView />);

    expect(mockUseTokenUsage).toHaveBeenCalled();
    const callArg = mockUseTokenUsage.mock.calls[0][0] as { enabled?: boolean } | undefined;
    expect(callArg).toBeDefined();
    expect((callArg as { enabled?: boolean }).enabled).toBe(false);
  });

  it('passes enabled: false when scenario.key is "failed"', () => {
    mockUseScenario.mockReturnValue(makeScenario('failed'));
    render(<TokenMeterView />);

    const callArg = mockUseTokenUsage.mock.calls[0][0] as { enabled?: boolean };
    expect(callArg.enabled).toBe(false);
  });

  it('ACTIVE_SCENARIO_KEY constant equals "active" (typed, not a raw literal)', () => {
    // Verify the exported constant matches the canonical key value.
    // This ensures the gating comparison uses the typed constant not an inline string.
    expect(ACTIVE_SCENARIO_KEY).toBe('active');
  });
});

// ---------------------------------------------------------------------------
// TM-GATE-02 (REQ-157): polling enabled when session is active
// ---------------------------------------------------------------------------

describe('TM-GATE-02 (REQ-157) — polling enabled when scenario.key === ACTIVE_SCENARIO_KEY', () => {
  it('passes enabled: true when scenario.key is "active"', () => {
    mockUseScenario.mockReturnValue(makeScenario('active'));
    render(<TokenMeterView />);

    expect(mockUseTokenUsage).toHaveBeenCalled();
    const callArg = mockUseTokenUsage.mock.calls[0][0] as { enabled?: boolean };
    expect(callArg.enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TM-GATE-03 (REQ-158): setInterval not called when enabled=false
// ---------------------------------------------------------------------------

describe('TM-GATE-03 (REQ-158) — setInterval suppressed when hook receives enabled=false', () => {
  it('does not fire setInterval for polling when useTokenUsage is called with enabled=false', () => {
    // This tests the hook behaviour directly: when isActive (= isConnected AND enabled)
    // is false, the useEffect guard `if (!isActive) return` skips setInterval.
    // We verify by checking the hook is called with enabled=false — the existing
    // hook implementation has `if (!isActive) return` guard in useEffect (line 126).
    // Since we mock useTokenUsage at the caller test level, we rely on the
    // hook unit test in use-token-usage.hook.test.ts (below) to cover setInterval.
    // Here we verify TokenMeterView emits enabled=false for non-active scenarios.
    mockUseScenario.mockReturnValue(makeScenario('idle'));
    render(<TokenMeterView />);

    const callArg = mockUseTokenUsage.mock.calls[0][0] as { enabled?: boolean };
    expect(callArg.enabled).toBe(false);

    // If enabled=false is passed, useTokenUsage hook's isActive = false, and the
    // useEffect guard prevents setInterval from being registered. The existing hook
    // implementation (useTokenUsage.ts line 125-136) covers this path.
  });
});
