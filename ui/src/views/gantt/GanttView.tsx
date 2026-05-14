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
      style={{
        position: 'absolute',
        left: `${bar.s}%`,
        width: `${bar.e - bar.s}%`,
        top: 4,
        bottom: 4,
        background: KIND_COLOR[bar.kind] ?? 'var(--p-stone)',
        border: '1px solid var(--p-border)',
        backgroundImage:
          'repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0 3px, transparent 3px 6px)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 4,
        fontSize: 8,
        color: 'white',
        fontWeight: 700,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
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
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 36,
        borderTop: '1px dashed var(--p-border)',
      }}
    >
      {/* Label column */}
      <div
        style={{
          width: 200,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 10px',
          flexShrink: 0,
        }}
      >
        {agent && (
          <CatSprite
            size={22}
            fur={agent.fur}
            cheek={agent.cheek}
            hat={agent.hat}
            pose="sit"
          />
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700 }}>
            {agent?.name ?? row.agentId}
          </div>
          <div
            style={{
              fontSize: 8,
              color: 'var(--p-text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {row.label}
          </div>
        </div>
      </div>

      {/* Bar track */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          height: 24,
          background: 'var(--p-tint)',
          border: '1px solid var(--p-border)',
          marginRight: 16,
        }}
      >
        {/* Quarter grid guides */}
        {[25, 50, 75].map((p) => (
          <div
            key={p}
            style={{
              position: 'absolute',
              left: `${p}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: 'var(--p-border)',
              opacity: 0.3,
            }}
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
            style={{
              position: 'absolute',
              right: `${100 - nowPct}%`,
              top: -4,
            }}
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
          style={{
            position: 'absolute',
            left: `${nowPct}%`,
            top: -2,
            bottom: -2,
            width: 2,
            background: 'var(--p-error)',
          }}
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
    <div
      style={{
        marginBottom: 8,
        border: '2px solid var(--p-border)',
        background: 'var(--p-paper)',
      }}
    >
      {/* Group header */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          background: 'var(--p-tint)',
          borderBottom: collapsed ? 'none' : '1px solid var(--p-border)',
          cursor: 'pointer',
          fontSize: 10,
          fontWeight: 700,
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        <span style={{ width: 10 }}>{collapsed ? '▸' : '▾'}</span>
        <span>⌗ {worktree}</span>
        <span style={{ color: 'var(--p-text-muted)', fontWeight: 400 }}>
          ({rows.length} subagent{rows.length > 1 ? 's' : ''})
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 9,
            color: 'var(--p-text-muted)',
          }}
        >
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
      style={{
        position: 'absolute',
        inset: 0,
        padding: 16,
        overflow: 'auto',
        background: 'var(--p-bg-sky)',
      }}
    >
      {/* Header: title + window label + zoom strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700 }}>
          ❖ GANTT — agent_history
        </div>
        <span className="chip">{gantt.windowLabel}</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', border: '2px solid var(--p-border)' }}>
          {(['30m', '1h', '4h', 'all'] as const).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: '3px 10px',
                fontSize: 9,
                fontWeight: 700,
                background:
                  z === zoom ? 'var(--p-accent)' : 'var(--p-tint)',
                color: z === zoom ? 'white' : 'var(--p-text)',
                borderRight: '1px solid var(--p-border)',
              }}
            >
              {z}
            </button>
          ))}
        </div>
      </div>

      {/* Time axis labels */}
      <div
        style={{
          display: 'flex',
          paddingLeft: 200,
          marginBottom: 6,
          fontSize: 9,
          color: 'var(--p-text-muted)',
        }}
      >
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
      <div
        style={{
          marginTop: 12,
          padding: '8px 12px',
          fontSize: 9,
          color: 'var(--p-text-muted)',
          background: 'var(--p-paper)',
          border: '2px dashed var(--p-border)',
          lineHeight: 1.5,
        }}
      >
        ◆ <b>F-12 解決</b>: row = 1 subagent dispatch、worktree は折りたたみグループ。
        SPEC §3.6.5 の subagent-row 流儀に統一。
        <br />◆ live 中の dispatch には歩く猫 🐈 を bar の右端に重ねて、stream/poster
        と視線を一致させる。
      </div>
    </div>
  );
}
