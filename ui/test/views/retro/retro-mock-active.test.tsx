/**
 * RetroView × scenario.active — smoke tests updated for M0.18 t2 KPT board.
 *
 * WHY: The original M0.15 t12 test mocked useScenario() and tested
 * the 2-column LensCard+FindingRow layout. M0.18 t2 replaces that layout
 * with a KPT 4-column board. This test suite is updated to:
 *   - mock useRetroLifecycle (new hook replacing useScenario for RetroView)
 *   - verify KPT board renders with problem items, carryover items, try items
 *   - verify admin panel toggle works
 *
 * The full RETRO-LC-* and RETRO-ADM-* test suite is in test/views/retro.test.tsx.
 * This file is a smoke test to verify the import/render path from the
 * retro/ subdirectory.
 *
 * REQ-115 (KPT board smoke).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// WHY: mock useRetroLifecycle so this smoke test is self-contained.
vi.mock('../../../src/live/useRetroLifecycle', () => ({
  useRetroLifecycle: () => ({
    keepItems: [],
    problemItems: [
      { id: 'R-1', sev: 'high', lens: 'retro-proc', title: 'TDD red 順序が飛んでる', target: 'auth.test.ts', status: 'open', category: 'process' },
    ],
    carryoverItems: [
      {
        finding_id: 'pj-001',
        origin_retro_id: 'retro-2026-04-01',
        lens: 'pj-axis',
        category: 'process',
        risk: 'medium',
        summary: 'pre-existing test failures',
        status: 'pending',
        carryover_count: 1,
        last_seen_in: 'retro-2026-05-01',
        expired_at: null,
        re_evaluated_in: null,
      },
    ],
    tryItems: [
      { id: 'A-1', title: 'Add cleanup milestone', from: 'R-1' },
    ],
    isLoading: false,
    error: null,
  }),
}));

// WHY: mock trpc so AdminPanel doesn't need TRPCProvider in test render.
vi.mock('../../../src/trpc/client', () => ({
  trpc: {
    retro: {
      reconstructFromArchive: {
        useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
      },
    },
  },
}));

// Import after mocks
import { RetroView } from '../../../src/views/retro/RetroView';

afterEach(() => {
  cleanup();
});

describe('RetroView × scenario.active (M0.18 KPT smoke)', () => {
  it('renders KPT board 4 columns', () => {
    render(<RetroView retroId="retro-2026-05-16" />);
    expect(screen.getByTestId('kpt-col-keep')).toBeDefined();
    expect(screen.getByTestId('kpt-col-problem')).toBeDefined();
    expect(screen.getByTestId('kpt-col-carryover')).toBeDefined();
    expect(screen.getByTestId('kpt-col-try')).toBeDefined();
  });

  it('renders problem item in PROBLEM column', () => {
    render(<RetroView retroId="retro-2026-05-16" />);
    expect(screen.getByTestId('problem-card-R-1')).toBeDefined();
  });

  it('renders carryover item in CARRYOVER column', () => {
    render(<RetroView retroId="retro-2026-05-16" />);
    expect(screen.getByTestId('carryover-card-pj-001')).toBeDefined();
  });

  it('renders try item in TRY column', () => {
    render(<RetroView retroId="retro-2026-05-16" />);
    expect(screen.getByTestId('try-card-A-1')).toBeDefined();
  });

  it('renders admin toggle button', () => {
    render(<RetroView retroId="retro-2026-05-16" />);
    expect(screen.getByTestId('admin-toggle')).toBeDefined();
  });

  it('expands admin panel on toggle click', () => {
    render(<RetroView retroId="retro-2026-05-16" />);
    fireEvent.click(screen.getByTestId('admin-toggle'));
    expect(screen.getByTestId('admin-panel-content')).toBeDefined();
  });
});
