/**
 * SpiritEcho — translucent echo of the most recently summoned spirit.
 *
 * Hybrid mode only: displays at 32% opacity + grayscale(0.6) to show
 * the spirit that was last dispatched (spec §8.2.1 Hybrid flavor).
 */
import type { RosterEntry } from '../../data/roster';

export interface SpiritEchoProps {
  entry: RosterEntry;
  x: number;
  y: number;
}

export function SpiritEcho({ entry, x, y }: SpiritEchoProps): JSX.Element {
  return (
    <div
      className="spirit-echo"
      data-echo-id={entry.id}
      style={{ left: x, top: y }}
      aria-hidden="true"
    >
      <span className="spirit-echo__name">{entry.name}</span>
    </div>
  );
}
