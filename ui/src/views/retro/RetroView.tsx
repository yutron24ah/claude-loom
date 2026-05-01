/**
 * RetroView — retrospective session viewer.
 *
 * WHY: SCREEN_REQUIREMENTS §3.7 — shows the 4-lens retro findings from
 * the most recent retro session, plus 1-click action buttons so the PM
 * can immediately act on each finding.
 *
 * M2 Task 9: ported from prototype screens-b.jsx RetroView component.
 * Mock data hard-coded (M3 will wire to daemon tRPC retro routes).
 * RetroSession type aligns with daemon schema where applicable.
 */

/** Severity of a finding. */
type Severity = 'high' | 'med' | 'low';

/** Lens id for the 4 retro lenses. */
type LensId = 'pj' | 'proc' | 'meta' | 'user';

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

/** Mock findings — 4 findings (2 per lens pair in prototype). */
const MOCK_FINDINGS: Finding[] = [
  { lensId: 'proc', severity: 'high', title: 'TDD red 順序が 1 commit 飛んでいる', target: 'auth.test.ts:42', status: 'open' },
  { lensId: 'pj',   severity: 'high', title: 'PR #42 の verdict 証拠が薄い',        target: 'PR #42',          status: 'open' },
  { lensId: 'user', severity: 'high', title: '並列度がここ 3 日で 60% → 40%',       target: 'metrics',         status: 'open' },
  { lensId: 'meta', severity: 'med',  title: 'reviewer の personality が混ざっている', target: 'config',       status: 'deferred' },
];

/** Map severity to Tailwind bg class. */
function severityClass(sev: Severity): string {
  switch (sev) {
    case 'high': return 'bg-error';
    case 'med':  return 'bg-accent';
    case 'low':  return 'bg-fg2';
  }
}

export function RetroView(): JSX.Element {
  return (
    <div className="bg-bg2 border border-border rounded-card p-sp-4 font-sans">
      {/* ---- Session header ---- */}
      <div
        data-testid="retro-session-info"
        className="flex justify-between items-start mb-sp-3"
      >
        <div>
          <h2 className="font-bold text-fs-sm tracking-wide text-fg1">
            Retro #{MOCK_SESSION.milestone} — {MOCK_SESSION.completedAt}
          </h2>
          <p className="text-[9px] text-text-muted font-mono mt-[2px]">
            finding {MOCK_SESSION.totalFindings} 件 · counter-arguer verdict:{' '}
            {MOCK_SESSION.counterVerdict} · aggregator: action plan 確定
          </p>
        </div>
        <div className="flex gap-sp-2">
          <button
            type="button"
            className="px-sp-2 py-[4px] text-[9px] bg-bg3 text-fg1 border border-border rounded-ctrl"
          >
            archive を開く
          </button>
          <button
            type="button"
            className="px-sp-2 py-[4px] text-[9px] bg-accent text-bg2 border border-border rounded-ctrl font-bold"
          >
            + 新 retro 起動
          </button>
        </div>
      </div>

      {/* ---- 4 lens summary cards ---- */}
      <div className="grid grid-cols-4 gap-sp-2 mb-sp-3">
        {MOCK_LENSES.map((lens) => (
          <div
            key={lens.id}
            data-testid="lens-card"
            className="bg-bg3 border border-border rounded-ctrl p-sp-2"
          >
            <div className="flex flex-col gap-[2px]">
              <span className="text-fs-xs font-bold text-fg1">{lens.name}</span>
              <span className="text-[9px] text-text-muted">{lens.role}</span>
            </div>
            <div className="flex items-center gap-[3px] mt-sp-2">
              {lens.severities.map((s, i) => (
                <span
                  key={i}
                  className={`w-[14px] h-[14px] border border-border ${severityClass(s)}`}
                />
              ))}
              <span
                data-testid="lens-finding-count"
                className="text-[10px] font-bold text-fg1 ml-auto"
              >
                {lens.findingCount} 件
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ---- Findings list ---- */}
      <p className="text-[9px] text-text-muted tracking-widest mb-sp-1">
        FINDINGS — 1-click action
      </p>
      <div data-testid="retro-findings">
        {MOCK_FINDINGS.map((finding, i) => (
          <div
            key={i}
            data-testid="finding-item"
            className={`flex gap-sp-2 items-center p-sp-2 border-b border-border ${
              i % 2 === 0 ? 'bg-bg3' : 'bg-transparent'
            }`}
          >
            {/* Severity stripe */}
            <span className={`w-2 h-7 shrink-0 ${severityClass(finding.severity)}`} />

            {/* Finding info */}
            <div className="flex-1 min-w-0">
              <p className="text-fs-xs font-bold text-fg1 truncate">{finding.title}</p>
              <p className="text-[9px] text-text-muted font-mono">
                {finding.lensId} · {finding.target} · {finding.status}
              </p>
            </div>

            {/* Action buttons — onClick noop in M2, M3 will wire actions */}
            <button
              type="button"
              onClick={() => undefined}
              className="px-sp-2 py-[4px] text-[9px] bg-success text-bg2 border border-border rounded-ctrl font-bold"
            >
              accept
            </button>
            <button
              type="button"
              onClick={() => undefined}
              className="px-sp-2 py-[4px] text-[9px] bg-bg3 text-fg1 border border-border rounded-ctrl"
            >
              reject
            </button>
            <button
              type="button"
              onClick={() => undefined}
              className="px-sp-2 py-[4px] text-[9px] bg-bg3 text-fg1 border border-border rounded-ctrl"
            >
              defer
            </button>
            <button
              type="button"
              onClick={() => undefined}
              className="px-sp-2 py-[4px] text-[9px] bg-accent text-bg2 border border-border rounded-ctrl font-bold"
            >
              discuss
            </button>
          </div>
        ))}
      </div>

      {/* ---- Action plan classification ---- */}
      <div className="grid grid-cols-3 gap-sp-2 mt-sp-3">
        {[
          { label: 'IMMEDIATE', count: 3, colorClass: 'bg-error', barPct: 75 },
          { label: 'MILESTONE', count: 4, colorClass: 'bg-accent', barPct: 100 },
          { label: 'DEFERRED',  count: 1, colorClass: 'bg-fg2', barPct: 25 },
        ].map((b) => (
          <div key={b.label} className="p-sp-2 border border-border bg-bg3 rounded-ctrl">
            <div className="flex justify-between">
              <span className="text-[10px] font-bold tracking-widest text-fg1">{b.label}</span>
              <span className={`text-fs-xs font-bold ${b.colorClass.replace('bg-', 'text-')}`}>
                {b.count}
              </span>
            </div>
            <div className="h-[6px] w-full bg-bg2 border border-border mt-sp-1 overflow-hidden">
              <div className={`h-full ${b.colorClass}`} style={{ width: `${b.barPct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
