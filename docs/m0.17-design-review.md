# claude-loom UI — 本実装 vs Redesign App.html レビュー

レビュー対象: `yutron24ah/claude-loom@main` の `ui/src/**`
基準: 本プロジェクトの `Redesign App.html`（SSoT） / `redesign/screens/room.jsx`
日付: 2026-05-14

---

## TL;DR

本実装は **「設計案 ≒ アプリの本体」** という思想を尊重して作られていて、
骨格はある程度移植されています（Room コンポーネント、ポスター、シナリオ駆動）。

ただし、**3つの致命的バグ** と **6〜7個の構造的ズレ** によって、
画面の見え方が設計案と「別物」になっています。再現度は体感 **30〜40%**。

直す順番が大事なので、優先度付きで列挙します。
コードもこのプロジェクトに書き起こしてあります。

---

## 🔴 致命バグ (P0) — まずこの3つ

### B1. シェル CSS が一行も移植されていない

| | 内容 |
|---|---|
| 症状 | TopBar が縦並びに、Drawer がサイドバーにならず viewport 外に流れる、StatusBar が無い、ScenarioPicker のレイアウトも崩れている |
| 原因 | `ui/src/styles/index.css` が tokens.css + Tailwind preflight + body フォントしか持っていない。`AppShell.tsx` が前提にしているクラス `.shell / .top / .top__* / .drawer / .nav-link / .content / .statusbar / .scenario-picker / .pm-chat / .rail / .coldstart` 等の CSS が**1つも存在しない**（プロジェクト内 grep で 0 件） |
| 期待 | Redesign App.html L8-280 の `<style>` ブロックを CSS ファイルに切り出して import |
| 修正物 | **`ui/src/styles/shell.css`（本プロジェクトに作成済み）** + `index.css` への `@import './shell.css';` 追加 |

→ **これを直すと画面の8割は治る。最優先。**

---

### B2. ゾーン（DEV / PM / REVIEW）が「箱」になっている

| | 内容 |
|---|---|
| 症状 | スクショで濃い紫の塗りつぶし＋太枠の長方形がオフィスを3分割している。「同じ部屋の中で猫が隣ゾーンに歩いていく」連続感が完全に消えている |
| 原因 | `Islands.tsx` が DOM `<div class="room-island room-island--{pm,dev,review}">` を後乗せ。`tokens.css` L590-603 で `border: 3px solid var(--p-border)` + `::before { border: 2px solid }` の **二重枠** が当たっている |
| 期待 | 設計案 `redesign/screens/room.jsx` L227-244 はゾーンを **`RoomBackground` 内の SVG `<rect opacity="0.30" />` + `<text opacity="0.16" letter-spacing="8" />`** として、床のラグ + 床に薄く透かしたゾーン名で表現する。**枠線は無い** |
| 修正物 | **`ui/src/views/room/RoomBackground.proposed.tsx`（本プロジェクトに作成済み）** に新版あり。`Islands.tsx` は削除、`tokens.css` の `.room-island*` / `.room-sign--island--*` も削除 |

---

### B3. RoomView が固定サイズ + ハードコード座標

| | 内容 |
|---|---|
| 症状 | ビューポートが広いとデスクが左寄り。下に大きな余白。PM が画面中央上寄りで GANTT/PLAN/INBOX 領域とぶつかる |
| 原因 | `RoomView.tsx` が `width = 1080, height = 660` をデフォルト引数で受けて、`buildPositions(width)` で `pm: {x: width/2-50, y:220}` のような **絶対値混在の固定座標**。ResizeObserver は無い |
| 期待 | 設計案 `redesign/screens/room.jsx` L385-393 で ResizeObserver が `contentRect` を読んで `{w,h}` を state に保存、`positions` を `floorY = H * 0.43` ベースの**比率計算**で出す（`pm: { x: W*0.78, y: floorY+50 }` 等） |
| 修正物 | **`ui/src/views/room/RoomView.proposed.tsx`（本プロジェクトに作成済み）** に新版あり |

---

## 🟠 構造的ズレ (P1)

### S1. PM 非起動時の右カラムが空っぽ

`AppShell.tsx` は `showPmPanel = pm.running || pendingApprovals.length > 0` の時だけ右パネルを出す。idle シナリオではコンテンツの右側が完全に空白に。

設計案 `redesign/screens/room.jsx` L432-441 では、PM が動いていない時の代替として **`LiveRail`** （tool/reasoning イベントを混在表示するサイドパネル）を出す。

**修正物**: `ui/src/views/room/LiveRail.proposed.tsx`（本プロジェクトに作成済み）。
**配線方法**: `AppShell.tsx` の `{showPmPanel && <PMChatPanel.../>}` を以下に置き換え:

