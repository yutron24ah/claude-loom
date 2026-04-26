# claude-loom M0.5: Approval-Reduction Skills + install.sh Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** M0 ハーネスに 4 つの skill（`loom-test` / `loom-status` / `loom-tdd-cycle` / `loom-review-trio`）と `templates/settings.json.template` を追加し、`install.sh` を拡張してそれらを `~/.claude/skills/` に配置 + プラグイン利用者全員が承認回数最小で開始できる状態を作る。

**Architecture:** `skills/loom-*/SKILL.md` は Claude Code 標準の skill 形式（YAML frontmatter + 本文 + optional `scripts/`）。`install.sh` をディレクトリ単位 symlink に拡張。`templates/settings.json.template` は新規プロジェクトの `.claude/settings.json` 初期値として PM が adopt フローで配布。SPEC §3（Phase 構成）と §9.1（ディレクトリ構造）に「harness 補助 skill は M0.5 で前倒し shipping」を反映、PLAN.md に M0.5 マイルストーンを挿入。

**Tech Stack:** bash、jq、Claude Code skill 規約。Node 等の重量依存なし。

---

## File Structure

このプランで作成・編集するファイル：

```
claude-loom/
├── SPEC.md                                            [Task 1]
├── PLAN.md                                            [Task 2]
├── README.md                                          [Task 12]
├── CLAUDE.md                                          [Task 12]
├── install.sh                                         [Task 9]
├── .claude/
│   └── settings.json                                  [Task 9 で skill 用 allow 追加]
├── tests/
│   ├── REQUIREMENTS.md                                [Task 3, REQ-008..REQ-011]
│   ├── skills_test.sh                                 [Task 4, 新規]
│   └── install_test.sh                                [Task 10, REQ-008/009 追加]
├── skills/
│   ├── loom-test/
│   │   ├── SKILL.md                                   [Task 5]
│   │   └── scripts/run.sh                             [Task 5]
│   ├── loom-status/
│   │   ├── SKILL.md                                   [Task 6]
│   │   └── scripts/status.sh                          [Task 6]
│   ├── loom-tdd-cycle/
│   │   └── SKILL.md                                   [Task 7]
│   └── loom-review-trio/
│       └── SKILL.md                                   [Task 8]
└── templates/
    └── settings.json.template                         [Task 11]
```

責務境界：
- `skills/loom-test/` `skills/loom-status/` — bash bundled-script 型（読み取り専用シェル処理を 1 本にまとめて allowlist 1 行で承認削減）
- `skills/loom-tdd-cycle/` `skills/loom-review-trio/` — prompt augmentation 型（SKILL.md のみ、規律ガイドとプロンプトテンプレ）
- `templates/settings.json.template` — 新規 PJ の `.claude/settings.json` 初期値。bundled skill のパスを `Bash(<absolute>/skills/loom-*/scripts/*.sh *)` で allow

---

## Task 1: SPEC.md 更新（§3 Phase 構成 + §9.1 ディレクトリ構造）

**Files:**
- Modify: `SPEC.md`

claude-loom の SSoT は SPEC。実装前に SPEC を update（この repo の規律：仕様乖離時は SPEC 先行）。

- [ ] **Step 1: SPEC §3 から skills の Phase 言及箇所を grep**

```bash
cd /Users/kokiiphone/Documents/work/claude-loom
grep -n "Phase 2\|skill" SPEC.md | head -30
```

- [ ] **Step 2: §3 Phase 構成セクションに M0.5 注記を追加**

`Edit` tool で SPEC.md の `## 3.` セクション内、Phase 1 説明の後ろに以下のサブセクションを追加（既存の `### 3.7` の手前に挿入）：

```markdown
### 3.6.1 M0.5 — Approval-Reduction Skills（M0 と M1 の橋渡し）

M0 で構築したハーネスを使った M1+ 開発の前に、承認プロンプト削減のための補助 skill を前倒しで shipping する。SPEC §3 元設計では skill 自動生成は Phase 2 だが、それは「Hermes 型自己進化で skill を**生成する**」フェーズの話。ここで shipping するのは **harness 利用者全員が必ず欲しがる手書き skill**：

- `loom-test`：ハーネステスト一括実行 + 結果サマリ
- `loom-status`：repo / harness 状態スナップショット
- `loom-tdd-cycle`：TDD 規律ガイド（loom-developer から呼ばれる）
- `loom-review-trio`：3 reviewer 並列 dispatch のプロンプトテンプレ
- `templates/settings.json.template`：bundled-script を allowlist に含めた settings 初期値

shipping 規模：4 skill + 1 template + `install.sh` 拡張。SPEC §9.1 のディレクトリ構造に `skills/` が M0.5 から有効化される。
```

実際に挿入する位置：`### 3.6` または `### 3.7` の直前（current SPEC では `### 3.7 プロジェクトライフサイクル` がある想定。grep で位置確認の上挿入）。

- [ ] **Step 3: §9.1 ディレクトリ構造に skills/ の Phase 注記を更新**

