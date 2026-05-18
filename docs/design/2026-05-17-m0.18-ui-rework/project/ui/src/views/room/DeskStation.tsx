/**
 * DeskStation — a single desk station: monitor + keyboard + cat seated facing PC.
 *
 * WHY this component: Phase B Stage B2 sprite consumer.
 * Ported from /tmp/claude-room-handoff/claude-room/project/room.jsx L7-95.
 * Uses CatSprite (commit 09eae65) and RosterEntry from data/roster.ts.
 *
 * statusColor mapping is defined as a constant (SPEC §3.6.10 SSoT):
 * - busy   → var(--p-success)
 * - idle   → var(--p-stone)
 * - review → var(--p-accent)
 * - fail   → var(--p-error)
 * - tdd    → var(--p-warn)
 */
import { CatSprite } from '../../components/CatSprite';
import type { RosterEntry } from '../../data/roster';

export type DeskStatus = 'busy' | 'idle' | 'review' | 'fail' | 'tdd';

export interface DeskStationProps {
  x: number;
  y: number;
  cat: RosterEntry;
  status?: DeskStatus;
  task?: string;
  scroll?: boolean;
  tdd?: string;
  label?: string;
  deskColor?: string;
  onClick?: () => void;
  selected?: boolean;
}

// WHY constant over inline object: avoids recreating the map on every render
// and makes the mapping a single source of truth (SPEC §3.6.10 SSoT).
const STATUS_COLOR: Record<DeskStatus, string> = {
  busy:   'var(--p-success)',
  idle:   'var(--p-stone)',
  review: 'var(--p-accent)',
  fail:   'var(--p-error)',
  tdd:    'var(--p-warn)',
};

export function DeskStation({
  x,
  y,
  cat,
  status = 'busy',
  task,
  scroll,
  tdd,
  label,
  deskColor = 'var(--p-wood)',
  onClick,
  selected = false,
}: DeskStationProps) {
  const statusColor = STATUS_COLOR[status];

  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 100 }}>
      {/* Speech bubble — only rendered when task prop is provided */}
      {task && (
        <div
          data-testid="speech-bubble"
          style={{
            position: 'relative',
            display: 'inline-block',
            background: 'var(--p-paper)',
            border: '2px solid var(--p-border)',
            padding: '3px 6px',
            fontSize: 9,
            lineHeight: 1.3,
            maxWidth: 110,
            marginBottom: 4,
            boxShadow: '2px 2px 0 0 var(--p-shadow)',
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            color: 'var(--p-text)',
            marginLeft: 8,
            fontWeight: 700,
          }}
        >
          {task}
          {/* Bubble tail — 45deg rotated square gives the arrow pointing down */}
          <span
            style={{
              position: 'absolute',
              left: 14,
              bottom: -5,
              width: 6,
              height: 6,
              background: 'var(--p-paper)',
              borderRight: '2px solid var(--p-border)',
              borderBottom: '2px solid var(--p-border)',
              transform: 'rotate(45deg)',
            }}
          />
        </div>
      )}

      <button
        onClick={onClick}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'block',
          width: '100%',
          padding: 4,
          boxSizing: 'border-box',
          outline: selected ? '3px solid var(--p-accent)' : 'none',
          outlineOffset: 2,
        }}
      >
        {/* Cat behind monitor — peek over the top */}
        <div style={{ position: 'relative', height: 56, marginLeft: 16 }}>
          <div style={{ position: 'absolute', left: 0, top: 0 }}>
            <CatSprite
              size={48}
              fur={cat.fur}
              cheek={cat.cheek}
              hat={cat.hat}
              pose={status === 'idle' ? 'sit' : 'work'}
              sleep={status === 'idle'}
              scroll={scroll}
            />
          </div>
        </div>

        {/* Monitor + desk (isometric-ish) */}
        <div style={{ position: 'relative', marginTop: -16, width: 96 }}>
          {/* Monitor screen */}
          <div
            data-testid="monitor-screen"
            style={{
              width: 64,
              height: 36,
              marginLeft: 16,
              background: status === 'fail' ? 'var(--p-error)' : 'var(--p-screen)',
              border: '2px solid var(--p-border)',
              position: 'relative',
              boxShadow: 'inset 0 0 0 2px var(--p-screen-glow)',
            }}
          >
            {/* Code lines on screen — 4 thin rects at different widths */}
            <div
              style={{
                position: 'absolute',
                left: 4,
                top: 4,
                right: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <div style={{ height: 2, width: '70%', background: 'var(--p-screen-glow)' }} />
              <div style={{ height: 2, width: '50%', background: 'var(--p-screen-glow)' }} />
              <div style={{ height: 2, width: '85%', background: 'var(--p-screen-glow)' }} />
              <div style={{ height: 2, width: '40%', background: 'var(--p-screen-glow)' }} />
            </div>

            {/* Status dot in top-right corner */}
            <span
              data-testid="status-dot"
              style={{
                position: 'absolute',
                top: -5,
                right: -5,
                width: 10,
                height: 10,
                background: statusColor,
                border: '2px solid var(--p-border)',
              }}
            />
          </div>

          {/* Monitor stand */}
          <div
            style={{
              width: 12,
              height: 4,
              marginLeft: 42,
              background: 'var(--p-stone)',
              border: '2px solid var(--p-border)',
              borderTop: 'none',
            }}
          />

          {/* Desk top */}
          <div
            data-testid="desk-top"
            style={{
              width: 96,
              height: 8,
              background: deskColor,
              border: '2px solid var(--p-border)',
              borderRadius: 1,
            }}
          />

          {/* Desk shadow front */}
          <div
            style={{
              width: 96,
              height: 4,
              background: 'var(--p-wood-dark)',
              borderLeft: '2px solid var(--p-border)',
              borderRight: '2px solid var(--p-border)',
              borderBottom: '2px solid var(--p-border)',
            }}
          />
        </div>

        {/* Nameplate */}
        <div
          style={{
            marginTop: 4,
            fontSize: 9,
            fontFamily: 'ui-monospace, monospace',
            textAlign: 'center',
            color: 'var(--p-text)',
            fontWeight: 700,
          }}
        >
          {cat.name}{' '}
          <span style={{ color: 'var(--p-text-muted)', fontWeight: 400 }}>
            {label || cat.role}
          </span>
        </div>

        {/* TDD phase tag — only rendered when tdd prop is provided */}
        {tdd && (
          <div
            data-testid="tdd-tag"
            style={{
              display: 'block',
              margin: '2px auto 0',
              padding: '1px 4px',
              fontSize: 8,
              background: 'var(--p-warn)',
              color: 'white',
              border: '1px solid var(--p-border)',
              fontFamily: 'ui-monospace, monospace',
              width: 'fit-content',
              fontWeight: 700,
            }}
          >
            {tdd}
          </div>
        )}
      </button>
    </div>
  );
}
