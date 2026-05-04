#!/usr/bin/env bash
# tests/ui_smoke_skill_test.sh — loom-ui-smoke Stage 3 formatter test
#
# REQ-044: skills/loom-ui-smoke/scripts/format-report.sh + templates/findings.schema.json
# Covers: script existence, executability, schema validity, formatter behavior, error paths

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FORMAT_SCRIPT="$ROOT_DIR/skills/loom-ui-smoke/scripts/format-report.sh"
SCHEMA_FILE="$ROOT_DIR/skills/loom-ui-smoke/templates/findings.schema.json"

failures=0

pass() { echo "PASS [$1]: $2"; }
fail() { echo "FAIL [$1]: $2"; failures=$((failures + 1)); }

# --- Test 1: format-report.sh exists and is executable ---
if [ -f "$FORMAT_SCRIPT" ]; then
  pass "format-report-exists" "skills/loom-ui-smoke/scripts/format-report.sh exists"
else
  fail "format-report-exists" "skills/loom-ui-smoke/scripts/format-report.sh not found"
fi

if [ -x "$FORMAT_SCRIPT" ]; then
  pass "format-report-executable" "format-report.sh is executable"
else
  fail "format-report-executable" "format-report.sh is not executable"
fi

# --- Test 2: findings.schema.json exists and is valid JSON ---
if [ -f "$SCHEMA_FILE" ]; then
  pass "schema-exists" "skills/loom-ui-smoke/templates/findings.schema.json exists"
else
  fail "schema-exists" "skills/loom-ui-smoke/templates/findings.schema.json not found"
fi

if command -v jq &>/dev/null && [ -f "$SCHEMA_FILE" ]; then
  if jq empty "$SCHEMA_FILE" 2>/dev/null; then
    pass "schema-valid-json" "findings.schema.json is valid JSON"
  else
    fail "schema-valid-json" "findings.schema.json is not valid JSON"
  fi
else
  fail "schema-valid-json" "jq not available or schema file missing"
fi

# --- Test 3: schema has required top-level fields ---
if command -v jq &>/dev/null && [ -f "$SCHEMA_FILE" ]; then
  schema_title=$(jq -r '.title // empty' "$SCHEMA_FILE" 2>/dev/null || true)
  schema_type=$(jq -r '.type // empty' "$SCHEMA_FILE" 2>/dev/null || true)
  required_fields=$(jq -r '.required // [] | length' "$SCHEMA_FILE" 2>/dev/null || echo "0")

  if [ "$schema_title" = "loom-ui-smoke findings" ]; then
    pass "schema-title" "schema title is 'loom-ui-smoke findings'"
  else
    fail "schema-title" "schema title expected 'loom-ui-smoke findings', got '$schema_title'"
  fi

  if [ "$schema_type" = "object" ]; then
    pass "schema-type" "schema type is 'object'"
  else
    fail "schema-type" "schema type expected 'object', got '$schema_type'"
  fi

  if [ "$required_fields" -ge 5 ]; then
    pass "schema-required-fields" "schema has $required_fields required fields (>= 5)"
  else
    fail "schema-required-fields" "schema has only $required_fields required fields (expected >= 5)"
  fi

  # Check specific required fields are present
  for field in schema_version smoke_id scope stats findings; do
    if jq -e --arg f "$field" '.required | index($f) != null' "$SCHEMA_FILE" &>/dev/null; then
      pass "schema-required-$field" "schema requires field '$field'"
    else
      fail "schema-required-$field" "schema missing required field '$field'"
    fi
  done
fi

# --- Test 4: formatter runs with valid mock input and generates report.md + findings.json ---
if [ -f "$FORMAT_SCRIPT" ] && [ -x "$FORMAT_SCRIPT" ] && command -v jq &>/dev/null; then
  TMP_DIR=$(mktemp -d)
  # shellcheck disable=SC2064
  trap "rm -rf '$TMP_DIR'" EXIT

  # Create mock strategy.md
  cat > "$TMP_DIR/strategy.md" <<'EOF'
# Smoke Test Strategy — 2026-05-02 full

## Scope: full

## Route matrix

| route | expected DOM elements | expected canvas state | expected interactions | REQ refs |
|---|---|---|---|---|
| / | h1.home-title | n/a | click nav | REQ-030 |
EOF

  # Create mock console.log
  cat > "$TMP_DIR/console.log" <<'EOF'
