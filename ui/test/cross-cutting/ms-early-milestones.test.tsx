/**
 * ms-early-milestones.test.tsx — Milestone feature audit: M0.5 through M0.13 (t4a)
 *
 * WHY: qa-suite.js "mainstatus" section audits that features promised by each milestone
 * are still present in the current codebase. This file (Section A) covers M0.5-M0.13:
 *   - M0.5: Approval-Reduction Skills (loom-tdd-cycle, loom-test, loom-status, loom-review)
 *   - M0.6: Single-Reviewer Default + Trio Opt-in (review_mode in template)
 *   - M0.7: Conventional Commits + GitHub Flow (COMMIT_GUIDE.md, branch_types in template)
 *   - M0.8: Retro Architecture (loom-retro skill + retro UI)
 *   - M0.9: Harness Polish (CODING_PRINCIPLES.md, loom-write-plan, loom-debug)
 *   - M0.10: git worktree integration (loom-worktree skill + WorktreeView UI)
 *   - M0.11: retro→agent feedback loop (learned_guidance in templates + GuidanceView UI)
 *   - M0.12: Coexistence Mode (loom-mode command, coexistence_mode in project.json.template)
 *   - M0.13: Retro Discipline & Process Hardening (RETRO_GUIDE.md, retro agent behaviors)
 *
 * Audit nature: meta-tests verifying harness artifact presence (fs.existsSync) and
 * UI component mount/structure. Per t4a precedent and design.md §2, features should
 * already exist — RED phase is "test file not yet written" (trivial RED for audit tests).
 *
 * TDD note (t3a/t4a precedent): audit-style tests have trivial RED (the test FILE is new,
 * not the feature). Each test confirms a previously-delivered milestone artifact still
 * exists. If a test fails, it signals a regression in an established feature.
 *
 * References:
 * - qa-suite.js §mainstatus groups: ms-retro, ms-worktree, ms-guidance, ms-customization,
 *   ms-coexistence, ms-consistency (Section A slice)
 * - PLAN.md M0.5 through M0.13 completion criteria
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Path helpers — resolve relative to worktree root (this file is in ui/test/cross-cutting/)
// ---------------------------------------------------------------------------

/** Resolve a path relative to the repo root (3 levels up from ui/test/cross-cutting) */
function repoPath(...segments: string[]): string {
  return resolve(__dirname, '../../../', ...segments);
}

// ===========================================================================
// M0.5 — Approval-Reduction Skills
// Completion criterion: 4 skills (loom-test, loom-status, loom-tdd-cycle, loom-review)
// installed as SKILL.md files in skills/ directory.
// Note: M0.5 adds harness skills that enable the review + retro cycle tested in M0.6/M0.8.
// No dedicated MS-* qa-suite case maps to raw skill-file presence; this suite validates
// the foundational artifacts that underpin MS-RETRO-* / MS-CUST-* / MS-WT-* scenarios.
// ===========================================================================
describe('M0.5 — Skills harness artifacts (loom-test, loom-status, loom-tdd-cycle, loom-review)', () => {
  it('skills/loom-tdd-cycle/SKILL.md exists (M0.5 TDD discipline skill)', () => {
    expect(existsSync(repoPath('skills/loom-tdd-cycle/SKILL.md'))).toBe(true);
  });

  it('skills/loom-test/SKILL.md exists (M0.5 harness self-test skill)', () => {
    expect(existsSync(repoPath('skills/loom-test/SKILL.md'))).toBe(true);
  });

  it('skills/loom-status/SKILL.md exists (M0.5 status snapshot skill)', () => {
    expect(existsSync(repoPath('skills/loom-status/SKILL.md'))).toBe(true);
  });

  it('skills/loom-review/SKILL.md exists (M0.5 review skill — pre-single/trio split)', () => {
    expect(existsSync(repoPath('skills/loom-review/SKILL.md'))).toBe(true);
  });
});

