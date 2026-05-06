#!/usr/bin/env bash
# tests/daemon_runtime_mode_test.sh — daemon runtime mode integrated E2E test
#
# REQ-054: daemon_runtime_mode_test covers 3 boot scenarios for /mode endpoint:
#   1. prod mode (LOOM_ENTRY=lazy-launch): /mode → mode=prod, entry=lazy-launch,
#      ui_serving=<true if ui/dist exists>, / → 200 + HTML (or 404 if no dist)
#   2. dev mode (LOOM_DEV_MODE=1 LOOM_ENTRY=pnpm-dev): /mode → mode=dev,
#      entry=pnpm-dev, ui_serving=false, / → 404 (static skip confirmed)
#   3. manual mode (no env): /mode → mode=prod, entry=manual
#   Each scenario starts daemon on a dedicated test port (15870–15872) to avoid
#   colliding with any running production daemon on :5757 or other test ports
#   (15850–15863 are used by loom_launch_ui_mode_probe / m0x_t5_t6_preflight).
#
# 由来: SPEC §3.2.1 /mode endpoint SSoT + PLAN M0.X-runtime-mode-recovery 完成基準

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DAEMON_DIST="$ROOT_DIR/daemon/dist/server.js"
UI_DIST="$ROOT_DIR/ui/dist"

PASS=0
FAIL=0

pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "--- daemon_runtime_mode_test ---"

# ── Prerequisites ─────────────────────────────────────────────────────────────

# Verify daemon dist is built
if [ ! -f "$DAEMON_DIST" ]; then
  echo "SKIP: daemon/dist/server.js not found — run 'pnpm --filter @claude-loom/daemon build' first"
  exit 0
fi

# Detect ui/dist presence (affects ui_serving in prod mode)
UI_DIST_EXISTS=false
if [ -d "$UI_DIST" ] && [ -f "$UI_DIST/index.html" ]; then
  UI_DIST_EXISTS=true
fi
echo "INFO: ui/dist exists: $UI_DIST_EXISTS"

# Helper: wait for daemon to listen, up to 10 attempts
wait_for_daemon() {
  local port="$1"
  local attempts=0
  while [ "$attempts" -lt 10 ]; do
    if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${port}/health" 2>/dev/null | grep -q "200"; then
      return 0
    fi
    sleep 0.5
    attempts=$((attempts + 1))
  done
  return 1
}

# Helper: start daemon with given env vars on given port, return PID in DAEMON_PID
DAEMON_PID=""
DAEMON_LOG=""
DAEMON_PORT_LAST=""
start_daemon() {
  local port="$1"
  shift
  local log_file pid_file
  log_file="$(mktemp)"
  pid_file="$(mktemp)"
  # WHY: Write PID to file immediately so kill_daemon can always find the
  # real node process even if the shell reports a different PID for the subshell.
  env "$@" LOOM_PORT="$port" node "$DAEMON_DIST" > "$log_file" 2>&1 &
  DAEMON_PID=$!
  DAEMON_LOG="$log_file"
  DAEMON_PORT_LAST="$port"
}

kill_daemon() {
  local port="${DAEMON_PORT_LAST:-}"
  if [ -n "$DAEMON_PID" ] && kill -0 "$DAEMON_PID" 2>/dev/null; then
    kill "$DAEMON_PID" 2>/dev/null || true
    sleep 0.5
  fi
  # Belt-and-suspenders: also kill any node process still listening on the port
  if [ -n "$port" ] && command -v lsof >/dev/null 2>&1; then
    local stale_pids
    stale_pids=$(lsof -ti ":${port}" -sTCP:LISTEN 2>/dev/null || true)
    if [ -n "$stale_pids" ]; then
      kill $stale_pids 2>/dev/null || true
      sleep 0.3
    fi
  fi
  DAEMON_PID=""
  DAEMON_PORT_LAST=""
  rm -f "$DAEMON_LOG" 2>/dev/null || true
  DAEMON_LOG=""
}

# ── Scenario 1: prod mode (LOOM_ENTRY=lazy-launch) ────────────────────────────

echo ""
echo "[Scenario 1] prod mode boot (LOOM_ENTRY=lazy-launch)"
# WHY: ports 15850-15863 are claimed by other test scripts (loom_launch_ui_mode_probe
# and m0x_t5_t6_preflight). Use 15870+ to guarantee no cross-test port collision.
PORT1=15870

start_daemon "$PORT1" LOOM_ENTRY=lazy-launch

if wait_for_daemon "$PORT1"; then
  pass "S1.1: daemon started on port $PORT1 (prod mode)"
else
  fail "S1.1: daemon did not start within 5s (prod mode)"
  echo "--- daemon log ---"
  cat "$DAEMON_LOG" 2>/dev/null || true
  kill_daemon
fi

