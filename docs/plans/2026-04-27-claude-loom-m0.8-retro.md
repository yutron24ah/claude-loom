# claude-loom M0.8: Retro Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development for sequential batches; switch to superpowers:dispatching-parallel-agents for Batch 4 (7 independent agent definitions). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** claude-loom ハーネスに retro 機能（4 lens / 3-stage protocol / 3-file state / hybrid auto-apply / reactive researcher）を実装。M1 daemon 着手前にハーネスの「賢くなる開発室」中核を完成させる。

**Architecture:** 7 agent + 1 skill + 1 command + 2 prefs templates + RETRO_GUIDE.md。Stage 1 で 4 lens 並列、Stage 2 で counter-argument 検証、Stage 3 で aggregator が会話 mode（default）または report mode で user に提示。State は `~/.claude-loom/user-prefs.json`（user 横断）+ `<project>/.claude-loom/project-prefs.json`（PJ 固有）+ 既存 `project.json`（human-spec、retro 不変）の 3 ファイル分離。Auto-apply は category + risk hybrid + safety guardrail、project-overrides-user 単一原則で merge。

**Tech Stack:** bash、jq、Markdown。設計 SSoT: `docs/plans/specs/2026-04-27-retro-design.md`。実装は M0.7 までのハーネス（既存 install.sh の glob で auto pickup）と整合。

---

## File Structure

このプランで作成・編集するファイル：

```
claude-loom/
├── SPEC.md                                            [Task 1, 2]
├── PLAN.md                                            [Task 3]
├── README.md                                          [Task 19]
├── CLAUDE.md                                          [Task 19]
├── agents/
│   ├── loom-retro-pm.md                               [Task 9, NEW]
│   ├── loom-retro-pj-judge.md                         [Task 10, NEW]
│   ├── loom-retro-process-judge.md                    [Task 11, NEW]
│   ├── loom-retro-meta-judge.md                       [Task 12, NEW]
│   ├── loom-retro-counter-arguer.md                   [Task 13, NEW]
│   ├── loom-retro-aggregator.md                       [Task 14, NEW]
│   ├── loom-retro-researcher.md                       [Task 15, NEW]
│   └── loom-pm.md                                     [Task 18, UPDATE: milestone hook]
├── commands/
│   └── loom-retro.md                                  [Task 17, NEW]
├── skills/
│   └── loom-retro/
│       └── SKILL.md                                   [Task 16, NEW]
├── docs/
│   ├── RETRO_GUIDE.md                                 [Task 5, NEW]
│   └── retro/.gitkeep                                 [Task 5, NEW]
├── templates/
│   ├── CLAUDE.md.template                             [Task 19, UPDATE]
│   ├── user-prefs.json.template                       [Task 7, NEW]
│   └── project-prefs.json.template                    [Task 8, NEW]
└── tests/
    ├── REQUIREMENTS.md                                [Task 4]
    └── retro_test.sh                                  [Task 6, NEW (TDD red)]
```

`install.sh` 変更不要（既存 glob `agents/loom-*.md`, `commands/loom-*.md`, `skills/loom-*/` で新ファイル auto pickup）。

### Batch 編成（execution orchestration hint）

| Batch | Tasks | スキル | 並列性 |
|---|---|---|---|
| **B1** | 1-3 | subagent-driven | sequential（SPEC + PLAN doc 更新） |
| **B2** | 4-5 | subagent-driven | sequential（REQ + RETRO_GUIDE） |
| **B3** | 6-8 | subagent-driven | sequential（TDD red → 2 prefs templates → green） |
| **B4** | 9-15 | **dispatching-parallel-agents** | **parallel**（7 agent definitions 同時実装） |
| **B5** | 16-17 | subagent-driven | sequential（skill + command） |
| **B6** | 18-19 | subagent-driven | sequential（loom-pm update + README/CLAUDE.md） |
| **B7** | 20 | controller-side | sequential（smoke + tag） |

**Batch 4 の並列化が最大の token / time 節約機会**。7 agent definitions は互いに完全独立、shared state なし。

---

## Task 1: SPEC.md §3.9 retro adoption section

**Files:** Modify `SPEC.md`

- [ ] **Step 1: §3.8 終端を確認、§3.9 を直後に挿入**

`grep -n "^### 3\\." SPEC.md` で §3.x sub-sections の位置確認。§3.8 が最後の `### 3.x` のはず（M0.7 で追加）。`## 4. アクター（エージェント）定義` の **直前** に §3.9 挿入。

`Edit` tool で `## 4. アクター（エージェント）定義` を find target に、以下を replace で前置：

```markdown
### 3.9 Retro 機能（M0.8 から有効）

claude-loom は **retro 機能** をハーネスの中核に組み込む。詳細設計は `docs/plans/specs/2026-04-27-retro-design.md`、運用 SSoT は `docs/RETRO_GUIDE.md`。

#### 3.9.1 retro の役割

PJ 軸（製品）+ Process 軸（仕事の進め方）+ 外部研究 + 自己最適化（meta）の 4 観点で振り返り → archive markdown + 会話で user に提示 → 承認された改善を user-prefs / project-prefs / SPEC / 各種ファイルに反映。「user × claude × project の組み合わせごとに動的最適化される開発室」を実現する。

#### 3.9.2 4 lens 構成

| lens | 観点 | データ source |
|---|---|---|
| `pj-axis` | SPEC drift / feature gap / UX 摩擦 | SPEC / PLAN / README / git log / agent definitions |
| `process-axis` | TDD / review / commit 粒度 / blocker | session transcripts / git log / reviewer JSON |
| `researcher` | plugin / Claude latest / UX best practice | WebSearch / context7 / WebFetch（reactive + light proactive） |
| `meta-axis` | auto-apply 拡張提案 / lens 削除提案 / risk threshold 提案 | 過去 retro outputs / user-prefs.json / approval 履歴 |

#### 3.9.3 3-stage protocol

1. **Parallel critique**: 4 lens 並列 dispatch
2. **Counter-argument pass**: `loom-retro-counter-arguer` が全 findings を反証検査
3. **Aggregator**: confirmed findings 統合 → archive markdown 生成 → user 提示

#### 3.9.4 Trigger

- 手動: `/loom-retro [--report]` で任意の起動
- Milestone hook: tag 設置後、PM agent が「retro しとく？」と user に提案

#### 3.9.5 Mode

- 会話駆動 mode（default）: PM agent が finding 1 件ずつ提示、user が口頭返答
- report mode（`--report` flag）: archive markdown のみ生成して exit

#### 3.9.6 State 管理

3 ファイル分離（責務独立）：
- `<project>/.claude-loom/project.json` — human spec、retro は読むだけ
- `<project>/.claude-loom/project-prefs.json` — retro auto-update（PJ 学習状態）
- `~/.claude-loom/user-prefs.json` — retro auto-update（user 横断学習）

merge 規則: project が user を field 単位 override（PJ 固有 policy が user グローバル設定を上書き）。schema 詳細は §6.9.1 / §6.9.2。

#### 3.9.7 Auto-apply mechanism

各 finding は `category` + `risk` + `auto_applicable_eligible` を持つ。`safety guardrail`（`auto_applicable_eligible: false` は always ASK_USER）+ `category opt-in`（user 明示承認）+ `risk threshold`（`max_risk` 以下を自動）の 3 段判定。

#### 3.9.8 Recursive 自己最適化（meta-axis）

retro 自身が承認パターンを観察 → 「category X 連続承認、auto-apply 拡張？」「lens Y 採用率低い、disable？」「max_risk 上げる？」を proposal finding として user に提示。承認されれば user-prefs / project-prefs に反映、次 retro 以降適用。

```

- [ ] **Step 2: 変更履歴に追記**

`SPEC.md` 末尾の `## 変更履歴` セクション末尾に：
```
- 2026-04-27: §3.9 追加（M0.8 retro 機能、4 lens / 3-stage protocol / 3-file state / hybrid auto-apply / recursive 自己最適化）
```

