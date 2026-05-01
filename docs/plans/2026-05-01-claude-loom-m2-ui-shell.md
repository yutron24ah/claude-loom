# claude-loom M2: UI Shell Implementation Plan

> 軽量フォーマット (M0.9.1 確立)。design SSoT は M2.0 prototype (`ui/prototype/`) + SCREEN_REQUIREMENTS.md。本 milestone は prototype design を proper Vite + React + TS + Tailwind 実装に port、tRPC client で daemon と接続、vertical slice 1-2 画面で live data pipeline を確立する。

**Goal**: 9 画面の visual port (Tailwind/CSS variable hybrid) + AppShell (persistent Room layer + react-router v6 panel routing) + WS exponential backoff (max 30s) + 代表 1-2 画面の tRPC live 接続。Phaser 3 mount + 残 7-8 画面の live 接続 + Gantt 実描画は M3 に明示的に押し出す。

**Architecture**:
- AppShell に Room canvas を z-index 最下で **persistent mount**、各 view (Plan / Retro / Worktree / Consistency / Customization / LearnedGuidance / Gantt / CharSheet) は半透明 panel として前面 overlay。
- Room は M2 では prototype の DOM-based `room.jsx` を TS/Tailwind 化して port。Phaser 3 mount は M3 (Room component 内部 swap、AppShell 構造は不変)。
- tokens.css は CSS variable 形式で keep (rgb 形式に変換)、tailwind.config.ts で variable 参照 extend。3 theme (pop/dusk/night) 切替は `data-theme="..."` 属性で root variable 上書き。
- WS 接続は tRPC `wsLink` built-in reconnection、`retryDelayMs` で exponential backoff (max 30s)、connection state を zustand `connectionStore` に bridge し ConnectionBanner / toast を駆動。

**Tech Stack**: Vite + React 18 + TypeScript strict + Tailwind CSS + tRPC client + zustand + react-router v6。型共有は `import type { AppRouter } from "@claude-loom/daemon"`。新依存: `react`, `react-dom`, `react-router-dom`, `@trpc/client`, `@trpc/react-query`, `@tanstack/react-query`, `zustand`, `tailwindcss`, `vite`, `@vitejs/plugin-react`, `superjson` (transformer)。

---

## File Structure

```
claude-loom/
├── PLAN.md                                            [Task 1, modify]
├── tests/REQUIREMENTS.md                              [Task 2, modify: REQ-030]
├── ui/
│   ├── package.json                                   [Task 3, modify]
│   ├── vite.config.ts                                 [Task 3, NEW]
│   ├── tsconfig.json                                  [Task 3, NEW]
│   ├── tailwind.config.ts                             [Task 4, NEW]
│   ├── postcss.config.js                              [Task 4, NEW]
│   ├── index.html                                     [Task 3, NEW]
│   └── src/
│       ├── main.tsx                                   [Task 3, NEW]
│       ├── App.tsx                                    [Task 5, NEW]
│       ├── styles/
│       │   ├── tokens.css                             [Task 4, NEW (port from prototype)]
│       │   └── index.css                              [Task 4, NEW (Tailwind directives + base)]
│       ├── routing/
│       │   ├── routes.tsx                             [Task 5, NEW]
│       │   └── AppShell.tsx                           [Task 5, NEW]
│       ├── store/
│       │   ├── connection.ts                          [Task 6, NEW]
│       │   └── view.ts                                [Task 6, NEW]
│       ├── trpc/
│       │   ├── client.ts                              [Task 7, NEW]
│       │   └── provider.tsx                           [Task 7, NEW]
│       ├── notifications/
│       │   ├── ConnectionBanner.tsx                   [Task 8, NEW]
│       │   ├── ToastContainer.tsx                     [Task 8, NEW]
│       │   └── toastBus.ts                            [Task 8, NEW]
│       ├── views/
│       │   ├── room/
│       │   │   ├── RoomView.tsx                       [Task 9, NEW (port room.jsx)]
│       │   │   ├── CatSprite.tsx                      [Task 9, NEW (port cat.jsx)]
│       │   │   ├── DeskStation.tsx                    [Task 9, NEW]
│       │   │   └── AgentDetailPanel.tsx               [Task 9, NEW]
│       │   ├── char-sheet/CharSheet.tsx               [Task 9, NEW (port char-sheet.jsx)]
│       │   ├── gantt/GanttView.tsx                    [Task 9, NEW (port screens-a/Gantt mock)]
│       │   ├── plan/PlanView.tsx                      [Task 9, NEW]
│       │   ├── retro/RetroView.tsx                    [Task 9, NEW]
│       │   ├── worktree/WorktreeView.tsx              [Task 9, NEW]
│       │   ├── consistency/ConsistencyView.tsx        [Task 9, NEW]
│       │   ├── customization/CustomizationView.tsx    [Task 9, NEW]
│       │   └── guidance/LearnedGuidanceView.tsx       [Task 9, NEW]
│       └── live/
│           ├── useAgentList.ts                        [Task 10, NEW (vertical slice candidate A)]
│           └── usePlanItems.ts                        [Task 10, NEW (vertical slice candidate B)]
└── ui/test/
    ├── connection-banner.test.tsx                     [Task 11, NEW]
    ├── toast.test.tsx                                 [Task 11, NEW]
    ├── ws-retry.test.ts                               [Task 11, NEW]
    └── visual-snapshot.test.tsx                       [Task 11, NEW]
```

