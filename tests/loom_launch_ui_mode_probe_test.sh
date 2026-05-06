#!/usr/bin/env bash
# tests/loom_launch_ui_mode_probe_test.sh — TDD tests for /mode probe + Vite redirect
#
# REQ-050: loom-launch-ui.sh /mode probe logic per SPEC §3.2.2:
#   - mode=dev + Vite up (LOOM_VITE_URL override) → Vite URL passed to browser_cmd
#   - mode=dev + Vite down → URL stdout + warning (no browser open)
#   - mode=prod warm → existing behavior (no browser open, no Vite check)
#   - /mode endpoint fail → existing behavior fallback (no browser open)

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

echo "--- loom_launch_ui_mode_probe_test ---"

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
  unset LOOM_VITE_URL       2>/dev/null || true
  unset LOOM_NODE_CMD       2>/dev/null || true
  unset LOOM_FORCE_LAUNCH   2>/dev/null || true
}

# ── helper: spin up a mock HTTP server with JSON /mode response ──────────────
# Usage: start_mock_server <port> <mode_json_body>
# Returns: PID of server (written to TMP_DIR/mock_<port>.pid)
start_mock_server_with_mode() {
  local port="$1"
  local mode_body="$2"
  if [ -z "$PYTHON_BIN" ]; then
    echo "SKIP_NO_PYTHON"
    return 1
  fi
  "$PYTHON_BIN" -c "
import http.server, json

MODE_BODY = '''${mode_body}'''

class H(http.server.BaseHTTPRequestHandler):
  def do_GET(self):
    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()
    self.wfile.write(MODE_BODY.encode())
  def log_message(self, *a): pass

srv = http.server.HTTPServer(('127.0.0.1', ${port}), H)
srv.timeout = 0.1
for _ in range(100): srv.handle_request()
" &
  echo $! > "$TMP_DIR/mock_${port}.pid"
}

# ── helper: spin up a simple 200-OK server for Vite mock ─────────────────────
start_simple_server() {
  local port="$1"
  if [ -z "$PYTHON_BIN" ]; then
    return 1
  fi
  "$PYTHON_BIN" -c "
import http.server

class H(http.server.BaseHTTPRequestHandler):
  def do_GET(self):
    self.send_response(200)
    self.end_headers()
    self.wfile.write(b'ok')
  def log_message(self, *a): pass

srv = http.server.HTTPServer(('127.0.0.1', ${port}), H)
srv.timeout = 0.1
for _ in range(80): srv.handle_request()
" &
  echo $! > "$TMP_DIR/simple_${port}.pid"
}

kill_pid_file() {
  local pf="$1"
  if [ -f "$pf" ]; then
    kill "$(cat "$pf")" 2>/dev/null || true
    rm -f "$pf"
  fi
}

if [ -z "$PYTHON_BIN" ]; then
  echo "SKIP: all mode probe tests require python3/python"
  echo "loom_launch_ui_mode_probe_test: PASS=0 FAIL=0 SKIP=4"
  exit 0
fi

# ─────────────────────────────────────────────────────────────────────────────
# Test 1: mode=dev + Vite up → Vite URL passed to browser_cmd (REQ-050 case a)
# ─────────────────────────────────────────────────────────────────────────────
MOCK_DAEMON_PORT=15850
MOCK_VITE_PORT=15851

MODE_JSON='{"mode":"dev","entry":"pnpm-dev","version":"0.0.0","started_at":0,"pid":1,"ui_serving":false}'

start_mock_server_with_mode $MOCK_DAEMON_PORT "$MODE_JSON"
DAEMON_PID_FILE="$TMP_DIR/mock_${MOCK_DAEMON_PORT}.pid"
sleep 0.3

start_simple_server $MOCK_VITE_PORT
VITE_PID_FILE="$TMP_DIR/simple_${MOCK_VITE_PORT}.pid"
sleep 0.2

CALL_LOG1="$TMP_DIR/call1.log"
FAKE_OPEN1="$TMP_DIR/fake_open1.sh"
cat > "$FAKE_OPEN1" <<'EOFOPEN'
#!/usr/bin/env bash
echo "OPENED: $@" >> "$CALL_LOG_PATH"
EOFOPEN
chmod +x "$FAKE_OPEN1"

