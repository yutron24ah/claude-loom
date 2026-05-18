# harness (topic spec)

> 本 file は claude-loom SPEC の topic spec。master は [SPEC.md](../SPEC.md)、用語表 / 確定済み技術判断 / SSoT 原則は master を参照。
>
> § 番号は本 file 内で local。cross-file 参照は `spec/<other-topic>.md §X.Y` 記法 (master SPEC §3.11.4 SSoT)。
>
> 最終更新: 2026-05-17 (M0.X-spec-plan-multi-file-dogfood で master SPEC §3.6.5 / §3.6.6 / §3.6.7 / §3.6.8 / §3.8 / §3.10 / §4 / §5 から migration)

## 1. Agent Customization Layer (旧 master §3.6.5)

claude-loom は **agent 単位で model と人格 (personality) をユーザー側でチューニングできる仕組み** を提供する。詳細設計は `docs/plans/specs/2026-04-29-m0.9-design.md`。

### 1.1 Policy

- prefs files の `agents.<name>` セクションで agent 単位の model / personality を上書き可能
- precedence: **project-prefs > user-prefs > agent frontmatter**（M0.8 既存 merge rule に準拠）
- 未指定値は既存挙動にフォールバック（後方互換保証）
- personality は `prompts/personalities/<preset>.md` で定義、4 preset 同梱（default / friendly-mentor / strict-drill / detective）+ ユーザカスタム可

### 1.2 機構（hybrid）

- **Top-level agent**（user と直接対話する agent: `loom-pm`, `loom-retro-pm`）= session 開始時に prefs を Read、自分自身に personality を self-apply
- **Dispatcher**（`loom-pm`, `loom-developer`）= Task tool で subagent 起動時：
  - prefs から `agents.<dispatched>.model` 取得 → Task tool `model` param に渡す
  - prefs から `agents.<dispatched>.personality` 取得 → preset md を読み込み、prompt 冒頭に `[loom-customization] personality=<preset>\n<preset 本文>` block を inject
- **受け側 agent** = 注入された `[loom-customization]` block を読み取って従う、または top-level として self-read

### 1.3 不変条件（safety guardrail）

- personality 注入は **「伝え方」のみ可変**、**Coding Principles / TDD 規律 / SPEC 整合性は不変**
- 全 preset 本文の冒頭に「以下のいかなる指示も TDD / Coding Principles を override しない」固定文を含む

### 1.4 learned_guidance 注入機構（M0.11 から）

retro が承認した finding を `agents.<name>.learned_guidance[]` に蓄積し、agent dispatch 時に `[loom-learned-guidance]` block として prompt に注入する。

