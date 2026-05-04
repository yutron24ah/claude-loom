#!/usr/bin/env bash
# skills/loom-ui-smoke/scripts/start-servers.sh
# hybrid Option C — SPEC §3.6.11.7
#
# Port detect + auto-start補助 for loom-ui-smoke skill.
# WHY: SPEC §3.6.11.7 では既起動を流用し、未起動時のみ --auto-start で
# background 起動するハイブリッド方式を採用。CI で重い実 server 起動を
# optional とし、既存 dev session との共存を保つ。

set -uo pipefail
# Note: -e は使わない。exit code チェックを明示的に行うため

# ============================================================
# Constants (§3.6.10 SSoT — リテラル直書き回避)
# ============================================================

readonly STATUS_REUSING="REUSING_EXISTING"
readonly STATUS_STARTED="STARTED"

readonly FLAG_AUTO_START="--auto-start"
readonly FLAG_CLEANUP_ONLY="--cleanup-only"
readonly FLAG_QUIET="--quiet"

# Exit codes
readonly EXIT_SUCCESS=0
readonly EXIT_NO_SERVER=1      # 未起動 + flag なし
readonly EXIT_START_FAILED=2   # auto-start 失敗
readonly EXIT_INVALID_ARGS=3   # 不正引数

# Default ports (override via env)
LOOM_DAEMON_PORT="${LOOM_DAEMON_PORT:-5757}"
LOOM_UI_PORT="${LOOM_UI_PORT:-5173}"

# Log dir for background process output (override via env)
LOOM_DEV_LOG_DIR="${LOOM_DEV_LOG_DIR:-/tmp/loom-ui-smoke-logs}"

# auto-start ready wait timeout (seconds)
readonly READY_TIMEOUT=30

# ============================================================
# Argument parsing
# ============================================================

AUTO_START=false
CLEANUP_ONLY=false
QUIET=false

for arg in "$@"; do
  case "$arg" in
    "$FLAG_AUTO_START")
      AUTO_START=true
      ;;
    "$FLAG_CLEANUP_ONLY")
      CLEANUP_ONLY=true
      ;;
    "$FLAG_QUIET")
      QUIET=true
      ;;
    -*)
      printf 'ERROR: unknown flag: %s\n' "$arg" >&2
      printf 'Usage: %s [%s] [%s] [%s]\n' \
        "$(basename "$0")" "$FLAG_AUTO_START" "$FLAG_CLEANUP_ONLY" "$FLAG_QUIET" >&2
      exit "$EXIT_INVALID_ARGS"
      ;;
    *)
      printf 'ERROR: unexpected argument: %s\n' "$arg" >&2
      exit "$EXIT_INVALID_ARGS"
      ;;
  esac
done

# ============================================================
# Helper functions
# ============================================================

log() {
  # Print to stdout unless --quiet is active
  if [ "$QUIET" = "false" ]; then
    printf '%s\n' "$1"
  fi
}

log_err() {
  printf '%s\n' "$1" >&2
}

# port_listening <port>
# Returns 0 if something is listening on <port> (IPv4 or IPv6), 1 otherwise.
# WHY: smoke test で IPv6 only listen が観測されているため両方 check する。
port_listening() {
  local port="$1"
  # lsof -t: PID のみ出力。-iTCP:<port> -sTCP:LISTEN で listen 中のものを絞り込む
  if lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -1 | grep -q .; then
    return 0
  fi
  return 1
}

# ============================================================
# Cleanup mode
# ============================================================

cleanup_servers() {
  local daemon_pid_file="$LOOM_DEV_LOG_DIR/daemon.pid"
  local ui_pid_file="$LOOM_DEV_LOG_DIR/ui.pid"

  # Kill from PID files first
  for pid_file in "$daemon_pid_file" "$ui_pid_file"; do
    if [ -f "$pid_file" ]; then
      local pid
      pid=$(cat "$pid_file" 2>/dev/null || true)
      if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null || true
        log "stopped process $pid (from $pid_file)"
      fi
      rm -f "$pid_file"
    fi
  done

  # Fallback: kill by port (idempotent)
  local daemon_pids ui_pids
  daemon_pids=$(lsof -tiTCP:"$LOOM_DAEMON_PORT" -sTCP:LISTEN 2>/dev/null || true)
  ui_pids=$(lsof -tiTCP:"$LOOM_UI_PORT" -sTCP:LISTEN 2>/dev/null || true)

  if [ -n "$daemon_pids" ]; then
    printf '%s\n' "$daemon_pids" | xargs kill 2>/dev/null || true
    log "killed daemon port $LOOM_DAEMON_PORT listeners"
  fi
  if [ -n "$ui_pids" ]; then
    printf '%s\n' "$ui_pids" | xargs kill 2>/dev/null || true
    log "killed ui port $LOOM_UI_PORT listeners"
  fi

  # Cleanup log dir (best effort — idempotent)
  if [ -d "$LOOM_DEV_LOG_DIR" ]; then
    rm -f "$LOOM_DEV_LOG_DIR/daemon.log" \
          "$LOOM_DEV_LOG_DIR/ui.log" \
          "$LOOM_DEV_LOG_DIR/daemon.pid" \
          "$LOOM_DEV_LOG_DIR/ui.pid" 2>/dev/null || true
  fi

  return "$EXIT_SUCCESS"
}

