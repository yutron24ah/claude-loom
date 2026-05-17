# retro-system (topic spec)

> 本 file は claude-loom SPEC の topic spec。master は [SPEC.md](../SPEC.md)、用語表 / 確定済み技術判断 / SSoT 原則は master を参照。
>
> § 番号は本 file 内で local。cross-file 参照は `spec/<other-topic>.md §X.Y` 記法 (master SPEC §3.11.4 SSoT)。
>
> 最終更新: 2026-05-17 (M0.X-spec-plan-multi-file-dogfood で master SPEC §3.9 から migration)

## 1. Retro 機能（M0.8 から有効、M0.X で skill-centric architecture へ移行）

claude-loom は **retro 機能** をハーネスの中核に組み込む。詳細設計は `docs/plans/specs/2026-04-27-retro-design.md`、運用 SSoT は `docs/RETRO_GUIDE.md`、template SSoT は `skills/loom-retro/SKILL.md`。

**Architecture (skill-centric、`docs/SKILL_MIGRATION.md` で migration 詳細)**:

- **`loom-retro-pm` agent (persistent role)** — retro session orchestrator、`/loom-retro` で起動、Stage 0 file build + Stage 4 presentation を直接担当、Stage 1-3 は skill template を read して `general-purpose` subagent に inject する形で dispatch
- **`skills/loom-retro/SKILL.md`** — Stage 0-3 protocol + 4 lens template (LENS_PJ / LENS_PROCESS / LENS_META / LENS_RESEARCHER) + COUNTER_ARGUER_TEMPLATE + AGGREGATOR_TEMPLATE の SSoT
- **lens / counter-arguer / aggregator は agent file を持たない** (skill template として codify)、旧 `loom-retro-{pj,process,meta}-judge` + `loom-retro-counter-arguer` + `loom-retro-aggregator` + `loom-retro-researcher` の 6 agent file は本 architecture 移行で削除

### 1.x retro 基本方針（M0.13 から、SSoT）

retro 機能は以下 3 原則を不変条件とする：

- **P1**: retro = retrospective、**自己改善（claude-loom 自身の workflow / agent prompt 最適化）+ PJ 改善（user の PJ への提案・改善）の両輪が基本目的**
- **P2**: **user は retro 参加者**（external lens じゃなく Stage 1 内に正式組込）、user findings は retro-pm finding と同等扱い
- **P3**: retro = 改善点洗い出し → **action 化** → 計画立てる、findings は archive じゃなくて actionable plan に。user と着手項目を決定し、改善計画を pending state に保存
- **P4**: **Root cause first**（retro 2026-05-02-002 meta-NEW-1 起源、user 由来）— **症状対処（discipline 注入 / 注意喚起 / prompt 強化）は再発リスクが高い**。常に構造的 root cause（schema / hook / agent definition / observability mechanism）を優先検討、症状対処は明示的に「次回も忘れる前提で書く」最終手段とする。finding 提案時は `proposal_type` field（`symptomatic` / `structural` / `record-only`）で区別を明示。symptomatic 採用時は **構造的代替の併設**（後で symptomatic patch を rollback できる structural 機構） を試みる。

### 1.1 retro の役割

PJ 軸（製品）+ Process 軸（仕事の進め方）+ 外部研究 + 自己最適化（meta）の 4 観点で振り返り → archive markdown + 会話で user に提示 → 承認された改善を user-prefs / project-prefs / SPEC / 各種ファイルに反映。「user × claude × project の組み合わせごとに動的最適化される開発室」を実現する。

### 1.2 4 lens 構成 (skill templates、`skills/loom-retro/SKILL.md` SSoT)

| lens identifier | skill template | 観点 | データ source |
|---|---|---|---|
| `pj-axis` | LENS_PJ_TEMPLATE | SPEC drift / feature gap / UX 摩擦 | SPEC / PLAN / README / git log / agent definitions |
| `process-axis` | LENS_PROCESS_TEMPLATE | TDD / review / commit 粒度 / blocker / permission friction / 自動化機会 | session transcripts / git log / reviewer JSON / command_frequency.json |
| `researcher` | LENS_RESEARCHER_TEMPLATE | plugin / Claude latest / UX best practice | WebSearch / context7 / WebFetch（reactive + light proactive） |
| `meta-axis` | LENS_META_TEMPLATE | auto-apply 拡張提案 / lens 削除提案 / risk threshold 提案 | 過去 retro outputs / user-prefs.json / approval 履歴 |

