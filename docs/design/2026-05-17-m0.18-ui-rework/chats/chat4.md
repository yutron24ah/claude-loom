# UI再設計修正

_Started 2026-05-15 15:30 UTC_

---

## User

https://github.com/yutron24ah/claude-loom/tree/fix/m0.17-ui-redesign-correction

ざっと修正案をレビューしました。

## User

https://github.com/yutron24ah/claude-loom/tree/fix/m0.17-ui-redesign-correction

ざっと修正案をレビューしました。
どうでしょう？
まだ全然だと思うんすよねデザイン案と比べたら
まだ動かないボタンが無限にあるし

## Assistant

_[tool: github_get_tree]_

_[tool: read_file]_

_[tool: github_get_tree]_

_[tool: github_get_tree]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_read_file]_

ざっと差分を読みました。率直に言うと、**「骨格修正は通ったがデザイン提案には届いていない」** という肌感は完全に正しいです。再現度はせいぜい 50〜60%。中身を分解します。

---

## ✅ 入ったもの（REVIEW.md の P0/P1 はおおむね適用）

- `shell.css` が import されて TopBar/Drawer/StatusBar が一行バーになった（B1）
- `RoomBackground.tsx` が SVG ラグ + 床透かしラベルに書き換わった（B2, Islands も消えた）
- `RoomView.tsx` が `ResizeObserver` + 比率座標 + ポスター click → `navigate('/...')`（B3, S2, S3, S4）
- `AppShell.tsx` の Outlet 全画面オーバーレイ撤去（S2）
- `LiveRail.tsx` 追加 & 右カラム fallback として mount（S1）
- `DeskStation.tsx` の inline スタイル全廃、`.desk-station__*` クラス化（G1+G6）

ここまでは仕事してます。

---

## 🔴 「動かないボタン無限」の正体

実装側に **本物のプレースホルダ** が残ってます。順に：

### 1. ColdStart の「▶ PM を起動」(`RoomView.tsx` 内)
```tsx
<button className="btn-px primary" onClick={() => alert('POST /pm/start')}>
  ▶ PM を起動
</button>
```
**`alert()` 直書き。** これは「実装したフリ」のテキスト残骸です。`usePMSession().start()` に繋ぐべき。

### 2. RetroMode のトグル UI が消滅
`RoomView.tsx` で `const [retroMode, setRetroMode] = useState(false)` はあるけど、**`setRetroMode` を呼ぶ UI がどこにもない**。`retroMode === true` ブランチは到達不能のデッドコード。REVIEW.md には「当面残す」と書いたのに、修正の過程で UI ごと消えてる。

### 3. RetroGathering に placeholder 文字列を直渡し
```tsx
<RetroGathering ...>
  <div>RetroView placeholder</div>
</RetroGathering>
```
これも本番に残してはいけないやつ。

### 4. TopBar のプロジェクト切替ボタン
```tsx
<button className="top__pj" title={APP_COPY.projectSwitcherTitle}>
  ◆ {project} <span>▾</span>
</button>
```
**`onClick` 無し。** ▾ が付いてるのに何も起きない = 一番イラつくタイプ。

### 5. TopBar メトリクス4種（PARALLEL / TASK TOOL / TDD / VERDICT）
全部表示のみ。設計案では各セルが何かしらの drill-down へ繋がる想定（少なくとも consistency や retro へ）。

### 6. PlanView の `edit` ボタン
```tsx
{tab === 'edit' && <button className="btn-px ghost">edit</button>}
```
`onClick` 無し。`tab==='edit'` モードに入っても何も編集できない。

### 7. LiveRail の collapsed 分岐がデッド
`AppShell` 側で `showLiveRail = !liveRailCollapsed && ...` で出し分けてるので、`LiveRail` 自身の `if (collapsed)` ブランチには絶対入らない。代わりに AppShell 側で `<button className="rail-toggle">⚡ LIVE</button>` を別に書いてる = 二重実装。

### 8. ScenarioPicker
`window.history.replaceState` + `popstate` dispatch で動かしてるが、React Router 経由じゃないので Drawer の active 強調と URL が噛み合わない瞬間がある。`useNavigate()` に統一すべき。

### 9. その他 grep で出てくるやつ
- `GanttView` / `ConsistencyView` / `CustomizationView` / `LearnedGuidanceView` の表示専用ボタン群
- `AgentDetailPanel` 内の各種アクション（mutations は hook 経由で繋がってるが、UI 側のフィルタやソート系は noop が多いはず）

