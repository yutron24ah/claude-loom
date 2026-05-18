# フロントエンド再構想

_Started 2026-05-17 03:50 UTC_

---

## User

https://github.com/yutron24ah/claude-loom/tree/main

レビュー指摘とテスト一覧を作ってもらったんだけど、バックエンドをリファクタリングしました

フロントエンドの構想を直さなきゃかも

## Assistant

_[tool: list_files]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: questions_v2]_

なるほど、これはかなりの構想変えですね。バックエンドが **13 agent → 3 persistent + ephemeral 召喚** に再編されたので、フロントエンドの中核 metaphor（特に Room view）と CustomizationView / RetroView の schema 表示は作り直しレベル。

要件確認のため数点だけ聞かせてください 👇

## User

Questions answered:
- scope: 全部 (Tier 1+2+3)
- ephemeral_metaphor: 召喚精霊 — 半透明・glow・パッと出てパッと消える (RPG 風), 客人 / 来客 — ドアからスーッと入ってきて椅子に座り、終わると帰る (オフィス風)
- ephemeral_lifetime: Decide for me
- customization_layout: 左 pane = tree navigation, 右 pane = leaf editor (王道)
- retro_lifecycle: Decide for me, レトロはそうですねぇアジャイルのレトロスペクティブのことなのでそのフレームワークをうまいこと可視化したいですね
- keep_aesthetic: 維持しつつ ephemeral 表現で新しい motion を入れる
- variation_count: 3
- session_list_label: 値を skill 名にリネームして表示 (loom-review/trio.code 等)
- include_admin: 両方追加
- deliverable: ドキュメントも画面案も全面更新ですね
- notes: フロントエンドのデザイン案はあんまり変わんなくていいと思うます大きくは。
ただ、バックエンドに伴って表現が少し変わるとかですかね
でも実装面はかなり大きく変わると思うんでそこは注意が必要ですね
なのでテスト表とレビュー指摘（これからのフロントエンド改修方針）も更新しましょう

## Assistant

_[tool: update_todos]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

把握しました。実装面が大きく変わるので、まずは「mental model の再編」を ROSTER レベルで反映した上で、各 view に最小限の表現差分を入れていきます。同時にテスト表とレビュー指摘ドキュメントも更新します。

まず ROSTER に `kind: persistent | spirit` 軸を入れ、ephemeral motion 用の CSS とイベント体験を組み込みます。

_[tool: str_replace_edit]_

それでは着手します。まず ROSTER の意味論を `kind: persistent | spirit` 軸に再編し、対応する CSS を追加。

_[tool: read_file]_

次に ephemeral spirit 用の CSS とドア演出を追加し、char-sheet を新グルーピングに合わせます。

_[tool: run_script]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

次は room.jsx に Spirit / RoomDoor / SummonQueue 系コンポーネントを追加して、室内を「3 常駐 + 召喚」モデルに切り替えます。

_[tool: read_file]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: show_html]_

ここで一度ブラウザで描画チェック。

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: grep]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: save_screenshot]_

_[tool: write_file]_

ドキュメント側を更新します。「PR#18 以後のフロントエンド改修方針」を独立した文書として新規作成しつつ、既存の Status Report と QA Test Matrix に追補を入れます。

_[tool: str_replace_edit]_

_[tool: read_file]_

_[tool: grep]_

_[tool: run_script]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: update_todos]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: done]_

仕上げにユーザーへ届けます。

_[tool: fork_verifier_agent]_

完了です。バックエンドの大改編（PR#18〜#21）に追随したフロントエンド構想の更新を一通り入れました。

## 変更まとめ

