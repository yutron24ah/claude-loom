/**
 * RetroView — retrospective session viewer.
 *
 * WHY: SCREEN_REQUIREMENTS §3.7 — shows the 4-lens retro findings from
 * the most recent retro session, plus 1-click action buttons so the PM
 * can immediately act on each finding.
 *
 * M2 Task 9: ported from prototype screens-b.jsx RetroView component.
 * Rewritten for M0.11.4 t14: RPG style (rpg-frame, rpg-title, rpg-label,
 * btn-px, chip, dot) aligned with Phase A SSoT (ui/src/styles/tokens.css).
 * Mock data hard-coded (M3 will wire to daemon tRPC retro routes).
 * RetroSession type aligns with daemon schema where applicable.
 */

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

/** Severity of a finding. */
type Severity = 'high' | 'med' | 'low';

/** Lens id for the 4 retro lenses. */
type LensId = 'pj' | 'proc' | 'meta' | 'user';

// WHY: typed constants prevent string literal drift across components
const FINDING_ACTION = {
  ACCEPT: 'accept',
  REJECT: 'reject',
  DEFER: 'defer',
  DISCUSS: 'discuss',
} as const;

/** One lens summary card. */
interface LensCard {
  id: LensId;
  name: string;
  role: string;
  findingCount: number;
  severities: Severity[];
}

/** One retro finding. */
interface Finding {
  lensId: LensId;
  severity: Severity;
  title: string;
  target: string;
  status: string;
}

// -------------------------------------------------------------------------
// Mock data
// -------------------------------------------------------------------------

/** Mock retro session metadata. */
const MOCK_SESSION = {
  id: 'retro-M0.12',
  milestone: 'M0.12',
  completedAt: '2026-04-29',
  totalFindings: 8,
  counterVerdict: 'PASS',
};

/** Mock 4-lens summary cards. */
const MOCK_LENSES: LensCard[] = [
  { id: 'pj',   name: 'リケ',   role: 'PJ Judge',      findingCount: 3, severities: ['high', 'med', 'low'] },
  { id: 'proc', name: 'リズ',   role: 'Process Judge', findingCount: 2, severities: ['high', 'med'] },
  { id: 'meta', name: 'オウル', role: 'Meta Judge',    findingCount: 1, severities: ['med'] },
  { id: 'user', name: 'あなた', role: 'User Lens',     findingCount: 2, severities: ['high', 'low'] },
];

/** Mock findings — 4 findings (matching prototype screens-b.jsx data). */
const MOCK_FINDINGS: Finding[] = [
  { lensId: 'proc', severity: 'high', title: 'TDD red 順序が 1 commit 飛んでいる', target: 'auth.test.ts:42', status: 'open' },
  { lensId: 'pj',   severity: 'high', title: 'PR #42 の verdict 証拠が薄い',        target: 'PR #42',          status: 'open' },
  { lensId: 'user', severity: 'high', title: '並列度がここ 3 日で 60% → 40%',       target: 'metrics',         status: 'open' },
  { lensId: 'meta', severity: 'med',  title: 'reviewer の personality が混ざっている', target: 'config',       status: 'deferred' },
];

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/** WHY: maps severity to CSS variable color for inline severity stripe. */
function severityColor(sev: Severity): string {
  if (sev === 'high') return 'var(--p-error)';
  if (sev === 'med') return 'var(--p-warn)';
  return 'var(--p-stone)';
}

/** WHY: maps status string to dot CSS class for visual indicator. */
function statusDotClass(status: string): string {
  if (status === 'open') return 'dot fail';
  if (status === 'deferred') return 'dot idle';
  if (status === 'accepted') return 'dot busy';
  if (status === 'rejected') return 'dot review';
  return 'dot idle';
}

// -------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------

interface LensSummaryCardProps {
  lens: LensCard;
}