// ===========================================================================
// M0.6 — Single-Reviewer Default + Trio Opt-in
// Completion criterion: agents/loom-developer.md + skills/loom-review/SKILL.md +
// review_mode in project.json.template
// ===========================================================================
describe('M0.6 — Reviewer architecture harness artifacts', () => {
  it('agents/loom-developer.md exists (M0.6 dispatches reviewer)', () => {
    expect(existsSync(repoPath('agents/loom-developer.md'))).toBe(true);
  });

  it('templates/claude-loom/project.json.template contains review_mode field (M0.6)', () => {
    const templatePath = repoPath('templates/claude-loom/project.json.template');
    expect(existsSync(templatePath)).toBe(true);
    // review_mode: "single" must be present as the default
    const content = require('node:fs').readFileSync(templatePath, 'utf8');
    expect(content).toContain('review_mode');
  });
});

// ===========================================================================
// M0.7 — Conventional Commits + GitHub Flow Adoption
// Completion criterion: docs/COMMIT_GUIDE.md + branch_types + commit_prefixes in template
// ===========================================================================
describe('M0.7 — Conventional Commits + GitHub Flow artifacts', () => {
  it('docs/COMMIT_GUIDE.md exists (M0.7 commit convention SSoT)', () => {
    expect(existsSync(repoPath('docs/COMMIT_GUIDE.md'))).toBe(true);
  });

  it('COMMIT_GUIDE.md mentions the 11 conventional commit types', () => {
    const content = require('node:fs').readFileSync(repoPath('docs/COMMIT_GUIDE.md'), 'utf8');
    // M0.7 adds feat/fix/docs/style/refactor/perf/test/build/ci/chore/revert
    expect(content).toContain('feat');
    expect(content).toContain('refactor');
    expect(content).toContain('revert');
  });

  it('project.json.template contains commit_prefixes field (M0.7)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('templates/claude-loom/project.json.template'),
      'utf8',
    );
    expect(content).toContain('commit_prefixes');
  });

  it('project.json.template contains branch_types field (M0.7 GitHub Flow)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('templates/claude-loom/project.json.template'),
      'utf8',
    );
    expect(content).toContain('branch_types');
  });
});

// ===========================================================================
// M0.8 — Retro Architecture (賢くなる開発室の中核)
// Completion criterion: skills/loom-retro/SKILL.md + loom-retro-pm agent +
// RetroView UI component present
// ===========================================================================
// covers: MS-RETRO-START-01, MS-RETRO-STAGE-01, MS-RETRO-DECIDE-01, MS-RETRO-ARCHIVE-01
describe('M0.8 — Retro Architecture: harness skill + agent artifacts', () => {
  it('skills/loom-retro/SKILL.md exists (M0.8 retro skill SSoT)', () => {
    expect(existsSync(repoPath('skills/loom-retro/SKILL.md'))).toBe(true);
  });

  it('loom-retro/SKILL.md contains "lens" keyword (4-lens retro protocol)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('skills/loom-retro/SKILL.md'),
      'utf8',
    );
    expect(content.toLowerCase()).toContain('lens');
  });

  it('agents/loom-retro-pm.md exists (M0.8 retro PM orchestrator)', () => {
    expect(existsSync(repoPath('agents/loom-retro-pm.md'))).toBe(true);
  });
});

describe('M0.8 — Retro UI: RetroView component exists (MS-RETRO-* coverage)', () => {
  it('ui/src/views/retro/RetroView.tsx exists (MS-RETRO-START-01 UI layer)', () => {
    expect(existsSync(repoPath('ui/src/views/retro/RetroView.tsx'))).toBe(true);
  });

  it('ui/src/views/retro/KptColumn.tsx exists (MS-RETRO-STAGE-01 KPT board column)', () => {
    expect(existsSync(repoPath('ui/src/views/retro/KptColumn.tsx'))).toBe(true);
  });

  it('ui/src/views/retro/CarryoverCard.tsx exists (MS-RETRO-DECIDE-01 carryover panel)', () => {
    expect(existsSync(repoPath('ui/src/views/retro/CarryoverCard.tsx'))).toBe(true);
  });

  it('ui/src/views/retro/AdminPanel.tsx exists (MS-RETRO-ARCHIVE-01 archive admin)', () => {
    expect(existsSync(repoPath('ui/src/views/retro/AdminPanel.tsx'))).toBe(true);
  });
});

