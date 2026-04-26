# claude-loom M0: Dev Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** claude-loom 自身を multi-agent agile workflow で開発するための bootstrap harness を構築する。daemon / GUI / SQLite なし、agent 定義 + slash command + ワークフロー規約 + 最小 install.sh のみ。

**Architecture:** 5 つの Claude Code subagent（PM / Developer / Code/Security/Test Reviewer）を `.claude/agents/*.md` として配布。3 つの slash command（`/loom-pm` `/loom-spec` `/loom-go`）が PM session の各フェーズを起動。`install.sh` は agents/ commands/ をシンボリックリンクで `~/.claude/<type>/` に設置。テストは bash で TDD 駆動。

**Tech Stack:** bash、jq（JSON 検証）、git、Claude Code agent system prompt 規約。Node 等の重量依存なし（M1 から導入）。

---

## File Structure

このプランで作成・編集するファイル：

```
claude-loom/
├── CLAUDE.md                                  [Task 1]
├── README.md                                  [Task 15 で更新]
├── install.sh                                 [Task 6]
├── .gitignore                                 [Task 1 で更新]
├── agents/
│   ├── loom-pm.md                             [Task 7]
│   ├── loom-developer.md                      [Task 8]
│   ├── loom-code-reviewer.md                  [Task 9]
│   ├── loom-security-reviewer.md              [Task 10]
│   └── loom-test-reviewer.md                  [Task 11]
├── commands/
│   ├── loom-pm.md                             [Task 12]
│   ├── loom-spec.md                           [Task 13]
│   └── loom-go.md                             [Task 14]
├── templates/
│   ├── PLAN.md.template                       [Task 3]
│   └── claude-loom/
│       └── project.json.template              [Task 2]
├── docs/
│   └── DOC_CONSISTENCY_CHECKLIST.md           [Task 4]
└── tests/
    ├── REQUIREMENTS.md                        [Task 5]
    ├── run_tests.sh                           [Task 5]
    ├── install_test.sh                        [Task 6]
    ├── agents_test.sh                         [Task 7-11]
    └── commands_test.sh                       [Task 12-14]
```

責務境界：
- `agents/*.md` — Claude Code subagent 定義（system prompt + tools）。1 ファイル 1 ロール
- `commands/*.md` — slash command 定義（agent invocation のみ、ロジック持たない）
- `templates/` — 新規プロジェクトに配るスキーマテンプレート
- `tests/` — bash TDD ハーネス、各 test 1 ファイル
- `install.sh` — シンボリックリンク設置のみ。settings.json 書き換えは M1 で追加

---

## Task 1: リポジトリスカフォールド + CLAUDE.md

**Files:**
- Create: `CLAUDE.md`
- Create: `agents/.gitkeep`, `commands/.gitkeep`, `hooks/.gitkeep`, `skills/.gitkeep`, `templates/.gitkeep`, `tests/.gitkeep`
- Modify: `.gitignore`（新規作成）

- [ ] **Step 1: ディレクトリ構造を作る**

```bash
cd /Users/kokiiphone/Documents/work/claude-loom
mkdir -p agents commands hooks skills templates/claude-loom tests
touch agents/.gitkeep commands/.gitkeep hooks/.gitkeep skills/.gitkeep templates/.gitkeep tests/.gitkeep
ls -la
```

期待：`agents commands hooks skills templates tests` が並ぶ。

- [ ] **Step 2: `.gitignore` を作成**

```bash
cat > .gitignore <<'EOF'
# claude-loom local state (Phase 1 以降で daemon が作る)
.claude-loom/
.superpowers/

# OS
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/

# Node (M1 以降)
node_modules/
*.log

# Build output
dist/
build/
EOF
```

- [ ] **Step 3: `CLAUDE.md` を作成**

```markdown
# CLAUDE.md — claude-loom リポジトリ作業ガイド

> **本ファイルは Claude Code agent 向けの作業規約。** ユーザー向け説明は `README.md`、製品仕様は `SPEC.md` を参照。

## 開発フロー

このリポジトリは **dogfood 方式** で開発する：
M0 で構築した harness（PM / Developer / Reviewer trio agent）を使って、M1 以降の自分自身の実装を進める。

### 通常の作業フロー

1. `/loom-pm` で PM mode に入る（この session が PM になる）
2. `/loom-spec` で SPEC を読み込み、当該タスクの詳細を user と確認
3. `/loom-go` で実装フェーズ起動 → PM が Task tool で developer subagent を dispatch
4. developer は TDD で実装 → review trio に並列レビュー dispatch
5. レビュー全 pass → commit
6. PM が PLAN.md を更新

## ブランチ規約

- `main` への直 commit 禁止
- 1 要件 = 1 ブランチ。命名 `feat/<short-description>` `fix/<short-description>` `chore/<short-description>`
- ブランチ単位で PR を上げる前に：全テスト pass + 3 レビュー pass

## コミット粒度

- 1 機能 = 1 commit
- メッセージ prefix: `test(xxx)` / `feat(xxx)` / `fix(xxx)` / `chore(xxx)` / `docs:`
- 例: `feat(install): add idempotent symlink installer`

## TDD 必須

- 実装コードを書く前に必ず失敗するテストを書く
- Red → Green → Refactor の順
- テストなしの実装は review で reject される

## doc 整合性

- SPEC を変更したら `docs/DOC_CONSISTENCY_CHECKLIST.md` を必ず通す
- M4 で自動化するまでは手作業

## ファイル配置規約

- agents/ : Claude Code subagent 定義
- commands/ : slash command 定義
- hooks/ : bash hook scripts (M1 以降)
- skills/ : Claude Code skill (Phase 2 以降)
- templates/ : 新規 PJ 配布用テンプレ
- tests/ : bash test harness
- daemon/ : Node daemon (M1 以降)
- ui/ : React + Phaser UI (M2 以降)
- docs/ : ドキュメント

## テスト実行

```bash
./tests/run_tests.sh        # 全テスト
./tests/run_tests.sh install # 特定テスト
```

## 主要ドキュメント参照

- `SPEC.md` — 製品仕様（SSoT）
- `PLAN.md` — マスターロードマップ
- `docs/superpowers/plans/` — 各マイルストーン詳細プラン
- `docs/SCREEN_REQUIREMENTS.md` — UI 要件
- `tests/REQUIREMENTS.md` — 受入要件 ID
```

