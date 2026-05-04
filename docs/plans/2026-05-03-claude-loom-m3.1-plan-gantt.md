# M3.1 Plan View + Gantt + 双方向同期 + Visual Regression 詳細プラン

> spec phase 2026-05-02 で確定した design 判断 (β-3 / γ-3 / res-001) を実装に落とし込む milestone。
> SSoT: SPEC §3.6.9.2 / §3.6.9.3 / §3.6.9.7 / PLAN.md M3.1 セクション / tests/REQUIREMENTS.md REQ-033

## Goal

claude-loom UI の Plan View (短期 TodoWrite mirror + 長期 plan_items tree) を live 化し、PLAN.md 双方向同期を chokidar + 500ms debounce + last-write-wins + `plan_conflict_detected` toast + localStorage backup の hybrid mechanism で成立させ、Gantt を自前 SVG (rect/line/text + tokens.css var 直参照、3 theme 統合) で実 plan_items データから描画。加えて Playwright e2e infra を独立 test layer として導入し Room View pop theme screenshot baseline 1 件を確立、M3.0 mock-only test の構造的 hole を sprite 拡張前に塞ぐ。

## Files (touched)

### dev A track (t1 → t2 → t3、Plan View + sync chain)

**新設**:
- `daemon/src/events/types.ts` に `todoChangeEventSchema` 追加（短期 TodoWrite mirror、`payload: { sessionId, todos: [{status, text}] }`）
- `daemon/src/events/types.ts` に `planConflictEventSchema` 追加（双方向同期、`payload: { projectId, conflictType, fileMtime, dbMtime }`）
- `daemon/src/plan-sync/watcher.ts` 新設（chokidar watcher + 500ms debounce + LWW + conflict 検知 + plan.conflict broadcast）
- `daemon/src/plan-sync/parser.ts` 新設（PLAN.md → plan_items diff 抽出、`<!-- id: ... status: ... -->` marker parser）
- `daemon/test/plan-sync/watcher.test.ts` (t3 RED) — chokidar event + debounce + LWW + conflict resolution test
- `daemon/test/plan-sync/parser.test.ts` (t3 RED) — PLAN.md marker parser test
- `ui/src/live/useTodoWrite.ts` 新設（todo.change subscription hook、useState で last 5 todos 保持）
- `ui/src/live/usePlanMutations.ts` 新設（upsert / updateStatus / delete mutation wrapper、tRPC react-query 統合）
- `ui/src/store/planConflict.ts` 新設（zustand store、conflict state + localStorage backup mechanism）
- `ui/test/live/use-todo-write.test.ts` (t1 RED) — subscription mock + state propagation
- `ui/test/views/plan-edit.test.tsx` (t2 RED) — `+ 追加` button + inline edit + status toggle
- `ui/test/store/plan-conflict.test.ts` (t3 RED) — conflict state + localStorage save/restore

**改修**:
- `ui/src/views/plan/PlanView.tsx` — short-term pane: `MOCK_TODOS` → `useTodoWrite()` hook、long-term pane: `+ 追加` button wire + inline edit + status click toggle、conflict toast 連携
- `ui/src/store/connection.ts` — `planConflict` event subscription 追加（既存 toast 5 → 6 拡張）

### dev B track (t4 → t5、Gantt SVG + Playwright)

**新設**:
- `ui/src/live/useGanttData.ts` 新設（plan_items + agent timeline merge query、SVG 描画用 GanttRow[] 構造に変換）
- `ui/test/views/gantt-svg.test.tsx` (t4 RED) — SVG `<rect>` / `<line>` / `<text>` render assertion + 3 theme switch + bar click navigate
- `ui/e2e/playwright.config.ts` 新設（base config、headless chromium、screenshot baseline path）
- `ui/e2e/room-baseline.spec.ts` 新設（Room View pop theme screenshot baseline 1 件）
- `ui/e2e/fixtures/baseline-room-pop.png` (initial baseline、t5 GREEN で生成)
- `.github/workflows/ci.yml` 更新（既存 vitest job + 新 playwright job 並列）

