#!/usr/bin/env bash
# hooks/session_start.sh — Claude Code session_start hook
# POSTs session_start event to claude-loom daemon. Fail-silent.

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
S_ESC=$(json_escape "$SESSION_ID")
TS=$(date +%s%3N)
PAYLOAD='{"sessionId":'"$S_ESC"',"eventType":"session_start","toolName":null,"payload":{"timestamp":'"$TS"'}}'
post_event "$PAYLOAD"

# ── UI auto-launch (retro 2026-05-06-002 F-USER-003 由来) ─────────────────────
# slash command markdown body の bash invoke は Claude execution priority に
# 依存して確率的に発火せず (M0.11.5 retro F-USER-001 hypothesis 1 root cause)。
# SessionStart hook で正規 trigger 化することで、loom PJ の cwd で session
# 開始した瞬間に lazy daemon + UI auto-launch を guarantee する。
#
# 非 loom PJ では .claude-loom/ 不在ゆえ silent skip (gate)。LOOM_NO_AUTO_UI=1
# で env override 無効化可能 (CI / headless / user opt-out)。
if [ "${LOOM_NO_AUTO_UI:-0}" = "1" ]; then
  exit 0
fi

if [ ! -d "$PWD/.claude-loom" ]; then
  exit 0  # 非 loom PJ、silent skip
fi

LAUNCH_HOOK="${LOOM_LAUNCH_UI_HOOK:-$HOME/.claude/hooks/loom-launch-ui.sh}"
if [ -x "$LAUNCH_HOOK" ]; then
  # background fire-and-forget (session_start を block しない、fail-silent)
  ( "$LAUNCH_HOOK" >/dev/null 2>&1 & ) || true
fi