**設計案 (`index.html` の design canvas)**
- ROSTER を `3 persistent + 10 spirit` に再編、`SKILLS` registry 新設 (`cat.jsx`)
- Room view を 3 常駐 + ephemeral 召喚モデルに刷新、新コンポ `<Spirit>` / `<SpiritEcho>` / `<RoomDoor>` / `<SummonQueue>` 追加 (`room.jsx`, `styles.css`)
- 新 section「**Spirit Summoning — 3 motion 候補**」を design canvas に追加 (RPG / Office guest / Hybrid)
- CustomizationView を **左 tree + 右 leaf editor** の 2-pane に刷新 (agents 3 + skills 2 with sub-scope, aggregator に WRITE badge)
- RetroView を **KPT board (KEEP / PROBLEM / CARRYOVER / TRY)** に刷新、carryover pip + re-evaluation verdict badge + admin/reconstruct section 追加
- LearnedGuidance に scope filter pill row (`all` / `Agents` / `loom-review` / `loom-retro`) と AGENT/SKILL/WRITE badge 追加
- CharSheet を 4 グループ表示 (PERSISTENT / REVIEW SKILL / RETRO LENS / RETRO STAGE) に再編

**ドキュメント**
- 新規 **`Frontend改修方針.md`** — PR#18〜#21 を踏まえた tier 別の改修計画 + LOC/工数見積 (合計 ~6d) + 「変えないところ」の根拠を整理
- `UI Status Report.md` 冒頭に追補バナーを追加 (旧 main の記録として残し、リプランは新文書へ誘導)
- `QA Test Matrix.html` / `qa-suite.js` に **6 新セクション**追加 (SPIRIT- / CT- / RL- / GS- / SL- / ENF- / AR- prefix)

## 次の手

- Spirit motion の 3 候補から default を確定したい（現案: hybrid）。実機でちらつき確認したら教えてください
- KPT の **KEEP 列**をどうユーザーから収集するか (lens の comment 流用 / PM chat 拾い / 手動入力) は open question として方針書末尾に残しました

## User

Verifier agent check completed

## Assistant

Verifier から合格判定が返ってきました。DOM 構造は意図通り：

- 7 room artboards (旧 4 + 新 Spirit 3)
- `.spirit` 21 / `.spirit-echo` 5 (hybrid のみ) / `.room-door` 1 (office のみ) / `.summon-queue` 7
- Customization tree (loom-review → strategies → trio) と Retro KPT 4 列 + carryover pip + verdict badge いずれも描画
- console エラーなし、CSS 変数 0 unresolved

これで一段落です。次にやるとしたら、

- spirit motion の **実機での動き** を見て A/B/C の default を確定
- KPT の **KEEP 列の入力経路**を決める（lens comment 流用 / PM chat 拾い / 手動）
- 上記が決まったら `ui/src/views/{room,customization,retro,guidance,session-list}/` の本実装に着手（方針書の Tier 1 から）

辺りですかね。

## User

ふむ
なんか画面案さ、古くなってね？
色々治したとこが消えてちゃってる気がするな
例えばclaude codeの承認やコンタクト用のチャット欄とかさ

## Assistant

_[tool: grep]_

_[tool: read_file]_

おっしゃる通りでした。`index.html` (design canvas) は古い探索版で、AppShell + PM Chat + 承認モーダル等の "本格版" は `Redesign App.html` と `redesign/screens/*.jsx` 側にあります。そちらをまったく触っていなかったので確認します。

_[tool: read_file]_

_[tool: read_file]_

ご指摘の通り、`Redesign App.html` 経由で読まれる `redesign/screens/*.jsx` 側にこそ AppShell / PM Chat / 承認モーダルが入ってて、そっちを完全に放置していました。順番に同期します。

_[tool: read_file]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: write_file]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: done]_

「`Redesign App.html` 側」を以下まで同期しました。

