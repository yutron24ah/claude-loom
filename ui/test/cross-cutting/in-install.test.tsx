/**
 * in-install.test.tsx — Install / Uninstall verification (Section B, t5b)
 *
 * WHY: qa-suite.js "install" section (23. INSTALL / UNINSTALL) audits that
 * install.sh correctly bootstraps ~/.claude/ symlinks for agents/, commands/,
 * skills/, and hooks/, and that uninstall.sh correctly removes them with
 * state-preservation semantics.
 *
 * Audit approach:
 *   - We do NOT run install.sh in tests (side-effects to user's ~/.claude/).
 *   - Instead: (a) verify repo source artifacts exist, (b) check install.sh
 *     source code for the correct patterns, (c) check already-installed state
 *     if CLAUDE_HOME is set and installation exists, (d) graceful skip with
 *     documented reason for cases that require physical fresh sandbox (N/A).
 *
 * N/A note:
 *   IN-FRESH-01 is in configs/qa-na-allowlist.txt because a fresh install
 *   requires a clean ~/.claude/ that cannot be guaranteed in standard CI.
 *   This file audits the structural invariants that would hold after a fresh
 *   install instead.
 *
 * PH-* philosophy cases: not here — see ph-philosophy.test.tsx.
 *
 * // covers: IN-CLAUDE-HOME-01, IN-NO-BUILD-01, IN-RE-INSTALL-01,
 * //         IN-UN-CONFIRM-01, IN-UN-PURGE-01, IN-UN-PRESERVE-01
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/** Resolve relative to repo root (3 dirs up from ui/test/cross-cutting/) */
function repoPath(...segments: string[]): string {
  return resolve(__dirname, '../../../', ...segments);
}

/** Read install.sh or uninstall.sh source content for static analysis */
function readScript(name: 'install.sh' | 'uninstall.sh'): string {
  return readFileSync(repoPath(name), 'utf-8');
}

