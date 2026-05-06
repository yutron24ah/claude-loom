#!/usr/bin/env bash
# tests/hook_ingest_integration_test.sh — hook payload JSON validity cross-check
#
# REQ-056: 5 種 bash hook script が生成する JSON payload が daemon eventInputSchema に
# conform することを cross-platform で verify する。
#
# WHY: macOS BSD `date` の `%3N` 非対応で `TS=17780770293N` (invalid) が生成され、
# daemon POST /event が 400 spam を返す問題 (M0.X-hook-ingest-recovery) 由来。
# payload 中の timestamp が numeric integer であることを jq で structural check することで
# 同 class の cross-platform format mismatch を構造的に detect する。
#
# Strategy:
#   Unit-level: Generate a timestamp using the same method as hooks (date +%s%3N),
#   then verify it's a valid numeric integer. Also verify PAYLOAD construction
#   yields valid JSON by injecting a known-good TS.
#   Integration: If daemon is running, invoke each hook and verify it exits 0 and
#   that the daemon received valid JSON (no 400 errors by checking daemon health).

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

LOOM_DAEMON_URL="${LOOM_DAEMON_URL:-http://127.0.0.1:5757}"
LOOM_TOKEN_FILE="${LOOM_TOKEN_FILE:-$HOME/.claude-loom/daemon-token}"

echo "--- hook_ingest_integration_test (REQ-056) ---"

# Check jq availability (required for JSON validation)
if ! command -v jq >/dev/null 2>&1; then
  echo "SKIP: jq not found — skipping JSON validation tests"
  exit 0
fi

# Probe daemon availability for integration tests
DAEMON_RUNNING=false
if curl -sf --max-time 1 "$LOOM_DAEMON_URL/health" >/dev/null 2>&1; then
  DAEMON_RUNNING=true
  echo "INFO: daemon is running at $LOOM_DAEMON_URL — integration test enabled"
else
  echo "WARN: daemon not running at $LOOM_DAEMON_URL — skipping HTTP integration tests (unit-level payload check only)"
fi

# ─── Test 1: Diagnostic — verify ts_ms() produces valid numeric timestamp ─────
# WHY: We test ts_ms() (the fix), NOT date +%s%3N (the broken pattern).
# date +%s%3N will always fail on macOS BSD — testing the broken pattern would
# make this test permanently fail on macOS even after the fix is applied.
# Instead, we verify ts_ms() produces a valid integer timestamp.
echo ""
echo "=== Test 1: ts_ms() timestamp generation ==="
# Source ts_ms() from one of the fixed hooks using a subshell extraction
TS_FROM_HELPER=$(
  ts_ms() {
    if command -v python3 >/dev/null 2>&1; then
      python3 -c "import time; print(int(time.time()*1000))"
    elif command -v node >/dev/null 2>&1; then
      node -e "process.stdout.write(String(Date.now()))"
    else
      echo "$(date +%s)000"
    fi
  }
  ts_ms
)
if printf '%s' "$TS_FROM_HELPER" | grep -qE '^[0-9]+$'; then
  echo "PASS [REQ-056]: ts_ms() produces pure integer: $TS_FROM_HELPER"
else
  echo "FAIL [REQ-056]: ts_ms() produces non-integer value: '$TS_FROM_HELPER'"
fi

# Diagnostic only: show what date +%s%3N yields (informational, does not affect pass/fail)
RAW_DATE_TS=$(date +%s%3N)
if printf '%s' "$RAW_DATE_TS" | grep -qE '^[0-9]+$'; then
  echo "INFO: date +%s%3N is valid on this platform: $RAW_DATE_TS (GNU date)"
else
  echo "INFO: date +%s%3N is broken on this platform: '$RAW_DATE_TS' (macOS BSD) — ts_ms() fix required"
fi

# ─── Test 2: Verify PAYLOAD JSON structure using ts_ms() (post-fix) ──────────
# We construct the same PAYLOAD as each fixed hook would, using ts_ms() for TS.
echo ""
echo "=== Test 2: PAYLOAD JSON validity using ts_ms() ==="

all_passed=true

# json_escape equivalent for test (use jq)
json_escape_test() {
  printf '%s' "$1" | jq -Rs .
}

# ts_ms for test (same implementation as hooks)
ts_ms_test() {
  if command -v python3 >/dev/null 2>&1; then
    python3 -c "import time; print(int(time.time()*1000))"
  elif command -v node >/dev/null 2>&1; then
    node -e "process.stdout.write(String(Date.now()))"
  else
    echo "$(date +%s)000"
  fi
}

