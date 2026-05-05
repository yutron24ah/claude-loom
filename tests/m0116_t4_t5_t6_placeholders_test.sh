#!/usr/bin/env bash
# tests/m0116_t4_t5_t6_placeholders_test.sh — M0.11.6 t4/t5/t6: placeholder fill assertions
#
# REQ: agents/loom-pm.md の Session Start Hook section 内 3 placeholder が実内容で埋まっていること
#
# Coverage:
#   t4 — keyword list: 実 keyword (日本語 + 英語 15-25 個) が記載されとる
#     POSITIVE: 「実装したい」を含む (日本語 keyword 代表)
#     POSITIVE: 「機能追加」を含む
#     POSITIVE: 「バグ」または「bug」を含む
#     POSITIVE: 「SPEC」を含む
#     POSITIVE: 「PLAN」を含む
#     POSITIVE: 「implement」を含む (英語 keyword 代表)
#     POSITIVE: keyword list が 15 個以上あることを keyword count で確認
#     NEGATIVE: placeholder 文字列 "t4 で確定" が残っていない (placeholder 除去済)
#
#   t5 — 高信頼 confirmation template: 実 prompt template が記載されとる
#     POSITIVE: 「ええか」または「ですか」または「でよいですか」等の確認文言を含む
#     POSITIVE: bypass option の記述を含む (「/loom-status」または「no」または「スキップ」)
#     NEGATIVE: placeholder 文字列 "t5 で詳細化" が残っていない
#
#   t6 — 中信頼 branching template: 3 択分岐 prompt が記載されとる
#     POSITIVE: 「新規」または「新規 PJ」または「新規 spec」を含む
#     POSITIVE: 「レビュー」または「既存」を含む
#     POSITIVE: 「status」または「Status」または「確認」を含む
#     NEGATIVE: placeholder 文字列 "t6 で詳細化" が残っていない
#
#   INVARIANT: t3 で確認済みの Session Start Hook section 構造が維持されとる
#     POSITIVE: "Session Start Hook" section が存在する
#     POSITIVE: "高信頼" 分岐記述が存在する
#     POSITIVE: "中信頼" 分岐記述が存在する

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

# ── t4: Intent keyword list ───────────────────────────────────────────────────

# t4-1. 日本語 keyword 「実装したい」を含む
if grep -q "実装したい" "$PM_AGENT"; then
  check_pass "t4: contains '実装したい' (JP keyword)"
else
  check_fail "t4: missing '実装したい' keyword"
fi

# t4-2. 「機能追加」を含む
if grep -q "機能追加" "$PM_AGENT"; then
  check_pass "t4: contains '機能追加' (JP keyword)"
else
  check_fail "t4: missing '機能追加' keyword"
fi

# t4-3. 「バグ」または「bug」を含む
if grep -qiE "バグ|bug" "$PM_AGENT"; then
  check_pass "t4: contains 'バグ' or 'bug' (bug keyword)"
else
  check_fail "t4: missing 'バグ' / 'bug' keyword"
fi

# t4-4. 「SPEC」を含む (keyword として)
if grep -q "SPEC" "$PM_AGENT"; then
  check_pass "t4: contains 'SPEC' (EN keyword)"
else
  check_fail "t4: missing 'SPEC' keyword"
fi

# t4-5. 「PLAN」を含む
if grep -q "PLAN" "$PM_AGENT"; then
  check_pass "t4: contains 'PLAN' (EN keyword)"
else
  check_fail "t4: missing 'PLAN' keyword"
fi

# t4-6. 英語 keyword 「implement」を含む
if grep -q "implement" "$PM_AGENT"; then
  check_pass "t4: contains 'implement' (EN keyword)"
else
  check_fail "t4: missing 'implement' keyword"
fi

# t4-7. keyword が 15 個以上存在する (Session Start Hook section 内のキーワードリストを確認)
# keyword list section を含む行数を確認する
# Session Start Hook section 内で keyword として列挙されているアイテム数を数える
# 「実装したい」「機能追加」「設計」「SPEC」「PLAN」「task」「fix」「build」「bug」等が含まれるか確認
KEYWORD_COUNT=$(grep -oE "(実装したい|機能追加|バグ|不具合|改善したい|設計|仕様|要件|新機能|追加したい|修正|進めたい|作りたい|implement|feature|bug|fix|SPEC|PLAN|task|design|build|refactor|enhance|改修|改善)" "$PM_AGENT" | sort -u | wc -l | tr -d ' ')
if [ "$KEYWORD_COUNT" -ge 15 ]; then
  check_pass "t4: keyword count >= 15 (found $KEYWORD_COUNT unique keywords)"
