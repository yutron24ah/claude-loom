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
      style={{
        background: 'var(--p-paper)',
        border: '2px solid var(--p-border)',
        padding: 12,
        opacity: isFixed || isDismissed ? 0.55 : 1,
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {/* Severity badge with data-sev attribute + finding-severity testid */}
        <div
          data-testid="finding-severity"
          data-sev={f.sev}
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: '2px 6px',
            marginTop: 2,
            background: SEV_COLOR[f.sev],
            color: 'white',
            border: '2px solid var(--p-border)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            flexShrink: 0,
          }}
        >
          {f.sev === 'high' && <span data-testid="severity-high">{f.sev}</span>}
          {f.sev === 'medium' && <span data-testid="severity-medium">{f.sev}</span>}
          {f.sev === 'low' && <span data-testid="severity-low">{f.sev}</span>}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row: id, title, status chip + dot */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', color: 'var(--p-text-muted)' }}>{f.id}</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{f.title}</span>
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
          <div style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', color: 'var(--p-accent)', marginBottom: 4 }}>
            {f.file} <span style={{ color: 'var(--p-text-muted)' }}>{f.lines}</span>
          </div>

          {/* Expand/collapse detail+suggest */}
          <button
            data-testid={`expand-btn-${f.id}`}
            className="btn-px ghost"
            style={{ fontSize: 9, padding: '2px 6px', marginBottom: 4 }}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? '▲ 詳細を閉じる' : '▼ 詳細・提案を表示'}
          </button>

          {expanded && (
            <>
              {/* Detail text */}
              <div
                data-testid={`detail-${f.id}`}
                style={{ fontSize: 11, color: 'var(--p-text)', lineHeight: 1.5, marginBottom: 6 }}
              >
                {f.detail}
              </div>
              {/* Suggestion box */}
              <div
                data-testid={`suggest-${f.id}`}
                style={{ fontSize: 10, padding: '6px 8px', background: 'var(--p-tint)', border: '1px dashed var(--p-border)', color: 'var(--p-text)' }}
              >
                <span style={{ fontWeight: 700, color: 'var(--p-success)' }}>提案 ▶</span> {f.suggest}
              </div>
            </>
          )}

          {/* Action buttons — wired to useConsistencyMutations (M0.15 t16) */}
          <div style={{ display: 'flex', gap: 4, marginTop: 8, alignItems: 'center' }}>
            {/* Open in Editor — for open and ack (backward compat) */}
            {(isOpen || isAck) && (
              <button
                data-testid="action-open-editor"
                data-action="open-editor"
                className="btn-px ghost"
                style={{ fontSize: 9, padding: '3px 6px' }}
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
                className="btn-px primary"
                style={{ fontSize: 9, padding: '3px 6px' }}
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
                className="btn-px ghost"
                style={{ fontSize: 9, padding: '3px 6px' }}
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
                className="btn-px ghost"
                style={{ fontSize: 9, padding: '3px 6px', color: 'var(--p-text-muted)' }}
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
                className="btn-px ghost"
                style={{ fontSize: 9, padding: '3px 6px' }}
                onClick={() => undefined}
              >
                Discuss
              </button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--p-text-muted)' }}>{f.source}</span>
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

  return (
    <div
      data-testid="consistency-view"
      className="rpg-frame pixel"
      style={{ padding: 18 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div
          data-testid="consistency-title"
          style={{ fontSize: 14, fontWeight: 700 }}
        >
          整合性 — Consistency Findings
        </div>
        {openCount > 0 && consistencyState === 'has-findings' && (
          <span className="chip" style={{ background: 'var(--p-error)', color: 'white', borderColor: 'var(--p-error)' }}>
            NEW {openCount}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {/* チェック実行 button — Phase 5 write hookup */}
        <button className="btn-px primary" onClick={() => undefined}>
          チェック実行
        </button>
      </div>

      {/* State: running */}
      {consistencyState === 'running' && (
        <div
          data-testid="consistency-running"
          style={{ padding: 14, border: '2px dashed var(--p-warn)', background: 'var(--p-paper)', marginBottom: 12, fontSize: 11 }}
        >
          <b>spec_diff 実行中</b> — agents/ skills/ docs/ を scan 中…
          <div style={{ marginTop: 6, height: 6, background: 'var(--p-tint)', border: '1px solid var(--p-border)', overflow: 'hidden' }}>
            <div style={{ width: '60%', height: '100%', background: 'var(--p-warn)' }} />
          </div>
        </div>
      )}

      {/* State: empty */}
      {consistencyState === 'empty' && (
        <div
          data-testid="consistency-empty"
          style={{ padding: 30, textAlign: 'center', border: '2px solid var(--p-border)', background: 'var(--p-paper)' }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>整合性違反は検出されていません</div>
          <div style={{ fontSize: 10, color: 'var(--p-text-muted)' }}>
            SPEC.md と agent/skill prompts を最後に scan した結果。
          </div>
        </div>
      )}

      {/* State: has-findings */}
      {consistencyState === 'has-findings' && findings.length > 0 && (
        <>
          {/* Summary strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'OPEN', n: openCount, color: 'var(--p-error)' },
              { label: 'ACK', n: ackCount, color: 'var(--p-warn)' },
              { label: 'FIXED', n: fixedCount, color: 'var(--p-success)' },
              { label: 'DISMISSED', n: dismissedCount, color: 'var(--p-stone)' },
            ].map((s) => (
              <div key={s.label} style={{ background: 'var(--p-tint)', border: '2px solid var(--p-border)', padding: 10 }}>
                <div className="rpg-label">{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: 'ui-monospace, monospace' }}>{s.n}</div>
              </div>
            ))}
          </div>

          {/* Finding cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {findings.map((f) => (
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
