/**
 * roster.test.ts — REQ-115: roster kind/summonedBy/group schema validation.
 *
 * WHY: M0.18 Phase 0 t0 introduces kind:'persistent'|'spirit' + summonedBy field
 * and splits 'retro' group into 'retro-lens' | 'retro-stage'. These tests verify
 * the new schema is correctly applied to all 13 ROSTER entries.
 */
import { describe, it, expect } from 'vitest';
import { ROSTER } from '../../src/data/roster';

const PERSISTENT_IDS = ['pm', 'dev', 'retro-pm'];
const SPIRIT_IDS = [
  'rev', 'rev-code', 'rev-sec', 'rev-test',
  'retro-pj', 'retro-proc', 'retro-meta', 'retro-research',
  'retro-counter', 'retro-agg',
];
const ALL_IDS = [...PERSISTENT_IDS, ...SPIRIT_IDS];

describe('REQ-115: ROSTER schema — 13 entries with kind/summonedBy/group', () => {
  it('has exactly 13 entries', () => {
    expect(ROSTER).toHaveLength(13);
  });

  it('all entries have unique ids', () => {
    const ids = ROSTER.map((r) => r.id);
    expect(new Set(ids).size).toBe(13);
  });

  it('all 13 expected IDs are present', () => {
    const ids = ROSTER.map((r) => r.id);
    for (const id of ALL_IDS) {
      expect(ids).toContain(id);
    }
  });
});

describe('REQ-115: ROSTER — kind field', () => {
  it('has exactly 3 persistent entries', () => {
    const persistents = ROSTER.filter((r) => r.kind === 'persistent');
    expect(persistents).toHaveLength(3);
  });

  it('has exactly 10 spirit entries', () => {
    const spirits = ROSTER.filter((r) => r.kind === 'spirit');
    expect(spirits).toHaveLength(10);
  });

  it('persistent ids are exactly pm, dev, retro-pm (order-independent)', () => {
    const persistentIds = ROSTER
      .filter((r) => r.kind === 'persistent')
      .map((r) => r.id)
      .sort();
    expect(persistentIds).toEqual(['dev', 'pm', 'retro-pm']);
  });

  it('spirit ids are the 10 review+retro spirits', () => {
    const spiritIds = ROSTER
      .filter((r) => r.kind === 'spirit')
      .map((r) => r.id)
      .sort();
    expect(spiritIds).toEqual([...SPIRIT_IDS].sort());
  });

  it('all kind values are "persistent" or "spirit" (no other values)', () => {
    for (const entry of ROSTER) {
      expect(['persistent', 'spirit']).toContain(entry.kind);
    }
  });
});

describe('REQ-115: ROSTER — summonedBy field', () => {
  it('persistent entries have summonedBy: null', () => {
    const persistents = ROSTER.filter((r) => r.kind === 'persistent');
    for (const entry of persistents) {
      expect(entry.summonedBy).toBeNull();
    }
  });

  it('spirit entries have summonedBy as non-empty string', () => {
    const spirits = ROSTER.filter((r) => r.kind === 'spirit');
    for (const entry of spirits) {
      expect(typeof entry.summonedBy).toBe('string');
      expect(entry.summonedBy).not.toBe('');
    }
  });

  it('summonedBy follows <skill-id>/<sub-path> format', () => {
    const spirits = ROSTER.filter((r) => r.kind === 'spirit');
    for (const entry of spirits) {
      // Must be a string matching pattern: word/word(.word)*
      expect(entry.summonedBy).toMatch(/^[\w-]+\/[\w.-]+$/);
    }
  });

  it('rev has summonedBy: "loom-review/single"', () => {
    const rev = ROSTER.find((r) => r.id === 'rev');
    expect(rev?.summonedBy).toBe('loom-review/single');
  });

  it('rev-code has summonedBy: "loom-review/trio.code"', () => {
    const entry = ROSTER.find((r) => r.id === 'rev-code');
    expect(entry?.summonedBy).toBe('loom-review/trio.code');
  });

  it('rev-sec has summonedBy: "loom-review/trio.security"', () => {
    const entry = ROSTER.find((r) => r.id === 'rev-sec');
    expect(entry?.summonedBy).toBe('loom-review/trio.security');
  });

  it('rev-test has summonedBy: "loom-review/trio.test"', () => {
    const entry = ROSTER.find((r) => r.id === 'rev-test');
    expect(entry?.summonedBy).toBe('loom-review/trio.test');
  });

  it('retro-pj has summonedBy: "loom-retro/lenses.pj-axis"', () => {
    const entry = ROSTER.find((r) => r.id === 'retro-pj');
    expect(entry?.summonedBy).toBe('loom-retro/lenses.pj-axis');
  });

  it('retro-proc has summonedBy: "loom-retro/lenses.process-axis"', () => {
    const entry = ROSTER.find((r) => r.id === 'retro-proc');
    expect(entry?.summonedBy).toBe('loom-retro/lenses.process-axis');
  });

  it('retro-meta has summonedBy: "loom-retro/lenses.meta-axis"', () => {
    const entry = ROSTER.find((r) => r.id === 'retro-meta');
    expect(entry?.summonedBy).toBe('loom-retro/lenses.meta-axis');
  });

  it('retro-research has summonedBy: "loom-retro/lenses.researcher"', () => {
    const entry = ROSTER.find((r) => r.id === 'retro-research');
    expect(entry?.summonedBy).toBe('loom-retro/lenses.researcher');
  });

  it('retro-counter has summonedBy: "loom-retro/stages.counter-arguer"', () => {
    const entry = ROSTER.find((r) => r.id === 'retro-counter');
    expect(entry?.summonedBy).toBe('loom-retro/stages.counter-arguer');
  });

  it('retro-agg has summonedBy: "loom-retro/stages.aggregator"', () => {
    const entry = ROSTER.find((r) => r.id === 'retro-agg');
    expect(entry?.summonedBy).toBe('loom-retro/stages.aggregator');
  });
});

