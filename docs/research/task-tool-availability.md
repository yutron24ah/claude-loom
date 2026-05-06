# Research issue: Task tool availability in Claude Agent SDK

**Status**: Open (subordinate research、Phase 2 中の並行調査、HARD blocker ではない)
**Origin**: retro 2026-05-06-002 F-res-001 (subordinate of F-proc-003)
**Trigger**: 3 retro 連続 degraded mode 持続 (2026-05-05-001 / 2026-05-06-001 / 2026-05-06-002) → SPEC §3.9.13 escalation rule 1 回目 trigger 達成
**Decision context**: SPEC §3.9.13.1 で path C (retro-pm self-review fallback) を SPEC §3.6.8.7 既存 default として追認 + first-class operating mode 化、本 research は subordinate task として並行進行

## 調査目的

Claude Agent SDK / Claude Code harness で **Task tool の利用可否を session 開始時に programmatic に判定する公式手段が存在するか** を upstream 調査する。

### 現状

- 本 retro session 自身を含め、複数 retro / dev session で Task tool が deferred state (ToolSearch 経由でのみ schema fetch 可能) に遭遇
- retro-pm / dev は `ToolSearch query="select:Task" max_results=1` の空結果を degraded mode trigger として運用 (SPEC §3.9.13)、ただしこれは間接 probe であり SDK 公式 API ではない
- M0.11.5 6/6 dev dispatch 全部 path C で pass、Task tool 一貫 deferred 環境での運用 fit を立証

## 調査軸

### 1. Anthropic Claude Agent SDK 公式 capability flag

候補 API surface:
- `available_tools` flag (session capabilities exposure)
- `session.capabilities` field
- `claude.md` / settings.json 制限記述からの導出
- harness 起動 mode (interactive / scheduled / automation) と tool availability の対応関係

調査 path:
- `mcp__context7__query-docs` 経由で `claude-code-sdk` / `@anthropic-ai/sdk` docs を fetch
- WebFetch で Anthropic Agent SDK 公式 docs (https://docs.anthropic.com/...) 探索
- claude-code-sdk repo (GitHub) の README / API reference

### 2. ToolSearch deferred mechanism の実装側 観察

- session 開始時の system prompt にどの tool が直接列挙され、どれが deferred 化されるかの判断基準
- deferred tool の resume condition (initial fetch 後 schema が permanent / per-session か)
- harness 設定 (settings.json) で deferred policy を override する手段の有無

### 3. workaround / coexistence option の codify

仮に「Task tool 利用可否を session 開始時に knowable な公式手段は存在しない」と判明した場合：
- path C を default のまま継続 (現方針)
- ToolSearch probe を retro-pm / dev の標準 Stage 0 step として更に一段 SSoT 強化
- harness mode hint (e.g., interactive vs scheduled) を user-prefs.json で受け取り runtime gate 化

## 想定 outcome

調査結果に応じて 3 path：

- (A) 公式 API 存在 → SPEC §3.9.13 probe protocol を公式 API 経由に置換、ToolSearch probe は fallback 化
- (B) 公式 API 不在 + ToolSearch probe が信頼可能 → 現方針維持、本 doc を closed として archive
- (C) ToolSearch probe 自体が不安定 / 環境依存 → harness mode hint や user-prefs flag 経由の runtime gate を SPEC §3.9.13 拡張で codify

## Out of scope

- Phase 2 entry の HARD blocker にしない (3-strike trigger 後の必須 action items §3.9.13.1 SSoT、path C 昇格で進行を維持)
- 本 doc の closure timing は Phase 2 spec phase で再判定

## References

- SPEC §3.6.8.7 — Reviewer dispatch triple path (path C default)
- SPEC §3.9.13 — Degraded synthesis protocol
- SPEC §3.9.13.1 — 3-strike trigger 後の必須 action items (retro 2026-05-06-002 F-proc-003 由来)
- agents/loom-retro-pm.md — Degraded mode protocol section
- retro 2026-05-05-001 / 2026-05-06-001 / 2026-05-06-002 archives