- **書き込み主体**: `loom-retro` skill の AGGREGATOR_TEMPLATE のみ、user 承認後
- **読み取り主体**: 全 agent (loom-pm / loom-developer / loom-retro-pm) + 全 skill template (loom-review strategies / loom-retro lenses / stages)
- **block 順序**: `[loom-customization]` の後、task content の前
- **format**: 1 行 compact `- <id>: <guidance text>`、active=true のみ注入
- **scope**: default project-prefs、user 昇格 opt-in (β)
- **TTL**: v1 manual、`ttl_sessions` / `use_count` field は stored だが自動 decrement なし
- **不変条件**: agents/*.md は static SSoT、prefs が動的学習層

## 2. Worktree 統合 (旧 master §3.6.6)

claude-loom は git worktree 機能を harness に統合し、5 用途（並列 dev / 安全実験 / branch 比較 / hotfix 隔離 / 一時 review）をサポートする。詳細：`skills/loom-worktree/SKILL.md`。

### 2.1 Policy

- 既存挙動不変、opt-in 起動（`/loom-worktree` または agent autonomous decision）
- worktree 配置場所は `project-prefs.worktree.base_path` で設定可、default `<parent>/<repo>-{branch}`
- `max_concurrent` 上限（default 5）で自律発動の暴走防止
- `auto_cleanup` は v1 では false 固定、tag 検知での自動削除は M0.11+ で評価

### 2.2 Autonomous decision

`loom-pm` / `loom-developer` / `loom-retro-pm` agent は skill の Decision tree を読んで判断、5 用途のいずれかに該当 + user 確認後に invoke する運用。

## 3. Coexistence Mode (旧 master §3.6.7)

claude-loom は既存 PJ への **段階的 adoption** を支援するため、機能 ON/OFF を mode で制御する。

### 3.1 3 modes

| mode | enabled_features default | use case |
|---|---|---|
| `full` (default) | `["all"]` 全機能 ON | greenfield、claude-loom メインで使う |
| `coexist` | `["core"]` のみ | 既存 setup あるが loom-* 一部試したい |
| `custom` | user 明示指定 | 細かく制御したい power user |

### 3.2 5 feature groups

- **core**: base agents/skills/commands（常時 ON、disable 不可）
- **retro**: retro architecture (lens / counter-arguer / aggregator / learned_guidance)
- **customization**: personality preset + Customization Layer 注入
- **worktree**: /loom-worktree + autonomous worktree decision
- **native-skills**: loom-write-plan + loom-debug

`enabled_features` の `"all"` shorthand は全 group ON 扱い。

### 3.3 Runtime gate

install.sh は不変、loom-* は常時 install。Mode 制御は **runtime gate** で実現：dispatcher 3 体 (PM / dev / retro-pm) が project.json を read、`enabled_features` に該当 group が含まれない場合は該当機能を skip。Receiver agent (reviewer / retro lens) は mode 不要 — dispatcher が gate する。

## 4. Process Discipline (旧 master §3.6.8)

claude-loom の PM / dev agent prompt に組み込む 5 項目の workflow discipline：

### 4.1 Parallel dispatch self-verify

PM が「parallel batch」と plan で宣言した task を dispatch する場合、**同 message 内に複数 Agent invocation を含めること**。1 message = 1 Agent invocation = sequential dispatch であり、parallel ではない。post-dispatch で self-check を行い、宣言と実装が乖離していたら process-axis finding として retro pending state に記録。

**side-effect note (retro 2026-05-06-003 F-proc-002 由来)**: parallel dispatch では各 subagent の `SessionStart` hook が同時多重発火し、`POST /event` を daemon に集中送信する。daemon が一時的に busy になり `/health` probe timeout → false cold-start trigger を引き起こす可能性あり (Bug A symptom chain の trigger 部分)。Bug A hotfix (`spec/daemon-and-data.md` §1.3 Boot health-check polling) で start_daemon 側の defense は入ったが、daemon load 根本対策は M0.X-hook-ingest-recovery (Layer 3 POST /event spam fix) scope。parallel batch を multiple subagent で宣言する場面では本 side-effect を念頭に置く。

### 4.2 Task tool fallback degraded mode

session 開始時に Task tool 利用可否を check、利用不能なら user に「**degraded mode で sequential self-review に switch**」と明示宣言。silent fallback 禁止。

### 4.3 Inline spec edit

PM の spec phase で brainstorm Q&A 中に design spec を inline 編集、Q&A の答えがそのまま section 内容に反映される運用。formal「spec 書き出し」step を圧縮、brainstorm → spec → plan の中間段階を 1 step 削減。

### 4.4 Doc batch parallelism

doc 5 file 以上の更新が必要な場合、複数 subagent 並列 dispatch（同 message 内に複数 Agent invocation）。secretary agent 化（loom-doc-keeper 等）は将来の M0.13.x or M0.14 で評価。

### 4.5 Reviewer verdict 保存

retro session 開始時、`loom-retro-pm` agent が **直前 milestone の reviewer dispatch evidence を独立 file `<project>/.claude-loom/retro/<retro_id>/verdict_evidence.json` に lazy build + write**。「review skip」と「指摘ゼロ pass」の判別を可能化。詳細規約は `spec/retro-system.md` §1.10 + `spec/daemon-and-data.md` §4.9.5（zod 完全 schema、M2.1 から）参照。M0.13 で codify された旧設計（`pending.json` 内 field）は M2.1 で refactor、独立 file + zod schema 化に移行済。

### 4.6 TDD red commit 履歴 enforcement（2026-05-04 retro F-pj-002 で default inversion）

**M0.13 codification (legacy)**: dev は milestone 内で test 拡張 commit が feat 実装 commit より時系列で **前** にあることを保証。実装直前に `git log` で確認、無ければ「process-tdd-violation」self-finding 生成。

**Strategy b (PM 統合 commit) 採用時の commit 分割規約 (M3.1 retro 2026-05-03-001 proc-001 由来 → 2026-05-04-001 retro F-pj-002 で default inversion)**：

retro 2026-05-03-001 で「2-commit 分割 (RED 単独 → GREEN) を default 推奨、annotation path は例外」と codify されたが、M3.2 / M4 Stage 2 / M4 Stage 3 / M5 Stage 1 / M5 Stage 2 の **5 連続 unified annotation 採用** で実用が逆転。M5 closure 時点で **default を inversion**：

- **default = unified-with-annotation**: PM は 1 task = 1 統合 commit、commit message に `[RED+GREEN unified]` annotation 必須付与（git log で grep 検出可能化）。file overlap が常態化する parallel batch / Strategy b で実用的
- **2-commit 分割 = strict mode**: file が完全 disjoint (test/* と src/* が衝突なし、かつ複数 task 間で file 共有なし) な場合のみ採用可能。RED + GREEN を 2 commit に分割、git history で RED 単独 commit 存在を verify 可能化
- **TDD audit 性の維持**: dev は test-first で書き final report に `tdd_red_confirmed: true` + RED test fail output 抜粋を明記、reviewer は test/* と src/* の diff を時系列逆並びで cross-check 可能 (Strategy a と同等の audit 性)

**Strategy a sub-variant: 2-commit RED→GREEN+REFACTOR**（2026-05-06 retro F-proc-002 由来）：

Strategy a (dev 自身 commit) で 3-commit (RED → GREEN → REFACTOR) が strict default だが、以下の場合の **2-commit 統合 (RED → GREEN+REFACTOR)** も acceptable とする：

- **REFACTOR 規模が trivial**: 数行の rename / dead code 削除 / lint fix 等、独立 commit 化で git log を逆に汚すレベル
- **REFACTOR が GREEN と論理的同一 unit**: GREEN 実装直後の minor cleanup で、独立 commit value が低い (revert 単位として分離する必要なし)
- **TDD audit 性は維持**: RED commit は単独で存在、GREEN+REFACTOR commit message に `[GREEN+REFACTOR squashed]` annotation 必須付与 (git log で grep 検出可能化、reviewer cross-check 可能)

**3-commit strict mode** は以下の場合に必須：
- REFACTOR が大規模 (50+ 行 / 複数 file 触る / SSoT cross-check rule 違反検出 等)
- revert 単位として REFACTOR を独立確保したい case
- reviewer が「RED → GREEN → REFACTOR の各段階を独立 commit で audit したい」と指定

**rationale**: M0.11.5 t4 dev (commit 8087071) で GREEN+REFACTOR 1 commit 統合が偶発的に発生、TDD red 順序遵守は維持されとるが SPEC 上 acceptable / strict 不明確だった点を本 sub-variant で codify。実害ゼロ + 軽微 REFACTOR で 3-commit chain を強要しない柔軟性確保。

### 4.7 Reviewer dispatch triple path（2026-05-04 retro F-proc-001 由来 → 2026-05-06 retro F-proc-003 で **path C default 反転**）

dev が reviewer dispatch を実施する Step 9 に **3 つの path** を 1st-class option として定義。**default = path C** (2026-05-06 反転、累積 evidence: M0.11.5 6/6 dispatch 全部 path C で pass、Task tool 一貫 deferred 環境での運用 fit)：

- **path C — self-review with explicit safety checklist (default、2026-05-06 反転)**: dev が Step 9 開始時に **必ず Task tool 利用可能性 probe**（`ToolSearch select:Task` 空結果 → degraded mode 自動 enter、Strategy b unified annotation default 反転と同 pattern）。Task tool deferred 環境での safety checklist 経由 self-review が default：
  1. final report に `self_review: true` + `task_tool_deferred: <bool>` 明示
  2. 4 観点 self-checklist 必須記載 (code 観点 / security 観点 / test 観点 / `spec/ui-arch.md` §2 SSoT cross-check 観点)
  3. 各観点で 3 行以上の reasoning + 該当 file:line 参照
  4. PM が follow-up `loom-review` skill dispatch を後で実施する option を残す (path C completion ≠ formal review、interim safety net)
- **path A — same-session iterate (opt-in、Task tool 利用可能時)**: probe pass + fix scope clear AND context budget 余裕あり → 同 session 内で fix → re-run tests → re-submit
- **path B — PM follow-up handoff**: fix scope unclear OR context budget tight → final report に `handoff_required: true + reasoning + recommended next step + 残 findings 全文` 明記
- **silent self-review 禁止**: path A/B/C のいずれかを final report で必ず宣言

詳細実装: `agents/loom-developer.md` Step 9、`agents/loom-pm.md` 受領規律。

**反転 rationale (2026-05-06 retro F-proc-003)**: 旧 default = path A (Task tool dispatch) は Task tool 利用可能性を前提とするが、本 environment (Claude Agent SDK) は Task tool 一貫 deferred 状態が constant condition、agent prompt と現実が乖離した状態で毎回 path C を verbal で fallback 宣言する運用負荷が累積。M0.11.5 で 6/6 dispatch 全部 path C で pass という evidence + 2 retro 連続 degraded mode persistence (2026-05-05 + 2026-05-06) の累積で default 反転条件成立 (M0.14 Strategy b 反転と同 pattern)。

### 4.8 Dependency audit on default change（2026-05-06 retro F-USER-002 由来）

milestone scope に「**default 値変更**」（auto_launch default true 化、review_mode default 反転、Strategy a/b default 反転 等）を含む場合、PM は milestone closure 前に **依存 install / config / runtime pipeline 全 step verify** を必須 check として実施。

**Trigger**: 以下のいずれかが milestone 内 task に含まれる：
- 既存 SPEC default 値の反転（`auto_launch: false → true`、`review_mode: trio → single` 等）
- 新規 runtime path の active 化（lazy launch、auto-apply、auto-prune 等）
- 新規 hook / symlink / settings.json field の bootstrap 必須化

**Audit checklist** (closure 前に PM が機械的に走らせる)：
1. **install path**: `bash install.sh` を fresh sandbox で実行、新 default が機能する前提 file（symlink / dir / config）が全て配置されるか確認
2. **config path**: `templates/*.template` + `~/.claude-loom/user-prefs.json` + `<project>/.claude-loom/project-prefs.json` の **3 source** に新 default が反映されとるか jq query で確認
3. **runtime path**: 新 default が活性化する code path（hook / agent prompt / daemon entry）が install 後の env で actual に動作するか smoke check（手動 or `loom-ui-smoke` skill 経由）
4. **rollback path**: user が opt-out する手段（env 変数 / config field / `LOOM_NO_*` flag）が SSoT に明記されとるか確認

**rationale**: M0.11.5 で `auto_launch: false → true` 反転と並行して `hooks/loom-launch-ui.sh` 経由 daemon 自動起動を default 化したが、`install.sh` に daemon symlink bootstrap step 不在が milestone closure 後に retro F-USER-001 として critical surface 化した（2026-05-06-001）。default 変更は前提 pipeline 全 step が揃って初めて成立、step の partial implementation は user 環境で silent failure を生む構造的 risk。本 audit は M0.11.5 と同 pattern の class を構造的に塞ぐ。

**実装**: `agents/loom-pm.md` の milestone closure workflow に audit step として組込、F-USER-002 codify。

### 4.9 PM Auto-Spec Entry（M0.11.6 から）

**方針**: ハイブリッド検知（C 案）— PM 起動時に context を評価し、高信頼なら 1 問確認後 spec phase 自動突入、中信頼なら短い分岐質問、低信頼なら従来の idle PM 動作。`/loom-pm` 起動のたびに ceremony を強制せず、context から intent が読める場合は自動 entry する。

**trinity 位置付け**: M0.11.5（`/loom-pm` 起動時 UI auto-launch、`spec/daemon-and-data.md` §1）→ **本章 M0.11.6**（spec phase auto-entry）→ M0.11.7（`/loom-go` impl phase auto-entry）の 3 本柱で「context から intent 読めるなら ceremony 強制せえ」哲学を段階的に実装。

**検知ロジック 2 軸（AND 条件で高信頼判定）**:

- **軸 1 — 直近 user message scan**: spec 系 keyword を検出。impl 系（「commit」「PR」「deploy」等）ではなく spec 系（「実装したい」「機能追加」「bug」「fix」「PLAN」「SPEC」「task」「設計」「要件」「新機能」「不具合」「改善したい」等、具体リストは t4 で確定）を含む message が直前に存在するか判定。
- **軸 2 — cwd state**: `SPEC.md` 存在 + `PLAN.md` 内に `status: todo` の task が残存 → 既存 PJ context あり。どちらの軸も Bash tool（`ls`, `grep`, `git log --oneline -5` 等）で probe 可能。

**AND 条件採用 rationale**: OR 条件にすると誤爆（false-positive）が増加し、user が望まない spec 突入が多発する。高信頼判定は **両軸が揃う** ことを必須とする。

**3 信頼レベルと動作**:

- **① 高信頼（intent + state 両方揃い）**: 「○○ の spec phase 入りますで、ええか？」1 問確認 → yes なら即 spec phase 突入（`/loom-spec` と同等の処理を invoke）
- **② 中信頼（いずれか片方のみ）**: 「新規 PJ spec / 既存 plan レビュー / status 確認」3 択分岐質問 → user の選択に応じて処理
- **③ 低信頼（intent も state も無し）**: 従来通り idle PM として user 入力待ち。無用な質問も発しない。

**`/loom-spec` の位置付け（残置 + override path）**:

`/loom-spec` slash command は **明示 override / re-entry path として存続**する。削除・deprecated 化しない。用途：
- context 圧縮後の復帰（PM が auto-entry を見送った場合の手動 trigger）
- 別案件の spec し直し（auto-entry が誤判定した場合の override）
- low-confidence PM で明示的に spec phase を開始したい場合
- M0.11.5 `spec/daemon-and-data.md` §1 の `/loom-spec` trigger list も残置

**誤爆抑制策まとめ**:

1. 高信頼判定は AND 条件（OR 禁止）
2. 中信頼以下では **必ず 1 問確認**を挟む（silent 突入禁止）
3. retro process-axis lens で false-positive rate を継続観察、閾値超過で keyword list 見直し
4. user が意図していない spec entry と気づいた場合 `/loom-spec` で明示 re-entry 可能

**degraded mode との整合（`spec/retro-system.md` §1.13 probe との連携）**:

PM auto-spec entry の context 評価は Bash tool で `git log --oneline -5`, `grep -c "status: todo" PLAN.md`, `ls SPEC.md` 等を probe する形で実現。Task tool 不在時（degraded mode）も Bash tool で代替評価可能、**本機構は degraded mode でも機能する設計**とする。degraded mode での spec entry は sequential self-review（§4.7 path C）と組み合わせて運用。

**SSoT 宣言**: 本章（§4.9）が PM Auto-Spec Entry 機能の SSoT。`agents/loom-pm.md`（t3 担当）+ `commands/loom-pm.md` は本章を参照し実装。他 doc（CLAUDE.md / PLAN.md）からの参照は本章 section 番号を引用。

### 4.10 PM Auto-Go Entry（M0.11.7 から）

**方針**: ハイブリッド検知（C 案）— spec phase 完了後、user の直近 message に impl intent を検出した場合、1 問確認後 impl phase（`/loom-go` 相当）に自動突入。曖昧なら短い分岐質問、低信頼なら従来 PM idle。§4.9 PM Auto-Spec Entry の**論理的延長**として、spec → impl の 2 段階 auto flow を完成させる。

**trinity 完成**: `spec/daemon-and-data.md` §1（M0.11.5、UI auto-launch）→ §4.9（M0.11.6、spec phase auto-entry）→ **本章 §4.10（M0.11.7、impl phase auto-entry）**の 3 本柱で「context から intent 読めるなら ceremony 強制せえ」哲学の ceremony reduction trinity が SSoT として整う。

**検知ロジック 3 軸（AND 条件で高信頼判定）**:

- **軸 1 — PLAN.md state 変化**: 直近 N session で PLAN に新規 task 追加 または 既存 task に `status: todo` が残存 → impl 作業が残っている証拠（Bash probe: `grep -c "status: todo" PLAN.md`）
- **軸 2 — spec phase 完了 marker**: SPEC.md 編集 commit + PLAN.md 編集 commit が直近 git log に存在 → spec が終わって impl 待ちの状態（Bash probe: `git log --oneline -10 | grep -E "SPEC|PLAN|spec|docs"`）
- **軸 3 — user message intent**: 「実装」「進めて」「go」「dispatch」「task 振って」「開発して」「コーディング」「始めて」等の impl intent keyword を直近 user message が含む（§4.9 の spec keyword list と分離、具体 list は t4 で確定）

**AND 条件採用 rationale**: 3 軸全 AND は §4.9 の 2 軸 AND より厳しい条件。「PLAN 残あり + user が雑談してるだけ」の誤発火を spec phase 完了 marker（軸 2）が防ぐ。OR 条件や 2 軸 AND では false-positive が増加し user が望まない impl 突入が多発するため採用しない。

**3 信頼レベルと動作**:

- **① 高信頼（3 軸全部揃い）**: 「○○ task の impl phase 入りますで、ええか？」1 問確認 → yes なら即 impl phase 突入（`/loom-go` と同等の処理を invoke）
- **② 中信頼（2 軸揃い）**: 「impl 開始 / spec 修正 / status 確認」3 択分岐質問 → user の選択に応じて処理
- **③ 低信頼（1 軸以下）**: 従来通り PM idle として user 入力待ち。無用な質問も発しない。

**`/loom-go` の位置付け（残置 + override path）**:

`/loom-go` slash command は **明示 override / re-entry path として存続**する。削除・deprecated 化しない。用途：
- context 圧縮後の復帰（PM が auto-entry を見送った場合の手動 trigger）
- 別案件の impl やり直し（auto-entry が誤判定した場合の override）
- 低信頼 PM で明示的に impl phase を開始したい場合
- M0.11.5 `spec/daemon-and-data.md` §1 の `/loom-go` trigger list にも残置

**§4.9 との関係（sibling chapter / 検知ロジックパターン共有）**:

本章は §4.9 PM Auto-Spec Entry の sibling chapter。検知ロジックパターン（3 信頼レベル / AND 条件 / override 残置 / false-positive 抑制）は §4.9 と同形式を採用し重複記述を避ける。ロジック実装は agent prompt 層（t3）で §4.9 の Session Start Hook を拡張統合する形で実現。

**誤爆抑制策まとめ**:

1. 高信頼判定は 3 軸全 AND（§4.9 の 2 軸より厳格）
2. 中信頼以下では **必ず 1 問確認**を挟む（silent 突入禁止）
3. retro process-axis lens で false-positive rate を継続観察、閾値超過で keyword list / 軸定義見直し
4. user が意図していない impl entry と気づいた場合 `/loom-go` で明示 re-entry 可能

**degraded mode との整合（`spec/retro-system.md` §1.13 probe との連携）**:

PM auto-go entry の context 評価は Bash tool で `grep -c "status: todo" PLAN.md`, `git log --oneline -10` 等を probe する形で実現。Task tool 不在時（degraded mode）も Bash tool 単体で代替評価可能、**本機構は degraded mode でも機能する設計**とする。

**SSoT 宣言**: 本章（§4.10）が PM Auto-Go Entry 機能の SSoT。`agents/loom-pm.md`（t3 担当）は本章を参照し実装。他 doc（CLAUDE.md / PLAN.md）からの参照は本章 section 番号を引用。

### 4.11 Post-tag hotfix protocol（retro 2026-05-06-003 F-pj-001 由来）

milestone tag 設置後に同 branch 上で発覚した bug への hotfix を **正規化された運用 pattern** として codify。precedent 2 連続:

- F-USER-007/008 hotfix (commit `c31a88e`、M0.11.5 tag 後) — symlink CLI guard + hooks SDK 仕様準拠
- Bug A hotfix (commit `91cdcbb`、M0.X-runtime-mode-recovery tag 後) — start_daemon port bind verify gap

**Protocol rules**:

1. **tag 移動禁止**: hotfix commit を milestone tag に取り込まず、tag は当該 milestone の closure marker として **不変** に保つ。git history を時系列線形に保ち、release tag semantics を破壊しない
2. **commit message annotation 必須**: hotfix commit message に `[post-tag-hotfix]` 文字列を含める (git log grep 検出可能化)。subject prefix or body どちらでも可、ただし grep で機械的 detect できる位置に配置
3. **同 branch 継続**: hotfix は milestone branch (`fix/m0.x-...`) に追加 commit、別 branch を切らない (PR review scope 統一)
4. **当該 milestone retro scope への必須 inclusion**: post-tag hotfix が発生した場合、当該 milestone retro 起動時の scope に **必ず含める** (retro-pm dispatch prompt の `## Scope` block + `## Milestone scope (N commits)` table に hotfix commit を明記)
5. **PR description note**: PR body の "## 修正内容" に "post-tag hotfix" subsection を追加、root cause + fix + precedent 参照を明記

**rationale**: post-tag hotfix を「process bug の繰り返し」と判定するか「正規化された pattern」と認めるかは retro でしか判断できない。本 protocol は precedent 2 連続を受けて後者と認め、構造的な codify で次回以降の運用 ambiguity を解消する。同時に、retro scope に必ず含めることで「tag 設置 = 完成」の illusion を構造的に解体し、Layer 2.5 (§10.4.1) との pair で trust recovery process を成立させる。

**SSoT 宣言**: 本章（§4.11）が post-tag hotfix protocol の SSoT。`agents/loom-pm.md` milestone closure workflow + `agents/loom-retro-pm.md` retro scope 定義は本章を参照する。

## 5. コミット + ブランチ規約 (旧 master §3.8)

claude-loom は **Conventional Commits**（[conventionalcommits.org](https://www.conventionalcommits.org)）と **GitHub Flow** を明示採用する。詳細ルール + good/bad 例は `docs/COMMIT_GUIDE.md` を参照。

### 5.1 コミット規約サマリ

- **形式**: `<type>(<optional scope>): <subject>` の 1 行件名 + 必要に応じて空行 + 本文
- **type 11 種**: `feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `chore` / `revert`
- **scope**: 任意（`feat(skills): ...` のように該当モジュールを括弧で）
- **件名**: 命令形（"Add feature" / "Update workflow"）または日本語の体言止め可。≤50 文字英 / ≤40 文字日目安。末尾ピリオドなし
- **本文**: WHY 中心、72 文字折返（日本語は自然な改行）
- **BREAKING CHANGE**: `feat!:` または footer `BREAKING CHANGE: <description>`
- **atomic commits**: 1 commit = 1 論理変更 / revert 単位 / build & test pass / ≤200 行目安（Google CL 流儀）

### 5.2 ブランチ規約サマリ（GitHub Flow）

- **戦略**: `main` + 短命 feature ブランチのみ（GitHub Flow）。Git Flow の `develop` / `release` ブランチは使わない
- **命名**: `<type>/<short-kebab-name>`、type は commit type と同一（`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore` の 10 種、`revert` はインラインで使うのでブランチ名には含めない）
- **寿命**: 数日〜数週間程度。長期化したら分割を検討
- **merge**: `main` への direct commit 禁止。PR 経由、reviewer verdict pass 必須。merge 戦略は `--no-ff`（マイルストーン boundary を history に残す）または squash（WIP commit が多い場合）

### 5.3 言語ポリシー（commit_language）

`.claude-loom/project.json` の `rules.commit_language` で件名/本文の言語を設定：
- `"any"`（default）：日本語 / 英語どちらも可。個人・国内チーム向け
- `"english"`：英語強制。国際 OSS / 機械処理優先
- `"japanese"`：日本語強制（実用上は珍しい設定）

claude-loom 自身は `"any"`（既存 commit が日英混在のため）。

## 6. superpowers Independence (旧 master §3.10)

claude-loom は **superpowers plugin に依存せずに完結する** ことを設計目標とする。

- M0.9 時点で `loom-write-plan` / `loom-debug` skill を新設し、claude-loom 自前で spec → plan → implement → debug の workflow を完結
- claude-loom 固有の **workflow 品質ゲート** となる skill（`loom-tdd-cycle` / `loom-review` (single + trio strategies) / `loom-retro` / `loom-test` / `loom-status`）は loom-* 版を使う（agent prompt で mandate）。それ以外（`loom-write-plan` / `loom-debug` 等の suggest 系）は agent の自律的 skill discovery に委ね、blanket な「loom-* > superpowers」優先は強制しない
- 残る superpowers skill（brainstorming / executing-plans / verification-before-completion 等）は claude-loom の `loom-pm` / `loom-developer` agent prompt 内に同等動作が記述済みのため、独立 skill 化はしない（YAGNI）
- 将来 superpowers が global uninstall された場合でも、claude-loom 単独で全 milestone を進められる

### 6.1 Skill Mandate vs Suggest 使い分け（M0.14 から）

agent prompt 内の skill 参照は **mandate**（強制）と **suggest**（推奨）を区別する。これは agent の自律的 skill discovery（"1% chance でも invoke" ルール）と claude-loom の品質ゲートを両立するための原則。

**mandate skill** — workflow 品質ゲートとなる skill。逸脱すると review reject される類。

| 場面 | mandate skill | 理由 |
|---|---|---|
| TDD discipline（実装/修正時） | `loom-tdd-cycle` | claude-loom の Red→Green→Refactor→Review cycle 規律 |
| commit 前 review gate | `loom-review` (strategy=single default / strategy=trio opt-in via review_mode) | Reviewer verdict を quality gate とする §4.7 規約 |
| milestone 完了後 retro | `loom-retro` | 4 lens × counter-argument の 3 段階プロトコル必須 |
| harness self-test | `loom-test` | claude-loom 固有の install/agent/command/skill test |
| harness status 確認 | `loom-status` | claude-loom 固有のスナップショット |

agent prompt 記述形式: `「X 時は Y skill を使う」`（命令形）

**suggest skill** — 最適化候補。他の skill / approach でも目的達成可能で、agent の自律的判断を阻害せん書き方をする。

| 場面 | suggest skill | 代替手段 |
|---|---|---|
| Refactor phase での再利用/品質改善 | `simplify` | 直接 refactor、`loom-debug` 経由の root-cause refactor |
| permission 拒否多発時の env 改善 | `fewer-permission-prompts` | 手動 settings.json 編集 |
| 定型作業反復時の hook/permission 設定 | `update-config` | 手動 settings.json 編集 |
| keybind 改善機会 | `keybindings-help` | 手動 keybindings.json 編集 |
| 実装 plan 作成 | `loom-write-plan` | inline spec edit（M0.13 から brainstorm-with-spec 化済） |
| 系統的 debug | `loom-debug` | ad-hoc debugging |

agent prompt 記述形式: `「X 時の候補として Y skill。他の skill / approach も可」`（推奨形）

**運用原則**:
- mandate skill の追加は SPEC 改訂を伴う（品質ゲート増設）
- suggest skill の追加は agent prompt 単体更新で可
- retro lens は suggest skill の活用機会を検出し finding 化する（`process-axis` lens の責務、`spec/retro-system.md` §1 参照）

### 6.2 Agent prompt 設計原則（M0.17 から）

claude-loom の `agents/*.md` は **Claude Code に loom-specific なロールを overlay する** ための prompt であり、ゼロから AI agent を構築する prompt ではない。

**設計原則の SSoT**: `docs/AGENT_PROMPT_DESIGN.md` を参照。

要旨：

- **2-layer 構造**: Reasoning layer (mission / character / workflow semantic / judgment axes、薄く judgment を Claude Code に委ねる) + Contract layer (interface contracts / file paths / hard constraints、precise に prescribe)
- **Anti-patterns**: mechanical keyword matching / Claude Code 基本能力の再教示 / prompt template verbatim 固定 / step-by-step bash command prescription / historical retro reference embed / replicated structure across sections
- **Size guideline**: PM 200-250 行 / developer 150-200 行 / reviewer 100-150 行（specialized 80-120 行）/ retro-pm 150-200 行 / retro lens 80-120 行
- **SPEC → prompt の単方向 flow**: prompt 側で新 rule を発明せえへん。SPEC §X.X SSoT がある内容は引用 1 行に圧縮、過去の retro 由来 tactical rule は SPEC 昇格後に prompt 反映

agent prompt の新規作成・改修時は §6.2 + `docs/AGENT_PROMPT_DESIGN.md` の verification checklist 9 項目を満たすこと。

## 7. アクター（エージェント）定義 (旧 master §4)

### 7.1 ロール一覧

| ロール | 体数 | 起動者 | 配布 |
|---|---|---|---|
| PM | 1（singleton） | ユーザーが `/loom-pm` で起動 | `.claude/agents/loom-pm.md` (system prompt) |
| Developer | 1〜N（PJ ごと max 設定） | PM が Task tool でディスパッチ | `.claude/agents/loom-developer.md` |
| Retro PM | 1（per retro session） | `/loom-retro` で起動 | `.claude/agents/loom-retro-pm.md` |
| Reviewer (single + trio strategies) | task-scoped、persistent identity 無し | Developer が `loom-review` skill 経由で `general-purpose` subagent + skill template injection で dispatch (single = 1 体、trio = 3 体並列) | `.claude/skills/loom-review/SKILL.md` (template SSoT) |
| Retro lens / counter-arguer / aggregator | task-scoped、persistent identity 無し | Retro PM が `loom-retro` skill 経由で `general-purpose` subagent + skill template injection で dispatch (Stage 1 = 4 体並列、Stage 2 = 1 体、Stage 3 = 1 体) | `.claude/skills/loom-retro/SKILL.md` (template SSoT) |

### 7.2 各ロールの責務

#### 7.2.1 PM (loom-pm)
- **プロジェクトライフサイクル管理**：init（新規）/ adopt（既存）/ maintain（継続）の 3 段階を仕分けて処理（`spec/install-and-test.md` §1）
- ユーザーと spec 作成（spec-driven dev）
- 実装計画立案（タスク分解 + 開発者人数 N の提案、ユーザー手直し可）
- Developer への作業割り振り（Task tool）
- **doc 整合性の自動見張り**（中核責務、§7 参照）
- **全ドキュメントの保守**（SPEC / PLAN / CLAUDE / README / docs/**/*.md / tests/REQUIREMENTS.md、`spec/install-and-test.md` §1.4）
- Plan View の更新（TodoWrite + 構造化 plan ファイル）
- 進捗の集約とユーザーへの報告
- skill / hook の提案（Phase 2）

