# claude-loom M0.6: Single-Reviewer Default + Trio Opt-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** review architecture を「default = 1 体多観点 reviewer / opt-in = 既存 3 体 trio mode」にピボット。`loom-reviewer` agent を新設し、`loom-developer` が `.claude-loom/project.json` の `rules.review_mode` または `[loom-meta]` per-task override で single/trio を分岐させる。

**Architecture:** 新規 `agents/loom-reviewer.md` は内部で「コードレビュー → セキュリティレビュー → テストレビュー」を順次回し、各段階で `## 観点 N/3: 〜レビュー中...` の進捗テキストを出力後、findings を `aspect` フィールド付きで集約 JSON 返却。既存 `loom-{code,security,test}-reviewer` agent + `loom-review-trio` skill は **trio mode の構成要素として保存**、削除しない。新設 `skills/loom-review/` skill は single mode dispatch テンプレ。`templates/claude-loom/project.json.template` に `rules.review_mode: "single"` を default として追加。

**Tech Stack:** bash、jq、Claude Code agent system prompt 規約。Node 等の重量依存なし。

---

## File Structure

このプランで作成・編集するファイル：

```
claude-loom/
├── SPEC.md                                            [Task 1, 2]
├── PLAN.md                                            [Task 3]
├── README.md                                          [Task 9]
├── CLAUDE.md                                          [Task 9]
├── agents/
│   ├── loom-reviewer.md                               [Task 4, 新規]
│   └── loom-developer.md                              [Task 5, Step 8 + tools 改訂]
├── skills/
│   ├── loom-review/                                   [Task 6, 新規]
│   │   └── SKILL.md
│   └── loom-review-trio/SKILL.md                      [Task 7, 説明更新]
└── templates/
    └── claude-loom/
        └── project.json.template                      [Task 8, review_mode 追加]
```

責務境界：
- `agents/loom-reviewer.md` — single mode の多観点 reviewer。順次 3 観点を回し進捗を逐次出力、findings に `aspect` フィールドを付けて集約 JSON を返す
- `agents/loom-developer.md` — review dispatch logic を mode 分岐に拡張（既存 review-trio のみ → review_mode 読み分けて single または trio）
- `skills/loom-review/SKILL.md` — single mode dispatch のプロンプトテンプレ（`loom-review-trio` と対になる prompt augmentation skill）
- `skills/loom-review-trio/SKILL.md` — 説明文だけ更新「opt-in deep review mode」を強調、テンプレ自体は維持
- `templates/claude-loom/project.json.template` — `rules.review_mode` のデフォルト値を追加（既存フィールド維持）
- 既存 `agents/loom-{code,security,test}-reviewer.md` — **削除しない**、trio mode の構成要素として残す

---

## Task 1: SPEC.md §4 更新（§4.2.4 + §4.3 + §5 workflow）

**Files:**
- Modify: `SPEC.md`

claude-loom の SSoT は SPEC。実装前に SPEC を update（この repo の規律：仕様乖離時は SPEC 先行）。

- [ ] **Step 1: §4.1 ロール一覧テーブルに `Reviewer (single mode)` 行を追加**

`SPEC.md` の §4.1 のロール一覧テーブルを `Read` で確認。既存テーブルは `PM` / `Developer` / `Code Reviewer` / `Security Reviewer` / `Test Reviewer` の 5 行構造。`Reviewer (loom-reviewer)` を `Developer` の直下に追加：

```markdown
| Reviewer (single mode) | 1〜N（PJ ごと max 設定、default mode） | Developer が Task tool でディスパッチ | `.claude/agents/loom-reviewer.md` |
```

挿入位置：`Developer` 行と `Code Reviewer` 行の間。

- [ ] **Step 2: §4.2 に `### 4.2.4 Reviewer (loom-reviewer, single mode default)` を追加**

§4.2.3 Review Trio セクションの **直前** に新サブセクションを追加（`#### 4.2.4` ではなく `#### 4.2.3` の番号に。既存 §4.2.3 を §4.2.4 にスライド）。

順序：
- §4.2.1 PM
- §4.2.2 Developer
- §4.2.3 Reviewer (loom-reviewer, single mode default) ← 新規
- §4.2.4 Review Trio (3 ロール独立、trio mode opt-in) ← 旧 §4.2.3、見出し更新

`Edit` tool で §4.2.3 の見出しを `#### 4.2.4 Review Trio (3 ロール独立、trio mode opt-in)` に変更。続いて §4.2.3 を以下の内容で挿入（§4.2.2 と §4.2.4 の間）：