`SPEC.md` の §9.1 内、`skills/` を扱っている箇所（無ければ追加）：

旧（あれば）：
```
skills/ — Phase 2 以降
```

新：
```
skills/ — M0.5 から有効。M0.5 で 4 つの harness 補助 skill を shipping。Phase 2 で Hermes 型自動生成が加わる
```

- [ ] **Step 4: 変更履歴セクション末尾に 1 行追加**

`## 変更履歴` セクション末尾に：
```
- 2026-04-26: §3.6.1 追加 + §9.1 skills/ 注記更新（M0.5 で skill 前倒し shipping 決定）
```

- [ ] **Step 5: doc 整合性 manual checklist を実行**

```bash
git diff SPEC.md
```

`docs/DOC_CONSISTENCY_CHECKLIST.md` を参照して影響範囲確認。今回は §3.6.1 追加と §9.1 注記のみで PLAN.md / README.md / CLAUDE.md / agents/ / commands/ への波及は次のタスクで個別更新する（全タスクで Touch するファイルは plan の File Structure に列挙済み）。

- [ ] **Step 6: コミット**

```bash
git add SPEC.md
git commit -m "docs(spec): add §3.6.1 M0.5 skills milestone + skills/ phase note"
```

---

## Task 2: PLAN.md に M0.5 マイルストーンを挿入

**Files:**
- Modify: `PLAN.md`

- [ ] **Step 1: M0 完了行と M1 開始行の間に M0.5 セクションを挿入**

`Edit` tool で PLAN.md の `## マイルストーン M1: Daemon + Hooks Foundation` の直前に以下を挿入：

```markdown
## マイルストーン M0.5: Approval-Reduction Skills + install 拡張

詳細: `docs/superpowers/plans/2026-04-26-claude-loom-m0.5-skills.md`

- [ ] SPEC §3.6.1 + §9.1 更新 <!-- id: m0.5-t1 status: todo -->
- [ ] PLAN.md に M0.5 マイルストーン挿入 <!-- id: m0.5-t2 status: todo -->
- [ ] tests/REQUIREMENTS.md に REQ-008..REQ-011 追加 <!-- id: m0.5-t3 status: todo -->
- [ ] tests/skills_test.sh（skill 構造 + frontmatter 検証） <!-- id: m0.5-t4 status: todo -->
- [ ] skill: loom-test（SKILL.md + scripts/run.sh） <!-- id: m0.5-t5 status: todo -->
- [ ] skill: loom-status（SKILL.md + scripts/status.sh） <!-- id: m0.5-t6 status: todo -->
- [ ] skill: loom-tdd-cycle（prompt augmentation） <!-- id: m0.5-t7 status: todo -->
- [ ] skill: loom-review-trio（prompt augmentation） <!-- id: m0.5-t8 status: todo -->
- [ ] install.sh 拡張（skills symlink + settings template） <!-- id: m0.5-t9 status: todo -->
- [ ] install_test.sh で REQ-008/009 カバー <!-- id: m0.5-t10 status: todo -->
- [ ] templates/settings.json.template 作成 <!-- id: m0.5-t11 status: todo -->
- [ ] README.md + CLAUDE.md に skills 言及追加 <!-- id: m0.5-t12 status: todo -->
- [ ] スモークテスト + tag m0.5-complete <!-- id: m0.5-t13 status: todo -->

**M0.5 完成基準**：`./install.sh` 実行で `~/.claude/skills/loom-{test,status,tdd-cycle,review-trio}/` が symlink として配置 + 4 つの skill が Claude Code セッション内で名前検出可能 + `templates/settings.json.template` の中身を新規 PJ にコピーすると bundled script が承認なしで実行可能。
```

- [ ] **Step 2: コミット**

```bash
git add PLAN.md
git commit -m "docs(plan): add M0.5 milestone (skills + install extension) between M0 and M1"
```

---

## Task 3: tests/REQUIREMENTS.md に REQ-008..REQ-011 追加

**Files:**
- Modify: `tests/REQUIREMENTS.md`

- [ ] **Step 1: 既存内容を確認**

```bash
cat tests/REQUIREMENTS.md
```

- [ ] **Step 2: `## M1 以降は別 PR で追記` の手前に以下を挿入**

`Edit` tool で `## M1 以降は別 PR で追記` を以下に置換：

```markdown
## M0.5: Approval-Reduction Skills

- **REQ-008**: `install.sh` 実行で `~/.claude/skills/loom-*/` のディレクトリ symlink が設置される
- **REQ-009**: `~/.claude/skills/loom-*/` 配下に通常ディレクトリ（symlink でない実体）が既存の場合、`install.sh` はエラー終了する
- **REQ-010**: 各 `skills/loom-*/SKILL.md` ファイルが valid な YAML frontmatter を持つ（name / description フィールド必須）
- **REQ-011**: 全 skill 定義の name フィールドが「loom-」プレフィックスで始まる

## M1 以降は別 PR で追記
```

- [ ] **Step 3: コミット**

```bash
git add tests/REQUIREMENTS.md
git commit -m "docs(tests): add REQ-008..REQ-011 for M0.5 skills"
```