各 lens は agent file を持たず、retro-pm が skill から template を read → `general-purpose` subagent + template injection で dispatch する。

### 1.3 3-stage protocol

1. **Parallel critique**: 4 lens template (LENS_PJ / LENS_PROCESS / LENS_META / LENS_RESEARCHER) を retro-pm が 1 message 内 4 parallel Task calls で dispatch
2. **Counter-argument pass**: COUNTER_ARGUER_TEMPLATE を retro-pm が 1 Task call で dispatch、各 finding に verdict (confirmed / for_downgrade / for_drop) 付与
3. **Aggregator**: AGGREGATOR_TEMPLATE を retro-pm が 1 Task call で dispatch、confirmed findings 統合 → archive markdown 生成 → user 提示

### 1.4 Trigger

- 手動: `/loom-retro [--report]` で任意の起動
- Milestone hook: tag 設置後、PM agent が「retro しとく？」と user に提案

### 1.5 Mode

- 会話駆動 mode（default）: PM agent が finding 1 件ずつ提示、user が口頭返答
- report mode（`--report` flag）: archive markdown のみ生成して exit

### 1.6 State 管理

3 ファイル分離（責務独立）：
- `<project>/.claude-loom/project.json` — human spec、retro は読むだけ
- `<project>/.claude-loom/project-prefs.json` — retro auto-update（PJ 学習状態）
- `~/.claude-loom/user-prefs.json` — retro auto-update（user 横断学習）

merge 規則: project が user を field 単位 override（PJ 固有 policy が user グローバル設定を上書き）。schema 詳細は §6.9.1 / §6.9.2。

### 1.7 Auto-apply mechanism

各 finding は `category` + `risk` + `auto_applicable_eligible` を持つ。`safety guardrail`（`auto_applicable_eligible: false` は always ASK_USER）+ `category opt-in`（user 明示承認）+ `risk threshold`（`max_risk` 以下を自動）の 3 段判定。

### 1.8 Recursive 自己最適化（meta-axis）

retro 自身が承認パターンを観察 → 「category X 連続承認、auto-apply 拡張？」「lens Y 採用率低い、disable？」「max_risk 上げる？」を proposal finding として user に提示。承認されれば user-prefs / project-prefs に反映、次 retro 以降適用。

### 1.9 lens tagging + auto-write to learned_guidance（M0.11 から）

retro 4 lens template (LENS_PJ / LENS_PROCESS / LENS_META / LENS_RESEARCHER) は finding 出力に以下 field を含む：

- `target_artifact`: enum `agent-prompt | spec-section | doc-file | retro-config`
- `target_agent[]`: array of agent or skill identifier strings、agent-prompt 時必須
- `guidance_proposal`: agent-prompt 時の注入 text 候補

AGGREGATOR_TEMPLATE は user 承認後、`target_artifact == "agent-prompt"` の finding を以下に書き込む：

- agent-keyed (`loom-pm` / `loom-developer` / `loom-retro-pm`): `agents.<target>.learned_guidance[]`
- skill-keyed (`loom-review.strategies.<single|trio.<aspect>>` / `loom-retro.lenses.<lens>` / `loom-retro.stages.<counter-arguer|aggregator>`): `skills.<target>.learned_guidance[]`

詳細は `docs/RETRO_GUIDE.md`。

### 1.10 verdict_evidence 保存（M2.1 から）

retro session 開始時、`loom-retro-pm` agent は **直前 milestone の reviewer dispatch evidence を `<project>/.claude-loom/retro/<retro_id>/verdict_evidence.json` に保存する**。「review skip」と「指摘ゼロ pass」を retro 中 / 後の audit で機械的に区別可能にするための discipline 機構（M0.13 retro discipline の延長、proc-003 finding 起源）。