→ **「無限」と感じるのは正しい。** B1〜B3 をやってる間に、各 View のアクション層は一切触られていないからです。

---

## 🟠 デザイン提案 vs 実装で「まだ別物」な箇所

### G6（トークン化）が screens に降りていない

REVIEW.md でいちばん強く書いたのに、`PlanView.tsx` を見るとこの有様：
```tsx
<div style={{
  position: 'absolute', inset: 0, padding: 16, overflow: 'auto',
  background: 'var(--p-bg-sky)',
}}>
<div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
<div style={{ fontSize: 14, fontWeight: 700 }}>
…（以下、ファイル全体が inline style）
```

`box-shadow: '3px 3px 0 0 var(--p-shadow)'`, `border: '2px solid var(--p-border)'`, `padding: '3px 10px'`, `fontSize: 9` ... が **数十箇所** ベタ書き。`room.css` のクラス化はやったけど、各 View 画面はまだ inline。これは GanttView / ConsistencyView / CustomizationView / RetroView / SessionListView / ProjectSettingsView / TokenMeterView / TokensView 全部に当てはまるはず。

**結果として：**
- ピクセル風 RPG フレーム (`.rpg-frame`, `.rpg-title`, `.btn-px`) は使われてるが、その「上に」inline で覆い被さってる
- デザイン案の「壁紙のような床 + 紙のような窓 + RPG パネル」の質感が、画面に入ると突然 padding 16 の普通の Web 画面になる
- 結果、Room だけ世界観強くて、開いた瞬間にトーンが崩壊

### AppShell の RoomView 包み方
```tsx
<div style={{ position: 'absolute', inset: 0, marginRight: rightColumnWidth }}>
  <RoomView />
</div>
```
コメントで「dropped accidentally in proposed port」と書いて自分で戻してるけど、これ **設計案では右カラムは Room の上にオーバーレイ** で、Room 側は常に full width（PM デスクは `W*0.78` だから自然と PMChat の左に来る）。`marginRight` で Room を狭めると、PM デスクが視覚的に右カラムに食い込む or 不自然に詰まる。

### TopBar の branch ラベル
REVIEW で「`◆ branch: {scenario.branch}` だけにしろ」と書いたのに、`◆ {project}` のままで branch がトップから消えてる。`RoomWallDecor` に branch があるから機能はしてるけど、**Room 以外の画面では branch が分からない**。

### z-index の生数値
`<div style={{ position: 'absolute', top: 14, right: 14, zIndex: 10 }}>` (`AgentDetailPanel` ラッパ) や `right-column` の重なり順、`AppShell` の `style={{ width: PM_PANEL_W }}` — `--z-*` トークンを作るって書いたのに、まだ生 `10` `100` が散在してそう。

---

## 推奨する次のフェーズ

**Phase A: 動かないボタンの掃除（半日）**

1. `alert('POST /pm/start')` を `usePMSession().start()` に
2. `<div>RetroView placeholder</div>` を実 `RetroView` に or RetroGathering の children prop 自体を廃止
3. RetroMode トグル UI を Drawer の MANAGE に移すか、Room 右上に小さく復活
4. TopBar の `top__pj` に onClick（最低でも `/project-settings` へ navigate）
5. PlanView の `edit` ボタンに onClick (`upsertItem` or modal open)
6. LiveRail の collapsed 分岐を消す（AppShell 側に一本化）

**Phase B: トークン化を screens に降ろす（1〜2日）**

これが一番効きます。`PlanView` を雛形にして：
- `screens/plan.css` を作って `.plan-screen`, `.plan-header`, `.plan-tab`, `.plan-milestone`, `.plan-todos` 等を切る
- TSX から inline style を一掃
- 同じパターンを Gantt / Consistency / Customization / Retro / Sessions / Settings / Tokens に当てる

これをやると「Room 以外の画面に入った瞬間トーンが崩壊する」現象が消えて、初めて再現度が 80%+ になります。

**Phase C: 細部（任意）**
- AppShell の `marginRight` 撤去 → RoomView full width + 右カラムオーバーレイ化
- TopBar に branch chip 復活
- `--z-*` 整備して生数値撲滅
- ScenarioPicker を React Router 経由に
- `cat-walker` 配線（DeskStation 側で `walkTo` prop は受けてるので、shell.css の `@keyframes cat-walk-trip` を当てるだけ）

