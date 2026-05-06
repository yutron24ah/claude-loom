#!/usr/bin/env bash
# tests/m0117_t2_spec_auto_go_test.sh — M0.11.7 t2: SPEC §3.6.8.10 PM Auto-Go Entry 章 test
#
# REQ: SPEC.md §3.6.8.10 "PM Auto-Go Entry" 章が存在し、
#      ハイブリッド検知 / 3 軸 AND 条件 / 3 信頼レベル / /loom-go override / false-positive 等の
#      核となる文言を含む。前後章 (§3.6.8.7/§3.6.8.8/§3.6.8.9 / §3.6.9) 構造を破壊しない。
#
# Coverage:
#   POSITIVE: §3.6.8.10 PM Auto-Go Entry 章タイトルが存在する
#   POSITIVE: "PM Auto-Go Entry" 文言含有
#   POSITIVE: "ハイブリッド検知" 文言含有
#   POSITIVE: "3 軸" 文言含有（検知ロジック 3 軸）
#   POSITIVE: "高信頼" 文言含有
#   POSITIVE: "中信頼" 文言含有
#   POSITIVE: "低信頼" 文言含有
#   POSITIVE: "AND 条件" 文言含有（誤爆抑制策）
#   POSITIVE: "/loom-go" 文言含有（override path 残置）
#   POSITIVE: "override" 文言含有（明示 override path として存続）
#   POSITIVE: "false-positive" 文言含有（誤爆抑制策）
#   POSITIVE: §3.6.8.9 への cross-reference 含有（sibling chapter 言及）
#   INVARIANT: §3.6.8.7 構造維持
#   INVARIANT: §3.6.8.8 構造維持
#   INVARIANT: §3.6.8.9 構造維持
#   INVARIANT: §3.6.9 後章が依然として存在する
#   ORDER: §3.6.8.9 → §3.6.8.10 の line 順序
#   ORDER: §3.6.8.10 が §3.6.9 より前

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SPEC="$ROOT_DIR/SPEC.md"

failures=0
pass=0

check_pass() { echo "PASS: $1"; pass=$((pass + 1)); }
check_fail() { echo "FAIL: $1"; failures=$((failures + 1)); }

# ── File existence ────────────────────────────────────────────────────────────

if [ ! -f "$SPEC" ]; then
  echo "FATAL: SPEC.md not found at $SPEC"
  exit 1
fi

# ── Positive assertions: §3.6.8.10 章の存在と必須文言 ────────────────────────

# 1. §3.6.8.10 章タイトル存在
if grep -q "3\.6\.8\.10" "$SPEC"; then
  check_pass "SPEC.md contains §3.6.8.10 section number"
else
  check_fail "SPEC.md missing §3.6.8.10 section number"
fi

# 2. PM Auto-Go Entry という章タイトル
if grep -q "PM Auto-Go Entry" "$SPEC"; then
  check_pass "SPEC.md contains 'PM Auto-Go Entry' title"
else
  check_fail "SPEC.md missing 'PM Auto-Go Entry' title"
fi

# 3. ハイブリッド検知 文言
if grep -q "ハイブリッド検知" "$SPEC"; then
  check_pass "SPEC.md contains 'ハイブリッド検知' (hybrid detection)"
else
  check_fail "SPEC.md missing 'ハイブリッド検知'"
fi

# 4. 3 軸 文言（検知ロジック 3 軸）
if grep -q "3 軸" "$SPEC"; then
  check_pass "SPEC.md contains '3 軸' (3-axis detection logic)"
else
  check_fail "SPEC.md missing '3 軸'"
fi

# 5. 高信頼 文言
if grep -q "高信頼" "$SPEC"; then
  check_pass "SPEC.md contains '高信頼' (high confidence level)"
else
  check_fail "SPEC.md missing '高信頼'"
fi

# 6. 中信頼 文言
if grep -q "中信頼" "$SPEC"; then
  check_pass "SPEC.md contains '中信頼' (medium confidence level)"
else
  check_fail "SPEC.md missing '中信頼'"
fi

# 7. 低信頼 文言
if grep -q "低信頼" "$SPEC"; then
  check_pass "SPEC.md contains '低信頼' (low confidence level)"
else
  check_fail "SPEC.md missing '低信頼'"
fi

# 8. AND 条件 文言（誤爆抑制策）
if grep -q "AND 条件" "$SPEC"; then
  check_pass "SPEC.md contains 'AND 条件' (AND condition for false-positive suppression)"
else
  check_fail "SPEC.md missing 'AND 条件'"
fi

# 9. /loom-go 文言（override path 残置）
if grep -q "loom-go" "$SPEC"; then
  check_pass "SPEC.md contains '/loom-go' reference (override path preserved)"
