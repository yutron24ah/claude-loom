# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed (M0.X-skill-migration — branch `docs/agent-prompt-design`、2026-05-17)

Architectural cleanup: 10 agents (4 reviewer + 6 retro lens/aggregator/counter-arguer) を 2 skills に統合、agent prompt design principle (2-layer structure) を SSoT として確立。残存 agent は loom-pm / loom-developer / loom-retro-pm の 3 persistent role のみ。

- **Added**:
  - `docs/AGENT_PROMPT_DESIGN.md` — agent prompt 設計原則 SSoT (2-layer structure / 6 anti-patterns / 5 good patterns / size guideline / migration 手順 / 9-item verification checklist)
  - `docs/SKILL_MIGRATION.md` — 10 agents → 2 skills migration plan + 完了記録
  - `SPEC.md §3.10.2` — agent prompt 設計原則 SSoT pointer
  - `templates/{user,project}-prefs.json.template` `skills.*` schema 拡張 — skill-keyed customization (loom-review.strategies.* / loom-retro.lenses.* / loom-retro.stages.*)
- **Changed**:
  - `agents/loom-pm.md` (545 → 264 行、51% 圧縮) — 2-layer design 第一号適用、Mission / Character / Hard constraints + interface contracts のみ codify
  - `agents/loom-retro-pm.md` (368 → 220 行、40% 圧縮) — slim orchestrator として retro skill 経由 dispatch chain に書換
  - `agents/loom-developer.md` (274 → 240 行、12% 圧縮) — review dispatch を loom-review skill 経由の `general-purpose` subagent + skill template injection に統一
  - `skills/loom-review/SKILL.md` (83 → 274 行) — single + trio strategy 統合、aspect template (code / security / test) 内包
  - `skills/loom-retro/SKILL.md` (56 → 384 行) — Stage 0-3 protocol + 4 lens template + COUNTER_ARGUER_TEMPLATE + AGGREGATOR_TEMPLATE 統合
  - `skills/loom-ui-smoke/SKILL.md` (507 → 468 行) — obsolete Phase 2 carryover / Stage 2 dev SSoT section 削除、Pre-flight checklist verbose bash echo 圧縮
  - `skills/loom-tdd-cycle/SKILL.md` Step 6 — review dispatch を loom-review skill 経由に更新
  - SPEC §3.9 (Retro architecture) を agent-centric → skill-centric に改訂、関連 §3.6.5 / §3.6.10 / §3.10 / §4 / §5 / §9 directory tree も整合更新
  - CLAUDE.md / README.md / README.ja.md / docs/RETRO_GUIDE.md / docs/DOC_CONSISTENCY_CHECKLIST.md / tests/REQUIREMENTS.md — deleted agent ref を skill template ref に rewire
- **Removed**:
  - `agents/loom-reviewer.md` / `loom-code-reviewer.md` / `loom-security-reviewer.md` / `loom-test-reviewer.md` (合計 484 行)
  - `agents/loom-retro-pj-judge.md` / `loom-retro-process-judge.md` / `loom-retro-meta-judge.md` / `loom-retro-researcher.md` / `loom-retro-counter-arguer.md` / `loom-retro-aggregator.md` (合計 1,300 行)
  - `skills/loom-review-trio/SKILL.md` (loom-review に統合)
  - 6 obsolete tests — m0116_t2-t6 / m0117_t2-t5 placeholders / m0116_t3 loom-pm hook test (verbose Session Start Hook の anti-pattern を enforce していた)
- **Total impact**: 13 agents → 3 agents (77% 削減)、合計 1,484 行の agent prompt 削除 + 2 skill (~650 行) に統合 = 56% 行数削減。本 cleanup は Phase 2 milestone candidates の前提条件、`refactor/daemon-cleanup` 別 milestone への road map clean state 達成

## [0.1.0] - 2026-05-04

Phase 1 MVP — dogfood 方式で M0〜M5 を完走した最初の完成形リリース。

### Added

