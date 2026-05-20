/**
 * AdminPanel — admin actions for retro state management.
 *
 * WHY: Retro state durability (spec/retro-system.md §1.12) requires UI escape
 * hatches when .claude-loom/retro/<id>/pending.json is missing or corrupt.
 * This panel provides 3 admin actions:
 *
 *   1. ↻ Reconstruct from archive markdown
 *      → calls trpc.retro.reconstructFromArchive.useQuery.refetch()
 *      → daemon/src/routes/retro.ts:366 reconstructFromArchive procedure
 *
 *   2. 📄 pending_summary.json 再生成
 *      → placeholder (Phase 3+ scope per task spec)
 *
 *   3. ↺ approval.decide retry (NOT_FOUND 検知時)
 *      → placeholder (Phase 3 t7 で NOT_FOUND toast 配線とリンク)
 *
 * Collapsed by default (⚙ admin toggle) — power user feature, not daily flow.
 *
 * REQ-120..REQ-122.
 */
import { useState } from 'react';
import { trpc } from '../../trpc/client';

interface AdminPanelProps {
  /** WHY optional: mirrors RetroViewProps.retroId; empty string when URL param not yet wired */
  retroId?: string;
}

export function AdminPanel({ retroId = '' }: AdminPanelProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);

  // WHY: We use refetch() on a disabled query as a manual trigger mechanism
  // (YAGNI: no dedicated mutation endpoint exists yet for this UI path).
  const reconstructQuery = trpc.retro.reconstructFromArchive.useQuery(
    { retroId },
    { enabled: false },  // WHY: only trigger on user action, not on mount
  );

  function handleReconstruct(): void {
    void reconstructQuery.refetch();
  }

  function handlePendingSummaryRebuild(): void {
    // Phase 3+ scope — placeholder per task spec
    // WHY: retro-system.md §1.16 pending_summary lazy build is Stage 0 work,
    // UI trigger for manual rebuild is Phase 3+ (task spec note: "placeholder OK")
  }

  function handleApprovalRetry(): void {
    // Phase 3 t7 scope — NOT_FOUND toast wiring placeholder
    // WHY: spec/ui-arch.md §1.4 NOT_FOUND toast event is Phase 3 t7 scope
  }

  return (
    <div
      data-testid="admin-panel"
      className="retro-admin"
    >
      {/* Toggle button — always visible */}
      <button
        type="button"
        data-testid="admin-toggle"
        className="retro-admin__toggle btn-px ghost"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        {expanded ? '▲ admin' : '⚙ admin'}
      </button>

      {/* Expanded content — only rendered when expanded */}
      {expanded && (
        <div
          data-testid="admin-panel-content"
          className="retro-admin__content"
        >
          <button
            type="button"
            data-testid="admin-btn-reconstruct"
            className="retro-admin__btn btn-px ghost"
            onClick={handleReconstruct}
            title="Reconstruct pending.json from docs/retro/<id>-report.md archive"
          >
            ↻ Reconstruct from archive markdown
          </button>

          <button
            type="button"
            data-testid="admin-btn-pending-summary"
            className="retro-admin__btn btn-px ghost"
            onClick={handlePendingSummaryRebuild}
            title="Rebuild pending_summary.json from all retro session pending.json files"
          >
            📄 pending_summary.json 再生成
          </button>

          <button
            type="button"
            data-testid="admin-btn-approval-retry"
            className="retro-admin__btn btn-px ghost"
            onClick={handleApprovalRetry}
            title="Retry approval.decide when NOT_FOUND error detected (Phase 3 t7 wiring)"
          >
            ↺ approval.decide retry
          </button>
        </div>
      )}
    </div>
  );
}