---

## 体感再現度の見積もり

| | 現状 | Phase A 後 | Phase B 後 |
|---|---|---|---|
| Room 画面 | 70% | 75% | 85% |
| その他 screens | 35% | 45% | 80% |
| 全体体感 | **50%** | **60%** | **80%** |

「全然」って感覚は数字でも妥当です。骨が通って肉がまだ inline のままなので、Room 以外を開くと粗が出る。**Phase B が一番投資対効果が高い** ので、もしどれか1つだけやるならそこ推奨です。

PR にコメント書き起こす版が要るならそのまま出せます。やります？

## User

やってください

## Assistant

_[tool: write_file]_

_[tool: show_to_user]_

PRコメント用に書き起こしました。`PR-REVIEW.md` を開いてあるので GitHub の PR 画面にそのまま貼れます。中身の構成だけ要約：

- **TL;DR** — 骨格 OK、ボタン死亡、トークン化 screens 未到達、再現度 50%
- **✅ 取り込み済み** — B1〜B3 / S1〜S5 / G6（部分）/ G1 を確認済みの表
- **🔴 P0 動かないボタン** — B4〜B11、ファイル＋行番号付きで 8 件
- **🟠 P1 構造的ズレ** — S6（screens トークン化／最重要）、S7（RoomView ラッパが Room を狭める）、S8（branch chip 消失）、S9（z-index 生数値）
- **🟡 P2** — 5 件の小ネタ
- **推奨フェーズ** — Phase A（半日）/ Phase B（1〜2日、最 ROI）/ Phase C（半日）をチェックボックス付き TODO で
- **再現度マトリクス** — 各 Phase 完了後の見積もり
- **merge 判断** — このまま merge OK、後続 PR 前提

GitHub の PR コメント欄にそのまま貼れる形にしてます。Phase A 着手するなら、B4〜B11 をひとつのコミット粒度で潰すのが速いです。

## User

OK
テスト表でも作るか各画面+全体動作で

## Assistant

_[tool: list_files]_

_[tool: read_file]_

_[tool: write_file]_

_[tool: done]_

_[tool: fork_verifier_agent]_

`QA Test Matrix.html` を開きました。中身：

- **15 セクション × 110+ ケース** — Shell / Room / Plan / Gantt / Consistency / Customization / Retro / Worktree / Guidance / Sessions / Project Settings / Tokens / Agent / PM Chat / LiveRail / 全体動作
- **状態サイクル**: pill クリックで `untested → pass → fail → block → wip → na` を巡回
- **3軸フィルタ**: status / priority (P0/P1/P2) / zone (shell/room/panel/overlay)
- **集計バー**: TOTAL / PASS / FAIL / BLOCK / WIP / P0 FAIL ← P0 fail が 0 になるまで merge 不可の目安
- **PR-REVIEW の修正項目とリンク**: `←【B4】` `←【S6】` 形式で各ケースに紐付け済み
- **localStorage 自動保存** + `export json` で結果ダンプ

P0 を順に潰せば「動かないボタン無限」は片付きます。実機で `?mock=idle` `?mock=pm-active` `?mock=dev-busy` あたりを切り替えながら埋めるのが効率的です。

## User

ふむ
なんか、このテスト項目が全部満たされていれば完璧にUIが実装されている・動いているということを保証するようなテストを作りたいんよね
全体+各画面+各要素+各機能の観点でさ、洗い出せそうじゃない？
この機能はこの要素をこうしたときにこう動けばOKみたいな手順も書いたりして

## Assistant

_[tool: github_get_tree]_

_[tool: github_read_file]_

_[tool: grep]_

_[tool: write_file]_

OK、本格的にやります。「実行可能なテスト手順」として書き直して、コンポーネント単位まで降ろします。データ量が増えるので分割して管理しやすくします。

_[tool: write_file]_

_[tool: done]_

_[tool: fork_verifier_agent]_

全面リライトしました。`QA Test Matrix.html` を開いてあります。

## 構造

**4 階層**で組んだので、画面 / 要素 / 機能 / 個別動作の全観点で網羅：

