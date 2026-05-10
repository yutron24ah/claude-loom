/**
 * RoomView — DOM/SVG orchestration hub for the claude-loom room.
 *
 * WHY this rewrite (M0.12 redesign):
 * The previous version (M0.11.4 / Phase B) used a hard-coded AGENT_STATES
 * literal — `task: "GREEN にする"` etc. — which conflated design-time fixture
 * with production state. The redesign bundle (claude-loom/redesign/) reframes
 * this so that the room consumes a *scenario shape* via `useScenario()`:
 *
 *   - ?mock=idle  → all cats sleeping (last-seen badges, hush filter)
 *   - ?mock=active → busy cats animate via agent.change deltas
 *   - ?mock=failed → dev cat in fail state
 *   - no mock query → live daemon WS feed
 *
 * The component otherwise preserves M0.11.4 contracts:
 *   - `data-testid="room-canvas"` on the wrapper (AppShell.test.tsx)
 *   - retroMode toggle, SubroomClone overlays, modal overlays
 *   - useViewStore.setSelectedAgentId on agent click
 *
 * SOURCE OF TRUTH for the visual layout: redesign/screens/room.jsx (read-only).
 * SOURCE OF TRUTH for the data shape:    redesign/api/types.ts.
 */
import React, { useState } from 'react';
import { RoomBackground } from './RoomBackground';
import { RoomWallDecor } from './decor/RoomWallDecor';
import { RoomModeToggle } from './decor/RoomModeToggle';
import { Plant } from './decor/Plant';
import { Islands } from './Islands';
import { GanttPoster } from './wall-posters/GanttPoster';
import { PlanPoster } from './wall-posters/PlanPoster';
import { ConsistencyPoster } from './wall-posters/ConsistencyPoster';
import { DeskStation, type DeskStatus } from './DeskStation';
import { SubroomClone } from './SubroomClone';
import { RetroGathering } from './RetroGathering';
import { AgentDetailPanel } from './AgentDetailPanel';
import { SubroomView } from '../worktree/SubroomView';
import { ROSTER } from '../../data/roster';
import type { RosterEntry } from '../../data/roster';
import { useViewStore } from '../../store/view';
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { AgentState } from '@claude-loom/redesign/api/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SubroomStatus = 'busy' | 'review' | 'idle';

interface ShowSubroomState {
  branch: string;
  parentCat: RosterEntry;
  status: SubroomStatus;
}

export interface RoomViewProps {
  width?: number;
  height?: number;
  /** Pre-select an agent by id on mount */
  initialSelected?: string | null;
}

// ---------------------------------------------------------------------------
// Constants — agents that have a *desk* in the open office.
// (retro/* agents are introduced via RetroGathering when retroMode is on.)
// Ordered to match the design source: PM at the top-right manager corner,
// Dev on the left, three reviewers along the bottom-right row, plus the
// generic 'rev' kept for backwards compatibility with M0.11.4 tests.
// ---------------------------------------------------------------------------
const ROOM_AGENT_IDS = [
  'pm',
  'dev',
  'rev',
  'rev-code',
  'rev-test',
  'rev-sec',
] as const;

type RoomAgentId = (typeof ROOM_AGENT_IDS)[number];

// WHY: position table derived from design source room.jsx L335-345.
// Width-relative positions computed via factory so tests can pass custom width.
function buildPositions(width: number): Record<RoomAgentId, { x: number; y: number }> {
  return {
    pm: { x: width / 2 - 50, y: 220 },
    dev: { x: 130, y: 400 },
    rev: { x: width - 380, y: 400 },
    'rev-code': { x: width - 270, y: 400 },
    'rev-test': { x: width - 160, y: 400 },
    'rev-sec': { x: width - 270, y: 480 },
  };
}

// WHY: clone data is design-source constant — real worktree state wired in M3+.
const SUBROOM_CLONES: readonly { branch: string; status: SubroomStatus; x: number; y: number }[] = [
  { branch: 'feat/oauth', status: 'busy', x: 218, y: 408 },
  { branch: 'fix/test-flake', status: 'review', x: 252, y: 446 },
] as const;

