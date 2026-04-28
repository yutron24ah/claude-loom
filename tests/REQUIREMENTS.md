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

## M1 以降は別 PR で追記
