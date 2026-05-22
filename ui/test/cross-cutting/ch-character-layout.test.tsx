/**
 * ch-character-layout.test.tsx — Character visual diversity: reviewer + core desk layout (t3a)
 *
 * WHY: qa-suite.js "characters" section (20 CH-* cases) audits that each agent
 * has a distinct pixel-cat visual identity, and that status/desk affordances
 * render correctly. This file covers Section A: PM/Developer persistent cats,
 * 3 reviewer-spirit cats, 5 status visual cases, and the guidance scroll indicator.
 *
 * Cross-cutting test pattern (M0.20):
 * - Uses ROSTER SSoT (ui/src/data/roster.ts) to derive expected visual props
 * - Asserts observable structural properties (hat presence, fur uniqueness, scroll,
 *   status modifier classes) — not pixel exact values
 * - test.skip() used for visually-only assertions that require browser rendering
 *
 * References:
 * - qa-suite.js §characters group ch-roster / ch-status-visual / ch-affiliation
 * - ui/src/components/CatSprite.tsx (hat/sleep/scroll/pose variants)
 * - ui/src/views/room/DeskStation.tsx (status dot / monitor modifiers)
 * - ui/src/data/roster.ts (ROSTER SSoT)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CatSprite } from '../../src/components/CatSprite';
import { DeskStation } from '../../src/views/room/DeskStation';
import { ROSTER } from '../../src/data/roster';
import type { RosterEntry } from '../../src/data/roster';

// ============================================================
// Helpers
// ============================================================

function getEntry(id: string): RosterEntry {
  const entry = ROSTER.find(e => e.id === id);
  if (!entry) throw new Error(`Roster entry not found: ${id}`);
  return entry;
}

// ============================================================
// CH-PM-01 — PM cat has leader hat + distinct breed/design
// ============================================================
// covers: CH-PM-01
describe('CH-PM-01 — PM cat: leader hat + distinct identity', () => {
  it('PM entry exists in ROSTER with id=pm', () => {
    const pm = getEntry('pm');
    expect(pm).toBeDefined();
  });

  it('PM cat has leader hat (crown SVG elements)', () => {
    const pm = getEntry('pm');
    expect(pm.hat).toBe('leader');
  });

  it('PM CatSprite renders leader hat rects (more rects than no-hat)', () => {
    const pm = getEntry('pm');
    const { container: noHat } = render(<CatSprite hat={null} fur={pm.fur} cheek={pm.cheek} />);
    const { container: withHat } = render(<CatSprite hat={pm.hat} fur={pm.fur} cheek={pm.cheek} />);
    expect(withHat.querySelectorAll('rect').length).toBeGreaterThan(
      noHat.querySelectorAll('rect').length
    );
  });

  it('PM has ブリティッシュショートヘア breed — distinct from dev', () => {
    const pm = getEntry('pm');
    const dev = getEntry('dev');
    expect(pm.breed).toBe('ブリティッシュショートヘア');
    expect(pm.breed).not.toBe(dev.breed);
  });

  it('PM fur color is different from Developer fur color', () => {
    const pm = getEntry('pm');
    const dev = getEntry('dev');
    expect(pm.fur).not.toBe(dev.fur);
  });

  it('PM is persistent kind (always in room)', () => {
    const pm = getEntry('pm');
    expect(pm.kind).toBe('persistent');
  });
});

// ============================================================
// CH-DEV-01 — Developer cat has headband + distinct design
// ============================================================
// covers: CH-DEV-01
describe('CH-DEV-01 — Developer cat: headband + work persona', () => {
  it('Developer entry exists in ROSTER with id=dev', () => {
    const dev = getEntry('dev');
    expect(dev).toBeDefined();
  });

  it('Developer cat has headband hat', () => {
    const dev = getEntry('dev');
    expect(dev.hat).toBe('headband');
  });

  it('Developer CatSprite renders headband rects', () => {
    const dev = getEntry('dev');
    const { container: noHat } = render(<CatSprite hat={null} fur={dev.fur} cheek={dev.cheek} />);
    const { container: withHat } = render(<CatSprite hat={dev.hat} fur={dev.fur} cheek={dev.cheek} />);
    expect(withHat.querySelectorAll('rect').length).toBeGreaterThan(
      noHat.querySelectorAll('rect').length
    );
  });

  it('Developer quote references TDD (RED → GREEN)', () => {
    const dev = getEntry('dev');
    expect(dev.quote).toContain('RED');
    expect(dev.quote).toContain('GREEN');
  });

  it('Developer is persistent kind', () => {
    const dev = getEntry('dev');
    expect(dev.kind).toBe('persistent');
  });
});

// ============================================================
// CH-REV-CODE-01 — Code Reviewer (ペン) has visor hat
// ============================================================
// covers: CH-REV-CODE-01
describe('CH-REV-CODE-01 — Code Reviewer: visor hat + monitoring design', () => {
  it('rev-code entry exists in ROSTER', () => {
    const revCode = getEntry('rev-code');
    expect(revCode).toBeDefined();
  });

  it('Code Reviewer has visor hat', () => {
    const revCode = getEntry('rev-code');
    expect(revCode.hat).toBe('visor');
  });

  it('Code Reviewer is spirit kind summoned by loom-review/trio.code', () => {
    const revCode = getEntry('rev-code');
    expect(revCode.kind).toBe('spirit');
    expect(revCode.summonedBy).toBe('loom-review/trio.code');
  });

  it('Code Reviewer is in review group', () => {
    const revCode = getEntry('rev-code');
    expect(revCode.group).toBe('review');
  });

  it('Code Reviewer CatSprite renders visor rects', () => {
    const revCode = getEntry('rev-code');
    const { container: noHat } = render(<CatSprite hat={null} fur={revCode.fur} />);
    const { container: withHat } = render(<CatSprite hat={revCode.hat} fur={revCode.fur} />);
    expect(withHat.querySelectorAll('rect').length).toBeGreaterThan(
      noHat.querySelectorAll('rect').length
    );
  });

  it('Code Reviewer fur differs from Security Reviewer (visual distinction)', () => {
    const revCode = getEntry('rev-code');
    const revSec = getEntry('rev-sec');
    expect(revCode.fur).not.toBe(revSec.fur);
  });
});

// ============================================================
// CH-REV-TEST-01 — Test Reviewer (メメ) has bowtie
// ============================================================
// covers: CH-REV-TEST-01
describe('CH-REV-TEST-01 — Test Reviewer: bowtie hat + distinct persona', () => {
  it('rev-test entry exists in ROSTER', () => {
    const revTest = getEntry('rev-test');
    expect(revTest).toBeDefined();
  });

  it('Test Reviewer has bowtie hat', () => {
    const revTest = getEntry('rev-test');
    expect(revTest.hat).toBe('bowtie');
  });

  it('Test Reviewer has different hat than Code Reviewer', () => {
    const revTest = getEntry('rev-test');
    const revCode = getEntry('rev-code');
    expect(revTest.hat).not.toBe(revCode.hat);
  });

  it('Test Reviewer quote references test validity', () => {
    const revTest = getEntry('rev-test');
    expect(revTest.quote).toContain('テスト');
  });

  it('Test Reviewer CatSprite renders bowtie rects', () => {
    const revTest = getEntry('rev-test');
    const { container: noHat } = render(<CatSprite hat={null} fur={revTest.fur} />);
    const { container: withHat } = render(<CatSprite hat={revTest.hat} fur={revTest.fur} />);
    expect(withHat.querySelectorAll('rect').length).toBeGreaterThan(
      noHat.querySelectorAll('rect').length
    );
  });
});

// ============================================================
// CH-REV-SEC-01 — Security Reviewer (シノビ) has scarf + dark fur
// ============================================================
// covers: CH-REV-SEC-01
describe('CH-REV-SEC-01 — Security Reviewer: scarf + security persona', () => {
  it('rev-sec entry exists in ROSTER', () => {
    const revSec = getEntry('rev-sec');
    expect(revSec).toBeDefined();
  });

  it('Security Reviewer has scarf hat', () => {
    const revSec = getEntry('rev-sec');
    expect(revSec.hat).toBe('scarf');
  });

  it('Security Reviewer has dark fur (stealth persona)', () => {
    // dark = starts with #3 or #4 hex range
    const revSec = getEntry('rev-sec');
    const hexBrightness = parseInt(revSec.fur.slice(1, 3), 16);
    expect(hexBrightness).toBeLessThan(100); // dark fur < 100/255
  });

  it('Security Reviewer quote references secret/commit', () => {
    const revSec = getEntry('rev-sec');
    expect(revSec.quote).toContain('secret');
  });

  it('Security Reviewer CatSprite renders scarf rects', () => {
    const revSec = getEntry('rev-sec');
    const { container: noHat } = render(<CatSprite hat={null} fur={revSec.fur} />);
    const { container: withHat } = render(<CatSprite hat={revSec.hat} fur={revSec.fur} />);
    expect(withHat.querySelectorAll('rect').length).toBeGreaterThan(
      noHat.querySelectorAll('rect').length
    );
  });

  it('Security Reviewer fur is visually distinct from Test Reviewer', () => {
    const revSec = getEntry('rev-sec');
    const revTest = getEntry('rev-test');
    expect(revSec.fur).not.toBe(revTest.fur);
  });
});

// ============================================================
// Reviewer group completeness
// ============================================================
// covers: CH-REV-CODE-01, CH-REV-TEST-01, CH-REV-SEC-01
describe('Reviewer group — 4 members, all unique visual identities', () => {
  it('review group has exactly 4 members', () => {
    const reviewers = ROSTER.filter(e => e.group === 'review');
    expect(reviewers).toHaveLength(4);
  });

  it('all 4 reviewers have unique fur colors', () => {
    const reviewers = ROSTER.filter(e => e.group === 'review');
    const furs = reviewers.map(r => r.fur);
    const uniqueFurs = new Set(furs);
    expect(uniqueFurs.size).toBe(4);
  });

  it('all 4 reviewers have unique hat types', () => {
    const reviewers = ROSTER.filter(e => e.group === 'review');
    const hats = reviewers.map(r => r.hat);
    const uniqueHats = new Set(hats);
    expect(uniqueHats.size).toBe(4);
  });

  it('reviewers are spirits, not persistent', () => {
    const reviewers = ROSTER.filter(e => e.group === 'review');
    for (const r of reviewers) {
      expect(r.kind).toBe('spirit');
    }
  });

  it('each reviewer has a unique summonedBy skill path', () => {
    const reviewers = ROSTER.filter(e => e.group === 'review');
    const paths = reviewers.map(r => r.summonedBy);
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(4);
  });
});

// ============================================================
// CH-ST-IDLE-01 — idle → sleeping cat (sit+sleep pose, z-markers)
// ============================================================
// covers: CH-ST-IDLE-01
describe('CH-ST-IDLE-01 — DeskStation idle: cat sleeps with Z markers', () => {
  const cat = getEntry('dev');

  it('idle status renders more SVG rects than busy (sleep Z markers added)', () => {
    const { container: idleEl } = render(<DeskStation x={0} y={0} cat={cat} status="idle" />);
    const { container: busyEl } = render(<DeskStation x={0} y={0} cat={cat} status="busy" />);
    const idleRects = idleEl.querySelectorAll('svg rect').length;
    const busyRects = busyEl.querySelectorAll('svg rect').length;
    expect(idleRects).toBeGreaterThan(busyRects);
  });

  it('idle status applies --idle modifier class on status-dot', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={cat} status="idle" />);
    const dot = container.querySelector('[data-testid="status-dot"]') as HTMLElement;
    expect(dot.classList.contains('desk-station__status-dot--idle')).toBe(true);
  });

  it('idle status applies --idle modifier on monitor (dim screen)', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={cat} status="idle" />);
    const monitor = container.querySelector('[data-testid="monitor-screen"]') as HTMLElement;
    expect(monitor.classList.contains('desk-station__monitor--idle')).toBe(true);
  });
});

// ============================================================
// CH-ST-BUSY-01 — busy → working cat (work pose, monitor lines)
// ============================================================
// covers: CH-ST-BUSY-01
describe('CH-ST-BUSY-01 — DeskStation busy: work pose + monitor lines', () => {
  const cat = getEntry('dev');

  it('busy status applies --busy modifier class on status-dot', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={cat} status="busy" />);
    const dot = container.querySelector('[data-testid="status-dot"]') as HTMLElement;
    expect(dot.classList.contains('desk-station__status-dot--busy')).toBe(true);
  });

  it('busy status does NOT apply idle or fail monitor modifier', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={cat} status="busy" />);
    const monitor = container.querySelector('[data-testid="monitor-screen"]') as HTMLElement;
    expect(monitor.classList.contains('desk-station__monitor--idle')).toBe(false);
    expect(monitor.classList.contains('desk-station__monitor--fail')).toBe(false);
  });

  it('busy status renders monitor code lines (non-idle path)', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={cat} status="busy" />);
    // Monitor lines divs are rendered only when NOT sleeping (idle)
    const lines = container.querySelectorAll('.desk-station__monitor-line');
    expect(lines.length).toBeGreaterThan(0);
  });
});

// ============================================================
// CH-ST-REVIEW-01 — review → observation status
// ============================================================
// covers: CH-ST-REVIEW-01
describe('CH-ST-REVIEW-01 — DeskStation review: status hint', () => {
  const cat = getEntry('rev');

  it('review status applies --review modifier class on status-dot', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={cat} status="review" />);
    const dot = container.querySelector('[data-testid="status-dot"]') as HTMLElement;
    expect(dot.classList.contains('desk-station__status-dot--review')).toBe(true);
  });

  it('review status does not apply idle monitor modifier', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={cat} status="review" />);
    const monitor = container.querySelector('[data-testid="monitor-screen"]') as HTMLElement;
    expect(monitor.classList.contains('desk-station__monitor--idle')).toBe(false);
  });
});

// ============================================================
// CH-ST-FAIL-01 — fail → red monitor, error dot
// ============================================================
// covers: CH-ST-FAIL-01
describe('CH-ST-FAIL-01 — DeskStation fail: red monitor + error dot', () => {
  const cat = getEntry('dev');

  it('fail status applies --fail monitor modifier (red screen)', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={cat} status="fail" />);
    const monitor = container.querySelector('[data-testid="monitor-screen"]') as HTMLElement;
    expect(monitor.classList.contains('desk-station__monitor--fail')).toBe(true);
  });

  it('fail status applies --fail modifier class on status-dot', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={cat} status="fail" />);
    const dot = container.querySelector('[data-testid="status-dot"]') as HTMLElement;
    expect(dot.classList.contains('desk-station__status-dot--fail')).toBe(true);
  });

  it('fail monitor does NOT have idle modifier', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={cat} status="fail" />);
    const monitor = container.querySelector('[data-testid="monitor-screen"]') as HTMLElement;
    expect(monitor.classList.contains('desk-station__monitor--idle')).toBe(false);
  });
});

// ============================================================
// CH-ST-TDD-01 — TDD tag: RED/GREEN/REFACTOR phases
// ============================================================
// covers: CH-ST-TDD-01
describe('CH-ST-TDD-01 — DeskStation TDD tag phases', () => {
  const cat = getEntry('dev');

  it('tdd="RED" renders TDD tag with RED text', () => {
    render(<DeskStation x={0} y={0} cat={cat} tdd="RED" />);
    expect(screen.getByText('RED')).toBeInTheDocument();
    const tag = screen.getByTestId('tdd-tag');
    expect(tag).toBeInTheDocument();
  });

  it('tdd="GREEN" renders TDD tag with GREEN text', () => {
    render(<DeskStation x={0} y={0} cat={cat} tdd="GREEN" />);
    expect(screen.getByText('GREEN')).toBeInTheDocument();
  });

  it('tdd="REFACTOR" renders TDD tag with REFACTOR text', () => {
    render(<DeskStation x={0} y={0} cat={cat} tdd="REFACTOR" />);
    expect(screen.getByText('REFACTOR')).toBeInTheDocument();
  });

  it('TDD tag has .desk-station__tdd class (phase color via CSS modifier)', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={cat} tdd="RED" />);
    const tag = container.querySelector('[data-testid="tdd-tag"]') as HTMLElement;
    expect(tag.classList.contains('desk-station__tdd')).toBe(true);
  });

  it('no TDD tag when tdd prop is omitted', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={cat} status="tdd" />);
    // tdd status sets the dot color but does not show the tag if tdd prop is not provided
    const tag = container.querySelector('[data-testid="tdd-tag"]');
    expect(tag).toBeNull();
  });

  it('tdd status applies --tdd modifier class on status-dot', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={cat} status="tdd" />);
    const dot = container.querySelector('[data-testid="status-dot"]') as HTMLElement;
    expect(dot.classList.contains('desk-station__status-dot--tdd')).toBe(true);
  });
});

// ============================================================
// CH-GUIDANCE-IND-01 — guidance scroll indicator
// ============================================================
// covers: CH-GUIDANCE-IND-01
describe('CH-GUIDANCE-IND-01 — CatSprite scroll/guidance indicator', () => {
  it('scroll=true adds guidance scroll rects above head', () => {
    const { container: noScroll } = render(<CatSprite scroll={false} />);
    const { container: withScroll } = render(<CatSprite scroll={true} />);
    const base = noScroll.querySelectorAll('rect').length;
    const scrolled = withScroll.querySelectorAll('rect').length;
    // scroll adds exactly 3 rects (top/middle/bottom stripes of scroll icon)
    expect(scrolled).toBe(base + 3);
  });

  it('scroll rects use distinct guidance colors (gold + parchment)', () => {
    const { container } = render(<CatSprite scroll={true} />);
    const rects = Array.from(container.querySelectorAll('rect'));
    // scroll icon uses #d9b66c (gold) and #fff8e7 (parchment)
    const goldRects = rects.filter(r => r.getAttribute('fill') === '#d9b66c');
    const parchmentRects = rects.filter(r => r.getAttribute('fill') === '#fff8e7');
    expect(goldRects.length).toBeGreaterThanOrEqual(1);
    expect(parchmentRects.length).toBeGreaterThanOrEqual(1);
  });

  it('scroll=false renders no guidance scroll rects', () => {
    // When scroll=false, no gold/parchment rects from the scroll icon
    const { container } = render(<CatSprite scroll={false} fur="#cfc7b4" />);
    const rects = Array.from(container.querySelectorAll('rect'));
    const goldRects = rects.filter(r => r.getAttribute('fill') === '#d9b66c');
    expect(goldRects.length).toBe(0);
  });

  it('DeskStation passes scroll prop to CatSprite when scroll=true', () => {
    const cat = getEntry('dev');
    const { container: noScroll } = render(<DeskStation x={0} y={0} cat={cat} scroll={false} />);
    const { container: withScroll } = render(<DeskStation x={0} y={0} cat={cat} scroll={true} />);
    const baseRects = noScroll.querySelectorAll('svg rect').length;
    const scrollRects = withScroll.querySelectorAll('svg rect').length;
    expect(scrollRects).toBe(baseRects + 3);
  });
});

// ============================================================
// Desk layout: all reviewer chars render correctly in DeskStation
// ============================================================
// covers: CH-REV-CODE-01, CH-REV-TEST-01, CH-REV-SEC-01
describe('DeskStation — reviewer character desk layout', () => {
  const reviewers = ROSTER.filter(e => e.group === 'review');

  it('all 4 reviewer roster entries can render in DeskStation without crash', () => {
    for (const cat of reviewers) {
      const { container } = render(<DeskStation x={0} y={0} cat={cat} />);
      expect(container.querySelector('.desk-station')).not.toBeNull();
    }
  });

  it('all reviewer DeskStations render a CatSprite SVG', () => {
    for (const cat of reviewers) {
      const { container } = render(<DeskStation x={0} y={0} cat={cat} />);
      expect(container.querySelector('svg')).not.toBeNull();
    }
  });

  it('all reviewer DeskStations render their agent name in nameplate', () => {
    for (const cat of reviewers) {
      const { getByText } = render(<DeskStation x={0} y={0} cat={cat} />);
      expect(getByText(cat.name)).toBeInTheDocument();
    }
  });

  it('reviewer cats have distinct fur colors from each other', () => {
    const furs = reviewers.map(r => r.fur);
    const uniqueFurs = new Set(furs);
    expect(uniqueFurs.size).toBe(reviewers.length);
  });
});

// ============================================================
// Core persistent cats: PM + Dev distinct from reviewers
// ============================================================
// covers: CH-PM-01, CH-DEV-01
describe('Core persistent cats: PM + Developer visually distinct from reviewers', () => {
  it('PM hat (leader) is not used by any reviewer', () => {
    const pm = getEntry('pm');
    const reviewers = ROSTER.filter(e => e.group === 'review');
    for (const r of reviewers) {
      expect(r.hat).not.toBe(pm.hat);
    }
  });

  it('Developer hat (headband) is not used by any reviewer', () => {
    const dev = getEntry('dev');
    const reviewers = ROSTER.filter(e => e.group === 'review');
    for (const r of reviewers) {
      expect(r.hat).not.toBe(dev.hat);
    }
  });

  it('PM and Developer nameplate renders correctly in DeskStation', () => {
    const pm = getEntry('pm');
    const dev = getEntry('dev');
    const { getByText: getPMText } = render(<DeskStation x={0} y={0} cat={pm} />);
    expect(getPMText(pm.name)).toBeInTheDocument();
    const { getByText: getDevText } = render(<DeskStation x={0} y={0} cat={dev} />);
    expect(getDevText(dev.name)).toBeInTheDocument();
  });
});