---

## Task 4: tests/skills_test.sh（skill 構造 + frontmatter 検証、TDD red）

**Files:**
- Create: `tests/skills_test.sh`

- [ ] **Step 1: 失敗するテストを先に書く（TDD red）**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/tests/skills_test.sh`：

```bash
#!/usr/bin/env bash
# tests/skills_test.sh — skill definition validity test
#
# REQ-010, REQ-011 をカバー

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS_DIR="$ROOT_DIR/skills"

if [ ! -d "$SKILLS_DIR" ] || [ -z "$(find "$SKILLS_DIR" -mindepth 1 -maxdepth 1 -type d -name "loom-*" 2>/dev/null)" ]; then
  echo "FAIL: skills/loom-*/ ディレクトリが存在しない"
  exit 1
fi

failures=0

for skill_dir in "$SKILLS_DIR"/loom-*/; do
  skill_name=$(basename "$skill_dir")
  skill_md="$skill_dir/SKILL.md"

  if [ ! -f "$skill_md" ]; then
    echo "FAIL [$skill_name]: SKILL.md が存在しない"
    failures=$((failures + 1))
    continue
  fi

  # frontmatter 抽出（最初の --- から次の --- まで）
  frontmatter=$(awk '/^---$/{n++; next} n==1' "$skill_md")

  if [ -z "$frontmatter" ]; then
    echo "FAIL [$skill_name]: frontmatter が見つからない"
    failures=$((failures + 1))
    continue
  fi

  closer_count=$(grep -c "^---$" "$skill_md" 2>/dev/null || true)
  if [ -z "$closer_count" ] || [ "$closer_count" -lt 2 ]; then
    echo "FAIL [$skill_name]: frontmatter not closed (expected 2 '---' delimiters, found $closer_count)"
    failures=$((failures + 1))
    continue
  fi

  name_field=$(echo "$frontmatter" | grep -E "^name:" | sed 's/^name:[[:space:]]*//' | tr -d '"' | tr -d "'" || true)
  desc_field=$(echo "$frontmatter" | grep -E "^description:" | sed 's/^description:[[:space:]]*//' | tr -d '"' | tr -d "'" || true)

  if [ -z "$name_field" ]; then
    echo "FAIL [$skill_name]: REQ-010 violation: name field 必須"
    failures=$((failures + 1))
    continue
  fi

  if [ -z "$desc_field" ]; then
    echo "FAIL [$skill_name]: REQ-010 violation: description field 必須"
    failures=$((failures + 1))
    continue
  fi

  if [[ "$name_field" != loom-* ]]; then
    echo "FAIL [$skill_name]: REQ-011 violation: name は loom- プレフィックス必須（実際: $name_field）"
    failures=$((failures + 1))
    continue
  fi

  echo "PASS [$skill_name]: name=$name_field"
done

if [ "$failures" -gt 0 ]; then
  echo "skills_test FAILED with $failures violations"
  exit 1
fi

echo "skills_test passed"
```

```bash
chmod +x tests/skills_test.sh
```

- [ ] **Step 2: テスト実行 → FAIL を確認（skills/loom-*/ がまだない）**

```bash
./tests/run_tests.sh skills
```

期待：FAIL `skills/loom-*/ ディレクトリが存在しない`。

- [ ] **Step 3: コミット**

```bash
git add tests/skills_test.sh
git commit -m "test(skills): add skill structure + frontmatter validation (REQ-010, REQ-011)"
```

---

## Task 5: skill — loom-test（SKILL.md + scripts/run.sh）

**Files:**
- Create: `skills/loom-test/SKILL.md`
- Create: `skills/loom-test/scripts/run.sh`

- [ ] **Step 1: ディレクトリ作成 + scripts/run.sh を書く（実行可能）**

```bash
mkdir -p skills/loom-test/scripts
```

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/skills/loom-test/scripts/run.sh`：

```bash
#!/usr/bin/env bash
# skills/loom-test/scripts/run.sh
#
# claude-loom ハーネステスト一括実行 + 構造化サマリ出力
# 引数 1: 任意のフィルタ（agents / commands / install / skills）
# Read-only — テストは sandbox で実行され、repo state を変更しない

set -uo pipefail

# プロジェクトルート探索：cwd または親方向に SPEC.md + .claude-loom/project.json を持つディレクトリ
find_project_root() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -f "$dir/SPEC.md" ] && [ -d "$dir/tests" ] && [ -f "$dir/tests/run_tests.sh" ]; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done
  return 1
}

ROOT="$(find_project_root)"
if [ -z "${ROOT:-}" ]; then
  echo "ERROR: claude-loom project root not found (no SPEC.md + tests/run_tests.sh in cwd or ancestors)" >&2
  exit 1
fi

cd "$ROOT"

filter="${1:-}"

if [ -n "$filter" ]; then
  output=$(./tests/run_tests.sh "$filter" 2>&1) || rc=$?
else
  output=$(./tests/run_tests.sh 2>&1) || rc=$?
fi
rc="${rc:-0}"

# 集計サマリ抜き出し
passed=$(echo "$output" | grep -E "^Passed:" | sed -E 's/.*Passed: *([0-9]+).*/\1/' | head -1)
failed=$(echo "$output" | grep -E "^Passed:" | sed -E 's/.*Failed: *([0-9]+).*/\1/' | head -1)
skipped=$(echo "$output" | grep -E "^Passed:" | sed -E 's/.*Skipped: *([0-9]+).*/\1/' | head -1)

echo "=== loom-test summary ==="
echo "filter: ${filter:-(all)}"
echo "passed: ${passed:-?}"
echo "failed: ${failed:-?}"
echo "skipped: ${skipped:-?}"
echo "exit_code: $rc"
echo ""
if [ "${rc:-0}" -ne 0 ]; then
  echo "=== full output (test failures present) ==="
  echo "$output"
fi
exit "$rc"
```

