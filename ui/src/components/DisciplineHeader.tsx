/**
 * DisciplineHeader — process discipline metrics header bar + nav links.
 *
 * WHY: SCREEN_REQUIREMENTS §3.12 / §5.1 — show 4 live process discipline
 * metrics at the top of the UI so the user can immediately see the health
 * of the dev process: parallel rate, Task tool status, TDD violations,
 * and last reviewer verdict.
 *
 * M2 Task 9: ported from prototype screens-a.jsx DisciplineHeader.
 * Mock data is hard-coded (M3 will wire to daemon tRPC).
 * M5 t3: added "Project Settings" nav link.
 * M0.11.4 Phase C t16: RPG style — rpg-frame + rpg-title for the header bar,
 * chip for discipline labels, exp-bar for metric gauges.
 *
 * WHY anchor instead of Link/useNavigate: DisciplineHeader is used outside
 * BrowserRouter in AppShell test setups. An <a href> avoids the Router
 * context requirement while still providing correct navigation.
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
  testId: string;
}

/** Mock data: hard-coded discipline metrics (M3 will replace with tRPC). */
const MOCK_METRICS: Metric[] = [
  {
    label: 'PARALLEL',
    value: '60%',
    pct: 60,
    testId: 'metric-parallel',
  },
  {
    label: 'TASK TOOL',
    value: 'OK',
    pct: 100,
    testId: 'metric-task-tool',
  },
  {
    label: 'TDD ORDER',
    value: '0 violations',
    pct: 100,
    testId: 'metric-tdd-order',
  },
  {
    label: 'VERDICT',
    value: 'pass',
    pct: 100,
    testId: 'metric-verdict',
  },
];

export function DisciplineHeader({ width: _width = 1080 }: DisciplineHeaderProps): JSX.Element {
  return (
    <header
      data-testid="discipline-header"
      className="rpg-frame flex items-center gap-sp-4"
    >
      {/* Brand title */}
      <span className="rpg-title whitespace-nowrap">
        claude-loom
      </span>

      {/* Discipline chip — nav to project settings */}
      <a
        data-testid="nav-project-settings"
        href="/project-settings"
        className="chip no-underline"
      >
        猫の開発室
      </a>

      {/* Spacer */}
      <div className="flex-1" />

      {/* 4 metric gauges — chip label + exp-bar */}
      {MOCK_METRICS.map((m) => (
        <div
          key={m.label}
          data-testid={m.testId}
          className="flex flex-col gap-[3px] min-w-[100px]"
        >
          <div className="flex justify-between">
            <span className="chip">{m.label}</span>
            <span className="rpg-label">{m.value}</span>
          </div>
          {/* exp-bar for metric percentage */}
          <div className="exp-bar">
            <i style={{ width: `${m.pct}%` }} />
          </div>
        </div>
      ))}
    </header>
  );
}
