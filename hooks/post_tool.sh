#!/usr/bin/env bash
# hooks/post_tool.sh — Claude Code post_tool hook
# POSTs post_tool event to claude-loom daemon. Fail-silent.

set -uo pipefail  # -e 外す（curl 失敗で Claude Code を kill しない）

LOOM_DAEMON_URL="${LOOM_DAEMON_URL:-http://127.0.0.1:5757}"
LOOM_TOKEN_FILE="${LOOM_TOKEN_FILE:-$HOME/.claude-loom/daemon-token}"
LOOM_TOKEN=""
if [ -r "$LOOM_TOKEN_FILE" ]; then
  LOOM_TOKEN="$(cat "$LOOM_TOKEN_FILE" 2>/dev/null || echo "")"
fi

# JSON-escape helper（最小、jq があれば jq 使う）
json_escape() {
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$1" | jq -Rs .
  else
    # fallback：basic escape
    printf '"%s"' "$(printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g')"
  fi
}

# Cross-platform millisecond timestamp.
# WHY: macOS BSD `date` doesn't support `+%3N` (yields literal `N`), breaking JSON.
ts_ms() {
  if command -v python3 >/dev/null 2>&1; then
    python3 -c "import time; print(int(time.time()*1000))"
  elif command -v node >/dev/null 2>&1; then
    node -e "process.stdout.write(String(Date.now()))"
  else
    echo "$(date +%s)000"  # second-precision fallback (degraded)
  fi
}

post_event() {
  local payload="$1"
  curl -sS -X POST "$LOOM_DAEMON_URL/event" \
    -H "Content-Type: application/json" \
    -H "x-loom-token: $LOOM_TOKEN" \
    --max-time 1 \
    -d "$payload" \
    >/dev/null 2>&1 || true  # fail-silent
}

SESSION_ID="${CLAUDE_SESSION_ID:-unknown}"
TOOL_NAME="${CLAUDE_TOOL_NAME:-unknown}"
# CLAUDE_TOOL_INPUT_FILE_PATH is set by Claude Code for Edit/Write tools (absolute path of edited file)
FILE_PATH="${CLAUDE_TOOL_INPUT_FILE_PATH:-}"
S_ESC=$(json_escape "$SESSION_ID")
T_ESC=$(json_escape "$TOOL_NAME")
TS=$(ts_ms)

# WHY: spec_edit_candidate flag tells the daemon to check if this is a SPEC file edit.
# We flag it when tool is Edit or Write AND the file is a .md file.
# The daemon resolves whether it matches the project's spec_path using the projectRootPath.
SPEC_EDIT_CANDIDATE="false"
PROJECT_ROOT_PATH=""
if [ "$TOOL_NAME" = "Edit" ] || [ "$TOOL_NAME" = "Write" ]; then
  if [ -n "$FILE_PATH" ]; then
    case "$FILE_PATH" in
      *.md)
        SPEC_EDIT_CANDIDATE="true"
        # Derive project root from git root of the edited file's directory
        FILE_DIR="$(dirname "$FILE_PATH")"
        PROJECT_ROOT_PATH="$(git -C "$FILE_DIR" rev-parse --show-toplevel 2>/dev/null || echo "")"
        ;;
    esac
  fi
fi

FP_ESC=$(json_escape "$FILE_PATH")
PR_ESC=$(json_escape "$PROJECT_ROOT_PATH")

PAYLOAD='{"sessionId":'"$S_ESC"',"eventType":"post_tool","toolName":'"$T_ESC"',"payload":{"timestamp":'"$TS"',"filePath":'"$FP_ESC"',"specEditCandidate":'"$SPEC_EDIT_CANDIDATE"',"projectRootPath":'"$PR_ESC"'}}'
post_event "$PAYLOAD"

# ── command frequency probe (retro 2026-05-06-002 F-USER-004 由来) ────────────
# slash command (SlashCommand tool) の invocation を ~/.claude-loom/command-frequency.log
# に append、retro architecture を data 駆動化する。Phase 2 candidate 優先順位
# を reality data 経由で評価可能にする。
#
# log format (1 line / event): `<unix_ms> <session_id> <command_name>`
# LOOM_NO_FREQUENCY_LOG=1 で env 経由 opt-out 可能 (privacy concern 用)。
if [ "${LOOM_NO_FREQUENCY_LOG:-0}" != "1" ] && [ "$TOOL_NAME" = "SlashCommand" ]; then
  FREQ_LOG="${LOOM_FREQUENCY_LOG:-$HOME/.claude-loom/command-frequency.log}"
  FREQ_DIR="$(dirname "$FREQ_LOG")"
  mkdir -p "$FREQ_DIR" 2>/dev/null || true
  # CLAUDE_TOOL_INPUT_COMMAND は SlashCommand tool で command name を expose
  CMD_NAME="${CLAUDE_TOOL_INPUT_COMMAND:-${CLAUDE_TOOL_INPUT:-unknown}}"
  # newline / log forge guard: 改行を空白に置換、非 ASCII は保持
  CMD_NAME_SAFE="$(printf '%s' "$CMD_NAME" | tr '\n\r\t' ' ')"
  printf '%s %s %s\n' "$TS" "$SESSION_ID" "$CMD_NAME_SAFE" >> "$FREQ_LOG" 2>/dev/null || true
fi