```tsx
{showPmPanel ? (
  <PMChatPanel ... />
) : (
  <LiveRail
    stream={scenario.stream}
    collapsed={liveRailCollapsed}
    onToggle={() => setLiveRailCollapsed(c => !c)}
  />
)}
```

---

### S2. ポスター遷移が二重実装

現状:

- `RoomView.tsx` 内に `showGantt / showPlan / showConsistency` の useState + `<div className="room-modal">` でモーダル4種
- `AppShell.tsx` で `/gantt /plan /consistency` ルート + Outlet を**全画面 dialog として被せる**

→ 同じことが2系統で実装されている。さらに後者が `isPanelOpen` のとき Room を `fixed inset:0` のオーバーレイで覆うので、結果的に **Drawer の active 状態が活きない**（Room が背景にしか見えない）。

**設計案の意図**: Drawer のナビ項目はそれぞれ独立した画面。Room と Plan は**同列の Screen**で、`active === 'room' ? <RoomScreen /> : <PlanScreen />` のように切り替える（Redesign App.html L443-455）。ポスターは Room 画面の「壁紙」なのでクリックでルート遷移していい。

**修正**:
1. `RoomView.tsx` から `showPlan/showGantt/showConsistency/showSubroom` state と `<div className="room-modal">` 4つを**削除**（`RoomView.proposed.tsx` 適用済み）。ポスターの onClick は `navigate('/plan')` 等。
2. `AppShell.tsx` の `isPanelOpen` 分岐を**外し**、`Outlet` をフルスクリーンモーダルではなく **content 領域の通常配置**にする：

```tsx
// AppShell.tsx 修正前
<div className="content">
  <RoomView />
  {isPanelOpen && <div className="bg-bg1/80 ..."><Outlet /></div>}
</div>

// AppShell.tsx 修正後
<div className="content">
  {location.pathname === '/' ? <RoomView /> : <Outlet />}
</div>
```

これで Drawer のクリック → URL 変更 → 該当画面が content に lay される。Room は `/` の時だけ表示。

---

### S3. REVIEW ゾーンのデスク配置

`RoomView.tsx` L86-94:
```ts
'rev-code': { x: width - 270, y: 400 },
'rev-test': { x: width - 160, y: 400 },
'rev-sec':  { x: width - 270, y: 480 },  // ← rev-code の真下
```

→ T 字配置。設計案は3匹横並び（`W*0.62, W*0.74, W*0.86` の同 y 列）。

`RoomView.proposed.tsx` で修正済み。

---

### S4. ワークツリー clone が dev デスクの右に張り付く

`RoomView.tsx` L96-100 は座標固定（`{x:218, y:408}, {x:252, y:446}`）。
設計案は dev デスクの**上方**にミニ猫が並ぶ：`positions.dev.x + 60 + i * 56, positions.dev.y - 60`。

`RoomView.proposed.tsx` で修正済み。

---

### S5. デコレーション過多

`RoomView.tsx` L195-219 で `<Plant>` を2つ DOM 配置。
設計案では SVG プロップ（鉢植え1 + シェルフ + ウォータークーラー）を `RoomBackground` 内で描く（`redesign/screens/room.jsx` L181-204）。

DOM `<Plant>` は **削除**して `RoomBackground.proposed.tsx` のプロップに統一推奨。

---

### S6. `cat-walker` アニメーションが未実装

設計案では `state.walkTo` が定義された猫は隣ゾーンへ歩くアニメーション（`room.jsx` L60-64 + L107-115）。`shell.css` に `@keyframes cat-walk-trip` と `.cat-walker` は移植したが、`DeskStation.tsx` 側でこの walk prop を受けて `--walk-dx / --walk-dy` CSS変数を流す配線が必要。

優先度低いので、まず B1〜B3 と S1〜S2 を直してから。

---

## 🟡 雑多 (P2)

| | 内容 |
|---|---|
| M1 | Room 画面右上の「🐱 レトロ開始」CTA は `RoomModeToggle`。設計案では Drawer の MANAGE グループから入る導線（Retro 専用画面）。在りでもいいが、設計案では Room 画面には固定 CTA を置いていない。判断要 |
| M2 | branch ラベルの文言が「`claude-loom — branch: main`」のように見える（スクショ）。設計案では `◆ branch: {scenario.branch}` のみ。`claude-loom` 名はトップバー責務 |
| M3 | フォント。設計案は `ui-monospace, "SF Mono", Menlo, Consolas, monospace`。tokens.css の `--font-sans` も確認するべき |