> CLAUDE.md / README.md など既存ファイルがある場合は **non-destructive 原則** を守る（`spec/install-and-test.md` §1.2）。loom-managed マーカーの範囲のみを書き換え可能。

#### 7.2.2 Developer (loom-developer)
- TDD ループの実行：
  1. 実装する機能の言語化
  2. 失敗するテストの作成
  3. 最小実装で緑にする
  4. リファクタ
  5. レビュー室にレビュー依頼
  6. 指摘あれば修正、再レビュー
- 完了したら PM に報告
- 作業ログをチームに共有

#### 7.2.3 Reviewer (`loom-review` skill、agent file なし)

review は agent 単位の persistent role ではなく **`skills/loom-review/SKILL.md` 経由の 1-shot subagent dispatch** で実施する (2026-05 architectural cleanup、`docs/SKILL_MIGRATION.md` 参照)。

- **single strategy** (default、`review_mode=single`): 1 Task call、`subagent_type="general-purpose"`、`SINGLE_REVIEWER_PROMPT_BODY` template inject、3 観点 (code / security / test) を sequential 評価、各段階で進捗 marker 出力、aspect-tagged findings 配列 + verdict を 1 JSON で返却
- **trio strategy** (opt-in、`review_mode=trio`): 1 message 内 3 parallel Task calls、各 `subagent_type="general-purpose"`、`CODE_REVIEWER_PROMPT` / `SECURITY_REVIEWER_PROMPT` / `TEST_REVIEWER_PROMPT` をそれぞれ inject、各 1 aspect 専で独立 JSON 返却、Developer が集約
- **token コスト**: single ≒ trio の 1/3、modern Claude (Opus/Sonnet 4.x) の多観点単一パス能力を活用
- **strategy 切替**: `.claude-loom/project.json` の `rules.review_mode` で default 指定、`[loom-meta] review_mode=...` で per-task 上書き可

