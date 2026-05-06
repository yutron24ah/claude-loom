#!/usr/bin/env bash
# tests/m0x_t5_t6_preflight_test.sh — TDD tests for t5+t6 (M0.X-runtime-mode-recovery)
#
# REQ-053: pnpm dev pre-flight script blocks prod daemon detection (SPEC §3.2.2)
#   t5: daemon/package.json dev script contains LOOM_DEV_MODE=1 LOOM_ENTRY=pnpm-dev + preflight invocation
#   t6: daemon/scripts/pnpm-dev-preflight.sh:
#       - prod daemon → exit 1 + diagnostic to stderr
#       - dev daemon  → exit 0
#       - daemon absent → exit 0
#       - /mode probe fail → exit 0

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PREFLIGHT="$ROOT_DIR/daemon/scripts/pnpm-dev-preflight.sh"
PKG_JSON="$ROOT_DIR/daemon/package.json"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "--- m0x_t5_t6_preflight_test ---"

PASS=0
FAIL=0

pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

# ── T5: daemon/package.json dev script assertions ─────────────────────────────

# T5.1: dev script contains LOOM_DEV_MODE=1
if jq -r '.scripts.dev' "$PKG_JSON" | grep -q "LOOM_DEV_MODE=1"; then
  pass "T5.1: dev script contains LOOM_DEV_MODE=1"
else
  fail "T5.1: dev script missing LOOM_DEV_MODE=1 (got: $(jq -r '.scripts.dev' "$PKG_JSON"))"
fi

# T5.2: dev script contains LOOM_ENTRY=pnpm-dev
if jq -r '.scripts.dev' "$PKG_JSON" | grep -q "LOOM_ENTRY=pnpm-dev"; then
  pass "T5.2: dev script contains LOOM_ENTRY=pnpm-dev"
else
  fail "T5.2: dev script missing LOOM_ENTRY=pnpm-dev"
fi

# T5.3: dev script invokes pnpm-dev-preflight.sh (pre-flight first)
DEV_SCRIPT="$(jq -r '.scripts.dev' "$PKG_JSON")"
if echo "$DEV_SCRIPT" | grep -q "pnpm-dev-preflight.sh"; then
  pass "T5.3: dev script invokes pnpm-dev-preflight.sh"
else
  fail "T5.3: dev script does not invoke pnpm-dev-preflight.sh"
fi

# T5.4: preflight is invoked BEFORE tsx watch (bash <script> && ... pattern)
# The preflight should appear before the tsx watch invocation
PREFLIGHT_POS=$(echo "$DEV_SCRIPT" | grep -bo "pnpm-dev-preflight.sh" | head -1 | cut -d: -f1)
TSX_POS=$(echo "$DEV_SCRIPT" | grep -bo "tsx" | head -1 | cut -d: -f1)
if [ -n "$PREFLIGHT_POS" ] && [ -n "$TSX_POS" ] && [ "$PREFLIGHT_POS" -lt "$TSX_POS" ]; then
  pass "T5.4: preflight invoked before tsx watch"
else
  fail "T5.4: preflight not invoked before tsx watch (preflight_pos=$PREFLIGHT_POS, tsx_pos=$TSX_POS)"
fi

# ── T6: daemon/scripts/pnpm-dev-preflight.sh assertions ──────────────────────

# T6.1: script exists
if [ -f "$PREFLIGHT" ]; then
  pass "T6.1: pnpm-dev-preflight.sh exists"
else
  fail "T6.1: pnpm-dev-preflight.sh not found at $PREFLIGHT"
fi

# T6.2: script is executable
if [ -x "$PREFLIGHT" ]; then
  pass "T6.2: pnpm-dev-preflight.sh is executable"
else
  fail "T6.2: pnpm-dev-preflight.sh is not executable"
fi

# T6.3: syntax check
if bash -n "$PREFLIGHT" 2>&1; then
  pass "T6.3: pnpm-dev-preflight.sh syntax OK"
else
  fail "T6.3: pnpm-dev-preflight.sh syntax error"
fi

# Only run behavioral tests if script exists
if [ -f "$PREFLIGHT" ]; then

# T6.4: prod daemon detected → exit 1 + diagnostic to stderr
# Spin up a mock server that returns prod mode JSON from /mode
MOCK_PORT_4=15861
PYTHON_BIN=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
fi

if [ -n "$PYTHON_BIN" ]; then
  "$PYTHON_BIN" -c "
import http.server, json, sys

class H(http.server.BaseHTTPRequestHandler):
  def do_GET(self):
    if self.path == '/health':
      self.send_response(200)
      self.end_headers()
      self.wfile.write(b'ok')
    elif self.path == '/mode':
      body = json.dumps({'mode': 'prod', 'pid': 99999, 'entry': 'lazy-launch', 'version': '0.1.0', 'started_at': 0, 'ui_serving': True})
      self.send_response(200)
      self.send_header('Content-Type', 'application/json')
      self.end_headers()
      self.wfile.write(body.encode())
    else:
      self.send_response(404)
      self.end_headers()
  def log_message(self, *a): pass

