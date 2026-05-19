/**
 * RoomDoor — right-wall door SVG for Office motion flavor.
 *
 * Office mode: spirits slide in from `.room-door` over 700ms steps(8) (spec §8.2.1).
 * The `.room-door--open` modifier animates the door panel open.
 */

export interface RoomDoorProps {
  x: number;
  y: number;
  open: boolean;
}

export function RoomDoor({ x, y, open }: RoomDoorProps): JSX.Element {
  const cls = ['room-door', open ? 'room-door--open' : ''].filter(Boolean).join(' ');

  return (
    <div
      className={cls}
      style={{ left: x, top: y }}
      aria-label="Spirit entrance door"
    >
      <svg
        className="room-door__svg"
        viewBox="0 0 40 80"
        width={40}
        height={80}
        aria-hidden="true"
      >
        {/* Door frame */}
        <rect x={0} y={0} width={40} height={80} fill="none" stroke="var(--p-border)" strokeWidth={2} />
        {/* Door panel */}
        <rect className="room-door__panel" x={2} y={2} width={36} height={76} fill="var(--p-surface)" />
        {/* Door handle */}
        <circle cx={32} cy={40} r={3} fill="var(--p-text-muted)" />
      </svg>
      <span className="room-door__label">SUMMON GATE</span>
    </div>
  );
}
