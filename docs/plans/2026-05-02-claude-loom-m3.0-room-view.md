# M3.0 Room View（Phaser mount + ピクセル世界観）詳細プラン

> spec phase 2026-05-02 で確定した design 判断 (α-1) を実装に落とし込む milestone。
> SSoT: SPEC §3.6.9 / PLAN.md M3.0 セクション / tests/REQUIREMENTS.md REQ-032

## Goal

claude-loom UI の Room View を **Phaser 3 + 自前 `useEffect` mount** で実装、M2 で作った DOM-based RoomView を **Phaser canvas + DOM AgentDetailPanel overlay の hybrid** に置換。3 theme (pop/dusk/night) 統合 + HMR memory leak ゼロ + agent state → sprite state 単方向 push の bridge を達成し、M3.1/M3.2 の前提となる Phaser scene 基盤を成立させる。

## Files (touched)

**新設**:
- `ui/src/views/room/PhaserCanvas.tsx` — Phaser game instance mount component（自前 useEffect + useRef + HMR `import.meta.hot.dispose`）
- `ui/src/views/room/scenes/RoomScene.ts` — Phaser Scene 定義（tile + sprite render）
- `ui/src/views/room/agentSpriteSync.ts` — agent state ↔ Phaser sprite state bridge（zustand subscribe）
- `ui/public/assets/tiles/room-base.json` — tile map JSON（壁 / 床 / 島ゾーン配置、placeholder）
- `ui/test/room-phaser-mount.test.tsx` — t1 lifecycle test（mount/unmount/HMR dispose mock）
- `ui/test/room-tile-theme.test.tsx` — t2 3 theme 切替 test（`var(--color-bg)` 反映確認）
- `ui/test/room-sprite-state.test.tsx` — t3 sprite state アニメ test（agent subscription mock）

**置換**:
- `ui/src/views/room/RoomView.tsx` — 既存 DOM-based 全体実装 → Phaser canvas + DOM AgentDetailPanel overlay の hybrid 構成へ書き直し（`data-testid="room-canvas"` 維持、AppShell test 契約保持）

**廃止 (M3.0 で削除、M2 retro 時に確認)**:
- `ui/src/views/room/CatSprite.tsx` — Phaser sprite で代替
- `ui/src/views/room/DeskStation.tsx` — Phaser sprite で代替

**保持**:
- `ui/src/views/room/AgentDetailPanel.tsx` — DOM overlay として保持（M3.2 で機能拡張）
- `ui/src/views/room/roster.ts` — 13 agent ↔ sprite mapping data として再利用

**dependency 追加**:
- `phaser` (^3.80.0、ui/package.json devDependencies じゃなく dependencies へ)

## Spec ref

- **SPEC §3.6.9.1** (Phaser 3 React 内 mount = 自前 `useEffect` + `useRef` + HMR `import.meta.hot.dispose` で `game.destroy()`)
- **SPEC §3.6.9.4** (toast 6 event、M3.0 では `agent` subscription event を使用、`plan_conflict_detected` は M3.1 から)
- **SPEC §3.6.9.5** (frontend「自前 control」哲学、library 依存最小化)
- **SPEC §3.6.9.6** (M3 3 段細分割、M3.0 = Phaser + Room View 単独 milestone)
- **PLAN.md M3.0 完成基準** 5 項目（mount/unmount lifecycle / agent sprite subscription / 3 theme / vertical slice / `pnpm --filter @claude-loom/ui test` 全 PASS）
- **tests/REQUIREMENTS.md REQ-032**

## Integrity check

- `pnpm --filter @claude-loom/ui test` 全 PASS（既存 10+ test + 新規 3 test = 13+ 全 green）
- `pnpm --filter @claude-loom/ui build` 成功（Phaser dependency 追加で bundle size 増加は許容、phaser ~600KB、phase 2 で bundle splitting 検討）
- `bash tests/run_tests.sh` で **12 PASS** 維持（harness 側に変更なし）
- HMR で React mount → unmount → 再 mount 時 Phaser game instance が leak ゼロ（test で `gameRef.current?.destroy(true)` の call 確認、second instance 起動を spy）
- 3 theme (`data-theme="pop|dusk|night"`) 切替で Phaser scene background が `getComputedStyle(root).getPropertyValue('--color-bg')` 経由で即反映
- agent_id ↔ sprite 1:1 mapping、agent 増減で sprite 動的追加/削除動作（mock daemon `agent` subscription で確認）
- working tree clean、Strategy a (dev 自身 commit、`committed_sha` 必須) で全 commit 完遂

## Commit prefix

`feat` (M3.0 = 新機能 milestone)

各 task に対応する commit pattern:
1. **t1 RED**: `test(ui): M3.0 t1 RED — Phaser mount lifecycle assertions`
2. **t1 GREEN**: `feat(ui): M3.0 t1 GREEN — PhaserCanvas component (自前 useEffect + HMR dispose)`
3. **t2 RED**: `test(ui): M3.0 t2 RED — tile theme integration assertions`
4. **t2 GREEN**: `feat(ui): M3.0 t2 GREEN — RoomScene tile + tokens.css var integration`
5. **t3 RED**: `test(ui): M3.0 t3 RED — sprite state animation assertions`
6. **t3 GREEN**: `feat(ui): M3.0 t3 GREEN — agent sprite + state animation + subscription bridge`
7. **後始末**: `refactor(ui): M3.0 RoomView を Phaser hybrid 構成に置換 + 旧 DOM 実装削除` (CatSprite / DeskStation 廃止)
8. **PLAN status update**: `chore(plan): M3.0 task t1-t3 done`

