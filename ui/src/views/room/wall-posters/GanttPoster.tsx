/**
 * GanttPoster — agent activity Gantt chart wall poster.
 *
 * WHY: Ported from design source room.jsx L166-199 (M0.15 t15 redesign).
 * Scenario-driven: reads useScenario().gantt to render live activity bars
 * for the 5 ROOM_AGENTS (pm / dev / rev-code / rev-test / rev-sec).
 * Renders as an interactive button with Phase A CSS class tokens.
 *
 * Previous implementation (M0.11.4) used hardcoded DEFAULT_ROWS fixture.
 * This version replaces that with scenario.gantt rows, using ROSTER for
 * display names and KIND_COLOR for bar colors matching GanttView.tsx.
 */
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { GanttBarKind } from '@claude-loom/redesign/api/types';
import { ROSTER } from '../../../data/roster';

// WHY: 5 agents shown in the room poster — matches design source room.jsx L13.
const ROOM_AGENTS = ['pm', 'dev', 'rev-code', 'rev-test', 'rev-sec'] as const;

// WHY: matches GanttView.tsx KIND_COLOR and redesign/screens/gantt.jsx KIND_COLOR.
const KIND_COLOR: Record<GanttBarKind, string> = {
  busy:   'var(--p-success)',
  review: 'var(--p-accent)',
  tdd:    'var(--p-warn)',
  fail:   'var(--p-error)',
};

export interface GanttPosterProps {
  x: number;
  y: number;
  width: number;
  height: number;
  onClick: () => void;
}

export function GanttPoster({ x, y, width, height, onClick }: GanttPosterProps) {
  const scenario = useScenario();
  const gantt = scenario.gantt;

  // Build rows for the 5 ROOM_AGENTS, looking up display name from ROSTER.
  // WHY: we iterate ROOM_AGENTS (ordered) and find the matching gantt row by
  // agentId so the visual order is stable and matches the design source.
  const rows = ROOM_AGENTS.map((agentId) => {
    const rosterEntry = ROSTER.find((r) => r.id === agentId);
    const name = rosterEntry?.name ?? agentId;
    const ganttRow = gantt.rows.find((r) => r.agentId === agentId);
    const bars = ganttRow?.bars ?? [];
    return { name, bars };
  });

  return (
    <button
      className="room-poster room-poster--gantt"
      data-testid="gantt-poster"
      onClick={onClick}
      style={{ left: x, top: y, width, height }}
    >
      <div className="room-poster__header">
        <div className="room-poster__title">❖ GANTT — {gantt.windowLabel}</div>
        <div className="room-poster__hint">now → / クリックで拡大</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {rows.map((row, i) => (
          <div key={i} className="room-poster__row">
            <span className="room-poster__row-name">{row.name}</span>
            <div className="room-poster__bar">
              {row.bars.map((b, j) => (
                <div
                  key={j}
                  className="room-poster__bar-fill"
                  style={{
                    left: `${b.s}%`,
                    width: `${b.e - b.s}%`,
                    background: KIND_COLOR[b.kind] ?? 'var(--p-stone)',
                  }}
                />
              ))}
              <div className="room-poster__bar-now" style={{ left: `${gantt.nowPct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </button>
  );
}
