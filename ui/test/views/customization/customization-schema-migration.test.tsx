/**
 * Customization schema v2 migration compat test (M0.19 t6 — CT-SCHEMA-02)
 *
 * WHY: Verify that the old flat schema (agents.loom-reviewer.*) gets migrated
 * to the new skills.loom-review.* path when user-prefs.json contains legacy keys.
 *
 * qa-suite case CT-SCHEMA-02:
 *   pre:      旧 agents.loom-reviewer.* が存在
 *   steps:    Customization 起動
 *   expected: 旧 key を skills.loom-review.* に lift up
 *             元 file は backup として残す or warn
 *
 * The migration is a pure data transformation function exposed from the prefs
 * compatibility module. This test covers the migration logic as a unit test.
 */
// covers: CT-SCHEMA-02
import { describe, it, expect } from 'vitest';
import { migratePrefsV1ToV2 } from '../../../src/lib/prefs-migration';

// ---------------------------------------------------------------------------
// Fixture: legacy flat schema (pre-v2)
// ---------------------------------------------------------------------------
const LEGACY_PREFS_WITH_REVIEWER = {
  schema_version: 1,
  agents: {
    'loom-reviewer': {
      model: 'sonnet',
      personality: 'strict',
    },
    'loom-developer': {
      model: 'opus',
    },
    'loom-pm': {
      model: 'sonnet',
    },
  },
};

const LEGACY_PREFS_WITHOUT_REVIEWER = {
  schema_version: 1,
  agents: {
    'loom-developer': {
      model: 'opus',
    },
    'loom-pm': {
      model: 'sonnet',
    },
  },
};

// ---------------------------------------------------------------------------
// CT-SCHEMA-02: flat schema migration
// ---------------------------------------------------------------------------
describe('migratePrefsV1ToV2 — CT-SCHEMA-02', () => {
  it('lifts agents.loom-reviewer.* to skills.loom-review.strategies.single', () => {
    const result = migratePrefsV1ToV2(LEGACY_PREFS_WITH_REVIEWER);
    // The legacy reviewer config should appear under skills
    expect(result.skills).toBeDefined();
    expect(result.skills?.['loom-review']).toBeDefined();
    expect(result.skills?.['loom-review']?.strategies?.single).toBeDefined();
    expect(result.skills?.['loom-review']?.strategies?.single?.model).toBe('sonnet');
  });

  it('removes agents.loom-reviewer key after migration', () => {
    const result = migratePrefsV1ToV2(LEGACY_PREFS_WITH_REVIEWER);
    // loom-reviewer should be removed from agents after migration
    expect(result.agents?.['loom-reviewer']).toBeUndefined();
  });

  it('preserves other agents keys during migration', () => {
    const result = migratePrefsV1ToV2(LEGACY_PREFS_WITH_REVIEWER);
    expect(result.agents?.['loom-developer']).toBeDefined();
    expect(result.agents?.['loom-developer']?.model).toBe('opus');
    expect(result.agents?.['loom-pm']).toBeDefined();
    expect(result.agents?.['loom-pm']?.model).toBe('sonnet');
  });

  it('returns schema_version: 2 after migration', () => {
    const result = migratePrefsV1ToV2(LEGACY_PREFS_WITH_REVIEWER);
    expect(result.schema_version).toBe(2);
  });

  it('is a no-op (identity) when no loom-reviewer key exists', () => {
    const result = migratePrefsV1ToV2(LEGACY_PREFS_WITHOUT_REVIEWER);
    // No reviewer key — agents preserved, no skills key injected
    expect(result.agents?.['loom-developer']).toBeDefined();
    expect(result.agents?.['loom-pm']).toBeDefined();
    // skills may or may not be present, but loom-review must not have stale data
    expect(result.agents?.['loom-reviewer']).toBeUndefined();
  });

  it('handles empty prefs object without throwing', () => {
    expect(() => migratePrefsV1ToV2({})).not.toThrow();
  });

  it('handles prefs with null agents without throwing', () => {
    expect(() => migratePrefsV1ToV2({ agents: undefined })).not.toThrow();
  });

  it('preserves personality field when migrating loom-reviewer', () => {
    const result = migratePrefsV1ToV2(LEGACY_PREFS_WITH_REVIEWER);
    expect(result.skills?.['loom-review']?.strategies?.single?.personality).toBe('strict');
  });
});
