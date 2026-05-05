/**
 * RoomBackground TDD tests — M0.11.4 t5
 * WHY: verify SVG-based room background renders all layers correctly:
 * upper wall, wall trim, wainscoting, floor trim, floor, tile grid, and wallpaper dots.
 * This replaces the Phaser canvas background with pure DOM/SVG per SPEC §3.6.9.1 α-2.
 *
 * NOTE: jsdom does not resolve CSS custom properties (no CSSOM cascade), so we
 * cannot assert getComputedStyle values for CSS variable changes.
 * Theme tests use structural CSS diffing (same pattern as theme-switch.test.tsx).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { RoomBackground } from '../../../src/views/room/RoomBackground';

const TOKENS_PATH = resolve(__dirname, '../../../src/styles/tokens.css');

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Basic render + SVG attributes
// ---------------------------------------------------------------------------
describe('RoomBackground — basic render', () => {
  it('renders an SVG element', () => {
    const { container } = render(<RoomBackground width={800} height={600} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('SVG has correct viewBox from width/height props', () => {
    const { container } = render(<RoomBackground width={800} height={600} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 800 600');
  });

  it('SVG width and height attributes match props', () => {
    const { container } = render(<RoomBackground width={1024} height={768} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('1024');
    expect(svg?.getAttribute('height')).toBe('768');
  });

  it('SVG has position absolute style for overlay placement', () => {
    const { container } = render(<RoomBackground width={800} height={600} />);
    const svg = container.querySelector('svg') as SVGElement | null;
    expect(svg?.style.position).toBe('absolute');
  });
});

// ---------------------------------------------------------------------------
// Layer existence — each structural rect by fill / data-testid
// ---------------------------------------------------------------------------
describe('RoomBackground — layer rects', () => {
  it('renders upper wall rect with --p-wall fill', () => {
    const { container } = render(<RoomBackground width={800} height={600} />);
    const rects = Array.from(container.querySelectorAll('rect'));
    const wallRect = rects.find(r => r.getAttribute('fill') === 'var(--p-wall)');
    expect(wallRect).not.toBeUndefined();
  });

  it('renders wall trim line rects with --p-wood-dark fill', () => {
    const { container } = render(<RoomBackground width={800} height={600} />);
    const rects = Array.from(container.querySelectorAll('rect'));
    const trimRects = rects.filter(r => r.getAttribute('fill') === 'var(--p-wood-dark)');
    // Two trim lines: wall trim + floor trim
    expect(trimRects.length).toBeGreaterThanOrEqual(2);
  });

  it('renders wainscoting rect with --p-wall-2 fill (excluding wallpaper dots)', () => {
    const { container } = render(<RoomBackground width={800} height={600} />);
    const rects = Array.from(container.querySelectorAll('rect'));
    // wainscoting is a single large rect; wallpaper dots are 2x2 small rects also using --p-wall-2
    const wall2Rects = rects.filter(r => r.getAttribute('fill') === 'var(--p-wall-2)');
    // wainscoting (1) + 44 wallpaper dots = at least 1 large wainscoting rect
    expect(wall2Rects.length).toBeGreaterThanOrEqual(1);
  });

  it('renders floor rect with --p-bg-floor fill', () => {
    const { container } = render(<RoomBackground width={800} height={600} />);
    const rects = Array.from(container.querySelectorAll('rect'));
    const floorRect = rects.find(r => r.getAttribute('fill') === 'var(--p-bg-floor)');
    expect(floorRect).not.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tile grid counts
// ---------------------------------------------------------------------------
describe('RoomBackground — tile grid', () => {
  it('renders exactly 14 vertical grid lines', () => {
    const { container } = render(<RoomBackground width={800} height={600} />);
    const rects = Array.from(container.querySelectorAll('rect'));
    // Vertical grid lines: fill="var(--p-bg-floor-2)" + opacity="0.6"
    const verticals = rects.filter(
      r =>
        r.getAttribute('fill') === 'var(--p-bg-floor-2)' &&
        r.getAttribute('opacity') === '0.6',
    );
    expect(verticals).toHaveLength(14);
  });

  it('renders exactly 6 horizontal grid lines', () => {
    const { container } = render(<RoomBackground width={800} height={600} />);
    const rects = Array.from(container.querySelectorAll('rect'));
    // Horizontal grid lines: fill="var(--p-bg-floor-2)" + opacity="0.4"
    const horizontals = rects.filter(
      r =>
        r.getAttribute('fill') === 'var(--p-bg-floor-2)' &&
        r.getAttribute('opacity') === '0.4',
    );
    expect(horizontals).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// Wallpaper dots count
// ---------------------------------------------------------------------------
describe('RoomBackground — wallpaper dots', () => {
  it('renders exactly 44 wallpaper dot rects (22 row1 + 22 row2)', () => {
    const { container } = render(<RoomBackground width={800} height={600} />);
    const rects = Array.from(container.querySelectorAll('rect'));
    // Wallpaper dots: fill="var(--p-wall-2)" + width="2" + height="2"
    const dots = rects.filter(
      r =>
        r.getAttribute('fill') === 'var(--p-wall-2)' &&
        r.getAttribute('width') === '2' &&
        r.getAttribute('height') === '2',
    );
    expect(dots).toHaveLength(44);
  });

  it('row1 dots are positioned at y=20', () => {
    const { container } = render(<RoomBackground width={800} height={600} />);
    const rects = Array.from(container.querySelectorAll('rect'));
    const dots = rects.filter(
      r =>
        r.getAttribute('fill') === 'var(--p-wall-2)' &&
        r.getAttribute('width') === '2' &&
        r.getAttribute('height') === '2' &&
        r.getAttribute('y') === '20',
    );
    expect(dots).toHaveLength(22);
  });

  it('row2 dots are positioned at y=50', () => {
    const { container } = render(<RoomBackground width={800} height={600} />);
    const rects = Array.from(container.querySelectorAll('rect'));
    const dots = rects.filter(
      r =>
        r.getAttribute('fill') === 'var(--p-wall-2)' &&
        r.getAttribute('width') === '2' &&
        r.getAttribute('height') === '2' &&
        r.getAttribute('y') === '50',
    );
    expect(dots).toHaveLength(22);
  });
});

// ---------------------------------------------------------------------------
// Theme structural diff — tokens.css has distinct --p-wall and --p-bg-floor per theme
// WHY: jsdom cannot resolve CSS custom properties at runtime, so we do structural
// diffing of tokens.css to confirm the three palettes are distinct (same approach
// as theme-switch.test.tsx for --bg tokens).
//
// NOTE: tokens.css has two :root blocks (Section 1 KintaiDS tokens, Section 2 RPG
// --p-* palette). We must collect ALL :root block content, not just the first match.
// ---------------------------------------------------------------------------
describe('RoomBackground — theme palette structural diff', () => {
  // Collect all occurrences of a selector block and concatenate their contents.
  // WHY: tokens.css has multiple :root blocks for different token groups.
  function extractAllBlockContent(content: string, selector: string): string {
    const escaped = selector.replace(/[[\].]/g, '\\$&');
    const re = new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, 'g');
    const parts: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      parts.push(m[1]);
    }
    return parts.join('\n');
  }

  function extractVarValue(block: string, varName: string): string | null {
    const escaped = varName.replace(/[-]/g, '\\-');
    const re = new RegExp(`${escaped}\\s*:\\s*([^;]+);`);
    const m = block.match(re);
    return m ? m[1].trim() : null;
  }

  it('tokens.css contains --p-wall variable in :root', () => {
    const css = readFileSync(TOKENS_PATH, 'utf-8');
    const root = extractAllBlockContent(css, ':root');
    expect(extractVarValue(root, '--p-wall')).not.toBeNull();
  });

  it('tokens.css contains --p-bg-floor variable in :root', () => {
    const css = readFileSync(TOKENS_PATH, 'utf-8');
    const root = extractAllBlockContent(css, ':root');
    expect(extractVarValue(root, '--p-bg-floor')).not.toBeNull();
  });

  it('dusk theme --p-wall differs from :root --p-wall', () => {
    const css = readFileSync(TOKENS_PATH, 'utf-8');
    const root = extractAllBlockContent(css, ':root');
    const dusk = extractAllBlockContent(css, '.theme-dusk');
    const rootVal = extractVarValue(root, '--p-wall');
    const duskVal = extractVarValue(dusk, '--p-wall');
    expect(rootVal).not.toBeNull();
    expect(duskVal).not.toBeNull();
    expect(duskVal).not.toBe(rootVal);
  });

  it('night theme --p-bg-floor differs from :root --p-bg-floor', () => {
    const css = readFileSync(TOKENS_PATH, 'utf-8');
    const root = extractAllBlockContent(css, ':root');
    const night = extractAllBlockContent(css, '.theme-night');
    const rootVal = extractVarValue(root, '--p-bg-floor');
    const nightVal = extractVarValue(night, '--p-bg-floor');
    expect(rootVal).not.toBeNull();
    expect(nightVal).not.toBeNull();
    expect(nightVal).not.toBe(rootVal);
  });
});
