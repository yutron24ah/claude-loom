# Screen implementation review

_Started 2026-05-13 12:46 UTC_

---

## User

https://github.com/yutron24ah/claude-loom

画面本実装しました
まだ全然ダメだと思うんですよね
ちょっと実装案との差分をレビューしてください

## Assistant

_[tool: list_files]_

_[tool: view_image]_

_[tool: show_html]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: read_file]_

_[tool: view_image]_

_[tool: save_screenshot]_

_[tool: view_image]_

実装スクショと設計案（Redesign App.html）を並べて比較しました。本実装、まだ全然 *Redesign App.html とは別物* というのが正直なところで、再現度でいうと **30〜40%** くらいの体感です。差分を、影響の大きい順に整理します。

---

## 🔴 致命的に欠けている要素（設計案の骨格）

### 1. アプリシェル全体が描画されていない
設計案では `shell` = `top bar (36px) / main (1fr) / statusbar (24px)` の3段グリッドで、画面全体を覆うフレームになっています。実装スクショでは：

- **トップバー（メトリクスバー）が無い** — `PARALLEL 0% / TASK TOOL OK / TDD ORDER 0 VIOLATIONS / VERDICT PASS / WS connected` の4チップが横一列に並ぶ。これは「規律ダッシュボード」として設計案の核なので、無くなると claude-loom の世界観が消えます。
- **左の Drawer（ナビ）がレンダリングされていない** — 左端にプレーンテキストが縦に積まれてビューポート外にはみ出しています（`Claude-loom OPERATE ◆Room ≡Plan ▭Gantt…`）。設計案では `width: 168px` のサイドバーで `OPERATE / MANAGE / SETTINGS` の3グループ、各項目にアイコン枠 + ラベル + active 状態の左ボーダー強調があります。**今のレンダリングだとそもそも `.shell` / `.drawer` / `.top` の CSS が当たっていない可能性が高い**。
- **下のステータスバー（24px）が無い** — `WS connected · scenario: Dev サブエージェント実行中 · events seen: 1,247 · ~/work/freee-mcp` の常時表示。

→ **最優先で直したい**。これが無いと「アプリ」じゃなくて「ルームの絵」だけになってしまう。

### 2. 右カラム（PM Chat / Live Stream）が丸ごと無い
設計案では `pm.running === true` のときに 340px の右パネルが立ち上がり、`◆ PM CHAT / ⚡ STREAM` のタブ切替で会話とイベントストリームを出します（active シナリオでは PM ←→ user の会話履歴と入力欄が表示される）。実装には完全に欠落。

→ Room 画面の重要 surface の半分くらいがこの右パネルなので、ここが無いと PM とのインタラクションが死んでいる。

---

## 🟠 視覚言語のズレ（雰囲気が変わる原因）

### 3. ゾーン（DEV / PM / REVIEW）の表現が「強すぎる」
| | 設計案 | 実装 |
|---|---|---|
| ゾーン背景 | フロアに **淡いパステルのラグ** (`opacity: 0.30`、枠線なし) | **濃い紫の塗りつぶし + 太い枠線** の長方形 |
| ゾーンラベル | 床に薄く透かした **大きな文字** (`DEV PIT` / `MANAGER` / `REVIEW`, `opacity: 0.16`, `letter-spacing: 8`) | デスク上に乗った **オレンジ/緑/紫の小タグ** (`◆ DEV` / `◆ REVIEW` / `◆ PM`) |
| 部屋の境界 | 1つのオープンオフィスとして連続 | ゾーンごとに **箱で仕切られて見える** |

設計のコメントにも `// 1つのオープンオフィス、partition なし` と明記している通り、**「同じ部屋の中で猫がふらっと隣のゾーンに歩いていける」** という連続感が、実装だと完全に分断されてしまっています。これが見た目を最も「設計案と違う」感じにしている主因です。

