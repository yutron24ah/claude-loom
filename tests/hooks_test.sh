#!/usr/bin/env bash
# tests/hooks_test.sh — bash hook scripts TDD test
#
# REQ-028: hooks/*.sh が存在、syntax OK、fail-silent 動作確認

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

HOOK_NAMES=(session_start pre_tool post_tool stop SubagentStop)
EXPECTED_EVENTS=(session_start pre_tool post_tool stop subagent_stop)

echo "--- hooks_test ---"

# ----- 5 hook files が存在する -----
for name in "${HOOK_NAMES[@]}"; do
  HOOK="$ROOT_DIR/hooks/${name}.sh"
  if [ ! -f "$HOOK" ]; then
    echo "FAIL: hooks/${name}.sh が存在しない"
    exit 1
  fi
  echo "PASS: hooks/${name}.sh exists"
done

# ----- 実行権限が付いている -----
for name in "${HOOK_NAMES[@]}"; do
  HOOK="$ROOT_DIR/hooks/${name}.sh"
  if [ ! -x "$HOOK" ]; then
    echo "FAIL: hooks/${name}.sh は executable でない"
    exit 1
  fi
  echo "PASS: hooks/${name}.sh is executable"
done

# ----- bash -n で syntax check -----
for name in "${HOOK_NAMES[@]}"; do
  HOOK="$ROOT_DIR/hooks/${name}.sh"
  if ! bash -n "$HOOK" 2>&1; then
    echo "FAIL: hooks/${name}.sh syntax error"
    exit 1
  fi
  echo "PASS: hooks/${name}.sh syntax OK"
done

# ----- fail-silent: daemon 不在時に exit 0 する -----
# LOOM_DAEMON_URL を存在しないアドレスに向ける
export LOOM_DAEMON_URL="http://127.0.0.1:59999"
export LOOM_TOKEN_FILE="/dev/null"
export CLAUDE_SESSION_ID="test-session-id"
export CLAUDE_TOOL_NAME="Bash"

for name in "${HOOK_NAMES[@]}"; do
  HOOK="$ROOT_DIR/hooks/${name}.sh"
  if ! bash "$HOOK"; then
    echo "FAIL: hooks/${name}.sh: daemon 不在時に非ゼロ exit した（fail-silent 違反）"
    exit 1
  fi
  echo "PASS: hooks/${name}.sh fail-silent OK"
done

# ----- eventType が各 hook に正しく含まれる -----
for i in "${!HOOK_NAMES[@]}"; do
  name="${HOOK_NAMES[$i]}"
  expected_event="${EXPECTED_EVENTS[$i]}"
  HOOK="$ROOT_DIR/hooks/${name}.sh"
  if ! grep -q "\"eventType\": \"$expected_event\"" "$HOOK"; then
    echo "FAIL: hooks/${name}.sh に eventType \"$expected_event\" が見つからない"
    exit 1
  fi
  echo "PASS: hooks/${name}.sh has eventType=\"$expected_event\""
done

# ----- token file パスが正しく参照されている -----
for name in "${HOOK_NAMES[@]}"; do
  HOOK="$ROOT_DIR/hooks/${name}.sh"
  if ! grep -q 'daemon-token' "$HOOK"; then
    echo "FAIL: hooks/${name}.sh に daemon-token 参照が見つからない"
    exit 1
  fi
  echo "PASS: hooks/${name}.sh references daemon-token"
done

echo "hooks_test passed"
