/**
 * GanttView — progress bars showing agent activity over the last hour.
 *
 * WHY: SCREEN_REQUIREMENTS §3.6 — gives the user a visual timeline of
 * what each agent was doing, making it easy to spot parallelism,
 * blocked periods, and live-running tasks.
 *
 * M2 Task 9: ported from prototype screens-a.jsx Gantt component.
 * Mock data hard-coded (M3 will wire to daemon tRPC events).
 */

/** A single progress bar segment within a Gantt row. */
interface GanttBar {
  /** Start position as percentage 0-100 */
  startPct: number;
  /** End position as percentage 0-100 */
  endPct: number;
  /** Display label inside bar */
  label: string;
  /** Tailwind bg class for bar color */
  colorClass: string;
  /** Whether this bar is currently live (shows cat sprite) */
  live?: boolean;
}

/** One agent row in the Gantt chart. */
interface GanttRow {
  id: string;
  label: string;
  bars: GanttBar[];
}

/** Time axis tick labels */
const TIME_TICKS = ['13:30', '13:45', '14:00', '14:15', 'now'];

/** Mock Gantt rows — 6 agent rows with 7 bars total (5-8 range). */
const MOCK_ROWS: GanttRow[] = [
  {
    id: 'pm',
    label: 'ニケ (PM)',
    bars: [{ startPct: 5, endPct: 95, label: 'PM session', colorClass: 'bg-accent', live: true }],
  },
  {
    id: 'dev',
    label: 'サバ (Dev)',
    bars: [
      { startPct: 12, endPct: 38, label: 'auth: login spec', colorClass: 'bg-success' },
      { startPct: 44, endPct: 74, label: 'auth: TDD red', colorClass: 'bg-error' },
    ],
  },
  {
    id: 'code-rev',
    label: 'ペン (Code Rev)',
    bars: [
      { startPct: 40, endPct: 56, label: 'review: PR #42', colorClass: 'bg-accent' },
    ],
  },
  {
    id: 'sec-rev',
    label: 'シノビ (Sec)',
    bars: [{ startPct: 18, endPct: 34, label: 'secret scan', colorClass: 'bg-accent' }],
  },
  {
    id: 'test-rev',
    label: 'メメ (Test Rev)',
    bars: [
      { startPct: 22, endPct: 48, label: 'coverage check', colorClass: 'bg-accent' },
      { startPct: 60, endPct: 80, label: 'verdict', colorClass: 'bg-success' },
    ],
  },
  {
    id: 'agg',
    label: 'マル (Aggregator)',
    bars: [{ startPct: 86, endPct: 95, label: 'retro summary', colorClass: 'bg-accent', live: true }],
  },
];

export function GanttView(): JSX.Element {
  return (
    <div className="bg-bg2 border border-border rounded-card p-sp-4 font-sans">
      {/* Header row */}
      <div className="flex justify-between items-center mb-sp-2">
        <h2 className="font-bold text-fs-sm tracking-wide text-fg1">
          進捗ガント — 直近 1 時間
        </h2>
        <div className="flex gap-sp-1">
          {['30m', '1h', '4h', 'all'].map((z, i) => (
            <span
              key={z}
              className={`px-sp-2 py-[2px] text-[9px] border border-border rounded-ctrl cursor-pointer ${
                i === 1 ? 'bg-accent text-bg2 font-bold' : 'bg-bg3 text-fg2'
              }`}
            >
              {z}
            </span>
          ))}
        </div>
      </div>

      {/* Time axis */}
      <div
        data-testid="gantt-time-axis"
        className="flex pl-[130px] mb-sp-1 text-[9px] text-text-muted font-mono"
      >
        {TIME_TICKS.map((t, i, a) => (
          <div
            key={t}
            style={{ width: `${100 / (a.length - 1)}%` }}
            className={i === 0 ? 'text-left' : 'text-center'}
          >
            {t}
          </div>
        ))}
      </div>

      {/* Rows */}
      {MOCK_ROWS.map((row, ri) => (
        <div
          key={row.id}
          data-testid="gantt-row"
          className={`flex items-center h-11 ${ri > 0 ? 'border-t border-dashed border-border' : ''}`}
        >
          {/* Label */}
          <div className="w-[130px] flex items-center gap-sp-1 shrink-0">
            <span className="text-[10px] font-bold font-mono text-fg1 truncate">{row.label}</span>
          </div>

          {/* Bar track */}
          <div className="relative flex-1 h-9 bg-bg3 border border-border overflow-hidden">
            {/* Grid lines */}
            {[25, 50, 75].map((p) => (
              <div
                key={p}
                className="absolute top-0 bottom-0 w-px bg-border opacity-20"
                style={{ left: `${p}%` }}
              />
            ))}

            {/* Bars */}
            {row.bars.map((bar, bi) => (
              <div
                key={bi}
                data-testid="gantt-bar"
                title={bar.label}
                className={`absolute top-1.5 bottom-1.5 ${bar.colorClass} border border-border flex items-center pl-1 text-[9px] text-bg2 font-bold font-mono overflow-hidden whitespace-nowrap`}
                style={{ left: `${bar.startPct}%`, width: `${bar.endPct - bar.startPct}%` }}
              >
                {bar.label}
                {bar.live && (
                  <span
                    className="absolute -right-2 top-1/2 -translate-y-1/2 text-[10px]"
                    aria-label="live"
                  >
                    🐈
                  </span>
                )}
              </div>
            ))}

            {/* "now" indicator line */}
            <div className="absolute top-0 bottom-0 w-[2px] bg-error" style={{ left: '95%' }} />
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex gap-sp-3 mt-sp-2 text-[9px] text-text-muted">
        <span>busy</span>
        <span>review</span>
        <span>TDD red</span>
        <span>failed</span>
        <span className="ml-auto">🐈 = ライブ伸長中</span>
      </div>
    </div>
  );
}
