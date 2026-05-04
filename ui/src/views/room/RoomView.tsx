/**
 * RoomView — DOM/SVG orchestration hub for the claude-loom room.
 *
 * WHY rewrite (SPEC §3.6.9.1 α-2):
 * M3.0 used Phaser canvas as the primary rendering layer. M0.11.4 t12 replaces
 * the Phaser canvas with DOM/SVG components (Phase B Stage B1 + B2) and
 * orchestrates them in this single component. Phaser-related files remain but
 * are no longer imported here; Phase D t17 will physically delete them.
 *
 * Phase B components orchestrated here:
 * - Stage B1: RoomBackground, RoomWallDecor, GanttPoster, PlanPoster,
 *             ConsistencyPoster, Islands, Plant, RoomModeToggle
 * - Stage B2: DeskStation (6 agents), SubroomClone (2 clones),
 *             RetroGathering (retro mode), AgentDetailPanel (overlay)
 *
 * CRITICAL CONTRACT: `data-testid="room-canvas"` must remain on the wrapper div.
 * AppShell.test.tsx and main.test.tsx verify this attribute exists in the DOM.
 *
 * Phase C views (PlanView / GanttView / RetroView / ConsistencyView) will be
 * rewritten in the next Phase. Placeholders are used here and will be swapped
 * out without requiring import changes (same file paths).
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
import { DeskStation } from './DeskStation';
import { SubroomClone } from './SubroomClone';
import { RetroGathering } from './RetroGathering';
import { AgentDetailPanel } from './AgentDetailPanel';
import { SubroomView } from '../worktree/SubroomView';
import { ROSTER } from '../../data/roster';
import type { RosterEntry } from '../../data/roster';
import { useViewStore } from '../../store/view';

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
// Constants (SPEC §3.6.10 SSoT — extracted from JSX for testability)
// ---------------------------------------------------------------------------

// WHY: per-agent live state drives DeskStation visual (task + tdd + scroll props).
// Mock runtime state — will be replaced by daemon tRPC subscription in M3.2.
interface AgentState {
  catId: string;
  status: 'busy' | 'idle' | 'review' | 'fail' | 'tdd';
  task?: string;
  label: string;
  progress: number;
  tdd?: string;
  scroll?: boolean;
}

const AGENT_STATES: readonly AgentState[] = [
  { catId: 'pm',       status: 'busy',   task: '仕様確認中',   label: 'PM',         progress: 62, scroll: true },
  { catId: 'dev',      status: 'busy',   task: 'GREEN にする',  label: 'Dev',        progress: 78, tdd: 'GREEN', scroll: true },
  { catId: 'rev',      status: 'review', task: 'verdict 草稿',  label: 'Reviewer',   progress: 45 },
  { catId: 'rev-code', status: 'review', task: 'catch 漏れ 1',  label: 'Code Rev',   progress: 30, scroll: true },
  { catId: 'rev-test', status: 'busy',   task: 'coverage 確認', label: 'Test Rev',   progress: 84 },
  { catId: 'rev-sec',  status: 'idle',                          label: 'Sec Rev',    progress: 0,  scroll: true },
  { catId: 'retro-pm', status: 'busy',   task: 'retro 集合〜',  label: 'Retro PM',   progress: 22 },
  { catId: 'retro-agg',status: 'busy',   task: 'action plan',   label: 'Aggregator', progress: 55 },
] as const;

// WHY: position table derived from design source room.jsx L335-345.
// Width-relative positions computed via factory so tests can pass custom width.
function buildPositions(width: number): Record<string, { x: number; y: number }> {
  return {
    pm:         { x: width / 2 - 50, y: 220 },
    dev:        { x: 130,            y: 400 },
    rev:        { x: width - 380,    y: 400 },
    'rev-code': { x: width - 270,    y: 400 },
    'rev-test': { x: width - 160,    y: 400 },
    'rev-sec':  { x: width - 270,    y: 480 },
  };
}

// WHY: clone data is design-source constant — real worktree state wired in M3+.
const SUBROOM_CLONES: readonly { branch: string; status: SubroomStatus; x: number; y: number }[] = [
  { branch: 'feat/oauth',     status: 'busy',   x: 218, y: 408 },
  { branch: 'fix/test-flake', status: 'review', x: 252, y: 446 },
] as const;

// ---------------------------------------------------------------------------
// RoomView component
// ---------------------------------------------------------------------------
export function RoomView({
  width = 1080,
  height = 660,
  initialSelected = null,
}: RoomViewProps): JSX.Element {
  const [sel, setSel] = useState<string | null>(initialSelected ?? null);
  const [showPlan, setShowPlan] = useState(false);
  const [showGantt, setShowGantt] = useState(false);
  const [showSubroom, setShowSubroom] = useState<ShowSubroomState | null>(null);
  const [showConsistency, setShowConsistency] = useState(false);
  const [retroMode, setRetroMode] = useState(false);

  const positions = buildPositions(width);

  // Resolve selected agent from ROSTER for AgentDetailPanel
  const selectedEntry = sel
    ? ROSTER.find((r) => r.id === sel) ?? null
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
        AGENT_STATES.filter((a) => positions[a.catId]).map((a) => {
          const cat = ROSTER.find((r) => r.id === a.catId);
          if (!cat) return null;
          const p = positions[a.catId];
          return (
            <DeskStation
              key={a.catId}
              x={p.x}
              y={p.y}
              cat={cat}
              status={a.status}
              task={a.task}
              tdd={a.tdd}
              scroll={a.scroll}
              label={a.label}
              selected={sel === a.catId}
              onClick={() => {
                const next = sel === a.catId ? null : a.catId;
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
