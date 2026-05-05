#!/usr/bin/env bash
# tests/m0116_t3_loom_pm_hook_test.sh — M0.11.6 t3: agents/loom-pm.md session start hook test
#
# REQ: agents/loom-pm.md に PM Auto-Spec Entry session start hook section が追加され、
#      SPEC §3.6.8.9 を SSoT として参照し、3 信頼レベル分岐・/loom-spec override 動作・
#      既存 Workflow 構造の維持を含む。
#
# Coverage:
#   POSITIVE: "session start" OR "Session Start" OR "Auto-Spec" section が存在する
#   POSITIVE: SPEC §3.6.8.9 への参照を含む
#   POSITIVE: "高信頼" 分岐記述を含む
#   POSITIVE: "中信頼" 分岐記述を含む
#   POSITIVE: "低信頼" 分岐記述を含む
#   POSITIVE: /loom-spec override 動作記述を含む
#   POSITIVE: Bash tool での context 評価 probe 記述を含む (Bash probe)
#   INVARIANT: "## Workflow" section が依然として存在する
#   INVARIANT: "Project lifecycle" section が依然として存在する
#   INVARIANT: "Spec phase" section が依然として存在する
#   INVARIANT: "Implementation phase" section が依然として存在する

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PM_AGENT="$ROOT_DIR/agents/loom-pm.md"

failures=0
pass=0

check_pass() { echo "PASS: $1"; pass=$((pass + 1)); }
check_fail() { echo "FAIL: $1"; failures=$((failures + 1)); }

# ── File existence ────────────────────────────────────────────────────────────

if [ ! -f "$PM_AGENT" ]; then
  echo "FATAL: agents/loom-pm.md not found at $PM_AGENT"
  exit 1
fi

# ── Positive assertions: session start hook section の存在と必須文言 ──────────

# 1. session start hook section が存在する
if grep -qiE "session start|auto-spec entry|PM Auto-Spec Entry" "$PM_AGENT"; then
  check_pass "loom-pm.md contains 'session start' / 'auto-spec entry' section"
else
  check_fail "loom-pm.md missing 'session start' / 'auto-spec entry' hook section"
fi

# 2. SPEC §3.6.8.9 への reference を含む
if grep -q "3\.6\.8\.9" "$PM_AGENT"; then
  check_pass "loom-pm.md contains SPEC §3.6.8.9 reference"
else
  check_fail "loom-pm.md missing SPEC §3.6.8.9 reference"
fi

# 3. 高信頼 分岐記述を含む
if grep -q "高信頼" "$PM_AGENT"; then
  check_pass "loom-pm.md contains '高信頼' (high-confidence branch)"
else
  check_fail "loom-pm.md missing '高信頼' branch description"
fi

# 4. 中信頼 分岐記述を含む
if grep -q "中信頼" "$PM_AGENT"; then
  check_pass "loom-pm.md contains '中信頼' (medium-confidence branch)"
else
  check_fail "loom-pm.md missing '中信頼' branch description"
fi

# 5. 低信頼 分岐記述を含む
if grep -q "低信頼" "$PM_AGENT"; then
  check_pass "loom-pm.md contains '低信頼' (low-confidence branch)"
else
  check_fail "loom-pm.md missing '低信頼' branch description"
fi

# 6. /loom-spec override 動作記述を含む
if grep -q "loom-spec" "$PM_AGENT" && grep -q "override" "$PM_AGENT"; then
  check_pass "loom-pm.md contains '/loom-spec' + 'override' (override path preserved)"
else
  check_fail "loom-pm.md missing '/loom-spec override' reference"
fi

# 7. Bash tool での context 評価 probe 記述を含む
if grep -qE "grep.*status.*todo|grep.*PLAN|Bash.*probe|probe.*Bash|ls.*SPEC\.md|git log.*oneline" "$PM_AGENT"; then
  check_pass "loom-pm.md contains Bash tool context probe description"
else
  check_fail "loom-pm.md missing Bash tool context probe description (grep/ls/git log)"
fi

# ── Invariant assertions: 既存 Workflow 構造の維持 ─────────────────────────────

# 8. "## Workflow" section が依然として存在する
if grep -q "^## Workflow" "$PM_AGENT"; then
  check_pass "loom-pm.md still contains '## Workflow' section"
else
  check_fail "loom-pm.md missing '## Workflow' — section was destroyed"
fi

# 9. "Project lifecycle" section が依然として存在する
if grep -q "Project lifecycle" "$PM_AGENT"; then
  check_pass "loom-pm.md still contains 'Project lifecycle' section"
else
  check_fail "loom-pm.md missing 'Project lifecycle' — section was destroyed"
fi

# 10. "Spec phase" section が依然として存在する
if grep -q "Spec phase" "$PM_AGENT"; then
  check_pass "loom-pm.md still contains 'Spec phase' section"
else
  check_fail "loom-pm.md missing 'Spec phase' — section was destroyed"
fi

# 11. "Implementation phase" section が依然として存在する
if grep -q "Implementation phase" "$PM_AGENT"; then
  check_pass "loom-pm.md still contains 'Implementation phase' section"
else
  check_fail "loom-pm.md missing 'Implementation phase' — section was destroyed"
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "m0116_t3_loom_pm_hook_test: PASS=${pass} FAIL=${failures}"

if [ "$failures" -gt 0 ]; then
  echo "m0116_t3_loom_pm_hook_test FAILED with $failures violations"
  exit 1
fi

echo "m0116_t3_loom_pm_hook_test passed"
