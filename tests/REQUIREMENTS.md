# claude-loom Acceptance Requirements

> 本ファイルは ID 付き受入要件の一覧（claude-blog-skill 流儀）。
> 各 REQ-XXX は対応する test ファイルでカバーされる。

## M0: Dev Harness

- **REQ-001**: `install.sh` 実行で `~/.claude/agents/loom-*.md` のシンボリックリンクが設置される
- **REQ-002**: `install.sh` 実行で `~/.claude/commands/loom-*.md` のシンボリックリンクが設置される
- **REQ-003**: `install.sh` を 2 回実行しても破壊的変更を起こさない（idempotent）
- **REQ-004**: `~/.claude/agents/loom-*.md` に通常ファイルが既存の場合、`install.sh` はエラー終了する
- **REQ-005**: 各 `agents/*.md` ファイルが valid な YAML frontmatter を持つ（name / description フィールド必須）
- **REQ-006**: 各 `commands/*.md` ファイルが valid な YAML frontmatter を持つ（description フィールド必須）
- **REQ-007**: 全 agent 定義の name フィールドが「loom-」プレフィックスで始まる

## M0.5: Approval-Reduction Skills

- **REQ-008**: `install.sh` 実行で `~/.claude/skills/loom-*/` のディレクトリシンボリックリンクが設置される
- **REQ-009**: `~/.claude/skills/loom-*/` が通常ディレクトリ（symlink でない実体）として既存の場合、`install.sh` はエラー終了する
- **REQ-010**: 各 `skills/loom-*/SKILL.md` ファイルが valid な YAML frontmatter を持つ（name / description フィールド必須）
- **REQ-011**: 全 skill 定義の name フィールドが「loom-」プレフィックスで始まる

## M0.7: Conventional Commits + GitHub Flow

- **REQ-012**: `templates/claude-loom/project.json.template` の `rules.commit_prefixes` に CC 11 種すべて（feat / fix / docs / style / refactor / perf / test / build / ci / chore / revert）が含まれる
- **REQ-013**: `templates/claude-loom/project.json.template` の `rules.branch_types` に GitHub Flow 用 10 種すべて（feat / fix / docs / style / refactor / perf / test / build / ci / chore）が含まれる
- **REQ-014**: `docs/COMMIT_GUIDE.md` が存在し、空でない（CC + GitHub Flow ガイドの SSoT）

## M0.8: Retro Architecture

- **REQ-015**: `skills/loom-retro/SKILL.md` が valid な YAML frontmatter（既存 `skills_test.sh` でカバー、新規 test 不要）
- **REQ-016**: 7 つの `agents/loom-retro-*.md` が valid frontmatter + `loom-` prefix（既存 `agents_test.sh` でカバー）
- **REQ-017**: `templates/user-prefs.json.template` と `templates/project-prefs.json.template` が jq empty で valid + `schema_version: 1` フィールド存在
- **REQ-018**: `docs/RETRO_GUIDE.md` が存在 + 非空 + 4 lens 名（pj-axis / process-axis / researcher / meta-axis）言及あり + category enum 列挙あり

## M0.9: Harness Polish

- **REQ-019**: `agents.*` schema validation in user-prefs / project-prefs（jq empty 通る + precedence project > user > frontmatter）
- **REQ-020**: 4 personality preset files が `prompts/personalities/{default,friendly-mentor,strict-drill,detective}.md` に存在、本文非空（default は空 OK）
- **REQ-021**: `agents/loom-developer.md` および全 reviewer agent prompt が `docs/CODING_PRINCIPLES.md` を参照（grep で検証）
- **REQ-022**: 全 13 agent prompt に Customization Layer 参照記述あり（top-level: self-read 指示、dispatched: `[loom-customization]` block 読取指示、dispatcher: 注入指示）。新規 skill `loom-write-plan` / `loom-debug` が valid frontmatter + 必須 section
- **REQ-023**: `install.sh` は `prompts/personalities/` を `~/.claude/prompts/personalities/` に symlink、agent prompt は `~/.claude/prompts/personalities/<preset>.md` 絶対パスで参照（user 他 PJ で claude-loom インストール時に preset md にアクセス可）

## M0.10: git worktree 統合

- **REQ-024**: `skills/loom-worktree/SKILL.md` が valid frontmatter + 必須 6 sections（When to use / Decision tree / Commands / Path convention / Safety rules / Anti-patterns）、`commands/loom-worktree.md` が valid frontmatter、`templates/project-prefs.json.template` に `worktree` section（base_path / auto_cleanup / max_concurrent）含み jq empty で valid、3 agent (loom-pm / loom-developer / loom-retro-pm) prompt が `loom-worktree` を参照。

## M0.11: retro → agent prompt feedback loop

- **REQ-025**: retro lens 4 体 (pj-judge / process-judge / meta-judge / researcher) が finding 出力に `target_artifact` / `target_agent` / `guidance_proposal` field を含む（agent-prompt 行きの場合必須）。`loom-retro-aggregator` が承認 finding を `agents.<target>.learned_guidance[]` (project-prefs default、user 昇格 opt-in) に書き込み。13 agent prompt が `learned_guidance` を read し `[loom-learned-guidance]` block として注入（top-level: self-read、dispatched: dispatcher 注入）。`templates/{user,project}-prefs.json.template` の `agents.<name>.learned_guidance: []` が jq empty で valid。

## M0.12: Coexistence Mode