```
Section (画面・エリア) — 16
  Group (要素・機能) — ~70
    Case (個別テスト) — ~280
      pre[]      実行前の状態
      steps[]    操作手順
      expected[] 期待結果（全て満たせば pass）
```

## カバレッジ

- **Shell**: TopBar / Drawer / StatusBar / Routing / 右カラム / ScenarioPicker / Connection
- **Room**: レイアウト / Background / WallDecor / 3ポスター / 5デスク（各々で sprite / bubble / monitor / status dot / nameplate / click / walk）/ Worktree clones / ColdStart / RetroMode / AgentDetail オーバーレイ
- **各 Screen**: Plan / Gantt / Consistency / Customization / Retro / Worktree / Guidance / Sessions / ProjectSettings / Tokens
- **Overlay**: AgentDetailPanel / PMChatPanel / LiveRail
- **Overall**: エラー / シナリオ完走 / onClick保証 / トークン化 / Routing / Realtime / A11y / Perf / i18n / 自動テスト

## 使い方

- case header クリックで **pre / steps / expected が展開** （`✓` リスト形式）
- footer の pill クリックで `untested → pass → fail → block → wip → na` をサイクル
- **4 軸フィルタ** + 検索: status / pri / zone / scenario / freetext
- **expand / collapse all** ボタン
- `?mock=idle|active|failed` で 3 シナリオ網羅
- **P0 STATUS** メータが「merge 可否」のゲート
- JSON エクスポートで結果ダンプ

データは `qa-suite.js` に分離してあるので、テストケース追加・修正は HTML を触らず JS だけ編集すれば OK です。

## User

真っ暗で見えんわ

## Assistant

_[tool: show_html]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: eval_js]_

_[tool: sleep]_

_[tool: eval_js]_

_[tool: str_replace_edit]_

了解、ライトテーマに切り替えます。

_[tool: done]_

ライトテーマに切り替えました（クリーム背景に白カード）。それでもまだ何も表示されていなかったら言ってください — その場合は qa-suite.js のロードが落ちてる可能性が高いので別途調査します。

## User

OK
機能面やUXメンのテストがまだ不足しているきが

## Assistant

_[tool: read_file]_

_[tool: read_file]_

## User

https://github.com/yutron24ah/claude-loom/tree/main

このPJでやりたいことや目的を理解した上で、機能面やUXメンのテストも追加してください。全然不足していると思う

## Assistant

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: read_file]_

_[tool: github_read_file]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

OK、claude-loom の本質を理解しました。**マルチエージェント agile チーム + ピクセルRPG 可視化 + Claude Code プラグイン**。SCREEN_REQUIREMENTS の §3-§5 で定義された観測ニーズ・介入ニーズ・通知要件をベースに、機能フローと UX の観点を大幅追加します。README + SCREEN_REQUIREMENTS を読み込んで、製品コンセプト寄りのテストを大量追加しました。

## 追加した 8 セクション（約 200 ケース）

**17. E2E フロー — 実利用シナリオ** (14 グループ)
- F1: 朝の起動（cold-start, warm-start, headless, opt-out, idle shutdown）
- F2: PM チャット → 指示 → 完了
- F3: PM 承認フロー（pending → allow/deny、複数、race）
- F4: Plan 双方向同期（file↔UI、conflict、reorder）
- F5: メモ / 注目フラグ
- F6: 整合性 finding → ack / fixed / dismiss+undo / open editor
- F7: Retro 4-lens × 3-stage（Stage1/2/3、archive、Room retroMode）
- F8: Worktree（5用途、max警告、uncommit check、lock、subroom）
- F9: マルチ PJ 切替（PM 常時表示含む）
- F10: Customization（model/preset/scope/custom text/reset）
- F11: learned_guidance（list/toggle/delete/dup/indicator）
- F12: Coexistence mode
- F13: Process Discipline（PARALLEL/Task tool degraded/TDD/verdict/promote）
- F14: WS 切断・再接続

**18. UX マイクロインタラクション** (6 グループ)
- Hover / Pressed / Focus / Cursor
- Transition / Animation（cat-walker / idle z's / busy wiggle / Gantt bar / reduced-motion）
- Loading / Optimistic / Rollback / 全画面の Empty state
- テキスト（truncate / tooltip / number / time relative+absolute / emoji / XSS）
- A11y 深堀り（コントラスト / focus trap / focus restore / landmarks / screen reader）
- 操作フィードバック（confirm / undo / copy / autosave / inline validation）

