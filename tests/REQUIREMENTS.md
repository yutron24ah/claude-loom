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

## M3.0: Room View（Phaser mount + ピクセル世界観）

- **REQ-032**: SPEC §3.6.9.1（Phaser 3 React 内 mount = 自前 `useEffect` + `useRef`）に整合する形で `ui/src/views/RoomView/` に Phaser game instance mount component を実装。`useEffect(() => { gameRef.current = new Phaser.Game(config); return () => gameRef.current?.destroy() }, [])` lifecycle、HMR `import.meta.hot.dispose` で `game.destroy()` で memory leak ゼロ。tile map JSON + tokens.css `var(--color-bg)` 連携で 3 theme (pop/dusk/night) 切替動作。Agent sprite が `agent_id ↔ sprite 1:1 mapping` で daemon `agent` subscription event を受けて状態 (idle/busy/失敗) 切替アニメ動作。vertical slice として 1 PJ の agent_pool 全 sprite が Room View に live 表示。`pnpm --filter @claude-loom/ui test` で全 PASS（既存 + Phaser mount/unmount lifecycle test 追加）。`tag m3.0-complete` 設置、`m0`〜`m2.1-complete` 全保持。

## M3.1: Plan View + Gantt + 双方向同期

- **REQ-033**: SPEC §3.6.9.2（PLAN.md 双方向同期 = hybrid debounce + last-write-wins + `plan_conflict_detected` toast）+ §3.6.9.3（Gantt = 自前 SVG）+ §3.6.9.4（toast 6 event 化）+ §3.6.9.7（Visual regression check = Playwright e2e、res-001 確定）に整合する形で実装。Plan View 短期 (TodoWrite mirror) が daemon `todoChange` subscription で live 更新。Plan View 長期 (plan_items) tree edit が GUI → daemon → DB 流通、500ms debounce で write-back。PLAN.md 外部 edit を chokidar 検知 → daemon → UI へ push、conflict 時 `plan_conflict_detected` toast push + localStorage backup（GUI 側 change を保持、user 手動 restore 可）。Gantt SVG が plan_items 進捗を `<rect>` bar + `<line>` grid + `<text>` label で描画、3 theme 切替で `var(--color-bar)` 即反映、bar click で Agent Detail navigate。Playwright e2e infra 導入（`@playwright/test` devDep、`ui/e2e/` dir、`pnpm --filter @claude-loom/ui e2e` script、CI workflow 並列 step）+ Room View pop theme screenshot baseline 1 件確立（`expect(page).toHaveScreenshot()` で green、test 大量化は M3.2 以降に分配）。`pnpm --filter @claude-loom/ui test` 全 PASS（debounce / conflict toast / Gantt SVG render test 追加、既存 vitest test の green 状態保持）、`pnpm --filter @claude-loom/ui e2e` 全 PASS、`pnpm --filter @claude-loom/daemon test` 全 PASS（chokidar + debounce + conflict resolution test 追加）。`tag m3.1-complete` 設置、`m0`〜`m3.0-complete` 全保持。

## M3.2: Session List + Agent Detail + notes

- **REQ-034**: Session List で filter (project/role) + sort (started_at) 動作、daemon `session` subscription で live 更新。Agent Detail で dispatch 履歴表示 + 注目フラグ書込（daemon `agent.markAttention` mutation）動作。notes 書込（daemon `note.create` mutation）で plan_items にひも付き、Agent Detail から添付可能。`pnpm --filter @claude-loom/ui test` 全 PASS、`pnpm --filter @claude-loom/daemon test` 全 PASS。`tag m3.2-complete` 設置、`m0`〜`m3.1-complete` 全保持、これで M3 系列 closure（Phase 1 MVP の core experience 完成）。

## M5: Integration + Polish (uninstall)

- **REQ-036**: `uninstall.sh --dry-run --yes` 実行では symlink は削除されない（変更なし）
- **REQ-037**: `install.sh` 実行後に `uninstall.sh --yes` を実行すると agents / commands / skills の全 loom-* symlink が削除される（install → uninstall round-trip）
- **REQ-038**: `uninstall.sh --yes` のデフォルト動作では `.claude-loom/` local state は保持される
- **REQ-039**: `uninstall.sh --yes --purge-state` 実行で `.claude-loom/` ディレクトリが削除される
- **REQ-040**: `uninstall.sh --yes` は exit code 0 で完了する

