/**
 * GanttView — redesign port driven by useScenario() (M0.15 t2).
 *
 * WHY this rewrite (SPEC §3.6.14):
 * The previous implementation used useGanttData() (tRPC hook) with a
 * hardcoded fixture that predated the redesign bundle.
 * This port consumes scenario.gantt from the useScenario() WS hook so
 * the Gantt chart reflects live event-reducer state (same seam as RoomView).
 *
 * Data shape (redesign/api/types.ts GanttData):
 *   { windowLabel: string, nowPct: number, rows: GanttRow[] }
 *   GanttRow: { worktree, agentId, label, bars: GanttBar[], live? }
 *   GanttBar: { s: number, e: number, kind: 'busy'|'review'|'tdd'|'fail' }
 *
 * Visual layout (design SSoT: redesign/screens/gantt.jsx):
 *   - rows grouped by worktree (collapsible section headers)
 *   - each row: label column + percentage bar track
 *   - now-line at gantt.nowPct (vertical red line)
 *   - walking cat sprite on rows where live=true (positioned at nowPct)
 *   - zoom chip strip (30m/1h/4h/all) — state local
 */
import React, { useState } from 'react';
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { GanttBar, GanttBarKind, GanttRow } from '@claude-loom/redesign/api/types';
import { CatSprite } from '../../components/CatSprite';
import { ROSTER } from '../../data/roster';
import '../../styles/screens/gantt.css';