```bash
chmod +x skills/loom-test/scripts/run.sh
```

- [ ] **Step 2: SKILL.md を書く**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/skills/loom-test/SKILL.md`：

```markdown
---
name: loom-test
description: Run the claude-loom harness test suite (install + agents + commands + skills) and report a structured summary. Use when verifying harness state after edits, before commits, or as part of TDD cycle gating in any claude-loom managed project.
---

# loom-test

claude-loom リポジトリで全テストを 1 コマンドで実行し、Pass/Fail/Skip カウントを構造化して返す。

## 使い方

このスキルが起動されたら、bundled script を呼ぶ：

```bash
/path/to/claude-loom/skills/loom-test/scripts/run.sh
```

オプション引数で test group をフィルタできる：

- `agents` — agents test のみ
- `commands` — commands test のみ
- `install` — install test のみ
- `skills` — skills test のみ
- 引数なし — 全テスト

## 出力例

成功時：
```
=== loom-test summary ===
filter: (all)
passed: 4
failed: 0
skipped: 0
exit_code: 0
```

失敗時は full output が続く。

## 設計メモ

- スクリプトは project root を SPEC.md + tests/run_tests.sh の存在で自動探索（cwd or ancestor）
- read-only：テストは `mktemp -d` sandbox で実行されるため repo state を変更しない
- exit code は run_tests.sh の rc を維持

## いつ呼ぶか

- TDD red → green の確認ステップ
- commit 前の自動 gating
- レビュー dispatch 前のセルフチェック
- harness 改修後の regression check
```

- [ ] **Step 3: テスト実行 → loom-test PASS を確認**

```bash
./tests/run_tests.sh skills
```

期待：`PASS [loom-test]: name=loom-test` + `skills_test passed`。

- [ ] **Step 4: スクリプトの動作確認（self-host）**

```bash
./skills/loom-test/scripts/run.sh
```

期待：`=== loom-test summary === filter: (all) passed: 3 ...` （現状 agents + commands + install のみ、skills はこの時点ではまだ counted）。

- [ ] **Step 5: コミット**

```bash
git add skills/loom-test/
git commit -m "feat(skills): loom-test bundled script + SKILL.md (M0.5)"
```

---

## Task 6: skill — loom-status（SKILL.md + scripts/status.sh）

**Files:**
- Create: `skills/loom-status/SKILL.md`
- Create: `skills/loom-status/scripts/status.sh`

- [ ] **Step 1: ディレクトリ + script 作成**

```bash
mkdir -p skills/loom-status/scripts
```

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/skills/loom-status/scripts/status.sh`：

```bash
#!/usr/bin/env bash
# skills/loom-status/scripts/status.sh
#
# claude-loom ハーネス + repo の状態スナップショット
# Read-only

set -uo pipefail

find_project_root() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -f "$dir/SPEC.md" ] && [ -d "$dir/tests" ] && [ -f "$dir/tests/run_tests.sh" ]; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done
  return 1
}

ROOT="$(find_project_root)"
if [ -z "${ROOT:-}" ]; then
  echo "ERROR: claude-loom project root not found" >&2
  exit 1
fi

cd "$ROOT"

echo "=== claude-loom status ==="
echo ""
echo "## branch & tags"
git branch --show-current 2>/dev/null
echo "latest tag: $(git describe --tags --abbrev=0 2>/dev/null || echo '(none)')"
echo ""
echo "## last 5 commits"
git log --oneline -5
echo ""
echo "## installed agents (~/.claude/agents/loom-*.md)"
find "${CLAUDE_HOME:-$HOME/.claude}/agents" -maxdepth 1 -name "loom-*.md" 2>/dev/null | sed 's|.*/||' || echo "(none)"
echo ""
echo "## installed commands (~/.claude/commands/loom-*.md)"
find "${CLAUDE_HOME:-$HOME/.claude}/commands" -maxdepth 1 -name "loom-*.md" 2>/dev/null | sed 's|.*/||' || echo "(none)"
echo ""
echo "## installed skills (~/.claude/skills/loom-*/)"
find "${CLAUDE_HOME:-$HOME/.claude}/skills" -mindepth 1 -maxdepth 1 -type d -name "loom-*" 2>/dev/null | sed 's|.*/||' || echo "(none)"
echo ""
echo "## working tree"
if [ -z "$(git status --porcelain)" ]; then
  echo "clean"
else
  git status --short
fi
```

