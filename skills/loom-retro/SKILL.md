---
name: loom-retro
description: Retro skill for claude-loom. Activated by /loom-retro slash command or PM milestone-hook suggestion. Dispatches loom-retro-pm orchestrator which uses this skill's templates (lens / counter-arguer / aggregator) to run the 3-stage protocol via general-purpose subagents. SSoT for retro workflow + JSON output contract.
---

# loom-retro

claude-loom の **retro skill**。`/loom-retro` slash command が load する prompt augmentation + retro 全 stage の **template SSoT**。`loom-retro-pm` agent が本 skill の template を読み込み、`general-purpose` subagent + skill template injection で lens / counter-arguer / aggregator を dispatch する。

> 本 skill は `docs/AGENT_PROMPT_DESIGN.md` の **agent → skill migration** 第二号適用。旧 `loom-retro-{pj,process,meta}-judge` + `loom-retro-counter-arguer` + `loom-retro-aggregator` + `loom-retro-researcher` の 6 agents (合計 1,300 行) を本 skill に統合。詳細: `docs/SKILL_MIGRATION.md`。

## 使命

milestone から **actionable learning を抽出** し、user 承認を経て workflow / system に反映する。**self-improvement + PJ-improvement の両輪** を不変条件とする。

## いつ activate されるか

- user が `/loom-retro` で手動起動
- user が `/loom-retro --report` で report-only mode 起動
- `loom-pm` agent が milestone tag 設置 (`m*-complete`) を検出 → user に "retro しとく？" と提案 → user yes

## 起動 sequence

1. **mode 判定**: `--report` flag → report mode、なければ `~/.claude-loom/user-prefs.json.default_retro_mode` (default: `"conversation"`)
2. **retro_id 生成**: `<YYYY-MM-DD>-<NNN>` 形式 (NNN は同日連番、`<project>/docs/retro/` の既存 report 最大番号 +1)
3. **`loom-retro-pm` を Task tool で dispatch**:
   ```
   subagent_type: "loom-retro-pm"
   prompt: |
     [loom-meta] project_id=<...> retro_id=<id> mode=<conversation|report> working_dir=<absolute path>

     ## Trigger / Scope / Context
     <manual / milestone-hook / `--report` flag、対象 milestone scope、git branch + HEAD SHA + last tag>
   ```

retro-pm が以後の 3-stage protocol を本 skill の template を使って orchestrate する。

## 3-stage protocol (SPEC §3.9.3 SSoT)

| stage | 責務 | dispatch (skill template + general-purpose subagent) |
|---|---|---|
| **Stage 0** | preparation (verdict_evidence / applied_summary / command_frequency / branch hygiene / post-tag hotfix scope) | retro-pm 自身 (skill 起動 sequence) |
| **Stage 1** | 4 lens parallel critique (pj / process / meta / researcher) | 4 parallel Task calls、各 LENS_*_TEMPLATE 使用 |
| **Stage 2** | counter-argument pass | 1 Task call、COUNTER_ARGUER_TEMPLATE 使用 |
| **Stage 3** | aggregation + archive + presentation 準備 | 1 Task call、AGGREGATOR_TEMPLATE 使用 |
| **Stage 4** | presentation (conversation / report mode) | retro-pm 自身 |

## Stage 1: 4 lens parallel critique templates

### 共通 lens scaffold (全 4 lens template に embed)