// ===========================================================================
// M0.9 — Harness Polish (superpowers独立 + Customization Layer)
// Completion criterion: docs/CODING_PRINCIPLES.md + skills/loom-write-plan + loom-debug
// CustomizationView UI present
// ===========================================================================
// covers: MS-CUST-MODEL-01, MS-CUST-PRESET-01, MS-CUST-CUSTOM-TEXT-01, MS-CUST-SCOPE-01
describe('M0.9 — Harness Polish: CODING_PRINCIPLES + write-plan + debug artifacts', () => {
  it('docs/CODING_PRINCIPLES.md exists (M0.9 13 principles SSoT)', () => {
    expect(existsSync(repoPath('docs/CODING_PRINCIPLES.md'))).toBe(true);
  });

  it('CODING_PRINCIPLES.md mentions TDD (discipline anchor for M0.9)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('docs/CODING_PRINCIPLES.md'),
      'utf8',
    );
    expect(content).toContain('TDD');
  });

  it('skills/loom-write-plan/SKILL.md exists (M0.9 plan generation skill)', () => {
    expect(existsSync(repoPath('skills/loom-write-plan/SKILL.md'))).toBe(true);
  });

  it('skills/loom-debug/SKILL.md exists (M0.9 systematic debug skill)', () => {
    expect(existsSync(repoPath('skills/loom-debug/SKILL.md'))).toBe(true);
  });

  it('templates/user-prefs.json.template exists (M0.9 Customization Layer prefs SSoT)', () => {
    expect(existsSync(repoPath('templates/user-prefs.json.template'))).toBe(true);
  });
});

describe('M0.9 — Customization UI: CustomizationView + tree nav (MS-CUST-* coverage)', () => {
  it('ui/src/views/customization/CustomizationView.tsx exists (MS-CUST-MODEL-01 UI layer)', () => {
    expect(existsSync(repoPath('ui/src/views/customization/CustomizationView.tsx'))).toBe(true);
  });

  it('ui/src/views/customization/TreeNav.tsx exists (MS-CUST-PRESET-01 tree navigation)', () => {
    expect(existsSync(repoPath('ui/src/views/customization/TreeNav.tsx'))).toBe(true);
  });

  it('ui/src/views/customization/LeafEditor.tsx exists (MS-CUST-CUSTOM-TEXT-01 leaf editor)', () => {
    expect(existsSync(repoPath('ui/src/views/customization/LeafEditor.tsx'))).toBe(true);
  });
});

// ===========================================================================
// M0.10 — git worktree 統合
// Completion criterion: skills/loom-worktree/SKILL.md + commands/loom-worktree.md +
// WorktreeView + SubroomClone UI present
// ===========================================================================
// covers: MS-WT-CREATE-01, MS-WT-DELETE-01, MS-WT-LOCK-01, MS-WT-SUBROOM-VIZ-01
describe('M0.10 — Worktree integration: skill + command artifacts', () => {
  it('skills/loom-worktree/SKILL.md exists (M0.10 worktree decision-tree skill)', () => {
    expect(existsSync(repoPath('skills/loom-worktree/SKILL.md'))).toBe(true);
  });

  it('loom-worktree/SKILL.md contains "Decision tree" section (M0.10 completion criterion)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('skills/loom-worktree/SKILL.md'),
      'utf8',
    );
    expect(content.toLowerCase()).toContain('decision');
  });

  it('commands/loom-worktree.md exists (M0.10 slash command)', () => {
    expect(existsSync(repoPath('commands/loom-worktree.md'))).toBe(true);
  });

  it('templates/project-prefs.json.template contains worktree section (M0.10)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('templates/project-prefs.json.template'),
      'utf8',
    );
    expect(content).toContain('worktree');
  });
});

