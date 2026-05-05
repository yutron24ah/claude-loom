/**
 * GanttView — SVG-based progress bars showing agent / plan activity.
 *
 * WHY: M3.1 t4 rewrites the M2 Tailwind-div mock to pure SVG so that
 * CSS variable tokens (--color-bar, --color-border etc.) directly control
 * SVG fill/stroke. This makes theme switching (pop/dusk/night) instant
 * with zero JS — the browser re-paints on CSS variable change alone.
 *
 * SPEC §3.6.9.3 (Gantt γ-3): self-contained SVG, tokens.css var reference,
 * 200-400 LoC, bar click → Agent Detail navigate.
 *
 * Layout constants:
 *   LABEL_WIDTH  — px reserved for row label column
 *   ROW_HEIGHT   — px per agent row
 *   BAR_INSET    — px top/bottom inset from row boundary
 *   TICK_COUNT   — number of vertical grid lines
 *   HEADER_H     — px for top time-axis row
 */
import { useNavigate } from 'react-router-dom';
import { useGanttData } from '../../live/useGanttData';
import type { GanttRow, GanttBar } from '../../live/useGanttData';
import { CatSprite } from '../../components/CatSprite';

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------
const LABEL_WIDTH = 130;
const ROW_HEIGHT = 44;
const BAR_INSET = 8;
const TICK_COUNT = 5;
const HEADER_H = 24;
const FONT_MONO = 'ui-monospace, monospace';
/**
 * Track width in logical SVG units.
 * WHY: module-level constant so TRACK_W and SVG_W are stable references
 * across renders. SVG_H remains in render because it depends on rows.length.
 */
const TRACK_W = 600;
const SVG_W = LABEL_WIDTH + TRACK_W;

/**
 * Time tick labels displayed on the time axis.
 * WHY: Hard-coded for M3.1; M3.2 will derive from real session start time.
 */
const TIME_LABELS = ['13:30', '13:45', '14:00', '14:15', 'now'];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Renders the time-axis header row with tick labels. */
function TimeAxis({
  trackW,
  y,
}: {
  trackW: number;
  y: number;
}): JSX.Element {
  return (
    <g data-testid="gantt-time-axis">
      {TIME_LABELS.map((label, i) => {
        const xPos = LABEL_WIDTH + (i / (TIME_LABELS.length - 1)) * trackW;
        return (
          <text
            key={label}
            x={xPos}
            y={y + 14}
            fontSize={9}
            fontFamily={FONT_MONO}
            fill="var(--color-muted)"
            textAnchor="middle"
          >
            {label}
          </text>
        );
      })}
    </g>
  );
}

/** Renders vertical grid <line> elements spanning the full chart height. */
function GridLines({
  trackW,
  totalH,
}: {
  trackW: number;
  totalH: number;
}): JSX.Element {
  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => i);
  return (
    <g>
      {ticks.map((i) => {
        const x = LABEL_WIDTH + (i / (TICK_COUNT - 1)) * trackW;
        return (
          <line
            key={i}
            data-testid="gantt-grid-line"
            x1={x}
            y1={HEADER_H}
            x2={x}
            y2={totalH}
            stroke="var(--color-border)"
            strokeWidth={1}
            strokeOpacity={0.3}
          />
        );
      })}
    </g>
  );
}

/**
 * Renders a single bar <rect> with label <text>.
 * WHY: fill="var(--color-bar)" is a CSS variable reference that SVG
 * supports natively — theme changes propagate without any JS re-render.
 */
function BarRect({
  bar,
  agentId,
  rowY,
  trackW,
  onBarClick,
}: {
  bar: GanttBar;
  agentId: string;
  rowY: number;
  trackW: number;
  onBarClick: (agentId: string) => void;
}): JSX.Element {
  const x = LABEL_WIDTH + (bar.startPct / 100) * trackW;
  const w = ((bar.endPct - bar.startPct) / 100) * trackW;
  const y = rowY + BAR_INSET;
  const h = ROW_HEIGHT - BAR_INSET * 2;

  return (
    <g
      style={{ cursor: 'pointer' }}
      onClick={() => onBarClick(agentId)}
    >
      <rect
        data-testid="gantt-bar-rect"
        x={x}
        y={y}
        width={w}
        height={h}
        fill="var(--color-bar)"
        stroke="var(--color-border)"
        strokeWidth={1}
        rx={2}
      />
      {/* Bar label — clipped to bar width; uses foreignObject is avoided per KISS */}
      <text
        x={x + 4}
        y={y + h / 2 + 4}
        fontSize={9}
        fontFamily={FONT_MONO}
        fontWeight="bold"
        fill="var(--color-bar-text)"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {bar.label}
      </text>
    </g>
  );
}

