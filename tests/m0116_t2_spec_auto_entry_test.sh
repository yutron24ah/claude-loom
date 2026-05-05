#!/usr/bin/env bash
# tests/m0116_t2_spec_auto_entry_test.sh — M0.11.6 t2: SPEC §3.6.8.9 PM Auto-Spec Entry 章 test
#
# REQ: SPEC.md §3.6.8.9 "PM Auto-Spec Entry" 章が存在し、
#      ハイブリッド検知 / 3 信頼レベル / AND 条件 / /loom-spec override / false-positive 等の
#      核となる文言を含む。前後章 (§3.6.8.8 / §3.6.9) の構造を破壊しない。
#
# Coverage:
#   POSITIVE: §3.6.8.9 PM Auto-Spec Entry 章タイトルが存在する
#   POSITIVE: ハイブリッド検知 文言含有
#   POSITIVE: 3 信頼レベル（高信頼・中信頼・低信頼）文言含有
#   POSITIVE: AND 条件 文言含有（誤爆抑制策）
#   POSITIVE: /loom-spec が override/re-entry path として存続する記述含有
#   POSITIVE: false-positive 文言含有（誤爆抑制策）
#   POSITIVE: degraded mode / Bash tool での代替評価可能な記述含有
#   INVARIANT: §3.6.8.8 前章が依然として存在する
#   INVARIANT: §3.6.9 後章が依然として存在する
#   INVARIANT: §3.6.8.9 の位置が §3.6.8.8 より後かつ §3.6.9 より前

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

# ── Positive assertions: §3.6.8.9 章の存在と必須文言 ─────────────────────────

# 1. §3.6.8.9 章タイトル存在
if grep -q "3\.6\.8\.9" "$SPEC"; then
  check_pass "SPEC.md contains §3.6.8.9 section number"
else
  check_fail "SPEC.md missing §3.6.8.9 section number"
fi

# 2. PM Auto-Spec Entry という章タイトル
if grep -q "PM Auto-Spec Entry" "$SPEC"; then
  check_pass "SPEC.md contains 'PM Auto-Spec Entry' title"
else
  check_fail "SPEC.md missing 'PM Auto-Spec Entry' title"
fi

# 3. ハイブリッド検知 文言
if grep -q "ハイブリッド検知" "$SPEC"; then
  check_pass "SPEC.md contains 'ハイブリッド検知' (hybrid detection)"
else
  check_fail "SPEC.md missing 'ハイブリッド検知'"
fi

# 4. 3 信頼レベル: 高信頼
if grep -q "高信頼" "$SPEC"; then
  check_pass "SPEC.md contains '高信頼' (high confidence level)"
else
  check_fail "SPEC.md missing '高信頼'"
fi

# 5. 3 信頼レベル: 中信頼
if grep -q "中信頼" "$SPEC"; then
  check_pass "SPEC.md contains '中信頼' (medium confidence level)"
else
  check_fail "SPEC.md missing '中信頼'"
fi

# 6. 3 信頼レベル: 低信頼
if grep -q "低信頼" "$SPEC"; then
  check_pass "SPEC.md contains '低信頼' (low confidence level)"
else
  check_fail "SPEC.md missing '低信頼'"
fi

# 7. AND 条件 文言（誤爆抑制策）
if grep -q "AND 条件" "$SPEC"; then
  check_pass "SPEC.md contains 'AND 条件' (AND condition for false-positive suppression)"
else
  check_fail "SPEC.md missing 'AND 条件'"
fi

# 8. /loom-spec override / re-entry path 存続の記述
if grep -q "loom-spec" "$SPEC" && grep -q "override" "$SPEC"; then
  check_pass "SPEC.md contains '/loom-spec' + 'override' (override path preserved)"
else
  check_fail "SPEC.md missing '/loom-spec override' reference"
fi

# 9. false-positive 文言（誤爆抑制策）
if grep -q "false.positive" "$SPEC"; then
  check_pass "SPEC.md contains 'false-positive' (false-positive suppression)"
else
  check_fail "SPEC.md missing 'false-positive'"
fi

# 10. degraded mode での代替評価可能な記述
if grep -q "degraded mode" "$SPEC"; then
  check_pass "SPEC.md contains 'degraded mode' reference (Bash tool fallback)"
else
  check_fail "SPEC.md missing 'degraded mode' reference"
fi

# ── Invariant assertions: 前後章構造の維持 ────────────────────────────────────

# 11. §3.6.8.8 前章が依然として存在する
if grep -q "3\.6\.8\.8" "$SPEC"; then
  check_pass "SPEC.md still contains §3.6.8.8 (predecessor section intact)"
else
  check_fail "SPEC.md missing §3.6.8.8 — predecessor section was destroyed"
fi

# 12. §3.6.9 後章が依然として存在する
if grep -q "3\.6\.9" "$SPEC"; then
  check_pass "SPEC.md still contains §3.6.9 (successor section intact)"
else
  check_fail "SPEC.md missing §3.6.9 — successor section was destroyed"
fi

# 13. §3.6.8.9 の位置が §3.6.8.8 より後かつ §3.6.9 より前
line_3689=$(grep -n "3\.6\.8\.9" "$SPEC" | head -1 | cut -d: -f1 || echo "0")
line_3688=$(grep -n "3\.6\.8\.8" "$SPEC" | head -1 | cut -d: -f1 || echo "0")
line_369=$(grep -n "### 3\.6\.9" "$SPEC" | head -1 | cut -d: -f1 || echo "9999")

if [ "${line_3689:-0}" -gt "${line_3688:-0}" ] && [ "${line_3689:-9999}" -lt "${line_369:-9999}" ]; then
  check_pass "§3.6.8.9 position: after §3.6.8.8 (line $line_3688) and before §3.6.9 (line $line_369) — at line $line_3689"
else
  check_fail "§3.6.8.9 position incorrect — §3.6.8.8:${line_3688} §3.6.8.9:${line_3689} §3.6.9:${line_369}"
fi

# 14. spec 系 keyword 検知の言及（検知ロジックの記述）
if grep -q "spec 系 keyword\|spec.*keyword\|keyword.*spec" "$SPEC"; then
  check_pass "SPEC.md contains spec keyword detection description"
else
  check_fail "SPEC.md missing spec keyword detection description"
fi

# 15. M0.11.7 への参照（trinity 後続として brief mention）
if grep -q "M0\.11\.7\|loom-go.*auto\|auto.*loom-go\|impl phase.*auto\|auto.*impl phase" "$SPEC"; then
  check_pass "SPEC.md contains M0.11.7 or impl-phase-auto reference (trinity forward link)"
else
  check_fail "SPEC.md missing M0.11.7 / impl-phase-auto reference"
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "m0116_t2_spec_auto_entry_test: PASS=${pass} FAIL=${failures}"

if [ "$failures" -gt 0 ]; then
  echo "m0116_t2_spec_auto_entry_test FAILED with $failures violations"
  exit 1
fi

echo "m0116_t2_spec_auto_entry_test passed"