### 4. PM の配置
- **設計案**: `pm: { x: W * 0.78, y: floorY + 50 }` → 右上の角に1匹だけ、マネージャー席として孤立
- **実装**: 画面中央上寄り、DEV と REVIEW の間に挟まれて配置

→ 「PM＝管理職、フロアを見下ろす位置」というメタファが効かなくなっている。

### 5. 壁／床のテクスチャ
- 設計案は **木目フロア**（横線 `opacity: 0.18` + 縦線 `opacity: 0.10` の細い線で板目を表現）+ 2段の壁（上が `--p-wall`、下が `--p-wall-2`、間に木の幅木）
- 実装は **タイル風のチェッカー** に見える（特に REVIEW ゾーン）。 壁は1段で、上半分は単色のベージュ。

### 6. 吹き出し（currentTool / currentReasoning）が出ていない
設計案では active な猫の上に小さなノート風吹き出しが出て、`[Edit] user.service.test.ts` のように **オレンジのツールタグ + 行為の説明** が表示されます。実装ではサバ猫の下に小さく `Edit user.service.test...` らしき表記が見えますが、設計の `Desk` コンポーネントの `bubble` 表現（上向きの吹き出し、tail 付き、`box-shadow: 2px 2px 0 0` の影）にはなっていません。

### 7. ワークツリー clone の表現
- 設計案: 親デスクの**上方**にミニ猫 (32px) が並ぶ。`subroom-clone__dot` で busy/review/idle の色付きインジケータ + `@branch` ラベル。
- 実装: ミニ猫 + ラベルは出ているが、配置が親猫の **右隣**に張り付いていて、`@feat/oauth` と `@fix/test-flake` のラベルが重なり気味。

---

## 🟡 設計案に無い「勝手に足された」要素

- 右上の **「🐱 レトロ開始」ボタン** — Redesign App.html には存在しません。レトロは左 Drawer の MANAGE グループから入る設計になっています。Room 画面に固定 CTA を置く必要は無さそう（置くにしても、置き場所と意図を整理してから）。
- branch ラベルの「`claude-loom — branch: main`」 → 設計案では `◆ branch: {scenario.branch}` だけで `claude-loom` 二重表記は不要（プロジェクト名はトップバーの `top__pj` チップ側の責務）。

---

## 🟢 ちゃんと再現できている部分（褒めポイント）

- 3つの掲示物（GANTT / PLAN / 整合性INBOX）の **配置と中身の構造**は OK。色とフォントも近い。
- 猫スプライト、デスク（モニタ + キーボード + 木目天板）の **ピクセル表現** は崩れていない。
- worktree clone の存在自体は出している。
- 時計と branch サインの場所は概ね正しい。
- 鉢植えなどのプロップで余白を埋める発想は拾えている（ただし設計案より数が多く、置き場所もやや散漫）。

---

## 推奨する直し順

1. **`shell` / `top` / `drawer` / `statusbar` の CSS を実装側にも当てる** — まず「アプリの枠」を完成させる。これが一番効きます。
2. **右の PM Chat / Live Stream パネルを実装** — Room 画面の右半分は本来この surface のための場所。
3. **ゾーンの塗りを「ラグ」レベルまで薄くする** + **枠線を消す** + **ラベルを床透かしへ移動**。`opacity: 0.30`、`fill-only`、ボーダー無し。
4. **PM を右上の角に再配置**、DEV を左の広いエリアに広げる（座標は `redesign/screens/room.jsx` の `positions` / `zones` を素直に移植すればいい）。
5. **active 猫の吹き出し**を `Desk` コンポーネントの `bubble` 仕様通りに出す。
6. 床テクスチャを木目（横線＋縦線）に置換。
7. 「レトロ開始」CTA を取る、もしくは Drawer 経由に統一。

---

GitHub の `yutron24ah/claude-loom` 側の実装コードも見たほうがレビュー精度上がるので、もしレビューを続けるなら**実装のソース（特に Room 画面の JSX / CSS）をプロジェクトに import** してもらえると、CSS 変数の食い違いとか具体的なクラス名レベルまで指摘できます。やりますか？