---

## 修正計画（優先度順）

### Phase 1: シェル復旧（半日）

1. ✅ `ui/src/styles/shell.css` を追加（**本プロジェクトに作成済み**）
2. `ui/src/styles/index.css` に `@import './shell.css';` を1行追加（**`index.css.proposed` に差分案あり**）
3. `tokens.css` の `--p-bg-floor`, `--p-bg-floor-2`, `--p-rug`, `--p-rug-2`, `--p-wall`, `--p-wall-2`, `--p-wood`, `--p-wood-dark`, `--p-screen`, `--p-screen-glow`, `--p-shadow`, `--p-ok`, `--p-bad`, `--p-success`, `--p-warn`, `--p-error`, `--p-stone`, `--p-accent`, `--p-accent-soft`, `--p-tint`, `--p-paper`, `--p-text`, `--p-text-muted`, `--p-bg-sky`, `--p-border` の存在確認
4. `playwright` の `room.png` ベースラインを撮り直し

**完了基準**: TopBar が 36px の横バーになる、Drawer が 168px のサイドバーになる、StatusBar が 24px の下バーになる、ScenarioPicker が右上に正しく出る。

---

### Phase 2: ゾーン再描画 + 比率レイアウト（半日）

1. `RoomBackground.tsx` を `RoomBackground.proposed.tsx` の内容で置換
2. `Islands.tsx` を削除（`RoomView.tsx` import も削除）
3. `tokens.css` から `.room-island`, `.room-island::before`, `.room-island--pm`, `.room-island--dev`, `.room-island--review`, `.room-island--review::before`, `.room-sign--island--pm`, `.room-sign--island--dev`, `.room-sign--island--review` を削除
4. `RoomView.tsx` を `RoomView.proposed.tsx` の内容で置換
   - `width`/`height` props を削除（呼び出し側 AppShell.tsx 1箇所だけなので簡単）
   - ResizeObserver 追加
   - `Islands` import 削除
   - 4種のモーダルを削除、ポスターの onClick を `navigate('/...')` に
   - SUBROOM_CLONES の固定座標を `scenario.worktrees.filter().slice().map()` に
   - `<Plant>` 2件を削除

**完了基準**: ビューポート幅を変えるとデスクが追従する、ゾーン境界の太枠が消える、床に薄くゾーン名が透ける。

---

### Phase 3: ルーティングと LiveRail（半日）

1. `AppShell.tsx` の `isPanelOpen` 分岐を撤去、`Outlet` を通常配置に変更（S2 参照）
2. `AppShell.tsx` の `Escape key → navigate('/')` も撤去（モーダルじゃなくなったので）
3. `LiveRail.tsx` を `LiveRail.proposed.tsx` の内容で作成
4. `AppShell.tsx` の右カラム mount を「`showPmPanel ? PMChat : LiveRail`」に分岐
5. 個別画面（PlanView, GanttView, ConsistencyView, ...）を modal panel ではなく**普通の画面**として動くように内側の `className="bg-bg1/80 ..."` ラッパを外す

**完了基準**: Drawer の Plan をクリックすると content 領域が PlanView に切り替わる、URL は `/plan`、Drawer の Plan に active 強調が付く。

---

### Phase 4: 細部（任意・1日）

1. `cat-walker` 配線（DeskStation に `walkTo` prop）
2. RoomModeToggle 撤去 or 縮小、retro を独立ルートに
3. SubroomClone のラベル重なり調整
4. Speech bubble の tail 確認（既に DeskStation で実装済みだが、設計案の position と微差あり）
5. Playwright スナップショット全種再撮影

---

## クリーン実装のための設計指針

### G6. **トークン化を徹底する（最優先ポリシー）**

ユーザー方針: 「軒並みトークン化したい。CSSはインラインじゃなくクラス、文字列も定数化」

実装ルール:

| 対象 | 置き場所 | 例 |
|---|---|---|
| 色（hex / rgb / oklch） | `tokens.css` の `:root { --p-* }` | `--p-zone-dev`, `--p-prop-plant-leaf` |
| z-index | `tokens.css` の `--z-*` スケール | `--z-pm-modal: 20` |
| レイアウト比率 | `tokens.css` の `--room-*-ratio` | `--room-floor-ratio: 0.43` |
| サイズ（デスク幅・モニタ等） | `tokens.css` の `--desk-*` | `--desk-width: 96px` |
| 表示文字列・コピー | `*/constants.ts` の `export const X_COPY` | `COLD_START_COPY.title` |
| 構造化テーブル（NAV/ZONE 等） | `*/constants.ts` | `NAV_GROUPS`, `ZONES` |
| 動的に変わる px（responsive） | TSX inline `style={{ width: W }}` のみ可 | `RoomView` の `size.w` 等 |