- [ ] **Step 3: コミット**

```bash
git diff SPEC.md
git add SPEC.md
git commit -m "docs(spec): §3.9 add retro adoption + 4-lens architecture (M0.8)"
```

---

## Task 2: SPEC.md §6.9.1 + §6.9.2 prefs schemas

**Files:** Modify `SPEC.md`

- [ ] **Step 1: §6.9 終端を確認、§6.9.1 / §6.9.2 を直後に挿入**

`grep -n "^### 6\\." SPEC.md` で §6.x sub-sections 確認。§6.9 が `.claude-loom/project.json` 完全スキーマ、その後ろに §6.10（`~/.claude-loom/config.json` スキーマ方針サマリ）が来てる想定。§6.10 の **直前** に §6.9.1 + §6.9.2 を挿入。

`Edit` で `### 6.10 \`~/.claude-loom/config.json\` スキーマ（方針サマリ）` を find target に、以下を replace で前置：

```markdown
### 6.9.1 `~/.claude-loom/user-prefs.json` 完全スキーマ（M0.8 から）

retro が auto-update する user 横断学習状態。

```json
{
  "$schema": "https://claude-loom.dev/schemas/user-prefs-v1.json",
  "schema_version": 1,

  "default_retro_mode": "conversation",

  "lenses": {
    "pj-axis":      { "weight": 1.0, "enabled": true },
    "process-axis": { "weight": 1.0, "enabled": true },
    "researcher":   { "weight": 1.0, "enabled": true },
    "meta-axis":    { "weight": 1.0, "enabled": true }
  },

  "auto_apply": {
    "categories": [],
    "max_risk": "never"
  },

  "approval_history": {
    "spec-drift-doc-update": {
      "presented_count": 0,
      "approved_count": 0,
      "rejected_count": 0,
      "last_updated": 0
    }
  },

  "communication_style": {
    "verbosity": "balanced",
    "language_preference": "ja"
  },

  "retro_session_history": []
}
```

| フィールド | 必須 | デフォルト | 説明 |
|---|---|---|---|
| `schema_version` | ✓ | 1 | スキーマバージョン |
| `default_retro_mode` | — | `"conversation"` | retro mode default：`"conversation"` / `"report"` |
| `lenses.<id>.weight` | — | 1.0 | lens 重み |
| `lenses.<id>.enabled` | — | true | lens 有効化フラグ |
| `auto_apply.categories` | — | `[]` | 自動適用 opt-in category 一覧 |
| `auto_apply.max_risk` | — | `"never"` | 自動適用 risk threshold：`"never"` / `"low"` / `"medium"` / `"high"` |
| `approval_history.<category>.*` | — | 0 | meta-axis 観察用、retro auto-update |
| `communication_style.verbosity` | — | `"balanced"` | `"terse"` / `"balanced"` / `"verbose"` |
| `communication_style.language_preference` | — | `"ja"` | `"ja"` / `"en"` / `"auto"` |
| `retro_session_history` | — | `[]` | 過去 retro session の id / project / completed_at 一覧（archive と相互参照） |

### 6.9.2 `<project>/.claude-loom/project-prefs.json` 完全スキーマ（M0.8 から）

retro が auto-update する PJ 固有学習状態。`project.json`（human spec、static）と分離。

```json
{
  "$schema": "https://claude-loom.dev/schemas/project-prefs-v1.json",
  "schema_version": 1,

  "lenses": {
    "pj-axis": { "weight": 1.5, "enabled": true }
  },

  "auto_apply": {
    "categories": [],
    "max_risk": "never"
  },

  "last_retro": {
    "id": "2026-04-27-001",
    "milestone": "m0.7",
    "completed_at": 0
  },

  "learned_patterns": {
    "common_blockers": [],
    "frequent_finding_categories": []
  }
}
```

| フィールド | 必須 | デフォルト | 説明 |
|---|---|---|---|
| `schema_version` | ✓ | 1 | スキーマバージョン |
| `lenses.<id>.*` | — | （未定義時 user-prefs fallback）| PJ 固有 override |
| `auto_apply.*` | — | （同上） | PJ 固有 auto-apply policy |
| `last_retro.id` | — | — | 直近 retro session id |
| `last_retro.milestone` | — | — | 直近 retro 対象 milestone（manual の場合 `"manual"`）|
| `last_retro.completed_at` | — | 0 | UNIX timestamp |
| `learned_patterns.common_blockers` | — | `[]` | この PJ で繰り返し検出された blocker パターン |
| `learned_patterns.frequent_finding_categories` | — | `[]` | この PJ で頻出する finding category |

### 6.9.3 Effective config 計算規則

retro 開始時、project が user を field 単位 override：

- `effective.lenses[L]` = `project_prefs.lenses[L]` if defined else `user_prefs.lenses[L]`
- `effective.auto_apply.categories` = `project_prefs.auto_apply.categories` if defined else `user_prefs.auto_apply.categories`
- `effective.auto_apply.max_risk` = `project_prefs.auto_apply.max_risk` if defined else `user_prefs.auto_apply.max_risk`

設計理念: user-prefs = user の claude-loom 全体での好み（default）、project-prefs = 当 PJ の policy（override）。同 user が異なる PJ で異なる policy を運用可能。

```

- [ ] **Step 2: 変更履歴に追記**

```
- 2026-04-27: §6.9.1 / §6.9.2 / §6.9.3 追加（M0.8 retro の user-prefs / project-prefs schema + merge 規則）
```

- [ ] **Step 3: コミット**

```bash
git diff SPEC.md
git add SPEC.md
git commit -m "docs(spec): §6.9.1/.2/.3 add user-prefs/project-prefs schemas + merge rule (M0.8)"
```

---

## Task 3: PLAN.md M0.8 milestone insertion

**Files:** Modify `PLAN.md`

- [ ] **Step 1: M1 セクション直前に M0.8 セクション挿入**

`Edit` で `## マイルストーン M1: Daemon + Hooks Foundation` の直前に挿入：

```markdown
## マイルストーン M0.8: Retro Architecture（賢くなる開発室の中核）

詳細: `docs/plans/2026-04-27-claude-loom-m0.8-retro.md`
設計 SSoT: `docs/plans/specs/2026-04-27-retro-design.md`

- [ ] SPEC §3.9 retro adoption section 追加 <!-- id: m0.8-t1 status: todo -->
- [ ] SPEC §6.9.1/.2/.3 prefs schemas + merge rule 追加 <!-- id: m0.8-t2 status: todo -->
- [ ] PLAN.md M0.8 マイルストーン挿入 <!-- id: m0.8-t3 status: todo -->
- [ ] tests/REQUIREMENTS.md REQ-015..018 追加 <!-- id: m0.8-t4 status: todo -->
- [ ] docs/RETRO_GUIDE.md 新設 + docs/retro/.gitkeep <!-- id: m0.8-t5 status: todo -->
- [ ] tests/retro_test.sh 新設（TDD red） <!-- id: m0.8-t6 status: todo -->
- [ ] templates/user-prefs.json.template 新設 <!-- id: m0.8-t7 status: todo -->
- [ ] templates/project-prefs.json.template 新設 <!-- id: m0.8-t8 status: todo -->
- [ ] agents/loom-retro-pm.md 新設 <!-- id: m0.8-t9 status: todo -->
- [ ] agents/loom-retro-pj-judge.md 新設 <!-- id: m0.8-t10 status: todo -->
- [ ] agents/loom-retro-process-judge.md 新設 <!-- id: m0.8-t11 status: todo -->
- [ ] agents/loom-retro-meta-judge.md 新設 <!-- id: m0.8-t12 status: todo -->
- [ ] agents/loom-retro-counter-arguer.md 新設 <!-- id: m0.8-t13 status: todo -->
- [ ] agents/loom-retro-aggregator.md 新設 <!-- id: m0.8-t14 status: todo -->
- [ ] agents/loom-retro-researcher.md 新設 <!-- id: m0.8-t15 status: todo -->
- [ ] skills/loom-retro/SKILL.md 新設 <!-- id: m0.8-t16 status: todo -->
- [ ] commands/loom-retro.md 新設 <!-- id: m0.8-t17 status: todo -->
- [ ] agents/loom-pm.md milestone hook 追記 <!-- id: m0.8-t18 status: todo -->
- [ ] README.md + CLAUDE.md + templates/CLAUDE.md.template 更新 <!-- id: m0.8-t19 status: todo -->
- [ ] スモークテスト + tag m0.8-complete <!-- id: m0.8-t20 status: todo -->

**M0.8 完成基準**：`./tests/run_tests.sh` で 6 PASS（既存 5 + retro 1）、`/loom-retro` 起動 → 4 lens 並列 → counter-argument → aggregator が会話 mode で findings 提示までが手元で動く。`/loom-retro --report` で archive markdown のみ生成も動く。`tag m0.8-complete` 設置、`m0`〜`m0.7-complete` 全保持。

```

