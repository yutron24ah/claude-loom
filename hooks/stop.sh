#!/usr/bin/env bash
# hooks/stop.sh — Claude Code stop hook
# POSTs stop event to claude-loom daemon. Fail-silent.

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
S_ESC=$(json_escape "$SESSION_ID")
TS=$(ts_ms)
PAYLOAD='{"sessionId":'"$S_ESC"',"eventType":"stop","toolName":null,"payload":{"timestamp":'"$TS"'}}'
post_event "$PAYLOAD"
