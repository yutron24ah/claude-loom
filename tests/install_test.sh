#!/usr/bin/env bash
# tests/install_test.sh — install.sh の TDD テスト
#
# REQ-001, REQ-002, REQ-003, REQ-004 をカバー

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SANDBOX="$(mktemp -d)"
trap 'rm -rf "$SANDBOX"' EXIT

# install.sh は CLAUDE_HOME 環境変数で配置先を上書き可能（テスト用）
export CLAUDE_HOME="$SANDBOX/.claude"

# ダミー agent / command ファイルを準備（install.sh が拾うため）
mkdir -p "$ROOT_DIR/agents" "$ROOT_DIR/commands"

# 既に他の Task で作っているはずだが、テスト独立性のためダミーを作る場合に対応
# ここでは「リポジトリの agents/ commands/ を symlink する」が install.sh の責務

# ----- REQ-001 / REQ-002: シンボリックリンク設置 -----
bash "$ROOT_DIR/install.sh"

# 期待：~/.claude/agents/loom-*.md が symlink として存在
if ! find "$CLAUDE_HOME/agents" -name "loom-*.md" -type l | grep -q .; then
  echo "FAIL: REQ-001: ~/.claude/agents/loom-*.md symlink が見つからない"
  exit 1
fi

if ! find "$CLAUDE_HOME/commands" -name "loom-*.md" -type l | grep -q .; then
  echo "FAIL: REQ-002: ~/.claude/commands/loom-*.md symlink が見つからない"
  exit 1
fi

# ----- REQ-003: idempotent -----
bash "$ROOT_DIR/install.sh"  # 2 回目実行
echo "PASS: REQ-003: 2 回実行で破壊なし"

# ----- REQ-004: 通常ファイルとの衝突 -----
# 既存 symlink を消して通常ファイルに置換
some_link=$(find "$CLAUDE_HOME/agents" -name "loom-*.md" -type l | head -1)
if [ -n "$some_link" ]; then
  rm "$some_link"
  echo "blocking content" > "$some_link"

  # install.sh は失敗するべき
  if bash "$ROOT_DIR/install.sh" 2>/dev/null; then
    echo "FAIL: REQ-004: 通常ファイル衝突時に install.sh がエラー終了しなかった"
    exit 1
  fi
  echo "PASS: REQ-004: 通常ファイル衝突を検出してエラー終了"
fi

echo "All install_test checks passed"
