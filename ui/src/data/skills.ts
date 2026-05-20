/**
 * ui/src/data/skills.ts — skill registry for loom-review and loom-retro.
 *
 * WHY: M0.18 Phase 0 introduces the skill registry that drives:
 * - Customization tree (Phase 1): which spirits can be customized via which skill
 * - Session column rename: display spirit label derived from skill path
 * - Room Spirit Summoning (Phase 1): ephemeral spirits listed under their skill
 *
 * Ported from docs/design/2026-05-17-m0.18-ui-rework/project/cat.jsx SKILLS.
 * spiritId values cross-reference ROSTER entries (kind: 'spirit').
 */

/** A strategy variant within loom-review (single / trio.*) */
export interface Strategy {
  id: string;
  /** Full skill path used as ROSTER.summonedBy identifier */
  path: string;
  label: string;
  /** ID of the ROSTER entry (kind: 'spirit') summoned by this strategy */
  spiritId: string;
  writePermission?: boolean;
}

/** A lens variant within loom-retro */
export interface Lens {
  id: string;
  /** Full skill path used as ROSTER.summonedBy identifier */
  path: string;
  label: string;
  /** ID of the ROSTER entry (kind: 'spirit') summoned by this lens */
  spiritId: string;
}

/** A stage variant within loom-retro (counter-arguer / aggregator) */
export interface Stage {
  id: string;
  /** Full skill path used as ROSTER.summonedBy identifier */
  path: string;
  label: string;
  /** ID of the ROSTER entry (kind: 'spirit') summoned by this stage */
  spiritId: string;
  /** true only for aggregator — has write permission to learned_guidance */
  writePermission?: boolean;
}

/** A skill definition with strategies, lenses, or stages */
export interface Skill {
  id: string;
  label: string;
  desc: string;
  /** true if any sub-item can write to persistent state (learned_guidance) */
  write: boolean;
  strategies?: Strategy[];
  lenses?: Lens[];
  stages?: Stage[];
}

/**
 * SKILLS registry — 2 skills: loom-review + loom-retro.
 * Each sub-item maps to a ROSTER spirit entry via spiritId / path.
 */
export const SKILLS: Skill[] = [
  {
    id: 'loom-review',
    label: 'loom-review',
    desc: 'コード/PR レビュー。strategy で並列度を切替',
    write: false,
    strategies: [
      { id: 'single',        path: 'loom-review/single',        label: 'single',          spiritId: 'rev' },
      { id: 'trio.code',     path: 'loom-review/trio.code',     label: 'trio · code',     spiritId: 'rev-code' },
      { id: 'trio.security', path: 'loom-review/trio.security', label: 'trio · security', spiritId: 'rev-sec' },
      { id: 'trio.test',     path: 'loom-review/trio.test',     label: 'trio · test',     spiritId: 'rev-test' },
    ],
  },
  {
    id: 'loom-retro',
    label: 'loom-retro',
    desc: 'Retro lens 群 + 反論 + 集約。Aggregator のみ書き込み権限',
    write: true,
    lenses: [
      { id: 'pj-axis',      path: 'loom-retro/lenses.pj-axis',      label: 'lens · PJ-axis',      spiritId: 'retro-pj' },
      { id: 'process-axis', path: 'loom-retro/lenses.process-axis', label: 'lens · Process-axis', spiritId: 'retro-proc' },
      { id: 'meta-axis',    path: 'loom-retro/lenses.meta-axis',    label: 'lens · Meta-axis',    spiritId: 'retro-meta' },
      { id: 'researcher',   path: 'loom-retro/lenses.researcher',   label: 'lens · Researcher',   spiritId: 'retro-research' },
    ],
    stages: [
      { id: 'counter-arguer', path: 'loom-retro/stages.counter-arguer', label: 'stage · Counter-Arguer', spiritId: 'retro-counter' },
      { id: 'aggregator',     path: 'loom-retro/stages.aggregator',     label: 'stage · Aggregator',     spiritId: 'retro-agg', writePermission: true },
    ],
  },
];