```
あなたは claude-loom retro Stage 1 の <LENS_NAME> Judge。指定された scope に対して <LENS_SPECIFIC_OBSERVATIONS> を行い、findings JSON を返す。

## Context references (dispatcher が path で渡す)
- verdict_evidence_path: <path>/verdict_evidence.json (直前 milestone reviewer dispatch evidence)
- applied_summary_path: <path>/applied_summary.json (過去 retro applied finding 集約、stale prevention)
- pending_summary_path: <path>/pending_summary.json (過去 retro carryover 1+ pending finding 集約、§3.9.16 + §6.9.8)
- command_frequency_path: <path>/command_frequency.json (直近 30 日 command 頻度、data-driven prioritization)

## Applied summary 参照 (必須、SPEC §3.9.11 + §6.9.7)
finding 提案前に applied_summary を Read、過去 retro で approved + applied 済の issue は finding 化せず skip (stale re-up 防止)。部分適用なら未適用残差を明記して finding 化可。

## Pending summary 参照 + re-evaluation (必須、SPEC §3.9.16 + §6.9.8、M0.11.2 から)

pending_summary を Read し、carryover 1+ の pending finding 各々に対して **本 retro context で再評価** を行う：

- 本 retro の現 SPEC / 現 codebase / 現 git log で **still relevant** か → 新 finding として出力時 `source_pending_id: <origin_finding_id>` + `re_evaluation_verdict: "still-relevant"` set (counter-arguer + aggregator が本 retro の新 finding と同等扱い、aggregator が origin pending.json に `re_evaluated_in: <current_retro_id>` back-fill)
- 既に解消済 (state changed) → output: `re_evaluation_verdict: "expired"` (lens 判定の即時 expire、carryover_count 3-strike 待たない)
- 誤検出 / 当時の判断が間違い → output: `re_evaluation_verdict: "drop"`
- 通常 finding (pending_summary と無関係、新規) → `source_pending_id: null` + `re_evaluation_verdict: null`

**重要**: `status: "expired"` の pending_summary entry は record-only として扱う (3-strike 自動 expire 済)、re-up しない。lens が "expired" finding を新規 finding 化することは禁止 (auto-expire を override せん)。

## P4: Root cause first (SPEC §3.9.x P4 SSoT)
症状対処は再発リスク高。構造的 root cause (schema / hook / agent definition / observability mechanism) を優先検討、症状対処は最終手段。

各 finding に `proposal_type` 必須:
- `structural` (推奨): 忘れたら壊れる構造変更
- `symptomatic` (最終手段): prompt への discipline 注入 / 注意喚起 — 構造的代替を併設検討
- `record-only`: action 不要、observation として記録のみ

判別 heuristic: 「次回 retro session で context 圧縮されてもこの解決策は有効か？」が yes なら structural。

## Finding tag fields (M0.11 から、必須)
各 finding に必須:
- `target_artifact`: `"agent-prompt" | "spec-section" | "doc-file" | "retro-config"`
- `target_agent[]`: agent or skill identifier 配列、`target_artifact == "agent-prompt"` 時のみ必須
- `guidance_proposal`: `target_artifact == "agent-prompt"` 時の learned_guidance text 候補 (自然言語 ~1-2 行)

## Pending re-evaluation fields (M0.11.2 から、§3.9.16)
pending_summary 参照時 + 通常 finding 出力時 ともに必須:
- `source_pending_id`: origin pending finding id (`<origin_retro_id>:<finding_id>` 形式) or `null` (通常新規 finding)
- `re_evaluation_verdict`: `"still-relevant"` | `"expired"` | `"drop"` | `null` (通常新規 finding)

## Freeform improvement (M0.13 から、optional 1-3 件)
通常 category に加え抽象 PJ 改善視点。**三点セット必須**: 「現状 X、改善後 Y、根拠 Z」+ `<file>:<line>` or commit SHA。generic ("doc 充実" / "test 増" 等) 禁止。`category: "freeform-improvement"` で出力。

## NOT do
- 仕様改変提案しない (PM 責務)
- 直接 file 編集しない (retro-pm が user 承認後に Edit)
- counter-arguer 先取りしない (Stage 2 で別 template が verdict 付与)
```

### LENS_PJ_TEMPLATE (pj-axis lens、project-level drift detection)

```
<共通 lens scaffold、LENS_NAME=pj-axis>

## Scope
- spec-drift-doc-update — PLAN.md task status 不整合、minor doc inconsistency
- spec-drift-architectural — SPEC section の meaning が impl と乖離、structural misalignment
- readme-staleness — README claim / install instruction / feature list が実 codebase と乖離
- feature-gap — SPEC で記述された capability が agents/ skills/ commands/ install.sh に impl trace 無し

## Workflow probes
- Read SPEC.md / PLAN.md / README.md
- Glob agents/loom-*.md + Read 主要 agent definition
- Bash `git log --oneline -40` で commit history 把握、SPEC mention + PLAN milestone と cross-check
- PLAN.md の `<!-- id: ... status: todo|done -->` marker と git history の deliver 状態を verify

## Category → risk + auto_applicable_eligible mapping (v1 hardcoded、docs/RETRO_GUIDE.md §2.1)
| category | risk | auto_applicable_eligible |
|---|---|---|
| spec-drift-doc-update | low | **true** |
| spec-drift-architectural | high | false |
| readme-staleness | low | **true** |
| feature-gap | medium | false |

## Output JSON
{
  "lens": "pj-axis",
  "findings": [{ "id": "pj-NNN", "category": "...", "severity": "high|medium|low", "risk": "never|low|medium|high", "auto_applicable_eligible": bool, "file": "path:line", "description": "...", "suggestion": "...", "evidence": "git log SHA / SPEC §X.Y / PLAN.md line N", "proposal_type": "...", "target_artifact": "...", "target_agent": [...], "guidance_proposal": "..." }]
}
```

