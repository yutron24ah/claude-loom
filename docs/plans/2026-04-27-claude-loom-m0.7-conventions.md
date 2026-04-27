# claude-loom M0.7: Conventional Commits + GitHub Flow Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** claude-loom の commit / branch 規約を **Conventional Commits（11 types）+ GitHub Flow** に明示的に整合させ、`docs/COMMIT_GUIDE.md` で詳細ルール + good/bad 例を提供する。SPEC §6.9 に `branch_types` と `commit_language` フィールド追加、`commit_prefixes` を 11 種に拡張。

**Architecture:** SPEC + CLAUDE.md + README.md + project.json template の policy 部分を更新するドキュメント中心の milestone。新規 `docs/COMMIT_GUIDE.md` がコミット作法の SSoT。`tests/conventions_test.sh` を新設して `commit_prefixes` / `branch_types` / `COMMIT_GUIDE.md` の存在を機械検証。`commit_language` フィールドで「日本語 OK」を project ごとに設定可能。

**Tech Stack:** bash、jq、Markdown。Node 等の重量依存なし。

---

## File Structure

このプランで作成・編集するファイル：

```
claude-loom/
├── SPEC.md                                            [Task 1, 2]
├── PLAN.md                                            [Task 3]
├── README.md                                          [Task 9]
├── CLAUDE.md                                          [Task 8]
├── docs/
│   └── COMMIT_GUIDE.md                                [Task 4, 新規]
├── tests/
│   ├── REQUIREMENTS.md                                [Task 5, REQ-012/013/014]
│   └── conventions_test.sh                            [Task 6, 新規]
├── templates/
│   ├── CLAUDE.md.template                             [Task 8]
│   └── claude-loom/
│       └── project.json.template                      [Task 7]
```

責務境界：
- `docs/COMMIT_GUIDE.md` — CC + GitHub Flow の **詳細 SSoT**（11 types 一覧、件名/本文ルール、atomic commit 原則、good/bad 例、BREAKING CHANGE 表記）
- `SPEC.md §3.8` — claude-loom の **policy 宣言**（CC + GitHub Flow 採用、COMMIT_GUIDE への参照）
- `SPEC.md §6.9` — project.json の **schema** 拡張（commit_prefixes 11 種 / branch_types 10 種 / commit_language enum）
- `CLAUDE.md` / `templates/CLAUDE.md.template` — **作業規約サマリ**（COMMIT_GUIDE への誘導）
- `README.md` — **ユーザー向け案内**（採用宣言 + リンク）
- `tests/conventions_test.sh` — `project.json.template` + `COMMIT_GUIDE.md` の機械検証

---

## Task 1: SPEC.md §3.8 にコミット + ブランチ規約セクション追加

**Files:**
- Modify: `SPEC.md`

claude-loom が CC + GitHub Flow を **明示的に採用** する宣言と、COMMIT_GUIDE への誘導をここで行う。

- [ ] **Step 1: §3.7 の終端を確認、§3.8 を直後に挿入**

`SPEC.md` の §3.7 セクション終端を `Read` で確認（`### 3.7.4 PM のドキュメント保守スコープ` あたりが §3.7 の最後の subsection のはず）。`grep -n "^##\|^### 3\." SPEC.md | head -20` で位置を確定。

- [ ] **Step 2: §3.8 サブセクション追加**

`Edit` tool で §3.7 の最後の subsection の終端と次の `## 4.` 見出しの間に挿入。具体的には `## 4. アクター（エージェント）定義` の **直前** に以下を挿入：

```markdown
### 3.8 コミット + ブランチ規約（Conventional Commits + GitHub Flow）

claude-loom は **Conventional Commits**（[conventionalcommits.org](https://www.conventionalcommits.org)）と **GitHub Flow** を明示採用する。詳細ルール + good/bad 例は `docs/COMMIT_GUIDE.md` を参照。

#### 3.8.1 コミット規約サマリ

- **形式**: `<type>(<optional scope>): <subject>` の 1 行件名 + 必要に応じて空行 + 本文
- **type 11 種**: `feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `chore` / `revert`
- **scope**: 任意（`feat(skills): ...` のように該当モジュールを括弧で）
- **件名**: 命令形（"Add feature" / "Update workflow"）または日本語の体言止め可。≤50 文字英 / ≤40 文字日目安。末尾ピリオドなし
- **本文**: WHY 中心、72 文字折返（日本語は自然な改行）
- **BREAKING CHANGE**: `feat!:` または footer `BREAKING CHANGE: <description>`
- **atomic commits**: 1 commit = 1 論理変更 / revert 単位 / build & test pass / ≤200 行目安（Google CL 流儀）

