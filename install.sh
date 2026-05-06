#!/usr/bin/env bash
# install.sh — claude-loom harness installer
#
# 役割：agents/ / commands/ のファイル + skills/ のディレクトリを ~/.claude/<type>/ にシンボリックリンク
# M1 で hooks/ 配線 + settings.json 書換、M0.11.5 hotfix で daemon.js symlink bootstrap 追加

set -euo pipefail

# テスト用に CLAUDE_HOME を上書き可能
if [ -z "${HOME:-}" ] && [ -z "${CLAUDE_HOME:-}" ]; then
  echo "ERROR: neither \$CLAUDE_HOME nor \$HOME is set; refusing to install to /.claude" >&2
  exit 1
fi
CLAUDE_HOME="${CLAUDE_HOME:-$HOME/.claude}"
LOOM_HOME="${LOOM_HOME:-$HOME/.claude-loom}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 前提チェック
for cmd in bash ln; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: required command '$cmd' not found in PATH" >&2
    exit 1
  fi
done

# ディレクトリ準備
mkdir -p "$CLAUDE_HOME/agents" "$CLAUDE_HOME/commands" "$CLAUDE_HOME/skills" "$CLAUDE_HOME/prompts"

install_links() {
  local src_dir="$1"
  local dest_dir="$2"
  local pattern="$3"

  shopt -s nullglob
  for src in "$src_dir"/$pattern; do
    local fname
    fname=$(basename "$src")
    local dest="$dest_dir/$fname"

    if [ -e "$dest" ] && [ ! -L "$dest" ]; then
      shopt -u nullglob
      echo "ERROR: $dest exists as a regular file (not a symlink). Remove or rename it, then re-run install.sh." >&2
      exit 1
    fi

    if [ -L "$dest" ]; then
      echo "  replacing existing symlink: $dest"
      rm "$dest"
    fi

    # macOS / Linux で realpath が無い環境向けフォールバック
    local abs_src
    if command -v realpath >/dev/null 2>&1; then
      abs_src=$(realpath "$src")
    else
      abs_src="$(cd "$(dirname "$src")" && pwd)/$(basename "$src")"
    fi

    ln -s "$abs_src" "$dest"
    echo "  linked: $dest -> $abs_src"
  done
  shopt -u nullglob
}

install_dir_links() {
  local src_parent="$1"
  local dest_parent="$2"
  local pattern="$3"

  shopt -s nullglob
  for src in "$src_parent"/$pattern/; do
    src="${src%/}"
    local fname
    fname=$(basename "$src")
    local dest="$dest_parent/$fname"

    if [ -e "$dest" ] && [ ! -L "$dest" ]; then
      shopt -u nullglob
      echo "ERROR: $dest exists as a regular directory (not a symlink). Remove or rename it, then re-run install.sh." >&2
      exit 1
    fi

    if [ -L "$dest" ]; then
      echo "  replacing existing symlink: $dest"
      rm "$dest"
    fi

    local abs_src
    if command -v realpath >/dev/null 2>&1; then
      abs_src=$(realpath "$src")
    else
      abs_src="$(cd "$(dirname "$src")" && pwd)/$(basename "$src")"
    fi

    ln -s "$abs_src" "$dest"
    echo "  linked: $dest -> $abs_src"
  done
  shopt -u nullglob
}

echo "Installing claude-loom harness..."
echo "  CLAUDE_HOME = $CLAUDE_HOME"
echo "  ROOT_DIR    = $ROOT_DIR"
echo ""

install_links "$ROOT_DIR/agents" "$CLAUDE_HOME/agents" "loom-*.md"
install_links "$ROOT_DIR/commands" "$CLAUDE_HOME/commands" "loom*.md"
install_dir_links "$ROOT_DIR/skills" "$CLAUDE_HOME/skills" "loom-*"
install_dir_links "$ROOT_DIR/prompts" "$CLAUDE_HOME/prompts" "*"

# hooks/ symlink (M1: bash hooks for Claude Code event ingestion)
mkdir -p "$CLAUDE_HOME/hooks"
install_links "$ROOT_DIR/hooks" "$CLAUDE_HOME/hooks" "*.sh"