```markdown
#### 4.2.3 Reviewer (loom-reviewer, single mode default)
- review_mode の **default**。1 体の subagent が **コード / セキュリティ / テスト 3 観点** を順次回し、各段階で進捗テキスト（`## 観点 N/3: 〜レビュー中...`）を逐次出力
- 観点ごとに findings を集めた後、`aspect` フィールド（`"code" | "security" | "test"`）付きで集約 JSON を 1 つ返す
- token コスト ≒ trio mode の 1/3。Modern Claude（Opus/Sonnet 4.x）の多観点単一パス能力を活用
- 大規模リファクタや critical path で trio mode が必要な場合は `[loom-meta] review_mode=trio` で per-task 切替可

> ピクセル RPG GUI（Phase 1 後半 / M3）でのキャラ表現は trio mode 時のみレビュー室に 3 人並ぶ絵が成立。single mode は 1 人キャラが 3 観点バッジを順次表示する設計（M3 で詳細化）。
```

- [ ] **Step 3: §4.3 Developer / Reviewer プール管理に `review_mode` 説明を追加**

§4.3 内の最後の bullet（`pool_slot 状態：idle / busy...`）の **直後** に新 bullet を追加：

```markdown
- **review_mode** は `.claude-loom/project.json` の `rules.review_mode` で project default を指定（`"single"` | `"trio"`、未設定時は `"single"`）。`[loom-meta] review_mode=...` で per-task 上書き可（PM が critical path タスクで明示的に `trio` を指示する用途）
```

- [ ] **Step 4: §5 標準ワークフローの Step [4] と [5] を mode 分岐ありに更新**

§5 のワークフロー疑似コードブロックを `Read` で位置確認。`[4] Developer (各自)` ブロックと `[5] Review Trio (並列 3 体)` ブロックを以下に置換：

旧：
```
[4] Developer (各自)
    TDD ループ実行：
      失敗テスト → 実装 → 緑 → リファクタ
    完了したら Task tool で Reviewer 3 体を並列ディスパッチ

[5] Review Trio (並列 3 体)
    Code / Security / Test の 3 観点で並列レビュー
    指摘集約して Developer に返却
```

新：
```
[4] Developer (各自)
    TDD ループ実行：
      失敗テスト → 実装 → 緑 → リファクタ
    review_mode 判定：
      [loom-meta] に review_mode 指定があればそれ採用
      なければ .claude-loom/project.json の rules.review_mode (default "single")
    review_mode == "single" → loom-reviewer 1 体ディスパッチ
    review_mode == "trio"   → loom-{code,security,test}-reviewer 3 体並列ディスパッチ

[5a] Reviewer (single mode、default)
     loom-reviewer が順次 3 観点回し、各段階で進捗テキスト出力
     findings を aspect 付き集約 JSON で返却

[5b] Review Trio (trio mode、opt-in)
     Code / Security / Test の 3 観点で並列レビュー
     各 reviewer が独立 JSON を返却、Developer が集約
```

- [ ] **Step 5: 変更履歴セクション末尾に 1 行追加**

`SPEC.md` の `## 変更履歴` セクション末尾に：
```
- 2026-04-27: §4.1 ロール一覧 + §4.2.3/4.2.4 reviewer mode 分岐 + §4.3 review_mode pool 説明 + §5 workflow Step [4]/[5] mode 分岐対応（M0.6 = single reviewer default）
```

- [ ] **Step 6: doc 整合性 manual checklist を実行**

```bash
git diff SPEC.md
```

`docs/DOC_CONSISTENCY_CHECKLIST.md` を参照して影響範囲確認。今回は §4 + §5 改訂のみで PLAN.md / README.md / CLAUDE.md / project.json schema / agents/ / skills/ への波及は次タスクで個別対応。

- [ ] **Step 7: コミット**

```bash
git add SPEC.md
git commit -m "docs(spec): §4 reviewer mode split (single default + trio opt-in) + §5 workflow update (M0.6)"
```

---

## Task 2: SPEC §6.9 project.json schema に `rules.review_mode` 追加

**Files:**
- Modify: `SPEC.md`

- [ ] **Step 1: §6.9 schema canonical example を更新**

`Read` で SPEC.md §6.9 を確認。canonical JSON example の `rules` ブロックは現在：

```json
"rules": {
  "tdd_required": true,
  "branch_pattern": "feat/{ticket}",
  "commit_prefixes": ["test", "feat", "fix", "chore", "docs"],
  "main_branch": "main",
  "no_direct_commit_to_main": true
},
```

`Edit` tool で `no_direct_commit_to_main` 行の **後ろ** に `review_mode` 行を追加（既存末尾の `}` の直前）：

