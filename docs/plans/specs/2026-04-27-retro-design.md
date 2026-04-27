# claude-loom M0.8: Retro Architecture Design Spec

**Status**: design (brainstorming output) — awaiting user review → writing-plans 起動 → subagent-driven 実装。

**Audience**: writing-plans skill が読んで実装プランを生成する。M0.8 実装 subagent も最終 SSoT としてこれを参照。

**Companion docs（成果物として後続で作成される）**：
- `SPEC.md §3.9`（policy 採用宣言、本 design の summary）
- `SPEC.md §6.9.1 / §6.9.2`（user-prefs / project-prefs schema）
- `docs/RETRO_GUIDE.md`（lens vocabulary + category enum + 例の SSoT）

---

## 1. Goal & Scope

### 1.1 Goal

claude-loom ハーネスに **retro 機能** を追加する。retro は：
- claude-loom 管理下のプロジェクトに対して、PJ 軸（製品）+ Process 軸（仕事の進め方）+ 外部研究 + 自己最適化（meta）の 4 観点で振り返りを行う
- 結果を archive markdown + 会話で user に提示、user 承認した改善を user-prefs / project-prefs / SPEC / 各種ファイルに反映
- 「user × claude × project の組み合わせごとに動的に最適化される開発室」の中核

### 1.2 Scope（M0.8 v1）

**含む**：
- 4 lens（pj-axis / process-axis / researcher / meta-axis）のハードコード実装
- 3-stage protocol（parallel critique → counter-argument → aggregator）
- 3-file 状態管理（project.json + project-prefs.json + user-prefs.json）
- Hybrid auto-apply（category + risk）+ safety guardrail（auto_applicable_eligible）
- Reactive researcher + light proactive UX scan
- 会話駆動 mode（default）+ report mode（opt-in）
- Markdown archive + pending state file による session resume
- Manual `/loom-retro` + milestone hook trigger

**含まない（Phase 2+ で評価）**：
- 自動 schedule trigger（時間ベース）
- Lens の pluggable skill 化（`loom-retro-lens-*` skill 配布）
- daemon 駆動の event capture（M0.8 は session log + git で足りる）
- 第三者 lens エコシステム
- 自動 lens 重み学習（v1 は手動 weight + user 承認）

### 1.3 関連マイルストーン

- **依存**：M0 + M0.5 + M0.6 + M0.7（全て main にマージ済）
- **位置**：M0.8（M1 daemon の前）
- **後続**：M1（daemon + hooks）— retro が daemon event を読めるようになる

---

## 2. Architecture

### 2.1 主要コンポーネント

**Agents（7 体、全て新規）**

| agent | 役割 | tools | model |
|---|---|---|---|
| `loom-retro-pm` | retro 全体の orchestrator。session 内で 4 lens 並列 dispatch、stage 進行管理、結果を user に提示 | Read / Edit / Bash / Task / TodoWrite | opus |
| `loom-retro-pj-judge` | pj-axis 観点（SPEC drift / feature gap / UX 摩擦） | Read / Glob / Grep / Bash | sonnet |
| `loom-retro-process-judge` | process-axis 観点（TDD / review / commit / blocker） | Read / Glob / Grep / Bash | sonnet |
| `loom-retro-researcher` | reactive plugin/Claude latest 調査 + light proactive UX scan | Read / Glob / Grep / Bash / WebSearch / WebFetch | sonnet |
| `loom-retro-meta-judge` | meta-axis（auto-apply 拡張提案、lens 削除提案、approval 摩擦検出） | Read / Bash | sonnet |
| `loom-retro-counter-arguer` | 4 lens 全 findings を反証検査、揺らぐ findings を flag | Read / Glob / Grep / Bash | sonnet |
| `loom-retro-aggregator` | confirmed findings 統合、archive markdown 生成、会話 mode 提示準備 | Read / Edit / Write / Bash | sonnet |

**Skill（1 つ）**

`skills/loom-retro/SKILL.md`：retro mode への entry prompt augmentation。`/loom-retro` コマンドが load する。

**Command（1 つ）**

`commands/loom-retro.md`：slash command。引数：
- 引数なし → 会話駆動 mode（default）
- `--report` → report-only mode