**禁則**:
- TSX に hex 色を書かない（例外: マークアップ内に CSS var を渡せない時のみ）
- TSX に巨大な `style={{ background: ..., padding: ..., ...20行 }}` を書かない → 必ずクラス化
- TSX に「DEV PIT」「WS connected」等の表示文字列をベタ書きしない → `*/constants.ts`
- z-index に生の数値を書かない → `var(--z-*)`

このルールを適用したファイル：
- ✅ `tokens.css.patch` — 色・z-index・比率・サイズの token 追加
- ✅ `room.css` — DeskStation/SubroomClone/Poster の inline 廃止用クラス
- ✅ `shell.css` — シェル全体
- ✅ `routing/constants.ts.proposed` — `NAV_GROUPS`, `SCENARIO_KEYS`, `APP_COPY`
- ✅ `views/room/constants.ts.proposed` — `ROOM_AGENT_IDS`, `ZONES`, `COLD_START_COPY`, `LIVE_RAIL_TABS` 他
- ✅ `RoomBackground.proposed.tsx` — ゾーン色を `var(--p-zone-*)` 参照に
- ✅ `AppShell.proposed.tsx` — `APP_COPY` 経由で文字列を constants から
- ✅ `LiveRail.proposed.tsx` — `LIVE_RAIL_TABS` をループで

未着手（次フェーズで個別に対応）:
- `DeskStation.tsx` — 巨大 inline スタイルブロックを `room.css` の `.desk-station__*` クラスに置換（room.css は用意済み、コンポーネント側 import & class 置換が残作業）
- `RoomView.proposed.tsx` の coldstart / sign 等の inline → constants.ts の `COLD_START_COPY` 参照に書き換え

---

### G1. **CSS の権威を1ファイルに**

shell.css に書いたものは `Redesign App.html <style>` を SSoT としてバージョン管理してください。
**コンポーネントの inline style に書き直さない**こと。理由:

- inline で書くと「直し漏れ」が必ず出る（実際 Islands.tsx と shell.css にゾーンが2箇所書かれてた）
- inline は CSS 変数の `:hover/:active` 等の擬似状態が扱いにくい
- デザイントークンを変えた時の波及が読めなくなる

CSS Modules / styled-components に移すなら、その時は **Redesign App.html の `<style>` ブロックも一緒に消す** こと（SSoT 二重化を防ぐ）。

### G2. **レイアウトはコンテナサイズ駆動**

「`width=1080, height=660` がデフォルト」みたいな引数は **絶対に書かない**。
親要素のサイズを ResizeObserver で読んで自分の座標を計算するのが Room コンポーネントの責務。

設計案で `useScenario` を hook として渡してるのと同じ思想で、サイズも内部 state として持つ。

### G3. **モーダルは「画面の上に重ねる必要が本当にあるとき」だけ**

Plan / Gantt / Consistency は**それぞれ独立した画面**。Room 画面のオーバーレイにする必要は無い。
理由:

- Drawer の active 強調が活きる
- URL とビューの対応が1対1で素直
- 戻る/進むがちゃんと動く
- AgentDetailPanel のように「Room 上にコンテキスト保ったまま見たい」ものだけがオーバーレイ

### G4. **scenario を全画面で**

`useScenario()` は AppShell でも RoomView でも各 Screen でも呼んでいい（コンテキスト経由）。
ただし「Room 専用の state」（`sel`, `retroMode`）はそのコンポーネントの中だけ、Zustand store に上げない。今の `useViewStore.setSelectedAgentId` は AgentDetailPanel が別画面化したら不要になる。

### G5. **ピクセル芸を SVG に集約**

ピクセル風UIの「テクスチャ」（木目、ラグ、壁紙ドット、プロップ）は全部 `RoomBackground` の SVG に持つ。`<Plant>` を別 DOM コンポーネントにする発想は、確かにそれっぽいけど座標とサイズが分散して保守が辛い。レイヤが1枚で済む。

---

## 本プロジェクトに用意したファイル一覧

