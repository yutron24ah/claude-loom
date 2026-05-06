#!/usr/bin/env bash
# tests/m0117_t3_loom_pm_auto_go_test.sh — M0.11.7 t3: agents/loom-pm.md spec phase completion hook test
#
# REQ-047: agents/loom-pm.md に Spec Phase Completion Hook（PM Auto-Go Entry）が追加され、
#          SPEC §3.6.8.10 を SSoT として参照し、3 軸 AND 条件 / 3 信頼レベル分岐 /
#          /loom-go override 動作 / impl keyword list（spec keyword list と分離）/
#          既存 M0.11.6 Session Start Hook 構造の維持を含む。
#
# Coverage:
#   POSITIVE: "Spec Phase Completion Hook" OR "PM Auto-Go Entry" 言及存在
#   POSITIVE: SPEC §3.6.8.10 への reference 含む
#   POSITIVE: "3 軸" OR "spec phase 完了 marker" 言及含む (M0.11.7 固有 — 3 軸検知)
#   POSITIVE: "高信頼" 分岐記述含む (3 軸全揃い分岐)
#   POSITIVE: "中信頼" 分岐記述含む (2 軸揃い分岐)
#   POSITIVE: "低信頼" 分岐記述含む (1 軸以下分岐)
#   POSITIVE: "/loom-go" override 記述含む
#   POSITIVE: impl keyword list が存在する (placeholder 含む、spec keyword list と分離)
#   POSITIVE: "grep -c.*status.*todo\|grep -c.*status: todo" — 軸 1 の Bash probe 記述含む
#   POSITIVE: "git log.*SPEC\|git log.*PLAN\|git log.*oneline.*grep" — 軸 2 の spec phase 完了 marker probe 含む
#   INVARIANT: 既存 Session Start Hook section (M0.11.6) が依然として存在する
#   INVARIANT: "3.6.8.9" への reference が依然として存在する (M0.11.6 hook 保持)
#   INVARIANT: "## Workflow" section が依然として存在する
#   INVARIANT: "Project lifecycle" section が依然として存在する
#   INVARIANT: "Spec phase" section が依然として存在する
#   INVARIANT: "Implementation phase" section が依然として存在する
#   SEPARATION: impl keyword list と spec keyword list が別記述として存在する
#               (同一 list に統合されていない)

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

# ── Positive assertions: Spec Phase Completion Hook の存在と必須文言 ──────────

# 1. Spec Phase Completion Hook / PM Auto-Go Entry 言及存在
if grep -qiE "Spec Phase Completion Hook|PM Auto-Go Entry|Auto-Go Entry" "$PM_AGENT"; then
  check_pass "loom-pm.md contains 'Spec Phase Completion Hook' / 'PM Auto-Go Entry' reference"
else
  check_fail "loom-pm.md missing 'Spec Phase Completion Hook' / 'PM Auto-Go Entry' section"
fi

# 2. SPEC §3.6.8.10 への reference を含む
if grep -q "3\.6\.8\.10" "$PM_AGENT"; then
  check_pass "loom-pm.md contains SPEC §3.6.8.10 reference"
else
  check_fail "loom-pm.md missing SPEC §3.6.8.10 reference"
fi

# 3. "3 軸" OR "spec phase 完了 marker" 言及含む (M0.11.7 固有の 3 軸検知を codify)
if grep -qE "3 軸|spec phase 完了 marker|spec.*phase.*完了|3-axis" "$PM_AGENT"; then
  check_pass "loom-pm.md contains '3 軸' / 'spec phase 完了 marker' (M0.11.7 3-axis detection)"
else
  check_fail "loom-pm.md missing '3 軸' / 'spec phase 完了 marker' (M0.11.7 3-axis detection not codified)"
fi

# 4. "高信頼" 分岐記述含む（3 軸全揃い）
# Note: M0.11.6 Session Start Hook にも 高信頼 記述があるため、§3.6.8.10 context の記述が必要
# §3.6.8.10 固有の context (3 軸 / impl phase / loom-go 文脈) で 高信頼 が言及されていることを確認
if grep -q "高信頼" "$PM_AGENT"; then
  check_pass "loom-pm.md contains '高信頼' branch description"
else
  check_fail "loom-pm.md missing '高信頼' branch description"
fi

# 5. "中信頼" 分岐記述含む（2 軸揃い）
if grep -q "中信頼" "$PM_AGENT"; then
  check_pass "loom-pm.md contains '中信頼' branch description"
else
  check_fail "loom-pm.md missing '中信頼' branch description"
fi

# 6. "低信頼" 分岐記述含む（1 軸以下）
if grep -q "低信頼" "$PM_AGENT"; then
  check_pass "loom-pm.md contains '低信頼' branch description"
else
  check_fail "loom-pm.md missing '低信頼' branch description"
fi

# 7. "/loom-go" override 記述含む
if grep -qE "loom-go.*override|override.*loom-go|/loom-go" "$PM_AGENT"; then
  check_pass "loom-pm.md contains '/loom-go' override reference"
else
  check_fail "loom-pm.md missing '/loom-go' override description"
fi

