#!/usr/bin/env bash
# tests/command_frequency_log_test.sh — command-frequency.log write via stdin JSON
#
# REQ-057: hooks/post_tool.sh が Claude Code SDK の stdin JSON input から
# tool_name + tool_input.command を抽出、SlashCommand event 時に
# ~/.claude-loom/command-frequency.log (env override LOOM_FREQUENCY_LOG で
# path 変更可、LOOM_NO_FREQUENCY_LOG=1 で opt-out) に append する。
# stdin 不在時は CLAUDE_TOOL_* env var fallback。
#
# WHY: Claude Code SDK は env var ちゃう stdin JSON で hook input を渡す仕様。
# env var only path は永久に false negative で silent failure。
# (retro 2026-05-06-003 F-meta-004 由来、post-tag-hotfix protocol §3.6.8.11)

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOK="$ROOT_DIR/hooks/post_tool.sh"

echo "--- command_frequency_log_test (REQ-057) ---"

# Check jq availability (required for stdin JSON path)
if ! command -v jq >/dev/null 2>&1; then
  echo "SKIP: jq not found — skipping stdin JSON path tests"
  exit 0
fi

all_passed=true
TMPDIR_TEST=$(mktemp -d)
trap 'rm -rf "$TMPDIR_TEST"' EXIT

TEST_LOG="$TMPDIR_TEST/test-command-frequency.log"

# ─── Test 1: stdin JSON SlashCommand → log append ────────────────────────────
# WHY: Core fix — SDK passes hook input via stdin JSON, not env vars.
# post_tool.sh must read stdin to detect SlashCommand events.
echo ""
echo "=== Test 1: stdin JSON SlashCommand path writes to log ==="
rm -f "$TEST_LOG"
STDIN_JSON='{"tool_name":"SlashCommand","tool_input":{"command":"/loom-status"}}'
result=$(printf '%s' "$STDIN_JSON" | LOOM_FREQUENCY_LOG="$TEST_LOG" LOOM_NO_FREQUENCY_LOG=0 \
  LOOM_DAEMON_URL="http://127.0.0.1:59999" \
  bash "$HOOK" 2>/dev/null; echo "exit:$?")
if [ -f "$TEST_LOG" ] && grep -q '/loom-status' "$TEST_LOG" 2>/dev/null; then
  echo "PASS [REQ-057]: Test 1 — stdin JSON SlashCommand wrote '/loom-status' to log"
  cat "$TEST_LOG" | head -3
else
  echo "FAIL [REQ-057]: Test 1 — log not created or '/loom-status' not found"
  echo "  log path: $TEST_LOG"
  echo "  log exists: $([ -f "$TEST_LOG" ] && echo 'yes' || echo 'no')"
  if [ -f "$TEST_LOG" ]; then
    echo "  log content: $(cat "$TEST_LOG")"
  fi
  all_passed=false
fi

# ─── Test 2: LOOM_NO_FREQUENCY_LOG=1 opt-out ─────────────────────────────────
echo ""
echo "=== Test 2: LOOM_NO_FREQUENCY_LOG=1 opt-out ==="
rm -f "$TEST_LOG"
STDIN_JSON='{"tool_name":"SlashCommand","tool_input":{"command":"/loom-status"}}'
printf '%s' "$STDIN_JSON" | LOOM_FREQUENCY_LOG="$TEST_LOG" LOOM_NO_FREQUENCY_LOG=1 \
  LOOM_DAEMON_URL="http://127.0.0.1:59999" \
  bash "$HOOK" 2>/dev/null
if [ ! -f "$TEST_LOG" ]; then
  echo "PASS [REQ-057]: Test 2 — LOOM_NO_FREQUENCY_LOG=1 suppressed log creation"
else
  echo "FAIL [REQ-057]: Test 2 — log was created despite LOOM_NO_FREQUENCY_LOG=1"
  echo "  log content: $(cat "$TEST_LOG")"
  all_passed=false
fi

# ─── Test 3: env var fallback (stdin unavailable / terminal) ─────────────────
# WHY: When invoked without stdin pipe (e.g., direct test from terminal or
# scripts that don't pass stdin), fall back to CLAUDE_TOOL_* env vars.
echo ""
echo "=== Test 3: env var fallback (CLAUDE_TOOL_NAME=SlashCommand) ==="
rm -f "$TEST_LOG"
# Redirect stdin from /dev/null to simulate absence of piped stdin
LOOM_FREQUENCY_LOG="$TEST_LOG" LOOM_NO_FREQUENCY_LOG=0 \
  CLAUDE_TOOL_NAME=SlashCommand \
  CLAUDE_TOOL_INPUT_COMMAND=/loom-test \
  LOOM_DAEMON_URL="http://127.0.0.1:59999" \
  bash "$HOOK" </dev/null 2>/dev/null
if [ -f "$TEST_LOG" ] && grep -q '/loom-test' "$TEST_LOG" 2>/dev/null; then
  echo "PASS [REQ-057]: Test 3 — env var fallback wrote '/loom-test' to log"
  cat "$TEST_LOG" | head -3
else
  echo "FAIL [REQ-057]: Test 3 — env var fallback did not write to log"
  echo "  log path: $TEST_LOG"
  echo "  log exists: $([ -f "$TEST_LOG" ] && echo 'yes' || echo 'no')"
  if [ -f "$TEST_LOG" ]; then
    echo "  log content: $(cat "$TEST_LOG")"
  fi
  all_passed=false
fi

# ─── Test 4: non-SlashCommand stdin JSON does NOT write to log ───────────────
# WHY: Regression guard — only SlashCommand events should write to the log.
echo ""
echo "=== Test 4: non-SlashCommand stdin JSON does NOT write to log ==="
rm -f "$TEST_LOG"
STDIN_JSON='{"tool_name":"Bash","tool_input":{"command":"ls -la"}}'
printf '%s' "$STDIN_JSON" | LOOM_FREQUENCY_LOG="$TEST_LOG" LOOM_NO_FREQUENCY_LOG=0 \
  LOOM_DAEMON_URL="http://127.0.0.1:59999" \
  bash "$HOOK" 2>/dev/null
if [ ! -f "$TEST_LOG" ]; then
  echo "PASS [REQ-057]: Test 4 — non-SlashCommand (Bash) did not write to log"
else
  echo "FAIL [REQ-057]: Test 4 — non-SlashCommand (Bash) wrote to log (unexpected)"
  echo "  log content: $(cat "$TEST_LOG")"
  all_passed=false
fi

# ─── Final result ─────────────────────────────────────────────────────────────
echo ""
if [ "$all_passed" = "true" ]; then
  echo "command_frequency_log_test passed"
  exit 0
else
  echo "command_frequency_log_test FAILED"
  exit 1
fi