---

## Tasks

### Task 1: PLAN.md M2 milestone rewrite

**Goal**: 既存 8 bullet を 9 task の確定値ベースに rewrite (m2-t6 ダークテーマベース obsolete 除去含む)
**Files**: `PLAN.md`
**Spec ref**: 本 plan
**Integrity check**: `grep -c "id: m2-t" PLAN.md` → `9`
**Commit prefix**: `docs(plan): rewrite M2 milestone (UI Shell, 9 tasks confirmed)`
**Notes**: PM 実施済、commit のみ。

### Task 2: tests/REQUIREMENTS.md REQ-030 追加

**Goal**: M2 受入要件
**Files**: `tests/REQUIREMENTS.md`
**Spec ref**: 本 plan
**Insertion points**: REQ-029 (M1.5) の後
**Integrity check**: `grep -c "REQ-030" tests/REQUIREMENTS.md` → `1`
**Commit prefix**: `docs(tests): add REQ-030 for M2 UI Shell`

### Task 3: ui/ Vite + React 18 + TS strict + Tailwind 雛形 (m2-t1)

**Goal**: ui workspace を proper SPA build へ移行 (M2.0 の serve-only から)
**Files**: `ui/package.json` (modify), `ui/vite.config.ts` (NEW), `ui/tsconfig.json` (NEW), `ui/index.html` (NEW), `ui/src/main.tsx` (NEW)
**Spec ref**: SPEC §12 (Vite + React + Tailwind 確定)
**Implementation hint**:
- `package.json` に `dev: vite`, `build: vite build`, `preview: vite preview`, `test: vitest` 追加。`prototype` script は残す (design 検証用)。
- 依存追加: `react@18`, `react-dom@18`, `vite`, `@vitejs/plugin-react`, `typescript@5`, `vitest`, `@testing-library/react`, `jsdom`。
- `tsconfig.json` は strict + `paths: { "@/*": ["./src/*"] }`。
- `vite.config.ts` で `react()` plugin + `resolve.alias` で `@` を `src/` に + `server.proxy` で `/trpc` → `localhost:5757`。
- `index.html` は `<div id="root">` + `<script type="module" src="/src/main.tsx">`。
**Integrity check**: `pnpm --filter @claude-loom/ui build` 成功 + `dist/index.html` 生成
**Commit prefix**: `feat(ui): Vite + React 18 + TS strict scaffold (m2-t1)`