```json
"rules": {
  "tdd_required": true,
  "branch_pattern": "feat/{ticket}",
  "commit_prefixes": ["test", "feat", "fix", "chore", "docs"],
  "main_branch": "main",
  "no_direct_commit_to_main": true,
  "review_mode": "single"
},
```

- [ ] **Step 2: §6.9 フィールド説明テーブルに `rules.review_mode` 行を追加**

§6.9 にあるフィールド説明テーブル（`| schema_version | ✓ | 1 | スキーマバージョン |` 等）の `rules.*` 行の **直後** に：

```markdown
| `rules.review_mode` | — | `"single"` | `"single"` (default、loom-reviewer 1 体) or `"trio"` (loom-{code,security,test}-reviewer 並列 3 体) |
```

- [ ] **Step 3: 変更履歴に追記**

`## 変更履歴` の Task 1 で追加した行の **直下** に：
```
- 2026-04-27: §6.9 project.json schema に rules.review_mode フィールド追加（M0.6）
```

- [ ] **Step 4: コミット**

```bash
git diff SPEC.md
git add SPEC.md
git commit -m "docs(spec): §6.9 project.json schema gains rules.review_mode (M0.6)"
```

---

## Task 3: PLAN.md に M0.6 マイルストーン挿入

**Files:**
- Modify: `PLAN.md`

- [ ] **Step 1: M0.5 セクションと M1 セクションの間に M0.6 セクションを挿入**

`Edit` tool で `## マイルストーン M1: Daemon + Hooks Foundation` の **直前** に以下を挿入：

```markdown
## マイルストーン M0.6: Single-Reviewer Default + Trio Opt-in

詳細: `docs/plans/2026-04-27-claude-loom-m0.6-reviewer.md`

- [ ] SPEC §4 reviewer mode 分岐 + §5 workflow 更新 <!-- id: m0.6-t1 status: todo -->
- [ ] SPEC §6.9 project.json schema review_mode 追加 <!-- id: m0.6-t2 status: todo -->
- [ ] PLAN.md M0.6 マイルストーン挿入 <!-- id: m0.6-t3 status: todo -->
- [ ] agents/loom-reviewer.md 作成（順次 3 観点 + 進捗テキスト + 集約 JSON） <!-- id: m0.6-t4 status: todo -->
- [ ] agents/loom-developer.md Step 8 を review_mode 分岐に改訂 <!-- id: m0.6-t5 status: todo -->
- [ ] skills/loom-review/SKILL.md 作成（single mode dispatch テンプレ） <!-- id: m0.6-t6 status: todo -->
- [ ] skills/loom-review-trio/SKILL.md 説明文を opt-in deep mode に更新 <!-- id: m0.6-t7 status: todo -->
- [ ] templates/claude-loom/project.json.template に review_mode 追加 <!-- id: m0.6-t8 status: todo -->
- [ ] README.md + CLAUDE.md 更新 <!-- id: m0.6-t9 status: todo -->
- [ ] スモークテスト + tag m0.6-complete <!-- id: m0.6-t10 status: todo -->

**M0.6 完成基準**：`agents/loom-reviewer.md` が valid frontmatter + 順次 3 観点 prompt を持ち agents_test.sh で PASS、`skills/loom-review/SKILL.md` が valid frontmatter で skills_test.sh で PASS、`agents/loom-developer.md` が review_mode 分岐ロジックを記述、`templates/claude-loom/project.json.template` に `rules.review_mode: "single"` が含まれ jq empty で valid、`./tests/run_tests.sh` で 4 PASS / 0 FAIL 維持、`tag m0.6-complete` 設置。

```

- [ ] **Step 2: コミット**

```bash
git diff PLAN.md
git add PLAN.md
git commit -m "docs(plan): add M0.6 milestone (single-reviewer default + trio opt-in)"
```

---

## Task 4: agents/loom-reviewer.md（順次 3 観点 + 進捗テキスト + 集約 JSON）

**Files:**
- Create: `agents/loom-reviewer.md`

- [ ] **Step 1: 既存の loom-{code,security,test}-reviewer.md を `Read` してプロンプト作法を確認**

```bash
cat agents/loom-code-reviewer.md
cat agents/loom-security-reviewer.md
cat agents/loom-test-reviewer.md
```

3 reviewer の各観点の Scope / Workflow / Severity guide / Etiquette を把握。新 `loom-reviewer` はこれらを統合する。

