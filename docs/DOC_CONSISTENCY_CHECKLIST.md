# Doc Consistency Manual Checklist

> M4 で自動化される（doc 整合性エンジン v1）まで、SPEC を変更したらこのチェックリストを **PM が必ず実行** する。

## 手順

### 1. 変更内容の把握

```bash
git diff SPEC.md
# あるいは前回 commit からの差分
git diff HEAD~1 SPEC.md
```

### 2. 影響範囲の洗い出し

以下のドキュメントについて、SPEC 変更の影響を確認：

- [ ] `README.md` — ユーザー向け説明と齟齬がないか
- [ ] `CLAUDE.md` — 作業規約に変更が必要か
- [ ] `PLAN.md` — マイルストーン / タスクに追加・削除が必要か
- [ ] `docs/SCREEN_REQUIREMENTS.md` — 画面要件に波及するか
- [ ] `docs/plans/*.md` — 進行中の詳細プランに波及するか
- [ ] `tests/REQUIREMENTS.md` — 受入要件 ID の追加・削除が必要か
- [ ] `agents/*.md` — agent system prompt の振る舞いに変更が必要か
- [ ] `commands/*.md` — slash command の挙動に変更が必要か

### 3. 検出語彙の grep（軽量チェック）

SPEC で削除・変更された主要語句を grep：

```bash
# 例：SPEC から ANTHROPIC_API_KEY が消えた場合
grep -rn "ANTHROPIC_API_KEY" --include="*.md" .
```

### 4. ユーザー承認

影響を受ける可能性のあるドキュメント一覧を user に提示：

- 影響なし → 確認だけ報告
- 影響あり → 該当箇所を user 承認の上で更新

### 5. 更新の commit

ドキュメント更新は SPEC 変更とは別 commit に分ける：

```bash
git add <updated docs>
git commit -m "docs: align with SPEC update (X 機能)"
```

## 例：典型的なケース

### Case A: SPEC §X の削除

- 関連 grep → 言及のあるドキュメント特定 → 削除 / 書き換え

### Case B: 用語の rename

- 旧用語を grep → 全置換（手動確認しながら）

### Case C: スキーマ変更

- DB スキーマ変更 → 関連する SCREEN_REQUIREMENTS / EVENT_SCHEMA も更新

## このチェックリスト自体の改善

M4（doc 整合性エンジン v1）実装時に検出ルールを抽出する元データとして本チェックリストを使う。手で運用しながら気付いた検出パターンを追記すること。

## M0.9 Customization Layer 関連 check

SPEC `§3.6.5` / `§6.9.4` を編集した時：

- [ ] `templates/user-prefs.json.template` の `agents.*` 例が schema と一致
- [ ] `templates/project-prefs.json.template` の `agents.*` 例が schema と一致
- [ ] `docs/RETRO_GUIDE.md` の retro lens 観測対象に customization state が記述されとる
- [ ] `agents/loom-{pm,developer,reviewer 群,retro-* 群}.md` の Customization Layer 参照記述が schema 変更に追従
- [ ] `prompts/personalities/*.md` の preset 名と SPEC §6.9.4.4 の同梱表が一致

`docs/CODING_PRINCIPLES.md` を編集した時：

- [ ] `agents/loom-developer.md` の Coding Principles セクションが現行 13 原則を参照（追加/削除があれば反映）
- [ ] 全 reviewer agent prompt（`loom-reviewer.md` / `loom-code-reviewer.md` / `loom-test-reviewer.md`）の review 観点が CODING_PRINCIPLES.md と整合
- [ ] `README.md` で言及されとる原則数（13）が一致

## M0.10 Worktree 関連 check

`skills/loom-worktree/SKILL.md` を編集した時：

- [ ] Decision tree の 5 用途と SPEC §3.6.6.1 が一致
- [ ] Path convention で参照する `project-prefs.worktree.base_path` の placeholder 仕様と template が一致
- [ ] 3 agent (loom-pm / loom-developer / loom-retro-pm) prompt の Worktree section が skill 仕様と整合
- [ ] README の worktree 入門が skill / SPEC と整合

## M0.11 learned_guidance + lens tagging 関連 check