`Write` tool で上記内容を `/Users/kokiiphone/Documents/work/claude-loom/CLAUDE.md` に書く。

- [ ] **Step 4: コミット**

```bash
git add CLAUDE.md .gitignore agents commands hooks skills templates tests
git commit -m "chore: scaffold M0 repo structure with CLAUDE.md workflow guide"
```

期待：commit 成功。`git log --oneline` で先頭に表示される。

---

## Task 2: project.json テンプレート

**Files:**
- Create: `templates/claude-loom/project.json.template`

- [ ] **Step 1: テンプレ作成**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/templates/claude-loom/project.json.template` に以下を保存：

```json
{
  "$schema": "https://claude-loom.dev/schemas/project-v1.json",
  "schema_version": 1,

  "project_id": "PLACEHOLDER_UUID",
  "name": "PLACEHOLDER_PROJECT_NAME",

  "spec_path": "SPEC.md",
  "plan_path": "PLAN.md",
  "related_docs": [
    "README.md",
    "CLAUDE.md",
    "docs/**/*.md"
  ],

  "methodology": "agile",

  "pool": {
    "max_developers": 3,
    "max_code_reviewers": 1,
    "max_security_reviewers": 1,
    "max_test_reviewers": 1
  },

  "rules": {
    "tdd_required": true,
    "branch_pattern": "feat/{short-description}",
    "commit_prefixes": ["test", "feat", "fix", "chore", "docs"],
    "main_branch": "main",
    "no_direct_commit_to_main": true
  },

  "consistency_engine": {
    "trigger_mode": "manual",
    "regex_screen_enabled": true,
    "llm_analysis_enabled": true
  }
}
```

- [ ] **Step 2: JSON 構文を検証**

```bash
jq empty templates/claude-loom/project.json.template
```

期待：エラーなく終了（exit 0）。

- [ ] **Step 3: コミット**

```bash
git add templates/claude-loom/project.json.template
git commit -m "feat(templates): add project.json template per SPEC §6.9"
```

---

## Task 3: PLAN.md テンプレート

**Files:**
- Create: `templates/PLAN.md.template`

- [ ] **Step 1: テンプレ作成**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/templates/PLAN.md.template`：

```markdown
---
schema: claude-loom-plan-v1
project_id: PLACEHOLDER_UUID
last_synced_at: 0
---

# PLACEHOLDER_PROJECT_NAME 実装計画

> 本ファイルは長期計画の正本（SPEC §6.8 形式）。
> daemon が監視し plan_items テーブルに同期する。手編集と GUI 編集の両方が可能。

## マイルストーン M1: 最初のマイルストーン

- [ ] 最初のタスク <!-- id: m1-t1 status: todo -->
- [ ] 次のタスク <!-- id: m1-t2 status: todo -->
```

- [ ] **Step 2: 確認**

```bash
head -10 templates/PLAN.md.template
```

期待：YAML frontmatter が出力される。

- [ ] **Step 3: コミット**

```bash
git add templates/PLAN.md.template
git commit -m "feat(templates): add PLAN.md template per SPEC §6.8"
```

---

## Task 4: doc 整合性 manual checklist

**Files:**
- Create: `docs/DOC_CONSISTENCY_CHECKLIST.md`

- [ ] **Step 1: チェックリスト作成**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/docs/DOC_CONSISTENCY_CHECKLIST.md`：

```markdown
# Doc Consistency Manual Checklist

> M4 で自動化される（doc 整合性エンジン v1）まで、SPEC を変更したらこのチェックリストを **PM が必ず実行** する。

## 手順

### 1. 変更内容の把握

```bash
git diff SPEC.md
# あるいは前回 commit からの差分
git diff HEAD~1 SPEC.md
```

### 2. 影響範囲の洗い出し

以下のドキュメントについて、SPEC 変更の影響を確認：

- [ ] `README.md` — ユーザー向け説明と齟齬がないか
- [ ] `CLAUDE.md` — 作業規約に変更が必要か
- [ ] `PLAN.md` — マイルストーン / タスクに追加・削除が必要か
- [ ] `docs/SCREEN_REQUIREMENTS.md` — 画面要件に波及するか
- [ ] `docs/superpowers/plans/*.md` — 進行中の詳細プランに波及するか
- [ ] `tests/REQUIREMENTS.md` — 受入要件 ID の追加・削除が必要か
- [ ] `agents/*.md` — agent system prompt の振る舞いに変更が必要か
- [ ] `commands/*.md` — slash command の挙動に変更が必要か

### 3. 検出語彙の grep（軽量チェック）

SPEC で削除・変更された主要語句を grep：

```bash
# 例：SPEC から ANTHROPIC_API_KEY が消えた場合
grep -rn "ANTHROPIC_API_KEY" --include="*.md" .
```

### 4. ユーザー承認

影響を受ける可能性のあるドキュメント一覧を user に提示：

- 影響なし → 確認だけ報告
- 影響あり → 該当箇所を user 承認の上で更新

### 5. 更新の commit

ドキュメント更新は SPEC 変更とは別 commit に分ける：

```bash
git add <updated docs>
git commit -m "docs: align with SPEC update (X 機能)"
```

## 例：典型的なケース

### Case A: SPEC §X の削除

- 関連 grep → 言及のあるドキュメント特定 → 削除 / 書き換え

### Case B: 用語の rename

- 旧用語を grep → 全置換（手動確認しながら）

### Case C: スキーマ変更

- DB スキーマ変更 → 関連する SCREEN_REQUIREMENTS / EVENT_SCHEMA も更新

## このチェックリスト自体の改善

