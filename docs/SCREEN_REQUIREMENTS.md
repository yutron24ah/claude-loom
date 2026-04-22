# claude-loom — 画面要件（SCREEN_REQUIREMENTS.md）

> **本ドキュメントは「画面で何をしたいか」「各画面が何を表示し、何を可能にするか」の要件定義。**
> 最終的なピクセル単位のデザイン・配色・タイポグラフィは frontend-design スキルに委譲する。
>
> 親ドキュメント: `SPEC.md`
> 最終更新: 2026-04-26
> ステータス: Phase 1 (MVP) 要件確定

---

## 1. 画面一覧

| # | 画面名 | パス | Phase |
|---|---|---|---|
| 1 | Room View | `/room` | 1 |
| 2 | Plan View | `/plan` | 1 |
| 3 | Session List | `/sessions` | 1 |
| 4 | Agent Detail | `/agents/:pool_slot_id` | 1 |
| 5 | Consistency Findings | `/consistency/:spec_change_id` | 1 |
| 6 | Project Settings | `/projects/:project_id/settings` | 1 |
| 7 | Atrium / Lobby（複数 PJ 俯瞰） | `/atrium` | 2 |
| 8 | Activity Feed | `/activity` | 2 |
| 9 | Retro | `/retro/:project_id` | 2 |

本ドキュメントは Phase 1 の 6 画面を扱う。

---

## 2. 共通レイアウト

### 2.1 トップバー（全画面共通）

| 領域 | 内容 |
|---|---|
| 左 | claude-loom ロゴ + 製品名 |
| 中央 | **プロジェクト切替ドロップダウン**（active プロジェクト一覧 + "All Projects" モード） |
| 右 | トークンメーター（read-only、合計 input/output/cache）+ daemon 接続インジケータ + 設定ボタン |

### 2.2 左サイドバー（全画面共通）

ナビゲーションリンク 5 つ：
- 🏠 Room（Room View）
- 📋 Plan（Plan View）
- 👥 Sessions（Session List）
- ⚙️ Settings（Project Settings）
- ⚠️ Consistency（active な findings 件数バッジ付き）

### 2.3 メインエリア

各画面のコンテンツ。レスポンシブ対応は **MVP では desktop のみ**（モバイル / タブレット最適化は Phase 2 以降）。

---

## 3. Room View（メイン画面）

### 3.1 目的

開発室の現在状態を **キャラクターと部屋** で可視化する。一目で「誰が何をしてるか」が分かる。

### 3.2 表示要素

| 要素 | 内容 |
|---|---|
| PM 室 | 中央上段。PM キャラ 1 体。アイドル / 思考中 / spec 編集中などのアニメ |
| 開発エリア | PM 室直下。Developer キャラ複数（プロジェクトごと max_developers 体）。各キャラ上にプロジェクトアイコン |
| レビュー室 | 右側。Code Reviewer / Security Reviewer / Test Reviewer の 3 種キャラが配置。busy なら作業アニメ |
| 共有ボード | 部屋の壁に貼られた Plan View のミニ表示（上位 3 タスクのみ） |
| トークンメーター | 部屋の隅に設置されたメーター。リアルタイム数値 |
| 通路 | キャラが PJ 移動するとき walk アニメで移動 |

### 3.3 インタラクション

- **キャラクタークリック**：そのエージェントの Agent Detail へ遷移
- **PJ アイコンクリック**：そのプロジェクトをアクティブ化（共有ボード等が切替）
- **空きスペースクリック**：何もしない（誤クリック保護）
- **共有ボードクリック**：Plan View へ遷移
- **マウスホバー**：キャラの現在状態を tooltip 表示（"Dev #2: TDD ループ中、4 分 32 秒経過"）

### 3.4 リアルタイム更新

- WebSocket 接続で daemon からの push を受信
- イベント受信時に該当キャラのアニメ / 状態を更新
- 接続断時は再接続トーストを表示、自動 retry

### 3.5 エンプティステート

- プロジェクト未登録時：PM 室に PM キャラが居て吹き出し「`/loom-pm` でセッション開始 → `/loom-spec` で spec 作成しよか」
- セッションあるが subagent 未起動：開発エリア / レビュー室は空席、椅子だけ配置

### 3.6 ビジュアル方向性

- **ピクセル RPG 風**（Stardew Valley 系）
- カラーパレット・タイル・スプライトの最終仕様は frontend-design に委譲
- **必須要素**：タイル grid / キャラスプライト 4 方向 / アイドル & ウォーク アニメ / 状態別 emote
- 部屋のテーマ色は方向性決定後に固定

---

## 4. Plan View

### 4.1 目的

