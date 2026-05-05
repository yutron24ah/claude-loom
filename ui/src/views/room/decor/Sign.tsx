/**
 * Sign — pixel-art label sign for room decor.
 * WHY: reusable sign component for arbitrary positioned labels per SPEC §3.6.9.1 α-2.
 * Design source: /tmp/claude-room-handoff/claude-room/project/room.jsx L124-128.
 */

interface SignProps {
  x: number;
  y: number;
  label: string;
  /** background color; defaults to var(--p-accent) */
  color?: string;
}

export function Sign({ x, y, label, color = 'var(--p-accent)' }: SignProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        padding: '3px 8px',
        background: color,
        color: 'white',
        border: '2px solid var(--p-border)',
        boxShadow: '2px 2px 0 0 var(--p-shadow)',
        fontSize: 9,
        fontWeight: 700,
        fontFamily: 'ui-monospace, monospace',
        letterSpacing: '0.04em',
      }}
    >
      {label}
    </div>
  );
}
