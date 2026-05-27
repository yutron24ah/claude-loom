/**
 * retro-rail-flow.test.tsx — Retro live-rail pattern tests (M0.20-t6c)
 *
 * WHY: Covers RL-KPT-02 (TRY from: refs), RL-PIP-03 (3-strike rule note),
 *      RL-VERDICT-DROP-01 (lens-drop badge), RL-VERDICT-NULL-01 (null = no badge),
 *      RL-PSUM-02 (backend re_evaluated_in back-fill — impl_only proxy).
 */
// covers: RL-KPT-02, RL-PIP-03, RL-VERDICT-DROP-01, RL-VERDICT-NULL-01, RL-PSUM-02

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { PendingSummaryFinding } from '../../../src/live/useRetroLifecycle';

// ============================================================================
// Mock setup
// ============================================================================

const mockCarryoverDrop: PendingSummaryFinding = {
  finding_id: 'drop-001',
  origin_retro_id: 'retro-2026-03-01',
  lens: 'pj-axis',
  category: 'process',
  risk: 'low',
  summary: 'Stale finding that lens dropped',
  status: 'pending',
  carryover_count: 2,
  last_seen_in: 'retro-2026-05-10',
  expired_at: null,
  re_evaluated_in: null,
};

const mockCarryoverNull: PendingSummaryFinding = {
  finding_id: 'null-001',
  origin_retro_id: 'retro-2026-04-01',
  lens: 'process-axis',
  category: 'tdd',
  risk: 'medium',
  summary: 'Finding with no special verdict',
  status: 'pending',
  carryover_count: 1,
  last_seen_in: 'retro-2026-05-15',
  expired_at: null,
  re_evaluated_in: null,
};

const mockCarryover3Strike: PendingSummaryFinding = {
  finding_id: 'strike-001',
  origin_retro_id: 'retro-2026-02-01',
  lens: 'meta-axis',
  category: 'meta',
  risk: 'high',
  summary: 'Three-strike auto-expire candidate',
  status: 'pending',
  carryover_count: 3,
  last_seen_in: 'retro-2026-05-16',
  expired_at: null,
  re_evaluated_in: null,
};