## M0.11.1: Lifecycle Tracking Architecture

- **REQ-035**: SPEC §3.9.11（Lifecycle Tracking Architecture）+ §6.9.6（pending.json schema v2、`applied_in` + `apply_history` field）+ §6.9.7（applied_summary.json schema、retro-pm Stage 0 lazy build 5 step）+ §6.9.4.5（learned_guidance auto-prune rule、`ttl_sessions` main + `last_used_in` audit hybrid）に整合する形で実装。`agents/loom-retro-pm.md` Stage 0 で過去全 retro session の pending.json scan + applied_findings 集約 → `<project>/.claude-loom/retro/<retro_id>/applied_summary.json` write 動作。4 lens（pj-judge / process-judge / meta-judge / researcher）の dispatch prompt prefix に `applied_summary_path: <path>` 注入、lens は `Read` tool で参照、stale check を Stage 1 内で自前実行。`agents/loom-retro-counter-arguer.md` の stale finding detection section（M3.0 retro proc-NEW-1 由来）を **物理削除**（SPEC §3.9.x P4 理想形「symptomatic patch 構造的解決後の rollback」初例として archive）。`agents/loom-retro-aggregator.md` に learned_guidance auto-prune logic（ttl_sessions auto-deactivate + last_used_in update）追加。既存 4 retro session（2026-04-29-001 / 2026-05-02-001 / 2026-05-02-002 + 古い 1 件確認）の pending.json に `applied_in` + `apply_history` field 後付け migration script 完了 + schema_version 1 → 2 migrate。`templates/{user,project}-prefs.json.template` に `last_used_in` field example 追加。`tests/{prefs,retro,agents}_test.sh` で `applied_in` schema + `applied_summary` build + auto-prune assertion + counter-arguer stale check section 不在 assertion 追加。dry-run test で applied_summary mechanism 動作確認（rollback 前安全網）。`./tests/run_tests.sh` で **13 PASS** 維持（既存 12 + 新規 `dry_run_applied_summary_test.sh` = 13）。`tag m0.11.1-complete` 設置、`m0`〜`m3.0-complete` 全保持。

## M5 t1: Frontend Design Handoff

- **REQ-041**: `docs/PIXEL_ART_HANDOFF.md` が存在 + 非空 + 4 section 以上含む。Vision section（SPEC §12 ビジュアル方向性）、placeholder state section（13 agent sprite identifier + tile map + 3 theme color token）、制作 option section（Option A/B/C/D）、post-MVP migration plan section を含む。`tests/docs_pixel_art_test.sh` でカバー。

## M5 t6: README + リリース準備

- **REQ-042**: `README.md` に `## ライセンス` section 存在（placeholder 許容）、`Phase 1 MVP` 完成記述あり、`M5` milestone 言及あり、`Phase 2 以降` section 存在。`CHANGELOG.md` に `[0.1.0]` entry 存在かつ `### Added` section 非空。root `package.json` / `daemon/package.json` / `ui/package.json` に `version` field（文字列型）存在。`tests/docs_release_test.sh` でカバー。

## M5 t2: End-to-end Verification

- **REQ-043**: `docs/M5_E2E_REPORT.md` が存在・非空・5 section（Executive summary / 7 verification / follow-up / Phase 2 / 結論）含む。`tests/m5_e2e_test.sh` が 7-stage aggregate harness として動作（route integrity 静的 check + install/uninstall round-trip check + deliverables check）。`bash tests/run_tests.sh` で **17 PASS** 達成（m5_e2e_test.sh 追加）。`pnpm --filter @claude-loom/daemon test` / `pnpm --filter @claude-loom/ui test` / `pnpm --filter @claude-loom/ui e2e` / `pnpm --filter @claude-loom/daemon build` + `pnpm --filter @claude-loom/ui build` が全て pass（UI build blockers — NOTE_ATTACHED_TYPE browser-safe 化 + process.env → import.meta.env 修正を含む）。Phase 1 MVP closure 認定。`tests/m5_e2e_test.sh` でカバー。

## M0.11.3: UI Smoke Test Skill

