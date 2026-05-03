#!/usr/bin/env bash
# uninstall.sh — claude-loom harness uninstaller
#
# 役割: install.sh が設置した全 symlink を削除し、settings.json の loom 関連
#        hooks 配線を除去する。.claude-loom/ local state は default で保持する。
#
# 使い方:
#   ./uninstall.sh               # interactive confirm + state 保持
#   ./uninstall.sh --yes         # confirm prompt skip
#   ./uninstall.sh --dry-run     # 実行内容を表示のみ（変更しない）
#   ./uninstall.sh --purge-state # .claude-loom/ local state も削除
#   ./uninstall.sh --yes --purge-state --dry-run  # 組み合わせ可
#
# Exit codes:
#   0 = success
#   1 = user-cancel
#   2 = error

set -euo pipefail

# --------------------------------------------------------------------------
# 定数定義（§3.6.10: bash script 内の path / file name は変数定義経由）
# --------------------------------------------------------------------------
CLAUDE_HOME="${CLAUDE_HOME:-${HOME:-}/.claude}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# LOOM_STATE_DIR allows tests to override the local state path
LOCAL_STATE_DIR="${LOOM_STATE_DIR:-${PWD}/.claude-loom}"
DAEMON_PORT="5757"
DAEMON_SHUTDOWN_URL="http://localhost:${DAEMON_PORT}/shutdown"
SETTINGS_FILE="${CLAUDE_HOME}/settings.json"

# --------------------------------------------------------------------------
# フラグ解析
# --------------------------------------------------------------------------
OPT_YES=false
OPT_DRY_RUN=false
OPT_PURGE_STATE=false

for arg in "$@"; do
  case "$arg" in
    --yes)          OPT_YES=true ;;
    --dry-run)      OPT_DRY_RUN=true ;;
    --purge-state)  OPT_PURGE_STATE=true ;;
    *)
      echo "ERROR: 不明な引数: $arg" >&2
      echo "Usage: $0 [--yes] [--dry-run] [--purge-state]" >&2
      exit 2
      ;;
  esac
done

# --------------------------------------------------------------------------
# ヘルパー関数
# --------------------------------------------------------------------------

# dry-run 中は実際に実行せず表示のみ
run_or_echo() {
  if "$OPT_DRY_RUN"; then
    echo "  [dry-run] $*"
  else
    "$@"
  fi
}

# confirm prompt（--yes または --dry-run で skip）
confirm() {
  local message="$1"
  if "$OPT_YES" || "$OPT_DRY_RUN"; then
    return 0
  fi
  echo ""
  read -r -p "${message} [y/N] " reply
  case "$reply" in
    [Yy]|[Yy][Ee][Ss]) return 0 ;;
    *) return 1 ;;
  esac
}

# --------------------------------------------------------------------------
# Step 1: daemon 停止（動作中なら）
# --------------------------------------------------------------------------
stop_daemon() {
  if command -v curl >/dev/null 2>&1; then
    if curl -sf --max-time 2 "${DAEMON_SHUTDOWN_URL}" >/dev/null 2>&1; then
      echo "  daemon を停止しました"
    fi
    # 応答なし / daemon 不在でも無視（fail-silent）
  fi
}

# --------------------------------------------------------------------------
# Step 2: symlink 削除ヘルパー
# --------------------------------------------------------------------------
remove_file_symlinks() {
  local dest_dir="$1"
  local pattern="$2"

  if [ ! -d "$dest_dir" ]; then
    return 0
  fi

  shopt -s nullglob
  for link in "$dest_dir"/$pattern; do
    if [ -L "$link" ]; then
      echo "  removing symlink: $link"
      run_or_echo rm "$link"
    fi
  done
  shopt -u nullglob
}

remove_dir_symlinks() {
  local dest_parent="$1"
  local pattern="$2"

  if [ ! -d "$dest_parent" ]; then
    return 0
  fi

  shopt -s nullglob
  for link in "$dest_parent"/$pattern; do
    link="${link%/}"
    if [ -L "$link" ]; then
      echo "  removing symlink: $link"
      run_or_echo rm "$link"
    fi
  done
  shopt -u nullglob
}

