/**
 * DeskStation (proposed v2) — class-based, zero inline visual styles.
 *
 * Diff vs current ui/src/views/room/DeskStation.tsx:
 *
 * 1. ALL `style={{...}}` blocks for visual surface removed. Replaced by
 *    .desk-station__* classes defined in ui/src/styles/room.css (G1+G6).
 *
 * 2. The STATUS_COLOR map is gone — color is set by a status-modifier
 *    class on the dot element (.desk-station__status-dot--{busy,idle,
 *    review,fail,tdd}). One less constant to maintain.
 *
 * 3. The only remaining inline style is `style={{ left: x, top: y }}`
 *    on the root .desk-station element. This is justified inline per G6:
 *    position is *dynamic* (driven by RoomView's responsive positions table)
 *    and cannot be expressed as a CSS variable without extra plumbing.
 *
 * 4. data-testid attributes are preserved exactly so existing tests pass:
 *    speech-bubble / monitor-screen / status-dot / desk-top / tdd-tag.
 *
 * 5. Public API unchanged (same DeskStationProps). Drop-in replacement for
 *    the current DeskStation.tsx.
 */
import type React from 'react';
import { CatSprite } from '../../components/CatSprite';
import type { RosterEntry } from '../../data/roster';

export type DeskStatus = 'busy' | 'idle' | 'review' | 'fail' | 'tdd';

export interface DeskStationProps {
  x: number;
  y: number;
  cat: RosterEntry;
  status?: DeskStatus;
  /** speech bubble text — currentTool name or short reasoning */
  task?: string;
  /** wiggle the sprite while the agent is working */
  scroll?: boolean;
  /** TDD phase tag (RED/GREEN/REFACTOR) shown under the nameplate */
  tdd?: string;
  /** secondary label under the role (e.g. "last: 14:23") */
  label?: string;
  /** click handler — typically toggles selection */
  onClick?: () => void;
  /** outline the desk to indicate selection */
  selected?: boolean;
  /**
   * Walk animation target — pixel offset to the destination desk.
   * WHY: shell.css @keyframes cat-walk-trip uses --walk-dx / --walk-dy CSS vars.
   * RoomView computes the offset from state.walkTo (agent id) + positions table,
   * matching redesign/screens/room.jsx L460-462 (wt → target → {dx,dy}).
   */
  walkTo?: { dx: number; dy: number };
}

export function DeskStation({
  x,
  y,
  cat,
  status = 'busy',
  task,
  scroll,
  tdd,
  label,
  onClick,
  selected = false,
  walkTo,
}: DeskStationProps) {
  const sleeping = status === 'idle';

  // Monitor variant: idle (dim), fail (red), or default screen
  const monitorVariant = status === 'fail'
    ? 'desk-station__monitor--fail'
    : sleeping
      ? 'desk-station__monitor--idle'
      : '';

  // WHY: cat-walker animation is driven by CSS vars --walk-dx / --walk-dy.
  // When walkTo is defined, inject the class + vars onto the root element.
  const walkStyle = walkTo
    ? ({ '--walk-dx': `${walkTo.dx}px`, '--walk-dy': `${walkTo.dy}px` } as React.CSSProperties)
    : {};

  return (
    <div
      className={`desk-station${walkTo ? ' cat-walker' : ''}`}
      style={{ left: x, top: y, ...walkStyle }}
    >
      {/* === Speech bubble === */}
      {task && (
        <div data-testid="speech-bubble" className="desk-station__bubble">
          {task}
        </div>
      )}

      <button
        onClick={onClick}
        className={`desk-station__btn${selected ? ' desk-station__btn--selected' : ''}`}
      >
        {/* === Cat sprite, peeking over the monitor === */}
        <div className="desk-station__cat-wrap">
          <div className="desk-station__cat">
            <CatSprite
              size={48}
              fur={cat.fur}
              cheek={cat.cheek}
              hat={cat.hat}
              pose={sleeping ? 'sit' : 'work'}
              sleep={sleeping}
              scroll={scroll}
            />
          </div>
        </div>

        {/* === Monitor + desk stack === */}
        <div className="desk-station__pc">
          <div
            data-testid="monitor-screen"
            className={`desk-station__monitor ${monitorVariant}`.trim()}
          >
            {!sleeping && (
              <div className="desk-station__monitor-lines">
                <div className="desk-station__monitor-line desk-station__monitor-line--w70" />
                <div className="desk-station__monitor-line desk-station__monitor-line--w50" />
                <div className="desk-station__monitor-line desk-station__monitor-line--w85" />
                <div className="desk-station__monitor-line desk-station__monitor-line--w40" />
              </div>
            )}
            <span
              data-testid="status-dot"
              className={`desk-station__status-dot desk-station__status-dot--${status}`}
            />
          </div>
          <div className="desk-station__stand" />
          <div data-testid="desk-top" className="desk-station__top" />
          <div className="desk-station__front" />
        </div>

        {/* === Nameplate === */}
        <div className="desk-station__nameplate">
          {cat.name}{' '}
          <span className="desk-station__role">{label || cat.role}</span>
        </div>

        {/* === Secondary label (only for idle cats with lastSeenAt) === */}
        {sleeping && label && (
          <div className="desk-station__label-sub">{label}</div>
        )}

        {/* === TDD phase tag === */}
        {tdd && (
          <div data-testid="tdd-tag" className="desk-station__tdd">
            {tdd}
          </div>
        )}
      </button>
    </div>
  );
}
