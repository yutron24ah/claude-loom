---
schema: claude-loom-plan-v1
project_id: claude-loom-self
last_synced_at: 1778025600000
---

# claude-loom 実装計画（マスターロードマップ）

> 本ファイルは長期マイルストーン管理（SPEC §6.8 フォーマット準拠）。
> 各マイルストーンの **詳細実装プラン** は `docs/plans/YYYY-MM-DD-claude-loom-mN-*.md` に分離。
> M0 完了後、M1 以降は各マイルストーンで writing-plans skill を再起動して詳細化する。
>
> **dogfood 戦略**：M0 = harness 完成後、M1 以降の実装は M0 の agent / command 群を使って進める（PM 主導、開発者が TDD、Reviewer が観点別レビュー — default は single mode 1 体、critical path は trio mode 3 体並列に切替可）。

## 原 6 案件 → milestone 対応表（M0 系列で完走）

session 起源の 6 案件 (A/B/C+G/D/E/F) と実装 milestone の対応：

| # | 案件 | milestone | tag |
|---|---|---|---|
| **A** | superpowers 完全削除（自前 skill 化、bootstrap 期で superpowers 共存停止） | M0.9 | `m0.9-complete` |
| **B** | 実装者 agent に SOLID/DRY/YAGNI など 13 原則をベースライン注入 | M0.9 | `m0.9-complete` |
| **C+G** | per-agent model 設定 + 人格注入 (Customization Layer、4 personality preset 同梱) | M0.9 | `m0.9-complete` |
| **D** | git worktree 統合（5 用途 + Decision tree、autonomous decision via skill） | M0.10 | `m0.10-complete` |
| **E** | retro → agent prompt feedback ループ (learned_guidance 機構) | M0.11 | `m0.11-complete` |
| **F** | 既存 PJ 検出 + 機能 opt-in/opt-out (Coexistence Mode、3 mode + 5 feature group) | M0.12 | `m0.12-complete` |

**ボーナス milestone**：
- M0.9.1：loom-write-plan 軽量化（plan 17x 圧縮 dogfood、M0.9 完了直後の即時改善）

## マイルストーン M0: Dev Harness（ブートストラップ）

詳細: `docs/plans/2026-04-26-claude-loom-m0-harness.md`

- [x] リポジトリスカフォールド + CLAUDE.md ワークフローガイド <!-- id: m0-t1 status: done -->
- [x] project.json テンプレート <!-- id: m0-t2 status: done -->
- [x] markdown テンプレ 4 種（SPEC / PLAN / CLAUDE / README、loom-managed マーカー含む） <!-- id: m0-t3 status: done -->
- [x] doc 整合性 manual checklist <!-- id: m0-t4 status: done -->
- [x] tests/REQUIREMENTS.md 骨格 + run_tests.sh <!-- id: m0-t5 status: done -->
- [x] install.sh（TDD 駆動、symlink + idempotent） <!-- id: m0-t6 status: done -->
- [x] loom-pm agent definition（init/adopt フロー含む） <!-- id: m0-t7 status: done -->
- [x] loom-developer agent definition <!-- id: m0-t8 status: done -->
- [x] loom-code-reviewer agent definition <!-- id: m0-t9 status: done -->
- [x] loom-security-reviewer agent definition <!-- id: m0-t10 status: done -->
- [x] loom-test-reviewer agent definition <!-- id: m0-t11 status: done -->
- [x] /loom-pm スラッシュコマンド <!-- id: m0-t12 status: done -->
- [x] /loom-spec スラッシュコマンド <!-- id: m0-t13 status: done -->
- [x] /loom-go スラッシュコマンド <!-- id: m0-t14 status: done -->
- [x] スモークテスト + README usage 整備 <!-- id: m0-t15 status: done -->

**M0 完成基準**：`/loom-pm` 起動 → PM システムプロンプトが load される → PM が Task tool で loom-developer を dispatch できる → developer が loom-code/security/test-reviewer の 3 体を並列ディスパッチできる、までが手元で動く。

## マイルストーン M0.5: Approval-Reduction Skills + install 拡張

詳細: `docs/plans/2026-04-26-claude-loom-m0.5-skills.md`

- [x] SPEC §3.6.1 + §9.1 更新 <!-- id: m0.5-t1 status: done -->
- [x] PLAN.md に M0.5 マイルストーン挿入 <!-- id: m0.5-t2 status: done -->
- [x] tests/REQUIREMENTS.md に REQ-008..REQ-011 追加 <!-- id: m0.5-t3 status: done -->
- [x] tests/skills_test.sh（skill 構造 + frontmatter 検証） <!-- id: m0.5-t4 status: done -->
- [x] skill: loom-test（SKILL.md + scripts/run.sh） <!-- id: m0.5-t5 status: done -->
- [x] skill: loom-status（SKILL.md + scripts/status.sh） <!-- id: m0.5-t6 status: done -->
- [x] skill: loom-tdd-cycle（prompt augmentation） <!-- id: m0.5-t7 status: done -->
- [x] skill: loom-review-trio（prompt augmentation） <!-- id: m0.5-t8 status: done -->
- [x] install.sh 拡張（skills symlink + settings template） <!-- id: m0.5-t9 status: done -->
- [x] install_test.sh で REQ-008/009 カバー <!-- id: m0.5-t10 status: done -->
- [x] templates/settings.json.template 作成 <!-- id: m0.5-t11 status: done -->
- [x] README.md + CLAUDE.md に skills 言及追加 <!-- id: m0.5-t12 status: done -->
- [x] スモークテスト + tag m0.5-complete <!-- id: m0.5-t13 status: done -->

**M0.5 完成基準**：`./install.sh` 実行で `~/.claude/skills/loom-{test,status,tdd-cycle,review-trio}/` が symlink として配置 + 4 つの skill が Claude Code セッション内で名前検出可能 + `templates/settings.json.template` の中身を新規 PJ にコピーすると bundled script が承認なしで実行可能。

## マイルストーン M0.6: Single-Reviewer Default + Trio Opt-in

詳細: `docs/plans/2026-04-27-claude-loom-m0.6-reviewer.md`

- [x] SPEC §4 reviewer mode 分岐 + §5 workflow 更新 <!-- id: m0.6-t1 status: done -->
- [x] SPEC §6.9 project.json schema review_mode 追加 <!-- id: m0.6-t2 status: done -->
- [x] PLAN.md M0.6 マイルストーン挿入 <!-- id: m0.6-t3 status: done -->
- [x] agents/loom-reviewer.md 作成（順次 3 観点 + 進捗テキスト + 集約 JSON） <!-- id: m0.6-t4 status: done -->
- [x] agents/loom-developer.md Step 8 を review_mode 分岐に改訂 <!-- id: m0.6-t5 status: done -->
- [x] skills/loom-review/SKILL.md 作成（single mode dispatch テンプレ） <!-- id: m0.6-t6 status: done -->
- [x] skills/loom-review-trio/SKILL.md 説明文を opt-in deep mode に更新 <!-- id: m0.6-t7 status: done -->
- [x] templates/claude-loom/project.json.template に review_mode 追加 <!-- id: m0.6-t8 status: done -->
- [x] README.md + CLAUDE.md 更新 <!-- id: m0.6-t9 status: done -->
- [x] スモークテスト + tag m0.6-complete <!-- id: m0.6-t10 status: done -->

**M0.6 完成基準**：`agents/loom-reviewer.md` が valid frontmatter + 順次 3 観点 prompt を持ち agents_test.sh で PASS、`skills/loom-review/SKILL.md` が valid frontmatter で skills_test.sh で PASS、`agents/loom-developer.md` が review_mode 分岐ロジックを記述、`templates/claude-loom/project.json.template` に `rules.review_mode: "single"` が含まれ jq empty で valid、`./tests/run_tests.sh` で 4 PASS / 0 FAIL 維持、`tag m0.6-complete` 設置。

## マイルストーン M0.7: Conventional Commits + GitHub Flow Adoption

詳細: `docs/plans/2026-04-27-claude-loom-m0.7-conventions.md`

- [x] SPEC §3.8 追加（CC + GitHub Flow 採用宣言） <!-- id: m0.7-t1 status: done -->
- [x] SPEC §6.9 schema 拡張（commit_prefixes 11 / branch_types / commit_language） <!-- id: m0.7-t2 status: done -->
- [x] PLAN.md M0.7 マイルストーン挿入 <!-- id: m0.7-t3 status: done -->
- [x] docs/COMMIT_GUIDE.md 新設 <!-- id: m0.7-t4 status: done -->
- [x] tests/REQUIREMENTS.md REQ-012/013/014 追加 <!-- id: m0.7-t5 status: done -->
- [x] tests/conventions_test.sh 新設 <!-- id: m0.7-t6 status: done -->
- [x] templates/claude-loom/project.json.template 拡張 <!-- id: m0.7-t7 status: done -->
- [x] CLAUDE.md + templates/CLAUDE.md.template 詳細化 <!-- id: m0.7-t8 status: done -->
- [x] README.md にコミット/ブランチ規約セクション追加 <!-- id: m0.7-t9 status: done -->
- [x] スモークテスト + tag m0.7-complete <!-- id: m0.7-t10 status: done -->

**M0.7 完成基準**：`./tests/run_tests.sh` で 5 PASS / 0 FAIL（既存 4 + conventions）、`docs/COMMIT_GUIDE.md` が CC 11 types + GitHub Flow 詳細を網羅、`templates/claude-loom/project.json.template` が `commit_prefixes`（11 種）/ `branch_types`（10 種）/ `commit_language`（`"any"`）を含み jq empty で valid、`tag m0.7-complete` 設置。

## マイルストーン M0.8: Retro Architecture（賢くなる開発室の中核）

詳細: `docs/plans/2026-04-27-claude-loom-m0.8-retro.md`
設計 SSoT: `docs/plans/specs/2026-04-27-retro-design.md`

- [x] SPEC §3.9 retro adoption section 追加 <!-- id: m0.8-t1 status: done -->
- [x] SPEC §6.9.1/.2/.3 prefs schemas + merge rule 追加 <!-- id: m0.8-t2 status: done -->
- [x] PLAN.md M0.8 マイルストーン挿入 <!-- id: m0.8-t3 status: done -->
- [x] tests/REQUIREMENTS.md REQ-015..018 追加 <!-- id: m0.8-t4 status: done -->
- [x] docs/RETRO_GUIDE.md 新設 + docs/retro/.gitkeep <!-- id: m0.8-t5 status: done -->
- [x] tests/retro_test.sh 新設（TDD red） <!-- id: m0.8-t6 status: done -->
- [x] templates/user-prefs.json.template 新設 <!-- id: m0.8-t7 status: done -->
- [x] templates/project-prefs.json.template 新設 <!-- id: m0.8-t8 status: done -->
- [x] agents/loom-retro-pm.md 新設 <!-- id: m0.8-t9 status: done -->
- [x] agents/loom-retro-pj-judge.md 新設 <!-- id: m0.8-t10 status: done -->
- [x] agents/loom-retro-process-judge.md 新設 <!-- id: m0.8-t11 status: done -->
- [x] agents/loom-retro-meta-judge.md 新設 <!-- id: m0.8-t12 status: done -->
- [x] agents/loom-retro-counter-arguer.md 新設 <!-- id: m0.8-t13 status: done -->
- [x] agents/loom-retro-aggregator.md 新設 <!-- id: m0.8-t14 status: done -->
- [x] agents/loom-retro-researcher.md 新設 <!-- id: m0.8-t15 status: done -->
- [x] skills/loom-retro/SKILL.md 新設 <!-- id: m0.8-t16 status: done -->
- [x] commands/loom-retro.md 新設 <!-- id: m0.8-t17 status: done -->
- [x] agents/loom-pm.md milestone hook 追記 <!-- id: m0.8-t18 status: done -->
- [x] README.md + CLAUDE.md + templates/CLAUDE.md.template 更新 <!-- id: m0.8-t19 status: done -->
- [x] スモークテスト + tag m0.8-complete <!-- id: m0.8-t20 status: done -->

**M0.8 完成基準**：`./tests/run_tests.sh` で 6 PASS（既存 5 + retro 1）、`/loom-retro` 起動 → 4 lens 並列 → counter-argument → aggregator が会話 mode で findings 提示までが手元で動く。`/loom-retro --report` で archive markdown のみ生成も動く。`tag m0.8-complete` 設置、`m0`〜`m0.7-complete` 全保持。

## マイルストーン M0.9: Harness Polish（superpowers 独立 + Customization Layer）

詳細: `docs/plans/2026-04-29-claude-loom-m0.9-harness-polish.md`
設計 SSoT: `docs/plans/specs/2026-04-29-m0.9-design.md`