=== route: / ===
(no errors)
EOF

  # Create screenshots dir
  mkdir -p "$TMP_DIR/screenshots"

  # Create mock findings JSON (valid, no findings = pass scenario)
  MOCK_FINDINGS=$(cat <<'EOF'
{
  "schema_version": 1,
  "smoke_id": "2026-05-02-full",
  "scope": "full",
  "started_at": 1746172800000,
  "completed_at": 1746172860000,
  "stats": {
    "routes_tested": 1,
    "routes_passed": 1,
    "routes_failed": 0,
    "console_errors": 0,
    "console_warnings": 0
  },
  "findings": []
}
EOF
)

  # Run formatter
  run_exit=0
  SMOKE_OUTPUT_DIR="$TMP_DIR" \
  STRATEGY_FILE="$TMP_DIR/strategy.md" \
  CONSOLE_LOG="$TMP_DIR/console.log" \
  SCREENSHOTS_DIR="$TMP_DIR/screenshots" \
    bash "$FORMAT_SCRIPT" <<<"$MOCK_FINDINGS" >"$TMP_DIR/formatter.out" 2>&1 || run_exit=$?

  if [ "$run_exit" -eq 0 ]; then
    pass "formatter-exit-0" "format-report.sh exited 0 with valid input"
  else
    fail "formatter-exit-0" "format-report.sh exited $run_exit with valid input (output: $(cat "$TMP_DIR/formatter.out"))"
  fi

  # Check report.md was generated
  if [ -f "$TMP_DIR/report.md" ]; then
    pass "formatter-report-md" "report.md was generated"
  else
    fail "formatter-report-md" "report.md was NOT generated"
  fi

  # Check findings.json was generated
  if [ -f "$TMP_DIR/findings.json" ]; then
    pass "formatter-findings-json" "findings.json was generated"
  else
    fail "formatter-findings-json" "findings.json was NOT generated"
  fi

  # Validate findings.json is valid JSON
  if [ -f "$TMP_DIR/findings.json" ] && jq empty "$TMP_DIR/findings.json" 2>/dev/null; then
    pass "formatter-findings-valid-json" "generated findings.json is valid JSON"
  else
    fail "formatter-findings-valid-json" "generated findings.json is not valid JSON or missing"
  fi

  # Check report.md contains expected headers
  if [ -f "$TMP_DIR/report.md" ]; then
    if grep -q "Smoke Test Report" "$TMP_DIR/report.md"; then
      pass "formatter-report-header" "report.md contains 'Smoke Test Report' header"
    else
      fail "formatter-report-header" "report.md missing 'Smoke Test Report' header"
    fi

    if grep -q "Stats" "$TMP_DIR/report.md" || grep -q "Summary" "$TMP_DIR/report.md"; then
      pass "formatter-report-stats" "report.md contains stats/summary section"
    else
      fail "formatter-report-stats" "report.md missing stats/summary section"
    fi
  fi

else
  fail "formatter-mock-run" "skipped: format-report.sh or jq not available"
fi

# --- Test 5: error path — missing SMOKE_OUTPUT_DIR exits non-zero (exit 3) ---
if [ -f "$FORMAT_SCRIPT" ] && [ -x "$FORMAT_SCRIPT" ]; then
  missing_exit=0
  SMOKE_OUTPUT_DIR="/nonexistent/path/that/does/not/exist" \
  STRATEGY_FILE="/nonexistent/strategy.md" \
  CONSOLE_LOG="/nonexistent/console.log" \
  SCREENSHOTS_DIR="/nonexistent/screenshots" \
    bash "$FORMAT_SCRIPT" </dev/null >/dev/null 2>&1 || missing_exit=$?

  if [ "$missing_exit" -ne 0 ]; then
    pass "formatter-missing-input-nonzero" "format-report.sh exits non-zero when input files are missing (exit $missing_exit)"
  else
    fail "formatter-missing-input-nonzero" "format-report.sh returned 0 but expected non-zero for missing inputs"
  fi
fi

