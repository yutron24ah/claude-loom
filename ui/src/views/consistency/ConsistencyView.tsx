/**
 * ConsistencyView — SPEC 変更検知 + finding 管理 UI.
 * WHY: Visual audit of doc/spec consistency violations; enables triage actions.
 * SCREEN_REQUIREMENTS §3.4 / §4.3
 * Ported from redesign/screens/consistency.jsx (M0.15 t11).
 * Data source: useScenario().findings + useScenario().consistencyState
 * (replaces M0.11.4 hardcoded MOCK_FINDINGS fixture).
 * Write hookup (ack/fix/dismiss) wired in M0.15 t16 via useConsistencyMutations.
 * REQ-073, REQ-077
 */
import { useState } from 'react';
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { Finding, FindingSeverity, FindingStatus, ConsistencyState } from '@claude-loom/redesign/api/types';
import { useConsistencyMutations } from '../../live/useConsistencyMutations';
import '../../styles/screens/consistency.css';

// ---------------------------------------------------------------------------
// Re-export types for downstream consumers
// ---------------------------------------------------------------------------
export type { Finding, FindingSeverity, FindingStatus, ConsistencyState };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// WHY: typed constants prevent string literal drift across components (SPEC §3.6.10)
const SEV_COLOR: Record<FindingSeverity, string> = {
  high: 'var(--p-error)',
  medium: 'var(--p-warn)',
  low: 'var(--p-stone)',
};