### LENS_PROCESS_TEMPLATE (process-axis lens、TDD / commit / blocker discipline)

```
<共通 lens scaffold、LENS_NAME=process-axis>

## Scope
- process-tdd-violation — test-after-impl 検出 (commit 順序が code → test になっとる)
- process-commit-prefix-correction — Conventional Commits prefix の誤り (fix vs test 違い等)
- process-commit-granularity — atomic ではない混合 commit / 過粒度 (200+ 行 / 複数 type 混在)
- process-blocker-pattern — 同 issue が 3+ session 連続で blocker 化、構造解消要
- process-permission-friction — permission 拒否多発、env / settings.json 改善余地
- process-routine-automation-opportunity — 定型作業反復、hook / permission 設定で自動化候補
- process-keybind-opportunity — 頻用操作の keybinding 改善余地

## Workflow probes
- session transcript (直前 implementation phase) + git log --oneline + reviewer JSON outputs を読み込み
- TDD 違反: commit 時系列で test_*: より feat:/fix: が先か
- commit 粒度: 1 commit の行数 / type 混在 / 論理変更単位
- blocker repetition: 同 issue 反復頻度
- command_frequency.json: 高頻度 command の friction signal

## Category → risk + auto_applicable_eligible mapping (docs/RETRO_GUIDE.md §2.2)
| category | risk | auto_applicable_eligible |
|---|---|---|
| process-tdd-violation | high | false |
| process-commit-prefix-correction | low | **true** |
| process-commit-granularity | medium | false |
| process-blocker-pattern | high | false |
| process-permission-friction | low | **true** |
| process-routine-automation-opportunity | medium | false |
| process-keybind-opportunity | low | **true** |

## Output JSON: lens="process-axis"、その他は共通 schema 同じ
```

### LENS_META_TEMPLATE (meta-axis lens、recursive self-optimization)

```
<共通 lens scaffold、LENS_NAME=meta-axis>

## Scope
- meta-auto-apply-proposal — 過去 N 件 approved + 0 件 rejected → auto-apply 候補化
- meta-lens-disable-proposal — lens 採用率 30% 未満 (rejected/presented ≥ 0.7、presented ≥ 10) → disable 検討
- meta-risk-threshold-proposal — risk: low の累積 approve 率高い → risk threshold 引き上げ

## Workflow probes
- Read ~/.claude-loom/user-prefs.json の approval_history (keyed by category or lens)
- 過去 retro の archive markdown を統計分析
- 既存 auto_apply.categories と applied finding を cross-check

## Output JSON: lens="meta-axis"、findings の id prefix は "meta-NNN"
```

### LENS_RESEARCHER_TEMPLATE (researcher lens、external research)

```
<共通 lens scaffold、LENS_NAME=researcher>

## Scope
- researcher-plugin-suggestion — 既存 Claude Code plugin or community skill が他 lens findings の pain point を解決可
- researcher-claude-feature-replace — Claude / Claude Code 新機能 (新 model / built-in tool / SDK update) が manual workflow / workaround を置換可
- researcher-ux-improvement — SPEC + 実装 proactive scan で UX 改善余地検出 (頻用操作の未 skill 化 / 冗長 UX flow / claim vs impl gap)

## Workflow
Stage 1 では他 3 lens と並列に 1-shot dispatch、reactive search (他 lens confirmed findings に対する検索) は v1 では行わず proactive single-pass のみ (Phase 2 evolution で再導入予定)。

- WebSearch / context7 / WebFetch で SPEC + impl summary から broad keyword (例: "claude code multi-agent harness retro plugin") 生成し探索
- 明確な改善余地のみ finding 化、水増し厳禁 (0 件 OK)

## Output JSON: lens="researcher"、findings の id prefix は "res-NNN"
```

## Stage 2: COUNTER_ARGUER_TEMPLATE

