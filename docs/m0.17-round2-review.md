# Review: `fix/m0.17-ui-redesign-correction`

レビュー対象: `yutron24ah/claude-loom@fix/m0.17-ui-redesign-correction` (`2b297ba`)
基準: `REVIEW.md` (2026-05-14) / `Redesign App.html` / `redesign/screens/*.jsx`
レビュー日: 2026-05-16

---

## TL;DR

- ✅ **REVIEW.md の P0/P1（B1〜B3, S1〜S5）はほぼ適用済み**。骨格は通った。
- 🔴 ただし**動かないボタンが本物のプレースホルダ**として残っている（`alert()` 直書き／`onClick` 無し／到達不能ブランチ）。
- 🟠 **G6（トークン化）が `views/room/` までしか降りていない**。`views/plan/`, `views/gantt/`, `views/consistency/`, `views/customization/`, `views/retro/`, `views/session-list/`, `views/project-settings/`, `views/tokens/` は依然として inline style まみれ。Room 以外の画面に入った瞬間トーンが崩壊する。
- 🟡 体感再現度: **Room 70% / その他 35% / 全体 50%**。Phase B（トークン化を screens に降ろす）が最 ROI。

このまま merge は **non-blocking で OK** ですが、後続 PR で Phase A（半日）/ Phase B（1〜2日）を続けて入れる前提でお願いします。

---

## ✅ 取り込み済み（REVIEW.md 適用確認）

| ID | 内容 | 適用先 |
|---|---|---|
| B1 | `shell.css` 切り出し + `index.css` で import | `ui/src/styles/shell.css` (18.5KB) |
| B2 | ゾーンを SVG ラグ化 + `Islands.tsx` 削除 + `.room-island*` 撤去 | `RoomBackground.tsx`, `tokens.css` |
| B3 | `ResizeObserver` + 比率座標 (`floorY = H*0.43` 基準) | `RoomView.tsx` L96-104, L114-119 |
| S1 | PM 非起動時の右カラムに `LiveRail` mount | `AppShell.tsx` L195-200, `LiveRail.tsx` |
| S2 | `Outlet` 全画面オーバーレイ撤去、route = sibling screen | `AppShell.tsx` L182-186 |
| S3 | REVIEW 列の T 字配置 → 横並び (`W*0.62/0.74/0.86`) | `RoomView.tsx` L80-85 |
| S4 | worktree clones を dev デスク上方に | `RoomView.tsx` L172-185 |
| S5 | `<Plant>` DOM 配置撤去（SVG プロップ化） | `RoomBackground.tsx` L130-144 |
| G6（一部） | `tokens.css.patch` 適用 + `routing/constants.ts` + `views/room/constants.ts` | OK |
| G1 | `DeskStation` の inline 全廃、`.desk-station__*` クラス化 | `DeskStation.tsx` |

ここまでは合格点。

---

## 🔴 P0: 動かないボタン（要修正）

### B4. ColdStart の「▶ PM を起動」が `alert()` 直書き

**`ui/src/views/room/RoomView.tsx` L229-231**

```tsx
<button className="btn-px primary" onClick={() => alert('POST /pm/start')}>
  ▶ PM を起動
</button>
```

`alert('POST /pm/start')` は実装したフリの残骸。`usePMSession().start()` に繋ぐ。

```tsx
// 修正案
const pm = usePMSession();
<button className="btn-px primary" onClick={() => pm.start()}>
  ▶ PM を起動
</button>
```

---

### B5. RetroMode のトグル UI が消滅 → `retroMode === true` 分岐が到達不能

**`ui/src/views/room/RoomView.tsx` L108**

```tsx
const [retroMode, setRetroMode] = useState(false);
```

`setRetroMode` を呼ぶ UI がコンポーネント内にどこにも無い。結果 L132-187 の `!retroMode &&` ブランチは常に true、L196-208 の `retroMode &&` ブランチはデッドコード。

REVIEW.md で「当面残す」と書いたのに修正過程で UI ごと消えている。Drawer の MANAGE グループに移すか、Room 右上に小さく復活させるか、状態ごと削除するかのいずれか。

---

### B6. RetroGathering に placeholder 文字列を直渡し

**`ui/src/views/room/RoomView.tsx` L203-205**

```tsx
<RetroGathering ... >
  <div>RetroView placeholder</div>
</RetroGathering>
```

本番ビルドに残してはいけないやつ。`<RetroView />` を import するか、`children` prop 自体を廃止して `RetroGathering` 内で完結させる。