**責務 / write timing**:
- **書込主体**: `loom-retro-pm` (Stage 0、retro_id 採番直後 / Stage 1 dispatch 前)
- **build 戦略**: lazy build — git log（永続）+ session transcript（reviewer JSON ref）+ commit message を遡って合成
- **読込主体**: 4 lens (Stage 1)、特に process-axis lens が「review skip vs pass」audit に使用
- **PM hint**: `loom-pm` agent は milestone tag 設置時、**final report に reviewer JSON 取得 reference を残す**（dispatch 時の task_id / commit SHA / reviewer agent name）。retro-pm の lazy build accuracy 補強用、PM 自身は file write しない

**schema**: §6.9.5 (zod 完全定義)

**保存 path 規約**: `<project>/.claude-loom/retro/<retro_id>/verdict_evidence.json`（retro session 単位の per-instance file、prefs と分離）

### 1.11 Lifecycle Tracking Architecture（M0.11.1 から）

retro 機能の **finding lifecycle + guidance lifecycle** を構造的に追跡する mechanism。SPEC §3.9.x P4 (Root cause first) の理想形：M3.0 retro 由来の symptomatic patch（proc-NEW-1 counter-arguer stale finding detection section）を本 architecture で構造的に置換、symptomatic patch を rollback する cleanup loop の最初の実例。

**責務 / write timing**:
- **書込主体**:
  - `pending.json.<finding>.applied_in` + `apply_history`: aggregator（or PM 中継時 retro-pm）が apply commit 時に update
  - `applied_summary.json`: `loom-retro-pm` が Stage 0 lazy build（retro_id 採番直後 / Stage 1 dispatch 前）
- **build 戦略**: Lazy build — retro-pm Stage 0 で過去 retro session の `<project>/.claude-loom/retro/*/pending.json` を scan、applied finding 集約 → `<project>/.claude-loom/retro/<retro_id>/applied_summary.json` write。M2.1 §6.9.5 verdict_evidence.json と同 pattern（**retro file architecture = file 永続 + lazy read by lens** SSoT 統一）。
- **読込主体**: 4 lens（Stage 1）、特に「過去 retro で applied 済 finding を re-up しない」stale prevention に使用。lens は agent prompt prefix で渡された `applied_summary_path` を `Read` tool で参照、必要時のみ load（C2 design 確定）。
- **rollback discipline**: M3.0 retro proc-NEW-1（counter-arguer stale check）は本 architecture 完成時 **rollback 必須**（M0.11.1 task list 内 mandatory）、SPEC §3.9.x P4「symptomatic patch 構造解決後の消滅」理想形 archive 例。

**apply commit 時の back-fill 責務**（2026-05-06 retro F-pj-002 + F-meta-003 由来 SSoT）:

`<project>/.claude-loom/retro/<retro_id>/pending.json` の `applied_in` + `apply_history` field は **apply 実行主体が書込責任**を持つ：

- **path 1 (in-session apply)**: `loom-retro-pm` が会話 mode で finding 1 件ずつ user 承認 → 即時 apply する場合、retro-pm が apply commit 直後に該当 finding の `applied_in` (commit_sha + apply_type + applied_at) と `apply_history[]` (entry append) を update。`loom-retro-pm` 自身が write 主体
- **path 2 (out-of-session apply)**: archive markdown のみ生成 (report mode) → 後日 apply commit する場合、apply 実行主体（typically `loom-pm` or 直接の dev session）が apply 完了後に該当 retro_id の pending.json を Read + 更新 + Write で back-fill。Phase 2 で `/loom-retro-apply` 実装予定だが、**v1 では apply 実行主体の手動 back-fill 責務**として SSoT 化
- **schema_version v2 必須**: back-fill 時 `schema_version: 2` field を維持、`applied_in: null` → `{commit_sha, apply_type, applied_at}` に更新、`apply_history: []` に entry append
- **back-fill 検証**: 次回 retro session の Stage 0 で `applied_summary.json` lazy build 時、`applied_in: null` のまま `status: "approved"` の finding を検出 → WARN log + applied_summary build は continue（mechanical SSoT drift detection）

