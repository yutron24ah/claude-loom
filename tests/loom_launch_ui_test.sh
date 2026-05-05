#!/usr/bin/env bash
# tests/loom_launch_ui_test.sh — TDD tests for hooks/loom-launch-ui.sh
#
# REQ: cross-platform browser open helper per SPEC §3.2
#   - cold-start-only browser open
#   - headless detection + URL stdout fallback
#   - LOOM_NO_UI=1 override
#   - fail-silent (exit 0 always)
#   - daemon entry not found → warning + exit 0

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/hooks/loom-launch-ui.sh"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "--- loom_launch_ui_test ---"

PASS=0
FAIL=0

pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

# ── helper: reset shared state between sub-tests ──────────────────────────────
reset_env() {
  unset LOOM_NO_UI          2>/dev/null || true
  unset SSH_CONNECTION      2>/dev/null || true
  unset DISPLAY             2>/dev/null || true
  unset LOOM_BROWSER_CMD_OVERRIDE 2>/dev/null || true
  unset LOOM_DAEMON_BIN     2>/dev/null || true
  unset LOOM_DAEMON_URL     2>/dev/null || true
  unset LOOM_PID_FILE       2>/dev/null || true
}

# ── 1. script exists + is executable ─────────────────────────────────────────
if [ -f "$SCRIPT" ]; then
  pass "loom-launch-ui.sh exists"
else
  fail "loom-launch-ui.sh not found"
fi

if [ -x "$SCRIPT" ]; then
  pass "loom-launch-ui.sh is executable"
else
  fail "loom-launch-ui.sh is not executable"
fi

# ── 2. syntax check ───────────────────────────────────────────────────────────
if bash -n "$SCRIPT" 2>&1; then
  pass "loom-launch-ui.sh syntax OK"
else
  fail "loom-launch-ui.sh syntax error"
fi

# ── 3. LOOM_NO_UI=1 → browser command NOT called, URL printed to stdout ──────
reset_env
BROWSER_LOG="$TMP_DIR/browser3.log"
FAKE_BROWSER="$TMP_DIR/fake_browser.sh"
cat > "$FAKE_BROWSER" <<'EOF'
#!/usr/bin/env bash
echo "BROWSER_CALLED: $*" >> "$1"
EOF
# (This fake browser is only to detect if called; we pass log path via override)
# Use LOOM_BROWSER_CMD_OVERRIDE to point to a script that logs calls
CALL_LOG="$TMP_DIR/call3.log"
FAKE_OPEN="$TMP_DIR/fake_open3.sh"
cat > "$FAKE_OPEN" <<'EOF'
#!/usr/bin/env bash
echo "OPENED: $@" >> "$CALL_LOG_PATH"
EOF
chmod +x "$FAKE_OPEN"
export CALL_LOG_PATH="$CALL_LOG"
export LOOM_BROWSER_CMD_OVERRIDE="$FAKE_OPEN"
export LOOM_NO_UI="1"
export LOOM_DAEMON_URL="http://127.0.0.1:59998"  # non-existent → cold-start path
FAKE_DAEMON="$TMP_DIR/fake_daemon3.js"
echo "// fake" > "$FAKE_DAEMON"
export LOOM_DAEMON_BIN="$FAKE_DAEMON"
export LOOM_PID_FILE="$TMP_DIR/daemon3.pid"
# Override daemon start to be a no-op that succeeds fast
FAKE_NODE="$TMP_DIR/fake_node3.sh"
cat > "$FAKE_NODE" <<'EOF'
#!/usr/bin/env bash
echo "999999" > "$LOOM_PID_FILE"
EOF
chmod +x "$FAKE_NODE"
export LOOM_NODE_CMD="$FAKE_NODE"

stdout3=$(bash "$SCRIPT" 2>/dev/null) || true
if [ -f "$CALL_LOG" ] && grep -q "OPENED:" "$CALL_LOG" 2>/dev/null; then
  fail "LOOM_NO_UI=1: browser was called but should not be"
else
  pass "LOOM_NO_UI=1: browser NOT called"
fi
if echo "$stdout3" | grep -q "http://127.0.0.1:5757"; then
  pass "LOOM_NO_UI=1: URL printed to stdout"