# --- Test 6: error path — invalid JSON on stdin exits 2 ---
if [ -f "$FORMAT_SCRIPT" ] && [ -x "$FORMAT_SCRIPT" ] && command -v jq &>/dev/null; then
  TMP2_DIR=$(mktemp -d)
  # shellcheck disable=SC2064
  trap "rm -rf '$TMP2_DIR'" EXIT 2>/dev/null || true

  # Create minimal valid input files
  echo "# strategy" > "$TMP2_DIR/strategy.md"
  echo "(no errors)" > "$TMP2_DIR/console.log"
  mkdir -p "$TMP2_DIR/screenshots"

  invalid_exit=0
  SMOKE_OUTPUT_DIR="$TMP2_DIR" \
  STRATEGY_FILE="$TMP2_DIR/strategy.md" \
  CONSOLE_LOG="$TMP2_DIR/console.log" \
  SCREENSHOTS_DIR="$TMP2_DIR/screenshots" \
    bash "$FORMAT_SCRIPT" <<<"this is not json" >/dev/null 2>&1 || invalid_exit=$?

  if [ "$invalid_exit" -eq 2 ]; then
    pass "formatter-invalid-json-exit2" "format-report.sh exits 2 for invalid JSON input"
  else
    fail "formatter-invalid-json-exit2" "format-report.sh exited $invalid_exit (expected 2) for invalid JSON input"
  fi

  rm -rf "$TMP2_DIR"
fi

# ============================================================
# loom-ui-smoke skill: start-servers.sh tests (M0.11.3 t5)
# NOTE: start-servers.sh is implemented by dev-C (t5). Tests are
# SKIPPED when file is absent so that t4 tests pass independently.
# ============================================================

START_SH="$ROOT_DIR/skills/loom-ui-smoke/scripts/start-servers.sh"

# --- existence + executable (SKIP if not yet implemented by t5) ---

if [ -f "$START_SH" ]; then
  pass "start-servers-exists" "skills/loom-ui-smoke/scripts/start-servers.sh exists"
else
  echo "SKIP [start-servers-exists]: start-servers.sh not yet implemented (t5 scope)"
fi

if [ -x "$START_SH" ]; then
  pass "start-servers-executable" "start-servers.sh has executable bit set"
elif [ -f "$START_SH" ]; then
  fail "start-servers-executable" "start-servers.sh is not executable"
else
  echo "SKIP [start-servers-executable]: start-servers.sh not yet implemented (t5 scope)"
fi

# --- shellcheck ---

if command -v shellcheck &>/dev/null && [ -f "$START_SH" ]; then
  if shellcheck "$START_SH" 2>/dev/null; then
    pass "start-servers-shellcheck" "start-servers.sh: shellcheck pass (zero warnings)"
  else
    fail "start-servers-shellcheck" "start-servers.sh: shellcheck reported warnings/errors"
  fi
else
  echo "SKIP [start-servers-shellcheck]: shellcheck not installed or script missing"
fi

# --- invalid args → exit 3 ---

if [ -f "$START_SH" ] && [ -x "$START_SH" ]; then
  if "$START_SH" --unknown-flag 2>/dev/null; then
    fail "start-servers-invalid-args" "--unknown-flag should exit non-zero (expected 3)"
  else
    invalid_ec=$?
    if [ "$invalid_ec" -eq 3 ]; then
      pass "start-servers-invalid-args" "--unknown-flag exits with code 3"
    else
      fail "start-servers-invalid-args" "--unknown-flag exits with $invalid_ec, expected 3"
    fi
  fi
fi

# --- no args, no servers → exit 1 ---
# Override ports to unused high-numbered ports so lsof finds nothing

if [ -f "$START_SH" ] && [ -x "$START_SH" ]; then
  no_server_exit=0
  LOOM_DAEMON_PORT=59901 LOOM_UI_PORT=59902 "$START_SH" 2>/dev/null || no_server_exit=$?
  if [ "$no_server_exit" -eq 1 ]; then
    pass "start-servers-no-flag-exit1" "no servers + no flag exits with code 1"
  else
    fail "start-servers-no-flag-exit1" "no servers + no flag exits with $no_server_exit, expected 1"
  fi
fi

# --- --quiet suppresses stdout ---

if [ -f "$START_SH" ] && [ -x "$START_SH" ]; then
  quiet_stdout=$(LOOM_DAEMON_PORT=59901 LOOM_UI_PORT=59902 "$START_SH" --quiet 2>/dev/null || true)
  if [ -z "$quiet_stdout" ]; then
    pass "start-servers-quiet-suppresses-stdout" "--quiet suppresses stdout"
  else
    fail "start-servers-quiet-suppresses-stdout" "--quiet did not suppress stdout (got: $quiet_stdout)"
  fi
fi

# --- port detect: simulate listening server with Python ---
# Start dummy TCP listeners, verify REUSING_EXISTING + exit 0

if [ -f "$START_SH" ] && [ -x "$START_SH" ] && command -v python3 &>/dev/null; then
  DUMMY_DAEMON_PORT=59903
  DUMMY_UI_PORT=59904

  # Start dummy listeners (accept one connection then quit)
  python3 -c "