### Task 4: tokens.css 移植 + Tailwind config 化 (m2-t2)

**Goal**: prototype の tokens.css を rgb 形式に変換、tailwind.config.ts で variable 参照 extend。3 theme (pop/dusk/night) 切替機構を `data-theme` 属性で確立
**Files**: `ui/tailwind.config.ts` (NEW), `ui/postcss.config.js` (NEW), `ui/src/styles/tokens.css` (NEW), `ui/src/styles/index.css` (NEW)
**Spec ref**: 本 plan + Q3 brainstorm
**Implementation hint**:
- 依存追加: `tailwindcss`, `postcss`, `autoprefixer`。
- prototype の `tokens.css` の hex (`#f8f9fb` 等) を `rgb` 形式 (`248 249 251`) に変換、CSS variable 名は維持。
- prototype の `styles.css` の `.theme-dusk` / `.theme-night` ブロック (root variable 上書き) を tokens.css に移植。
- `tailwind.config.ts` で `theme.extend.colors.bg1 = 'rgb(var(--bg1) / <alpha-value>)'` のように variable を named expose、spacing / fontSize / borderRadius も同様。
- `index.css` は `@tailwind base/components/utilities` directive + 必要最小限の base reset (prototype `styles.css` の element default は Tailwind utility に置換、不要部分は捨てる)。
**Integrity check**: `pnpm --filter @claude-loom/ui build` 成功 + `<html data-theme="dusk">` で variable 切替動作 (visual snapshot test で検証 in Task 11)
**Commit prefix**: `feat(ui): tokens.css rgb conversion + Tailwind variable extend (m2-t2)`

### Task 5: AppShell + react-router v6 + persistent Room layer (m2-t3)

**Goal**: persistent Room canvas (z-index 最下) + 各 view を半透明 panel として前面 overlay する routing 構造
**Files**: `ui/src/App.tsx` (NEW), `ui/src/routing/routes.tsx` (NEW), `ui/src/routing/AppShell.tsx` (NEW)
**Spec ref**: 本 plan + Q1 brainstorm
**Implementation hint**:
- 依存追加: `react-router-dom@6`。
- `routes.tsx`: `BrowserRouter` + `Routes` 定義。`/`, `/plan`, `/gantt`, `/retro`, `/worktree`, `/consistency`, `/customization`, `/guidance`, `/agents/:id` の 9 route。
- `AppShell.tsx`: `<RoomView>` を z-index:0 で常時 mount (children: `<Outlet />` for panel layer)、各 route 画面は z-index:10 の半透明 panel として overlay (Tailwind `bg-bg1/80 backdrop-blur-sm` 想定)。
- panel の close は背景クリック OR Escape キー → `navigate('/')` で Room へ戻る。
- DisciplineHeader は AppShell 上部に常時表示 (prototype の `DisciplineHeader` を port、Task 9 と並走可)。
**Integrity check**: `pnpm --filter @claude-loom/ui dev` で `/`, `/plan`, `/retro` 等への navigate 動作 + Room canvas が unmount されない (React DevTools 確認 OR `data-testid` で検証)
**Commit prefix**: `feat(ui): AppShell + react-router v6 + persistent Room layer (m2-t3)`

### Task 6: zustand store skeleton (m2-t4)

**Goal**: connection slice (status / attempts) + view slice (current view / detail panel state) の zustand store 確立
**Files**: `ui/src/store/connection.ts` (NEW), `ui/src/store/view.ts` (NEW)
**Spec ref**: 本 plan + Q5 brainstorm
**Implementation hint**:
- 依存追加: `zustand`。
- `connection.ts`: `Status = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'`、`{ status, attempts, handleOpen, handleClose, handleError }` を export。`handleClose` で attempts++、`handleOpen` で wasReconnecting なら `daemon_reconnected` toast 発火。
- `view.ts`: `{ currentRoute, selectedAgentId, panelOpen }` を持つ。route との同期は `useLocation` から派生 (一方向: URL → store)、agent 選択は store driven。
**Integrity check**: store import + read/write が test で動作 (`zustand` の vanilla store API 経由)
**Commit prefix**: `feat(ui): zustand store skeleton (connection + view slice) (m2-t4)`

