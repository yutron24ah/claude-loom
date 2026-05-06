#!/usr/bin/env bash
# tests/install_test.sh — install.sh の TDD テスト
#
# REQ-001, REQ-002, REQ-003, REQ-004, REQ-008, REQ-009 をカバー

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
else
  echo "PASS: REQ-001: agents symlinks present"
fi

if ! find "$CLAUDE_HOME/commands" -name "loom-*.md" -type l | grep -q .; then
  echo "FAIL: REQ-002: ~/.claude/commands/loom-*.md symlink が見つからない"
  exit 1
else
  echo "PASS: REQ-002: commands symlinks present"
fi

# ----- REQ-008: skills directory symlinks -----
if ! find "$CLAUDE_HOME/skills" -mindepth 1 -maxdepth 1 -name "loom-*" -type l | grep -q .; then
  echo "FAIL: REQ-008: ~/.claude/skills/loom-*/ symlink が見つからない"
  exit 1
else
  echo "PASS: REQ-008: skills directory symlinks present"
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
else
  echo "SKIP: REQ-004: agents/loom-*.md が存在しないため衝突テストを実行できず（Tasks 7-11 完了後に有効化）"
fi

# ----- REQ-009: skills directory collision with regular directory -----
some_skill_link=$(find "$CLAUDE_HOME/skills" -mindepth 1 -maxdepth 1 -name "loom-*" -type l | head -1)
if [ -n "$some_skill_link" ]; then
  rm "$some_skill_link"
  mkdir "$some_skill_link"
  echo "blocking" > "$some_skill_link/SKILL.md"

  # install.sh は失敗するべき
  if bash "$ROOT_DIR/install.sh" 2>/dev/null; then
    echo "FAIL: REQ-009: 通常ディレクトリ衝突時に install.sh がエラー終了しなかった"
    exit 1
  fi
  echo "PASS: REQ-009: 通常ディレクトリ衝突を検出してエラー終了"

  rm -rf "$some_skill_link"
else
  echo "SKIP: REQ-009: skills/loom-*/ symlink が無いため衝突テストを実行できず（Tasks 5-8 完了後に有効化）"
fi

# ----- REQ-023: prompts/personalities/ symlink (M0.9) -----
# install.sh は prompts/personalities/ を ~/.claude/prompts/personalities/ に symlink すべき
# 直前の衝突テストで sandbox 状態が乱れとるので、fresh sandbox で確認
fresh_sandbox=$(mktemp -d)
trap 'rm -rf "$SANDBOX" "$fresh_sandbox"' EXIT
CLAUDE_HOME="$fresh_sandbox/.claude" bash "$ROOT_DIR/install.sh" >/dev/null

if [ -L "$fresh_sandbox/.claude/prompts/personalities" ]; then
  echo "PASS: REQ-023: ~/.claude/prompts/personalities is a symlink (M0.9)"
else
  echo "FAIL: REQ-023: ~/.claude/prompts/personalities が symlink ちゃう"
  exit 1
fi

# ----- REQ-028: hooks symlink + settings.json 配線 (M1) -----
fresh_sandbox2=$(mktemp -d)
trap 'rm -rf "$SANDBOX" "$fresh_sandbox" "$fresh_sandbox2"' EXIT
CLAUDE_HOME="$fresh_sandbox2/.claude" bash "$ROOT_DIR/install.sh" >/dev/null

if [ -L "$fresh_sandbox2/.claude/hooks/session_start.sh" ]; then
  echo "PASS: REQ-028: hooks symlink (M1)"
else
  echo "FAIL: REQ-028: hooks symlink missing"
  exit 1
fi

if command -v jq >/dev/null 2>&1; then
  # retro 2026-05-06-003 F-USER-008: PascalCase + matcher 配列構造を verify
  # 旧 snake_case key (`.hooks.session_start`) は SDK 仕様非整合で削除済
  # 新構造: .hooks.SessionStart[N].hooks[N].command が session_start.sh を含む
  settings_file="$fresh_sandbox2/.claude/settings.json"
  if [ -f "$settings_file" ] && \
     jq -e '
       .hooks.SessionStart and
       (.hooks.SessionStart | type) == "array" and
       (.hooks.SessionStart | map(.hooks // []) | flatten | map(.command) | any(test("session_start.sh$")))
     ' "$settings_file" >/dev/null 2>&1; then
    echo "PASS: REQ-028: settings.json hooks 配線 (M1, PascalCase + matcher 配列、SDK 仕様準拠)"
  else
    echo "FAIL: REQ-028: settings.json hooks 配線 not in PascalCase + matcher 配列構造"
    jq '.hooks' "$settings_file" 2>&1 | head -10
    exit 1
  fi
fi

# ----- REQ-046: daemon.js symlink bootstrap (M0.11.5 hotfix → retro 2026-05-06-002 F-USER-006 → retro 2026-05-06-003 F-USER-007) -----
# install.sh は <project>/daemon/dist/server.js を ~/.claude-loom/daemon.js に symlink すべき
# (loom-launch-ui.sh の DAEMON_BIN=$HOME/.claude-loom/daemon.js 参照を満たす + lazy daemon 起動)
# 履歴:
#   - retro 2026-05-06-001 F-USER-001 hotfix: install.sh に symlink bootstrap step 追加
#   - retro 2026-05-06-002 F-USER-006 hotfix: target を index.js → server.js に修正
#   - retro 2026-05-06-003 F-USER-007 hotfix: server.js CLI guard を symlink invocation 対応 (本 test の expected target は server.js のまま、CLI guard side fix が server.ts に入る)
# fresh sandbox + LOOM_HOME 上書きで test 独立性確保
fresh_sandbox3=$(mktemp -d)
fresh_loom_home=$(mktemp -d)
trap 'rm -rf "$SANDBOX" "$fresh_sandbox" "$fresh_sandbox2" "$fresh_sandbox3" "$fresh_loom_home"' EXIT

# daemon/dist/server.js 存在前提 (実 repo 状態に依存、build 済み環境想定)
if [ ! -f "$ROOT_DIR/daemon/dist/server.js" ]; then
  echo "SKIP: REQ-046: daemon/dist/server.js が build 未完了のため symlink test skip"
else
  CLAUDE_HOME="$fresh_sandbox3/.claude" LOOM_HOME="$fresh_loom_home/.claude-loom" \
    bash "$ROOT_DIR/install.sh" >/dev/null

  if [ -L "$fresh_loom_home/.claude-loom/daemon.js" ]; then
    daemon_target=$(readlink "$fresh_loom_home/.claude-loom/daemon.js")
    if [ "$daemon_target" = "$ROOT_DIR/daemon/dist/server.js" ] || \
       [ "$(cd "$(dirname "$daemon_target")" 2>/dev/null && pwd)/$(basename "$daemon_target")" = "$ROOT_DIR/daemon/dist/server.js" ]; then
      echo "PASS: REQ-046: daemon.js symlink configured ($fresh_loom_home/.claude-loom/daemon.js -> $daemon_target)"
    else
      echo "FAIL: REQ-046: daemon.js symlink target mismatch (expected $ROOT_DIR/daemon/dist/server.js, got $daemon_target)"
      exit 1
    fi
  else
    echo "FAIL: REQ-046: daemon.js symlink not configured at $fresh_loom_home/.claude-loom/daemon.js"
    exit 1
  fi
fi

echo "All install_test checks passed"