#### 3.8.2 ブランチ規約サマリ（GitHub Flow）

- **戦略**: `main` + 短命 feature ブランチのみ（GitHub Flow）。Git Flow の `develop` / `release` ブランチは使わない
- **命名**: `<type>/<short-kebab-name>`、type は commit type と同一（`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore` の 10 種、`revert` はインラインで使うのでブランチ名には含めない）
- **寿命**: 数日〜数週間程度。長期化したら分割を検討
- **merge**: `main` への direct commit 禁止。PR 経由、reviewer verdict pass 必須。merge 戦略は `--no-ff`（マイルストーン boundary を history に残す）または squash（WIP commit が多い場合）

#### 3.8.3 言語ポリシー（commit_language）

`.claude-loom/project.json` の `rules.commit_language` で件名/本文の言語を設定：
- `"any"`（default）：日本語 / 英語どちらも可。個人・国内チーム向け
- `"english"`：英語強制。国際 OSS / 機械処理優先
- `"japanese"`：日本語強制（実用上は珍しい設定）

claude-loom 自身は `"any"`（既存 commit が日英混在のため）。

```

- [ ] **Step 3: 変更履歴に追記**

`## 変更履歴` セクション末尾に：
```
- 2026-04-27: §3.8 追加（CC + GitHub Flow 採用宣言、commit/branch 規約サマリ、commit_language ポリシー、M0.7）
```

- [ ] **Step 4: コミット**

```bash
git diff SPEC.md
git add SPEC.md
git commit -m "docs(spec): §3.8 add Conventional Commits + GitHub Flow adoption (M0.7)"
```

---

## Task 2: SPEC §6.9 schema 拡張（commit_prefixes 11 種 + branch_types + commit_language）

**Files:**
- Modify: `SPEC.md`

- [ ] **Step 1: §6.9 canonical JSON example の rules ブロックを更新**

`Read` で §6.9 を確認。`Edit` で `rules` ブロック全体を以下に置換：

旧（current state of canonical example）：
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

新：
```json
"rules": {
  "tdd_required": true,
  "branch_pattern": "<type>/{short-kebab-name}",
  "branch_types": ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore"],
  "commit_prefixes": ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"],
  "commit_language": "any",
  "main_branch": "main",
  "no_direct_commit_to_main": true,
  "review_mode": "single"
},
```

- [ ] **Step 2: §6.9 フィールド説明テーブルに新規 3 行追加**

`grep -n "rules.review_mode" SPEC.md` で table の review_mode 行を見つけ、その **後** に以下 3 行を追加（`| rules.review_mode | ...` 行の直後）：

```markdown
| `rules.branch_types` | — | 10 種（CC type 準拠、`revert` 除く） | branch 名 prefix の有効値リスト |
| `rules.commit_language` | — | `"any"` | コミット件名/本文の言語ポリシー：`"any"` / `"english"` / `"japanese"` |
```

加えて、既存の `rules.commit_prefixes` 行（あれば）の **default 値説明** を更新。`grep -n "commit_prefixes" SPEC.md` で表内の行を確認し、もし既存行があるなら以下に書き換え：

旧（あれば）：
```markdown
| `rules.commit_prefixes` | — | `["test","feat","fix","chore","docs"]` | コミット prefix の有効値 |
```

新：
```markdown
| `rules.commit_prefixes` | — | 11 種（CC type 全部） | コミット prefix の有効値（`feat`/`fix`/`docs`/`style`/`refactor`/`perf`/`test`/`build`/`ci`/`chore`/`revert`） |
```

もし既存 table に `rules.commit_prefixes` 行が無ければ、`rules.review_mode` 行の **前** に挿入。

- [ ] **Step 3: §6.9 内の説明 prose（あれば）を CC 11 種に整合させる**

`grep -n "branch_pattern\|commit_prefixes" SPEC.md | head -10` で言及箇所を確認。例えば §6.9 の説明文中に「commit_prefixes は 5 種...」のような古い記述があれば 11 種に更新。

- [ ] **Step 4: §6.2 SQLite schema は projects テーブルに per-project の rules.* フィールドを持たない（project.json 経由で管理）想定。schema 変更不要を確認**

```bash
grep -n "commit_prefixes\|branch_types\|commit_language" SPEC.md | head -20
```

Schema (§6.2) の `projects` テーブルが上記フィールドを持たないことを確認。持たないので Step 4 は no-op（確認のみ）。

- [ ] **Step 5: 変更履歴に追記**

`## 変更履歴` 末尾、Task 1 で追加した行の **直下** に：
```
- 2026-04-27: §6.9 commit_prefixes 11 種拡張 + branch_types / commit_language フィールド追加（M0.7）
```