if [ "$PASS" -ge 1 ] && [ "$FAIL" -eq 0 ] || kill -0 "$DAEMON_PID" 2>/dev/null; then
  # /mode check
  MODE_BODY=$(curl -s "http://127.0.0.1:${PORT1}/mode" 2>/dev/null || echo "")

  if echo "$MODE_BODY" | grep -q '"mode":"prod"'; then
    pass "S1.2: /mode returns mode=prod"
  else
    fail "S1.2: /mode missing mode=prod (got: $MODE_BODY)"
  fi

  if echo "$MODE_BODY" | grep -q '"entry":"lazy-launch"'; then
    pass "S1.3: /mode returns entry=lazy-launch"
  else
    fail "S1.3: /mode missing entry=lazy-launch (got: $MODE_BODY)"
  fi

  # ui_serving check: true only if ui/dist exists
  if [ "$UI_DIST_EXISTS" = "true" ]; then
    if echo "$MODE_BODY" | grep -q '"ui_serving":true'; then
      pass "S1.4: /mode returns ui_serving=true (ui/dist present)"
    else
      fail "S1.4: /mode should return ui_serving=true (ui/dist present, got: $MODE_BODY)"
    fi

    # / should return 200 + HTML when ui/dist exists
    ROOT_STATUS=$(curl -s -o /tmp/daemon-mode-root.html -w "%{http_code}" "http://127.0.0.1:${PORT1}/" 2>/dev/null || echo "000")
    if [ "$ROOT_STATUS" = "200" ]; then
      pass "S1.5: / returns 200 in prod mode with ui/dist"
    else
      fail "S1.5: / returned $ROOT_STATUS (expected 200, prod mode + ui/dist present)"
    fi

    if grep -q -i "html" /tmp/daemon-mode-root.html 2>/dev/null; then
      pass "S1.6: / response body contains HTML"
    else
      fail "S1.6: / response body does not contain HTML"
    fi
  else
    if echo "$MODE_BODY" | grep -q '"ui_serving":false'; then
      pass "S1.4: /mode returns ui_serving=false (no ui/dist)"
    else
      fail "S1.4: /mode should return ui_serving=false (no ui/dist, got: $MODE_BODY)"
    fi
    echo "INFO: S1.5/S1.6 skipped (ui/dist absent, / will not serve HTML in this env)"
  fi
fi

kill_daemon
sleep 0.5

# ── Scenario 2: dev mode (LOOM_DEV_MODE=1 LOOM_ENTRY=pnpm-dev) ───────────────

echo ""
echo "[Scenario 2] dev mode boot (LOOM_DEV_MODE=1 LOOM_ENTRY=pnpm-dev)"
PORT2=15871

start_daemon "$PORT2" LOOM_DEV_MODE=1 LOOM_ENTRY=pnpm-dev

if wait_for_daemon "$PORT2"; then
  pass "S2.1: daemon started on port $PORT2 (dev mode)"
else
  fail "S2.1: daemon did not start within 5s (dev mode)"
  echo "--- daemon log ---"
  cat "$DAEMON_LOG" 2>/dev/null || true
  kill_daemon
fi

if kill -0 "$DAEMON_PID" 2>/dev/null; then
  MODE_BODY2=$(curl -s "http://127.0.0.1:${PORT2}/mode" 2>/dev/null || echo "")

  if echo "$MODE_BODY2" | grep -q '"mode":"dev"'; then
    pass "S2.2: /mode returns mode=dev"
  else
    fail "S2.2: /mode missing mode=dev (got: $MODE_BODY2)"
  fi

  if echo "$MODE_BODY2" | grep -q '"entry":"pnpm-dev"'; then
    pass "S2.3: /mode returns entry=pnpm-dev"
  else
    fail "S2.3: /mode missing entry=pnpm-dev (got: $MODE_BODY2)"
  fi

  # dev mode: ui_serving must always be false
  if echo "$MODE_BODY2" | grep -q '"ui_serving":false'; then
    pass "S2.4: /mode returns ui_serving=false in dev mode"
  else
    fail "S2.4: /mode should return ui_serving=false in dev mode (got: $MODE_BODY2)"
  fi

  # dev mode: / should return 404 (static serving skipped)
  ROOT_STATUS2=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT2}/" 2>/dev/null || echo "000")
  if [ "$ROOT_STATUS2" = "404" ]; then
    pass "S2.5: / returns 404 in dev mode (static serving skip confirmed)"
  else
    fail "S2.5: / returned $ROOT_STATUS2 (expected 404, dev mode should skip static)"
  fi
fi

kill_daemon
sleep 0.5

# ── Scenario 3: manual mode (no env vars) ─────────────────────────────────────

echo ""
echo "[Scenario 3] manual mode boot (no LOOM_DEV_MODE, no LOOM_ENTRY)"
PORT3=15872

start_daemon "$PORT3"

if wait_for_daemon "$PORT3"; then
  pass "S3.1: daemon started on port $PORT3 (manual mode)"
else
  fail "S3.1: daemon did not start within 5s (manual mode)"
  echo "--- daemon log ---"
  cat "$DAEMON_LOG" 2>/dev/null || true
  kill_daemon
fi

if kill -0 "$DAEMON_PID" 2>/dev/null; then
  MODE_BODY3=$(curl -s "http://127.0.0.1:${PORT3}/mode" 2>/dev/null || echo "")

  if echo "$MODE_BODY3" | grep -q '"mode":"prod"'; then
    pass "S3.2: /mode returns mode=prod (no LOOM_DEV_MODE = prod default)"
  else
    fail "S3.2: /mode missing mode=prod (got: $MODE_BODY3)"
  fi

  if echo "$MODE_BODY3" | grep -q '"entry":"manual"'; then
    pass "S3.3: /mode returns entry=manual (no LOOM_ENTRY = manual default)"
  else
    fail "S3.3: /mode missing entry=manual (got: $MODE_BODY3)"
  fi

  # /mode must include all 6 required fields per SPEC §3.2.1
  REQUIRED_FIELDS="mode entry version started_at pid ui_serving"
  ALL_FIELDS_OK=true
  for field in $REQUIRED_FIELDS; do
    if ! echo "$MODE_BODY3" | grep -q "\"${field}\""; then
      fail "S3.4: /mode response missing required field: $field"
      ALL_FIELDS_OK=false
    fi
  done
  if [ "$ALL_FIELDS_OK" = "true" ]; then
    pass "S3.4: /mode response contains all 6 required fields (SPEC §3.2.1)"
  fi
fi

kill_daemon
sleep 0.5

# ── Final summary ─────────────────────────────────────────────────────────────

echo ""
echo "daemon_runtime_mode_test: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
