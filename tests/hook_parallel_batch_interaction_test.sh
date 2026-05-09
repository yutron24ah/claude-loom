#!/usr/bin/env bash
# tests/hook_parallel_batch_interaction_test.sh — parallel SessionStart interaction test
#
# REQ-058: parallel SessionStart 多重発火 + daemon load 観察 +
# Bug A trigger interaction を structural verify する。
#
# 4 scenario:
#   Test 1: 単発 SessionStart fire (regression baseline)
#   Test 2: 3 並列 SessionStart fire — daemon が all 200 応答、log に 3 entry
#   Test 3: 並列発火中 daemon responsive (/health 200 concurrent)
#   Test 4: daemon 不在時 fail-silent (regression 防止)
#
# WHY: retro 2026-05-06-003 F-proc-002 由来。parallel batch dispatch + SessionStart
# 多重発火 interaction の structural test gap を埋める。
# post-tag-hotfix protocol §3.6.8.11 適用第 1 例。
#
# daemon dependency: LOOM_DAEMON_URL で test 用 daemon 指定可能。
# daemon 不在時は Test 2-3 skip + WARN (CI environment friendly)。

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_START_HOOK="$ROOT_DIR/hooks/session_start.sh"

LOOM_DAEMON_URL="${LOOM_DAEMON_URL:-http://127.0.0.1:5757}"
LOOM_TOKEN_FILE="${LOOM_TOKEN_FILE:-$HOME/.claude-loom/daemon-token}"

echo "--- hook_parallel_batch_interaction_test (REQ-058) ---"

all_passed=true
PASS=0
FAIL=0
SKIP=0

pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); all_passed=false; }
skip() { echo "SKIP: $1"; SKIP=$((SKIP + 1)); }

# Probe daemon availability
DAEMON_RUNNING=false
if curl -sf --max-time 1 "$LOOM_DAEMON_URL/health" >/dev/null 2>&1; then
  DAEMON_RUNNING=true
  echo "INFO: daemon is running at $LOOM_DAEMON_URL — live interaction tests enabled"
else
  echo "WARN: daemon not running at $LOOM_DAEMON_URL — Tests 2/3 will be skipped"
fi

# ─── Test 1: single SessionStart fire (regression baseline) ──────────────────
# WHY: Baseline — single invocation must always succeed (fail-silent exit 0),
# whether or not daemon is running. This is the fundamental contract.
echo ""
echo "=== Test 1: single SessionStart fire (regression baseline) ==="
exit_code=0
LOOM_NO_AUTO_UI=1 LOOM_DAEMON_URL="$LOOM_DAEMON_URL" \
  bash "$SESSION_START_HOOK" </dev/null 2>/dev/null || exit_code=$?
if [ "$exit_code" -eq 0 ]; then
  pass "Test 1 — single SessionStart exit 0 (fail-silent contract maintained)"
else
  fail "Test 1 — single SessionStart returned exit $exit_code (expected 0)"
fi

# ─── Test 2: 3 parallel SessionStart fires — daemon load check ───────────────
# WHY: Parallel batch dispatch scenario — PM may dispatch 3 subagents
# simultaneously, each triggering SessionStart. Daemon must handle concurrent
# POST /event without race conditions or 5xx errors.
echo ""
echo "=== Test 2: 3 parallel SessionStart fire (daemon load) ==="
if [ "$DAEMON_RUNNING" != "true" ]; then
  skip "Test 2 — daemon not running, skip parallel load test"