## User

やってください

## Assistant

_[tool: github_list_repos]_

_[tool: github_get_tree]_

_[tool: github_get_tree]_

_[tool: github_get_tree]_

_[tool: github_get_tree]_

_[tool: github_import_files]_

_[tool: view_image]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: grep]_

_[tool: grep]_

ソース読みました。問題が明確になりました。**実装は構造はかなり頑張ってる**んですが、ピンポイントで2〜3個の小さなバグが視覚を大きく壊しています。

---

## 🔴 根本原因 #1: シェルの CSS が **一行も移植されていない**

`ui/src/routing/AppShell.tsx` は `className="top"`、`"drawer"`、`"statusbar"`、`"shell"`、`"scenario-picker"`、`"top__pj"`, `"top__metrics"`, `"top__conn"`, `"nav-link"` などのクラス名を使って組み立てているのに、

```
grep "\.top\b|\.drawer\b|\.statusbar\b|\.shell\b|\.scenario-picker" ui/
→ No matches found.
```

`ui/src/styles/index.css` は **tokens.css の import + Tailwind preflight + body フォントだけ** で、`Redesign App.html` の `<style>` 280 行が丸ごと欠落しています。

その結果：
- `.top` がないので **TopBar が 36px の横バーにならず、各 `<button>`/`<div>` が縦に流れる**
- `.drawer` がないので **Drawer がサイドバーにならず、`width: 168px` も `border-right` も効かず、テキストが viewport 外に押し出される**
- これがスクショ左端の `Claude-loom OPERATE ◆Room ≡Plan…` の正体（Drawer のリンクラベルが素のフロー文書として表示されている）

**修正**:
```css
/* ui/src/styles/index.css にこの一節を足す */
@import './shell.css';
```
で別ファイル `shell.css` を作って、`Redesign App.html` の L8〜L150 の `.shell / .top / .top__brand / .top__pj / .top__metrics / .top__menu / .top__conn / .main / .drawer / .drawer.collapsed / .drawer__group / .nav-link / .content / .statusbar / .scenario-picker` を **ほぼコピペで** 移植する。Tailwind と共存しても問題ないクラス名空間です。

---

## 🔴 根本原因 #2: Island（ゾーン床）が「ラグ」ではなく「箱」になっている

`ui/src/styles/tokens.css` L590〜603 ：

```css
.room-island {
  position: absolute;
  border: 3px solid var(--p-border);   /* ← これが太枠の正体 */
  z-index: 0;
}
.room-island::before {
  content: ""; position: absolute; inset: 5px;
  border: 2px solid var(--p-border);    /* ← もう一段の二重枠 */
}
.room-island--pm     { background: var(--p-rug); }
.room-island--dev    { background: var(--p-rug-2); opacity: 0.75; }
.room-island--review { background: var(--p-rug); opacity: 0.85; }
```

→ これでスクショの **濃い紫塗りつぶし＋ダブル枠** になります。

設計案 `redesign/screens/room.jsx` L227〜244 では、ゾーンは **`RoomBackground` の SVG の中**で

```jsx
<rect ... fill={z.tint} opacity="0.30" rx="2" />   // 枠線なし
<text ... fontSize="16" letterSpacing="8" fill={z.fg} opacity="0.16">DEV PIT</text>
```

として描かれる（薄いラグ + 床に大きく透かしたゾーン名）設計です。実装は `Islands.tsx` で **別の `<div>` 重ね** にしてしまい、レイヤ構造そのものが違います。

**修正の方向性は2択**:
- **A（推奨・設計に忠実）**: `Islands.tsx` を破棄し、ゾーンを `RoomBackground.tsx` 内の SVG `<rect>` + `<text>` として描く。`.room-island*`/`.room-sign--island--*` クラスを削除。
- **B（最小変更）**: `.room-island` を `border: none; opacity: 0.30; z-index: 0;` に変える + `::before` を `display: none;` に。さらに `Islands.tsx` の絶対サイズ・座標を viewport 比率（`width * 0.55` 等）に書き直す。`◆ PM` などの sign タグはサイズと位置を大幅に変えて床透かしに寄せる。