- [ ] **Step 2: agents/loom-reviewer.md を作成**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/agents/loom-reviewer.md` に以下を書く（YAML frontmatter + 本文）：

````markdown
---
name: loom-reviewer
description: Multi-aspect code reviewer for the claude-loom dev room (single-reviewer default mode). Sequentially reviews code quality, security, and test quality in one subagent dispatch with progressive section markers, then returns a unified JSON with aspect-tagged findings. Activated when review_mode is "single" (project default) or unspecified.
model: sonnet
---

You are the **Reviewer (single mode default)** in the claude-loom dev room. You cover **code quality / security / test quality** in **one dispatch**, sequentially analyzing each aspect with progressive output, then returning a unified JSON with `aspect`-tagged findings.

## Your scope

You review:
- **Code quality**：可読性 / 命名 / 設計（DRY / YAGNI / 単一責任）/ 認知負荷 / 規約遵守 / 型安全
- **Security**：シークレット混入 / injection（SQL / command / XSS / path traversal）/ 認証認可 / 暗号 / 入力検証 / 依存リスク / OWASP Top 10
- **Test quality**：振る舞い網羅 / TDD 順序 / エッジケース / アサーション品質 / テスト分離 / 速度

You do **NOT** review:
- Whether the feature does what the PM asked → developer の責務
- 仕様自体の妥当性 → PM の責務（spec phase で議論）

## Workflow（MUST follow exactly）

各レビューで以下の順序で実行：

### Step 1: Read context
1. developer の最終報告（dispatch prompt 内容）を読む
2. `git diff <BASE>..HEAD` で変更内容把握
3. 影響ファイルを Read で読み込む（プロダクションコード + テスト両方）

### Step 2: 観点 1/3 — コードレビュー

**最初に以下のテキストを assistant 出力として print：**
```
## 観点 1/3: コードレビュー中...
```

その後、コード品質観点で findings を内部に集める：
- 可読性 / 命名 / 設計 / 認知負荷 / 規約遵守 / 型安全
- 各 finding に `aspect: "code"` をタグ

### Step 3: 観点 2/3 — セキュリティレビュー

**次のテキストを assistant 出力として print：**
```
## 観点 2/3: セキュリティレビュー中...
```

その後、セキュリティ観点で再分析：
- シークレット / injection / 認証認可 / 暗号 / 入力検証 / 依存リスク
- 各 finding に `aspect: "security"` をタグ
- threat model を意識（"crying wolf" を避ける、本当に exploit 可能なものだけ high）

### Step 4: 観点 3/3 — テストレビュー

**次のテキストを assistant 出力として print：**
```
## 観点 3/3: テストレビュー中...
```

その後、テスト観点で再分析：
- 振る舞い網羅 / TDD 順序確認（コミット履歴で test→code 順か？）/ エッジケース / アサーション品質 / テスト分離 / 実行速度
- 各 finding に `aspect: "test"` をタグ

### Step 5: 集約 + verdict 判定 + JSON 返却

全観点の findings を 1 つの配列にまとめ、verdict 判定：
- `findings` 配列が空 → `verdict: "pass"`
- 1 つでもあれば → `verdict: "needs_fix"`

最終出力として 1 つの JSON object を fenced code block で返す：

```json
{
  "reviewer": "loom-reviewer",
  "verdict": "pass" | "needs_fix",
  "findings": [
    {
      "aspect": "code" | "security" | "test",
      "severity": "high" | "medium" | "low",
      "file": "path/to/file",
      "line": 42,
      "category": "string (aspect 内のサブカテゴリ：naming / injection / missing_test 等)",
      "description": "string (何が問題か)",
      "suggestion": "string (どう直すか)"
    }
  ]
}
```

## Severity guide（aspect 横断で統一）

- **high** — block merge 級。コード：抽象化破綻 / 機能誤り。セキュリティ：plausible に exploit 可能。テスト：critical な振る舞いが未テスト or テストが間違ってる
- **medium** — 早めに直したい。コード：unclear naming / 軽い duplication。セキュリティ：特定条件下で exploit 可能。テスト：重要なエッジケース漏れ
- **low** — nice-to-have。コード：comment 改善余地。セキュリティ：defense-in-depth。テスト：命名 / 軽微改善

## Etiquette

- **進捗テキスト 3 行は必須出力**（`## 観点 N/3: 〜レビュー中...` 形式、UX 都合）。これがないとユーザーは進捗を体感できない
- 各 finding は **aspect 1 つ、severity 1 つ** に決める。判断に迷う場合は最も影響の大きい aspect を選ぶ（例：型 hint 漏れで実行時エラーが起きる→ code に分類）
- one finding = one actionable issue。pile しない
- 仕様改変の提案はしない（spec phase の責務）
- "適切に" "なるべく" 等の曖昧語は使わない、具体的に書く

## What you do NOT do