- [ ] **Step 2: コミット**

```bash
git add PLAN.md
git commit -m "docs(plan): add M0.8 milestone (retro architecture)"
```

---

## Task 4: tests/REQUIREMENTS.md REQ-015..018 追加

**Files:** Modify `tests/REQUIREMENTS.md`

- [ ] **Step 1: `## M1 以降は別 PR で追記` の手前に M0.8 セクションを挿入**

`Edit` で `## M1 以降は別 PR で追記` を以下に置換：

```markdown
## M0.8: Retro Architecture

- **REQ-015**: `skills/loom-retro/SKILL.md` が valid な YAML frontmatter（既存 `skills_test.sh` でカバー、新規 test 不要）
- **REQ-016**: 7 つの `agents/loom-retro-*.md` が valid frontmatter + `loom-` prefix（既存 `agents_test.sh` でカバー）
- **REQ-017**: `templates/user-prefs.json.template` と `templates/project-prefs.json.template` が jq empty で valid + `schema_version: 1` フィールド存在
- **REQ-018**: `docs/RETRO_GUIDE.md` が存在 + 非空 + 4 lens 名（pj-axis / process-axis / researcher / meta-axis）言及あり + category enum 列挙あり

## M1 以降は別 PR で追記
```

- [ ] **Step 2: コミット**

```bash
git add tests/REQUIREMENTS.md
git commit -m "docs(tests): add REQ-015..018 for M0.8 retro architecture"
```

---

## Task 5: docs/RETRO_GUIDE.md + docs/retro/.gitkeep 新設

**Files:**
- Create: `docs/RETRO_GUIDE.md`
- Create: `docs/retro/.gitkeep`

- [ ] **Step 1: docs/retro ディレクトリ + .gitkeep**

```bash
mkdir -p docs/retro
touch docs/retro/.gitkeep
```