- **REQ-044**: SPEC §3.6.11（UI Smoke Test Skill）+ §10.4（Browser-interactive verification layer）に整合する形で `skills/loom-ui-smoke/` 新設。`SKILL.md` が valid frontmatter（name = `loom-ui-smoke` / description 必須）+ Stage 1 戦略 derive prompt + Stage 2 Playwright MCP `browser_*` tool 駆動 instruction（deterministic order）+ Stage 3 report 生成手順を含む。`scripts/format-report.sh` が deterministic report formatter として動作（`docs/smoke-tests/<date>-<scope>/report.md` + `findings.json` 生成、`templates/findings.schema.json` で JSON schema validate）。`scripts/start-servers.sh` が hybrid Option C 補助（port 5757/5173 listen 確認、`--auto-start` flag 対応）。`commands/loom-ui-smoke.md` slash command が valid frontmatter で `--scope=full|route:<name>|smoke-only` parameter 認識。`agents/loom-developer.md` + `agents/loom-pm.md` に suggest skill 参照記述（§3.6.11.10 Consumer agents）+ milestone closure 自律 invoke logic（loom-pm のみ）追記。skill self-test: main HEAD で `/loom-ui-smoke` 実行、hotfix 完了後の 4 bug fix 状態を browser smoke verify、`docs/smoke-tests/<date>-<scope>/` に成果物生成 + `findings.json` JSON schema validate pass。`bash tests/run_tests.sh` で **18 PASS** 達成（skills_test.sh + commands_test.sh 拡張で loom-ui-smoke カバー）。`tag m0.11.3-complete` 設置、`m0`〜`m5-complete` 全保持。

## M0.11.4: Design Implementation Pass (aesthetic MVP completion)

- **REQ-045**: SPEC §3.6.12（Design Implementation）+ §3.6.9.1 改訂 (Phaser α-1 → DOM/SVG α-2 strategy A) に整合する形で `claude-room-handoff.zip` design bundle を full port。`ui/src/components/CatSprite.tsx` (16x16 pixel grid SVG、9 hat × 3 pose、`shapeRendering="crispEdges"` + `image-rendering: pixelated`) + `ui/src/data/roster.ts` (13 agent metadata: id / role / jp / name / breed / quote / hat / fur / cheek / group)。`ui/src/styles/tokens.css` に 3 theme palette (`:root` + `.theme-dusk` + `.theme-night`、各 25+ `--p-*` variable) + RPG primitives (`.rpg-frame` / `.rpg-frame-tight` / `.rpg-title` / `.rpg-label` / `.dot` / `.chip` / `.exp-bar` / `.btn-px` 5 variant) + Room primitives (`.room-*` / `.room-poster-*` / `.room-island-*` / `.room-modal-*` / `.subroom-*`)。`ui/src/views/room/` 全面書直し (RoomBackground / DeskStation / wall-posters Gantt+Plan+Consistency / Islands / SubroomClone / AgentDetailPanel / RetroGathering / RoomView orchestration)。15 view port (PlanView / GanttView / ConsistencyView / RetroView / CharSheet / ThemeShowcase / WorktreeView / SubroomView / CustomizationView / LearnedGuidanceView + 既存 view 全面書直し)。新 view (SessionListView / TokenMeterView / ProjectSettingsView) を RPG 言語で 新規設計、Sidebar + DisciplineHeader RPG style update。`ui/package.json` から `phaser` dependency 削除 + `ui/src/views/room/{PhaserCanvas.tsx,scenes/RoomScene.ts,agentSpriteSync.ts}` 物理削除。Playwright e2e baseline 再生成 (3 theme: room-pop.png + room-dusk.png + room-night.png)。`loom-ui-smoke` skill full scope execute、`docs/smoke-tests/<date>-m0.11.4-aesthetic-verify/` に成果物生成、design vision 達成確認。`bash tests/run_tests.sh` で 18 PASS 維持、`pnpm --filter @claude-loom/ui test` 全 PASS、`pnpm --filter @claude-loom/ui e2e` 全 PASS。`tag m0.11.4-complete` 設置 (aesthetic MVP completion marker)、`README.md` 「Phase 1 MVP completed」記述を完全達成 marker に update、`m0`〜`m0.11.3-complete` 全保持。

## M0.11.5 hotfix: install.sh daemon symlink bootstrap

