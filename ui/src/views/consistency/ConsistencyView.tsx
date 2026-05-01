/**
 * ConsistencyView — SPEC 変更検知 + finding 管理 UI.
 * WHY: Visual audit of doc/spec consistency violations; enables triage actions.
 * SCREEN_REQUIREMENTS §3.4 / §4.3
 * Ported from ui/prototype/screens-c.jsx ConsistencyView.
 * Action buttons are noop in this milestone; real mutations wired in M3+.
 * Types aligned with daemon ConsistencyFinding (db/schema.ts).
 */

// -------------------------------------------------------------------------
// Types — aligned with daemon schema (consistency_findings table)
// -------------------------------------------------------------------------

export type Severity = 'high' | 'medium' | 'low';
export type FindingStatus = 'open' | 'acknowledged' | 'fixed' | 'dismissed';

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
    status: 'open',
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
    status: 'acknowledged',
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
    status: 'fixed',
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
    status: 'open',
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
    status: 'open',
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
    status: 'open',
    source: 'spec_diff (1 day ago)',
  },
];

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function severityClasses(sev: Severity): string {
  if (sev === 'high') return 'bg-error text-white';
  if (sev === 'medium') return 'bg-accent text-white';
  return 'bg-bg3 text-text-muted';
}

// -------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------

interface SummaryCardProps {
  label: string;
  count: number;
  colorClass: string;
}

function SummaryCard({ label, count, colorClass }: SummaryCardProps): JSX.Element {
  return (
    <div className="bg-bg3 border-2 border-border p-sp-2">
      <div className="text-text-muted text-fs-xs uppercase tracking-widest">{label}</div>
      <div className={`font-mono font-bold text-fs-md ${colorClass}`}>{count}</div>
    </div>
  );
}

interface FindingCardProps {
  finding: MockFinding;
}

function FindingCard({ finding: f }: FindingCardProps): JSX.Element {
  const isFixed = f.status === 'fixed';
  const isDismissed = f.status === 'dismissed';
  const isAcknowledged = f.status === 'acknowledged';
  const isOpen = f.status === 'open';

  return (
    <div
      data-testid="finding-card"
      className={`bg-bg1 border-2 border-border p-sp-3 flex flex-col gap-sp-2 ${isFixed || isDismissed ? 'opacity-60' : ''}`}
    >
      {/* Top row: severity + id + title */}
      <div className="flex gap-sp-2 items-start">
        <span
          data-testid="finding-severity"
          className={`text-fs-xs font-bold px-sp-2 py-0.5 border border-border uppercase tracking-widest shrink-0 mt-0.5 ${severityClasses(f.severity)}`}
        >
          {f.severity === 'high' ? (
            <span data-testid="severity-high">{f.severity}</span>
          ) : f.severity === 'medium' ? (
            <span data-testid="severity-medium">{f.severity}</span>
          ) : (
            <span data-testid="severity-low">{f.severity}</span>
          )}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex gap-sp-2 items-center flex-wrap mb-1">
            <span className="font-mono text-fs-xs text-text-muted">{f.id}</span>
            <span className="text-fs-sm font-bold text-fg1">{f.title}</span>
            {isAcknowledged && (
              <span className="text-fs-xs font-bold px-sp-1 py-0.5 bg-accent text-white border border-border">ACK</span>
            )}
            {isFixed && (
              <span className="text-fs-xs font-bold px-sp-1 py-0.5 bg-success text-white border border-border">FIXED</span>
            )}
          </div>
          <div className="font-mono text-fs-xs text-accent mb-1">
            {f.targetDoc} <span className="text-text-muted">{f.lines}</span>
          </div>
          <div className="text-fs-xs text-fg2 leading-relaxed mb-1">{f.detail}</div>
          <div className="text-fs-xs p-sp-2 bg-bg3 border border-dashed border-border leading-relaxed">
            <span className="font-bold text-success">提案 ▶</span> {f.suggestion}
          </div>

          {/* Action buttons */}
          <div className="flex gap-sp-1 mt-sp-2 items-center flex-wrap">
            {/* Open in Editor — always shown for open/ack */}
            {(isOpen || isAcknowledged) && (
              <button
                data-testid="action-open-editor"
                className="text-fs-xs px-sp-2 py-0.5 border border-border bg-bg2 text-fg1 hover:bg-bg3"
                onClick={() => undefined}
              >
                Open in Editor
              </button>
            )}
            {/* Acknowledge — only for open */}
            {isOpen && (
              <button
                data-testid="action-acknowledge"
                className="text-fs-xs px-sp-2 py-0.5 border border-border bg-accent text-white"
                onClick={() => undefined}
              >
                Acknowledge
              </button>
            )}
            {/* Mark Fixed — for open and acknowledged */}
            {(isOpen || isAcknowledged) && (
              <button
                data-testid="action-mark-fixed"
                className="text-fs-xs px-sp-2 py-0.5 border border-border bg-bg2 text-fg1 hover:bg-bg3"
                onClick={() => undefined}
              >
                Mark Fixed
              </button>
            )}
            {/* Dismiss — only for open */}
            {isOpen && (
              <button
                data-testid="action-dismiss"
                className="text-fs-xs px-sp-2 py-0.5 border border-border bg-bg2 text-text-muted"
                onClick={() => undefined}
              >
                Dismiss
              </button>
            )}
            <span className="ml-auto text-fs-xs text-text-muted">{f.source}</span>
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
  const openCount = MOCK_FINDINGS.filter((f) => f.status === 'open').length;
  const ackCount = MOCK_FINDINGS.filter((f) => f.status === 'acknowledged').length;
  const fixedCount = MOCK_FINDINGS.filter((f) => f.status === 'fixed').length;
  const dismissedCount = MOCK_FINDINGS.filter((f) => f.status === 'dismissed').length;

  const highCount = MOCK_FINDINGS.filter((f) => f.severity === 'high').length;
  const mediumCount = MOCK_FINDINGS.filter((f) => f.severity === 'medium').length;
  const lowCount = MOCK_FINDINGS.filter((f) => f.severity === 'low').length;

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
        <button
          className="ml-auto text-fs-xs px-sp-3 py-1 border border-border bg-accent text-white"
          onClick={() => undefined}
        >
          チェック実行
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-sp-2">
        <SummaryCard label="OPEN" count={openCount} colorClass="text-error" />
        <SummaryCard label="ACK" count={ackCount} colorClass="text-accent" />
        <SummaryCard label="FIXED" count={fixedCount} colorClass="text-success" />
        <SummaryCard label="DISMISSED" count={dismissedCount} colorClass="text-text-muted" />
      </div>

      {/* Severity distribution */}
      <div className="flex items-center gap-sp-3 text-fs-xs flex-wrap">
        <span className="text-text-muted uppercase tracking-widest">SEVERITY</span>
        <span className="inline-block h-2.5 w-16 bg-error" />
        <span>high <strong>{highCount}</strong></span>
        <span className="inline-block h-2.5 w-12 bg-accent" />
        <span>medium <strong>{mediumCount}</strong></span>
        <span className="inline-block h-2.5 w-8 bg-bg3" />
        <span>low <strong>{lowCount}</strong></span>
      </div>

      {/* Finding cards */}
      <div className="flex flex-col gap-sp-2">
        {MOCK_FINDINGS.map((f) => (
          <FindingCard key={f.id} finding={f} />
        ))}
      </div>
    </div>
  );
}