else
  fail "LOOM_NO_UI=1: URL not printed to stdout (got: '$stdout3')"
fi
reset_env

# ── 4. SSH_CONNECTION set → headless path, browser NOT called, URL on stdout ─
CALL_LOG4="$TMP_DIR/call4.log"
FAKE_OPEN4="$TMP_DIR/fake_open4.sh"
cat > "$FAKE_OPEN4" <<'EOF'
#!/usr/bin/env bash
echo "OPENED: $@" >> "$CALL_LOG_PATH"
EOF
chmod +x "$FAKE_OPEN4"
export CALL_LOG_PATH="$CALL_LOG4"
export LOOM_BROWSER_CMD_OVERRIDE="$FAKE_OPEN4"
export SSH_CONNECTION="10.0.0.1 12345 10.0.0.2 22"
export LOOM_DAEMON_URL="http://127.0.0.1:59998"
FAKE_DAEMON4="$TMP_DIR/fake_daemon4.js"
echo "// fake" > "$FAKE_DAEMON4"
export LOOM_DAEMON_BIN="$FAKE_DAEMON4"
export LOOM_PID_FILE="$TMP_DIR/daemon4.pid"
export LOOM_NODE_CMD="$FAKE_NODE"

stdout4=$(bash "$SCRIPT" 2>/dev/null) || true
if [ -f "$CALL_LOG4" ] && grep -q "OPENED:" "$CALL_LOG4" 2>/dev/null; then
  fail "SSH_CONNECTION set: browser was called but should not be"
else
  pass "SSH_CONNECTION set: browser NOT called (headless path)"
fi
if echo "$stdout4" | grep -q "http://127.0.0.1:5757"; then
  pass "SSH_CONNECTION set: URL printed to stdout"
else
  fail "SSH_CONNECTION set: URL not printed to stdout (got: '$stdout4')"
fi
reset_env

# ── 5. daemon already running (warm-start) → browser NOT called ──────────────
# Spin up a real tiny HTTP server that returns 200 for /health
MOCK_SERVER_PORT=15757
# Use Python to serve a fake /health endpoint if available
PYTHON_BIN=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
fi

CALL_LOG5="$TMP_DIR/call5.log"
FAKE_OPEN5="$TMP_DIR/fake_open5.sh"
cat > "$FAKE_OPEN5" <<'EOF'
#!/usr/bin/env bash
echo "OPENED: $@" >> "$CALL_LOG_PATH"
EOF
chmod +x "$FAKE_OPEN5"
export CALL_LOG_PATH="$CALL_LOG5"
export LOOM_BROWSER_CMD_OVERRIDE="$FAKE_OPEN5"
export LOOM_DAEMON_URL="http://127.0.0.1:$MOCK_SERVER_PORT"

if [ -n "$PYTHON_BIN" ]; then
  # Start a minimal HTTP server that returns 200 for any request
  "$PYTHON_BIN" -c "
import http.server, threading, os, signal

class H(http.server.BaseHTTPRequestHandler):
  def do_GET(self):
    self.send_response(200)
    self.end_headers()
    self.wfile.write(b'ok')
  def log_message(self, *a): pass

srv = http.server.HTTPServer(('127.0.0.1', $MOCK_SERVER_PORT), H)
srv.timeout = 0.1
for _ in range(50): srv.handle_request()
" &
  MOCK_PID=$!
  sleep 0.2  # let server start

  stdout5=$(bash "$SCRIPT" 2>/dev/null) || true
  kill "$MOCK_PID" 2>/dev/null || true

  if [ -f "$CALL_LOG5" ] && grep -q "OPENED:" "$CALL_LOG5" 2>/dev/null; then
    fail "warm-start: browser was called but should not be (daemon already running)"
  else
    pass "warm-start: browser NOT called (daemon already running)"
  fi
else
  echo "SKIP: warm-start test (python3/python not available)"
fi
reset_env

