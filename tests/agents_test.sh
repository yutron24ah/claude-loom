#!/usr/bin/env bash
# tests/agents_test.sh — agent definition validity test
#
# REQ-005, REQ-007 をカバー

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENTS_DIR="$ROOT_DIR/agents"

if [ ! -d "$AGENTS_DIR" ] || [ -z "$(find "$AGENTS_DIR" -name "loom-*.md" 2>/dev/null)" ]; then
  echo "FAIL: agents/loom-*.md ファイルが存在しない"
  exit 1
fi

failures=0

for agent_file in "$AGENTS_DIR"/loom-*.md; do
  fname=$(basename "$agent_file")

  # frontmatter 抽出（最初の --- から次の --- まで）
  frontmatter=$(awk '/^---$/{n++; next} n==1' "$agent_file")

  if [ -z "$frontmatter" ]; then
    echo "FAIL [$fname]: frontmatter が見つからない"
    failures=$((failures + 1))
    continue
  fi

  closer_count=$(grep -c "^---$" "$agent_file" 2>/dev/null || true)
  if [ -z "$closer_count" ] || [ "$closer_count" -lt 2 ]; then
    echo "FAIL [$fname]: frontmatter not closed (expected 2 '---' delimiters, found $closer_count)"
    failures=$((failures + 1))
    continue
  fi

  # YAML key/value 抽出（key: value 形式のみ対応、簡易パース）
  name_field=$(echo "$frontmatter" | grep -E "^name:" | sed 's/^name:[[:space:]]*//' | tr -d '"' | tr -d "'" || true)
  desc_field=$(echo "$frontmatter" | grep -E "^description:" | sed 's/^description:[[:space:]]*//' | tr -d '"' | tr -d "'" || true)

  if [ -z "$name_field" ]; then
    echo "FAIL [$fname]: REQ-005 violation: name field 必須"
    failures=$((failures + 1))
    continue
  fi

  if [ -z "$desc_field" ]; then
    echo "FAIL [$fname]: REQ-005 violation: description field 必須"
    failures=$((failures + 1))
    continue
  fi

  if [[ "$name_field" != loom-* ]]; then
    echo "FAIL [$fname]: REQ-007 violation: name は loom- プレフィックス必須（実際: $name_field）"
    failures=$((failures + 1))
    continue
  fi

  echo "PASS [$fname]: name=$name_field"
done

if [ "$failures" -gt 0 ]; then
  echo "agents_test FAILED with $failures violations"
  exit 1
fi

echo "agents_test passed"