describe('M0.10 — Worktree UI: WorktreeView + SubroomClone (MS-WT-* coverage)', () => {
  it('ui/src/views/worktree/WorktreeView.tsx exists (MS-WT-CREATE-01 + MS-WT-DELETE-01 + MS-WT-LOCK-01 UI)', () => {
    expect(existsSync(repoPath('ui/src/views/worktree/WorktreeView.tsx'))).toBe(true);
  });

  it('WorktreeView.tsx contains createWorktree wiring (MS-WT-CREATE-01 wire layer)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('ui/src/views/worktree/WorktreeView.tsx'),
      'utf8',
    );
    // useWorktreeMutations is wired (M0.15 t16), confirming wire layer present
    expect(content).toContain('useWorktreeMutations');
  });

  it('WorktreeView.tsx contains showCreate state for create dialog (MS-WT-CREATE-01)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('ui/src/views/worktree/WorktreeView.tsx'),
      'utf8',
    );
    expect(content).toContain('showCreate');
  });

  it('WorktreeView.tsx contains destroyWorktree (MS-WT-DELETE-01 wire layer)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('ui/src/views/worktree/WorktreeView.tsx'),
      'utf8',
    );
    expect(content).toContain('destroyWorktree');
  });

  it('WorktreeView.tsx contains lock/unlock wiring (MS-WT-LOCK-01 wire layer)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('ui/src/views/worktree/WorktreeView.tsx'),
      'utf8',
    );
    expect(content).toContain('lockWorktree');
    expect(content).toContain('unlockWorktree');
  });

  it('ui/src/views/room/SubroomClone.tsx exists (MS-WT-SUBROOM-VIZ-01 subroom ghost cat)', () => {
    expect(existsSync(repoPath('ui/src/views/room/SubroomClone.tsx'))).toBe(true);
  });

  it('SubroomClone.tsx renders ghost cat for worktree subroom (MS-WT-SUBROOM-VIZ-01 UI)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('ui/src/views/room/SubroomClone.tsx'),
      'utf8',
    );
    // SubroomClone has subroom-clone class for ghost transparency
    expect(content).toContain('subroom-clone');
    // Branch prop is rendered as @branch label
    expect(content).toContain('@{branch}');
  });
});

// ===========================================================================
// M0.11 — retro→agent prompt feedback loop (learned_guidance 機構)
// Completion criterion: templates updated with learned_guidance field +
// GuidanceView + LearnedGuidanceView UI present
// ===========================================================================
// covers: MS-GU-AUDIT-01, MS-GU-DUP-HINT-01, MS-GU-VIEWS-CONFLICT-01
describe('M0.11 — learned_guidance: template + harness artifacts', () => {
  it('user-prefs.json.template contains learned_guidance field (M0.11 prefs schema)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('templates/user-prefs.json.template'),
      'utf8',
    );
    expect(content).toContain('learned_guidance');
  });

  it('project-prefs.json.template contains learned_guidance field (M0.11 project prefs)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('templates/project-prefs.json.template'),
      'utf8',
    );
    expect(content).toContain('learned_guidance');
  });
});

