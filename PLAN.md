---
schema: claude-loom-plan-v1
project_id: claude-loom-self
last_synced_at: 1777194000000
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

## マイルストーン M2: UI Shell

詳細: 未作成（M1 完了後 writing-plans で詳細化）

- [ ] React + Vite + Tailwind 雛形 <!-- id: m2-t1 status: todo -->
- [ ] WebSocket 接続層（exponential backoff、最大 30s） <!-- id: m2-t2 status: todo -->
- [ ] zustand store（state shape 設計） <!-- id: m2-t3 status: todo -->
- [ ] プロジェクト切替コンポーネント <!-- id: m2-t4 status: todo -->
- [ ] サイドバーナビゲーション <!-- id: m2-t5 status: todo -->
- [ ] ダークテーマベース <!-- id: m2-t6 status: todo -->
- [ ] エラー / ローディング / 切断バナー <!-- id: m2-t7 status: todo -->
- [ ] toast 通知システム（5 イベント対応） <!-- id: m2-t8 status: todo -->

## マイルストーン M3: Room View + Plan View + Gantt

詳細: 未作成（M2 完了後 writing-plans で詳細化）

- [ ] Phaser 3 React 内 mount <!-- id: m3-t1 status: todo -->
- [ ] ピクセルルーム基本タイル <!-- id: m3-t2 status: todo -->
- [ ] エージェントスプライト + 状態アニメ（idle/busy/失敗） <!-- id: m3-t3 status: todo -->
- [ ] Plan View 短期レーン（TodoWrite ミラー、read-only） <!-- id: m3-t4 status: todo -->
- [ ] Plan View 長期レーン（plan_items ツリー、編集可） <!-- id: m3-t5 status: todo -->
- [ ] PLAN.md パース + 双方向同期（chokidar） <!-- id: m3-t6 status: todo -->
- [ ] 進捗ビュー（ガントチャート、リアクティブ bar） <!-- id: m3-t7 status: todo -->
- [ ] Session List <!-- id: m3-t8 status: todo -->
- [ ] Agent Detail（履歴 + 注目フラグ） <!-- id: m3-t9 status: todo -->
- [ ] notes 書き込み API + UI <!-- id: m3-t10 status: todo -->

## マイルストーン M4: Doc Consistency Engine v1

詳細: 未作成（M3 完了後 writing-plans で詳細化）

- [ ] PostToolUse(Edit|Write) hook で SPEC 編集検知 <!-- id: m4-t1 status: todo -->
- [ ] spec_changes / consistency_findings テーブル + diff 計算 <!-- id: m4-t2 status: todo -->
- [ ] Phase A: 語彙抽出 + grep スクリーニング <!-- id: m4-t3 status: todo -->
- [ ] Phase B: claude -p subprocess による意味解析 <!-- id: m4-t4 status: todo -->
- [ ] Consistency Findings UI（severity 別、4 アクション） <!-- id: m4-t5 status: todo -->
- [ ] Acknowledge → plan_items 自動追加 <!-- id: m4-t6 status: todo -->
- [ ] バッジ通知 + WebSocket push <!-- id: m4-t7 status: todo -->

## マイルストーン M5: Integration + Polish

詳細: 未作成（M4 完了後 writing-plans で詳細化）

- [ ] frontend-design に渡してピクセルアート確定 <!-- id: m5-t1 status: todo -->
- [ ] エンドツーエンド体験チェック <!-- id: m5-t2 status: todo -->
- [ ] Project Settings 画面 <!-- id: m5-t3 status: todo -->
- [ ] トークン使用量 polling + メーター <!-- id: m5-t4 status: todo -->
- [ ] uninstall.sh + ドキュメント完成 <!-- id: m5-t5 status: todo -->
- [ ] README + リリース準備 <!-- id: m5-t6 status: todo -->
