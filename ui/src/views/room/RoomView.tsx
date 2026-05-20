/**
 * RoomView (v3) — Spirit Summoning rewrite per m0.18-t3.
 *
 * Changes from v2:
 *
 * 1. PERSISTENT DESKS ONLY: DeskStation is now rendered only for
 *    `kind: "persistent"` agents (pm / dev / retro-pm). Review and retro
 *    spirits are ephemeral — they appear via Spirit Summoning, not desks.
 *    WHY: spec/ui-arch.md §8.2.1 — 3 persistent desks + 10 ephemeral spirits.
 *
 * 2. SPIRIT MODE FLAVORS: `spiritMode` prop controls per-room animation class:
 *    - 'rpg'    → .room--rpg (glow + scale keyframe)
 *    - 'office' → .room--office + <RoomDoor> right-wall door
 *    - 'hybrid' → .room--hybrid + <SpiritEcho> for most-recently summoned (default)
 *    WHY: Tweaks default is hybrid per spec §8.2.1.
 *
 * 3. SUMMON QUEUE: <SummonQueue> wall-plaque renders active / queued / leaving
 *    dispatch items derived from useDispatchQueue() hook.
 *
 * 4. SPIRIT ECHO: Hybrid mode shows last-summoned spirit at 32% opacity,
 *    grayscale(0.6) via <SpiritEcho> component + room.css classes.
 *
 * Position table:
 *   pm         → (W*0.78, floorY + 50)
 *   dev        → (W*0.18, floorY + 80)
 *   retro-pm   → (W*0.50, floorY + 65)   WHY: centre of room, Retro PM role
 *
 * Spirit positions orbit the floor row, derived dynamically from index.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoomBackground } from './RoomBackground';
import { RoomWallDecor } from './decor/RoomWallDecor';
import { GanttPoster } from './wall-posters/GanttPoster';
import { PlanPoster } from './wall-posters/PlanPoster';
import { ConsistencyPoster } from './wall-posters/ConsistencyPoster';
import { DeskStation, type DeskStatus, type BubbleShape } from './DeskStation';
import { SubroomClone } from './SubroomClone';
import { AgentDetailPanel } from './AgentDetailPanel';
import { Spirit } from './Spirit';
import { SpiritEcho } from './SpiritEcho';
import { RoomDoor } from './RoomDoor';
import { SummonQueue } from './SummonQueue';
import { useDispatchQueue } from '../../live/useDispatchQueue';
import { ROSTER } from '../../data/roster';
import type { RosterEntry } from '../../data/roster';
import { useViewStore } from '../../store/view';
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { AgentState } from '@claude-loom/redesign/api/types';
import { usePMSession } from '../../live/usePMSession';

// ---------------------------------------------------------------------------
// Spirit motion flavor type — spec §8.2.1
// ---------------------------------------------------------------------------
export type SpiritMode = 'rpg' | 'office' | 'hybrid';

// ---------------------------------------------------------------------------
// Persistent desk agents — only these 3 get a DeskStation.
// WHY: Review spirits (rev / rev-code / rev-sec / rev-test) and retro spirits
// are ephemeral (kind: 'spirit') and enter via Spirit Summoning, not desks.
// ---------------------------------------------------------------------------
const PERSISTENT_DESK_IDS = ['pm', 'dev', 'retro-pm'] as const;
type PersistentDeskId = (typeof PERSISTENT_DESK_IDS)[number];

interface Size {
  w: number;
  h: number;
}

// ---------------------------------------------------------------------------
// Position table for the 3 persistent desk agents.
// ---------------------------------------------------------------------------
function buildPersistentPositions(
  W: number,
  _H: number,
  floorY: number,
): Record<PersistentDeskId, { x: number; y: number }> {
  return {
    pm:        { x: W * 0.78, y: floorY + 50 },
    dev:       { x: W * 0.18, y: floorY + 80 },
    'retro-pm': { x: W * 0.50, y: floorY + 65 },
  };
}

// ---------------------------------------------------------------------------
// Spirit positions — orbit the floor zone in a loose arc.
// Up to 10 spirits; each gets a slot around the room perimeter.
// ---------------------------------------------------------------------------
function spiritPosition(
  W: number,
  H: number,
  floorY: number,
  index: number,
): { x: number; y: number } {
  const cols = 5;
  const col = index % cols;
  const row = Math.floor(index / cols);
  const baseX = W * 0.12 + col * (W * 0.17);
  const baseY = floorY + 160 + row * 90;
  // Clamp to visible area
  return {
    x: Math.min(baseX, W - 80),
    y: Math.min(baseY, H - 80),
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

// WHY: typed bubble shape matches redesign source room.jsx L23-27 (R-3).
function toBubble(state: AgentState | undefined): BubbleShape | undefined {
  if (!state) return undefined;
  if (state.currentTool) return { kind: 'tool', text: state.currentTool, sub: state.currentReasoning };
  if (state.currentReasoning) return { kind: 'reason', text: truncate(state.currentReasoning, 38) };
  return undefined;
}

// ---------------------------------------------------------------------------
// RoomView component
// ---------------------------------------------------------------------------
export interface RoomViewProps {
  /**
   * Spirit motion flavor — controls animation class on the room container.
   * Default: 'hybrid' (per Tweaks default, spec §8.2.1).
   */
  spiritMode?: SpiritMode;
}

