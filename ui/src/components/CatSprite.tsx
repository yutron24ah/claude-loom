/**
 * CatSprite — 16×16 pixel grid chibi cat SVG component.
 *
 * WHY pixel grid: 16×16 with shapeRendering="crispEdges" + imageRendering=pixelated
 * ensures sprite looks sharp at any integer scale (64px = 4× scale default).
 *
 * Ported from /tmp/claude-room-handoff/claude-room/project/cat.jsx
 * Original design: rounded plump body, clearly attached ears, prominent cheeks.
 *
 * WHY inline px() as JSX: original design uses px() helper function.
 * TypeScript port keeps the same structure but inlines shapeRendering on each rect
 * and applies imageRendering via SVG inline style.
 */
import type { HatType, PoseType } from '../data/roster';

export interface CatSpriteProps {
  size?: number;
  fur?: string;
  line?: string;
  cheek?: string;
  accent?: string;
  pose?: PoseType;
  hat?: HatType;
  scroll?: boolean;
  sleep?: boolean;
  facing?: 'front' | 'back';
}

// Helper type for rect element props — used inline for brevity
type RectProps = { x: number; y: number; w: number; h: number; fill: string };

// WHY named function over arrow: easier debugging + React DevTools display
function Px({ x, y, w, h, fill }: RectProps) {
  return <rect x={x} y={y} width={w} height={h} fill={fill} shapeRendering="crispEdges" />;
}