```bash
chmod +x skills/loom-status/scripts/status.sh
```

- [ ] **Step 2: SKILL.md を書く**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/skills/loom-status/SKILL.md`：

```markdown
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
```

- [ ] **Step 3: テスト + スクリプト動作確認**

```bash
./tests/run_tests.sh skills
./skills/loom-status/scripts/status.sh
```

期待：skills_test で 2 PASS（loom-test + loom-status）。status.sh は branch/commits/installed リストを出力。

- [ ] **Step 4: コミット**

```bash
git add skills/loom-status/
git commit -m "feat(skills): loom-status repo+harness snapshot script (M0.5)"
```

---

## Task 7: skill — loom-tdd-cycle（prompt augmentation only）

**Files:**
- Create: `skills/loom-tdd-cycle/SKILL.md`

- [ ] **Step 1: SKILL.md を書く**

```bash
mkdir -p skills/loom-tdd-cycle
```

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/skills/loom-tdd-cycle/SKILL.md`：

```markdown
---
name: loom-tdd-cycle
description: Strict TDD discipline for claude-loom developers. Activate when implementing any feature or bug fix in a claude-loom-managed project. Provides the canonical Red→Green→Refactor→Review cycle that loom-developer agents follow.
---

# loom-tdd-cycle

claude-loom の開発者が **どんな小さな変更でも** 守る TDD ループ。`loom-developer` agent definition の中核ワークフローを skill 化したもの。implementor を兼ねる subagent はこれに従う。

## The Cycle (MUST follow exactly)

各実装単位で：

### 1. Read
- `SPEC.md` / `PLAN.md` / `CLAUDE.md` の関連箇所を読む
- task の受入条件を確認

### 2. Verbalize
1〜2 文で「成功とは何か」を声に出す（書く）。

### 3. Red — Write the failing test FIRST
- 該当する `tests/` 配下に test を書く
- `./tests/run_tests.sh <filter>` で実行
- **必ず FAIL を確認**。偶然 PASS したら test が間違ってる → 書き直し。

### 4. Green — Minimal implementation
- 最小限のコードで test を PASS させる
- 「過剰な抽象化」「将来のための拡張ポイント」を書かない
- `./tests/run_tests.sh <filter>` で PASS を確認

### 5. Refactor
- コードが汚いと感じたら整える
- リファクタ毎にテストを再実行

### 6. Review (dispatch the trio)
完了報告の前に **必ず** 3 reviewer に並列 dispatch：
- `loom-code-reviewer`
- `loom-security-reviewer`
- `loom-test-reviewer`

3 reviewer の prompt 内容は `loom-review-trio` skill を参照（または `agents/loom-developer.md` の Step 8）。

### 7. Aggregate findings
- いずれかの reviewer が `verdict: needs_fix` → fix → step 6 に戻って再 dispatch
- 全 reviewer が `verdict: pass` → step 8 へ

### 8. Commit
- プロジェクトの commit prefix 規約（`CLAUDE.md`）に従う
- 1 機能 = 1 commit

### 9. Report
- PM (or orchestrator) に：何を作ったか / 変更したファイルパス / test 件数 / commit SHA を返す

## 守るべき原則

- **失敗する test なしの実装は禁止**（"後でテスト追加" は永久に来ない）
- **test 失敗のままコミット禁止**
- **3 review 通過なしのコミット禁止**
- **新しい test ファイルを増やすときも TDD**：test ファイルが増える時はその test ファイル自体の構造をまず壊して、その上で実装に取りかかる
- **詰まったら止まる**：5 分以上同じエラーを直せないなら PM/orchestrator に質問する

## なぜこれが必要か

レビュー trio が安全網。一人の判断ミスを 3 視点（code quality / security / test quality）で網羅し、人間の review コストを後段に回せる。TDD でテストが先にあると、refactor が安全になる + 仕様の理解が固まる。

## いつ activate されるか

- claude-loom 管理プロジェクトで実装タスクを始める時
- `loom-developer` 役割の subagent としてディスパッチされた時
- ユーザーが "TDD で進めて" と明示した時
```

- [ ] **Step 2: テスト + コミット**

```bash
./tests/run_tests.sh skills
git add skills/loom-tdd-cycle/
git commit -m "feat(skills): loom-tdd-cycle TDD discipline guide (M0.5)"
```

---

## Task 8: skill — loom-review-trio（prompt augmentation only）

**Files:**
- Create: `skills/loom-review-trio/SKILL.md`

- [ ] **Step 1: SKILL.md を書く**

```bash
mkdir -p skills/loom-review-trio
```

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/skills/loom-review-trio/SKILL.md`：

```markdown
---
name: loom-review-trio
description: Dispatch three review subagents (code / security / test) in parallel for any claude-loom feature or fix before commit. Use when ready to submit work for review — provides the canonical Task prompt template that aligns with loom-{code,security,test}-reviewer agents.
---