### Task 7: tRPC client + wsLink + exponential backoff (m2-t5)

**Goal**: tRPC `wsLink` で daemon に接続、`retryDelayMs` で exponential backoff (max 30s)、connection state を zustand に bridge
**Files**: `ui/src/trpc/client.ts` (NEW), `ui/src/trpc/provider.tsx` (NEW)
**Spec ref**: 本 plan + Q5 brainstorm + SCREEN_REQUIREMENTS §5.3
**Implementation hint**:
- 依存追加: `@trpc/client`, `@trpc/react-query`, `@tanstack/react-query`, `superjson`。
- `client.ts`:
  ```ts
  const wsClient = createWSClient({
    url: 'ws://localhost:5757/trpc',
    retryDelayMs: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    onOpen: () => useConnectionStore.getState().handleOpen(),
    onClose: () => useConnectionStore.getState().handleClose(),
    onError: (e) => useConnectionStore.getState().handleError(e),
  });
  export const trpc = createTRPCReact<AppRouter>();
  export const trpcClient = trpc.createClient({ links: [wsLink({ client: wsClient, transformer: superjson })] });
  ```
- `provider.tsx`: `<trpc.Provider>` + `<QueryClientProvider>` で App を wrap。
- daemon 側 auth token (`~/.claude-loom/daemon-token`) は M2 で接続できる前提で OK (M1 で確立済)、token 読込は別 task で扱う場合は M2.x で。MVP では dev 環境前提、token 直書きせず env 変数 OR config 由来で読む scaffold だけ用意。
**Integrity check**: dev mode で daemon 起動 → ws 接続成功 → connection store status が `connected` に遷移
**Commit prefix**: `feat(ui): tRPC client + wsLink + exponential backoff (m2-t5)`

### Task 8: ConnectionBanner + toast 通知システム (m2-t6)

**Goal**: 切断バナー + 5 event の toast 表示 (SCREEN_REQUIREMENTS §5.2/§5.3)
**Files**: `ui/src/notifications/ConnectionBanner.tsx` (NEW), `ui/src/notifications/ToastContainer.tsx` (NEW), `ui/src/notifications/toastBus.ts` (NEW)
**Spec ref**: SCREEN_REQUIREMENTS §5.2 / §5.3 + 本 plan
**Implementation hint**:
- `toastBus.ts`: `emit(toast)` / `subscribe(handler)` の simple pub-sub。zustand 使ってもいいが軽量で十分。
- `ToastContainer.tsx`: 右上固定、stack 表示、TTL に従って auto-dismiss。type-specific styling (`success` / `info` / `warning` / `error`)。手動 close 持続表示 vs 自動消去 (TTL ms) を toast object で制御。
- `ConnectionBanner.tsx`: `useConnectionStore` 購読、status !== 'connected' で AppShell 上部に表示 (`reconnecting` → 「切断、再接続中…」、`disconnected` → 「接続を確立中…」)。
- 5 event MVP: `daemon_disconnected` (warning, 持続) / `daemon_reconnected` (success, 3s) / `consistency_finding_new` (warning, 持続) / `subagent_failed` (error, 持続) / `project_added` (info, 5s)。`subagent_failed` は M3 で WS event subscribe 後に実接続、M2 では toast UI のみ確認 (mock dispatch ボタン or test で検証)。
**Integrity check**: ConnectionBanner が status 変化で表示/非表示切替 + toast が emit で表示 + TTL で自動消去
**Commit prefix**: `feat(ui): ConnectionBanner + toast system (5 events MVP) (m2-t6)`

### Task 9: 9 画面 visual port (m2-t7) — parallel candidate