# settings.json への hooks 配線 (Claude Code SDK 仕様: PascalCase + matcher 配列)
# retro 2026-05-06-003 F-USER-008 hotfix:
#   旧 snake_case + 直接 path 形式 (session_start: "...") は SDK が認識せず → hook 発火せん
#   正しい形式: PascalCase event 名 + [{matcher, hooks: [{type, command}]}] 配列
SETTINGS_FILE="$CLAUDE_HOME/settings.json"
HOOKS_DIR="$CLAUDE_HOME/hooks"

if command -v jq >/dev/null 2>&1; then
  TMP="$(mktemp)"
  # 新規 settings.json なら空 object から開始
  if [ ! -f "$SETTINGS_FILE" ]; then
    echo '{}' > "$SETTINGS_FILE"
  fi

  # jq script:
  #   1) 旧 snake_case keys を cleanup (legacy install からの migration)
  #   2) PascalCase event 配列に loom hook entry を idempotent 追加 (既存 entry は dedupe)
  #      他 plugin の hook entry (Stop に blog-journal.sh 等) は preserve
  jq \
    --arg ss   "$HOOKS_DIR/session_start.sh" \
    --arg pre  "$HOOKS_DIR/pre_tool.sh" \
    --arg pt   "$HOOKS_DIR/post_tool.sh" \
    --arg stop "$HOOKS_DIR/stop.sh" \
    --arg sub  "$HOOKS_DIR/SubagentStop.sh" '
      def add_loom_hook($key; $cmd):
        .hooks[$key] = (
          ((.hooks[$key] // []) | map(select(
            ((.hooks // []) | map(.command)) as $cmds | $cmds | any(. == $cmd) | not
          )))
          + [{matcher: "*", hooks: [{type: "command", command: $cmd}]}]
        );
      .hooks //= {}
      | del(.hooks.session_start, .hooks.pre_tool, .hooks.post_tool, .hooks.stop)
      | add_loom_hook("SessionStart"; $ss)
      | add_loom_hook("PreToolUse"; $pre)
      | add_loom_hook("PostToolUse"; $pt)
      | add_loom_hook("Stop"; $stop)
      | add_loom_hook("SubagentStop"; $sub)
    ' "$SETTINGS_FILE" > "$TMP" && mv "$TMP" "$SETTINGS_FILE"
  echo "  hooks 配線 settings.json に追加 (PascalCase + matcher 配列、SDK 仕様準拠)"
else
  echo "  WARNING: jq 不在、settings.json への hooks 配線 skip。手動で hooks 設定してください"
fi

# daemon.js symlink (M0.11.5 hotfix REQ-046、retro 2026-05-06-001 F-USER-001)
# loom-launch-ui.sh の DAEMON_BIN=$LOOM_HOME/daemon.js 参照を満たす bootstrap
# 2026-05-06-002 retro F-USER-006 hotfix: target を index.js (re-export module) → server.js (CLI entry) に修正
DAEMON_DIST="$ROOT_DIR/daemon/dist/server.js"
DAEMON_LINK="$LOOM_HOME/daemon.js"
mkdir -p "$LOOM_HOME"

if [ -f "$DAEMON_DIST" ]; then
  if [ -e "$DAEMON_LINK" ] && [ ! -L "$DAEMON_LINK" ]; then
    echo "ERROR: $DAEMON_LINK exists as a regular file (not a symlink). Remove or rename it, then re-run install.sh." >&2
    exit 1
  fi
  if [ -L "$DAEMON_LINK" ]; then
    echo "  replacing existing symlink: $DAEMON_LINK"
    rm "$DAEMON_LINK"
  fi
  ln -s "$DAEMON_DIST" "$DAEMON_LINK"
  echo "  linked: $DAEMON_LINK -> $DAEMON_DIST"
else
  echo "  WARNING: $DAEMON_DIST not found — daemon symlink skipped."
  echo "  Run 'pnpm --filter @claude-loom/daemon build' then re-run install.sh to enable lazy daemon auto-launch."
fi

echo ""
echo "✅ Installation complete."
echo "Next: run /loom-pm in Claude Code to start a PM session."