export function CatSprite({
  size = 64,
  fur = 'var(--p-cat-base)',
  line = 'var(--p-cat-line)',
  cheek = 'var(--p-cat-cheek)',
  accent = 'var(--p-accent)',
  pose = 'sit',
  hat = null,
  scroll = false,
  sleep = false,
  // facing is reserved for future back-view pose; currently only 'front' is rendered
  facing: _facing = 'front',
}: CatSpriteProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated', display: 'block' }}
    >
      {/* === HEAD with attached ears === */}
      {/* ear triangles */}
      <Px x={2} y={2} w={1} h={1} fill={line} />
      <Px x={2} y={3} w={2} h={1} fill={line} />
      <Px x={3} y={4} w={1} h={1} fill={line} />
      <Px x={13} y={2} w={1} h={1} fill={line} />
      <Px x={12} y={3} w={2} h={1} fill={line} />
      <Px x={12} y={4} w={1} h={1} fill={line} />
      {/* ear inner */}
      <Px x={3} y={3} w={1} h={1} fill={fur} />
      <Px x={13} y={3} w={1} h={1} fill={fur} />
      {/* head outline */}
      <Px x={4} y={3} w={1} h={1} fill={line} />
      <Px x={5} y={2} w={6} h={1} fill={line} />
      <Px x={11} y={3} w={1} h={1} fill={line} />
      <Px x={3} y={4} w={10} h={1} fill={line} />
      <Px x={2} y={5} w={1} h={3} fill={line} />
      <Px x={13} y={5} w={1} h={3} fill={line} />
      <Px x={3} y={8} w={10} h={1} fill={line} />
      {/* head fill */}
      <Px x={4} y={3} w={7} h={1} fill={fur} />
      <Px x={3} y={5} w={10} h={3} fill={fur} />
      {/* cheeks */}
      <Px x={3} y={6} w={1} h={2} fill={cheek} />
      <Px x={12} y={6} w={1} h={2} fill={cheek} />
      {/* eyes */}
      {sleep ? (
        <>
          <Px x={5} y={6} w={2} h={1} fill={line} />
          <Px x={9} y={6} w={2} h={1} fill={line} />
        </>
      ) : (
        <>
          <Px x={5} y={5} w={1} h={2} fill={line} />
          <Px x={10} y={5} w={1} h={2} fill={line} />
        </>
      )}
      {/* nose — fixed design color, not themeable */}
      <Px x={8} y={7} w={1} h={1} fill="#d97a8a" />

      {/* === BODY === */}
      {pose === 'sit' && (
        <>
          {/* top of body */}
          <Px x={3} y={9} w={10} h={1} fill={line} />
          {/* sides */}
          <Px x={2} y={10} w={1} h={4} fill={line} />
          <Px x={13} y={10} w={1} h={4} fill={line} />
          {/* fill */}
          <Px x={3} y={10} w={10} h={4} fill={fur} />
          {/* bottom */}
          <Px x={3} y={14} w={10} h={1} fill={line} />
          {/* paws */}
          <Px x={4} y={13} w={2} h={1} fill={line} />
          <Px x={10} y={13} w={2} h={1} fill={line} />
          <Px x={4} y={14} w={2} h={1} fill={fur} />
          <Px x={10} y={14} w={2} h={1} fill={fur} />
          {/* tail curl */}
          <Px x={13} y={11} w={2} h={1} fill={line} />
          <Px x={15} y={11} w={1} h={1} fill={line} />
          <Px x={15} y={12} w={1} h={1} fill={line} />
          <Px x={14} y={13} w={2} h={1} fill={line} />
          <Px x={14} y={12} w={1} h={1} fill={fur} />
        </>
      )}

      {pose === 'walk' && (
        <>
          <Px x={3} y={9} w={10} h={1} fill={line} />
          <Px x={2} y={10} w={1} h={3} fill={line} />
          <Px x={13} y={10} w={1} h={3} fill={line} />
          <Px x={3} y={10} w={10} h={3} fill={fur} />
          <Px x={3} y={13} w={10} h={1} fill={line} />
          {/* legs in motion */}
          <Px x={4} y={13} w={1} h={2} fill={line} />
          <Px x={7} y={13} w={1} h={2} fill={line} />
          <Px x={11} y={13} w={1} h={2} fill={line} />
          {/* tail up */}
          <Px x={13} y={9} w={1} h={1} fill={line} />
          <Px x={14} y={8} w={1} h={1} fill={line} />
          <Px x={15} y={8} w={1} h={2} fill={line} />
        </>
      )}

      {pose === 'work' && (
        <>
          {/* same body as sit */}
          <Px x={3} y={9} w={10} h={1} fill={line} />
          <Px x={2} y={10} w={1} h={4} fill={line} />
          <Px x={13} y={10} w={1} h={4} fill={line} />
          <Px x={3} y={10} w={10} h={4} fill={fur} />
          <Px x={3} y={14} w={10} h={1} fill={line} />
          {/* paws raised onto laptop */}
          <Px x={4} y={11} w={2} h={1} fill={line} />
          <Px x={10} y={11} w={2} h={1} fill={line} />
          {/* tail */}
          <Px x={13} y={11} w={2} h={1} fill={line} />
          <Px x={15} y={11} w={1} h={2} fill={line} />
          <Px x={14} y={13} w={2} h={1} fill={line} />
        </>
      )}

      {/* === HATS === */}
      {hat === 'leader' && (
        <>
          {/* crown */}
          <Px x={4} y={1} w={1} h={1} fill={accent} />
          <Px x={5} y={0} w={1} h={2} fill={accent} />
          <Px x={6} y={1} w={1} h={1} fill={accent} />
          <Px x={7} y={0} w={1} h={2} fill={accent} />
          <Px x={8} y={1} w={1} h={1} fill={accent} />
          <Px x={9} y={0} w={1} h={2} fill={accent} />
          <Px x={10} y={1} w={1} h={1} fill={accent} />
          <Px x={11} y={0} w={1} h={2} fill={accent} />
        </>
      )}
      {hat === 'visor' && (
        <>
          <Px x={3} y={2} w={10} h={1} fill={line} />
          <Px x={2} y={3} w={12} h={1} fill={accent} />
        </>
      )}
      {hat === 'wizard' && (
        <>
          <Px x={7} y={-1} w={2} h={1} fill={line} />
          <Px x={7} y={0} w={2} h={1} fill={accent} />
          <Px x={6} y={1} w={4} h={1} fill={accent} />
          <Px x={6} y={1} w={1} h={1} fill={line} />
          <Px x={9} y={1} w={1} h={1} fill={line} />
          <Px x={5} y={2} w={6} h={1} fill={accent} />
          <Px x={5} y={2} w={1} h={1} fill={line} />
          <Px x={10} y={2} w={1} h={1} fill={line} />
        </>
      )}
      {hat === 'goggles' && (
        <>
          <Px x={4} y={4} w={3} h={1} fill={line} />
          <Px x={9} y={4} w={3} h={1} fill={line} />
          <Px x={4} y={5} w={3} h={1} fill="#fff" />
          <Px x={9} y={5} w={3} h={1} fill="#fff" />
          <Px x={5} y={5} w={1} h={1} fill={line} />
          <Px x={10} y={5} w={1} h={1} fill={line} />
        </>
      )}
      {hat === 'headband' && (
        <>
          <Px x={2} y={4} w={12} h={1} fill={accent} />
          <Px x={8} y={3} w={1} h={2} fill={accent} />
        </>
      )}
      {hat === 'scarf' && (
        <>
          <Px x={3} y={9} w={10} h={1} fill={accent} />
          <Px x={4} y={10} w={1} h={1} fill={accent} />
          <Px x={11} y={10} w={1} h={1} fill={accent} />
        </>
      )}
      {hat === 'bowtie' && (
        <>
          <Px x={7} y={9} w={2} h={1} fill={accent} />
          <Px x={6} y={10} w={1} h={1} fill={accent} />
          <Px x={9} y={10} w={1} h={1} fill={accent} />
        </>
      )}
      {hat === 'cap' && (
        <>
          <Px x={3} y={2} w={10} h={1} fill={line} />
          <Px x={2} y={3} w={12} h={1} fill={accent} />
          <Px x={13} y={3} w={3} h={1} fill={accent} />
          <Px x={13} y={4} w={3} h={1} fill={line} />
        </>
      )}
      {hat === 'antenna' && (
        <>
          <Px x={8} y={0} w={1} h={3} fill={line} />
          <Px x={7} y={-1} w={3} h={1} fill={accent} />
        </>
      )}

      {/* sleep Z markers */}
      {sleep && (
        <>
          <Px x={13} y={1} w={2} h={1} fill={line} />
          <Px x={14} y={2} w={1} h={1} fill={line} />
          <Px x={13} y={3} w={1} h={1} fill={line} />
          <Px x={13} y={4} w={2} h={1} fill={line} />
        </>
      )}

      {/* learned_guidance scroll above head */}
      {scroll && (
        <>
          <Px x={11} y={0} w={4} h={1} fill="#d9b66c" />
          <Px x={11} y={1} w={4} h={1} fill="#fff8e7" />
          <Px x={11} y={2} w={4} h={1} fill="#d9b66c" />
        </>
      )}
    </svg>
  );
}
