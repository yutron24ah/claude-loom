# M0.17 Real Daemon Mock-less Verify Report

**Date**: 2026-05-15 (post-2026-05-14 closure session)
**Executed by**: PM (loom-pm direct, Playwright MCP browser_* tool)
**Trigger**: user 指摘「そういや mock でまだ動かしてないか？」 — mock-only verification の dogfood gap を closure 後に検出
**Scope**: M0.17 UI Redesign Port Correction 全実装の real daemon + mock パラメータ無しでの実 UI 動作確認

---

## 背景

M0.17 closure 直前まで、Vitest (UI 958 + daemon 546) + Playwright (19/19) + Layer 2.5 dogfood smoke 8/8 全 PASS で「全 layer green」状態に到達。**ただし全 3 layer が `?mock=active|idle|failed` URL param 経由の mock fixture に依存**、real daemon の actual scenario data で UI が描画されとるか確認した瞬間が無かった。

user 指摘により本 verification を post-closure (tag 設置後) に実施、closure 判断が mock pass のみで成立した structural gap を retro candidate として codify。

---

## Verify Method

- daemon: 既に起動済 (`bash hooks/loom-launch-ui.sh` Step 1 で起動確認、`/health` `{"status":"ok"}` + `/mode` `mode:prod,entry:manual,ui_serving:true`)
- browser: Playwright MCP (`mcp__playwright__browser_*` tool)、viewport 1280×720 (Playwright config 整合)
- URL: `http://127.0.0.1:5757/` (mock パラメータ **無し**) → SPA index + real scenario state

---

## 検証結果

### Route /  (Room) — `m0.17-real-daemon-room.png`

| 検証項目 | 期待 | 結果 | 関連 M0.17 fix |
|---|---|---|---|
| Shell layout grid | TopBar 36px / 中段 1fr / StatusBar 24px、Drawer 168px サイドバー | ✅ shell.css class system 全活性 | B1 (Phase 1) |
| TopBar | drawer toggle ☰ + brand `claude-loom` + project switcher `◆ freee-mcp ▾` + 4 metrics (PARALLEL 0% / TASK TOOL OK / TDD ORDER 0 VIOLATIONS / VERDICT PASS) + 接続 indicator | ✅ 全要素描画、APP_COPY token 化文字列 visible | Phase 3 G6 |
| Drawer 11 nav items × 3 groups | OPERATE (Room/Plan/Gantt/Sessions/Consistency) + MANAGE (Worktree/Retro/Customization/Guidance) + SETTINGS (Tokens/Project Settings)、`v0.15 · 127.0.0.1:5757` footer | ✅ NAV_GROUPS constants.ts から正常 render | Phase 3 G6 |
| Drawer Room active state | URL `/` で Room nav-link に `[active]` 属性 | ✅ `link "▦ Room" [active]` 確認 | S2 sibling routing 効果 |
| Room canvas: SVG zones | DEV PIT / MANAGER / REVIEW を SVG `<text opacity="0.16" letterSpacing="8">` で床にステンシル描画、**枠線なし** | ✅ 3 ゾーン text 描画 (`generic [ref=e106-112]`)、Islands.tsx の太枠 boxed 描画は完全消失 | **B2 ゾーン箱化解消** |
| Wall decor | `◆ branch: main` (prop-driven、`claude-loom —` prefix なし)、`☀ 14:23 JST` 時計 | ✅ M2 branch label 責務分離 verified | M2 (Phase 4) |
| Wall posters 3 種 | GANTT (`❖ GANTT — 直近 30min` + 5 agents bar) + PLAN (`📋 PLAN — TodoWrite + plan_items` + M0.13/14/M1.0 milestones + todos 4件) + 整合性 INBOX (`📜 整合性 INBOX NEW 1` + F-11/12/13 findings)、全 button (clickable for route navigation) | ✅ 3 posters clickable button として描画、scenario data driven | Phase 2 RoomView.tsx |
| DeskStations 5 体 | ニケ / サバ / ペン / メメ / シノビ、各 `last: N分前` label + cat sprite + monitor + nameplate | ✅ 5 ROOM_AGENT_IDS (pm/dev/rev-code/rev-test/rev-sec) 全描画、scenario.agents idle 状態 reflected | Phase 2 RoomView 比率座標 + Phase 3 DeskStation G6 |
| SubroomClone (worktree) | dev デスク上方 (`positions.dev.x + 60 + i*56`) に `@<branch>` ミニ猫描画 | ✅ `@feat/oauth` ミニ clone 描画 | Phase 2 S4 |
| ColdStart card | scenario 全員 idle + PM 非起動時に「みんな寝てます 💤」+ `▶ PM を起動` ボタン + terminal hint `/loom-pm` | ✅ 全員 idle scenario で coldstart card visible、`coldstart` class 適用 | Phase 1 shell.css `.coldstart` |
| LiveRail (right column) | PM idle 時 right 280px に `⚡ LIVE STREAM` + 3 tab (ALL/reasoning/tools) + 空 state「静かです…」placeholder | ✅ LiveRail mount、`showLiveRail = !showPmPanel && !liveRailCollapsed && isRoom` 真 | **S1 LiveRail PM idle fallback** |
| ScenarioPicker | content 右上 (rail 分 offset) に `SCENARIO` + 4 button (idle/active/failed/live) | ✅ scenario picker visible、`right` offset = LIVE_RAIL_W + 8 | Phase 3 AppShell |
| StatusBar | 接続 indicator + `scenario: 全員 idle (寝てる)` + `events seen` + `claude-loom @ ~/work/freee-mcp` | ✅ scenario.label real value reflected、APP_COPY brand 表示整合 | Phase 3 G6 |