- [ ] **Step 6: コミット**

```bash
git diff SPEC.md
git add SPEC.md
git commit -m "docs(spec): §6.9 schema gains branch_types + commit_language + 11 commit_prefixes (M0.7)"
```

---

## Task 3: PLAN.md に M0.7 マイルストーン挿入

**Files:**
- Modify: `PLAN.md`

- [ ] **Step 1: M1 セクションの直前に M0.7 セクション挿入**

`Edit` tool で `## マイルストーン M1: Daemon + Hooks Foundation` の **直前** に以下を挿入：

```markdown
## マイルストーン M0.7: Conventional Commits + GitHub Flow Adoption

詳細: `docs/plans/2026-04-27-claude-loom-m0.7-conventions.md`

- [ ] SPEC §3.8 追加（CC + GitHub Flow 採用宣言） <!-- id: m0.7-t1 status: todo -->
- [ ] SPEC §6.9 schema 拡張（commit_prefixes 11 / branch_types / commit_language） <!-- id: m0.7-t2 status: todo -->
- [ ] PLAN.md M0.7 マイルストーン挿入 <!-- id: m0.7-t3 status: todo -->
- [ ] docs/COMMIT_GUIDE.md 新設 <!-- id: m0.7-t4 status: todo -->
- [ ] tests/REQUIREMENTS.md REQ-012/013/014 追加 <!-- id: m0.7-t5 status: todo -->
- [ ] tests/conventions_test.sh 新設 <!-- id: m0.7-t6 status: todo -->
- [ ] templates/claude-loom/project.json.template 拡張 <!-- id: m0.7-t7 status: todo -->
- [ ] CLAUDE.md + templates/CLAUDE.md.template 詳細化 <!-- id: m0.7-t8 status: todo -->
- [ ] README.md にコミット/ブランチ規約セクション追加 <!-- id: m0.7-t9 status: todo -->
- [ ] スモークテスト + tag m0.7-complete <!-- id: m0.7-t10 status: todo -->

**M0.7 完成基準**：`./tests/run_tests.sh` で 5 PASS / 0 FAIL（既存 4 + conventions）、`docs/COMMIT_GUIDE.md` が CC 11 types + GitHub Flow 詳細を網羅、`templates/claude-loom/project.json.template` が `commit_prefixes`（11 種）/ `branch_types`（10 種）/ `commit_language`（`"any"`）を含み jq empty で valid、`tag m0.7-complete` 設置。

```

- [ ] **Step 2: コミット**

```bash
git diff PLAN.md
git add PLAN.md
git commit -m "docs(plan): add M0.7 milestone (CC + GitHub Flow adoption)"
```

---

## Task 4: docs/COMMIT_GUIDE.md 新設

**File:**
- Create: `docs/COMMIT_GUIDE.md`

- [ ] **Step 1: ガイド本文を Write tool で作成**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/docs/COMMIT_GUIDE.md` に以下を書く：

````markdown
# Commit + Branch Guide

claude-loom が採用する **Conventional Commits + GitHub Flow** の詳細ルール + 例。SPEC §3.8 の policy 宣言から参照される SSoT。

## なぜこの規約か

- **Conventional Commits**：commit 種別の機械的分類で changelog 自動生成 / SemVer 連携が可能。業界標準
- **GitHub Flow**：個人〜小規模チーム向け、main + 短命 feature ブランチのみ。CD 親和性高
- **Atomic commits**：1 commit = 1 論理変更で revert / cherry-pick が安全、レビュー粒度が揃う

参考: [conventionalcommits.org](https://www.conventionalcommits.org), [Google's Engineering Practices](https://google.github.io/eng-practices/), [Chris Beams - How to Write a Git Commit Message](https://cbeams.com/posts/git-commit/), [trunkbaseddevelopment.com](https://trunkbaseddevelopment.com/)

## 1. コミットメッセージ

### 1.1 形式

```
<type>(<optional scope>): <subject>

<optional body>

<optional footer>
```

例：

```
feat(skills): loom-test bundled script + SKILL.md

loom-developer から呼ばれる前提のテスト一括実行スクリプト。
project root を SPEC.md + tests/run_tests.sh の存在で自動探索する。

