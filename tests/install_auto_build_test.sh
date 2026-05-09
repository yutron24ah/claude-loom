#!/usr/bin/env bash
# tests/install_auto_build_test.sh — REQ-061 (feat/install-auto-build item 2)
#
# WHY: end-user 「git clone → ./install.sh → 動く」UX のため install.sh が
# daemon/dist + ui/dist を auto-build するようにする。dev contributors は
# LOOM_NO_BUILD=1 で skip。pnpm 不在は graceful WARN + skip。
#
# Contract (REQ-061):
#   1. LOOM_NO_BUILD=1 set → install.sh は pnpm を一切呼ばず "skipped (LOOM_NO_BUILD)"
#      の旨を出力して通常 path 継続
#   2. LOOM_NO_BUILD unset + pnpm 不在 → "pnpm not found" WARN + skip + 通常 path 継続
#   3. LOOM_NO_BUILD unset + pnpm 存在 → pnpm に
#      `--filter @claude-loom/daemon build` および `--filter @claude-loom/ui build`
#      を渡して呼出す (build tools 内部の incremental cache に依存、idempotent)
#
# TODO(REQ-061 follow-up): contract (1) の「node_modules 不在なら pnpm install を
# 自動実行」の branch は test されていない。実 ROOT_DIR は既に node_modules を
# 持つため再現にはまた別の test fixture (LOOM_ROOT_DIR override 等) が要る。
# pnpm install 自体の挙動は user-driven workflow で確認可能、低優先度。

set -euo pipefail

TESTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$TESTS_DIR/.." && pwd)"

pass=0
fail=0

# WHY array-based cleanup: trap を 1 度だけ設定して全 sandbox dir を一括除去。
# Test を追加する度に trap を更新するのを忘れる accumulation pattern を避ける。
CLEANUP_DIRS=()
cleanup() {
  if [ "${#CLEANUP_DIRS[@]}" -gt 0 ]; then
    rm -rf "${CLEANUP_DIRS[@]}"
  fi
}
trap cleanup EXIT

check() {
  local desc="$1"
  local result="$2"
  if [ "$result" = "ok" ]; then
    echo "  PASS: $desc"
    pass=$((pass + 1))
  else
    echo "  FAIL: $desc"
    fail=$((fail + 1))
  fi
}

# ヘルパー: fake pnpm を用意して PATH 先頭に挿す。呼出された arg を log に書出す。
make_fake_pnpm() {
  local fake_bin="$1"
  cat > "$fake_bin/pnpm" <<'EOF'
#!/usr/bin/env bash
echo "PNPM_CALLED: $*" >> "${FAKE_PNPM_LOG:-/dev/null}"
exit 0
EOF
  chmod +x "$fake_bin/pnpm"
}

echo "=== install_auto_build_test (REQ-061) ==="

# ----- Test 1: LOOM_NO_BUILD=1 で auto-build が skip される -----
echo ""
echo "--- Test 1: LOOM_NO_BUILD=1 → no pnpm invocation ---"

sandbox1=$(mktemp -d)
loom_home1=$(mktemp -d)
fake_bin1=$(mktemp -d)
fake_log1="$sandbox1/pnpm-calls.log"
CLEANUP_DIRS+=("$sandbox1" "$loom_home1" "$fake_bin1")

make_fake_pnpm "$fake_bin1"

output1=$(
  LOOM_NO_BUILD=1 \
  CLAUDE_HOME="$sandbox1/.claude" \
  LOOM_HOME="$loom_home1" \
  FAKE_PNPM_LOG="$fake_log1" \
  PATH="$fake_bin1:$PATH" \
  bash "$ROOT_DIR/install.sh" 2>&1
)

if [ ! -f "$fake_log1" ] || [ ! -s "$fake_log1" ]; then
  check "T1: LOOM_NO_BUILD=1 で fake pnpm が一切呼ばれていない" "ok"
else
  check "T1: LOOM_NO_BUILD=1 で fake pnpm が一切呼ばれていない" "fail"
  echo "    pnpm calls log:"
  sed 's/^/    /' "$fake_log1"
fi

if echo "$output1" | grep -qE "LOOM_NO_BUILD|skipped.*build|build.*skipped"; then
  check "T1: install.sh が build skip の旨を stdout に出力" "ok"