**未 back-fill 時の影響**: `applied_summary.json` 機械的 build 時に approved+applied 済 finding が漏れ、4 lens が同 finding を re-up する echo-chamber risk。本 SSoT は M0.11.5 retro 2026-05-05-001 の 14 finding 全採用 (commit ffd3848) で発生した **back-fill missing drift** を構造的に塞ぐ。

**schema**:
- `pending.json` 完全 schema: §6.9.6（schema_version 1 → 2 で `applied_in` + `apply_history` field 追加）
- `applied_summary.json` 完全 schema: §6.9.7

**保存 path 規約**:
- `<project>/.claude-loom/retro/<retro_id>/pending.json`（既存、`applied_in` + `apply_history` field 追加）
- `<project>/.claude-loom/retro/<retro_id>/applied_summary.json`（新設、retro session 単位の per-instance file）

### 1.12 Retro state durability（2026-05-04 retro F-meta-002 由来）

`<project>/.claude-loom/` は `.gitignore` 対象 (local-only)、M5 t5 の incident で `.claude-loom/retro/` が削除されると過去 retro pending.json が消失、`applied_summary` build 不能（graceful skip は症状対処）。下記 durability mechanism を SPEC SSoT 化：

- **archive markdown SSoT**: `<project>/docs/retro/<retro_id>-report.md` は git-tracked、過去 retro の findings + applied/recorded status を可読形式で永続保存。これは M0.8 から既存の機構、本 SPEC 改訂で **retro state durability の primary SSoT** として位置付け
- **pending.json は cache layer**: `.claude-loom/retro/*/pending.json` は archive markdown から **再生成可能な cache** として扱う、消失時は archive markdown から reconstruct (manual or M0.11.2 milestone で auto reconstruction logic 導入候補)
- **retro-pm Stage 0 fallback**: applied_summary build 時 pending.json 不在なら graceful skip + WARN 出力、archive markdown scan による applied/recorded status 抽出は **M0.11.2 milestone で導入候補** (本 SPEC では durability boundary を define するのみ、reconstruction logic は別 milestone)
- **uninstall.sh との関係**: `--purge-state` flag で `.claude-loom/` 削除しても archive markdown は残存、retro 履歴の git-tracked SSoT を user に保証

### 1.13 Degraded synthesis protocol（2026-05-04 retro F-meta-005 由来 + 2026-05-06 F-meta-001 で probe 強制化 + persistence escalation）

Task tool unavailable 時 (degraded mode) に retro-pm が 4 lens dispatch 不能、自前で synthesis する flow が ad-hoc。下記 protocol を SPEC SSoT 化：

- **degraded mode probe 強制化** (2026-05-06 F-meta-001): retro-pm Stage 0 開始時に **必ず `ToolSearch select:Task` を走らせる**、空結果 → degraded mode 自動 enter（手動 verbal fallback 宣言を不要化）。本 protocol は agent definition (`agents/loom-retro-pm.md`) の Stage 0 hook として codified
- **degraded mode 検出**: retro-pm session 開始時 Task tool 利用可否 check、不可 → degraded mode 突入を user に明示宣言
- **synthesis 自前実施**: retro-pm が 4 lens (pj-axis / process-axis / meta-axis / researcher) の責務を sequential 実行、各 lens の prompt 規約 (RETRO_GUIDE.md §1) を self-apply
- **echo-chamber risk acknowledge**: 通常 protocol の 4 並列 lens + counter-arguer 別 agent による echo-chamber 抑制が degraded mode では適用されず、findings は **retro-pm 単一視点の synthesis**。confidence は通常 retro より低めに評価
- **findings tag 必須**: degraded mode 由来 findings は全て `degraded_mode_synthesis: true` field を含む、user に透明化
- **archive markdown disclosure**: archive markdown 末尾に "degraded-mode-synthesis disclosure" section を必須記載、findings の confidence について user に明示
- **schema_version 出力規律**: retro-pm が pending.json を新規 write する時 `schema_version: 2` 必須 (§6.9.6 v2、§6.9.6.1 SSoT 統一表組参照)、`schema_version: 1.0.0` 等の semver 形式 / v1 形式 出力は invalid (本 retro session で発生した bug の codify)
- **persistence escalation rule** (2026-05-06 F-meta-001): degraded mode が **3 retro 連続持続** したら本 §1.13 の review 必須。Task tool 復旧条件 (Claude Agent SDK env 制約 / harness 起動 mode 制約) を user + meta lens で再評価、agent definition update or workaround codify を進める

