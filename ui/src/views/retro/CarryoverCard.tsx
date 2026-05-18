/**
 * CarryoverCard — displays a pending lifecycle finding in the CARRYOVER column.
 *
 * WHY: Carryover findings need 4 lifecycle-specific UI elements beyond normal
 * finding cards:
 *   1. carryover_count pip (▢▢▣ = 1/3, ▢▣▣ = 2/3, ▣▣▣ = 3/3)
 *   2. verdict 4-way badge (promoted / auto-expire / lens-drop / null)
 *   3. last_seen_in + re_evaluated_in metadata footer
 *   4. reconstructed_from_archive marker for archive-derived findings
 *
 * Pip format: 3 characters, MSB on right, filled = ▣, empty = ▢.
 *   count=1 → ▢▢▣
 *   count=2 → ▢▣▣
 *   count=3 → ▣▣▣
 *
 * spec/daemon-and-data.md §4.9.8 (pending_summary schema)
 * spec/retro-system.md §1.16 (pending lifecycle architecture)
 * REQ-116..REQ-119.
 */
import type { PendingSummaryFinding } from '../../live/useRetroLifecycle';

// ---------------------------------------------------------------------------
// Constants (WHY: typed constants prevent string literal drift per §2.2)
// ---------------------------------------------------------------------------

/** Pip character constants for monospace display. */
const PIP = {
  FILLED: '▣',
  EMPTY:  '▢',
} as const;

const MAX_CARRYOVER = 3;

/** WHY: verdict labels are UI strings, typed so future i18n is easy. */
const VERDICT_LABEL = {
  promoted:    '🔄 promoted',
  auto_expire: '⏳ auto-expire',
  lens_drop:   '❌ lens-drop',
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build pip string from carryover_count (1-3).
 * count=1 → ▢▢▣, count=2 → ▢▣▣, count=3 → ▣▣▣
 *
 * WHY: pip shows how close a finding is to auto-expiry (3-strike rule,
 * spec/retro-system.md §1.16). Visual indicator helps user act on old findings.
 */
function buildPip(count: number): string {
  const capped = Math.min(Math.max(count, 0), MAX_CARRYOVER);
  const chars = [];
  for (let i = 0; i < MAX_CARRYOVER; i++) {
    // Fill from right: position 0 is leftmost (most empty), rightmost is newest
    chars.push(i < MAX_CARRYOVER - capped ? PIP.EMPTY : PIP.FILLED);
  }
  return chars.join('');
}

/**
 * Derive the verdict display from the finding's lifecycle state.
 * Returns null if no special verdict applies.
 */
function deriveVerdict(finding: PendingSummaryFinding): string | null {
  if (finding.status === 'expired') {
    return VERDICT_LABEL.auto_expire;
  }
  if (finding.re_evaluated_in !== null) {
    return VERDICT_LABEL.promoted;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CarryoverCardProps {
  finding: PendingSummaryFinding & { reconstructed_from_archive?: boolean };
}

export function CarryoverCard({ finding }: CarryoverCardProps): JSX.Element {
  const pip = buildPip(finding.carryover_count);
  const verdict = deriveVerdict(finding);
  const isReconstructed = finding.reconstructed_from_archive === true;

  return (
    <div
      data-testid={`carryover-card-${finding.finding_id}`}
      data-reconstructed={isReconstructed ? 'true' : null}
      className={`retro-card retro-card--carryover${isReconstructed ? ' retro-card--archive' : ''}`}
    >
      {/* Archive marker */}
      {isReconstructed && (
        <span className="retro-card__archive-marker" aria-label="reconstructed from archive">
          archive
        </span>
      )}

      {/* Finding title */}
      <div className="retro-card__title">
        {finding.summary}
      </div>

      {/* Pip + verdict row */}
      <div className="retro-card__pip-row">
        <span
          data-testid="carryover-pip"
          className="retro-card__pip"
          title={`Carryover count: ${finding.carryover_count}/${MAX_CARRYOVER}`}
        >
          {pip}
        </span>
        {verdict !== null && (
          <span
            data-testid="carryover-verdict"
            className="retro-card__verdict"
          >
            {verdict}
          </span>
        )}
      </div>

      {/* Metadata footer */}
      <div className="retro-card__meta">
        <span
          data-testid="carryover-last-seen"
          className="retro-card__meta-item"
        >
          last seen: {finding.last_seen_in}
        </span>
        {finding.re_evaluated_in !== null && (
          <span
            data-testid="carryover-re-evaluated"
            className="retro-card__meta-item"
          >
            re-eval: {finding.re_evaluated_in}
          </span>
        )}
      </div>

      {/* Origin badge */}
      <div className="retro-card__origin">
        <span className="chip">{finding.origin_retro_id}</span>
        <span className="chip">{finding.lens}</span>
      </div>
    </div>
  );
}
