#!/usr/bin/env bash
# hooks/loom-launch-ui.sh — cross-platform browser open helper (SPEC §3.2)
#
# Responsibilities (step 2-5 of §3.2 lazy daemon flow):
#   2. health-check: curl http://127.0.0.1:5757/health
#   3. cold start: nohup daemon bg, PID file
#   4. cold-start-ONLY browser open (warm = health-check only, no open)
#   5. headless detection: SSH_CONNECTION / DISPLAY / no browser cmd → URL stdout
#
# WHY set -uo instead of set -euo: fail-silent principle — bash hook must never
# exit non-zero and block Claude Code. Unset-var guard still active via -u, but
# -e is omitted so curl/daemon failures do not propagate as fatal errors.
set -uo pipefail

# ── cwd gate (retro 2026-05-06-002 F-USER-003 由来) ───────────────────────────
# 非 loom PJ で session_start hook 経由で本 script が呼ばれた場合、.claude-loom/
# 不在 → silent skip。slash command 経由 invoke でも cwd != loom PJ なら no-op。
# LOOM_FORCE_LAUNCH=1 で gate を bypass 可能 (test fixture / 手動 launch 用)。
if [ "${LOOM_FORCE_LAUNCH:-0}" != "1" ] && [ ! -d "${PWD:-/}/.claude-loom" ]; then
  exit 0
fi

# ── Constants ─────────────────────────────────────────────────────────────────
UI_URL="http://127.0.0.1:5757"
DAEMON_URL="${LOOM_DAEMON_URL:-http://127.0.0.1:5757}"
DAEMON_BIN="${LOOM_DAEMON_BIN:-$HOME/.claude-loom/daemon.js}"
PID_FILE="${LOOM_PID_FILE:-$HOME/.claude-loom/daemon.pid}"
# LOOM_NODE_CMD: override for test mocking (default: node)
NODE_CMD="${LOOM_NODE_CMD:-node}"
# LOOM_BROWSER_CMD_OVERRIDE: override for test mocking (default: auto-detect)
BROWSER_OVERRIDE="${LOOM_BROWSER_CMD_OVERRIDE:-}"
# LOOM_VITE_URL: override for test mocking of Vite dev server (default: :5173)
VITE_URL="${LOOM_VITE_URL:-http://127.0.0.1:5173}"

# ── Logging helpers (stderr only — stdout reserved for URL) ───────────────────
log_warn() { echo "[loom-launch-ui] WARN: $*" >&2; }
log_info() { echo "[loom-launch-ui] $*" >&2; }

# ── health_check: returns 0 if daemon responds, 1 otherwise ───────────────────
health_check() {
  curl -sf --max-time 2 "${DAEMON_URL}/health" >/dev/null 2>&1
}

# ── probe_daemon_mode: echoes "dev", "prod", or "" on failure ─────────────────
# WHY: /mode endpoint was added in M0.X-startup-recovery (SPEC §3.2.1/§3.2.2).
# Parses the JSON response with python3 if available, falls back to grep.
# Returns "" on any failure — caller treats as fallback to existing behavior.
probe_daemon_mode() {
  local response
  response="$(curl -sf --max-time 2 "${DAEMON_URL}/mode" 2>/dev/null)" || {
    echo ""
    return
  }
  # Prefer python3 for robust JSON parse; grep as workaround per SPEC §3.2.2 note
  if command -v python3 >/dev/null 2>&1; then
    python3 -c "
import json, sys
try:
    d = json.loads(sys.argv[1])
    print(d.get('mode', ''))
except Exception:
    print('')
" "$response" 2>/dev/null || echo ""
  else
    # Grep workaround: extract "mode":"<value>"
    echo "$response" | grep -o '"mode":"[^"]*"' | head -1 | grep -o '"[^"]*"$' | tr -d '"' || echo ""
  fi
}

# ── vite_health_check: returns 0 if Vite dev server responds, 1 otherwise ────
vite_health_check() {
  curl -sf --max-time 2 "${VITE_URL}" >/dev/null 2>&1
}

# ── open_browser_at: calls browser cmd or prints URL if headless ──────────────
# Like open_browser but accepts an explicit URL argument.
open_browser_at() {
  local url="$1"
  # Always print URL to stdout (pipe / clipboard friendly)
  echo "$url"

  # Headless check gates all browser invocations (including overrides)
  if is_headless; then
    log_info "Headless environment detected — open $url in your browser"
    return
  fi

  local browser_cmd
  browser_cmd="$(resolve_browser_cmd)"

  if [ -z "$browser_cmd" ]; then
    log_info "No browser command found — open $url in your browser"
    return
  fi

  # shellcheck disable=SC2086
  $browser_cmd "$url" >/dev/null 2>&1 || true
}

# ── resolve_browser_cmd: echoes the browser open command, or "" if none found ─
# Headless detection is handled by is_headless() before this is called.
resolve_browser_cmd() {
  # Explicit test override takes priority (already gated by is_headless caller)
  if [ -n "$BROWSER_OVERRIDE" ]; then
    echo "$BROWSER_OVERRIDE"
    return
  fi

  # Try platform commands in order: macOS → Linux → WSL/Windows
  if command -v open >/dev/null 2>&1; then
    echo "open"
    return
  fi
  if command -v xdg-open >/dev/null 2>&1; then
    echo "xdg-open"
    return
  fi
  if command -v cmd.exe >/dev/null 2>&1; then
    echo "cmd.exe /c start"
    return
  fi

  # No browser command found
  echo ""
}

