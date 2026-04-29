#!/usr/bin/env bash
# tests/daemon_commands_test.sh — /loom + /loom-status + /loom-stop slash command tests
#
# REQ-029: 3 daemon slash commands が valid frontmatter + description フィールド必須

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMMANDS_DIR="$ROOT_DIR/commands"

echo "--- daemon_commands_test ---"

# テスト対象 3 コマンド
COMMANDS=(loom loom-status loom-stop)
EXPECTED_DESC_KEYWORDS=(
  "daemon"
  "daemon status"
  "daemon"
)

failures=0

for i in "${!COMMANDS[@]}"; do
  cmd="${COMMANDS[$i]}"
  file="$COMMANDS_DIR/${cmd}.md"

  # ファイル存在確認
  if [ ! -f "$file" ]; then
    echo "FAIL [${cmd}.md]: ファイルが存在しない"
    failures=$((failures + 1))
    continue
  fi
  echo "PASS [${cmd}.md]: file exists"

  # frontmatter 確認: 最初の行が "---" で始まる
  first_line=$(head -1 "$file")
  if [ "$first_line" != "---" ]; then
    echo "FAIL [${cmd}.md]: frontmatter が '---' で始まらない (got: $first_line)"
    failures=$((failures + 1))
    continue
  fi
  echo "PASS [${cmd}.md]: frontmatter starts with ---"

  # frontmatter が閉じられているか（2 個以上の "---"）
  closer_count=$(grep -c "^---$" "$file" 2>/dev/null || true)
  if [ -z "$closer_count" ] || [ "$closer_count" -lt 2 ]; then
    echo "FAIL [${cmd}.md]: frontmatter not closed (--- が $closer_count 個)"
    failures=$((failures + 1))
    continue
  fi
  echo "PASS [${cmd}.md]: frontmatter is closed"

  # description フィールド確認
  desc_field=$(awk '/^---$/{n++; next} n==1' "$file" | grep -E "^description:" | sed 's/^description:[[:space:]]*//' | tr -d '"' | tr -d "'" || true)
  if [ -z "$desc_field" ]; then
    echo "FAIL [${cmd}.md]: description フィールドが無い"
    failures=$((failures + 1))
    continue
  fi
  echo "PASS [${cmd}.md]: description=$desc_field"

  # # ヘッダー確認（# /cmd が本文に存在）
  if ! grep -q "^# /${cmd}" "$file"; then
    echo "FAIL [${cmd}.md]: '# /${cmd}' ヘッダーが本文に無い"
    failures=$((failures + 1))
    continue
  fi
  echo "PASS [${cmd}.md]: has '# /${cmd}' heading"
done

if [ "$failures" -gt 0 ]; then
  echo "daemon_commands_test FAILED with $failures violations"
  exit 1
fi

echo "daemon_commands_test passed"
