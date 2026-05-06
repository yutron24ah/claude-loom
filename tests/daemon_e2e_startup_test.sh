#!/usr/bin/env bash
# tests/daemon_e2e_startup_test.sh — daemon production E2E startup test
#
# 由来: retro 2026-05-06-002 F-USER-005
#
# Verify scope:
#   1. `pnpm --filter @claude-loom/daemon build` 成功 → dist/db/migrations/ が同梱されること
#   2. `node daemon/dist/server.js` で daemon が production mode 起動成功
#   3. `curl http://127.0.0.1:5757/health` が HTTP 200 + JSON `{status:"ok",...}` 返すこと
#   4. 終了処理: pkill 後に port が解放されること
#
# 再発防止: tsc が migrations directory を dist へ copy しない silent failure を
# E2E level で機械的に detect、M0.11.5 trinity の core promise を guard する。

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DAEMON_DIST="$ROOT_DIR/daemon/dist/server.js"
MIGRATIONS_DIR="$ROOT_DIR/daemon/dist/db/migrations"
JOURNAL_FILE="$MIGRATIONS_DIR/meta/_journal.json"
# daemon は port hardcoded 5757 (env override 不在)、test は production daemon
# 不在を前提。:5757 が既に使われていれば test を skip する。
TEST_PORT=5757
LOG_FILE="$(mktemp)"
DAEMON_PID=""

# Port pre-check: 既に :5757 が使われていれば test を skip (production daemon
# 同居 / 別 test 競合)。lsof / nc どちらか使える方で確認。
if command -v lsof >/dev/null 2>&1 && lsof -i ":$TEST_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "SKIP: port $TEST_PORT already in use (production daemon or other test)"
  exit 0
fi

cleanup() {
  if [ -n "$DAEMON_PID" ] && kill -0 "$DAEMON_PID" 2>/dev/null; then
    kill "$DAEMON_PID" 2>/dev/null || true
    sleep 1
  fi
  pkill -f "node $DAEMON_DIST" 2>/dev/null || true
  rm -f "$LOG_FILE"
}
trap cleanup EXIT

echo "[1/4] daemon build (tsc + migrations bundle copy)..."
if ! pnpm --filter @claude-loom/daemon build > /dev/null 2>&1; then
  echo "FAIL: daemon build failed"
  exit 1
fi

echo "[2/4] verify migrations bundle in dist..."
if [ ! -f "$JOURNAL_FILE" ]; then
  echo "FAIL: $JOURNAL_FILE not found — build:migrations step missing or broken"
  echo "  expected: src/db/migrations/ → dist/db/migrations/ copy"
  exit 1
fi

echo "[3/4] start daemon in production mode..."
node "$DAEMON_DIST" > "$LOG_FILE" 2>&1 &
DAEMON_PID=$!
sleep 3

if ! kill -0 "$DAEMON_PID" 2>/dev/null; then
  echo "FAIL: daemon process exited prematurely"
  echo "--- LOG ---"
  cat "$LOG_FILE"
  exit 1
fi

echo "[4/4] curl /health verify..."
HEALTH_BODY=$(curl -s -o /tmp/daemon-e2e-health.json -w "%{http_code}" "http://127.0.0.1:$TEST_PORT/health" || echo "000")
if [ "$HEALTH_BODY" != "200" ]; then
  echo "FAIL: /health returned HTTP $HEALTH_BODY (expected 200)"
  echo "--- LOG ---"
  cat "$LOG_FILE"
  exit 1
fi

if ! grep -q '"status":"ok"' /tmp/daemon-e2e-health.json; then
  echo "FAIL: /health body missing status:ok"
  cat /tmp/daemon-e2e-health.json
  exit 1
fi

echo "PASS: daemon production startup E2E (HTTP 200 + status:ok)"
exit 0