# ── is_headless: returns 0 if headless environment, 1 otherwise ──────────────
# WHY: headless check is separate from browser resolution so it can gate
# even the LOOM_BROWSER_CMD_OVERRIDE (test mock) path — SSH_CONNECTION must
# always win over any override.
is_headless() {
  [ -n "${SSH_CONNECTION:-}" ] && return 0
  [ "$(uname -s)" = "Linux" ] && [ -z "${DISPLAY:-}" ] && return 0
  return 1
}

# ── open_browser: calls browser cmd or prints URL if headless ─────────────────
open_browser() {
  # Always print URL to stdout (pipe / clipboard friendly)
  echo "$UI_URL"

  # Headless check gates all browser invocations (including overrides)
  if is_headless; then
    log_info "Headless environment detected — open $UI_URL in your browser"
    return
  fi

  local browser_cmd
  browser_cmd="$(resolve_browser_cmd)"

  if [ -z "$browser_cmd" ]; then
    log_info "No browser command found — open $UI_URL in your browser"
    return
  fi

  # shellcheck disable=SC2086
  $browser_cmd "$UI_URL" >/dev/null 2>&1 || true
}

# ── start_daemon: nohup bg start, PID file record, then port bind verify
# Returns 0 if daemon started AND /health responds within timeout.
# Returns 1 if daemon entry missing or port bind verify fails.
# WHY: nohup success ≠ port bind success. EADDRINUSE / module crash etc.
# silently die without verify → open_browser was being called for
# already-dead daemons → multiple browser tabs spawned (Bug A, retro 2026-05-06-XXX).
# Caller (main) skips open_browser on non-zero return.
start_daemon() {
  if [ ! -f "$DAEMON_BIN" ]; then
    log_warn "Daemon entry not found: $DAEMON_BIN"
    log_warn "UI may not be available. Start daemon manually or reinstall."
    return 1
  fi

  log_info "Cold start: launching daemon..."
  # nohup + bg, redirect to avoid terminal noise
  nohup "$NODE_CMD" "$DAEMON_BIN" \
    >"${TMPDIR:-/tmp}/loom-daemon.log" 2>&1 &
  local pid=$!
  echo "$pid" > "$PID_FILE"
  log_info "Daemon started (PID=$pid, pidfile=$PID_FILE)"

  # NEW: Verify daemon actually bound port and responds to /health.
  # WHY: nohup success ≠ port bind success. EADDRINUSE / module crash etc.
  # silently die without verify → open_browser was being called for
  # already-dead daemons → multiple browser tabs spawned (Bug A, retro 2026-05-06-XXX).
  # env override LOOM_DAEMON_BOOT_MAX_ATTEMPTS for test fixture control (default 5).
  local max_attempts="${LOOM_DAEMON_BOOT_MAX_ATTEMPTS:-5}"
  local i=1
  while [ "$i" -le "$max_attempts" ]; do
    sleep 0.5
    if curl -sf --max-time 1 "${DAEMON_URL}/health" >/dev/null 2>&1; then
      log_info "Daemon health check passed after ${i} attempt(s)"
      return 0
    fi
    i=$((i + 1))
  done

  local timeout_s
  timeout_s=$(echo "$max_attempts * 0.5" | awk '{printf "%.1f", $1}')
  log_warn "Daemon launched (PID=$pid) but failed to respond at $DAEMON_URL within ${timeout_s}s"
  log_warn "Possible causes: EADDRINUSE (port already bound by another process), module crash, or slow init"
  return 1  # caller (main) skips open_browser
}

# ── main ──────────────────────────────────────────────────────────────────────
main() {
  # Respect LOOM_NO_UI=1 override (print URL but skip browser)
  if [ "${LOOM_NO_UI:-}" = "1" ]; then
    log_info "LOOM_NO_UI=1 — skipping browser open"
    echo "$UI_URL"
    return
  fi

  # Warm-start path: daemon already running → probe /mode, branch by mode
  if health_check; then
    log_info "Daemon already running at $DAEMON_URL"
    # WHY: SPEC §3.2.2 dev daemon detection — probe /mode to decide whether to
    # redirect browser to Vite (:5173) instead of the prod daemon (:5757).
    # Failure to parse /mode falls back to existing no-open behavior (fail-silent).
    local daemon_mode
    daemon_mode="$(probe_daemon_mode)"
    if [ "$daemon_mode" = "dev" ]; then
      # Dev daemon detected — check if Vite is up
      if vite_health_check; then
        log_info "Dev daemon detected, Vite running at $VITE_URL — opening dev UI"
        open_browser_at "$VITE_URL"
      else
        # WHY: Vite down means user hasn't started 'pnpm dev' yet in the UI dir.
        # Print warning + Vite URL so user can start it manually (SPEC §3.2.2 step 4).
        log_warn "Dev daemon detected but Vite not responding at $VITE_URL"
        log_warn "Start Vite with: pnpm --filter @claude-loom/ui dev"
        echo "$VITE_URL"
      fi
    fi
    # mode=prod or mode='' (probe fail) → existing behavior: warm, no browser open
    return
  fi

  # Cold-start path: daemon not responding
  # WHY: if daemon entry missing, print URL + return without browser open
  if ! start_daemon; then
    echo "$UI_URL"
    return
  fi

  # Only open browser on cold start (SPEC §3.2 step 4)
  open_browser
}

# Guard against -e propagating outside main (fail-silent)
main || true