```
あなたは claude-loom retro Stage 2 の Counter-arguer。Stage 1 で 4 lens が出力した全 findings を input に受け、各 finding に verdict を付与して aggregator に渡す。

## Input
4 lens findings を concat した JSON array (typically 10-30 findings)。各 finding は最低限 `finding_id`, `lens`, `category`, `severity`/`risk`, `evidence` or `rationale` を含む。

## Workflow

### For each finding, attempt refutation
- **Re-read primary source**: Read で finding が cite した file/line を確認、lens が正しい section を見て conclusion を引き出したか verify
- **Search counter-evidence**: 他 file / git log / 既存 SPEC で finding を refute する根拠を探す
- **Check state changes**: 既に該当 issue が解消されとらんか current state を probe

### Assign verdict
| verdict | 基準 |
|---|---|
| `confirmed` | Evidence 複数源 (file + git log、または SPEC + impl) で裏付け、反証根拠無し |
| `for_downgrade` | Evidence 実在するが severity/risk 過大、または scope 狭い (aggregator が severity を high → medium → low → drop に 1 段下げる) |
| `for_drop` | Fully refute — evidence misread / 既に resolved / source 不在 / lens prompt 誤解 |

## Output JSON
{
  "stage": "counter-argument",
  "judgments": [
    { "finding_id": "...", "verdict": "confirmed|for_downgrade|for_drop", "rationale": "1-2 sentences citing evidence (or lack thereof)" }
  ]
}

input の全 finding が `judgments` に exactly once 現れること。confirmed でも emit (omit 禁止)。
```

## Stage 3: AGGREGATOR_TEMPLATE

```
あなたは claude-loom retro Stage 3 の Aggregator。counter-arguer の judgments + 元 findings を input に、最終 archive markdown + pending state file + learned_guidance write までを担当する。

## Workflow

### Step 1: Input 受け取り
counter-arguer の judgments + 元 lens findings を concat。

### Step 2: Filter + Downgrade
- `for_drop` → 除外
- `for_downgrade` → severity を high → medium、medium → low、low → drop に 1 段下げ
- `confirmed` → 維持

### Step 3: Tag 確認
各 finding の `target_artifact / target_agent[] / guidance_proposal / proposal_type` を確認・補完。不足 / inconsistent なら lens 出力に従って最小限の補完を行う。

### Step 3.5: Pending re-evaluation back-fill (M0.11.2 から、§3.9.16)

各 finding の `source_pending_id` + `re_evaluation_verdict` を確認、`re_evaluation_verdict: "still-relevant"` で `source_pending_id: not null` の場合：

- origin retro_id を `source_pending_id` から parse (例: `2026-05-03-001:pj-005` → retro_id=`2026-05-03-001`, finding_id=`pj-005`)
- `<project>/.claude-loom/retro/<origin_retro_id>/pending.json` を Read + Edit:
  - 該当 finding の `re_evaluated_in: <current_retro_id>` set (back-fill)
  - schema_version v3 維持、その他 field 不変
- back-fill 失敗 (origin pending.json 不在 / write 失敗) は WARN log、retro 自体は continue (durability fallback は archive markdown reconstruction、§3.9.12)

### Step 4: Auto-apply 判定
- `auto_applicable_eligible: true` + `risk: low|never` + project.json `rules.auto_apply.categories` に category 登録あり → auto-apply 対象として archive に "auto-applied" として明記、即時 file 適用
- 上記以外は user approval 待ち (pending state)

### Step 5: Archive Markdown 生成
`<project>/docs/retro/<retro_id>-report.md` に保存。下記 Archive markdown structure に従う。

### Step 6: Pending State 生成
`<project>/.claude-loom/retro/<retro_id>/pending.json` を write (schema_version=3 必須、SPEC §6.9.6 v3、必須 default 値: `applied_in: null` / `apply_history: []` / `carryover_count: 0` / `last_seen_in: <current_retro_id>` / `expired_at: null` / `re_evaluated_in: null`)。

### Step 7: Mode 分岐 (orchestrator に渡す)
- conversation mode → findings list を retro-pm に返す (retro-pm が 1 件ずつ user 提示)
- report mode → archive 生成完了通知のみ retro-pm に返す

### Step 8: approval_history 累積 increment
session 終了時、pending state file の status (approved / rejected / deferred) を sweep し ~/.claude-loom/user-prefs.json の approval_history を増分 update (per-finding state transition は retro-pm 責務、累積 increment は本 template の責務)。

## Archive markdown structure

```
# Retro Report — <retro_id>

## Summary
- Total findings (before counter-argument): N
- After counter-argument: M (confirmed K, downgraded L, dropped X)
- Auto-applied: A
- Pending user approval: P

## Findings by lens
### pj-axis
- [finding-id] severity:H category:X — description (proposal_type: structural | symptomatic | record-only)
  - target_artifact: ..., target_agent: ..., evidence: ...
  - suggestion: ...

### process-axis / researcher / meta-axis
(同形式)

## Auto-applied
- [finding-id] applied to: <path:line>, reason: <auto-apply rule>

## Action items
- [finding-id] requires user approval — proposal: <suggestion>, target: <target_artifact + target_agent>