- [x] SPEC §3.6.5 / §3.10 / §6.9.4 追加 <!-- id: m0.9-t1 status: done -->
- [x] PLAN.md M0.9 マイルストーン挿入 <!-- id: m0.9-t2 status: done -->
- [x] tests/REQUIREMENTS.md REQ-019..022 追加 <!-- id: m0.9-t3 status: done -->
- [x] docs/DOC_CONSISTENCY_CHECKLIST.md 更新 <!-- id: m0.9-t4 status: done -->
- [x] tests/agents_test.sh 拡張（principles assertion red） <!-- id: m0.9-t5 status: done -->
- [x] docs/CODING_PRINCIPLES.md 新設 <!-- id: m0.9-t6 status: done -->
- [x] agents/loom-developer.md に Coding Principles セクション追加 <!-- id: m0.9-t7 status: done -->
- [x] reviewer agent prompt に principle review 観点追加 <!-- id: m0.9-t8 status: done -->
- [x] tests/personality_test.sh 新設（red） <!-- id: m0.9-t9 status: done -->
- [x] prompts/personalities/default.md 新設 <!-- id: m0.9-t10 status: done -->
- [x] prompts/personalities/friendly-mentor.md 新設 <!-- id: m0.9-t11 status: done -->
- [x] prompts/personalities/strict-drill.md + detective.md 新設 <!-- id: m0.9-t12 status: done -->
- [x] tests/prefs_test.sh 新設（red） + templates 更新 <!-- id: m0.9-t13 status: done -->
- [x] templates/project-prefs.json.template 更新 <!-- id: m0.9-t14 status: done -->
- [x] agents/loom-pm.md customization 参照追加 <!-- id: m0.9-t15 status: done -->
- [x] agents/loom-developer.md customization 参照追加 <!-- id: m0.9-t16 status: done -->
- [x] reviewer agent 4 体 customization 参照追加 <!-- id: m0.9-t17 status: done -->
- [x] agents/loom-retro-pm.md customization 参照追加 <!-- id: m0.9-t18 status: done -->
- [x] retro lens 6 体 customization 参照追加（並列） <!-- id: m0.9-t19 status: done -->
- [x] tests/agents_test.sh customization assertion green <!-- id: m0.9-t20 status: done -->
- [x] skills/loom-write-plan + loom-debug 新設 + skills_test 拡張 <!-- id: m0.9-t21 status: done -->
- [x] CLAUDE.md superpowers 独立明記 <!-- id: m0.9-t22 status: done -->
- [x] templates/CLAUDE.md.template 同期 <!-- id: m0.9-t23 status: done -->
- [x] README.md customization 入門追加 <!-- id: m0.9-t24 status: done -->
- [x] docs/RETRO_GUIDE.md customization 観測経路追記 <!-- id: m0.9-t25 status: done -->
- [x] 全 test 8 PASS 確認 + 実機検証 <!-- id: m0.9-t26 status: done -->
- [x] PLAN.md M0.9 tasks done マーク <!-- id: m0.9-t27 status: done -->
- [x] tag m0.9-complete + retro 提案 <!-- id: m0.9-t28 status: done -->

**M0.9 完成基準**：`./tests/run_tests.sh` で **8 PASS**（既存 6 + prefs_test + personality_test）、`agents.loom-pm.personality = "detective"` を user-prefs に設定 → `/loom-pm` 起動で関西弁挨拶（実機検証）、`docs/CODING_PRINCIPLES.md` 13 原則 SSoT 配置 + dev/reviewer 参照、`skills/loom-write-plan` + `skills/loom-debug` valid frontmatter、`tag m0.9-complete` 設置、`m0`〜`m0.8-complete` 全保持。

## マイルストーン M0.9.1: loom-write-plan 軽量化（plan format refactor）

詳細: `docs/plans/2026-04-29-claude-loom-m0.9.1-write-plan-lightweight.md`

M0.9 で得た教訓「2523 行 plan は重すぎ」の即時反映。loom-write-plan skill が生成する plan の書式を **必須 5 フィールド軽量版** に refactor し、Task ごとの exact code 転記を撤去、design spec への pointer 化。既存 M0.8/M0.9 plan は凍結（migrate せず）。

- [x] skills/loom-write-plan/SKILL.md を軽量版にリライト <!-- id: m0.9.1-t1 status: done -->
- [x] PLAN.md M0.9.1 マイルストーン挿入（本タスク） <!-- id: m0.9.1-t2 status: done -->
- [x] 軽量 plan サンプル文書化（SKILL.md 内に concrete example） <!-- id: m0.9.1-t3 status: done -->
- [x] skills_test.sh の section assertion を新書式に整合確認（おそらく変更不要） <!-- id: m0.9.1-t4 status: done -->
- [x] 全 test PASS + tag m0.9.1-complete <!-- id: m0.9.1-t5 status: done -->

**M0.9.1 完成基準**：`./tests/run_tests.sh` で **8 PASS** 維持、`skills/loom-write-plan/SKILL.md` が軽量版書式（必須 5 フィールド：Goal / Files / Spec ref / Integrity check / Commit prefix）+ concrete example を含む、既存 M0.8/M0.9 plan は touch せず凍結、`tag m0.9.1-complete` 設置、`m0`〜`m0.9-complete` 全保持。

## マイルストーン M0.10: git worktree 統合

詳細: `docs/plans/2026-04-29-claude-loom-m0.10-worktree.md`

worktree 機能を claude-loom に取り込み。並列 dev / 安全実験 / branch 比較 / hotfix 隔離 / 一時 review の 5 用途を skill に集約、PM / dev / retro-pm が **自律的に判断**して必要時に発動。default 動作（同 tree）は不変、opt-in 起動。

- [x] PLAN.md M0.10 マイルストーン挿入（本タスク） <!-- id: m0.10-t1 status: done -->
- [x] skills/loom-worktree/SKILL.md 新設（5 用途 + Decision tree + 安全コマンド集） <!-- id: m0.10-t2 status: done -->
- [x] commands/loom-worktree.md 新設（明示 invoke 用 slash command） <!-- id: m0.10-t3 status: done -->
- [x] templates/project-prefs.json.template に worktree section 追加（base_path / auto_cleanup / max_concurrent） <!-- id: m0.10-t4 status: done -->
- [x] agents/loom-pm.md / loom-developer.md / loom-retro-pm.md に loom-worktree 自律参照追記 <!-- id: m0.10-t5 status: done -->
- [x] tests/skills_test.sh に loom-worktree section 検証追加 <!-- id: m0.10-t6 status: done -->
- [x] SPEC.md §3.x worktree 章追加 + README.md 入門 + DOC_CONSISTENCY 更新 <!-- id: m0.10-t7 status: done -->
- [x] 全 test PASS + tag m0.10-complete + main merge <!-- id: m0.10-t8 status: done -->

**M0.10 完成基準**：`./tests/run_tests.sh` で **8 PASS** 維持、`skills/loom-worktree/SKILL.md` が必須 sections（When to use / Decision tree / Commands / Path convention / Safety rules / Anti-patterns）valid frontmatter、`commands/loom-worktree.md` valid、agent prompt 3 体に `loom-worktree` 参照記述、`templates/project-prefs.json.template` に `worktree` section 含み jq empty で valid、`tag m0.10-complete` 設置、`m0`〜`m0.9.1-complete` 全保持。

## マイルストーン M0.11: retro → agent prompt feedback loop

詳細: `docs/plans/2026-04-29-claude-loom-m0.11-retro-feedback.md`

M0.8 retro architecture の最終形：承認された finding を `agents.<name>.learned_guidance[]` (M0.9 Customization Layer schema 拡張) に蓄積し、agent dispatch 時に `[loom-learned-guidance]` block として注入。賢くなる開発室の自己進化機構。