export CALL_LOG_PATH="$CALL_LOG1"
export LOOM_BROWSER_CMD_OVERRIDE="$FAKE_OPEN1"
export LOOM_DAEMON_URL="http://127.0.0.1:$MOCK_DAEMON_PORT"
export LOOM_VITE_URL="http://127.0.0.1:$MOCK_VITE_PORT"
export LOOM_FORCE_LAUNCH="1"

stdout1=$(bash "$SCRIPT" 2>/dev/null) || true

kill_pid_file "$DAEMON_PID_FILE"
kill_pid_file "$VITE_PID_FILE"

# Expect: browser opened with Vite URL (not daemon URL)
if [ -f "$CALL_LOG1" ] && grep -q "OPENED:.*$MOCK_VITE_PORT" "$CALL_LOG1" 2>/dev/null; then
  pass "mode=dev + Vite up: browser opened with Vite URL (:$MOCK_VITE_PORT)"
else
  OPENED_WITH=""
  [ -f "$CALL_LOG1" ] && OPENED_WITH="$(cat "$CALL_LOG1")"
  fail "mode=dev + Vite up: expected Vite URL in browser open (got: '$OPENED_WITH', stdout='$stdout1')"
fi

# Expect: Vite URL also on stdout
if echo "$stdout1" | grep -q "$MOCK_VITE_PORT"; then
  pass "mode=dev + Vite up: Vite URL printed to stdout"
else
  fail "mode=dev + Vite up: Vite URL not on stdout (got: '$stdout1')"
fi
reset_env

# ─────────────────────────────────────────────────────────────────────────────
# Test 2: mode=dev + Vite down → URL stdout + warning, NO browser open (REQ-050 case b)
# ─────────────────────────────────────────────────────────────────────────────
MOCK_DAEMON_PORT2=15852
# Vite port intentionally not started (15853 down)
MOCK_VITE_PORT2=15853

start_mock_server_with_mode $MOCK_DAEMON_PORT2 "$MODE_JSON"
DAEMON_PID_FILE2="$TMP_DIR/mock_${MOCK_DAEMON_PORT2}.pid"
sleep 0.3

CALL_LOG2="$TMP_DIR/call2.log"
FAKE_OPEN2="$TMP_DIR/fake_open2.sh"
cat > "$FAKE_OPEN2" <<'EOFOPEN2'
#!/usr/bin/env bash
echo "OPENED: $@" >> "$CALL_LOG_PATH"
EOFOPEN2
chmod +x "$FAKE_OPEN2"

export CALL_LOG_PATH="$CALL_LOG2"
export LOOM_BROWSER_CMD_OVERRIDE="$FAKE_OPEN2"
export LOOM_DAEMON_URL="http://127.0.0.1:$MOCK_DAEMON_PORT2"
export LOOM_VITE_URL="http://127.0.0.1:$MOCK_VITE_PORT2"
export LOOM_FORCE_LAUNCH="1"

stdout2=$(bash "$SCRIPT" 2>/dev/null) || true
stderr2=$(bash "$SCRIPT" 2>&1 >/dev/null) || true

kill_pid_file "$DAEMON_PID_FILE2"

# Expect: browser NOT called (Vite down)
if [ -f "$CALL_LOG2" ] && grep -q "OPENED:" "$CALL_LOG2" 2>/dev/null; then
  fail "mode=dev + Vite down: browser was called but should not be"
else
  pass "mode=dev + Vite down: browser NOT called"
fi

# Expect: URL printed to stdout (Vite URL since mode=dev)
if echo "$stdout2" | grep -q "http://127.0.0.1"; then
  pass "mode=dev + Vite down: URL printed to stdout"
else
  fail "mode=dev + Vite down: no URL on stdout (got: '$stdout2')"
fi

# Expect: warning on stderr about Vite not running
if echo "$stderr2" | grep -qi "vite\|warn\|start\|not"; then
  pass "mode=dev + Vite down: warning message on stderr"
else
  fail "mode=dev + Vite down: no warning on stderr (got: '$stderr2')"
fi
reset_env

# ─────────────────────────────────────────────────────────────────────────────
# Test 3: mode=prod warm → existing behavior (no browser open) (REQ-050 case c)
# ─────────────────────────────────────────────────────────────────────────────
MOCK_DAEMON_PORT3=15854

PROD_MODE_JSON='{"mode":"prod","entry":"lazy-launch","version":"0.0.0","started_at":0,"pid":1,"ui_serving":true}'

