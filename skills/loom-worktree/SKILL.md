---
name: loom-worktree
description: Manage git worktrees for parallel dev / safe experimentation / branch comparison / hotfix isolation / temporary review. Activate when current task fits Decision tree criteria — autonomous invocation by loom-pm / loom-developer / loom-retro-pm. Default behavior unchanged (same-tree work); opt-in via /loom-worktree command or project-prefs config.
---

# loom-worktree

claude-loom 専用の **git worktree 管理 skill**。5 用途（並列 dev / 安全実験 / branch 比較 / hotfix 隔離 / 一時 review）を discipline ある safe pattern で扱う。**default 動作不変**（既存 PJ への impact なし）、opt-in 起動。

## When to use

このスキルを **使う** 時（Decision tree のいずれかに該当）：

- 並列 batch を **異 branch / 異 commit** から実行する
- 現作業を **中断せずに** 別 branch で hotfix が必要
- 現作業を保ちつつ **historical state** との比較作業
- 失敗したら **丸ごと捨てたい** 実験的変更
- 一時的な **read-only review**（PR branch を checkout せずに見たい）

このスキルを **使わない** 時：

- 単一 file / 単一 task の通常 dev → 同一 tree で十分
- 単純な `git stash` / `git checkout` で解決できる短命な切り替え
- 不確実（Decision tree のどれにも当てはまらない）→ user に確認してから判断

## Decision tree

agent が自律判断する際は以下のフローで判定する：

```
START: 新しいタスク / 状況が発生
│
├─ 並列 batch を異 branch / 異 commit から実行する？
│   YES → loom-worktree を invoke
│   NO  ↓
│
├─ 現作業を中断せずに別 branch で hotfix が必要？
│   YES → loom-worktree を invoke（hotfix 隔離用途）
│   NO  ↓
│
├─ 現作業を保ちつつ historical state と比較作業が必要？
│   YES → loom-worktree を invoke（branch 比較用途）
│   NO  ↓
│
├─ 失敗したら丸ごと捨てたい実験的変更？
│   YES → loom-worktree を invoke（安全実験用途）
│   NO  ↓
│
├─ 一時的な read-only review（別 branch を見たい）？
│   YES → loom-worktree を invoke（一時 review 用途）
│   NO  ↓
│
└─ 単一 file / 単一 task の通常 dev？
    YES → 同一 tree で作業（worktree 不要）
    不確実 → user に確認してから判断（自律発動を控える）
```

**自律発動の原則**：

- 判断が不確実な場合は **必ず user に確認** する（暴走禁止）
- `project-prefs.worktree.max_concurrent`（default 5）を超えないよう確認してから発動
- 発動する場合も「この状況で worktree が必要と判断しました。作成してよいですか？」と user に確認してから実行

## Commands

### Safe wrapper パターン

#### `git worktree add`（新規 worktree 作成）

```bash
# 1. まず uncommitted の変更を確認
git status
# uncommitted 変更がある場合は stash または commit を促す

# 2. 既存 worktree 数を確認（max_concurrent チェック）
git worktree list | wc -l

# 3. worktree を作成（branch 指定）
git worktree add <path> <branch>

# 4. 既存 branch が存在しない場合は -b で新規作成
git worktree add -b <new-branch> <path> <base-branch>
```

**安全チェック**：
- `add` 前に `git status` で uncommitted 変更を確認する
- detached HEAD での `add` は **明示的な指示がある場合のみ**（意図的でなければ禁止）
- 同一 branch への重複 worktree 作成はエラーになるため事前確認

#### `git worktree list`（一覧表示）

```bash
git worktree list
# 出力例:
# /path/to/main-tree  abc1234 [main]
# /path/to/sibling    def5678 [feat/m0.10-worktree]
```

現在の worktree 数を把握し、`max_concurrent` との比較に使う。

#### `git worktree remove`（削除）

```bash
# 1. 削除前に worktree 内の未 commit / 未 push 確認
git -C <path> status
git -C <path> log --oneline origin/<branch>..<branch> 2>/dev/null

# 2. 問題なければ削除
git worktree remove <path>

# 強制削除（uncommitted 変更を捨てる）は明示的指示時のみ
# git worktree remove --force <path>
```

**安全チェック**：
- `remove` 前に worktree 内に uncommitted / unpushed commits がある場合は **必ず警告**
- `--force` は user が明示的に指示した場合のみ使用

#### `git worktree lock / unlock`

```bash
# worktree を lock（誤削除防止）
git worktree lock <path> --reason "long-running experiment"

# lock 解除
git worktree unlock <path>
```

hotfix 隔離 / 長期実験 worktree は lock を推奨。

#### `git worktree prune`（孤立 worktree 掃除）