else
  check "T1: install.sh が build skip の旨を stdout に出力" "fail"
fi

if echo "$output1" | grep -q "Installation complete"; then
  check "T1: LOOM_NO_BUILD=1 でも install 自体は成功" "ok"
else
  check "T1: LOOM_NO_BUILD=1 でも install 自体は成功" "fail"
fi

# ----- Test 2: 実 invocation 確認 (fake pnpm log で daemon + ui build call を verify) -----
echo ""
echo "--- Test 2: fake pnpm log で実 invocation を verify ---"

sandbox2=$(mktemp -d)
loom_home2=$(mktemp -d)
fake_bin2=$(mktemp -d)
fake_log2="$sandbox2/pnpm-calls.log"
CLEANUP_DIRS+=("$sandbox2" "$loom_home2" "$fake_bin2")

make_fake_pnpm "$fake_bin2"

output2=$(
  CLAUDE_HOME="$sandbox2/.claude" \
  LOOM_HOME="$loom_home2" \
  FAKE_PNPM_LOG="$fake_log2" \
  PATH="$fake_bin2:$PATH" \
  bash "$ROOT_DIR/install.sh" 2>&1
) || true

if [ -f "$fake_log2" ] && grep -qE "PNPM_CALLED:.*--filter.*@claude-loom/daemon.*build" "$fake_log2"; then
  check "T2: fake pnpm が daemon build invocation を受信" "ok"
else
  check "T2: fake pnpm が daemon build invocation を受信" "fail"
  [ -f "$fake_log2" ] && { echo "    pnpm log:"; sed 's/^/    /' "$fake_log2"; }
fi

if [ -f "$fake_log2" ] && grep -qE "PNPM_CALLED:.*--filter.*@claude-loom/ui.*build" "$fake_log2"; then
  check "T2: fake pnpm が ui build invocation を受信" "ok"
else
  check "T2: fake pnpm が ui build invocation を受信" "fail"
fi

# ----- Test 3: pnpm 不在時 graceful skip -----
echo ""
echo "--- Test 3: pnpm 不在時 (PATH 上に pnpm なし) graceful skip ---"

sandbox3=$(mktemp -d)
loom_home3=$(mktemp -d)
empty_bin3=$(mktemp -d)
CLEANUP_DIRS+=("$sandbox3" "$loom_home3" "$empty_bin3")

# 最小 PATH で実行 (bash + 標準コマンドのみ確保、pnpm は意図的に不在)
output3=$(
  CLAUDE_HOME="$sandbox3/.claude" \
  LOOM_HOME="$loom_home3" \
  PATH="$empty_bin3:/usr/bin:/bin" \
  bash "$ROOT_DIR/install.sh" 2>&1
) || true

if echo "$output3" | grep -qE "pnpm not found|pnpm.*not.*found|pnpm.*missing"; then
  check "T3: pnpm 不在時の WARN 出力あり" "ok"
else
  check "T3: pnpm 不在時の WARN 出力あり" "fail"
fi

if echo "$output3" | grep -q "Installation complete"; then
  check "T3: pnpm 不在でも install 自体は完走" "ok"
else
  check "T3: pnpm 不在でも install 自体は完走" "fail"
fi

# ----- Test 4: README に LOOM_NO_BUILD escape hatch が文書化されている -----
# WHY: m0115_t8 が LOOM_NO_UI / ui.auto_launch を README mirror で守るのと
# 同 pattern。escape hatch は contributors / CI が知る必要があるので silently
# 削除されたら気づきたい。
echo ""
echo "--- Test 4: README に LOOM_NO_BUILD 記述あり ---"

if grep -q "LOOM_NO_BUILD" "$ROOT_DIR/README.md"; then
  check "T4: README.md に LOOM_NO_BUILD 記述" "ok"
else
  check "T4: README.md に LOOM_NO_BUILD 記述" "fail"
fi

if grep -q "LOOM_NO_BUILD" "$ROOT_DIR/README.ja.md"; then
  check "T4: README.ja.md に LOOM_NO_BUILD 記述" "ok"
else
  check "T4: README.ja.md に LOOM_NO_BUILD 記述" "fail"
fi

echo ""
echo "Passed: $pass   Failed: $fail"
[ "$fail" -eq 0 ]