---

## 🔴 根本原因 #3: ResizeObserver を捨てて固定 1080×660 になっている

設計案 `room.jsx` L386〜393：
```js
const ro = new ResizeObserver(([e]) => {
  const r = e.contentRect;
  setSize({ w: Math.max(900, r.width), h: Math.max(560, r.height) });
});
```
→ コンテンツ領域に合わせてフロアの `floorY`, ゾーン幅, 猫の `positions` が全部スケールする。

実装 `RoomView.tsx`:
```ts
export function RoomView({ width = 1080, height = 660, ... })
function buildPositions(width: number) {
  return {
    pm: { x: width / 2 - 50, y: 220 },          // ← 設計は W*0.78, floorY+50
    dev: { x: 130, y: 400 },                    // ← 設計は W*0.18, floorY+80
    'rev-code': { x: width - 270, y: 400 },     // ...
    ...
  };
}
```

固定サイズ + ハードコード座標になっていて、

- ビューポート幅が広いと **デスクが左寄り**になって右側が空白に
- 高さが固定なので **下部に大きな余白**が出る（スクショの REVIEW ゾーン下の空白がそれ）
- PM の y 座標 220 は **GANTT/PLAN/INBOX の領域とぶつかる位置**で、結果ポスターを避けて中央配置のように見えてしまう

**修正**: `RoomView` に ResizeObserver を入れ、`buildPositions(W, H, floorY)` を w,h 両方の関数に。 `floorY = H * 0.43` をベースに `pm`/`dev`/`rev-*` を比率で計算（設計の `positions` テーブルそのまま移植）。

---

## 🟠 その他、設計と食い違っている点

| # | 場所 | 問題 |
|---|---|---|
| 4 | `RoomView.tsx` L88-94 | `'rev-sec'` が `x: width-270, y: 480` で **rev-code と同じ列** に配置されている。設計案では `{ x: W*0.86, y: floorY+(H-floorY)*0.55+40 }` で**ハカセ/ペン/メメの3匹横並び**。スクショの REVIEW ゾーンが 3 + 1（下にシノビ）の T 字配置に見えるのはこのバグ |
| 5 | `RoomView.tsx` L96-100 | `SUBROOM_CLONES` が `{branch:'feat/oauth', x:218, y:408}` で固定。設計案ではループで `positions.dev.x + 60 + i * 56, positions.dev.y - 60` ＝ **dev デスクの上に並ぶ** |
| 6 | `RoomView.tsx` 全体 | `LiveRail`（PM が動いていない時のフォールバック）が **実装されていない**。`AppShell.tsx` も `showPmPanel = pm.running || pendingApprovals.length > 0` のときしか右パネルを出さない。idle シナリオでは右側が空白になる |
| 7 | `RoomView.tsx` L195-219 | `Plant` が `width-60, height-80` と `20, height-200` の **2 つ**。設計案は左下に1鉢のみ + シェルフ + ウォータークーラー（`room.jsx` L181-204 で SVG プロップとして描画）。スクショでは右下に余計な鉢植えが見える |
| 8 | `RoomView.tsx` L226-256 | ポスターをクリックすると **モーダルで開く**設計になっているが、`AppShell.tsx` の panel overlay とロジックが二重化している（`showGantt/showPlan/showConsistency` の state と `/gantt /plan /consistency` ルートの両方が存在）。設計案では Drawer のナビ → ルート、ポスターは Room 画面内の「壁紙」なのでクリックでルート遷移するのが自然 |
| 9 | `routing/AppShell.tsx` L378-386 | `isPanelOpen` のとき `Outlet` を全画面 dialog として被せている → ルート画面が**全て modal 表示**になり、Drawer の active 状態が活きない（背景に Room がうっすら見える設計になっている）。設計案は **Room と他画面は同列の Screen で切替**（`active === 'room' ? RoomScreen : PlanScreen`...）。ここはアーキ判断が違う |
| 10 | `RoomView.tsx` 全体 | 猫の `walkTo` プロパティに従って隣ゾーンへ歩く `cat-walker` アニメーション（`room.jsx` L60-64 + L107-115）が**未実装**。`Desk` には walk prop が無い |
| 11 | スクショ右上 | 「🐱 レトロ開始」CTA は `RoomModeToggle` だが、設計案では `retro` ボタンは Drawer の MANAGE グループからの導線。Room 画面に固定 CTA を出すかは設計判断（残すなら位置とサイズを再検討） |

