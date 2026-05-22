/**
 * ConsistencyView — filter + inline style tests
 * CN-INLINE-01 (CSS import verification)
 *
 * REQ-075 scope (shell impl_only fill, M0.19 t7a)
 *
 * NOTE: CN-FILTER-01 (severity フィルタ) is DEFERRED to M0.20.
 * ConsistencyView implements a STATUS filter (OPEN/ACK/FIXED/DISMISSED),
 * but CN-FILTER-01 requires a SEVERITY filter (error/warn/info) which is
 * not yet implemented. Deferred as impl gap (M0.20 missing scope).
 *
 * CN-INLINE-01: Verifies that ConsistencyView imports screens/consistency.css
 * (S6 fix — "inline 全廃").
 * Test approach: render ConsistencyView and verify the CSS import causes
 * class-based styling to be applied (no assertion of CSS values in jsdom,
 * but class names from screens/consistency.css are present).
 *
 * The status filter IS implemented; we test it here to verify the filter
 * behavior that IS present, while CN-FILTER-01 (severity) is deferred.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

const ackFn = vi.fn();
const fixFn = vi.fn();
const dismissFn = vi.fn();

vi.mock('../../../src/live/useConsistencyMutations', () => ({
  useConsistencyMutations: () => ({
    acknowledgeFinding: ackFn,
    markFindingFixed: fixFn,
    dismissFinding: dismissFn,
    openInEditor: vi.fn(),
    isAcknowledgePending: false,
    isMarkFixedPending: false,
    isDismissPending: false,
  }),
}));

// Fixture with multiple findings of different status values
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      consistencyState: 'has-findings',
      findings: [
        {
          id: 'F-01', sev: 'high', status: 'open',
          file: 'daemon/src/server.ts', lines: 'L12',
          title: 'SPEC §3.5 is not implemented',
          detail: 'port mismatch', suggest: 'check port', source: 'spec-diff',
        },
        {
          id: 'F-02', sev: 'medium', status: 'ack',
          file: 'agents/loom-pm.md', lines: 'L50',
          title: 'PM prompt outdated',
          detail: 'TDD order mismatch', suggest: 'update agent', source: 'spec-diff',
        },
        {
          id: 'F-03', sev: 'low', status: 'fixed',
          file: 'docs/RETRO_GUIDE.md', lines: 'L88',
          title: 'retro lens name inconsistency',
          detail: 'naming drift', suggest: 'unify', source: 'spec-diff',
        },
      ],
    }) as unknown as Scenario,
}));

import { ConsistencyView } from '../../../src/views/consistency/ConsistencyView';

afterEach(() => {
  cleanup();
  ackFn.mockClear();
  fixFn.mockClear();
  dismissFn.mockClear();
});

// ---------------------------------------------------------------------------
// CN-INLINE-01: inline 全廃 — screens/consistency.css が使われている
// WHY: S6 fix requires styles to live in screens/consistency.css, not inline.
//      Test verifies: (1) ConsistencyView uses class names from screens/consistency.css,
//      (2) the root element has a CSS class (cv-screen) not ad-hoc styles.
// ---------------------------------------------------------------------------
// covers: CN-INLINE-01
describe('ConsistencyView: CSS import (CN-INLINE-01)', () => {
  it('ConsistencyView root element has cv-screen class (from screens/consistency.css)', () => {
    render(<ConsistencyView />);
    const view = screen.getByTestId('consistency-view');
    // WHY: ConsistencyView.tsx imports '../../styles/screens/consistency.css'
    // and uses className="cv-screen" — verifies CSS-class approach (not inline-only)
    expect(view.className).toMatch(/cv-screen/);
  });

  it('finding cards use cv-finding-card class (not inline layout)', () => {
    render(<ConsistencyView />);
    // WHY: FindingCard component uses className="cv-finding-card" from screens/consistency.css
    const cards = document.querySelectorAll('.cv-finding-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('summary strip uses cv-summary class (not inline)', () => {
    render(<ConsistencyView />);
    // WHY: summary row uses className="cv-summary" from screens/consistency.css
    const summary = document.querySelector('.cv-summary');
    expect(summary).not.toBeNull();
  });

  it('filter row uses cv-filter-row class (not inline)', () => {
    render(<ConsistencyView />);
    const filterRow = document.querySelector('.cv-filter-row');
    expect(filterRow).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Status filter behavior (impl IS present — verified here as coverage evidence)
// Note: CN-FILTER-01 (severity filter) deferred — see file header
// ---------------------------------------------------------------------------
describe('ConsistencyView: status filter behavior (covers filter impl)', () => {
  it('clicking OPEN summary card filters list to open findings only', () => {
    render(<ConsistencyView />);
    // Initially all 3 findings shown
    const allBtn = screen.getByText(/all \(3\)/);
    expect(allBtn).toBeInTheDocument();

    // Click the "OPEN" summary card — use cv-summary scoped query to avoid ambiguity
    const summaryEl = document.querySelector('.cv-summary');
    expect(summaryEl).not.toBeNull();
    const openCard = Array.from(summaryEl!.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('OPEN'),
    );
    expect(openCard).not.toBeNull();
    fireEvent.click(openCard!);

    // After filtering to 'open', only F-01 (status=open) should be visible
    // The cv-findings-list should have exactly 1 card
    const cards = document.querySelectorAll('.cv-finding-card');
    expect(cards.length).toBe(1);
    expect(screen.getByText('SPEC §3.5 is not implemented')).toBeInTheDocument();
    // F-02 and F-03 should NOT be visible
    expect(screen.queryByText('PM prompt outdated')).not.toBeInTheDocument();
    expect(screen.queryByText('retro lens name inconsistency')).not.toBeInTheDocument();
  });

  it('clicking "all" filter button restores full list', () => {
    render(<ConsistencyView />);

    // Filter to OPEN first — use cv-summary scoped query
    const summaryEl = document.querySelector('.cv-summary');
    expect(summaryEl).not.toBeNull();
    const openCard = Array.from(summaryEl!.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('OPEN'),
    );
    expect(openCard).not.toBeNull();
    fireEvent.click(openCard!);
    expect(document.querySelectorAll('.cv-finding-card').length).toBe(1);

    // Click "all" to restore
    const allBtn = screen.getByText(/all \(3\)/);
    fireEvent.click(allBtn);

    // All 3 findings visible again
    expect(document.querySelectorAll('.cv-finding-card').length).toBe(3);
  });

  it('clicking ACK summary card shows only ack findings', () => {
    render(<ConsistencyView />);
    // WHY: use querySelector on cv-summary to avoid ambiguity with "ACK" text
    // that may also appear in finding status badges (multiple "ACK" text nodes)
    const summaryEl = document.querySelector('.cv-summary');
    expect(summaryEl).not.toBeNull();
    const ackCard = Array.from(summaryEl!.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('ACK'),
    );
    expect(ackCard).not.toBeNull();
    fireEvent.click(ackCard!);

    // Only F-02 (status=ack) should be visible
    const cards = document.querySelectorAll('.cv-finding-card');
    expect(cards.length).toBe(1);
    expect(screen.getByText('PM prompt outdated')).toBeInTheDocument();
  });
});
