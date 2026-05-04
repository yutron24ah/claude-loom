/**
 * PlanPoster — 2-column milestone + todo plan wall poster.
 *
 * WHY: Ported from design source room.jsx L243-286.
 * Left col: long-term milestones with bar chart.
 * Right col: this-week todos with check status.
 * Uses Phase A CSS class tokens (.room-poster*).
 */

export interface PlanPosterProps {
  x: number;
  y: number;
  width: number;
  height: number;
  onClick: () => void;
}

type MilestoneStatus = 'in_progress' | 'pending' | 'completed';
type TodoStatus = 'in_progress' | 'pending' | 'completed';

interface Milestone {
  name: string;
  s: number;
  e: number;
  st: MilestoneStatus;
  count: string;
}

interface Todo {
  s: TodoStatus;
  t: string;
}

const MILESTONES: Milestone[] = [
  { name: 'M0.13', s: 5,  e: 55, st: 'in_progress', count: '3/7' },
  { name: 'M0.14', s: 50, e: 80, st: 'pending',     count: '0/4' },
  { name: 'M1.0',  s: 75, e: 98, st: 'pending',     count: '0/12' },
];

const TODOS: Todo[] = [
  { s: 'in_progress', t: 'user.service.test.ts GREEN' },
  { s: 'pending',     t: 'freee OAuth callback 確認' },
  { s: 'completed',   t: 'PR #41 verdict' },
];

// WHY: map status to --p-* CSS var for bar fill color
const STATUS_COLOR: Record<MilestoneStatus, string> = {
  in_progress: 'var(--p-warn)',
  pending:     'var(--p-stone)',
  completed:   'var(--p-success)',
};

// WHY: check glyph per design source L280
const CHECK_GLYPH: Record<TodoStatus, string> = {
  completed:   '✓',
  in_progress: '●',
  pending:     '',
};

export function PlanPoster({ x, y, width, height, onClick }: PlanPosterProps) {
  return (
    <button
      className="room-poster room-poster--plan"
      data-testid="plan-poster"
      onClick={onClick}
      style={{ left: x, top: y, width, height }}
    >
      <div className="room-poster__header">
        <div className="room-poster__title">📋 PLAN BOARD — 30 Apr</div>
        <div className="room-poster__hint">→ クリックで拡大</div>
      </div>
      <div className="room-poster__body">
        {/* Left col — long-term milestones */}
        <div className="room-poster__col">
          <div className="room-poster__section-label">🗺 長期 — milestones</div>
          {MILESTONES.map((m, i) => (
            <div key={i} className="room-poster__row">
              <span className="room-poster__row-name" style={{ width: 38 }}>{m.name}</span>
              <div className="room-poster__bar">
                <div
                  className="room-poster__bar-fill"
                  style={{ left: `${m.s}%`, width: `${m.e - m.s}%`, background: STATUS_COLOR[m.st] }}
                />
                <div className="room-poster__bar-now" style={{ left: '45%' }} />
              </div>
              <span className="room-poster__row-meta">{m.count}</span>
            </div>
          ))}
        </div>

        {/* Right col — this-week todos */}
        <div className="room-poster__col">
          <div className="room-poster__section-label">📒 今週 — todos · 5件</div>
          {TODOS.map((t, i) => (
            <div key={i} className="room-poster__row">
              <span className={`room-poster__check room-poster__check--${t.s}`}>
                {CHECK_GLYPH[t.s]}
              </span>
              <span className={`room-poster__check-text${t.s === 'completed' ? ' room-poster__check-text--completed' : ''}`}>
                {t.t}
              </span>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
}