function statusDotClass(status: FindingStatus): string {
  if (status === 'open') return 'dot fail';
  if (status === 'ack') return 'dot tdd';
  if (status === 'fixed') return 'dot busy';
  return 'dot idle';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface FindingCardProps {
  finding: Finding;
  // WHY: Finding.id is string in redesign types (e.g. 'F-12').
  // Callbacks accept string; ConsistencyView translates to number for daemon mutations.
  onAck: (id: string) => void;
  onFix: (id: string) => void;
  onDismiss: (id: string) => void;
  // WHY: Finding.file (not targetPath) is the field name in redesign Finding type.
  onOpenEditor: (file: string) => void;
}

function FindingCard({ finding: f, onAck, onFix, onDismiss, onOpenEditor }: FindingCardProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const isOpen = f.status === 'open';
  const isAck = f.status === 'ack';
  const isFixed = f.status === 'fixed';
  const isDismissed = f.status === 'dismissed';

  return (
    <div
      data-testid="finding-card"
      className="cv-finding-card"
      style={{ opacity: isFixed || isDismissed ? 0.55 : 1 }}
    >
      <div className="cv-finding-card__top">
        {/* Severity badge with data-sev attribute + finding-severity testid */}
        <div
          data-testid="finding-severity"
          data-sev={f.sev}
          className="cv-finding-card__sev-badge"
          style={{ background: SEV_COLOR[f.sev] }}
        >
          {f.sev === 'high' && <span data-testid="severity-high">{f.sev}</span>}
          {f.sev === 'medium' && <span data-testid="severity-medium">{f.sev}</span>}
          {f.sev === 'low' && <span data-testid="severity-low">{f.sev}</span>}
        </div>

        <div className="cv-finding-card__body">
          {/* Title row: id, title, status chip + dot */}
          <div className="cv-finding-card__title-row">
            <span className="cv-finding-card__id">{f.id}</span>
            <span className="cv-finding-card__title">{f.title}</span>
            {/* Status chip (for non-open) */}
            {isAck && (
              <span
                data-testid={`status-badge-${f.id}`}
                className="chip"
                style={{ background: 'var(--p-warn)', color: 'white', borderColor: 'var(--p-warn)' }}
              >
                ACK
              </span>
            )}
            {isFixed && (
              <span
                data-testid={`status-badge-${f.id}`}
                className="chip"
                style={{ background: 'var(--p-success)', color: 'white', borderColor: 'var(--p-success)' }}
              >
                FIXED
              </span>
            )}
            {isDismissed && (
              <span
                data-testid={`status-badge-${f.id}`}
                className="chip"
                style={{ background: 'var(--p-stone)', color: 'white', borderColor: 'var(--p-stone)' }}
              >
                DISMISSED
              </span>
            )}
            {/* Status dot indicator */}
            <span className={statusDotClass(f.status)} />
          </div>

          {/* File path + lines */}
          <div className="cv-finding-card__file">
            {f.file} <span className="cv-finding-card__lines">{f.lines}</span>
          </div>

          {/* Expand/collapse detail+suggest */}
          <button
            data-testid={`expand-btn-${f.id}`}
            className="btn-px ghost cv-finding-card__expand-btn"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? '▲ 詳細を閉じる' : '▼ 詳細・提案を表示'}
          </button>

          {expanded && (
            <>
              {/* Detail text */}
              <div
                data-testid={`detail-${f.id}`}
                className="cv-finding-card__detail"
              >
                {f.detail}
              </div>
              {/* Suggestion box */}
              <div
                data-testid={`suggest-${f.id}`}
                className="cv-finding-card__suggest"
              >
                <span className="cv-finding-card__suggest-label">提案 ▶</span> {f.suggest}
              </div>
            </>
          )}

          {/* Action buttons — wired to useConsistencyMutations (M0.15 t16) */}
          <div className="cv-finding-card__actions">
            {/* Open in Editor — for open and ack (backward compat) */}
            {(isOpen || isAck) && (
              <button
                data-testid="action-open-editor"
                data-action="open-editor"
                className="btn-px ghost cv-action-btn"
                onClick={() => onOpenEditor(f.file)}
              >
                Open in Editor
              </button>
            )}
            {/* Acknowledge */}
            {isOpen && (
              <button
                data-testid="action-acknowledge"
                data-action="ack"
                className="btn-px primary cv-action-btn"
                onClick={() => onAck(f.id)}
              >
                Acknowledge
              </button>
            )}
            {/* Mark Fixed */}
            {(isOpen || isAck) && (
              <button
                data-testid="action-mark-fixed"
                data-action="fix"
                className="btn-px ghost cv-action-btn"
                onClick={() => onFix(f.id)}
              >
                Mark Fixed
              </button>
            )}
            {/* Dismiss */}
            {isOpen && (
              <button
                data-testid="action-dismiss"
                data-action="dismiss"
                className="btn-px ghost cv-action-btn--dismiss"
                onClick={() => onDismiss(f.id)}
              >
                Dismiss
              </button>
            )}
            {/* Discuss — Phase 5 noop */}
            {isOpen && (
              <button
                data-testid="action-discuss"
                data-action="discuss"
                className="btn-px ghost cv-action-btn"
                onClick={() => undefined}
              >
                Discuss
              </button>
            )}
            <span className="cv-finding-card__source">{f.source}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ConsistencyView(): JSX.Element {
  const sc = useScenario();
  const findings: Finding[] = sc.findings ?? [];
  const consistencyState: ConsistencyState = sc.consistencyState ?? 'empty';
  const { acknowledgeFinding, markFindingFixed, dismissFinding, openInEditor } = useConsistencyMutations();
  // WHY: redesign has clickable summary cards that filter the list; mirrors consistency.jsx setFilter
  const [filter, setFilter] = useState<string>('all');
  const [running, setRunning] = useState(false);

  // WHY: redesign Finding.id is string (e.g. 'F-12'); daemon uses numeric IDs.
  // parseInt extracts the numeric portion for daemon mutation calls.
  // Non-numeric IDs (e.g. pure string) will produce NaN — acceptable for M0.15 scope
  // as all mock IDs follow the 'F-NN' pattern.
  function handleAck(id: string): void { acknowledgeFinding(parseInt(id.replace(/\D/g, ''), 10)); }
  function handleFix(id: string): void { markFindingFixed(parseInt(id.replace(/\D/g, ''), 10)); }
  function handleDismiss(id: string): void { dismissFinding(parseInt(id.replace(/\D/g, ''), 10)); }

  // Summary counts
  const openCount = findings.filter((f) => f.status === 'open').length;
  const ackCount = findings.filter((f) => f.status === 'ack').length;
  const fixedCount = findings.filter((f) => f.status === 'fixed').length;
  const dismissedCount = findings.filter((f) => f.status === 'dismissed').length;

  // Filtered list — mirrors redesign consistency.jsx filter logic
  const list = filter === 'all' ? findings : findings.filter((f) => f.status === filter);

  // Running state override — button triggers local running animation (matches redesign)
  const isRunning = running || consistencyState === 'running';

  return (
    <div
      data-testid="consistency-view"
      className="cv-screen"
    >
      {/* Header — matches redesign: title + since chip + spacer + チェック実行 button */}
      <div className="cv-header">
        <div
          data-testid="consistency-title"
          className="cv-header__title"
        >
          📜 整合性 — Consistency Findings
        </div>
        <span className="chip">since: 2 hours ago</span>
        <div className="cv-header__spacer" />
        {/* チェック実行 button — matches redesign with running animation */}
        <button
          className="btn-px primary"
          onClick={() => { setRunning(true); setTimeout(() => setRunning(false), 1500); }}
        >
          {isRunning ? '▶ 実行中…' : '▶ チェック実行'}
        </button>
      </div>

      {/* State: running — redesign shows progress bar */}
      {isRunning && (
        <div
          data-testid="consistency-running"
          className="cv-running"
        >
          <b>spec_diff 実行中</b> — agents/ skills/ docs/ を scan 中…
          <div className="cv-running__progress-track">
            <div className="cv-running__progress-fill" />
          </div>
        </div>
      )}

      {/* State: empty */}
      {!isRunning && findings.length === 0 && (
        <div
          data-testid="consistency-empty"
          className="cv-empty"
        >
          <div className="cv-empty__icon">📭</div>
          <div className="cv-empty__title">整合性違反は検出されていません</div>
          <div className="cv-empty__hint">
            SPEC.md と agent/skill prompts を最後に scan した結果。<br />
            新しい変更が入ると自動的に検出されます。
          </div>
        </div>
      )}

      {/* State: has-findings — redesign shows summary strip + filter + finding cards */}
      {!isRunning && findings.length > 0 && (
        <>
          {/* Summary strip — clickable cards that filter the list (matches redesign) */}
          <div className="cv-summary">
            {[
              { label: 'OPEN',      filterKey: 'open',      n: openCount,      color: 'var(--p-error)' },
              { label: 'ACK',       filterKey: 'ack',       n: ackCount,       color: 'var(--p-warn)' },
              { label: 'FIXED',     filterKey: 'fixed',     n: fixedCount,     color: 'var(--p-success)' },
              { label: 'DISMISSED', filterKey: 'dismissed', n: dismissedCount, color: 'var(--p-stone)' },
            ].map((s) => (
              <button
                key={s.label}
                onClick={() => setFilter(s.filterKey)}
                className="cv-summary-card"
                style={{
                  background: filter === s.filterKey ? 'var(--p-accent-soft)' : 'var(--p-paper)',
                  border: `2px solid ${filter === s.filterKey ? 'var(--p-accent)' : 'var(--p-border)'}`,
                }}
              >
                <div className="rpg-label cv-summary-card__lbl">{s.label}</div>
                <div className="cv-summary-card__count" style={{ color: s.color }}>{s.n}</div>
              </button>
            ))}
          </div>

          {/* "all" filter button — matches redesign */}
          <div className="cv-filter-row">
            <button
              className={`btn-px ${filter === 'all' ? 'primary' : 'ghost'} cv-filter-all-btn`}
              onClick={() => setFilter('all')}
            >
              all ({findings.length})
            </button>
          </div>

          {/* Finding cards */}
          <div className="cv-findings-list">
            {list.map((f) => (
              <FindingCard
                key={f.id}
                finding={f}
                onAck={handleAck}
                onFix={handleFix}
                onDismiss={handleDismiss}
                onOpenEditor={openInEditor}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