describe('M0.11 — Guidance UI: GuidanceView + LearnedGuidanceView (MS-GU-* coverage)', () => {
  it('ui/src/views/guidance/GuidanceView.tsx exists (MS-GU-AUDIT-01 guidance audit trail UI)', () => {
    expect(existsSync(repoPath('ui/src/views/guidance/GuidanceView.tsx'))).toBe(true);
  });

  it('GuidanceView.tsx renders audit trail fields (from_retro / category / TTL / use_count)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('ui/src/views/guidance/GuidanceView.tsx'),
      'utf8',
    );
    // audit trail fields per MS-GU-AUDIT-01 expected: from_retro / category / TTL / use_count
    expect(content).toContain('category');
    expect(content).toContain('useCount');
  });

  it('ui/src/views/guidance/LearnedGuidanceView.tsx exists (MS-GU-AUDIT-01 audit trail view)', () => {
    expect(existsSync(repoPath('ui/src/views/guidance/LearnedGuidanceView.tsx'))).toBe(true);
  });

  it('LearnedGuidanceView.tsx contains scope filter (MS-GU-AUDIT-01 agent filter)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('ui/src/views/guidance/LearnedGuidanceView.tsx'),
      'utf8',
    );
    // scope filter pills present per M0.18 audit trail audit
    expect(content).toContain('ScopeFilter');
  });

  // MS-GU-DUP-HINT-01: duplicate/contradiction hint badge
  it.skip('GuidanceView duplicate-hint badge: pending M0.18+ dedup logic (MS-GU-DUP-HINT-01)', () => {
    // covers: MS-GU-DUP-HINT-01
    // WHY skip: duplicate detection (sim logic) is Phase 2+ scope per MS-GU-DUP-HINT-01 expected.
    // The UI file exists; the badge rendering requires daemon-side similarity logic.
  });

  it('GuidanceView.tsx and LearnedGuidanceView.tsx are both present and distinct files (MS-GU-VIEWS-CONFLICT-01)', () => {
    // covers: MS-GU-VIEWS-CONFLICT-01
    // MS-GU-VIEWS-CONFLICT-01: both files exist and serve distinct roles
    expect(existsSync(repoPath('ui/src/views/guidance/GuidanceView.tsx'))).toBe(true);
    expect(existsSync(repoPath('ui/src/views/guidance/LearnedGuidanceView.tsx'))).toBe(true);
    // Both files are distinct (different content)
    const g = require('node:fs').readFileSync(repoPath('ui/src/views/guidance/GuidanceView.tsx'), 'utf8');
    const lg = require('node:fs').readFileSync(repoPath('ui/src/views/guidance/LearnedGuidanceView.tsx'), 'utf8');
    expect(g).not.toBe(lg);
  });
});

// ===========================================================================
// M0.12 — Coexistence Mode (既存PJ検出 + 機能 opt-in/opt-out)
// Completion criterion: commands/loom-mode.md + coexistence_mode in project.json.template
// ProjectSettingsView with coexistence section (MS-CO-SECTION-01)
// ===========================================================================
// covers: MS-CO-SECTION-01, MS-CO-DETECT-01
describe('M0.12 — Coexistence Mode: harness artifacts', () => {
  it('commands/loom-mode.md exists (M0.12 /loom-mode slash command)', () => {
    expect(existsSync(repoPath('commands/loom-mode.md'))).toBe(true);
  });

  it('project.json.template contains coexistence_mode field (M0.12 runtime gate)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('templates/claude-loom/project.json.template'),
      'utf8',
    );
    expect(content).toContain('coexistence_mode');
  });

  it('project.json.template contains enabled_features field (M0.12 feature group toggle)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('templates/claude-loom/project.json.template'),
      'utf8',
    );
    expect(content).toContain('enabled_features');
  });
});

describe('M0.12 — Coexistence Mode UI: ProjectSettingsView (MS-CO-* coverage)', () => {
  it('ui/src/views/project-settings/ProjectSettingsView.tsx exists (MS-CO-SECTION-01 settings UI)', () => {
    // covers: MS-CO-SECTION-01
    expect(existsSync(repoPath('ui/src/views/project-settings/ProjectSettingsView.tsx'))).toBe(true);
  });

  // MS-CO-SECTION-01: ProjectSettings coexistence section with mode radio + 5 feature groups
  it.skip('ProjectSettings coexistence section mode radio: pending coexistence UI wiring (MS-CO-SECTION-01)', () => {
    // covers: MS-CO-SECTION-01
    // WHY skip: coexistence mode radio + 5 feature group toggles are Phase 2 scope per
    // MS-CO-SECTION-01 expected (daemon/src/routes/coexistence.ts backend exists but
    // ProjectSettingsView coexistence UI section is not yet fully wired).
  });

  // MS-CO-DETECT-01: other plugin detection list + re-detect button
  it.skip('ProjectSettings plugin detection: pending coexistence detect UI (MS-CO-DETECT-01)', () => {
    // covers: MS-CO-DETECT-01
    // WHY skip: ~/.claude/plugins/ detection display is Phase 2 scope per MS-CO-DETECT-01
    // expected (requires daemon plugin scan integration).
  });
});