### 2.2 3-stage protocol

```
[Stage 1] Parallel critique
  Task tool で 4 体並列 dispatch（1 メッセージ内）：
    ├─ loom-retro-pj-judge
    ├─ loom-retro-process-judge
    ├─ loom-retro-meta-judge
    └─ loom-retro-researcher

[Stage 2] Counter-argument pass
  loom-retro-counter-arguer が 4 体の全 findings を input として受け、
  各 finding に対して反証可能性を検査：
    - finding が反証できる → flag for_downgrade or for_drop
    - finding が反証できない → confirm

[Stage 3] Aggregator + presentation
  loom-retro-aggregator が confirmed findings を受け：
    1. 各 finding に { category, risk, auto_applicable_eligible } タグ付与
    2. meta-axis findings の auto-apply 拡張提案を組み込み
    3. archive markdown 生成 → docs/retro/YYYY-MM-DD-<retro-id>-report.md
    4. mode 分岐：
       - 会話 mode → loom-retro-pm が user に findings 1 件ずつ提示
       - report mode → archive のみ生成して exit
```

### 2.3 データフロー（v1、daemon なし）

```
session transcripts (~/.claude/projects/<sanitized>/*.jsonl)
git log + git diff
PLAN.md status (m*-tN status: todo/done/doing)
SPEC.md / README.md / CLAUDE.md 現状
agent / skill definitions
        │
        ▼
4 lens 並列分析（Stage 1）
        │
        ▼
counter-argument 検証（Stage 2）
        │
        ▼
aggregator 集約 + tagging（Stage 3）
        │
        ├─→ docs/retro/YYYY-MM-DD-<id>-report.md（archive、必ず生成）
        ├─→ <project>/.claude-loom/retro/<id>/pending.json（state、会話 mode 中の resume 用）
        ├─→ ユーザー対話（会話 mode）
        │
        ▼
user 承認 → 適用：
   - SPEC.md / PLAN.md / README.md 編集
   - user-prefs.json の lens config / approval_history / auto_apply 更新
   - project-prefs.json の lens override / auto_apply / learned_patterns 更新
   - skills 追加候補（researcher 提案）→ install 手順を user に渡す
        │
        ▼
session 完了時に archive markdown に "Auto-applied: ..." summary 追加
```

---

## 3. Trigger と Mode

### 3.1 Trigger

**手動（user 起動）**：`/loom-retro [--report]` で任意のタイミングで起動。

**Milestone hook（PM 自動提案）**：milestone tag 設置時、`loom-pm.md` が「retro しとく？」と自然に user に提案。user yes → `loom-retro-pm` を Task tool で dispatch。

PM agent が milestone hook を実装する条件：
- 直近の commit が `git tag -a m*-complete` 直前 / 直後である
- 該当 milestone について retro が未実行（project-prefs.json.last_retro.id ≠ 現在 milestone id）

### 3.2 Mode

**会話駆動 mode（default）**：
- `loom-retro-aggregator` が finding 1 件ずつ orchestrator に渡す
- `loom-retro-pm` が user に提示、口頭返答（"適用 / 却下 / 保留"）を受ける
- 採択結果を pending.json に随時保存（resume 可能）
- session 中断 → 後日 `/loom-retro` 再起動 → pending.json 読み込み → 未処理 findings から再開

**report mode（`--report` flag）**：
- archive markdown 生成のみで exit、user 対話なし
- user は markdown を読んで個別承認結果を別途記録（v1 では機械承認反映の自動化はしない、Phase 2 evolution）

**default mode 設定**：
- `~/.claude-loom/user-prefs.json.default_retro_mode` で `"conversation"` or `"report"` を user 設定可
- 設定なければ `"conversation"`

---

## 4. State 管理

### 4.1 3 ファイル責務

| ファイル | 場所 | 所有者 | retro 動作 |
|---|---|---|---|
| `project.json` | `<project>/.claude-loom/` | human / PM が宣言 | retro は **読むだけ** |
| `project-prefs.json` | `<project>/.claude-loom/` | retro が auto-update（user 承認付き） | 読み + 書き |
| `user-prefs.json` | `~/.claude-loom/` | retro が auto-update（user 承認付き） | 読み + 書き |

