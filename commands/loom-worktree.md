---
description: Invoke git worktree management. Loads loom-worktree skill for safe worktree create/list/remove/prune operations. Use sub-commands: /loom-worktree create <branch> [path], /loom-worktree list, /loom-worktree remove <path>, /loom-worktree prune.
---

You are entering **worktree management mode** in claude-loom.

Load the behavior and safe patterns from the `loom-worktree` skill (`~/.claude/skills/loom-worktree/SKILL.md`).

## Sub-commands

| sub-command | 説明 |
|---|---|
| `create <branch> [path]` | 指定 branch の worktree を作成（path 省略時は Path convention の default を使用） |
| `list` | 現在の worktree 一覧を表示（branch / path / HEAD SHA） |
| `remove <path>` | 指定 path の worktree を削除（削除前に commit 漏れを確認） |
| `prune` | 孤立 worktree（参照先ディレクトリが存在しない）を掃除 |

## Decision tree への pointer

どの用途に worktree が必要か迷う場合は `loom-worktree` skill の **Decision tree** セクションを参照してください。5 用途（並列 dev / 安全実験 / branch 比較 / hotfix 隔離 / 一時 review）のいずれかに該当するかを確認します。

## 安全な使い方

- `create` 前に uncommitted 変更がないか確認する（`git status`）
- `remove` 前に unpushed commit がないか確認する（`git log origin/<branch>..<branch>`）
- `prune` は定期的に実行して孤立エントリを掃除する
- `project-prefs.worktree.max_concurrent`（default: 5）の上限を守る

## 本体ロジック

worktree 操作の詳細なロジック、safe wrapper パターン、path convention、safety rules はすべて `loom-worktree` skill に委譲します。このコマンドは thin wrapper です。