function LensSummaryCard({ lens }: LensSummaryCardProps): JSX.Element {
  const isUser = lens.id === 'user';
  return (
    <div
      key={lens.id}
      data-testid="lens-card"
      className="rpg-frame-tight"
      style={{
        padding: 10,
        position: 'relative',
        background: isUser ? 'var(--p-accent-soft)' : 'var(--p-paper)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700 }}>{lens.name}</div>
          <div className="rpg-label">{lens.role}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 8, alignItems: 'center' }}>
        {lens.severities.map((s, i) => (
          <span
            key={i}
            style={{ width: 14, height: 14, background: severityColor(s), border: '1px solid var(--p-border)', display: 'inline-block' }}
          />
        ))}
        <span
          data-testid="lens-finding-count"
          style={{ fontSize: 10, fontWeight: 700, marginLeft: 'auto' }}
        >
          {lens.findingCount} 件
        </span>
      </div>
    </div>
  );
}

interface FindingRowProps {
  finding: Finding;
  index: number;
}

function FindingRow({ finding: f, index }: FindingRowProps): JSX.Element {
  return (
    <div
      data-testid="finding-item"
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        padding: '10px 8px',
        background: index % 2 === 0 ? 'var(--p-tint)' : 'transparent',
        borderBottom: '1px solid var(--p-border)',
      }}
    >
      {/* Severity stripe */}
      <span style={{ width: 8, height: 28, background: severityColor(f.severity), flexShrink: 0, display: 'inline-block' }} />

      {/* Finding info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700 }}>{f.title}</div>
        <div style={{ fontSize: 9, color: 'var(--p-text-muted)', fontFamily: 'ui-monospace, monospace' }}>
          {f.lensId} · {f.target}
        </div>
      </div>

      {/* Status chip + dot */}
      <span className="chip">{f.status}</span>
      <span className={statusDotClass(f.status)} />

      {/* 1-click action buttons */}
      <button
        type="button"
        className="btn-px success"
        style={{ padding: '6px 8px' }}
        onClick={() => undefined}
      >
        {FINDING_ACTION.ACCEPT}
      </button>
      <button
        type="button"
        className="btn-px ghost"
        style={{ padding: '6px 8px' }}
        onClick={() => undefined}
      >
        {FINDING_ACTION.REJECT}
      </button>
      <button
        type="button"
        className="btn-px ghost"
        style={{ padding: '6px 8px' }}
        onClick={() => undefined}
      >
        {FINDING_ACTION.DEFER}
      </button>
      <button
        type="button"
        className="btn-px primary"
        style={{ padding: '6px 8px' }}
        onClick={() => undefined}
      >
        {FINDING_ACTION.DISCUSS}
      </button>
    </div>
  );
}

// -------------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------------

export function RetroView(): JSX.Element {
  return (
    <div className="rpg-frame pixel" style={{ padding: 16 }}>
      {/* Session header */}
      <div
        data-testid="retro-session-info"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}
      >
        <div>
          <div className="rpg-title">
            Retro #{MOCK_SESSION.milestone} — {MOCK_SESSION.completedAt}
          </div>
          <div className="rpg-label" style={{ marginTop: 2 }}>
            finding {MOCK_SESSION.totalFindings} 件 · counter-arguer verdict: {MOCK_SESSION.counterVerdict} · aggregator: action plan 確定
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="btn-px ghost" onClick={() => undefined}>
            archive を開く
          </button>
          <button type="button" className="btn-px primary" onClick={() => undefined}>
            + 新 retro 起動
          </button>
        </div>
      </div>

      {/* 4 lens summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        {MOCK_LENSES.map((lens) => (
          <LensSummaryCard key={lens.id} lens={lens} />
        ))}
      </div>

      {/* Findings list */}
      <div className="rpg-label" style={{ marginBottom: 6 }}>FINDINGS — 1-click action</div>
      <div data-testid="retro-findings">
        {MOCK_FINDINGS.map((finding, i) => (
          <FindingRow key={i} finding={finding} index={i} />
        ))}
      </div>

      {/* Action plan classification */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
        {[
          { label: 'IMMEDIATE', count: 3, color: 'var(--p-error)' },
          { label: 'MILESTONE', count: 4, color: 'var(--p-warn)' },
          { label: 'DEFERRED',  count: 1, color: 'var(--p-stone)' },
        ].map((b) => (
          <div key={b.label} style={{ padding: 10, border: '2px solid var(--p-border)', background: 'var(--p-paper)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>{b.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: b.color }}>{b.count}</span>
            </div>
            <div className="exp-bar" style={{ marginTop: 4 }}>
              <i style={{ width: `${b.count * 25}%`, background: b.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