Refs: m0.5-t5
```

### 1.2 Type（11 種）

| Type | 用途 | 例 |
|---|---|---|
| `feat` | 新機能 | `feat(agents): add loom-reviewer single-mode agent` |
| `fix` | バグ修正 | `fix(install): handle empty $HOME guard` |
| `docs` | ドキュメントのみの変更 | `docs(spec): §3.8 add CC adoption` |
| `style` | フォーマット / 空白 / コメント等の整形（ロジック不変） | `style: align indent in install.sh` |
| `refactor` | リファクタ（機能不変） | `refactor(skills): extract find_project_root helper` |
| `perf` | パフォーマンス改善 | `perf(daemon): batch event writes` |
| `test` | テストのみの追加・修正 | `test(install): add REQ-008 coverage` |
| `build` | ビルドシステム / 依存関係 | `build: bump bun to 1.2` |
| `ci` | CI 設定 | `ci: add lint workflow` |
| `chore` | 雑務（リリース準備、tooling 等） | `chore: scaffold M0 repo structure` |
| `revert` | 直前 commit の取消 | `revert: feat(...) <SHA>` |

### 1.3 Scope（任意）

該当モジュール / 領域を括弧で。複数モジュールにまたがる変更は scope なし、または最も影響度の高い 1 つ。

良い例：`feat(skills)`, `fix(agents)`, `docs(plan)`, `test(commands)`
悪い例：`feat(skills,agents,docs)` ← 多すぎ、scope 省略推奨

### 1.4 Subject（件名）

- **命令形** または **日本語の体言止め** 可
- 英語: ≤50 文字目安、長くても 72 文字以内
- 日本語: ≤40 文字目安（情報密度が高いため）
- **末尾ピリオドなし**
- 1 文字目大文字（英語）／文頭整形（日本語）

良い例：
- `feat(install): add idempotent symlink installer`
- `fix(agents): align loom-developer mode-neutral wording`
- `docs(spec): §6.9 schema gains rules.review_mode`

悪い例：
- `Added install script.` （過去形 + 末尾ピリオド）
- `fix stuff` （vague）
- `feat: refactored 42 files including agents/loom-* and skills/...` （長すぎ + scope 過大）

### 1.5 Body（本文）

必要時のみ。件名と空行で区切る。

- **WHY を書く**（WHAT は diff で見える）
- 72 文字目安で折返（日本語は自然な改行）
- 影響範囲・トレードオフ・実装メモなど

```
fix(install): use -type l for symlink detection on macOS

macOS の find は default で symlink を follow しない。
-type f / -type d は symlink にマッチせず、status.sh が
全 installed セクションで (none) を返してしまう regression を起こした。
-type l に統一して symlink を直接検出する。
```

### 1.6 Footer（任意）

- `Refs:` `Closes:` `Fixes:` で issue / task ID
- `Co-Authored-By:` 共同作業
- `BREAKING CHANGE:` 破壊的変更（型変更・API 削除・スキーマ変更等）

```
feat(api)!: rename /v1/users to /v1/accounts