export function RoomView({ spiritMode = 'hybrid' }: RoomViewProps = {}): JSX.Element {
  const scenario = useScenario();
  const navigate = useNavigate();
  const pm = usePMSession();
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>({ w: 1200, h: 700 });
  const [sel, setSel] = useState<string | null>(null);
  const [leavingSpirits, setLeavingSpirits] = useState<Set<string>>(new Set());

  const { items: queueItems } = useDispatchQueue();

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
  const persistentPositions = buildPersistentPositions(W, H, floorY);

  // The 3 persistent roster entries (pm / dev / retro-pm)
  const persistentEntries: RosterEntry[] = ROSTER.filter((r) => r.kind === 'persistent') as RosterEntry[];

  // The 10 ephemeral spirit roster entries
  const spiritEntries: RosterEntry[] = ROSTER.filter((r) => r.kind === 'spirit') as RosterEntry[];

  const isIdleAll = PERSISTENT_DESK_IDS.every(
    (id) => (scenario.agents[id]?.status ?? 'idle') === 'idle',
  );

  const selectedEntry: RosterEntry | null = sel
    ? (ROSTER.find((r) => r.id === sel) ?? null)
    : null;
  const devCat = ROSTER.find((r) => r.id === 'dev')!;

  // Most recently summoned spirit (for hybrid echo)
  const lastSpiritEntry = spiritEntries[spiritEntries.length - 1] ?? null;

  // Room mode class — spec §8.2.1
  const roomModeClass = `room--${spiritMode}`;

  return (
    <div
      ref={ref}
      className={`room ${roomModeClass}${isIdleAll ? ' idle-hush' : ''}`}
      data-testid="room-canvas"
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    >
      {/* === Background (wall + floor + zone rugs + props) === */}
      <RoomBackground width={W} height={H} />

      {/* === Wall decor (branch sign + clock) === */}
      <RoomWallDecor branch={scenario.branch} now={scenario.now} />

      {/* === Wall posters — clicking navigates via React Router === */}
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

      {/* === Office mode: door SVG on right wall === */}
      {spiritMode === 'office' && (
        <RoomDoor
          x={W - 60}
          y={floorY - 20}
          open={queueItems.some((i) => i.status === 'active')}
        />
      )}

      {/* === DeskStation agents — PERSISTENT ONLY (3 desks) === */}
      {persistentEntries.map((cat) => {
        const id = cat.id as PersistentDeskId;
        const p = persistentPositions[id];
        if (!p) return null;
        const state = scenario.agents[id];
        const walkTargetId = state?.walkTo as string | undefined;
        const walkTargetPos = walkTargetId
          ? persistentPositions[walkTargetId as PersistentDeskId]
          : undefined;
        const walkTo = walkTargetPos
          ? { dx: walkTargetPos.x - p.x, dy: walkTargetPos.y - p.y }
          : undefined;
        return (
          <DeskStation
            key={id}
            x={p.x}
            y={p.y}
            cat={cat}
            status={toDeskStatus(state)}
            bubble={toBubble(state)}
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

      {/* === Ephemeral spirits (kind: 'spirit') — 10 entries from ROSTER === */}
      {spiritEntries.map((entry, idx) => {
        const pos = spiritPosition(W, H, floorY, idx);
        return (
          <Spirit
            key={entry.id}
            entry={entry}
            x={pos.x}
            y={pos.y}
            leaving={leavingSpirits.has(entry.id)}
            onClick={() => {
              const next = sel === entry.id ? null : entry.id;
              setSel(next);
              useViewStore.getState().setSelectedAgentId(next);
            }}
          />
        );
      })}

      {/* === Hybrid mode: echo of last summoned spirit at 32% opacity === */}
      {spiritMode === 'hybrid' && lastSpiritEntry && (
        <SpiritEcho
          entry={lastSpiritEntry}
          x={W * 0.5}
          y={floorY + 140}
        />
      )}

      {/* === SummonQueue wall plaque === */}
      <SummonQueue
        x={W * 0.04}
        y={floorY - 60}
        items={queueItems}
      />

      {/* === Worktree clones — sit *above* the dev desk === */}
      {scenario.worktrees
        .filter((w) => w.parentAgent === 'dev')
        .slice(0, 4)
        .map((w, i) => (
          <SubroomClone
            key={i}
            x={persistentPositions.dev.x + 60 + i * 56}
            y={persistentPositions.dev.y - 60}
            cat={devCat}
            branch={w.branch}
            status={w.status === 'failed' ? 'review' : (w.status as 'busy' | 'review' | 'idle')}
            onClick={() => navigate(`/worktree?branch=${encodeURIComponent(w.branch)}`)}
          />
        ))}

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
            {/* WHY: usePMSession().start() replaces alert() placeholder (B4). */}
            <button className="btn-px primary" onClick={() => pm.start()}>
              ▶ PM を起動
            </button>
            <span style={{ fontSize: 9, color: 'var(--p-text-muted)' }}>
              or terminal で <code>/loom-pm</code>
            </span>
          </div>
        </div>
      )}

      {/* === Agent detail drawer === */}
      {/* WHY zIndex token: --z-agent-detail = 10, matches tokens.css Phase 2 z-index scale.
          Eliminates magic number per S9 cleanup (M0.17 Phase C). */}
      {selectedEntry && (
        <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 'var(--z-agent-detail)' as unknown as number }}>
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