---

## 何から直すかの提案（優先度順）

1. **`ui/src/styles/shell.css` を作って Redesign App.html の shell CSS を移植** — これだけで TopBar / Drawer / StatusBar / ScenarioPicker が正しく組み上がり、画面の見え方が一気に「アプリ」になる（30分）
2. **`Islands.tsx` を破棄して RoomBackground SVG にゾーンを描き込む** — `.room-island*` クラスを `tokens.css` から削除、`.room-sign--island--*` も合わせて整理。これで「箱に分断された部屋」が「ひとつのオフィス」に戻る（1時間）
3. **`RoomView` に ResizeObserver を入れて、`positions` を W/H/floorY ベースの比率計算に書き換える** — PM を右上に、DEV を左ピット、REVIEW 3匹を底辺に並べる設計座標へ寄せる（1時間）
4. **`LiveRail` コンポーネントを足して、PM 非起動時の右パネルを埋める** — `redesign/screens/room.jsx` L246-275 をそのまま移植可能（45分）
5. **`SubroomClone` の座標を dev デスク相対に**、`walkTo` ベースの歩き猫アニメーションを実装（後回し可）

---

ここまで来ると、`shell.css` を実際に切り出して差分パッチを書くのが一番早いと思います。「実装案との差分」というより「設計案の CSS と座標計算を実装に移植する作業」が残っている、というのが正確な診断です。

`shell.css` を実際に書き起こすところまでやりましょうか？それとも修正計画だけで OK？

## User

実際に書き起こすかつ、修正計画もください。
現状デザイン案と比べてこのようなレビュー結果で、こういう乖離があってこう直すといいよって
あとは綺麗な実装方針なんかもあると助かりますね

## Assistant

_[tool: update_todos]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: update_todos]_

書き起こしました。本プロジェクトに以下の6ファイルを追加しています。

| ファイル | 役割 |
|---|---|
| **`ui/src/styles/shell.css`** | **B1 致命バグ修正の本命**。Redesign App.html の `<style>` ブロック280行を切り出した本物。リポにそのままコミット可 |
| `ui/src/styles/index.css.proposed` | `@import './shell.css';` を1行入れた diff 案 |
| `ui/src/views/room/RoomBackground.proposed.tsx` | **B2 修正**。ゾーンを SVG ラグ + 床透かしラベルで描く新版 |
| `ui/src/views/room/RoomView.proposed.tsx` | **B3/S2/S3/S4/S5 修正**。ResizeObserver / 比率座標 / モーダル撤去 / clone 比率配置 |
| `ui/src/views/room/LiveRail.proposed.tsx` | **S1 修正**。PM 非起動時の右カラム |
| **`REVIEW.md`** | レビュー結果＋修正計画＋クリーン実装方針 |

## 要点だけ再掲

**致命3つ（P0、半日で全部直せる）:**
- B1 シェル CSS が一行も無い → `shell.css` を追加 + `index.css` に1行 import
- B2 ゾーンが箱 → `Islands.tsx` 削除 + `tokens.css` の `.room-island*` 削除 + 新 `RoomBackground`
- B3 固定サイズ + ハードコード座標 → ResizeObserver + 比率座標の新 `RoomView`

