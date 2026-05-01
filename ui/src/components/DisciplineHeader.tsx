/**
 * DisciplineHeader — process discipline metrics header bar.
 *
 * WHY: SCREEN_REQUIREMENTS §3.12 / §5.1 — show 4 live process discipline
 * metrics at the top of the UI so the user can immediately see the health
 * of the dev process: parallel rate, Task tool status, TDD violations,
 * and last reviewer verdict.
 *
 * M2 Task 9: ported from prototype screens-a.jsx DisciplineHeader.
 * Mock data is hard-coded (M3 will wire to daemon tRPC).
 */

/** Props for DisciplineHeader. width is currently unused (full-width via CSS). */
export interface DisciplineHeaderProps {
  width?: number;
}

/** Shape of a single discipline metric. */
interface Metric {
  label: string;
  value: string;
  pct: number;
  /** Tailwind color class for the progress bar fill */
  colorClass: string;
  testId: string;
}

/** Mock data: hard-coded discipline metrics (M3 will replace with tRPC). */
const MOCK_METRICS: Metric[] = [
  {
    label: 'PARALLEL',
    value: '60%',
    pct: 60,
    colorClass: 'bg-success',
    testId: 'metric-parallel',
  },
  {
    label: 'TASK TOOL',
    value: 'OK',
    pct: 100,
    colorClass: 'bg-success',
    testId: 'metric-task-tool',
  },
  {
    label: 'TDD ORDER',
    value: '0 violations',
    pct: 100,
    colorClass: 'bg-success',
    testId: 'metric-tdd-order',
  },
  {
    label: 'VERDICT',
    value: 'pass',
    pct: 100,
    colorClass: 'bg-accent',
    testId: 'metric-verdict',
  },
];

export function DisciplineHeader({ width: _width = 1080 }: DisciplineHeaderProps): JSX.Element {
  return (
    <header
      data-testid="discipline-header"
      className="flex items-center gap-sp-4 px-sp-4 py-sp-2 bg-bg2 border-b border-border font-sans"
    >
      {/* Brand title */}
      <div className="font-bold text-fs-sm tracking-wide whitespace-nowrap">
        claude-loom{' '}
        <span className="text-text-muted font-normal">/ 猫の開発室</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* 4 metric gauges */}
      {MOCK_METRICS.map((m) => (
        <div
          key={m.label}
          data-testid={m.testId}
          className="min-w-[130px]"
        >
          <div className="flex justify-between text-[9px] mb-[2px]">
            <span className="text-text-muted tracking-widest">{m.label}</span>
            <span className="font-bold text-fg1">{m.value}</span>
          </div>
          {/* Progress bar */}
          <div className="h-[6px] w-full bg-bg3 border border-border overflow-hidden">
            <div
              className={`h-full ${m.colorClass}`}
              style={{ width: `${m.pct}%` }}
            />
          </div>
        </div>
      ))}
    </header>
  );
}