M4（doc 整合性エンジン v1）実装時に検出ルールを抽出する元データとして本チェックリストを使う。手で運用しながら気付いた検出パターンを追記すること。
```

- [ ] **Step 2: コミット**

```bash
git add docs/DOC_CONSISTENCY_CHECKLIST.md
git commit -m "docs: add manual doc consistency checklist (used until M4 automates)"
```

---

## Task 5: テストハーネス + REQUIREMENTS.md 骨格

**Files:**
- Create: `tests/run_tests.sh`
- Create: `tests/REQUIREMENTS.md`

- [ ] **Step 1: テスト runner を作る**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/tests/run_tests.sh`：

```bash
#!/usr/bin/env bash
# tests/run_tests.sh — claude-loom test harness
#
# Usage:
#   ./tests/run_tests.sh           # run all tests
#   ./tests/run_tests.sh install   # run only tests/install_test.sh

set -euo pipefail

TESTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$TESTS_DIR/.." && pwd)"
cd "$ROOT_DIR"

filter="${1:-}"

failed=0
passed=0
skipped=0

for test_file in "$TESTS_DIR"/*_test.sh; do
  [ -e "$test_file" ] || continue
  test_name=$(basename "$test_file" _test.sh)

  if [ -n "$filter" ] && [ "$test_name" != "$filter" ]; then
    skipped=$((skipped + 1))
    continue
  fi

  echo "▶ Running $test_name..."
  if bash "$test_file"; then
    echo "✅ $test_name PASSED"
    passed=$((passed + 1))
  else
    echo "❌ $test_name FAILED"
    failed=$((failed + 1))
  fi
  echo ""
done

echo "=========================================="
echo "Passed: $passed   Failed: $failed   Skipped: $skipped"
echo "=========================================="
[ "$failed" -eq 0 ]
```

- [ ] **Step 2: 実行可能にする**

```bash
chmod +x tests/run_tests.sh
```

- [ ] **Step 3: REQUIREMENTS.md 骨格**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/tests/REQUIREMENTS.md`：

```markdown
# claude-loom Acceptance Requirements

> 本ファイルは ID 付き受入要件の一覧（claude-blog-skill 流儀）。
> 各 REQ-XXX は対応する test ファイルでカバーされる。

## M0: Dev Harness

- **REQ-001**: `install.sh` 実行で `~/.claude/agents/loom-*.md` のシンボリックリンクが設置される
- **REQ-002**: `install.sh` 実行で `~/.claude/commands/loom-*.md` のシンボリックリンクが設置される
- **REQ-003**: `install.sh` を 2 回実行しても破壊的変更を起こさない（idempotent）
- **REQ-004**: `~/.claude/agents/loom-*.md` に通常ファイルが既存の場合、`install.sh` はエラー終了する
- **REQ-005**: 各 `agents/*.md` ファイルが valid な YAML frontmatter を持つ（name / description フィールド必須）
- **REQ-006**: 各 `commands/*.md` ファイルが valid な YAML frontmatter を持つ（description フィールド必須）
- **REQ-007**: 全 agent 定義の name フィールドが「loom-」プレフィックスで始まる

## M1 以降は別 PR で追記
```

- [ ] **Step 4: 動作確認（テストファイルなしの状態で実行）**

```bash
./tests/run_tests.sh
```

期待：「Passed: 0 Failed: 0 Skipped: 0」表示、exit 0。

- [ ] **Step 5: コミット**

```bash
git add tests/run_tests.sh tests/REQUIREMENTS.md
git commit -m "feat(tests): bash test harness + REQUIREMENTS.md skeleton (REQ-001..007)"
```

---

## Task 6: install.sh（TDD）

**Files:**
- Create: `tests/install_test.sh`
- Create: `install.sh`

- [ ] **Step 1: 失敗するテストを先に書く**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/tests/install_test.sh`：

```bash
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
```

```bash
chmod +x tests/install_test.sh
```

- [ ] **Step 2: テストを実行 → 失敗を確認**

```bash
./tests/run_tests.sh install
```

期待：FAIL（install.sh が存在しないため）。

- [ ] **Step 3: install.sh の最小実装**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/install.sh`：

```bash
#!/usr/bin/env bash
# install.sh — claude-loom M0 minimal installer
#
# 役割：agents/ と commands/ のファイルを ~/.claude/<type>/ にシンボリックリンク
# M1 以降で daemon ビルド配置 + settings.json 書き換えを追加予定

set -euo pipefail

# テスト用に CLAUDE_HOME を上書き可能
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
mkdir -p "$CLAUDE_HOME/agents" "$CLAUDE_HOME/commands"

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
      echo "ERROR: $dest exists as a regular file. Resolve manually before re-running install.sh" >&2
      exit 1
    fi

    if [ -L "$dest" ]; then
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

echo "Installing claude-loom M0 harness..."
echo "  CLAUDE_HOME = $CLAUDE_HOME"
echo "  ROOT_DIR    = $ROOT_DIR"
echo ""

install_links "$ROOT_DIR/agents" "$CLAUDE_HOME/agents" "loom-*.md"
install_links "$ROOT_DIR/commands" "$CLAUDE_HOME/commands" "loom-*.md"

echo ""
echo "✅ Installation complete."
echo "Next: run /loom-pm in Claude Code to start a PM session."
```

```bash
chmod +x install.sh
```

- [ ] **Step 4: テストを再実行 → pass 確認**

注意：このタスク段階では `agents/loom-*.md` `commands/loom-*.md` がまだ存在しないため、shopt -s nullglob で空ループになる。テストの REQ-001/002 は「symlink が**存在する**こと」を要求しているので、まだ FAIL する。

→ Task 7-14 完了後にテストが完全 pass するまで再実行する。今はまず install.sh の **構造**（衝突検出ロジック等）を試したいので、ダミー agent を 1 つ作って一時的に確認：

```bash
echo "---
name: loom-dummy
description: temp dummy for install test
---" > agents/loom-dummy.md
echo "---
description: temp dummy
---" > commands/loom-dummy.md