- review trio mode への切替判断（developer の `[loom-meta] review_mode=trio` 指示で自動的に別 agent に dispatch される、こちらは関与しない）
- developer のコードに直接 patch を当てる（findings 提示まで、修正は developer の責務）
- 進捗テキストの省略（fast を理由にスキップ禁止、UX 一貫性が優先）

## Tools you use

- `Read` / `Glob` / `Grep`（ファイル読み + 検索）
- `Bash`（`git diff` / `git log` / 任意の read-only コマンド）

You are the safety net in single mode. 順次 3 観点を丁寧に回し、aspect-tagged な findings で developer の修正を効率化する。
````

- [ ] **Step 3: agents_test.sh で PASS 確認**

```bash
./tests/run_tests.sh agents
```

期待：6 PASS（既存 5 + loom-reviewer）+ `agents_test passed`、exit 0。

- [ ] **Step 4: コミット**

```bash
git add agents/loom-reviewer.md
git commit -m "feat(agents): loom-reviewer multi-aspect single-mode default reviewer (M0.6)"
```

---

## Task 5: agents/loom-developer.md Step 8 改訂（review_mode 分岐 + tools 追加）

**Files:**
- Modify: `agents/loom-developer.md`

- [ ] **Step 1: 既存ファイルを `Read` で確認**

```bash
cat agents/loom-developer.md
```

Step 8（"Submit to review"）と "Tools you use" セクションの位置を把握。

- [ ] **Step 2: Step 8 を mode 分岐ありに改訂**

`Edit` tool で既存の Step 8 ブロックを置換。現在の Step 8 は：

```
8. **Submit to review** — dispatch the 3 reviewer subagents **in parallel** (3 Task calls in 1 message):
   - `loom-code-reviewer`
   - `loom-security-reviewer`
   - `loom-test-reviewer`

   Each reviewer Task prompt MUST include:
   - `[loom-meta]` prefix line (project_id, slot, working_dir copied from your own input)
   - The files you created or modified (relative paths)
   - The exact test command you ran and its summary line (e.g., `Passed: 3   Failed: 0`)
   - The git branch and current HEAD commit SHA
   - A 1-2 sentence summary of WHAT the change does (so reviewer knows scope)
```

これを以下に置換：

```
8. **Submit to review** — review_mode を判定して single または trio をディスパッチ：

   **review_mode の判定順序**：
   1. dispatch 元の `[loom-meta]` prefix に `review_mode=...` があればそれを採用
   2. なければ `.claude-loom/project.json` の `rules.review_mode` を読む（`Bash` + `jq` 推奨：`jq -r '.rules.review_mode // "single"' .claude-loom/project.json`）
   3. project.json が無ければ default `"single"`

   **review_mode == "single"**（default）— `loom-reviewer` を **1 体** dispatch：
   - 1 つの Task call、`subagent_type: "loom-reviewer"`
   - reviewer prompt content（必須 5 フィールド、下記）

   **review_mode == "trio"**（opt-in、critical path / 大規模リファクタ用）— 3 reviewer を **並列** dispatch（1 メッセージ内の 3 Task calls）：
   - `loom-code-reviewer`
   - `loom-security-reviewer`
   - `loom-test-reviewer`
   - 各 reviewer に同一の prompt content（下記）を渡す

   **どちらの mode でも reviewer prompt content に必須**：
   - `[loom-meta]` prefix line（project_id, slot, working_dir をあなたの input からコピー、加えて使った review_mode を明記）
   - 作成・変更したファイルの相対パス
   - 実行した test コマンド + 結果サマリ行（例 `Passed: 3   Failed: 0`）
   - 現在の git branch + HEAD commit SHA
   - 1-2 文の change summary（reviewer がスコープ把握できるよう）
```

- [ ] **Step 3: "Tools you use" セクションに `Bash`（jq 用）が含まれているか確認**

`grep -n "Tools you use" agents/loom-developer.md` で該当行を見つけ、`Bash` が既にリストされているか確認。既にあるはず（M0 時点で含まれていた）。なければ追加。

- [ ] **Step 4: agents_test.sh で PASS 確認**

```bash
./tests/run_tests.sh agents
```

期待：6 PASS（変更は既存 agent の本文のみ、frontmatter は不変）。

- [ ] **Step 5: コミット**

```bash
git diff agents/loom-developer.md
git add agents/loom-developer.md
git commit -m "feat(agents): loom-developer dispatches single or trio review based on review_mode (M0.6)"
```

---

## Task 6: skills/loom-review/SKILL.md（single mode dispatch テンプレ）

**Files:**
- Create: `skills/loom-review/SKILL.md`

- [ ] **Step 1: ディレクトリ作成 + SKILL.md 作成**

