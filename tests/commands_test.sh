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

# REQ-045 (M0.11.5 t6): loom.md が URL 表示 + clipboard copy 機能を含む
check_loom_url_clipboard() {
    local fname="$ROOT_DIR/commands/loom.md"
    local local_failures=0

    if [ ! -f "$fname" ]; then
        echo "FAIL [commands]: loom.md not found (M0.11.5 t6)"
        failures=$((failures + 1))
        return
    fi

    # URL 文字列 http://127.0.0.1:5757 を含む
    if ! grep -q "http://127\.0\.0\.1:5757" "$fname"; then
        echo "FAIL [commands]: loom.md missing daemon URL http://127.0.0.1:5757 (M0.11.5 t6)"
        failures=$((failures + 1))
        local_failures=$((local_failures + 1))
    fi

    # clipboard command pattern を含む (pbcopy / wl-copy / xclip / clip のいずれか)
    if ! grep -qE "pbcopy|wl-copy|xclip|clip" "$fname"; then
        echo "FAIL [commands]: loom.md missing clipboard command (pbcopy/wl-copy/xclip/clip) (M0.11.5 t6)"
        failures=$((failures + 1))
        local_failures=$((local_failures + 1))
    fi

    # pbcopy (macOS) が存在する
    if ! grep -q "pbcopy" "$fname"; then
        echo "FAIL [commands]: loom.md missing pbcopy clipboard command (macOS) (M0.11.5 t6)"
        failures=$((failures + 1))
        local_failures=$((local_failures + 1))
    fi

    # wl-copy (Wayland) が存在する
    if ! grep -q "wl-copy" "$fname"; then
        echo "FAIL [commands]: loom.md missing wl-copy clipboard command (Wayland) (M0.11.5 t6)"
        failures=$((failures + 1))
        local_failures=$((local_failures + 1))
    fi

    # xclip (X11) が存在する
    if ! grep -q "xclip" "$fname"; then
        echo "FAIL [commands]: loom.md missing xclip clipboard command (X11) (M0.11.5 t6)"
        failures=$((failures + 1))
        local_failures=$((local_failures + 1))
    fi

    # clip (Windows) が存在する
    if ! grep -q "clip" "$fname"; then
        echo "FAIL [commands]: loom.md missing clip clipboard command (Windows) (M0.11.5 t6)"
        failures=$((failures + 1))
        local_failures=$((local_failures + 1))
    fi

    # 既存 help/entry 役割が保持されとる (daemon 起動 instruction)
    if ! grep -q "daemon\|起動\|launch" "$fname"; then
        echo "FAIL [commands]: loom.md missing help/entry role (daemon launch instruction) (M0.11.5 t6)"
        failures=$((failures + 1))
        local_failures=$((local_failures + 1))
    fi

    if [ "$local_failures" -eq 0 ]; then
        echo "PASS [commands]: loom.md has URL display + clipboard copy + help role (M0.11.5 t6)"
    fi
}
check_loom_url_clipboard

if [ "$failures" -gt 0 ]; then
  echo "commands_test FAILED with $failures violations"
  exit 1
fi

echo "commands_test passed"