---

### B7. TopBar のプロジェクト切替ボタンが noop

**`ui/src/routing/AppShell.tsx` L77-79**

```tsx
<button data-testid="topbar-project" className="top__pj" title={APP_COPY.projectSwitcherTitle}>
  ◆ {project} <span className="top__pj-caret">▾</span>
</button>
```

`▾` カラットが付いているのに `onClick` 無し。一番ユーザがイラつくタイプ。最低でも `navigate('/project-settings')` に繋ぐ。プロジェクト switcher dropdown を作るのが本筋。

---

### B8. PlanView の `edit` ボタンが noop

**`ui/src/views/plan/PlanView.tsx` L165-170**

```tsx
{tab === 'edit' && (
  <button type="button" className="btn-px ghost" style={{ fontSize: 9, padding: '2px 6px' }}>
    edit
  </button>
)}
```

`tab === 'edit'` を選択しても何も編集できない。`upsertItem` mutation はすでに hook 経由で取れてるので、`onClick={() => openMilestoneEditor(m)}` 相当を実装する。

---

### B9. `LiveRail` の `collapsed` 分岐がデッドコード

**`ui/src/views/room/LiveRail.tsx` L32-37**

```tsx
if (collapsed) {
  return (
    <button className="rail-toggle" onClick={onToggle}>
      ⚡ LIVE
    </button>
  );
}
```

`AppShell.tsx` 側で `showLiveRail = !liveRailCollapsed && ...` で出し分けているため、`<LiveRail>` 自身は `collapsed === true` で render されない。代わりに AppShell L209-213 に同じボタンが別実装で並ぶ二重実装。

```tsx
// AppShell.tsx L209-213 — これ
{!showPmPanel && liveRailCollapsed && isRoom && (
  <button className="rail-toggle" onClick={() => setLiveRailCollapsed(false)}>
    ⚡ LIVE
  </button>
)}
```

`LiveRail` 側に collapsed 分岐を残して AppShell 側を消すか、AppShell 側に一本化して `LiveRail` の `if (collapsed)` を消す。後者推奨（責務が明確）。

---

### B10. TopBar メトリクス4種が表示専用

**`ui/src/routing/AppShell.tsx` L80-104**

`PARALLEL` / `TASK TOOL` / `TDD ORDER` / `VERDICT` の4セル、`onClick` 無し。設計案 (`Redesign App.html` L443-455 付近) ではメトリクスから該当画面へ drill-down する想定。

- `TDD ORDER` → `/consistency?filter=tdd`
- `VERDICT` → `/consistency`
- `PARALLEL` → `/gantt`
- `TASK TOOL` → `/sessions`

最小限の繋ぎ込みでも体感が大きく変わる。

---

### B11. ScenarioPicker が React Router を経由していない

**`ui/src/routing/AppShell.tsx` L162-172**

```tsx
function activate(key: string): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (key) url.searchParams.set('mock', key);
  else url.searchParams.delete('mock');
  window.history.replaceState(null, '', url.toString());
  window.dispatchEvent(new Event('popstate'));
}
```

`window.history.replaceState` + `popstate` dispatch という古典手法。React Router の `useNavigate` + `useSearchParams` 経由に統一すれば、Drawer の `NavLink active` 状態と URL の同期が壊れない。

---

## 🟠 P1: 構造的ズレ（再現度に直接効く）

### S6. G6（トークン化）が screens に降りていない【最重要】

REVIEW.md で最も強く書いたポリシーが Room ローカルで止まっている。
`PlanView.tsx` の冒頭を見ると一目瞭然:

**`ui/src/views/plan/PlanView.tsx` L67-79**

```tsx
<div style={{
  position: 'absolute', inset: 0, padding: 16, overflow: 'auto',
  background: 'var(--p-bg-sky)',
}}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
    <div style={{ fontSize: 14, fontWeight: 700 }}>
      ≡ PLAN — plan_items.json + TodoWrite
    </div>
    ...
```

ファイル全体で **inline `style={{...}}` が 30箇所超**。`boxShadow: '3px 3px 0 0 var(--p-shadow)'`, `border: '2px solid var(--p-border)'`, `padding: '3px 10px'`, `fontSize: 9` 等がベタ書き。同じ問題が以下にも該当：

