/**
 * Whiteboard — pixel-art whiteboard with title + bullet lines.
 * WHY: room decor showing task/plan data in ambient mode per SPEC §3.6.9.1 α-2.
 * Design source: /tmp/claude-room-handoff/claude-room/project/room.jsx L112-122.
 */

interface WhiteboardLine {
  /** bullet color; defaults to var(--p-text-muted) */
  c?: string;
  t: string;
}

interface WhiteboardProps {
  x: number;
  y: number;
  title: string;
  lines?: WhiteboardLine[];
}

export function Whiteboard({ x, y, title, lines = [] }: WhiteboardProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 130,
        background: 'var(--p-paper)',
        border: '3px solid var(--p-border)',
        padding: 6,
        boxShadow: '2px 2px 0 0 var(--p-shadow)',
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          fontFamily: 'ui-monospace, monospace',
          color: 'var(--p-accent)',
          marginBottom: 3,
          letterSpacing: '0.04em',
        }}
      >
        {title}
      </div>
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 4,
            fontSize: 8,
            fontFamily: 'ui-monospace, monospace',
            alignItems: 'center',
            padding: '1px 0',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              background: l.c || 'var(--p-text-muted)',
              border: '1px solid var(--p-border)',
              flexShrink: 0,
            }}
          />
          <span style={{ color: 'var(--p-text)' }}>{l.t}</span>
        </div>
      ))}
    </div>
  );
}