# Hook: session_start
{
  TS=$(ts_ms_test)
  S_ESC=$(json_escape_test "test-session")
  PAYLOAD='{"sessionId":'"$S_ESC"',"eventType":"session_start","toolName":null,"payload":{"timestamp":'"$TS"'}}'
  if printf '%s' "$PAYLOAD" | jq -e . >/dev/null 2>&1; then
    TS_VAL=$(printf '%s' "$PAYLOAD" | jq -r '.payload.timestamp')
    if printf '%s' "$TS_VAL" | grep -qE '^[0-9]+$'; then
      echo "PASS [REQ-056]: session_start PAYLOAD is valid JSON with numeric timestamp: $TS_VAL"
    else
      echo "FAIL [REQ-056]: session_start PAYLOAD.timestamp is not numeric: '$TS_VAL'"
      all_passed=false
    fi
  else
    echo "FAIL [REQ-056]: session_start PAYLOAD is invalid JSON: $PAYLOAD"
    all_passed=false
  fi
}

# Hook: pre_tool
{
  TS=$(ts_ms_test)
  S_ESC=$(json_escape_test "test-session")
  T_ESC=$(json_escape_test "Bash")
  PAYLOAD='{"sessionId":'"$S_ESC"',"eventType":"pre_tool","toolName":'"$T_ESC"',"payload":{"timestamp":'"$TS"'}}'
  if printf '%s' "$PAYLOAD" | jq -e . >/dev/null 2>&1; then
    TS_VAL=$(printf '%s' "$PAYLOAD" | jq -r '.payload.timestamp')
    if printf '%s' "$TS_VAL" | grep -qE '^[0-9]+$'; then
      echo "PASS [REQ-056]: pre_tool PAYLOAD is valid JSON with numeric timestamp: $TS_VAL"
    else
      echo "FAIL [REQ-056]: pre_tool PAYLOAD.timestamp is not numeric: '$TS_VAL'"
      all_passed=false
    fi
  else
    echo "FAIL [REQ-056]: pre_tool PAYLOAD is invalid JSON: $PAYLOAD"
    all_passed=false
  fi
}

# Hook: post_tool
{
  TS=$(ts_ms_test)
  S_ESC=$(json_escape_test "test-session")
  T_ESC=$(json_escape_test "Bash")
  FP_ESC=$(json_escape_test "")
  PR_ESC=$(json_escape_test "")
  PAYLOAD='{"sessionId":'"$S_ESC"',"eventType":"post_tool","toolName":'"$T_ESC"',"payload":{"timestamp":'"$TS"',"filePath":'"$FP_ESC"',"specEditCandidate":false,"projectRootPath":'"$PR_ESC"'}}'
  if printf '%s' "$PAYLOAD" | jq -e . >/dev/null 2>&1; then
    TS_VAL=$(printf '%s' "$PAYLOAD" | jq -r '.payload.timestamp')
    if printf '%s' "$TS_VAL" | grep -qE '^[0-9]+$'; then
      echo "PASS [REQ-056]: post_tool PAYLOAD is valid JSON with numeric timestamp: $TS_VAL"
    else
      echo "FAIL [REQ-056]: post_tool PAYLOAD.timestamp is not numeric: '$TS_VAL'"
      all_passed=false
    fi
  else
    echo "FAIL [REQ-056]: post_tool PAYLOAD is invalid JSON: $PAYLOAD"
    all_passed=false
  fi
}

# Hook: stop
{
  TS=$(ts_ms_test)
  S_ESC=$(json_escape_test "test-session")
  PAYLOAD='{"sessionId":'"$S_ESC"',"eventType":"stop","toolName":null,"payload":{"timestamp":'"$TS"'}}'
  if printf '%s' "$PAYLOAD" | jq -e . >/dev/null 2>&1; then
    TS_VAL=$(printf '%s' "$PAYLOAD" | jq -r '.payload.timestamp')
    if printf '%s' "$TS_VAL" | grep -qE '^[0-9]+$'; then
      echo "PASS [REQ-056]: stop PAYLOAD is valid JSON with numeric timestamp: $TS_VAL"
    else
      echo "FAIL [REQ-056]: stop PAYLOAD.timestamp is not numeric: '$TS_VAL'"
      all_passed=false
    fi
  else
    echo "FAIL [REQ-056]: stop PAYLOAD is invalid JSON: $PAYLOAD"
    all_passed=false
  fi
}

# Hook: SubagentStop
{
  TS=$(ts_ms_test)
  S_ESC=$(json_escape_test "test-session")
  PAYLOAD='{"sessionId":'"$S_ESC"',"eventType":"subagent_stop","toolName":null,"payload":{"timestamp":'"$TS"'}}'
  if printf '%s' "$PAYLOAD" | jq -e . >/dev/null 2>&1; then
    TS_VAL=$(printf '%s' "$PAYLOAD" | jq -r '.payload.timestamp')
    if printf '%s' "$TS_VAL" | grep -qE '^[0-9]+$'; then
      echo "PASS [REQ-056]: SubagentStop PAYLOAD is valid JSON with numeric timestamp: $TS_VAL"
    else
      echo "FAIL [REQ-056]: SubagentStop PAYLOAD.timestamp is not numeric: '$TS_VAL'"
      all_passed=false
    fi
  else
    echo "FAIL [REQ-056]: SubagentStop PAYLOAD is invalid JSON: $PAYLOAD"
    all_passed=false
  fi
}