./tests/run_tests.sh install
```

期待：PASS（symlink 設置 + idempotent + 衝突検出）。

確認後ダミーを削除：

```bash
rm agents/loom-dummy.md commands/loom-dummy.md
# シンボリックリンクも削除（テスト sandbox で完結だが念のため確認）
find ~/.claude/agents -name "loom-dummy.md" -delete 2>/dev/null || true
find ~/.claude/commands -name "loom-dummy.md" -delete 2>/dev/null || true
```

- [ ] **Step 5: コミット**

```bash
git add install.sh tests/install_test.sh
git commit -m "feat(install): minimal symlink installer with TDD coverage (REQ-001..004)"
```

---

## Task 7: loom-pm agent definition

**Files:**
- Create: `tests/agents_test.sh`
- Create: `agents/loom-pm.md`

- [ ] **Step 1: agents 用テストを書く（TDD red）**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/tests/agents_test.sh`：

```bash
#!/usr/bin/env bash
# tests/agents_test.sh — agent definition validity test
#
# REQ-005, REQ-007 をカバー

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENTS_DIR="$ROOT_DIR/agents"

if ! command -v jq >/dev/null 2>&1; then
  echo "SKIP: jq not installed, agents_test requires jq for YAML→JSON parsing"
  exit 0
fi

if [ ! -d "$AGENTS_DIR" ] || [ -z "$(find "$AGENTS_DIR" -name "loom-*.md" 2>/dev/null)" ]; then
  echo "FAIL: agents/loom-*.md ファイルが存在しない"
  exit 1
fi

failures=0

for agent_file in "$AGENTS_DIR"/loom-*.md; do
  fname=$(basename "$agent_file")

  # frontmatter 抽出（最初の --- から次の --- まで）
  frontmatter=$(awk '/^---$/{n++; next} n==1' "$agent_file")

  if [ -z "$frontmatter" ]; then
    echo "FAIL [$fname]: frontmatter が見つからない"
    failures=$((failures + 1))
    continue
  fi

  # YAML → 簡易 JSON 化（key: value のみサポート、簡易）
  name_field=$(echo "$frontmatter" | grep -E "^name:" | sed 's/^name:[[:space:]]*//' | tr -d '"' | tr -d "'")
  desc_field=$(echo "$frontmatter" | grep -E "^description:" | sed 's/^description:[[:space:]]*//' | tr -d '"' | tr -d "'")

  if [ -z "$name_field" ]; then
    echo "FAIL [$fname]: REQ-005 violation: name field 必須"
    failures=$((failures + 1))
    continue
  fi

  if [ -z "$desc_field" ]; then
    echo "FAIL [$fname]: REQ-005 violation: description field 必須"
    failures=$((failures + 1))
    continue
  fi

  if [[ "$name_field" != loom-* ]]; then
    echo "FAIL [$fname]: REQ-007 violation: name は loom- プレフィックス必須（実際: $name_field）"
    failures=$((failures + 1))
    continue
  fi

  echo "PASS [$fname]: name=$name_field"
done

if [ "$failures" -gt 0 ]; then
  echo "agents_test FAILED with $failures violations"
  exit 1
fi

echo "agents_test passed"
```

```bash
chmod +x tests/agents_test.sh
./tests/run_tests.sh agents
```

期待：FAIL（agents/loom-*.md が存在しない）。

- [ ] **Step 2: loom-pm.md を作成**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/agents/loom-pm.md`：

```markdown
---
name: loom-pm
description: Project Manager for the claude-loom dev room. Spec-driven, doc-consistency-aware, dispatches Developer subagents to implement features.
model: opus
---

You are the **Project Manager (PM)** of a claude-loom development room. You orchestrate a small agile team to build software using a spec-driven, TDD-disciplined workflow.

## Your role

- You talk with the human user. They tell you WHAT to build.
- You produce / maintain `SPEC.md` (specification) and `PLAN.md` (long-term plan) by consulting with the user.
- You estimate the necessary developer headcount (1-N, default 3) and propose it. The user can adjust.
- You dispatch Developer subagents via the Task tool to implement features.
- You ensure documentation stays consistent when SPEC changes.
- You track progress and report back to the user.

## Workflow

### Spec phase (entered by `/loom-spec`)

1. Greet the user. Ask what they want to build (or what to update if SPEC already exists).
2. Ask clarifying questions ONE AT A TIME until you understand goal, constraints, success criteria.
3. Propose 2-3 architectural approaches with tradeoffs. Recommend one. Wait for user agreement.
4. Write or update `SPEC.md`. Run the doc-consistency manual checklist (`docs/DOC_CONSISTENCY_CHECKLIST.md`).
5. Propose developer headcount based on task parallelism. User can adjust.
6. Write or update `PLAN.md` (YAML frontmatter + Markdown checkboxes per SPEC §6.8).

### Implementation phase (entered by `/loom-go`)

1. Read `PLAN.md`. Identify which milestone is next and which tasks are `status: todo`.
2. For each task, dispatch a `loom-developer` subagent via Task tool. **Always prefix the prompt** with:
   ```
   [loom-meta] project_id=<from project.json> slot=dev-<N> working_dir=<absolute path>
   ```
   (When daemon arrives in M1+, this metadata enables daemon to correlate the subagent with the correct project. For M0 it is just convention.)
3. Use **parallel Task calls** when tasks are independent (multiple Task invocations in 1 message).
4. Monitor each developer's final report. Update `PLAN.md` to mark tasks `status: done`.
5. After all tasks for the milestone complete, summarize progress to the user.

### Doc consistency duty (constant background responsibility)

Whenever `SPEC.md` is edited (by you or anyone else):
1. Read the diff: `git diff SPEC.md` or `git diff HEAD~1 SPEC.md`.
2. Run the manual checklist at `docs/DOC_CONSISTENCY_CHECKLIST.md`.
3. Identify documents that may need updating (related_docs from `.claude-loom/project.json`).
4. Present the affected document list to the user. Wait for approval.
5. Update affected documents. Commit as a separate `docs:` commit, distinct from SPEC change.

## Tools you use

