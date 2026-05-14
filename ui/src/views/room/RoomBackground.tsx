/**
 * RoomBackground (proposed v2) — single open office, zones as floor rugs.
 *
 * WHY this rewrite:
 *   Current RoomBackground.tsx renders only wall/floor/tile grid; zones are
 *   then layered on top as <div className="room-island"> in Islands.tsx with
 *   `border: 3px solid` + `::before { border: 2px solid }`. Result: each
 *   zone reads as a *separate boxed room*, breaking the "one open office"
 *   metaphor that the design source establishes.
 *
 *   Design source redesign/screens/room.jsx L143-244 paints zones *inside the
 *   SVG* as low-opacity rugs (`opacity: 0.30`) with no borders, plus a faint
 *   floor-stencilled zone label (`opacity: 0.16`, `letter-spacing: 8`).
 *
 *   This component absorbs the Islands surface entirely — Islands.tsx should
 *   be deleted, and tokens.css `.room-island*` / `.room-sign--island--*` rules
 *   should be removed.
 *
 * Layer order (SVG paint order, bottom to top):
 *   1. Upper wall (--p-wall, 0..30% height)
 *   2. Wall trim (--p-wood-dark, 3px)
 *   3. Wainscoting (--p-wall-2, 32..41% height)
 *   4. Floor trim (--p-wood-dark, 2px)
 *   5. Floor (--p-bg-floor)
 *   6. Wood-plank texture (subtle horizontal + vertical lines)
 *   7. Zone rugs (PM / DEV / REVIEW — opacity 0.30, no border)
 *   8. Zone floor labels (opacity 0.16, letter-spacing 8)
 *   9. Perimeter shadow line
 *  10. Decorative props (potted plant + shelf + water cooler)
 */

interface RoomBackgroundProps {
  /** Content area width in px (passed by ResizeObserver in RoomView). */
  width: number;
  /** Content area height in px. */
  height: number;
}

import { ZONES } from './constants';

interface ZoneRect {
  id: 'dev' | 'pm' | 'review';
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** CSS var() string for fill */
  tint: string;
  /** CSS var() string for label color */
  fg: string;
}

export function RoomBackground({ width, height }: RoomBackgroundProps) {
  const wallH = height * 0.32;
  const floorY = height * 0.43;
  const floorH = height - floorY;

  // Asymmetric office: DEV pit takes left 55%, PM corner top-right 45%×45%,
  // REVIEW row bottom-right. Source: redesign/screens/room.jsx L327-331.
  // Zone IDs + labels + tokens come from ./constants.ts (G6).
  function rectFor(id: 'dev' | 'pm' | 'review'): { x: number; y: number; w: number; h: number } {
    if (id === 'dev')    return { x: 0,             y: floorY,                w: width * 0.55, h: floorH };
    if (id === 'pm')     return { x: width * 0.55,  y: floorY,                w: width * 0.45, h: floorH * 0.45 };
    /* review */          return { x: width * 0.55,  y: floorY + floorH * 0.45, w: width * 0.45, h: floorH * 0.55 };
  }
  const zones: ZoneRect[] = ZONES.map((z) => ({
    id: z.id,
    label: z.label,
    tint: `var(${z.tintVar})`,
    fg: `var(${z.fgVar})`,
    ...rectFor(z.id),
  }));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, imageRendering: 'pixelated' }}
    >
      {/* upper wall */}
      <rect x="0" y="0" width={width} height={wallH} fill="var(--p-wall)" />
      <rect x="0" y={height * 0.3} width={width} height="3" fill="var(--p-wood-dark)" />

      {/* wainscoting */}
      <rect x="0" y={height * 0.32} width={width} height={height * 0.1} fill="var(--p-wall-2)" />
      <rect x="0" y={height * 0.41} width={width} height="2" fill="var(--p-wood-dark)" />

      {/* floor */}
      <rect x="0" y={floorY} width={width} height={floorH} fill="var(--p-bg-floor)" />

      {/* wood-plank texture — horizontal seams */}
      {Array.from({ length: Math.ceil(floorH / 28) }).map((_, r) => (
        <rect
          key={`row-${r}`}
          x="0"
          y={floorY + r * 28}
          width={width}
          height="1"
          fill="var(--p-wood-dark)"
          opacity="0.18"
        />
      ))}
      {/* wood-plank texture — vertical seams */}
      {Array.from({ length: Math.ceil(width / 56) }).map((_, c) => (
        <rect
          key={`col-${c}`}
          x={c * 56}
          y={floorY}
          width="1"
          height={floorH}
          fill="var(--p-wood-dark)"
          opacity="0.1"
        />
      ))}

      {/* zone rugs — NO BORDER, low opacity. Single open office. */}
      {zones.map((z) => (
        <g key={z.id}>
          <rect
            x={z.x + 6}
            y={z.y + 6}
            width={z.w - 12}
            height={z.h - 12}
            fill={z.tint}
            opacity="0.3"
            rx="2"
          />
          <text
            x={z.x + z.w / 2}
            y={z.y + z.h - 12}
            textAnchor="middle"
            fontSize="16"
            fontWeight="700"
            letterSpacing="8"
            fill={z.fg}
            opacity="0.16"
            style={{ fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace' }}
          >
            {z.label}
          </text>
        </g>
      ))}

      {/* perimeter — top and bottom of floor area */}
      <rect x="0" y={floorY - 2} width={width} height="3" fill="var(--p-wood-dark)" opacity="0.6" />
      <rect x="0" y={height - 3} width={width} height="3" fill="var(--p-wood-dark)" opacity="0.4" />

      {/* decorative props — colors via tokens.css --p-prop-* vars */}
      <g opacity="0.85">
        {/* potted plant — bottom-left */}
        <rect x="14" y={height - 56} width="22" height="20" fill="var(--p-prop-plant-leaf)" />
        <rect x="18" y={height - 60} width="14" height="6"  fill="var(--p-prop-plant-leaf-2)" />
        <rect x="16" y={height - 36} width="18" height="10" fill="var(--p-prop-plant-pot)"
              stroke="var(--p-border)" strokeWidth="1.5" />

        {/* shelf — top-left of dev pit */}
        <rect x="40" y={floorY + 8}  width="56" height="26" fill="var(--p-prop-shelf)"
              stroke="var(--p-border)" strokeWidth="1.5" />
        <rect x="44" y={floorY + 12} width="48" height="3"  fill="var(--p-prop-shelf-band)" />
        <rect x="44" y={floorY + 19} width="48" height="3"  fill="var(--p-prop-shelf-band)" />

        {/* water cooler — between dev and review */}
        <rect x={width * 0.48}     y={floorY + 40} width="14" height="36"
              fill="var(--p-prop-cooler-body)" stroke="var(--p-border)" strokeWidth="1.5" />
        <rect x={width * 0.48 + 2} y={floorY + 44} width="10" height="14"
              fill="var(--p-prop-cooler-water)" />
      </g>
    </svg>
  );
}