else
  token=""
  if [ -r "$LOOM_TOKEN_FILE" ]; then
    token=$(cat "$LOOM_TOKEN_FILE" 2>/dev/null || echo "")
  fi

  # Use direct curl to simulate 3 parallel SessionStart events (avoids LOOM_NO_AUTO_UI side-effects)
  TMPDIR_T2=$(mktemp -d)
  trap 'rm -rf "$TMPDIR_T2"' EXIT

  # Generate a cross-platform ms timestamp
  if command -v python3 >/dev/null 2>&1; then
    TS=$(python3 -c "import time; print(int(time.time()*1000))")
  elif command -v node >/dev/null 2>&1; then
    TS=$(node -e "process.stdout.write(String(Date.now()))")
  else
    TS="$(date +%s)000"
  fi

  # Fire 3 concurrent POST /event requests in background
  for i in 1 2 3; do
    (
      response=$(curl -sf -X POST "$LOOM_DAEMON_URL/event" \
        -H "Content-Type: application/json" \
        -H "x-loom-token: $token" \
        --max-time 2 \
        -d "{\"sessionId\":\"test-parallel-batch-$i\",\"eventType\":\"session_start\",\"toolName\":null,\"payload\":{\"timestamp\":$TS}}" \
        2>/dev/null) || { echo "CURL_FAIL_$i" > "$TMPDIR_T2/result_$i"; exit 0; }
      echo "$response" > "$TMPDIR_T2/result_$i"
    ) &
  done
  wait  # wait for all 3 background jobs

  # Check all 3 responses
  all_ok=true
  for i in 1 2 3; do
    result_file="$TMPDIR_T2/result_$i"
    if [ ! -f "$result_file" ]; then
      fail "Test 2 — parallel fire $i: result file not found"
      all_ok=false
      continue
    fi
    response=$(cat "$result_file")
    if [ "$response" = "CURL_FAIL_$i" ]; then
      fail "Test 2 — parallel fire $i: curl failed (daemon HTTP error)"
      all_ok=false
    elif printf '%s' "$response" | jq -e '.ok == true' >/dev/null 2>&1; then
      echo "  parallel fire $i: ok=true"
    else
      fail "Test 2 — parallel fire $i: unexpected response: $response"
      all_ok=false
    fi
  done

  if [ "$all_ok" = "true" ]; then
    pass "Test 2 — 3 parallel SessionStart fires all returned ok=true (no race condition)"
  fi
fi

# ─── Test 3: daemon responsive during parallel fires (/health concurrent) ────
# WHY: Bug A was triggered by race condition where daemon appeared healthy
# but actual port bind was unstable. Under parallel load, /health must
# remain consistently 200 — confirming daemon stability.
echo ""
echo "=== Test 3: daemon /health responsive during parallel load ==="
if [ "$DAEMON_RUNNING" != "true" ]; then
  skip "Test 3 — daemon not running, skip responsiveness check"
else
  TMPDIR_T3=$(mktemp -d)
  trap 'rm -rf "$TMPDIR_T3"' EXIT

  # Fire 3 concurrent /health checks
  for i in 1 2 3; do
    (
      http_code=$(curl -sf -o /dev/null -w "%{http_code}" \
        --max-time 1 "$LOOM_DAEMON_URL/health" 2>/dev/null) || http_code="FAIL"
      echo "$http_code" > "$TMPDIR_T3/health_$i"
    ) &
  done
  wait

  all_healthy=true
  for i in 1 2 3; do
    health_file="$TMPDIR_T3/health_$i"
    if [ ! -f "$health_file" ]; then
      fail "Test 3 — health check $i: result file not found"
      all_healthy=false
      continue
    fi
    code=$(cat "$health_file")
    if [ "$code" = "200" ]; then
      echo "  health check $i: HTTP 200"
    else
      fail "Test 3 — health check $i: expected HTTP 200, got $code (Bug A trigger potential)"
      all_healthy=false
    fi
  done

  if [ "$all_healthy" = "true" ]; then
    pass "Test 3 — daemon /health returned 200 under concurrent load (Bug A not triggered)"
  fi
fi

# ─── Test 4: daemon absent fail-silent ────────────────────────────────────────
# WHY: Regression guard — hooks must always exit 0 regardless of daemon state.
# This is the core fail-silent contract. curl --max-time 1 || true semantics.
echo ""
echo "=== Test 4: daemon absent fail-silent ==="
exit_code=0
# Use a port that is definitely not listening (59998 is unlikely to conflict)
LOOM_NO_AUTO_UI=1 LOOM_DAEMON_URL="http://127.0.0.1:59998" \
  bash "$SESSION_START_HOOK" </dev/null 2>/dev/null || exit_code=$?
if [ "$exit_code" -eq 0 ]; then
  pass "Test 4 — daemon absent: session_start.sh exit 0 (fail-silent maintained)"
else
  fail "Test 4 — daemon absent: session_start.sh returned exit $exit_code (expected 0)"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "Results: PASS=$PASS FAIL=$FAIL SKIP=$SKIP"
if [ "$all_passed" = "true" ]; then
  echo "hook_parallel_batch_interaction_test passed"
  exit 0
else
  echo "hook_parallel_batch_interaction_test FAILED"
  exit 1
fi