# loom-review-trio

`loom-developer` が実装完了後、3 reviewer に並列 dispatch するためのプロンプトテンプレと運用ルール。`loom-tdd-cycle` skill の Step 6 と対になる。

## Dispatch — 3 Task calls in 1 message

複数 Task tool 呼び出しを **1 つのアシスタントメッセージに含めて並列実行** する。各 Task の subagent_type は対応する reviewer agent の名前。

### Reviewer prompt template (each of 3 reviewers gets this structure)

```
[loom-meta] project_id=<from project.json> slot=<reviewer-slot> working_dir=<absolute path>

## What was implemented
<1-2 sentences describing the change>

## Files modified
- <relative/path/to/file1>
- <relative/path/to/file2>

## Test command + summary
$ ./tests/run_tests.sh <filter>
Passed: <N>   Failed: <M>   Skipped: <S>

## Git context
branch: <current branch>
HEAD: <commit SHA>
diff: git diff <BASE>..HEAD

## What to focus on (optional, reviewer-specific)
- code-reviewer: <hint about complex logic if any>
- security-reviewer: <hint about secrets/inputs if any>
- test-reviewer: <hint about coverage gaps you suspect>
```

3 つそれぞれに上記を埋め、`subagent_type` で `loom-code-reviewer` / `loom-security-reviewer` / `loom-test-reviewer` を指定。

## 集約ルール

- 3 reviewer の出力は構造化 JSON（`{reviewer, verdict, findings}`）
- `verdict == needs_fix` が一つでもあれば → fix → 再 dispatch
- 全 `verdict == pass` で初めて commit OK
- findings の severity（high / medium / low）を見て対応：high は必ず修正、medium は文脈次第、low はコメントで残せる場合あり

## なぜ並列か

- 3 reviewer は独立した観点を持つ → I/O 並列化で時間短縮
- 1 reviewer の判断が他 reviewer に影響しない（互いの output を見ない）→ echo chamber 抑制

## いつ activate されるか

- `loom-tdd-cycle` の Step 6 で必ず
- 大きめの変更で reviewer のサブセットだけ呼びたい時（例：doc only 変更で security/test を skip）も、デフォルトは 3 並列
- M1 以降で developer 以外の orchestrator（例：PM 直 review）が呼ぶ場合も同テンプレ
```

- [ ] **Step 2: テスト + コミット**

```bash
./tests/run_tests.sh skills
git add skills/loom-review-trio/
git commit -m "feat(skills): loom-review-trio dispatch template skill (M0.5)"
```

---

## Task 9: install.sh 拡張（skills 用 directory symlink）

**Files:**
- Modify: `install.sh`
- Modify: `.claude/settings.json`（bundled script paths を allowlist に追加）

- [ ] **Step 1: install.sh を読み込んで現状確認**

```bash
cat install.sh
```

- [ ] **Step 2: install.sh に skill 用ディレクトリ symlink ロジックを追加**

`Edit` tool で install.sh の以下の部分を変更：

旧：
```bash
install_links "$ROOT_DIR/agents" "$CLAUDE_HOME/agents" "loom-*.md"
install_links "$ROOT_DIR/commands" "$CLAUDE_HOME/commands" "loom-*.md"
```

新（`mkdir -p` を skills 含む 3 ディレクトリに拡張、`install_links` の後ろに `install_dir_links` 関数 + 呼び出しを追加）：

旧（`mkdir -p` 行）：
```bash
mkdir -p "$CLAUDE_HOME/agents" "$CLAUDE_HOME/commands"
```

新：
```bash
mkdir -p "$CLAUDE_HOME/agents" "$CLAUDE_HOME/commands" "$CLAUDE_HOME/skills"
```

旧（`install_links` 関数の直後）：
```bash
install_links() {
  local src_dir="$1"
  local dest_dir="$2"
  local pattern="$3"
  ...
  shopt -u nullglob
}
```

その関数の **直後** に新関数を追加：

```bash

install_dir_links() {
  local src_parent="$1"
  local dest_parent="$2"
  local pattern="$3"

  shopt -s nullglob
  for src in "$src_parent"/$pattern/; do
    # strip trailing slash
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
```

そして既存の 2 行：
```bash
install_links "$ROOT_DIR/agents" "$CLAUDE_HOME/agents" "loom-*.md"
install_links "$ROOT_DIR/commands" "$CLAUDE_HOME/commands" "loom-*.md"
```

の後ろに 1 行追加：
```bash
install_dir_links "$ROOT_DIR/skills" "$CLAUDE_HOME/skills" "loom-*"
```

- [ ] **Step 3: bash syntax check**

```bash
bash -n install.sh
```

期待：エラーなし。

- [ ] **Step 4: GREEN 確認用に sandbox で install.sh を試行**

```bash
SANDBOX=$(mktemp -d)
CLAUDE_HOME="$SANDBOX/.claude" bash install.sh
ls -la "$SANDBOX/.claude/skills/"
```

期待：`loom-test`, `loom-status`, `loom-tdd-cycle`, `loom-review-trio` の 4 つの symlink。

```bash
rm -rf "$SANDBOX"
```

- [ ] **Step 5: 自リポジトリの `.claude/settings.json` に bundled script の allowlist を追加**

`Read` で確認の上、`Edit` で `.claude/settings.json` の `permissions.allow` 配列末尾（`]` の直前）に追加：

```json
,
      "Bash(/Users/kokiiphone/Documents/work/claude-loom/skills/loom-test/scripts/run.sh)",
      "Bash(/Users/kokiiphone/Documents/work/claude-loom/skills/loom-test/scripts/run.sh *)",
      "Bash(/Users/kokiiphone/Documents/work/claude-loom/skills/loom-status/scripts/status.sh)"