設計合意（対話履歴）:
- 案 B: prefs に蓄積 + Customization Layer 経由で注入（agents/*.md は static のまま）
- finding に `target_artifact` / `target_agent[]` / `guidance_proposal` field 追加（lens が tag 付与 + user 承認時 override 可）
- scope: default project-prefs、user 昇格 opt-in
- 注入 format: `- <id>: <text>` の compact 1 行
- block 順序: `[loom-customization]` の後、task の前
- TTL / use_count v1 manual（自動 prune は M0.11.1+）

- [x] PLAN.md M0.11 マイルストーン挿入（本タスク） <!-- id: m0.11-t1 status: done -->
- [x] tests/REQUIREMENTS.md REQ-025 追加 <!-- id: m0.11-t2 status: done -->
- [x] SPEC.md §3.6.5 / §3.9 / §6.9.4 拡張（learned_guidance schema + lens tagging + 注入機構） <!-- id: m0.11-t3 status: done -->
- [x] docs/RETRO_GUIDE.md に lens tagging convention 追記 <!-- id: m0.11-t4 status: done -->
- [x] docs/DOC_CONSISTENCY_CHECKLIST.md に M0.11 check items 追加 <!-- id: m0.11-t5 status: done -->
- [x] templates/{user,project}-prefs.json.template に learned_guidance example 追加 <!-- id: m0.11-t6 status: done -->
- [x] 4 retro lens (pj/process/meta/researcher) に target_artifact / target_agent / guidance_proposal field 追加 <!-- id: m0.11-t7 status: done -->
- [x] agents/loom-retro-aggregator.md に learned_guidance write logic 追加 <!-- id: m0.11-t8 status: done -->
- [x] agents/loom-retro-counter-arguer.md に tag preservation 記述 <!-- id: m0.11-t9 status: done -->
- [x] 13 agent prompt の Customization Layer に learned_guidance read + 注入指示 追記 <!-- id: m0.11-t10 status: done -->
- [x] tests 拡張（prefs/agents/retro 各 _test.sh で learned_guidance + lens tag assertion） <!-- id: m0.11-t11 status: done -->
- [x] README.md に user-facing 説明追加 <!-- id: m0.11-t12 status: done -->
- [x] 全 test PASS + tag m0.11-complete + main merge <!-- id: m0.11-t13 status: done -->

**M0.11 完成基準**：`./tests/run_tests.sh` で **8 PASS** 維持、retro lens 4 体が finding 出力に target_artifact / target_agent / guidance_proposal を含む、loom-retro-aggregator が承認 finding を `agents.<target>.learned_guidance[]` に書き込む logic を持つ、13 agent prompt の Customization Layer が learned_guidance を read + `[loom-learned-guidance]` block として注入、`templates/{user,project}-prefs.json.template` の `agents.<name>.learned_guidance: []` が jq empty で valid、`tag m0.11-complete` 設置、`m0`〜`m0.10-complete` 全保持。

## マイルストーン M0.11.1: Lifecycle Tracking Architecture（finding + guidance lifecycle）

詳細: 未作成（impl phase で `docs/plans/2026-05-XX-claude-loom-m0.11.1-lifecycle-tracking.md` を `loom-write-plan` skill で詳細化）
retro 起源: `docs/retro/2026-05-02-002-report.md` (proc-NEW-2 + meta-002 共通 root cause)

retro 2026-05-02-002 で観測された **lifecycle tracking 不在** を構造的に解決する milestone。pj-002 stale finding re-up（M2/M3.0 retro 2 連続発生）+ learned_guidance auto-prune mechanism 不在（M0.11 で v1 manual と意識的 deferral 決定済）の 2 件を **共通 root cause = lifecycle tracking** として 1 milestone で構造解決。SPEC §3.9.x P4 (Root cause first) の理想形：interim safety net (proc-NEW-1 = counter-arguer stale check) を構造的に置換し、症状対処を rollback する mechanism を成立させる。

設計合意（2026-05-02 retro 対話、SPEC §3.9.x P4 SSoT）:
- **proc-NEW-2 (structural)**: pending.json schema 拡張で `applied_in: { commit_sha, milestone_tag, applied_at }` field 追加、retro-pm Stage 0 で過去 retro session の pending.json scan + `applied_summary.json` 生成、4 lens prompt に applied summary を context として注入する mechanism
- **meta-002 共通 root cause**: learned_guidance auto-prune mechanism (M0.11 v1 manual の M0.11.1+ scope)、use_count + ttl_sessions + last_used_in field の active prune 自動化
- **proc-NEW-1 rollback**: 本 milestone closure 後、`agents/loom-retro-counter-arguer.md` の stale finding detection section (interim safety net) を rollback、retro-pm Stage 0 mechanism に置換 = symptomatic patch を構造的に消滅させる

### Spec phase 完了 (2026-05-02 spec phase で実施済)

- [x] PLAN.md M0.11.1 milestone 挿入 + 設計合意 5 件確定 (A1/B1/C2/D1/E3) <!-- id: m0.11.1-t1 status: done -->
- [x] tests/REQUIREMENTS.md REQ-035 追加 <!-- id: m0.11.1-t2 status: done -->
- [x] SPEC §3.9.11 (Lifecycle Tracking Architecture) + §6.9.6 (pending.json schema v2) + §6.9.7 (applied_summary.json schema) 新設 + §6.9.4.5 (learned_guidance auto-prune rule) 拡張 <!-- id: m0.11.1-t3 status: done -->
- [x] docs/RETRO_GUIDE.md "Lifecycle Tracking Architecture" section 追加 (Finding lifecycle + Guidance lifecycle + Symptomatic rollback example) <!-- id: m0.11.1-t4 status: done -->
- [x] docs/DOC_CONSISTENCY_CHECKLIST.md M0.11.1 章追加 (10 check items) <!-- id: m0.11.1-t5 status: done -->

### Impl phase 残作業 (9 task)

- [x] templates/{user,project}-prefs.json.template に `last_used_in` field example 追加 <!-- id: m0.11.1-t6 status: done -->
- [x] migration script: 既存 4 retro session pending.json (2026-04-29-001 / 2026-05-02-001 / 2026-05-02-002 + 古い 1 件確認) の `applied_in` + `apply_history` field 後付け書き込み + schema_version 1 → 2 migrate <!-- id: m0.11.1-t7 status: done -->
- [x] agents/loom-retro-pm.md Stage 0 拡張 (applied_summary.json lazy build 5 step、SPEC §6.9.7 手順) <!-- id: m0.11.1-t8 status: done -->
- [x] 4 lens prompt (pj-judge/process-judge/meta-judge/researcher) に `applied_summary_path` injection + `Read` tool 参照 mechanism 追記 <!-- id: m0.11.1-t9 status: done -->
- [x] agents/loom-retro-aggregator.md に learned_guidance auto-prune logic (`ttl_sessions` main auto-deactivate + `last_used_in` update on retro reference) 追加 <!-- id: m0.11.1-t10 status: done -->
- [x] applied_summary mechanism dry-run test: 既存 4 retro session pending.json で applied_summary build → schema validate → fixture diff (t11 rollback 前安全網) <!-- id: m0.11.1-t11 status: done -->
- [x] agents/loom-retro-counter-arguer.md の stale finding detection section **物理削除** (M3.0 retro proc-NEW-1 構造的消滅、SPEC §3.9.x P4 理想形初例、t11 dry-run test pass 後実施) <!-- id: m0.11.1-t12 status: done -->
- [x] tests/{prefs,retro,agents}_test.sh 拡張 (`applied_in` schema + `applied_summary` build + auto-prune assertion + counter-arguer stale check section **不在** assertion) <!-- id: m0.11.1-t13 status: done -->
- [ ] 全 test PASS (`./tests/run_tests.sh` 13 PASS 維持) + tag m0.11.1-complete + main merge <!-- id: m0.11.1-t14 status: todo -->

**M0.11.1 完成基準**：
- `./tests/run_tests.sh` で **13 PASS** 維持（既存 12 test files + 新規 1 test file `dry_run_applied_summary_test.sh` 追加 = 13、applied_in / applied_summary / auto-prune / counter-arguer stale check 不在 assertion は各 test file 内 sub-assertion で拡張）
- SPEC §3.9.11 + §6.9.6 (pending.json v2) + §6.9.7 (applied_summary) + §6.9.4.5 (auto-prune rule) で lifecycle tracking SSoT 確立 (spec phase 完了済)
- agents/loom-retro-pm.md Stage 0 で applied_summary.json lazy build 動作 + 4 lens prompt が path 経由 read mechanism 持つ
- agents/loom-retro-counter-arguer.md の stale finding detection section **物理削除** = symptomatic patch 構造的消滅 (SPEC §3.9.x P4 理想形初例、archive 価値最大)
- agents/loom-retro-aggregator.md に auto-prune logic (ttl_sessions auto-deactivate + last_used_in update)
- 既存 4 retro session の pending.json に `applied_in` + `apply_history` field 後付け migration 完了 (schema_version 1 → 2)
- dry-run test pass (rollback 前安全網、t11 → t12 順序遵守)
- `tag m0.11.1-complete` 設置、`m0`〜`m3.0-complete` 全保持

## マイルストーン M0.11.2: Pending Lifecycle Tracking（M0.11.1 next iteration）

詳細: 未作成（spec phase 開始時に `loom-write-plan` skill で詳細化）
retro 起源: `docs/retro/2026-05-03-001-report.md` finding meta-003 (structural、M0.X cleanup 系列候補)

retro 2026-05-03-001 で観測された **pending finding lifecycle tracking 不在** を構造的に解決する milestone。M0.11.1 で applied finding の lifecycle tracking architecture (`applied_summary.json`) を確立したが、**status: pending のまま carryover される finding** は applied_summary に集約されず、4 lens は 'pending として宙ぶらりん状態' を context として取得できん。本 retro で res-001 (carryover from 2026-05-02-001) と proc-003 (parallel-batch audit log carryover) が surface したが、stale 排除でも apply 候補でもない、'未処理の宙ぶらりん' 状態が permanent に積み上がる pattern。M0.11.1 lifecycle tracking architecture の **next iteration** として proposed。

### 設計合意候補（M0.11.2 spec phase で詰める）

- **pending_summary schema 新設**: SPEC §3.9.x or §6.9.x で `pending_summary.json` schema 定義、retro-pm Stage 0 で過去全 retro session の status: pending findings 集約
- **4 lens prompt 拡張**: `pending_summary_path` 注入、lens は applied_summary と pending_summary 両方を `Read` で参照、'pending carryover' を re-up じゃなく 'still relevant?' assessment 対象として扱う
- **finding lifecycle 状態遷移 formalize**: SPEC §3.9.x で pending → approved → applied (M0.11.1 既存) + pending → expired (TTL or N session 越え auto-close) + pending → re-evaluated-still-relevant (lens 判定で本 retro の新 finding に格上げ) を define
- **migration**: 既存 4+ retro session の pending.json から carryover 候補抽出 + lifecycle field 後付け (M0.11.1 migration script の延長)

### Task （spec phase で確定後 list 化、retro 2026-05-04-001 F-meta-002 で scope 拡張済）

- [ ] SPEC §3.9.x or §6.9.x に pending_summary schema 新設 <!-- id: m0.11.2-t1 status: todo -->
- [ ] retro-pm Stage 0 で pending_summary.json lazy build mechanism 追加 <!-- id: m0.11.2-t2 status: todo -->
- [ ] 4 lens prompt に pending_summary_path injection + 'still relevant?' assessment guidance 追加 <!-- id: m0.11.2-t3 status: todo -->
- [ ] finding lifecycle 状態遷移 (pending → expired auto-close 等) formalize <!-- id: m0.11.2-t4 status: todo -->
- [ ] migration script: 既存 retro session の pending.json に lifecycle field 後付け <!-- id: m0.11.2-t5 status: todo -->
- [ ] tests 拡張 (pending_summary build + auto-expiration assertion) <!-- id: m0.11.2-t6 status: todo -->
- [ ] **archive markdown reconstruction logic** (retro 2026-05-04-001 F-meta-002): pending.json 不在時 `docs/retro/<retro_id>-report.md` から applied/recorded findings を抽出して applied_summary に再構築する fallback 実装、SPEC §3.9.12 の retro state durability 補完 <!-- id: m0.11.2-t7 status: todo -->
- [ ] **Token meter UX iteration** (retro 2026-05-04-001 F-res-003): ui/src/live/useTokenUsage.ts に refetchInterval enabled flag (session-active 時のみ polling) + ui/src/components/Sidebar.tsx を AppShell に wire up (M5 t4 reviewer 指摘の dead export 解消) <!-- id: m0.11.2-t8 status: todo -->
- [ ] tag m0.11.2-complete 設置、Phase 1 全 milestone tag 全保持 <!-- id: m0.11.2-t9 status: todo -->

**M0.11.2 着手タイミング**: Phase 1 → Phase 2 boundary milestone、Phase 2 entry 前の cleanup として実施推奨。**M0.11.3 完了後に着手**（M0.11.3 で確立する loom-ui-smoke skill を本 milestone 自身の verify にも活用、cumulative refinement chain）。M0.X cleanup 系列 (M0.11.1 / M0.13 / M0.14 と同 family) として short milestone (推定 7-9 task)。本 milestone は SPEC §3.9.x P4 (Root cause first) の 2 回目 application、M0.11.1 の lifecycle tracking architecture を pending side + durability side に拡張する cumulative refinement。

## マイルストーン M0.11.3: UI Smoke Test Skill（loom-ui-smoke skill 新設）

詳細: 未作成（spec phase 開始時に `loom-write-plan` skill で詳細化候補）
retro 起源: `docs/retro/2026-05-04-001-report.md` finding F-proc-005 拡張 (success record + structural codify)、`memory/feedback_ui_smoke_test_skill.md` SSoT 昇格

retro 2026-05-04-001 で F-proc-005 を success record として codify した直後、Phase 1 MVP main 統合 + Playwright MCP smoke test で **追加 4 件 critical bug**（Phaser 描画ゼロ / WS transform error / TodoWrite mock 残存 / Sidebar dead code）が発覚 → `hotfix/m5-smoke-bugs` で全 fix 済。「automated test green ≠ 画面が動く」gap を構造的に塞ぐ **`loom-ui-smoke` skill** を新設、各 milestone closure で **bash E2E + browser smoke の 2 層 verification** を default 化。

### 設計合意（2026-05-05 spec phase 対話、SPEC §3.6.11 + §10.4 SSoT）

- **Skill 形式**: suggest skill (UI 開発時のみ必要、§3.10.1 mandate vs suggest table の suggest 側)、Phase 2 で agent 化検討
- **Pipeline**: hybrid Option C — Stage 1 戦略 derive (AI prompt-driven、creative) + Stage 2 実機 verify (AI が Playwright MCP browser_* tool 駆動、deterministic order) + Stage 3 report 生成 (bundled script `format-report.sh` + JSON schema validate、deterministic)
- **Output dir**: `docs/smoke-tests/<YYYY-MM-DD>-<scope>/` (strategy.md / report.md / screenshots/<NN>-<route>.png / console.log / findings.json)
- **Invocation**: 3 pattern (`/loom-ui-smoke` slash command + `[loom-meta] suggest_skill=loom-ui-smoke` injection + 自律 invoke at milestone closure)
- **Scope param**: full (default) / route:<name> / smoke-only
- **dev server lifecycle**: hybrid Option C (auto-detect + opt-in `--auto-start` flag、既起動時は流用、未起動時は user prompt)
- **Failure handling**: skill は report 生成のみ、fix dispatch せん (PM 受領 + user 確認後 dispatch、SRP 整合)
- **Consumer**: primary loom-developer / secondary loom-pm、loom-test-reviewer は scope 外
- **依存**: Playwright MCP tool 群 + bash + jq (graceful skip 規約)

### Task （9 task、推定）

- [x] SPEC §3.6.11 + §10.4 新設 (loom-ui-smoke skill design SSoT) <!-- id: m0.11.3-t1 status: done -->
- [x] tests/REQUIREMENTS.md REQ-044 追加 (UI smoke skill acceptance) <!-- id: m0.11.3-t2 status: done -->
- [x] skills/loom-ui-smoke/SKILL.md draft (Stage 1 prompt augmentation + Stage 2 Playwright MCP 駆動 instruction) <!-- id: m0.11.3-t3 status: done -->
- [x] skills/loom-ui-smoke/scripts/format-report.sh + templates/findings.schema.json (Stage 3 deterministic formatter) <!-- id: m0.11.3-t4 status: done -->
- [x] skills/loom-ui-smoke/scripts/start-servers.sh (Q1 hybrid C 補助、auto-detect + opt-in) <!-- id: m0.11.3-t5 status: done -->
- [x] commands/loom-ui-smoke.md (slash command 新設) <!-- id: m0.11.3-t6 status: done -->
- [x] agents/loom-developer.md + loom-pm.md に suggest skill 参照記述 + milestone closure 自律 invoke logic 追記 <!-- id: m0.11.3-t7 status: done -->
- [x] skill self-test: 自身を main HEAD で実行、hotfix 完了後の状態を smoke verify、report 生成 + findings.json schema validate 動作確認 <!-- id: m0.11.3-t8 status: done -->
- [x] tag m0.11.3-complete + harness 18 PASS 維持 + Phase 1 全 milestone tag 全保持 <!-- id: m0.11.3-t9 status: done -->

**M0.11.3 着手タイミング**: M0.11.2 より **先** に実施 (Phase 1 → Phase 2 boundary、cumulative dogfood reasoning — skill 完成後 M0.11.2 自身の verify にも活用可)。M0.X cleanup 系列、推定 5-7 task 規模 (script 実装含めて 9 task)。本 milestone は retro feedback loop (M3.1 codify → M4/M5 で運用 → M5 closure smoke で gap 検出 → 本 skill で gap 埋め) の **3 周目 cumulative refinement**。

## マイルストーン M0.11.4: Design Implementation Pass（Phase 1 aesthetic MVP completion）

詳細: 未作成（impl phase で書く前提、本 spec phase で task list 確定）
design source: `claude-room-handoff.zip` (Claude Design tool export bundle、`/tmp/claude-room-handoff/claude-room/project/` 配置)
SPEC SSoT: §3.6.12 (Design Implementation)、§3.6.9.1 改訂 (Phaser α-1 → DOM/SVG α-2)、§12 確定値表 update

M0.11.3 で `loom-ui-smoke` skill 完成 + Phase 1 functional MVP 検証完了したが、user 由来 design vision (13 cat agent + Stardew 系 pixel RPG room + 3 theme + RPG window chrome) が **未実装**、aesthetic MVP closure 未達成。本 milestone で design bundle full port を実施、`m0.11.4-complete` tag を **aesthetic MVP completion** marker として設置、Phase 1 真の MVP 完成達成。

### 戦略合意（2026-05-05 spec phase 対話）

- **戦略 A**: Phaser → DOM/SVG 採用 (M3.0 Phaser infra rollback、design pixel-perfect realization)
- **scope**: full design implementation (Room + 全 view、新 view (Sessions/Tokens/ProjectSettings) は RPG 言語で 新規設計)
- **MVP closure 再定義**: m5-complete = functional / m0.11.3 = verification infra / m0.11.4 = aesthetic、3 段階 closure marker

### Task （20 task、推定）

#### Phase A: foundation (sequential)
- [ ] SPEC §3.6.9.1 改訂 (Phaser α-1 → DOM/SVG α-2) + §12 確定値表 Phaser 行 archive 注記 (本 spec phase で done) <!-- id: m0.11.4-t1 status: done -->
- [ ] tests/REQUIREMENTS.md REQ-045 追加 (本 spec phase で done) <!-- id: m0.11.4-t2 status: done -->
- [ ] ui/src/styles/tokens.css 全面書直し (3 theme palette --p-* + RPG primitives) <!-- id: m0.11.4-t3 status: todo -->

#### Phase B: Room view (mostly parallel)
- [ ] ui/src/components/CatSprite.tsx (16x16 pixel grid SVG、9 hat × 3 pose) + ui/src/data/roster.ts (13 agent metadata) <!-- id: m0.11.4-t4 status: todo -->
- [ ] ui/src/views/room/RoomBackground.tsx (SVG floor + wall + tile grid) <!-- id: m0.11.4-t5 status: todo -->
- [ ] ui/src/views/room/DeskStation.tsx (cat + speech bubble + monitor + nameplate + TDD tag) <!-- id: m0.11.4-t6 status: todo -->
- [ ] ui/src/views/room/wall-posters/* (Gantt + Plan + Consistency wall posters with click-to-overlay) + Plant + Whiteboard + Sign decor <!-- id: m0.11.4-t7 status: todo -->
- [ ] ui/src/views/room/Islands.tsx (PM + Dev + Review island layout + signs) <!-- id: m0.11.4-t8 status: todo -->
- [ ] ui/src/views/room/SubroomClone.tsx (worktree sub-agent ghost cat) + ui/src/views/worktree/SubroomView.tsx <!-- id: m0.11.4-t9 status: todo -->
- [ ] ui/src/views/room/AgentDetailPanel.tsx 全面書直し (M3.2 → RPG-style) + room-modal CSS <!-- id: m0.11.4-t10 status: todo -->
- [ ] ui/src/views/room/RetroGathering.tsx (perimeter cats + whiteboard center) + room-mode-toggle <!-- id: m0.11.4-t11 status: todo -->
- [ ] ui/src/views/room/RoomView.tsx 全面書直し (M3.0 Phaser → DOM/SVG orchestration、t4-t11 統合) <!-- id: m0.11.4-t12 status: todo -->

#### Phase C: Other views (parallel)
- [x] PlanView.tsx (M3.1 → screens-b PlanView port) + GanttView.tsx (M3.1 → screens-a Gantt port) <!-- id: m0.11.4-t13 status: done -->
- [x] ConsistencyView.tsx (M4 → screens-c port) + RetroView.tsx (screens-b port) <!-- id: m0.11.4-t14 status: done -->
- [x] CharSheet.tsx + ThemeShowcase.tsx (char-sheet.jsx port) + WorktreeView.tsx + CustomizationView.tsx + LearnedGuidanceView.tsx (screens-c port) <!-- id: m0.11.4-t15 status: done -->
- [x] 新 view RPG style 化 (Sessions / Tokens / ProjectSettings、design source 不在ゆえ design 言語で 新規設計) + Sidebar.tsx RPG style update + DisciplineHeader.tsx RPG style update <!-- id: m0.11.4-t16 status: done -->

#### Phase D: cleanup + verify
- [x] Phaser dependency 物理削除 (ui/package.json から phaser remove + PhaserCanvas.tsx + scenes/RoomScene.ts + agentSpriteSync.ts 削除) + 関連 test 整理 <!-- id: m0.11.4-t17 status: done -->
- [x] Playwright e2e baseline (room-pop.png) 再生成 + 3 theme baseline 追加 (room-dusk.png + room-night.png) <!-- id: m0.11.4-t18 status: done -->
- [x] loom-ui-smoke skill execute (full scope)、aesthetic verify、`docs/smoke-tests/2026-05-XX-m0.11.4-aesthetic-verify/` 生成 <!-- id: m0.11.4-t19 status: done -->
- [x] tag m0.11.4-complete + README "Phase 1 MVP completed" 完全達成 marker update <!-- id: m0.11.4-t20 status: done -->

**M0.11.4 着手タイミング**: M0.11.3 直後 (Phase 1 → Phase 2 boundary milestone、aesthetic MVP completion priority 高)。dispatch 戦略：t3 sequential → t4-t12 parallel batch (4-5 dev) → t13-t16 parallel batch (4 dev) → t17-t20 sequential closure。推定 12-15 dev dispatch。

## マイルストーン M0.11.5: Lazy Daemon Auto-Launch Implementation（SPEC §3.2 整合化）

起源: 2026-05-06 user との README 公開準備対話。SPEC §3.2 が当初から「slash command → daemon health-check → cold start なら browser open」の lazy daemon flow を SSoT として定義しとるが、Phase 1 MVP 実装は **daemon と UI を別 dev server で手動起動** する暫定形のまま MVP closure（README にも "Phase 2 roadmap" と書かれて SPEC drift 状態）。本 milestone で SPEC §3.2 と実装の整合性を回復し、Phase 1 closure cleanup を完成させる。

### 設計合意（2026-05-06 spec phase 対話、SPEC §3.2 SSoT）

- **Trigger 範囲**: `/loom`（help）と `/loom-stop`（shutdown）以外の 7 slash command が trigger（`/loom-pm`, `/loom-spec`, `/loom-go`, `/loom-retro`, `/loom-status`, `/loom-worktree`, `/loom-mode`）
- **Browser open 戦略**: daemon cold start 時のみ open。既起動時は health-check のみで browser open しない（タブ氾濫回避、Linux `xdg-open` の重複 open 抑制、cross-platform 整合性確保）
- **「もう 1 タブ欲しい」救済路**: `/loom` の役割を help から「URL 表示 + clipboard コピー」に拡張、cold-start-only open ポリシーを補完する dual path
- **永続 opt-out**: `<project>/.claude-loom/project-prefs.json` の `ui.auto_launch: false` で PJ 単位無効化
- **Headless 検出**: `$SSH_CONNECTION` セット / Linux で `$DISPLAY` 空 / `open`・`xdg-open`・`start` 全部不在 → browser open skip、URL を terminal に出力。`LOOM_NO_UI=1` 環境変数で強制 skip 可（CI / Docker / 手動制御用）
- **Daemon production serve**: daemon が built UI bundle を `:5757` で serve（Fastify static plugin、`ui/dist`）。dev mode は Vite `:5173` と daemon `:5757` の二段起動を継続維持

### Task （推定 9 task）

- [x] PLAN.md M0.11.5 マイルストーン挿入（本タスク） <!-- id: m0.11.5-t1 status: done -->
- [x] SPEC.md §3.2 lazy daemon flow 更新（trigger 範囲 / cold-start-only open / headless 検出 / `/loom` 役割拡張 / opt-out 永続化）<!-- id: m0.11.5-t2 status: done -->
- [x] daemon: production mode で `ui/dist` を `:5757` で serve（Fastify static plugin、build 後）<!-- id: m0.11.5-t3 status: done -->
- [x] hooks/loom-launch-ui.sh 新設: health-check + headless 検出 + cross-platform browser open helper（`open` / `xdg-open` / `start`）<!-- id: m0.11.5-t4 status: done -->
- [x] commands/loom-{pm,spec,go,retro,status,worktree,mode}.md 7 種に lazy daemon trigger 配線（hooks/loom-launch-ui.sh invoke）<!-- id: m0.11.5-t5 status: done -->
- [x] commands/loom.md 役割拡張: URL 表示 + clipboard コピー（macOS `pbcopy` / Linux `xclip` or `wl-copy` / Windows `clip`）<!-- id: m0.11.5-t6 status: done -->
- [x] prefs schema: `<project>/.claude-loom/project-prefs.json` に `ui.auto_launch: boolean` field 追加（templates 含む、SPEC §6.9 schema 拡張）<!-- id: m0.11.5-t7 status: done -->
- [x] README.md / README.ja.md GUI 起動 section を auto-launch 反映に書き直し（"Phase 2 roadmap" 記述削除、M0.11.5 完了 marker 追記）<!-- id: m0.11.5-t8 status: done -->
- [x] tests: hooks_test.sh 拡張（headless 検出 / cold-start-only open / `LOOM_NO_UI=1` skip assertion）+ tag m0.11.5-complete 設置 <!-- id: m0.11.5-t9 status: done note: literal hooks_test.sh ではなく t4 tests/loom_launch_ui_test.sh + t5 m0115_t5_lazy_trigger_test.sh + t8 m0115_t8_readme_autolaunch_test.sh で assertion 等価 coverage 充足、全 18 test pass -->

**M0.11.5 完成基準**: `./tests/run_tests.sh` 全 PASS、`/loom-pm` 実行で daemon cold start + browser open 動作、既起動時は browser 再 open しない（idempotent）、headless 環境（`$SSH_CONNECTION` セット時）で URL terminal 出力 fallback、`LOOM_NO_UI=1` で強制 skip 動作、`/loom` で URL clipboard コピー成功、`project-prefs.json` の `ui.auto_launch: false` で auto-launch skip 確認、README が SPEC §3.2 と整合（"Phase 2 roadmap" 文言削除済）、`tag m0.11.5-complete` 設置、`m0`〜`m0.11.4-complete` 全保持。

**M0.11.5 着手タイミング**: Phase 1 closure 後始末として **Phase 2 entry sequence (推奨) の F-pj-001 fix より前** に挿入。SPEC §3.2 SSoT との整合性回復が Phase 2 milestone 群（M0.12 以降）の前提条件となる可能性が高いため優先。M0.X cleanup 系列、推定 7-9 task 規模、dispatch 戦略は t3 (daemon serve) → t4 (launch helper) sequential、t5/t6/t7 parallel、t8/t9 sequential closure。

## マイルストーン M0.11.6: PM Auto-Spec Entry（ceremony reduction、SPEC §3.6 拡張）

起源: 2026-05-06 user との UX refinement 対話。`/loom-pm` 起動後 user が既存 plan / 実装したい機能を会話してる状態でも、明示的に `/loom-spec` を打たんと spec phase に入らん 2-step ceremony が冗長。M0.11.5「auto-launch UI」と同じ「context から intent 読めるなら ceremony 強制せえ」UX 哲学の **sibling milestone** として、`/loom-pm` を context-aware にして spec phase 自動突入を実現する。

### 設計合意（2026-05-06 spec phase 対話、SPEC §3.6 PM agent 章拡張）

- **方針**: ハイブリッド検知（C 案）— PM 起動時 context 評価 → 高信頼なら 1 問確認後 spec auto-entry、中信頼なら短く分岐質問、低信頼なら従来通り idle PM
- **検知ロジック 2 軸**:
  - **直近 user message scan**: 「実装」「機能」「追加」「bug」「fix」「PLAN」「SPEC」「task」等の intent keyword 検出
  - **cwd state**: `SPEC.md` 存在 + `PLAN.md` の `status: todo` 残あり → 既存 PJ context あり
- **3 信頼レベル + 動作**:
  - **① 高信頼（intent + state 両方）**: 「○○ の spec phase 入りますで、ええか？」一文確認 → 即突入
  - **② 中信頼（片方のみ）**: 「新規 PJ / 既存 plan レビュー / status 確認」を短く 3 択分岐質問
  - **③ 低信頼（intent も state も無し）**: 従来通り idle PM、user 入力待ち
- **`/loom-spec` の位置付け**: 明示 override / re-entry path として **存続**（compaction 後復帰、別案件 spec し直し、誤判定上書き等）。M0.11.5 trigger list にも残置
- **誤爆抑制策**: 中信頼以下では 1 問確認を必ず挟む、高信頼判定は intent + state の **AND 条件**（OR にすると誤爆増）、retro process-axis lens で false-positive rate 観察
- **scope 外（YAGNI）**: `/loom-go` の auto-entry（spec 完了 → impl phase 自動突入）は **別 milestone 候補**、本 M0.11.6 では未対応

### Task （推定 8 task）

- [x] PLAN.md M0.11.6 マイルストーン挿入（本タスク） <!-- id: m0.11.6-t1 status: done -->
- [ ] SPEC.md §3.6.x PM Auto-Spec Entry 章新設（検知ロジック / 3 信頼レベル / `/loom-spec` 位置付け codify） <!-- id: m0.11.6-t2 status: todo -->
- [ ] agents/loom-pm.md session start hook 拡張（context 評価ロジック + 3 信頼レベル分岐 + 確認 prompt template） <!-- id: m0.11.6-t3 status: todo -->
- [ ] 検知ロジック codify: intent keyword list 確定（15-25 個程度、保守的目安、AND 条件で高信頼判定） <!-- id: m0.11.6-t4 status: todo -->
- [ ] 確認 prompt template（高信頼用）: 「○○ の spec phase に入ります、ええか？」型 + bypass option 提示 <!-- id: m0.11.6-t5 status: todo -->
- [ ] 分岐 prompt template（中信頼用）: 「新規 PJ / 既存 plan レビュー / status 確認」3 択型 <!-- id: m0.11.6-t6 status: todo -->
- [ ] tests/agents_test.sh 拡張（context-aware entry の 3 信頼レベル assertion / `/loom-spec` override 動作 assertion） <!-- id: m0.11.6-t7 status: todo -->
- [ ] tag m0.11.6-complete 設置 + retro 1 サイクルで false-positive rate 観察（process-lens 必須） <!-- id: m0.11.6-t8 status: todo -->

**M0.11.6 完成基準**: `./tests/run_tests.sh` 全 PASS、`/loom-pm` を SPEC + PLAN todo 残ある PJ で起動 + 直近 user message に intent keyword あり → 高信頼 path で 1 問確認後 spec phase 突入動作、SPEC のみ存在 + PLAN todo 無し → 中信頼 path で 3 択分岐質問、新規 PJ（SPEC/PLAN 両方無し）+ user message 空 → idle PM stay 動作、`/loom-spec` 明示 invoke で常に spec phase 突入（override 動作）、`tag m0.11.6-complete` 設置、`m0`〜`m0.11.5-complete` 全保持。

**M0.11.6 着手タイミング**: M0.11.5 と **parallel 可能**（M0.11.5 は infra 層 = `hooks/` + `daemon/`、M0.11.6 は agent prompt 層 = `agents/loom-pm.md` + `SPEC.md`、変更 file 重ならず）。Phase 2 entry sequence では M0.11.5 と束ねて連続実施推奨。M0.X cleanup 系列、推定 6-8 task 規模、dispatch 戦略は t2/t3 sequential（spec → agent prompt の依存）→ t4/t5/t6 parallel → t7/t8 sequential closure。

## マイルストーン M0.11.7: /loom-go Auto-Entry（ceremony reduction trinity completion）

起源: 2026-05-06 user との UX refinement 対話、M0.11.5/M0.11.6 sibling pair の論理的延長。spec phase 完了後、user が「実装」「進めて」「go」等の intent keyword を発した瞬間、明示的に `/loom-go` を打たんと impl phase に入らん 2-step ceremony が、M0.11.5（auto-launch UI）+ M0.11.6（PM auto-spec entry）と同じ「context から intent 読めるなら ceremony 強制せえ」UX 哲学の **trinity 3rd milestone** として ceremony 削減対象。

### 設計合意（2026-05-06 spec phase 対話、SPEC §3.6 PM agent 章拡張継続）

- **方針**: M0.11.6 と同じハイブリッド検知（C 案）— spec phase 完了後 + user 直近 message に impl intent → 1 問確認後 impl phase auto-entry、曖昧なら短く分岐質問、低信頼なら従来 idle
- **検知ロジック 3 軸**:
  - **PLAN.md state 変化**: 直近 N session で PLAN に新規 task 追加 / 既存 task の `status: todo` 残あり
  - **spec phase 完了 marker**: SPEC.md 編集 commit + PLAN.md 編集 commit が直近にある
  - **user message intent**: 「実装」「進めて」「go」「dispatch」「task 振って」等の impl intent keyword
- **3 信頼レベル + 動作**:
  - **① 高信頼（3 軸全部揃い）**: 「○○ task の impl phase 入りますで、ええか？」一文確認 → 即突入
  - **② 中信頼（2 軸揃い）**: 「impl 開始 / spec 修正 / status 確認」3 択分岐質問
  - **③ 低信頼（1 軸以下）**: 従来通り PM idle、user 入力待ち
- **`/loom-go` の位置付け**: 明示 override / re-entry path として **存続**（M0.11.6 の `/loom-spec` と同パターン、compaction 後復帰、誤判定上書き等用）
- **誤爆抑制策**: 高信頼判定は AND 条件、中信頼以下は必ず確認、retro process-axis lens で false-positive rate 観察（M0.11.6 と同じ枠組み流用）
- **scope 外（YAGNI）**: 後続 trinity の auto-trigger（`/loom-retro` auto-entry on milestone tag、`/loom-stop` 等）は別 milestone 候補

### Task （推定 7 task）

- [x] PLAN.md M0.11.7 マイルストーン挿入（本タスク） <!-- id: m0.11.7-t1 status: done -->
- [ ] SPEC.md §3.6.x PM Auto-Go Entry 章新設（M0.11.6 chapter の sibling、検知ロジック / 3 信頼レベル / `/loom-go` 位置付け codify） <!-- id: m0.11.7-t2 status: todo -->
- [ ] agents/loom-pm.md spec phase 完了 hook 拡張（M0.11.6 改修と統合、context 評価ロジック + 3 信頼レベル分岐 + 確認 prompt template） <!-- id: m0.11.7-t3 status: todo -->
- [ ] 検知ロジック codify: impl intent keyword list 確定（M0.11.6 keyword list と分離、impl 系語彙 10-15 個程度） <!-- id: m0.11.7-t4 status: todo -->
- [ ] 確認 prompt template（高信頼 + 中信頼 3 択用、M0.11.6 template の流用設計） <!-- id: m0.11.7-t5 status: todo -->
- [ ] tests/agents_test.sh 拡張（auto-go entry の 3 信頼レベル assertion / `/loom-go` override 動作 assertion） <!-- id: m0.11.7-t6 status: todo -->
- [ ] tag m0.11.7-complete 設置 + retro 1 サイクルで false-positive rate 観察（process-lens 必須） <!-- id: m0.11.7-t7 status: todo -->

**M0.11.7 完成基準**: `./tests/run_tests.sh` 全 PASS、spec phase 完了直後 + user impl intent → 1 問確認後 impl phase 突入動作、PLAN todo 残のみ + intent keyword 無し → 中信頼 path で 3 択分岐質問、新規 PJ + intent 無し → idle PM stay 動作、`/loom-go` 明示 invoke で常に impl phase 突入（override 動作）、`tag m0.11.7-complete` 設置、`m0`〜`m0.11.6-complete` 全保持。

**M0.11.7 着手タイミング**: M0.11.6 完了後（agent prompt 層で連続改修、M0.11.6 の検知ロジック実装パターンを再利用してコスト削減）。M0.11.5 とは parallel 可（M0.11.5 = infra 層、M0.11.7 = agent prompt 層）、ただし M0.11.6 → M0.11.7 は **sequential 必須**（同 agent prompt file = `agents/loom-pm.md` 編集発生）。M0.X cleanup 系列、推定 5-7 task 規模、dispatch 戦略は t2/t3 sequential → t4/t5 parallel → t6/t7 sequential closure。

## Phase 2 entry criteria + carryover (retro 2026-05-05-001 由来)

Phase 1 MVP の 3 段階 closure marker 全達成 (m5 = functional / m0.11.3 = verification / m0.11.4 = aesthetic) の後、Phase 2 entry 前に解決 / 整理すべき carryover を retro 2026-05-05-001 の 14 finding から集約。F-meta-003 (Phase 2 entry criteria 整備 gap) の structural action として本 section を新設。

### Entry blocker (HIGH structural、Phase 2 着手前に解決)

- **F-proc-002 + F-meta-002 (HIGH × 2、Task tool degraded mode 永続化)**: 2 milestone 連続で全 impl commit が path C self-review、retro 自身も degraded-mode-synthesis (4 lens 並列 dispatch 不能)。Phase 2 entry condition として user 判断必要：
  - **(a)** Task tool 復旧を Phase 2 entry の HARD blocker に格上げ (復旧してから次 milestone)
  - **(b)** path C を **default mode** に昇格、SPEC §3.6.8 (dev workflow) + §3.9.x (retro workflow) の 2 文脈で 1st-class option として正式化、独立 lens の echo-chamber 抑制効果は失われるが現実運用との整合性確保
  - default 判断: (a) を default、復旧不能なら (b) に倒す。Phase 2 spec phase で再評価

### Entry 前 cleanup (MEDIUM structural)

- **F-pj-001 (MED、project-settings dropdown data binding regression)**: t19 smoke で捕捉、t20 で aesthetic MVP block せず carryover 処理。Phase 2 entry の **1 件目 task** として優先 fix。root cause 候補: t16 で 5 view を unified batch で書直した際の cognitive load + ProjectSettings の dropdown spec 厚み + assertion 弱さ
- **F-meta-003 (MED、Phase 2 entry criteria 整備)**: 本 section 自身の新設で部分応答済。SPEC §3 preamble or PLAN.md preamble に formal "Phase 2 entry checklist" 化は Phase 2 spec phase 1st task として実施

### Entry 前 cleanup (LOW structural、Phase 2 spec phase で組み込み可)

- **F-pj-002 (LOW、REQ-045 verification gate)**: REQ-045 (aesthetic MVP completion verification) の machine-checkable assertion 不在。「smoke skill が full scope で `routes_failed === 0` で完了 = REQ-045 PASS」と明文化、もしくは smoke skill 実行を aesthetic milestone closure 必須 gate として codify
- **F-pj-003 (LOW、Phaser rollback retroactive note)**: PLAN.md M3.0 section 末尾に「M0.11.4 t17 で Phaser dependency rollback、§3.6.9.1 archive 値化」note 追加 candidate (retroactive 整合性記録)
- **F-proc-003 (LOW、SSoT freeze stage pattern note)**: PLAN.md or SPEC §3.6.8 に「依存階層を持つ大規模 batch は SSoT freeze stage を仕切ると 4 dev parallel が成立する」を retro outcome として note (Phase 2 milestone 設計時の参考)
- **F-res-003 (LOW、Token meter empty state UX)**: TokenMeterView の empty state visual 強化 (border outline 強化 or 'no recent tokens' caption)。current 状態で機能阻害なし、structural fix 不要

### Record-only (本 retro archive で記録済、follow-up 不要)

- F-proc-001 (commit_handoff=pm 9 連続成功)、F-proc-004 (milestone tag → main flush hygiene 1st validation)、F-meta-001 (loom-ui-smoke skill 1st milestone closure validation)、F-meta-004 (applied_summary build state stable)、F-res-001 (DOM/SVG 移行知見の external 還元 candidate)、F-res-002 (claude-room-handoff design bundle full port pattern external 還元 candidate)

### Phase 2 entry sequence (推奨)

1. Task tool 復旧確認 (F-proc-002 + F-meta-002 の (a) 判断) → 復旧不能なら (b) で SPEC 改訂 spec phase 起動
2. **Ceremony reduction trinity 完走**: M0.11.5 (Lazy Daemon Auto-Launch) + M0.11.6 (PM Auto-Spec Entry) を **parallel 完走** → M0.11.7 (`/loom-go` Auto-Entry) sequential 後続 (M0.11.6 と同 agent prompt file 編集のため)。SPEC §3.2 + §3.6 整合性回復、Phase 1 closure cleanup の本丸
3. F-001 structural fix (F-pj-001) を Phase 2 1st impl task として dispatch
4. PLAN.md / SPEC §3 に formal "Phase 2 entry checklist" 新設 (F-meta-003 の structural completion)
5. REQ-045 smoke skill bind 明文化 (F-pj-002)
6. Phase 2 milestone (M0.12 系列以降) entry — **Phase 2 candidate pool** (下記) を spec phase で優先順位再判定

## Phase 2 candidate pool: UX refinement series (notebook、未 spec)

「GUI + ハーネス が claude-loom の売り」のポジショニング強化を軸に、Phase 1 closure trinity (M0.11.5 / M0.11.6 / M0.11.7) の続きとして次層を notebook 形式で書き留め。**形式 spec 未着手、Phase 2 spec phase で優先順位再判定 + formal milestone 化判断**。Phase 1 closure を遅延させぬよう、本 pool は trinity 完走後の Phase 2 spec phase に持ち越し。

### 候補リスト (★ priority)

- **M0.11.8 候補: GUI からの dispatch trigger**（★★★、GUI 1st-class 化）
  - **現状**: GUI は read-only viewer。すべての action は Claude Code chat 経由
  - **改善**: Plan view → task 横「dispatch dev」button、milestone tag 検出時 toast「retro 起動？」+ button、Sessions view → 「status check」button、Retro view → finding accept/reject button (M0.11.12 と統合可)
  - **仕組み**: GUI が daemon に POST → daemon が hooks 経由で Claude Code session に signal、または daemon が `claude -p` 直接 invoke
  - **インパクト**: 「GUI + ハーネス売り」の中核を埋める。観測専用 GUI なら ceremony 削減効果半減
  - **Phase 2 entry 1st task 候補に格上げ推奨**（Phase 2 全体テーマ立て直し効果）

- **M0.11.9 候補: Plan View で task の inline 作成 / 編集 / 並び替え**（★、M3.1 自然拡張）
  - **現状**: M3.1 で PLAN.md ↔ Plan View 双方向同期あり、view は read-mostly
  - **改善**: GUI 上で task add / status toggle / drag-drop reorder / note 添付、ファイル即書き戻し
  - **インパクト**: GUI が「作業面」になる、PM session で markdown 直編集と GUI の二重管理消える

- **M0.11.10 候補: Live agent dispatch animation**（★★、claude-loom らしさ最大化）
  - **現状**: dispatch 中の dev は静止 sprite、状態遷移は token meter 等のテキストのみ
  - **改善**: dev dispatch → 部屋に入る → working motion → reviewer 招集 → 退室、を sprite アニメで表現
  - **インパクト**: 「中央指令室」メタファーの臨場感、長時間 session の視覚 feedback、「動くのが見える」体験の本丸

- **M0.11.11 候補: First-run onboarding wizard**（★★、公開後 adoption 直結）
  - **現状**: install.sh + 手動 /loom-pm + lifecycle 検出 + 手動 mode 選択、初見 user は CLAUDE.md 読まな分からん
  - **改善**: install.sh 完了時 GUI 自動起動 → wizard で「project はどこ？」「greenfield / 既存 adopt？」「coexistence mode？」→ project.json + project-prefs.json 自動生成
  - **インパクト**: 公開後の adoption rate 直結、「touch しにくい」を構造的に潰す

- **M0.11.12 候補: GUI 上で retro 結果可視化 + accept/reject button**（★、retro 体験改善）
  - **現状**: retro outcome は markdown report、user は chat で 14 finding を 1 件ずつ承認
  - **改善**: GUI Retro view で finding 一覧 → checkbox accept/reject → 一括 apply ボタン
  - **インパクト**: retro が「面倒な確認 ceremony」から「視覚的に整理された決定 surface」に化ける
  - **note**: M0.11.8 (GUI dispatch trigger) と統合実装可、優先順位再判定時に bundling 検討

### 注意 / 判定軸

- **罠**: 全候補を一気に走らすと Phase 1 closure が永遠に来ん → trinity (M0.11.5-7) で Phase 1 closure 確定、これら候補は **Phase 2 spec phase で再判定**
- **暫定推奨優先順位**: ★★★ M0.11.8 → ★★ M0.11.10 / M0.11.11 → ★ M0.11.9 / M0.11.12
- **判定軸**: 「GUI + ハーネス売り」テーマ強化貢献度 / 公開後の adoption 影響度 / 既存 milestone との overlap 度
- **再評価タイミング**: Phase 2 spec phase 1st task として本 pool レビュー、formal milestone 番号付与判断

## マイルストーン M0.12: Coexistence Mode（既存 PJ 検出 + 機能 opt-in/opt-out）

詳細: `docs/plans/2026-04-29-claude-loom-m0.12-coexistence.md`

既存 PJ に他 plugin / user 自身のルールが入っとる時の coexistence mode を導入。`full / coexist / custom` 3 mode、5 feature group（core / retro / customization / worktree / native-skills）。dispatcher 3 体（PM / dev / retro-pm）に runtime gate を入れて mode 別動作を実現。receiver agent は mode 不要。

設計合意（対話履歴）:
- 3 mode: full / coexist / custom（C: observe-only は M2 daemon 完成後で）
- 検出 ii: CLAUDE.md / project.json / agents/skills/commands / 他 plugin
- trigger β+γ: PM 初回検出 + /loom-mode で再選択
- storage: project.json `rules.coexistence_mode` + `rules.enabled_features`
- 粒度 iii: 5 group の中庸粒度

- [x] PLAN.md M0.12 マイルストーン挿入（本タスク） <!-- id: m0.12-t1 status: done -->
- [x] tests/REQUIREMENTS.md REQ-026 追加 <!-- id: m0.12-t2 status: done -->
- [x] SPEC.md §3.6.7 Coexistence Mode 章新設 + §3.7 lifecycle 拡張 + §6.9 schema 拡張 <!-- id: m0.12-t3 status: done -->
- [x] docs/DOC_CONSISTENCY_CHECKLIST.md M0.12 check items <!-- id: m0.12-t4 status: done -->
- [x] templates/claude-loom/project.json.template に coexistence_mode + enabled_features 追加 <!-- id: m0.12-t5 status: done -->
- [x] commands/loom-mode.md 新設（mode 切替 slash command） <!-- id: m0.12-t6 status: done -->
- [x] agents/loom-pm.md lifecycle 拡張 + mode 選択 prompt + runtime gate <!-- id: m0.12-t7 status: done -->
- [x] agents/loom-developer.md runtime gate（native-skills / worktree / customization） <!-- id: m0.12-t8 status: done -->
- [x] agents/loom-retro-pm.md runtime gate（retro hook 全体 + learned_guidance） <!-- id: m0.12-t9 status: done -->
- [x] tests/prefs_test.sh project.json schema 拡張 <!-- id: m0.12-t10 status: done -->
- [x] tests/agents_test.sh + commands_test.sh 拡張（dispatcher mode 参照 + loom-mode 検証） <!-- id: m0.12-t11 status: done -->
- [x] README.md user-facing 入門追加 <!-- id: m0.12-t12 status: done -->
- [x] 全 test PASS + tag m0.12-complete + main merge <!-- id: m0.12-t13 status: done -->

**M0.12 完成基準**：`./tests/run_tests.sh` で **8 PASS** 維持、`templates/claude-loom/project.json.template` に `coexistence_mode` + `enabled_features` 追加 + jq empty で valid、3 dispatcher agent prompt に runtime gate 記述、`commands/loom-mode.md` valid frontmatter、`tag m0.12-complete` 設置、`m0`〜`m0.11-complete` 全保持、これで原 6 案件（A/B/C+G/D/E/F）全完走。

## マイルストーン M0.13: Retro Discipline & Process Hardening

詳細: `docs/plans/2026-04-29-claude-loom-m0.13-retro-discipline.md`
retro 起源: `docs/retro/2026-04-29-001-report.md`

retro 2026-04-29-001 の findings 全件 + user 由来の retro 基本方針 3 項目を統合した improvement milestone。retro architecture を「自己改善 + PJ 改善 + user 参加 + action plan 化」の SSoT に upgrade、PM/dev workflow に並列 dispatch verification / TDD red 順序 / Task tool fallback / spec flow 圧縮 / doc 並列化 / reviewer verdict 保存を組み込み。

設計合意（retro outcome）:
- retro 基本方針 P1/P2/P3: 自己 + PJ 改善 / user 参加 / action plan 化
- meta-D 改善: 4 lens に freeform improvement instruction 追加（generic 禁止、concrete file/commit 参照必須）
- meta-B 構造的修正: PM agent prompt に parallel dispatch self-verify を組込
- proc-001/002/004/A/C 改善: dev/PM workflow に discipline 注入

- [x] PLAN.md M0.13 マイルストーン挿入（本タスク） <!-- id: m0.13-t1 status: done -->
- [x] tests/REQUIREMENTS.md REQ-027 追加 <!-- id: m0.13-t2 status: done -->
- [x] SPEC.md §3.9 retro 章拡張（基本方針 P1/P2/P3）+ §3.6.x process discipline 章 <!-- id: m0.13-t3 status: done -->
- [x] docs/RETRO_GUIDE.md 改訂（基本方針 + freeform lens + verdict 保存 + action plan 化） <!-- id: m0.13-t4 status: done -->
- [x] docs/DOC_CONSISTENCY_CHECKLIST.md M0.13 check items <!-- id: m0.13-t5 status: done -->
- [x] agents/loom-retro-pm.md 改訂（基本方針 + user lens 公式組込 + verdict 保存 hook） <!-- id: m0.13-t6 status: done -->
- [x] 4 retro lens (pj/process/meta/researcher) に freeform improvement instruction 追記 <!-- id: m0.13-t7 status: done -->
- [x] agents/loom-retro-counter-arguer.md 改訂（freeform finding 検証強化） <!-- id: m0.13-t8 status: done -->
- [x] agents/loom-retro-aggregator.md 改訂（output に action plan セクション必須化） <!-- id: m0.13-t9 status: done -->
- [x] agents/loom-pm.md workflow discipline 追記（parallel verify / Task tool fallback / spec compression / doc 並列 / reviewer verdict 保存） <!-- id: m0.13-t10 status: done -->
- [x] agents/loom-developer.md workflow discipline 追記（TDD red 順序 enforcement） <!-- id: m0.13-t11 status: done -->
- [x] tests 拡張（retro_test / agents_test 各 _test.sh で freeform / parallel verify / TDD 順序 assertion） <!-- id: m0.13-t12 status: done -->
- [x] README.md user-facing intro <!-- id: m0.13-t13 status: done -->
- [x] 全 test PASS + tag m0.13-complete + main merge + retro archive commit <!-- id: m0.13-t14 status: done -->
- [x] D2: learned_guidance write to prefs（retro 9 finding 反映、Stage 2 完了後の手動 step） <!-- id: m0.13-t15 status: done -->

**M0.13 完成基準**：`./tests/run_tests.sh` で **8 PASS** 維持、`docs/RETRO_GUIDE.md` に基本方針 P1/P2/P3 明記、4 lens prompt に freeform improvement instruction 含む、`agents/loom-retro-aggregator.md` の output に action plan セクション必須記述、`agents/loom-pm.md` に parallel verify + Task tool fallback + spec compression + doc 並列 + reviewer verdict 保存記述、`agents/loom-developer.md` に TDD red 順序 enforcement、retro archive (`docs/retro/2026-04-29-001-report.md`) commit 済、`tag m0.13-complete` 設置、`m0`〜`m0.12-complete` 全保持。

## マイルストーン M0.14: Skill Mandate vs Suggest Policy Refinement

起源: 2026-04-29 user との skill 自律性懸念の対話。「explicit skill list が agent の自律的 skill discovery を阻害してへんか？」という user 由来の問題提起から、blanket な「loom-* > superpowers」優先を撤廃し mandate / suggest 区別による policy refinement に踏み込んだ doc-only milestone。

設計合意:
- **mandate skill** = workflow 品質ゲート（loom-tdd-cycle / loom-review / loom-retro / loom-test / loom-status）→ 命令形 prompt
- **suggest skill** = 最適化候補（simplify / fewer-permission-prompts / update-config / keybindings-help / loom-write-plan / loom-debug）→ 推奨形 prompt、他選択肢併記
- retro process-axis lens に env config improvement opportunity 検出責務を追加（permission friction / routine automation / keybind opportunity）

- [x] SPEC.md §3.10 bullet 2 修正 + §3.10.1 新設（mandate / suggest table SSoT 化） <!-- id: m0.14-t1 status: done -->
- [x] agents/loom-developer.md Refactor phase に simplify suggest 追記 <!-- id: m0.14-t2 status: done -->
- [x] agents/loom-retro-process-judge.md に Step 6 (env config opportunity 検出) + 3 category 追加 <!-- id: m0.14-t3 status: done -->
- [x] docs/RETRO_GUIDE.md §2.2 に新 3 category 追記 <!-- id: m0.14-t4 status: done -->
- [x] CLAUDE.md skill 使い分けポリシー section 再構成（blanket 優先撤廃） <!-- id: m0.14-t5 status: done -->
- [ ] docs/DOC_CONSISTENCY_CHECKLIST.md M0.14 check items 追加 <!-- id: m0.14-t6 status: todo -->
- [ ] tests 拡張（process-judge の 3 新 category schema assertion 等） <!-- id: m0.14-t7 status: todo -->
- [ ] 全 test PASS + tag m0.14-complete + main merge <!-- id: m0.14-t8 status: todo -->

**M0.14 完成基準**：`./tests/run_tests.sh` 全 PASS、SPEC.md §3.10.1 が SSoT として mandate/suggest table 含む、CLAUDE.md skill 使い分けポリシー section が blanket 優先を撤廃、agents/loom-retro-process-judge.md に 3 新 category (process-permission-friction / process-routine-automation-opportunity / process-keybind-opportunity) 含む、`tag m0.14-complete` 設置、`m0`〜`m0.13-complete` 全保持。

> **PLAN-SSoT 整合性注記（2026-05-02 spec phase 決定）**：t6/t7 の essence は **M2.1 cleanup milestone に統合実施**（DOC_CONSISTENCY_CHECKLIST.md M2.1 section + tests/agents_test.sh process-judge 3 新 category assertion）。`m0.14-complete` 別 tag は遡及設置せず、`m2.1-complete` に統合。retro 起源: 2026-05-02-001-report.md pj-003。proc-004 finding（milestone closure 完了せず次に進む pattern）の整合の方法論として遡及 tag は許さず、PLAN.md 注記による essence 反映の明示で SSoT 整合化。

## マイルストーン M1: Daemon + Hooks Foundation

詳細: `docs/plans/2026-04-29-claude-loom-m1-daemon-foundation.md`

技術判断（SPEC §12 に inline 反映済）:
- Stack: Node.js + TypeScript + pnpm workspaces
- API: tRPC + zod（HTTP RPC + WS subscriptions）
- ORM: Drizzle + better-sqlite3
- ID: nanoid (text 21 chars)、Timestamp: integer ms
- Test: Vitest（daemon）+ 既存 bash test（harness）並列共存
- 型共有: daemon が AppRouter type + Drizzle schema type を export、frontend が直接 import
- 既存 harness 資産は root 維持、`daemon/` を sibling 追加

- [x] PLAN.md M1 milestone 拡張（本タスク） <!-- id: m1-t1 status: done -->
- [x] pnpm workspace root 初期化（package.json + pnpm-workspace.yaml + tsconfig 共通設定 + .gitignore for node_modules） <!-- id: m1-t2 status: done -->
- [x] daemon/ package init（package.json、TypeScript config、依存：fastify / @fastify/websocket / @trpc/server / zod / drizzle-orm / better-sqlite3 / nanoid / vitest / tsx） <!-- id: m1-t3 status: done -->
- [x] daemon/src/db/schema.ts: Drizzle で SPEC §6.1 全 11 table 定義（projects / events / sessions / subagents / agent_pool / tasks / token_usage / notes / plan_items / spec_changes / consistency_findings） <!-- id: m1-t4 status: done -->
- [x] drizzle-kit generate で initial migration SQL 出力 + DB client wrapper 実装 <!-- id: m1-t5 status: done -->
- [x] daemon/src/server.ts: Fastify + tRPC adapter setup、127.0.0.1:5757 bind、health endpoint <!-- id: m1-t6 status: done -->
- [x] daemon/src/router.ts: tRPC AppRouter root（project / session / agent / plan / consistency / approval / note / config / events sub-routers） <!-- id: m1-t7 status: done -->
- [x] daemon/src/routes/: 8 sub-router 実装（project / session / agent / plan / consistency / approval / note / config）、各 zod input/output schema <!-- id: m1-t8 status: done -->
- [x] daemon/src/routes/events.ts: tRPC subscription procedures（onAgentChange / onPlanChange / onFindingNew / onApprovalRequest 等） <!-- id: m1-t9 status: done -->
- [x] daemon/src/events/broadcaster.ts: WS event hub（subscriptions に push する dispatch 機構） <!-- id: m1-t10 status: done -->
- [x] daemon/src/hooks/ingest.ts: POST /event handler（bash hook ingestion、tRPC 通さん plain HTTP）+ events table 永続化 <!-- id: m1-t11 status: done -->
- [x] daemon/src/hooks/correlation.ts: Subagent 相関 FIFO ロジック（SPEC §6.4 既存仕様） <!-- id: m1-t12 status: done -->
- [x] daemon/src/project/detect.ts: project 判定（git root + .claude-loom/project.json marker、SPEC §6.7） <!-- id: m1-t13 status: done -->
- [x] daemon/src/security/token.ts: nanoid 生成 + ~/.claude-loom/daemon-token (chmod 600) read/write、tRPC middleware で headers verify <!-- id: m1-t14 status: done -->
- [x] daemon/src/lifecycle/idle-shutdown.ts: 30 分 inactivity で auto-shutdown（最終 event timestamp 監視） <!-- id: m1-t15 status: done -->
- [x] daemon/src/lifecycle/event-cleanup.ts: events rolling delete (30 日 OR 200MB)、daily loop <!-- id: m1-t16 status: done -->
- [x] daemon/src/config.ts: ~/.claude-loom/config.json read/write（default 生成）、SPEC §6.10 schema <!-- id: m1-t17 status: done -->
- [x] hooks/ 5 bash script 新設（session_start / pre_tool / post_tool / stop / SubagentStop、curl POST /event） <!-- id: m1-t18 status: done -->
- [x] commands/loom.md / loom-status.md / loom-stop.md 新設（slash commands、daemon 起動 / 状態 / 停止） <!-- id: m1-t19 status: done -->
- [x] install.sh 拡張：settings.json に hooks 配線（jq + atomic mv）+ daemon 関連 symlink 必要なら追加 <!-- id: m1-t20 status: done -->
- [x] daemon/test/: Vitest 設定 + 各 router の unit test + ingestion / lifecycle integration test <!-- id: m1-t21 status: done -->
- [x] tests/REQUIREMENTS.md REQ-028 追加 + tests/daemon_test.sh 新設（harness 側 smoke test：daemon start / health / hook POST） <!-- id: m1-t22 status: done -->
- [x] README.md + CLAUDE.md に daemon 起動方法 + tRPC AppRouter import 例追記 <!-- id: m1-t23 status: done -->
- [x] docs/DOC_CONSISTENCY_CHECKLIST.md M1 check items 追加 <!-- id: m1-t24 status: done -->
- [x] 全 test PASS + tag m1-complete + main merge <!-- id: m1-t25 status: done -->

**M1 完成基準**：`pnpm install` 成功、`pnpm --filter @claude-loom/daemon dev` で daemon 127.0.0.1:5757 起動、`curl http://127.0.0.1:5757/health` で 200、bash hook 5 種が `curl POST /event` で events table に永続化、tRPC AppRouter type を frontend (M2) から `import type { AppRouter } from "@claude-loom/daemon"` で参照可能、Drizzle schema 全 11 table の type が同様に export、`pnpm test` で daemon vitest 全 PASS、`./tests/run_tests.sh` で 9 PASS（既存 8 + daemon_test）、`tag m1-complete` 設置、`m0`〜`m0.13-complete` 全保持。

## マイルストーン M1.5: UI Prep Backend（6 routers for M0.8-M0.13 features）

詳細: `docs/plans/2026-04-29-claude-loom-m1.5-ui-prep-backend.md`

SCREEN_REQUIREMENTS ブラッシュアップ (Q1-Q6) で identified された UI 要件に対応する **backend procedure 6 router** を M1 daemon foundation に追加。M2 UI Shell が即実装に入れる状態にする。

設計合意（SCREEN_REQUIREMENTS Q1-Q6 brainstorm）:
- routes/retro.ts (Q1): retro 一覧/詳細/user decision/trigger
- routes/prefs.ts (Q2/Q4/Q5): user-prefs / project-prefs get/set + learned_guidance helpers
- routes/personality.ts (Q2): 4 preset 一覧 + 説明取得
- routes/worktree.ts (Q3): git worktree list/add/remove/lock/unlock
- routes/coexistence.ts (Q5): mode + enabled_features get/set + detect
- routes/discipline.ts (Q6): metrics live (subscription) + history + violations
- events router 拡張: onLearnedGuidanceChange / onWorktreeChange / onDisciplineMetricUpdate

- [x] PLAN.md M1.5 milestone 挿入（本タスク） <!-- id: m1.5-t1 status: done -->
- [x] tests/REQUIREMENTS.md REQ-029 追加 <!-- id: m1.5-t2 status: done -->
- [x] daemon/src/routes/retro.ts 新設 (Q1) <!-- id: m1.5-t3 status: done -->
- [x] daemon/src/routes/prefs.ts 新設 (Q2/Q4/Q5、user-prefs/project-prefs/learned_guidance) <!-- id: m1.5-t4 status: done -->
- [x] daemon/src/routes/personality.ts 新設 (Q2、preset list/detail) <!-- id: m1.5-t5 status: done -->
- [x] daemon/src/routes/worktree.ts 新設 (Q3、git worktree CLI wrapper) <!-- id: m1.5-t6 status: done -->
- [x] daemon/src/routes/coexistence.ts 新設 (Q5、mode + features + detect) <!-- id: m1.5-t7 status: done -->
- [x] daemon/src/routes/discipline.ts 新設 (Q6、metrics + violations) <!-- id: m1.5-t8 status: done -->
- [x] events.ts に subscription 3 種追加 (onLearnedGuidanceChange / onWorktreeChange / onDisciplineMetricUpdate) <!-- id: m1.5-t9 status: done -->
- [x] router.ts に 6 router wire-up + AppRouter type 更新 <!-- id: m1.5-t10 status: done -->
- [x] daemon vitest 拡張 (各 router の単体 test) <!-- id: m1.5-t11 status: done -->
- [x] 全 test PASS + tag m1.5-complete + main merge <!-- id: m1.5-t12 status: done -->

**M1.5 完成基準**：`pnpm --filter @claude-loom/daemon test` で全 PASS、`AppRouter` type に retro/prefs/personality/worktree/coexistence/discipline router 含む、各 router で最低 2 procedure（list/detail/mutation 等）+ zod schema、events router に 3 新 subscription、frontend (M2) から `import type { AppRouter } from "@claude-loom/daemon"` で 6 新 router の型推論可能、`./tests/run_tests.sh` で 12 PASS 維持、`tag m1.5-complete` 設置、`m0`〜`m1-complete` 全保持。

## マイルストーン M2.0: Static Prototype Embed（design SSoT 保存）

claude.ai/design 由来の **frontend-design 出力**（pixel RPG × 猫の開発室、9 section）を `ui/prototype/` に embed。M2 proper 実装前の design SSoT として repo に保存、視覚検証可能化。

- [x] ui/ workspace package init <!-- id: m2.0-t1 status: done -->
- [x] design files copy to ui/prototype/ <!-- id: m2.0-t2 status: done -->
- [x] pnpm-workspace.yaml に "ui" 追加 <!-- id: m2.0-t3 status: done -->
- [x] ui/package.json + serve devDep 設定 <!-- id: m2.0-t4 status: done -->
- [x] ui/README.md（起動方法 + 9 section 概要） <!-- id: m2.0-t5 status: done -->

**M2.0 完成基準**：`pnpm install` 成功、`pnpm --filter @claude-loom/ui prototype` で http://localhost:8080 起動 → index.html が 200 で配信、design 9 section（Room View / character sheet / Gantt / Plan / Retro / Worktree / Consistency / Customization / learned_guidance）すべて閲覧可能。`m0`〜`m1.5-complete` tag 全保持。

## マイルストーン M2: UI Shell

詳細: `docs/plans/2026-05-01-claude-loom-m2-ui-shell.md`

prototype design (`ui/prototype/`) を Vite + React 18 + TS strict + Tailwind の proper 実装に port、tRPC client で daemon 接続、vertical slice 1-2 画面で live data pipeline 確立。Phaser 3 mount + 残 7-8 画面 live 接続 + Gantt 実描画は M3 に明示的に押し出す。

- [x] Vite + React 18 + TS strict + Tailwind 雛形 <!-- id: m2-t1 status: done -->
- [x] tokens.css rgb 変換 + tailwind.config.ts variable 参照 extend（3 theme 維持） <!-- id: m2-t2 status: done -->
- [x] AppShell: react-router v6 + persistent Room layer + panel routing <!-- id: m2-t3 status: done -->
- [x] zustand store skeleton（connection / view 別 slice） <!-- id: m2-t4 status: done -->
- [x] tRPC client + wsLink + exponential backoff retryDelayMs（max 30s） <!-- id: m2-t5 status: done -->
- [x] ConnectionBanner + toast 通知システム（5 event MVP） <!-- id: m2-t6 status: done -->
- [x] 9 画面 visual port（mock data、DOM-based RoomView 含） <!-- id: m2-t7 status: done -->
- [x] Vertical slice live: Room agentList subscription または Plan planItems query <!-- id: m2-t8 status: done -->
- [x] M2 acceptance test（visual + WS retry + toast） <!-- id: m2-t9 status: done -->

**M2 完成基準**：`pnpm --filter @claude-loom/ui build` 成功、`pnpm --filter @claude-loom/ui dev` で 9 view が router navigate で表示、3 theme (`data-theme="pop|dusk|night"`) 切替動作、WS 切断時 exponential backoff (max 30s) で再接続 + ConnectionBanner 表示、toast 5 event 動作、vertical slice 1-2 画面で daemon → UI live data 流通、`pnpm --filter @claude-loom/ui test` 全 PASS、`m0`〜`m2.0-complete` tag 全保持。

## マイルストーン M2.1: M3-prep Cleanup（verdict_evidence + M0.14 closure）

詳細: 未作成（impl phase で `docs/plans/2026-05-02-claude-loom-m2.1-cleanup.md` を writing-plans で詳細化）
retro 起源: `docs/retro/2026-05-02-001-report.md` (proc-003 + pj-003)

M3 開始前の cleanup milestone。proc-003 finding（verdict_evidence の独立 file 化 + zod schema 化）を整備し、M0.14 残 task (t6/t7) を統合 closure。tag は m2.1-complete に統合（`m0.14-complete` 別 tag は遡及設置せず、PLAN.md M0.14 セクションに essence 反映済み旨を注記）。

設計合意（2026-05-02 spec phase 対話）:
- 構造: M2.1 として cleanup milestone を切る（proc-004 の「milestone closure」整合性維持）
- SPEC 配置: §3.9.10（概念 + write timing）+ §6.9.5（zod 完全 schema）
- field 設計: β 中量（proposal 通り、aspect 粒度確保）
- write timing: (A) retro-pm 一括 lazy build、PM は hint reference のみ残す
- M0.14 closure: (X2) 残 task 実装 + tag 統合（遡及 tag せず）
- PM 改修: (P2) 軽量 hint 追加（責務分離維持）

- [x] PLAN.md M2.1 milestone 挿入（本タスク）+ M0.14 セクション注記更新 <!-- id: m2.1-t1 status: done -->
- [x] tests/REQUIREMENTS.md REQ-031 追加（verdict_evidence + M0.14 t6/t7 closure 統合） <!-- id: m2.1-t2 status: done -->
- [x] agents/loom-retro-pm.md "Verdict 保存 hook" section refactor（独立 file + 5 step lazy build + §6.9.5 参照） <!-- id: m2.1-t3 status: done -->
- [x] agents/loom-pm.md "Reviewer verdict 保存" section refactor（PM hint reference のみ、責務分離） <!-- id: m2.1-t4 status: done -->
- [x] docs/RETRO_GUIDE.md verdict_evidence 運用 SSoT 章追加 <!-- id: m2.1-t5 status: done -->
- [x] docs/DOC_CONSISTENCY_CHECKLIST.md M2.1 セクション追加 + M0.13 line 125 update + M0.14 t6 cleanup 統合 <!-- id: m2.1-t6 status: done -->
- [x] tests/agents_test.sh 拡張（retro-pm Stage 0 build step + PM hint 形式 + process-judge 3 新 category schema） <!-- id: m2.1-t7 status: done -->
- [x] 全 test PASS (`./tests/run_tests.sh` 12 PASS 維持) + tag m2.1-complete + main merge <!-- id: m2.1-t8 status: done -->

**M2.1 完成基準**：
- `./tests/run_tests.sh` で **12 PASS** 維持（既存 12 test files + agents_test 内 sub-assertion 3 種拡張）
- `agents/loom-retro-pm.md` Stage 0 に verdict_evidence build 5 step 手順記述
- `agents/loom-pm.md` milestone tag hook に `[reviewer-dispatch-refs]` block 形式記述
- `tests/agents_test.sh` に process-judge 3 新 category（process-permission-friction / process-routine-automation-opportunity / process-keybind-opportunity）schema assertion 含む（M0.14 t7 closure）
- `docs/DOC_CONSISTENCY_CHECKLIST.md` に M2.1 セクション + M0.14 t6 cleanup 統合（M0.14 t6 closure）
- `tag m2.1-complete` 設置、`m0`〜`m2-complete` 全保持
- PLAN.md M0.14 セクションに「t6/t7 essence は M2.1 で統合実施、`m0.14-complete` 別 tag は不在のまま PLAN-SSoT 整合化」注記済

## マイルストーン M3.0: Room View（Phaser mount + ピクセル世界観）

詳細: `docs/plans/2026-05-02-claude-loom-m3.0-room-view.md`

設計合意（2026-05-02 spec phase 対話、SPEC §3.6.9.1 SSoT）:
- **α-1 確定**: Phaser 4 React 内 mount = 自前 `useEffect` + `useRef`（library 依存ゼロ、M3.0 で pnpm 解決 `^4.1.0`、3 → 4 major bump 互換確認済 retro 2026-05-02-002 pj-001）
- bridge: zustand subscribe + Phaser scene event は agent state → sprite state 単方向 push
- HMR: Vite stable ref + `import.meta.hot.dispose` で game.destroy()

技術 risk 軸: **新技術 (Phaser) 投入、独立 milestone で retro 集中**。

- [x] Phaser 4 React 内 mount（自前 useEffect、game lifecycle 管理 + HMR 対応、`^4.1.0`） <!-- id: m3.0-t1 status: done -->
- [x] ピクセルルーム基本タイル（tile map JSON + tokens.css `--color-bg` 連携） <!-- id: m3.0-t2 status: done -->
- [x] エージェントスプライト + 状態アニメ（idle/busy/失敗、agent_id ↔ sprite 1:1 mapping） <!-- id: m3.0-t3 status: done -->

**M3.0 完成基準**：
- Phaser game instance が React mount/unmount lifecycle に整合（HMR で leak ゼロ）
- Room View で agent sprite が daemon `agent` subscription event を受けて状態切替アニメ動作
- 3 theme (pop/dusk/night) で Phaser scene の background が tokens.css `var(--color-bg)` 参照で切替
- vertical slice 1 完成: 1 PJ の agent_pool 全 sprite が Room View に live 表示
- `pnpm --filter @claude-loom/ui test` 全 PASS（既存 + Phaser mount/unmount lifecycle test 追加）
- `tag m3.0-complete` 設置、`m0`〜`m2.1-complete` 全保持

## マイルストーン M3.1: Plan View + Gantt + 双方向同期

詳細: 未作成（impl phase で `docs/plans/2026-05-XX-claude-loom-m3.1-plan-gantt.md` を `loom-write-plan` skill で詳細化）

設計合意（2026-05-02 spec phase 対話、SPEC §3.6.9.2 / §3.6.9.3 / §3.6.9.7 SSoT）:
- **β-3 確定**: PLAN.md 双方向同期 = hybrid debounce (500ms-1s) + last-write-wins (mtime) + `plan_conflict_detected` toast + localStorage backup
- **γ-3 確定**: Gantt = 自前 SVG（rect/line/text + tokens.css var 直参照、200-400 LoC）
- **res-001 確定**: Visual regression check = Playwright e2e（`@playwright/test` devDep、independent infra、`toHaveScreenshot()` built-in、M5 frontend-design baseline 継続価値、SPEC §3.6.9.7 SSoT、retro 2026-05-02-002 spec phase 解決）
- toast 6 event 化（M2 5 + plan_conflict_detected 追加）

retro 2026-05-02-002 由来で M3.1 で扱う残 design 分岐:
- **meta-001**: aggregator agent prompt に auto-apply promote logic 追加（3 件目連続承認到達時に user に「`user-prefs.json.auto_apply.categories` に追加？」prompt 提示）+ SPEC §3.9.7/.8 に threshold value（3 件想定）+ max_risk 引上げ rule 明記 — SPEC §3.9.8 recursive 自己最適化の具体実装

技術 risk 軸: **複雑 design (β-3 hybrid sync) + visual regression infra 初導入を独立 milestone 化、edge case finding を retro 集中扱い**。

- [x] Plan View 短期レーン（TodoWrite mirror、read-only、daemon `todoChange` subscription） <!-- id: m3.1-t1 status: done -->
- [x] Plan View 長期レーン（plan_items ツリー、編集可、daemon mutation 接続） <!-- id: m3.1-t2 status: done -->
- [x] PLAN.md パース + 双方向同期（chokidar + 500ms debounce + last-write-wins + plan_conflict_detected toast + localStorage backup） <!-- id: m3.1-t3 status: done -->
- [x] 進捗ビュー（自前 SVG Gantt、リアクティブ bar、3 theme 統合、行 click → Agent Detail navigate） <!-- id: m3.1-t4 status: done -->
- [x] Playwright e2e infra 導入（`@playwright/test` devDep + `ui/e2e/` dir + `pnpm --filter @claude-loom/ui e2e` script + CI workflow 並列 step + Room View pop theme screenshot baseline 1 件確立、test 大量化は M3.2 以降に分配） <!-- id: m3.1-t5 status: done -->

**M3.1 完成基準**：
- Plan View 短期 (TodoWrite mirror) が daemon `todoChange` subscription で live 更新
- Plan View 長期 (plan_items) tree edit が GUI → daemon → DB 流通、debounce 500ms で write-back
- PLAN.md 外部 edit を chokidar 検知 → daemon → UI へ push、conflict 時 `plan_conflict_detected` toast + localStorage backup 動作
- Gantt SVG が plan_items 進捗を bar で描画、3 theme 切替で `var(--color-bar)` 即反映、bar click で Agent Detail navigate
- Playwright e2e で Room View pop theme screenshot baseline 1 件 green、`pnpm --filter @claude-loom/ui e2e` で実行可能、CI workflow に並列 step として組込（vitest と独立 fail）
- `pnpm --filter @claude-loom/ui test` 全 PASS（debounce / conflict toast / Gantt SVG render test 追加、既存 13 vitest test の green 状態保持）
- `pnpm --filter @claude-loom/daemon test` 全 PASS（chokidar + debounce + conflict resolution test 追加）
- `tag m3.1-complete` 設置、`m0`〜`m3.0-complete` 全保持

## マイルストーン M3.2: Session List + Agent Detail + notes

詳細: 未作成（impl phase で `docs/plans/2026-05-XX-claude-loom-m3.2-detail-views.md` を `loom-write-plan` skill で詳細化）

設計合意（2026-05-02 spec phase 対話）:
- 新技術投入 + 複雑 design は M3.0 / M3.1 で扱い済、M3.2 は **CRUD polish + 介入 UX 完成度向上**
- 3 task が独立 view + 独立 daemon route、parallel batch (Strategy b、3 dev parallel) 適用候補

技術 risk 軸: **CRUD polish、低 risk、parallel dispatch で開発速度優先**。

- [x] Session List（list view、filter project/role + sort started_at、daemon `session` subscription） <!-- id: m3.2-t1 status: done -->
- [x] Agent Detail（dispatch 履歴 + 注目フラグ書込、daemon `agent.markAttention` mutation） <!-- id: m3.2-t2 status: done -->
- [x] notes 書き込み API + UI（daemon `note.create` mutation + Agent Detail から添付可能） <!-- id: m3.2-t3 status: done -->

**M3.2 完成基準**：
- Session List で filter (project/role) + sort (started_at) 動作、`session` subscription で live 更新
- Agent Detail に dispatch 履歴 + 注目フラグ書込 (daemon `agent.markAttention` mutation) 動作
- notes 書込 (daemon `note.create` mutation) で plan_items にひも付き、Agent Detail から添付可能
- `pnpm --filter @claude-loom/ui test` 全 PASS、`pnpm --filter @claude-loom/daemon test` 全 PASS
- `tag m3.2-complete` 設置、`m0`〜`m3.1-complete` 全保持、これで M3 系列 closure

## マイルストーン M4: Doc Consistency Engine v1

詳細: 未作成（M3 完了後 writing-plans で詳細化）

- [x] PostToolUse(Edit|Write) hook で SPEC 編集検知 <!-- id: m4-t1 status: done -->
- [x] spec_changes / consistency_findings テーブル + diff 計算 <!-- id: m4-t2 status: done -->
- [x] Phase A: 語彙抽出 + grep スクリーニング <!-- id: m4-t3 status: done -->
- [x] Phase B: claude -p subprocess による意味解析 <!-- id: m4-t4 status: done -->
- [x] Consistency Findings UI（severity 別、4 アクション） <!-- id: m4-t5 status: done -->
- [x] Acknowledge → plan_items 自動追加 <!-- id: m4-t6 status: done -->
- [x] バッジ通知 + WebSocket push <!-- id: m4-t7 status: done -->

## マイルストーン M5: Integration + Polish

詳細: 未作成（M4 完了後 writing-plans で詳細化）

- [x] frontend-design に渡してピクセルアート確定 <!-- id: m5-t1 status: done -->
- [x] エンドツーエンド体験チェック <!-- id: m5-t2 status: done -->
- [x] Project Settings 画面 <!-- id: m5-t3 status: done -->
- [x] トークン使用量 polling + メーター <!-- id: m5-t4 status: done -->
- [x] uninstall.sh + ドキュメント完成 <!-- id: m5-t5 status: done -->
- [x] README + リリース準備 <!-- id: m5-t6 status: done -->

---

## Phase 1 → Phase 2 boundary（retro 2026-05-04-001 由来）

Phase 1 MVP 21 milestone (M0 → M5) を 2026-05-04 に main 統合完了 (4 stacked branch を `--no-ff` merge)。tag `m5-complete` 設置済。

### Phase 2 entry criteria

- **dogfood validation: passed** (F-meta-001、retro 2026-05-04-001) — claude-loom 自身で M0 → M5 全 milestone を dispatch (PM + dev + reviewer)、32 commits + 4 branch + 5 retro session を 1 PJ 内で運用、自己再帰的 dev workflow が機能した record。Phase 2 evolution の前提となる「自己再帰的開発が成立する」claim の 1 回目検証
- **retro debt cleared** (F-pj-005、retro 2026-05-04-001) — M3.2 + M4 milestone retro 未実行の retro debt は本 retro 2026-05-04-001 が covering scope として acknowledge (Phase boundary retro covers all unrun milestones rule、cadence rule 緩和)
- **branch hygiene flushed** (F-proc-004、retro 2026-05-04-001) — Phase 1 MVP の 4 branch chain × 32 commits は 2026-05-04 に main 統合完了、Phase 2 開始前の clean state 達成
- **Visual regression baseline maintained** (F-res-001、retro 2026-05-04-001、success record) — Playwright Room View baseline が M3.1 → M3.2 → M4 → M5 全通過、視覚 regression ゼロ。Phase 2 frontend-design 連携時のベースライン source として継続活用

### Phase 1 success records（retro 2026-05-04-001）

- **F-proc-005**: M5 t2 E2E verification gate が 4 件 MVP-blocking bug を発見・修正 (vite chain block / Playwright crash / uninstall pattern / re-export 循環)。E2E task の構造的価値証明、Phase 2 milestone template に「milestone closure E2E verification = default」codify 候補
- **F-proc-006**: SPEC §3.6.10 SSoT cross-check rule の learning curve 観測 (M3.1 codify → M4 t5 で initial violation → reviewer 検出 → followup 解消 → M5 t5 dev-C は最初から clean)。retro → SPEC → next milestone loop が機能している evidence

### Phase 2 milestone candidates

- **M0.11.2** Pending Lifecycle Tracking + retro state durability + Token meter UX iteration (本 PLAN.md 既記載)
- **pixel art 実制作** (F-res-002): `frontend-design:frontend-design` skill invoke 試行 candidate、`docs/PIXEL_ART_HANDOFF.md` の Section 4 Option C 実行
- **doc 整合性 v2**: SPEC §7.6 v1/v2 境界、自動修正 + 承認ループ + auto trigger（v1 は半自動 GUI ボタン）
- **multi-contributor branch hygiene enforcement** (F-proc-004 後段): branch chain depth alert mechanism、PR auto-opening trigger
- **Phase 2 release engineering** (F-pj-004 後段): [0.0.x] → [0.1.0] migration path doc、external user 向け release prep
- **F-res-004 external 還元**: uninstall round-trip test pattern を claude-blog-skill 等の他 harness にも適用