SPEC §3.6.5.4 / §3.9.x / §6.9.4 を編集した時：

- [ ] `templates/{user,project}-prefs.json.template` の `agents.<name>.learned_guidance` example が schema と一致
- [ ] `docs/RETRO_GUIDE.md` の lens tagging convention が SPEC §3.9.x と一致
- [ ] 4 retro lens (`agents/loom-retro-{pj,process,meta}-judge.md` + `loom-retro-researcher.md`) prompt が `target_artifact / target_agent / guidance_proposal` field 出力を記述
- [ ] 13 agent prompt の Customization Layer section が `learned_guidance` 注入経路を記述
- [ ] `agents/loom-retro-aggregator.md` の write logic が schema 仕様と整合
- [ ] `agents/loom-retro-counter-arguer.md` が tag fields を verdict pass 通過時に preserve

## M0.12 Coexistence Mode 関連 check

SPEC §3.6.7 / §3.7 / §6.9 を編集した時：

- [ ] `templates/claude-loom/project.json.template` の `rules.coexistence_mode` enum 値と SPEC §3.6.7.1 が一致
- [ ] `rules.enabled_features` array の feature group 名と SPEC §3.6.7.2 が一致
- [ ] 3 dispatcher agent (`loom-pm` / `loom-developer` / `loom-retro-pm`) prompt の runtime gate 記述が SPEC §3.6.7.3 と整合
- [ ] `commands/loom-mode.md` が SPEC §3.6.7 と整合
- [ ] README.md の Coexistence Mode intro が SPEC と整合

## M0.13 Retro Discipline & Process Hardening 関連 check

SPEC §3.9.x / §3.6.8 / RETRO_GUIDE.md を編集した時：

- [ ] retro 基本方針 P1/P2/P3 が SPEC §3.9.x と RETRO_GUIDE.md で一致
- [ ] 4 retro lens prompt の freeform improvement instruction が RETRO_GUIDE.md と整合
- [ ] `agents/loom-retro-aggregator.md` の action plan section が P3 と整合
- [ ] `agents/loom-retro-counter-arguer.md` の freeform 検証強化が RETRO_GUIDE.md と整合
- [ ] `agents/loom-retro-pm.md` の user lens 公式組込 が SPEC §3.9.x と整合（verdict 保存 hook は M2.1 で SPEC §3.9.10 / §6.9.5 に refactor、本 checklist M2.1 セクション参照）
- [ ] `agents/loom-pm.md` の workflow discipline 5 項目が SPEC §3.6.8 と整合
- [ ] `agents/loom-developer.md` の TDD red 順序 enforcement が SPEC §3.6.8.6 と整合
- [ ] `tests/retro_test.sh` / `tests/agents_test.sh` の M0.13 assertion が SPEC と整合

## M1 Daemon + Hooks Foundation 関連 check

SPEC §6.2 / §6.3 / §6.4 / §6.10 / §7.3 / §12 を編集した時：

- [ ] `daemon/src/db/schema.ts` の Drizzle 定義が SPEC §6.1 / §6.2 / §7.3 の SQL DDL と semantic 一致（11 table、composite PK 含む）
- [ ] SPEC §12 の確定値（tRPC / Drizzle / nanoid / integer ms / etc.）と `daemon/package.json` の依存が整合
- [ ] `daemon/src/router.ts` の AppRouter export が frontend (M2) 渡し用 export pattern 維持
- [ ] `daemon/src/events/types.ts` の WS event schema が SPEC §6.3 Event payload 仕様と一致
- [ ] `daemon/src/hooks/ingest.ts` の POST /event handler input が `hooks/*.sh` の payload schema と一致
- [ ] `daemon/src/security/token.ts` の chmod 600 + bind 127.0.0.1 が SPEC §12 の security baseline と一致
- [ ] `install.sh` の hooks/ symlink + settings.json 配線が `hooks/*.sh` 5 種を完全 cover

`agents/*.md` を編集した時（M1 後の継続的維持）：

- [ ] daemon が読む event payload schema と各 agent の hook 起動経路が整合

## M2.1 verdict_evidence + M0.14 closure 関連 check

SPEC §3.9.10（verdict_evidence 概念 + write timing）/ §6.9.5（zod 完全 schema）を編集した時：