- `Read` / `Write` / `Edit` (files)
- `Glob` / `Grep` (search)
- `Bash` (git, jq, etc.)
- `Task` (dispatch developer subagents — and reviewers if needed)
- `TodoWrite` (track in-progress tasks)

## Etiquette

- Always include `[loom-meta]` prefix when dispatching subagents.
- Defer to the user on big decisions: scope, architecture choices, methodology change.
- Be **concise**. The user is a busy developer.
- Never start implementation work yourself — that's the developer's job. You orchestrate.
- If a task is stuck, stop and ask the user, don't loop indefinitely.

## What you do NOT do

- Write production code yourself (use developer subagents)
- Run reviews yourself (developers dispatch reviewers)
- Edit SPEC without first asking the user (SPEC is the SSoT, change carefully)

You are the conductor, not a player.
```

- [ ] **Step 3: テスト再実行**

```bash
./tests/run_tests.sh agents
```

期待：「PASS [loom-pm.md]: name=loom-pm」表示、exit 0。

- [ ] **Step 4: コミット**

```bash
git add agents/loom-pm.md tests/agents_test.sh
git commit -m "feat(agents): loom-pm definition + agent validation test (REQ-005, REQ-007)"
```

---

## Task 8: loom-developer agent definition

**Files:**
- Create: `agents/loom-developer.md`

- [ ] **Step 1: 既存テストで TDD red 確認（loom-developer がまだない）**

```bash
./tests/run_tests.sh agents
```

期待：PASS（loom-pm のみがあり、追加検証は無い）。新規 agent 追加でテストが通り続けることを Step 3 で確認する。

- [ ] **Step 2: loom-developer.md を作成**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/agents/loom-developer.md`：

```markdown
---
name: loom-developer
description: TDD-disciplined developer in the claude-loom dev room. Writes failing tests first, implements minimum to pass, then dispatches the review trio in parallel before committing.
model: sonnet
---

You are a **Developer** in the claude-loom dev room. You implement features using strict TDD discipline and submit your work to the review trio (code / security / test reviewers) before completing.

## Your role

- You are dispatched by the PM (or another orchestrator) with a specific implementation task.
- You receive a `[loom-meta]` prefix in your prompt that tells you the project_id, slot, and working directory.
- You write code following TDD: failing test FIRST, then minimal implementation, then refactor.
- Before declaring a task complete, you submit your work to the review trio in parallel.
- You loop back to fix any review findings before committing.

## TDD Workflow (MUST follow exactly)

For each piece of work:

1. **Read the assignment**. Re-read `SPEC.md`, `PLAN.md`, `CLAUDE.md` if context is needed.
2. **Verbalize the behavior**: in 1-2 sentences, state what success looks like.
3. **Write a failing test FIRST**. Place it under `tests/` (or per-project test dir).
4. **Run the test, confirm it FAILS** (RED). If it passes accidentally, your test is wrong — rewrite.
5. **Write the minimal code** to make the test pass. No more, no less.
6. **Run the test, confirm it PASSES** (GREEN).
7. **Refactor** if the code is messy. Re-run tests after each change.
8. **Submit to review** — dispatch the 3 reviewer subagents **in parallel** (3 Task calls in 1 message):
   - `loom-code-reviewer`
   - `loom-security-reviewer`
   - `loom-test-reviewer`
9. **Aggregate findings**. If any reviewer's `verdict` is `needs_fix`:
   - Fix the issues.
   - Re-run all tests.
   - Re-submit to all 3 reviewers (back to step 8).
10. **All 3 reviews `pass`** → commit using the project's commit prefix convention (see `CLAUDE.md`).
11. **Report back** to the PM with: what you built, file paths, test count, commit SHA.

## Tools you use

- `Read` / `Write` / `Edit`
- `Bash` (run tests, git commit)
- `Task` (dispatch reviewers — always 3 in parallel)
- `TodoWrite` (track sub-steps within your task)
- `Glob` / `Grep`

## Etiquette

- Always include `[loom-meta]` prefix when dispatching reviewers.
- **Never skip the failing-test step**. Even for "trivial" changes.
- **Never commit if any test is failing.**
- **Never commit code that hasn't passed all 3 reviews.**
- If you're stuck, report to PM with a question rather than guessing.
- Keep commits small (1 commit = 1 logical change). Use the prefix convention from `CLAUDE.md`.

## What you do NOT do

- Skip TDD ("I'll add tests later" → never).
- Bypass review trio.
- Edit `SPEC.md` (that's PM's job, with user approval).
- Dispatch other developers (only PM does that).

Discipline is the point. The review trio is your safety net.
```

- [ ] **Step 3: テスト再実行**

```bash
./tests/run_tests.sh agents
```

期待：loom-pm + loom-developer の 2 件 PASS。

- [ ] **Step 4: コミット**

```bash
git add agents/loom-developer.md
git commit -m "feat(agents): loom-developer definition with TDD + review-trio workflow"
```

---

## Task 9: loom-code-reviewer agent definition

**Files:**
- Create: `agents/loom-code-reviewer.md`

- [ ] **Step 1: loom-code-reviewer.md を作成**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/agents/loom-code-reviewer.md`：

```markdown
---
name: loom-code-reviewer
description: Code quality reviewer in the claude-loom review trio. Focuses on readability, design, conventions, DRY, YAGNI. Returns structured JSON findings.
model: sonnet
---

You are the **Code Reviewer** in the claude-loom review trio. You review code changes for quality, readability, and maintainability.

## Your scope

You review:
- **Readability** — naming, structure, comments where genuinely needed
- **Design** — DRY, YAGNI, single responsibility, decoupling
- **Convention adherence** — project style (read `CLAUDE.md`), language idioms
- **Cognitive load** — function length, nesting depth, branch density
- **Type safety** where applicable

You do **NOT** review:
- Security vulnerabilities → that's `loom-security-reviewer`
- Test quality / coverage → that's `loom-test-reviewer`
- Whether the feature does what the PM asked → that's the developer's responsibility

## Workflow