- [ ] **Step 2: docs/RETRO_GUIDE.md を書く**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/docs/RETRO_GUIDE.md` に：

````markdown
# Retro Guide

claude-loom が採用する **retro 機能** の運用 SSoT。SPEC §3.9 の policy 宣言から参照される。設計詳細は `docs/plans/specs/2026-04-27-retro-design.md`。

## なぜ retro か

claude-loom は「user × claude × project の組み合わせごとに動的最適化される開発室」を目指す。retro はそのための再帰的学習機構。問題や改善点を user と一緒に振り返り、承認された改善を user-prefs / project-prefs / SPEC / 各種ファイルに反映 → 次回以降の retro / agent 動作に組み込まれる → さらに最適化、というループ。

## 1. 4 lens（観点）

retro は **4 つの観点** で振り返る。各 lens は独立 agent で実装、Stage 1 で並列 dispatch。

### 1.1 `pj-axis`（PJ 軸）

製品の振り返り。

- **データ source**: SPEC.md / PLAN.md / README.md / git log / agent definitions
- **検出する問題**: SPEC ↔ 実装乖離、PLAN.md の stale tasks、README 陳腐化、UX claim 未達、feature gap
- **agent**: `loom-retro-pj-judge`

### 1.2 `process-axis`（Process 軸）

仕事の進め方の振り返り。

- **データ source**: session transcripts (`~/.claude/projects/<project>/*.jsonl`) / git log / reviewer JSON outputs
- **検出する問題**: TDD 違反（test 後追い）、reviewer verdict pattern、commit 粒度（過大 / 過小）、手戻りループ、blocker 滞留
- **agent**: `loom-retro-process-judge`

### 1.3 `researcher`（外部研究）

外部 plugin / Claude latest / UX best practice 調査。reactive + light proactive。

- **データ source**: WebSearch / context7 / WebFetch
- **動作**:
  - **Reactive 主**: pj-axis / process-axis の findings を keyword 化 → 関連 plugin / skill / Claude 機能を検索 → 提案 finding として aggregator に渡す
  - **Light proactive UX scan**: 1 retro につき 1 度、SPEC + 実装から obvious な UX 改善を軽量検査
- **検出する問題**: 既存 plugin で課題解決可、Claude 新機能で手作業代替可、UX 改善余地
- **agent**: `loom-retro-researcher`

### 1.4 `meta-axis`（メタ振り返り）

retro 自身の最適化。再帰的 auto-apply 拡張機構。

- **データ source**: 過去 retro outputs（archive markdown）/ user-prefs.json.approval_history / project-prefs.json.last_retro
- **検出する問題**:
  - category C を user が連続承認 → "auto_apply に追加？" 提案
  - lens L の rejected_count 多数 → "lens L disable？" 提案
  - max_risk 上げ余地 → "low-risk 自動化？" 提案
- **agent**: `loom-retro-meta-judge`

## 2. Category enum（v1 ハードコード）

各 lens に固定 category 集合。各 finding は `{ lens, category, risk, auto_applicable_eligible }` でタグ付け。

### 2.1 pj-axis lens の categories

| category | 説明 | risk 既定 | auto_applicable_eligible |
|---|---|---|---|
| `spec-drift-doc-update` | PLAN.md status sync、README typo、軽量 doc update | low | **true** |
| `spec-drift-architectural` | SPEC §X の意味変更、重要 | high | false |
| `readme-staleness` | README が陳腐化、軽量更新 | low | **true** |
| `feature-gap` | 仕様にあるが未実装 | medium | false |

### 2.2 process-axis lens の categories

| category | 説明 | risk 既定 | auto_applicable_eligible |
|---|---|---|---|
| `process-tdd-violation` | test 後追い検出 | medium | false |
| `process-commit-prefix-correction` | CC 違反 commit 提案 | low | false |
| `process-commit-granularity` | commit が大きすぎ / 小さすぎ | low | false |
| `process-blocker-pattern` | 同種 blocker 反復検出 | medium | false |

### 2.3 researcher lens の categories

| category | 説明 | risk 既定 | auto_applicable_eligible |
|---|---|---|---|
| `researcher-plugin-suggestion` | 既存 plugin で課題解決可 | medium | false |
| `researcher-claude-feature-replace` | Claude 新機能で手作業代替 | medium | false |
| `researcher-ux-improvement` | proactive UX scan の改善提案 | medium | false |

### 2.4 meta-axis lens の categories

| category | 説明 | risk 既定 | auto_applicable_eligible |
|---|---|---|---|
| `meta-auto-apply-proposal` | auto_apply.categories 拡張提案 | low | false |
| `meta-lens-disable-proposal` | lens disable 提案 | low | false |
| `meta-risk-threshold-proposal` | max_risk 上げ提案 | low | false |

> v1 では `spec-drift-doc-update` と `readme-staleness` のみが `auto_applicable_eligible: true`。残りは user 承認必須。Phase 2 evolution で拡張可。

## 3. 3-stage protocol

```
[Stage 1] Parallel critique
  4 体並列 dispatch（1 メッセージ内、Task tool）：
    ├─ loom-retro-pj-judge
    ├─ loom-retro-process-judge
    ├─ loom-retro-meta-judge
    └─ loom-retro-researcher
  各々が findings 配列を返す

[Stage 2] Counter-argument pass
  loom-retro-counter-arguer が 4 体の全 findings を input として受け、
  各 finding に対して反証可能性を検査：
    - finding が反証できる → for_drop（aggregator が drop）
    - finding が部分的に反証できる → for_downgrade（severity 下げる）
    - finding が揺らがない → confirm

[Stage 3] Aggregator + presentation
  loom-retro-aggregator が confirmed findings を受け：
    1. 各 finding に { category, risk, auto_applicable_eligible } 確認 / 追加
    2. meta-axis findings の auto-apply 拡張提案を組み込み
    3. archive markdown 生成 → docs/retro/YYYY-MM-DD-<retro-id>-report.md
    4. mode 分岐：
       - 会話 mode → loom-retro-pm に findings 1 件ずつ提示させる
       - report mode → archive のみ生成して exit
```

## 4. State files（3 ファイル分離）

詳細 schema は `SPEC.md §6.9.1`（user-prefs）+ `§6.9.2`（project-prefs）+ `§6.9.3`（merge 規則）。

| ファイル | 場所 | 所有者 | retro 動作 |
|---|---|---|---|
| `project.json` | `<project>/.claude-loom/` | human / PM | 読むだけ |
| `project-prefs.json` | `<project>/.claude-loom/` | retro auto-update | 読み + 書き |
| `user-prefs.json` | `~/.claude-loom/` | retro auto-update | 読み + 書き |

merge 規則: project-overrides-user、field 単位（`user-prefs.json` を default、`project-prefs.json` を override として top-merge）。

## 5. Auto-apply mechanism

### 5.1 判定 algorithm

```
finding ごと：
  1. category の auto_applicable_eligible == false → ASK_USER（safety guardrail）
  2. effective.auto_apply.categories（project override user）に含まれる → AUTO_APPLY
  3. risk_level(finding.risk) ≤ risk_level(effective.auto_apply.max_risk) → AUTO_APPLY
  4. それ以外 → ASK_USER
```

### 5.2 Risk levels

`never < low < medium < high`（4 段階）。`never` が初期値、auto_apply 完全 off。

### 5.3 Recursive 自己最適化（meta-axis）

retro 開始時に meta-judge が `user-prefs.json.approval_history` 読み込み：

- **Opt-in 提案**: category C が `auto_applicable_eligible: true` AND `C ∉ user.auto_apply.categories` AND 直近 90 日 `approved_count ≥ 5` AND `rejected_count == 0` → "C を auto-apply に追加？" finding を生成
- **Lens 削除提案**: lens L の `rejected_count / presented_count ≥ 0.7` AND `presented_count ≥ 10` → "lens L は採用率低い、disable する？" finding
- **Risk threshold 上げ提案**: 直近の low-risk findings が連続 N 回 approved → "max_risk を `never` → `low` に上げる？" finding

aggregator が retro session 完了時に approval_history を更新（presented/approved/rejected カウント増分）。

## 6. Trigger と Mode

### 6.1 Trigger

- **手動**: `/loom-retro` (会話 mode) / `/loom-retro --report` (report mode)
- **Milestone hook**: PM agent が milestone tag 設置を検出 → "retro しとく？" を user に提案 → user yes で `loom-retro-pm` を Task dispatch

### 6.2 Mode

| mode | 動作 |
|---|---|
| 会話駆動（default） | `loom-retro-pm` が finding 1 件ずつ提示、user が口頭で承認/却下/保留、PM が即時適用 |
| report | archive markdown のみ生成して exit、user は markdown 読んで判断 |

`~/.claude-loom/user-prefs.json.default_retro_mode` で default を設定可。

## 7. Output artifacts

### 7.1 Archive markdown report

**場所**: `<project>/docs/retro/YYYY-MM-DD-<retro-id>-report.md`
**`<retro-id>` 形式**: `<YYYY-MM-DD>-<NNN>`（同日複数 retro 用）

構成: Summary / Findings by lens / Auto-applied / Action items / Approval history snapshot

### 7.2 Pending state file

**場所**: `<project>/.claude-loom/retro/<retro-id>/pending.json`
**用途**: 会話 mode で session 中断時の resume 用

```json
{
  "retro_id": "2026-04-27-001",
  "mode": "conversation",
  "stage": "presenting",
  "findings": [
    { "id": "finding-001", "lens": "pj-axis", "category": "...", "status": "approved" },
    { "id": "finding-002", "status": "pending" }
  ],
  "next_finding_index": 5
}
```

## 8. claude-loom 実 retro 例（v1 想定）

```
$ /loom-retro
PM: M0.7 完了から retro 起動。4 lens 並列分析中...
[30 秒後]
PM: 12 findings 検出（pj-axis: 3 / process-axis: 5 / researcher: 2 / meta-axis: 2）
PM: counter-argument pass で 2 件 drop、10 件 confirmed
PM: archive を docs/retro/2026-04-27-001-report.md に保存しました

[会話 mode で 1 件ずつ提示]
PM: Finding 1/10: [pj-axis / spec-drift-doc-update / risk:low]
   PLAN.md M0.7 タスクが status: todo のまま。done に更新しますか？
User: 適用
PM: 適用しました（auto_applicable_eligible: true、risk: low）。

PM: Finding 2/10: [meta-axis / meta-auto-apply-proposal / risk:low]
   spec-drift-doc-update を直近 6 回連続承認。auto_apply に追加しますか？
   yes なら ~/.claude-loom/user-prefs.json の auto_apply.categories に追加。
User: yes
PM: user-prefs.json 更新しました。次回以降の retro では spec-drift-doc-update は silent auto-apply です（archive には summary 表示）。
...
```

## 9. Phase 2 evolution path

| 段階 | 配置 | 効果 |
|---|---|---|
| **M0.8 v1** | 4 lens ハードコード（agent definition + RETRO_GUIDE category 列挙） | retro 機構成立 |
| **Phase 2** | 4 lens を独立 skill 化（`skills/loom-retro-lens-*/`）、第三者 lens add 可、daemon 駆動 event 集計、自動 schedule trigger | pluggable エコシステム + 動的最適化の極限 |

## 関連参照

- SPEC §3.9（policy 宣言）
- SPEC §6.9.1 / §6.9.2 / §6.9.3（schemas + merge 規則）
- `docs/plans/specs/2026-04-27-retro-design.md`（設計 SSoT）
- `~/.claude-loom/user-prefs.json` + `<project>/.claude-loom/project-prefs.json`（実状態）
````

- [ ] **Step 3: コミット**

```bash
git add docs/RETRO_GUIDE.md docs/retro/.gitkeep
git commit -m "docs: add RETRO_GUIDE.md (M0.8 retro SSoT) + docs/retro/ archive dir"
```

---

## Task 6: tests/retro_test.sh 新設（TDD red）

**Files:** Create `tests/retro_test.sh`

- [ ] **Step 1: 失敗するテストを先に書く（TDD red）**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/tests/retro_test.sh`：