### 4.2 user-prefs.json schema

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
    "<category>": {
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
  "retro_session_history": [
    { "id": "2026-04-27-001", "project_id": "claude-loom-self", "completed_at": 0, "findings_count": 0 }
  ]
}
```

### 4.3 project-prefs.json schema

```json
{
  "$schema": "https://claude-loom.dev/schemas/project-prefs-v1.json",
  "schema_version": 1,
  "lenses": {
    "<lens-id>": { "weight": 1.5, "enabled": true }
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

### 4.4 Effective config 計算

retro 開始時、**project が user を field 単位で override**（project-prefs 未定義の field のみ user-prefs を fallback）：

```
effective.lenses[L]              = project_prefs.lenses[L] if defined else user_prefs.lenses[L]
                                   （field 単位 override、project の lens 個別設定が user 全体設定を上書き）

effective.auto_apply.categories  = project_prefs.auto_apply.categories if defined else user_prefs.auto_apply.categories
                                   （配列まるごと override。union ではない、PJ 固有 policy が明示優先）

effective.auto_apply.max_risk    = project_prefs.auto_apply.max_risk if defined else user_prefs.auto_apply.max_risk
                                   （同上）
```

**設計理念**：user-prefs = user の claude-loom 全体での好み（default）、project-prefs = 当 PJ の policy（override）。PJ 単位の運用方針が user グローバル設定より優先される。これにより「同 user が 2 つの PJ で異なる auto-apply policy を運用する」が自然に表現できる。

---

## 5. Auto-apply mechanism

### 5.1 Category vocabulary（v1 ハードコード）

各 lens に固定 category 集合。`docs/RETRO_GUIDE.md` で全列挙、各 agent definition でも参照。

**pj-axis lens**:
- `spec-drift-doc-update`（PLAN.md status sync、軽量）— `auto_applicable_eligible: true`
- `spec-drift-architectural`（SPEC §X 意味変更、重要）— `auto_applicable_eligible: false`
- `readme-staleness`（README 陳腐化）— `auto_applicable_eligible: true`
- `feature-gap`（仕様にあるが未実装）— `auto_applicable_eligible: false`

**process-axis lens**:
- `process-tdd-violation`（test 後追い検出）— `auto_applicable_eligible: false`
- `process-commit-prefix-correction`（CC 違反 commit 提案）— `auto_applicable_eligible: false`
- `process-commit-granularity`（commit が大きすぎ / 小さすぎ）— `auto_applicable_eligible: false`
- `process-blocker-pattern`（同種の blocker 反復検出）— `auto_applicable_eligible: false`

**researcher lens**:
- `researcher-plugin-suggestion`（既存 plugin で課題解決可）— `auto_applicable_eligible: false`
- `researcher-claude-feature-replace`（Claude 新機能で手作業代替）— `auto_applicable_eligible: false`
- `researcher-ux-improvement`（proactive UX scan）— `auto_applicable_eligible: false`

**meta-axis lens**:
- `meta-auto-apply-proposal`（auto_apply.categories 拡張提案）— `auto_applicable_eligible: false`
- `meta-lens-disable-proposal`（lens 削除提案）— `auto_applicable_eligible: false`
- `meta-risk-threshold-proposal`（max_risk 上げ提案）— `auto_applicable_eligible: false`

> v1 では `spec-drift-doc-update` と `readme-staleness` のみが `auto_applicable_eligible: true`。残りは user 承認必須。Phase 2 evolution で追加可。

### 5.2 Apply 判定アルゴリズム（pseudocode）

```python
def decide_apply(finding, user_prefs, project_prefs, lens_def):
    cat = finding.category
    cat_def = lens_def.categories[cat]

    # Safety guardrail（最強制約）
    if cat_def.auto_applicable_eligible == False:
        return ASK_USER

    # 有効 policy: project が user を field 単位 override（§4.4）
    eff_categories = project_prefs.auto_apply.categories \
                     if project_prefs.auto_apply.categories is not None \
                     else user_prefs.auto_apply.categories
    eff_max_risk = project_prefs.auto_apply.max_risk \
                   if project_prefs.auto_apply.max_risk is not None \
                   else user_prefs.auto_apply.max_risk

    # category opt-in
    if cat in eff_categories:
        return AUTO_APPLY

    # risk threshold
    if risk_level(finding.risk) <= risk_level(eff_max_risk):
        return AUTO_APPLY

    return ASK_USER
```

### 5.3 Risk levels

`never < low < medium < high`（4 段階）。

- `never`: auto_apply 完全 off（初期値）
- `low`: 軽量、自動 reverse 可能（typo / 状態 sync 等）
- `medium`: 中量、reverse 可能だがやや手間
- `high`: 重量、reverse 困難

### 5.4 Meta-axis 観察ループ

retro 毎に aggregator が approval_history（user-prefs.json）を更新：
- `presented_count++`、approve なら `approved_count++`、reject なら `rejected_count++`、defer は記録のみ

retro 開始時に meta-judge が approval_history 読み込み：

**Opt-in 提案**（`meta-auto-apply-proposal` finding 生成）：
- category C が `auto_applicable_eligible == True` AND C ∉ user.auto_apply.categories AND
- 直近 90 日 `approved_count(C) >= 5` AND `rejected_count(C) == 0`
- → finding: "Category C を auto-apply に追加？"

**Lens 削除提案**（`meta-lens-disable-proposal` finding 生成）：
- lens L の全 category 集計で `rejected_count / presented_count >= 0.7` AND `presented_count >= 10`
- → finding: "lens L は採用率 30% 未満、disable 検討"

**Risk threshold 上げ提案**（`meta-risk-threshold-proposal` finding 生成）：
- 直近の `risk: low` finding が連続 N 回（N=10 程度）approved
- → finding: "max_risk を `never` → `low` に上げて自動化対象拡大？"

---

## 6. Researcher 動作仕様（Q8 = D 採用）

### 6.1 Reactive モード

Stage 1 終了後（pj-judge / process-judge / meta-judge の findings 出揃い後）、researcher が以下を実行：
1. 各 confirmed finding を keyword 化
2. WebSearch で「同種課題を解く既存 plugin / skill」検索
3. context7 で関連 library / API ドキュメント調査
4. WebFetch で claude.com / claude-code 公式 docs の latest changelog 確認
5. 結果を `researcher-plugin-suggestion` / `researcher-claude-feature-replace` finding として aggregator に渡す

### 6.2 Light proactive UX scan

retro 1 回につき 1 度だけ追加で実行：
- SPEC §1（プロダクト定位）+ docs/SCREEN_REQUIREMENTS.md 読み込み
- 現在の実装（agents / skills / commands）を summary
- 「明白な UX 改善あるか？例：頻出操作の skill 化、UX 重複、claim と実装の乖離」を軽量検査
- 結果は `researcher-ux-improvement` finding として渡す

### 6.3 Token budget（v1）

厳密制限なし、aggregator が判断。Phase 2 で daemon 計測込みに進化予定。

---

## 7. Output artifacts

### 7.1 Archive markdown report

**場所**：`<project>/docs/retro/YYYY-MM-DD-<retro-id>-report.md`

**`<retro-id>` 形式**：`<YYYY-MM-DD>-<NNN>`（同日複数回 retro 想定の連番）

**構成**：

```markdown
# claude-loom Retro Report — <retro-id>

**Project**: <name>
**Milestone**: <m0.X> （または manual）
**Mode**: conversation / report
**Started**: <timestamp>
**Completed**: <timestamp>

## Summary

- **Total findings**: N
  - Confirmed (after counter-argument): N
  - Approved by user: N
  - Auto-applied: N
  - Rejected: N
  - Deferred: N

## Findings by lens

### pj-axis (N findings)

#### finding-001: spec-drift-doc-update [risk:low] [auto-applied]
...

### process-axis (N findings)
...

### researcher (N findings)
...

### meta-axis (N findings)
...

## Auto-applied

- spec-drift-doc-update: 8 件
- readme-staleness: 4 件

## Action items（user 承認待ち / 後日対応）

- [ ] feature-gap-001: SPEC §X に書いてある A 機能が未実装、PLAN に追加検討
- [ ] researcher-plugin-suggestion-001: vitest 検討、現在の bash test 補完用途

## Approval history snapshot

（このセクションで user-prefs.json 更新内容を提示）
```

### 7.2 Pending state file（会話 mode 中の resume 用）

**場所**：`<project>/.claude-loom/retro/<retro-id>/pending.json`

```json
{
  "retro_id": "2026-04-27-001",
  "started_at": 0,
  "mode": "conversation",
  "stage": "presenting",
  "findings": [
    { "id": "finding-001", "lens": "pj-axis", "category": "...", "status": "approved", "applied_at": 0 },
    { "id": "finding-002", "lens": "process-axis", "status": "pending" }
  ],
  "next_finding_index": 5
}
```

retro session 完了時または user "保留 (defer)" → `status: deferred` 記録。次 retro / 次 session で `/loom-retro` 再起動時に pending.json を読んで resume。

---

## 8. File structure（M0.8 v1）

```
claude-loom/
├── SPEC.md                                            [§3.9 retro adoption / §6.9.1 user-prefs schema / §6.9.2 project-prefs schema / §10 commit context update / 変更履歴 ×N]
├── PLAN.md                                            [M0.8 milestone insertion]
├── README.md                                          [retro 言及（開発規約と並列の new section、または skill list に追記）]
├── CLAUDE.md + templates/CLAUDE.md.template           [retro workflow 言及（ファイル配置規約 / 開発フロー）]
├── agents/
│   ├── loom-retro-pm.md                               [NEW orchestrator]
│   ├── loom-retro-pj-judge.md                         [NEW]
│   ├── loom-retro-process-judge.md                    [NEW]
│   ├── loom-retro-meta-judge.md                       [NEW]
│   ├── loom-retro-counter-arguer.md                   [NEW]
│   ├── loom-retro-aggregator.md                       [NEW]
│   ├── loom-retro-researcher.md                       [NEW]
│   └── loom-pm.md                                     [UPDATE: milestone hook で retro 提案]
├── commands/
│   └── loom-retro.md                                  [NEW slash command]
├── skills/
│   └── loom-retro/
│       └── SKILL.md                                   [NEW retro 起動 prompt augmentation]
├── docs/
│   ├── RETRO_GUIDE.md                                 [NEW SSoT — lens vocabulary, category enum, prefs schemas, examples]
│   └── retro/
│       └── .gitkeep                                   [NEW dir for archive reports]
├── templates/
│   ├── user-prefs.json.template                       [NEW seed for ~/.claude-loom/user-prefs.json]
│   └── project-prefs.json.template                    [NEW seed for <project>/.claude-loom/project-prefs.json]
└── tests/
    ├── REQUIREMENTS.md                                [REQ-015..018 追加]
    └── retro_test.sh                                  [NEW validates prefs schemas + RETRO_GUIDE.md presence]
```

`install.sh` は既存 glob `agents/loom-*.md`, `commands/loom-*.md`, `skills/loom-*/` で新ファイル群を自動 pickup → 変更不要。

---

## 9. REQ 追加（v1）

| REQ | 内容 | テスト |
|---|---|---|
| REQ-015 | `skills/loom-retro/SKILL.md` valid frontmatter | 既存 `skills_test.sh` 自動カバー |
| REQ-016 | 7 つの `agents/loom-retro-*.md` valid frontmatter + `loom-` prefix | 既存 `agents_test.sh` 自動カバー |
| REQ-017 | `templates/{user-prefs,project-prefs}.json.template` jq empty valid + 必須 schema_version フィールド存在 | `tests/retro_test.sh`（新規） |
| REQ-018 | `docs/RETRO_GUIDE.md` 存在 + 非空 + lens vocabulary（4 lens 名）+ category enum 列挙あり | `tests/retro_test.sh`（新規） |

---

## 10. Phase 2 evolution path

| 段階 | 配置 | 効果 |
|---|---|---|
| **M0.8 v1** | 4 lens ハードコード（agent definition + RETRO_GUIDE に固定 category） | retro 機構成立、価値検証 |
| **Phase 2** | 4 lens を独立 skill 化（`skills/loom-retro-lens-{pj,process,researcher,meta}/`）、第三者 lens（例 `loom-retro-lens-security`）も add 可、meta-judge が `lens 削除` を skill uninstall まで自動化、daemon が事前 event 集計 | pluggable エコシステム成立、user × PJ × 状況の極限最適化 |

Phase 2 への移行コストを最小化するため、M0.8 v1 でも lens 定義は **agent definition + RETRO_GUIDE.md の 2 箇所** に集約。後で skill 化する時、各 lens の category list + analysis logic + tools list を `skills/loom-retro-lens-X/SKILL.md` に切り出し → agent → skill の構造変換のみで済む。

---

## 11. 実装プラン構造（writing-plans skill への hint）

M0.8 は **過去の M0.X polish より大きい**（7 agents + 1 skill + 1 command + 2 prefs templates + RETRO_GUIDE + retro_test + SPEC §3.9/§6.9.1/§6.9.2 / PLAN / README / CLAUDE.md / 既存 loom-pm.md update）。

**Parallel 実行余地**（writing-plans が batch 編成する際の hint）：
- 7 agent definitions は互いに **依存なし、並列に Write 可**
- 2 prefs templates は依存なし
- `RETRO_GUIDE.md` と SPEC §3.9 は重複コンテンツなしで分担可（SPEC = policy 宣言、GUIDE = 詳細）
- `retro_test.sh` は templates が landed していれば独立実装可

**Sequential 制約**：
- SPEC §6.9.1/.2 schema 確定 → templates 実装（schema 整合性）
- `RETRO_GUIDE.md` の category enum 確定 → agent definitions の category 言及（整合性）
- 全 agent definitions + skill + command landed → smoke test + tag

**推奨 batch 編成**（writing-plans がより細かく決める）：
1. **Batch 1**：SPEC §3.9 / §6.9.1 / §6.9.2 + PLAN.md M0.8 milestone（3 commits、SPEC が後続の SSoT）
2. **Batch 2**：`RETRO_GUIDE.md` + REQ-015/016/017/018 + `retro_test.sh` skeleton（doc 化 + TDD red、3 commits）
3. **Batch 3**：**parallel** — 2 prefs templates + retro_test.sh GREEN（並列 subagent dispatch 可、3 commits）
4. **Batch 4**：**parallel** — 7 agent definitions（同時に subagent 7 体並列実装、7 commits）
5. **Batch 5**：skill + command + `loom-pm.md` 更新 + smoke + tag（4-5 commits）

Batch 4 が最大の並列化機会。subagent-driven-development skill の "Don't dispatch multiple implementation subagents in parallel (conflicts)" 警告を考慮：各 agent definition は完全に独立したファイルで shared state なし → 並列 OK と判断（writing-plans が判断詳細化）。

---

## 12. Open questions（writing-plans / 実装段階で詰める）

- `loom-retro-pm` agent の system prompt 詳細（特に会話 mode の 1 finding ずつ提示プロトコル）
- `loom-retro-aggregator` の counter-argument 結果取り込みロジック（confirmed / downgraded / dropped の境界）
- pending.json schema の細部（finding ID 形式、sub-tasks のネスト等）
- `loom-pm.md` の milestone hook 実装（git tag 検出 vs PLAN.md status: done 検出）
- archive markdown のテンプレ細部
- `tests/retro_test.sh` の検証項目を REQ-017/018 から具体化

---

## 13. 受入要件サマリ

M0.8 完成判定：
- [ ] `tests/run_tests.sh` で 6 PASS（既存 5 + retro 1）、Failed: 0
- [ ] `/loom-retro` 起動 → 4 lens 並列分析 → counter-argument → aggregator → 会話 mode で findings 提示が手元で動く
- [ ] `/loom-retro --report` 起動 → markdown archive のみ生成
- [ ] `~/.claude-loom/user-prefs.json` と `<project>/.claude-loom/project-prefs.json` が schema valid + retro 後に更新される
- [ ] meta-judge が approval_history を観察し、3 種類の提案 finding（auto-apply opt-in / lens disable / risk threshold up）を生成する logic が実装済
- [ ] `tag m0.8-complete` 設置、`m0-complete` / `m0.5-complete` / `m0.6-complete` / `m0.7-complete` も保持