srv = http.server.HTTPServer(('127.0.0.1', $MOCK_PORT_4), H)
srv.timeout = 0.1
for _ in range(80): srv.handle_request()
" &
  MOCK_PID4=$!
  sleep 0.2

  set +e
  stderr4=$(LOOM_DAEMON_URL="http://127.0.0.1:$MOCK_PORT_4" bash "$PREFLIGHT" 2>&1 >/dev/null)
  rc4=$?
  set -e
  kill "$MOCK_PID4" 2>/dev/null || true

  if [ "$rc4" -eq 1 ]; then
    pass "T6.4: prod daemon → exit 1"
  else
    fail "T6.4: prod daemon → expected exit 1, got exit $rc4"
  fi

  if echo "$stderr4" | grep -qi "ERROR\|production"; then
    pass "T6.5: prod daemon → diagnostic on stderr contains ERROR/production"
  else
    fail "T6.5: prod daemon → expected diagnostic on stderr (got: '$stderr4')"
  fi

  if echo "$stderr4" | grep -q "99999"; then
    pass "T6.6: prod daemon → PID appears in diagnostic"
  else
    fail "T6.6: prod daemon → PID 99999 not in diagnostic (got: '$stderr4')"
  fi
else
  echo "SKIP: T6.4/T6.5/T6.6 (python3 not available)"
fi

# T6.7: dev daemon detected → exit 0
if [ -n "$PYTHON_BIN" ]; then
  MOCK_PORT_7=15862
  "$PYTHON_BIN" -c "
import http.server, json

class H(http.server.BaseHTTPRequestHandler):
  def do_GET(self):
    if self.path == '/health':
      self.send_response(200)
      self.end_headers()
      self.wfile.write(b'ok')
    elif self.path == '/mode':
      body = json.dumps({'mode': 'dev', 'pid': 88888, 'entry': 'pnpm-dev', 'version': '0.1.0', 'started_at': 0, 'ui_serving': False})
      self.send_response(200)
      self.send_header('Content-Type', 'application/json')
      self.end_headers()
      self.wfile.write(body.encode())
    else:
      self.send_response(404)
      self.end_headers()
  def log_message(self, *a): pass

srv = http.server.HTTPServer(('127.0.0.1', $MOCK_PORT_7), H)
srv.timeout = 0.1
for _ in range(80): srv.handle_request()
" &
  MOCK_PID7=$!
  sleep 0.2

  set +e
  LOOM_DAEMON_URL="http://127.0.0.1:$MOCK_PORT_7" bash "$PREFLIGHT" 2>/dev/null
  rc7=$?
  set -e
  kill "$MOCK_PID7" 2>/dev/null || true

  if [ "$rc7" -eq 0 ]; then
    pass "T6.7: dev daemon → exit 0"
  else
    fail "T6.7: dev daemon → expected exit 0, got exit $rc7"
  fi
else
  echo "SKIP: T6.7 (python3 not available)"
fi

# T6.8: daemon absent (no server listening) → exit 0
NONEXISTENT_PORT=59123
set +e
LOOM_DAEMON_URL="http://127.0.0.1:$NONEXISTENT_PORT" bash "$PREFLIGHT" 2>/dev/null
rc8=$?
set -e

if [ "$rc8" -eq 0 ]; then
  pass "T6.8: daemon absent → exit 0"
else
  fail "T6.8: daemon absent → expected exit 0, got exit $rc8"
fi

# T6.9: /mode probe fails (health OK but /mode returns 500) → exit 0 (graceful)
if [ -n "$PYTHON_BIN" ]; then
  MOCK_PORT_9=15863
  "$PYTHON_BIN" -c "
import http.server, json

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

srv = http.server.HTTPServer(('127.0.0.1', $MOCK_PORT_9), H)
srv.timeout = 0.1
for _ in range(80): srv.handle_request()
" &
  MOCK_PID9=$!
  sleep 0.2

  set +e
  LOOM_DAEMON_URL="http://127.0.0.1:$MOCK_PORT_9" bash "$PREFLIGHT" 2>/dev/null
  rc9=$?
  set -e
  kill "$MOCK_PID9" 2>/dev/null || true

  if [ "$rc9" -eq 0 ]; then
    pass "T6.9: /mode probe fail → exit 0 (graceful)"
  else
    fail "T6.9: /mode probe fail → expected exit 0, got exit $rc9"
  fi
else
  echo "SKIP: T6.9 (python3 not available)"
fi

fi  # end if script exists

# ── Final summary ─────────────────────────────────────────────────────────────
echo ""
echo "m0x_t5_t6_preflight_test: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
