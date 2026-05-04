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

# REQ-026: loom-mode.md が valid frontmatter
if [ -f "commands/loom-mode.md" ]; then
    if head -1 "commands/loom-mode.md" | grep -q "^---$"; then
        echo "PASS [commands]: loom-mode.md has valid frontmatter (M0.12)"
        ((failures)) || true
    else
        echo "FAIL [commands]: loom-mode.md missing frontmatter"
        failures=$((failures + 1))
    fi
fi

# REQ-044 (M0.11.3): loom-ui-smoke.md が存在し valid frontmatter + 必須 keyword を持つ
check_ui_smoke_command() {
    local fname="$ROOT_DIR/commands/loom-ui-smoke.md"
    local local_failures=0

    if [ ! -f "$fname" ]; then
        echo "FAIL [commands]: loom-ui-smoke.md not found (M0.11.3 t6)"
        failures=$((failures + 1))
        return
    fi

    # frontmatter closed
    local closer_count
    closer_count=$(grep -c "^---$" "$fname" 2>/dev/null || true)
    if [ -z "$closer_count" ] || [ "$closer_count" -lt 2 ]; then
        echo "FAIL [commands]: loom-ui-smoke.md frontmatter not closed"
        failures=$((failures + 1))
        local_failures=$((local_failures + 1))
    fi

    # description field
    local desc_field
    desc_field=$(awk '/^---$/{n++; next} n==1' "$fname" | grep -E "^description:" | sed 's/^description:[[:space:]]*//' | tr -d '"' | tr -d "'" || true)
    if [ -z "$desc_field" ]; then
        echo "FAIL [commands]: loom-ui-smoke.md missing description field"
        failures=$((failures + 1))
        local_failures=$((local_failures + 1))
    fi

    # body: scope parameter 記述
    if ! grep -q "\-\-scope" "$fname"; then
        echo "FAIL [commands]: loom-ui-smoke.md missing --scope parameter description"
        failures=$((failures + 1))
        local_failures=$((local_failures + 1))
    fi

    # body: auto-start flag 記述
    if ! grep -q "\-\-auto-start" "$fname"; then
        echo "FAIL [commands]: loom-ui-smoke.md missing --auto-start flag description"
        failures=$((failures + 1))
        local_failures=$((local_failures + 1))
    fi

    # body: SPEC §3.6.11 参照
    if ! grep -q "3\.6\.11\|§3\.6\.11" "$fname"; then
        echo "FAIL [commands]: loom-ui-smoke.md missing SPEC §3.6.11 reference"
        failures=$((failures + 1))
        local_failures=$((local_failures + 1))
    fi

    # body: docs/smoke-tests 出力ディレクトリ参照
    if ! grep -q "docs/smoke-tests" "$fname"; then
        echo "FAIL [commands]: loom-ui-smoke.md missing docs/smoke-tests reference"
        failures=$((failures + 1))
        local_failures=$((local_failures + 1))
    fi

    if [ "$local_failures" -eq 0 ]; then
        echo "PASS [commands]: loom-ui-smoke.md valid frontmatter + body (M0.11.3 t6)"
    fi
}
check_ui_smoke_command

if [ "$failures" -gt 0 ]; then
  echo "commands_test FAILED with $failures violations"
  exit 1
fi

echo "commands_test passed"
