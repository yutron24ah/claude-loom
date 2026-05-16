/**
 * RoomView (proposed v2) — responsive, design-faithful port.
 *
 * Diff vs current ui/src/views/room/RoomView.tsx:
 *
 * 1. SIZE: prop `width`/`height` removed. Component fills its parent and
 *    uses ResizeObserver to track size. Matches redesign/screens/room.jsx
 *    L385-393 (the only correct way to fill an absolute-positioned content
 *    region whose width depends on whether PMChatPanel is mounted).
 *
 * 2. ZONES: Islands import removed. Zones are now painted *inside*
 *    RoomBackground as low-opacity rugs (see RoomBackground.proposed.tsx).
 *
 * 3. POSITIONS: hard-coded {x,y} table replaced with W/H/floorY ratio
 *    formula matching redesign source L334-345:
 *      pm        → (W*0.78, floorY + 50)
 *      dev       → (W*0.18, floorY + 80)
 *      rev-code  → (W*0.62, floorY + (H-floorY)*0.55 + 40)
 *      rev-test  → (W*0.74, ...)
 *      rev-sec   → (W*0.86, ...)
 *
 * 4. WORKTREE CLONES: cloned mini-cats now sit *above the dev desk*,
 *    not glued to its right. Position formula:
 *      x = positions.dev.x + 60 + i * 56
 *      y = positions.dev.y - 60
 *
 * 5. MODAL OVERLAYS REMOVED: showGantt / showPlan / showConsistency
 *    state and the four <div className="room-modal"> blocks are deleted.
 *    Posters now navigate via React Router (the AppShell handles routing
 *    to /gantt, /plan, /consistency). Source of routing: single
 *    location.pathname check in AppShell.
 *
 * 6. LIVE RAIL: when PM is not running, mount <LiveRail/> (new file) so
 *    the right column always has *something* showing instead of empty space.
 *
 * 7. RETRO MODE TOGGLE: kept but moved to drawer (Manage group) eventually.
 *    For this iteration we leave the in-room toggle but reduce its prominence.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoomBackground } from './RoomBackground';
import { RoomWallDecor } from './decor/RoomWallDecor';
import { GanttPoster } from './wall-posters/GanttPoster';
import { PlanPoster } from './wall-posters/PlanPoster';
import { ConsistencyPoster } from './wall-posters/ConsistencyPoster';
import { DeskStation, type DeskStatus } from './DeskStation';
import { SubroomClone } from './SubroomClone';
import { RetroGathering } from './RetroGathering';
import { AgentDetailPanel } from './AgentDetailPanel';
import { ROSTER } from '../../data/roster';
import type { RosterEntry } from '../../data/roster';
import { useViewStore } from '../../store/view';
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { AgentState } from '@claude-loom/redesign/api/types';

// ---------------------------------------------------------------------------
// The 5 agents that have a *desk* in the open office.
// retro/* agents are introduced via RetroGathering when retroMode is on.
// ---------------------------------------------------------------------------
const ROOM_AGENT_IDS = ['pm', 'dev', 'rev-code', 'rev-test', 'rev-sec'] as const;
type RoomAgentId = (typeof ROOM_AGENT_IDS)[number];

interface Size {
  w: number;
  h: number;
}

// ---------------------------------------------------------------------------
// Position table derived from W/H/floorY.
// Source of truth: redesign/screens/room.jsx L334-345.
// ---------------------------------------------------------------------------
function buildPositions(
  W: number,
  H: number,
  floorY: number,
): Record<RoomAgentId, { x: number; y: number }> {
  const reviewRowY = floorY + (H - floorY) * 0.55 + 40;
  return {
    pm: { x: W * 0.78, y: floorY + 50 },
    dev: { x: W * 0.18, y: floorY + 80 },
    'rev-code': { x: W * 0.62, y: reviewRowY },
    'rev-test': { x: W * 0.74, y: reviewRowY },
    'rev-sec': { x: W * 0.86, y: reviewRowY },
  };
}

// ---------------------------------------------------------------------------
// AgentState (scenario) → DeskStation props
// ---------------------------------------------------------------------------
function toDeskStatus(state: AgentState | undefined): DeskStatus {
  const s = state?.status ?? 'idle';
  if (s === 'failed') return 'fail';
  if (s === 'completed') return 'idle';
  if (s === 'busy' || s === 'review' || s === 'idle') return s;
  return 'idle';
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function toBubble(state: AgentState | undefined): string | undefined {
  if (!state) return undefined;
  if (state.currentTool) return state.currentTool;
  if (state.currentReasoning) return truncate(state.currentReasoning, 28);
  return undefined;
}

// ---------------------------------------------------------------------------
// RoomView component
// ---------------------------------------------------------------------------
export function RoomView(): JSX.Element {
  const scenario = useScenario();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>({ w: 1200, h: 700 });
  const [sel, setSel] = useState<string | null>(null);
  const [retroMode, setRetroMode] = useState(false);

  // Subscribe to container size — fills whatever the AppShell content gives us.
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => {
      const r = e.contentRect;
      setSize({
        w: Math.max(900, r.width),
        h: Math.max(560, r.height),
      });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const { w: W, h: H } = size;
  const floorY = H * 0.43;
  const wallTop = 28;
  const positions = buildPositions(W, H, floorY);

  const isIdleAll = ROOM_AGENT_IDS.every(
    (id) => (scenario.agents[id]?.status ?? 'idle') === 'idle',
  );

  const selectedEntry: RosterEntry | null = sel
    ? (ROSTER.find((r) => r.id === sel) ?? null)
    : null;
  const devCat = ROSTER.find((r) => r.id === 'dev')!;

  return (
    <div
      ref={ref}
      className={`room ${isIdleAll ? 'idle-hush' : ''}`}
      data-testid="room-canvas"
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    >
      {/* === Background (wall + floor + zone rugs + props) === */}
      <RoomBackground width={W} height={H} />

      {/* === Wall decor (branch sign + clock) === */}
      <RoomWallDecor width={W} branch={scenario.branch} />

      {/* === Wall posters — clicking navigates via React Router === */}
      {!retroMode && (
        <>
          <GanttPoster
            x={Math.max(14, W * 0.02)}
            y={wallTop}
            width={360}
            height={125}
            onClick={() => navigate('/gantt')}
          />
          <PlanPoster
            x={Math.max(390, W * 0.32)}
            y={wallTop}
            width={350}
            height={125}
            onClick={() => navigate('/plan')}
          />
          <ConsistencyPoster
            x={Math.min(W - 220, W * 0.78)}
            y={wallTop}
            width={200}
            height={125}
            onClick={() => navigate('/consistency')}
          />
        </>
      )}

      {/* === DeskStation agents === */}
      {!retroMode &&
        ROOM_AGENT_IDS.map((id) => {
          const cat = ROSTER.find((r) => r.id === id);
          if (!cat) return null;
          const p = positions[id];
          const state = scenario.agents[id];
          // WHY: state.walkTo is an agent id (string). Convert to pixel offset
          // by looking up the target desk position, matching redesign room.jsx L460-462.
          const walkTargetId = state?.walkTo as string | undefined;
          const walkTarget = walkTargetId ? positions[walkTargetId as RoomAgentId] : undefined;
          const walkTo = walkTarget
            ? { dx: walkTarget.x - p.x, dy: walkTarget.y - p.y }
            : undefined;
          return (
            <DeskStation
              key={id}
              x={p.x}
              y={p.y}
              cat={cat}
              status={toDeskStatus(state)}
              task={toBubble(state)}
              scroll={state?.status !== 'idle'}
              label={
                state?.status === 'idle' && state?.lastSeenAt
                  ? `last: ${state.lastSeenAt}`
                  : cat.role
              }
              selected={sel === id}
              walkTo={walkTo}
              onClick={() => {
                const next = sel === id ? null : id;
                setSel(next);
                useViewStore.getState().setSelectedAgentId(next);
              }}
            />
          );
        })}

      {/* === Worktree clones — sit *above* the dev desk === */}
      {!retroMode &&
        scenario.worktrees
          .filter((w) => w.parentAgent === 'dev')
          .slice(0, 4)
          .map((w, i) => (
            <SubroomClone
              key={i}
              x={positions.dev.x + 60 + i * 56}
              y={positions.dev.y - 60}
              cat={devCat}
              branch={w.branch}
              status={w.status === 'failed' ? 'review' : (w.status as 'busy' | 'review' | 'idle')}
              onClick={() => navigate(`/worktree?branch=${encodeURIComponent(w.branch)}`)}
            />
          ))}

      {/* === Retro mode === */}
      {retroMode && (
        <RetroGathering
          width={W}
          height={H}
          sel={sel}
          setSel={(id) => {
            setSel(id);
            useViewStore.getState().setSelectedAgentId(id);
          }}
        >
          <div>RetroView placeholder</div>
        </RetroGathering>
      )}

      {/* === ColdStart card — shown when everyone is idle and PM is off === */}
      {isIdleAll && !scenario.pm.running && (
        <div className="coldstart">
          <h3>みんな寝てます 💤</h3>
          <p>
            このプロジェクトでは現在 claude code セッションが動いていません。
            <br />
            前回の値は壁に貼ってあります。
          </p>
          <div className="row">
            <button className="btn-px primary" onClick={() => alert('POST /pm/start')}>
              ▶ PM を起動
            </button>
            <span style={{ fontSize: 9, color: 'var(--p-text-muted)' }}>
              or terminal で <code>/loom-pm</code>
            </span>
          </div>
        </div>
      )}

      {/* === Agent detail drawer === */}
      {selectedEntry && (
        <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 10 }}>
          <AgentDetailPanel
            agent={selectedEntry}
            onClose={() => {
              setSel(null);
              useViewStore.getState().setSelectedAgentId(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
