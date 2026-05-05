/**
 * ConsistencyView — SPEC 変更検知 + finding 管理 UI.
 * WHY: Visual audit of doc/spec consistency violations; enables triage actions.
 * SCREEN_REQUIREMENTS §3.4 / §4.3
 * Ported from ui/prototype/screens-c.jsx ConsistencyView (lines 8-130).
 * Rewritten for M0.11.4 t14: RPG style (rpg-frame, btn-px, chip, dot, rpg-label)
 * aligned with Phase A SSoT (ui/src/styles/tokens.css).
 * Action buttons are noop in this milestone; real mutations wired in M3+.
 * Types aligned with daemon ConsistencyFinding (db/schema.ts).
 */

// -------------------------------------------------------------------------
// Types — aligned with daemon schema (consistency_findings table)
// -------------------------------------------------------------------------

export type Severity = 'high' | 'medium' | 'low';

// WHY: typed constants prevent string literal drift across components
export const FINDING_STATUS = {
  OPEN: 'open',
  ACKNOWLEDGED: 'acknowledged',
  FIXED: 'fixed',
  DISMISSED: 'dismissed',
} as const;

export type FindingStatus = (typeof FINDING_STATUS)[keyof typeof FINDING_STATUS];

export interface MockFinding {
  id: string;
  severity: Severity;
  /** target document / file path */
  targetDoc: string;
  /** line reference */
  lines: string;
  title: string;
  detail: string;
  suggestion: string;
  status: FindingStatus;
  source: string;
}

// -------------------------------------------------------------------------
// Mock data (5-8 findings with all severity levels)
// -------------------------------------------------------------------------

const MOCK_FINDINGS: MockFinding[] = [
  {
    id: 'F-12',
    severity: 'high',
    targetDoc: 'docs/SCREEN_REQUIREMENTS.md',
    lines: 'L284-L298',
    title: '§3.6 ガント の縦軸定義が SPEC §3.6.5 と矛盾',
    detail: 'SCREEN_REQUIREMENTS は subagent 1 体 = 1 bar。SPEC は worktree 単位を想定。',
    suggestion: 'SPEC §3.6.5 を SubagentRow ベースに修正、worktree グループ化を §3.9 へ移管',
    status: FINDING_STATUS.OPEN,
    source: 'spec_diff (4 hours ago)',
  },
  {
    id: 'F-11',
    severity: 'high',
    targetDoc: 'agents/loom-developer.md',
    lines: 'L42-L51',
    title: 'Developer の TDD red 順序定義が CODING_PRINCIPLES と乖離',
    detail: 'developer は test → impl → refactor の3段。原則は test → impl → refactor → review の4段。',
    suggestion: 'agent prompt に review 段階を追加し、reviewer dispatch 規定を明示',
    status: FINDING_STATUS.ACKNOWLEDGED,
    source: 'spec_diff (yesterday)',
  },
  {
    id: 'F-10',
    severity: 'medium',
    targetDoc: 'docs/RETRO_GUIDE.md',
    lines: 'L88',
    title: 'retro lens 名称が SPEC §3.7 と微妙に違う',
    detail: '用語ゆらぎ。codebase 全体 grep で 7 箇所。',
    suggestion: '用語を counter-arguer に統一',
    status: FINDING_STATUS.FIXED,
    source: 'spec_diff (2 days ago)',
  },
  {
    id: 'F-09',
    severity: 'low',
    targetDoc: 'skills/loom-worktree/SKILL.md',
    lines: 'L120',
    title: 'worktree 5 用途のうち 1 つ (hotfix) の例が古い CLI 引数を使用',
    detail: '`--branch` は v0.8 で `--from` にリネーム済み',
    suggestion: 'サンプル更新',
    status: FINDING_STATUS.OPEN,
    source: 'manual (you)',
  },
  {
    id: 'F-08',
    severity: 'high',
    targetDoc: 'agents/loom-pm.md',
    lines: 'L103-L115',
    title: 'PM agent の review_mode 判定順序が SPEC §3.6.6.1 と乖離',
    detail: 'PM が meta block を先に読む仕様だが、agent prompt では project.json を先読みしている。',
    suggestion: 'loom-meta block を最優先に、project.json は fallback に変更',
    status: FINDING_STATUS.OPEN,
    source: 'spec_diff (3 hours ago)',
  },
  {
    id: 'F-07',
    severity: 'medium',
    targetDoc: 'docs/CODING_PRINCIPLES.md',
    lines: 'L55-L60',
    title: 'Boy Scout Rule の scope 記述が CLAUDE.md と異なる',
    detail: 'CODING_PRINCIPLES は "PR スコープ" 、CLAUDE.md は "sprawl 禁止" と表現差異あり。',
    suggestion: '"scoped to PR" に表現を統一',
    status: FINDING_STATUS.OPEN,
    source: 'spec_diff (1 day ago)',
  },
];

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