> ピクセル RPG GUI のキャラ表現は trio strategy 時のみレビュー室に 3 人並ぶ絵が成立。single strategy は 1 人キャラが 3 観点バッジを順次表示する設計。

#### 7.2.4 Retro PM (loom-retro-pm)

retro session orchestrator (persistent role)。Stage 0 file build (verdict_evidence / applied_summary / command_frequency) + Stage 4 presentation (conversation / report mode) を直接担当。Stage 1-3 (lens / counter-argument / aggregation) は `skills/loom-retro/SKILL.md` の template を read して `general-purpose` subagent + template injection で dispatch する。詳細責務: `spec/retro-system.md` §1。

#### 7.2.5 Retro pipeline (`loom-retro` skill、agent file なし)

Retro の Stage 1 lens (pj-axis / process-axis / meta-axis / researcher) + Stage 2 counter-arguer + Stage 3 aggregator は agent 単位の persistent role ではなく **`skills/loom-retro/SKILL.md` 経由の 1-shot subagent dispatch** で実施する (2026-05 architectural cleanup、`docs/SKILL_MIGRATION.md` 参照)。

- Stage 1 lens template: LENS_PJ / LENS_PROCESS / LENS_META / LENS_RESEARCHER
- Stage 2 counter-arguer template: COUNTER_ARGUER_TEMPLATE
- Stage 3 aggregator template: AGGREGATOR_TEMPLATE