#### 1.13.1 3-strike trigger 後の必須 action items（2026-05-06-002 retro F-proc-003 由来、SSoT）

degraded mode が 3 retro 連続持続して escalation rule が trigger された時点で、retro-pm + PM 連携で下記 action を必須執行する：

1. **path C default 昇格の追認**: spec/harness.md §4.7 path C default 反転 (2026-05-06) を SSoT として確認、「degraded」呼称を内部 detection 用語に縮退、user 向け呼称は **first-class operating mode** へ正規化（path C は abnormal fallback ではなく Claude Agent SDK 環境での通常運用 mode）
2. **subordinate research task 起票** (HARD blocker ではなく Phase 内並行調査): Task tool availability の Claude Code 公式 API upstream 調査を `docs/research/task-tool-availability.md` に新設し、Phase の中で並行で進める。完了は milestone closure / Phase 移行の HARD blocker にしない
3. **probe 標準化の再確認**: agents/loom-retro-pm.md の `Degraded mode protocol` section に `ToolSearch query="select:Task" max_results=1` の標準 probe 手順が明記されとるか audit、不明なら更新
4. **archive 透明化**: 該当 retro archive markdown 冒頭に `escalation_status: 3-strike-trigger-N回目` を必須記載、user に escalation 進行を可視化
5. **synthesis confidence 注釈**: 3-strike 達成 retro の findings は通常 retro より一段 confidence を下げて評価、approval flow で user に明示

**rationale**: 2026-05-05-001 / 2026-05-06-001 / 2026-05-06-002 の 3 連続 degraded mode 発生で 1 回目 trigger 達成、本 subsection が初適用 case。Phase 2 entry を blocker で留めるよりも path C を first-class 化して進行を維持し、Task tool 復旧調査は subordinate research として並行で進める判断 (累積 evidence: M0.11.5 6/6 dispatch 全部 path C で pass、運用 fit 立証済)。

#### 1.13.2 N-strike persistence count tracking（retro 2026-05-06-003 F-meta-001 由来）

3-strike trigger 達成後も degraded mode が持続する場合、escalation status を **N-strike-continuation form** で継続記録する。本 subsection で transparency tracking を SSoT 化：

**escalation_status field 表記 (pending.json + user-prefs.json retro_session_history 共通)**:

| 状態 | 表記 example | 意味 |
|---|---|---|
| 1〜2 retro 連続 | `1-strike` / `2-strike` | accumulating (3-strike trigger 未達) |
| 3 retro 連続 (初 trigger) | `3-strike-trigger-1st` | 初 trigger、§1.13.1 必須 action 5 項目発動 |
| 4 retro 連続以降 | `4-strike-continuation` / `5-strike-continuation` / ... | trigger 後の持続記録 (transparency) |

**記録方法**:
- `pending.json` の root level に `escalation_status` field を retro-pm が write する (既存 schema_version 2 に追加)
- `~/.claude-loom/user-prefs.json` の `retro_session_history[].escalation_status` field に同値を mirror (aggregator が session 完了時 update)

**future trigger 候補 (codify、未発動)**:

- **6-strike continuation**: 6 retro 連続持続したら、Task tool 復旧調査 (`docs/research/task-tool-availability.md`) を **HARD blocker promotion 検討 trigger** とする。3-strike では subordinate research に留めたが、6-strike では Phase 移行 blocker として user 判断仰ぐ。**未発動、現時点では future codify**
- **9-strike continuation**: 9 retro 連続持続したら、path C default を **正規 default** として spec/harness.md §4.7 から「default 反転 (2026-05-06)」のような暫定的呼称を除去、運用は first-class operating mode と完全 codify