describe('REQ-115: ROSTER — group field (new 4-value schema)', () => {
  it('all 4 group values exist in the roster', () => {
    const groups = new Set(ROSTER.map((r) => r.group));
    expect(groups.has('core')).toBe(true);
    expect(groups.has('review')).toBe(true);
    expect(groups.has('retro-lens')).toBe(true);
    expect(groups.has('retro-stage')).toBe(true);
  });

  it('no entry has old "retro" group value', () => {
    const retroEntries = ROSTER.filter((r) => r.group === 'retro' as string);
    expect(retroEntries).toHaveLength(0);
  });

  it('all group values are one of the 4 valid values', () => {
    const valid = new Set(['core', 'review', 'retro-lens', 'retro-stage']);
    for (const entry of ROSTER) {
      expect(valid.has(entry.group)).toBe(true);
    }
  });

  it('persistent agents are in group "core"', () => {
    const persistents = ROSTER.filter((r) => r.kind === 'persistent');
    for (const entry of persistents) {
      expect(entry.group).toBe('core');
    }
  });

  it('review spirits are in group "review"', () => {
    const reviewIds = ['rev', 'rev-code', 'rev-sec', 'rev-test'];
    const reviewEntries = ROSTER.filter((r) => reviewIds.includes(r.id));
    for (const entry of reviewEntries) {
      expect(entry.group).toBe('review');
    }
  });

  it('retro lenses are in group "retro-lens"', () => {
    const lensIds = ['retro-pj', 'retro-proc', 'retro-meta', 'retro-research'];
    const lensEntries = ROSTER.filter((r) => lensIds.includes(r.id));
    for (const entry of lensEntries) {
      expect(entry.group).toBe('retro-lens');
    }
  });

  it('retro stages are in group "retro-stage"', () => {
    const stageIds = ['retro-counter', 'retro-agg'];
    const stageEntries = ROSTER.filter((r) => stageIds.includes(r.id));
    for (const entry of stageEntries) {
      expect(entry.group).toBe('retro-stage');
    }
  });
});

describe('REQ-115: ROSTER — visual identity fields preserved (愛着の核)', () => {
  it('all entries have non-empty name, breed, quote, fur, cheek, role, jp', () => {
    for (const entry of ROSTER) {
      expect(entry.name).toBeTruthy();
      expect(entry.breed).toBeTruthy();
      expect(entry.quote).toBeTruthy();
      expect(entry.fur).toBeTruthy();
      expect(entry.cheek).toBeTruthy();
      expect(entry.role).toBeTruthy();
      expect(entry.jp).toBeTruthy();
    }
  });

  it('pm has name ニケ, breed ブリティッシュショートヘア', () => {
    const pm = ROSTER.find((r) => r.id === 'pm');
    expect(pm?.name).toBe('ニケ');
    expect(pm?.breed).toBe('ブリティッシュショートヘア');
  });
});
