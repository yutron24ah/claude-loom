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

# ── Constants ─────────────────────────────────────────────────────────────────
UI_URL="http://127.0.0.1:5757"
DAEMON_URL="${LOOM_DAEMON_URL:-http://127.0.0.1:5757}"
DAEMON_BIN="${LOOM_DAEMON_BIN:-$HOME/.claude-loom/daemon.js}"
PID_FILE="${LOOM_PID_FILE:-$HOME/.claude-loom/daemon.pid}"
# LOOM_NODE_CMD: override for test mocking (default: node)
NODE_CMD="${LOOM_NODE_CMD:-node}"
# LOOM_BROWSER_CMD_OVERRIDE: override for test mocking (default: auto-detect)
BROWSER_OVERRIDE="${LOOM_BROWSER_CMD_OVERRIDE:-}"

# ── Logging helpers (stderr only — stdout reserved for URL) ───────────────────
log_warn() { echo "[loom-launch-ui] WARN: $*" >&2; }
log_info() { echo "[loom-launch-ui] $*" >&2; }

# ── health_check: returns 0 if daemon responds, 1 otherwise ───────────────────
health_check() {
  curl -sf --max-time 2 "${DAEMON_URL}/health" >/dev/null 2>&1
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

# ── start_daemon: nohup bg start, PID file record
# Returns 0 on success, 1 if daemon entry missing (caller skips browser open).
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
  return 0
}

# ── main ──────────────────────────────────────────────────────────────────────
main() {
  # Respect LOOM_NO_UI=1 override (print URL but skip browser)
  if [ "${LOOM_NO_UI:-}" = "1" ]; then
    log_info "LOOM_NO_UI=1 — skipping browser open"
    echo "$UI_URL"
    return
  fi

  # Warm-start path: daemon already running → health-check only, no browser open
  if health_check; then
    log_info "Daemon already running at $DAEMON_URL"
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
