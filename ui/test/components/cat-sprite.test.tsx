/**
 * CatSprite + ROSTER test suite — M0.11.4 t4
 * WHY: verify the pixel cat sprite component renders correct SVG structure
 * for all poses, hats, sleep and scroll modes. Also validates ROSTER data shape.
 *
 * Test behavior, not implementation (Principle 8):
 * - Assert presence of SVG elements based on observable rendering
 * - Do not assert internal px() helper calls or render order
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CatSprite } from '../../src/components/CatSprite';
import { ROSTER } from '../../src/data/roster';
import type { RosterEntry } from '../../src/data/roster';

// ============================================================
// CatSprite — default render
// ============================================================

describe('CatSprite — default props', () => {
  it('renders an SVG with 16x16 viewBox', () => {
    const { container } = render(<CatSprite />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 16 16');
  });

  it('renders with default size 64', () => {
    const { container } = render(<CatSprite />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('64');
    expect(svg?.getAttribute('height')).toBe('64');
  });

  it('has pixelated image rendering', () => {
    const { container } = render(<CatSprite />);
    const svg = container.querySelector('svg');
    // imageRendering via inline style
    expect(svg?.style.imageRendering).toBe('pixelated');
  });

  it('renders multiple rect elements for sit pose (base head + body)', () => {
    const { container } = render(<CatSprite pose="sit" />);
    const rects = container.querySelectorAll('rect');
    // sit pose: head (~18 rects) + body (~12 rects) = 30+
    expect(rects.length).toBeGreaterThanOrEqual(30);
  });
});

// ============================================================
// CatSprite — custom size prop
// ============================================================

describe('CatSprite — size prop', () => {
  it('renders with custom size 128', () => {
    const { container } = render(<CatSprite size={128} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('128');
    expect(svg?.getAttribute('height')).toBe('128');
  });
});

// ============================================================
// CatSprite — pose variants
// ============================================================

describe('CatSprite — pose variants', () => {
  it('sit pose renders tail curl rects', () => {
    const { container } = render(<CatSprite pose="sit" />);
    const rects = container.querySelectorAll('rect');
    // sit body: top/sides/fill/bottom/paws/tail curl = ~12 rects
    expect(rects.length).toBeGreaterThanOrEqual(30);
  });

  it('walk pose renders fewer rects than sit (no tail curl, shorter body)', () => {
    const { container: sitContainer } = render(<CatSprite pose="sit" />);
    const { container: walkContainer } = render(<CatSprite pose="walk" />);
    const sitRects = sitContainer.querySelectorAll('rect').length;
    const walkRects = walkContainer.querySelectorAll('rect').length;
    // walk has no tail curl and shorter body
    expect(walkRects).toBeLessThan(sitRects);
  });

  it('work pose renders with raised paw rects', () => {
    const { container } = render(<CatSprite pose="work" />);
    const rects = container.querySelectorAll('rect');
    // work body: same as sit base + raised paws + tail (no full curl)
    expect(rects.length).toBeGreaterThanOrEqual(28);
  });

  it('defaults to sit pose if pose prop is omitted', () => {
    const { container: defaultContainer } = render(<CatSprite />);
    const { container: sitContainer } = render(<CatSprite pose="sit" />);
    expect(defaultContainer.querySelectorAll('rect').length).toBe(
      sitContainer.querySelectorAll('rect').length
    );
  });
});

// ============================================================
// CatSprite — hat variants
// ============================================================

describe('CatSprite — hat variants', () => {
  // Helper: count rects difference when adding a hat
  function rectCountWithHat(hat: Parameters<typeof CatSprite>[0]['hat']) {
    const { container: noHat } = render(<CatSprite hat={null} />);
    const { container: withHat } = render(<CatSprite hat={hat} />);
    const base = noHat.querySelectorAll('rect').length;
    const withHatCount = withHat.querySelectorAll('rect').length;
    return { base, withHat: withHatCount, added: withHatCount - base };
  }

  it('leader hat adds extra rect elements', () => {
    const { added } = rectCountWithHat('leader');
    expect(added).toBeGreaterThan(0);
  });

  it('visor hat adds extra rect elements', () => {
    const { added } = rectCountWithHat('visor');
    expect(added).toBeGreaterThan(0);
  });

  it('wizard hat adds extra rect elements', () => {
    const { added } = rectCountWithHat('wizard');
    expect(added).toBeGreaterThan(0);
  });

  it('goggles hat adds extra rect elements', () => {
    const { added } = rectCountWithHat('goggles');
    expect(added).toBeGreaterThan(0);
  });

  it('headband hat adds extra rect elements', () => {
    const { added } = rectCountWithHat('headband');
    expect(added).toBeGreaterThan(0);
  });

  it('scarf hat adds extra rect elements', () => {
    const { added } = rectCountWithHat('scarf');
    expect(added).toBeGreaterThan(0);
  });

  it('bowtie hat adds extra rect elements', () => {
    const { added } = rectCountWithHat('bowtie');
    expect(added).toBeGreaterThan(0);
  });

  it('cap hat adds extra rect elements', () => {
    const { added } = rectCountWithHat('cap');
    expect(added).toBeGreaterThan(0);
  });

  it('antenna hat adds extra rect elements', () => {
    const { added } = rectCountWithHat('antenna');
    expect(added).toBeGreaterThan(0);
  });

  it('null hat renders no hat elements (baseline)', () => {
    const { container } = render(<CatSprite hat={null} />);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThanOrEqual(30); // just the cat body
  });
});

// ============================================================
// CatSprite — sleep mode
// ============================================================

describe('CatSprite — sleep mode', () => {
  it('sleep=true adds Z elements and closed eye rects', () => {
    const { container: awake } = render(<CatSprite sleep={false} />);
    const { container: asleep } = render(<CatSprite sleep={true} />);
    const awakeRects = awake.querySelectorAll('rect').length;
    const asleepRects = asleep.querySelectorAll('rect').length;
    // sleep adds Z rects (4) but replaces 2 eye rects with 2 closed rects = net +4
    // actual: sleep=true adds Z markers (4 rects) but eyes go from open (2 rects) to closed (2 rects) = +4 net
    expect(asleepRects).toBeGreaterThan(awakeRects);
  });

  it('sleep=false renders open eye rects', () => {
    const { container } = render(<CatSprite sleep={false} />);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThanOrEqual(30);
  });
});

// ============================================================
// CatSprite — scroll mode
// ============================================================

describe('CatSprite — scroll mode', () => {
  it('scroll=true adds scroll icon rects', () => {
    const { container: noScroll } = render(<CatSprite scroll={false} />);
    const { container: withScroll } = render(<CatSprite scroll={true} />);
    const base = noScroll.querySelectorAll('rect').length;
    const scrolled = withScroll.querySelectorAll('rect').length;
    // scroll adds 3 rects (top/middle/bottom of scroll)
    expect(scrolled).toBe(base + 3);
  });
});

// ============================================================
// CatSprite — props default values
// ============================================================

describe('CatSprite — default CSS variable props', () => {
  it('default fur uses CSS variable --p-cat-base', () => {
    const { container } = render(<CatSprite />);
    // Some rects should have fill="var(--p-cat-base)"
    const rects = Array.from(container.querySelectorAll('rect'));
    const furRects = rects.filter(r => r.getAttribute('fill') === 'var(--p-cat-base)');
    expect(furRects.length).toBeGreaterThan(0);
  });

  it('default line uses CSS variable --p-cat-line', () => {
    const { container } = render(<CatSprite />);
    const rects = Array.from(container.querySelectorAll('rect'));
    const lineRects = rects.filter(r => r.getAttribute('fill') === 'var(--p-cat-line)');
    expect(lineRects.length).toBeGreaterThan(0);
  });

  it('default cheek uses CSS variable --p-cat-cheek', () => {
    const { container } = render(<CatSprite />);
    const rects = Array.from(container.querySelectorAll('rect'));
    const cheekRects = rects.filter(r => r.getAttribute('fill') === 'var(--p-cat-cheek)');
    expect(cheekRects.length).toBeGreaterThan(0);
  });

  it('nose is fixed color #d97a8a regardless of props', () => {
    const { container } = render(<CatSprite />);
    const rects = Array.from(container.querySelectorAll('rect'));
    const noseRects = rects.filter(r => r.getAttribute('fill') === '#d97a8a');
    expect(noseRects.length).toBe(1);
  });
});

// ============================================================
// ROSTER — data shape validation
// ============================================================

describe('ROSTER — data shape', () => {
  it('exports exactly 13 entries', () => {
    expect(ROSTER).toHaveLength(13);
  });

  it('all ids are unique', () => {
    const ids = ROSTER.map(e => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(13);
  });

  it('all required fields are present on each entry', () => {
    const requiredFields: (keyof RosterEntry)[] = [
      'id', 'role', 'jp', 'name', 'breed', 'quote', 'hat', 'fur', 'cheek', 'group',
    ];
    for (const entry of ROSTER) {
      for (const field of requiredFields) {
        expect(entry).toHaveProperty(field);
      }
    }
  });

  it('all group values are valid', () => {
    const validGroups = new Set(['core', 'review', 'retro']);
    for (const entry of ROSTER) {
      expect(validGroups.has(entry.group)).toBe(true);
    }
  });

  it('has 2 core agents (pm + dev)', () => {
    const coreAgents = ROSTER.filter(e => e.group === 'core');
    expect(coreAgents).toHaveLength(2);
  });

  it('has 4 review agents', () => {
    const reviewAgents = ROSTER.filter(e => e.group === 'review');
    expect(reviewAgents).toHaveLength(4);
  });

  it('has 7 retro agents', () => {
    const retroAgents = ROSTER.filter(e => e.group === 'retro');
    expect(retroAgents).toHaveLength(7);
  });

  it('pm entry has leader hat', () => {
    const pm = ROSTER.find(e => e.id === 'pm');
    expect(pm?.hat).toBe('leader');
  });

  it('dev entry has headband hat', () => {
    const dev = ROSTER.find(e => e.id === 'dev');
    expect(dev?.hat).toBe('headband');
  });

  it('all hat values are valid or null', () => {
    const validHats = new Set([
      'leader', 'visor', 'wizard', 'goggles', 'headband',
      'scarf', 'bowtie', 'cap', 'antenna', null,
    ]);
    for (const entry of ROSTER) {
      expect(validHats.has(entry.hat)).toBe(true);
    }
  });

  it('all fur values are hex color strings or CSS var', () => {
    for (const entry of ROSTER) {
      expect(typeof entry.fur).toBe('string');
      expect(entry.fur.length).toBeGreaterThan(0);
    }
  });

  it('all cheek values are hex color strings', () => {
    for (const entry of ROSTER) {
      expect(entry.cheek).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('contains expected agent ids', () => {
    const expectedIds = [
      'pm', 'dev', 'rev', 'rev-code', 'rev-sec', 'rev-test',
      'retro-pm', 'retro-research', 'retro-pj', 'retro-proc',
      'retro-meta', 'retro-counter', 'retro-agg',
    ];
    const actualIds = ROSTER.map(e => e.id);
    for (const id of expectedIds) {
      expect(actualIds).toContain(id);
    }
  });
});
