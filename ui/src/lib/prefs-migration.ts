/**
 * prefs-migration.ts — user-prefs.json schema migration utilities
 *
 * WHY: CT-SCHEMA-02 requires that when old flat schema (agents.loom-reviewer.*)
 * exists in user-prefs.json, it is lifted up to skills.loom-review.* on
 * Customization startup. This preserves user settings from pre-v2 format.
 *
 * Migration path:
 *   v1 (flat): agents.loom-reviewer.{model, personality}
 *   v2 (tree): skills.loom-review.strategies.single.{model, personality}
 *
 * Design SSoT: qa-suite.js CT-SCHEMA-02
 * SPEC: spec/ui-arch.md §8.2.2 Customization Tree
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentPrefs {
  model?: string;
  personality?: string;
  [key: string]: unknown;
}

export interface SkillStrategyPrefs {
  model?: string;
  personality?: string;
  [key: string]: unknown;
}

export interface SkillPrefs {
  strategies?: {
    single?: SkillStrategyPrefs;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface PrefsV1 {
  schema_version?: number;
  agents?: Record<string, AgentPrefs>;
  [key: string]: unknown;
}

export interface PrefsV2 {
  schema_version: number;
  agents?: Record<string, AgentPrefs>;
  skills?: Record<string, SkillPrefs>;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Migration: v1 flat schema → v2 tree schema
// ---------------------------------------------------------------------------

/**
 * Migrate user-prefs from v1 (flat) to v2 (tree).
 *
 * WHY: The old schema stored reviewer config under agents.loom-reviewer.*
 * which conflated agent identity with skill configuration. The v2 schema
 * separates these: agents.* for agent-specific settings (model, personality)
 * and skills.* for skill-specific strategies.
 *
 * Specifically:
 *   agents.loom-reviewer.model      → skills.loom-review.strategies.single.model
 *   agents.loom-reviewer.personality → skills.loom-review.strategies.single.personality
 *
 * The loom-reviewer key is removed from agents after migration.
 * schema_version is bumped to 2.
 * A no-op is performed if no loom-reviewer key exists.
 */
export function migratePrefsV1ToV2(prefs: Partial<PrefsV1>): PrefsV2 {
  // Start with a shallow copy, preserving all existing fields
  const result: PrefsV2 = {
    ...prefs,
    schema_version: 2,
  };

  const agents = prefs.agents;

  // No agents or no loom-reviewer key → no migration needed
  if (!agents || !agents['loom-reviewer']) {
    // Ensure agents field is not modified if it doesn't contain loom-reviewer
    return result;
  }

  // Extract the old reviewer config
  const reviewerPrefs = agents['loom-reviewer'];

  // Build the new agents record without loom-reviewer
  const newAgents: Record<string, AgentPrefs> = {};
  for (const [key, val] of Object.entries(agents)) {
    if (key !== 'loom-reviewer') {
      newAgents[key] = val;
    }
  }
  result.agents = newAgents;

  // Lift loom-reviewer config to skills.loom-review.strategies.single
  const singleStrategy: SkillStrategyPrefs = {};
  if (reviewerPrefs.model !== undefined) {
    singleStrategy.model = reviewerPrefs.model;
  }
  if (reviewerPrefs.personality !== undefined) {
    singleStrategy.personality = reviewerPrefs.personality;
  }

  result.skills = {
    ...(result.skills as Record<string, SkillPrefs> | undefined),
    'loom-review': {
      strategies: {
        single: singleStrategy,
      },
    },
  };

  return result;
}