- [ ] `agents/loom-retro-pm.md` Stage 0 の verdict_evidence build 5 step（git log → task_id 推定 → transcript 抽出 → PM hint 優先 → zod validate + file write）が SPEC §6.9.5 lazy build 手順と整合
- [ ] `agents/loom-pm.md` milestone tag hook の `[reviewer-dispatch-refs]` block 形式（`task_id` / `commit_sha` / `reviewer_agent` / `review_mode` の 4 field 1 行 N entries）が SPEC §3.9.10 PM hint 規約と整合
- [ ] `docs/RETRO_GUIDE.md` "verdict_evidence 保存規律" section が SPEC §3.9.10 / §6.9.5 と整合
- [ ] `tests/agents_test.sh` の M2.1 assertion 3 種（retro-pm Stage 0 build step / PM hint block / process-judge 3 新 category）が SPEC + RETRO_GUIDE と整合

M0.14 essence cleanup（M2.1 統合実施、M0.14 t6/t7 closure）：

- [ ] `agents/loom-retro-process-judge.md` の 3 新 category（`process-permission-friction` / `process-routine-automation-opportunity` / `process-keybind-opportunity`）が SPEC §3.10.1 mandate/suggest table と整合（M0.14 essence は SPEC + CLAUDE.md + agents/loom-retro-process-judge.md に既反映済、M2.1 で test rigor 追加で closure）
- [ ] `tests/agents_test.sh` の process-judge 3 新 category schema assertion が SPEC §3.10.1 と整合（M0.14 t7 closure）
- [ ] PLAN.md M0.14 セクション末尾の PLAN-SSoT 整合性注記が retro 2026-05-02-001-report.md pj-003 / proc-004 と整合（M0.14 t6 closure 補強）

## M3 UI Architecture 関連 check（M3.0 / M3.1 / M3.2）

SPEC §3.6.9（M3 UI Architecture）/ §12 stack 確定値（Phaser mount / Gantt / PLAN sync / Visual regression）を編集した時：

- [ ] §3.6.9.1（Phaser mount α-1）と §12 確定値表の "Phaser React 内 mount pattern" 行が整合
- [ ] §3.6.9.2（PLAN sync β-3）と §12 確定値表の "PLAN.md 双方向同期" 行が整合
- [ ] §3.6.9.3（Gantt γ-3）と §12 確定値表の "Gantt 実装" 行が整合
- [ ] §3.6.9.4 toast 6 event 表と §6.3 Event payload 仕様（実装後 `daemon/src/events/types.ts`）が整合
- [ ] §3.6.9.6 M3 分割（M3.0/.1/.2）と `PLAN.md` M3 系列セクション + `tests/REQUIREMENTS.md` REQ-032/033/034 が整合（M3.1 task 数 = 5、scope に visual regression infra 含む）
- [ ] §3.6.9.7（Visual regression check res-001）と §12 確定値表の "Visual regression check" 行が整合（採用 = Playwright e2e、却下案 = canvas polyfill / @vitest/browser）

M3.0（Room View）実装時：

- [ ] `ui/src/views/RoomView/` の Phaser mount pattern が SPEC §3.6.9.1（自前 useEffect + useRef + HMR `import.meta.hot.dispose`）と整合
- [ ] tile map JSON + tokens.css `var(--color-bg)` 連携が SPEC §3.6.9.1 + M2 3 theme 仕様と整合
- [ ] agent sprite 状態アニメ（idle/busy/失敗）が daemon `agent` subscription event schema と整合

M3.1（Plan View + Gantt + sync + visual regression）実装時：

- [ ] PLAN.md 双方向同期実装（debounce + LWW + `plan_conflict_detected` toast + localStorage backup）が SPEC §3.6.9.2 と整合
- [ ] daemon chokidar + 500ms debounce + conflict resolution が SPEC §3.6.9.2 と整合
- [ ] Gantt SVG 実装（`<rect>` / `<line>` / `<text>` + tokens.css var 直参照）が SPEC §3.6.9.3 と整合
- [ ] toast 6 event の `plan_conflict_detected` payload が SPEC §3.6.9.4 + `daemon/src/events/types.ts` と整合
- [ ] Playwright e2e infra（`ui/e2e/`、`@playwright/test` devDep、`pnpm --filter @claude-loom/ui e2e` script、CI workflow 並列 step）が SPEC §3.6.9.7 と整合
- [ ] Room View pop theme screenshot baseline 1 件（`expect(page).toHaveScreenshot()`）が SPEC §3.6.9.7 scope 規定と整合