- **REQ-046**: `install.sh` 実行で `~/.claude-loom/daemon.js` symlink が `<project>/daemon/dist/index.js` を指す形で配置される。SPEC §3.2 lazy daemon auto-launch flow が機能するための前提整備（M0.11.5 retro 2026-05-06-001 F-USER-001 critical hotfix、loom-launch-ui.sh が `DAEMON_BIN=$HOME/.claude-loom/daemon.js` を参照しとるが install.sh に bootstrap step 不在）。`tests/install_test.sh` の REQ-046 assertion でカバー。`daemon/dist/index.js` が存在しない場合は warning log + skip（idempotent）、build 後の再 install で symlink 設置完了。

## M0.11.7: PM Auto-Go Entry

- **REQ-047**: `agents/loom-pm.md` に Spec Phase Completion Hook（PM Auto-Go Entry）が追加され、SPEC §3.6.8.10 を SSoT として参照し、3 軸 AND 条件 / 3 信頼レベル分岐 / `/loom-go` override 動作 / impl keyword list（spec keyword list と分離）/ 既存 M0.11.6 Session Start Hook 構造の維持を含む。`tests/m0117_t3_loom_pm_auto_go_test.sh` でカバー。

- **REQ-048**: `agents/loom-pm.md` の Spec Phase Completion Hook section 内 2 placeholder（impl intent keyword list / 確認 prompt template）が実内容で埋まっていること。impl 系 keyword list が 10 個以上（着手・kick off 等含む）かつ spec 系 keyword list（M0.11.6）と分離維持。高信頼 template に `/loom-spec` + `/loom-status` bypass option 明示。中信頼 3 択 template（impl 開始 / spec 修正 / status 確認）が記述済み。`tests/m0117_t4_t5_placeholders_test.sh` でカバー。

## M0.X-runtime-mode-recovery t4: /mode probe + Vite redirect in loom-launch-ui.sh

- **REQ-050**: `hooks/loom-launch-ui.sh`
<!-- NOTE: REQ-050 is used by t4 task above -->

## M0.X-runtime-mode-recovery t8: post-install stale tsx watch detection

- **REQ-051**: `install.sh` post-install check で stale tsx watch プロセス（`tsx.*server.ts` pattern）を `pgrep -f` で検出、存在時 WARNING + PID リスト + cleanup suggestion 出力（zombie 自動 kill なし、user 明示提案のみ）。pgrep 不在 / エラー時は `|| true` で graceful fallback し install.sh exit 0 を維持。`tests/install_post_check_test.sh` でカバー（zombie あり / なし / pgrep unavailable 3 scenario）。 の warm-start path (health-check 通過後) が `/mode` endpoint を probe し mode に応じて分岐する (SPEC §3.2.2 dev daemon 検出時の lazy launch 挙動 4 step 準拠)。`mode=dev` かつ Vite (`LOOM_VITE_URL` override 対応、default `:5173`) 応答あり → Vite URL を browser open + stdout。`mode=dev` かつ Vite 応答なし → warning log (stderr) + Vite URL stdout のみ (browser open skip)。`mode=prod` warm → 既存挙動 (browser open skip)。`/mode` endpoint fail / unparseable → 既存挙動 fallback (browser open skip)。`tests/loom_launch_ui_mode_probe_test.sh` でカバー。

## M0.X-runtime-mode-recovery t2/t3: /mode endpoint + LOOM_DEV_MODE switch

- **REQ-049**: `daemon/src/server.ts` の static serving 判定が `LOOM_DEV_MODE` env var ベース（`isDevMode = !!process.env.LOOM_DEV_MODE`、`NODE_ENV` 依存を deprecate）に切替済みかつ `GET /mode` endpoint が SPEC §3.2.1 shape（`mode` / `entry` / `version` / `started_at` / `pid` / `ui_serving` 6 fields）を返す。`LOOM_DEV_MODE` truthy → `mode=dev` + `ui_serving=false`、unset + ui/dist 存在 → `mode=prod` + `ui_serving=true`、unset + ui/dist 不在 → `mode=prod` + `ui_serving=false`。`LOOM_ENTRY` 各値（`lazy-launch` / `pnpm-dev` / `manual`）が `/mode` response の `entry` field に反映。`pnpm --filter @claude-loom/daemon test test/server-mode-endpoint.test.ts` 13 PASS、`test/server-static.test.ts` 11 PASS（`NODE_ENV` mutation → `LOOM_DEV_MODE` mutation 移行済み）。