**rationale**: 2026-05-05-001 (1-strike) → 2026-05-06-001 (2-strike) → 2026-05-06-002 (3-strike-trigger-1st) → 2026-05-06-003 (4-strike-continuation) の累積で escalation rule の運用が始まった。trigger 後の transparency が無いと「1 度発動したらそれっきり」になり、Phase 2 entry や Task tool 復旧 timing の判断材料が失われる。本 codify で N-strike continuation を継続可視化、6+ で blocker promotion 議論を可能化する。

**guidance lifecycle 統合**:
`learned_guidance` の auto-prune rule（§6.9.4 末尾拡張参照）: `ttl_sessions` main（`null` = infinite default、`> 0` = N retro 後 auto-deactivate） + `last_used_in` audit（retro 参照時 aggregator update、N session 連続未使用 → meta lens stale guidance finding）。責務分離: auto-deactivate = 決定論的（ttl）、user 承認 prune = dynamic（last_used_in 経由 meta lens proposal）。

### 1.14 Carryover escalation rule（2026-05-06 retro F-proc-004 由来）

retro carryover findings (前 retro で defer された pre-existing test failures や architectural debt) が無期限残置されると carryover の意味が薄れ、**累積負債が milestone 進行を silent に阻害**する構造的 risk。下記 escalation rule を SPEC SSoT 化：

- **carryover 検出**: retro-pm Stage 0 で `applied_summary.json` build 時、`status: "deferred"` の finding を origin_retro_id 別に集計
- **連続未解決 count**: 同 finding が **3 retro 連続 deferred** state で残置されとる場合（applied_summary 内の `applied_in: null` + `status: "deferred"` が 3 retro 連続）、retro-pm Stage 1 dispatch 前に PM agent に escalation event を発火
- **escalation 必須 action**: 発火時、PM agent は user に「以下 N 件 carryover finding が 3 retro 連続未解決、専用 fix milestone (M0.X-debt-cleanup 仮称) を PLAN.md に insert すべき」と提案し、user 承認後 PLAN.md insertion を必須化
- **専用 fix milestone scope 例**: `M0.X-test-debt-cleanup` (pre-existing test failures cluster fix)、`M0.Y-spec-drift-cleanup` (累積 SPEC drift 一括 reconcile)、`M0.Z-doc-consistency-cleanup` (DOC_CONSISTENCY_CHECKLIST 自動化前段の手動 sweep)
- **目的**: carryover の意味回復 (defer ≠ 無視)、累積負債を milestone scope に格上げして可視化、Phase 2 移行前の cleanup loop 起動

**M0.11.5 retro 適用 case**: pre-existing test failures 3 件 (`docs_release_test.sh` / `dry_run_applied_summary_test.sh` / `m1_docs_test.sh`) は M0.X 系列で 3 retro 連続 carryover、本 retro F-proc-004 で escalation rule が適用された初例。専用 fix milestone は本 retro 後の PLAN.md insertion で対応。

### 1.15 Command frequency probe (data-driven retro context)（2026-05-06-002 retro F-USER-004 由来）

retro architecture を data 駆動化し、Phase 2 candidate prioritization に reality data を提供するための probe 機構。

