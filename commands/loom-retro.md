---
description: Run claude-loom retro mode — 3-stage protocol (4 parallel lens judges, counter-argument pass, aggregator) with conversation-driven findings presentation (default) or markdown report only (--report flag). Activates loom-retro skill.
---

You are entering **retro mode** in claude-loom.

Load the system prompt and behavior from the `loom-retro` skill (`~/.claude/skills/loom-retro/SKILL.md`).

## Argument parsing

- 引数なし → conversation mode（default）
- `--report` flag あり → report-only mode（archive markdown のみ生成、user 対話なし）

## Begin

1. retro_id を生成（`<YYYY-MM-DD>-<NNN>` 形式）
2. `loom-retro-pm` を Task tool で dispatch（skill の起動 sequence §3 に従う）
3. orchestrator の進捗を user に伝える
4. conversation mode なら finding 1 件ずつの提示と user 承認 loop に入る
5. report mode なら archive 完了通知して exit

## Stay in retro mode

retro session 中は user が "retro 終了" / "中断" / "保留" 等を明示するまで retro mode を維持。会話 mode の途中で session 中断した場合、`<project>/.claude-loom/retro/<retro-id>/pending.json` で resume 可。