M3.2（Session/Agent/notes）実装時：

- [ ] Session List filter / sort / subscription が daemon `session` route + WS event types と整合
- [ ] Agent Detail `agent.markAttention` mutation が daemon `agent` route + DB schema と整合
- [ ] notes `note.create` mutation + plan_items 連結が daemon `note` route + `plan_items` table schema と整合

## M0.11.1 Lifecycle Tracking Architecture 関連 check

SPEC §3.9.11（Lifecycle Tracking Architecture）/ §6.9.6（pending.json schema v2）/ §6.9.7（applied_summary.json schema）/ §6.9.4.5（learned_guidance auto-prune rule）を編集した時：

- [ ] §3.9.11 の write timing / 責務 / lazy build 戦略が §6.9.6 + §6.9.7 schema と整合
- [ ] §6.9.6 schema_version: 2 が `pending.json` 既存 4 retro session の migration 後 state と整合
- [ ] §6.9.7 lazy build 5 step が `agents/loom-retro-pm.md` Stage 0 拡張記述と整合
- [ ] §6.9.4.5 auto-prune 2 mechanism (ttl_sessions + last_used_in) が `agents/loom-retro-aggregator.md` write logic と整合
- [ ] 4 lens prompt（pj-judge / process-judge / meta-judge / researcher）が `applied_summary_path` injection + `Read` tool 参照 mechanism を記述
- [ ] `agents/loom-retro-counter-arguer.md` の stale finding detection section が **物理削除** (M0.11.1 closure 時、SPEC §3.9.x P4 理想形 archive)
- [ ] `templates/{user,project}-prefs.json.template` の learned_guidance example に `last_used_in` field 追加
- [ ] `docs/RETRO_GUIDE.md` "Lifecycle Tracking Architecture" section が SPEC §3.9.11 + §6.9.6 + §6.9.7 + §6.9.4.5 と整合
- [ ] migration script (M0.11.1 t7) が既存 4 retro session の pending.json に `applied_in` + `apply_history` 後付けして schema_version 2 に migrate 完了
- [ ] dry-run test (M0.11.1 t12) で applied_summary build → schema validate → fixture diff の動作確認 (rollback 前安全網)

## SCREEN_REQUIREMENTS.md 更新時の整合性 check

`docs/SCREEN_REQUIREMENTS.md` を編集した時：

- [ ] §3 観測ニーズと SPEC §6 (DB schema) / §6.9 (prefs schema) が整合
- [ ] §4 介入ニーズと daemon tRPC procedure (M1 で実装、後続で追加) が対応
- [ ] §5 通知 toast と daemon WS event types (`daemon/src/events/types.ts`) が対応
- [ ] §6 visual hint と SPEC §12 visual 方向性 (ピクセル RPG) が整合
- [ ] §7 Phase 振り分けと PLAN.md M2-M5 milestone tasks が整合

## M0.11.3 UI Smoke Test Skill 関連 check

SPEC §3.6.11（UI Smoke Test Skill）+ §10.4（Browser-interactive verification layer）を編集した時：

