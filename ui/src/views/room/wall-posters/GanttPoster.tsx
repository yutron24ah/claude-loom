/**
 * GanttPoster — agent activity Gantt chart wall poster.
 *
 * WHY: Ported from design source room.jsx L216-240.
 * Renders as an interactive button with Phase A CSS class tokens.
 * Default rows match the exact design source data (5 agents).
 */

export interface GanttBar {
  /** start percentage (left offset) */
  s: number;
  /** end percentage (right bound) */
  e: number;
  /** CSS color value e.g. var(--p-accent) */
  c: string;
}

export interface GanttPosterRow {
  name: string;
  bars: GanttBar[];
}

const DEFAULT_ROWS: GanttPosterRow[] = [
  { name: 'ニケ', bars: [{ s: 5,  e: 95, c: 'var(--p-accent)' }] },
  { name: 'サバ', bars: [{ s: 12, e: 38, c: 'var(--p-success)' }, { s: 44, e: 74, c: 'var(--p-warn)' }, { s: 76, e: 92, c: 'var(--p-success)' }] },
  { name: 'ペン', bars: [{ s: 40, e: 56, c: 'var(--p-accent)' }, { s: 70, e: 84, c: 'var(--p-error)' }] },
  { name: 'メメ', bars: [{ s: 22, e: 48, c: 'var(--p-accent)' }, { s: 60, e: 80, c: 'var(--p-accent)' }] },
  { name: 'マル', bars: [{ s: 86, e: 95, c: 'var(--p-accent)' }] },
];

export interface GanttPosterProps {
  x: number;
  y: number;
  width: number;
  height: number;
  onClick: () => void;
  rows?: GanttPosterRow[];
}

export function GanttPoster({ x, y, width, height, onClick, rows = DEFAULT_ROWS }: GanttPosterProps) {
  return (
    <button
      className="room-poster room-poster--gantt"
      data-testid="gantt-poster"
      onClick={onClick}
      style={{ left: x, top: y, width, height }}
    >
      <div className="room-poster__header">
        <div className="room-poster__title">❖ 進捗 GANTT — 直近 1h</div>
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
                  style={{ left: `${b.s}%`, width: `${b.e - b.s}%`, background: b.c }}
                />
              ))}
              <div className="room-poster__bar-now" style={{ left: '95%' }} />
            </div>
          </div>
        ))}
      </div>
    </button>
  );
}