## Approval history snapshot
- <category>: approved: N, rejected: M, deferred: X
```

## learned_guidance write logic (M0.11 から、aggregator 専)

aggregator template が **唯一の writer**。

### Write trigger
counter-arguer pass の `confirmed` + lens 出力に `target_artifact: "agent-prompt"` + `target_agent: [...]` + `guidance_proposal: "..."` が揃った finding。

### Write target
`<project>/.claude-loom/project-prefs.json` の `agents.<target_agent>.learned_guidance[]` (skill 化後は `skills.<skill-name>.<scope>.learned_guidance[]` も対象、P9 で schema 拡張)。

### Entry shape
```json
{
  "id": "<finding_id>",
  "guidance": "<guidance_proposal>",
  "origin_retro_id": "<retro_id>",
  "active": true,
  "ttl_sessions": <int>,
  "use_count": 0,
  "last_used_in": null
}
```

### Auto-prune (M0.11.1)
`ttl_sessions` カウントダウン (決定論的)、0 で `active: false` に flip。`last_used_in` は lens 参照時に update。

### Action plan section (M0.13、必須)
archive markdown 末尾に **Action Plan** section を追加、user が 1 件ずつ approve/reject する scope を整理 (target_artifact / proposal_type / 影響範囲 / next step)。

## P4: Root cause first (action plan で必須 marking)
aggregator は action plan section で finding を `proposal_type` 別に group:
- `structural` group → 推奨実装、再発リスク低
- `symptomatic` group → 警告付き提示 (構造的代替を併設提案)
- `record-only` group → observation として archive のみ

## Output JSON (orchestrator 向け)
{
  "stage": "aggregation",
  "archive_path": "<project>/docs/retro/<retro_id>-report.md",
  "pending_state_path": "<project>/.claude-loom/retro/<retro_id>/pending.json",
  "summary": { "total": N, "confirmed": K, "downgraded": L, "dropped": X, "auto_applied": A, "pending_user_approval": P },
  "findings_for_presentation": [...]  // conversation mode 用、retro-pm が 1 件ずつ提示
}

## NOT do
- 仕様改変提案しない
- user 承認前に file 直接編集しない (auto-apply は project.json 設定された category のみ)
- counter-arguer の verdict を上書きしない
- lens 出力を要約・改変しない (raw 連結)
```

## Customization Layer injection (dispatcher = retro-pm 側責務)

retro-pm が各 lens / counter-arguer / aggregator の dispatch 前に prefs を Read、対応する skill-keyed config から `personality` / `learned_guidance` を取り出して prompt に prepend：

```
[loom-meta] retro_id=<id> project_dir=<path> working_dir=<path>
[loom-customization] personality=<preset>
<preset body>
[loom-learned-guidance]
- <id>: <text>
...

<上記 template body>
```

prefs key (P9 で schema 拡張後):

| dispatch | prefs key |
|---|---|
| Stage 1 lens (pj/process/meta/researcher) | `skills.loom-retro.lenses.<pj-axis\|process-axis\|meta-axis\|researcher>` |
| Stage 2 counter-arguer | `skills.loom-retro.stages.counter-arguer` |
| Stage 3 aggregator | `skills.loom-retro.stages.aggregator` |

block 順序: `[loom-meta]` → `[loom-customization]` → `[loom-learned-guidance]` → template body

## なぜ skill か (agent やのうて)

旧 architecture は 6 retro agents (4 lens + counter-arguer + aggregator)、合計 ~1,300 行。各 agent は session を跨ぐ persistent identity を持たず、毎回 invoke される 1-shot judge ゆえ **workflow step** であり **role ではない**。skill に統合することで：

- 6 agent file 削除 → 1 skill に集約、~50% 行数削減
- lens template の共通 scaffold が visible (P4 / applied_summary / proposal_type / target_artifact は全 lens 共通)
- 新 lens / category 追加が skill 内 section 追加で済む
- Customization Layer の dispatcher injection が retro-pm の 1 path に統一

詳細: `docs/SKILL_MIGRATION.md`。

## References

- `SPEC.md §3.9` (P8 で改訂対象) — retro architecture SSoT
- `SPEC.md §6.9.5 / §6.9.6 / §6.9.7` — verdict_evidence / pending.json / applied_summary schema
- `docs/RETRO_GUIDE.md` — retro 運用 guide + P4 Root cause first 補足 + category → risk mapping
- `docs/AGENT_PROMPT_DESIGN.md` — 本 skill の設計原則
- `docs/SKILL_MIGRATION.md` — agent → skill migration 詳細
- `agents/loom-retro-pm.md` — orchestrator (本 skill を invoke + template 取得 + dispatch)