- `GanttView.tsx`
- `ConsistencyView.tsx` / `ConsistencyViewLive.tsx`
- `CustomizationView.tsx`
- `RetroView.tsx`
- `SessionListView.tsx`
- `ProjectSettingsView.tsx`
- `TokenMeterView.tsx` / `TokensView.tsx`
- `WorktreeView.tsx` / `SubroomView.tsx`
- `GuidanceView.tsx` / `LearnedGuidanceView.tsx`
- `AgentDetailPanel.tsx`
- `PMApprovalModal.tsx`

**結果として何が起きているか**:

- ピクセル風 RPG フレーム (`.rpg-frame`, `.rpg-title`, `.btn-px`) は使われているが、その「上に」inline style が覆い被さって質感を殺している
- 設計案の「壁紙のような床 + 紙のような窓 + RPG パネル」のトーンが、Room 以外の画面に入ると突然 padding 16 の普通の Web 画面に化ける
- → **Room 画面は世界観あるのに、画面遷移した瞬間に崩壊する**

**修正方針**: `PlanView` を雛形にしてパターンを確立する。

1. `ui/src/styles/screens/plan.css` を作る
2. クラス: `.plan-screen`, `.plan-header`, `.plan-tabs`, `.plan-tab`, `.plan-tab--active`, `.plan-milestone`, `.plan-milestone__title`, `.plan-milestone__progress`, `.plan-milestone__progress-fill`, `.plan-child`, `.plan-todos`, `.plan-todos__hint`
3. `PlanView.tsx` から inline style を全廃、上記クラスに置換
4. 動的値（progress bar の `width: ${m.progress * 100}%` 等）のみ inline 許可
5. 同じパターンを Gantt / Consistency / Customization / Retro / Sessions / Settings / Tokens に当てる

---

### S7. AppShell の RoomView ラッパが Room を狭めている

**`ui/src/routing/AppShell.tsx` L183-187**

```tsx
{isRoom ? (
  <div style={{ position: 'absolute', inset: 0, marginRight: rightColumnWidth }}>
    <RoomView />
  </div>
) : <Outlet />}
```

コメントで「dropped accidentally in proposed port」と書いて自分で戻しているが、設計案では **右カラムは Room の上にオーバーレイ** で、Room 側は常に full width。PM デスク座標 `W*0.78` は「画面全体の 78%」が前提で、`marginRight` で Room を狭めると PM デスクが視覚的に右カラムに食い込むか不自然に左へずれる。

**修正案**:

```tsx
{isRoom ? <RoomView /> : <Outlet />}
{/* 右カラムは絶対配置でオーバーレイ */}
{showPmPanel && (
  <div className="right-column" style={{ width: PM_PANEL_W, position: 'absolute', top: 0, right: 0, bottom: 0 }}>
    ...
  </div>
)}
```

ResizeObserver は wrapper の contentRect じゃなく `.content` 直で観る。

---

### S8. TopBar に branch chip が無い

REVIEW.md で「`◆ branch: {scenario.branch}` だけにしろ、`claude-loom` 名はトップバー責務」と書いたのに、現状は逆。

**`ui/src/routing/AppShell.tsx` L77-79**: `◆ {project}` のままで branch が消えた。

`RoomWallDecor` で branch を壁に貼っているので Room 画面では見えるが、`/plan` や `/gantt` に入ると branch が画面上どこにも無い。常時 TopBar に出すべき。

```tsx
<button className="top__pj">
  ◆ branch: {scenario.branch} <span className="top__pj-caret">▾</span>
</button>
```

`project` は `StatusBar` の `~/work/{project}` 表記で十分。

---

### S9. z-index に生数値が残存

**`ui/src/views/room/RoomView.tsx` L242**

```tsx
<div style={{ position: 'absolute', top: 14, right: 14, zIndex: 10 }}>
  <AgentDetailPanel ... />
</div>
```

`tokens.css.patch` で `--z-*` トークンを足したはずなのに、`AgentDetailPanel` のラッパで生 `10`、PMChat の重なり順でも `style={{ width: PM_PANEL_W }}` だけで z-index 暗黙依存。`grep -n "zIndex: [0-9]" ui/src` で全部洗うこと。

---

## 🟡 P2: 雑多

