/**
 * RoomBackground — pure SVG room scene background
 * WHY: replaces Phaser canvas with a DOM/SVG layer per SPEC §3.6.9.1 (α-2 directive).
 * Ported from room.jsx L143-170 (design source) with TypeScript props.
 *
 * Layer order (bottom to top in SVG paint order):
 *   1. Upper wall (--p-wall)
 *   2. Wall trim line (--p-wood-dark, 3px)
 *   3. Wainscoting / lower wall (--p-wall-2)
 *   4. Floor trim line (--p-wood-dark, 2px)
 *   5. Floor (--p-bg-floor)
 *   6. Floor tile grid (14 vertical + 6 horizontal lines, --p-bg-floor-2)
 *   7. Wallpaper dots (22 × 2 rows, --p-wall-2)
 */

interface RoomBackgroundProps {
  width: number;
  height: number;
}

export function RoomBackground({ width, height }: RoomBackgroundProps) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      style={{ position: 'absolute', inset: 0, imageRendering: 'pixelated' }}
    >
      {/* upper wall */}
      <rect x="0" y="0" width={width} height={height * 0.3} fill="var(--p-wall)" />

      {/* wall trim line */}
      <rect x="0" y={height * 0.28} width={width} height="3" fill="var(--p-wood-dark)" />

      {/* lower wall (wainscoting) */}
      <rect x="0" y={height * 0.31} width={width} height={height * 0.12} fill="var(--p-wall-2)" />

      {/* floor trim line */}
      <rect x="0" y={height * 0.42} width={width} height="2" fill="var(--p-wood-dark)" />

      {/* floor */}
      <rect x="0" y={height * 0.44} width={width} height={height * 0.56} fill="var(--p-bg-floor)" />

      {/* floor tile grid — 14 vertical lines */}
      {Array.from({ length: 14 }).map((_, i) => (
        <rect
          key={`v${i}`}
          x={i * (width / 14)}
          y={height * 0.44}
          width="1"
          height={height * 0.56}
          fill="var(--p-bg-floor-2)"
          opacity="0.6"
        />
      ))}

      {/* floor tile grid — 6 horizontal lines */}
      {Array.from({ length: 6 }).map((_, i) => (
        <rect
          key={`h${i}`}
          x="0"
          y={height * 0.44 + (i + 1) * 38}
          width={width}
          height="1"
          fill="var(--p-bg-floor-2)"
          opacity="0.4"
        />
      ))}

      {/* wallpaper dots — 22 pairs: row1 at y=20, row2 at y=50 */}
      {Array.from({ length: 22 }).map((_, i) => (
        <g key={i}>
          <rect x={20 + i * 38} y="20" width="2" height="2" fill="var(--p-wall-2)" />
          <rect x={36 + i * 38} y="50" width="2" height="2" fill="var(--p-wall-2)" />
        </g>
      ))}
    </svg>
  );
}