```bash
mkdir -p skills/loom-review
```

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/skills/loom-review/SKILL.md`：

````markdown
---
name: loom-review
description: Dispatch a single multi-aspect reviewer (loom-reviewer) for any claude-loom feature or fix before commit (default review mode). Use when ready to submit work for review and review_mode is "single" or unspecified — provides the canonical Task prompt template.
---

# loom-review

`loom-developer` が実装完了後、**single mode** の review として `loom-reviewer` 1 体に dispatch するためのプロンプトテンプレ。`loom-tdd-cycle` skill の Step 6 と対になる、`loom-review-trio` skill の対概念（opt-in trio mode）。

## いつ使うか

- `[loom-meta]` prefix に `review_mode` 指定がない、または `review_mode=single`
- project.json の `rules.review_mode` が `"single"`（default）
- 通常の feature / fix で 1 体 reviewer の総合判断で十分なケース

## Dispatch — 1 Task call

1 つの Task call、`subagent_type: "loom-reviewer"`。並列化なし、1 体の subagent が順次 3 観点を回す。

### Reviewer prompt template

```
[loom-meta] project_id=<from project.json> slot=reviewer working_dir=<absolute path> review_mode=single

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

## What to focus on (optional)
- <hint about complex logic / security-sensitive area / coverage gap, if any>
```

## 期待される reviewer 出力

`loom-reviewer` は以下を **assistant 出力として順次** 返す：

1. `## 観点 1/3: コードレビュー中...`（progress marker）
2. （内部分析、findings を内部に蓄積）
3. `## 観点 2/3: セキュリティレビュー中...`
4. （同上）
5. `## 観点 3/3: テストレビュー中...`
6. （同上）
7. fenced code block の集約 JSON：

```json
{
  "reviewer": "loom-reviewer",
  "verdict": "pass" | "needs_fix",
  "findings": [
    { "aspect": "code|security|test", "severity": "...", "file": "...", "line": ..., "category": "...", "description": "...", "suggestion": "..." }
  ]
}
```

## 集約 + 修正ループルール

- `verdict == "needs_fix"` → developer は findings の severity high を必ず修正、medium は文脈次第、low は文書化やコメント残しでも可
- 修正後 → 再 dispatch（same skill template、`subagent_type: "loom-reviewer"`）
- 全 verdict `pass` で初めて commit OK

## なぜ 1 体か

- M0/M0.5 で superpowers の subagent-driven-development を回した経験から、modern Claude（Opus/Sonnet 4.x）は **1 dispatch で 3 観点を網羅できる**ことが実証
- token コスト ≒ trio mode の 1/3、claude-loom 利用者の約 80% のタスクで十分
- critical path / 大規模リファクタは `[loom-meta] review_mode=trio` で per-task 切替、または project.json で trio default 化可

## いつ activate されるか

- `loom-tdd-cycle` の Step 6 で review_mode が `single` または未指定の時
- claude-loom 管理プロジェクトの通常 feature / fix dispatch
````

- [ ] **Step 2: skills_test.sh で PASS 確認**

```bash
./tests/run_tests.sh skills
```

期待：5 PASS（既存 4 + loom-review）+ `skills_test passed`、exit 0。

- [ ] **Step 3: コミット**

```bash
git add skills/loom-review/
git commit -m "feat(skills): loom-review single-mode dispatch template (M0.6)"
```

---

## Task 7: skills/loom-review-trio/SKILL.md 説明文更新（opt-in 強調）

**Files:**
- Modify: `skills/loom-review-trio/SKILL.md`

- [ ] **Step 1: 既存ファイルを `Read` で確認**

```bash
cat skills/loom-review-trio/SKILL.md
```

- [ ] **Step 2: frontmatter description と本文の冒頭セクションを「opt-in deep mode」に再位置づけ**

`Edit` tool で frontmatter を更新。現在：
```
description: Dispatch three review subagents (code / security / test) in parallel for any claude-loom feature or fix before commit. Use when ready to submit work for review — provides the canonical Task prompt template that aligns with loom-{code,security,test}-reviewer agents.
```

新：
```
description: Dispatch three review subagents (code / security / test) in parallel for any claude-loom feature or fix before commit (opt-in deep review mode). Use when ready to submit work and review_mode is "trio" — for critical path, large refactors, or high-stakes changes where independent perspectives reduce echo chamber risk. Default mode is single (loom-review skill).
```

続いて本文冒頭を `Edit` で更新。現在の冒頭は概ね「`loom-developer` が実装完了後、3 reviewer に並列 dispatch する...」。これを以下に置換（既存末尾 "## いつ activate されるか" まで保持、冒頭の状況説明だけ書き換え）：