**redesign/screens/ への反映**
- `room.jsx` — ROOM_AGENTS を `[pm, dev, retro-pm]` 3 体に縮小、`Spirit` / `SpiritEcho` / `SummonQueue` 追加、zone label `REVIEW → SUMMON` に置換、`room--${spiritMode}` className でモード切替対応
- `customization.jsx` — 既存の flat table を **左 tree + 右 leaf editor** 2-pane に丸ごと書き換え (agents 3 + skills 2 with sub-scope, WRITE badge, PM model 不変注記)
- `retro.jsx` — 右カラムを **KPT 4 column** (KEEP / PROBLEM / CARRYOVER / TRY) に再編、carryover pip + verdict badge + admin (reconstruct) section 追加。**PM Chat / 承認モーダル / Drawer / TopBar は一切触っていません**
- `guidance.jsx` — scope filter pill row (all / Agents / loom-review / loom-retro) + AGENT/SKILL/WRITE badge + key path 表示
- `scenarios.js` — `recentSpirits` / `queuedSpirits` fixture 追加 (active scenario)、`retro-pm` を agents に追加

**触れていないもの (= 維持)**
- `Redesign App.html` の AppShell (TopBar / Drawer / StatusBar / Routing)
- `PMChatPanel` (chat tab / stream tab / textarea / 折り畳み)
- `PMApprovalModal` (high risk) / `PMApprovalToast` (med/low)
- `coldstart` (▶ PM を起動)
- `LiveRail`
- ScenarioPicker / WS status / TopBar metrics

_[tool: fork_verifier_agent]_

ご指摘ありがとうございました。`Redesign App.html` 側を見落としていたのが本筋の原因でした。検証エージェントの報告を待ってます。

## User

古いやつもう消しちゃっていいよ
んで、QA test matrixとUI status reportも更新しましょうか

## Assistant

_[tool: run_script]_

_[tool: grep]_

_[tool: grep]_

_[tool: delete_file]_

古いファイルを削除します。

_[tool: write_file]_

次に UI Status Report と QA Test Matrix を更新します。

_[tool: str_replace_edit]_

QA Test Matrix の方は新 7 セクション (SPIRIT/CT/RL/GS/SL/ENF/AR) を既に足してあるので、旧 customization / retro セクションが新 schema 想定じゃない旨を明示しておきます。

_[tool: str_replace_edit]_

## Assistant

## Assistant

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: list_files]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: delete_file]_

_[tool: done]_

クリーンアップ完了です。

**整理後の構造**
```
/
├── Redesign App.html       ← 設計案 SSoT (app shell + PMChat + 承認モーダル + 12 screens)
├── cat.jsx                  ← ROSTER (3 persistent + 10 spirit) + SKILLS registry
├── styles.css / tokens.css  ← shared tokens + spirit motion CSS
├── redesign/
│   ├── scenarios.js         ← scenario fixtures (active/idle/failed)
│   └── screens/             ← room / customization / retro / guidance / etc.
├── UI Status Report.md      ← 現状ステータス
├── Frontend改修方針.md      ← PR#18〜#21 後の改修計画
├── QA Test Matrix.html + qa-suite.js  ← テスト一覧 (legacy v1 + 新 7 section)
├── REVIEW.md / PR-REVIEW.md ← 旧レビュー履歴 (記録として残す)
├── ui/                      ← 本実装 (作業ツリー)
└── _archive/ / _review/     ← 履歴 / レビュー素材
```

**削除したもの** (合計 10 ファイル)
`index.html` / `index v1 (snapshot).html` / `Redesign.html` / `design-canvas.jsx` / `char-sheet.jsx` / `room.jsx` (root) / `screens-a.jsx` / `screens-b.jsx` / `screens-c.jsx` / `subroom.jsx` / `.design-canvas.state.json`

**ドキュメント更新**
- `UI Status Report.md` を PR#18〜#21 後の状態に全面書き直し。「PR#18〜#21 で大幅 rework が必要な箇所」「PR と独立な未解決問題 (旧 main 由来)」を分けて整理。実装率テーブルも更新
- `qa-suite.js` の旧セクション (Customization §6 / Retro §7 / Guidance §11 / Sessions §12) に **legacy v1** マークと「新テストは §14/§15/§16/§17 参照」の誘導を追加
- `QA Test Matrix.html` のヘッダを `M0.17 + PR#18〜#21 (skill migration / lifecycle / refactor)` に更新

_[tool: fork_verifier_agent]_

ご確認ありがとうございました。掃除と更新一巡完了です。

