#!/usr/bin/env bash
# install.sh — claude-loom M0 minimal installer
#
# 役割：agents/ と commands/ のファイルを ~/.claude/<type>/ にシンボリックリンク
# M1 以降で daemon ビルド配置 + settings.json 書き換えを追加予定

set -euo pipefail

# テスト用に CLAUDE_HOME を上書き可能
if [ -z "${HOME:-}" ] && [ -z "${CLAUDE_HOME:-}" ]; then
  echo "ERROR: neither \$CLAUDE_HOME nor \$HOME is set; refusing to install to /.claude" >&2
  exit 1
fi
CLAUDE_HOME="${CLAUDE_HOME:-$HOME/.claude}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 前提チェック
for cmd in bash ln; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: required command '$cmd' not found in PATH" >&2
    exit 1
  fi
done

# ディレクトリ準備
mkdir -p "$CLAUDE_HOME/agents" "$CLAUDE_HOME/commands" "$CLAUDE_HOME/skills"

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

echo "Installing claude-loom M0 harness..."
echo "  CLAUDE_HOME = $CLAUDE_HOME"
echo "  ROOT_DIR    = $ROOT_DIR"
echo ""

install_links "$ROOT_DIR/agents" "$CLAUDE_HOME/agents" "loom-*.md"
install_links "$ROOT_DIR/commands" "$CLAUDE_HOME/commands" "loom-*.md"
install_dir_links "$ROOT_DIR/skills" "$CLAUDE_HOME/skills" "loom-*"

echo ""
echo "✅ Installation complete."
echo "Next: run /loom-pm in Claude Code to start a PM session."
