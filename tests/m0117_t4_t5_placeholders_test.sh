#!/usr/bin/env bash
# tests/m0117_t4_t5_placeholders_test.sh — M0.11.7 t4/t5: placeholder fill assertions
#
# REQ-048: agents/loom-pm.md の Spec Phase Completion Hook section 内 2 placeholder が
#          実内容で埋まっていること（m0.11.7-t4: impl intent keyword list 確定、
#          m0.11.7-t5: 確認 prompt template 拡充）
#
# Coverage:
#   t4 — impl intent keyword list: spec 系 keyword list (M0.11.6) と分離した実 keyword が記載
#     POSITIVE: 「実装」を含む（日本語 impl intent keyword 代表）
#     POSITIVE: 「着手」を含む（impl 系 keyword）
#     POSITIVE: 「振って」または「task 振って」を含む（dispatch 系）
#     POSITIVE: 「kick off」または「kickoff」を含む（英語 impl keyword）
#     POSITIVE: 「proceed」または「進めて」を含む
#     POSITIVE: impl keyword が 10 個以上ユニークに存在する
#     NEGATIVE: placeholder 文字列 "t4 で最終確定予定" が残っていない（placeholder 除去済）
#
#   t5 — 高信頼 confirmation template: bypass option として /loom-spec への言及を含む
#     POSITIVE: 「ええか」または「ですか」または「でよいか」等の確認文言を含む（既存、維持確認）
#     POSITIVE: 高信頼 template に /loom-spec bypass option の明示記述あり
#     POSITIVE: 高信頼 template に /loom-status bypass option の明示記述あり（既存、維持確認）
#     NEGATIVE: placeholder 文字列 "t5 で拡充予定" が残っていない（placeholder 除去済）
#
#   t5 — 中信頼 branching template: 3 択型の詳細が記述されとる
#     POSITIVE: impl phase 開始択（① / impl / loom-go 等）を含む
#     POSITIVE: spec 修正択（② / spec / loom-spec 等）を含む
#     POSITIVE: status 確認択（③ / status / loom-status 等）を含む
#     NEGATIVE: placeholder 文字列 "t5 で拡充予定" が中信頼 template 周辺にも残っていない
#
#   INVARIANT: t3 で確認済みの Spec Phase Completion Hook 構造が維持されとる
#     POSITIVE: "Spec Phase Completion Hook" section が存在する
#     POSITIVE: M0.11.7 固有の "3 軸" / "3 軸 AND" 記述が存在する
#     POSITIVE: impl 系 keyword list と spec 系 keyword list が別記述として存在する
#     POSITIVE: M0.11.6 Session Start Hook section が依然として存在する

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

# ── t4: impl intent keyword list (final, not draft) ──────────────────────────

# t4-1. 「実装」を含む（日本語 impl intent keyword 代表）
# Note: 「実装」は spec 系 keyword "実装したい" とは別の impl phase 動詞として存在すべき
if grep -q "「実装」" "$PM_AGENT"; then
  check_pass "t4: contains '「実装」' (JP impl keyword)"
else
  check_fail "t4: missing '「実装」' in impl keyword list"
fi

# t4-2. 「着手」を含む（impl 着手系 keyword）
if grep -q "着手" "$PM_AGENT"; then
  check_pass "t4: contains '着手' (impl intent keyword)"
else
  check_fail "t4: missing '着手' in impl keyword list"
fi

# t4-3. 「振って」または「task 振って」を含む（dispatch 系 keyword）
if grep -qE "振って|task 振って|タスク振って" "$PM_AGENT"; then
  check_pass "t4: contains '振って' / 'task 振って' (dispatch keyword)"
else
  check_fail "t4: missing '振って' / 'task 振って' dispatch keyword"
fi

# t4-4. 「kick off」または「kickoff」を含む（英語 impl keyword）
if grep -qiE "kick off|kickoff" "$PM_AGENT"; then
  check_pass "t4: contains 'kick off' / 'kickoff' (EN impl keyword)"
else
  check_fail "t4: missing 'kick off' / 'kickoff' in impl keyword list"
fi

# t4-5. 「proceed」または「進めて」を含む（継続・進行系）
if grep -qE "proceed|進めて" "$PM_AGENT"; then
  check_pass "t4: contains 'proceed' or '進めて' (proceed keyword)"
else
  check_fail "t4: missing 'proceed' / '進めて' in impl keyword list"
fi

# t4-6. impl keyword が 10 個以上ユニークに存在する
# impl 系 keyword list から実 keyword を数える
IMPL_KW_COUNT=$(grep -oE "(「実装」|「着手」|「進めて」|「開発して」|「コーディング」|「始めて」|「作って」|「走らせて」|「go」|「振って」|implement|dispatch|kick off|kickoff|start|begin|develop|code|proceed|run)" "$PM_AGENT" | sort -u | wc -l | tr -d ' ')
if [ "$IMPL_KW_COUNT" -ge 10 ]; then
  check_pass "t4: impl keyword count >= 10 (found $IMPL_KW_COUNT unique impl keywords)"
else
  check_fail "t4: impl keyword count < 10 (found $IMPL_KW_COUNT, need >= 10)"
fi

# t4-7. placeholder "t4 で最終確定予定" が残っていない
if grep -q "t4 で最終確定予定" "$PM_AGENT"; then
  check_fail "t4: placeholder 't4 で最終確定予定' is still present (not yet replaced)"