BREAKING CHANGE: API consumers must update endpoint paths.
旧 /v1/users は 410 Gone を返す。
```

`type` の直後に `!` を付けると BREAKING の短縮表記。

### 1.7 言語ポリシー

`.claude-loom/project.json` の `rules.commit_language` で：
- `"any"`（default）：日本語 / 英語どちらも OK。code identifiers は原文（日本語化しない）
- `"english"`：英語強制。OSS / 国際チーム向け
- `"japanese"`：日本語強制（稀）

claude-loom 自身は `"any"`。

## 2. Atomic Commits（1 commit = 1 論理変更）

- 機能追加とリファクタは別 commit に分ける
- 1 commit だけで `git revert` できる単位にする
- 各 commit で **build pass + tests pass** 状態を維持
- 行数目安：200 行以下が理想、500 行超は分割を検討（Google CL 流儀）
- 例外：1 機能の test ファイル + 実装ファイルは同じ commit に含めて OK（TDD red→green の green commit）

### 良い分割例

| Bad（1 commit） | Good（3 commit に分割） |
|---|---|
| `feat: add X feature, refactor Y helper, fix Z bug` | `feat(x): add X feature` / `refactor(y): extract Y helper` / `fix(z): handle Z edge case` |

## 3. ブランチ規約（GitHub Flow）

### 3.1 戦略

- **`main`** + 短命 **feature ブランチ** のみ
- Git Flow の `develop` / `release` ブランチは使わない
- main 直 commit 禁止、PR 経由のみ
- merge 後はブランチ削除（履歴を main に集約）

### 3.2 命名

`<type>/<short-kebab-name>` 形式。type は commit type の 10 種（`revert` を除く）：

| Branch type | 用途 | 例 |
|---|---|---|
| `feat/` | 新機能 | `feat/loom-reviewer-agent` |
| `fix/` | バグ修正 | `fix/install-home-guard` |
| `docs/` | ドキュメントのみ | `docs/commit-guide` |
| `style/` | フォーマット | `style/install-indent` |
| `refactor/` | リファクタ | `refactor/find-project-root` |
| `perf/` | パフォーマンス | `perf/event-batching` |
| `test/` | テスト追加 | `test/install-req-008` |
| `build/` | ビルド | `build/bun-bump` |
| `ci/` | CI 設定 | `ci/add-lint-workflow` |
| `chore/` | 雑務 | `chore/scaffold-m0` |

### 3.3 寿命

- 数日〜数週間が目安
- 長期化したら分割（マイルストーン単位を超える場合は M0.5 / M0.6 のように細かく刻む）
- 短命 = main との rebase / merge コストが低い

### 3.4 merge 戦略

- **`--no-ff`**：マイルストーン境界を history に残したい時（M0 / M0.5 / M0.6 の merge 実例）
- **squash**：WIP commit が多く、本質的に 1 つの論理変更として履歴に残したい時
- **fast-forward**：避ける（履歴のフラット化で branch boundary が消える）

claude-loom 自身は `--no-ff` で運用してる。

## 4. claude-loom の実コミット例

良い例（claude-loom 自身の commit history より引用）：

- `feat(install): minimal symlink installer with TDD coverage (REQ-001..004)` — type + scope + subject、`Refs:` 代わりに `(REQ-...)` で要件参照
- `fix(skills): status.sh symlink detection (-type l) + plan t13 done + install banner generic` — 複数の関連修正を 1 commit にまとめた例
- `docs(spec): §3.8 add Conventional Commits + GitHub Flow adoption (M0.7)` — SPEC 章番号を subject に含める claude-loom 流儀

避ける例：
- 件名のみで本文なしの大規模変更（WHY が失われる）
- 異なる type の混在（`feat + fix + refactor` 同時 commit）
- "Update files" / "WIP" 系の vague subject

## 5. claude-loom 規約への移行（既存プロジェクトの adopt）

既存プロジェクトを `claude-loom` で adopt する際は：

1. `.claude-loom/project.json` の `rules.commit_prefixes` / `rules.branch_types` / `rules.commit_language` を既存規約に合わせてカスタマイズ
2. 既存の commit 履歴は移行しない（過去資産は尊重）
3. adopt 以降の新規 commit から本ガイドに従う

## 6. 自動検証

- `tests/conventions_test.sh` が `templates/claude-loom/project.json.template` の `commit_prefixes` / `branch_types` の整合性を機械検証（REQ-012, REQ-013）
- `docs/COMMIT_GUIDE.md` の存在は REQ-014 で検証
- M1 以降で commit-msg hook（commitlint 等）の自動 lint を検討予定（M2 / M3 ではなく実装フェーズで）

## 関連参照

- SPEC §3.8（policy 宣言）
- SPEC §6.9（project.json schema）
- `.claude-loom/project.json` の `rules.*`（プロジェクト固有設定）
- [Conventional Commits 公式](https://www.conventionalcommits.org)
- [Chris Beams - How to Write a Git Commit Message](https://cbeams.com/posts/git-commit/)
````

- [ ] **Step 2: コミット**

```bash
git add docs/COMMIT_GUIDE.md
git commit -m "docs: add COMMIT_GUIDE.md with CC + GitHub Flow detailed rules + examples (M0.7)"
```

---

## Task 5: tests/REQUIREMENTS.md REQ-012/013/014 追加

**Files:**
- Modify: `tests/REQUIREMENTS.md`

- [ ] **Step 1: M0.5 セクションと `## M1 以降は別 PR で追記` の間に M0.7 セクションを挿入**

`Read` で現状確認：
```bash
cat tests/REQUIREMENTS.md
```

`Edit` tool で `## M1 以降は別 PR で追記` の **手前** に新セクションを挿入。M0.5 のすぐ後ろに M0.6 と M0.7 が来る順序にする（M0.6 セクションが既存ならその後ろ、なければ M0.5 の後ろ）。

`grep -n "^## M0" tests/REQUIREMENTS.md` で既存セクション順を確認し、適切な位置に挿入：

```markdown
## M0.7: Conventional Commits + GitHub Flow

- **REQ-012**: `templates/claude-loom/project.json.template` の `rules.commit_prefixes` に CC 11 種すべて（feat / fix / docs / style / refactor / perf / test / build / ci / chore / revert）が含まれる
- **REQ-013**: `templates/claude-loom/project.json.template` の `rules.branch_types` に GitHub Flow 用 10 種すべて（feat / fix / docs / style / refactor / perf / test / build / ci / chore）が含まれる
- **REQ-014**: `docs/COMMIT_GUIDE.md` が存在し、空でない（CC + GitHub Flow ガイドの SSoT）

```