**19. Notifications** — §5.2 通知要件の 8 イベント全て
- 持続: consistency_finding_new / subagent_failed / discipline_violation_critical / worktree_lock_warning
- 自動消去: daemon_reconnected (3s) / project_added (5s) / retro_stage_complete (5s)
- Banner: daemon_disconnected
- Stack / dedup / individual close

**20. Character 表現** — §6.2 「猫の開発室」コンセプト
- 13 agent 個別（PM / Dev / 3 Reviewer / 4 retro lens / counter / aggregator / retro PM）
- ステータス一目（idle/busy/review/fail/TDD）
- PJ 所属 / guidance indicator / 経験値ゲージ風 / personality indicator

**21. Edge Cases**
- 空 / 大量（50+ worktree, 1000+ stream, 200+ findings）
- 極端文字列（長文 / RTL / control char）
- ネットワーク（slow / 半切断 / out-of-order / dup）
- ブラウザ状態（refresh / multi-tab / localStorage full / narrow / wide）

**22. Security / Daemon** — README + SPEC §3 由来
- 127.0.0.1 bind / token なし拒否 / wrong token / chmod 600 / XSS
- mode (prod/dev) / dev pre-flight / production で ?mock= 無視

**23. Install / Uninstall**
- fresh / CLAUDE_HOME / LOOM_NO_BUILD / 再 install idempotent
- confirm / --purge-state / state preservation

**24. Philosophy — 製品コンセプトの満たし方**
- 並列稼働の可視性 / 感情的な絵 / 別ディスプレイで眺められる / キャラ愛着 / ピクセル世界観の一貫性
- spec → plan → TDD → review → retro が画面で追える / doc drift 検出 / TDD ループ可視

合計でケース数は **約 480〜500** になります。フィルタで P0 や特定 scenario / zone だけ抽出して進められます。

## User

OK
ちなみに今の所のmainブランチでのUI実装状況はどうでしょう？
まだ足りない機能があると思います。
例えば画面でチャットする機能とかないじゃん

## Assistant

_[tool: github_get_tree]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_get_tree]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_get_tree]_

_[tool: github_read_file]_

_[tool: github_read_file]_

主要な発見があります。**PM chat の UI は実装されてる、ただし daemon が echo stub で本物の PM が応答しない**状態です。

`daemon/src/routes/pm.ts` から：
```
M0.15 stub implementation. Actual claude CLI spawn / stdin pipe is Phase 5 t17.
```
```ts
broadcaster.emitPmMessage({
  who: "pm",
  text: `[stub] 受け取りました: "${input.text}"`,
  ts,
});
```

→ ユーザーが何を送っても `[stub] 受け取りました: "..."` を返すだけ。**PM が claude CLI を spawn して実際に応答するパスがまだ存在しない**。

これを含めて、main ブランチでの「UI は存在するが backend / wire が無い or stub」な機能を整理して、実装ステータスドキュメントを書きます。

_[tool: write_file]_

_[tool: show_to_user]_

調査完了。きれいに整理して **実装ステータスレポート** を書きます。`UI Status Report.md` を開いてあります。要旨：

## 一番大事な発見

**「画面でチャットする機能とかないじゃん」は半分正しい**：
- ✅ UI 側 (`PMChatPanel`) は完成。CHAT/STREAM タブ、入力欄、collapse、approval modal 全部ある
- ❌ Backend (`daemon/src/routes/pm.ts`) は **echo stub** のみ：
  ```
  M0.15 stub implementation. Actual claude CLI spawn / stdin pipe is Phase 5 t17.
  ```
  ユーザーが何を送っても `[stub] 受け取りました: "..."` を返すだけ

→ PM が claude CLI を spawn して実際に応答するパスが **存在しない**。これが claude-loom の core 価値（「マルチエージェント開発が見える」）の最大の欠落。

## その他「動いてない」もの 14 件

レポートで個別深堀りした項目：
1. PM chat の claude CLI 接続 ← **最重要**
2. AgentDetailPanel の「メモ」ボタン (onClick 無し)
3. 注目フラグ ★ の永続化 wire 不明
4. Worktree 作成 UI (用途5種選択 + uncommit check)
5. Retro 起動ボタン (GUI から)
6. Consistency アクション (Open in Editor / undo)
7. 手動 consistency check trigger
8. Customization custom personality 自由テキスト + preview
9. Coexistence Mode UI section
10. learned_guidance audit trail 完全表示
11. PM session phase indicator (spec/impl/retro)
12. cat-walker 実 wire
13. Toast 8 種 emit パス
14. Multi-project switcher dropdown