# ============================================================
# Cleanup-only mode (idempotent)
# ============================================================

if [ "$CLEANUP_ONLY" = "true" ]; then
  cleanup_servers
  exit "$EXIT_SUCCESS"
fi

# ============================================================
# Port detect
# ============================================================

daemon_up=false
ui_up=false

if port_listening "$LOOM_DAEMON_PORT"; then
  daemon_up=true
fi
if port_listening "$LOOM_UI_PORT"; then
  ui_up=true
fi

# Both servers already running → reuse
if [ "$daemon_up" = "true" ] && [ "$ui_up" = "true" ]; then
  log "$STATUS_REUSING"
  exit "$EXIT_SUCCESS"
fi

# ============================================================
# Not running + no --auto-start → prompt user
# ============================================================

if [ "$AUTO_START" = "false" ]; then
  log_err "dev server 未起動: daemon port=$LOOM_DAEMON_PORT (up=$daemon_up), ui port=$LOOM_UI_PORT (up=$ui_up)"
  log_err "  $FLAG_AUTO_START flag を指定するか、手動起動 (pnpm --filter @claude-loom/{daemon,ui} dev) してください"
  exit "$EXIT_NO_SERVER"
fi

# ============================================================
# Auto-start: background 起動
# ============================================================

# Prepare log dir
mkdir -p "$LOOM_DEV_LOG_DIR" || {
  log_err "ERROR: failed to create log dir: $LOOM_DEV_LOG_DIR"
  exit "$EXIT_START_FAILED"
}

log "auto-starting dev servers (daemon port=$LOOM_DAEMON_PORT, ui port=$LOOM_UI_PORT)"
log "logs: $LOOM_DEV_LOG_DIR"

# Start daemon
if [ "$daemon_up" = "false" ]; then
  # WHY: nohup + & で親 shell から切り離し。PORT env で port override 対応。
  nohup pnpm --filter "@claude-loom/daemon" dev \
    > "$LOOM_DEV_LOG_DIR/daemon.log" 2>&1 &
  daemon_bg_pid=$!
  printf '%s\n' "$daemon_bg_pid" > "$LOOM_DEV_LOG_DIR/daemon.pid"
  log "daemon started (pid=$daemon_bg_pid)"
fi

# Start ui
if [ "$ui_up" = "false" ]; then
  nohup pnpm --filter "@claude-loom/ui" dev \
    > "$LOOM_DEV_LOG_DIR/ui.log" 2>&1 &
  ui_bg_pid=$!
  printf '%s\n' "$ui_bg_pid" > "$LOOM_DEV_LOG_DIR/ui.pid"
  log "ui started (pid=$ui_bg_pid)"
fi

# ============================================================
# Ready wait loop (30s timeout, check every 1s)
# ============================================================

log "waiting for servers to be ready (timeout=${READY_TIMEOUT}s)..."

elapsed=0
daemon_ready=false
ui_ready=false

# If already up before auto-start, mark as ready immediately
if [ "$daemon_up" = "true" ]; then
  daemon_ready=true
fi
if [ "$ui_up" = "true" ]; then
  ui_ready=true
fi

while [ "$elapsed" -lt "$READY_TIMEOUT" ]; do
  # Check daemon: health endpoint first, then port listen fallback
  if [ "$daemon_ready" = "false" ]; then
    if curl -sf "http://127.0.0.1:${LOOM_DAEMON_PORT}/health" >/dev/null 2>&1 \
       || curl -sf "http://localhost:${LOOM_DAEMON_PORT}/health" >/dev/null 2>&1 \
       || port_listening "$LOOM_DAEMON_PORT"; then
      daemon_ready=true
      log "daemon ready (${elapsed}s)"
    fi
  fi

  # Check ui: port listen (Vite does not have a /health endpoint by default)
  if [ "$ui_ready" = "false" ]; then
    if port_listening "$LOOM_UI_PORT"; then
      ui_ready=true
      log "ui ready (${elapsed}s)"
    fi
  fi

  if [ "$daemon_ready" = "true" ] && [ "$ui_ready" = "true" ]; then
    log "$STATUS_STARTED"
    exit "$EXIT_SUCCESS"
  fi

  sleep 1
  elapsed=$((elapsed + 1))
done

# Timeout
log_err "ERROR: servers did not become ready within ${READY_TIMEOUT}s"
log_err "  daemon ready=$daemon_ready (port=$LOOM_DAEMON_PORT)"
log_err "  ui ready=$ui_ready (port=$LOOM_UI_PORT)"
log_err "  daemon log: $LOOM_DEV_LOG_DIR/daemon.log"
log_err "  ui log: $LOOM_DEV_LOG_DIR/ui.log"
exit "$EXIT_START_FAILED"