- [ ] §3.6.11.3 4 stage pipeline (Stage 1 derive / Stage 2 verify / Stage 3 report) と `skills/loom-ui-smoke/SKILL.md` instruction が整合
- [ ] §3.6.11.4 Output 階層 (`docs/smoke-tests/<date>-<scope>/{strategy.md, report.md, screenshots/, console.log, findings.json}`) と `scripts/format-report.sh` 出力 path が一致
- [ ] §3.6.11.5 Invocation 3 pattern (`/loom-ui-smoke` slash + suggest skill injection + 自律 invoke at milestone closure) と `commands/loom-ui-smoke.md` + `agents/loom-{developer,pm}.md` 記述が整合
- [ ] §3.6.11.6 Scope param (`full|route:<name>|smoke-only`) と slash command parameter parsing が整合
- [ ] §3.6.11.7 dev server lifecycle (hybrid Option C、port detect + `--auto-start` opt-in) と `scripts/start-servers.sh` が整合
- [ ] §3.6.11.8 Failure handling (skill report only、fix dispatch せん、SRP 整合) と SKILL.md 規律記述が整合
- [ ] §3.6.11.9 依存 (Playwright MCP + bash + jq、graceful skip) と SKILL.md dependency check 手順が整合
- [ ] §3.6.11.10 Consumer agents (loom-developer primary / loom-pm secondary、loom-test-reviewer は scope 外) と agent prompt suggest skill 記述が整合
- [ ] §10.4 Layer 1 / Layer 2 の 2 層 verification 規約と PLAN.md milestone closure default 記述が整合
- [ ] tests/REQUIREMENTS.md REQ-044 が SPEC §3.6.11 + §10.4 と整合

## M0.11.4 Design Implementation Pass 関連 check

SPEC §3.6.12（Design Implementation）+ §3.6.9.1 改訂 (Phaser α-1 → DOM/SVG α-2) を編集した時：

- [ ] §3.6.12.2 戦略 A 確定 (Phaser → DOM/SVG) と §3.6.9.1 改訂内容 + §12 確定値表 Phaser 行の archive 注記が整合
- [ ] §3.6.12.4 Component port matrix と PLAN.md M0.11.4 task list (15 view port + 共通 components) が整合
- [ ] §3.6.12.5 Token + style primitives port と `ui/src/styles/tokens.css` 実装内容が整合 (3 theme palette × 25+ variable + RPG primitives)
- [ ] §3.6.12.6 MVP closure 再定義 (m5 functional / m0.11.3 verification / m0.11.4 aesthetic) と各 tag 設置 commit message + README 記述が整合
- [ ] §3.6.12.7 Phaser dependency removal と `ui/package.json` + 物理削除 file 群 (PhaserCanvas.tsx 等) が整合
- [ ] tests/REQUIREMENTS.md REQ-045 が SPEC §3.6.12 と整合
- [ ] design source `claude-room-handoff.zip` (`/tmp/claude-room-handoff/claude-room/project/`) の主要 component (CatSprite / ROSTER / RoomView / 全 screens jsx) と port target (`ui/src/`) が 1:1 対応で port 完了

## M0.11.6/M0.11.7 PM Auto-Entry intent keyword 関連 check（retro 2026-05-06-002 F-pj-004 由来）

SPEC §3.6.8.9 (PM Auto-Spec Entry) + §3.6.8.10 (PM Auto-Go Entry) を編集した時：

- [ ] **intent keyword count consistency**: SPEC §3.6.8.9 の intent keyword 列挙数 + SPEC §3.6.8.10 の intent keyword 列挙数 = 章冒頭 / agent prompt / commands/loom-pm.md 等の **header に書かれた合計数**と一致 (M0.11.6 t4 で 22→23 fix の再発防止、M4 自動化前の手動 SSoT 強化)
- [ ] §3.6.13 Ceremony Reduction Trinity Marker と §3.2 / §3.6.8.9 / §3.6.8.10 の cross-reference 整合 (3 trinity 章の milestone 名 / scope / rationale が 1 箇所で参照可能)
- [ ] agents/loom-pm.md の auto-entry probe protocol が SPEC §3.6.8.9 / §3.6.8.10 と整合 (Bash tool で probe 可能、Task tool 不要、degraded mode 整合 path C と整合)

## M0.15 UI Redesign Port 関連 check

SPEC §3.6.14 (UI Redesign Port) を編集した時 + M0.15 milestone scope の各 task 着手時：