**Goal**: prototype の 9 画面 component を TS/Tailwind 化して port、mock data で動作
**Files**: `ui/src/views/{room,char-sheet,gantt,plan,retro,worktree,consistency,customization,guidance}/*.tsx` (NEW)
**Spec ref**: prototype `ui/prototype/{cat,room,screens-a,screens-b,screens-c,subroom,char-sheet}.jsx` + SCREEN_REQUIREMENTS §3 / §6
**Implementation hint**:
- prototype の jsx を TS 化 (型注釈 + props interface)、`window` global 経由の cross-file 参照を proper ES module import に置換。
- styling: prototype の inline `style={{...}}` を Tailwind utility class に書き換え (Task 4 の variable extend を活用)。pixel RPG 演出 (border, shadow, isometric) はそのまま維持。
- mock data は各 view 内 const で hard-code、interface は Drizzle schema type (`import type { Agent, PlanItem, RetroSession, ... } from "@claude-loom/daemon"`) と整合させる (Task 10 で live 接続するとき type 一致のため)。
- DisciplineHeader (prototype `screens-a.jsx` 由来) を AppShell 上部に配置 (Task 5 と並走可、ここで port)。
**Integrity check**: 9 view 全てが route navigate で表示 + visual snapshot (Task 11 で検証)
**Commit prefix**: `feat(ui): 9 view visual port (mock data) (m2-t7)`
**Parallel split**:
- Subagent A: room (RoomView + CatSprite + DeskStation + AgentDetailPanel) + char-sheet (CharSheet) [最重、3 file group]
- Subagent B: plan + retro + gantt (DisciplineHeader + GanttView 含)
- Subagent C: worktree + consistency + customization + guidance

### Task 10: Vertical slice live (m2-t8)

**Goal**: 代表 1-2 画面を tRPC で daemon と live 接続、pipeline を end-to-end で実機検証
**Files**: `ui/src/live/useAgentList.ts` (NEW), `ui/src/live/usePlanItems.ts` (NEW), 関連 view を mock → live に切替
**Spec ref**: 本 plan + Q2 brainstorm
**Implementation hint**:
- **候補 A: Room agentList subscription** — daemon `events.onAgentChange` subscription に繋ぐ、agent 状態 (busy / idle / review / fail / tdd) live 反映。Room の DOM-based 描画 (CatSprite 状態 prop) に流す。
- **候補 B: Plan planItems query** — daemon `plan.list` query に繋ぐ、PlanView 短期/長期レーン live 表示。手編集は M3 で。
- **MVP は最低 1 本通せば OK**、両方できれば理想。
- 残 view は mock 維持 (M3 で incremental 接続)。
**Integrity check**: daemon 起動 → vertical slice の view を開く → daemon 側 fixture data (or 実 hook 経由) が UI に流れる
**Commit prefix**: `feat(ui): vertical slice live (Room agentList | Plan planItems) (m2-t8)`

### Task 11: M2 acceptance test (m2-t9)