- **M0 harness bootstrap**: PM / Developer / Code+Security+Test Reviewer agents、slash commands（/loom-pm / /loom-spec / /loom-go）、`install.sh` + `~/.claude/` symlink 管理
- **M0.5/M0.6 skills**: loom-tdd-cycle / loom-review / loom-review-trio / loom-test / loom-status の 5 skill
- **M0.7 Conventional Commits + GitHub Flow**: commit prefix 11 種 + branch type 10 種の規約、`docs/COMMIT_GUIDE.md`
- **M0.8 Retro Architecture**: 4-lens（pj-axis / process-axis / researcher / meta-axis）+ 3-stage protocol（lens → counter-arguer → aggregator）、user-prefs / project-prefs による設定永続化
- **M0.9 Customization Layer**: agent ごとの model + personality preset 設定、4 preset 同梱（default / friendly-mentor / strict-drill / detective）
- **M0.10 git worktree 統合**: loom-worktree skill + /loom-worktree コマンド、5 用途（並列 dev / 安全実験 / branch 比較 / hotfix 隔離 / 一時 review）
- **M0.11/M0.11.1 Retro feedback loop + Lifecycle Tracking**: learned_guidance の agent prompt 自動注入、applied finding の永続状態管理（pending.json schema v2 + applied_summary.json）
- **M0.12 Coexistence Mode**: full / coexist / custom の 3 mode、5 feature group（core / retro / customization / worktree / native-skills）、/loom-mode コマンド
- **M0.13 Retro Discipline & Process Hardening**: parallel dispatch / TDD red commit 時系列 / Task tool fallback / doc batch parallelism の 4 規律強制
- **M0.14 commit handoff strategy**: Strategy a（dev self-commit）/ Strategy b（PM 統合 commit）の明確化
- **M1 Daemon Foundation**: Node.js LTS + TypeScript strict + Fastify + tRPC + Drizzle + better-sqlite3（SQLite）、11 tables、127.0.0.1:5757、bash hooks → POST /event → DB → WS subscriptions
- **M2 UI Shell**: React 18 + Vite + TypeScript strict + Tailwind + Phaser + tRPC wsLink、AppShell + 9 views（Room / CharSheet / Gantt / Plan / Retro / Worktree / Consistency / Customization / LearnedGuidance）、WS exponential backoff retry + ConnectionBanner + toast 5 event
- **M2.1 verdict_evidence**: loom-retro-pm Stage 0 lazy build 5 step、loom-pm milestone hook に `[reviewer-dispatch-refs]` block
- **M3.0 Room View**: Phaser 4 自前 useEffect mount、agent sprite 1:1 mapping、3 theme（pop/dusk/night）、HMR memory leak ゼロ
- **M3.1 Plan View + Gantt + 双方向同期**: Plan View 短期/長期 GUI、chokidar + 500ms debounce + last-write-wins、`plan_conflict_detected` toast + localStorage backup、Gantt SVG（自前 rect/line/text）、Playwright e2e baseline
- **M3.2 Session List + Agent Detail + notes**: filter/sort 付き Session List、Agent Detail + markAttention mutation、notes → plan_items 添付
- **M4 Doc Consistency Engine v1**: PostToolUse hook でファイル変更検知、Phase A diff calc（`daemon/src/consistency/`）、Phase B `claude -p` による inconsistency 自動検出、Acknowledge → plan_items 書込 + WS push
- **M5 Integration + Polish**: Project Settings 画面（project.json GUI 編集）、Token meter（polling + プログレスバー）、`uninstall.sh`（`--yes` / `--dry-run` / `--purge-state` オプション）、handoff docs、README Phase 1 MVP 完成版

### Security

- Daemon は `127.0.0.1` bind のみ（localhost、外部公開禁止）
- Auth token を `~/.claude-loom/daemon-token`（chmod 600）に保存
- Coexistence Mode（M0.12）で `coexist` mode 選択時は minimal feature set のみ install、既存 PJ への影響を最小化

[Unreleased]: https://github.com/yutron24ah/claude-loom/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yutron24ah/claude-loom/releases/tag/v0.1.0