import socket, time, threading

def serve(port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(('127.0.0.1', port))
    s.listen(5)
    s.settimeout(15)
    try:
        while True:
            try:
                conn, _ = s.accept()
                conn.close()
            except socket.timeout:
                break
    except Exception:
        pass
    finally:
        s.close()

t1 = threading.Thread(target=serve, args=($DUMMY_DAEMON_PORT,), daemon=True)
t2 = threading.Thread(target=serve, args=($DUMMY_UI_PORT,), daemon=True)
t1.start()
t2.start()
time.sleep(15)
" &>/dev/null &
  LISTENER_PID=$!
  # Give listeners time to bind
  sleep 0.5

  reuse_output=$(LOOM_DAEMON_PORT=$DUMMY_DAEMON_PORT LOOM_UI_PORT=$DUMMY_UI_PORT "$START_SH" 2>/dev/null || true)
  reuse_exit=$?

  # Cleanup listener
  kill "$LISTENER_PID" 2>/dev/null || true

  if echo "$reuse_output" | grep -q "REUSING_EXISTING"; then
    pass "start-servers-reusing-existing" "detects existing servers → REUSING_EXISTING in stdout"
  else
    fail "start-servers-reusing-existing" "expected REUSING_EXISTING in stdout, got: $(echo "$reuse_output" | head -3)"
  fi

  if [ "$reuse_exit" -eq 0 ]; then
    pass "start-servers-reusing-exit0" "REUSING_EXISTING exits with code 0"
  else
    fail "start-servers-reusing-exit0" "REUSING_EXISTING exits with $reuse_exit, expected 0"
  fi
else
  echo "SKIP [start-servers-port-detect]: python3 not available or script missing"
fi

# --- --cleanup-only is idempotent (no PID files → still exits 0) ---

if [ -f "$START_SH" ] && [ -x "$START_SH" ]; then
  CLEANUP_TEST_DIR="$(mktemp -d)"
  # shellcheck disable=SC2064
  trap "rm -rf '$CLEANUP_TEST_DIR'" EXIT
  cleanup_exit=0
  LOOM_DAEMON_PORT=59901 LOOM_UI_PORT=59902 LOOM_DEV_LOG_DIR="$CLEANUP_TEST_DIR" \
    "$START_SH" --cleanup-only 2>/dev/null || cleanup_exit=$?
  if [ "$cleanup_exit" -eq 0 ]; then
    pass "start-servers-cleanup-idempotent" "--cleanup-only with no PID files exits 0 (idempotent)"
  else
    fail "start-servers-cleanup-idempotent" "--cleanup-only with no PID files exits $cleanup_exit, expected 0"
  fi
fi

# --- content checks: required constants / flags present in script ---

if [ -f "$START_SH" ]; then
  if grep -q "LOOM_DAEMON_PORT" "$START_SH" && grep -q "LOOM_UI_PORT" "$START_SH"; then
    pass "start-servers-port-constants" "port constants LOOM_DAEMON_PORT / LOOM_UI_PORT defined"
  else
    fail "start-servers-port-constants" "port constants LOOM_DAEMON_PORT / LOOM_UI_PORT not found"
  fi

  if grep -q "auto.start\|AUTO_START\|auto_start" "$START_SH"; then
    pass "start-servers-auto-start-flag" "--auto-start flag handling present"
  else
    fail "start-servers-auto-start-flag" "--auto-start flag handling not found"
  fi

  if grep -q "REUSING_EXISTING" "$START_SH"; then
    pass "start-servers-status-constant" "REUSING_EXISTING status string present"
  else
    fail "start-servers-status-constant" "REUSING_EXISTING constant not found"
  fi

  if grep -q "cleanup.only\|CLEANUP_ONLY\|cleanup_only" "$START_SH"; then
    pass "start-servers-cleanup-flag" "--cleanup-only flag handling present"
  else
    fail "start-servers-cleanup-flag" "--cleanup-only flag handling not found"
  fi

  if grep -q "LOOM_DEV_LOG_DIR" "$START_SH"; then
    pass "start-servers-log-dir" "LOOM_DEV_LOG_DIR env var present"
  else
    fail "start-servers-log-dir" "LOOM_DEV_LOG_DIR env var not found"
  fi
fi

# --- Summary ---
if [ "$failures" -gt 0 ]; then
  echo "ui_smoke_skill_test FAILED with $failures violations"
  exit 1
fi

echo "ui_smoke_skill_test passed"