// ---------------------------------------------------------------------------
// AgentState (scenario shape) → DeskStation props mapping
// ---------------------------------------------------------------------------
// Scenario AgentStatus enum:  idle | busy | review | failed | completed
// DeskStation DeskStatus enum: idle | busy | review | fail   | tdd
// 'failed' → 'fail'      (visual error state)
// 'completed' → 'idle'   (work done, cat naps)
// 'tdd' is currently authored by the room itself when scenario hints
//        an in-progress red-green cycle; today it is left undriven and
//        the existing tests for that label still rely on hard-coded fixture.
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

function toLabel(state: AgentState | undefined, fallback: string): string {
  if (!state || state.status === 'idle') {
    const seen = state?.lastSeenAt;
    return seen ? `last: ${seen}` : fallback;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// RoomView component
// ---------------------------------------------------------------------------
export function RoomView({
  width = 1080,
  height = 660,
  initialSelected = null,
}: RoomViewProps): JSX.Element {
  const scenario = useScenario();
  const [sel, setSel] = useState<string | null>(initialSelected ?? null);
  const [showPlan, setShowPlan] = useState(false);
  const [showGantt, setShowGantt] = useState(false);
  const [showSubroom, setShowSubroom] = useState<ShowSubroomState | null>(null);
  const [showConsistency, setShowConsistency] = useState(false);
  const [retroMode, setRetroMode] = useState(false);

  const positions = buildPositions(width);

  // Resolve selected agent from ROSTER for AgentDetailPanel
  const selectedEntry = sel
    ? (ROSTER.find((r) => r.id === sel) ?? null)
    : null;

  // Resolve dev cat for SubroomClones
  const devCat = ROSTER.find((r) => r.id === 'dev')!;

  return (
    <div
      className="room"
      data-testid="room-canvas"
      style={{
        position: 'relative',
        width,
        height: retroMode ? Math.max(height, 860) : height,
        overflow: 'hidden',
      }}
    >
      {/* === LAYER 1: SVG background (wall + floor + tile grid) === */}
      <RoomBackground width={width} height={height} />

      {/* === LAYER 2: Wall decor (branch sign + clock + window) === */}
      <RoomWallDecor width={width} />

      {/* === LAYER 3: Wall posters (hidden in retro mode) === */}
      {!retroMode && (
        <>
          <GanttPoster
            x={130}
            y={28}
            width={360}
            height={125}
            onClick={() => setShowGantt(true)}
          />
          <PlanPoster
            x={510}
            y={28}
            width={350}
            height={125}
            onClick={() => setShowPlan(true)}
          />
          <ConsistencyPoster
            x={880}
            y={28}
            width={170}
            height={125}
            onClick={() => setShowConsistency(true)}
          />
        </>
      )}

      {/* === LAYER 4: Islands (role zone floors, hidden in retro mode) === */}
      <Islands width={width} height={height} visible={!retroMode} />

      {/* === LAYER 4b: Retro Island sign (retro mode only) === */}
      {retroMode && (
        <div
          className="room-sign room-sign--retro"
          style={{ position: 'absolute', left: width / 2 - 80, top: 110, zIndex: 5 }}
        >
          🔮 RETRO ISLAND
        </div>
      )}

      {/* === LAYER 5: Mode toggle (always visible, top-right) === */}
      <RoomModeToggle
        retroMode={retroMode}
        onToggle={() => setRetroMode((m) => !m)}
        width={width}
      />

      {/* === LAYER 6: DeskStation agents (hidden in retro mode) === */}
      {!retroMode &&
        ROOM_AGENT_IDS.map((catId) => {
          const cat = ROSTER.find((r) => r.id === catId);
          if (!cat) return null;
          const p = positions[catId];
          const live = scenario.agents[catId];
          const deskStatus = toDeskStatus(live);
          const bubble = toBubble(live);
          return (
            <DeskStation
              key={catId}
              x={p.x}
              y={p.y}
              cat={cat}
              status={deskStatus}
              task={bubble}
              scroll={live?.status !== 'idle'}
              label={toLabel(live, cat.role)}
              selected={sel === catId}
              onClick={() => {
                const next = sel === catId ? null : catId;
                setSel(next);
                useViewStore.getState().setSelectedAgentId(next);
              }}
            />
          );
        })}

      {/* === LAYER 7: SubroomClone ghost cats (hidden in retro mode) === */}
      {!retroMode &&
        SUBROOM_CLONES.map((c, i) => (
          <SubroomClone
            key={i}
            x={c.x}
            y={c.y}
            cat={devCat}
            branch={c.branch}
            status={c.status}
            onClick={() =>
              setShowSubroom({ branch: c.branch, parentCat: devCat, status: c.status })
            }
          />
        ))}

      {/* === LAYER 8: RetroGathering (retro mode only) === */}
      {retroMode && (
        <RetroGathering
          width={width}
          height={height}
          sel={sel}
          setSel={(id) => {
            setSel(id);
            useViewStore.getState().setSelectedAgentId(id);
          }}
        >
          {/* WHY placeholder: Phase C t14 will rewrite RetroView — import path unchanged */}
          <div>RetroView (M0.11.4 t14)</div>
        </RetroGathering>
      )}

      {/* === LAYER 9: Plant decor === */}
      <Plant x={width - 60} y={height - 80} size={1} />
      <Plant x={20} y={height - 200} size={0.8} />

      {/* === OVERLAY: AgentDetailPanel (shown when an agent is selected) === */}
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

      {/* === OVERLAY: Gantt modal === */}
      {showGantt && (
        <div
          className="room-modal"
          style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowGantt(false)}
        >
          <div
            className="room-modal__panel"
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative' }}
          >
            <button
              data-testid="modal-close-gantt"
              className="room-modal__close"
              onClick={() => setShowGantt(false)}
            >
              ×
            </button>
            {/* WHY placeholder: Phase C t13 will rewrite GanttView — same path */}
            <div>GanttView (M0.11.4 t13)</div>
          </div>
        </div>
      )}

      {/* === OVERLAY: Plan modal === */}
      {showPlan && (
        <div
          className="room-modal"
          style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowPlan(false)}
        >
          <div
            className="room-modal__panel"
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative' }}
          >
            <button
              data-testid="modal-close-plan"
              className="room-modal__close"
              onClick={() => setShowPlan(false)}
            >
              ×
            </button>
            {/* WHY placeholder: Phase C t13 will rewrite PlanView — same path */}
            <div>PlanView (M0.11.4 t13)</div>
          </div>
        </div>
      )}

      {/* === OVERLAY: SubroomView modal === */}
      {showSubroom && (
        <div
          className="room-modal"
          style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowSubroom(null)}
        >
          <div
            className="room-modal__panel"
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative' }}
          >
            <button
              data-testid="modal-close-subroom"
              className="room-modal__close"
              onClick={() => setShowSubroom(null)}
            >
              ×
            </button>
            <SubroomView
              width={Math.min(width - 80, 760)}
              branch={showSubroom.branch}
              parentCat={showSubroom.parentCat}
              status={showSubroom.status}
            />
          </div>
        </div>
      )}

      {/* === OVERLAY: Consistency modal === */}
      {showConsistency && (
        <div
          className="room-modal"
          style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowConsistency(false)}
        >
          <div
            className="room-modal__panel"
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative' }}
          >
            <button
              data-testid="modal-close-consistency"
              className="room-modal__close"
              onClick={() => setShowConsistency(false)}
            >
              ×
            </button>
            {/* WHY placeholder: Phase C t14 will rewrite ConsistencyView — same path */}
            <div>ConsistencyView (M0.11.4 t14)</div>
          </div>
        </div>
      )}
    </div>
  );
}
