/**
 * RetroView — KPT 4-column board + lifecycle pip + admin section.
 *
 * WHY: M0.18 t2 replaces the previous 2-column LensCard+FindingRow layout
 * with a KPT board that surfaces:
 *   - KEEP: good practices maintained (Phase 1 placeholder, Phase 2+ intake)
 *   - PROBLEM: current retro new findings
 *   - CARRYOVER: pending_summary.json findings (carryover_count >= 1)
 *   - TRY: aggregator confirmed action plan
 *
 * Backend: daemon/src/routes/retro.ts:366 reconstructFromArchive (admin)
 * Lifecycle data: useRetroLifecycle hook (pending_summary.json + current)
 * Design SSoT: docs/design/2026-05-17-m0.18-ui-rework (KPT board layout)
 * spec SSoT: spec/retro-system.md §1.16 + spec/daemon-and-data.md §4.9.8
 *
 * REQ-115..REQ-122.
 */

import { KptColumn } from './KptColumn';
import { CarryoverCard } from './CarryoverCard';
import { AdminPanel } from './AdminPanel';
import { useRetroLifecycle } from '../../live/useRetroLifecycle';
import type { KeepItem, ProblemItem, TryItem } from '../../live/useRetroLifecycle';
import '../../styles/screens/retro.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** WHY: severity color map prevents string drift (spec/ui-arch.md §2.2). */
const SEV_COLOR: Record<string, string> = {
  high: 'var(--p-error)',
  med:  'var(--p-warn)',
  low:  'var(--p-stone)',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KeepCard({ item }: { item: KeepItem }): JSX.Element {
  return (
    <div
      data-testid={`keep-card-${item.id}`}
      className="retro-card retro-card--keep"
    >
      <div className="retro-card__title">{item.title}</div>
    </div>
  );
}

function ProblemCard({ item }: { item: ProblemItem }): JSX.Element {
  return (
    <div
      data-testid={`problem-card-${item.id}`}
      className="retro-card retro-card--problem"
    >
      <div className="retro-card__header">
        <span
          className="retro-card__sev-bar"
          style={{ background: SEV_COLOR[item.sev] ?? 'var(--p-stone)' }}
        />
        <span className="retro-card__id">{item.id}</span>
        <span className="retro-card__title">{item.title}</span>
      </div>
      <div className="retro-card__meta">
        {item.lens} · {item.target} · {item.status}
      </div>
    </div>
  );
}

function TryCard({ item }: { item: TryItem }): JSX.Element {
  return (
    <div
      data-testid={`try-card-${item.id}`}
      className="retro-card retro-card--try"
    >
      <div className="retro-card__title">{item.title}</div>
      <div className="retro-card__meta">from: {item.from}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading / error states
// ---------------------------------------------------------------------------

function KeepPlaceholder(): JSX.Element {
  return (
    <div className="retro-card retro-card--placeholder">
      <div className="retro-card__title" style={{ color: 'var(--p-text-muted)' }}>
        KEEP items: Phase 2+ で intake source 追加予定
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RetroViewProps {
  /**
   * The retro session ID — used for admin panel tRPC calls.
   * WHY optional: routes.tsx mounts <RetroView /> without props;
   * retroId comes from URL param (Phase 3+ scope). Defaults to empty
   * string until URL-param wiring is added.
   */
  retroId?: string;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RetroView({ retroId = '' }: RetroViewProps): JSX.Element {
  const {
    keepItems,
    problemItems,
    carryoverItems,
    tryItems,
    isLoading,
    error,
  } = useRetroLifecycle();

  if (isLoading) {
    return (
      <div data-testid="retro-view" className="retro-screen">
        <div className="retro-loading">Loading retro data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="retro-view" className="retro-screen">
        <div className="retro-error">Error: {error.message}</div>
      </div>
    );
  }

  return (
    <div data-testid="retro-view" className="retro-screen">
      {/* Header with admin panel */}
      <div className="retro-header">
        <div className="retro-header__title">
          ⬡ Retro KPT Board
        </div>
        <div className="retro-header__spacer" />
        <AdminPanel retroId={retroId} />
      </div>

      {/* 4-column KPT board */}
      <div className="retro-kpt">
        {/* KEEP column */}
        <KptColumn kind="keep" title="KEEP" count={keepItems.length}>
          {keepItems.length === 0
            ? <KeepPlaceholder />
            : keepItems.map((item) => (
                <KeepCard key={item.id} item={item} />
              ))
          }
        </KptColumn>

        {/* PROBLEM column */}
        <KptColumn kind="problem" title="PROBLEM" count={problemItems.length}>
          {problemItems.map((item) => (
            <ProblemCard key={item.id} item={item} />
          ))}
        </KptColumn>

        {/* CARRYOVER column */}
        <KptColumn kind="carryover" title="CARRYOVER" count={carryoverItems.length}>
          {carryoverItems.map((item) => (
            <CarryoverCard key={item.finding_id} finding={item} />
          ))}
        </KptColumn>

        {/* TRY column */}
        <KptColumn kind="try" title="TRY" count={tryItems.length}>
          {tryItems.map((item) => (
            <TryCard key={item.id} item={item} />
          ))}
        </KptColumn>
      </div>
    </div>
  );
}