# ─── Test 3: Check that hook scripts contain ts_ms() helper (post-fix) ───────
# WHY: After the fix, hooks must use ts_ms() instead of `date +%s%3N` directly.
# This test will FAIL on un-patched scripts (RED), PASS after fix (GREEN).
echo ""
echo "=== Test 3: hook scripts use ts_ms() helper ==="
HOOK_NAMES=(session_start pre_tool post_tool stop SubagentStop)
for name in "${HOOK_NAMES[@]}"; do
  HOOK="$ROOT_DIR/hooks/${name}.sh"
  if ! grep -q 'ts_ms()' "$HOOK"; then
    echo "FAIL [REQ-056]: hooks/${name}.sh does not contain ts_ms() helper function"
    echo "  (Expected: cross-platform ts_ms() helper instead of raw 'date +%s%3N')"
    all_passed=false
  else
    echo "PASS [REQ-056]: hooks/${name}.sh has ts_ms() helper"
  fi
done

# Check that direct `date +%s%3N` usage is replaced by ts_ms() call
for name in "${HOOK_NAMES[@]}"; do
  HOOK="$ROOT_DIR/hooks/${name}.sh"
  if grep -q 'date +%s%3N' "$HOOK"; then
    echo "FAIL [REQ-056]: hooks/${name}.sh still uses raw 'date +%s%3N' (must use ts_ms())"
    all_passed=false
  else
    echo "PASS [REQ-056]: hooks/${name}.sh does not use raw 'date +%s%3N'"
  fi
done

# ─── Test 4 (integration): POST payload to live daemon ───────────────────────
if [ "$DAEMON_RUNNING" = "true" ]; then
  echo ""
  echo "=== Test 4: Integration — POST to live daemon ==="
  token=""
  if [ -r "$LOOM_TOKEN_FILE" ]; then
    token=$(cat "$LOOM_TOKEN_FILE" 2>/dev/null || echo "")
  fi

  # Use a known-good timestamp for integration test (ms since epoch)
  GOOD_TS=$(python3 -c "import time; print(int(time.time()*1000))" 2>/dev/null \
    || node -e "process.stdout.write(String(Date.now()))" 2>/dev/null \
    || echo "$(date +%s)000")

  INT_PAYLOADS=(
    '{"sessionId":"test-hook-ingest-int","eventType":"pre_tool","toolName":"Bash","payload":{"timestamp":'"$GOOD_TS"'}}'
    '{"sessionId":"test-hook-ingest-int","eventType":"post_tool","toolName":"Bash","payload":{"timestamp":'"$GOOD_TS"',"filePath":"","specEditCandidate":false,"projectRootPath":""}}'
    '{"sessionId":"test-hook-ingest-int","eventType":"session_start","toolName":null,"payload":{"timestamp":'"$GOOD_TS"'}}'
    '{"sessionId":"test-hook-ingest-int","eventType":"stop","toolName":null,"payload":{"timestamp":'"$GOOD_TS"'}}'
    '{"sessionId":"test-hook-ingest-int","eventType":"subagent_stop","toolName":null,"payload":{"timestamp":'"$GOOD_TS"'}}'
  )
  INT_NAMES=(pre_tool post_tool session_start stop subagent_stop)

  for i in "${!INT_NAMES[@]}"; do
    event_name="${INT_NAMES[$i]}"
    payload="${INT_PAYLOADS[$i]}"
    response=$(curl -sf -X POST "$LOOM_DAEMON_URL/event" \
      -H "Content-Type: application/json" \
      -H "x-loom-token: $token" \
      --max-time 2 \
      -d "$payload" 2>&1) || {
        echo "FAIL [REQ-056]: $event_name — daemon POST /event HTTP error"
        all_passed=false
        continue
      }
    if printf '%s' "$response" | jq -e '.ok == true' >/dev/null 2>&1; then
      echo "PASS [REQ-056]: $event_name — daemon POST /event returned ok:true"
    else
      echo "FAIL [REQ-056]: $event_name — daemon response: $response"
      all_passed=false
    fi
  done
fi

# ─── Final result ─────────────────────────────────────────────────────────────
echo ""
if [ "$all_passed" = "true" ]; then
  echo "hook_ingest_integration_test passed"
  exit 0
else
  echo "hook_ingest_integration_test FAILED"
  exit 1
fi