**改修**:
- `ui/src/views/gantt/GanttView.tsx` — Tailwind div based mock → SVG `<rect>` bar + `<line>` grid + `<text>` label、`useGanttData()` hook、`var(--color-bar)` 直参照、bar click → react-router navigate
- `ui/package.json` — `@playwright/test` devDependency 追加 + `e2e` script 追加

## Spec ref

- **SPEC §3.6.9.2** (PLAN.md 双方向同期 β-3 = hybrid debounce 500ms-1s + LWW mtime + plan_conflict_detected toast + localStorage backup)
- **SPEC §3.6.9.3** (Gantt γ-3 = 自前 SVG `<rect>` + `<line>` + `<text>` + tokens.css var 直参照、200-400 LoC、3 theme 即反映、行 click → Agent Detail navigate)
- **SPEC §3.6.9.4** (toast 6 event 化、`plan_conflict_detected` 追加、payload schema は本実装で `daemon/src/events/types.ts` 確定)
- **SPEC §3.6.9.7** (Visual regression check res-001 = Playwright e2e、`@playwright/test` devDep + `ui/e2e/` + `pnpm --filter @claude-loom/ui e2e` script + CI 並列 step、Room View pop theme baseline 1 件)
- **PLAN.md M3.1 完成基準** 7 項目
- **tests/REQUIREMENTS.md REQ-033**

## Integrity check

- `pnpm --filter @claude-loom/ui test` 全 PASS（既存 vitest test の green 状態保持 + 新規 5 test = 18+ green）
- `pnpm --filter @claude-loom/ui e2e` 全 PASS（Room View pop theme baseline 1 件 green）
- `pnpm --filter @claude-loom/daemon test` 全 PASS（既存 + 新規 watcher + parser test 2 種追加）
- `pnpm --filter @claude-loom/ui build` 成功（Playwright dev-only、prod bundle 増ゼロ）
- `bash tests/run_tests.sh` で **13 PASS** 維持（harness 側に変更なし）
- HMR で PlanView mount → unmount → 再 mount 時 todoChange subscription が leak ゼロ
- chokidar watcher が daemon shutdown 時 cleanup 動作（unwatch + close）
- 3 theme (`data-theme="pop|dusk|night"`) 切替で Gantt SVG bar color が `var(--color-bar)` 経由で即反映
- conflict 発生時 localStorage に GUI side change が backup される、user が手動 restore 可能
- working tree clean、**Strategy b (PM 統合 commit)** で全 commit 完遂

## Commit prefix

各 task の commit pattern（Strategy b なので RED + GREEN を PM が統合 commit）:

| task | RED commit | GREEN commit | 統合 commit message |
|---|---|---|---|
| t1 Plan 短期 | `test(ui): M3.1 t1 RED — todoChange subscription assertions` | `feat(ui): M3.1 t1 GREEN — useTodoWrite hook + PlanView short-term wire` | dev A 完了後 PM が統合 |
| t2 Plan 長期編集 | `test(ui): M3.1 t2 RED — plan-item edit assertions` | `feat(ui): M3.1 t2 GREEN — inline edit + add button + status toggle` | dev A 完了後 PM が統合 |
| t3 双方向同期 | `test(daemon,ui): M3.1 t3 RED — chokidar + debounce + LWW + conflict assertions` | `feat(daemon,ui): M3.1 t3 GREEN — plan-sync watcher + parser + planConflict store` | dev A 完了後 PM が統合 |
| t4 Gantt SVG | `test(ui): M3.1 t4 RED — Gantt SVG render assertions` | `feat(ui): M3.1 t4 GREEN — SVG rect/line/text + theme integration + bar click nav` | dev B 完了後 PM が統合 |
| t5 Playwright | `test(ui): M3.1 t5 RED — Playwright e2e infra + Room baseline` | `feat(ui): M3.1 t5 GREEN — playwright config + room-baseline.spec + CI workflow` | dev B 完了後 PM が統合 |

PLAN status update: `chore(plan): M3.1 task t1-t5 done` (M3.1 完走時)

## 実装 sequence

### dev A track（sequential、Strategy b、PM 統合 commit）

**dispatch 順**: t1 → t2 → t3。各 task 完了後 PM が working tree 確認 + 統合 commit + PLAN.md status 更新後に次 task dispatch。

#### t1 — Plan View 短期レーン（TodoWrite mirror、daemon `todoChange` subscription）