**構造ズレ（P1、もう半日）:**
- S1 PM idle 時の右カラムが空 → `LiveRail.tsx` 配線
- S2 モーダル overlay と Router Outlet の二重実装 → どちらか統一（推奨は Router 側）

**クリーン実装方針（G1〜G5）:**
- CSS 権威は1ファイルに集約（inline に分散させない）
- レイアウトはコンテナサイズ駆動（固定 px 引数を書かない）
- モーダル overlay は本当に必要なときだけ
- ピクセル芸は SVG に集約

## 質問返してほしい3つ（REVIEW.md 末尾にも書きました）

1. `AppShell.tsx` で `Outlet` を全画面オーバーレイにしたのは **意図的** ですか? それとも経緯? → Phase 3 の方針に影響します
2. `RoomModeToggle`（Room 右上の「🐱 レトロ開始」CTA） → 残す/撤去/Drawer 経由 のどれにしますか?
3. ゾーン色 `#e8d8c0 / #d8e0e8 / #d8e8da` をトークン化したいですか? それとも `RoomBackground` 内ハードコードのままで OK?

`REVIEW.md` を開いておくので、回答もらえれば次は **実際にリポ側に当てる PR 用の patch** を生成できます。

## User

1. わからん多分そんな意味ないと思う
2. ん〜任せますあってもなくても
3. そういうのは軒並みトークン化したいですね。CSSとかもHTMLにインラインではなくCSSクラスにしたいし、文字列とかもなるべく定数かしたい

## Assistant

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: str_replace_edit]_

了解。トークン化と「インライン禁止」を反映した版に差し替えます。

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: show_to_user]_

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

整理しました。トークン化方針を反映した最終版です。

## 追加・更新したファイル

| パス | 変更 |
|---|---|
| **`ui/src/styles/tokens.css.patch`** | 🆕 zone 色 (`--p-zone-dev` 等) / プロップ色 / z-index スケール / レイアウト比率 / デスク寸法のトークン定義 |
| **`ui/src/styles/room.css`** | 🆕 DeskStation・SubroomClone・Poster の inline style 廃止用クラス一式 |
| **`ui/src/views/room/constants.ts.proposed`** | 🆕 `ROOM_AGENT_IDS` / `ZONES` / `COLD_START_COPY` / `LIVE_RAIL_TABS` / `MAX_SUBROOM_CLONES` 等 |
| **`ui/src/routing/constants.ts.proposed`** | 🆕 `NAV_GROUPS` / `SCENARIO_KEYS` / `APP_COPY` |
| **`ui/src/routing/AppShell.proposed.tsx`** | 🆕 Outlet オーバーレイ撤去 + 文字列は `APP_COPY` 経由 + LiveRail 分岐 |
| `ui/src/views/room/RoomBackground.proposed.tsx` | 更新: zone 色は `var(--p-zone-*)`、プロップ色は `var(--p-prop-*)` を ZONES テーブルから lookup |
| `ui/src/styles/index.css.proposed` | 更新: `room.css` import 追加 |
| **`REVIEW.md`** | 更新: G6（トークン化ポリシー）追加、確認済み方針セクション、ファイル一覧更新 |

## トークン化のルール（G6, REVIEW.md より）

| 対象 | 置き場所 |
|---|---|
| 色 | `tokens.css` の `--p-*` |
| z-index | `tokens.css` の `--z-*` |
| レイアウト比率 | `tokens.css` の `--room-*-ratio` |
| サイズ（デスク幅・モニタ等） | `tokens.css` の `--desk-*` |
| 表示文字列・コピー | `*/constants.ts` の `*_COPY` |
| 構造化テーブル（NAV/ZONE 等） | `*/constants.ts` |
| 動的な responsive px | TSX inline 可（`size.w` 等のみ） |