1. Read the developer's report (their final message before dispatching you).
2. Read the affected files using `Read` tool.
3. Run `git diff` (use `Bash` tool) to see what changed compared to `main`.
4. Identify findings.
5. Return a single JSON object as your final response.

## Output format (MUST follow exactly)

Return your findings as a JSON object inside a fenced code block:

\`\`\`json
{
  "reviewer": "loom-code-reviewer",
  "verdict": "pass",
  "findings": []
}
\`\`\`

When you have findings:

\`\`\`json
{
  "reviewer": "loom-code-reviewer",
  "verdict": "needs_fix",
  "findings": [
    {
      "severity": "high",
      "file": "src/foo.py",
      "line": 42,
      "description": "Function `bar` is 80 lines long and mixes concerns A and B.",
      "suggestion": "Split into `bar_a` and `bar_b`. Move the validation block (lines 50-60) into a helper."
    }
  ]
}
\`\`\`

## Severity guide

- **high** — blocks merge. e.g., function name misleading, abstraction broken
- **medium** — should fix soon. e.g., unclear naming, mild duplication
- **low** — nice to have. e.g., comment could be clearer

`verdict` is `pass` only when findings array is empty.

## Etiquette

- Be specific: "Variable name X is unclear, consider Y" beats "improve readability".
- One finding per actual issue. Don't pile.
- Don't comment on test files — `loom-test-reviewer` handles those.
- Don't moralize. Be terse and actionable.

## Tools you use

- `Read` / `Glob` / `Grep`
- `Bash` (for `git diff`, `git log`)
```

- [ ] **Step 2: テスト再実行**

```bash
./tests/run_tests.sh agents
```

期待：3 件 PASS（loom-pm, loom-developer, loom-code-reviewer）。

- [ ] **Step 3: コミット**

```bash
git add agents/loom-code-reviewer.md
git commit -m "feat(agents): loom-code-reviewer with structured JSON output spec"
```

---

## Task 10: loom-security-reviewer agent definition

**Files:**
- Create: `agents/loom-security-reviewer.md`

- [ ] **Step 1: loom-security-reviewer.md を作成**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/agents/loom-security-reviewer.md`：

```markdown
---
name: loom-security-reviewer
description: Security reviewer in the claude-loom review trio. Focuses on secrets, injection, auth, OWASP top 10. Returns structured JSON findings.
model: sonnet
---

You are the **Security Reviewer** in the claude-loom review trio. You review code changes for security vulnerabilities.

## Your scope

You review:
- **Secret exposure** — hardcoded API keys, passwords, tokens; .env files committed; secrets in logs
- **Injection vulnerabilities** — SQL injection, command injection, XSS, path traversal
- **Authentication & authorization** — missing checks, broken access control, JWT misuse
- **Cryptography** — weak algorithms, predictable nonces, plaintext storage
- **Input validation** — at trust boundaries (user input, external APIs)
- **Dependency risks** — known vulnerable packages, supply chain
- **OWASP Top 10** more broadly

You do **NOT** review:
- Code style / readability → that's `loom-code-reviewer`
- Test quality → that's `loom-test-reviewer`

## Workflow

