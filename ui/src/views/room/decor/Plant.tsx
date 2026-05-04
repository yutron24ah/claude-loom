/**
 * Plant — pixel-art potted plant decoration.
 * WHY: room decor for ambient pixel-art feel per SPEC §3.6.9.1 α-2.
 * Design source: /tmp/claude-room-handoff/claude-room/project/room.jsx L98-110.
 */

interface PlantProps {
  x: number;
  y: number;
  size?: number;
}

export function Plant({ x, y, size = 1 }: PlantProps) {
  return (
    <div style={{ position: 'absolute', left: x, top: y }}>
      <svg
        viewBox="0 0 16 20"
        width={28 * size}
        height={36 * size}
        style={{ imageRendering: 'pixelated' }}
      >
        {/* Pot */}
        <rect x="3" y="14" width="10" height="6" fill="var(--p-wood)" stroke="var(--p-border)" strokeWidth="1" shapeRendering="crispEdges" />
        {/* Leaf base row */}
        <rect x="2" y="6" width="12" height="2" fill="var(--p-leaf-2)" shapeRendering="crispEdges" />
        {/* Left wisp */}
        <rect x="3" y="2" width="3" height="6" fill="var(--p-leaf)" shapeRendering="crispEdges" />
        {/* Center wisp */}
        <rect x="6" y="0" width="4" height="8" fill="var(--p-leaf-2)" shapeRendering="crispEdges" />
        {/* Right wisp */}
        <rect x="10" y="2" width="3" height="6" fill="var(--p-leaf)" shapeRendering="crispEdges" />
        {/* Lower leaf fill */}
        <rect x="2" y="8" width="12" height="6" fill="var(--p-leaf)" shapeRendering="crispEdges" />
        {/* Pot trim border */}
        <rect x="2" y="6" width="12" height="2" fill="none" stroke="var(--p-border)" strokeWidth="1" shapeRendering="crispEdges" />
      </svg>
    </div>
  );
}