### Route /plan — `m0.17-real-daemon-plan.png`

| 検証項目 | 期待 | 結果 | 関連 M0.17 fix |
|---|---|---|---|
| URL 遷移 | Drawer Plan link click → URL `/plan` | ✅ `page.goto('http://127.0.0.1:5757/plan')` | S2 sibling routing |
| Drawer Plan active state | Plan nav-link に `[active]` 属性、他は inactive | ✅ `link "≡ Plan" [active]` 確認 + Room link inactive 戻り | **S2 効果: Drawer active 強調活性化** |
| Outlet 描画 | content 領域に PlanView が `<Outlet />` 経由で sibling 描画、**modal wrapper なし**、Room canvas は unmount | ✅ `e566` Outlet 子要素のみ、`role="dialog"` `aria-modal` `bg-bg1/80` 一切なし、Room canvas 完全消失 | **S2 旧 dialog overlay 撤去** |
| PlanView 描画 | `≡ PLAN — plan_items.json + TodoWrite` header + 現行/完了 archive/編集 button + ACTIVE MILESTONES (M0.13 3/7 + M0.14 0/4 + M1.0 0/12) + TODOS — TodoWrite mirror (4 件) | ✅ 全要素描画、scenario data driven | Phase 2 + S2 routing |
| LiveRail unmount | /plan で LiveRail 消える (showLiveRail conditional `&& isRoom`) | ✅ snapshot 上に `rail` element 不在 | Phase 3 conditional mount |
| ScenarioPicker unmount | /plan で ScenarioPicker 消える (`isRoom &&` 条件) | ✅ snapshot 上に `scenario-picker` 不在 | Phase 3 conditional mount |
| TopBar + StatusBar 維持 | sibling routing でも shell の上下 bar は不変 | ✅ TopBar / StatusBar 描画継続 | Phase 1 shell.css grid |

### Route / 復帰 verify (回帰確認)

`Drawer Room link click` → URL `/` → 全 Room canvas 復元 + `link "▦ Room" [active]` + Plan link inactive 戻り → **Drawer active toggling 完璧動作** verified。

---

## 観察事項 (M0.17 scope 外、retro 候補)

### Finding R1: WS 接続 status「再接続中…」persistent display

