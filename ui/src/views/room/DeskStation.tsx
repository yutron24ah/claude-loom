/**
 * DeskStation — a single agent desk: monitor + cat + nameplate.
 * WHY: Kairosoft-style isometric desk unit ported from ui/prototype/room.jsx DeskStation.
 * Absolute-positioned within RoomView's relative container.
 * Pixel RPG CSS variables are referenced via inline style for prototype fidelity.
 */
import React from 'react';
import { CatSprite } from './CatSprite';
import type { HatType } from './roster';

export type DeskStatus = 'busy' | 'idle' | 'review' | 'fail' | 'tdd';

export interface CatProps {
  id: string;
  name: string;
  role: string;
  fur: string;
  cheek: string;
  hat: HatType;
}

export interface DeskStationProps {
  x: number;
  y: number;
  cat: CatProps;
  status?: DeskStatus;
  task?: string;
  scroll?: boolean;
  tdd?: string;
  label?: string;
  deskColor?: string;
  onClick?: () => void;
  selected?: boolean;
}

// WHY: status color map mirrors prototype's CSS variable references for live-state feedback.
const STATUS_COLOR: Record<DeskStatus, string> = {
  busy:   'var(--p-success, #4ade80)',
  idle:   'var(--p-stone, #94a3b8)',
  review: 'var(--p-accent, #6366f1)',
  fail:   'var(--p-error, #f87171)',
  tdd:    'var(--p-warn, #fbbf24)',
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
  deskColor = 'var(--p-wood, #a0785a)',
  onClick,
  selected = false,
}: DeskStationProps): JSX.Element {
  const statusColor = STATUS_COLOR[status];

  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 100 }}>
      {/* Speech bubble */}
      {task && (
        <div style={{
          position: 'relative', display: 'inline-block',
          background: 'var(--p-paper, #f8f4ec)', border: '2px solid var(--p-border, #2a2a35)',
          padding: '3px 6px', fontSize: 9, lineHeight: 1.3, maxWidth: 110,
          marginBottom: 4, boxShadow: '2px 2px 0 0 var(--p-shadow, rgba(0,0,0,0.3))',
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          color: 'var(--p-text, #1a1a2e)', marginLeft: 8, fontWeight: 700,
        }}>
          {task}
          <span style={{
            position: 'absolute', left: 14, bottom: -5, width: 6, height: 6,
            background: 'var(--p-paper, #f8f4ec)',
            borderRight: '2px solid var(--p-border, #2a2a35)',
            borderBottom: '2px solid var(--p-border, #2a2a35)',
            transform: 'rotate(45deg)',
          }} />
        </div>
      )}

      <button
        onClick={onClick}
        style={{
          all: 'unset', cursor: 'pointer', display: 'block', width: '100%',
          padding: 4, boxSizing: 'border-box',
          outline: selected ? '3px solid var(--p-accent, #6366f1)' : 'none',
          outlineOffset: 2,
        }}
      >
        {/* Cat behind monitor */}
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
          {/* monitor screen */}
          <div style={{
            width: 64, height: 36, marginLeft: 16,
            background: status === 'fail' ? 'var(--p-error, #f87171)' : 'var(--p-screen, #0a1628)',
            border: '2px solid var(--p-border, #2a2a35)', position: 'relative',
            boxShadow: 'inset 0 0 0 2px var(--p-screen-glow, #1e40af)',
          }}>
            {/* code lines on screen */}
            <div style={{ position: 'absolute', left: 4, top: 4, right: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ height: 2, width: '70%', background: 'var(--p-screen-glow, #3b82f6)' }} />
              <div style={{ height: 2, width: '50%', background: 'var(--p-screen-glow, #3b82f6)' }} />
              <div style={{ height: 2, width: '85%', background: 'var(--p-screen-glow, #3b82f6)' }} />
              <div style={{ height: 2, width: '40%', background: 'var(--p-screen-glow, #3b82f6)' }} />
            </div>
            {/* status dot — data-testid for test assertions */}
            <span
              data-testid="desk-status"
              style={{
                position: 'absolute', top: -5, right: -5,
                width: 10, height: 10,
                background: statusColor,
                border: '2px solid var(--p-border, #2a2a35)',
              }}
            />
          </div>
          {/* monitor stand */}
          <div style={{ width: 12, height: 4, marginLeft: 42, background: 'var(--p-stone, #94a3b8)', border: '2px solid var(--p-border, #2a2a35)', borderTop: 'none' }} />
          {/* desk top */}
          <div style={{ width: 96, height: 8, background: deskColor, border: '2px solid var(--p-border, #2a2a35)', borderRadius: 1 }} />
          {/* desk shadow / front */}
          <div style={{ width: 96, height: 4, background: 'var(--p-wood-dark, #7c5c40)', borderLeft: '2px solid var(--p-border, #2a2a35)', borderRight: '2px solid var(--p-border, #2a2a35)', borderBottom: '2px solid var(--p-border, #2a2a35)' }} />
        </div>

        {/* Nameplate */}
        <div
          data-testid="agent-nameplate"
          style={{
            marginTop: 4, fontSize: 9,
            fontFamily: 'ui-monospace, monospace',
            textAlign: 'center', color: 'var(--p-text, #1a1a2e)', fontWeight: 700,
          }}
        >
          {cat.name}{' '}
          <span style={{ color: 'var(--p-text-muted, #64748b)', fontWeight: 400 }}>
            {label ?? cat.role}
          </span>
        </div>

        {/* TDD phase tag */}
        {tdd && (
          <div style={{
            display: 'block', margin: '2px auto 0', padding: '1px 4px', fontSize: 8,
            background: 'var(--p-warn, #fbbf24)', color: 'white',
            border: '1px solid var(--p-border, #2a2a35)',
            fontFamily: 'ui-monospace, monospace', width: 'fit-content', fontWeight: 700,
          }}>
            {tdd}
          </div>
        )}
      </button>
    </div>
  );
}
