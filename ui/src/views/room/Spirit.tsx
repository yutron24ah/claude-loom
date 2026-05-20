/**
 * Spirit — ephemeral spirit sprite rendered during skill dispatch.
 *
 * Renders a CSS-class-based sprite positioned absolutely within the room canvas.
 * The `.spirit--leaving` modifier triggers the exit keyframe (spec §8.2.1).
 *
 * WHY no inline visual styles: constraint from task dispatch — dynamic position
 * only (left/top) is allowed inline, all visual surface goes to room.css.
 */
import type { RosterEntry } from '../../data/roster';

export interface SpiritProps {
  entry: RosterEntry;
  x: number;
  y: number;
  /** When true, adds .spirit--leaving class to trigger exit animation */
  leaving: boolean;
  onClick: () => void;
}

export function Spirit({ entry, x, y, leaving, onClick }: SpiritProps): JSX.Element {
  const cls = ['spirit', leaving ? 'spirit--leaving' : ''].filter(Boolean).join(' ');

  return (
    <button
      className={cls}
      data-spirit-id={entry.id}
      style={{ left: x, top: y }}
      onClick={onClick}
      type="button"
      aria-label={entry.role}
    >
      <span className="spirit__name">{entry.name}</span>
      <span className="spirit__role">{entry.role}</span>
    </button>
  );
}
