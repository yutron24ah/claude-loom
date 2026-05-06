#!/usr/bin/env bash
# tests/loom_launch_ui_bug_a_test.sh — TDD tests for Bug A fix in hooks/loom-launch-ui.sh
#
# REQ-055: start_daemon() must verify port bind success via /health polling before
# returning exit 0. If polling times out (daemon died after nohup), return exit 1
# so main() skips open_browser. Bug A scenario: nohup success ≠ port bind success.
#
# WHY: start_daemon() was returning exit 0 unconditionally after nohup, causing
# open_browser to be called even when the daemon process died immediately
# (e.g., EADDRINUSE crash). Combined with Bug B (POST /event spam false health
# timeout), this produced repeated cold-start triggers → browser tab spam.
# (retro 2026-05-06-XXX)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/hooks/loom-launch-ui.sh"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

PYTHON_BIN=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
fi

echo "--- loom_launch_ui_bug_a_test ---"

PASS=0
FAIL=0

pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

# ── helper: reset shared state between sub-tests ──────────────────────────────
reset_env() {
  unset LOOM_NO_UI                     2>/dev/null || true
  unset SSH_CONNECTION                 2>/dev/null || true
  unset DISPLAY                        2>/dev/null || true
  unset LOOM_BROWSER_CMD_OVERRIDE      2>/dev/null || true
  unset LOOM_DAEMON_BIN                2>/dev/null || true
  unset LOOM_DAEMON_URL                2>/dev/null || true
  unset LOOM_PID_FILE                  2>/dev/null || true
  unset LOOM_NODE_CMD                  2>/dev/null || true
  unset LOOM_FORCE_LAUNCH              2>/dev/null || true
  unset LOOM_DAEMON_BOOT_MAX_ATTEMPTS  2>/dev/null || true
  unset CALL_LOG_PATH                  2>/dev/null || true
}

# ─────────────────────────────────────────────────────────────────────────────
# Test A: daemon immediately dies after nohup (port bind fails) → exit 0 + no browser
#
# Scenario: LOOM_DAEMON_BIN points to a real file (exists check passes).
# LOOM_NODE_CMD points to a script that exits immediately (daemon dies at once).
# Daemon URL points to a port no process is listening on (polling will timeout).
# Expected: start_daemon returns non-zero (or main skips open_browser).
# Expected: open_browser mock is NOT called.
# WHY: Without Bug A fix, start_daemon returns 0 unconditionally → open_browser
# is called even though daemon is dead → browser tab spam.
# ─────────────────────────────────────────────────────────────────────────────

CALL_LOG_A="$TMP_DIR/callA.log"
FAKE_OPEN_A="$TMP_DIR/fake_openA.sh"
cat > "$FAKE_OPEN_A" <<'EOF'
#!/usr/bin/env bash
echo "OPENED: $@" >> "$CALL_LOG_PATH"
EOF
chmod +x "$FAKE_OPEN_A"

# Fake node: exits immediately (simulates daemon crash / EADDRINUSE die)
FAKE_NODE_A="$TMP_DIR/fake_nodeA.sh"
cat > "$FAKE_NODE_A" <<'EOF'
#!/usr/bin/env bash
# Simulates a daemon that dies immediately after nohup
# (e.g., EADDRINUSE or module crash)
exit 1
EOF
chmod +x "$FAKE_NODE_A"

# Fake daemon binary (must exist so the [ -f "$DAEMON_BIN" ] check passes)
FAKE_DAEMON_A="$TMP_DIR/fake_daemonA.js"
echo "// fake" > "$FAKE_DAEMON_A"

# Use a port that nothing is listening on (not the real daemon's port)
BUG_A_PORT=15880

export CALL_LOG_PATH="$CALL_LOG_A"
export LOOM_BROWSER_CMD_OVERRIDE="$FAKE_OPEN_A"
export LOOM_DAEMON_URL="http://127.0.0.1:$BUG_A_PORT"
export LOOM_DAEMON_BIN="$FAKE_DAEMON_A"
export LOOM_PID_FILE="$TMP_DIR/daemonA.pid"
export LOOM_NODE_CMD="$FAKE_NODE_A"
export LOOM_FORCE_LAUNCH="1"
# Use minimal attempts to keep test fast (2 × 0.5s = 1s max wait)
export LOOM_DAEMON_BOOT_MAX_ATTEMPTS="2"

bash "$SCRIPT" 2>/dev/null || true

if [ -f "$CALL_LOG_A" ] && grep -q "OPENED:" "$CALL_LOG_A" 2>/dev/null; then
  fail "Bug A regression: open_browser called for dead daemon (port bind verify missing)"
else
  pass "Bug A fix: open_browser NOT called when daemon dies after nohup (port verify timeout)"
fi

reset_env

# ─────────────────────────────────────────────────────────────────────────────
# Test B: fake_node itself starts a background health server → start_daemon polling
#         detects it → exit 0 → open_browser called
#
# Regression check: if the daemon successfully binds port and /health returns 200,
# start_daemon should still return 0 and main() should call open_browser.
# WHY: We must not break the happy path where daemon starts normally.
#
# Design: LOOM_DAEMON_URL points to a port that is NOT up when health_check() runs,
# so main() takes the cold-start path. LOOM_NODE_CMD is a fake script that starts
# a background HTTP server (simulating daemon successfully binding the port).
# start_daemon's polling loop then detects the server and returns 0.
# ─────────────────────────────────────────────────────────────────────────────

