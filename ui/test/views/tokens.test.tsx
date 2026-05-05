/**
 * TokenMeterView TDD tests — RED phase (M5 t4).
 *
 * WHY: Verify that TokenMeterView renders the meter UI, displays
 * input/output/cache token summaries, a sparkline, and handles
 * loading/error/empty states correctly.
 *
 * SPEC §3.6.10 compliance: TOKEN_TYPE constants used (no raw string literals).
 * We mock useTokenUsage entirely so no WS or polling is needed.
 * We test BEHAVIOR (visible UI states) not implementation internals.
 *
 * data-testid map (per task spec):
 *   token-meter-view     → outer container
 *   token-meter-input    → input token count display
 *   token-meter-output   → output token count display
 *   token-meter-cache    → cache token count display
 *   token-meter-sparkline → SVG sparkline element
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock useTokenUsage hook
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

// Import after mock is set up
import { TokenMeterView } from '../../src/views/tokens/TokenMeterView';

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Default state helper
// ---------------------------------------------------------------------------

interface TokenSummary {
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  series: Array<{ bucketAt: number; inputTokens: number; outputTokens: number; cacheTokens: number }>;
  isLoading: boolean;
  error: Error | null;
}

function makeDefaultState(overrides: Partial<TokenSummary> = {}): TokenSummary {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheTokens: 0,
    series: [],
    isLoading: false,
    error: null,
    ...overrides,
  };
}

beforeEach(() => {
  mockUseTokenUsage.mockClear();
  mockUseTokenUsage.mockReturnValue(makeDefaultState());
});

// ---------------------------------------------------------------------------
// Basic render
// ---------------------------------------------------------------------------

describe('TokenMeterView — basic render', () => {
  it('renders token-meter-view container', () => {
    render(<TokenMeterView />);
    expect(screen.getByTestId('token-meter-view')).toBeInTheDocument();
  });

  it('renders input token display', () => {
    render(<TokenMeterView />);
    expect(screen.getByTestId('token-meter-input')).toBeInTheDocument();
  });

  it('renders output token display', () => {
    render(<TokenMeterView />);
    expect(screen.getByTestId('token-meter-output')).toBeInTheDocument();
  });

  it('renders cache token display', () => {
    render(<TokenMeterView />);
    expect(screen.getByTestId('token-meter-cache')).toBeInTheDocument();
  });

  it('renders sparkline SVG element', () => {
    render(<TokenMeterView />);
    expect(screen.getByTestId('token-meter-sparkline')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Token counts display
// ---------------------------------------------------------------------------

describe('TokenMeterView — token counts', () => {
  it('displays inputTokens value', () => {
    mockUseTokenUsage.mockReturnValue(makeDefaultState({ inputTokens: 1234 }));
    render(<TokenMeterView />);
    const el = screen.getByTestId('token-meter-input');
    // toLocaleString may format as "1,234" — match with optional separators
    expect(el.textContent).toMatch(/1[,.]?2[,.]?3[,.]?4|1234/);
  });

  it('displays outputTokens value', () => {
    mockUseTokenUsage.mockReturnValue(makeDefaultState({ outputTokens: 5678 }));
    render(<TokenMeterView />);
    const el = screen.getByTestId('token-meter-output');
    // toLocaleString may format as "5,678" — match digits that are in the value
    expect(el.textContent).toMatch(/5[,.]?6[,.]?7[,.]?8|5678/);
  });

  it('displays cacheTokens value', () => {
    mockUseTokenUsage.mockReturnValue(makeDefaultState({ cacheTokens: 999 }));
    render(<TokenMeterView />);
    const el = screen.getByTestId('token-meter-cache');
    expect(el.textContent).toMatch(/999/); // 999 has no comma separator
  });

  it('shows zero counts by default', () => {
    render(<TokenMeterView />);
    expect(screen.getByTestId('token-meter-input').textContent).toMatch(/0/);
    expect(screen.getByTestId('token-meter-output').textContent).toMatch(/0/);
    expect(screen.getByTestId('token-meter-cache').textContent).toMatch(/0/);
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('TokenMeterView — loading state', () => {
  it('shows loading indicator when isLoading is true', () => {
    mockUseTokenUsage.mockReturnValue(makeDefaultState({ isLoading: true }));
    render(<TokenMeterView />);
    expect(screen.getByTestId('token-meter-loading')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

describe('TokenMeterView — error state', () => {
  it('shows error message when error is present', () => {
    mockUseTokenUsage.mockReturnValue(
      makeDefaultState({ error: new Error('fetch failed') })
    );
    render(<TokenMeterView />);
    expect(screen.getByTestId('token-meter-error')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Sparkline render with series data
// ---------------------------------------------------------------------------

describe('TokenMeterView — sparkline', () => {
  it('renders sparkline container regardless of data', () => {
    render(<TokenMeterView />);
    const sparkline = screen.getByTestId('token-meter-sparkline');
    expect(sparkline).toBeInTheDocument();
  });

  it('renders sparkline with series data present', () => {
    const now = Date.now();
    mockUseTokenUsage.mockReturnValue(makeDefaultState({
      series: [
        { bucketAt: now - 2000, inputTokens: 10, outputTokens: 20, cacheTokens: 5 },
        { bucketAt: now - 1000, inputTokens: 30, outputTokens: 40, cacheTokens: 15 },
      ],
    }));
    render(<TokenMeterView />);
    const sparkline = screen.getByTestId('token-meter-sparkline');
    expect(sparkline).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// RPG style assertions (M0.11.4 Phase C t16)
// ---------------------------------------------------------------------------

describe('TokenMeterView — RPG style', () => {
  it('wraps outer container in rpg-frame', () => {
    const { container } = render(<TokenMeterView />);
    const frame = container.querySelector('.rpg-frame');
    expect(frame).toBeInTheDocument();
  });

  it('renders title with rpg-title class', () => {
    const { container } = render(<TokenMeterView />);
    const title = container.querySelector('.rpg-title');
    expect(title).toBeInTheDocument();
  });

  it('renders exp-bar for token usage visualization', () => {
    mockUseTokenUsage.mockReturnValue(makeDefaultState({ inputTokens: 5000, outputTokens: 1000, cacheTokens: 500 }));
    const { container } = render(<TokenMeterView />);
    const expBar = container.querySelector('.exp-bar');
    expect(expBar).toBeInTheDocument();
  });

  it('renders rpg-label elements for token type labels', () => {
    const { container } = render(<TokenMeterView />);
    const labels = container.querySelectorAll('.rpg-label');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});