```bash
#!/usr/bin/env bash
# tests/retro_test.sh — M0.8 retro architecture validation
#
# REQ-017, REQ-018 をカバー（REQ-015/016 は既存 skills_test/agents_test に流れ込む）

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USER_PREFS_TPL="$ROOT_DIR/templates/user-prefs.json.template"
PROJECT_PREFS_TPL="$ROOT_DIR/templates/project-prefs.json.template"
GUIDE="$ROOT_DIR/docs/RETRO_GUIDE.md"

failures=0

# ----- REQ-017 (a): user-prefs.json.template valid + schema_version -----
if [ ! -f "$USER_PREFS_TPL" ]; then
  echo "FAIL: REQ-017a: user-prefs.json.template not found at $USER_PREFS_TPL"
  failures=$((failures + 1))
else
  if ! jq empty "$USER_PREFS_TPL" 2>/dev/null; then
    echo "FAIL: REQ-017a: user-prefs.json.template invalid JSON"
    failures=$((failures + 1))
  else
    schema_ver=$(jq -r '.schema_version // empty' "$USER_PREFS_TPL")
    if [ "$schema_ver" != "1" ]; then
      echo "FAIL: REQ-017a: user-prefs.json.template missing schema_version: 1 (got: $schema_ver)"
      failures=$((failures + 1))
    else
      echo "PASS: REQ-017a: user-prefs.json.template valid + schema_version present"
    fi
  fi
fi

# ----- REQ-017 (b): project-prefs.json.template valid + schema_version -----
if [ ! -f "$PROJECT_PREFS_TPL" ]; then
  echo "FAIL: REQ-017b: project-prefs.json.template not found at $PROJECT_PREFS_TPL"
  failures=$((failures + 1))
else
  if ! jq empty "$PROJECT_PREFS_TPL" 2>/dev/null; then
    echo "FAIL: REQ-017b: project-prefs.json.template invalid JSON"
    failures=$((failures + 1))
  else
    schema_ver=$(jq -r '.schema_version // empty' "$PROJECT_PREFS_TPL")
    if [ "$schema_ver" != "1" ]; then
      echo "FAIL: REQ-017b: project-prefs.json.template missing schema_version: 1 (got: $schema_ver)"
      failures=$((failures + 1))
    else
      echo "PASS: REQ-017b: project-prefs.json.template valid + schema_version present"
    fi
  fi
fi

# ----- REQ-018: RETRO_GUIDE.md exists + non-empty + 4 lens names + category enum -----
if [ ! -s "$GUIDE" ]; then
  echo "FAIL: REQ-018: docs/RETRO_GUIDE.md not found or empty"
  failures=$((failures + 1))
else
  required_lens_names=("pj-axis" "process-axis" "researcher" "meta-axis")
  missing_lenses=()
  for lens in "${required_lens_names[@]}"; do
    if ! grep -qF "$lens" "$GUIDE"; then
      missing_lenses+=("$lens")
    fi
  done
  if [ ${#missing_lenses[@]} -gt 0 ]; then
    echo "FAIL: REQ-018: RETRO_GUIDE.md missing lens names: ${missing_lenses[*]}"
    failures=$((failures + 1))
  fi

  required_categories=("spec-drift-doc-update" "process-tdd-violation" "researcher-plugin-suggestion" "meta-auto-apply-proposal")
  missing_cats=()
  for cat in "${required_categories[@]}"; do
    if ! grep -qF "$cat" "$GUIDE"; then
      missing_cats+=("$cat")
    fi
  done
  if [ ${#missing_cats[@]} -gt 0 ]; then
    echo "FAIL: REQ-018: RETRO_GUIDE.md missing category enum entries: ${missing_cats[*]}"
    failures=$((failures + 1))
  fi

  if [ ${#missing_lenses[@]} -eq 0 ] && [ ${#missing_cats[@]} -eq 0 ]; then
    echo "PASS: REQ-018: RETRO_GUIDE.md present with 4 lens names + category enum"
  fi
fi

if [ "$failures" -gt 0 ]; then
  echo "retro_test FAILED with $failures violations"
  exit 1
fi

echo "retro_test passed"
```

```bash
chmod +x tests/retro_test.sh
```

- [ ] **Step 2: テスト実行 → FAIL を確認（templates 未作成、GUIDE は Task 5 で作成済みなら部分 PASS）**

```bash
./tests/run_tests.sh retro
```

期待：FAIL — REQ-017a/b（template ファイル無い）。REQ-018 は Task 5 で GUIDE 作成済みなら PASS。

- [ ] **Step 3: コミット**

```bash
git add tests/retro_test.sh
git commit -m "test(retro): add retro structure validation (REQ-017/018)"
```

---

## Task 7: templates/user-prefs.json.template 新設

**Files:** Create `templates/user-prefs.json.template`

- [ ] **Step 1: テンプレ作成**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/templates/user-prefs.json.template`：

```json
{
  "$schema": "https://claude-loom.dev/schemas/user-prefs-v1.json",
  "schema_version": 1,

  "default_retro_mode": "conversation",

  "lenses": {
    "pj-axis":      { "weight": 1.0, "enabled": true },
    "process-axis": { "weight": 1.0, "enabled": true },
    "researcher":   { "weight": 1.0, "enabled": true },
    "meta-axis":    { "weight": 1.0, "enabled": true }
  },

  "auto_apply": {
    "categories": [],
    "max_risk": "never"
  },

  "approval_history": {},

  "communication_style": {
    "verbosity": "balanced",
    "language_preference": "ja"
  },

  "retro_session_history": []
}
```

- [ ] **Step 2: jq empty で検証**

```bash
jq empty templates/user-prefs.json.template && echo "json valid"
```

- [ ] **Step 3: コミット**

```bash
git add templates/user-prefs.json.template
git commit -m "feat(templates): add user-prefs.json.template (M0.8 user-scoped retro state)"
```

---

## Task 8: templates/project-prefs.json.template 新設 + retro_test GREEN

**Files:** Create `templates/project-prefs.json.template`

- [ ] **Step 1: テンプレ作成**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/templates/project-prefs.json.template`：

```json
{
  "$schema": "https://claude-loom.dev/schemas/project-prefs-v1.json",
  "schema_version": 1,

  "lenses": {},

  "auto_apply": {
    "categories": [],
    "max_risk": "never"
  },

  "last_retro": {
    "id": "",
    "milestone": "",
    "completed_at": 0
  },

  "learned_patterns": {
    "common_blockers": [],
    "frequent_finding_categories": []
  }
}
```

- [ ] **Step 2: jq empty + retro_test GREEN 確認**

```bash
jq empty templates/project-prefs.json.template && echo "json valid"
./tests/run_tests.sh retro
```

期待：3 PASS（REQ-017a + REQ-017b + REQ-018）+ `retro_test passed`、exit 0。

- [ ] **Step 3: 全 test 確認**

```bash
./tests/run_tests.sh
```

期待：6 PASS（agents 6 + commands 3 + install 6 + skills 5 + conventions 3 + retro 3）、Failed: 0。

- [ ] **Step 4: コミット**

```bash
git add templates/project-prefs.json.template
git commit -m "feat(templates): add project-prefs.json.template (M0.8 project-scoped retro state)"
```

---

## Task 9-15: 7 agent definitions（**並列 batch、dispatching-parallel-agents skill 推奨**）

各 agent definition は **互いに独立**、shared state なし。実装時は **1 メッセージ内で 7 Task call を並列発火**。

各 agent の system prompt 構造は概ね共通：
- frontmatter（`name`, `description`, `model`）
- "## Your role" 説明
- "## Workflow" 詳細
- "## Output format" 期待 JSON schema
- "## Etiquette" 振る舞い規約
- "## Tools you use"

以下、各 agent の **役割 + 必須出力 spec** だけ示す（system prompt の細部は実装時に主旨を保ちつつ subagent が起こす）。

### Task 9: agents/loom-retro-pm.md

**役割**: retro 全体の orchestrator。session 内で 4 lens を Task tool で並列 dispatch、Stage 進行管理、aggregator の結果を会話 mode で user に提示、user 返答に応じて適用。

**Frontmatter**:
```yaml
name: loom-retro-pm
description: Retro orchestrator for the claude-loom dev room. Dispatches 4 lens agents in parallel (Stage 1), runs counter-argument pass (Stage 2), aggregates findings (Stage 3), then either presents findings conversationally to user or exits with markdown report. Activated by /loom-retro slash command.
model: opus
```

