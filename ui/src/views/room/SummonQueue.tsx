/**
 * SummonQueue — wall-mounted plaque showing active skill dispatches.
 *
 * Displays a list of queue items with 3 status states:
 *   active  — skill is currently running
 *   queued  — waiting to run
 *   leaving — dispatch finished, playing exit animation
 *
 * Source: spec/ui-arch.md §8.2.1 "new plaque: <SummonQueue>"
 */

export type QueueItemStatus = 'active' | 'queued' | 'leaving';

export interface QueueItem {
  skillId: string;
  status: QueueItemStatus;
  /** Seconds remaining for active items, null for queued */
  ttlSeconds: number | null;
}

export interface SummonQueueProps {
  x: number;
  y: number;
  items: QueueItem[];
}

export function SummonQueue({ x, y, items }: SummonQueueProps): JSX.Element {
  return (
    <div
      className="summon-queue"
      style={{ left: x, top: y }}
      aria-label="Summon queue"
    >
      <div className="summon-queue__header">SUMMON QUEUE</div>
      <ul className="summon-queue__list">
        {items.map((item, idx) => (
          <li
            key={`${item.skillId}-${idx}`}
            className={`summon-queue__item summon-queue__state--${item.status}`}
          >
            <span className="summon-queue__skill-id">{item.skillId}</span>
            {item.ttlSeconds !== null && (
              <span className="summon-queue__ttl">{item.ttlSeconds}s</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
