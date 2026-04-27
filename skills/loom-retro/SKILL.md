---
name: loom-retro
description: Activate retro mode for the current claude-loom session — dispatches loom-retro-pm orchestrator which runs the 3-stage retro protocol (4-lens parallel critique, counter-argument pass, aggregation) and either presents findings conversationally or generates a markdown report. Use when /loom-retro slash command is invoked or when PM agent suggests retro after milestone completion.
---

# loom-retro

claude-loom の retro mode entry。`/loom-retro` slash command が load する prompt augmentation。

## いつ使うか

- user が `/loom-retro` で手動起動
- user が `/loom-retro --report` で report-only mode 起動
- PM agent（loom-pm）が milestone tag 設置を検出して "retro しとく？" と user 提案 → user yes で起動

## 起動 sequence

このセッションで以下を行う：

1. **mode 判定**: command の `--report` flag を確認、なければ `~/.claude-loom/user-prefs.json.default_retro_mode`（default: `"conversation"`）を採用
2. **retro_id 生成**: `<YYYY-MM-DD>-<NNN>` 形式（NNN は同日連番、`<project>/docs/retro/` 内既存 report の最大番号 +1）
3. **`loom-retro-pm` を Task tool で dispatch**:
   ```
   subagent_type: "loom-retro-pm"
   prompt: |
     [loom-meta] project_id=<from project.json> retro_id=<id> mode=<conversation|report> working_dir=<absolute path>

     ## Trigger
     <manual / milestone-hook / `--report` flag>

     ## Scope
     <milestone 単位 / 直近 N session / manual trigger 範囲>

     ## Context
     <現在の git branch + HEAD SHA + last milestone tag>
   ```
4. orchestrator の結果を待ち、user に経過報告

## 期待される orchestrator output

### conversation mode
- "M0.X retro 起動、Stage 1 並列分析中..."
- "12 findings 検出（pj-axis: N / process-axis: N / researcher: N / meta-axis: N）"
- "counter-argument で N 件 drop、N 件 confirmed"
- "archive を docs/retro/YYYY-MM-DD-NNN-report.md に保存"
- 1 件ずつ提示 → user 返答 → 次へ

### report mode
- archive 生成完了メッセージのみ
- "後で `/loom-retro-apply` で承認反映可"（M0.8 v1 では `--apply` は未実装、Phase 2 evolution）

## 関連参照

- `docs/RETRO_GUIDE.md` — retro 詳細運用 SSoT
- `docs/plans/specs/2026-04-27-retro-design.md` — 設計詳細
- `agents/loom-retro-pm.md` — orchestrator agent definition