**Workflow 必須要素**:
1. retro_id 生成（`YYYY-MM-DD-NNN` 形式、同日連番）
2. mode 判定（command の `--report` flag、または user-prefs.default_retro_mode）
3. Stage 1: Task tool で 4 体並列 dispatch（1 message に 4 Task call）：loom-retro-pj-judge / process-judge / meta-judge / researcher
4. Stage 2: 4 体結果を 1 つの input に concat → loom-retro-counter-arguer に Task dispatch
5. Stage 3: counter-arguer 結果を loom-retro-aggregator に Task dispatch
6. Mode 分岐:
   - 会話 mode: aggregator から finding 1 件ずつ受け取り、user に提示（"finding N/M: [lens / category / risk] description, 適用？却下？保留？"）→ pending.json 更新 → user-prefs / project-prefs / SPEC / 各種ファイルへの適用は user 承認後 1 件ずつ
   - report mode: aggregator が archive 生成して exit、user に "report 出力完了、後で `/loom-retro-apply` で承認反映可" と通知
7. session 完了時に `user-prefs.json.approval_history` の category counter を増分（presented/approved/rejected）

**Tools**: Read / Edit / Write / Bash / Task / TodoWrite

**Commit**:
```bash
git add agents/loom-retro-pm.md
git commit -m "feat(agents): loom-retro-pm orchestrator for 3-stage retro protocol (M0.8)"
```

### Task 10: agents/loom-retro-pj-judge.md

**役割**: pj-axis 観点。SPEC drift / feature gap / UX 摩擦 を検出。

**Frontmatter**:
```yaml
name: loom-retro-pj-judge
description: Project-axis lens judge for claude-loom retro. Reads SPEC.md / PLAN.md / README.md / git log / agent definitions and detects SPEC drift, feature gaps, README staleness, UX claim violations. Returns structured JSON findings with category from pj-axis enum (spec-drift-doc-update / spec-drift-architectural / readme-staleness / feature-gap).
model: sonnet
```

**Workflow**: SPEC ↔ 実装の整合性を read で確認、PLAN.md の status: todo / done を git history と照合、README の claims が実装と一致するか検査、findings を category 付き JSON で返す。

**Output JSON schema**:
```json
{
  "lens": "pj-axis",
  "findings": [
    {
      "id": "pj-001",
      "category": "spec-drift-doc-update | spec-drift-architectural | readme-staleness | feature-gap",
      "severity": "high | medium | low",
      "risk": "never | low | medium | high",
      "auto_applicable_eligible": true | false,
      "file": "path:line",
      "description": "...",
      "suggestion": "...",
      "evidence": "git log SHA / SPEC §X.Y / PLAN.md line N"
    }
  ]
}
```

**Tools**: Read / Glob / Grep / Bash

**Commit**:
```bash
git add agents/loom-retro-pj-judge.md
git commit -m "feat(agents): loom-retro-pj-judge for SPEC drift / feature gap detection (M0.8)"
```

### Task 11: agents/loom-retro-process-judge.md

**役割**: process-axis 観点。TDD / review / commit / blocker を検出。

**Frontmatter**:
```yaml
name: loom-retro-process-judge
description: Process-axis lens judge for claude-loom retro. Reads session transcripts, git log, reviewer JSON outputs and detects TDD violations (test-after-impl), reviewer verdict patterns, commit granularity issues, blocker repetition. Returns structured JSON findings with category from process-axis enum (process-tdd-violation / process-commit-prefix-correction / process-commit-granularity / process-blocker-pattern).
model: sonnet
```

**Workflow**: session transcripts (`~/.claude/projects/<sanitized>/*.jsonl`) を Read、git log で commit 順序確認（test ファイル commit が impl commit より先か）、reviewer JSON outputs を Bash + jq で抽出、commit 行数を `git diff --shortstat` で集計、blocker 滞留を session timestamps から検出。

**Output JSON schema**: 同 pj-judge、`lens: "process-axis"`。

**Tools**: Read / Glob / Grep / Bash

**Commit**:
```bash
git add agents/loom-retro-process-judge.md
git commit -m "feat(agents): loom-retro-process-judge for TDD/review/commit/blocker detection (M0.8)"
```

### Task 12: agents/loom-retro-meta-judge.md

**役割**: meta-axis 観点。auto-apply 拡張 / lens 削除 / risk threshold 上げ提案を生成。

**Frontmatter**:
```yaml
name: loom-retro-meta-judge
description: Meta-axis lens judge for claude-loom retro. Reads ~/.claude-loom/user-prefs.json (approval_history) and past retro outputs to detect over-approval patterns, low-acceptance lenses, and risk threshold candidates. Generates proposal findings with category from meta-axis enum (meta-auto-apply-proposal / meta-lens-disable-proposal / meta-risk-threshold-proposal).
model: sonnet
```

**Workflow**:
1. `~/.claude-loom/user-prefs.json` を Read、`approval_history` を解析
2. 各 category について：`auto_applicable_eligible == true` AND `category ∉ user.auto_apply.categories` AND 直近 90 日 `approved_count ≥ 5` AND `rejected_count == 0` → `meta-auto-apply-proposal` finding
3. 各 lens について：`rejected_count / presented_count ≥ 0.7` AND `presented_count ≥ 10` → `meta-lens-disable-proposal` finding
4. 直近 retro session（user-prefs.retro_session_history）の low-risk findings 連続承認パターンを検査 → `meta-risk-threshold-proposal` finding

**Output JSON schema**: 同 pj-judge、`lens: "meta-axis"`。

**Tools**: Read / Bash

**Commit**:
```bash
git add agents/loom-retro-meta-judge.md
git commit -m "feat(agents): loom-retro-meta-judge for recursive auto-apply optimization (M0.8)"
```

### Task 13: agents/loom-retro-counter-arguer.md

**役割**: 4 lens 全 findings を反証検査、揺らぐ findings を flag。

**Frontmatter**:
```yaml
name: loom-retro-counter-arguer
description: Counter-argument pass for claude-loom retro Stage 2. Receives all findings from 4 lens judges and challenges each one for refutability. Tags each finding as confirmed (unshakeable), for_downgrade (partial refutation, lower severity), or for_drop (fully refuted). Reduces echo chamber risk in LLM-as-judge multi-stage protocol.
model: sonnet
```

**Workflow**:
1. Input: 4 lens の findings 全部 concat（typically 10-30 findings）
2. 各 finding に対して "この finding を反証する根拠あるか？" を検査
   - 関連ファイル / git log / SPEC を read で再確認
   - finding の evidence が誤読 / 過大評価でないか検査
3. 各 finding に判定タグ：
   - `confirmed`: 反証不可、aggregator にそのまま渡す
   - `for_downgrade`: 部分反証、severity を 1 段下げる（high→medium / medium→low / low→drop）
   - `for_drop`: 完全反証、aggregator が drop

**Output JSON schema**:
```json
{
  "stage": "counter-argument",
  "judgments": [
    {
      "finding_id": "pj-001",
      "verdict": "confirmed | for_downgrade | for_drop",
      "rationale": "..."
    }
  ]
}
```

**Tools**: Read / Glob / Grep / Bash

**Commit**:
```bash
git add agents/loom-retro-counter-arguer.md
git commit -m "feat(agents): loom-retro-counter-arguer for echo-chamber-resistant Stage 2 (M0.8)"
```

### Task 14: agents/loom-retro-aggregator.md

**役割**: confirmed findings 統合 + archive markdown 生成 + 会話 mode の finding 提示準備。

**Frontmatter**:
```yaml
name: loom-retro-aggregator
description: Aggregator for claude-loom retro Stage 3. Merges counter-argument-confirmed findings from 4 lenses, applies category/risk/auto_applicable_eligible tagging, integrates meta-axis auto-apply proposals, generates archive markdown report, and prepares pending state for conversation-mode presentation. Updates user-prefs.json.approval_history at session completion.
model: sonnet
```