**Goal**: visual snapshot + WS retry + toast の 3 種 test
**Files**: `ui/test/connection-banner.test.tsx` (NEW), `ui/test/toast.test.tsx` (NEW), `ui/test/ws-retry.test.ts` (NEW), `ui/test/visual-snapshot.test.tsx` (NEW)
**Spec ref**: 本 plan + REQ-030
**Implementation hint**:
- 依存追加 (Task 3 で済んどる想定): `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `msw` (WS mock)。
- `connection-banner.test.tsx`: status `disconnected` / `reconnecting` で banner 表示、`connected` で非表示。
- `toast.test.tsx`: 5 event の toast 表示 + TTL auto-dismiss + 手動 close。
- `ws-retry.test.ts`: WS 切断 → retryDelayMs が exponential (1s, 2s, 4s, ...) で max 30s cap、attempts カウント。
- `visual-snapshot.test.tsx`: 9 view を render + DOM snapshot (Tailwind class が期待通り、theme switch で root variable が変わる)。
**Integrity check**: `pnpm --filter @claude-loom/ui test` で全 PASS
**Commit prefix**: `test(ui): M2 acceptance test (visual + WS retry + toast) (m2-t9)`

### Task 12: 全 test PASS + tag m2-complete + main merge

**Goal**: 全 test 維持、PLAN.md done mark、tag、main merge
**Files**: `PLAN.md`, git tag, git merge
**Spec ref**: M1.5 Task 12 と同手順
**Integrity check**:
- `pnpm test` で全 PASS (daemon vitest + ui vitest + harness bash)
- `git tag -l --sort=-creatordate | head -2` → `m2-complete\nm2.0-complete`
**Commit prefix**: `docs(plan): mark M2 tasks done (9/9)` + tag annotation + merge commit

---

## Self-Review

**Spec coverage**:
- ✅ Q1 Routing → Task 5 (AppShell + react-router + persistent Room layer)
- ✅ Q2 Mock→tRPC 段階 → Task 9 (9 view mock) + Task 10 (vertical slice live)
- ✅ Q3 Tailwind hybrid → Task 4 (tokens rgb conversion + variable extend)
- ✅ Q4 Phaser defer → Task 9 (DOM-based RoomView port、Phaser は M3)
- ✅ Q5 WS 再接続 → Task 7 (wsLink + retryDelayMs) + Task 8 (banner + toast)
- ✅ M2 完了基準 8 項目 → Task 3-11 が個別に対応

**Placeholder scan**: TBD/TODO なし

**Type consistency**: AppRouter / tRPC / wsLink / zustand / Tailwind / react-router 用語統一、9 view 名 prototype と一致 (Room / CharSheet / Gantt / Plan / Retro / Worktree / Consistency / Customization / LearnedGuidance)

**Risk**:
- Task 9 (9 画面 visual port) は最大の workload、parallel split (3 subagent / 3 view ずつ) で 1/3 短縮可能。M0.13 codified parallel dispatch self-verify discipline の本格運用機会。
- prototype の `room.jsx` 530 行 + `cat.jsx` 145 行は inline `style` 多用、Tailwind 化で行数膨張リスク (Subagent A の port 量大)。
- `<alpha-value>` 構文用の rgb 形式変換は mechanical だが prototype 内すべての hex を網羅する必要、Task 4 で grep で検出しきる。
- daemon auth token 読込 (Task 7) は dev 環境では env 変数で許容、production token 経路は M5 polish で再設計。
- vertical slice (Task 10) の候補選定は実装着手時に再判断、Plan 接続が単純なら B 推奨 (subscription より query が test しやすい)。

---

## Execution Handoff

Task 1 + 2 PM 直接 (PLAN.md update + REQ-030 add)。
Task 3-8 sequential (基盤、依存強い):
- Task 3 (Vite scaffold) → Task 4 (Tailwind/tokens) → Task 5 (AppShell) || Task 6 (zustand) || Task 7 (tRPC client) → Task 8 (banner + toast)
- Task 5/6/7 は互いに小依存だが parallel 可能 (1 subagent で連続 OR 3 subagent 並列)。dispatch 戦略は M0.13 parallel dispatch self-verify discipline に従う。
Task 9 (9 view visual port) は **3 subagent 並列必須** (parallel batch 宣言、M0.13 discipline 反復実証):
- Subagent A: Room cluster (RoomView + CatSprite + DeskStation + AgentDetailPanel) + CharSheet
- Subagent B: Plan + Retro + Gantt (+ DisciplineHeader)
- Subagent C: Worktree + Consistency + Customization + LearnedGuidance
Task 10 (vertical slice live) sequential after Task 8/9 (1 loom-developer)。
Task 11 (acceptance test) sequential after Task 10 (1 loom-developer)。
Task 12 PM 直接 (test + tag + merge)。

**review_mode**: 既定 `single` (project.json default)、Task 9 と Task 10 は critical path で `trio` opt-in 候補。
