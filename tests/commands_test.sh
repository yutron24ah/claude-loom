#!/usr/bin/env bash
# tests/commands_test.sh — slash command frontmatter test
#
# REQ-006 をカバー

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMMANDS_DIR="$ROOT_DIR/commands"

if [ ! -d "$COMMANDS_DIR" ] || [ -z "$(find "$COMMANDS_DIR" -name "loom-*.md" 2>/dev/null)" ]; then
  echo "FAIL: commands/loom-*.md ファイルが存在しない"
  exit 1
fi

failures=0

for cmd_file in "$COMMANDS_DIR"/loom-*.md; do
  fname=$(basename "$cmd_file")

  frontmatter=$(awk '/^---$/{n++; next} n==1' "$cmd_file")

  if [ -z "$frontmatter" ]; then
    echo "FAIL [$fname]: frontmatter なし"
    failures=$((failures + 1))
    continue
  fi

  closer_count=$(grep -c "^---$" "$cmd_file" 2>/dev/null || true)
  if [ -z "$closer_count" ] || [ "$closer_count" -lt 2 ]; then
    echo "FAIL [$fname]: frontmatter not closed (expected 2 '---' delimiters, found $closer_count)"
    failures=$((failures + 1))
    continue
  fi

  desc_field=$(echo "$frontmatter" | grep -E "^description:" | sed 's/^description:[[:space:]]*//' | tr -d '"' | tr -d "'" || true)

  if [ -z "$desc_field" ]; then
    echo "FAIL [$fname]: REQ-006 violation: description field 必須"
    failures=$((failures + 1))
    continue
  fi

  echo "PASS [$fname]: description=$desc_field"
done

if [ "$failures" -gt 0 ]; then
  echo "commands_test FAILED with $failures violations"
  exit 1
fi

echo "commands_test passed"
