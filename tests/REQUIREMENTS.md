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