// ---------------------------------------------------------------------------
// Kind → CSS color map
// WHY: matches redesign/screens/gantt.jsx KIND_COLOR for visual parity.
// ---------------------------------------------------------------------------
const KIND_COLOR: Record<GanttBarKind, string> = {
  busy:   'var(--p-success)',
  review: 'var(--p-accent)',
  tdd:    'var(--p-warn)',
  fail:   'var(--p-error)',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Single bar segment in a row track. */
function GanttBarSegment({ bar }: { bar: GanttBar }): JSX.Element {
  return (
    <div
      data-kind={bar.kind}
      title={bar.kind}
      className="gantt-bar-segment"
      style={{
        left: `${bar.s}%`,
        width: `${bar.e - bar.s}%`,
        background: KIND_COLOR[bar.kind] ?? 'var(--p-stone)',
      }}
    >
      {bar.kind}
    </div>
  );
}

/**
 * One agent row: label column + bar track with grid guides + optional live cat.
 *
 * WHY live cat position: the walking cat sits at `100 - nowPct` from the right
 * (matching redesign/screens/gantt.jsx L94: right: `${100-gantt.nowPct}%`).
 * This pins the sprite to the "now" anchor in the bar track.
 */
function GanttAgentRow({
  row,
  nowPct,
}: {
  row: GanttRow;
  nowPct: number;
}): JSX.Element {
  const agent = ROSTER.find((r) => r.id === row.agentId);

  return (
    <div
      data-testid="gantt-row"
      className="gantt-agent-row"
    >
      {/* Label column */}
      <div className="gantt-agent-row__label">
        {agent && (
          <CatSprite
            size={22}
            fur={agent.fur}
            cheek={agent.cheek}
            hat={agent.hat}
            pose="sit"
          />
        )}
        <div>
          <div className="gantt-agent-row__name">
            {agent?.name ?? row.agentId}
          </div>
          <div className="gantt-agent-row__role">
            {row.label}
          </div>
        </div>
      </div>

      {/* Bar track */}
      <div className="gantt-bar-track">
        {/* Quarter grid guides */}
        {[25, 50, 75].map((p) => (
          <div
            key={p}
            className="gantt-bar-track__guide"
            style={{ left: `${p}%` }}
          />
        ))}

        {/* Bar segments */}
        {row.bars.map((bar, j) => (
          <GanttBarSegment key={j} bar={bar} />
        ))}

        {/* Walking cat on live rows — pinned to nowPct */}
        {row.live && (
          <span
            data-testid="gantt-live-cat"
            className="gantt-live-cat"
            style={{ right: `${100 - nowPct}%` }}
          >
            <CatSprite
              size={22}
              fur={agent?.fur ?? '#aaa'}
              hat={agent?.hat ?? null}
              pose="walk"
            />
          </span>
        )}

        {/* Now-line (vertical red line at nowPct) */}
        <div
          data-testid="gantt-now-line"
          className="gantt-now-line"
          style={{ left: `${nowPct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Worktree group section: collapsible header + agent rows.
 *
 * WHY collapse state is per-group: mirrors redesign/screens/gantt.jsx
 * which uses React.useState({ [wt]: bool }) for independent collapse.
 */
function WorktreeGroup({
  worktree,
  rows,
  nowPct,
  collapsed,
  onToggle,
}: {
  worktree: string;
  rows: GanttRow[];
  nowPct: number;
  collapsed: boolean;
  onToggle: () => void;
}): JSX.Element {
  const isLive = rows.some((r) => r.live);

  return (
    <div className="gantt-group">
      {/* Group header */}
      <div
        onClick={onToggle}
        className="gantt-group__header"
        style={{
          borderBottom: collapsed ? 'none' : '1px solid var(--p-border)',
        }}
      >
        <span className="gantt-group__chevron">{collapsed ? '▸' : '▾'}</span>
        <span>⌗ {worktree}</span>
        <span className="gantt-group__subagent-count">
          ({rows.length} subagent{rows.length > 1 ? 's' : ''})
        </span>
        <span className="gantt-group__live-badge">
          {isLive ? '● LIVE' : '—'}
        </span>
      </div>

      {/* Agent rows (hidden when collapsed) */}
      {!collapsed &&
        rows.map((row) => (
          <GanttAgentRow key={row.agentId} row={row} nowPct={nowPct} />
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * GanttView — renders agent activity Gantt grouped by worktree.
 *
 * Data is consumed from useScenario().gantt so the view reflects
 * live event-reducer state via the redesign WS hook.
 *
 * WHY no useNavigate: The redesign source (gantt.jsx) treats the Gantt
 * as a read-only history view — no bar-click navigation. The old
 * useNavigate wiring is removed to avoid requiring a Router wrapper in
 * tests (aligns with redesign/screens/gantt.jsx behavior).
 */
export function GanttView(): JSX.Element {
  const scenario = useScenario();
  const gantt = scenario.gantt;

  const [zoom, setZoom] = useState<'30m' | '1h' | '4h' | 'all'>('30m');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Group rows by worktree, preserving insertion order
  const groups: Record<string, GanttRow[]> = {};
  gantt.rows.forEach((r) => {
    if (!groups[r.worktree]) groups[r.worktree] = [];
    groups[r.worktree].push(r);
  });
  const worktrees = Object.keys(groups);

  const handleToggle = (wt: string) => {
    setCollapsed((prev) => ({ ...prev, [wt]: !prev[wt] }));
  };

  return (
    <div
      data-testid="gantt-view"
      className="gantt-screen"
    >
      {/* Header: title + window label + zoom strip */}
      <div className="gantt-header">
        <div className="gantt-header__title">
          ❖ GANTT — agent_history
        </div>
        <span className="chip">{gantt.windowLabel}</span>
        <div className="gantt-header__spacer" />
        <div className="gantt-header__zoom-strip">
          {(['30m', '1h', '4h', 'all'] as const).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className="gantt-zoom-btn"
              style={{
                background: z === zoom ? 'var(--p-accent)' : 'var(--p-tint)',
                color: z === zoom ? 'white' : 'var(--p-text)',
              }}
            >
              {z}
            </button>
          ))}
        </div>
      </div>

      {/* Time axis labels */}
      <div className="gantt-time-axis">
        {['-30m', '-22m', '-15m', '-7m', 'now'].map((t, i, a) => (
          <div
            key={t}
            style={{
              width: `${100 / (a.length - 1)}%`,
              textAlign: i === 0 ? 'left' : 'center',
            }}
          >
            {t}
          </div>
        ))}
      </div>

      {/* Worktree groups */}
      {worktrees.map((wt) => (
        <WorktreeGroup
          key={wt}
          worktree={wt}
          rows={groups[wt]}
          nowPct={gantt.nowPct}
          collapsed={collapsed[wt] ?? false}
          onToggle={() => handleToggle(wt)}
        />
      ))}

      {/* Legend */}
      <div className="gantt-legend">
        ◆ <b>F-12 解決</b>: row = 1 subagent dispatch、worktree は折りたたみグループ。
        SPEC §3.6.5 の subagent-row 流儀に統一。
        <br />◆ live 中の dispatch には歩く猫 🐈 を bar の右端に重ねて、stream/poster
        と視線を一致させる。
      </div>
    </div>
  );
}