# --------------------------------------------------------------------------
# Step 3: settings.json から hooks エントリを削除
# --------------------------------------------------------------------------
remove_hooks_settings() {
  if [ ! -f "$SETTINGS_FILE" ]; then
    return 0
  fi

  if ! command -v jq >/dev/null 2>&1; then
    echo "  WARNING: jq 不在、settings.json の hooks 削除 skip"
    return 0
  fi

  # .hooks 内の値が loom-*/ を含むエントリを削除
  # install.sh が書き込む hooks は session_start / pre_tool / post_tool / stop / SubagentStop
  # それらの値が CLAUDE_HOME/hooks/ を含む場合に除去する
  local loom_hooks_path="${CLAUDE_HOME}/hooks"
  local tmp
  tmp="$(mktemp)"

  # jq: .hooks オブジェクトの中から値が loom_hooks_path を含むキーを除去
  # .hooks が null/存在しない場合も safe に処理
  jq --arg hooks_path "$loom_hooks_path" \
    'if .hooks then .hooks |= with_entries(select(.value | contains($hooks_path) | not)) else . end' \
    "$SETTINGS_FILE" > "$tmp"

  if "$OPT_DRY_RUN"; then
    echo "  [dry-run] settings.json から loom hooks エントリを削除"
    rm -f "$tmp"
  else
    mv "$tmp" "$SETTINGS_FILE"
    echo "  settings.json から loom hooks エントリを削除"
  fi
}

# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

echo "claude-loom harness uninstaller"
echo "  CLAUDE_HOME  = $CLAUDE_HOME"
echo "  dry-run      = $OPT_DRY_RUN"
echo "  purge-state  = $OPT_PURGE_STATE"
echo ""

if "$OPT_DRY_RUN"; then
  echo "[dry-run mode: no changes will be made]"
  echo ""
fi

# 確認 prompt（--yes / --dry-run で skip）
if ! confirm "claude-loom harness をアンインストールしますか？"; then
  echo "キャンセルしました"
  exit 1
fi

# Step 1: daemon 停止
echo "Step 1: daemon を停止..."
stop_daemon

# Step 2: symlink 削除
echo "Step 2: symlink を削除..."
remove_file_symlinks "${CLAUDE_HOME}/agents"   "loom-*.md"
remove_file_symlinks "${CLAUDE_HOME}/commands" "loom-*.md"
remove_dir_symlinks  "${CLAUDE_HOME}/skills"   "loom-*"
remove_dir_symlinks  "${CLAUDE_HOME}/prompts"  "*"
remove_file_symlinks "${CLAUDE_HOME}/hooks"    "*.sh"

# Step 3: settings.json hooks 配線を除去
echo "Step 3: settings.json から hooks 配線を削除..."
remove_hooks_settings

# Step 4: .claude-loom/ local state の扱い
echo "Step 4: local state (.claude-loom/) の処理..."
if "$OPT_PURGE_STATE"; then
  if [ -d "$LOCAL_STATE_DIR" ]; then
    echo "  .claude-loom/ を削除します: $LOCAL_STATE_DIR"
    run_or_echo rm -rf "$LOCAL_STATE_DIR"
  else
    echo "  .claude-loom/ が見つかりません (skip)"
  fi
else
  if [ -d "$LOCAL_STATE_DIR" ]; then
    echo "  .claude-loom/ は保持します (削除するには --purge-state を指定)"
  fi
fi

echo ""
if "$OPT_DRY_RUN"; then
  echo "[dry-run 完了 — 変更は適用されていません]"
else
  echo "Uninstallation complete."
  if ! "$OPT_PURGE_STATE"; then
    echo "Note: .claude-loom/ は保持されています（再インストール後も設定を引き継げます）"
  fi
fi