- **collection**: `hooks/post_tool.sh` 内で `tool_name == "SlashCommand"` を check、command name を `~/.claude-loom/command-frequency.log` に append。format `<unix_ms> <session_id> <command_name>` の 1 line / event
- **opt-out**: `LOOM_NO_FREQUENCY_LOG=1` env 経由で session 単位 disable (privacy concern 用)、`LOOM_FREQUENCY_LOG=<path>` で log path override 可能
- **lifecycle**: log は append-only、size cap / rotation は M4 doc consistency engine の collateral として後続 codify (本節時点では simple text log)
- **retro Stage 0 拡張**: `loom-retro-pm` が verdict_evidence + applied_summary build に続き、command-frequency.log を直近 N 日分集計 → 4 lens の Stage 1 dispatch prompt に context 注入。lens 側は invocation pattern (e.g., `/loom-spec` 高頻度 + `/loom-go` 低頻度 = spec phase ceremony 過剰の signal) を Phase 2 candidate prioritization 軸として活用
- **責務分離**: probe 自体は post_tool hook の bash 内で完結 (daemon 経由不要、daemon 停止時も収集継続可能)。集計・lens 注入は retro-pm Stage 0 の Read tool 経由
- **目的**: Phase 1 までの retro は code state + git log を主 evidence としていたが、user 行動 (どの slash command を何回使うか) という reality data の欠落で「使用頻度が低い command を rich 化」のような誤った prioritization を生むリスクがあった。frequency log 導入で reality data 駆動の prioritization を可能化
- **silent failure 検出強化 (retro 2026-05-06-003 F-meta-004 由来)**: `~/.claude-loom/command-frequency.log` 不在時、retro-pm Stage 0 は **空 tally で proceed するだけでなく warning log を出力** (`log_warn "command-frequency.log not found at <path>; post_tool hook may not be wired or LOOM_FREQUENCY_LOG override mismatched"`)。post_tool hook が actual 発火しとるかを Bash で path 検証 (`ls -la ~/.claude-loom/command-frequency.log` 等)、log 不在が連続検出される場合は M0.X-hook-ingest-recovery scope の post_tool hook investigation task を retro-pm が PM に escalation 提案する
- **SDK input 依存 (retro 2026-05-06-004 F-pj-007 由来、α post-tag t6 fix で actual 解決)**: command name 抽出は Claude Code SDK の **stdin JSON input** から `.tool_name` + `.tool_input.command` を `jq` parse する path が primary (REQ-057)。env var (`CLAUDE_TOOL_NAME` / `CLAUDE_TOOL_INPUT_COMMAND` / `CLAUDE_TOOL_INPUT`) は **fallback chain** として残置 (test invoke / interactive 起動時の compat)、SDK が env var を set せん仕様で env-only path は永久 false negative になる。`hooks/post_tool.sh` 実装は `if [ ! -t 0 ]; then HOOK_STDIN=$(cat); fi` で stdin 利用可能時のみ read、`jq` 不在環境では env var fallback に degrade。CMD_NAME=`unknown` log entries は SDK env var が set されとらん環境 (= 通常の Claude Code session 経由 invoke) を示す signal、stdin reading 経由なら command name が正常に extract される

### 1.16 Pending Lifecycle Architecture（M0.11.2 から、retro 2026-05-03-001 meta-003 由来）

M0.11.1 で確立した **applied finding lifecycle tracking** (§1.11) の **pending side 拡張**。`status: pending` のまま carryover される finding が permanent に積み上がる pattern を構造的に解決する。retro origin: `docs/retro/2026-05-03-001-report.md` finding meta-003 ("'pending として宙ぶらりん状態' が permanent 積み上がる")。

**責務 / write timing**:
- **書込主体**: `loom-retro-pm` が Stage 0 で lazy build (verdict_evidence + applied_summary + command_frequency に続く 4 件目の Stage 0 file)
- **読込主体**: 4 lens template (`skills/loom-retro/SKILL.md` § LENS_PJ / LENS_PROCESS / LENS_META / LENS_RESEARCHER)、Stage 1 で `Read` tool 経由参照
- **build 戦略**: 過去全 retro session の `<project>/.claude-loom/retro/*/pending.json` を scan、`status: "pending"` + `carryover_count >= 1` の finding を集約 → `<project>/.claude-loom/retro/<retro_id>/pending_summary.json` write

**含める scope**: carryover 1+ のみ (本 retro 自身の output / 直近 retro の新規 pending は除外)。lens が「本 retro の新 finding」と「過去 carryover」を混同せん scope clean design。

**lens の責務 — 're-evaluation' 判定 (B1 design、lens 自前)**:

4 lens template は pending_summary を Read、各 carryover finding に対して以下を判定し finding 出力 JSON に reflection：

```typescript
{
  // 既存 lens output fields
  id, category, severity, risk, target_artifact, ...

  // 新規 (pending lifecycle 関連)
  source_pending_id: string | null              // pending_summary 由来なら origin finding id
  re_evaluation_verdict: "still-relevant" | "expired" | "drop" | null
}
```

