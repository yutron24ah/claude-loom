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
# LOOM_STATE_DIR default を ${HOME}/.claude-loom に固定 (retro 2026-05-04-001
# F-pj-003 / F-proc-003 で codify。M5 t5 で repo の .claude-loom/retro/ が
# 削除された incident の root cause = repo-local PWD/.claude-loom default。
# user state は global ${HOME}/.claude-loom が SSoT、tests は LOOM_STATE_DIR
# 環境変数で sandbox に override する pattern)
LOCAL_STATE_DIR="${LOOM_STATE_DIR:-${HOME:-}/.claude-loom}"
DAEMON_PORT="5757"
DAEMON_SHUTDOWN_URL="http://localhost:${DAEMON_PORT}/shutdown"
SETTINGS_FILE="${CLAUDE_HOME}/settings.json"

# --------------------------------------------------------------------------
# フラグ解析
# --------------------------------------------------------------------------
OPT_YES=false
OPT_DRY_RUN=false
OPT_PURGE_STATE=false
OPT_REPO_STATE_OK=false

for arg in "$@"; do
  case "$arg" in
    --yes)          OPT_YES=true ;;
    --dry-run)      OPT_DRY_RUN=true ;;
    --purge-state)  OPT_PURGE_STATE=true ;;
    --repo-state-ok) OPT_REPO_STATE_OK=true ;;
    *)
      echo "ERROR: 不明な引数: $arg" >&2
      echo "Usage: $0 [--yes] [--dry-run] [--purge-state] [--repo-state-ok]" >&2
      exit 2
      ;;
  esac
done

# --------------------------------------------------------------------------
# Safety boundary check (retro 2026-05-04-001 F-pj-003 / F-proc-003)
# --------------------------------------------------------------------------
# LOCAL_STATE_DIR が現 git repo 内に解決されとる場合 (repo-local state) は、
# 明示的な --repo-state-ok flag が無ければ refuse。
# M5 t5 の incident: PWD/.claude-loom default で repo 状態を破壊したため。

if command -v git >/dev/null 2>&1 && git rev-parse --show-toplevel >/dev/null 2>&1; then
  GIT_ROOT="$(git rev-parse --show-toplevel)"
  case "$LOCAL_STATE_DIR" in
    "$GIT_ROOT"|"$GIT_ROOT"/*)
      if ! "$OPT_REPO_STATE_OK"; then
        echo "ERROR: LOCAL_STATE_DIR ($LOCAL_STATE_DIR) は git repo 内 ($GIT_ROOT) に解決されとる。" >&2
        echo "  user state の global SSoT は \${HOME}/.claude-loom (LOOM_STATE_DIR で override 可)。" >&2
        echo "  repo-local state を意図的に対象とする場合は --repo-state-ok flag を付与してください (test fixture 等)。" >&2
        exit 2
      fi
      echo "WARN: --repo-state-ok 指定で repo-local state を対象とします: $LOCAL_STATE_DIR" >&2
      ;;
  esac
fi

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

  # .hooks 内の loom hook entry を削除
  # 構造: PascalCase event 名 (SessionStart 等) → [{matcher, hooks: [{type, command}]}] 配列
  # 各 event 配列から「commands に loom_hooks_path を prefix に持つ entry」を filter out
  # entry 内 hooks が空になったら matcher entry 自体を削除
  # event 配列が空になったら event key 自体を削除
  # 他 plugin の matcher entry (Stop に blog-journal.sh 等) は preserve
  # legacy snake_case keys (session_start 等) も同時に cleanup
  local loom_hooks_path="${CLAUDE_HOME}/hooks"
  local tmp
  tmp="$(mktemp)"

  jq --arg hooks_path "$loom_hooks_path" '
    def is_loom_cmd: . | startswith($hooks_path);
    def filter_loom_from_matcher:
      .hooks |= map(select((.command // "") | is_loom_cmd | not))
      | select((.hooks // []) | length > 0);
    def filter_event:
      map(filter_loom_from_matcher) | select(length > 0);
    if .hooks then
      .hooks |= (
        # legacy snake_case keys (string values from older installs) を cleanup
        del(.session_start, .pre_tool, .post_tool, .stop)
        # PascalCase keys を array filter
        | with_entries(
            if (.value | type) == "array"
            then .value |= filter_event
            else .
            end
          )
        # filter_event が empty 配列 (length=0) を返した場合は select で消えとる、
        # ただし null になった key を with_entries 出力から除外
        | with_entries(select(.value != null))
      )
      | if (.hooks | length) == 0 then del(.hooks) else . end
    else . end
  ' "$SETTINGS_FILE" > "$tmp"

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
# WHY: install.sh uses pattern "loom*.md" (no dash) for commands, which includes
# both "loom-*.md" and "loom.md" (the meta-dispatch command). Use "loom*.md" here
# to match the install pattern exactly (M5 t2 bug fix).
remove_file_symlinks "${CLAUDE_HOME}/commands" "loom*.md"
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