else
  check_fail "SPEC.md missing '/loom-go' reference"
fi

# 10. override 文言（明示 override path として存続）
if grep -q "override" "$SPEC"; then
  check_pass "SPEC.md contains 'override' (explicit override path documented)"
else
  check_fail "SPEC.md missing 'override'"
fi

# 11. false-positive 文言（誤爆抑制策）
if grep -q "false.positive" "$SPEC"; then
  check_pass "SPEC.md contains 'false-positive' (false-positive suppression)"
else
  check_fail "SPEC.md missing 'false-positive'"
fi

# 12. §3.6.8.9 への cross-reference（sibling chapter 言及）
# §3.6.8.10 section 内で §3.6.8.9 への参照が含まれるか確認
# §3.6.8.10 開始行以降に 3.6.8.9 への言及があるか
line_368_10=$(grep -n "3\.6\.8\.10" "$SPEC" | head -1 | cut -d: -f1 || echo "0")
line_369=$(grep -n "### 3\.6\.9" "$SPEC" | head -1 | cut -d: -f1 || echo "9999")

if [ "${line_368_10:-0}" -gt 0 ] && [ "${line_369:-9999}" -gt "${line_368_10:-0}" ]; then
  # §3.6.8.10 section 内 (line_368_10 から line_369 の手前まで) に 3.6.8.9 への参照があるか
  section_content=$(awk "NR>=${line_368_10} && NR<${line_369}" "$SPEC")
  if echo "$section_content" | grep -q "3\.6\.8\.9"; then
    check_pass "§3.6.8.10 section contains cross-reference to §3.6.8.9 (sibling chapter)"
  else
    check_fail "§3.6.8.10 section missing cross-reference to §3.6.8.9"
  fi
else
  check_fail "§3.6.8.10 section not found or position invalid for cross-reference check"
fi

# ── Invariant assertions: 前後章構造の維持 ────────────────────────────────────

# 13. §3.6.8.7 前章が依然として存在する
if grep -q "3\.6\.8\.7" "$SPEC"; then
  check_pass "SPEC.md still contains §3.6.8.7 (predecessor section intact)"
else
  check_fail "SPEC.md missing §3.6.8.7 — predecessor section was destroyed"
fi

# 14. §3.6.8.8 前章が依然として存在する
if grep -q "3\.6\.8\.8" "$SPEC"; then
  check_pass "SPEC.md still contains §3.6.8.8 (predecessor section intact)"
else
  check_fail "SPEC.md missing §3.6.8.8 — predecessor section was destroyed"
fi

# 15. §3.6.8.9 前章が依然として存在する
if grep -q "3\.6\.8\.9" "$SPEC"; then
  check_pass "SPEC.md still contains §3.6.8.9 (predecessor section intact)"
else
  check_fail "SPEC.md missing §3.6.8.9 — predecessor section was destroyed"
fi

# 16. §3.6.9 後章が依然として存在する
if grep -q "### 3\.6\.9" "$SPEC"; then
  check_pass "SPEC.md still contains §3.6.9 (successor section intact)"
else
  check_fail "SPEC.md missing §3.6.9 — successor section was destroyed"
fi

# ── Order assertions: section 位置確認 ────────────────────────────────────────

# 17. §3.6.8.9 → §3.6.8.10 の line 順序
line_3689=$(grep -n "3\.6\.8\.9" "$SPEC" | head -1 | cut -d: -f1 || echo "0")
line_36810=$(grep -n "3\.6\.8\.10" "$SPEC" | head -1 | cut -d: -f1 || echo "0")

if [ "${line_36810:-0}" -gt "${line_3689:-0}" ]; then
  check_pass "§3.6.8.10 appears after §3.6.8.9 (line ${line_3689} → line ${line_36810})"
else
  check_fail "§3.6.8.10 position incorrect — §3.6.8.9:${line_3689} §3.6.8.10:${line_36810}"
fi

# 18. §3.6.8.10 が §3.6.9 より前
line_369=$(grep -n "### 3\.6\.9" "$SPEC" | head -1 | cut -d: -f1 || echo "9999")

if [ "${line_36810:-0}" -lt "${line_369:-9999}" ] && [ "${line_36810:-0}" -gt 0 ]; then
  check_pass "§3.6.8.10 appears before §3.6.9 (line ${line_36810} < line ${line_369})"
else
  check_fail "§3.6.8.10 position incorrect — §3.6.8.10:${line_36810} §3.6.9:${line_369}"
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "m0117_t2_spec_auto_go_test: PASS=${pass} FAIL=${failures}"

if [ "$failures" -gt 0 ]; then
  echo "m0117_t2_spec_auto_go_test FAILED with $failures violations"
  exit 1
fi

echo "m0117_t2_spec_auto_go_test passed"
