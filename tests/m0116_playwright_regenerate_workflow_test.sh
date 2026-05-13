#!/usr/bin/env bash
# tests/m0116_playwright_regenerate_workflow_test.sh
# M0.16 Phase 2 t3 — Playwright Linux baseline auto-gen workflow tests
#
# REQ-085 (Phase 4 t9 append): validates that .github/workflows/playwright-regenerate.yml
# exists with the correct security-hardened structure for CI Linux snapshot regeneration.
#
# WHY these checks:
# - workflow_dispatch trigger is required (manual invoke only, not push/PR)
# - permissions must be minimal (contents:write + pull-requests:write only)
# - GITHUB_TOKEN usage (no PAT) is a security invariant
# - auto-PR creation with branch naming must not embed user inputs directly
# - --update-snapshots flag must be present in the playwright invocation
# - pnpm/action-setup@v4 (not v3) must be used (ci.yml uses v3, this file standardizes on v4)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKFLOW_FILE="$ROOT_DIR/.github/workflows/playwright-regenerate.yml"

pass=0
fail=0

check() {
  local description="$1"
  local result="$2"
  if [ "$result" = "0" ]; then
    echo "PASS: $description"
    pass=$((pass + 1))
  else
    echo "FAIL: $description"
    fail=$((fail + 1))
  fi
}

# ── 1. File existence ─────────────────────────────────────────────────────────
if [ -f "$WORKFLOW_FILE" ]; then
  check "workflow file exists" 0
else
  check "workflow file exists" 1
  echo "FATAL: $WORKFLOW_FILE not found — cannot run remaining checks"
  echo "Passed: $pass  Failed: $fail"
  exit 1
fi

# ── 2. workflow_dispatch trigger present ─────────────────────────────────────
if grep -q "workflow_dispatch:" "$WORKFLOW_FILE"; then
  check "workflow_dispatch trigger present" 0
else
  check "workflow_dispatch trigger present" 1
fi

# ── 3. No push/pull_request trigger (manual-only, security isolation) ────────
# WHY: regenerate workflow must only run when explicitly invoked,
# not on every push which could flood PRs.
if ! grep -qE "^\s+(push|pull_request):" "$WORKFLOW_FILE"; then
  check "no automatic push/pull_request trigger (manual-only)" 0
else
  check "no automatic push/pull_request trigger (manual-only)" 1
fi

# ── 4. Minimal permissions block (contents:write + pull-requests:write only) ─
# WHY: SPEC §3.6.15.1 security axis — least privilege GitHub Actions
if grep -q "contents: write" "$WORKFLOW_FILE"; then
  check "permissions.contents: write present" 0
else
  check "permissions.contents: write present" 1
fi

if grep -q "pull-requests: write" "$WORKFLOW_FILE"; then
  check "permissions.pull-requests: write present" 0
else
  check "permissions.pull-requests: write present" 1
fi

# ── 5. No overly broad permissions (no 'actions: write', no 'packages: write') ─
if ! grep -qE "actions:\s+write|packages:\s+write|security-events:\s+write" "$WORKFLOW_FILE"; then
  check "no overbroad permissions (actions/packages/security-events write absent)" 0
else
  check "no overbroad permissions (actions/packages/security-events write absent)" 1
fi

# ── 6. GITHUB_TOKEN usage (not a PAT secret) ─────────────────────────────────
# WHY: PAT would have org-wide scope; GITHUB_TOKEN is repo-scoped
if grep -q "secrets.GITHUB_TOKEN" "$WORKFLOW_FILE"; then
  check "GITHUB_TOKEN (not PAT) used" 0
else
  check "GITHUB_TOKEN (not PAT) used" 1
fi

if grep -qE "secrets\.[A-Z_]+_TOKEN" "$WORKFLOW_FILE" && ! grep -q "secrets.GITHUB_TOKEN" "$WORKFLOW_FILE"; then
  check "no PAT-style secret used" 1
else
  check "no PAT-style secret used (only GITHUB_TOKEN allowed)" 0
fi

# ── 7. --update-snapshots flag present ───────────────────────────────────────
if grep -q "\-\-update-snapshots" "$WORKFLOW_FILE"; then
  check "--update-snapshots flag present in playwright invocation" 0
else
  check "--update-snapshots flag present in playwright invocation" 1
fi

# ── 8. Branch naming uses date suffix, not raw user input ────────────────────
# WHY: injection prevention — branch name must use $(date ...) suffix only,
# user input (inputs.target) must NOT appear directly in branch name
if grep -q "BRANCH=" "$WORKFLOW_FILE" && grep -q '$(date' "$WORKFLOW_FILE"; then
  check "branch name uses date suffix for uniqueness" 0
else
  check "branch name uses date suffix for uniqueness" 1
fi

# ── 9. inputs.target NOT directly used in branch name ────────────────────────
# WHY: shell injection prevention — ${{ inputs.target }} can contain special chars
# that could break branch naming or inject shell commands
# Pattern: detect if BRANCH= line contains inputs.target interpolation
if ! grep -E "BRANCH=.*inputs\.target" "$WORKFLOW_FILE" | grep -qv '#'; then
  check "inputs.target not embedded in branch name (injection prevention)" 0
else
  check "inputs.target not embedded in branch name (injection prevention)" 1
fi

# ── 10. ubuntu-latest runner ────────────────────────────────────────────────
if grep -q "ubuntu-latest" "$WORKFLOW_FILE"; then
  check "runs on ubuntu-latest (Linux baseline)" 0
else
  check "runs on ubuntu-latest (Linux baseline)" 1
fi

# ── 11. gh pr create for auto-PR ────────────────────────────────────────────
if grep -q "gh pr create" "$WORKFLOW_FILE"; then
  check "gh pr create invoked for auto-PR" 0
else
  check "gh pr create invoked for auto-PR" 1
fi

# ── 12. pnpm/action-setup@v4 (updated from ci.yml v3) ───────────────────────
if grep -q "pnpm/action-setup@v4" "$WORKFLOW_FILE"; then
  check "pnpm/action-setup@v4 used" 0
else
  check "pnpm/action-setup@v4 used" 1
fi

# ── 13. Change detection before PR creation ──────────────────────────────────
# WHY: avoid creating empty PRs when no baselines changed
if grep -q "git diff" "$WORKFLOW_FILE" && grep -q "has-changes" "$WORKFLOW_FILE"; then
  check "change detection before PR creation" 0
else
  check "change detection before PR creation" 1
fi

# ── 14. actions/checkout@v4 with fetch-depth: 0 ─────────────────────────────
if grep -q "actions/checkout@v4" "$WORKFLOW_FILE" && grep -q "fetch-depth: 0" "$WORKFLOW_FILE"; then
  check "checkout@v4 with full history (fetch-depth: 0)" 0
else
  check "checkout@v4 with full history (fetch-depth: 0)" 1
fi

# ── 15. git config uses bot identity (not user email) ───────────────────────
# WHY: commits by github-actions[bot] are clearly attributed, not disguised as user commits
if grep -q "github-actions\[bot\]" "$WORKFLOW_FILE"; then
  check "git config uses github-actions[bot] identity" 0
else
  check "git config uses github-actions[bot] identity" 1
fi

# ── Result ────────────────────────────────────────────────────────────────────
echo ""
echo "Passed: $pass  Failed: $fail"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