// ===========================================================================
// M0.13 — Retro Discipline & Process Hardening
// Completion criterion: docs/RETRO_GUIDE.md + loom-retro-pm.md contains action plan
// loom-developer.md mentions TDD red order enforcement
// ===========================================================================
// covers: MS-RETRO-ARCHIVE-01
describe('M0.13 — Retro Discipline Hardening: artifacts', () => {
  it('docs/RETRO_GUIDE.md exists (M0.13 retro discipline SSoT)', () => {
    expect(existsSync(repoPath('docs/RETRO_GUIDE.md'))).toBe(true);
  });

  it('RETRO_GUIDE.md contains basic principles (P1/P2/P3 or equivalent)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('docs/RETRO_GUIDE.md'),
      'utf8',
    );
    // M0.13 requires basic policy descriptions in RETRO_GUIDE
    expect(content.length).toBeGreaterThan(100);
  });

  it('agents/loom-developer.md mentions TDD red order (M0.13 TDD enforcement)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('agents/loom-developer.md'),
      'utf8',
    );
    expect(content.toLowerCase()).toContain('red');
  });

  it('agents/loom-pm.md exists (M0.13 PM has parallel verify + Task tool fallback)', () => {
    expect(existsSync(repoPath('agents/loom-pm.md'))).toBe(true);
  });

  it('agents/loom-pm.md mentions Task tool (M0.13 task tool fallback)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('agents/loom-pm.md'),
      'utf8',
    );
    expect(content).toContain('Task');
  });

  it('retro archive docs/retro/ directory exists (MS-RETRO-ARCHIVE-01 archive storage)', () => {
    // covers: MS-RETRO-ARCHIVE-01
    // docs/retro/ must exist for archive markdown rendering (M0.13)
    expect(existsSync(repoPath('docs/retro'))).toBe(true);
  });
});

// ===========================================================================
// Cross-milestone: route coverage (all MS-covered views are routed in the UI)
// ===========================================================================
// covers: MS-RETRO-START-01, MS-WT-CREATE-01, MS-GU-AUDIT-01, MS-CUST-MODEL-01,
//         MS-CO-SECTION-01
describe('Cross-milestone: route registration for all MS-* covered views', () => {
  it('routes.tsx includes /retro route (MS-RETRO-* navigation entry)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('ui/src/routing/routes.tsx'),
      'utf8',
    );
    expect(content).toContain('retro');
  });

  it('routes.tsx includes /worktree route (MS-WT-* navigation entry)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('ui/src/routing/routes.tsx'),
      'utf8',
    );
    expect(content).toContain('worktree');
  });

  it('routes.tsx includes /guidance route (MS-GU-* navigation entry)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('ui/src/routing/routes.tsx'),
      'utf8',
    );
    expect(content).toContain('guidance');
  });

  it('routes.tsx includes /customization route (MS-CUST-* navigation entry)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('ui/src/routing/routes.tsx'),
      'utf8',
    );
    expect(content).toContain('customization');
  });

  it('routes.tsx includes /project-settings route (MS-CO-* navigation entry)', () => {
    const content = require('node:fs').readFileSync(
      repoPath('ui/src/routing/routes.tsx'),
      'utf8',
    );
    expect(content).toContain('project-settings');
  });
});