## 実装率の体感

**全体 約 60%**。シェル/Routing/Room の見た目は 90%、でも操作系・PM chat の実動作・Coexistence・cat-walker は 15〜50%。

## 提案

QA テストマトリクスを今後拡張するなら、各機能を **「UI 描画」「onClick 配線」「backend 動作」の 3 段階で別々に状態管理**するのが効きます。今は pass/fail 1 軸なので「UI はあるが backend stub」という典型ケースを表現できない。やりますか？

## User

うんやりましょう
claude codeには今のレビューフィードバックとテスト表を渡しますんで

## Assistant

_[tool: read_file]_

OK、3 段階状態管理を実装します。`UI 描画 / onClick 配線 / backend 動作` の各レイヤを独立して pass/fail できるようにして、特に「UI はあるが backend stub」みたいな半完成状態を表現できるようにします。

_[tool: read_file]_

_[tool: read_file]_

_[tool: str_replace_edit]_

3 段階状態管理を実装します。`U / W / B` (UI 描画 / Wire 配線 / Backend 動作) を各 case 単位で独立にトラッキングできるようにして、main ブランチ実装状況の新セクションも追加します。

_[tool: str_replace_edit]_

_[tool: done]_

`QA Test Matrix.html` を更新しました。

## 変更内容

### 1. 3 段階状態管理（Layered status）

各 case が `layers: ['ui', 'wire', 'backend']` を持つと、3 つのピルが独立にトラックされる：
- **U** (UI 描画) — コンポーネントが描画されてるか
- **W** (Wire 配線) — onClick / mutation が繋がってるか
- **B** (Backend 動作) — daemon / DB / 外部処理が実際に動くか

各ピルが独立に pass/fail/block/wip/na サイクル。**集計 status は「全 pass → pass / どれか fail → fail / 混在 → wip」**で自動算出 → 既存フィルタもこれで動く。

### 2. LAYER フィルタ追加

ツールバーに `all / UI / WIRE / BACK / !any-fail` 切替。
- `UI` / `WIRE` / `BACK`: そのレイヤを持つ case のみ表示
- `!any-fail`: どこか一層でも fail してる case を一発抽出（**Phase 2 entry の punch list 作成に最適**）

### 3. 統計バー追加

`LAYER U / W / B` の pass 率を独立表示。例：
- `LAYER U: 45/50 90%` → UI はほぼ完成
- `LAYER W: 38/50 76%` → Wire 配線がボトルネック
- `LAYER B: 15/50 30%` → Backend stub が大量に残る

### 4. 新セクション「MAIN ブランチ実装状況」(25 番目)

UI Status Report の 14 件の致命的ギャップを、すべて 3 層トラッキングで case 化：

- **PM Chat** (4): PM 起動 / メッセージ送信 / approval / phase indicator
- **AgentDetailPanel** (3): メモボタン / ★注目 / Notes sub
- **Worktree** (4): 作成（5用途） / 削除（uncommit check） / lock / subroom 可視化
- **Retro** (4): GUI 起動 / Stage 進行 / 1-click decision / archive
- **Consistency** (4): 手動 check / Acknowledge / Dismiss+undo / Open in Editor
- **Customization** (4): model / preset / custom text / scope
- **Coexistence** (2): mode section / detect
- **learned_guidance** (3): audit trail / dup hint / 2ファイル整理
- **Toast 8 種** (7): finding / failed / discipline / wt-lock / reconnect / pj-add / retro-stage
- **Multi-Project** (3): switcher / PM persist / archive
- **Animation** (1): cat-walker
- **Summary** (1): 集計目標 (U 90% / W 80% / B 70%)

各 case の expected に "U:", "W:", "B:" で何をチェックするか明記。

### 5. localStorage v3 へ migrate

既存 v2 の保存データは自動で読み込まれます（リセット不要）。

---

Claude Code への handoff:
1. ブラウザで `QA Test Matrix.html` を開く
2. LAYER フィルタを `BACK` に → backend で未実装の case 一覧
3. JSON export で構造化ハンドオフできます

