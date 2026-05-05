#!/usr/bin/env bash
# tests/m0115_t5_lazy_trigger_test.sh — M0.11.5 t5: 7 slash command に lazy daemon trigger 配線 test
#
# REQ-XXX (M0.11.5): 7 slash command が loom-launch-ui.sh を invoke する instruction を持つ
#
# Coverage:
#   POSITIVE: 7 target commands (loom-{pm,spec,go,retro,status,worktree,mode}) contain loom-launch-ui.sh mention
#   NEGATIVE: loom.md and loom-stop.md do NOT contain lazy daemon trigger instruction
#   INVARIANT: frontmatter preserved (yaml not broken) for all 7 files

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMMANDS_DIR="$ROOT_DIR/commands"

failures=0
pass=0

check_pass() { echo "PASS: $1"; pass=$((pass + 1)); }
check_fail() { echo "FAIL: $1"; failures=$((failures + 1)); }

# ── Positive assertions: 7 target commands MUST mention loom-launch-ui.sh ──────

TARGET_COMMANDS=(
  "loom-pm.md"
  "loom-spec.md"
  "loom-go.md"
  "loom-retro.md"
  "loom-status.md"
  "loom-worktree.md"
  "loom-mode.md"
)

for fname in "${TARGET_COMMANDS[@]}"; do
  fpath="$COMMANDS_DIR/$fname"

  if [ ! -f "$fpath" ]; then
    check_fail "[$fname] file not found"
    continue
  fi

  # Must mention loom-launch-ui.sh somewhere in the file (trigger instruction)
  if grep -q "loom-launch-ui.sh" "$fpath"; then
    check_pass "[$fname] contains loom-launch-ui.sh reference (lazy trigger)"
  else
    check_fail "[$fname] missing loom-launch-ui.sh reference — lazy trigger not wired"
  fi

  # Frontmatter invariant: must still have valid frontmatter (>=2 '---' delimiters)
  closer_count=$(grep -c "^---$" "$fpath" 2>/dev/null || true)
  if [ "${closer_count:-0}" -ge 2 ]; then
    check_pass "[$fname] frontmatter intact (${closer_count} '---' delimiters)"
  else
    check_fail "[$fname] frontmatter broken — found only ${closer_count:-0} '---' delimiters"
  fi

  # Frontmatter invariant: description field must be present
  frontmatter=$(awk '/^---$/{n++; next} n==1' "$fpath")
  desc_field=$(echo "$frontmatter" | grep -E "^description:" | sed 's/^description:[[:space:]]*//' | tr -d '"' | tr -d "'" || true)
  if [ -n "$desc_field" ]; then
    check_pass "[$fname] description field intact"
  else
    check_fail "[$fname] description field missing — frontmatter broken"
  fi
done

# ── Negative assertions: loom.md and loom-stop.md must NOT have trigger ──────

EXCLUDED_COMMANDS=(
  "loom.md"
  "loom-stop.md"
)

for fname in "${EXCLUDED_COMMANDS[@]}"; do
  fpath="$COMMANDS_DIR/$fname"

  if [ ! -f "$fpath" ]; then
    # If file doesn't exist, skip (no violation possible)
    check_pass "[$fname] not found — no trigger contamination possible (skip)"
    continue
  fi

  # Must NOT mention loom-launch-ui.sh (these are excluded from lazy trigger)
  if grep -q "loom-launch-ui.sh" "$fpath"; then
    check_fail "[$fname] unexpectedly contains loom-launch-ui.sh — should NOT have lazy trigger"
  else
    check_pass "[$fname] correctly has no loom-launch-ui.sh reference (excluded from trigger)"
  fi
done

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "m0115_t5_lazy_trigger_test: PASS=${pass} FAIL=${failures}"

if [ "$failures" -gt 0 ]; then
  echo "m0115_t5_lazy_trigger_test FAILED with $failures violations"
  exit 1
fi

echo "m0115_t5_lazy_trigger_test passed"
