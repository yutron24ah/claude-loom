#!/usr/bin/env bash
# tests/uninstall_test.sh — uninstall.sh の TDD テスト
#
# REQ-036, REQ-037, REQ-038, REQ-039, REQ-040 をカバー

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNINSTALL_SH="$ROOT_DIR/uninstall.sh"

# ----- 前提: uninstall.sh が存在する -----
if [ ! -f "$UNINSTALL_SH" ]; then
  echo "FAIL: uninstall.sh が存在しない"
  exit 1
fi

# テスト共通: CLAUDE_HOME を sandbox に向ける
make_sandbox() {
  local sb
  sb="$(mktemp -d)"
  export CLAUDE_HOME="$sb/.claude"
  # install.sh で install を実行
  bash "$ROOT_DIR/install.sh" >/dev/null 2>&1
  echo "$sb"
}

# ----- REQ-036: dry-run mode では実体を変更しない -----
SB1="$(make_sandbox)"
trap 'rm -rf "$SB1"' EXIT

# install 後に symlink が存在することを確認
if ! find "$SB1/.claude/agents" -name "loom-*.md" -type l | grep -q .; then
  echo "FAIL: REQ-036: テスト前提 — install 後に agents symlink なし"
  exit 1
fi

# dry-run 実行 (--yes で confirm skip)
CLAUDE_HOME="$SB1/.claude" bash "$UNINSTALL_SH" --dry-run --yes >/dev/null 2>&1

# symlink は残っているべき
if find "$SB1/.claude/agents" -name "loom-*.md" -type l | grep -q .; then
  echo "PASS: REQ-036: dry-run では symlink は削除されない"
else
  echo "FAIL: REQ-036: dry-run なのに symlink が削除された"
  exit 1
fi

# ----- REQ-037: install → uninstall round-trip で symlink が全削除される -----
SB2="$(make_sandbox)"
trap 'rm -rf "$SB1" "$SB2"' EXIT

# uninstall 実行 (--yes で confirm skip)
CLAUDE_HOME="$SB2/.claude" bash "$UNINSTALL_SH" --yes >/dev/null 2>&1

# agents symlink が消えているべき
if find "$SB2/.claude/agents" -name "loom-*.md" -type l 2>/dev/null | grep -q .; then
  echo "FAIL: REQ-037: uninstall 後も agents symlink が残っている"
  exit 1
else
  echo "PASS: REQ-037: uninstall 後 agents symlink 削除確認"
fi

# commands symlink が消えているべき
if find "$SB2/.claude/commands" -name "loom-*.md" -type l 2>/dev/null | grep -q .; then
  echo "FAIL: REQ-037: uninstall 後も commands symlink が残っている"
  exit 1
else
  echo "PASS: REQ-037: uninstall 後 commands symlink 削除確認"
fi

# skills symlink が消えているべき
if find "$SB2/.claude/skills" -mindepth 1 -maxdepth 1 -name "loom-*" -type l 2>/dev/null | grep -q .; then
  echo "FAIL: REQ-037: uninstall 後も skills symlink が残っている"
  exit 1
else
  echo "PASS: REQ-037: uninstall 後 skills symlink 削除確認"
fi

# hooks symlink が消えているべき
if find "$SB2/.claude/hooks" -name "*.sh" -type l 2>/dev/null | grep -q .; then
  echo "FAIL: REQ-037: uninstall 後も hooks symlink が残っている"
  exit 1
else
  echo "PASS: REQ-037: uninstall 後 hooks symlink 削除確認"
fi

# ----- REQ-038: default で .claude-loom/ local state は保持 -----
SB3="$(make_sandbox)"
trap 'rm -rf "$SB1" "$SB2" "$SB3"' EXIT

# .claude-loom/ ディレクトリを作成（状態ファイルをシミュレート）
LOCAL_STATE_DIR="$SB3/.claude-loom"
mkdir -p "$LOCAL_STATE_DIR"
echo '{"test": true}' > "$LOCAL_STATE_DIR/project-prefs.json"

CLAUDE_HOME="$SB3/.claude" LOOM_STATE_DIR="$SB3/.claude-loom" bash "$UNINSTALL_SH" --yes >/dev/null 2>&1

if [ -f "$LOCAL_STATE_DIR/project-prefs.json" ]; then
  echo "PASS: REQ-038: default で .claude-loom/ state は保持される"
else
  echo "FAIL: REQ-038: default で .claude-loom/ state が削除された"
  exit 1
fi

# ----- REQ-039: --purge-state で .claude-loom/ が削除される -----
SB4="$(make_sandbox)"
trap 'rm -rf "$SB1" "$SB2" "$SB3" "$SB4"' EXIT

LOCAL_STATE_DIR4="$SB4/.claude-loom"
mkdir -p "$LOCAL_STATE_DIR4"
echo '{"test": true}' > "$LOCAL_STATE_DIR4/project-prefs.json"

CLAUDE_HOME="$SB4/.claude" LOOM_STATE_DIR="$SB4/.claude-loom" bash "$UNINSTALL_SH" --yes --purge-state >/dev/null 2>&1

if [ -d "$LOCAL_STATE_DIR4" ]; then
  echo "FAIL: REQ-039: --purge-state でも .claude-loom/ が残っている"
  exit 1
else
  echo "PASS: REQ-039: --purge-state で .claude-loom/ 削除確認"
fi

# ----- REQ-040: --yes flag で confirm prompt をスキップ (exit code 0) -----
SB5="$(make_sandbox)"
trap 'rm -rf "$SB1" "$SB2" "$SB3" "$SB4" "$SB5"' EXIT

CLAUDE_HOME="$SB5/.claude" bash "$UNINSTALL_SH" --yes
EXIT_CODE=$?
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "PASS: REQ-040: --yes で exit code 0"
else
  echo "FAIL: REQ-040: --yes の exit code が $EXIT_CODE (expected 0)"
  exit 1
fi

echo "All uninstall_test checks passed"