選択中プロジェクトの計画を **2 レーン並列** で表示・編集する。

### 4.2 表示要素

```
┌─────────────────────────────────────────────────────────────┐
│ Plan View — claude-loom                                      │
├─────────────────────────────────────────────────────────────┤
│ ┌────────────────────────┐  ┌────────────────────────────┐ │
│ │ 短期レーン              │  │ 長期レーン                  │ │
│ │ (TodoWrite ミラー)      │  │ (構造化 plan ファイル)      │ │
│ │                        │  │                              │ │
│ │ in_progress / pending  │  │ マイルストーン > タスク      │ │
│ │ / completed の 3 列     │  │ ツリー構造（2 階層）         │ │
│ │                        │  │                              │ │
│ │ ※ daemon が自動更新     │  │ ※ ファイル編集 + GUI 編集 両方 │ │
│ │   ユーザー編集不可      │  │                              │ │
│ └────────────────────────┘  └────────────────────────────┘ │
│                                                              │
│ [ + 新規アイテム追加（長期レーン）]                          │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 各レーンの仕様

#### 4.3.1 短期レーン（TodoWrite ミラー）
- データソース：tasks テーブル（PostToolUse(TodoWrite) hook で自動更新）
- 表示形式：3 列カンバン（pending / in_progress / completed）
- 各タスクカード：content 表示、active_form は tooltip
- **ユーザー編集不可**（read-only、Claude Code 側で更新する）
- フィルタ：セッション別

#### 4.3.2 長期レーン（plan ファイル）
- データソース：plan_items テーブル（plan ファイル + ユーザー手追加）
- 表示形式：ツリー構造（マイルストーン → タスク、最大 2 階層）
- ステータス：todo / doing / done
- **編集可能**：ドラッグ&ドロップで並び替え、ステータス変更、新規追加 / 削除
- ファイル由来のアイテムは編集時にファイルへも書き戻し（双方向は MVP のみ：plan ファイル → DB は読込、DB → plan ファイルは書込で同期）

### 4.4 インタラクション

- 短期：タスクカードクリック → 関連 session detail を inline expand
- 長期：アイテムクリック → メモ・履歴を右サイドパネルに表示
- 長期：「+ 新規追加」ボタン → モーダルで title / body / parent / status 入力
- 長期：右クリック → コンテキストメニュー（編集 / 削除 / 短期へ昇格）

### 4.5 同期注意

- 短期と長期は **別レーンで独立**、自動同期はしない（ユーザーの混乱を防ぐ）
- 「短期 → 長期へ昇格」操作は手動トリガのみ

---

## 5. Session List

### 5.1 目的

複数プロジェクト・複数セッションを横断俯瞰し、個別 session にドリルダウンする入口。

### 5.2 表示要素

テーブル形式：

| 列 | 内容 |
|---|---|
| Status | active / idle / ended のアイコン |
| Project | プロジェクト名 + アイコン |
| Role | pm / dev_parent / null |
| Worktree | パス（短縮表示、tooltip でフル） |
| Started | 経過時間（"2 時間 15 分前"） |
| Last seen | 最終イベント時刻 |
| Subagents | 起動中サブエージェント数 |
| Tokens | 累積トークン使用量 |
| Actions | [Detail] [Notes] |

### 5.3 フィルタ・ソート

- プロジェクト別フィルタ（トップバーの切替と連動）
- ステータス別フィルタ（active のみ表示など）
- ソート：started_at / last_seen_at / tokens（昇降順）
- 検索：worktree パス部分一致

### 5.4 インタラクション

- 行クリック → 該当 session の詳細パネル展開（subagents 一覧、recent events）
- [Detail] → Agent Detail（session の親子関係を遡れる）
- [Notes] → notes パネル open（B 介入：メモ追加）

---

## 6. Agent Detail

### 6.1 目的

個別エージェント（pool_slot or session）の **詳細・履歴** を見る画面。

### 6.2 表示要素

| 領域 | 内容 |
|---|---|
| ヘッダ | キャラスプライト + ロール + 現在ステータス + 配属プロジェクト |
| 履歴タブ | このエージェントが過去に演じた subagent 一覧（時系列） |
| 現在のタスク | 進行中なら prompt_summary + 経過時間 |
| トークン消費 | 直近 1h / 24h / 累積 |
| メモ | notes（attached_type='pool_slot' or 'session' or 'subagent'）一覧 |
| アクション | [Notes 追加] [注目フラグ ON/OFF]（B 介入） |

### 6.3 注目フラグ（B 介入）

- 注目 ON にすると Room View でキャラの周りに枠が表示される
- 一時的に「このエージェントを目で追いたい」用途
- DB: notes テーブルに `content='__star__'` の特殊レコードで実装（v1）、Phase 2 で flags テーブル分離

### 6.4 履歴タブの中身

- 各 subagent 行：started_at / ended_at / status / prompt_summary 先頭 100 文字
- クリックで result_summary 全体を modal 表示
- フィルタ：プロジェクト別、status 別

---

## 7. Consistency Findings 画面

### 7.1 目的

doc 整合性エンジン v1 の検出結果を **レビュー・対応** する画面。

### 7.2 表示要素（mock 由来）

詳細は `.superpowers/brainstorm/*/content/consistency-findings-ui.html` のモック参照。

| 領域 | 内容 |
|---|---|
| ヘッダ | プロジェクト名 + バッジ「⚠️ SPEC 変更検知」 |
| diff サマリ | spec_change の unified diff（折りたたみ可、デフォルト先頭 5 行表示） |
| findings リスト | 各 finding カード（severity 別色分け） |
| 一括アクション | [All Acknowledge] [All Dismiss] [Re-run check] |

### 7.3 finding カードの中身

- target_path（クリックで Open in Editor: VSCode URL handler）
- severity タグ（High / Medium / Low、色分け）
- finding_type（term_removed 等）
- description（自然言語の説明）
- suggested_change（v1 はテキスト文字列、v2 で diff）
- 4 アクションボタン：[📌 Acknowledge] [✅ Mark Fixed] [🚫 Dismiss] [📂 Open in Editor]

### 7.4 ステータス遷移

```
open
 ├─→ acknowledged (後で対応：tasks に自動追加)
 ├─→ fixed (ユーザーが手で直して報告)
 └─→ dismissed (false positive 扱い)
```

acknowledged になった finding は Plan View の **長期レーンに plan_item として生成**（短期レーンは TodoWrite ミラーで read-only のため、daemon は書き込まない）。タイトル: 「doc 整合性: <description>」。

---

## 8. Project Settings 画面

### 8.1 目的

プロジェクト固有の設定を編集する画面。

### 8.2 設定項目

| カテゴリ | 項目 |
|---|---|
| 基本 | name / methodology（v1 は agile 固定、表示のみ） |
| プール上限 | max_developers / max_code_reviewers / max_security_reviewers / max_test_reviewers |
| Doc 整合性 | spec_path / related_docs（編集可、glob パターン対応） |
| ルール | branch convention / commit prefix / TDD enabled |
| アーカイブ | [プロジェクトをアーカイブ] ボタン |

### 8.3 永続化

- 編集内容は **`.claude-loom/project.json` ファイルに書き戻し**（DB と双方向同期）
- ファイルは git 管理可（プロジェクトメンバー間で共有想定）

---

## 9. インタラクションパターン全般

### 9.1 リアルタイム更新

- 全画面で WebSocket 接続を維持
- daemon からの push event に応じて該当部分を更新
- 接続断時はトースト「切断: 再接続中...」、自動 retry（exponential backoff、max 30s）

### 9.2 通知（トースト）

- 右下スライドイン
- 種類：info / warning / error / success
- 自動消去：success/info=3s、warning=5s、error=持続（手動 close）

### 9.3 モーダル

- ESC キー or 背景クリックで閉じる
- 主要モーダル：Plan アイテム編集 / Settings 詳細項目 / Finding 詳細

---

## 10. アクセシビリティ・UX 方針

- キーボードショートカット（Phase 2 検討、MVP は基本ナビのみ）
- カラーコントラスト：WCAG AA 相当を frontend-design に依頼
- 言語：日本語 UI（英語化は Phase 2 検討）
- ダークモード：MVP はダーク前提（ピクセル RPG 風と整合）、ライトは Phase 2

---

## 11. 設計委譲スコープ

以下は **frontend-design スキル**に委譲する：

- 配色 / タイポグラフィ / アイコンセット
- ピクセルアートの具体的なスプライト・タイル・アセット
- アニメーション仕様（フレーム数、イージング）
- レスポンシブブレークポイント（Phase 1 は desktop only）
- マイクロインタラクション（ホバー、トランジション）

本ドキュメントは「**何が表示されて、何ができるか**」までを定義し、見た目の最終決定は frontend-design に渡す。

---

## 12. 関連ドキュメント

- `../SPEC.md` — メイン仕様（アーキテクチャ・データモデル・workflow）
- `EVENT_SCHEMA.md` — hook payload 仕様（実装初期に作成）
- `.superpowers/brainstorm/*/content/` — ブレインストーミング時の HTML mock（参照用）

---

## 変更履歴

- 2026-04-26: 初版作成（SPEC.md とセットでブレインストーミング §1-§4 合意を反映）