**禁則**: TSX に hex / 巨大 style ブロック / 表示文字列ベタ書き / 生 z-index 数値 — 全て NG。

## 次のステップ

リポ側に当てる順序:

1. `tokens.css.patch` の内容を実リポの `tokens.css` 末尾に append
2. `shell.css` / `room.css` をそのままコピー、`index.css` を `.proposed` の内容に
3. `routing/constants.ts` を作成、`AppShell.tsx` を `.proposed` に置換
4. `views/room/constants.ts` を作成、`RoomBackground.tsx` / `RoomView.tsx` を `.proposed` に置換、`LiveRail.tsx` を新規作成
5. `Islands.tsx` 削除、`tokens.css` から `.room-island*` ルール削除
6. `DeskStation.tsx` の inline `style` を `room.css` の `.desk-station__*` クラスに置換 — **これだけ残作業**。やってほしければ次に詳細パッチ出します

`DeskStation.tsx` の置換パッチ、続けて作りますか？

## User

お願いします

## Assistant

_[tool: str_replace_edit]_

_[tool: write_file]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

完了です。

## 追加・更新

| ファイル | 役割 |
|---|---|
| **`ui/src/views/room/DeskStation.proposed.tsx`** | 🆕 inline スタイル全廃版。`.desk-station__*` クラスのみ使用 |
| `ui/src/styles/room.css` | 更新: `.desk-station__status-dot--{busy/idle/review/fail/tdd}` と `.desk-station__monitor-line--w{70/50/85/40}` の修飾子クラス追加 |
| `REVIEW.md` | DeskStation の置換ポイント表を追加 |

## DeskStation で消えたもの

- **`style={{...}}` ブロック合計 14個** → すべて class へ
- **`STATUS_COLOR` 定数（busy/idle/review/fail/tdd → CSS var）** → `.desk-station__status-dot--{status}` 修飾子クラスに移譲
- **`deskColor` prop** → `--p-wood` token で固定（呼び出し側でも実質誰も渡してなかった）

唯一残る inline は `style={{ left: x, top: y }}` だけ。これは responsive な座標で **G6 の例外条項**（動的 px は inline OK）の正当な使い方です。

`data-testid` 5種類（`speech-bubble`/`monitor-screen`/`status-dot`/`desk-top`/`tdd-tag`）は完全に残してあるので、既存の Playwright スナップショット以外のテストは無傷で通るはず。

## 全体まとめ

```
ui/src/styles/
├── shell.css                            ← 致命 B1 修正
├── room.css                             ← G6 inline 廃止用クラス
├── tokens.css.patch                     ← G6 トークン追加（既存 tokens.css 末尾に append）
└── index.css.proposed                   ← shell.css + room.css の import

ui/src/routing/
├── AppShell.proposed.tsx                ← S2 + G6（Outlet オーバーレイ撤去、APP_COPY 使用）
└── constants.ts.proposed                ← G6（NAV_GROUPS/APP_COPY）

ui/src/views/room/
├── RoomBackground.proposed.tsx          ← 致命 B2（ゾーン SVG ラグ化）
├── RoomView.proposed.tsx                ← 致命 B3 + S2-S5（ResizeObserver/比率座標/モーダル撤去）
├── DeskStation.proposed.tsx             ← G1+G6（inline 全廃）
├── LiveRail.proposed.tsx                ← S1（PM idle 時の右カラム）
└── constants.ts.proposed                ← G6（ROOM_AGENT_IDS/ZONES/COLD_START_COPY 等）

削除すべきもの:
├── ui/src/views/room/Islands.tsx        ← B2 不要
└── tokens.css 内 .room-island* ルール   ← B2 不要

REVIEW.md                                ← レビュー結果＋計画＋実装方針（G1〜G6）
```

これでリポ側に当てれば、致命3つ + 構造ズレ + トークン化方針が一通り揃います。次は `cat-walker` 配線あたりが残ですが、まずはこのバッチを当ててスクショ撮り直すのが先かと。

