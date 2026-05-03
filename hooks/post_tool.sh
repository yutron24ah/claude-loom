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
TS=$(date +%s%3N)

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