```

JSON 構文確認：
```bash
jq empty .claude/settings.json
```

- [ ] **Step 6: コミット**

```bash
git add install.sh .claude/settings.json
git commit -m "feat(install): symlink skills/loom-*/ dirs + allow bundled script paths"
```

---

## Task 10: install_test.sh で REQ-008 / REQ-009 をカバー

**Files:**
- Modify: `tests/install_test.sh`

- [ ] **Step 1: 既存 install_test.sh を読み込み**

```bash
cat tests/install_test.sh
```

- [ ] **Step 2: REQ-002 ブロックの直後に REQ-008（skills symlink）+ REQ-009（衝突）チェックを追加**

`Edit` tool で、REQ-002 の `else` 分岐の後ろに以下を挿入：

旧（REQ-002 ブロック末尾）:
```bash
if ! find "$CLAUDE_HOME/commands" -name "loom-*.md" -type l | grep -q .; then
  echo "FAIL: REQ-002: ~/.claude/commands/loom-*.md symlink が見つからない"
  exit 1
else
  echo "PASS: REQ-002: commands symlinks present"
fi
```

新（同ブロックの後ろに REQ-008 を追加）:
```bash
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
```

- [ ] **Step 3: REQ-009（通常ディレクトリ衝突）テストを既存 REQ-004 ブロックの直後に追加**

REQ-004 の末尾（`echo "PASS: REQ-004: 通常ファイル衝突を検出してエラー終了"` または SKIP の `fi` の直後）に：

```bash

# ----- REQ-009: skills/ collision with regular directory -----
some_skill_link=$(find "$CLAUDE_HOME/skills" -mindepth 1 -maxdepth 1 -name "loom-*" -type l | head -1)
if [ -n "$some_skill_link" ]; then
  rm "$some_skill_link"
  mkdir "$some_skill_link"
  echo "blocking" > "$some_skill_link/SKILL.md"

  if bash "$ROOT_DIR/install.sh" 2>/dev/null; then
    echo "FAIL: REQ-009: 通常ディレクトリ衝突時に install.sh がエラー終了しなかった"
    exit 1
  fi
  echo "PASS: REQ-009: 通常ディレクトリ衝突を検出してエラー終了"

  rm -rf "$some_skill_link"
else
  echo "SKIP: REQ-009: skills/loom-*/ symlink が無いため衝突テストを実行できず（Tasks 5-8 完了後に有効化）"
fi
```

- [ ] **Step 4: テスト実行 → 全 PASS（GREEN）**

```bash
./tests/run_tests.sh install
./tests/run_tests.sh
```

期待：install で REQ-001..009 全 PASS、全体で 4 PASS（agents + commands + install + skills）。

- [ ] **Step 5: コミット**

```bash
git add tests/install_test.sh
git commit -m "test(install): cover REQ-008 (skills symlink) + REQ-009 (skills dir collision)"
```

---

## Task 11: templates/settings.json.template を作成

**Files:**
- Create: `templates/settings.json.template`

- [ ] **Step 1: テンプレ作成**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/templates/settings.json.template`：

```json
{
  "permissions": {
    "allow": [
      "Bash(./tests/run_tests.sh *)",
      "Bash(bash -n *)",
      "Bash(PLACEHOLDER_CLAUDE_LOOM_INSTALL_PATH/skills/loom-test/scripts/run.sh)",
      "Bash(PLACEHOLDER_CLAUDE_LOOM_INSTALL_PATH/skills/loom-test/scripts/run.sh *)",
      "Bash(PLACEHOLDER_CLAUDE_LOOM_INSTALL_PATH/skills/loom-status/scripts/status.sh)"
    ]
  }
}
```

- [ ] **Step 2: JSON 検証**

```bash
jq empty templates/settings.json.template
```

- [ ] **Step 3: コミット**

```bash
git add templates/settings.json.template
git commit -m "feat(templates): settings.json.template seeds bundled-skill allowlist for new projects"
```

> **Note**: `PLACEHOLDER_CLAUDE_LOOM_INSTALL_PATH` は PM agent が adopt/init フローで実際の install パスに置換する。M0.5 では template 配置のみ、置換ロジックは M1 daemon（または `loom-pm` agent の機能拡張）で対応する想定。

---