---

## 実装 sequence (dev 1 体 sequential、Strategy a)

### Step 1: t1 — Phaser mount component

**実装**:
- `ui/src/views/room/PhaserCanvas.tsx` 新設、`useEffect(() => { gameRef.current = new Phaser.Game(config); return () => gameRef.current?.destroy(true) }, [])`
- HMR 対応: `if (import.meta.hot) { import.meta.hot.dispose(() => gameRef.current?.destroy(true)) }`
- Phaser config: `type: Phaser.AUTO, parent: containerRef.current, width: 1080, height: 660, scene: [RoomScene]`
- props: `agents: Agent[]` (M3.0 では mock data で OK、M3.2 で daemon subscription 接続)

**test**:
- mount で `Phaser.Game` constructor が 1 回呼ばれる
- unmount で `game.destroy(true)` が呼ばれる
- HMR dispose で `game.destroy(true)` が呼ばれる
- Phaser は `vi.mock('phaser', () => ({ default: { Game: vi.fn(...), AUTO: 0 } }))` で mock、実 instance は test で作らん

**review**: review_mode `single` (default)、`loom-review` skill で `loom-reviewer` 1 体 dispatch、verdict pass → commit。

### Step 2: t2 — tile background + 3 theme integration

**実装**:
- `ui/src/views/room/scenes/RoomScene.ts` 新設、Phaser Scene 継承
- `preload()`: tile map JSON load (`ui/public/assets/tiles/room-base.json`)
- `create()`: tile rendering、background color は `getComputedStyle(document.documentElement).getPropertyValue('--p-bg-floor')` で取得して Phaser graphics で描画
- 3 theme 切替監視: `MutationObserver` on `document.documentElement` `data-theme` attribute、変化時に scene の background color を再計算 + redraw

**test**:
- `data-theme="pop"` 時 `var(--p-bg-floor)` 値が scene background に反映
- `data-theme="dusk"` への switch で scene background が更新（MutationObserver mock）
- tile map JSON load が呼ばれる

**review**: 同上。

### Step 3: t3 — agent sprite + state animation + subscription bridge

**実装**:
- `ui/src/views/room/agentSpriteSync.ts` 新設、zustand subscribe で agent state 変化を Phaser scene に push
- `RoomScene` 内 `Map<agentId, Phaser.GameObjects.Sprite>` で 1:1 mapping、scene method `setAgentState(id, status)` で sprite state 切替
- 状態アニメ: idle (静止) / busy (上下バウンス Tween) / fail (赤フラッシュ Tween)、placeholder は Phaser graphics primitive (circle + 状態色) で十分（asset は M5 で frontend-design 委譲）
- props で受けた `agents: Agent[]` を初期 mount + zustand subscribe で増減反映

**test**:
- agents prop で 13 sprite が scene に追加される
- agent state 変化 (`idle → busy`) で sprite Tween が triggered (mock で確認)
- agent 削除で sprite が destroy される
- mock daemon `agent` subscription で全 sprite が live 表示される vertical slice test

**review**: 同上。

### Step 4: 後始末 (refactor)

- 旧 DOM RoomView 全体を Phaser canvas + DOM AgentDetailPanel overlay 構成に書き直し
- `CatSprite.tsx` / `DeskStation.tsx` 削除
- `RoomView.tsx`: `<div data-testid="room-canvas">` 内に `<PhaserCanvas />` + `{selectedAgent && <AgentDetailPanel />}` overlay
- AppShell test 契約 (`data-testid="room-canvas"`) 維持確認

### Step 5: PLAN status update + 全 test 確認

- `PLAN.md` M3.0 t1/t2/t3 status `[ ] todo` → `[x] done`
- `pnpm --filter @claude-loom/ui test` 全 PASS 確認
- `bash tests/run_tests.sh` 12 PASS 維持確認
- final report に全 commit_sha 明記、`commit_handoff: dev` (Strategy a)

---

## TDD discipline

`loom-tdd-cycle` skill 必須。各 task で:
1. **RED**: test 書く → fail 確認 → red commit
2. **GREEN**: 最小実装 → test pass → green commit
3. **REVIEW**: `loom-review` skill で `loom-reviewer` 1 体 dispatch
4. **commit**: reviewer pass 後、working tree clean まで dev 自身が commit (proc-001 fix)

red commit が green commit より時系列で前にあることを `git log` で都度確認 (SPEC §3.6.8.6)。

---

## 注意事項

- **Phaser は実 instance を test で作らない**: jsdom + canvas mock では WebGL/Canvas が noop、Phaser instance 起動は失敗する。`vi.mock('phaser')` で全 API を mock、test は pattern (constructor call / destroy call / scene method call) のみ verify。実 visual rendering は `pnpm dev` での手動確認が M3.0 closure 時の vertical slice 確認手順。
- **bundle size**: Phaser ~600KB の bundle 増加は許容。Phase 2 で `vite.config.ts` の `manualChunks` で bundle splitting 検討、M3.0 では考慮せず（YAGNI）。
- **Asset**: tile map JSON / sprite sheet は **placeholder** (Phaser graphics primitive で十分)、M5 frontend-design 委譲時に pixel art asset に置換。M3.0 では「mount + lifecycle + 3 theme + state animation pattern」確立が goal、見た目は M5 で。
- **既存 M2 retro pj-001 (PLAN last_synced_at) は M2.1 で update 済み**、M3.0 では touch せず。