// WHY: maps severity to the CSS variable color for inline severity badge
function severityColor(sev: Severity): string {
  if (sev === 'high') return 'var(--p-error)';
  if (sev === 'medium') return 'var(--p-warn)';
  return 'var(--p-stone)';
}

// WHY: maps status to dot class name for visual indicator
function statusDotClass(status: FindingStatus): string {
  if (status === FINDING_STATUS.OPEN) return 'dot fail';
  if (status === FINDING_STATUS.ACKNOWLEDGED) return 'dot tdd';
  if (status === FINDING_STATUS.FIXED) return 'dot busy';
  return 'dot idle';
}

// -------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------

interface SummaryCardProps {
  label: string;
  count: number;
  color: string;
}

function SummaryCard({ label, count, color }: SummaryCardProps): JSX.Element {
  return (
    <div style={{ background: 'var(--p-tint)', border: '2px solid var(--p-border)', padding: 10 }}>
      <div className="rpg-label">{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: 'ui-monospace, monospace' }}>{count}</div>
    </div>
  );
}

interface FindingCardProps {
  finding: MockFinding;
}

function FindingCard({ finding: f }: FindingCardProps): JSX.Element {
  const isFixed = f.status === FINDING_STATUS.FIXED;
  const isDismissed = f.status === FINDING_STATUS.DISMISSED;
  const isAcknowledged = f.status === FINDING_STATUS.ACKNOWLEDGED;
  const isOpen = f.status === FINDING_STATUS.OPEN;

  return (
    <div
      data-testid="finding-card"
      style={{
        background: 'var(--p-paper)',
        border: '2px solid var(--p-border)',
        padding: 12,
        position: 'relative',
        opacity: isFixed || isDismissed ? 0.55 : 1,
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {/* Severity badge */}
        <div
          data-testid="finding-severity"
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: '2px 6px',
            marginTop: 2,
            background: severityColor(f.severity),
            color: 'white',
            border: '2px solid var(--p-border)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            flexShrink: 0,
          }}
        >
          {f.severity === 'high' && <span data-testid="severity-high">{f.severity}</span>}
          {f.severity === 'medium' && <span data-testid="severity-medium">{f.severity}</span>}
          {f.severity === 'low' && <span data-testid="severity-low">{f.severity}</span>}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row with id, title, status chip + dot */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', color: 'var(--p-text-muted)' }}>{f.id}</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{f.title}</span>
            {/* Status chip */}
            {isAcknowledged && (
              <span className="chip" style={{ background: 'var(--p-warn)', color: 'white', borderColor: 'var(--p-warn)' }}>ACK</span>
            )}
            {isFixed && (
              <span className="chip" style={{ background: 'var(--p-success)', color: 'white', borderColor: 'var(--p-success)' }}>FIXED</span>
            )}
            {isDismissed && (
              <span className="chip" style={{ background: 'var(--p-stone)', color: 'white', borderColor: 'var(--p-stone)' }}>DISMISSED</span>
            )}
            {/* Status dot indicator */}
            <span className={statusDotClass(f.status)} />
          </div>

          {/* File path + lines */}
          <div style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', color: 'var(--p-accent)', marginBottom: 4 }}>
            {f.targetDoc} <span style={{ color: 'var(--p-text-muted)' }}>{f.lines}</span>
          </div>

          {/* Detail text */}
          <div style={{ fontSize: 11, color: 'var(--p-text)', lineHeight: 1.5, marginBottom: 6 }}>{f.detail}</div>

          {/* Suggestion box */}
          <div style={{ fontSize: 10, padding: '6px 8px', background: 'var(--p-tint)', border: '1px dashed var(--p-border)', color: 'var(--p-text)' }}>
            <span style={{ fontWeight: 700, color: 'var(--p-success)' }}>提案 ▶</span> {f.suggestion}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 4, marginTop: 8, alignItems: 'center' }}>
            {/* Open in Editor — for open and acknowledged */}
            {(isOpen || isAcknowledged) && (
              <button
                data-testid="action-open-editor"
                className="btn-px ghost"
                style={{ fontSize: 9, padding: '3px 6px' }}
                onClick={() => undefined}
              >
                Open in Editor
              </button>
            )}
            {/* Acknowledge — only for open */}
            {isOpen && (
              <button
                data-testid="action-acknowledge"
                className="btn-px primary"
                style={{ fontSize: 9, padding: '3px 6px' }}
                onClick={() => undefined}
              >
                Acknowledge
              </button>
            )}
            {/* Mark Fixed — for open and acknowledged */}
            {(isOpen || isAcknowledged) && (
              <button
                data-testid="action-mark-fixed"
                className="btn-px ghost"
                style={{ fontSize: 9, padding: '3px 6px' }}
                onClick={() => undefined}
              >
                Mark Fixed
              </button>
            )}
            {/* Dismiss — only for open */}
            {isOpen && (
              <button
                data-testid="action-dismiss"
                className="btn-px ghost"
                style={{ fontSize: 9, padding: '3px 6px', color: 'var(--p-text-muted)' }}
                onClick={() => undefined}
              >
                Dismiss
              </button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--p-text-muted)' }}>{f.source}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------------

export function ConsistencyView(): JSX.Element {
  const openCount = MOCK_FINDINGS.filter((f) => f.status === FINDING_STATUS.OPEN).length;
  const ackCount = MOCK_FINDINGS.filter((f) => f.status === FINDING_STATUS.ACKNOWLEDGED).length;
  const fixedCount = MOCK_FINDINGS.filter((f) => f.status === FINDING_STATUS.FIXED).length;
  const dismissedCount = MOCK_FINDINGS.filter((f) => f.status === FINDING_STATUS.DISMISSED).length;

  const highCount = MOCK_FINDINGS.filter((f) => f.severity === 'high').length;
  const mediumCount = MOCK_FINDINGS.filter((f) => f.severity === 'medium').length;
  const lowCount = MOCK_FINDINGS.filter((f) => f.severity === 'low').length;

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
        {openCount > 0 && (
          <span className="chip" style={{ background: 'var(--p-error)', color: 'white', borderColor: 'var(--p-error)' }}>
            NEW {openCount}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          className="btn-px primary"
          onClick={() => undefined}
        >
          チェック実行
        </button>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        <SummaryCard label="OPEN" count={openCount} color="var(--p-error)" />
        <SummaryCard label="ACK" count={ackCount} color="var(--p-warn)" />
        <SummaryCard label="FIXED" count={fixedCount} color="var(--p-success)" />
        <SummaryCard label="DISMISSED" count={dismissedCount} color="var(--p-stone)" />
      </div>

      {/* Severity distribution */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, fontSize: 11 }}>
        <span className="rpg-label">SEVERITY</span>
        <span style={{ display: 'inline-block', height: 10, width: 80, background: 'var(--p-error)' }} />
        <span>high <strong>{highCount}</strong></span>
        <span style={{ display: 'inline-block', height: 10, width: 60, background: 'var(--p-warn)' }} />
        <span>medium <strong>{mediumCount}</strong></span>
        <span style={{ display: 'inline-block', height: 10, width: 30, background: 'var(--p-stone)' }} />
        <span>low <strong>{lowCount}</strong></span>
      </div>

      {/* Finding cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {MOCK_FINDINGS.map((f) => (
          <FindingCard key={f.id} finding={f} />
        ))}
      </div>
    </div>
  );
}