## Task 12: README.md + CLAUDE.md に skills 言及追加

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: README.md の使い方セクションに skills 段落を追加**

`Edit` tool で `README.md` の `## 使い方（M0）` セクションの **後ろ** に新セクションを挿入：

```markdown
## 利用可能な skill（M0.5）

`./install.sh` 実行で以下の skill が `~/.claude/skills/` に配置される：

- **loom-test** — ハーネステスト一括実行 + 構造化サマリ（bundled bash script）
- **loom-status** — repo + harness 状態スナップショット（bundled bash script）
- **loom-tdd-cycle** — TDD 規律ガイド（loom-developer 中核ワークフロー）
- **loom-review-trio** — 3 reviewer 並列 dispatch のプロンプトテンプレ

bundled script はインストール後 `templates/settings.json.template` を参考に各プロジェクトの `.claude/settings.json` allowlist に追加することで、承認プロンプトなしで利用可能。

```

- [ ] **Step 2: CLAUDE.md にも skills/ ディレクトリ説明を更新**

`Edit` tool で `CLAUDE.md` の「ファイル配置規約」セクション内：

旧：
```
- skills/ : Claude Code skill (Phase 2 以降)
```

新：
```
- skills/ : Claude Code skill (M0.5 から有効)
```

- [ ] **Step 3: コミット**

```bash
git add README.md CLAUDE.md
git commit -m "docs(m0.5): document 4 shipped skills + update CLAUDE.md skills/ phase note"
```

---

## Task 13: スモークテスト + tag m0.5-complete

**Files:**
- 検証のみ + tag

- [ ] **Step 1: 全テストを最終確認**

```bash
./tests/run_tests.sh
```

期待：4 PASS（agents + commands + install + skills）、Failed: 0。

- [ ] **Step 2: 実環境 install 再実行（idempotency 確認）**

```bash
./install.sh
```

期待：「replacing existing symlink」が agent 5 + command 3 + skill 4 = 12 行出る。エラーなし。

- [ ] **Step 3: 配置確認**

```bash
ls -la ~/.claude/agents/loom-*.md
ls -la ~/.claude/commands/loom-*.md
ls -la ~/.claude/skills/ | grep loom-
```

期待：
- agents/ : 5 symlink
- commands/ : 3 symlink
- skills/ : 4 symlink (loom-test, loom-status, loom-tdd-cycle, loom-review-trio)

- [ ] **Step 4: skill 動作確認（self-host）**

```bash
./skills/loom-test/scripts/run.sh
./skills/loom-status/scripts/status.sh
```

期待：両 script が正常 exit、想定の出力。

- [ ] **Step 5: PLAN.md の M0.5 タスクを done にマーク**

`Edit` で PLAN.md の M0.5 セクション内 13 行を `- [ ] ... status: todo` から `- [x] ... status: done` に置換（Task 1-13 全部）。

- [ ] **Step 6: 最終コミット + tag**

```bash
git add PLAN.md
git commit -m "docs(plan): mark M0.5 tasks done"
git tag -a m0.5-complete -m "M0.5: 4 approval-reduction skills shipped + install.sh extended."
git tag --list
git log --oneline | head -20
```

期待：`m0.5-complete` tag 作成、log の先頭に M0.5 関連コミットが並ぶ。

- [ ] **Step 7: ユーザー manual verification の指示**

別 Claude Code session で：
1. `cd /Users/kokiiphone/Documents/work/claude-loom && claude`
2. Claude Code 内で `loom-test` skill が活性化することを確認（"run loom tests" 系の発話で activate するはず）
3. `loom-status` skill も同様
4. 承認プロンプトの有無：bundled script が allowlist 通り無承認で走るか確認

---

## M0.5 完成基準（受入要件）

すべて満たせば M0.5 完了：

- [ ] `tests/run_tests.sh` が 4 PASS（agents + commands + install + skills）
- [ ] `./install.sh` で `~/.claude/skills/loom-{test,status,tdd-cycle,review-trio}/` の 4 ディレクトリ symlink が設置
- [ ] REQ-008..REQ-011 が install_test と skills_test でカバー
- [ ] `skills/loom-test/scripts/run.sh` が project root を自動探索して run_tests.sh を呼び、構造化サマリを返す
- [ ] `skills/loom-status/scripts/status.sh` が repo + 配置状況を返す
- [ ] `skills/loom-tdd-cycle/SKILL.md` と `skills/loom-review-trio/SKILL.md` が存在し frontmatter valid
- [ ] `templates/settings.json.template` が JSON valid
- [ ] SPEC §3.6.1 + §9.1 が更新されている
- [ ] PLAN.md の M0.5 セクションが完成（全タスク `[x]` `done`）
- [ ] README.md と CLAUDE.md に skills 言及あり
- [ ] `git tag` に `m0.5-complete` がある

## 次のステップ

M0.5 完成後、M1（Daemon + Hooks Foundation）の詳細プランを `writing-plans` skill で生成する。M1 から先は M0 + M0.5 のハーネスを使った dogfood 実装（PM 主導、loom-developer + 3 reviewer 並列）が本番運用となる。