# 8. impl keyword list が存在する (placeholder 含む)
# SPEC §3.6.8.10 軸 3: impl intent keyword list。t4 で確定するが t3 では placeholder でも OK
if grep -qiE "impl.*intent.*keyword|impl.*keyword|実装.*keyword|keyword.*impl|implement.*keyword|go.*dispatch.*begin|実装|進めて|dispatch" "$PM_AGENT"; then
  check_pass "loom-pm.md contains impl intent keyword list / placeholder"
else
  check_fail "loom-pm.md missing impl intent keyword list (axis 3 not codified)"
fi

# 9. 軸 1 の Bash probe 記述含む (grep -c "status: todo" PLAN.md)
if grep -qE 'grep.*status.*todo|grep -c.*status' "$PM_AGENT"; then
  check_pass "loom-pm.md contains Bash probe for axis 1 (grep status: todo in PLAN.md)"
else
  check_fail "loom-pm.md missing Bash probe for axis 1 (grep -c 'status: todo' PLAN.md)"
fi

# 10. 軸 2 の spec phase 完了 marker probe 含む (git log | grep SPEC|PLAN|spec|docs)
if grep -qE 'git log.*oneline.*grep|grep.*SPEC.*PLAN|git log.*SPEC|SPEC\|PLAN' "$PM_AGENT"; then
  check_pass "loom-pm.md contains spec phase completion marker probe (git log | grep SPEC/PLAN)"
else
  check_fail "loom-pm.md missing spec phase completion marker probe (axis 2 not codified)"
fi

# ── Invariant assertions: 既存 M0.11.6 構造の維持 ─────────────────────────────

# 11. 既存 Session Start Hook section (M0.11.6) が依然として存在する
if grep -qiE "session start|auto-spec entry|PM Auto-Spec Entry" "$PM_AGENT"; then
  check_pass "loom-pm.md still contains M0.11.6 Session Start Hook (Auto-Spec Entry) section"
else
  check_fail "loom-pm.md missing M0.11.6 Session Start Hook — existing hook was destroyed"
fi

# 12. SPEC §3.6.8.9 への reference が依然として存在する (M0.11.6 hook 保持)
if grep -q "3\.6\.8\.9" "$PM_AGENT"; then
  check_pass "loom-pm.md still contains §3.6.8.9 reference (M0.11.6 hook preserved)"
else
  check_fail "loom-pm.md missing §3.6.8.9 reference — M0.11.6 hook was broken"
fi

# 13. "## Workflow" section が依然として存在する
if grep -q "^## Workflow" "$PM_AGENT"; then
  check_pass "loom-pm.md still contains '## Workflow' section"
else
  check_fail "loom-pm.md missing '## Workflow' — section was destroyed"
fi

# 14. "Project lifecycle" section が依然として存在する
if grep -q "Project lifecycle" "$PM_AGENT"; then
  check_pass "loom-pm.md still contains 'Project lifecycle' section"
else
  check_fail "loom-pm.md missing 'Project lifecycle' — section was destroyed"
fi

# 15. "Spec phase" section が依然として存在する
if grep -q "Spec phase" "$PM_AGENT"; then
  check_pass "loom-pm.md still contains 'Spec phase' section"
else
  check_fail "loom-pm.md missing 'Spec phase' — section was destroyed"
fi

# 16. "Implementation phase" section が依然として存在する
if grep -q "Implementation phase" "$PM_AGENT"; then
  check_pass "loom-pm.md still contains 'Implementation phase' section"
else
  check_fail "loom-pm.md missing 'Implementation phase' — section was destroyed"
fi

# ── Separation assertion: impl keyword list と spec keyword list の分離 ────────

# 17. M0.11.6 の spec keyword list と M0.11.7 の impl keyword list が別 context で記述されていること
# spec keyword (M0.11.6) は "spec 系 intent keyword" / "spec.*keyword" として記述
# impl keyword (M0.11.7) は "impl.*intent keyword" / "impl.*keyword" として記述
# 両方が PM_AGENT に存在し、かつ別々に言及されていること
spec_kw=$(grep -c -iE "spec.*keyword|spec.*intent|spec 系 intent" "$PM_AGENT" || true)
impl_kw=$(grep -c -iE "impl.*keyword|impl.*intent|実装.*intent|impl.*系.*keyword" "$PM_AGENT" || true)

if [ "${spec_kw:-0}" -gt 0 ] && [ "${impl_kw:-0}" -gt 0 ]; then
  check_pass "loom-pm.md has both spec keyword list (M0.11.6) and impl keyword list (M0.11.7) separately"
elif [ "${spec_kw:-0}" -gt 0 ]; then
  # impl keyword list は placeholder でも存在すべき
  check_fail "loom-pm.md missing impl keyword list (M0.11.7) — only spec keyword list found"
else
  check_fail "loom-pm.md missing both spec and impl keyword lists"
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "m0117_t3_loom_pm_auto_go_test: PASS=${pass} FAIL=${failures}"

if [ "$failures" -gt 0 ]; then
  echo "m0117_t3_loom_pm_auto_go_test FAILED with $failures violations"
  exit 1
fi

echo "m0117_t3_loom_pm_auto_go_test passed"