- [x] **mock fixture 保全 verify**: `redesign/scenarios.js` + `redesign/screens/*.jsx` (12 file) + `redesign/Redesign App.html` + `redesign/cat.jsx` + `redesign/styles.css` + `redesign/tokens.css` + `redesign/_chat{1,2}.md` + `redesign/_BUNDLE_README.md` が M0.15 期間中 untouched (`tests/redesign_invariant_test.sh` t18 で structural gate — t18 にて gate test 新設済み)
- [x] **production layer 編集可 file の境界**: `redesign/api/*.ts` + `redesign/scenarios.d.ts` + `redesign/README.md` + `redesign/package.json` のみ M0.15 内で編集可 (SPEC §3.6.14.3 table と整合 — Phase 1-5 で該当 api/ ファイルのみ追加・編集)
- [x] **12 画面 useScenario shape の一致**: 各 `ui/src/views/<screen>/*.tsx` の destructuring が `redesign/screens/*.jsx` 冒頭の destructuring と整合 (data dependency 仕様の SSoT 一致 — `docs/SCREEN_REQUIREMENTS.md` §"M0.15: useScenario shape SSoT" で索引化済み、t19)
- [x] **Phase 構成 17 task の SPEC ↔ PLAN 整合**: SPEC §3.6.14.4 の 6 phase 描写 と PLAN.md M0.15 section の task 数 + planned_files が一致 (Phase 1-6 / t0-t22 / 23 task — t18 追加で 17→23 に拡張)
- [ ] **Layer 2.5 dogfood smoke 7 step**: SPEC §3.6.14.5 の table と PLAN.md M0.15 t20 の実施手順が整合 (SPEC §10.4.1 PM 必須 step とも整合) ← t20 で実施
- [x] **完成基準の 11 項目チェック**: SPEC §3.6.14.6 の checkbox と PLAN.md M0.15 完成基準の項目数が一致 (11 項目整合 — t19 で [x]/[ ] 状態を update済み)
- [x] **trinity との関係明示**: SPEC §3.6.14.2 の table が §3.6.13 trinity (M0.11.5/6/7) と cross-reference 整合 (既存記述で整合確認済み)
- [x] **Phase 1 → Phase 2 boundary 位置付け**: SPEC §3.6.14.2 で「Phase 1 trinity の続編 = Phase 2 Kickoff (M1.0) の事前条件」明記、PLAN.md "Phase 1 → Phase 2 boundary" section が M0.15 closure 後に位置 (M0.15 が Phase boundary より前に挿入されとる)
- [x] **daemon 側 pm.* sub-router 完全性 (t13)**: `daemon/src/routes/pm.ts` (POST /pm/start / /pm/say / /pm/permission/:id / /pm/stop)、`daemon/src/events/types.ts` (pm.message / pm.permission_request / pm.permission_resolved の zod schema 3 個追加)、`daemon/src/events/broadcaster.ts` (emitPmMessage / emitPmPermissionRequest / emitPmPermissionResolved 3 関数追加)、`daemon/src/router.ts` (pm sub-router import + appRouter 統合) が同 commit で揃う (t13 RED+GREEN unified commit 済み)
- [x] **重要 3 画面 1-click flow の REST 接続**: ⑦ Customization (PUT /customization/:id) / ⑬ PMChat (POST /pm/say) / ⑫ Settings (PUT /settings) が daemon REST に payload を届ける (M0.15 t16 write API hookup 6 screens + t17 usePMSession で hookup 完了)
- [ ] **closure tag の連鎖保持**: `m0.15-complete` 設置時 `m0`〜`m5-complete` の全 tag が消失/移動してへんこと (`git tag -l --sort=-creatordate | grep -E 'm[0-9]'` で確認) ← t22 closure で verify

## M0.16 Playwright e2e OS-aware Baseline + local CI parity gate 関連 check

SPEC §3.6.15 (M0.16 SSoT) + SPEC §3.6.14.5 Layer 2.5 Step 8 を編集した時 + M0.16 milestone scope の各 task 着手時:

- [x] **snapshotPathTemplate format**: `ui/e2e/playwright.config.ts` の `snapshotPathTemplate` が `{snapshotDir}/{testFilePath}-snapshots/{arg}-{platform}{ext}` に refactor、SPEC §3.6.15.1 と整合 (t1+t2 a58ad64 完了)
- [x] **baseline OS suffix 一貫性**: `ui/e2e/__screenshots__/m0.15-redesign/screen-baseline.spec.ts-snapshots/*.png` + `ui/e2e/__screenshots__/room-baseline.spec.ts-snapshots/*.png` の全 baseline が `<arg>-darwin.png` + `<arg>-linux.png` の 2 file セットで揃う (count check: darwin × N === linux × N) (t1+t2 a58ad64 16 baseline rename 完了)
- [x] **CI workflow_dispatch trigger**: `.github/workflows/playwright-regenerate.yml` に `workflow_dispatch` event trigger + `--update-snapshots` step + auto-PR flow 実装、GITHUB_TOKEN only + permissions:contents:write/pull-requests:write scope review 済 (t3 d1e1530 trio reviewer audit 完了)
- [x] **SPEC §3.6.14.5 Step 8 codify**: Layer 2.5 dogfood smoke matrix table に Step 8 = `act -W .github/workflows/ci.yml pull_request --container-architecture linux/amd64` が追加、graceful fallback 規律 (Docker daemon 不在時 skip + retro finding 記録) も SPEC §3.6.15.4 と整合 (spec phase 3619b0c 完了)
- [x] **agents/loom-pm.md closure workflow**: SPEC §3.6.14.5 Step 8 が agent prompt に反映、graceful fallback path の判断 logic 含む (t6 ab901ea 完了)
- [x] **tests/act_smoke_test.sh (optional)**: 新設済み、`bash tests/run_tests.sh` で auto-glob discover、`command -v act` + `docker info` で graceful skip pattern を踏襲 (t7 db3c5d6 完了)
- [ ] **learned_guidance ttl expire**: `lg-2026-05-13-001` (project-prefs.json local persist、ttl: `until-m0.16-complete`) が M0.16 closure で expire、SPEC §3.6.15 formal 規律に昇格 (重複防止) ← t11 PM closure で update 予定
- [ ] **retro 2026-05-12-001 F-res-002 status update**: pending.json の F-res-002 entry を post-merge structural fix で resolve、`.claude-loom/retro/2026-05-12-001/pending.json` に M0.16 完了 reference 追記 ← t11 PM closure で update 予定
- [ ] **closure tag chain 保持**: `m0.16-complete` 設置時 `m0` 〜 `m0.15-complete` の全 tag が保持 (`git tag -l --sort=-creatordate | grep -E 'm[0-9]'` で verify) ← t11 PM closure で verify 予定

## M0.17 UI Redesign Port Correction 関連 check

REVIEW.md (`docs/m0.17-design-review.md`) を SSoT として、M0.15 UI Redesign Port の乖離修正と Phase 4.5 hotfix に関する整合性チェック:

- [x] **shell.css verbatim port**: `ui/src/styles/shell.css` (832L) が `redesign/Redesign App.html <style>` block (L8-280) 由来の SSoT verbatim、TopBar / Drawer / StatusBar / ScenarioPicker / pm-chat / pm-toast / pm-modal / rail / coldstart / cat-walker class 全持つ (t1 fd81c22)
- [x] **room.css G6 受け皿**: `ui/src/styles/room.css` (366L) が `.desk-station__*` / `.subroom-clone__*` / `.room-poster__*` / `.room-sign` / `.agent-detail-panel` class を持ち、`--p-*` / `--desk-*` token を consume (t9 dc00834)
- [x] **tokens.css.patch 適用 + .room-island* 削除**: zone 色 / prop 色 / z-index / 比率 / サイズ token 追加 + 9 個の `.room-island*` ルール削除 (t4 d737f89)、Phase 1 必須 25 token verify + 2 token (`--p-ok` / `--p-bad`) 追加 (t2 fd81c22)
- [x] **index.css final 3 import**: `tokens.css` → `shell.css` → `room.css` → tailwind layers の順序 (t1 + t9 atomic)
- [x] **ゾーン SVG ラグ化 (B2)**: `ui/src/views/room/RoomBackground.tsx` が SVG `<rect opacity="0.3">` + `<text opacity="0.16" letterSpacing="8">` で zone を描画、枠線なし、`Islands.tsx` 削除済 (t5+t6 d737f89)
- [x] **比率レイアウト (B3)**: `ui/src/views/room/RoomView.tsx` が ResizeObserver で contentRect を観測、`floorY = H * 0.43` ベースの比率座標 (`pm: x=W*0.78` etc.)、`width`/`height` props 廃止 (t6 d737f89)
- [x] **sibling routing (S2)**: `ui/src/routing/AppShell.tsx` が `isRoom ? <RoomView /> : <Outlet />` の sibling routing、Outlet 全画面 dialog overlay 撤去、Escape key handler 削除、Drawer active 強調が活性化 (t8 dc00834 + 4.5 hotfix 7215138 で marginRight wrapper 復活)
- [x] **LiveRail PM idle fallback (S1)**: `ui/src/views/room/LiveRail.tsx` 新設、`showLiveRail = !showPmPanel && !liveRailCollapsed && isRoom` で mount、tabs (merged/reasoning/tools) (t9 dc00834)
- [x] **G6 トークン化全廃**: `STATUS_COLOR` 定数廃止 → `.desk-station__status-dot--{status}` 修飾子、`deskColor` prop 廃止 → `--p-wood` token、inline style 全廃 (動的座標 `{left, top}` のみ例外) (t9 dc00834)
- [x] **cat-walker walkTo wire (S6)**: DeskStation に `walkTo?: {dx, dy}` prop 追加、`scenario.agents[id].walkTo` (agent id string) を RoomView 内で positions 経由 `{dx, dy}` に変換、`.cat-walker` class + `--walk-dx / --walk-dy` CSS 変数 inject (t12 cc8c9d5、+5 TDD tests)
- [x] **branch label 責務分離 (M2)**: `RoomWallDecor.tsx` の `◆ claude-loom — branch: main` を `◆ branch: {branch}` (prop-driven) に修正、`claude-loom` 名は TopBar 責務、StatusBar も TopBar と整合 (t14 cc8c9d5)
- [x] **font fallback (M3)**: shell.css L30 body に `font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace` 直接適用、`--font-sans` を override、tokens.css `--font-sans` は Tailwind preflight 用 fallback として残置 (t14 cc8c9d5、no-op verify)
- [x] **Phase 4.5 hotfix (構造的 + test)**: AppShell.tsx の RoomView wrapper `marginRight: rightColumnWidth` 復活 (proposed oversight) + screen-baseline.spec.ts waitSelector を screen 固有 testid に update + click-flow の HTTP network assertion 削除 (tRPC wsLink WS transport 実態整合) + GanttView/RetroView root に `data-testid="gantt-view"` / `data-testid="retro-view"` 追加 (REQ-091、7215138)
- [x] **Playwright darwin baseline 全種再撮影**: 16 baseline 再撮影完了 (`*-darwin.png`)、Playwright 19/19 pass (12 screen + agent-detail + pm-chat-overlay + 3 click flow + 3 room baseline) (t15 + 4.5 hotfix 7215138)
- [x] **Vitest regression 0**: UI 958/958 + daemon 546/546 全 pass (Phase 2 で islands-decor.test.tsx 削除 + 6 test files refactor、Phase 3 で deskColor 関連 test retire、Phase 4 で +5 walkTo tests、net 1007→958=-49)
- [x] **TypeScript regression 0**: `tsc --noEmit` で M0.17 commit chain 由来の error 0 (pre-existing M0.15/M0.16 由来 error は維持)
- [x] **proposed file 11 種全適用**: shell.css / room.css / tokens.css.patch / index.css / AppShell / 2 つの constants.ts / RoomBackground / RoomView / DeskStation / LiveRail 全 11 種が `cp` verbatim port または targeted edit で適用済
- [ ] **Layer 2.5 dogfood smoke 8 step (SPEC §3.6.15.4 + §10.4.1)**: PM 直接実行 + `docs/smoke-tests/m0.17-dogfood/report.md` 構造化 report 出力 ← t18 PM closure で実施予定
- [ ] **closure tag chain 保持**: `m0.17-complete` 設置時 `m0` 〜 `m0.16-complete` の全 tag が保持 (`git tag -l --sort=-creatordate | grep -E 'm[0-9]'` で verify) ← t19 PM closure で verify 予定
- [ ] **main への PR open**: branch hygiene learned_guidance lg-2026-05-12-001 遵守、tag 設置直後に `gh pr create` で main 取込 PR を open ← t19 PM closure で実施予定