| パス | 役割 |
|---|---|
| **`ui/src/styles/shell.css`** | **B1 修正用**。Redesign App.html の `<style>` を切り出した本物。そのままコミット可 |
| **`ui/src/styles/room.css`** | **G6 適用**。DeskStation/SubroomClone/Poster の inline スタイル受け皿クラス |
| `ui/src/styles/index.css.proposed` | `@import './shell.css'; @import './room.css';` を入れた差分案 |
| `ui/src/styles/tokens.css.patch` | **G6**。zone 色 / prop 色 / z-index / 比率 / サイズの token を追加（既存 tokens.css の末尾に append） |
| `ui/src/views/room/RoomBackground.proposed.tsx` | **B2**。ゾーン SVG 化。色は `var(--p-zone-*)` `var(--p-prop-*)` 参照 |
| `ui/src/views/room/RoomView.proposed.tsx` | **B3 + S2 + S3 + S4 + S5**。ResizeObserver / 比率座標 / モーダル撤去 |
| `ui/src/views/room/LiveRail.proposed.tsx` | **S1**。PM 非起動時の右カラム |
| `ui/src/views/room/constants.ts.proposed` | **G6**。`ROOM_AGENT_IDS`, `ZONES`, `COLD_START_COPY`, `LIVE_RAIL_TABS` 等 |
| `ui/src/routing/AppShell.proposed.tsx` | **S2 + G6**。Outlet オーバーレイ撤去、文字列を `APP_COPY` から |
| `ui/src/routing/constants.ts.proposed` | **G6**。`NAV_GROUPS`, `SCENARIO_KEYS`, `APP_COPY` |
| **`ui/src/views/room/DeskStation.proposed.tsx`** | **G1+G6**。inline スタイル全廃、`.desk-station__*` クラス利用、`STATUS_COLOR` 定数廃止、`deskColor` prop 削除 |
| `REVIEW.md` | このドキュメント |

`*.proposed.{tsx,ts}` と `*.patch` は本プロジェクトでは TS/CSS が compile されないので参考実装の位置付け。
リポ側に当てる時は:

1. `.proposed` 拡張子を外して既存ファイルを置換
2. `tokens.css.patch` の中身を `tokens.css` 末尾に append
3. `Islands.tsx` を削除、`tokens.css` から `.room-island*` ルールを削除
4. `index.css` を `index.css.proposed` の内容に
5. `DeskStation.tsx` の inline `style={{...}}` を `room.css` の `.desk-station__*` クラスに置換 — **`DeskStation.proposed.tsx` で対応済み**

### 補足: DeskStation の置換ポイント

| Before（inline） | After（class） |
|---|---|
| `style={{ position: 'absolute', left: x, top: y, width: 100 }}` | `className="desk-station"` + `style={{ left: x, top: y }}` のみ（動的座標のため例外） |
| `style={{ display: 'inline-block', background: ..., border: ..., padding: ..., ... }}` (bubble 13行) | `className="desk-station__bubble"` |
| bubble tail（`<span style={{...rotate(45deg)}}>`） | `::after` 擬似要素で room.css 内に統合 |
| `style={{ width:64, height:36, background: status==='fail'?...:..., ... }}` (monitor 10行) | `className="desk-station__monitor desk-station__monitor--{fail|idle|''}"` |
| `STATUS_COLOR` 定数 (busy/idle/review/fail/tdd → CSS var) | `desk-station__status-dot--{status}` 修飾子クラス |
| monitor 内コード行 4本の `style={{height:2, width:'70%'}}` | `desk-station__monitor-line--w{70|50|85|40}` 修飾子クラス |
| `style={{ width:12, height:4, ...stand 6行 }}` | `desk-station__stand` |
| `style={{ width:96, height:8, background: deskColor ... }}` | `desk-station__top`（`deskColor` prop 廃止、tokens で対応） |
| `style={{ marginTop:4, fontSize:9, fontFamily:..., color:..., fontWeight:700 }}` (nameplate) | `desk-station__nameplate` + `desk-station__role` |
| `STATUS_COLOR` 定数の削除 | room.css の `.desk-station__status-dot--*` 修飾子に移譲 |

**API 互換性**: `deskColor` prop だけ削除（tokens.css の `--p-wood` で統一）。それ以外 (`x, y, cat, status, task, scroll, tdd, label, onClick, selected`) は完全に同じ。既存呼び出し側 `RoomView.tsx` は無修正で動く。

---

## 確認済み方針（2026-05-14）

1. **`Outlet` 全画面オーバーレイは意図ではなかった** → S2 は完全撤去（route ＝ sibling screen 方式）。`AppShell.proposed.tsx` で対応済み
2. **`RoomModeToggle`（Room 右上 CTA）は任せる** → 当面残すが、`room.css` 側で主張を弱める（次フェーズ）
3. **「軒並みトークン化したい」** → G6 を採用。色・z-index・比率・サイズ・文字列・構造化テーブルを全部 tokens / constants へ。`tokens.css.patch`, `room.css`, `*/constants.ts.proposed` で実装済み