start_mock_server_with_mode $MOCK_DAEMON_PORT3 "$PROD_MODE_JSON"
DAEMON_PID_FILE3="$TMP_DIR/mock_${MOCK_DAEMON_PORT3}.pid"
sleep 0.3

CALL_LOG3="$TMP_DIR/call3.log"
FAKE_OPEN3="$TMP_DIR/fake_open3.sh"
cat > "$FAKE_OPEN3" <<'EOFOPEN3'
#!/usr/bin/env bash
echo "OPENED: $@" >> "$CALL_LOG_PATH"
EOFOPEN3
chmod +x "$FAKE_OPEN3"

export CALL_LOG_PATH="$CALL_LOG3"
export LOOM_BROWSER_CMD_OVERRIDE="$FAKE_OPEN3"
export LOOM_DAEMON_URL="http://127.0.0.1:$MOCK_DAEMON_PORT3"
export LOOM_FORCE_LAUNCH="1"

stdout3=$(bash "$SCRIPT" 2>/dev/null) || true

kill_pid_file "$DAEMON_PID_FILE3"

# Expect: browser NOT called (prod warm → existing skip behavior)
if [ -f "$CALL_LOG3" ] && grep -q "OPENED:" "$CALL_LOG3" 2>/dev/null; then
  fail "mode=prod warm: browser was called but should not be (existing behavior broken)"
else
  pass "mode=prod warm: browser NOT called (existing behavior preserved)"
fi

# Expect: no Vite-port URL on stdout (stays with daemon URL logic)
if echo "$stdout3" | grep -q "5173"; then
  fail "mode=prod warm: unexpected Vite port in output (got: '$stdout3')"
else
  pass "mode=prod warm: no Vite URL redirect (correct)"
fi
reset_env

# ─────────────────────────────────────────────────────────────────────────────
# Test 4: /mode endpoint fail → existing behavior fallback (REQ-050 case d)
# ─────────────────────────────────────────────────────────────────────────────
# Daemon port: answers /health (200) but /mode returns 500 / empty
MOCK_DAEMON_PORT4=15856

# Server that returns 200 for /health but 500 for /mode
"$PYTHON_BIN" -c "
import http.server

class H(http.server.BaseHTTPRequestHandler):
  def do_GET(self):
    if self.path == '/health':
      self.send_response(200)
      self.end_headers()
      self.wfile.write(b'ok')
    else:
      self.send_response(500)
      self.end_headers()
      self.wfile.write(b'internal error')
  def log_message(self, *a): pass

srv = http.server.HTTPServer(('127.0.0.1', $MOCK_DAEMON_PORT4), H)
srv.timeout = 0.1
for _ in range(80): srv.handle_request()
" &
DAEMON4_PID=$!
sleep 0.3

CALL_LOG4="$TMP_DIR/call4.log"
FAKE_OPEN4="$TMP_DIR/fake_open4.sh"
cat > "$FAKE_OPEN4" <<'EOFOPEN4'
#!/usr/bin/env bash
echo "OPENED: $@" >> "$CALL_LOG_PATH"
EOFOPEN4
chmod +x "$FAKE_OPEN4"

export CALL_LOG_PATH="$CALL_LOG4"
export LOOM_BROWSER_CMD_OVERRIDE="$FAKE_OPEN4"
export LOOM_DAEMON_URL="http://127.0.0.1:$MOCK_DAEMON_PORT4"
export LOOM_FORCE_LAUNCH="1"

stdout4=$(bash "$SCRIPT" 2>/dev/null) || true

kill $DAEMON4_PID 2>/dev/null || true

# Expect: existing warm-start behavior → browser NOT called (warm-start = no open)
if [ -f "$CALL_LOG4" ] && grep -q "OPENED:" "$CALL_LOG4" 2>/dev/null; then
  fail "/mode fail fallback: browser was called (existing warm-start behavior broken)"
else
  pass "/mode fail fallback: browser NOT called (warm-start existing behavior preserved)"
fi

# Expect: script exits 0 (fail-silent)
set +e
bash "$SCRIPT" 2>/dev/null
rc4=$?
set -e
if [ "$rc4" -eq 0 ]; then
  pass "/mode fail fallback: exit 0 (fail-silent maintained)"
else
  fail "/mode fail fallback: exit $rc4 (should be 0)"
fi
reset_env

# ─────────────────────────────────────────────────────────────────────────────
# Final summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "loom_launch_ui_mode_probe_test: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