# ── 6. daemon entry not found → warning on stderr, exit 0 (no crash) ─────────
export LOOM_DAEMON_BIN="/nonexistent/path/daemon.js"
export LOOM_DAEMON_URL="http://127.0.0.1:59998"
export LOOM_PID_FILE="$TMP_DIR/daemon6.pid"
stderr6=$(bash "$SCRIPT" 2>&1 >/dev/null) || true
rc6=$(bash "$SCRIPT" 2>/dev/null; echo $?) || true
# Actually test exit code
set +e
bash "$SCRIPT" 2>/dev/null
rc6=$?
set -e
if [ "$rc6" -eq 0 ]; then
  pass "daemon entry not found: exit 0 (fail-silent)"
else
  fail "daemon entry not found: exit $rc6 (should be 0)"
fi
reset_env

# ── 7. normal cold-start → browser open called once, URL on stdout ────────────
CALL_LOG7="$TMP_DIR/call7.log"
FAKE_OPEN7="$TMP_DIR/fake_open7.sh"
cat > "$FAKE_OPEN7" <<'EOF'
#!/usr/bin/env bash
echo "OPENED: $@" >> "$CALL_LOG_PATH"
EOF
chmod +x "$FAKE_OPEN7"
export CALL_LOG_PATH="$CALL_LOG7"
export LOOM_BROWSER_CMD_OVERRIDE="$FAKE_OPEN7"
export LOOM_DAEMON_URL="http://127.0.0.1:59998"  # non-existent → cold-start
FAKE_DAEMON7="$TMP_DIR/fake_daemon7.js"
echo "// fake" > "$FAKE_DAEMON7"
export LOOM_DAEMON_BIN="$FAKE_DAEMON7"
export LOOM_PID_FILE="$TMP_DIR/daemon7.pid"
export LOOM_NODE_CMD="$FAKE_NODE"

stdout7=$(bash "$SCRIPT" 2>/dev/null) || true

if [ -f "$CALL_LOG7" ] && grep -q "OPENED:" "$CALL_LOG7" 2>/dev/null; then
  pass "cold-start: browser open called"
else
  fail "cold-start: browser open NOT called (expected it to be called)"
fi
if echo "$stdout7" | grep -q "http://127.0.0.1:5757"; then
  pass "cold-start: URL printed to stdout"
else
  fail "cold-start: URL not printed to stdout (got: '$stdout7')"
fi
reset_env

# ── 8. idempotent: invoking when daemon is already starting (PID file exists) ─
# PID file present but /health returns 200 (daemon warm) → no re-start attempt
CALL_LOG8="$TMP_DIR/call8.log"
# Same warm-start server test but with PID file present
export LOOM_DAEMON_URL="http://127.0.0.1:$MOCK_SERVER_PORT"
export LOOM_PID_FILE="$TMP_DIR/daemon8.pid"
echo "12345" > "$LOOM_PID_FILE"  # pre-existing PID file

FAKE_OPEN8="$TMP_DIR/fake_open8.sh"
cat > "$FAKE_OPEN8" <<'EOF'
#!/usr/bin/env bash
echo "OPENED: $@" >> "$CALL_LOG_PATH"
EOF
chmod +x "$FAKE_OPEN8"
export CALL_LOG_PATH="$CALL_LOG8"
export LOOM_BROWSER_CMD_OVERRIDE="$FAKE_OPEN8"

if [ -n "$PYTHON_BIN" ]; then
  "$PYTHON_BIN" -c "
import http.server, threading, os, signal

class H(http.server.BaseHTTPRequestHandler):
  def do_GET(self):
    self.send_response(200)
    self.end_headers()
    self.wfile.write(b'ok')
  def log_message(self, *a): pass

srv = http.server.HTTPServer(('127.0.0.1', $MOCK_SERVER_PORT), H)
srv.timeout = 0.1
for _ in range(50): srv.handle_request()
" &
  MOCK_PID8=$!
  sleep 0.2

  bash "$SCRIPT" 2>/dev/null || true
  kill "$MOCK_PID8" 2>/dev/null || true

  if [ -f "$CALL_LOG8" ] && grep -q "OPENED:" "$CALL_LOG8" 2>/dev/null; then
    fail "idempotent warm: browser was called on warm-start (should not)"
  else
    pass "idempotent warm: browser NOT called when daemon already running"
  fi
else
  echo "SKIP: idempotent warm test (python3/python not available)"
fi
reset_env

# ── Final summary ─────────────────────────────────────────────────────────────
echo ""
echo "loom_launch_ui_test: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
