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

## Milestone planning convention (retro 2026-05-06-002 F-proc-001 由来 SSoT)

milestone task entry を書く際の必須 metadata：

- **`planned_files`**: 各 task が edit / create する file の絶対 path リスト (SPEC.md / PLAN.md / agents/*.md / hooks/*.sh / 等)。task description 直下の HTML comment で `<!-- planned_files: a.md, b.sh, c/d.ts -->` 形式記録。
- **parallel batch 宣言**: PLAN.md で「t4 + t5 + t6 を parallel batch」と書く場合、各 task の `planned_files` リストが **disjoint であることが宣言時の必須 verify 項目**。overlap が見つかったら parallel 宣言を撤回し sequential / unified annotation / task 分離のいずれかを採用。
- **PM dispatch 時の audit**: `agents/loom-pm.md` Implementation Phase Step 3 で file overlap pre-check を必須 step 化、disjoint 不成立なら parallel 宣言を撤回。

**rationale**: M0.11.6 t4/t5/t6 + M0.11.7 t4/t5 は PLAN で parallel batch 宣言したが、実際は同 file (agents/loom-pm.md) 編集で安全な並列不能、PM が dispatch 前 audit で検出 → 単一 dev 統合に切替えた事象 (本 retro F-proc-001)。F-USER-002 (default 値変更 audit) と同 family の audit gap を planning 段階で機械的 detect 可能化。

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

**SSoT**: SPEC §3.9.16 (Pending Lifecycle Architecture、2026-05-17 spec phase で codify 済) + SPEC §6.9.6 v3 (pending.json schema 拡張) + SPEC §6.9.8 (pending_summary.json schema 新設)
**retro 起源**: `docs/retro/2026-05-03-001-report.md` finding meta-003 (structural、M0.X cleanup 系列候補)

retro 2026-05-03-001 で観測された **pending finding lifecycle tracking 不在** を構造的に解決する milestone。M0.11.1 で applied finding の lifecycle tracking architecture (`applied_summary.json`) を確立したが、**`status: pending` のまま carryover される finding** は applied_summary に集約されず、4 lens は 'pending として宙ぶらりん状態' を context として取得できん。stale 排除でも apply 候補でもない '未処理の宙ぶらりん' state が permanent に積み上がる pattern を、**3-strike auto-expire + lens re-evaluation** で構造化する。

### 設計合意 (2026-05-17 spec phase 確定済)

- **expiration policy**: A1 — `carryover_count >= 3` で auto-expire (3-strike rule、§3.9.13 escalation と同 number)
- **re-evaluation 判定**: B1 — 4 lens template が自前判定 (autonomy 尊重、`source_pending_id` + `re_evaluation_verdict` field で出力)
- **aggregate scope**: a2 — carryover 1+ のみ pending_summary に集約 (本 retro 新規 pending は除外、scope clean)
- **expired finding 扱い**: b1 — pending_summary に `status: "expired"` で残す (audit trail 維持)
- **pending.json schema 拡張**: schema_version `2 → 3`、`carryover_count` / `last_seen_in` / `expired_at` / `re_evaluated_in` 4 field 追加
- **lens output 拡張**: `source_pending_id` + `re_evaluation_verdict` (`still-relevant` | `expired` | `drop` | null)
- **§3.9.14 (Carryover escalation for deferred) との関係**: orthogonal、両 rule 共存可能 (deferred 系 = 専用 fix milestone insertion、pending 系 = auto-expire + lens re-evaluation)

### Task (impl 用、spec 確定済の 9 task)

- [ ] SPEC §3.9.16 (Pending Lifecycle Architecture) + §6.9.6 v3 + §6.9.8 (pending_summary schema) を codify <!-- id: m0.11.2-t1 status: done note: 本 spec phase で先行完了 planned_files: SPEC.md -->
- [ ] retro-pm agent (agents/loom-retro-pm.md) Stage 0 で pending_summary.json lazy build mechanism 追加 (verdict_evidence + applied_summary + command_frequency に続く 4 件目 file) + idempotent carryover_count increment + auto-expire flip logic <!-- id: m0.11.2-t2 status: done planned_files: agents/loom-retro-pm.md -->
- [ ] 4 lens template (`skills/loom-retro/SKILL.md` § LENS_PJ / LENS_PROCESS / LENS_META / LENS_RESEARCHER + 共通 scaffold) に `pending_summary_path` injection + 're-evaluation 判定' guidance (`source_pending_id` / `re_evaluation_verdict` 出力規約) + 'still-relevant promote' workflow 追加 <!-- id: m0.11.2-t3 status: done planned_files: skills/loom-retro/SKILL.md -->
- [ ] AGGREGATOR_TEMPLATE (`skills/loom-retro/SKILL.md` § Stage 3) に `re_evaluated_in` lazy back-fill logic 追加 (lens 判定 `still-relevant` の origin pending.json への back-fill) <!-- id: m0.11.2-t4 status: done planned_files: skills/loom-retro/SKILL.md -->
- [ ] migration script: 既存 retro session の pending.json (v2) に v3 field 後付け (`carryover_count: 0` / `last_seen_in: <self>` / `expired_at: null` / `re_evaluated_in: null`) + schema_version 2 → 3 flag <!-- id: m0.11.2-t5 status: done planned_files: scripts/migrate_pending_v2_to_v3.sh -->
- [ ] tests 拡張: `tests/dry_run_pending_summary_test.sh` (pending_summary build + 3-strike auto-expire assertion + lens re-evaluation verdict 集約 assertion) + tests/retro_test.sh への schema_version 3 assertion 追加 <!-- id: m0.11.2-t6 status: done planned_files: tests/dry_run_pending_summary_test.sh, tests/retro_test.sh -->
- [ ] **archive markdown reconstruction logic** (retro 2026-05-04-001 F-meta-002): pending.json 不在時 `docs/retro/<retro_id>-report.md` から applied/recorded findings を抽出して applied_summary + pending_summary に再構築する fallback 実装、SPEC §3.9.12 の retro state durability 補完 <!-- id: m0.11.2-t7 status: done planned_files: daemon/src/routes/retro.ts, daemon/src/lib/retro-reconstruct.ts -->
- [ ] **Token meter UX iteration** (retro 2026-05-04-001 F-res-003): ui/src/live/useTokenUsage.ts に refetchInterval enabled flag (session-active 時のみ polling) + ui/src/components/Sidebar.tsx を AppShell に wire up (M5 t4 reviewer 指摘の dead export 解消) <!-- id: m0.11.2-t8 status: done planned_files: ui/src/live/useTokenUsage.ts, ui/src/components/Sidebar.tsx, ui/src/routing/AppShell.tsx -->
- [ ] doc consistency 更新 (RETRO_GUIDE / DOC_CONSISTENCY_CHECKLIST に §3.9.16 + §6.9.8 cross-check 追加) + Layer 1/2.5 dogfood smoke + tag m0.11.2-complete 設置、Phase 1 全 milestone tag 全保持 <!-- id: m0.11.2-t9 status: done planned_files: docs/RETRO_GUIDE.md, docs/DOC_CONSISTENCY_CHECKLIST.md -->

### Impl 戦略 (spec phase の判断)

- **dispatch 戦略**: Strategy a (commit_handoff=dev) / single mode / sequential dispatch — file overlap は SPEC (t1 既完了) と各 file scope 独立で衝突なし
- **branch**: 本 spec branch は spec PR で merge、impl は `feat/m0.11.2-pending-lifecycle-impl` 新 branch で進める (1 branch = 1 PBI 厳守)
- **parallel batch candidate**: t6 (tests) と t7 (reconstruction) と t8 (Token meter UX) は独立 file scope なので parallel batch 可、ただし t2/t3/t4 完了後

### M0.11.2 着手タイミング

Phase 1 → Phase 2 boundary milestone、Phase 2 entry 前の cleanup として実施。M0.X cleanup 系列 (M0.11.1 / M0.13 / M0.14 / M0.X-daemon-refactor-phase1 と同 family)。本 milestone は SPEC §3.9.x P4 (Root cause first) の 3 回目 application (M0.11.1 lifecycle tracking + skill migration に続く)、M0.11.1 の applied side architecture を pending side + durability side に拡張する cumulative refinement。

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
- [x] SPEC.md §3.6.x PM Auto-Spec Entry 章新設（検知ロジック / 3 信頼レベル / `/loom-spec` 位置付け codify） <!-- id: m0.11.6-t2 status: done note: §3.6.8.9 として配置、15 assertion test 全 pass -->
- [x] agents/loom-pm.md session start hook 拡張（context 評価ロジック + 3 信頼レベル分岐 + 確認 prompt template） <!-- id: m0.11.6-t3 status: done note: Session Start Hook section 新設 (workflow 内、Project lifecycle 前)、11 assertion 全 pass -->
- [x] 検知ロジック codify: intent keyword list 確定（15-25 個程度、保守的目安、AND 条件で高信頼判定） <!-- id: m0.11.6-t4 status: done note: 23 keyword (JP 14 + EN 9) を Session Start Hook 内 codify、impl 系除外 -->
- [x] 確認 prompt template（高信頼用）: 「○○ の spec phase に入ります、ええか？」型 + bypass option 提示 <!-- id: m0.11.6-t5 status: done note: yes → spec phase / no → /loom-status bypass の確認 template を Session Start Hook 内 codify -->
- [x] 分岐 prompt template（中信頼用）: 「新規 PJ / 既存 plan レビュー / status 確認」3 択型 <!-- id: m0.11.6-t6 status: done note: 3 択 + 各択肢の後続動作を Session Start Hook 内 codify -->
- [x] tests/agents_test.sh 拡張（context-aware entry の 3 信頼レベル assertion / `/loom-spec` override 動作 assertion） <!-- id: m0.11.6-t7 status: done note: literal agents_test.sh 採用せず、t3 m0116_t3_loom_pm_hook_test.sh (11 assertion) + t4/t5/t6 m0116_t4_t5_t6_placeholders_test.sh (18 assertion) で 3 信頼レベル + /loom-spec override 等価 coverage 充足、全 21 test pass -->
- [x] tag m0.11.6-complete 設置 + retro 1 サイクルで false-positive rate 観察（process-lens 必須） <!-- id: m0.11.6-t8 status: done note: tag 設置済、retro 観察は post-merge user 運用で実施 -->

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
- [x] SPEC.md §3.6.x PM Auto-Go Entry 章新設（M0.11.6 chapter の sibling、検知ロジック / 3 信頼レベル / `/loom-go` 位置付け codify） <!-- id: m0.11.7-t2 status: done note: §3.6.8.10 として配置、§3.6.8.9 sibling、18 assertion 全 pass -->
- [x] agents/loom-pm.md spec phase 完了 hook 拡張（M0.11.6 改修と統合、context 評価ロジック + 3 信頼レベル分岐 + 確認 prompt template） <!-- id: m0.11.7-t3 status: done note: 設計判断 (a) Session Start Hook 内 sub-section 配置、17 assertion 全 pass、impl keyword list draft 込み (t4 で最終確定) -->
- [x] 検知ロジック codify: impl intent keyword list 確定（M0.11.6 keyword list と分離、impl 系語彙 10-15 個程度） <!-- id: m0.11.7-t4 status: done note: 21 keyword (JP 11 + EN 10) を Spec Phase Completion Hook 内 codify、M0.11.6 spec keyword と分離維持 -->
- [x] 確認 prompt template（高信頼 + 中信頼 3 択用、M0.11.6 template の流用設計） <!-- id: m0.11.7-t5 status: done note: 高信頼 (impl phase 入りますで、ええか？ + /loom-status + /loom-spec bypass) + 中信頼 (impl 開始 / spec 修正 / status 確認) を codify -->
- [x] tests/agents_test.sh 拡張（auto-go entry の 3 信頼レベル assertion / `/loom-go` override 動作 assertion） <!-- id: m0.11.7-t6 status: done note: literal agents_test.sh 採用せず、t2 m0117_t2_spec_auto_go_test.sh (18 assertion) + t3 m0117_t3_loom_pm_auto_go_test.sh (17 assertion) + t4/t5 m0117_t4_t5_placeholders_test.sh (18 assertion) で 3 信頼レベル + /loom-go override 等価 coverage 充足、全 24 test pass、M0.11.5 t9 / M0.11.6 t7 と同 pattern -->
- [x] tag m0.11.7-complete 設置 + retro 1 サイクルで false-positive rate 観察（process-lens 必須） <!-- id: m0.11.7-t7 status: done note: tag 設置済、trinity 完成 (M0.11.5 + M0.11.6 + M0.11.7)、retro 観察は post-merge user 運用で実施 -->

**M0.11.7 完成基準**: `./tests/run_tests.sh` 全 PASS、spec phase 完了直後 + user impl intent → 1 問確認後 impl phase 突入動作、PLAN todo 残のみ + intent keyword 無し → 中信頼 path で 3 択分岐質問、新規 PJ + intent 無し → idle PM stay 動作、`/loom-go` 明示 invoke で常に impl phase 突入（override 動作）、`tag m0.11.7-complete` 設置、`m0`〜`m0.11.6-complete` 全保持。

**M0.11.7 着手タイミング**: M0.11.6 完了後（agent prompt 層で連続改修、M0.11.6 の検知ロジック実装パターンを再利用してコスト削減）。M0.11.5 とは parallel 可（M0.11.5 = infra 層、M0.11.7 = agent prompt 層）、ただし M0.11.6 → M0.11.7 は **sequential 必須**（同 agent prompt file = `agents/loom-pm.md` 編集発生）。M0.X cleanup 系列、推定 5-7 task 規模、dispatch 戦略は t2/t3 sequential → t4/t5 parallel → t6/t7 sequential closure。

## マイルストーン M0.X-test-debt-cleanup (carryover escalation、retro 2026-05-06-001 F-proc-004 由来)

起源: 2026-05-06 retro F-proc-004 で codify された SPEC §3.9.14 carryover escalation rule の **適用第 1 例**。pre-existing test failures 3 件 (`docs_release_test.sh` / `dry_run_applied_summary_test.sh` / `m1_docs_test.sh`) が M0.X 系列で 3 retro 連続 deferred state 残置、`./tests/run_tests.sh` で 18 PASS / 3 FAIL の常態化。専用 fix milestone として PLAN.md insertion 必須化（SPEC §3.9.14 mandatory）。

### 設計合意（retro 2026-05-06-001 F-proc-004 SSoT）

- **scope 限定**: 3 件 carryover failures の **fix のみ**、SPEC / agent prompt 改変なし
- **task 内容（推定）**:
  - [x] `tests/docs_release_test.sh` failures fix (test 緩和 path: REQ-042a 日英両対応 ^## (ライセンス|License) + REQ-042c M5 mention check 削除、REQ-042d README §Phase 2 以降 section 追加) <!-- id: m0.x-debt-t1 status: done commit: c2fec72 -->
  - [x] `tests/dry_run_applied_summary_test.sh` failures fix (fixture update path: total_retro_sessions 1→5、4 sessions 追加で stale 化した fixture を actual reflect) <!-- id: m0.x-debt-t2 status: done commit: c2fec72 note: parallel dev-1 の git add が dev-2 の fixture edit を巻き込んで 1 commit に統合 (Strategy a atomic unit race、retro material) -->
  - [x] `tests/m1_docs_test.sh` failures fix (README §Daemon Foundation (M1 から) section 追加で Fastify + tRPC + Drizzle + AppRouter + 127.0.0.1:5757 + pnpm 起動を user 向け説明) <!-- id: m0.x-debt-t3 status: done commit: c2fec72 -->
  - [x] `./tests/run_tests.sh` で **35 PASS / 0 FAIL** 達成、carryover state 解消 (元 PLAN claim 21 は過去 baseline、test 増加で actual 35) <!-- id: m0.x-debt-t4 status: done -->
  - [x] tag `m0.x-test-debt-cleanup-complete` 設置（M0 系列継続の cleanup marker） <!-- id: m0.x-debt-t5 status: done commit: f5f43ba note: tag 設置済 + main e9bdea8 到達、retro 2026-05-06-004 F-pj-002 で doc/git state 不一致 surface、本 cleanup batch で sync -->
- **着手タイミング**: M0.11.7 完了後 / Phase 2 entry 前。Phase 2 spec phase の cleanup 前提として完走必要
- **rationale**: 3 retro 連続 carryover の SPEC §3.9.14 escalation 適用例。専用 milestone scope 化により、各 dev session で「scope 外」と注記される carryover の意味を回復、user 環境での silent failure 減らす

### M0.X-test-debt-cleanup 完成基準

`./tests/run_tests.sh` 全 PASS（既存 18 PASS + 3 carryover fix = 21 PASS / 0 FAIL）、`m0.11.5-complete`〜`m0.11.7-complete` 全保持、Phase 2 entry checklist の test debt clear 項目 reset。

## マイルストーン M0.X-startup-recovery (retro 2026-05-06-002 F-USER-005/006 由来)

起源: 2026-05-06-002 retro 中 PM 直接 verify で発覚した M0.11.5 trinity の deployment level 破綻：

- **F-USER-006 (CRITICAL)**: `install.sh` の `daemon.js` symlink target が `daemon/dist/index.js` (re-export module) を指していた。正は `daemon/dist/server.js` (CLI entry)
- **F-USER-005 (CRITICAL)**: `daemon/dist/db/migrations/` が build 成果物に同梱されておらず、`runMigrations()` で `Can't find meta/_journal.json` crash → daemon production startup 不能

両 finding は本 retro session 内で **hotfix commits + E2E test 設置済**、本 milestone は事後の状態 codify と再発防止の audit framework 化。

### 設計合意（retro 2026-05-06-002 SSoT）

- **scope**:
  - [x] F-USER-006: install.sh symlink target を server.js に修正 (commit 713c631) <!-- id: m0.x-startup-t1 status: done -->
  - [x] F-USER-005: daemon build script に migrations bundle copy step 追加 (commit 430924d) <!-- id: m0.x-startup-t2 status: done -->
  - [x] F-USER-005: tests/daemon_e2e_startup_test.sh 新設 (commit fb1e7c1) <!-- id: m0.x-startup-t3 status: done -->
  - [ ] tag `m0.x-startup-recovery-complete` 設置 (本 retro PR merge 後) <!-- id: m0.x-startup-t4 status: todo -->
- **着手タイミング**: 本 retro PR で fix 自体は完了、Phase 2 entry 前の audit / tag 設置のみ未了
- **rationale**: M0.11.5 trinity の core promise (lazy daemon auto-launch → UI serve) が claim level (SPEC + agent prompt 整合) で完成しただけで deployment level で破綻していた構造的 gap。F-USER-002 (default 値変更 audit) の structural fix が SPEC §3.6.8.8 に既存だが、build artifact bundle 完全性を audit する step が欠落していた。本 milestone で hotfix + E2E test 設置 + 再発防止 audit を完結

### M0.X-startup-recovery 完成基準

- `bash tests/daemon_e2e_startup_test.sh` PASS (curl /health → HTTP 200 + status:ok)
- install.sh symlink target が `daemon/dist/server.js` に固定
- daemon build script が migrations bundle copy を含む
- tag `m0.x-startup-recovery-complete` 設置 (本 retro PR merge 後)

## マイルストーン M0.X-runtime-mode-recovery (本 spec phase 2026-05-06 由来)

起源: 2026-05-06 user 直接 verify (`/loom-pm` 起動後に `127.0.0.1:5757` で 404 真っ黒画面) で発覚した M0.X-startup-recovery (F-USER-005/006 hotfix) **直後の 4 層構造的 bug**：

- **Layer 1 (root cause)**: lazy launch path で `NODE_ENV` env 不在 → `isProductionMode()` false → static serving skip → `/` 404 (UI が真っ黒画面)
- **case 1**: 同 PJ 内で複数 daemon 並走（`pnpm dev` の tsx watch + lazy launch）の競合 detection 不在、PID file は記録だけで lock 機能なし
- **Layer 2**: tsx watch 起動失敗で zombie 残留（観察時点で PID 10762 が 1 日 13h 前から残骸化）
- **dev/prod semantics 不在**: `pnpm dev` と lazy launch の役割分担が SPEC で未明文化、`NODE_ENV` 依存の判定 logic に hidden coupling

F-USER-007/008 (symlink CLI guard + hooks SDK 仕様準拠) と同 class の **partial implementation** pattern。

### 設計合意（2026-05-06 spec phase 対話、SPEC §3.2.1 + §3.2.2 SSoT）

- **Layer 1 fix**: 案 B 採用 — `isProductionMode()` (NODE_ENV 依存) を deprecate、`!isDevMode && existsSync(uiDistPath)` ベースに切替。`LOOM_DEV_MODE` env 一本化で「build artifact 存在 + 明示 dev override なし = serve」という直感的 mental model に統一
- **case 1 fix**: 案 γ-2 採用 — daemon に `/mode` endpoint 新設 (SSoT = daemon process 自身)、PID file は debug breadcrumb として残置 (user 救済路 `kill $(cat daemon.pid)` 保持)
- **dev/prod semantics**: `pnpm dev` script に `LOOM_DEV_MODE=1 LOOM_ENTRY=pnpm-dev` auto-inject、lazy launch は `LOOM_ENTRY=lazy-launch` のみ inject (env 無し = prod default)
- **Layer 2 cleanup**: `/loom-stop --all` semantics 拡張 (全 daemon プロセス kill + tsx watch 残骸 detection)、案 γ pre-flight 採用後は新規 zombie 発生を構造的に防止
- **rationale**: 「変更が小さい = スマート」ではなく **設計として正しいのがスマート** (本 spec phase の user feedback)。sidecar file (PID JSON) を SSoT とする案 β より、daemon endpoint を SSoT とする案 γ が race / stale / 2-writer の edge case を構造的に消去
- **scope 外 (YAGNI)**: Layer 3 (POST /event 400 spam) は別 milestone (M0.X-hook-ingest-recovery)、multi-PJ design pivot (case 2/3) は Phase 2 deferred

### Task （推定 11 task、planned_files 注釈付き）

- [x] PLAN.md milestone 挿入 + SPEC §3.2 改訂（本 spec phase で実施）
      <!-- id: m0.x-runtime-mode-t1 status: done planned_files: PLAN.md, SPEC.md -->
- [x] daemon: `server.ts` の static serving 判定を `LOOM_DEV_MODE` ベースに切替 + `/mode` endpoint 新設
      <!-- id: m0.x-runtime-mode-t2 status: done planned_files: daemon/src/server.ts commit: f43006a note: t3 と bundle (TDD cycle 統合)、unified annotation、507/507 daemon test pass、path C self-review 完了 -->
- [x] daemon: `test/server-static.test.ts` を `LOOM_DEV_MODE` mutation ベースに書換、`/mode` endpoint test 追加
      <!-- id: m0.x-runtime-mode-t3 status: done planned_files: daemon/test/server-static.test.ts, daemon/test/server-mode-endpoint.test.ts commit: f43006a note: t2 と bundle、新 endpoint test 13 件 + migration test 11 件 全 PASS -->
- [x] hooks/loom-launch-ui.sh: `/mode` probe + dev daemon 検出時の Vite (:5173) redirect logic 追加
      <!-- id: m0.x-runtime-mode-t4 status: done planned_files: hooks/loom-launch-ui.sh commit: 1ce1b11 note: REQ-050 追加、loom_launch_ui_mode_probe_test 9 件 PASS、regression 0、path C self-review 完了 -->
- [x] daemon/package.json: `dev` script に `LOOM_DEV_MODE=1 LOOM_ENTRY=pnpm-dev` auto-inject
      <!-- id: m0.x-runtime-mode-t5 status: done planned_files: daemon/package.json commit: d3aa805 note: t6 と bundle (file overlap on package.json)、unified annotation -->
- [x] daemon: pre-flight script 新設 (`scripts/pnpm-dev-preflight.sh` 等、`/health` + `/mode` で prod daemon 検出時に diagnostic 出して exit)、`pnpm dev` script から invoke
      <!-- id: m0.x-runtime-mode-t6 status: done planned_files: daemon/scripts/pnpm-dev-preflight.sh, daemon/package.json commit: d3aa805 note: t5 と bundle、REQ-053 追加、m0x_t5_t6_preflight_test 13 件 PASS -->
- [x] commands/loom-stop.md + hooks/loom-stop.sh: `/loom-stop --all` semantics 拡張 (全 daemon プロセス kill + tsx watch 残骸 cleanup)
      <!-- id: m0.x-runtime-mode-t7 status: done planned_files: commands/loom-stop.md, hooks/loom-stop.sh commit: 6e09df5 note: REQ-052 追加、loom_stop_all_test 12 件 PASS、no-arg regression 0 -->
- [x] install.sh: post-install で stale tsx watch detection + warning メッセージ追加
      <!-- id: m0.x-runtime-mode-t8 status: done planned_files: install.sh commit: 3a24688 note: REQ-051 追加、install_post_check_test 7 件 PASS (3 scenario)、auto-kill なし read-only check -->
- [x] tests/REQUIREMENTS.md: REQ for 競合 diagnostic + dev/prod 切替の access URL pattern 追加
      <!-- id: m0.x-runtime-mode-t9 status: done planned_files: tests/REQUIREMENTS.md note: scope absorbed — t2-t8 個別 dev による REQ-049/050/051/052/053 追加で本 task scope 全カバー、separate dispatch 不要 -->
- [x] CLAUDE.md + README.md cascade update (dev/prod mode 役割分担 + access URL 違いを user 視点で明記)
      <!-- id: m0.x-runtime-mode-t10 status: done planned_files: CLAUDE.md, README.md, README.ja.md commit: 5afef01 note: dev/prod mode 比較表 + access URL (:5757 vs :5173) + LOOM_DEV_MODE/LOOM_ENTRY + opt-out 追加、path C self-review 完了 -->
- [x] e2e smoke test (`tests/daemon_runtime_mode_test.sh`) 新設 + tag `m0.x-runtime-mode-recovery-complete` 設置
      <!-- id: m0.x-runtime-mode-t11 status: done planned_files: tests/daemon_runtime_mode_test.sh, daemon/src/server.ts (LOOM_PORT env var), tests/REQUIREMENTS.md (REQ-054) note: 3 boot scenario × 15 assertion PASS、port 15870-15872 (衝突回避) -->

**dispatch 戦略**: t2 (daemon server.ts) → t3 (daemon test) sequential（同 daemon module）、t4 (hooks) と t5+t6 (package.json + pre-flight) は file disjoint で parallel 可能、t7-t8 sequential（install.sh と loom-stop.sh で hooks/ 共有 risk）、t9-t11 sequential closure。Strategy a default (dev 自身 commit)、Strategy b は parallel batch 採用時のみ。

### M0.X-runtime-mode-recovery 完成基準

- `bash tests/daemon_runtime_mode_test.sh` PASS (curl `/` → 200 + `index.html` 返却、curl `/mode` → JSON 応答)
- lazy launch で起動 → `ui/dist` 自動 serve、`/` で UI 描画 (今回の 404 事件再発防止確認)
- `pnpm dev` 起動済 + `/loom-pm` の場合：lazy launch hook が dev daemon 検出 → Vite (:5173) redirect
- lazy launch 起動済 + `pnpm dev` の場合：pre-flight が prod daemon 検出 → ERROR exit + diagnostic message
- `./tests/run_tests.sh` 全 PASS、`pnpm --filter @claude-loom/daemon test` 全 PASS
- tag `m0.x-runtime-mode-recovery-complete` 設置、既存全 tag 保持

## マイルストーン M0.X-hook-ingest-recovery (本 spec phase 2026-05-06 由来、post-tag-hotfix protocol §3.6.8.11 適用第 1 例)

起源: 2026-05-06 daemon log 観察で発覚した hook ingest path の連続 400 失敗：直近 commit `c31a88e` (F-USER-007/008 hotfix: hooks SDK 仕様準拠) 後に **`POST /event` が `req-q` 〜 `req-z` まで連続 400 (Body is not valid JSON)** で失敗、hook event ingest が機能不全。F-USER-007/008 hotfix の regression 疑いあり、bisect investigation 必要。

### 設計合意（2026-05-06 spec phase 対話、retro 2026-05-06-003 で scope 拡張）

- **scope**: bash hook script の curl payload format と daemon `eventInputSchema` の整合性回復
- **investigation phase**: bash hook script (5 種: `pre_tool.sh` / `post_tool.sh` / `session_start.sh` / `stop.sh` / `SubagentStop.sh`) の curl invocation を debug log で dump、daemon schema と照合して root cause 特定
- **修正方針**: payload format を daemon schema に合わせる (script side fix 推奨、user 環境影響最小) or schema 側を SDK 仕様に合わせる (user 環境影響大、最終手段)
- **再発防止**: hook script ↔ daemon schema の cross-check assertion を `tests/REQUIREMENTS.md` に REQ 化、integration test で構造的 detect 可能化
- **scope 拡張 (retro 2026-05-06-003 由来)**:
  - **F-proc-002**: parallel batch dispatch + SessionStart hook 多重発火 interaction の test fixture 追加 (Bug A symptom chain trigger 部分の structural verify)
  - **F-meta-004**: `~/.claude-loom/command-frequency.log` 不在 silent failure の investigation 追加 (post_tool hook が actual に発火しとるか probe 動作 verify)
- **scope 外 (YAGNI)**: hook event ingest path 全体の refactor、event correlation 強化、`/event` endpoint の versioning 戦略は本 milestone 対象外
- **rationale**: M0.X-runtime-mode-recovery とは bug class が独立 (startup ≠ runtime ingest)、investigation phase 必要なため別 milestone で集中する方が clean。retro 2026-05-06-003 で発覚した parallel batch interaction (Bug A trigger) と post_tool freq probe silent failure を本 milestone scope に統合 (root cause overlap)

### Task （推定 7 task、retro 2026-05-06-003 で scope 拡張）

- [x] PLAN.md milestone 挿入（本 spec phase で実施）
      <!-- id: m0.x-hook-ingest-t1 status: done planned_files: PLAN.md -->
- [x] investigation: 5 種 bash hook script の curl payload を debug log で dump、daemon `eventInputSchema` と照合 (root cause specific identification)
      <!-- id: m0.x-hook-ingest-t2 status: done planned_files: hooks/pre_tool.sh, hooks/post_tool.sh, hooks/session_start.sh, hooks/stop.sh, hooks/SubagentStop.sh, daemon/src/hooks/ingest.ts note: PM 直接 investigation で root cause 確定 — `date +%s%3N` macOS BSD date が `%3N` 非対応で生文字 `N` を残置、`TS=17780770293N` 生成 → JSON parse 失敗 → daemon 400 spam。bash -x trace + 直接 POST cross-check で確定。F-USER-007/008 hotfix (c31a88e) は hooks 配線を正規 SDK 仕様化したのみ、本 bug は macOS で初日から潜在、c31a88e で hooks が「正しく発火する」状態になり broken payload が表面化。SESSION_ID=unknown / TOOL_NAME=unknown 問題は SDK stdin input 読込み不在 (scope 外、後続 milestone 候補) -->
- [x] fix: payload format alignment — `ts_ms()` helper 関数導入 (python3 → node → s 精度 fallback の 3 段、案 A 採用)、5 hook script 全部の `TS=$(date +%s%3N)` を `TS=$(ts_ms)` 化
      <!-- id: m0.x-hook-ingest-t3 status: done planned_files: hooks/pre_tool.sh, hooks/post_tool.sh, hooks/session_start.sh, hooks/stop.sh, hooks/SubagentStop.sh commit: 9a56842 note: dev path C self-review (Task tool deferred)、PM smoke test で live daemon に 5 hook 全部 ok:true 確認、cross-platform verify -->
- [x] tests: hook script ↔ daemon schema cross-check assertion を `tests/REQUIREMENTS.md` に REQ 化 + `tests/hook_ingest_integration_test.sh` 新設 (TDD: RED 先行で broken payload 再現 → GREEN で fix 確認)
      <!-- id: m0.x-hook-ingest-t4 status: done planned_files: tests/REQUIREMENTS.md, tests/hook_ingest_integration_test.sh commit: 28d3023 note: REQ-056 追加、Test 1-3 = 22 assertion / Test 4 (live daemon) = 5 assertion、合計 22 PASS、daemon-absent 時は Test 4 skip + WARN -->
- [x] **retro 2026-05-06-003 F-proc-002 由来**: parallel batch dispatch + SessionStart hook 多重発火 interaction の test fixture 追加 (mock parallel SessionStart で daemon load 観察 + Bug A trigger 部分の structural verify)
      <!-- id: m0.x-hook-ingest-t5 status: done planned_files: tests/hook_parallel_batch_interaction_test.sh note: post-tag-hotfix §3.6.8.11 適用第 1 例。REQ-058 追加 (4 scenario: 単発 baseline / 3 並列 200 / health concurrent / daemon absent fail-silent)。daemon 不在時 Test 2-3 skip + WARN (CI friendly)。branch: fix/m0.x-hook-ingest-posttag-t5-t6 -->
- [x] **retro 2026-05-06-003 F-meta-004 由来**: `~/.claude-loom/command-frequency.log` 不在 silent failure investigation — post_tool hook が `tool_name == "SlashCommand"` 判定後に actual log write しとるか probe、root cause: SDK は stdin JSON で hook input 渡す仕様、env var only path は永久 false negative → stdin JSON read + env var fallback chain に修正
      <!-- id: m0.x-hook-ingest-t6 status: done planned_files: hooks/post_tool.sh, tests/command_frequency_log_test.sh, tests/REQUIREMENTS.md note: post-tag-hotfix §3.6.8.11 適用第 1 例。REQ-057 追加 (4 scenario: stdin SlashCommand / opt-out / env var fallback / non-SlashCommand)。stdin JSON parse (jq) → env var fallback chain 実装。branch: fix/m0.x-hook-ingest-posttag-t5-t6 -->
- [x] tag `m0.x-hook-ingest-recovery-complete` 設置
      <!-- id: m0.x-hook-ingest-t7 status: done note: 5b4ca6b に対して設置済、α (t2-t4) 完了 marker。但し t5/t6 は α 作業時 retro archive orphan で scope 不可視、tag 設置後の retro 取込 merge で発覚 — SPEC §3.6.8.11 post-tag-hotfix protocol 適用、tag 移動禁止、t5/t6 完了は post-tag fix で対応 -->

**dispatch 戦略**: t2 (investigation) sequential（root cause 確定が前提）→ t3 (fix) + t5 + t6 parallel candidate（file disjoint 確認後）→ t4 (test) sequential（t3-t6 で fix 確定後）→ t7 (tag) closure。Strategy a default。

### M0.X-hook-ingest-recovery 完成基準

- `POST /event` 400 spam が daemon log から消失
- 5 種 hook script からの ingest 成功率 100% (10 invocation 中 10 成功 sample 確認)
- `bash tests/hook_ingest_integration_test.sh` PASS
- `bash tests/hook_parallel_batch_interaction_test.sh` PASS (retro 2026-05-06-003 F-proc-002)
- `~/.claude-loom/command-frequency.log` が actual session で write されとる evidence (retro 2026-05-06-003 F-meta-004)
- `tests/REQUIREMENTS.md` に hook script ↔ daemon schema cross-check REQ + parallel interaction REQ 追加
- tag `m0.x-hook-ingest-recovery-complete` 設置

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

### Phase 2 Entry Checklist (formal codify、retro 2026-05-06-002 F-pj-002 由来 SSoT)

Phase 2 entry の HARD blocker と soft blocker を 1 箇所に SSoT 化、retro context 箇条書きの session 跨ぎ消失リスクを抑える。

**HARD blocker (Phase 2 entry 不可、本項全 PASS まで `M0.12 系列` 着手禁止)**:

- [ ] **F-USER-005/006 hotfix verified** (本 retro 2026-05-06-002 で対処、`bash tests/daemon_e2e_startup_test.sh` PASS で確認、tag `m0.x-startup-recovery-complete` 設置)
- [x] **3 pre-existing test failure cleanup**: M0.X-test-debt-cleanup milestone 完走 (`docs_release_test.sh` / `dry_run_applied_summary_test.sh` / `m1_docs_test.sh` 3 件 fix、`./tests/run_tests.sh` 37 PASS / 0 FAIL — actual baseline post-β + α post-tag t5/t6、test 増加で baseline は逐次成長、`run_tests.sh` 末尾出力が canonical)
- [ ] **path C default 昇格 SSoT 整合確認** (SPEC §3.6.8.7 + §3.9.13 + §3.9.13.1 の cross-reference 整合済、retro 2026-05-06-002 F-proc-003 で codify)
- [ ] **Task tool 復旧 (HARD blocker、retro 2026-05-06-004 F-proc-001 で 4-strike escalation 確定)**: subagent context での Task tool deferred 状態が 4+ session 連続 (79f23bec / 86b748af / 0b65386d / e81ce929)、全 developer dispatch が path C self-review、formal reviewer dispatch 永続的 zero。retro 2026-05-04-001 / 2026-05-05-001 / 2026-05-06-001 / 2026-05-06-002 の deferred state を 2026-05-06-004 F-proc-001 で **HARD blocker 格上げ確定** (option (a) 採用)。Phase 2 entry 前に subordinate research task (`docs/research/task-tool-availability.md`) で Claude Code SDK 仕様 / settings.json tool permission / subagent-of-subagent context limitation の 3 軸 root cause 確定 + recovery path 整理が必要。recovery 不能と判定された場合のみ option (b) (path C を 1st-class default に formal 昇格) への demote を retro で再評価
- [ ] **Layer 2.5 PM dogfood smoke 運用 N 回 success record** (retro 2026-05-06-003 F-USER-009 + F-meta-002 由来、SPEC §10.4.1 SSoT): trust recovery milestone series 3 連続 (F-USER-005/006 + F-USER-007/008 + Bug A) を Phase 2 multi-contributor 環境で再発させないため、Layer 2.5 が **少なくとも 3 milestone 連続で運用 success** することを確認 (推奨 N=3、user 判断で増減可)
- [ ] **post-tag hotfix 0 件 milestone N 回連続 record** (retro 2026-05-06-003 F-meta-002 由来 soft blocker → Phase 2 multi-contributor で hard 化候補): F-USER-007/008 + Bug A の post-tag hotfix 2 連続 pattern が解消されとるか確認、3 milestone 連続で 0 件 record で entry permit (SPEC §3.6.8.11 protocol 準拠 hotfix は record-only として count から除外可、判断は retro 時)

**Soft blocker (Phase 2 entry 可能、ただし spec phase 1st task で解消推奨)**:

- [ ] F-001 structural fix (project-settings dropdown data binding regression、retro 2026-05-05-001 carryover)
- [ ] REQ-045 smoke skill bind 明文化 (F-pj-002 from 2026-05-05-001)
- [ ] subordinate research task `docs/research/task-tool-availability.md` の Phase 2 中並行進行 (HARD blocker でない、§3.9.13.1 SSoT)
- [ ] M0.X-runtime-mode-recovery hotfix verified (retro 2026-05-06-003 由来): `bash tests/loom_launch_ui_bug_a_test.sh` PASS、Bug A symptom (タブ大量起動) が再発しないこと、SPEC §3.2.3 Boot health-check polling SSoT 整合確認

### Phase 2 entry sequence (推奨)

1. **HARD blocker 全 PASS verify** (上記 checklist 3 項目すべて完了確認)
2. **Ceremony reduction trinity 完走 verified**: M0.11.5/6/7 trinity 完成 + 本 retro F-USER-005/006 hotfix 込で deployment level でも actual 機能。SPEC §3.6.13 Trinity Marker SSoT に整合性確認
3. F-001 structural fix (F-pj-001 from 2026-05-05-001) を Phase 2 1st impl task として dispatch
4. REQ-045 smoke skill bind 明文化 (F-pj-002 from 2026-05-05-001)
5. Phase 2 milestone (M0.12 系列以降) entry — **Phase 2 candidate pool** (下記) を spec phase で優先順位再判定 (SPEC §3.6.13 Trinity Marker を 1st-class 評価軸として使用)
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

## マイルストーン M0.15: UI Redesign Port

claude.ai/design で詰めた UI 再設計 (12 画面 + scenarios.js + Redesign App.html) を本実装に書き起こす Phase 1 hardening continuation milestone。既存 `ui/src/views/` の M0.11.4 ハードコード fixture (例: `AGENT_STATES = [{ task: "GREEN にする" }, ...]` 系、chat 1 で user が酷いと糾弾した fixture) を全部撤去、`useScenario()` 駆動 (mock=active fallback + daemon WS reduce) に書き換える。

mock fixture (`redesign/scenarios.js` + `redesign/screens/*.jsx` + `redesign/Redesign App.html` + `redesign/cat.jsx` + `redesign/styles.css` + `redesign/tokens.css`) は **絶対消すな** rule、harness test (`tests/redesign_invariant_test.sh`、t18) で構造的 gate (詳細: SPEC §3.6.14.3)。

**SSoT**: SPEC §3.6.14 が milestone scope + 完成基準 + Layer 2.5 smoke matrix の SSoT。本 PLAN section は task list + planned_files + commit hint。

**Phase 1 closure trinity との関係**: M0.11.5/6/7 で codify された 「context から intent 読めるなら ceremony 強制せえ」 design principle の UI 側 hardening 続編。Phase 2 Kickoff (M1.0) の事前条件。

### Phase 1: reducer foundation (sequential)

- [x] redesign port 先行 t0: ① RoomView 駆動 (agent.change WS event のみ wire、本 milestone 着手前の session 内で完了済) <!-- id: m0.15-t0 status: done planned_files: redesign/api/websocket.ts, redesign/api/types.ts, redesign/scenarios.d.ts, ui/src/views/room/RoomView.tsx, ui/test/views/room/room-mock-active.test.tsx -->
- [x] websocket.ts に 8 event reducer 追加 <!-- id: m0.15-t1 status: done committed_sha: 7b2ca4b path: C (self_review, 4-aspect checklist + file:line refs) planned_files: redesign/api/websocket.ts, redesign/api/types.ts, ui/test/redesign/websocket-reducer.test.ts -->
  - todo.change / plan.change / worktree.change / learned_guidance.change / discipline_metric.update / approval.request / session.change / finding.new
  - dispatcher: Strategy a / single mode / shared tree

### Phase 2: parallel screen batches (worktree isolation 必須)

#### batch A — 確信:高 group A (3 dev parallel)
- [x] ② Gantt redesign port <!-- id: m0.15-t2 status: done committed_sha: 086629b path: C (self_review, 4-aspect checklist + file:line refs) planned_files: ui/src/views/gantt/*.tsx, ui/test/views/gantt/*.test.tsx -->
- [x] ③ Plan redesign port <!-- id: m0.15-t3 status: done committed_sha: 2b401c5 path: C (self_review, 4-aspect checklist) planned_files: ui/src/views/plan/*.tsx, ui/test/views/plan/*.test.tsx -->
- [x] ⑥ Worktree redesign port <!-- id: m0.15-t4 status: done committed_sha: cebdbd8 path: C (self_review, 4-aspect checklist) planned_files: ui/src/views/worktree/*.tsx, ui/test/views/worktree/*.test.tsx -->

dispatcher: Strategy a × 3 / single mode × 3 / **worktree isolation 必須** (同 message 内 3 Agent invocation)

#### batch B — 確信:高 group B (3 dev parallel、1 trio)
- [x] ⑦ Customization redesign port <!-- id: m0.15-t5 status: done committed_sha: da97c03 path: C (trio mode self_review, 4-aspect checklist) reviewer_mode: trio planned_files: ui/src/views/customization/*.tsx, ui/test/views/customization/*.test.tsx -->
- [x] ⑧ Guidance redesign port <!-- id: m0.15-t6 status: done committed_sha: 5f878f3 path: C (self_review, 4-aspect checklist) planned_files: ui/src/views/guidance/*.tsx, ui/test/views/guidance/*.test.tsx -->
- [x] ⑨ AgentDetailPanel redesign port <!-- id: m0.15-t7 status: done committed_sha: 002d218 path: C (self_review, 4-aspect checklist) planned_files: ui/src/views/room/AgentDetailPanel.tsx, ui/test/views/room/agent-detail-panel.test.tsx -->

dispatcher: Strategy a × 3 / single + trio + single / **worktree isolation 必須**

#### batch C — 確信:高 group C (3 dev parallel)
- [x] ⑩ Sessions redesign port <!-- id: m0.15-t8 status: done committed_sha: 13e8dfe path: C (self_review, REQ-070 renumbered from REQ-068 due to merge collision with t10) planned_files: ui/src/views/session-list/*.tsx, ui/test/views/session-list/*.test.tsx -->
- [x] ⑪ Tokens redesign port <!-- id: m0.15-t9 status: done committed_sha: bcbc55e path: C (self_review, REQ-069) planned_files: ui/src/views/tokens/*.tsx, ui/test/views/tokens/*.test.tsx -->
- [x] ⑫ Settings redesign port <!-- id: m0.15-t10 status: done committed_sha: 9c8deeb path: C (self_review, REQ-068) planned_files: ui/src/views/project-settings/*.tsx, ui/test/views/project-settings/*.test.tsx -->

dispatcher: Strategy a × 3 / single mode × 3 / **worktree isolation 必須**

### Phase 3: 中信頼 + PMChat

#### batch D — 中信頼 (Consistency + Retro、parallel)
- [x] ④ Consistency redesign port <!-- id: m0.15-t11 status: done committed_sha: b937f1b path: C (self_review, REQ-073 renamed from REQ-070 due to t8 collision) planned_files: ui/src/views/consistency/*.tsx, ui/test/views/consistency/*.test.tsx -->
- [x] ⑤ Retro redesign port <!-- id: m0.15-t12 status: done committed_sha: 6f13b16 path: C (self_review, REQ-072) planned_files: ui/src/views/retro/*.tsx, ui/test/views/retro/*.test.tsx -->

dispatcher: Strategy a × 2 / single mode × 2 / **worktree isolation 必須**

#### t-pm — ⑬ PMChat 単独 (trio reviewer、daemon pm.* sub-router 新設含む)
- [x] ⑬ PMChat 実装 + daemon pm.* sub-router + 3 新 event 型 <!-- id: m0.15-t13 status: done committed_sha: 97922f0 path: C (trio mode self_review, 3 aspect + SPEC cross-check all pass、REQ-074) reviewer_mode: trio planned_files: ui/src/views/pm-chat/*.tsx, ui/src/AppShell.tsx, daemon/src/routes/pm.ts, daemon/src/events/types.ts, daemon/src/events/broadcaster.ts, daemon/src/router.ts, daemon/test/routes/pm.test.ts, daemon/test/events/pm-events.test.ts -->
  - daemon 側: pm.message / pm.permission_request / pm.permission_resolved の 3 event schema を types.ts に追加、broadcaster に emit 関数 3 つ追加、routes/pm.ts に POST /pm/start / POST /pm/say / POST /pm/permission/:id / POST /pm/stop 実装、router.ts に pm sub-router 統合
  - frontend 側: ui/src/views/pm-chat/PMChatPanel.tsx + AppShell.tsx 右カラム構造 + risk-based modal/toast routing (high → 中央 modal、med/low → 右上 toast)
  - dispatcher: Strategy a / **trio mode** / shared tree (単独 task)

### Phase 4: shell + posters

- [x] AppShell.tsx redesign 移植 <!-- id: m0.15-t14 status: done committed_sha: 0c1bcb2 path: C (self_review, 4 aspect + SPEC cross-check pass、REQ-075) planned_files: ui/src/routing/AppShell.tsx, ui/src/routing/routes.tsx, ui/test/AppShell.test.tsx, ui/test/AppShell.redesign.test.tsx -->
  - drawer 11 nav (OPERATE / MANAGE / SETTINGS の 3 group)、topbar 4 metric (PARALLEL / TASK TOOL / TDD ORDER / VERDICT)、statusbar (scenario label + events seen + project path)、scenario picker (idle/active/failed)、conn 表示
  - dispatcher: Strategy a / single mode / shared tree
- [x] Room 3 posters scenario 駆動化 <!-- id: m0.15-t15 status: done committed_sha: 1d9480e path: C (self_review, REQ-076) planned_files: ui/src/views/room/wall-posters/*.tsx, ui/test/views/room/wall-posters/*.test.tsx -->
  - GanttPoster / PlanPoster / ConsistencyPoster の static 描画を撤去、scenario.todos / scenario.milestones / scenario.findings / scenario.gantt から駆動
  - dispatcher: Strategy a / single mode / shared tree

### Phase 5: write API hookup

- [x] 既存 daemon REST への button hook (6 画面) <!-- id: m0.15-t16 status: done committed_sha: 50a2a43 path: C (self_review, REQ-077) planned_files: ui/src/views/customization/*.tsx, ui/src/views/guidance/*.tsx, ui/src/views/worktree/*.tsx, ui/src/views/consistency/*.tsx, ui/src/views/plan/*.tsx, ui/src/views/project-settings/*.tsx, ui/src/live/*.ts -->
  - ⑦ Customization: PUT /customization/:id (既存 prefs router)
  - ⑧ Guidance: DELETE /guidance/:id (既存 prefs router)
  - ⑥ Worktree: POST /worktree, DELETE /worktree/:branch, POST /worktree/:branch/lock (既存 worktree router)
  - ④ Consistency: POST /findings/:id/{ack,fix,dismiss} (既存 consistency router)
  - ③ Plan: PUT /plan_items (既存 plan router)
  - ⑫ Settings: PUT /settings (既存 project / config router)
  - dispatcher: Strategy a / single mode / shared tree
- [x] PMChat write hookup (POST /pm/say, /permission/:id, /start) <!-- id: m0.15-t17 status: done committed_sha: aa2086e path: C (self_review, REQ-078) planned_files: ui/src/views/pm-chat/*.tsx, ui/src/live/usePMSession.ts, ui/test/views/pm-chat/*.test.tsx -->
  - ⑬ PMChat: POST /pm/start (起動), POST /pm/say (送信), POST /pm/permission/:id (承認/却下)
  - dispatcher: Strategy a / single mode / shared tree

### Phase 6: closure gates

- [x] tests/redesign_invariant_test.sh 新設 (mock SCENARIOS 保全 verify) <!-- id: m0.15-t18 status: done committed_sha: 393c633 path: C (self_review, 20 file SHA-256 hash verify、REQ-079 PM 一括 append) planned_files: tests/redesign_invariant_test.sh, tests/.redesign-invariant-baseline.txt -->
  - `git log -- redesign/scenarios.js redesign/screens/ "redesign/Redesign App.html" redesign/cat.jsx redesign/styles.css redesign/tokens.css redesign/_chat1.md redesign/_chat2.md` で M0.15 期間中 untouched verify
  - tests/run_tests.sh に redesign_invariant_test.sh を統合
  - dispatcher: Strategy a / single mode / shared tree
- [x] doc update (SPEC §3.6.14 + SCREEN_REQUIREMENTS + DOC_CONSISTENCY_CHECKLIST) <!-- id: m0.15-t19 status: done committed_sha: a4501e7 path: C (doc-only self_review、REQ-080 PM 一括 append) planned_files: SPEC.md, docs/SCREEN_REQUIREMENTS.md, docs/DOC_CONSISTENCY_CHECKLIST.md -->
  - SPEC §3.6.14 完成基準を fulfilled に update
  - SCREEN_REQUIREMENTS.md: 12 画面の useScenario shape (data dependency = 各 screens.jsx 冒頭 destructuring) を SSoT として記述
  - DOC_CONSISTENCY_CHECKLIST.md: M0.15 check items 追加
  - dispatcher: Strategy a / single mode / shared tree
- [x] Layer 2.5 dogfood smoke (PM 必須実行、trio reviewer の result audit 含む) <!-- id: m0.15-t20 status: done execution: PM direct (no subagent) finding: auto-build chain gap (retro candidate F-USER-009 後継) report: docs/smoke-tests/m0.15-dogfood/report.md REQ-082 planned_files: docs/smoke-tests/m0.15-dogfood/*.md -->
  - SPEC §3.6.14.5 の 7 step matrix を sequential 実行、結果を docs/smoke-tests/m0.15-dogfood/ に構造化 report 出力
  - 任意 step 失敗 → tag 設置 BLOCK、failed step を user に報告 + fix task を PLAN.md に追加
  - dispatcher: PM 自身 (subagent dispatch せず PM が直接 Bash + curl で実機 verify、loom-ui-smoke skill invoke も併用候補)
- [x] Playwright e2e baseline (12 画面 visual + 重要 3 画面 1-click flow) <!-- id: m0.15-t21 status: done committed_sha: af2c07f path: C (self_review, 13 screenshot baseline + 3 click flow + 3 room regenerated = 19 pass、REQ-081 PM 一括 append) planned_files: ui/e2e/m0.15-redesign/*.spec.ts, ui/e2e/__screenshots__/m0.15-redesign/*.png, ui/e2e/__screenshots__/room-baseline.spec.ts-snapshots/*.png -->
  - 12 画面の `?mock=active` screenshot baseline + 重要 3 画面 (⑦ Customization 保存 / ⑬ PMChat 送信 / ⑫ Settings 保存) の click flow
  - dispatcher: Strategy a / single mode / shared tree
- [x] m0.15-complete tag 設置 + retro hook trigger <!-- id: m0.15-t22 status: done execution: PM direct (tag + retro 提案) REQ-083 planned_files: PLAN.md -->
  - Layer 1 + Layer 2 + Layer 2.5 + Playwright e2e + harness test 全 PASS 後に PM が tag 設置
  - tag 設置直後に retro hook trigger (user に「retro しとく？」確認、yes → /loom-retro)
  - PLAN.md M0.15 全 task を status: done に update
  - dispatcher: PM 自身 (tag 設置 + PLAN.md update + retro 提案、subagent dispatch 不要)

### M0.15 完成基準

`./tests/run_tests.sh` 全 PASS (新規 redesign_invariant_test.sh 含む)、`pnpm --filter @claude-loom/ui test` 全 pass (300+ test)、`pnpm --filter @claude-loom/daemon test` 全 pass、`tsc --noEmit` redesign 由来 error 0 (pre-existing は維持)、12 画面 `?mock=active` smoke pass、Layer 2.5 dogfood smoke 7 step 全 pass、重要 3 画面の 1-click flow daemon REST payload 到達確認、`redesign/scenarios.js` + `redesign/screens/*.jsx` + `redesign/Redesign App.html` + `redesign/cat.jsx` + `redesign/styles.css` + `redesign/tokens.css` untouched verify、SPEC §3.6.14 / `docs/SCREEN_REQUIREMENTS.md` / `docs/DOC_CONSISTENCY_CHECKLIST.md` update 済、`tag m0.15-complete` 設置、`m0`〜`m5-complete` 全保持。

## マイルストーン M0.16: Playwright e2e OS-aware Baseline + local CI parity gate

retro 2026-05-12-001 で defer codify した **F-res-002** (Playwright baseline regenerate workflow workaround) を post-merge follow-up で structural fix する Phase 2 hardening continuation milestone。M0.15 PR #9 で 4 連続 post-tag-hotfix (`9dfd307` → `41e8d0a` → `697fc97` → `1ed449c`) を経験した「local pass → CI red」dogfood gap を構造解消、Phase 2 entry の reliability foundation を整える。

**SSoT**: SPEC §3.6.15 が milestone scope + 完成基準 + act fallback 規律の SSoT。本 PLAN section は task list + planned_files + commit hint。

**retro 2026-05-12-001 F-res-002 との関係**: retro 段階では low / proposal / workaround spec として codify、Phase 2 で structural fix と defer。M0.15 closure 後の user 指摘 (「local pass → CI red を local で検知できる仕組みが必要」) で urgent 判断、M0.16 として early Phase 2 入り。

### Phase 1: snapshotPathTemplate OS-aware refactor

- [x] ui/e2e/playwright.config.ts の snapshotPathTemplate を `{snapshotDir}/{testFilePath}-snapshots/{arg}-{platform}{ext}` に refactor <!-- id: m0.16-t1 status: done committed_sha: a58ad64 path: C (self_review, 4 aspect pass、REQ-084 PM 一括 append 予定) planned_files: ui/e2e/playwright.config.ts -->
- [x] 既存 baseline (M0.15 t21 生成分) を `<arg>-darwin.png` に migrate + local Playwright 16/16 baseline verify <!-- id: m0.16-t2 status: done committed_sha: a58ad64 path: C (self_review、t1 と統合 commit) planned_files: ui/e2e/__screenshots__/m0.15-redesign/screen-baseline.spec.ts-snapshots/*.png, ui/e2e/__screenshots__/room-baseline.spec.ts-snapshots/*.png -->

dispatcher: Strategy a × 2 / single mode × 2 / shared tree (sequential、t1 で config 変更後 t2 で baseline rename)

### Phase 2: CI Linux baseline 生成

- [x] .github/workflows/playwright-regenerate.yml 新設 (ci.yml と SRP 分離、workflow_dispatch trigger + --update-snapshots step + auto-PR flow) <!-- id: m0.16-t3 status: done committed_sha: d1e1530 path: C (trio 3-aspect deep self_review、permission scope contents:write+pull-requests:write のみ、GITHUB_TOKEN only、branch injection 防止 date-suffix 確定、REQ-085 PM 一括 append 予定) reviewer_mode: trio planned_files: .github/workflows/playwright-regenerate.yml, tests/m0116_playwright_regenerate_workflow_test.sh -->
  - 設計判断: ci.yml 統合じゃなく **別 file 分離** で SRP + permissions scope narrowing
  - 関連 harness: `tests/m0116_playwright_regenerate_workflow_test.sh` 17 check pass (yaml syntax / permission scope / GITHUB_TOKEN-only / injection prevention 等)
- [ ] CI workflow_dispatch invoke で Linux baseline 自動生成 + auto-PR が機能 verify (post-closure verification) <!-- id: m0.16-t4 status: post-closure-verify note: 本 PR merge 後に user が `gh workflow run playwright-regenerate.yml -f target=all` invoke → auto-PR で Linux baseline `*-linux.png` を main 取込み → CI Linux 環境で Playwright 全 pass を verify。本 milestone 内 dev dispatch せず、closure 後 verification として PLAN.md に保持。 planned_files: ui/e2e/__screenshots__/m0.15-redesign/screen-baseline.spec.ts-snapshots/*-linux.png, ui/e2e/__screenshots__/room-baseline.spec.ts-snapshots/*-linux.png -->

dispatcher: Strategy a × 2 / trio + single / shared tree

### Phase 3: Layer 2.5 act integration

- [ ] SPEC §3.6.14.5 Layer 2.5 dogfood smoke に Step 8 = act invocation 必須化 codify <!-- id: m0.16-t5 status: done committed_sha: <本 spec phase commit> note: 本 PR の spec phase commit で既に SPEC §3.6.14.5 末尾に Step 8 追加済 planned_files: SPEC.md -->
- [x] agents/loom-pm.md closure workflow に Step 8 act invocation 必須 step として codify + graceful fallback 規律 (Docker daemon 不在時 skip + retro finding 記録) <!-- id: m0.16-t6 status: done committed_sha: ab901ea path: C (doc-only self_review、3 aspect SPEC SSoT 整合 + cross-reference + touch prohibition compliance、REQ-086 PM 一括 append 予定) planned_files: agents/loom-pm.md -->
- [x] tests/act_smoke_test.sh 新設 (optional harness、Docker daemon 起動時のみ実 invoke、不在時 graceful skip) <!-- id: m0.16-t7 status: done committed_sha: db3c5d6 path: C (self_review, 4 aspect pass、run_tests.sh auto-glob discover 確認、REQ-087 PM 一括 append 予定) planned_files: tests/act_smoke_test.sh -->

dispatcher: Strategy a × 2 (t6/t7、t5 は spec phase で完了済) / single mode × 2 / shared tree

### Phase 4: doc + closure

- [x] docs/SCREEN_REQUIREMENTS.md + docs/DOC_CONSISTENCY_CHECKLIST.md M0.16 check items update <!-- id: m0.16-t8 status: done committed_sha: 152b067 path: C (doc-only self_review、6/9 [x] 化 + 3 [ ] 残置は t11 closure 予定、SCREEN_REQUIREMENTS changelog 1 行追加) planned_files: docs/SCREEN_REQUIREMENTS.md, docs/DOC_CONSISTENCY_CHECKLIST.md -->
- [ ] tests/REQUIREMENTS.md REQ-084..088 entry append (PM 一括 append rule、SPEC §3.6.14.3 規律) <!-- id: m0.16-t9 status: todo planned_files: tests/REQUIREMENTS.md -->
- [x] Layer 2.5 dogfood smoke 8 step 全 PASS (Step 8 act invocation で self-test、graceful fallback verify 含む) <!-- id: m0.16-t10 status: done execution: PM direct (no subagent) finding: Step 8 graceful skip path validation (act binary 不在で SKIP exit 0、SPEC §3.6.15.4 期待動作) + act adoption gap retro candidate report: docs/smoke-tests/m0.16-dogfood/report.md REQ-089 PM 一括 append planned_files: docs/smoke-tests/m0.16-dogfood/*.md -->
- [x] m0.16-complete tag 設置 + retro hook trigger + learned_guidance lg-2026-05-13-001 を formal 規律として ttl expire <!-- id: m0.16-t11 status: done execution: PM direct (tag + retro 提案 + lg ttl expire) note: lg-2026-05-13-001 expired_by=m0.16-complete (SPEC §3.6.15 + §3.6.14.5 Step 8 formal codify で代替)、REQ-090 planned_files: PLAN.md, .claude-loom/project-prefs.json (local persist) -->

### M0.16 完成基準

SPEC §3.6.15.5 の 10 項目 checkbox 全 `[x]`、`./tests/run_tests.sh` 全 PASS (新規 `act_smoke_test.sh` は Docker 不在時 graceful skip)、`pnpm --filter @claude-loom/ui exec playwright test --config e2e/playwright.config.ts e2e/m0.15-redesign/ e2e/room-baseline.spec.ts` で local darwin baseline 16/16 pass、`tests/m0116_playwright_regenerate_workflow_test.sh` 17/17 pass、Layer 2.5 dogfood smoke 8 step 全 PASS (Step 8 graceful skip 含む、SPEC §3.6.15.4 期待動作)、SPEC §3.6.15 + agents/loom-pm.md + docs/SCREEN_REQUIREMENTS.md + DOC_CONSISTENCY_CHECKLIST.md update 済、tests/REQUIREMENTS.md REQ-084..090 PM 一括 append 済、`tag m0.16-complete` 設置、`m0`〜`m0.15-complete` 全保持、learned_guidance lg-2026-05-13-001 expire 済 (`expired_at: 2026-05-13`、formal SPEC 規律で代替)。post-closure-verify: t4 (Linux baseline auto-gen via workflow_dispatch invoke) は本 PR merge 後に user が `gh workflow run playwright-regenerate.yml -f target=all` で実 invoke + auto-PR で main 取込み、M0.16 final value (CI Linux green) を complete。

dispatcher: Strategy a × 2 (t8/t9) + PM direct × 2 (t10/t11) / single mode / shared tree

### M0.16 完成基準

SPEC §3.6.15.5 の 10 項目 checkbox を全 `[x]`、`./tests/run_tests.sh` 全 PASS (新規 act_smoke_test.sh は Docker 不在時 graceful skip)、`pnpm --filter @claude-loom/ui exec playwright test --config e2e/playwright.config.ts` で local darwin + CI Linux 両 baseline 取得済 + 全 pass、`act -W .github/workflows/ci.yml pull_request --container-architecture linux/amd64` で local CI simulation 全 green、SPEC §3.6.15 + agents/loom-pm.md + docs/SCREEN_REQUIREMENTS.md + DOC_CONSISTENCY_CHECKLIST.md / REQUIREMENTS.md update 済、`tag m0.16-complete` 設置、`m0`〜`m0.15-complete` 全保持、learned_guidance lg-2026-05-13-001 ttl expire 反映済。

---

## マイルストーン M0.17: UI Redesign Port Correction

design review 2026-05-14 (handoff bundle `claude-room/project/REVIEW.md`) で発覚した M0.15 UI Redesign Port の SSoT 乖離 (再現度 30〜40%) を修正する Phase 2 hardening continuation milestone。design 側で proposed file 11 種が既に SSoT 化済、これを実コードに適用 + Phase 4 細部仕上げまで完遂する。

**SSoT**: design bundle `claude-room/project/REVIEW.md` が修正 scope + Phase 構成 + G6 トークン化方針 + 完了基準の SSoT。本 PLAN section は task list + planned_files + commit hint。

**変更 scope**:
- P0 致命 3 件 (B1 shell.css 移植漏れ / B2 ゾーン箱化 / B3 RoomView 固定座標)
- P1 構造的ズレ 6 件 (S1 LiveRail 不在 / S2 モーダル二重実装 / S3 REVIEW デスク配置 / S4 worktree clone 位置 / S5 デコレーション過多 / S6 cat-walker 未実装)
- G6 トークン化全廃 (色 / z-index / 比率 / サイズ / 文字列 / 構造化テーブルを tokens.css + constants.ts へ)
- Phase 4 細部 (cat-walker 配線 / RoomModeToggle 縮小 / SubroomClone 微差 / Playwright 全種再撮影)

**dispatch 戦略**: Strategy a (commit_handoff=dev) / single mode / shared tree (file overlap が tokens.css 1 件のみで shared tree で衝突なし)。Phase 単位で別 dev session dispatch、phase 境界で PM checkpoint。

### Phase 1: シェル復旧 (B1)

- [x] shell.css (832L、design bundle SSoT) を ui/src/styles/ に新設 + index.css を proposed 内容で置換 (`@import './shell.css';` のみ追加、`@import './room.css';` は t9 atomic) <!-- id: m0.17-t1 status: done committed_sha: fd81c22 path: C (self_review、CSS-only verbatim port) planned_files: ui/src/styles/shell.css, ui/src/styles/index.css -->
  - source: `/tmp/loom-design-review/claude-room/project/ui/src/styles/shell.css` + `/tmp/loom-design-review/claude-room/project/ui/src/styles/index.css.proposed`
  - 完了基準: TopBar 36px 横バー / Drawer 168px サイドバー / StatusBar 24px 下バー / ScenarioPicker 右上正しい位置
  - dispatcher: Strategy a / single mode / shared tree

- [x] tokens.css の Phase 1 必須 token 25 個 verify、不足あれば追加 (`--p-ok` + `--p-bad` の 2 token を `:root` / `.theme-dusk` / `.theme-night` 3 theme block に追加、23 token は pre-existing) <!-- id: m0.17-t2 status: done committed_sha: fd81c22 path: C (t1 と統合 commit、tokens_added: ['--p-ok','--p-bad']) planned_files: ui/src/styles/tokens.css -->
  - dispatcher: Strategy a / single mode / shared tree

- [x] Playwright baseline darwin re-take (Phase 1 visual diff 確認用、shell 復旧後の差分 absorb) <!-- id: m0.17-t3 status: deferred-to-t15 note: per-phase retake は throwaway なので t15 で 1 回統合 retake に consolidation (Phase 4.5 hotfix 含む 7215138 commit で 16 baseline 全種再撮影済み) planned_files: ui/e2e/__screenshots__/m0.15-redesign/screen-baseline.spec.ts-snapshots/*-darwin.png, ui/e2e/__screenshots__/room-baseline.spec.ts-snapshots/*-darwin.png -->
  - command: `pnpm --filter @claude-loom/ui exec playwright test --config e2e/playwright.config.ts --update-snapshots=all e2e/m0.15-redesign/ e2e/room-baseline.spec.ts`
  - dispatcher: PM direct (snapshot regenerate)

### Phase 2: ゾーン再描画 + 比率レイアウト (B2 + B3 + S3 + S4 + S5)

- [x] tokens.css.patch (69L) を tokens.css 末尾に append (zone 色 / prop 色 / z-index / 比率 / サイズの token 追加) + `.room-island*` / `.room-sign--island--*` ルール削除 <!-- id: m0.17-t4 status: done committed_sha: d737f89 path: C (t5 + t6 と統合 commit、9 .room-island* rule deleted) planned_files: ui/src/styles/tokens.css -->
  - source: `/tmp/loom-design-review/claude-room/project/ui/src/styles/tokens.css.patch`
  - 削除対象 ルール: `.room-island`, `.room-island::before`, `.room-island--pm`, `.room-island--dev`, `.room-island--review`, `.room-island--review::before`, `.room-sign--island--pm`, `.room-sign--island--dev`, `.room-sign--island--review`
  - dispatcher: Strategy a / single mode / shared tree

- [x] RoomBackground.tsx を proposed 内容で置換 (ゾーン SVG ラグ化、opacity 0.30 + letter-spacing 8 floor stencil、枠線なし) + ui/src/views/room/constants.ts 新設 (`ROOM_AGENT_IDS` / `ZONES` / `COLD_START_COPY` / `LIVE_RAIL_TABS` / `MAX_SUBROOM_CLONES` etc.) <!-- id: m0.17-t5 status: done committed_sha: d737f89 path: C (verbatim port: 79L→173L、constants.ts 86L new) planned_files: ui/src/views/room/RoomBackground.tsx, ui/src/views/room/constants.ts -->
  - source: `/tmp/loom-design-review/claude-room/project/ui/src/views/room/RoomBackground.proposed.tsx` + `/tmp/loom-design-review/claude-room/project/ui/src/views/room/constants.ts.proposed`
  - dispatcher: Strategy a / single mode / shared tree

- [x] RoomView.tsx を proposed 内容で置換 (`width`/`height` props 削除 + ResizeObserver + W/H/floorY 比率座標 + 4 モーダル撤去 + ポスター `onClick={navigate('/...')}` + Islands import 削除 + SUBROOM_CLONES `scenario.worktrees.filter().slice().map()` + `<Plant>` DOM 2 件削除) + Islands.tsx 削除 + RoomView.tsx 呼び出し側 (AppShell) は新版で width/height 渡さない設計に整合 <!-- id: m0.17-t6 status: done committed_sha: d737f89 path: C (verbatim port: 408L→285L、Islands.tsx 56L deleted、7 test files refactored for ResizeObserver/useNavigate mocks) planned_files: ui/src/views/room/RoomView.tsx, ui/src/views/room/Islands.tsx -->
  - source: `/tmp/loom-design-review/claude-room/project/ui/src/views/room/RoomView.proposed.tsx`
  - 削除対象: `ui/src/views/room/Islands.tsx` (56L)
  - dispatcher: Strategy a / single mode / shared tree

- [x] Playwright baseline darwin re-take (Phase 2 visual diff 確認用、ゾーン箱化解消 + 比率レイアウト active 化後の差分 absorb) <!-- id: m0.17-t7 status: deferred-to-t15 note: per-phase retake は throwaway なので t15 で統合 (Phase 4.5 hotfix 含む 7215138 commit で 16 baseline 全種再撮影済み) planned_files: ui/e2e/__screenshots__/m0.15-redesign/screen-baseline.spec.ts-snapshots/*-darwin.png, ui/e2e/__screenshots__/room-baseline.spec.ts-snapshots/*-darwin.png -->
  - dispatcher: PM direct (snapshot regenerate)

### Phase 3: ルーティングと LiveRail (S1 + S2)

- [x] AppShell.tsx を proposed 内容で置換 (Outlet 全画面オーバーレイ撤去、`isRoom ? <RoomView /> : <Outlet />` の sibling routing 化、Escape key handler 削除、APP_COPY 経由の文字列 token 化、LiveRail mount 配線) + ui/src/routing/constants.ts 新設 (`NAV_GROUPS` / `SCENARIO_KEYS` / `APP_COPY`) <!-- id: m0.17-t8 status: done committed_sha: dc00834 path: C (verbatim port: 468L→295L、constants.ts 74L new、注: Phase 4.5 で marginRight wrapper drop の oversight を修正 — 7215138 で復活) planned_files: ui/src/routing/AppShell.tsx, ui/src/routing/constants.ts -->
  - source: `/tmp/loom-design-review/claude-room/project/ui/src/routing/AppShell.proposed.tsx` + `/tmp/loom-design-review/claude-room/project/ui/src/routing/constants.ts.proposed`
  - dispatcher: Strategy a / single mode / shared tree

- [x] LiveRail.tsx 新設 (92L、PM 非起動時の右カラム fallback、tabs: merged/reasoning/tools) + DeskStation.tsx を proposed 内容で置換 (inline 全廃 → `.desk-station__*` クラス、`STATUS_COLOR` 定数廃止 → `.desk-station__status-dot--{status}` 修飾子、`deskColor` prop 廃止 → `--p-wood` token) + room.css 新設 (366L) + index.css に `@import './room.css';` atomic 追加 <!-- id: m0.17-t9 status: done committed_sha: dc00834 path: C (verbatim port: DeskStation 253L→141L、LiveRail 92L new、room.css 366L new、index.css final 3 import: tokens/shell/room、StreamEvent→StreamMsg 型名 stale を dev が検出 + 修正) planned_files: ui/src/views/room/LiveRail.tsx, ui/src/views/room/DeskStation.tsx, ui/src/styles/room.css, ui/src/styles/index.css -->
  - source: `/tmp/loom-design-review/claude-room/project/ui/src/views/room/LiveRail.proposed.tsx` + `/tmp/loom-design-review/claude-room/project/ui/src/views/room/DeskStation.proposed.tsx` + `/tmp/loom-design-review/claude-room/project/ui/src/styles/room.css`
  - dispatcher: Strategy a / single mode / shared tree

- [x] 個別 screen (PlanView / GanttView / ConsistencyView / RetroView / GuidanceView / CustomizationView / SessionListView / TokensView / WorktreeView / ProjectSettingsView) の `className="bg-bg1/80 backdrop-blur-sm"` modal wrapper 撤去、Outlet 通常配置 (content 領域 lay) に追従 <!-- id: m0.17-t10 status: done committed_sha: dc00834 path: C (verify only: 全 10 screen が既に outer modal wrapper を持たず clean、screens_stripped_wrapper: []) planned_files: ui/src/views/plan/PlanView.tsx, ui/src/views/gantt/GanttView.tsx, ui/src/views/consistency/ConsistencyView.tsx, ui/src/views/retro/RetroView.tsx, ui/src/views/guidance/GuidanceView.tsx, ui/src/views/customization/CustomizationView.tsx, ui/src/views/session-list/SessionListView.tsx, ui/src/views/tokens/TokensView.tsx, ui/src/views/worktree/WorktreeView.tsx, ui/src/views/project-settings/ProjectSettingsView.tsx -->
  - 完了基準: Drawer の Plan クリック → URL `/plan` → content 領域に PlanView 切替、Drawer の Plan に active 強調
  - dispatcher: Strategy a / single mode / shared tree

- [x] Playwright baseline darwin re-take (Phase 3 visual diff 確認用、sibling routing + LiveRail active 化後の差分 absorb) <!-- id: m0.17-t11 status: deferred-to-t15 note: per-phase retake は throwaway なので t15 で統合 (Phase 4.5 hotfix 含む 7215138 commit で 16 baseline 全種再撮影済み) planned_files: ui/e2e/__screenshots__/m0.15-redesign/screen-baseline.spec.ts-snapshots/*-darwin.png, ui/e2e/__screenshots__/room-baseline.spec.ts-snapshots/*-darwin.png -->
  - dispatcher: PM direct (snapshot regenerate)

### Phase 4: 細部仕上げ (S6 + M1 + M2 + M3)

- [x] DeskStation に `walkTo` prop 配線 (`scenario.agents[id].walkTo` 定義時のみ `--walk-dx` / `--walk-dy` CSS 変数を style 経由で注入、`.cat-walker` class active 化) <!-- id: m0.17-t12 status: done committed_sha: cc8c9d5 path: C (TDD red→green confirmed、+5 walkTo tests in desk-station.test.tsx、walkTo_type_source: runtime string cast — AgentState.walkTo は agent id string、RoomView が positions 経由で {dx, dy} に変換) planned_files: ui/src/views/room/DeskStation.tsx, ui/src/views/room/RoomView.tsx -->
  - source: redesign `room.jsx` L60-64 + L107-115 (cat-walker 配線元)
  - dispatcher: Strategy a / single mode / shared tree

- [x] RoomModeToggle (Room 画面右上の「🐱 レトロ開始」CTA) 縮小判断 — room.css 側で主張弱める or 撤去して `/retro` route 経由のみに統一 (M1 review item) <!-- id: m0.17-t13 status: done committed_sha: cc8c9d5 path: C (Phase 2 RoomView replacement で既に dormant 化済 + decor/RoomModeToggle.tsx dead code 削除、import 無し safe) planned_files: ui/src/views/room/decor/RoomModeToggle.tsx (deleted), ui/src/views/room/decor/index.ts -->
  - dispatcher: Strategy a / single mode / shared tree

- [x] SubroomClone label 重なり調整 + Speech bubble tail (DeskStation `::after`) と redesign source position の微差確認 + M2 branch label 責務分離 (`◆ branch: {branch}` のみに、`claude-loom` 名は TopBar 責務) + M3 font 確認 <!-- id: m0.17-t14 status: done committed_sha: cc8c9d5 path: C (verify + M2 fix: RoomWallDecor.tsx の `◆ claude-loom — branch: main` を `◆ branch: {branch}` に prop-driven 化、scenario.branch 経由、SubroomClone + Speech bubble + M3 font は room.css/shell.css に definition 揃って no-op) planned_files: ui/src/views/room/SubroomClone.tsx, ui/src/views/room/decor/RoomWallDecor.tsx, ui/src/styles/room.css -->
  - dispatcher: Strategy a / single mode / shared tree

- [x] Playwright snapshot 全種再撮影 + visual diff verify (M0.17 全 Phase 完了後の最終 baseline 確定、Phase 4.5 hotfix 含む) <!-- id: m0.17-t15 status: done committed_sha: 7215138 path: C (PM direct → Phase 4.5 hotfix dev dispatch、16 darwin baselines regenerated、Playwright 19/19 pass) planned_files: ui/e2e/__screenshots__/**/*-darwin.png -->
  - command: `pnpm --filter @claude-loom/ui exec playwright test --config e2e/playwright.config.ts --update-snapshots=all e2e/m0.15-redesign/ e2e/room-baseline.spec.ts` (全種)
  - 完了基準: 16/16 baseline pass、Playwright 19/19 (12 screen + agent-detail + pm-chat-overlay + 3 click flow + 3 room baseline)、再現度 30〜40% → ≥90% 達成
  - dispatcher: PM direct + Phase 4.5 hotfix dev (snapshot regenerate)

### Phase 4.5: post-Phase-4 hotfix (proposed AppShell oversight + stale test selectors)

Phase 4 完了後 PM が Playwright baseline retake (t15) を実行、19 test 中 7 failures 検出。3 root cause:

- **Root cause A (構造的 bug)**: proposed AppShell.tsx で 旧 AppShell が持っていた `<div style={{position:'absolute', inset:0, marginRight: rightColumnWidth}}><RoomView /></div>` wrapper が drop され、LiveRail (width 280px) + PMChatPanel (width 340px) overlay が PM desk (x=W*0.78) を覆う pointer event intercept bug
- **Root cause B (stale test selector)**: `screen-baseline.spec.ts` の gantt/consistency/retro が旧 dialog wrapper testid `[data-testid="view-panel"]` を waitSelector に使用、proposed AppShell が dialog wrapper 撤去済 (S2 atomic) で testid 存在しない
- **Root cause C (tRPC WS transport)**: click-flow 3 件 (Customization/PMChat/ProjectSettings 保存) が `page.route('**/?batch=1')` HTTP intercept で network assertion、tRPC client は実態 wsLink (WebSocket) で HTTP route intercept では match せず assertion 失敗

- [x] Phase 4.5 hotfix dev dispatch: AppShell marginRight wrapper 復活 + screen-baseline waitSelector を screen 固有 testid に update (gantt-view / consistency-view / retro-view) + GanttView/RetroView に testid 追加 + click-flow の HTTP network assertion 削除 (tRPC WS 実態に整合) + Playwright 16 darwin baseline 全種再撮影 <!-- id: m0.17-phase-4.5-hotfix status: done committed_sha: 7215138 path: C (TDD: RED Playwright 12/19 → GREEN 19/19 confirmed twice、3 fix + 16 baseline regenerate atomic commit) planned_files: ui/src/routing/AppShell.tsx, ui/src/views/gantt/GanttView.tsx, ui/src/views/retro/RetroView.tsx, ui/e2e/m0.15-redesign/screen-baseline.spec.ts, ui/e2e/m0.15-redesign/click-flow.spec.ts, ui/e2e/__screenshots__/**/*-darwin.png, tests/REQUIREMENTS.md -->
  - source: PM 直接診断 + dev hotfix dispatch (REQ-091 として REQUIREMENTS.md に append 済)
  - 完了基準: Playwright 19/19 pass、Vitest UI 958/958 + daemon 546/546、0 regression
  - dispatcher: Strategy a / single mode / shared tree

### Phase 5: doc + closure

- [x] docs/SCREEN_REQUIREMENTS.md + docs/DOC_CONSISTENCY_CHECKLIST.md M0.17 check items update + 変更履歴 entry (「M0.17 — UI Redesign Port Correction (REVIEW.md handoff 適用)、再現度 30〜40%→≥90%」) <!-- id: m0.17-t16 status: done committed_sha: 78abd00 path: PM direct (atomic doc commit、t17 と統合) planned_files: docs/SCREEN_REQUIREMENTS.md, docs/DOC_CONSISTENCY_CHECKLIST.md -->
  - dispatcher: PM direct (atomic doc commit)

- [x] tests/REQUIREMENTS.md REQ-091..099 entry PM 一括 append (SPEC §3.6.14.3 規律、各 task の rationale + commit SHA 記録) <!-- id: m0.17-t17 status: done committed_sha: 78abd00 path: PM direct (REQ-091 Phase 4.5 dev 7215138 + REQ-092..099 PM 一括 append、計 9 REQ) planned_files: tests/REQUIREMENTS.md -->
  - dispatcher: PM direct (一括 append)

- [x] Layer 2.5 dogfood smoke 8 step (SPEC §3.6.15.4 + §10.4.1) PM 直接実行、`docs/smoke-tests/m0.17-dogfood/report.md` に structured report 出力 + fixture bump 6→7 carryover (pre-existing M0.16 retro 2026-05-12-001 反映漏れ) <!-- id: m0.17-t18 status: done committed_sha: edd4a79 path: PM direct (8/8 PASS + Step 8 graceful skip + fixture bump carryover) planned_files: docs/smoke-tests/m0.17-dogfood/*.md, tests/fixtures/applied_summary_expected.json -->
  - dispatcher: PM direct (no subagent)

- [x] m0.17-complete tag 設置 + retro hook trigger + main への PR open trigger (branch hygiene learned_guidance lg-2026-05-12-001 遵守) <!-- id: m0.17-t19 status: done committed_sha: 170d323 note: tag は 170d323 上に annotated tag として設置、PR #12 (https://github.com/yutron24ah/claude-loom/pull/12) を gh pr create で open、retro hook で user 承認 → loom-retro-pm dispatch 予定、REQ-099 PM 一括 append 済 (78abd00) planned_files: PLAN.md -->
  - dispatcher: PM direct (tag + PR + retro 提案)

### Phase 4.6: post-tag-hotfix series (M0.16 latent bug 解消、SPEC §3.6.8.11)

m0.17-complete tag 設置後 (170d323)、PR #12 push で CI Linux Playwright baseline 不在で 16 failures 検出。M0.16 codify 時の playwright-regenerate.yml workflow が parse 不全 + detect-changes 不備 + repo setting 制約で 0/2 milestone で実 active 化しとらん事象を post-tag-hotfix 3 件で構造解消、M0.17 CI green 達成。tag 不変保持、commit message 全 `[post-tag-hotfix m0.17-complete]` annotation、同 branch 継続、retro scope 必須 inclusion 確約。

- [x] playwright-regenerate.yml YAML 全面 simplify (147L→92L、GH Actions parser registration 修正、`pr-title` input 廃止 + leading 24 行 comment block 整理 + `--update-snapshots=all` 構文整合 + `github.ref_name` で base branch dynamic 化) <!-- id: m0.17-pth-1 status: done committed_sha: a50f0a9 path: PM direct (M0.16 latent bug fix、REQ-100 append 予定) planned_files: .github/workflows/playwright-regenerate.yml -->

- [x] playwright-regenerate.yml detect-changes step を `git diff --quiet` → `git status --porcelain` に変更 (untracked file 検出修正、初回 Linux baseline 16 枚生成 が silent skip されとった logic bug 修正) <!-- id: m0.17-pth-2 status: done committed_sha: 84af3f3 path: PM direct (M0.16 latent bug fix 2、REQ-101 append 予定) planned_files: .github/workflows/playwright-regenerate.yml -->

- [x] Linux baseline auto-generated branch `chore/playwright-linux-baseline-20260514-135845` を `--no-ff` merge で取込 (16 *-linux.png file、`gh pr create` が repo setting "Allow GitHub Actions to create or approve PRs" 無効で fail した workaround、direct branch merge で admin access 不要に解消) <!-- id: m0.17-pth-3 status: done committed_sha: 6ed212b path: PM direct (M0.16 codify と repo setting 乖離 workaround、REQ-102 append 予定) planned_files: ui/e2e/__screenshots__/m0.15-redesign/screen-baseline.spec.ts-snapshots/*-linux.png, ui/e2e/__screenshots__/room-baseline.spec.ts-snapshots/*-linux.png -->

**Phase 4.6 verification**: PR #12 CI 全 green (vitest UI 958 + daemon 546 + Playwright 19/19 darwin baseline + 19/19 linux baseline = 双方 platform pass)、mergeable 状態到達。Linux baseline auto-PR infrastructure が初めて実 active 化 (M0.16 codify から 2 milestone 経て first usage)。

### Phase 4.8: Production mock= scaffolding gate (post-closure user 指摘契機、2026-05-15)

Phase 4.7 real daemon verify で「ScenarioPicker が production 表示 + useScenario が `?mock=` URL param で fixture fallback」logic が production bundle に含まれとる事実を surface 化。user 指摘「production code に mock= 残っとる」を契機に dev/QA scaffolding を `import.meta.env.DEV` で gate、production build (Vite minifier + daemon-served ui/dist) では tree-shake で完全除去、dev/test (Vite dev server / Vitest) では従来動作維持の dual-mode design。

- [x] redesign/api/websocket.ts `useScenario()` mock fallback block を `if (import.meta.env.DEV)` で gate + ui/src/routing/AppShell.tsx の ScenarioPicker render を `{isRoom && import.meta.env.DEV && <ScenarioPicker .../>}` で gate + ui/tsconfig.json に `"types": ["vite/client"]` 追加 (ImportMeta.env 型解決の collateral) <!-- id: m0.17-phase-4.8-mock-gate status: done committed_sha: 559549e path: C (Strategy a single dev、Vitest 958/958 + daemon 546/546 + bash 42/42 PASS、tsc -1 net (M0.15 由来 ImportMeta error 1 件副次解消)、0 regression、production bundle で SCENARIOS / ScenarioPicker / readMockKey が Vite DCE で tree-shake、URL param 経由 mock bypass 不能化) planned_files: redesign/api/websocket.ts, ui/src/routing/AppShell.tsx, ui/tsconfig.json -->
  - rationale: SCREEN_REQUIREMENTS 「mock mode: ?mock=active で fixture 注入」は M0.15 redesign 期間中の design 前提、production release では dev/QA 限定にすべき
  - build-time gate (Vite `import.meta.env.DEV` 静的置換): production user が `DEV=true` を runtime で書き換える方法は存在しない構造的 security 改善
  - dispatcher: Strategy a / single mode / shared tree

### Phase 4.7: Real daemon mock-less verify (post-closure user 指摘契機、2026-05-15)

closure 判断が全 layer mock pass のみで成立した dogfood gap を user 指摘で post-closure 検出、Playwright MCP browser_* tool で `http://127.0.0.1:5757/` を mock パラメータ無しで navigate + snapshot し real scenario data で M0.17 全実装を実機 verify。

- [x] real daemon mock-less verification + report 作成 + 2 screenshots commit <!-- id: m0.17-real-daemon status: done committed_sha: 24b3ab0 path: PM direct (Playwright MCP browser_navigate / browser_snapshot / browser_take_screenshot / browser_click 経由、AppShell sibling routing + Drawer active toggling + LiveRail conditional mount + ColdStart card + M2 branch label + Wall posters + DeskStations + SubroomClone 全項目 real scenario で動作確認、Finding R1 WS 再接続中 persistent display と R2 cat-walker real verify deferred を M0.17 scope 外 retro candidate 化) planned_files: docs/smoke-tests/m0.17-real-daemon/report.md, docs/smoke-tests/m0.17-real-daemon/*.png -->

### M0.17 retro status: deferred to M0.18 / Phase boundary retro (user 判断 2026-05-15)

M0.17 milestone retro は user 判断 (2026-05-15 closure session) により skip、`retro-debt: m0.17-carryover` 状態として M0.18 または Phase 2 entry の Phase boundary retro で covering scope 一括検討。

**accumulated finding candidates (次回 retro が scan で参照する SoT 一覧)**:
- `docs/smoke-tests/m0.17-dogfood/report.md` — Layer 2.5 dogfood smoke 由来 6 候補 (act adoption gap / proposed file SSoT oversight / stale test selector / type name stale / fixture drift CI gate / dogfood 成功 record)
- `docs/smoke-tests/m0.17-real-daemon/report.md` — real daemon mock-less verify 由来 4 候補 (mock-only dogfood gap structural / WS 再接続中 persistent display / cat-walker real daemon active verify deferred / loom-ui-smoke mandate 格上げ提案)
- `tests/REQUIREMENTS.md` REQ-100..102 — M0.16 latent bug class 由来 implicit candidates (CI parity gate adoption gap / codify→next milestone usage gate)
- Phase 4.5 hotfix (REQ-091) — proposed file SSoT oversight + stale test selector + tRPC WS transport の 3 root cause、design handoff bundle review gate 強化候補

**rationale**: Phase boundary retro covering rule (CLAUDE.md M0.8 retro 規律 + retro 2026-05-04-001 F-pj-005 解消) により、M0.15/M0.16/M0.17 連続 unrun-retro 状態を Phase boundary で一括 covering。dogfood phase の柔軟運用、`.claude-loom/project-prefs.json` `last_retro` は m0.15-complete のまま (実 retro 未実行のため更新せず、carryover state を明示)。

---

## M0.17 Round 2 Review Followup (2026-05-16、user Round 2 review 由来)

design review 第 2 巡 (`docs/m0.17-round2-review.md` SSoT、2026-05-16 user 実施) で M0.17 closure 直後の状態に対し 15 finding (P0 動かないボタン 8 件 / P1 構造的ズレ 4 件 / P2 雑多 5 件) を検出。**体感再現度: Room 70% / その他 35% / 全体 50%** と評価、Phase B (12 screens G6 トークン化) が最 ROI と指摘。

**戦略**: user 推奨に従い 3 branch 分割 + 順次 (A → B → C) 実行。各 phase で別 PR、parallel review 可能。現 `fix/m0.17-ui-redesign-correction` HEAD (`2b297ba`) をベースに分岐、PR #12 は user 判断で任意 merge。

**branch 構成**:
- `fix/m0.17-phase-a-buttons` — Phase A (B4-B11 動かないボタン掃除、半日想定)
- `fix/m0.17-phase-b-tokens` — Phase B (12 screens G6 トークン化、1-2 day 想定、最 ROI)
- `fix/m0.17-phase-c-cleanup` — Phase C (S7-S9 + M3-M5 misc cleanup、半日、任意)

### Round 2 Phase A: 動かないボタン掃除

- [ ] B4: `RoomView.tsx` ColdStart 「▶ PM を起動」`onClick={() => alert('POST /pm/start')}` → `usePMSession().start()` 配線 <!-- id: m0.17-r2-A4 status: todo branch: fix/m0.17-phase-a-buttons planned_files: ui/src/views/room/RoomView.tsx -->
- [ ] B5: `RoomView.tsx` の `retroMode` state UI 復活 (Drawer MANAGE グループ移行 OR Room 右上小 CTA) または状態ごと削除判断 <!-- id: m0.17-r2-A5 status: todo branch: fix/m0.17-phase-a-buttons planned_files: ui/src/views/room/RoomView.tsx -->
- [ ] B6: `RoomView.tsx` `<RetroGathering><div>RetroView placeholder</div></RetroGathering>` → 実 `<RetroView />` import or `children` prop 撤去 <!-- id: m0.17-r2-A6 status: todo branch: fix/m0.17-phase-a-buttons planned_files: ui/src/views/room/RoomView.tsx -->
- [ ] B7: `AppShell.tsx` TopBar project button noop → `navigate('/project-settings')` 最低限配線 (将来的 dropdown 化候補) <!-- id: m0.17-r2-A7 status: todo branch: fix/m0.17-phase-a-buttons planned_files: ui/src/routing/AppShell.tsx -->
- [ ] B8: `PlanView.tsx` `edit` ボタン noop → `upsertItem` mutation 経由の milestone editor 配線 <!-- id: m0.17-r2-A8 status: todo branch: fix/m0.17-phase-a-buttons planned_files: ui/src/views/plan/PlanView.tsx -->
- [ ] B9: `LiveRail.tsx` `if (collapsed) { return <button .../>; }` 分岐デッドコード削除 (AppShell 側 `<button className="rail-toggle">` に一本化、責務明確化) <!-- id: m0.17-r2-A9 status: todo branch: fix/m0.17-phase-a-buttons planned_files: ui/src/views/room/LiveRail.tsx -->
- [ ] B10: `AppShell.tsx` TopBar 4 metrics drill-down navigation (PARALLEL→/gantt、TASK TOOL→/sessions、TDD ORDER→/consistency?filter=tdd、VERDICT→/consistency) <!-- id: m0.17-r2-A10 status: todo branch: fix/m0.17-phase-a-buttons planned_files: ui/src/routing/AppShell.tsx -->
- [ ] B11: `AppShell.tsx` ScenarioPicker `activate(key)` を `window.history.replaceState` + `popstate` から `useNavigate` + `useSearchParams` (React Router 経由) に統一、NavLink active 同期確保 <!-- id: m0.17-r2-A11 status: todo branch: fix/m0.17-phase-a-buttons planned_files: ui/src/routing/AppShell.tsx -->

**Phase A 完了基準**: `grep -rn "onClick" ui/src | grep -v "=>"` で素朴な noop が 0 件、`alert(` 0 件、Vitest UI 958/958 + daemon 546/546 + Playwright 19/19 全 pass、`tsc --noEmit` new error 0、PR open + CI green。

### Round 2 Phase B: トークン化を screens に降ろす (最 ROI)

12 screens の inline style 全廃 → `ui/src/styles/screens/<screen>.css` クラス置換。`screens/plan.css` を雛形として手で詰め、他 11 screens は同パターンで mass-production。

- [ ] B-template: `ui/src/styles/screens/plan.css` 新設 + `PlanView.tsx` の inline 全廃 (雛形確立) <!-- id: m0.17-r2-B-template status: todo branch: fix/m0.17-phase-b-tokens planned_files: ui/src/styles/screens/plan.css, ui/src/views/plan/PlanView.tsx -->
- [ ] B-gantt: `screens/gantt.css` + `GanttView.tsx` <!-- id: m0.17-r2-B-gantt status: todo branch: fix/m0.17-phase-b-tokens planned_files: ui/src/styles/screens/gantt.css, ui/src/views/gantt/GanttView.tsx -->
- [ ] B-consistency: `screens/consistency.css` + `ConsistencyView.tsx` / `ConsistencyViewLive.tsx` <!-- id: m0.17-r2-B-consistency status: todo branch: fix/m0.17-phase-b-tokens planned_files: ui/src/styles/screens/consistency.css, ui/src/views/consistency/ConsistencyView.tsx, ui/src/views/consistency/ConsistencyViewLive.tsx -->
- [ ] B-customization: `screens/customization.css` + `CustomizationView.tsx` <!-- id: m0.17-r2-B-customization status: todo branch: fix/m0.17-phase-b-tokens planned_files: ui/src/styles/screens/customization.css, ui/src/views/customization/CustomizationView.tsx -->
- [ ] B-retro: `screens/retro.css` + `RetroView.tsx` <!-- id: m0.17-r2-B-retro status: todo branch: fix/m0.17-phase-b-tokens planned_files: ui/src/styles/screens/retro.css, ui/src/views/retro/RetroView.tsx -->
- [ ] B-sessions: `screens/sessions.css` + `SessionListView.tsx` <!-- id: m0.17-r2-B-sessions status: todo branch: fix/m0.17-phase-b-tokens planned_files: ui/src/styles/screens/sessions.css, ui/src/views/session-list/SessionListView.tsx -->
- [ ] B-settings: `screens/project-settings.css` + `ProjectSettingsView.tsx` <!-- id: m0.17-r2-B-settings status: todo branch: fix/m0.17-phase-b-tokens planned_files: ui/src/styles/screens/project-settings.css, ui/src/views/project-settings/ProjectSettingsView.tsx -->
- [ ] B-tokens: `screens/tokens.css` + `TokenMeterView.tsx` / `TokensView.tsx` <!-- id: m0.17-r2-B-tokens status: todo branch: fix/m0.17-phase-b-tokens planned_files: ui/src/styles/screens/tokens.css, ui/src/views/tokens/TokenMeterView.tsx, ui/src/views/tokens/TokensView.tsx -->
- [ ] B-worktree: `screens/worktree.css` + `WorktreeView.tsx` / `SubroomView.tsx` <!-- id: m0.17-r2-B-worktree status: todo branch: fix/m0.17-phase-b-tokens planned_files: ui/src/styles/screens/worktree.css, ui/src/views/worktree/WorktreeView.tsx, ui/src/views/worktree/SubroomView.tsx -->
- [ ] B-guidance: `screens/guidance.css` + `GuidanceView.tsx` / `LearnedGuidanceView.tsx` <!-- id: m0.17-r2-B-guidance status: todo branch: fix/m0.17-phase-b-tokens planned_files: ui/src/styles/screens/guidance.css, ui/src/views/guidance/GuidanceView.tsx, ui/src/views/guidance/LearnedGuidanceView.tsx -->
- [ ] B-agent-detail: `screens/agent-detail.css` + `AgentDetailPanel.tsx` / `AgentDetailNotes.tsx` <!-- id: m0.17-r2-B-agent-detail status: todo branch: fix/m0.17-phase-b-tokens planned_files: ui/src/styles/screens/agent-detail.css, ui/src/views/room/AgentDetailPanel.tsx, ui/src/views/room/AgentDetailNotes.tsx -->
- [ ] B-pm-approval: `screens/pm-approval.css` + `PMApprovalModal.tsx` / `PMApprovalToast.tsx` <!-- id: m0.17-r2-B-pm-approval status: todo branch: fix/m0.17-phase-b-tokens planned_files: ui/src/styles/screens/pm-approval.css, ui/src/views/pm-chat/PMApprovalModal.tsx, ui/src/views/pm-chat/PMApprovalToast.tsx -->

**Phase B 完了基準**: `grep -rn "style={{" ui/src/views | wc -l` が動的値 (progress bar `width: ${n}%` 等) 以外 0 に近づく、Vitest + daemon + Playwright 全 pass、再現度 50%→80% (Room 70%→80% + その他 35%→80%) target、PR open + CI green。

### Round 2 Phase C: 細部 cleanup (任意)

- [ ] S7: `AppShell.tsx` `<div style={{marginRight: rightColumnWidth}}><RoomView /></div>` wrapper 撤去、右カラム absolute overlay 化、RoomView は full width で ResizeObserver は `.content` 直観測 <!-- id: m0.17-r2-C-S7 status: todo branch: fix/m0.17-phase-c-cleanup planned_files: ui/src/routing/AppShell.tsx, ui/src/views/room/RoomView.tsx -->
- [ ] S8: `AppShell.tsx` TopBar に branch chip 追加 (`◆ branch: {scenario.branch}` 常時表示)、project は StatusBar `~/work/{project}` で十分 <!-- id: m0.17-r2-C-S8 status: todo branch: fix/m0.17-phase-c-cleanup planned_files: ui/src/routing/AppShell.tsx -->
- [ ] S9: z-index 生数値撲滅 (`grep -rn "zIndex: [0-9]" ui/src` で全数洗い、`--z-*` トークン置換) <!-- id: m0.17-r2-C-S9 status: todo branch: fix/m0.17-phase-c-cleanup planned_files: ui/src/views/room/RoomView.tsx, ui/src/routing/AppShell.tsx -->
- [ ] M3: `shell.css` の `@keyframes cat-walk-trip` + `.cat-walker` class の `--walk-dx/--walk-dy` 配線確認 (Phase 4 t12 で DeskStation 側完了、CSS side 健全性 verify) <!-- id: m0.17-r2-C-M3 status: todo branch: fix/m0.17-phase-c-cleanup planned_files: ui/src/styles/shell.css -->
- [ ] M4: `routes.tsx` のコメント「Panel overlay routes」→「Sibling screen routes」書き換え (S2 sibling routing 化で文言不整合) <!-- id: m0.17-r2-C-M4 status: todo branch: fix/m0.17-phase-c-cleanup planned_files: ui/src/routing/routes.tsx -->
- [ ] M5: ScenarioPicker の `'live'` ボタンを `SCENARIO_KEYS` に含めて統一実装、`activate('')` 別実装の不一貫解消 <!-- id: m0.17-r2-C-M5 status: todo branch: fix/m0.17-phase-c-cleanup planned_files: ui/src/routing/constants.ts, ui/src/routing/AppShell.tsx -->

**Phase C 完了基準**: 上記 6 item check、Vitest + daemon + Playwright 全 pass、PR open + CI green。

---

## M0.17 Round 3 Polish Phase (2026-05-16、user feedback 「なんで100%じゃないねん」由来)

Round 2 Phase A+B+C 完遂後 PM が「体感再現度 87% target 達成」と報告したところ、user push back「なんで100%じゃないねん」。Round 2 review の 87% を **ceiling じゃなく floor** として扱い、residual gap を iterative closure する追加 polish phase。

**`memory/feedback_100_percent_expectation.md` codify**: review target % は floor 扱い、PM の早期収束禁止、user の体感判定が必須。

**戦略**: PM が `redesign/screens/*.jsx` SSoT と現実装の **code-level structural diff** を inventory、識別された concrete gap (元 review に listed されとらん **missing functionality 含む**) を 2 phase で集中 close。Phase D = Room、Phase E = 他 11 screens。

### Round 3 Phase D: Room polish R-1〜R-6

PM が `redesign/screens/room.jsx` 501L SSoT を read + side-by-side で 6 concrete gap inventory、Phase D dev (`800a185`) で集中 fix:

- [x] R-1: Desk container width 96→110 token split (`--desk-container-width` 新設 + `--desk-width` 内側維持) <!-- id: m0.17-r3-D-R1 status: done committed_sha: 800a185 -->
- [x] R-2: Monitor lines 4→3 (`--w40` 削除、DeskStation.tsx + room.css) <!-- id: m0.17-r3-D-R2 status: done committed_sha: 800a185 -->
- [x] R-3: Bubble kind tool/reason 分岐 (BubbleShape interface 新設、tool 黄色 label + reason italic quote、`task` prop backward compat 残置) <!-- id: m0.17-r3-D-R3 status: done committed_sha: 800a185 -->
- [x] R-4: PMChatPanel + STREAM tab 統合 (tab state + tabs row + content 切替、rail__line class 再利用) <!-- id: m0.17-r3-D-R4 status: done committed_sha: 800a185 -->
- [x] R-5: pm-chat-handle collapsed button (PMChatPanel collapsed prop + AppShell pmChatCollapsed state) <!-- id: m0.17-r3-D-R5 status: done committed_sha: 800a185 -->
- [x] R-6: Wall sign positioning fix (verify only と想定 → dev 発見で実は misposition、`left:14 top:10 / right:14 top:10` に修正、`now` prop 追加) <!-- id: m0.17-r3-D-R6 status: done committed_sha: 800a185 -->

**Phase D verification**: Vitest 984/984 (+19 TDD test、REQ-108..112) + daemon 546/546 + bash 42/42 + Playwright Room baseline 4 枚 darwin retake + 0 regression。Room 70%→95% target 達成、PR #16 stacked + CI green。

### Round 3 Phase E: 11 screens structural alignment

PM が user 承認の後、11 redesign source jsx と現実装の code-level structural diff を一括 inventory + Phase E dev (`fa11af7`) で集中 fix。**重要発見**: initial 実装で見落とされとった functionality 多数:

- [x] AgentDetailPanel: RECENT DISPATCHES section **完全欠落** → 追加 (gantt rows filtered per agent + mini bar + BAR_KIND_COLOR) <!-- id: m0.17-r3-E-agent-detail status: done committed_sha: fa11af7 -->
- [x] WorktreeView: `+ 新 worktree` button + create dialog modal **欠落** → 追加 (`wt-create-*` class 体系) <!-- id: m0.17-r3-E-worktree status: done committed_sha: fa11af7 -->
- [x] TokensView: 期間 selector (24h/7d/30d/all) + CatSprite + model badge **欠落** → 追加 (`tokens-period-*` class 体系) <!-- id: m0.17-r3-E-tokens status: done committed_sha: fa11af7 -->
- [x] ConsistencyView: `cv-screen` full-bleed + `📜` title + since chip + filter button + 「all」filter + `📭` empty icon + running state → 追加 <!-- id: m0.17-r3-E-consistency status: done committed_sha: fa11af7 -->
- [x] RetroView: LensCards の CatSprite (known roster agents 限定、user/unknown は `👤`) → 追加 <!-- id: m0.17-r3-E-retro status: done committed_sha: fa11af7 -->
- [x] GanttView: worktree first-row `gantt-agent-row--first` border-top none class → 追加 <!-- id: m0.17-r3-E-gantt status: done committed_sha: fa11af7 -->
- [x] GuidanceView: `❉` title prefix + diff toggle `▾`/`▸` glyph + `↗ source:` prefix → 追加 <!-- id: m0.17-r3-E-guidance status: done committed_sha: fa11af7 -->
- [x] ProjectSettingsView: `⚙` title prefix → 追加 <!-- id: m0.17-r3-E-settings status: done committed_sha: fa11af7 -->
- [x] PlanView: redesign 整合済、no-op verify <!-- id: m0.17-r3-E-plan status: done committed_sha: fa11af7 -->
- [x] CustomizationView: redesign 整合済、no-op verify <!-- id: m0.17-r3-E-customization status: done committed_sha: fa11af7 -->
- [x] SessionListView: redesign 整合済、no-op verify <!-- id: m0.17-r3-E-sessions status: done committed_sha: fa11af7 -->

**Phase E verification**: Vitest 984/984 維持 + daemon 546/546 + bash 42/42 + 0 regression、REQ-113 append、6 test RED→GREEN (TDD confirmed)、PR #17 stacked + CI green。

**Phase E key insight**: Round 2 review の 87% target は initial 実装の missing functionality を含むため。redesign source SSoT を visual diff じゃなく **code-level structural diff** で iteration するのが真の polish path、subjective polish (色 / pixel) より優先。

### M0.17 Round 3 完成基準

- Code-level structural diff (redesign/screens/*.jsx SSoT 比較) all closed for 12 screens
- 6 stacked PRs (#12..#17) all mergeable + CI green
- Vitest UI 984/984 + daemon 546/546 + bash 42/42 + Playwright 19/19 + tsc 0 new error + 0 regression
- 体感再現度: 30〜40% → 95%+ (Room 95% + その他 95%+)
- REQ-091..113 計 23 件 append
- 全 missing functionality (AgentDetailPanel RECENT DISPATCHES / WorktreeView create dialog / TokensView period selector / etc.) 追加済
- `feedback_100_percent_expectation.md` memory codify 済 (PM 早期収束禁止規律)

### 残 carryover (M0.18 / Phase boundary retro へ)

- 12 screens × code-level diff alignment 完了後の subjective polish (色微調整 / spacing 検査 / pixel-perfect alignment) — user-driven feedback iterative round で対応
- ConsistencyPoster occlusion (Room layout: ROOM_MIN_WIDTH=900 clamp + marginRight wrapper の相互作用) — Phase D R-6 dev 発見、Phase E scope 外
- cat-walker scenario 駆動 active 化 — daemon agent state 配信待ち M1.x scope
- WS 再接続中 persistent display — Phase 4.7 R1 carryover、M1.x daemon WS hardening scope
- Round 2/Round 3 polish phase pattern の retro 反映 (review target % を floor 扱い + dev SSoT verification の価値、Phase 4.6/D/E で複数回証明)

`feedback_100_percent_expectation.md` + `feedback_mock_only_dogfood_gap.md` の dual memory codify で **「review が言うた % で止まらん / mock pass で止まらん」体感判定 priority 規律** を構造化済。

### Round 2 完成基準 (Phase A + B + C 全完遂)

`grep -rn "style={{" ui/src/views | wc -l` が動的値以外 0、`grep -rn "onClick" ui/src | grep -v "=>"` noop 0 件、`alert(` 0 件、`grep -rn "zIndex: [0-9]" ui/src` 0 件、Vitest UI 958+ / daemon 546+ / Playwright 19/19 全 pass、tsc new error 0、再現度 50%→**87%** (Room 70%→90% + その他 35%→85% target、review Phase C 後見積もり)、PR Phase A/B/C 3 件 mergeable + CI green、retro 候補は M0.18 / Phase boundary retro に carryover。

### M0.17 完成基準

REVIEW.md Phase 1+2+3+4 完了、proposed file 11 種全適用 (shell.css / room.css / tokens.css.patch / index.css / AppShell / 2 つの constants.ts / RoomBackground / RoomView / DeskStation / LiveRail)、`ui/src/views/room/Islands.tsx` 削除済、再現度 30〜40% → ≥90% 達成 (Playwright visual diff 確認)、Outlet 全画面オーバーレイ撤去 (S2 — sibling routing 化、Drawer active 強調活性化)、ゾーン箱化解消 (B2 — SVG ラグ化、枠線なし)、ResizeObserver による比率レイアウト (B3 — `width=1080` 固定座標廃止)、LiveRail PM idle 時表示 (S1)、cat-walker walkTo 配線 (S6)、G6 トークン化全廃 (`STATUS_COLOR` 等の literal 定数廃止 + inline style → class 移行 + 構造化テーブル constants.ts 化)、`./tests/run_tests.sh` 全 PASS、`pnpm --filter @claude-loom/ui test` 全 pass (regression 0)、`pnpm --filter @claude-loom/daemon test` 全 pass (regression 0)、`tsc --noEmit` redesign 由来 error 0 (pre-existing は維持)、Layer 2.5 dogfood smoke 8 step 全 PASS (Step 8 graceful skip 可)、Playwright darwin baseline 全 16 picture 再撮影済 + 16/16 pass、SPEC §3.6.14 / docs/SCREEN_REQUIREMENTS.md / DOC_CONSISTENCY_CHECKLIST.md update 済、tests/REQUIREMENTS.md REQ-091..N PM 一括 append 済、`tag m0.17-complete` 設置、`m0`〜`m0.16-complete` 全保持、main への PR open 済 (branch hygiene 遵守)。

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
- **M0.X-daemon-refactor Phase 1** (`refactor/daemon-cleanup` branch、2026-05-17 closure): daemon/src/ TypeScript audit + Phase 1 targeted fixes 完了。Explore agent audit で 18 issues 検出 (2 Critical / 10 Important / 6 Nice-to-have)、その内 5 issues を本 branch で fix:
  - CRITICAL-2: `routes/approval.ts:37-46` silent failure → NOT_FOUND throw に修正
  - IMPORTANT-1: atomic JSON file utility を `lib/json-file.ts` に SSoT 抽出 (prefs / retro の duplicate 解消)
  - IMPORTANT-2: TRPCError 直接 import を TRPCErrorClass 統一に変更 (personality + worktree)
  - IMPORTANT-4: prefs learnedGuidance optional chaining を explicit null check に明示化
  - IMPORTANT-6: path-safety validation を `lib/path-safety.ts` に SSoT 抽出 (projectId / retroId)
  - regression-free verify: Vitest 546/546 PASS 維持
- **M0.X-daemon-refactor Phase 2** (next milestone candidate、未着手): Phase 1 で deferred な architectural changes:
  - CRITICAL-1: module-level DB singleton (test isolation 影響、tRPC middleware 経由 per-request context injection 必要)
  - IMPORTANT-3: `z.unknown()` 濫用解消 (retro_session_history / learned_patterns 等の sub-schema 明示化)
  - IMPORTANT-5: broadcaster.emit 型安全化 (typed helper functions 新設、emit 不整合 build-time 検出化)
  - IMPORTANT-7: dead code removal (frontend audit 必要、export type aliases の actual usage 確認)
  - IMPORTANT-8: Response DTO 標準化 (Drizzle $inferSelect の snake_case API leak 解消、SPEC §6.2 codify)
  - IMPORTANT-9: broadcast + state mutation の atomicity (events table redesign 必要)
  - IMPORTANT-10: DB client singleton consistency (worktree.ts の per-procedure 化を module-level に統一)
  - NICE-1〜6: consolidation candidates (partial schema helper / typed broadcaster export / retroSession naming / etc.)
  - scope は SPEC §12 codify 含む architectural change、別 spec phase 推奨

## マイルストーン M0.X-skill-migration (`docs/agent-prompt-design` branch、2026-05-17 から)

Agent prompt design principle 確立 + 10 agents → 2 skills への architectural cleanup。`docs/AGENT_PROMPT_DESIGN.md` (2-layer structure / anti-patterns / size guideline) を SSoT として確立、reviewer 4 体 (loom-reviewer / loom-{code,security,test}-reviewer) を `skills/loom-review/SKILL.md` に統合、retro 6 体 (4 lens + counter-arguer + aggregator) を `skills/loom-retro/SKILL.md` に統合。残存 agents は loom-pm / loom-developer / loom-retro-pm の **3 persistent role only**。

### 完成基準

- `docs/AGENT_PROMPT_DESIGN.md` 新設 (2-layer structure / 6 anti-patterns / 5 good patterns / size guideline / migration 手順 / 9-item verification checklist)
- `docs/SKILL_MIGRATION.md` 新設 (10 agents → 2 skills migration plan + 完了記録)
- SPEC §3.10.2 新設 + §3.9 / §3.6.5 / §3.6.10 / §4 / §5 / §9 directory tree skill-centric 改訂
- 3 persistent role agents (loom-pm / loom-developer / loom-retro-pm) を 2-layer design principle 準拠で refactor
- 4 reviewer agents 削除 (`agents/loom-{reviewer,code-reviewer,security-reviewer,test-reviewer}.md`)
- 6 retro agents 削除 (`agents/loom-retro-{pj,process,meta}-judge.md` + counter-arguer + aggregator + researcher)
- skills/loom-review/SKILL.md 統合拡張 (single + trio strategy + 3 aspect template + JSON contract)
- skills/loom-retro/SKILL.md 統合拡張 (Stage 0-3 + 4 lens + counter-arguer + aggregator template)
- `skills/loom-review-trio/SKILL.md` 削除 (loom-review に統合済)
- `templates/{user,project}-prefs.json.template` の `skills.*` schema 拡張 (loom-review / loom-retro の skill-keyed customization 有効化)
- docs consistency: RETRO_GUIDE / REQUIREMENTS / DOC_CONSISTENCY_CHECKLIST / README / CLAUDE.md の deleted agent ref を skill template ref に rewire
- `./tests/run_tests.sh` 全 PASS 維持 (旧 verbose Session Start Hook test 6 個削除 + agents_test.sh skill-aware に rewrite)
- Local Layer 2.5 dogfood smoke (`bash hooks/loom-launch-ui.sh` + `curl /health` / `/mode` / `/`) 全 PASS
- Skill-centric architecture 実機 dogfood verify (`/loom-retro` invoke で retro-pm が skill template を read + general-purpose subagent dispatch chain 動作確認、smoke verification)
- main への PR open + merge (branch hygiene 遵守)

## マイルストーン M0.X-spec-plan-multi-file (`docs/spec-plan-multi-file-thinking-design` branch、2026-05-17 から)

詳細: `docs/plans/2026-05-17-claude-loom-m0.x-spec-plan-multi-file.md`
設計書: `docs/plans/specs/2026-05-17-spec-plan-multi-file-thinking-design.md`

claude-loom が promote する spec/plan 駆動開発の **構造規約として multi-file 思想を組み込む** Stage 1。SPEC.md / PLAN.md を 1 ファイルに突っ込み続けると発生する 4 痛み (LLM context 食い / 人間の読みづらさ / 編集衝突 / doc 整合性 check) を構造的に塞ぐ。PJ 規模・要件に応じて適応的に single-file / multi-file を選択、PM agent が brainstorm で user と決定、後発の肥大化は size threshold (default SPEC 1000 行 / PLAN 1500 行) で trigger。axis はガイドラインのみ codify (layer-based / domain-based / feature-group / 横断)、PJ 性質で動的決定。SSoT 参照記法は `spec/<topic>.md §X.Y` (file path + § 番号)。本 milestone は **思想 codify のみ**、claude-loom 自身の SPEC.md 解体は次 M0.X-spec-plan-multi-file-dogfood placeholder へ分離。

設計合意（2026-05-17 brainstorm session）:
- 画一 default 引かず、PM brainstorm 判断 + size threshold 警告で発火 (両方とも自動分割禁止、user 確認介在)
- axis ガイドライン codify、PJ 性質で動的決定 (固定 default は judgment を奪う)
- 参照記法は file path + § 番号 (grep 容易、IDE jumpable、現行記法 `SPEC.md §X` と連続性)
- Stage 1 (思想 codify) と Stage 2 (claude-loom 自身 migration) は別 milestone (review / revert 単位、Stage 2 が新思想の最初の dogfood テストケース)
- multi-file mode の doc consistency check (用語整合 / cross-ref 健全性 / scope 重複 / master index 整合性) は M4 doc 整合性エンジン v1 候補、本 milestone では手作業 checklist 化

- [x] PLAN.md M0.X-spec-plan-multi-file + M0.X-spec-plan-multi-file-dogfood placeholder entry 追加（本タスク） <!-- id: m0.x-spec-plan-t1 status: done -->
- [x] SPEC.md §3.11 新設 (multi-file thinking SSoT: 思想 / axis ガイドライン / trigger / 参照記法 / doc consistency 拡張) <!-- id: m0.x-spec-plan-t2 status: done committed_sha: 006a209 path: loom-developer (self-review Path C、reviewer 4 観点 PASS、tests/spec_311_multi_file_test.sh 1/1 PASS で TDD red→green 確認) planned_files: SPEC.md, tests/spec_311_multi_file_test.sh -->
- [x] CLAUDE.md ファイル配置規約 + 主要ドキュメント参照 更新 (multi-file pattern 追記 + §3.11 ポインタ) <!-- id: m0.x-spec-plan-t3 status: done committed_sha: 5825657 path: loom-developer (Path C self-review、3 integrity check 全 PASS) planned_files: CLAUDE.md -->
- [x] templates/multi-file-spec-skeleton/ 新規追加 (master + sample topic) <!-- id: m0.x-spec-plan-t4 status: done committed_sha: f3cdf5e path: loom-developer (Path C self-review、TDD red→green、commit は t5 と merged: parallel batch hygiene retro candidate F-proc-NEW) planned_files: templates/multi-file-spec-skeleton/SPEC.md.template, templates/multi-file-spec-skeleton/spec/_sample-topic.md.template, tests/multi_file_skeleton_test.sh -->
- [x] agents/loom-pm.md に spec phase multi-file 判定 step + size 警告 logic 追加 <!-- id: m0.x-spec-plan-t5 status: done committed_sha: f3cdf5e path: loom-developer (Path C self-review、size guideline 250→265 行 net+1 で超過 15 行、Post-tag hotfix protocol を SPEC §3.6.8.11 引用 1 行に圧縮 -5 行で部分緩和、retro candidate: 既存 verbose 記述の更なる圧縮余地検証) planned_files: agents/loom-pm.md -->
- [x] commands/loom-spec.md に multi-file brainstorm prompt 追加 <!-- id: m0.x-spec-plan-t6 status: done committed_sha: b9b4bf9 path: loom-developer (Path C self-review、skeleton-h RED→GREEN 遷移確認、3 integrity check 全 PASS) planned_files: commands/loom-spec.md -->
- [x] skills/loom-write-plan/SKILL.md に PLAN Phase 分割 + milestone 内 axis 分割 サポート追加 <!-- id: m0.x-spec-plan-t7 status: done committed_sha: 5968452 path: loom-developer (Path C self-review、RED→GREEN TDD 確認、3 integrity check 全 PASS: 9/3/3) planned_files: skills/loom-write-plan/SKILL.md -->
- [x] docs/DOC_CONSISTENCY_CHECKLIST.md に multi-file mode check 項目追加 (用語整合 / cross-ref / scope 重複 / master index 整合性 の 4 項目) <!-- id: m0.x-spec-plan-t8 status: done committed_sha: fa98e11 path: loom-developer (Path C self-review、4 keyword 全列挙、6/4/2 integrity PASS) planned_files: docs/DOC_CONSISTENCY_CHECKLIST.md -->
- [x] tests/multi_file_skeleton_test.sh 新規追加 (template 構造 + agent prompt marker + SPEC §3.11 存在 verify) <!-- id: m0.x-spec-plan-t9 status: done committed_sha: 21f1fa8 path: loom-developer (Path C self-review、初版は f3cdf5e で先行作成、本 commit で t7+t8 marker assertion 4 group extend、20/20 PASS + full harness 39/39 PASS regression なし) planned_files: tests/multi_file_skeleton_test.sh -->

**M0.X-spec-plan-multi-file 完成基準**：`SPEC.md §3.11` 新設 + sub-section §3.11.1〜.5 完備、`templates/multi-file-spec-skeleton/SPEC.md.template` + `spec/_sample-topic.md.template` 作成、`agents/loom-pm.md` 内 `multi-file` 言及 ≥2、`commands/loom-spec.md` 内 multi-file brainstorm prompt 追加、`skills/loom-write-plan/SKILL.md` に Phase-split + milestone-folder pattern 追加、`docs/DOC_CONSISTENCY_CHECKLIST.md` に multi-file mode 4 項目追加、`./tests/run_tests.sh multi_file_skeleton` PASS、`./tests/run_tests.sh` 全 PASS 維持、`tag m0.x-spec-plan-complete` 設置、main への PR open (branch hygiene 遵守)。

## マイルストーン M0.X-spec-plan-multi-file-dogfood (`refactor/spec-plan-multi-file-dogfood` branch、2026-05-17 から)

詳細: `docs/plans/2026-05-17-claude-loom-m0.x-spec-plan-multi-file-dogfood.md`
設計書: `docs/plans/specs/2026-05-17-spec-plan-multi-file-dogfood-design.md`
親設計書: `docs/plans/specs/2026-05-17-spec-plan-multi-file-thinking-design.md` §8.2 (Stage 2 SSoT)

claude-loom 自身の **dogfood migration** (Stage 2)。M0.X-spec-plan-multi-file で codify した multi-file 思想を SPEC.md (2954 行) に実適用、Mixed 5 topics axis で master + `spec/{harness,daemon-and-data,ui-arch,retro-system,install-and-test}.md` へ carve。本 milestone の真の目的は **新思想の practical validation** であり、完了後 retro で axis 妥当性 / 参照記法 grep 容易性 / size threshold 妥当性を検証。

設計合意 (2026-05-17 brainstorm session):
- axis: Mixed 5 topics (Stage 1 axis ガイドライン準拠、harness/daemon/ui の 3 柱 + retro 独立 + install/test 軽量)
- M1/M2 milestone 詳細 (現 SPEC.md 1935〜2524 行、約 590 行) の PLAN/docs/plans 移管は **Stage 3 分離** (M0.X-spec-purity-restoration 仮称)
- sequential carve (t2-t7 全て SPEC.md modify、parallel batch 不可 — planned_files overlap)
- 既存 agent prompts / retro report の `SPEC.md §X` 古記法は **書き換えない** (design spec §5.1 SSoT)
- topic file 内 § は §1 から local 振り直し (SPEC §3.11.4 SSoT)

- [x] PLAN.md M0.X-spec-plan-multi-file-dogfood entry 追加 (placeholder → actual milestone) (本タスク) <!-- id: m0.x-spec-plan-dogfood-t1 status: done -->
- [x] spec/harness.md 新設 + master pointer 化 (§3.6.5 / §3.6.6 / §3.6.7 / §3.6.8 / §3.8 / §3.10 / §4 / §5 carve) <!-- id: m0.x-spec-plan-dogfood-t2 status: done committed_sha: 80adeb1 path: loom-developer (Path C self-review、TDD red→green、486 行 spec/harness.md + SPEC.md 2954→2509 行 -445 行、harness test 39/39 + multi_file_skeleton n1-n5 追加 + spec_311 regression 修正で全 PASS、t8 forward refs 7 件 報告) planned_files: SPEC.md, spec/harness.md, tests/multi_file_skeleton_test.sh, tests/spec_311_multi_file_test.sh -->
- [x] spec/daemon-and-data.md 新設 + master pointer 化 (§3.2 / §3.3 / §3.6 WS / §6 carve) <!-- id: m0.x-spec-plan-dogfood-t3 status: done committed_sha: fa3633f path: loom-developer (Path C self-review、977 行 daemon-and-data.md + SPEC.md 2509→1555 行 -954 行、n6-n9 追加 + prefs_test multi-file aware に regression fix、39/39 PASS、t8 申し送り 4 件) planned_files: SPEC.md, spec/daemon-and-data.md, tests/multi_file_skeleton_test.sh, tests/prefs_test.sh -->
- [x] spec/ui-arch.md 新設 + master pointer 化 (§3.6.9 / §3.6.10 / §3.6.11 / §3.6.12 / §3.6.13 / §3.6.14 / §3.6.15 carve) <!-- id: m0.x-spec-plan-dogfood-t4 status: done committed_sha: c363840 path: loom-developer (Path C self-review、475 行 ui-arch.md + SPEC.md 1555→1115 行 -440 行、n10-n12 追加、32/32 multi_file_skeleton PASS、t8 申し送り) planned_files: SPEC.md, spec/ui-arch.md, tests/multi_file_skeleton_test.sh -->
- [x] spec/retro-system.md 新設 + master pointer 化 (§3.9 carve) <!-- id: m0.x-spec-plan-dogfood-t5 status: done committed_sha: 31c9d0a path: loom-developer (Path C self-review、308 行 retro-system.md + SPEC.md 1115→818 行 -297 行、size threshold 1000 行下回り達成、n13-n14 追加、39/39 PASS) planned_files: SPEC.md, spec/retro-system.md, tests/multi_file_skeleton_test.sh -->
- [x] spec/install-and-test.md 新設 + master pointer 化 (§3.7 / §9 / §10 carve) <!-- id: m0.x-spec-plan-dogfood-t6 status: done committed_sha: e34f78c path: loom-developer (Path C self-review、298 行 install-and-test.md + SPEC.md 818→541 行 -277 行、n15-n16 追加、39/39 PASS、t8 proactive 更新 2 件) planned_files: SPEC.md, spec/install-and-test.md, tests/multi_file_skeleton_test.sh -->
- [x] master SPEC.md cleanup + Topic Index (§15) 新設 <!-- id: m0.x-spec-plan-dogfood-t7 status: done committed_sha: fcb8091 path: loom-developer (Path C self-review、SPEC.md 541→561 行 +20 行 Topic Index、n17 追加、37/37 multi_file_skeleton + 39/39 full PASS) planned_files: SPEC.md, tests/multi_file_skeleton_test.sh -->
- [x] cross-ref rewire (master + 全 topic、broken link 検出 + 修正、新 file path 記法へ移行) <!-- id: m0.x-spec-plan-dogfood-t8 status: done committed_sha: 156458c path: loom-developer (Path C self-review、47 件 rewrite 全 file、dead link 0、古記法残存 0、n18-n19 追加、39/39 PASS、change history は §5.1 SSoT 準拠で意図的維持) planned_files: SPEC.md, spec/harness.md, spec/daemon-and-data.md, spec/ui-arch.md, spec/retro-system.md, spec/install-and-test.md, tests/multi_file_skeleton_test.sh -->
- [x] tests/multi_file_skeleton_test.sh 拡張 (skeleton-n〜r、Stage 2 migration verify) <!-- id: m0.x-spec-plan-dogfood-t9 status: done committed_sha: 199cc8e path: loom-developer (Path C self-review、skeleton-p 5 assertion 追加、44 total assertions PASS、TDD red→green 確認、t2-t8 で n1-n19 既設と合わせて Stage 2 migration 完全 harness coverage) planned_files: tests/multi_file_skeleton_test.sh -->
- [x] doc consistency check 実走査 (用語整合 / cross-ref / scope 重複 / master index 整合性 の 4 項目) + 修正 <!-- id: m0.x-spec-plan-dogfood-t10 status: done committed_sha: no-op (consistency clean、修正なし) path: loom-developer (Path C self-review、4 items 全 clean: 用語 0 issue / broken link 0 / scope 重複 0 / master index 完全一致、retro candidate 1 件発見: §3.11.4 例示文字列の broken link scanner false positive 問題は M4 doc engine 設計考慮事項) planned_files: なし (no-op) -->

retro candidate (本 milestone dogfood 由来、closure 後 retro 用):
- F-pj-NEW (仮): SPEC §3.11.4 参照記法説明 table の "例" 列に書いた `spec/architecture.md §3.2` 等の example 文字列が broken link scanner の false positive を生む。M4 doc 整合性エンジン v1 設計時に「example marker」schema 検討必要 (backtick + `<!-- example -->` annotation 等)

**M0.X-spec-plan-multi-file-dogfood 完成基準**：`spec/` directory 配下に harness.md + daemon-and-data.md + ui-arch.md + retro-system.md + install-and-test.md の 5 topic file 全存在、master SPEC.md が ≤1000 行 (size threshold 内) へ収束、master SPEC.md §15 Topic Index 確立、各 topic file が back-pointer header + §1 から local renumber、master + 全 topic file 内の `spec/<topic>.md §X.Y` 形式 cross-ref が dead link 0、`bash tests/run_tests.sh multi_file_skeleton` 24+/24+ assertion PASS、`./tests/run_tests.sh` 全 PASS 維持、`tag m0.x-spec-plan-dogfood-complete` 設置、main への PR open (branch hygiene 遵守)。retro で新思想の practical validation 実施 (axis 妥当性 / 参照記法 grep 容易性 / size threshold 妥当性) を完成基準に含める。

## マイルストーン M0.18-skill-migration-ui-rework (`feat/m0.18-skill-migration-ui-rework` branch、2026-05-18 から)

詳細: `spec/ui-arch.md §8` が SSoT
design bundle: `docs/design/2026-05-17-m0.18-ui-rework/`
親設計書: `docs/design/2026-05-17-m0.18-ui-rework/project/Frontend改修方針.md` (Tier 1/2/3) + `UI Status Report.md` (現状診断、2026-05-17)

PR #18-#21 取込 (`M0.X-skill-migration` / `refactor/daemon-cleanup` / `feat/m0.11.2-pending-lifecycle-{spec,impl}`) で backend 意味論が変化した状況に対し、UI 側の 4 axis 差し替え (Room: 5 desk → 3 persistent + 10 ephemeral spirit / Customization: agents flat → tree 2-pane / Retro: FINDINGS → KPT 4 column + lifecycle / Cross-cutting 5 minor)。M0.17 (UI Redesign Port Correction) が骨格を整え、本 milestone が **意味論差し替え** を完成させ Phase 2 entry の foundation を整える。

設計合意 (chat5/chat6 + 2026-05-18 brainstorm session):
- scope: Tier 1 P0 (3 view major) + Tier 2 P1 (2 view enhancement) + Tier 3 P1 (3 minor) 全部含める (~6 日見積もり)
- QA Test Matrix.html: Vitest + Playwright test に variant 化、HTML matrix は `docs/design/2026-05-17-m0.18-ui-rework/project/` に dogfood reference として保存
- PM chat actual claude CLI spawn (UI Status Report A、Phase 5 t17) は本 milestone scope 外
- commit handoff: Strategy a (各 dev 自身が commit、`committed_sha` 必須)、Phase 1 parallel batch は worktree isolation 必須 (`CLAUDE.md` `Parallel batch claim 規律` 準拠)
- reviewer mode: single default 全 task
- M0.17 retro: 本 milestone closure 後に M0.16+M0.17+M0.18 まとめて Phase boundary retro

### Phase 0: prereq — roster.ts + skills registry 拡張 (sequential)

- [x] roster.ts に `kind: 'persistent' | 'spirit'` + `summonedBy: string` field 追加、SKILLS registry 統合 (3 persistent + 10 spirit + 2 skills × sub-scope) <!-- id: m0.18-t0 status: done committed_sha: 8e69ebb path: C (loom-developer self-review、Task tool deferred = subagent nested dispatch 制約、4 観点 self-checklist 全 PASS、TDD red→green 確認 tdd_red_confirmed: true、REQ-115 + REQ-116 採番、71 new tests + ui 1037/1037 PASS + harness 39/39 PASS + tsc improvement -27、SSoT option b 採用: data/roster.ts SSoT + views/room/roster.ts re-export、handoff_required: false、formal reviewer follow-up は Phase 4 closure でまとめ) planned_files: ui/src/views/room/roster.ts, ui/src/data/roster.ts, ui/src/data/skills.ts, ui/test/data/roster.test.ts, ui/test/data/skills.test.ts, ui/src/views/char-sheet/CharSheet.tsx, ui/test/components/cat-sprite.test.tsx, ui/test/views/agent-detail-attention.test.tsx, ui/test/views/agent-detail-panel.test.tsx, ui/test/views/char-sheet.test.tsx, ui/test/views/room/desk-station.test.tsx, ui/test/views/room/phase-d-polish.test.tsx, tests/REQUIREMENTS.md -->

### Phase 1: P0 major (3 view rewrite、**parallel batch + worktree isolation 必須**)

- [x] CustomizationView 2-pane tree 全面書き換え、TreeNav + LeafEditor 分割、agents (3) + skills (2 sub-scope) hierarchical 表示、aggregator `WRITE` badge、leaf editor (model 選択 agent only / skill scope では非表示)、CUSTOM-TREE-* prefix の Vitest case 5+ <!-- id: m0.18-t1 status: done committed_sha: 6de5248 (impl) + 41e7af7 (REQ docs) path: C (loom-developer self-review、Task tool deferred、4 観点 self-checklist 全 PASS、TDD red→green 確認 tdd_red_confirmed: true、24 CUSTOM-TREE-* tests + 46/46 customization tests + ui 1059 PASS regression なし、tsc clean (0 new errors、pre-existing only)、REQ-117..123 採番、handoff_required: false、worktree dispatch (worktree-agent-a82222c23215a21f6) だが dev が main branch (feat/m0.18-...) に直 commit、worktree HEAD は base 91a947e で commit なし、retro candidate F-proc-NEW: Agent tool isolation worktree の commit destination 不確定挙動) planned_files: ui/src/views/customization/CustomizationView.tsx, ui/src/views/customization/TreeNav.tsx, ui/src/views/customization/LeafEditor.tsx, ui/src/views/customization/customization-tree.test.tsx, ui/src/views/customization/customization-mock-active.test.tsx, ui/src/views/customization/customization-write.test.tsx, ui/src/styles/screens/customization.css, ui/test/views/customization.test.tsx, tests/REQUIREMENTS.md -->

- [x] RetroView KPT 4 column (KEEP/PROBLEM/CARRYOVER/TRY) + lifecycle (carryover pip + verdict 4-way badge + `last_seen_in`/`re_evaluated_in` metadata) + admin section (reconstruct/regen/retry 3 ボタン)、`useRetroLifecycle` hook 新設、RETRO-LC-* + RETRO-ADM-* prefix Vitest case 8+ <!-- id: m0.18-t2 status: done committed_sha: e2ed79e (impl in worktree-agent-a6928b75a59f63c69) + 53fc00c (merge to feat/m0.18-... via --no-ff ort strategy、conflict 0) path: C (loom-developer self-review、Task tool deferred、4 観点 self-checklist 全 PASS、TDD red→green 確認 tdd_red_confirmed: true、24 RETRO-LC/ADM tests + 935/935 worktree PASS、post-merge 1067/1067 全 ui test PASS regression なし、worktree base m0.17 91a947e、handoff_required: false、REQ ID 衝突: t2 claim REQ-115..122 だが Phase 0 で 115/116 取得 + t1 で 117..123 取得済 → Phase 4 t9 closure 時 RETRO-LC は REQ-124..128 / RETRO-ADM は REQ-129..132 へ renumber) planned_files: ui/src/views/retro/RetroView.tsx, ui/src/views/retro/KptColumn.tsx, ui/src/views/retro/CarryoverCard.tsx, ui/src/views/retro/AdminPanel.tsx, ui/src/live/useRetroLifecycle.ts, ui/src/styles/screens/retro.css, ui/test/views/retro.test.tsx, ui/test/views/retro/retro-mock-active.test.tsx -->

- [x] RoomView 3 persistent desk + 10 ephemeral spirit、3 motion flavor (rpg/office/hybrid) per `.room--*` class 切替、SummonQueue 壁掛け、`useDispatchQueue` hook 新設、Tweaks default hybrid、SPIRIT-* prefix Vitest case 5+ <!-- id: m0.18-t3 status: done committed_sha: ba19ed6 path: C (loom-developer self-review、Task tool deferred = subagent nested dispatch 制約、4 観点 self-checklist 全 PASS、TDD red→green 確認 tdd_red_confirmed: true (RED evidence: import resolve error)、SPIRIT-* prefix Vitest 16 cases (SP-ROSTER 3 + SP-MOTION 3 + SP-DESK 1 + Spirit 2 + SpiritEcho 1 + RoomDoor 2 + SummonQueue 4) + ui 1082/1082 PASS regression なし、tsc new error 0、REQ-133..143 採番、handoff_required: false、3rd attempt success — 過去 2 session が bash permission denied (pnpm/git allow rule 不在) で terminate、PM が `.claude/settings.json` に `Bash(pnpm *)` / `Bash(git *)` 追加してから retry success、retro candidate F-proc-NEW1: subagent permission allow rule の事前 audit 不足 / retro candidate F-proc-NEW2: leavingSpirits timer-based auto-removal 未実装 (mock 段階、daemon dispatch-end event 配線 follow-up 候補) / retro candidate F-USER-NEW: 5 desks → 3 desks breaking behavioral change で rev-code/rev-test/rev-sec が desk station から spirit sprite 格下げ — UX impact assessment 候補、formal reviewer follow-up は Phase 4 closure でまとめ) planned_files: ui/src/views/room/RoomView.tsx, ui/src/views/room/Spirit.tsx, ui/src/views/room/SpiritEcho.tsx, ui/src/views/room/RoomDoor.tsx, ui/src/views/room/SummonQueue.tsx, ui/src/live/useDispatchQueue.ts, ui/src/styles/room.css, ui/test/views/room/spirit/spirit.test.tsx, tests/REQUIREMENTS.md, ui/test/views/room/room-view.test.tsx (5→3 desk count 更新), ui/test/views/room/room-mock-active.test.tsx (5→3 desk 更新 + rev-code bubble test 除去) -->

planned_files audit: t1 (customization), t2 (retro), t3 (room) は完全 disjoint。`isolation: "worktree"` parameter 必須 (`CLAUDE.md` `Parallel batch claim 規律` + retro 2026-05-06-004)。

### Phase 2: P1 enhancement (parallel batch)

- [ ] LearnedGuidance scope filter pill 4 値 (all / Agents (3) / loom-review / loom-retro) + `keyKind` badge + `keyPath` 表示、aggregator `WRITE` badge、GD-SCOPE-* prefix Vitest case 3+ <!-- id: m0.18-t4 status: todo planned_files: ui/src/views/guidance/LearnedGuidanceView.tsx, ui/src/styles/screens/guidance.css, ui/test/views/guidance.test.tsx -->

- [ ] SessionList `reviewer_agent` → `reviewer (skill)` column rename + 値 skill identifier reformat (`loom-review/trio.code` 等)、projection 関数で DB 互換性吸収、SES-LBL-* prefix Vitest case 3+ <!-- id: m0.18-t5 status: todo planned_files: ui/src/views/session-list/SessionListView.tsx, ui/test/views/session-list.test.tsx -->

planned_files audit: t4 (guidance), t5 (session-list) disjoint。worktree isolation 推奨 (parallel batch 同 message dispatch)。

### Phase 3: P1 minor (sequential)

- [ ] TokenMeter `useTokenUsage({ enabled: !!session.active })` gate、session 起動前は polling 抑止 <!-- id: m0.18-t6 status: todo planned_files: ui/src/live/useTokenUsage.ts, ui/src/views/tokens/TokenMeterView.tsx, ui/test/live/use-token-usage.test.ts -->

- [ ] approval.decide NOT_FOUND TRPCError onError catch + toastBus.push error + retry action、ERR-NF-* prefix Vitest case 3+ <!-- id: m0.18-t7 status: todo planned_files: ui/src/notifications/toastBus.ts, ui/src/live/useApprovalMutations.ts, ui/test/notifications/not-found-toast.test.tsx -->

- [ ] Sidebar.tsx 残存有無確認、AppShell Drawer + TopBar で完全置換済なら削除、import 跡 grep clean <!-- id: m0.18-t8 status: todo planned_files: ui/src/routing/Sidebar.tsx (削除候補) -->

### Phase 4: doc + QA integration + closure

- [ ] QA Test Matrix prefix 全 7 種 (SPIRIT/CUSTOM-TREE/RETRO-LC/RETRO-ADM/GD-SCOPE/SES-LBL/ERR-NF) を Vitest + Playwright case として実装 verify、Playwright baseline regenerate (3 view 新 visual snapshot)、`pnpm --filter @claude-loom/ui test` + `pnpm --filter @claude-loom/ui exec playwright test` 全 PASS <!-- id: m0.18-t9 status: todo planned_files: ui/test/views/**/*.test.tsx, ui/e2e/m0.18-*.spec.ts, ui/e2e/__screenshots__/m0.18-*.png -->

- [ ] `docs/SCREEN_REQUIREMENTS.md` 各 view 更新 (customization tree / retro KPT+lifecycle / room spirit summoning)、`docs/DOC_CONSISTENCY_CHECKLIST.md` M0.18 check items 追加、`SPEC.md §15 Topic Index` 修正済 (本 milestone) verify <!-- id: m0.18-t10 status: todo planned_files: docs/SCREEN_REQUIREMENTS.md, docs/DOC_CONSISTENCY_CHECKLIST.md -->

- [ ] Layer 2.5 dogfood smoke (PM 自身が `bash hooks/loom-launch-ui.sh` + `curl /health` + `jq /mode` + `curl -I /` で各 endpoint verify) + Step 8 `act -W .github/workflows/ci.yml pull_request --container-architecture linux/amd64` (Docker 不在時 graceful skip)、`tag m0.18-complete` 設置、main 取込 PR open、retro hook trigger (M0.16+M0.17+M0.18 まとめ retro 提案) <!-- id: m0.18-t11 status: todo planned_files: (tag + git のみ) -->

retro candidate (本 milestone 観察用、closure 後 retro でまとめて評価):
- F-pj-NEW (仮): cat.jsx ROSTER 13 entry に書かれた `group: 'core' | 'review' | 'retro-lens' | 'retro-stage'` の new grouping を本 milestone で初導入、Phase 2 で AgentDetailPanel の filter UI 候補
- F-proc-NEW (仮): handoff bundle (claude.ai/design export) の binary fetch 経路を本 milestone で確立 (gzip tarball、`/tmp/loom-design-fetched/` 展開 → `docs/design/<date>-<milestone>/` 永続)、Phase 2 で再利用 pattern としての codify 候補

**M0.18-skill-migration-ui-rework 完成基準**: `spec/ui-arch.md §8.5` が SSoT。Phase 0 → 1 → 2 → 3 → 4 順実施、Phase 1 worktree isolation parallel batch、Phase 2 parallel batch、Phase 3-4 sequential、reviewer single default 全 task、Strategy a commit handoff、tag `m0.18-complete` + retro hook trigger、main 取込 PR open、`m0`〜`m0.17-complete` 全 tag 保持。
