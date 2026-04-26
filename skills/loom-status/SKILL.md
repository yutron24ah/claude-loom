---
name: loom-status
description: Snapshot claude-loom harness + repo state in one command — branch, last commits, installed agents/commands/skills, and working tree status. Use when picking up where you left off, before starting a new PM session, or when unsure of harness deployment status.
---

# loom-status

claude-loom 管理プロジェクトの「いま何が動いていて、何がインストール済みで、リポジトリはどんな状態か」を 1 コマンドで把握する。

## 使い方

```bash
/path/to/claude-loom/skills/loom-status/scripts/status.sh
```

引数なし、project root から自動探索。

## 出力に含まれる情報

- **branch & tags**: 現在のブランチ + 最新の annotated tag
- **last 5 commits**: 直近のコミット履歴（短縮 SHA + メッセージ）
- **installed agents/commands/skills**: `~/.claude/{agents,commands,skills}/loom-*` の一覧（`CLAUDE_HOME` 環境変数で上書き可）
- **working tree**: clean か、dirty なら porcelain status

## 設計メモ

- 完全に read-only。`git status --porcelain` は副作用なし
- `find` の出力をそのまま整形するため、symlink でも実体でも同じく一覧化される
- exit code は常に 0（情報取得失敗もメッセージで表現）

## いつ呼ぶか

- PM mode 起動直後、ユーザーに状況サマリを提供したい時
- 別 session から戻ってきて context を取り戻す時
- M1 以降の daemon 起動前後で配置確認したい時