- `re_evaluation_verdict: "still-relevant"` → counter-arguer + aggregator が **本 retro の新 finding と同等に扱う**、origin pending finding は **promoted** (pending.json で `re_evaluated_in: <current_retro_id>` set)
- `re_evaluation_verdict: "expired"` → 即時 auto-expire (TTL 到達を待たず)
- `re_evaluation_verdict: "drop"` → lens 判定で削除 (state は永続化、lens は意見表明のみ、削除主体は aggregator)
- `re_evaluation_verdict: null` (default) → 通常 finding flow、pending との関連無し

**Auto-expiration policy (A1 design、N retro sessions threshold)**:

`carryover_count >= 3` の finding は **自動 expire** (3-strike rule、§1.13 degraded mode escalation と同 number)：

- expiration trigger: retro-pm Stage 0 で pending_summary build 時、`carryover_count >= 3` を検出 → 該当 pending.json の finding に `expired_at: <now_ms>` set
- expired finding は **pending_summary に `status: "expired"` で残す** (b1 design、audit trail 維持)
- expired finding を lens は read するが新規 finding 化はせえへん (record-only として扱う、retry / re-up しない)
- expired finding を user が manually 復活させたい場合は archive markdown から手動 re-create、自動 mechanism は提供せん

**N retro sessions count rule (carryover_count 増分)**:

```
carryover_count = 0  ← 新規 finding (本 retro 出力時の initial value)
carryover_count = 1  ← 次 retro で pending として scan された時に retro-pm が increment
carryover_count = 2  ← さらに次 retro で scan された時
carryover_count = 3  ← 自動 expire trigger、`expired_at` set される
```

increment 主体: retro-pm Stage 0 build 時 (lazy + idempotent — 既に increment 済 retro_id なら skip、`last_seen_in` field で重複 increment 防止)。

**`re_evaluated_in` field (promotion trace)**:

`re_evaluation_verdict: "still-relevant"` で promote された origin pending finding は：

- origin pending.json: 元 finding の `re_evaluated_in: <current_retro_id>` set + `status: "approved"` には移行せず `pending` 維持 (promotion ≠ approval、独立 concept)
- current retro pending.json: 新 finding として entry 追加、`source_pending_id` field で origin reference 保持
- 次 retro Stage 0 で `re_evaluated_in: not null` の pending は **carryover_count increment 対象外** (promote 済として excluded、新 retro の新 finding 側が active carryover として扱われる)

**schema**:
- `pending.json` 完全 schema: §6.9.6 (schema_version 2 → 3 で `carryover_count` + `last_seen_in` + `expired_at` + `re_evaluated_in` field 追加、§6.9.6.1 表組 update)
- `pending_summary.json` 完全 schema: §6.9.8 新設
- lens output JSON 拡張 (`source_pending_id` + `re_evaluation_verdict`) は `skills/loom-retro/SKILL.md` LENS_*_TEMPLATE 内で codify

**保存 path 規約**:
- `<project>/.claude-loom/retro/<retro_id>/pending.json` (既存、新 field 追加)
- `<project>/.claude-loom/retro/<retro_id>/pending_summary.json` (新設、retro session 単位 per-instance file)

**§1.14 (Carryover escalation rule) との関係**:

§1.14 は **`status: "deferred"`** の finding が 3 retro 連続未解決時の専用 fix milestone insertion proposal。本 §1.16 は **`status: "pending"`** finding の lifecycle 構造化。両者は orthogonal:

- `deferred` finding → §1.14 escalation: 専用 fix milestone (e.g., M0.X-debt-cleanup) を PLAN.md に insert proposal
- `pending` finding → §1.16 lifecycle: auto-expire (3-strike) + lens re-evaluation で structural cleanup

両 rule の coexistence によって retro state debt の 2 軸 (defer 系 + pending 系) を独立に管理可能。

**Migration policy**:

既存 retro session の `pending.json` (schema_version 2) に対して、M0.11.2 task で migration script を実装：

- `carryover_count: 0` (initial)
- `last_seen_in: <self_retro_id>` (own retro_id を default)
- `expired_at: null`
- `re_evaluated_in: null`
- schema_version `2 → 3` flag

migration 後の lens 動作: 既存 pending finding は `carryover_count: 0` でも本 retro Stage 0 で +1 increment、3 retro 後に expire 開始。