else
  check_pass "t4: placeholder 't4 で最終確定予定' has been removed"
fi

# ── t5: 高信頼 confirmation template ─────────────────────────────────────────

# t5-1. 確認文言「ええか」または「ですか」を含む（既存維持確認）
if grep -qE "ええか|ですか|でよいか|してよいか|よろしいか" "$PM_AGENT"; then
  check_pass "t5: contains confirmation phrasing ('ええか' or 'ですか' etc.)"
else
  check_fail "t5: missing confirmation phrasing in high-confidence template"
fi

# t5-2. 高信頼 template に /loom-spec bypass option の明示記述あり（t5 新規要件）
# /loom-spec が spec 修正の bypass path として高信頼 template 内に記述されとること
if grep -qE "/loom-spec.*bypass|bypass.*loom-spec|spec.*修正.*loom-spec|loom-spec.*修正|spec を修正.*loom-spec|/loom-spec" "$PM_AGENT"; then
  check_pass "t5: high-confidence template contains /loom-spec bypass option"
else
  check_fail "t5: high-confidence template missing /loom-spec bypass option"
fi

# t5-3. 高信頼 template に /loom-status bypass option の明示記述あり（既存維持確認）
if grep -qE "/loom-status" "$PM_AGENT"; then
  check_pass "t5: contains /loom-status bypass option reference"
else
  check_fail "t5: missing /loom-status in high-confidence template"
fi

# t5-4. placeholder "t5 で拡充予定" が残っていない（高信頼 template 周辺）
if grep -q "t5 で拡充予定" "$PM_AGENT"; then
  check_fail "t5: placeholder 't5 で拡充予定' is still present (not yet replaced)"
else
  check_pass "t5: placeholder 't5 で拡充予定' has been removed"
fi

# ── t5: 中信頼 branching template (3 択) ─────────────────────────────────────

# t5-5. impl phase 開始択を含む (① / impl / loom-go 相当)
if grep -qE "① impl|①.*impl|impl phase 開始|impl.*開始.*loom-go|/loom-go.*相当" "$PM_AGENT"; then
  check_pass "t5: medium-confidence template contains impl phase start option"
else
  check_fail "t5: medium-confidence template missing impl phase start option (①)"
fi

# t5-6. spec 修正択を含む (② / spec / loom-spec 相当)
if grep -qE "② spec|②.*spec|spec.*追加.*修正|spec 追加|/loom-spec.*相当" "$PM_AGENT"; then
  check_pass "t5: medium-confidence template contains spec modify option"
else
  check_fail "t5: medium-confidence template missing spec modify option (②)"
fi

# t5-7. status 確認択を含む (③ / status / loom-status 相当)
if grep -qE "③ status|③.*status|status.*確認.*loom-status|/loom-status.*相当" "$PM_AGENT"; then
  check_pass "t5: medium-confidence template contains status check option"
else
  check_fail "t5: medium-confidence template missing status check option (③)"
fi

# ── INVARIANT: Spec Phase Completion Hook 構造維持 ─────────────────────────────

# inv-1. Spec Phase Completion Hook section が存在する
if grep -qiE "Spec Phase Completion Hook|PM Auto-Go Entry" "$PM_AGENT"; then
  check_pass "INV: Spec Phase Completion Hook section still exists"
else
  check_fail "INV: Spec Phase Completion Hook section was destroyed"
fi

# inv-2. M0.11.7 固有の 3 軸 AND 記述が存在する
if grep -qE "3 軸|3 軸 AND|3 軸全|3-axis|3軸" "$PM_AGENT"; then
  check_pass "INV: 3-axis AND detection description still exists"
else
  check_fail "INV: 3-axis AND detection was destroyed"
fi

# inv-3. impl 系 keyword list と spec 系 keyword list が別記述として存在する（分離維持）
SPEC_KW_PRESENCE=$(grep -c -iE "spec.*keyword|spec.*intent|spec 系 intent|spec 系 keyword" "$PM_AGENT" || true)
IMPL_KW_PRESENCE=$(grep -c -iE "impl.*keyword|impl.*intent|impl 系 keyword|impl 系 intent" "$PM_AGENT" || true)
if [ "${SPEC_KW_PRESENCE:-0}" -gt 0 ] && [ "${IMPL_KW_PRESENCE:-0}" -gt 0 ]; then
  check_pass "INV: both spec keyword list (M0.11.6) and impl keyword list (M0.11.7) exist separately"
else
  check_fail "INV: keyword list separation broken (spec_kw=${SPEC_KW_PRESENCE:-0}, impl_kw=${IMPL_KW_PRESENCE:-0})"
fi

# inv-4. M0.11.6 Session Start Hook section が依然として存在する
if grep -qiE "session start|PM Auto-Spec Entry|auto-spec entry" "$PM_AGENT"; then
  check_pass "INV: M0.11.6 Session Start Hook section still exists"
else
  check_fail "INV: M0.11.6 Session Start Hook section was destroyed"
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "m0117_t4_t5_placeholders_test: PASS=${pass} FAIL=${failures}"

if [ "$failures" -gt 0 ]; then
  echo "m0117_t4_t5_placeholders_test FAILED with $failures violations"
  exit 1
fi

echo "m0117_t4_t5_placeholders_test passed"
