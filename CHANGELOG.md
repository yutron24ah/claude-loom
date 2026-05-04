# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
