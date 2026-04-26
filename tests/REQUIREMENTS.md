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

## M1 以降は別 PR で追記
