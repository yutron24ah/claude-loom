/**
 * skills.test.ts — REQ-116: SKILLS registry schema validation.
 *
 * WHY: M0.18 Phase 0 t0 introduces ui/src/data/skills.ts as a new registry
 * for loom-review and loom-retro skills, mapping skill strategies/lenses/stages
 * to their corresponding spirit IDs in the ROSTER.
 */
import { describe, it, expect } from 'vitest';
import { SKILLS } from '../../src/data/skills';
import { ROSTER } from '../../src/data/roster';

describe('REQ-116: SKILLS registry — top-level structure', () => {
  it('has exactly 2 skills', () => {
    expect(SKILLS).toHaveLength(2);
  });

  it('contains loom-review skill', () => {
    const skill = SKILLS.find((s) => s.id === 'loom-review');
    expect(skill).toBeDefined();
  });

  it('contains loom-retro skill', () => {
    const skill = SKILLS.find((s) => s.id === 'loom-retro');
    expect(skill).toBeDefined();
  });

  it('all skills have id, label, desc, write fields', () => {
    for (const skill of SKILLS) {
      expect(skill.id).toBeTruthy();
      expect(skill.label).toBeTruthy();
      expect(skill.desc).toBeTruthy();
      expect(typeof skill.write).toBe('boolean');
    }
  });
});

describe('REQ-116: SKILLS — loom-review', () => {
  const getReview = () => SKILLS.find((s) => s.id === 'loom-review')!;

  it('has write: false', () => {
    expect(getReview().write).toBe(false);
  });

  it('has exactly 4 strategies', () => {
    expect(getReview().strategies).toHaveLength(4);
  });

  it('has no lenses or stages', () => {
    const review = getReview();
    expect(review.lenses).toBeUndefined();
    expect(review.stages).toBeUndefined();
  });

  it('strategy ids are: single, trio.code, trio.security, trio.test', () => {
    const ids = getReview().strategies!.map((s) => s.id).sort();
    expect(ids).toEqual(['single', 'trio.code', 'trio.security', 'trio.test'].sort());
  });

  it('each strategy has id, path, label, spiritId', () => {
    for (const strategy of getReview().strategies!) {
      expect(strategy.id).toBeTruthy();
      expect(strategy.path).toBeTruthy();
      expect(strategy.label).toBeTruthy();
      expect(strategy.spiritId).toBeTruthy();
    }
  });

  it('strategy paths follow <skill-id>/<sub-path> format', () => {
    for (const strategy of getReview().strategies!) {
      expect(strategy.path).toMatch(/^loom-review\/.+/);
    }
  });

  it('single strategy has spiritId "rev"', () => {
    const single = getReview().strategies!.find((s) => s.id === 'single');
    expect(single?.spiritId).toBe('rev');
  });

  it('trio.code strategy has spiritId "rev-code"', () => {
    const s = getReview().strategies!.find((s) => s.id === 'trio.code');
    expect(s?.spiritId).toBe('rev-code');
  });

  it('trio.security strategy has spiritId "rev-sec"', () => {
    const s = getReview().strategies!.find((s) => s.id === 'trio.security');
    expect(s?.spiritId).toBe('rev-sec');
  });

  it('trio.test strategy has spiritId "rev-test"', () => {
    const s = getReview().strategies!.find((s) => s.id === 'trio.test');
    expect(s?.spiritId).toBe('rev-test');
  });
});

describe('REQ-116: SKILLS — loom-retro', () => {
  const getRetro = () => SKILLS.find((s) => s.id === 'loom-retro')!;

  it('has write: true', () => {
    expect(getRetro().write).toBe(true);
  });

  it('has exactly 4 lenses', () => {
    expect(getRetro().lenses).toHaveLength(4);
  });

  it('has exactly 2 stages', () => {
    expect(getRetro().stages).toHaveLength(2);
  });

  it('has no strategies', () => {
    expect(getRetro().strategies).toBeUndefined();
  });

  it('lens ids are: pj-axis, process-axis, meta-axis, researcher', () => {
    const ids = getRetro().lenses!.map((l) => l.id).sort();
    expect(ids).toEqual(['meta-axis', 'pj-axis', 'process-axis', 'researcher']);
  });

  it('stage ids are: counter-arguer, aggregator', () => {
    const ids = getRetro().stages!.map((s) => s.id).sort();
    expect(ids).toEqual(['aggregator', 'counter-arguer']);
  });

  it('each lens has id, path, label, spiritId', () => {
    for (const lens of getRetro().lenses!) {
      expect(lens.id).toBeTruthy();
      expect(lens.path).toBeTruthy();
      expect(lens.label).toBeTruthy();
      expect(lens.spiritId).toBeTruthy();
    }
  });

  it('lens paths follow loom-retro/lenses.<id> format', () => {
    for (const lens of getRetro().lenses!) {
      expect(lens.path).toMatch(/^loom-retro\/lenses\..+/);
    }
  });

  it('aggregator stage has writePermission: true', () => {
    const agg = getRetro().stages!.find((s) => s.id === 'aggregator');
    expect(agg?.writePermission).toBe(true);
  });

  it('counter-arguer stage does NOT have writePermission: true', () => {
    const counter = getRetro().stages!.find((s) => s.id === 'counter-arguer');
    // undefined or false, but not true
    expect(counter?.writePermission).not.toBe(true);
  });

  it('pj-axis lens has spiritId "retro-pj"', () => {
    const lens = getRetro().lenses!.find((l) => l.id === 'pj-axis');
    expect(lens?.spiritId).toBe('retro-pj');
  });

  it('process-axis lens has spiritId "retro-proc"', () => {
    const lens = getRetro().lenses!.find((l) => l.id === 'process-axis');
    expect(lens?.spiritId).toBe('retro-proc');
  });

  it('meta-axis lens has spiritId "retro-meta"', () => {
    const lens = getRetro().lenses!.find((l) => l.id === 'meta-axis');
    expect(lens?.spiritId).toBe('retro-meta');
  });

  it('researcher lens has spiritId "retro-research"', () => {
    const lens = getRetro().lenses!.find((l) => l.id === 'researcher');
    expect(lens?.spiritId).toBe('retro-research');
  });

  it('counter-arguer stage has spiritId "retro-counter"', () => {
    const s = getRetro().stages!.find((s) => s.id === 'counter-arguer');
    expect(s?.spiritId).toBe('retro-counter');
  });

  it('aggregator stage has spiritId "retro-agg"', () => {
    const s = getRetro().stages!.find((s) => s.id === 'aggregator');
    expect(s?.spiritId).toBe('retro-agg');
  });
});

describe('REQ-116: SKILLS cross-reference — spiritIds match ROSTER', () => {
  const spiritIds = ROSTER
    .filter((r) => r.kind === 'spirit')
    .map((r) => r.id);

  it('all skill spiritIds exist in ROSTER as spirit entries', () => {
    for (const skill of SKILLS) {
      const allSubItems = [
        ...(skill.strategies ?? []),
        ...(skill.lenses ?? []),
        ...(skill.stages ?? []),
      ];
      for (const item of allSubItems) {
        expect(spiritIds).toContain(item.spiritId);
      }
    }
  });

  it('skill path matches ROSTER summonedBy for each spirit', () => {
    for (const skill of SKILLS) {
      const allSubItems = [
        ...(skill.strategies ?? []),
        ...(skill.lenses ?? []),
        ...(skill.stages ?? []),
      ];
      for (const item of allSubItems) {
        const rosterEntry = ROSTER.find((r) => r.id === item.spiritId);
        expect(rosterEntry?.summonedBy).toBe(item.path);
      }
    }
  });
});