**実装**:
- `daemon/src/events/types.ts` に `todoChangeEventSchema` 追加 + `loomEventSchema` discriminated union に組み込み
- `ui/src/live/useTodoWrite.ts` 新設、`trpc.events.subscribe` で `todo.change` event 受信、useState で last todos 保持
- `ui/src/views/plan/PlanView.tsx` short-term pane の `MOCK_TODOS` → `useTodoWrite()` hook へ置換、`isLoading` / `error` / empty state ハンドリング

**test (RED 先)**:
- subscription event 受信で state 更新 assertion (mock subscription)
- empty state / loading state / error state 表示 assertion
- HMR remount 時 subscription cleanup 確認

**done when**:
- PlanView short-term pane が daemon `todo.change` event を受けて live 更新
- `pnpm --filter @claude-loom/ui test` 全 PASS（新 t1 test 1 種追加）
- mock daemon (M3.1 では daemon 側 todo.change broadcaster は未配線、dev A は schema 追加 + UI hook + test mock のみ。実 broadcaster は M3.2 以降 or daemon side parallel work で別途。M3.1 scope では UI 側 contract と test mock 整備で OK)

#### t2 — Plan View 長期レーン（plan_items tree edit、daemon mutation 接続）

**実装**:
- `ui/src/live/usePlanMutations.ts` 新設、`trpc.plan.upsert` / `trpc.plan.updateStatus` / `trpc.plan.delete` の react-query mutation wrapper
- `ui/src/views/plan/PlanView.tsx` long-term pane `+ 追加` button → upsert mutation wire、status square click → updateStatus mutation、title click → inline edit mode（contentEditable or input swap）

**test (RED 先)**:
- `+ 追加` click で upsert mutation 発火 + new item render assertion
- status square click で updateStatus mutation 発火 + UI state 更新 assertion
- inline edit mode → blur で upsert mutation 発火 assertion

**done when**:
- 長期 tree が CRUD 動作、500ms debounce で write-back（debounce は client side、`use-debounce` 不使用、自前 setTimeout で十分）
- `pnpm --filter @claude-loom/ui test` 全 PASS（新 t2 test 1 種追加）

#### t3 — PLAN.md 双方向同期（chokidar + debounce + LWW + plan_conflict_detected toast + localStorage backup）

**実装**:
- `daemon/src/plan-sync/parser.ts` 新設、PLAN.md を読み `<!-- id: ... status: ... -->` marker から `plan_items` への diff 抽出 (parse 関数 + 既存 DB との diff 関数)
- `daemon/src/plan-sync/watcher.ts` 新設、chokidar で `<projectRoot>/PLAN.md` watch、change event を 500ms debounce で集約、parser で diff 計算、LWW (mtime 比較) で採用、conflict 時は `plan.conflict` event broadcast
- `daemon/src/events/types.ts` に `planConflictEventSchema` 追加
- `ui/src/store/planConflict.ts` 新設、zustand store、conflict state + GUI 側 change を localStorage に save、user 手動 restore 関数
- `ui/src/store/connection.ts` `plan.conflict` event 受信で toast push + planConflict store 連携

**test (RED 先)**:
- daemon side: chokidar event → 500ms debounce で集約 (10 連続変更で 1 回だけ parser 走る)、mtime 比較で LWW 動作、conflict broadcast 動作
- daemon side: parser が `<!-- id: ... -->` marker を正しく抽出、diff 計算が空配列 / add / remove / update を正しく分類
- ui side: conflict event 受信で toast 表示 + localStorage backup 動作 + restore 関数で state 復元

**done when**:
- 外部 PLAN.md edit を chokidar 検知 → daemon → UI へ push
- conflict 時 `plan_conflict_detected` toast + localStorage backup 動作（GUI 側 change 保持、user 手動 restore 可）
- `pnpm --filter @claude-loom/daemon test` 全 PASS（新 watcher + parser test 2 種追加）
- `pnpm --filter @claude-loom/ui test` 全 PASS（新 planConflict store test 1 種追加）

### dev B track（sequential、Strategy b、PM 統合 commit）

**dispatch 順**: t4 → t5。dev A と並列、互いの store layer 衝突なし。

