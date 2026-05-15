/**
 * RetroGathering — retro mode overlay for RoomView.
 *
 * WHY: in retro mode all 13 agents gather around a central whiteboard
 * that displays RetroView (injected as children). Cats arranged in
 * two rows (top: retro-pm + retro-counter, bottom: remaining team)
 * to frame the whiteboard like an audience.
 *
 * Ported from /tmp/claude-room-handoff/claude-room/project/room.jsx L437-528.
 * TypeScript port: window.RetroView replaced by children prop injection
 * (RoomView t12 will pass <RetroView> as children).
 */
import React from 'react';
import { CatSprite } from '../../components/CatSprite';
import { ROSTER } from '../../data/roster';
import type { RosterEntry } from '../../data/roster';

// ---------------------------------------------------------------------------
// PerimeterCat — tiny clickable sprite + name label
// ---------------------------------------------------------------------------
interface PerimeterCatProps {
  cat: RosterEntry;
  x: number;
  y: number;
  /** Speech bubble text — shown when provided */
  talking?: string;
  selected: boolean;
  onClick: () => void;
  /** Facing left — applies scaleX(-1) to sprite */
  flip?: boolean;
}

function PerimeterCat({ cat, x, y, talking, selected, onClick, flip }: PerimeterCatProps) {
  return (
    <button
      data-testid={`perimeter-cat-${cat.id}`}
      onClick={onClick}
      style={{
        all: 'unset',
        cursor: 'pointer',
        position: 'absolute',
        left: x,
        top: y,
        width: 44,
        textAlign: 'center',
        /* WHY --z-room-walkers (4): perimeter cats sit at walker level,
           same z as cat-walker animation. S9 token fix, M0.17 Phase C. */
        zIndex: 'var(--z-room-walkers)' as unknown as number,
        outline: selected ? '3px solid var(--p-accent)' : 'none',
        outlineOffset: 2,
      }}
    >
      {talking && (
        <div
          data-testid="talk-bubble"
          style={{
            position: 'absolute',
            left: flip ? -110 : 30,
            top: -6,
            background: 'var(--p-paper)',
            border: '2px solid var(--p-border)',
            padding: '2px 5px',
            fontSize: 8,
            fontFamily: 'ui-monospace, monospace',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: '2px 2px 0 0 var(--p-shadow)',
            /* WHY --z-pm-chat (5): talk bubble floats above walker (4). S9 token fix. */
            zIndex: 'var(--z-pm-chat)' as unknown as number,
          }}
        >
          {talking}
        </div>
      )}
      <div style={{ height: 28, transform: flip ? 'scaleX(-1)' : 'none' }}>
        <CatSprite size={28} fur={cat.fur} cheek={cat.cheek} hat={cat.hat} pose="sit" />
      </div>
      <div
        style={{
          fontSize: 7,
          fontFamily: 'ui-monospace, monospace',
          fontWeight: 700,
          color: 'var(--p-text)',
          lineHeight: 1.1,
        }}
      >
        {cat.name}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Perimeter layout config (constants extracted for §3.6.10 SSoT)
// WHY: position offsets are design-source values; keeping them as a constant
// makes them testable and avoids inline magic numbers scattered through JSX.
// ---------------------------------------------------------------------------
interface PerimeterEntry {
  id: string;
  xOffset: (boardLeft: number, boardW: number) => number;
  yOffset: (height: number, boardTop: number) => number;
  talk?: string;
  flip?: boolean;
}

const PERIMETER_CONFIG: readonly PerimeterEntry[] = [
  // Top row (above board, in front of gantt) — moderator + retro lens leads
  {
    id: 'retro-pm',
    xOffset: (boardLeft) => boardLeft + 40,
    yOffset: (_h, boardTop) => boardTop - 36,
    talk: 'じゃあ始めるよ〜',
  },
  {
    id: 'retro-counter',
    xOffset: (boardLeft, boardW) => boardLeft + boardW - 80,
    yOffset: (_h, boardTop) => boardTop - 36,
    talk: '本当にそうかな？',
    flip: true,
  },
  // Bottom row (below board) — the team listens
  {
    id: 'pm',
    xOffset: (boardLeft) => boardLeft + 30,
    yOffset: (height) => height - 60,
  },
  {
    id: 'dev',
    xOffset: (boardLeft) => boardLeft + 90,
    yOffset: (height) => height - 60,
    talk: '...聞いてる',
  },
  {
    id: 'retro-research',
    xOffset: (boardLeft) => boardLeft + 160,
    yOffset: (height) => height - 60,
  },
  {
    id: 'retro-pj',
    xOffset: (boardLeft) => boardLeft + 220,
    yOffset: (height) => height - 60,
  },
  {
    id: 'retro-proc',
    xOffset: (boardLeft) => boardLeft + 280,
    yOffset: (height) => height - 60,
    talk: 'TDD red 順序ズレ',
  },
  {
    id: 'retro-meta',
    xOffset: (boardLeft, boardW) => boardLeft + boardW - 320,
    yOffset: (height) => height - 60,
    talk: '仕組みを疑おう',
  },
  {
    id: 'retro-agg',
    xOffset: (boardLeft, boardW) => boardLeft + boardW - 250,
    yOffset: (height) => height - 60,
  },
  {
    id: 'rev',
    xOffset: (boardLeft, boardW) => boardLeft + boardW - 190,
    yOffset: (height) => height - 60,
    flip: true,
  },
  {
    id: 'rev-code',
    xOffset: (boardLeft, boardW) => boardLeft + boardW - 130,
    yOffset: (height) => height - 60,
    flip: true,
  },
  {
    id: 'rev-test',
    xOffset: (boardLeft, boardW) => boardLeft + boardW - 70,
    yOffset: (height) => height - 60,
    flip: true,
  },
  {
    id: 'rev-sec',
    xOffset: (boardLeft, boardW) => boardLeft + boardW - 30,
    yOffset: (height) => height - 60,
    flip: true,
  },
] as const;

// ---------------------------------------------------------------------------
// RetroGathering — main component
// ---------------------------------------------------------------------------
export interface RetroGatheringProps {
  width: number;
  height: number;
  sel: string | null;
  setSel: (id: string | null) => void;
  /** RetroView component injected by RoomView (t12). Falls back to placeholder. */
  children?: React.ReactNode;
}

export function RetroGathering({ width, height, sel, setSel, children }: RetroGatheringProps) {
  const boardW = width - 80;
  const boardLeft = 40;
  const boardTop = 130;

  return (
    <>
      {/* Floor cushion strip under bottom-row cats */}
      <div className="room-floor-cushion" />

      {/* THE WHITEBOARD — full RetroView, centered in room */}
      <div
        data-testid="whiteboard"
        style={{
          position: 'absolute',
          left: boardLeft,
          top: boardTop,
          width: boardW,
          /* WHY --z-room-agents (2): whiteboard sits at agent/desk level.
             S9 token fix, M0.17 Phase C. */
          zIndex: 'var(--z-room-agents)' as unknown as number,
          boxShadow: '5px 5px 0 0 var(--p-shadow)',
          border: '4px solid var(--p-border)',
        }}
      >
        {/* whiteboard tray top */}
        <div
          data-testid="whiteboard-tray-top"
          style={{
            height: 6,
            background: 'var(--p-wood-dark)',
            borderBottom: '2px solid var(--p-border)',
          }}
        />
        {children ? (
          <div style={{ background: 'var(--p-paper)' }}>{children}</div>
        ) : (
          <div style={{ padding: 30, textAlign: 'center', background: 'var(--p-paper)' }}>
            RetroView loading…
          </div>
        )}
        {/* whiteboard tray bottom */}
        <div
          data-testid="whiteboard-tray-bottom"
          style={{
            height: 6,
            background: 'var(--p-wood-dark)',
            borderTop: '2px solid var(--p-border)',
          }}
        />
      </div>

      {/* Cats on the perimeter */}
      {PERIMETER_CONFIG.map((p) => {
        const cat = ROSTER.find((c) => c.id === p.id);
        if (!cat) return null;
        const x = p.xOffset(boardLeft, boardW);
        const y = p.yOffset(height, boardTop);
        return (
          <PerimeterCat
            key={p.id}
            cat={cat}
            x={x}
            y={y}
            talking={p.talk}
            flip={p.flip}
            selected={sel === cat.id}
            onClick={() => setSel(sel === cat.id ? null : cat.id)}
          />
        );
      })}
    </>
  );
}
