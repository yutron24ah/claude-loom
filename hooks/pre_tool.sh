#!/usr/bin/env bash
# hooks/pre_tool.sh — Claude Code pre_tool hook
# POSTs pre_tool event to claude-loom daemon. Fail-silent.

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
PAYLOAD=$(cat <<EOF
{
  "sessionId": "$SESSION_ID",
  "eventType": "pre_tool",
  "toolName": "$TOOL_NAME",
  "payload": {"timestamp": $(date +%s%3N)}
}
EOF
)
post_event "$PAYLOAD"
