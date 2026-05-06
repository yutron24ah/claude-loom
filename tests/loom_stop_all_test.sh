#!/usr/bin/env bash
# tests/loom_stop_all_test.sh — /loom-stop --all semantics test
#
# REQ-052: hooks/loom-stop.sh が --all flag に対応する
# - 引数なしは既存挙動（graceful shutdown 1 daemon）を維持
# - --all では tsx watch zombie + manual node launch を kill + report
# - 何も起動していない場合は no-op + report (exit 0 best-effort)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOK="$ROOT_DIR/hooks/loom-stop.sh"

echo "--- loom_stop_all_test ---"

failures=0

# --- (1) hooks/loom-stop.sh が存在する ---
if [ ! -f "$HOOK" ]; then
  echo "FAIL [REQ-052]: hooks/loom-stop.sh が存在しない"
  exit 1
fi
echo "PASS: hooks/loom-stop.sh exists"

# --- (2) 実行権限がある ---
if [ ! -x "$HOOK" ]; then
  echo "FAIL [REQ-052]: hooks/loom-stop.sh は executable でない"
  failures=$((failures + 1))
fi
echo "PASS: hooks/loom-stop.sh is executable"

# --- (3) bash -n syntax check ---
if ! bash -n "$HOOK" 2>&1; then
  echo "FAIL [REQ-052]: hooks/loom-stop.sh syntax error"
  failures=$((failures + 1))
fi
echo "PASS: hooks/loom-stop.sh syntax OK"

# --- (4) --all flag が script 内で処理されていることを静的確認 ---
if ! grep -q -- '--all' "$HOOK"; then
  echo "FAIL [REQ-052]: hooks/loom-stop.sh に --all flag 処理が見つからない"
  failures=$((failures + 1))
else
  echo "PASS: hooks/loom-stop.sh handles --all flag"
fi

# --- (5) tsx watch zombie を pgrep する記述が含まれる ---
if ! grep -q 'tsx.*server\.ts\|pgrep.*tsx' "$HOOK"; then
  echo "FAIL [REQ-052]: hooks/loom-stop.sh に tsx watch zombie 検出 (pgrep tsx.*server.ts) が見つからない"
  failures=$((failures + 1))
else
  echo "PASS: hooks/loom-stop.sh contains tsx watch zombie detection"
fi

# --- (6) manual node launch を pgrep する記述が含まれる ---
if ! grep -qE 'node.*claude-loom/daemon|pgrep.*daemon\.js' "$HOOK"; then
  echo "FAIL [REQ-052]: hooks/loom-stop.sh に manual node launch 検出 (pgrep node.*daemon.js) が見つからない"
  failures=$((failures + 1))
else
  echo "PASS: hooks/loom-stop.sh contains manual node launch detection"
fi

# --- (7) daemon.pid ファイル参照が含まれる ---
if ! grep -q 'daemon\.pid' "$HOOK"; then
  echo "FAIL [REQ-052]: hooks/loom-stop.sh に daemon.pid 参照が見つからない"
  failures=$((failures + 1))
else
  echo "PASS: hooks/loom-stop.sh references daemon.pid"
fi

# --- (8) --all なしで呼出 → daemon 不在時に exit 0 (fail-silent regression) ---
export LOOM_DAEMON_URL="http://127.0.0.1:59999"
export LOOM_TOKEN_FILE="/dev/null"
if ! bash "$HOOK" 2>/dev/null; then
  echo "FAIL [REQ-052]: hooks/loom-stop.sh (no --all) daemon 不在時に非ゼロ exit した"
  failures=$((failures + 1))
else
  echo "PASS: hooks/loom-stop.sh (no --all) fail-silent OK"
fi

# --- (9) --all で呼出 → 何も起動していない場合も exit 0 (best-effort cleanup) ---
# 実際のプロセス kill は不要、no-op で exit 0 すれば OK
LOOM_PID_FILE="/tmp/loom_stop_test_$$.pid"  # 存在しない PID file パス
export LOOM_DAEMON_URL="http://127.0.0.1:59999"
export LOOM_TOKEN_FILE="/dev/null"
if ! bash "$HOOK" --all 2>/dev/null; then
  echo "FAIL [REQ-052]: hooks/loom-stop.sh --all (nothing running) 非ゼロ exit した (should exit 0)"
  failures=$((failures + 1))
else
  echo "PASS: hooks/loom-stop.sh --all (nothing running) exit 0 OK"
fi

# --- (10) --all で呼出 → stdout に report が出力される ---
OUTPUT=$(bash "$HOOK" --all 2>/dev/null || true)
if [ -z "$OUTPUT" ]; then
  echo "FAIL [REQ-052]: hooks/loom-stop.sh --all の stdout が空（report が出力されていない）"
  failures=$((failures + 1))
else
  echo "PASS: hooks/loom-stop.sh --all outputs report: $(echo "$OUTPUT" | head -1)"
fi

# --- (11) --all report に "killed" または "not found" または "no processes" 等のステータス語句が含まれる ---
REPORT=$(bash "$HOOK" --all 2>/dev/null || true)
if ! echo "$REPORT" | grep -qiE "killed|not found|no .* found|nothing|already|clean"; then
  echo "FAIL [REQ-052]: hooks/loom-stop.sh --all report に status 語句 (killed/not found/nothing) が含まれない"
  echo "  got: $REPORT"
  failures=$((failures + 1))
else
  echo "PASS: hooks/loom-stop.sh --all report contains status words"
fi

# --- (12) mock zombie cleanup: sleep zombie で kill 動作確認 ---
# bash の sleep subprocess を tx watch に見立てて LOOM_TEST_ZOMBIE_PATTERN で mock
# (本番は pgrep -f "tsx.*server.ts" だが test では LOOM_TEST_ZOMBIE_PATTERN を override)

# mock zombie を起動
sleep 9999 &
ZOMBIE_PID=$!
disown "$ZOMBIE_PID" 2>/dev/null || true

# sleep は起動直後は確実に生きているはず
if ! kill -0 "$ZOMBIE_PID" 2>/dev/null; then
  echo "SKIP [REQ-052]: mock zombie 起動失敗、テスト (12) をスキップ"
else
  # LOOM_TEST_ZOMBIE_PIDS 環境変数でテスト用 PID を直接渡す
  KILL_OUTPUT=$(LOOM_TEST_ZOMBIE_PIDS="$ZOMBIE_PID" bash "$HOOK" --all 2>/dev/null || true)

  # zombie が kill されていること
  if kill -0 "$ZOMBIE_PID" 2>/dev/null; then
    # まだ生きてたら cleanup して fail
    kill -KILL "$ZOMBIE_PID" 2>/dev/null || true
    echo "FAIL [REQ-052]: hooks/loom-stop.sh --all が mock zombie (PID $ZOMBIE_PID) を kill しなかった"
    failures=$((failures + 1))
  else
    echo "PASS: hooks/loom-stop.sh --all killed mock zombie (PID $ZOMBIE_PID)"
  fi
fi

# --- summary ---
if [ "$failures" -gt 0 ]; then
  echo "loom_stop_all_test FAILED with $failures violations"
  exit 1
fi

echo "loom_stop_all_test passed"