/** Renders one agent row: label text + bar track background + bars. */
function AgentRow({
  row,
  rowIdx,
  trackW,
  onBarClick,
}: {
  row: GanttRow;
  rowIdx: number;
  trackW: number;
  onBarClick: (agentId: string) => void;
}): JSX.Element {
  const rowY = HEADER_H + rowIdx * ROW_HEIGHT;
  const midY = rowY + ROW_HEIGHT / 2;

  return (
    <g data-testid="gantt-row">
      {/* Row separator line */}
      {rowIdx > 0 && (
        <line
          x1={0}
          y1={rowY}
          x2={LABEL_WIDTH + trackW}
          y2={rowY}
          stroke="var(--color-border)"
          strokeWidth={1}
          strokeDasharray="4 2"
          strokeOpacity={0.4}
        />
      )}

      {/* Agent label */}
      <text
        x={LABEL_WIDTH - 8}
        y={midY + 4}
        fontSize={10}
        fontFamily={FONT_MONO}
        fontWeight="bold"
        fill="var(--color-fg1)"
        textAnchor="end"
      >
        {row.label}
      </text>

      {/* Bar track background */}
      <rect
        x={LABEL_WIDTH}
        y={rowY + 2}
        width={trackW}
        height={ROW_HEIGHT - 4}
        fill="var(--color-bg3)"
        stroke="var(--color-border)"
        strokeWidth={1}
      />

      {/* Bars */}
      {row.bars.map((bar) => (
        <BarRect
          key={bar.barKey}
          bar={bar}
          agentId={row.agentId}
          rowY={rowY}
          trackW={trackW}
          onBarClick={onBarClick}
        />
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * GanttView — renders a Gantt chart as a pure SVG element.
 *
 * Viewport width: fills the container div (100% wide, fixed height).
 * CSS variables are referenced directly in SVG fill/stroke attributes,
 * so [data-theme="pop|dusk|night"] changes on <html> propagate instantly.
 */
export function GanttView(): JSX.Element {
  const navigate = useNavigate();
  const { rows, isLoading, error } = useGanttData();

  // Loading state
  if (isLoading) {
    return (
      <div
        data-testid="gantt-loading"
        className="rpg-frame pixel text-fg2 text-fs-sm"
        style={{ padding: 16 }}
      >
        読み込み中…
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        data-testid="gantt-error"
        className="rpg-frame pixel text-fs-sm"
        style={{ padding: 16, color: 'var(--p-error)' }}
      >
        接続エラー
      </div>
    );
  }

  const handleBarClick = (agentId: string) => {
    navigate(`/agent/${agentId}`);
  };

  // SVG height computed from row count; TRACK_W + SVG_W are module-level constants.
  const SVG_H = HEADER_H + rows.length * ROW_HEIGHT + 4;

  return (
    <div className="rpg-frame pixel" style={{ padding: 16 }}>
      {/* Chart title + zoom chips */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 className="rpg-title">
          進捗ガント — 直近 1 時間
        </h2>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['30m', '1h', '4h', 'all'] as const).map((z, i) => (
            <span
              key={z}
              className="chip"
              style={{ background: i === 1 ? 'var(--p-accent)' : undefined, color: i === 1 ? 'white' : undefined }}
            >
              {z}
            </span>
          ))}
        </div>
      </div>

      {/* Cat sprite strip — one per agent row (RPG design source §screens-a.jsx) */}
      <div style={{ display: 'flex', paddingLeft: LABEL_WIDTH, gap: 0, marginBottom: 2 }}>
        {/* spacer row — cats are positioned in the rows below */}
      </div>

      {/* SVG chart */}
      <svg
        data-testid="gantt-svg"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        height={SVG_H}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Vertical grid lines behind rows */}
        <GridLines trackW={TRACK_W} totalH={SVG_H} />

        {/* Time axis header */}
        <TimeAxis trackW={TRACK_W} y={0} />

        {/* Agent rows — each row includes cat sprite via foreignObject */}
        {rows.map((row, idx) => (
          <AgentRow
            key={row.agentId}
            row={row}
            rowIdx={idx}
            trackW={TRACK_W}
            onBarClick={handleBarClick}
          />
        ))}

        {/* "now" indicator — rightmost position */}
        <line
          x1={LABEL_WIDTH + TRACK_W * 0.95}
          y1={HEADER_H}
          x2={LABEL_WIDTH + TRACK_W * 0.95}
          y2={SVG_H}
          stroke="var(--color-error)"
          strokeWidth={2}
        />
      </svg>

      {/* CatSprite legend — per-row cat visible in label column
          WHY: CatSprites use DOM SVG (not foreignObject) for reliable rendering.
          Positioned as a separate overlaid strip aligned with SVG rows. */}
      <div
        style={{
          position: 'relative',
          marginTop: -(SVG_H),
          height: SVG_H,
          pointerEvents: 'none',
        }}
      >
        {rows.map((row, idx) => {
          const rowY = HEADER_H + idx * ROW_HEIGHT;
          return (
            <div
              key={row.agentId}
              data-testid="cat-sprite"
              style={{
                position: 'absolute',
                top: rowY + (ROW_HEIGHT - 28) / 2,
                left: 4,
                width: 28,
                height: 28,
              }}
            >
              <CatSprite size={28} pose="sit" />
            </div>
          );
        })}
      </div>

      {/* Status legend */}
      <div style={{ marginTop: 10, display: 'flex', gap: 10, fontSize: 9, color: 'var(--p-text-muted)' }}>
        <span><span className="dot busy" /> busy</span>
        <span><span className="dot review" /> review</span>
        <span><span className="dot tdd" /> TDD red</span>
        <span><span className="dot fail" /> failed</span>
      </div>
    </div>
  );
}
