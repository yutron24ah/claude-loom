/**
 * CatSprite — pixel-art cat SVG component.
 * WHY: chibi cat representation for each dev room agent; ported from ui/prototype/cat.jsx.
 * Uses 16x16 viewBox scaled via `size` prop, with crispEdges for pixel fidelity.
 * Phaser is NOT used — pure DOM/SVG rendering.
 */
import React from 'react';
import type { HatType } from './roster';

export interface CatSpriteProps {
  size?: number;
  fur?: string;
  cheek?: string;
  hat?: HatType;
  pose?: 'sit' | 'work' | 'walk';
  sleep?: boolean;
  /** scroll prop: renders a scroll icon above head to indicate learned_guidance */
  scroll?: boolean;
}

export function CatSprite({
  size = 48,
  fur = 'var(--p-cat-base)',
  cheek = 'var(--p-cat-cheek)',
  hat = null,
  pose = 'sit',
  sleep = false,
  scroll = false,
}: CatSpriteProps): JSX.Element {
  // WHY: shorthand helper keeps JSX readable — avoids repeating rect attrs
  const px = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect x={x} y={y} width={w} height={h} fill={fill} shapeRendering="crispEdges" />
  );

  const line = 'var(--p-cat-line, #2a2a35)';
  const accent = 'var(--p-accent, #6366f1)';

  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated', display: 'block' }}
    >
      {/* === HEAD with attached ears === */}
      {px(2, 2, 1, 1, line)}{px(2, 3, 2, 1, line)}{px(3, 4, 1, 1, line)}
      {px(13, 2, 1, 1, line)}{px(12, 3, 2, 1, line)}{px(12, 4, 1, 1, line)}
      {/* ear inner */}
      {px(3, 3, 1, 1, fur)}{px(13, 3, 1, 1, fur)}
      {/* head outline */}
      {px(4, 3, 1, 1, line)}{px(5, 2, 6, 1, line)}{px(11, 3, 1, 1, line)}
      {px(3, 4, 10, 1, line)}
      {px(2, 5, 1, 3, line)}{px(13, 5, 1, 3, line)}
      {px(3, 8, 10, 1, line)}
      {/* head fill */}
      {px(4, 3, 7, 1, fur)}{px(3, 5, 10, 3, fur)}
      {/* cheeks */}
      {px(3, 6, 1, 2, cheek)}{px(12, 6, 1, 2, cheek)}
      {/* eyes */}
      {sleep
        ? <>{px(5, 6, 2, 1, line)}{px(9, 6, 2, 1, line)}</>
        : <>{px(5, 5, 1, 2, line)}{px(10, 5, 1, 2, line)}</>}
      {/* nose */}
      {px(8, 7, 1, 1, '#d97a8a')}

      {/* === BODY === */}
      {pose === 'sit' && (
        <>
          {px(3, 9, 10, 1, line)}
          {px(2, 10, 1, 4, line)}{px(13, 10, 1, 4, line)}
          {px(3, 10, 10, 4, fur)}
          {px(3, 14, 10, 1, line)}
          {px(4, 13, 2, 1, line)}{px(10, 13, 2, 1, line)}
          {px(4, 14, 2, 1, fur)}{px(10, 14, 2, 1, fur)}
          {px(13, 11, 2, 1, line)}{px(15, 11, 1, 1, line)}{px(15, 12, 1, 1, line)}{px(14, 13, 2, 1, line)}{px(14, 12, 1, 1, fur)}
        </>
      )}
      {pose === 'walk' && (
        <>
          {px(3, 9, 10, 1, line)}
          {px(2, 10, 1, 3, line)}{px(13, 10, 1, 3, line)}
          {px(3, 10, 10, 3, fur)}
          {px(3, 13, 10, 1, line)}
          {px(4, 13, 1, 2, line)}{px(7, 13, 1, 2, line)}{px(11, 13, 1, 2, line)}
          {px(13, 9, 1, 1, line)}{px(14, 8, 1, 1, line)}{px(15, 8, 1, 2, line)}
        </>
      )}
      {pose === 'work' && (
        <>
          {px(3, 9, 10, 1, line)}
          {px(2, 10, 1, 4, line)}{px(13, 10, 1, 4, line)}
          {px(3, 10, 10, 4, fur)}
          {px(3, 14, 10, 1, line)}
          {px(4, 11, 2, 1, line)}{px(10, 11, 2, 1, line)}
          {px(13, 11, 2, 1, line)}{px(15, 11, 1, 2, line)}{px(14, 13, 2, 1, line)}
        </>
      )}

      {/* === HATS === */}
      {hat === 'leader' && (
        <>
          {px(4, 1, 1, 1, accent)}{px(5, 0, 1, 2, accent)}{px(6, 1, 1, 1, accent)}
          {px(7, 0, 1, 2, accent)}{px(8, 1, 1, 1, accent)}{px(9, 0, 1, 2, accent)}
          {px(10, 1, 1, 1, accent)}{px(11, 0, 1, 2, accent)}
        </>
      )}
      {hat === 'visor' && (
        <>
          {px(3, 2, 10, 1, line)}
          {px(2, 3, 12, 1, accent)}
        </>
      )}
      {hat === 'wizard' && (
        <>
          {px(7, -1, 2, 1, line)}{px(7, 0, 2, 1, accent)}
          {px(6, 1, 4, 1, accent)}{px(6, 1, 1, 1, line)}{px(9, 1, 1, 1, line)}
          {px(5, 2, 6, 1, accent)}{px(5, 2, 1, 1, line)}{px(10, 2, 1, 1, line)}
        </>
      )}
      {hat === 'goggles' && (
        <>
          {px(4, 4, 3, 1, line)}{px(9, 4, 3, 1, line)}
          {px(4, 5, 3, 1, '#fff')}{px(9, 5, 3, 1, '#fff')}
          {px(5, 5, 1, 1, line)}{px(10, 5, 1, 1, line)}
        </>
      )}
      {hat === 'headband' && (
        <>
          {px(2, 4, 12, 1, accent)}
          {px(8, 3, 1, 2, accent)}
        </>
      )}
      {hat === 'scarf' && (
        <>
          {px(3, 9, 10, 1, accent)}
          {px(4, 10, 1, 1, accent)}{px(11, 10, 1, 1, accent)}
        </>
      )}
      {hat === 'bowtie' && (
        <>
          {px(7, 9, 2, 1, accent)}
          {px(6, 10, 1, 1, accent)}{px(9, 10, 1, 1, accent)}
        </>
      )}
      {hat === 'cap' && (
        <>
          {px(3, 2, 10, 1, line)}
          {px(2, 3, 12, 1, accent)}
          {px(13, 3, 3, 1, accent)}{px(13, 4, 3, 1, line)}
        </>
      )}
      {hat === 'antenna' && (
        <>
          {px(8, 0, 1, 3, line)}
          {px(7, -1, 3, 1, accent)}
        </>
      )}

      {/* sleep zzz indicator */}
      {sleep && (
        <g data-testid="cat-sleep">
          {px(13, 1, 2, 1, line)}{px(14, 2, 1, 1, line)}{px(13, 3, 1, 1, line)}{px(13, 4, 2, 1, line)}
        </g>
      )}

      {/* learned_guidance scroll above head */}
      {scroll && (
        <g data-testid="cat-scroll">
          {px(11, 0, 4, 1, '#d9b66c')}
          {px(11, 1, 4, 1, '#fff8e7')}
          {px(11, 2, 4, 1, '#d9b66c')}
        </g>
      )}
    </svg>
  );
}