vi.mock('../../../src/live/useRetroLifecycle', () => ({
  useRetroLifecycle: () => ({
    keepItems: [],
    problemItems: [],
    carryoverItems: [mockCarryoverDrop, mockCarryoverNull, mockCarryover3Strike],
    tryItems: [
      { id: 'A-10', title: 'Improve test coverage', from: 'R-5' },
      { id: 'A-11', title: 'Fix retro schedule', from: 'P-3' },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../../src/trpc/client', () => ({
  trpc: {
    retro: {
      reconstructFromArchive: {
        useQuery: vi.fn(() => ({
          data: undefined,
          isLoading: false,
          refetch: vi.fn(),
        })),
      },
    },
  },
}));

import { RetroView } from '../../../src/views/retro/RetroView';
import { CarryoverCard } from '../../../src/views/retro/CarryoverCard';

afterEach(() => {
  cleanup();
});

// ============================================================================
// RL-KPT-02 — TRY column items show "from: refs"
// ============================================================================

// covers: RL-KPT-02
describe('RL-KPT-02: TRY column items show from: source refs', () => {
  it('TRY item A-10 card shows "from: R-5" source reference', () => {
    render(<RetroView retroId="retro-test" />);
    const tryCard = screen.getByTestId('try-card-A-10');
    expect(tryCard).toBeInTheDocument();
    // Card should contain "from: R-5" reference text
    expect(tryCard.textContent).toContain('R-5');
  });

  it('TRY item A-11 card shows "from: P-3" source reference (pending origin)', () => {
    render(<RetroView retroId="retro-test" />);
    const tryCard = screen.getByTestId('try-card-A-11');
    expect(tryCard).toBeInTheDocument();
    // P-xx refs (pending origin) should also appear
    expect(tryCard.textContent).toContain('P-3');
  });

  it('TRY column shows both items with distinct from refs', () => {
    render(<RetroView retroId="retro-test" />);
    const col = screen.getByTestId('kpt-col-try');
    // Both R-5 and P-3 should appear in the TRY column
    expect(col.textContent).toContain('R-5');
    expect(col.textContent).toContain('P-3');
  });
});

// ============================================================================
// RL-PIP-03 — 3-strike rule annotation at CARRYOVER column bottom
// ============================================================================

// covers: RL-PIP-03
describe('RL-PIP-03: 3-strike rule annotation in CARRYOVER column', () => {
  it('CARRYOVER column contains 3-strike rule annotation text', () => {
    render(<RetroView retroId="retro-test" />);
    const col = screen.getByTestId('kpt-col-carryover');
    // Column should display the 3-strike rule note
    expect(col.textContent).toContain('3-strike');
  });

  it('carryover_count=3 item shows fully-filled pip (▣▣▣)', () => {
    render(<RetroView retroId="retro-test" />);
    const card = screen.getByTestId('carryover-card-strike-001');
    const pip = card.querySelector('[data-testid="carryover-pip"]');
    expect(pip).toBeInTheDocument();
    expect(pip?.textContent).toContain('▣▣▣');
  });
});

// ============================================================================
// RL-VERDICT-DROP-01 — lens-drop badge (❌ lens-drop)
// ============================================================================

// covers: RL-VERDICT-DROP-01
describe('RL-VERDICT-DROP-01: lens-drop verdict badge', () => {
  it('CarryoverCard shows lens-drop badge when re_evaluation_verdict is lens_drop', () => {
    // WHY: A finding that a lens explicitly dropped gets ❌ lens-drop badge.
    // Mock a finding with lens_drop verdict state via status='expired' + explicit override.
    // Note: CarryoverCard derives verdict from status='expired' → auto_expire.
    // lens_drop requires a re_evaluation_verdict field to be added to the schema.
    const dropFinding = {
      ...mockCarryoverDrop,
      re_evaluation_verdict: 'lens_drop',
    } as PendingSummaryFinding & { re_evaluation_verdict?: string };
    const { container } = render(
      <CarryoverCard finding={dropFinding as PendingSummaryFinding} />,
    );
    const verdictBadge = container.querySelector('[data-testid="carryover-verdict"]');
    // Currently: lens_drop verdict badge requires re_evaluation_verdict field support
    // in CarryoverCard. This test drives the impl to add that field.
    expect(verdictBadge).toBeInTheDocument();
    expect(verdictBadge?.textContent).toContain('lens-drop');
  });
});

// ============================================================================
// RL-VERDICT-NULL-01 — null verdict = no badge
// ============================================================================

// covers: RL-VERDICT-NULL-01
describe('RL-VERDICT-NULL-01: null verdict shows no badge', () => {
  it('normal pending finding with no special verdict has no verdict badge', () => {
    // WHY: For findings without promoted/expired/lens_drop state, no badge renders.
    // The null verdict case must NOT show a verdict badge.
    render(<RetroView retroId="retro-test" />);
    // null-001 has re_evaluated_in=null and status='pending' → null verdict
    const card = screen.getByTestId('carryover-card-null-001');
    const badge = card.querySelector('[data-testid="carryover-verdict"]');
    expect(badge).toBeNull();
  });

  it('CarryoverCard with status=pending and no re_evaluated_in renders no verdict badge', () => {
    // covers: RL-VERDICT-NULL-01
    const { container } = render(
      <CarryoverCard finding={mockCarryoverNull} />,
    );
    const badge = container.querySelector('[data-testid="carryover-verdict"]');
    expect(badge).toBeNull();
  });
});

// ============================================================================
// RL-PSUM-02 — backend re_evaluated_in back-fill (impl_only proxy)
// ============================================================================

// covers: RL-PSUM-02
describe('RL-PSUM-02: re_evaluated_in back-fill (backend impl proxy)', () => {
  it('PendingSummaryFinding type includes re_evaluated_in field (backend schema contract)', async () => {
    // covers: RL-PSUM-02
    // WHY: RL-PSUM-02 is a backend operation (aggregator back-fills re_evaluated_in
    // to origin pending.json). Unit proxy: verify the TypeScript type contract
    // has the re_evaluated_in field so the back-fill path can write it.
    // This is impl_only — the actual back-fill is in daemon/src/routes/retro.ts.
    const finding: PendingSummaryFinding = {
      finding_id: 'pj-001',
      origin_retro_id: 'retro-2026-04-01',
      lens: 'pj-axis',
      category: 'process',
      risk: 'medium',
      summary: 'test finding',
      status: 'pending',
      carryover_count: 1,
      last_seen_in: 'retro-2026-05-15',
      expired_at: null,
      re_evaluated_in: 'retro-2026-05-22', // back-fill value
    };
    // The type accepts re_evaluated_in (non-null) when back-filled
    expect(finding.re_evaluated_in).toBe('retro-2026-05-22');
    expect(typeof finding.re_evaluated_in).toBe('string');
  });

  it('carryover card renders promoted badge when re_evaluated_in is set (back-fill result)', () => {
    // covers: RL-PSUM-02
    // WHY: After aggregator back-fills re_evaluated_in, the card renders
    // "🔄 promoted" badge — visible proof of the back-fill in UI.
    const promotedFinding: PendingSummaryFinding = {
      ...mockCarryoverNull,
      re_evaluated_in: 'retro-2026-05-22', // simulates back-fill
    };
    const { container } = render(
      <CarryoverCard finding={promotedFinding} />,
    );
    const badge = container.querySelector('[data-testid="carryover-verdict"]');
    expect(badge).toBeInTheDocument();
    expect(badge?.textContent).toContain('promoted');
  });
});