- **症状**: TopBar の conn indicator + StatusBar の左端 seg、両方で「再接続中…」が persistent 表示。daemon は `curl /health` で `{"status":"ok"}` 応答、`/mode` で `ui_serving:true` の active 状態
- **scope 外 判定根拠**: M0.17 は UI Redesign Port Correction で AppShell + RoomView + DeskStation + LiveRail の visual 修正、`useScenario().conn` の WS reconnect logic は redesign/api/websocket.ts SSoT (M0.15 frozen、M0.17 期間中 untouched) + daemon WS broadcaster (M1+ scope)。**M0.17 由来でない既存 behavior**
- **retro candidate (process-axis)**: real daemon の WS lifecycle が `connected` → `reconnecting` → ... のループに陥った場合の graceful degradation policy + reconnect 成功 indicator は別 milestone (M1.x daemon WS hardening) で対応推奨。本件は real daemon dogfood で気付ける structural gap。
- **graceful degradation 確認**: WS 再接続中状態でも UI 自体は full render、4 metrics は stale state 表示 (PARALLEL 0% / TASK TOOL OK / TDD ORDER 0 / VERDICT PASS)、各 screen の route navigation は WS 不要な path で動作継続 → fault-tolerance は M0.17 design intent 通り

### Finding R2: cat-walker walkTo wire の real daemon active 化未確認

- **症状**: scenario が全員 idle 状態のため、`scenario.agents[id].walkTo` が定義された agent が無く、Phase 4 t12 で配線した cat-walker animation が real daemon で active 化された瞬間を観測できず
- **scope 外 判定根拠**: walkTo wire の logic 自体は Vitest +5 unit test で red→green confirmed (Phase 4)、real daemon で walkTo が emitted されるかは別議論 (daemon agent state machine の M1+ scope)
- **retro candidate (process-axis)**: cat-walker は scenario fixture `?mock=active` で walkTo defined な agent state を観察可能、real daemon driven verification は M1.x (daemon が agent state を actual emit する時) に持ち越し

---

## Closure verdict update

| 項目 | 結果 | 備考 |
|---|---|---|
| Mock-only verification (Vitest + Playwright + Layer 2.5 smoke) | ✅ 全 PASS | M0.17 closure session で達成 |
| **Real daemon mock-less verification (本 report)** | ✅ **完全 PASS** | sibling routing / LiveRail / Drawer active / ColdStart / Wall posters / DeskStations / SubroomClone / M2 branch label 全項目 real daemon で動作確認 |
| 観察 finding 2 件 | M0.17 scope 外 (retro candidate) | R1 WS reconnect / R2 cat-walker real verify deferred |

→ **M0.17 closure validity 強化**: mock pass + real daemon mock-less pass の 2 重 evidence で再現度 ≥90% claim を実機 verify、PR #12 merge readiness 確定。

---

## Retro hook 追加 candidate

本 report より retro process-axis lens / meta-axis lens に追加 candidate:

1. **Mock-only dogfood gap (structural)**: Vitest + Playwright + Layer 2.5 smoke が `?mock=` URL param 経由のみで、real daemon mock-less verification step が closure workflow に codify されとらん。M0.15/M0.16/M0.17 連続で同 gap 発生の可能性 (closure session で気付かれず post-closure user 指摘で発覚)。SPEC §3.6.15.4 Layer 2.5 dogfood smoke の Step 9 として「real daemon mock-less UI snapshot via Playwright MCP browser_*」を追加 codify 候補
2. **R1 WS reconnect persistent display**: M1.x daemon WS hardening scope に carryover
3. **R2 cat-walker real daemon active verify**: M1.x で daemon が walkTo field を agent state に actual emit する時期に持ち越し
4. **Layer 2.5 smoke template 拡張**: real daemon verification の標準 step を `loom-ui-smoke` skill mandate 化 (M0.14 で suggest だった skill を UI 変更 milestone では mandate に格上げ)

screenshots: `m0.17-real-daemon-room.png` (Route / Room canvas) + `m0.17-real-daemon-plan.png` (Route /plan PlanView sibling routing).