- **REQ-026**: `templates/claude-loom/project.json.template` に `rules.coexistence_mode` (enum `"full|coexist|custom"`、default `"full"`) + `rules.enabled_features` (array<string>、default `["all"]`) 追加、jq empty で valid。3 dispatcher agent (`agents/loom-pm.md` / `loom-developer.md` / `loom-retro-pm.md`) prompt が `coexistence_mode` を read し runtime gate（feature group 不在なら該当機能 skip）を実装。`commands/loom-mode.md` 新設で mode 切替可能。

## M0.13: Retro Discipline & Process Hardening

- **REQ-027**: `docs/RETRO_GUIDE.md` に retro 基本方針 P1/P2/P3 (自己 + PJ 改善 / user 参加 / action plan 化) 明記、4 retro lens prompt が `freeform-improvement` category instruction を含む（generic 禁止、concrete file/commit 参照必須）、`agents/loom-retro-aggregator.md` の output に action plan セクション必須記述、`agents/loom-pm.md` に parallel dispatch self-verify + Task tool fallback degraded mode + inline spec edit + doc batch 並列化 + reviewer verdict 保存記述、`agents/loom-developer.md` に TDD red commit 時系列 enforcement。`./tests/run_tests.sh` で 8 PASS 維持。

## M1: Daemon + Hooks Foundation

- **REQ-028**: `install.sh` が `hooks/*.sh` を `~/.claude/hooks/` に symlink + `~/.claude/settings.json` に hooks 5 種配線（jq + atomic mv）。`bash install.sh` 後に Claude Code が hook event を daemon に POST 可能。

## M1.5: UI Prep Backend

- **REQ-029**: M0.8-M0.13 feature の UI 要件 (SCREEN_REQUIREMENTS Q1-Q6) に対応する 6 tRPC router (`retro` / `prefs` / `personality` / `worktree` / `coexistence` / `discipline`) を `daemon/src/routes/` に追加、`AppRouter` type に wire-up。`events` router に 3 subscription (`onLearnedGuidanceChange` / `onWorktreeChange` / `onDisciplineMetricUpdate`) 追加。各 router は最低 2 procedure (list + 主要 mutation) + zod schema、`pnpm --filter @claude-loom/daemon test` で全 PASS。frontend (M2) から `import type { AppRouter } from "@claude-loom/daemon"` で 6 router の型推論可能。

## M2: UI Shell

- **REQ-030**: prototype design (`ui/prototype/`) を Vite + React 18 + TS strict + Tailwind の proper 実装に port、tRPC `wsLink` で daemon に接続、vertical slice 1-2 画面で live data pipeline 確立。`pnpm --filter @claude-loom/ui build` 成功 + `pnpm --filter @claude-loom/ui dev` で 9 view (Room / CharSheet / Gantt / Plan / Retro / Worktree / Consistency / Customization / LearnedGuidance) が react-router v6 navigate で表示。AppShell は persistent Room layer + 半透明 panel routing で Phaser 3 mount は M3 へ defer。tokens.css は rgb 形式で `tailwind.config.ts` の variable extend 経由参照、3 theme (`data-theme="pop|dusk|night"`) 切替で root variable 上書き動作。WS 切断時 exponential backoff (1s → 2s → 4s → … → 30s cap) で再接続 + ConnectionBanner 表示 + toast 5 event (`daemon_disconnected` / `daemon_reconnected` / `consistency_finding_new` / `subagent_failed` / `project_added`) 動作。zustand `connectionStore` が `wsLink` の `onOpen` / `onClose` / `onError` callback を bridge。vertical slice として Room の `agentList` subscription または Plan の `planItems` query が daemon → UI まで live で流通。`pnpm --filter @claude-loom/ui test` で全 PASS (visual snapshot + WS retry + toast の 3 種)。

## M2.1: M3-prep Cleanup（verdict_evidence + M0.14 closure）

- **REQ-031**: SPEC §3.9.10（verdict_evidence 概念 + write timing）+ §6.9.5（zod 完全 schema）に整合する形で `agents/loom-retro-pm.md` Stage 0 に verdict_evidence lazy build 5 step（git log → task_id 推定 → transcript reviewer JSON 抽出 → PM hint reference 優先使用 → zod schema validate + file write）記述。`agents/loom-pm.md` milestone tag hook に `[reviewer-dispatch-refs]` block 形式（`task_id=<id>, commit_sha=<sha>, reviewer_agent=<name>, review_mode=<single|trio>` の 1 行 N entries）記述、PM 自身は file write しない（責務分離）。`docs/RETRO_GUIDE.md` に verdict_evidence 運用 SSoT 章追加（lazy build + PM hint + audit 用途）。`docs/DOC_CONSISTENCY_CHECKLIST.md` に M2.1 セクション追加 + M0.13 line 125 の `verdict 保存 hook` 記述を §3.9.10 / §6.9.5 参照に update + M0.14 t6 cleanup 統合（M0.14 t6 closure）。`tests/agents_test.sh` に (a) `agents/loom-retro-pm.md` Stage 0 verdict_evidence build step assertion (b) `agents/loom-pm.md` milestone hook の `[reviewer-dispatch-refs]` block 記述 assertion (c) `agents/loom-retro-process-judge.md` の 3 新 category (`process-permission-friction` / `process-routine-automation-opportunity` / `process-keybind-opportunity`) schema assertion (M0.14 t7 closure) 追加。`./tests/run_tests.sh` で **12 PASS** 維持（既存 12 test files の green 状態維持、agents_test.sh 内 sub-assertion 3 種拡張）。`tag m2.1-complete` 設置、`m0`〜`m2-complete` 全保持。PLAN.md M0.14 セクションに「t6/t7 essence は M2.1 で統合実施、`m0.14-complete` 別 tag 不在のまま PLAN-SSoT 整合化」注記済（pj-003 closure）。