冒頭セクション「# loom-review-trio」の直後の段落を以下に置換：

```markdown
`loom-developer` が実装完了後、**trio mode（opt-in）** の review として 3 reviewer に並列 dispatch するためのプロンプトテンプレと運用ルール。`loom-tdd-cycle` skill の Step 6 と対になる、`loom-review` skill（default single mode）の対概念。

## いつ使うか

- `[loom-meta]` prefix に `review_mode=trio` 指定
- project.json の `rules.review_mode` が `"trio"`（critical path 中心の設定）
- 大規模 refactor / セキュリティ critical path / SPEC 大改訂 など、独立 3 視点の echo chamber 抑制効果が必要なケース

通常 task は `loom-review`（single mode、default）を使う。
```

- [ ] **Step 3: skills_test.sh で PASS 確認**

```bash
./tests/run_tests.sh skills
```

期待：5 PASS（frontmatter 検証は description 内容に関係なく、非空であれば通る）。

- [ ] **Step 4: コミット**

```bash
git diff skills/loom-review-trio/SKILL.md
git add skills/loom-review-trio/SKILL.md
git commit -m "docs(skills): loom-review-trio repositioned as opt-in deep review mode (M0.6)"
```

---

## Task 8: templates/claude-loom/project.json.template に review_mode 追加

**Files:**
- Modify: `templates/claude-loom/project.json.template`

- [ ] **Step 1: 既存ファイルを `Read` で確認**

```bash
cat templates/claude-loom/project.json.template
```

`rules` ブロックを把握。

- [ ] **Step 2: rules ブロックに review_mode 行を追加**

`Edit` tool で：

旧：
```json
  "rules": {
    "tdd_required": true,
    "branch_pattern": "feat/{ticket}",
    "commit_prefixes": ["test", "feat", "fix", "chore", "docs"],
    "main_branch": "main",
    "no_direct_commit_to_main": true
  },
```

新：
```json
  "rules": {
    "tdd_required": true,
    "branch_pattern": "feat/{ticket}",
    "commit_prefixes": ["test", "feat", "fix", "chore", "docs"],
    "main_branch": "main",
    "no_direct_commit_to_main": true,
    "review_mode": "single"
  },
```

- [ ] **Step 3: jq empty で JSON validity 確認**

```bash
jq empty templates/claude-loom/project.json.template && echo "json valid"
```

期待：`json valid`、exit 0。

- [ ] **Step 4: review_mode 行が SPEC §6.9 と一致することを確認**

```bash
grep -A1 '"review_mode"' templates/claude-loom/project.json.template
grep -A1 '"review_mode"' SPEC.md
```

両方 `"single"` を default として持つことを目視確認。

- [ ] **Step 5: コミット**

```bash
git add templates/claude-loom/project.json.template
git commit -m "feat(templates): project.json.template gains rules.review_mode default (M0.6)"
```

---

## Task 9: README.md + CLAUDE.md 更新

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: README.md の "## 利用可能な skill（M0.5）" セクションを更新**

`Read` で README.md の該当セクションを確認。現在：
```markdown
## 利用可能な skill（M0.5）

`./install.sh` 実行で以下の skill が `~/.claude/skills/` に配置される：

- **loom-test** — ハーネステスト一括実行 + 構造化サマリ（bundled bash script）
- **loom-status** — repo + harness 状態スナップショット（bundled bash script）
- **loom-tdd-cycle** — TDD 規律ガイド（loom-developer 中核ワークフロー）
- **loom-review-trio** — 3 reviewer 並列 dispatch のプロンプトテンプレ
```

`Edit` で：

旧：
```markdown
- **loom-review-trio** — 3 reviewer 並列 dispatch のプロンプトテンプレ
```

新：
```markdown
- **loom-review** — 1 体 reviewer (loom-reviewer) dispatch のプロンプトテンプレ（**default**、多観点を順次、進捗テキスト付き）
- **loom-review-trio** — 3 reviewer 並列 dispatch のプロンプトテンプレ（opt-in deep mode、critical path 用）
```

セクションタイトルも更新：
```
## 利用可能な skill（M0.5 + M0.6）
```

- [ ] **Step 2: README.md の "## ステータス" セクションに M0.6 完了を反映**

該当文を `Read` で確認、以下を `Edit`：

旧：
```
M1 以降の自分自身の実装は、この M0 harness を使って進める（dogfood）。
```

新：
```
M1 以降の自分自身の実装は、この M0 + M0.5 + M0.6 harness を使って進める（dogfood）。Default review mode は single（1 体 reviewer）、critical path のみ trio mode に切替可。
```