## M0.X-runtime-mode-recovery t7: /loom-stop --all zombie cleanup

- **REQ-052**: `hooks/loom-stop.sh` が `--all` flag に対応する。引数なしは既存挙動（graceful shutdown 1 daemon、fail-silent）を維持。`--all` では (1) POST /shutdown 試行、(2) daemon.pid stale kill、(3) `pgrep -f "tsx.*server\.ts"` zombie kill、(4) `pgrep -f "node.*\.claude-loom/daemon\.js"` manual launch kill、(5) killed/not-found report を stdout 出力、(6) best-effort exit 0。`commands/loom-stop.md` が `--all` flag description を含む。テスト専用 `LOOM_TEST_ZOMBIE_PIDS` env var で mock PID 直接指定可能。`tests/loom_stop_all_test.sh` でカバー。

## M0.X-runtime-mode-recovery t5/t6: pnpm dev preflight + LOOM_DEV_MODE auto-inject

- **REQ-053**: `daemon/package.json` の `dev` script が `LOOM_DEV_MODE=1 LOOM_ENTRY=pnpm-dev` を auto-inject + `bash scripts/pnpm-dev-preflight.sh` を tsx watch 起動前に invoke。`daemon/scripts/pnpm-dev-preflight.sh` が SPEC §3.2.2 prod daemon 検出時挙動を実装: `/health` + `/mode` probe で `mode=prod` 検出 → ERROR + PID + entry を stderr に出力して exit 1 (tsx watch 起動ブロック)、dev daemon / daemon 不在 / probe fail は exit 0 (graceful)。`tests/m0x_t5_t6_preflight_test.sh` でカバー (13 scenario)。

## M0.X-runtime-mode-recovery t11: daemon runtime mode E2E smoke test

- **REQ-054**: `tests/daemon_runtime_mode_test.sh` が 3 boot scenario の integrated E2E smoke test を提供する。(1) prod mode (LOOM_ENTRY=lazy-launch): `/mode` → `mode=prod` + `entry=lazy-launch` + `ui_serving=true` (ui/dist 存在時)、`/` → 200 + HTML。(2) dev mode (LOOM_DEV_MODE=1 LOOM_ENTRY=pnpm-dev): `/mode` → `mode=dev` + `entry=pnpm-dev` + `ui_serving=false`、`/` → 404 (static skip 確認)。(3) manual mode (env なし): `/mode` → `mode=prod` + `entry=manual` + SPEC §3.2.1 規定 6 fields 全存在確認。test port は 15870–15872 (既存 test 15850–15863 と衝突なし)、`LOOM_PORT` env var で daemon が custom port を受け付ける (CLI entry の default 5757 を override)。`tests/daemon_runtime_mode_test.sh` でカバー (15 assertion)。

## M0.X-runtime-mode-recovery hotfix: start_daemon port bind verify (Bug A)

- **REQ-055**: `hooks/loom-launch-ui.sh` の `start_daemon()` が `nohup` 後に `/health` polling (default 5 attempts × 0.5s) で実際の port bind 成功を verify する。verify 失敗時は exit 1 を返し `main()` が `open_browser` を skip（Bug A 修正: nohup success ≠ port bind success）。env override `LOOM_DAEMON_BOOT_MAX_ATTEMPTS` で polling 試行数を制御可能（test fixture 用）。`while [ "$i" -le ... ]` POSIX 互換ループ使用（bash 3.x 対応）。happy path (daemon が /health で応答) では依然 exit 0 を返し open_browser が呼ばれる（regression 防止）。`tests/loom_launch_ui_bug_a_test.sh` でカバー（Test A: dead daemon → no browser / Test B: healthy daemon → browser called / Test C: attempt override effective）。既存 `tests/loom_launch_ui_test.sh` test 7 fixture が fake_node でバックグラウンド HTTP server を起動する形に更新（Bug A fix との整合）。SSoT: SPEC §3.2.3 (Boot health-check polling) — retro 2026-05-06-003 F-pj-002 で codify。