else
  check_fail "t4: keyword count < 15 (found $KEYWORD_COUNT unique keywords, need >= 15)"
fi

# t4-8. placeholder "t4 で確定" が残っていない
if grep -q "t4 で確定" "$PM_AGENT"; then
  check_fail "t4: placeholder 't4 で確定' is still present (not yet replaced)"
else
  check_pass "t4: placeholder 't4 で確定' has been removed"
fi

# ── t5: 高信頼 confirmation template ─────────────────────────────────────────

# t5-1. 確認文言「ええか」または「ですか」を含む
if grep -qE "ええか|ですか|でよいですか|してよいか|よろしいか" "$PM_AGENT"; then
  check_pass "t5: contains confirmation phrasing ('ええか' or 'ですか' etc.)"
else
  check_fail "t5: missing confirmation phrasing in high-confidence template"
fi

# t5-2. bypass option の記述を含む
if grep -qE "/loom-status|「no」|スキップ|bypass|no で|「no」|skip" "$PM_AGENT"; then
  check_pass "t5: contains bypass option reference"
else
  check_fail "t5: missing bypass option in high-confidence template"
fi

# t5-3. placeholder "t5 で詳細化" が残っていない
if grep -q "t5 で詳細化" "$PM_AGENT"; then
  check_fail "t5: placeholder 't5 で詳細化' is still present (not yet replaced)"
else
  check_pass "t5: placeholder 't5 で詳細化' has been removed"
fi

# ── t6: 中信頼 branching template ────────────────────────────────────────────

# t6-1. 「新規」を含む (新規 PJ / 新規 spec 択肢)
if grep -qE "新規 PJ|新規 spec|新規プロジェクト|①新規|①.新規|1\..*新規" "$PM_AGENT"; then
  check_pass "t6: contains '新規' option in branching template"
else
  check_fail "t6: missing '新規' (new project) option in branching template"
fi

# t6-2. 「レビュー」または「既存 plan」を含む (2択目)
if grep -qE "②|②.*(レビュー|review)|既存.*plan|plan.*レビュー|2\..*レビュー|2\..*(既存|plan)" "$PM_AGENT"; then
  check_pass "t6: contains review/existing plan option in branching template"
else
  check_fail "t6: missing review/existing plan option in branching template"
fi

# t6-3. status 確認択肢を含む (3択目)
if grep -qE "③|③.*status|status.*確認|③.*確認|3\..*status|3\..*確認" "$PM_AGENT"; then
  check_pass "t6: contains status check option in branching template"
else
  check_fail "t6: missing status check option in branching template"
fi

# t6-4. placeholder "t6 で詳細化" が残っていない
if grep -q "t6 で詳細化" "$PM_AGENT"; then
  check_fail "t6: placeholder 't6 で詳細化' is still present (not yet replaced)"
else
  check_pass "t6: placeholder 't6 で詳細化' has been removed"
fi

# ── INVARIANT: t3 session hook structure 維持 ─────────────────────────────────

# inv-1. Session Start Hook section が存在する
if grep -qiE "session start|auto-spec entry|PM Auto-Spec Entry" "$PM_AGENT"; then
  check_pass "INV: Session Start Hook section still exists"
else
  check_fail "INV: Session Start Hook section was destroyed"
fi

# inv-2. 高信頼 分岐が存在する
if grep -q "高信頼" "$PM_AGENT"; then
  check_pass "INV: '高信頼' branch description still exists"
else
  check_fail "INV: '高信頼' branch description was destroyed"
fi

# inv-3. 中信頼 分岐が存在する
if grep -q "中信頼" "$PM_AGENT"; then
  check_pass "INV: '中信頼' branch description still exists"
else
  check_fail "INV: '中信頼' branch description was destroyed"
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "m0116_t4_t5_t6_placeholders_test: PASS=${pass} FAIL=${failures}"

if [ "$failures" -gt 0 ]; then
  echo "m0116_t4_t5_t6_placeholders_test FAILED with $failures violations"
  exit 1
fi

echo "m0116_t4_t5_t6_placeholders_test passed"