**Workflow**:
1. Input: counter-arguer の judgments + 元 4 lens findings
2. `for_drop` を除外、`for_downgrade` の severity を下げる、`confirmed` をそのまま採用
3. 各 finding の category / risk / auto_applicable_eligible を確認（lens definition 由来）
4. archive markdown を生成 → `<project>/docs/retro/<YYYY-MM-DD>-<NNN>-report.md` に Write
5. pending state JSON を `<project>/.claude-loom/retro/<retro-id>/pending.json` に Write
6. mode == "conversation" なら orchestrator (loom-retro-pm) に finding list を返す（1 件ずつ送り）
7. mode == "report" なら "archive 完了" メッセージのみ返して exit
8. session 完了時に `~/.claude-loom/user-prefs.json.approval_history` を user 承認結果に応じて update（presented/approved/rejected カウント）

**Output JSON schema**: archive 内容 + pending state path + (conversation mode) findings list for orchestrator。

**Tools**: Read / Edit / Write / Bash

**Commit**:
```bash
git add agents/loom-retro-aggregator.md
git commit -m "feat(agents): loom-retro-aggregator for Stage 3 archive + pending state (M0.8)"
```

### Task 15: agents/loom-retro-researcher.md

**役割**: reactive plugin/Claude latest 調査 + light proactive UX scan。

**Frontmatter**:
```yaml
name: loom-retro-researcher
description: External research lens for claude-loom retro. Reactive mode: keyword-extracts confirmed findings from pj-axis/process-axis and searches WebSearch/context7/WebFetch for related plugins, skills, Claude latest features, and best practices. Light proactive UX scan: one-shot lookup for obvious UX improvements based on SPEC + implementation summary.
model: sonnet
```

**Workflow**:
1. Stage 1 並列 dispatch 時に他 lens と並列起動、ただし他 lens の findings が出揃ってから 2 nd pass で reactive search
2. Reactive: 各 confirmed finding を keyword 化 → WebSearch で「同種課題を解く既存 plugin / skill」 / context7 で関連 library docs / WebFetch で claude.com / claude-code 公式 latest changelog
3. Light proactive UX scan: SPEC §1（プロダクト定位）+ SCREEN_REQUIREMENTS.md + 現状実装 summary を Read → 「明白な UX 改善あるか」を 1 度だけ軽量検査
4. 結果を `researcher-plugin-suggestion` / `researcher-claude-feature-replace` / `researcher-ux-improvement` finding として返す

**Output JSON schema**: 同 pj-judge、`lens: "researcher"`。各 finding に `evidence` として URL や検索 keyword を含める。

**Tools**: Read / Glob / Grep / Bash / WebSearch / WebFetch

**Commit**:
```bash
git add agents/loom-retro-researcher.md
git commit -m "feat(agents): loom-retro-researcher for reactive plugin/Claude/UX research (M0.8)"
```

### Batch 4 全体の commit 後検証

```bash
./tests/run_tests.sh agents
./tests/run_tests.sh
```

期待：agents 13 PASS（既存 6 + 7 新規 retro agents）、全体 6 PASS。

---

## Task 16: skills/loom-retro/SKILL.md 新設

**Files:** Create `skills/loom-retro/SKILL.md`

- [ ] **Step 1: ディレクトリ + SKILL.md**

```bash
mkdir -p skills/loom-retro
```

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/skills/loom-retro/SKILL.md`：

````markdown
---
name: loom-retro
description: Activate retro mode for the current claude-loom session — dispatches loom-retro-pm orchestrator which runs the 3-stage retro protocol (4-lens parallel critique, counter-argument pass, aggregation) and either presents findings conversationally or generates a markdown report. Use when /loom-retro slash command is invoked or when PM agent suggests retro after milestone completion.
---

# loom-retro

claude-loom の retro mode entry。`/loom-retro` slash command が load する prompt augmentation。

## いつ使うか

- user が `/loom-retro` で手動起動
- user が `/loom-retro --report` で report-only mode 起動
- PM agent（loom-pm）が milestone tag 設置を検出して "retro しとく？" と user 提案 → user yes で起動

## 起動 sequence

このセッションで以下を行う：

1. **mode 判定**: command の `--report` flag を確認、なければ `~/.claude-loom/user-prefs.json.default_retro_mode`（default: `"conversation"`）を採用
2. **retro_id 生成**: `<YYYY-MM-DD>-<NNN>` 形式（NNN は同日連番、`<project>/docs/retro/` 内既存 report の最大番号 +1）
3. **`loom-retro-pm` を Task tool で dispatch**:
   ```
   subagent_type: "loom-retro-pm"
   prompt: |
     [loom-meta] project_id=<from project.json> retro_id=<id> mode=<conversation|report> working_dir=<absolute path>

     ## Trigger
     <manual / milestone-hook / `--report` flag>

     ## Scope
     <milestone 単位 / 直近 N session / manual trigger 範囲>

     ## Context
     <現在の git branch + HEAD SHA + last milestone tag>
   ```
4. orchestrator の結果を待ち、user に経過報告

## 期待される orchestrator output

### conversation mode
- "M0.X retro 起動、Stage 1 並列分析中..."
- "12 findings 検出（pj-axis: N / process-axis: N / researcher: N / meta-axis: N）"
- "counter-argument で N 件 drop、N 件 confirmed"
- "archive を docs/retro/YYYY-MM-DD-NNN-report.md に保存"
- 1 件ずつ提示 → user 返答 → 次へ

### report mode
- archive 生成完了メッセージのみ
- "後で `/loom-retro-apply` で承認反映可"（M0.8 v1 では `--apply` は未実装、Phase 2 evolution）

## 関連参照

- `docs/RETRO_GUIDE.md` — retro 詳細運用 SSoT
- `docs/plans/specs/2026-04-27-retro-design.md` — 設計詳細
- `agents/loom-retro-pm.md` — orchestrator agent definition
````

- [ ] **Step 2: skills_test.sh で PASS 確認**

```bash
./tests/run_tests.sh skills
```

期待：6 PASS（既存 5 + loom-retro）。

- [ ] **Step 3: コミット**

```bash
git add skills/loom-retro/
git commit -m "feat(skills): loom-retro entry skill for /loom-retro slash command (M0.8)"
```

---

## Task 17: commands/loom-retro.md 新設

**Files:** Create `commands/loom-retro.md`

- [ ] **Step 1: slash command を書く**

`Write` tool で `/Users/kokiiphone/Documents/work/claude-loom/commands/loom-retro.md`：

```markdown
---
description: Run claude-loom retro mode — 3-stage protocol (4 parallel lens judges, counter-argument pass, aggregator) with conversation-driven findings presentation (default) or markdown report only (--report flag). Activates loom-retro skill.
---

You are entering **retro mode** in claude-loom.

Load the system prompt and behavior from the `loom-retro` skill (`~/.claude/skills/loom-retro/SKILL.md`).

## Argument parsing

- 引数なし → conversation mode（default）
- `--report` flag あり → report-only mode（archive markdown のみ生成、user 対話なし）

## Begin

1. retro_id を生成（`<YYYY-MM-DD>-<NNN>` 形式）
2. `loom-retro-pm` を Task tool で dispatch（skill の起動 sequence §3 に従う）
3. orchestrator の進捗を user に伝える
4. conversation mode なら finding 1 件ずつの提示と user 承認 loop に入る
5. report mode なら archive 完了通知して exit

## Stay in retro mode

retro session 中は user が "retro 終了" / "中断" / "保留" 等を明示するまで retro mode を維持。会話 mode の途中で session 中断した場合、`<project>/.claude-loom/retro/<retro-id>/pending.json` で resume 可。
```

- [ ] **Step 2: commands_test.sh で PASS 確認**

```bash
./tests/run_tests.sh commands
```

期待：4 PASS（既存 3 + loom-retro）。

- [ ] **Step 3: コミット**

```bash
git add commands/loom-retro.md
git commit -m "feat(commands): /loom-retro slash command (M0.8)"
```

---

## Task 18: agents/loom-pm.md milestone hook 追記

**Files:** Modify `agents/loom-pm.md`

- [ ] **Step 1: 既存 loom-pm.md を読み込み**

```bash
cat agents/loom-pm.md
```

PM agent の workflow セクション（"Implementation phase" あたり）を確認。

- [ ] **Step 2: milestone hook awareness 追記**

`Edit` で「Implementation phase」セクションの末尾、または「Workflow」セクション末尾に新サブセクションを追加：

```markdown