### 7.3 Developer / Reviewer プール管理

- プロジェクトごとに `max_developers` を設定（default: 3）。reviewer / retro lens は agent file を持たず skill-dispatch ゆえ pool 不要、developer 1 体あたり review_mode に応じた subagent (single=1 / trio=3 並列) が dispatch される
- PM は spec フェーズで人数を提案、ユーザーが対話で手直し可
- pool_slot は永続的な「席」、subagent はその席が演じる「個別タスクの実行体」
- pool_slot 状態：`idle` / `busy`、busy 中は `current_subagent_id` を保持
- **review_mode** は `.claude-loom/project.json` の `rules.review_mode` で project default を指定（`"single"` | `"trio"`、未設定時は `"single"`）。`[loom-meta] review_mode=...` で per-task 上書き可（PM が critical path タスクで明示的に `trio` を指示する用途）

### 7.4 配布形態

- 全 agent definition は `.claude/agents/loom-*.md` として配布
- claude-loom リポジトリの `agents/` ディレクトリから `~/.claude/agents/` にシンボリックリンク（claude-blog-skill の `install.sh` パターン踏襲）
- 同様に `hooks/`, `commands/`, `skills/` もシンボリックリンク方式

---

## 8. 標準ワークフロー (旧 master §5)

```
[1] User × PM
    /loom-spec 起動 → 対話 → SPEC.md 生成
    実装計画 + 開発者人数 N も決定（PM 提案 → User 手直し）

[2] PM
    実装計画から N 個のタスクに分解
    Plan View に登録（短期=TodoWrite、長期=plan ファイル）

[3] PM → Developer (並列 N 体)
    Task tool で N 体を並列ディスパッチ
    prompt 先頭に [loom-meta] project_id=xxx, slot=dev-N, working_dir=/path/...

[4] Developer (各自)
    TDD ループ実行：
      失敗テスト → 実装 → 緑 → リファクタ
    review_mode 判定：
      [loom-meta] に review_mode 指定があればそれ採用
      なければ .claude-loom/project.json の rules.review_mode (default "single")
    review_mode == "single" → loom-review skill (single strategy) で general-purpose subagent 1 体 dispatch
    review_mode == "trio"   → loom-{code,security,test}-reviewer 3 体並列ディスパッチ

[5a] Reviewer (single mode、default)
     skill template が順次 3 観点回し、各段階で進捗テキスト出力
     findings を aspect 付き集約 JSON で返却

[5b] Review Trio (trio mode、opt-in)
     Code / Security / Test の 3 観点で並列レビュー
     各 reviewer が独立 JSON を返却、Developer が集約

[6] Developer ⇄ Review
    指摘 → 修正 → 再レビュー、を全クリアまで反復

[7] Developer → PM
    完了報告
    PM が Plan View を更新、コミット粒度ルール適用を確認

[8] PM
    spec 変更があれば doc 整合性エンジン v1 起動
    影響範囲を洗い出し → ユーザーに承認求める
```
