/**
 * ConsistencyViewLive — live tRPC-wired consistency finding view.
 *
 * WHY separate from ConsistencyView.tsx: M4 t5 full implementation wired to
 * daemon data, replacing static mock. ConsistencyView.tsx is kept as-is for
 * backward compatibility; ConsistencyViewLive is the M4+ primary component.
 *
 * Features:
 *   - Severity-based grouping (high / medium / low sections)
 *   - Status filter (all / open / acknowledged / fixed / dismissed)
 *   - 4 action buttons per finding row (Ack / Fix / Dismiss / Editor)
 *   - Loading / error / empty states
 *   - data-testid complete per SPEC §7.5 Step 6 + M4 t5 task spec
 *
 * SPEC §7.5 Step 6 / SCREEN_REQUIREMENTS §3.4 / §4.3
 */

import { useState } from 'react';
import { useConsistencyFindings } from '../../live/useConsistencyFindings';
import { useConsistencyMutations } from '../../live/useConsistencyMutations';
import {
  FINDING_SEVERITY,
  FINDING_STATUS,
} from '@claude-loom/daemon';
import type { ConsistencyFinding, FindingStatus } from '@claude-loom/daemon';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// WHY: Use FindingStatus from daemon SSoT instead of raw string literals (§3.6.10).
// 'all' extends the type for the "no filter" UI option.
type StatusFilter = 'all' | FindingStatus;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityLabel(sev: string): string {
  if (sev === FINDING_SEVERITY.HIGH) return 'HIGH';
  if (sev === FINDING_SEVERITY.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

function severityClasses(sev: string): string {
  if (sev === FINDING_SEVERITY.HIGH) return 'bg-error text-white';
  if (sev === FINDING_SEVERITY.MEDIUM) return 'bg-accent text-white';
  return 'bg-bg3 text-text-muted';
}

function statusBadgeClasses(status: string): string {
  if (status === FINDING_STATUS.ACKNOWLEDGED) return 'bg-accent text-white';
  if (status === FINDING_STATUS.FIXED) return 'bg-success text-white';
  if (status === FINDING_STATUS.DISMISSED) return 'bg-bg3 text-text-muted';
  return '';
}

// ---------------------------------------------------------------------------
// FindingRow sub-component
// ---------------------------------------------------------------------------

interface FindingRowProps {
  finding: ConsistencyFinding;
  onAck: (id: number) => void;
  onFix: (id: number) => void;
  onDismiss: (id: number) => void;
  onEditor: (path: string) => void;
}

function FindingRow({ finding: f, onAck, onFix, onDismiss, onEditor }: FindingRowProps): JSX.Element {
  const isOpen = f.status === FINDING_STATUS.OPEN;
  const isAcknowledged = f.status === FINDING_STATUS.ACKNOWLEDGED;
  const isFixed = f.status === FINDING_STATUS.FIXED;
  const isDismissed = f.status === FINDING_STATUS.DISMISSED;
  const isResolved = isFixed || isDismissed;

  return (
    <div
      data-testid="finding-row"
      className={`bg-bg1 border-2 border-border p-sp-3 flex flex-col gap-sp-2 ${isResolved ? 'opacity-60' : ''}`}
    >
      {/* Top row: severity + id + title */}
      <div className="flex gap-sp-2 items-start">
        <span
          className={`text-fs-xs font-bold px-sp-2 py-0.5 border border-border uppercase tracking-widest shrink-0 mt-0.5 ${severityClasses(f.severity)}`}
        >
          {severityLabel(f.severity)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex gap-sp-2 items-center flex-wrap mb-1">
            <span className="font-mono text-fs-xs text-text-muted">#{f.id}</span>
            {(isAcknowledged || isFixed || isDismissed) && (
              <span className={`text-fs-xs font-bold px-sp-1 py-0.5 border border-border ${statusBadgeClasses(f.status)}`}>
                {f.status.toUpperCase()}
              </span>
            )}
          </div>
          <div className="font-mono text-fs-xs text-accent mb-1">{f.targetPath}</div>
          <div className="text-fs-xs text-fg2 leading-relaxed mb-1">{f.description}</div>
          {f.suggestedChange && (
            <div className="text-fs-xs p-sp-2 bg-bg3 border border-dashed border-border leading-relaxed">
              <span className="font-bold text-success">提案 ▶</span> {f.suggestedChange}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-sp-1 mt-sp-2 items-center flex-wrap">
            {/* Open in Editor — shown for non-dismissed */}
            {!isDismissed && (
              <button
                data-testid="action-editor"
                className="text-fs-xs px-sp-2 py-0.5 border border-border bg-bg2 text-fg1 hover:bg-bg3"
                onClick={() => onEditor(f.targetPath)}
              >
                Open in Editor
              </button>
            )}
            {/* Acknowledge — only for open */}
            {isOpen && (
              <button
                data-testid="action-ack"
                className="text-fs-xs px-sp-2 py-0.5 border border-border bg-accent text-white"
                onClick={() => onAck(f.id)}
              >
                Acknowledge
              </button>
            )}
            {/* Mark Fixed — for open and acknowledged */}
            {(isOpen || isAcknowledged) && (
              <button
                data-testid="action-fix"
                className="text-fs-xs px-sp-2 py-0.5 border border-border bg-bg2 text-fg1 hover:bg-bg3"
                onClick={() => onFix(f.id)}
              >
                Mark Fixed
              </button>
            )}
            {/* Dismiss — only for open */}
            {isOpen && (
              <button
                data-testid="action-dismiss"
                className="text-fs-xs px-sp-2 py-0.5 border border-border bg-bg2 text-text-muted"
                onClick={() => onDismiss(f.id)}
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SeverityGroup sub-component
// ---------------------------------------------------------------------------

interface SeverityGroupProps {
  severity: string;
  findings: ConsistencyFinding[];
  onAck: (id: number) => void;
  onFix: (id: number) => void;
  onDismiss: (id: number) => void;
  onEditor: (path: string) => void;
}

function SeverityGroup({
  severity,
  findings,
  onAck,
  onFix,
  onDismiss,
  onEditor,
}: SeverityGroupProps): JSX.Element | null {
  if (findings.length === 0) return null;

  const testId = `severity-group-${severity}`;
  const label = severityLabel(severity);
  const headerClasses = severityClasses(severity);

  return (
    <div data-testid={testId} className="flex flex-col gap-sp-1">
      <div className={`text-fs-xs font-bold px-sp-2 py-0.5 self-start border border-border uppercase tracking-widest ${headerClasses}`}>
        {label} ({findings.length})
      </div>
      <div className="flex flex-col gap-sp-1 pl-sp-2 border-l-2 border-border">
        {findings.map((f) => (
          <FindingRow
            key={f.id}
            finding={f}
            onAck={onAck}
            onFix={onFix}
            onDismiss={onDismiss}
            onEditor={onEditor}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ConsistencyViewLive(): JSX.Element {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { data, isLoading, error } = useConsistencyFindings();
  const { acknowledgeFinding, markFindingFixed, dismissFinding, openInEditor } = useConsistencyMutations();

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div data-testid="consistency-view" className="bg-bg2 rounded-card p-sp-4 flex flex-col gap-sp-3">
        <span data-testid="consistency-loading" className="text-fg2 text-fs-sm">読み込み中…</span>
      </div>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <div data-testid="consistency-view" className="bg-bg2 rounded-card p-sp-4 flex flex-col gap-sp-3">
        <span data-testid="consistency-error" className="text-error text-fs-sm">接続エラー</span>
      </div>
    );
  }

  // ---- Empty / data state ----
  const findings = data ?? [];

  // Apply status filter
  const filtered = statusFilter === 'all'
    ? findings
    : findings.filter((f) => f.status === statusFilter);

  // Group by severity
  const highFindings = filtered.filter((f) => f.severity === FINDING_SEVERITY.HIGH);
  const mediumFindings = filtered.filter((f) => f.severity === FINDING_SEVERITY.MEDIUM);
  const lowFindings = filtered.filter((f) => f.severity === FINDING_SEVERITY.LOW);

  // Summary counts (from all findings, not filtered — WHY: header should show total state)
  const openCount = findings.filter((f) => f.status === FINDING_STATUS.OPEN).length;

  return (
    <div
      data-testid="consistency-view"
      className="bg-bg2 rounded-card p-sp-4 flex flex-col gap-sp-3"
    >
      {/* Header */}
      <div className="flex items-center gap-sp-3 flex-wrap">
        <span
          data-testid="consistency-title"
          className="text-fs-md font-bold text-fg1"
        >
          整合性 — Consistency Findings
        </span>
        {openCount > 0 && (
          <span className="text-fs-xs font-bold px-sp-2 py-0.5 bg-error text-white border border-border">
            NEW {openCount}
          </span>
        )}
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-sp-2">
        <label className="text-fs-xs text-text-muted uppercase tracking-widest" htmlFor="status-filter">
          FILTER
        </label>
        <select
          id="status-filter"
          data-testid="status-filter"
          className="text-fs-xs px-sp-2 py-0.5 border border-border bg-bg1 text-fg1"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="all">All</option>
          <option value={FINDING_STATUS.OPEN}>Open</option>
          <option value={FINDING_STATUS.ACKNOWLEDGED}>Acknowledged</option>
          <option value={FINDING_STATUS.FIXED}>Fixed</option>
          <option value={FINDING_STATUS.DISMISSED}>Dismissed</option>
        </select>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div data-testid="consistency-empty" className="text-fg2 text-fs-sm py-sp-4 text-center">
          {findings.length === 0 ? '整合性問題は検出されていません' : 'このフィルターに一致する Finding はありません'}
        </div>
      )}

      {/* Severity groups */}
      {filtered.length > 0 && (
        <div className="flex flex-col gap-sp-3">
          <SeverityGroup
            severity={FINDING_SEVERITY.HIGH}
            findings={highFindings}
            onAck={acknowledgeFinding}
            onFix={markFindingFixed}
            onDismiss={dismissFinding}
            onEditor={openInEditor}
          />
          <SeverityGroup
            severity={FINDING_SEVERITY.MEDIUM}
            findings={mediumFindings}
            onAck={acknowledgeFinding}
            onFix={markFindingFixed}
            onDismiss={dismissFinding}
            onEditor={openInEditor}
          />
          <SeverityGroup
            severity={FINDING_SEVERITY.LOW}
            findings={lowFindings}
            onAck={acknowledgeFinding}
            onFix={markFindingFixed}
            onDismiss={dismissFinding}
            onEditor={openInEditor}
          />
        </div>
      )}
    </div>
  );
}
