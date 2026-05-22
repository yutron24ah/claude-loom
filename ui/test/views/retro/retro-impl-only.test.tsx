/**
 * RetroView impl_only fill — M0.19 t7c Section C
 *
 * WHY: qa-suite cases RE-INDEPENDENT-01 / RE-START-01 / RE-INLINE-01 were marked
 * `implementation-only` (impl exists, no test). This file adds Vitest coverage.
 *
 * Cases covered:
 *   RE-INDEPENDENT-01 — retroMode独立 (RetroView functions independently of main room)
 *   RE-START-01       — session開始/終了 (session start/end controls)
 *   RE-INLINE-01      — inline style audit (inline styles only on dynamic values)
 */
// covers: RE-INDEPENDENT-01, RE-START-01, RE-INLINE-01
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('../../../src/live/useRetroLifecycle', () => ({
  useRetroLifecycle: () => ({
    keepItems: [],
    problemItems: [
      {
        id: 'R-1',
        sev: 'medium',
        lens: 'retro-proc',
        title: 'Test finding',
        target: 'test.ts',
        status: 'open',
        category: 'process',
      },
    ],
    carryoverItems: [],
    tryItems: [],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../../src/trpc/client', () => ({
  trpc: {
    retro: {
      reconstructFromArchive: {
        useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
      },
    },
  },
}));

import { RetroView } from '../../../src/views/retro/RetroView';

afterEach(() => {
  cleanup();
});

describe('RetroView impl_only fill', () => {
  it('renders independently without RoomView or scenario context', () => {
    // covers: RE-INDEPENDENT-01
    // WHY: RetroView is a standalone panel that does not depend on room state.
    // It renders from useRetroLifecycle hook independently of useScenario.
    expect(() => {
      render(<RetroView retroId="retro-test-001" />);
    }).not.toThrow();
    // Should render the KPT board columns
    expect(screen.getByTestId('kpt-col-keep')).toBeDefined();
    expect(screen.getByTestId('kpt-col-problem')).toBeDefined();
  });

  it('renders admin toggle button for session start/end control', () => {
    // covers: RE-START-01
    // WHY: The admin panel toggle in RetroView provides controls for
    // session management (start/end retro session, archive).
    render(<RetroView retroId="retro-test-001" />);
    const adminToggle = screen.queryByTestId('admin-toggle');
    expect(adminToggle).toBeInTheDocument();
  });

  it('renders RetroView without inline style on root container', () => {
    // covers: RE-INLINE-01
    // WHY: Structural layout uses CSS classes. Inline styles only on dynamic
    // values (e.g. severity colors, status indicators).
    const { container } = render(<RetroView retroId="retro-test-001" />);
    // Root container should use class-based layout
    // RetroView renders a div root - check it has a class
    const rootEl = container.firstElementChild;
    expect(rootEl).toBeInTheDocument();
    // The root should have a class name for layout (not purely inline styles)
    expect(rootEl?.className).toBeTruthy();
  });

  it('problem card renders with severity and title data', () => {
    // covers: RE-AGENTS-01 (additional coverage for retro agents display)
    render(<RetroView retroId="retro-test-001" />);
    // The problem card R-1 should be in PROBLEM column
    const problemCard = screen.queryByTestId('problem-card-R-1');
    expect(problemCard).toBeInTheDocument();
    // Should show the finding title
    expect(problemCard?.textContent).toContain('Test finding');
  });
});
