#!/usr/bin/env bash
# hooks/loom-stop.sh — /loom-stop slash command hook
#
# Usage:
#   bash hooks/loom-stop.sh           # graceful shutdown of live daemon only (既存挙動)
#   bash hooks/loom-stop.sh --all     # kill daemon + tsx watch zombies + manual node launches
#
# --all semantics (best-effort, always exits 0):
#   1. POST /shutdown to live daemon (graceful)
#   2. Kill PID from ~/.claude-loom/daemon.pid (stale detection)
#   3. Kill tsx watch zombies (pgrep -f "tsx.*server\.ts")
#   4. Kill manual node launches (pgrep -f "node.*\.claude-loom/daemon\.js")
#   5. Report killed / not-found lists to stdout
#
# LOOM_TEST_ZOMBIE_PIDS: テスト専用 override (space-separated PIDs to kill instead of pgrep)

set -uo pipefail  # -e を外す（kill 失敗で script を止めない）

LOOM_DAEMON_URL="${LOOM_DAEMON_URL:-http://127.0.0.1:5757}"
LOOM_TOKEN_FILE="${LOOM_TOKEN_FILE:-$HOME/.claude-loom/daemon-token}"
LOOM_PID_FILE="${LOOM_PID_FILE:-$HOME/.claude-loom/daemon.pid}"

LOOM_TOKEN=""
if [ -r "$LOOM_TOKEN_FILE" ]; then
  LOOM_TOKEN="$(cat "$LOOM_TOKEN_FILE" 2>/dev/null || echo "")"
fi

ALL_MODE=false
if [ "${1:-}" = "--all" ]; then
  ALL_MODE=true
fi

# --- graceful shutdown via /shutdown endpoint ---
try_graceful_shutdown() {
  curl -sS -X POST "$LOOM_DAEMON_URL/shutdown" \
    -H "Content-Type: application/json" \
    -H "x-loom-token: $LOOM_TOKEN" \
    --max-time 3 \
    >/dev/null 2>&1
}

# --- graceful stop (既存 TERM signal path) ---
try_pid_file_kill() {
  local pid_file="$1"
  if [ ! -f "$pid_file" ]; then
    return 1  # pid file 無し
  fi
  local pid
  pid="$(cat "$pid_file" 2>/dev/null || echo "")"
  if [ -z "$pid" ]; then
    return 1
  fi
  if ! kill -0 "$pid" 2>/dev/null; then
    return 1  # stale pid (process 不在)
  fi
  kill -TERM "$pid" 2>/dev/null || true
  return 0
}

# ======================================================
# 引数なし: 既存挙動 (graceful shutdown 1 daemon, fail-silent)
# ======================================================
if [ "$ALL_MODE" = false ]; then
  # 1. /shutdown endpoint 試行
  if try_graceful_shutdown; then
    exit 0
  fi
  # 2. PID file fallback
  if try_pid_file_kill "$LOOM_PID_FILE"; then
    exit 0
  fi
  # 3. graceful shutdown 失敗でも exit 0 (fail-silent)
  exit 0
fi

# ======================================================
# --all モード: zombie 含む全プロセス cleanup
# ======================================================

killed_pids=()
not_found=()

# (1) graceful shutdown to live daemon via /shutdown
if try_graceful_shutdown; then
  echo "[loom-stop --all] daemon: graceful shutdown OK (POST /shutdown)"
else
  echo "[loom-stop --all] daemon: /shutdown not responding (daemon may not be running)"
fi

# (2) PID file の stale PID を kill
if [ -f "$LOOM_PID_FILE" ]; then
  stale_pid="$(cat "$LOOM_PID_FILE" 2>/dev/null || echo "")"
  if [ -n "$stale_pid" ]; then
    if kill -0 "$stale_pid" 2>/dev/null; then
      if kill -TERM "$stale_pid" 2>/dev/null; then
        echo "[loom-stop --all] daemon.pid: killed PID $stale_pid"
        killed_pids+=("$stale_pid")
      else
        echo "[loom-stop --all] daemon.pid: failed to kill PID $stale_pid"
      fi
    else
      echo "[loom-stop --all] daemon.pid: PID $stale_pid not found (stale)"
      not_found+=("daemon.pid:$stale_pid")
    fi
  else
    echo "[loom-stop --all] daemon.pid: empty or unreadable"
  fi
else
  echo "[loom-stop --all] daemon.pid: file not found"
  not_found+=("daemon.pid")
fi

# (3) tsx watch zombies を kill
# LOOM_TEST_ZOMBIE_PIDS で override 可能 (テスト専用)
if [ -n "${LOOM_TEST_ZOMBIE_PIDS:-}" ]; then
  # test mode: 指定 PIDs を直接 kill
  for zpid in $LOOM_TEST_ZOMBIE_PIDS; do
    if kill -0 "$zpid" 2>/dev/null; then
      if kill -TERM "$zpid" 2>/dev/null; then
        # SIGTERM 後に少し待って SIGKILL fallback
        sleep 0.1
        if kill -0 "$zpid" 2>/dev/null; then
          kill -KILL "$zpid" 2>/dev/null || true
        fi
        echo "[loom-stop --all] tsx-zombie(test): killed PID $zpid"
        killed_pids+=("$zpid")
      else
        echo "[loom-stop --all] tsx-zombie(test): failed to kill PID $zpid"
      fi
    else
      echo "[loom-stop --all] tsx-zombie(test): PID $zpid not found"
      not_found+=("tsx-zombie:$zpid")
    fi
  done
else
  # 本番: pgrep で tsx watch process を検索
  tsx_pids="$(pgrep -f "tsx.*server\.ts" 2>/dev/null || true)"
  if [ -n "$tsx_pids" ]; then
    while IFS= read -r pid; do
      [ -z "$pid" ] && continue
      if kill -TERM "$pid" 2>/dev/null; then
        echo "[loom-stop --all] tsx-zombie: killed PID $pid"
        killed_pids+=("$pid")
      else
        echo "[loom-stop --all] tsx-zombie: failed to kill PID $pid"
      fi
    done <<< "$tsx_pids"
  else
    echo "[loom-stop --all] tsx-zombie: no processes found"
    not_found+=("tsx-zombie")
  fi
fi

# (4) manual node launch を kill
node_pids="$(pgrep -f "node.*\.claude-loom/daemon\.js" 2>/dev/null || true)"
if [ -n "$node_pids" ]; then
  while IFS= read -r pid; do
    [ -z "$pid" ] && continue
    if kill -TERM "$pid" 2>/dev/null; then
      echo "[loom-stop --all] node-daemon: killed PID $pid"
      killed_pids+=("$pid")
    else
      echo "[loom-stop --all] node-daemon: failed to kill PID $pid"
    fi
  done <<< "$node_pids"
else
  echo "[loom-stop --all] node-daemon: no processes found"
  not_found+=("node-daemon")
fi

# (5) summary report
echo "---"
if [ "${#killed_pids[@]}" -gt 0 ]; then
  echo "[loom-stop --all] killed: ${killed_pids[*]}"
else
  echo "[loom-stop --all] killed: nothing"
fi

if [ "${#not_found[@]}" -gt 0 ]; then
  echo "[loom-stop --all] not found: ${not_found[*]}"
else
  echo "[loom-stop --all] not found: none (clean)"
fi

# best-effort: always exit 0
exit 0