| | 内容 | 場所 |
|---|---|---|
| M1 | `LiveRail` 空ステート文言が inline (`{ color: 'var(--p-text-muted)', fontSize: 10, padding: 12, ... }`) | `LiveRail.tsx` L62-72 |
| M2 | `RoomView` `coldstart` 内 `<span style={{ fontSize: 9, color: 'var(--p-text-muted)' }}>` が inline | `RoomView.tsx` L235-237 |
| M3 | `cat-walker` の `--walk-dx/--walk-dy` 配線は DeskStation 側でできてるが、shell.css に `@keyframes cat-walk-trip` と `.cat-walker` が当たっているか要確認 | `shell.css` |
| M4 | `routes.tsx` のコメントが「Panel overlay routes」のまま — もうオーバーレイじゃないので「Sibling screen routes」に書き換え | `routes.tsx` L42 |
| M5 | `SCENARIO_KEYS` を `routing/constants.ts` に出したのは良いが、ScenarioPicker の「live」ボタンだけ別実装 (`onClick={() => activate('')}`) — `SCENARIO_KEYS` に `'live'` を含める方が一貫 | `AppShell.tsx` L194-200 |

---

## 推奨フェーズ

### Phase A: 動かないボタン掃除（半日）

- [ ] B4 — `alert('POST /pm/start')` → `usePMSession().start()`
- [ ] B5 — RetroMode トグル UI 復活 or 状態ごと削除
- [ ] B6 — `<div>RetroView placeholder</div>` 削除
- [ ] B7 — TopBar プロジェクトボタンに onClick
- [ ] B8 — PlanView `edit` ボタンに onClick
- [ ] B9 — `LiveRail` collapsed 分岐削除（AppShell 側に一本化）
- [ ] B10 — TopBar メトリクス4種を該当画面へ navigate
- [ ] B11 — ScenarioPicker を React Router 経由に

**完了基準**: `grep -rn "onClick" ui/src | grep -v "=>"` で素朴な noop が 0 件。`alert(` も 0 件。

---

### Phase B: トークン化を screens に降ろす（1〜2日）【最 ROI】

- [ ] `ui/src/styles/screens/` ディレクトリ作成
- [ ] `screens/plan.css` を雛形として作成 → `PlanView.tsx` の inline 全廃
- [ ] `screens/gantt.css` + `GanttView.tsx`
- [ ] `screens/consistency.css` + `ConsistencyView.tsx` / `ConsistencyViewLive.tsx`
- [ ] `screens/customization.css` + `CustomizationView.tsx`
- [ ] `screens/retro.css` + `RetroView.tsx`
- [ ] `screens/sessions.css` + `SessionListView.tsx`
- [ ] `screens/project-settings.css` + `ProjectSettingsView.tsx`
- [ ] `screens/tokens.css` + `TokenMeterView.tsx` / `TokensView.tsx`
- [ ] `screens/worktree.css` + `WorktreeView.tsx` / `SubroomView.tsx`
- [ ] `screens/guidance.css` + `GuidanceView.tsx` / `LearnedGuidanceView.tsx`
- [ ] `screens/agent-detail.css` + `AgentDetailPanel.tsx` / `AgentDetailNotes.tsx`
- [ ] `screens/pm-approval.css` + `PMApprovalModal.tsx` / `PMApprovalToast.tsx`

**完了基準**: `grep -rn "style={{" ui/src/views | wc -l` が **動的値以外 0** に近づく（progress bar の `width:${n}%` 等は許可）。lint rule で禁止できればなお良い。

---

### Phase C: 細部（任意・半日）

- [ ] S7 — AppShell の `marginRight` 撤去、右カラムをオーバーレイ化
- [ ] S8 — TopBar に branch chip
- [ ] S9 — `--z-*` 整備して生数値撲滅
- [ ] M3 — `cat-walker` の shell.css 側確認
- [ ] M4 / M5 — コメント修正・SCENARIO_KEYS 統一

---

## 体感再現度の見積もり

| | 現状 | Phase A 後 | Phase B 後 | Phase C 後 |
|---|---|---|---|---|
| Room 画面 | 70% | 75% | 80% | 90% |
| その他 screens | 35% | 45% | 80% | 85% |
| **全体体感** | **50%** | **60%** | **80%** | **87%** |

「全然」って感覚は数字でも妥当です。Phase B が一番効きます。

---

## merge 判断

このまま **merge OK** ですが、`fix/m0.17-phase-a-buttons` ブランチで Phase A を即フォロー、その後 `fix/m0.17-phase-b-tokens` で Phase B を入れる前提でお願いします。Phase A と B は競合しないので並行で進められます。

Phase B は雛形 (`screens/plan.css`) ができたら他の screens は AI で量産しやすいので、雛形だけ手で詰めるのが効率的。

---

以上。