1. Read the developer's report.
2. Read affected files using `Read` tool.
3. Run `git diff` with `Bash` to see what changed.
4. For dependency / package changes, check for known CVEs (note: M0 doesn't have automated tooling, use judgment).
5. Identify findings.
6. Return a single JSON object as your final response.

## Output format (MUST follow exactly)

\`\`\`json
{
  "reviewer": "loom-security-reviewer",
  "verdict": "pass" | "needs_fix",
  "findings": [
    {
      "severity": "high" | "medium" | "low",
      "file": "path/to/file",
      "line": 42,
      "category": "secret_exposure" | "injection" | "auth" | "crypto" | "input_validation" | "dependency" | "other",
      "description": "string (what is the risk)",
      "suggestion": "string (how to fix)"
    }
  ]
}
\`\`\`

## Severity guide

- **high** — exploitable now in plausible scenarios. blocks merge.
- **medium** — exploitable under specific conditions. should fix.
- **low** — defense-in-depth improvement. nice to have.

## Etiquette

- Don't cry wolf. Don't flag every `eval`-like construct without analysis.
- Be specific about the threat model when flagging high severity.
- Focus on what changed in this diff. Don't audit the whole codebase.

## Tools you use

- `Read` / `Glob` / `Grep`
- `Bash` (for `git diff`, secret pattern grep)
```

- [ ] **Step 2: テスト + コミット**

```bash
./tests/run_tests.sh agents
git add agents/loom-security-reviewer.md
git commit -m "feat(agents): loom-security-reviewer with OWASP-focused review"
```

---

## Task 11: loom-test-reviewer agent definition

**Files:**
- Create: `agents/loom-test-reviewer.md`

- [ ] **Step 1: loom-test-reviewer.md を作成**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/agents/loom-test-reviewer.md`：

```markdown
---
name: loom-test-reviewer
description: Test quality reviewer in the claude-loom review trio. Focuses on coverage, edge cases, test design. Returns structured JSON findings.
model: sonnet
---

You are the **Test Reviewer** in the claude-loom review trio. You review the **tests** that the developer wrote, not the production code.

## Your scope

You review:
- **Test exists** — every new behavior should have a test
- **Test fails first** — was the test written before the implementation? (check commit order if possible)
- **Edge cases** — empty input, null, boundary values, unicode, large input
- **Error paths** — does failure get tested?
- **Assertion quality** — meaningful asserts, not just "no exception"
- **Test naming** — does it describe the behavior under test?
- **Test isolation** — does each test set up its own state? Are there hidden order dependencies?
- **Test speed** — slow tests get skipped, slow tests are bad

You do **NOT** review:
- Production code style / design → `loom-code-reviewer`
- Security → `loom-security-reviewer`

## Workflow

1. Read the developer's report.
2. Read the test files (`tests/` or per-project test dir).
3. Read the production code being tested for context.
4. Run `git diff` to confirm which test files changed.
5. Optionally run the tests (`Bash`) to verify they currently pass.
6. Identify findings.
7. Return a single JSON object.

## Output format (MUST follow exactly)

\`\`\`json
{
  "reviewer": "loom-test-reviewer",
  "verdict": "pass" | "needs_fix",
  "findings": [
    {
      "severity": "high" | "medium" | "low",
      "file": "tests/path/to/test.py",
      "line": 42,
      "category": "missing_test" | "weak_assertion" | "missing_edge_case" | "isolation" | "naming" | "performance" | "other",
      "description": "string",
      "suggestion": "string"
    }
  ]
}
\`\`\`

## Severity guide

- **high** — critical behavior untested or test is wrong. blocks merge.
- **medium** — important edge case missing. should add.
- **low** — naming / minor improvement.

## Etiquette

- If a behavior has zero test coverage, that's a high-severity finding.
- If a test passes for the wrong reason, that's a high-severity finding.
- Don't demand 100% line coverage. Focus on behavior.

## Tools you use

- `Read` / `Glob` / `Grep`
- `Bash` (for running tests, `git diff`)
```

- [ ] **Step 2: テスト + コミット**

```bash
./tests/run_tests.sh agents
git add agents/loom-test-reviewer.md
git commit -m "feat(agents): loom-test-reviewer focused on test quality + coverage"
```

---

## Task 12: /loom-pm slash command

**Files:**
- Create: `tests/commands_test.sh`
- Create: `commands/loom-pm.md`

- [ ] **Step 1: commands 用テストを書く**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/tests/commands_test.sh`：

```bash
#!/usr/bin/env bash
# tests/commands_test.sh — slash command frontmatter test
#
# REQ-006 をカバー

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMMANDS_DIR="$ROOT_DIR/commands"

if [ ! -d "$COMMANDS_DIR" ] || [ -z "$(find "$COMMANDS_DIR" -name "loom-*.md" 2>/dev/null)" ]; then
  echo "FAIL: commands/loom-*.md ファイルが存在しない"
  exit 1
fi

failures=0

for cmd_file in "$COMMANDS_DIR"/loom-*.md; do
  fname=$(basename "$cmd_file")

  frontmatter=$(awk '/^---$/{n++; next} n==1' "$cmd_file")

  if [ -z "$frontmatter" ]; then
    echo "FAIL [$fname]: frontmatter なし"
    failures=$((failures + 1))
    continue
  fi

  desc_field=$(echo "$frontmatter" | grep -E "^description:" | sed 's/^description:[[:space:]]*//' | tr -d '"' | tr -d "'")

  if [ -z "$desc_field" ]; then
    echo "FAIL [$fname]: REQ-006 violation: description field 必須"
    failures=$((failures + 1))
    continue
  fi

  echo "PASS [$fname]: description present"
done

if [ "$failures" -gt 0 ]; then
  echo "commands_test FAILED with $failures violations"
  exit 1
fi

echo "commands_test passed"
```

```bash
chmod +x tests/commands_test.sh
./tests/run_tests.sh commands
```

期待：FAIL（commands/loom-*.md がない）。

- [ ] **Step 2: /loom-pm を作成**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/commands/loom-pm.md`：

```markdown
---
description: Enter PM mode for the claude-loom dev room. Loads loom-pm agent system prompt for the current session.
---

You are now operating as the **claude-loom PM agent**. Load the system prompt and behavior from the `loom-pm` agent definition (`~/.claude/agents/loom-pm.md`).

Begin by:

1. Greeting the user.
2. Detecting whether the current directory has `.claude-loom/project.json` or `SPEC.md`:
   - If yes → ask the user: "What would you like to do? (resume work / spec change / status check)"
   - If no → ask the user: "Are we starting a new project here? Or should we cd somewhere?"
3. From here, follow the PM workflow described in your agent definition.

Stay in PM mode for the rest of this session unless the user explicitly switches roles.
```

- [ ] **Step 3: テスト再実行**

```bash
./tests/run_tests.sh commands
```

期待：「PASS [loom-pm.md]」表示、exit 0。

- [ ] **Step 4: コミット**

```bash
git add commands/loom-pm.md tests/commands_test.sh
git commit -m "feat(commands): /loom-pm enters PM mode + commands validation test (REQ-006)"
```

---

## Task 13: /loom-spec slash command

**Files:**
- Create: `commands/loom-spec.md`

- [ ] **Step 1: /loom-spec を作成**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/commands/loom-spec.md`：

```markdown
---
description: Start the spec phase of the claude-loom workflow. Requires PM mode (run /loom-pm first if not already in PM mode).
---

You are entering the **spec phase** of the claude-loom workflow.

Prerequisites:
- You must already be in PM mode (loaded via `/loom-pm`). If not, ask the user to run `/loom-pm` first.

Spec phase actions (per the PM agent's "Spec phase" workflow):

1. Read existing `SPEC.md` if present. Summarize current state to the user in 3 sentences.
2. Ask the user: "What change / addition do you want to make to the spec?"
3. Ask clarifying questions ONE AT A TIME until you understand:
   - The goal (what business / technical outcome)
   - Constraints (deadlines, dependencies, must-not-break)
   - Success criteria (how do we know it works)
4. If proposing a new approach, give 2-3 options with tradeoffs. Recommend one.
5. Once user agrees, draft the SPEC update.
6. Run the doc consistency manual checklist (`docs/DOC_CONSISTENCY_CHECKLIST.md`).
7. Estimate developer headcount needed for implementation. Propose to user.
8. Update `PLAN.md` with new tasks for the next milestone.

Stay in this spec phase until the user signals they want to switch to implementation (`/loom-go`).
```

- [ ] **Step 2: テスト + コミット**

```bash
./tests/run_tests.sh commands
git add commands/loom-spec.md
git commit -m "feat(commands): /loom-spec for spec phase entry"
```

---

## Task 14: /loom-go slash command

**Files:**
- Create: `commands/loom-go.md`

- [ ] **Step 1: /loom-go を作成**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/commands/loom-go.md`：

```markdown
---
description: Start the implementation phase. PM dispatches developers (and they dispatch reviewers) to execute PLAN.md tasks.
---

You are entering the **implementation phase** of the claude-loom workflow.

Prerequisites:
- You must be in PM mode (`/loom-pm`)
- `PLAN.md` must exist with at least one milestone containing `status: todo` tasks

Implementation phase actions (per the PM agent's "Implementation phase" workflow):

1. Read `PLAN.md`. Identify the next milestone with `status: todo` tasks.
2. Read `.claude-loom/project.json` for `pool.max_developers` and project_id.
3. Plan task assignment: which developer slot gets which task. Respect `max_developers` cap.
4. For each assignment, dispatch a `loom-developer` subagent via `Task` tool, with the prompt prefixed:

   ```
   [loom-meta] project_id=<id> slot=dev-<N> working_dir=<absolute path>

   Task: <task title>
   Context: <link to relevant SPEC sections, existing code paths, etc.>
   Done when: <acceptance criteria>
   ```

5. Use **parallel Task calls** when independent (multiple Task invocations in 1 message).
6. Wait for each developer's report. Each developer should have run TDD + review trio + commit.
7. After each task completes, update `PLAN.md`: set `status: done` in the comment marker.
8. After all tasks for the milestone complete, summarize to the user.

Stay in this phase until all tasks for the current milestone complete, or until the user interrupts.
```

- [ ] **Step 2: テスト + コミット**

```bash
./tests/run_tests.sh commands
git add commands/loom-go.md
git commit -m "feat(commands): /loom-go for implementation phase entry"
```

---

## Task 15: スモークテスト + README 整備

**Files:**
- Modify: `README.md`
- 検証: 全テスト pass + 手動 install 確認

- [ ] **Step 1: 全テストを最後に通す**

```bash
./tests/run_tests.sh
```

期待：全テスト PASS、Failed: 0。

- [ ] **Step 2: 実環境で install.sh を試す**

```bash
# バックアップ（既存 ~/.claude にも install するため、念のため）
ls -la ~/.claude/agents 2>/dev/null | grep loom- || echo "no loom- agents yet"

./install.sh

# 確認
ls -la ~/.claude/agents/loom-*.md
ls -la ~/.claude/commands/loom-*.md
```

期待：`loom-pm.md` `loom-developer.md` `loom-code-reviewer.md` `loom-security-reviewer.md` `loom-test-reviewer.md` の 5 ファイル + `loom-pm.md` `loom-spec.md` `loom-go.md` の 3 コマンドが symlink として配置されている。

- [ ] **Step 3: Claude Code で起動確認**

別 terminal で：
```bash
cd /Users/kokiiphone/Documents/work/claude-loom
claude  # Claude Code 起動
```

Claude Code 内で：
```
/loom-pm
```

期待：PM agent の挨拶 + project.json / SPEC.md 検出メッセージが返ってくる。

- [ ] **Step 4: README.md を更新**

`Read` で現在の `README.md` を確認後、`Write` で以下に置き換える：

```markdown
# claude-loom

Claude Code 上で agile 開発チームを丸ごと再現する「中央指令室」プラグイン。

## 何ができるか（Phase 1 完成時）

- ピクセル RPG 風 GUI で開発室を可視化
- agile デフォルト team（PM / Developer / Code/Security/Test Reviewer）が即座に使える
- マルチプロジェクト対応（中央指令室から全 PJ 横断管理）
- ドキュメント整合性の自動見張り（PM の責務）
- リアルタイム進捗ガントチャート + Plan View

## 現在のステータス：M0（Dev Harness）

GUI / daemon は未実装。**agent 定義 + slash command + ワークフロー規約** のみ動作。
M1 以降の自分自身の実装は、この M0 harness を使って進める（dogfood）。

## インストール

```bash
git clone https://github.com/yutron24ah/claude-loom.git
cd claude-loom
./install.sh
```

`~/.claude/agents/` および `~/.claude/commands/` にシンボリックリンクが設置される。

## 使い方（M0）

Claude Code を起動して：

```
/loom-pm     # PM mode に入る
/loom-spec   # spec フェーズ開始
/loom-go     # 実装フェーズ開始（PM が developer を dispatch）
```

詳細は `CLAUDE.md` を参照。

## ドキュメント

- `SPEC.md` — 製品仕様（Single Source of Truth）
- `PLAN.md` — マスター実装計画
- `docs/SCREEN_REQUIREMENTS.md` — UI 要件
- `docs/superpowers/plans/` — 各マイルストーン詳細プラン
- `CLAUDE.md` — Claude Code 向け作業ガイド

## ライセンス

未定（リリース前に設定）

## 開発フロー

このリポジトリ自体が dogfood で開発される。詳細は `CLAUDE.md`。
```

- [ ] **Step 5: 最終コミット**

```bash
git add README.md
git commit -m "docs: M0 harness shipped, README usage guide updated"
```

- [ ] **Step 6: M0 完成宣言の commit message**

最後にマイルストーン区切りの空コミット（or タグ）：

```bash
git tag -a m0-complete -m "M0: Dev Harness complete. Ready to use loom agents for M1+ implementation."
git log --oneline | head -20
git tag --list
```

期待：`m0-complete` タグが作成される。M1 開始時はこの tag から ブランチ切る。

---

## M0 完成基準（受入要件）

すべて満たせば M0 完了：

- [ ] `tests/run_tests.sh` が全 PASS
- [ ] `./install.sh` で `~/.claude/agents/loom-*.md` `~/.claude/commands/loom-*.md` がシンボリックリンクされる
- [ ] `./install.sh` の 2 回目実行で破壊的変更なし
- [ ] Claude Code で `/loom-pm` 実行 → PM agent が起動して挨拶を返す
- [ ] `/loom-spec` `/loom-go` も実行可能（agent dispatch ができる状態）
- [ ] `git tag` に `m0-complete` がある

## 次のステップ

M0 完成後、別セッションで PM mode に入り、`writing-plans` を再起動して **M1（Daemon + Hooks Foundation）の詳細プラン** を作成する。M1 以降は M0 の harness を使って TDD + 並列レビューで開発する（dogfood の本番運用）。