#### t4 — Gantt SVG（自前 SVG rect/line/text + 3 theme + bar click navigate）

**実装**:
- `ui/src/live/useGanttData.ts` 新設、`trpc.plan.list` query + 既存 `agent` subscription を merge して GanttRow[] 構造に変換 (M3.1 では plan_items + mock agent timeline で十分、実 timeline は M3.2 以降)
- `ui/src/views/gantt/GanttView.tsx` Tailwind div mock → SVG `<svg>` ベース書き直し:
  - `<rect>` for bars (fill = `var(--color-bar)` 等、tokens.css 直参照)
  - `<line>` for grid (time tick markers)
  - `<text>` for labels (agent name + bar label)
  - bar click → `useNavigate(`/agent/${agentId}`)` で Agent Detail へ
- 3 theme 切替確認: `data-theme="dusk"` / `night"` で root の `--color-bar` 変化が SVG に即反映

**test (RED 先)**:
- SVG `<rect>` / `<line>` / `<text>` 各要素が正しい数 + position で render assertion
- bar click で `useNavigate` 発火 + path assertion
- 3 theme 切替で SVG `fill` 属性が CSS variable 経由で変化 (`getComputedStyle` で確認)

**done when**:
- Gantt SVG が plan_items 進捗を bar で描画
- 3 theme 切替で `var(--color-bar)` 即反映
- bar click で Agent Detail navigate
- `pnpm --filter @claude-loom/ui test` 全 PASS（新 t4 test 1 種追加）

#### t5 — Playwright e2e infra + Room View baseline 1 件 + CI 統合

**実装**:
- `ui/package.json` に `@playwright/test` devDep + `e2e` script (`playwright test`) 追加
- `ui/e2e/playwright.config.ts` 新設、headless chromium、screenshot baseline path、`webServer` で `pnpm dev` 起動
- `ui/e2e/room-baseline.spec.ts` 新設、Room View 表示 + pop theme で `expect(page).toHaveScreenshot()` 1 件
- 初回実行で baseline `ui/e2e/fixtures/baseline-room-pop.png` 生成、commit
- `.github/workflows/ci.yml` 既存 vitest job と並列で playwright job 追加（独立 fail で原因切り分け）

**test (RED 先)**:
- Playwright config 不在で `pnpm --filter @claude-loom/ui e2e` が fail (script 未定義)
- baseline 不在で screenshot test が fail (initial run、baseline 生成後は pass)

**done when**:
- `pnpm --filter @claude-loom/ui e2e` で Room View pop theme screenshot baseline 1 件 PASS
- CI workflow 並列 step として playwright job 動作（vitest job と独立 fail 可能）
- `@playwright/test` が devDep（prod bundle 影響ゼロ）
- baseline image 1 枚 commit（dusk/night は M3.2 以降）

---

## Parallel batch matrix

| 段階 | dev A | dev B | 同時動作の独立性 |
|---|---|---|---|
| stage 1 | t1 (Plan 短期 hook) | t4 (Gantt SVG) | ✓ 独立（Plan View の short-term pane と Gantt View は別 file、別 store）|
| stage 2 | t2 (Plan 長期 edit) | t5 (Playwright infra) | ✓ 独立（PlanView edit logic と Playwright config / e2e dir / CI workflow は別 file）|
| stage 3 | t3 (双方向同期) | (idle、または retro 準備等) | dev A 単独、dev B は完了 |

**Strategy b 採用理由**: 2 dev parallel + memory 「M2 Task 5/6/7 GREEN commit handoff anomaly」の defensive workaround。各 task 完了後 PM が working tree 確認 + RED + GREEN を統合 commit + PLAN.md status 更新後に次 task dispatch。

**dispatch prompt prefix の commit_handoff 明示**:
```
[loom-meta] project_id=claude-loom-self slot=dev-A working_dir=/Users/kokiiphone/Documents/work/claude-loom commit_handoff=pm
```

dev は RED 実装 → red commit せず diff 残し → GREEN 実装 → reviewer dispatch → review pass 確認後 final report で `committed_sha: null` + working tree state 報告。PM が working tree 確認後 RED + GREEN を 1 統合 commit にまとめる（または RED と GREEN を分けた 2 commit）。