if [ -z "$PYTHON_BIN" ]; then
  echo "SKIP: Test B requires python3/python for mock server"
else
  CALL_LOG_B="$TMP_DIR/callB.log"
  FAKE_OPEN_B="$TMP_DIR/fake_openB.sh"
  cat > "$FAKE_OPEN_B" <<'EOF2'
#!/usr/bin/env bash
echo "OPENED: $@" >> "$CALL_LOG_PATH"
EOF2
  chmod +x "$FAKE_OPEN_B"

  # Port must NOT be in use before the script runs (so health_check() fails → cold-start)
  BUG_B_PORT=15881

  # Fake daemon bin (must exist for file-exists check)
  FAKE_DAEMON_B="$TMP_DIR/fake_daemonB.js"
  echo "// fake" > "$FAKE_DAEMON_B"

  # Fake node: starts a background HTTP health server to simulate a daemon that
  # successfully binds its port. The server runs in background so the nohup
  # invocation returns immediately, then start_daemon's polling detects it.
  # WHY: This is the closest we can get to "daemon starts and binds port" without
  # a real Node.js daemon. The key correctness property: start_daemon's /health
  # polling must detect a server that appears AFTER nohup returns.
  cat > "$TMP_DIR/fake_nodeB.sh" <<EOFNODE
#!/usr/bin/env bash
# Simulate a daemon that successfully binds the port
$PYTHON_BIN -c "
import http.server, time

class H(http.server.BaseHTTPRequestHandler):
  def do_GET(self):
    self.send_response(200)
    self.end_headers()
    self.wfile.write(b'ok')
  def log_message(self, *a): pass

srv = http.server.HTTPServer(('127.0.0.1', $BUG_B_PORT), H)
srv.timeout = 0.1
for _ in range(60): srv.handle_request()
" &
EOFNODE
  chmod +x "$TMP_DIR/fake_nodeB.sh"

  export CALL_LOG_PATH="$CALL_LOG_B"
  export LOOM_BROWSER_CMD_OVERRIDE="$FAKE_OPEN_B"
  export LOOM_DAEMON_URL="http://127.0.0.1:$BUG_B_PORT"
  export LOOM_DAEMON_BIN="$FAKE_DAEMON_B"
  export LOOM_PID_FILE="$TMP_DIR/daemonB.pid"
  export LOOM_NODE_CMD="$TMP_DIR/fake_nodeB.sh"
  export LOOM_FORCE_LAUNCH="1"
  export LOOM_DAEMON_BOOT_MAX_ATTEMPTS="5"

  bash "$SCRIPT" 2>/dev/null || true

  # Clean up any python server started by fake_node
  pkill -f "HTTPServer.*$BUG_B_PORT" 2>/dev/null || true

  if [ -f "$CALL_LOG_B" ] && grep -q "OPENED:" "$CALL_LOG_B" 2>/dev/null; then
    pass "Bug A fix regression: open_browser called when daemon /health responds (happy path OK)"
  else
    fail "Bug A fix regression: open_browser NOT called even though daemon /health responded"
  fi

  reset_env
fi

# ─────────────────────────────────────────────────────────────────────────────
# Test C: LOOM_DAEMON_BOOT_MAX_ATTEMPTS env override controls attempt count
#
# Verify that the env override variable actually limits polling attempts.
# We set LOOM_DAEMON_BOOT_MAX_ATTEMPTS=1 and measure elapsed time — must be
# under 2 seconds (1 attempt × 0.5s sleep = 0.5s max, much less than default 2.5s).
# WHY: test fixtures need fast timeout control to avoid slow CI runs.
# ─────────────────────────────────────────────────────────────────────────────

FAKE_DAEMON_C="$TMP_DIR/fake_daemonC.js"
echo "// fake" > "$FAKE_DAEMON_C"

FAKE_NODE_C="$TMP_DIR/fake_nodeC.sh"
cat > "$FAKE_NODE_C" <<'EOF4'
#!/usr/bin/env bash
# Daemon that exits immediately (no port bind)
exit 0
EOF4
chmod +x "$FAKE_NODE_C"

BUG_C_PORT=15882

export LOOM_DAEMON_URL="http://127.0.0.1:$BUG_C_PORT"
export LOOM_DAEMON_BIN="$FAKE_DAEMON_C"
export LOOM_PID_FILE="$TMP_DIR/daemonC.pid"
export LOOM_NODE_CMD="$FAKE_NODE_C"
export LOOM_FORCE_LAUNCH="1"
export LOOM_DAEMON_BOOT_MAX_ATTEMPTS="1"
export LOOM_NO_UI="1"  # skip browser open to isolate timing test

START_TIME=$(date +%s)
bash "$SCRIPT" 2>/dev/null || true
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

# With 1 attempt × 0.5s sleep = at most ~1s.
# Default 5 attempts × 0.5s = ~2.5s. So <2s confirms override is effective.
if [ "$ELAPSED" -lt 2 ]; then
  pass "LOOM_DAEMON_BOOT_MAX_ATTEMPTS=1: completed in ${ELAPSED}s (< 2s, override effective)"
else
  fail "LOOM_DAEMON_BOOT_MAX_ATTEMPTS=1: took ${ELAPSED}s (expected < 2s, override may not be working)"
fi

reset_env

# ─────────────────────────────────────────────────────────────────────────────
# Final summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "loom_launch_ui_bug_a_test: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