// ===========================================================================
// IN-CLAUDE-HOME-01: CLAUDE_HOME override support
// Verifies that install.sh respects a custom CLAUDE_HOME env variable.
// ===========================================================================
// covers: IN-CLAUDE-HOME-01
describe('IN-CLAUDE-HOME-01: CLAUDE_HOME override', () => {
  it('install.sh defines CLAUDE_HOME variable with override support', () => {
    const src = readScript('install.sh');
    // Must have: CLAUDE_HOME="${CLAUDE_HOME:-...}"
    expect(src).toMatch(/CLAUDE_HOME="\${CLAUDE_HOME:-/);
  });

  it('install.sh uses CLAUDE_HOME as base for all target dirs', () => {
    const src = readScript('install.sh');
    // Target dirs must be under $CLAUDE_HOME
    expect(src).toMatch(/"\$CLAUDE_HOME\/agents"/);
    expect(src).toMatch(/"\$CLAUDE_HOME\/commands"/);
    expect(src).toMatch(/"\$CLAUDE_HOME\/skills"/);
  });

  it('CLAUDE_HOME guard: refuses to install when neither HOME nor CLAUDE_HOME is set', () => {
    const src = readScript('install.sh');
    // Safety check must exist
    expect(src).toMatch(/ERROR.*neither.*CLAUDE_HOME.*HOME.*is set/);
  });
});

// ===========================================================================
// IN-NO-BUILD-01: LOOM_NO_BUILD=1 skips pnpm install/build
// ===========================================================================
// covers: IN-NO-BUILD-01
describe('IN-NO-BUILD-01: LOOM_NO_BUILD=1 build skip', () => {
  it('install.sh checks LOOM_NO_BUILD env variable', () => {
    const src = readScript('install.sh');
    expect(src).toMatch(/LOOM_NO_BUILD/);
  });

  it('install.sh skips auto-build when LOOM_NO_BUILD=1', () => {
    const src = readScript('install.sh');
    // Pattern: if [ "${LOOM_NO_BUILD:-0}" = "1" ]; then echo "skipped"
    expect(src).toMatch(/LOOM_NO_BUILD.*=.*1/);
    expect(src).toMatch(/build skipped/i);
  });

  it('install.sh auto-build section exists (for default case without LOOM_NO_BUILD)', () => {
    const src = readScript('install.sh');
    // Auto-build section header
    expect(src).toMatch(/Auto-build daemon \+ UI dist/i);
    expect(src).toMatch(/pnpm.*build/);
  });
});

// ===========================================================================
// IN-RE-INSTALL-01: Idempotent re-install
// install.sh must replace existing symlinks without error
// ===========================================================================
// covers: IN-RE-INSTALL-01
describe('IN-RE-INSTALL-01: idempotent re-install', () => {
  it('install.sh handles existing symlinks by replacing them (not erroring)', () => {
    const src = readScript('install.sh');
    // Pattern: if [ -L "$dest" ]; then rm "$dest" fi; then ln -s
    expect(src).toMatch(/if\s+\[\s+-L\s+"\$dest"\s+\]/);
    expect(src).toMatch(/rm\s+"\$dest"/);
  });

  it('install.sh errors on existing regular file (not symlink) to prevent accidental overwrite', () => {
    const src = readScript('install.sh');
    // Pattern: exists as a regular file (not a symlink)
    expect(src).toMatch(/exists as a regular file \(not a symlink\)/);
  });

  it('install.sh install_links function handles both file and dir symlinks idempotently', () => {
    const src = readScript('install.sh');
    expect(src).toMatch(/install_links\s+/);
    expect(src).toMatch(/install_dir_links\s+/);
  });
});

// ===========================================================================
// IN-UN-CONFIRM-01: uninstall.sh shows confirm prompt + yes → symlink removal,
//                   .claude-loom/ preserved
// ===========================================================================
// covers: IN-UN-CONFIRM-01
describe('IN-UN-CONFIRM-01: uninstall confirm prompt + state preservation', () => {
  it('uninstall.sh has --yes flag to skip confirmation', () => {
    const src = readScript('uninstall.sh');
    expect(src).toMatch(/--yes/);
    expect(src).toMatch(/OPT_YES/);
  });

  it('uninstall.sh removes agents, commands, skills symlinks', () => {
    const src = readScript('uninstall.sh');
    expect(src).toMatch(/remove_file_symlinks.*agents/);
    expect(src).toMatch(/remove_file_symlinks.*commands/);
    expect(src).toMatch(/remove_dir_symlinks.*skills/);
  });

  it('uninstall.sh preserves .claude-loom/ by default (no --purge-state)', () => {
    const src = readScript('uninstall.sh');
    // Default path: state is preserved unless --purge-state
    expect(src).toMatch(/\.claude-loom\/.*は保持/);
  });
});

// ===========================================================================
// IN-UN-PURGE-01: uninstall.sh --purge-state removes .claude-loom/
// ===========================================================================
// covers: IN-UN-PURGE-01
describe('IN-UN-PURGE-01: --purge-state removes local state', () => {
  it('uninstall.sh has --purge-state flag', () => {
    const src = readScript('uninstall.sh');
    expect(src).toMatch(/--purge-state/);
    expect(src).toMatch(/OPT_PURGE_STATE/);
  });

  it('uninstall.sh removes local state dir when OPT_PURGE_STATE is true', () => {
    const src = readScript('uninstall.sh');
    // Pattern: if "$OPT_PURGE_STATE" then rm -rf "$LOCAL_STATE_DIR"
    expect(src).toMatch(/OPT_PURGE_STATE/);
    expect(src).toMatch(/rm -rf.*LOCAL_STATE_DIR/);
  });
});

// ===========================================================================
// IN-UN-PRESERVE-01: default uninstall preserves retro/personality settings
//                    so that re-install restores them
// ===========================================================================
// covers: IN-UN-PRESERVE-01
describe('IN-UN-PRESERVE-01: state preserved across uninstall/re-install cycle', () => {
  it('uninstall.sh leaves .claude-loom/ intact without --purge-state (state preserved)', () => {
    const src = readScript('uninstall.sh');
    // uninstall.sh final message: "再インストール後も設定を引き継げます"
    expect(src).toMatch(/再インストール後も設定を引き継げます/);
  });

  it('project-prefs.json template source artifact exists in repo (user state template)', () => {
    // WHY templates/ not .claude-loom/: the runtime .claude-loom/project-prefs.json
    // is gitignored user-local state (absent in fresh CI checkout). The committed
    // repo artifact is the template that install.sh copies to .claude-loom/ at init.
    // (Original assertion checked .claude-loom/project-prefs.json which only passed
    // locally due to working-tree state — Local-PASS / CI-FAIL masking.)
    expect(existsSync(repoPath('templates/project-prefs.json.template'))).toBe(true);
  });

  it('install.sh creates LOOM_HOME directory for user state', () => {
    const src = readScript('install.sh');
    // LOOM_HOME is where user state (project-prefs, retro) goes
    expect(src).toMatch(/LOOM_HOME="\${LOOM_HOME:-/);
    expect(src).toMatch(/mkdir -p "\$LOOM_HOME"/);
  });
});

// ===========================================================================
// Additional source-artifact checks (cross-cutting invariants)
// ===========================================================================

describe('install.sh source artifacts: agents, commands, skills, hooks present', () => {
  it('agents/loom-developer.md exists (agent to be symlinked)', () => {
    expect(existsSync(repoPath('agents/loom-developer.md'))).toBe(true);
  });

  it('agents/loom-pm.md exists', () => {
    expect(existsSync(repoPath('agents/loom-pm.md'))).toBe(true);
  });

  it('commands/loom-pm.md exists (command to be symlinked)', () => {
    expect(existsSync(repoPath('commands/loom-pm.md'))).toBe(true);
  });

  it('skills/loom-review/ directory exists (skill dir to be symlinked)', () => {
    expect(existsSync(repoPath('skills/loom-review'))).toBe(true);
  });

  it('skills/loom-tdd-cycle/SKILL.md exists', () => {
    expect(existsSync(repoPath('skills/loom-tdd-cycle/SKILL.md'))).toBe(true);
  });

  it('hooks/session_start.sh exists (hook to be symlinked)', () => {
    expect(existsSync(repoPath('hooks/session_start.sh'))).toBe(true);
  });

  it('hooks/pre_tool.sh exists', () => {
    expect(existsSync(repoPath('hooks/pre_tool.sh'))).toBe(true);
  });

  it('hooks/post_tool.sh exists', () => {
    expect(existsSync(repoPath('hooks/post_tool.sh'))).toBe(true);
  });

  it('install.sh itself exists', () => {
    expect(existsSync(repoPath('install.sh'))).toBe(true);
  });

  it('uninstall.sh itself exists', () => {
    expect(existsSync(repoPath('uninstall.sh'))).toBe(true);
  });
});
