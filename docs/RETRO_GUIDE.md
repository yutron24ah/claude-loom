# Retro Guide

claude-loom が採用する **retro 機能** の運用 SSoT。SPEC §3.9 の policy 宣言から参照される。設計詳細は `docs/plans/specs/2026-04-27-retro-design.md`。

## 基本方針（M0.13 から、SSoT）

retro 機能の不変条件 3 項目：

- **P1**: retro = **自己改善 + PJ 改善** の両輪。claude-loom 自身の最適化 + user PJ への提案両方を扱う
- **P2**: **user は retro 参加者** — external lens じゃなく Stage 1 公式メンバー、user findings は retro-pm finding と同等扱い
- **P3**: findings は **archive じゃなく action plan 化** — 改善点洗い出し → user と着手項目決定 → 改善計画を pending state に保存。「即時適用 / milestone 化 / 保留」の 3 分類で整理。

詳細は SPEC §3.9.x（基本方針）+ §3.6.8（process discipline）。

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
  - **M0.8 v1 — Light proactive single-pass**: Stage 1 で他 3 lens と並列に 1 回 dispatch、SPEC + 実装から UX 改善 + plugin / Claude 新機能の broad keyword scan を実施。findings 0 件でも OK（水増し厳禁）
  - **Phase 2 evolution — Reactive 2-pass**: 他 lens の confirmed findings を keyword 化して関連 plugin / skill / Claude 機能を finding-driven で検索。daemon が orchestrator の Stage 1 完了を検知して researcher を再 dispatch する設計
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

#### meta-axis lens の M0.9 拡張：Customization Layer 観測

M0.9 で agent customization が導入されてから、meta-axis lens は以下も観測対象とする：

- **personality drift**: user-prefs / project-prefs の `agents.<name>.personality` がどの preset で長期使用されとるか、preset の効果実感（user 承認率と連動）を分析
- **model cost optimization**: `agents.<name>.model` 設定が token 消費 / 完了時間に与える影響を評価、過剰な opus 使用 / haiku で精度劣化等を proposal として上げる
- **custom personality drift**: ユーザー追加の `prompts/personalities/<custom>.md` が **TDD / Coding Principles を override しとらんか** をチェック、guardrail 違反は high-risk finding として上げる

これらは v1 では meta-axis lens prompt 内で「if customization state を読み取れたら」の optional として実装、v2 で daemon 経由の確実な観測に移行する。

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

## Lens tagging convention（M0.11 から）

各 lens は finding 出力 JSON に以下 field を含む：

- `target_artifact`: 文字列 enum
  - `agent-prompt`: agent 振る舞い (loom-developer / loom-reviewer 等)
  - `spec-section`: SPEC.md の特定セクション
  - `doc-file`: その他 markdown doc (README / CLAUDE / RETRO_GUIDE 等)
  - `retro-config`: retro architecture 自体 (lens disable / threshold / etc.)
- `target_agent[]`: agent 名の配列、`target_artifact == "agent-prompt"` 時のみ必須（例: `["loom-developer"]`）
- `guidance_proposal`: agent-prompt 時に prefs.learned_guidance[].guidance に書き込まれる text 候補

aggregator は user 承認後、target_artifact == "agent-prompt" の finding を該当 agent の learned_guidance[] に書き込み、それ以外は従来通り archive markdown / approval_history のみ更新。

## Freeform improvement instruction（M0.13 から、4 lens 共通）

通常 category 検出に加え、各 lens は **抽象 PJ 改善視点** として 1-3 候補を生成可：

- **三点セット必須**: 「現状 X、改善後 Y、根拠 Z」
- **`<file>:<line>` または concrete commit SHA 参照を含むこと**
- 既存 4 category 補集合的領域を優先（categorical で拾えん観点）
- **generic 禁止**: 「doc 充実」「test 増」「可読性向上」等の汎用論は禁止、必ず具体的 mechanism + concrete reference を伴う
- counter-arguer は通常通り検証、generic / vague は drop

出力 finding 例：

```json
{
  "id": "freeform-001",
  "category": "freeform-improvement",
  "severity": "medium",
  "description": "現状: PM agent prompt に user-facing greeting 統一なし / 改善後: 標準 greeting を定義 / 根拠: agents/loom-pm.md:23 のセッション開始メッセージが session ごとに異なる",
  "target_artifact": "agent-prompt",
  "target_agent": ["loom-pm"],
  "guidance_proposal": "..."
}
```

## 関連参照

- SPEC §3.9（policy 宣言）
- SPEC §3.9.9（lens tagging + learned_guidance auto-write）
- SPEC §3.6.5.4（learned_guidance 注入機構）
- SPEC §6.9.1 / §6.9.2 / §6.9.3（schemas + merge 規則）
- `docs/plans/specs/2026-04-27-retro-design.md`（設計 SSoT）
- `~/.claude-loom/user-prefs.json` + `<project>/.claude-loom/project-prefs.json`（実状態）
