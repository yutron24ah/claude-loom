#!/usr/bin/env bash
# skills/loom-test/scripts/run.sh
#
# claude-loom ハーネステスト一括実行 + 構造化サマリ出力
# 引数 1: 任意のフィルタ（agents / commands / install / skills）
# Read-only — テストは sandbox で実行され、repo state を変更しない

set -uo pipefail

# プロジェクトルート探索：cwd または親方向に SPEC.md + tests/run_tests.sh を持つディレクトリ
find_project_root() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -f "$dir/SPEC.md" ] && [ -d "$dir/tests" ] && [ -f "$dir/tests/run_tests.sh" ]; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done
  return 1
}

ROOT="$(find_project_root)"
if [ -z "${ROOT:-}" ]; then
  echo "ERROR: claude-loom project root not found (no SPEC.md + tests/run_tests.sh in cwd or ancestors)" >&2
  exit 1
fi

cd "$ROOT"

filter="${1:-}"

if [ -n "$filter" ]; then
  output=$(./tests/run_tests.sh "$filter" 2>&1) || rc=$?
else
  output=$(./tests/run_tests.sh 2>&1) || rc=$?
fi
rc="${rc:-0}"

# 集計サマリ抜き出し
passed=$(echo "$output" | grep -E "^Passed:" | sed -E 's/.*Passed: *([0-9]+).*/\1/' | head -1)
failed=$(echo "$output" | grep -E "^Passed:" | sed -E 's/.*Failed: *([0-9]+).*/\1/' | head -1)
skipped=$(echo "$output" | grep -E "^Passed:" | sed -E 's/.*Skipped: *([0-9]+).*/\1/' | head -1)

echo "=== loom-test summary ==="
echo "filter: ${filter:-(all)}"
echo "passed: ${passed:-?}"
echo "failed: ${failed:-?}"
echo "skipped: ${skipped:-?}"
echo "exit_code: $rc"
echo ""
if [ "${rc:-0}" -ne 0 ]; then
  echo "=== full output (test failures present) ==="
  echo "$output"
fi
exit "$rc"