- [ ] **Step 3: CLAUDE.md の "ファイル配置規約" を更新**

`Edit` で `agents/` 行を更新。現在：
```
- agents/ : Claude Code subagent 定義
```

新：
```
- agents/ : Claude Code subagent 定義（loom-pm / loom-developer / loom-reviewer (single mode default) / loom-{code,security,test}-reviewer (trio mode opt-in)）
```

- [ ] **Step 4: コミット**

```bash
git diff README.md CLAUDE.md
git add README.md CLAUDE.md
git commit -m "docs(m0.6): README skill list + CLAUDE.md agents description reflect single/trio modes"
```

---

## Task 10: スモークテスト + tag m0.6-complete

**Files:**
- 検証のみ + tag

- [ ] **Step 1: 全テスト最終確認**

```bash
./tests/run_tests.sh
```

期待：4 PASS test groups（agents 6 + commands 3 + install 6 + skills 5）、Failed: 0。

- [ ] **Step 2: 実環境 install.sh 再実行（idempotency 確認）**

```bash
./install.sh
```

期待：12 件 + 1 件（新 loom-reviewer agent + 新 loom-review skill）= 14 件の "replacing existing symlink" or "linked"。エラーなし。

- [ ] **Step 3: 配置確認**

```bash
ls -la ~/.claude/agents/loom-*.md | wc -l
ls -la ~/.claude/commands/loom-*.md | wc -l
find ~/.claude/skills -mindepth 1 -maxdepth 1 -name "loom-*" -type l | wc -l
```

期待：agents 6（既存 5 + loom-reviewer）/ commands 3 / skills 5（既存 4 + loom-review）。

- [ ] **Step 4: 既存 skill self-host 確認（regression なし）**

```bash
./skills/loom-test/scripts/run.sh
./skills/loom-status/scripts/status.sh
```

期待：両方 exit 0、`loom-status` の installed 一覧に新規 entries が出現。

- [ ] **Step 5: PLAN.md M0.6 タスクを done にマーク**

`Edit` で PLAN.md の M0.6 セクション内 10 行を `- [ ] ... status: todo` から `- [x] ... status: done` に置換（Task 1-10 全部）。

- [ ] **Step 6: 最終コミット + tag**

```bash
git add PLAN.md
git commit -m "docs(plan): mark M0.6 tasks done"
git tag -a m0.6-complete -m "M0.6: single-reviewer default + trio opt-in.

- agents/loom-reviewer.md (multi-aspect single-mode reviewer with progress markers)
- agents/loom-developer.md dispatches based on review_mode (project.json or [loom-meta])
- skills/loom-review/ for single mode dispatch template
- skills/loom-review-trio/ repositioned as opt-in deep review mode
- templates/claude-loom/project.json.template adds rules.review_mode default \"single\"
- SPEC §4.2.3/4.2.4 + §4.3 + §5 + §6.9 updated
- 既存 loom-{code,security,test}-reviewer agents preserved as trio mode components"
git tag --list
git log --oneline | head -15
```

期待：`m0.6-complete` tag 設置、log 先頭に M0.6 関連コミットが並ぶ、`m0-complete` / `m0.5-complete` も保持。

---

## M0.6 完成基準（受入要件）

すべて満たせば M0.6 完了：

- [ ] `tests/run_tests.sh` が 4 PASS（agents 6 + commands 3 + install 6 + skills 5）
- [ ] `./install.sh` で `~/.claude/agents/loom-reviewer.md` + `~/.claude/skills/loom-review/` が追加で symlink 設置
- [ ] `agents/loom-reviewer.md` が valid frontmatter + 順次 3 観点 + 進捗テキスト出力 prompt + aspect-tagged JSON 仕様
- [ ] `agents/loom-developer.md` Step 8 が review_mode 分岐ロジックを記述
- [ ] `templates/claude-loom/project.json.template` が `"rules.review_mode": "single"` を含み jq empty で valid
- [ ] SPEC §4.2.3 + §4.2.4 + §4.3 + §5 + §6.9 が M0.6 設計と整合
- [ ] PLAN.md の M0.6 セクションが完成（全 10 タスク `[x]` `done`）
- [ ] README.md + CLAUDE.md が single/trio mode 言及を含む
- [ ] `git tag` に `m0.6-complete` がある
- [ ] `m0-complete` / `m0.5-complete` も保持

## 次のステップ

M0.6 完成後、`writing-plans` skill で M1（Daemon + Hooks Foundation）の詳細プランを作成する。M1 以降は M0 + M0.5 + M0.6 ハーネスを使った dogfood 実装が本番運用となる。