- [ ] **Step 2: コミット**

```bash
git add tests/REQUIREMENTS.md
git commit -m "docs(tests): add REQ-012/013/014 for M0.7 conventions"
```

---

## Task 6: tests/conventions_test.sh 新設（TDD red）

**Files:**
- Create: `tests/conventions_test.sh`

- [ ] **Step 1: 失敗するテストを先に書く（TDD red）**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/tests/conventions_test.sh`：

```bash
#!/usr/bin/env bash
# tests/conventions_test.sh — CC + GitHub Flow conventions validation
#
# REQ-012, REQ-013, REQ-014 をカバー

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="$ROOT_DIR/templates/claude-loom/project.json.template"
GUIDE="$ROOT_DIR/docs/COMMIT_GUIDE.md"

failures=0

# ----- REQ-012: commit_prefixes contains 11 CC types -----
required_prefixes=("feat" "fix" "docs" "style" "refactor" "perf" "test" "build" "ci" "chore" "revert")

if [ ! -f "$TEMPLATE" ]; then
  echo "FAIL: REQ-012: template file not found at $TEMPLATE"
  failures=$((failures + 1))
else
  template_prefixes=$(jq -r '.rules.commit_prefixes[]?' "$TEMPLATE" 2>/dev/null || true)
  missing_prefixes=()
  for p in "${required_prefixes[@]}"; do
    if ! echo "$template_prefixes" | grep -qx "$p"; then
      missing_prefixes+=("$p")
    fi
  done
  if [ ${#missing_prefixes[@]} -gt 0 ]; then
    echo "FAIL: REQ-012: commit_prefixes missing: ${missing_prefixes[*]}"
    failures=$((failures + 1))
  else
    echo "PASS: REQ-012: all 11 commit_prefixes present"
  fi
fi

# ----- REQ-013: branch_types contains 10 types -----
required_branch_types=("feat" "fix" "docs" "style" "refactor" "perf" "test" "build" "ci" "chore")

if [ -f "$TEMPLATE" ]; then
  template_branch_types=$(jq -r '.rules.branch_types[]?' "$TEMPLATE" 2>/dev/null || true)
  missing_branch_types=()
  for b in "${required_branch_types[@]}"; do
    if ! echo "$template_branch_types" | grep -qx "$b"; then
      missing_branch_types+=("$b")
    fi
  done
  if [ ${#missing_branch_types[@]} -gt 0 ]; then
    echo "FAIL: REQ-013: branch_types missing: ${missing_branch_types[*]}"
    failures=$((failures + 1))
  else
    echo "PASS: REQ-013: all 10 branch_types present"
  fi
fi

# ----- REQ-014: COMMIT_GUIDE.md exists and is non-empty -----
if [ ! -s "$GUIDE" ]; then
  echo "FAIL: REQ-014: docs/COMMIT_GUIDE.md not found or empty"
  failures=$((failures + 1))
else
  echo "PASS: REQ-014: docs/COMMIT_GUIDE.md present"
fi

if [ "$failures" -gt 0 ]; then
  echo "conventions_test FAILED with $failures violations"
  exit 1
fi

echo "conventions_test passed"
```

```bash
chmod +x tests/conventions_test.sh
```

- [ ] **Step 2: テスト実行 → FAIL を確認（branch_types がまだ無い、COMMIT_GUIDE は Task 4 で作成済み、commit_prefixes は古い 5 種のはず）**

```bash
./tests/run_tests.sh conventions
```

期待：FAIL — REQ-012（commit_prefixes 不足）+ REQ-013（branch_types 欠落）。REQ-014 は Task 4 で COMMIT_GUIDE.md 作成済みなら PASS。

- [ ] **Step 3: コミット**

```bash
git add tests/conventions_test.sh
git commit -m "test(conventions): add CC + GitHub Flow validation (REQ-012/013/014)"
```

---

## Task 7: templates/claude-loom/project.json.template 拡張（GREEN）

**File:**
- Modify: `templates/claude-loom/project.json.template`

- [ ] **Step 1: 既存テンプレを `Read` で確認**

```bash
cat templates/claude-loom/project.json.template
```

- [ ] **Step 2: rules ブロックを CC + branch_types + commit_language で拡張**

`Edit` tool で `rules` ブロック全体を更新。現在：

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

新：

```json
  "rules": {
    "tdd_required": true,
    "branch_pattern": "<type>/{short-kebab-name}",
    "branch_types": ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore"],
    "commit_prefixes": ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"],
    "commit_language": "any",
    "main_branch": "main",
    "no_direct_commit_to_main": true,
    "review_mode": "single"
  },
```

- [ ] **Step 3: jq empty で JSON 検証**

```bash
jq empty templates/claude-loom/project.json.template && echo "json valid"
jq '.rules' templates/claude-loom/project.json.template
```

期待：`json valid` + `.rules` ブロックが 8 フィールド（`tdd_required`, `branch_pattern`, `branch_types`, `commit_prefixes`, `commit_language`, `main_branch`, `no_direct_commit_to_main`, `review_mode`）を持つ。

- [ ] **Step 4: conventions_test.sh で GREEN 確認**

```bash
./tests/run_tests.sh conventions
```

期待：3 PASS（REQ-012 / REQ-013 / REQ-014）+ `conventions_test passed`、exit 0。

- [ ] **Step 5: 全テスト確認**

```bash
./tests/run_tests.sh
```

期待：5 PASS（agents 6 / commands 3 / install 6 / skills 5 / conventions 3）、exit 0。

- [ ] **Step 6: コミット**

```bash
git add templates/claude-loom/project.json.template
git commit -m "feat(templates): project.json.template gains 11 commit_prefixes + branch_types + commit_language (M0.7)"
```

---

## Task 8: CLAUDE.md + templates/CLAUDE.md.template 詳細化

**Files:**
- Modify: `CLAUDE.md`
- Modify: `templates/CLAUDE.md.template`

- [ ] **Step 1: CLAUDE.md「ブランチ規約」「コミット粒度」セクションを更新**

`Read` で確認、現在：

```
## ブランチ規約

- `main` への直 commit 禁止
- 1 要件 = 1 ブランチ。命名 `feat/<short-description>` `fix/<short-description>` `chore/<short-description>`
- ブランチ単位で PR を上げる前に：全テスト pass + 全 reviewer verdict pass（single mode = 1 verdict、trio mode = 3 verdicts）

## コミット粒度

- 1 機能 = 1 commit
- メッセージ prefix: `test(xxx)` / `feat(xxx)` / `fix(xxx)` / `chore(xxx)` / `docs:`
- 例: `feat(install): add idempotent symlink installer`
```

`Edit` で全体を以下に置換：

```markdown
## ブランチ規約（GitHub Flow）

- `main` への直 commit 禁止、PR 経由のみ
- 1 要件 = 1 ブランチ、短命（数日〜数週間）
- 命名 `<type>/<short-kebab-name>`、type は `feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `chore` の 10 種
- 例: `feat/loom-reviewer-agent`, `fix/install-home-guard`, `docs/commit-guide`
- ブランチ単位で PR を上げる前に：全テスト pass + 全 reviewer verdict pass（single mode = 1 verdict、trio mode = 3 verdicts）
- merge は `--no-ff`（マイルストーン境界を残す）または squash（WIP 多い場合）

## コミット粒度（Conventional Commits）

- 1 commit = 1 論理変更（atomic、revert 単位）、build & test pass 状態を維持
- 行数目安：200 行以下推奨、500 行超は分割（Google CL 流儀）
- 形式: `<type>(<optional scope>): <subject>` の 1 行件名 + 必要に応じて空行 + 本文
- type 11 種: `feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `chore` / `revert`
- 件名: 命令形 or 日本語体言止め可（≤50 英 / ≤40 日目安、末尾ピリオドなし）
- 本文（必要時）: WHY 中心、72 文字折返
- BREAKING CHANGE: `feat!:` または footer `BREAKING CHANGE: <description>`
- 言語ポリシー: `.claude-loom/project.json` の `rules.commit_language`（`"any"` default）
- 詳細ルール + 良い/悪い例: **`docs/COMMIT_GUIDE.md` を参照**
```

- [ ] **Step 2: templates/CLAUDE.md.template を `Read` で確認、同様の更新を加える**

`templates/CLAUDE.md.template` 内、`<!-- claude-loom managed: start -->` から `<!-- claude-loom managed: end -->` の範囲にある「ブランチ規約」「コミット粒度」セクションを `Edit` で同じく置換。CLAUDE.md と同じ内容。

`grep -n "ブランチ規約\|コミット粒度" templates/CLAUDE.md.template` でセクション位置を確認した上で `Edit`。

- [ ] **Step 3: コミット**

```bash
git diff CLAUDE.md templates/CLAUDE.md.template
git add CLAUDE.md templates/CLAUDE.md.template
git commit -m "docs(m0.7): CLAUDE.md + template detail CC + GitHub Flow rules with COMMIT_GUIDE link"
```

---

## Task 9: README.md にコミット/ブランチ規約セクション追加

**File:**
- Modify: `README.md`

- [ ] **Step 1: README.md の「## ドキュメント」セクションの前に新セクション挿入**

`Read` で確認、`## ドキュメント` の **直前** に `## 開発規約` セクションを挿入。

```markdown
## 開発規約

claude-loom は **Conventional Commits + GitHub Flow** を採用：

- **コミット**: `<type>(<optional scope>): <subject>`、type 11 種（`feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `chore` / `revert`）、atomic commit 原則
- **ブランチ**: `<type>/<short-kebab-name>`、main 直 commit 禁止、短命 feature ブランチ + PR 経由
- **言語**: `.claude-loom/project.json` の `rules.commit_language` で project ごとに英語/日本語/自由を選択（default `"any"`）

詳細ルール + good/bad 例は **`docs/COMMIT_GUIDE.md`** を参照。

```

- [ ] **Step 2: コミット**

```bash
git diff README.md
git add README.md
git commit -m "docs(m0.7): README adds 開発規約 section (CC + GitHub Flow declaration)"
```

---

## Task 10: スモークテスト + tag m0.7-complete

**Files:**
- Modify: `PLAN.md`（タスクを done にマーク）

- [ ] **Step 1: 全テスト最終確認**

```bash
./tests/run_tests.sh
```

期待：5 PASS（agents 6 / commands 3 / install 6 / skills 5 / conventions 3）、Failed: 0、exit 0。

- [ ] **Step 2: 実環境 install.sh 確認（regression なし）**

```bash
./install.sh
```

期待：エラーなし、既存 14 件 symlink が "replacing existing symlink" として再リンクされる（M0.7 では新規 agent/skill/command なし）。

- [ ] **Step 3: bundled scripts self-host**

```bash
./skills/loom-test/scripts/run.sh
./skills/loom-status/scripts/status.sh
```

期待：両方 exit 0、`loom-test` は `passed: 5`（conventions 含む）。

- [ ] **Step 4: PLAN.md M0.7 タスクを done にマーク**

`Edit` で PLAN.md の M0.7 セクション内 10 行を `- [ ] ... status: todo` から `- [x] ... status: done` に置換。

- [ ] **Step 5: 最終コミット + tag**

```bash
git add PLAN.md
git commit -m "docs(plan): mark M0.7 tasks done after smoke test"
git tag -a m0.7-complete -m "M0.7: Conventional Commits + GitHub Flow adoption.

- SPEC §3.8 (policy declaration) + §6.9 (schema with commit_prefixes 11, branch_types, commit_language)
- docs/COMMIT_GUIDE.md (SSoT for CC + GitHub Flow detailed rules + examples)
- tests/conventions_test.sh validates template (REQ-012/013/014)
- templates/claude-loom/project.json.template gains commit_prefixes (11), branch_types (10), commit_language ('any' default)
- CLAUDE.md + templates/CLAUDE.md.template detail rules with COMMIT_GUIDE link
- README.md gains 開発規約 section

Existing M0/M0.5/M0.6 artifacts unchanged. Project default commit_language is 'any' (Japanese/English mixed allowed)."
git tag --list
git log --oneline | head -15
```

期待：`m0.7-complete` tag 設置、log 先頭に M0.7 関連コミット、`m0-complete` / `m0.5-complete` / `m0.6-complete` も保持。

---

## M0.7 完成基準（受入要件）

すべて満たせば M0.7 完了：

- [ ] `tests/run_tests.sh` が 5 PASS（既存 4 + conventions）
- [ ] `templates/claude-loom/project.json.template` が `commit_prefixes`（11 種）/ `branch_types`（10 種）/ `commit_language`（`"any"`）を含み jq empty で valid
- [ ] `docs/COMMIT_GUIDE.md` が CC 11 types + GitHub Flow + atomic commit 原則 + claude-loom 実例を網羅
- [ ] SPEC §3.8 が policy 宣言 + COMMIT_GUIDE 参照を含む
- [ ] SPEC §6.9 schema が新フィールドと整合
- [ ] PLAN.md の M0.7 セクション全 10 タスク `[x]` `done`
- [ ] CLAUDE.md + templates/CLAUDE.md.template が CC + GitHub Flow ルール詳細を含み COMMIT_GUIDE へのリンク
- [ ] README.md に 開発規約 セクション
- [ ] `git tag` に `m0.7-complete`、`m0-complete` / `m0.5-complete` / `m0.6-complete` も保持

## 次のステップ

M0.7 完成後、ハーネス基礎は完全完成（M0 + M0.5 + M0.6 + M0.7）。M1（Daemon + Hooks Foundation）の詳細プランを `writing-plans` で生成し、本番 dogfood を開始する。