### Milestone retro hook（M0.8 から）

milestone tag 設置（`git tag -a m*-complete`）を検出したら、user に retro 提案：

1. tag 設置直後の commit / session で、PM はまず以下を確認：
   - `git tag -l --sort=-creatordate | head -1` で直近 tag 取得
   - `<project>/.claude-loom/project-prefs.json` の `last_retro.milestone` と比較
   - 既に当該 milestone について retro 実行済 → skip
2. 未実行なら user に提案：「M0.X 完了したで。retro しとく？」
3. user yes → `loom-retro-pm` を Task tool で dispatch（`/loom-retro` 経由 or 直接）
4. user no / 保留 → skip、次の milestone まで保留

retro 自体の orchestration は `loom-retro-pm` が引き受ける、PM はトリガと結果報告の receiver 役。
```

- [ ] **Step 3: agents_test.sh で PASS 確認**

```bash
./tests/run_tests.sh agents
```

期待：13 PASS（変更は本文のみ、frontmatter 不変）。

- [ ] **Step 4: コミット**

```bash
git diff agents/loom-pm.md
git add agents/loom-pm.md
git commit -m "feat(agents): loom-pm gains milestone retro hook (M0.8)"
```

---

## Task 19: README.md + CLAUDE.md + templates/CLAUDE.md.template 更新

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `templates/CLAUDE.md.template`

- [ ] **Step 1: README.md skill list に loom-retro 追加**

`Edit` で README の `## 利用可能な skill（M0.5 + M0.6）` セクションを `## 利用可能な skill（M0.5 + M0.6 + M0.8）` に rename し、bullet を追加：

旧の closing bullet 後ろに：
```markdown
- **loom-retro** — 4-lens 振り返り（pj-axis / process-axis / researcher / meta-axis）+ 3-stage protocol で改善提案、user 承認で適用（M0.8）
```

- [ ] **Step 2: README.md に retro ステータス行を「現在のステータス」セクションに追加**

該当文を `Read` で確認、`Edit`：

旧：
```
M1 以降の自分自身の実装は、この M0 + M0.5 + M0.6 harness を使って進める（dogfood）。Default review mode は single（1 体 reviewer）、critical path のみ trio mode に切替可。
```

新：
```
M1 以降の自分自身の実装は、この M0 + M0.5 + M0.6 + M0.8 harness を使って進める（dogfood）。Default review mode は single（1 体 reviewer）、critical path のみ trio mode に切替可。M0.8 で retro 機能（4-lens / 3-stage protocol / user-prefs / project-prefs）が加わり、milestone 完了時に振り返り → 改善提案 → 承認 → 反映のループが回る。
```

- [ ] **Step 3: CLAUDE.md ファイル配置規約を更新**

`Edit` で `agents/` 行を更新：
旧：
```
- agents/ : Claude Code subagent 定義（loom-pm / loom-developer / loom-reviewer (single mode default) / loom-{code,security,test}-reviewer (trio mode opt-in)）
```

新：
```
- agents/ : Claude Code subagent 定義（loom-pm / loom-developer / loom-reviewer (single mode default) / loom-{code,security,test}-reviewer (trio mode opt-in) / loom-retro-* (M0.8 retro 7 体)）
```

`docs/` 行のあとに新行追加：
```
- ~/.claude-loom/user-prefs.json + <project>/.claude-loom/project-prefs.json : retro 学習状態（M0.8 から）
```

- [ ] **Step 4: templates/CLAUDE.md.template も同様に更新**

`Read` で確認後、対応箇所を同様に `Edit`。

- [ ] **Step 5: コミット**

```bash
git diff README.md CLAUDE.md templates/CLAUDE.md.template
git add README.md CLAUDE.md templates/CLAUDE.md.template
git commit -m "docs(m0.8): README skill list + CLAUDE.md agents/state files reflect retro architecture"
```

---

## Task 20: スモークテスト + tag m0.8-complete

**Files:** Modify `PLAN.md`

- [ ] **Step 1: 全テスト最終確認**

```bash
./tests/run_tests.sh
```

期待：6 PASS（agents 13 / commands 4 / install 6 / skills 6 / conventions 3 / retro 3）、Failed: 0。

- [ ] **Step 2: 実環境 install.sh**

```bash
./install.sh
```

期待：14 既存 + 7 retro agents + 1 retro skill + 1 retro command = 23 件 symlink。エラーなし。

- [ ] **Step 3: 配置確認**

```bash
ls ~/.claude/agents/loom-retro-*.md | wc -l   # expect 7
ls ~/.claude/commands/loom-retro.md
find ~/.claude/skills -mindepth 1 -maxdepth 1 -name "loom-retro" -type l
```

期待：retro agent 7、retro command 1、retro skill dir 1。

- [ ] **Step 4: PLAN.md M0.8 タスクを done にマーク**

`Edit` で M0.8 セクション内 20 行を `- [ ] ... status: todo` から `- [x] ... status: done` に置換。

- [ ] **Step 5: 最終コミット + tag**

```bash
git add PLAN.md
git commit -m "docs(plan): mark M0.8 tasks done after smoke test"
git tag -a m0.8-complete -m "M0.8: Retro Architecture (賢くなる開発室の中核).

- 4 lens: pj-axis / process-axis / researcher / meta-axis
- 3-stage protocol: parallel critique → counter-argument → aggregator
- 3-file state: project.json (human-spec, immutable) + project-prefs.json (PJ scope) + user-prefs.json (user scope)
- Hybrid auto-apply: category opt-in + risk threshold + safety guardrail (auto_applicable_eligible)
- Recursive self-optimization: meta-axis observes approval patterns, proposes auto-apply expansion
- Reactive researcher + light proactive UX scan
- Modes: conversation (default) + report (--report flag)
- Trigger: manual /loom-retro + PM milestone hook

Existing M0/M0.5/M0.6/M0.7 artifacts unchanged. 6 test groups all PASS."
git tag --list
git log --oneline | head -25
```

期待：`m0.8-complete` tag 設置、過去 4 tag（m0/m0.5/m0.6/m0.7-complete）も保持。

---

## M0.8 完成基準（受入要件）

すべて満たせば M0.8 完了：

- [ ] `tests/run_tests.sh` で 6 PASS（既存 5 + retro 1）、Failed: 0
- [ ] `./install.sh` で `~/.claude/agents/loom-retro-*.md`（7 件）+ `~/.claude/commands/loom-retro.md` + `~/.claude/skills/loom-retro/` が symlink 設置
- [ ] `templates/{user-prefs,project-prefs}.json.template` が jq empty で valid + `schema_version: 1`
- [ ] `docs/RETRO_GUIDE.md` が 4 lens 名 + category enum を含む（REQ-018）
- [ ] SPEC §3.9 + §6.9.1 + §6.9.2 + §6.9.3 が retro 設計と整合
- [ ] PLAN.md M0.8 セクション全 20 タスク `[x]` `done`
- [ ] README.md + CLAUDE.md + templates/CLAUDE.md.template に retro 言及
- [ ] `git tag` に `m0.8-complete`、`m0`〜`m0.7-complete` も保持

## 次のステップ

M0.8 完成 = ハーネス完成形。M1（Daemon + Hooks Foundation）の詳細プランを別 session で `writing-plans` で生成、本番 dogfood 実装開始。M1 が完了すれば retro が daemon event を読めるようになり、Phase 2 への橋渡しが完了する。
