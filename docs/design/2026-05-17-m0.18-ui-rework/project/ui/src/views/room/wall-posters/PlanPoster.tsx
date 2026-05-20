/**
 * PlanPoster — 2-column milestone + todo plan wall poster.
 *
 * WHY: Ported from design source room.jsx L103-136 (M0.15 t15 redesign).
 * Scenario-driven: reads useScenario().todos, .milestones, .todosUpdatedAt.
 * Left col: long-term milestones (up to 3) with bar chart.
 * Right col: this-session todos (up to 4) with check status.
 * Uses Phase A CSS class tokens (.room-poster*).
 *
 * Previous implementation (M0.11.4) used hardcoded MILESTONES / TODOS.
 * This version replaces that with live scenario data.
 */
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { MilestoneStatus, TodoStatus } from '@claude-loom/redesign/api/types';

// WHY: map MilestoneStatus to --p-* CSS var for bar fill color.
// Matches design source room.jsx L113 status color map.
const STATUS_COLOR: Record<MilestoneStatus, string> = {
  todo:   'var(--p-stone)',
  doing:  'var(--p-warn)',
  done:   'var(--p-success)',
};

// WHY: check glyph per design source room.jsx L129.
const CHECK_GLYPH: Record<TodoStatus, string> = {
  completed:   '✓',
  in_progress: '●',
  pending:     '',
};

export interface PlanPosterProps {
  x: number;
  y: number;
  width: number;
  height: number;
  onClick: () => void;
}

export function PlanPoster({ x, y, width, height, onClick }: PlanPosterProps) {
  const scenario = useScenario();
  const todos = scenario.todos;
  const milestones = scenario.milestones;
  const updatedAt = scenario.todosUpdatedAt;

  return (
    <button
      className="room-poster room-poster--plan"
      data-testid="plan-poster"
      onClick={onClick}
      style={{ left: x, top: y, width, height }}
    >
      <div className="room-poster__header">
        <div className="room-poster__title">📋 PLAN — TodoWrite + plan_items</div>
        <div className="room-poster__hint">updated: {updatedAt}</div>
      </div>
      <div className="room-poster__body">
        {/* Left col — long-term milestones */}
        <div className="room-poster__col">
          <div className="room-poster__section-label">🗺 milestones</div>
          {milestones.slice(0, 3).map((m) => (
            <div key={m.id} className="room-poster__row">
              <span className="room-poster__row-name" style={{ width: 38 }}>{m.id}</span>
              <div className="room-poster__bar">
                <div
                  className="room-poster__bar-fill"
                  style={{
                    left: 0,
                    width: `${m.progress * 100}%`,
                    background: STATUS_COLOR[m.status],
                  }}
                />
              </div>
              <span className="room-poster__row-meta">{m.count}</span>
            </div>
          ))}
        </div>

        {/* Right col — this-session todos */}
        <div className="room-poster__col">
          <div className="room-poster__section-label">📒 todos · {todos.length}件</div>
          {todos.slice(0, 4).map((t, i) => (
            <div key={i} className="room-poster__row">
              <span className={`room-poster__check room-poster__check--${t.status}`}>
                {CHECK_GLYPH[t.status]}
              </span>
              <span
                className={`room-poster__check-text${t.status === 'completed' ? ' room-poster__check-text--completed' : ''}`}
              >
                {t.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
}