```bash
# 孤立 worktree を掃除（参照先ディレクトリが存在しない worktree を git 管理から除去）
git worktree prune

# dry run で事前確認
git worktree prune --dry-run
```

**定期実行を推奨**：セッション開始時や `worktree list` で `prunable` が表示された場合に実行。

## Path convention

### Default path（α 規約）

```
<parent-dir>/<repo-name>-{branch-slug}/
```

例：
- repo: `/Users/you/work/claude-loom`
- branch: `feat/m0.10-worktree`
- worktree path: `/Users/you/work/claude-loom-feat-m0.10-worktree/`

**branch-slug 生成ルール**：
- branch 名の `/` を `-` に置換
- 特殊文字（`#`, `@`, `:`, スペース等）を除去
- 例: `feat/m0.10-worktree` → `feat-m0.10-worktree`

### `project-prefs` による上書き

`<project>/.claude-loom/project-prefs.json` の `worktree.base_path` で path template を指定可能：

```json
{
  "worktree": {
    "base_path": "<parent>/<repo>-{branch}",
    "auto_cleanup": false,
    "max_concurrent": 5
  }
}
```

`{branch}` placeholder は branch slug に自動置換される。

**カスタム例**：
```json
"base_path": "~/work/loom-worktrees/{branch}"
```
→ `~/work/loom-worktrees/feat-m0.10-worktree/`

### Path の決定手順

1. `project-prefs.worktree.base_path` が設定されていれば → そのテンプレートを使用
2. 未設定の場合 → default の `<parent>/<repo>-{branch-slug}/` を使用
3. path が衝突する場合（既存ディレクトリあり）→ user に確認

## Safety rules

### 1. max_concurrent 上限の遵守

`project-prefs.worktree.max_concurrent`（default: 5）を超えないよう管理：

```bash
# 現在の worktree 数確認（main tree を含む）
current=$(git worktree list | wc -l)
max=$(jq -r '.worktree.max_concurrent // 5' .claude-loom/project-prefs.json 2>/dev/null || echo 5)

if [ "$current" -ge "$max" ]; then
  echo "WARNING: max_concurrent ($max) に達しています。古い worktree を削除してから作成してください。"
  # user に確認
fi
```

上限を超えそうな場合は **user に確認** してから作成。自律発動で上限を無視することは禁止。

### 2. commit は worktree 内から push

worktree 内の commit は **その worktree のディレクトリから** push する：

```bash
# GOOD: worktree ディレクトリ内で push
cd /path/to/sibling-worktree
git push origin feat/my-branch

# BAD: main checkout から sibling の branch を push しない
# git push origin feat/my-branch  ← main tree の HEAD で実行は混乱の元
```

### 3. nested worktree 禁止

**worktree 内に worktree を作らない**：

```bash
# BAD: worktree 内で git worktree add を実行
cd /path/to/sibling-worktree
git worktree add ../another-nested-tree  # ← 禁止
```

nested worktree はリポジトリ状態を複雑化させる。必要なら main tree から作成する。

### 4. 不要になった worktree の削除

使い終わった worktree は放置せず削除する：

```bash
# 作業完了後
git worktree remove <path>
git worktree prune  # 孤立 worktree も掃除
```

長期保持する場合は `git worktree lock` で意図的にロック。

### 5. detached HEAD への worktree add の制限

detached HEAD での worktree add は **明示的な指示がある場合のみ**：

```bash
# 明示的指示がある場合のみ
git worktree add <path> <commit-sha>  # detached HEAD

# 通常は branch 名を指定
git worktree add <path> <branch-name>
```

## Anti-patterns

| アンチパターン | 説明 | 対策 |
|---|---|---|
| **Nested worktree** | worktree 内で `git worktree add` を実行 | 必ず main tree から作成 |
| **commit 漏れ放置** | worktree で作業した commit が push されないまま worktree を削除 | `remove` 前に `git log origin/<branch>..<branch>` で未 push 確認 |
| **detached HEAD 誤 add** | 意図せず `git worktree add <path> <sha>` で detached HEAD worktree を作成 | branch 名を必ず指定、SHA 指定は明示的指示時のみ |
| **max_concurrent 無視の自律発動** | `max_concurrent` 上限を確認せず agent が worktree を作り続ける | 発動前に `git worktree list \| wc -l` で確認 |
| **tag 跨ぎ worktree 混乱** | `m0.8-complete` タグのコミットに worktree を作成しつつ main も同時編集するような混乱パターン | タグ付きリリースコミットへの worktree は read-only review 用途に限定し、main 並行編集は避ける |
| **base_path 衝突** | 同名 branch slug の worktree が既存のまま新規作成を試みる | `add` 前に path 存在確認 |
| **prune なし放置** | `worktree remove` 後に `prune` を実行せず、孤立エントリが `.git/worktrees/` に残留 | `remove` 後は必ず `prune` を実行 |
