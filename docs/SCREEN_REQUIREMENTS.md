# claude-loom — 画面要件（SCREEN_REQUIREMENTS.md）

> **本ドキュメントは「ユーザーが UI で何をしたいか」だけを定義する。**
> ページ構成、レイアウト、コンポーネント配置、配色、タイポグラフィ等の **デザイン領域は frontend-design スキルに委譲** する。
>
> 親ドキュメント: `SPEC.md`
> 最終更新: 2026-04-26
> ステータス: Phase 1 (MVP) 要件確定

---

## 1. ドキュメントの位置づけ

| この文書が定義するもの | この文書が定義しないもの |
|---|---|
| ユーザーがやりたいこと（goals / use cases） | ページの並び方、画面遷移グラフ |
| 必要な情報の種類と粒度 | テーブル列、カード位置、サイドバー構成 |
| 介入操作の種類 | ボタン文言、アイコン、配色 |
| リアルタイム性・通知の要件 | アニメーション仕様、フレーム数 |
| ビジュアル方針（ピクセル RPG）の **方向性** | 具体的なスプライト、タイル、テーマ色 |

具体的な見た目・配置は frontend-design に渡す。

---

## 2. ユーザー像と典型シナリオ

### 2.1 ユーザー

- Claude Code を日常使う個人開発者
- 並列 / マルチセッション開発を行う
- 仕様書駆動 + TDD を志向、ドキュメント整合性維持に苦戦している

### 2.2 典型シナリオ

| シナリオ | 概要 |
|---|---|
| **朝の確認** | 出社して `/loom` 起動、昨日からの全プロジェクト進捗を一望 |
| **作業中の監視** | PM セッションで spec/指示を出しつつ、別ディスプレイで開発室を眺めている |
| **タスク追加メモ** | 気付いたことを特定の subagent / プロジェクトにメモとして残す |
| **整合性確認** | SPEC を編集した後、関連ドキュメントへの影響を一覧で確認 |
| **過去の振り返り** | 「昨日 dev #2 が何やってたか」を Agent Detail で履歴確認 |

---

## 3. 観測したいこと（情報ニーズ）

### 3.1 全体俯瞰

- いま稼働している **すべてのプロジェクト**を一覧で把握したい
- 各プロジェクトに **どのエージェントが何体配属されているか** を知りたい
- 各エージェントが **idle / busy / レビュー中 / TDD 中** などのステータスでわかる
- 全体の **トークン消費量**（input / output / cache）を一望したい
- **直近の並列稼働度合い**（同時に何体動いてるか）を体感したい

> **プロジェクト切替が観測の主軸**。GUI 上でアクティブな PJ を切り替えると、Room View と進捗ビュー（後述 §3.6）が両方連動して当該 PJ の状態に切り替わる。
> 全プロジェクトを並べて同時俯瞰する Atrium 系画面は Phase 2 候補。
> ただし **PM キャラは常に表示**（PM は singleton で全 PJ を横断管理しているため、どの PJ の Room View に切り替えても PM が居る）。

### 3.2 個別エージェント

- 特定のエージェントが **今何のタスクを処理中か**
- そのエージェントの **過去の作業履歴**（時系列）
- そのエージェントの **トークン使用量**（時間帯別）
- そのエージェントへの **メモ・注目フラグ** の状態

### 3.3 計画

- **短期計画**：いま動いているセッションの TodoWrite 状態（pending / in_progress / completed）
- **長期計画**：プロジェクトのマイルストーン → タスクのツリー（最大 2 階層）
- **進捗の偏り**：どのマイルストーンが詰まっているか

### 3.4 ドキュメント整合性

- SPEC が変更されたことを **見落とさず** 知れる
- 整合性チェックの **検出件数と severity 分布**（high/medium/low）
- 各 finding の **対象ファイル / 内容 / 提案**
- 過去に対応済みの finding 履歴

### 3.5 セッション情報

- 全セッション横断で「いつ起動して、最後にいつ動いたか」
- worktree パス、配属プロジェクト、ロール（PM / 通常）
- 終了済みセッションも参照可能

### 3.6 進捗の時間軸表現（ガント系）

Room View（ピクセル RPG）の "感情的な絵" と相補的に、**時間軸 × エージェント** の定量ビューが必要。

- **横軸**：時間（直近 1 時間を default、ズーム可能：30 分 / 1 時間 / 4 時間 / セッション全体）
- **縦軸**：当該プロジェクトのエージェント（PM / Dev #1〜N / Reviewer 各種）
- **bar**：subagent 1 体 = 1 bar、開始時刻〜終了時刻を表現
- **bar の中身**：prompt_summary（先頭 N 文字）、フェーズ（TDD ループの段階は MVP では出さない、busy/idle のみ）
- **リアクティブ**：現在進行中の bar は時間と共に右へ伸びる（リアルタイム更新）
- **失敗 bar**：subagent.status='failed' は赤系で表示、目立たせる

**プロジェクト切替で進捗ビューも切替**：選択中 PJ の subagents だけが対象。

**見えるもの**：
- 並列度（同時に走っている bar の本数）
- 各エージェントの稼働率 / idle 時間
- 個別タスクの所要時間
- ボトルネック（特定エージェントだけが詰まっている等）

**MVP には含まない**（Phase 2 候補）：
- ヒートマップ表示（時間 × エージェントの密度）
- カンバン形式（状態列）の代替ビュー
- TDD ループ内部段階（test→impl→refactor）の細粒度可視化
- タスク間の依存関係（矢印・線）

### 3.7 Retro session（M0.8 / M0.11）

retro の実行記録と action plan の状況を追跡・参照したい。

- retro session 一覧（時系列、milestone tag / 日付 / finding 件数）
- 特定 retro の詳細（4 lens findings / counter-arguer verdict / aggregator action plan）
- action plan status（immediate / milestone / deferred 3 分類ごとの進捗）
- user lens 貢献（user finding と他 lens finding を区別して表示）
- archive markdown render（`docs/retro/<id>-report.md` の画面内閲覧）

### 3.8 Customization Layer（M0.9）

13 体の agent それぞれの model と personality 設定の現状を把握したい。

- agent ごとの現在の model（opus / sonnet / haiku、全 13 agent）
- agent ごとの現在の personality preset（default / friendly-mentor / strict-drill / detective）
- scope 表示（user-prefs vs project-prefs の override 状態を可視化）
- 4 preset の説明 / 性格紹介
- custom personality 内容（free-form override 設定時の合成 prompt 確認）

### 3.9 Worktree（M0.10）

並列開発の分離状況と worktree ごとの所属 subagent を可視化したい。

- PJ の active worktree 一覧（branch / path / 状態）
- どの subagent がどの worktree に所属しているか（並列 dev 隔離の可視化）
- worktree 数 / max_concurrent 上限到達警告
- worktree 用途表示（parallel dev / 安全実験 / branch 比較 / hotfix / 一時 review の 5 種）

### 3.10 learned_guidance（M0.11）

各 agent に注入されている learned_guidance の内容と由来を確認・管理したい。

- agent ごとの active guidance 一覧
- guidance source の audit trail（from_retro / from_finding_id / category / added_at）
- active vs inactive の切替状態
- scope 表示（user-prefs vs project-prefs）
- 重複 / 矛盾検出（同 category / 似た guidance の hint 表示）
- TTL / use_count の表示

### 3.11 Coexistence Mode（M0.12）

他 plugin・既存 setup との共存状態と機能の有効 / 無効状況を把握したい。

- 現 PJ の coexistence_mode 表示（full / coexist / custom）
- enabled_features 一覧（core / retro / customization / worktree / native-skills の 5 group ON/OFF）
- 検出された他 plugin / 既存 setup（`~/.claude/plugins/` の他 plugin、既存 CLAUDE.md 内容）
- gate されている機能の影響範囲（disable 中機能の説明）
- ※ mode 変更履歴は Phase 2

### 3.12 Process Discipline Metrics（M0.13）

開発プロセスの規律状況をリアルタイムと履歴の 2 軸で把握したい。

**リアルタイム（main UI 常時表示）**：
- 直近 parallel dispatch rate（claimed parallel / actually parallel の割合）
- Task tool 利用可否 status（degraded mode 警告）
- 進行中 milestone の TDD red 順序 violation 件数
- 直近 reviewer dispatch の verdict 証拠あり / なし

**履歴（§3.7 retro UI に統合）**：
- milestone 単位の discipline スコア（5 項目 + TDD 遵守率）
- violation トレンド（時系列）
- 個別 violation の drill-down（commit / session / agent ref）

---

## 4. 操作したいこと（介入ニーズ）

### 4.1 メタデータ追加（B レベル介入）

- 任意の **プロジェクト / セッション / subagent / タスク** に **メモ** を残す
- 任意の **エージェント / タスク** に **注目フラグ** を付ける（一時的にハイライトしたい）

### 4.2 計画編集

- **長期計画** のアイテム：追加 / 編集 / 削除 / 並び替え / ステータス変更
- ファイル直編集と GUI 編集の **どちらでも結果は同じ** になる（双方向同期）
- **短期計画は read-only**（Claude Code 側 = TodoWrite で更新される）

### 4.3 ドキュメント整合性アクション

- SPEC 変更検知バッジから **整合性チェックを手動実行** できる
- 各 finding に対して以下のアクション：
  - **Acknowledge**（後で対応する。長期計画 plan_items に自動転記される）
  - **Mark Fixed**（手で直したことを記録）
  - **Dismiss**（false positive 扱い）
  - **Open in Editor**（VSCode 等の URL handler で対象ファイルを開く）

### 4.4 プロジェクト設定変更

- プール上限（max_developers 等）を編集
- methodology（Phase 1 は agile 固定、表示のみ）
- ルール（branch / commit prefix / TDD 有効化）
- 整合性エンジンの related_docs リスト
- 編集結果は `.claude-loom/project.json` に書き戻し

### 4.5 プロジェクト管理

- プロジェクトの **アクティブ切替**（複数 PJ 間で focus を移動）
- プロジェクトの **アーカイブ**（一覧から消すが DB は残す）

### 4.6 Retro 操作（M0.8 / M0.11）

retro session の起動と finding への意思決定を GUI から行いたい。

- 新 retro 起動（GUI ボタン、CLI 不要）
- finding ごとの user decision（accept / reject / defer / discuss の 1-click 操作）
- action plan の分類（immediate / milestone / deferred への振り分け）
- 過去 finding の検索（category / severity / target_artifact で絞り込み）

### 4.7 Customization Layer 設定（M0.9）

agent の model と personality を GUI から変更したい。

- agent ごとの model 変更（opus / sonnet / haiku）
- agent ごとの personality 変更（preset 選択 + custom text 入力）
- scope 切替（user 全体 vs project 単独）
- default reset（user / project それぞれ）
- ※ bulk apply（全 reviewer に同 model 適用など）は Phase 2

### 4.8 Worktree 操作（M0.10）

worktree の新規作成・削除・ロックを GUI から操作したい。

- worktree 新規作成（`/loom-worktree create` 相当の GUI 操作）
- worktree 削除（uncommitted change チェック付き、安全 confirm 付き）
- worktree lock / unlock
- ※ base_path / max_concurrent の設定変更は Phase 2

### 4.9 learned_guidance audit / prune（M0.11）

guidance の有効 / 無効切替と削除を行いたい。

- active toggle（1-click on / off）
- 削除（hard delete、archive trail は retro markdown に残る）
- ※ guidance text 編集は Phase 2
- ※ bulk deactivate は Phase 2
- ※ scope 昇格 / 降格は Phase 2
- ※ 次 retro での review reminder セットは Phase 2

### 4.10 Coexistence Mode 切替（M0.12）

coexistence_mode と feature group の有効 / 無効を GUI から変更したい。

- mode 切替（full / coexist / custom の切替）
- feature group 個別 toggle（custom mode 時）
- 既存 setup 検出の再実行
- 保存 / 反映（project.json への書き戻し）
- ※ mode 変更前 dry-run（影響予測）は Phase 2

### 4.11 Process Discipline 介入（M0.13）

degraded mode の承認と violation の retro への昇格を行いたい。

- Task tool 不在を ack（degraded mode 切替了承）
- violation を retro へ promote（次 retro で議論マークを付ける）
- ※ alert threshold 設定は Phase 2

---

## 5. リアルタイム性・通知要件

### 5.1 リアルタイム性が必要な情報

- エージェントのステータス変化（idle ⇄ busy）
- TodoWrite 由来の短期計画更新
- 新規 subagent 起動 / 完了
- トークン使用量（5 分粒度）
- 整合性 finding 新規発生
- retro Stage 1 並列 lens 完了通知
- discipline metrics live indicator（parallel rate / Task tool status / TDD 順序 violations / reviewer verdict の 4 種）
- learned_guidance 注入 indicator（agent character 上）
- worktree 状態変化（新規 / 削除 / lock）

### 5.2 通知（toast）が必要なイベント

ユーザーが見落としたら困るもの **だけ** をトースト通知する：

| イベント | 通知レベル |
|---|---|
| `consistency_finding_new`（SPEC 変更後の整合性 finding 発生） | warning（持続表示、手動 close） |
| `subagent_failed`（subagent 異常終了） | error（持続表示、手動 close） |
| `daemon_disconnected`（WebSocket 切断） | warning（再接続中バナー、自動消去） |
| `daemon_reconnected` | success（3 秒で消える） |
| `project_added`（新規プロジェクト検出） | info（5 秒で消える） |
| `retro_stage_complete`（Stage 1 並列 lens 完了） | info（5 秒で消える） |
| `discipline_violation_critical`（parallel rate 急落 / TDD 違反多発） | warning（持続表示、手動 close、Phase 2 で alert threshold 設定可） |
| `worktree_lock_warning`（lock された worktree への書込試行） | warning（持続表示、手動 close） |

下記は **トースト不要**（画面更新で十分）：
- subagent 起動・完了の通常進捗
- TodoWrite 由来のタスク状態変化
- トークン使用量更新

### 5.3 接続断時の振る舞い

- WebSocket 切断時は再接続を自動 retry（exponential backoff、最大 30 秒間隔）
- バナーで「切断、再接続中」を表示、再接続成功でバナー消去
- 接続断中もユーザーが GUI を操作できる（書き込みは local キューに溜める、再接続時に flush）※ Phase 2 候補、MVP は disable

---

## 6. ビジュアル方針（最低限）

### 6.1 全体トーン

- **ピクセル RPG 風**（Stardew Valley 系の方向性）
- **配色方針は frontend-design に委譲**（ダーク / ライト / 時間帯切替 等の方向性は frontend-design が決定）
- キャラクター愛着を最優先

### 6.2 必須のキャラ表現

- 各エージェントは **キャラクターとして可視化** される
- ステータスが **見ただけで分かる**（idle / busy / 完了 / エラー）
- プロジェクト所属が **アイコン等で識別可能**

### 6.3 進捗ビュー（ガント）の表現方針

- ピクセル RPG ルームと **同じテーマ・色調** で統一感を出す
- bar はピクセル風の塗り（フラットでなく粗いテクスチャ）も検討候補
- リアルタイム更新時の bar 伸長アニメは「滑らか」より「タイル単位でカクカク」のほうが世界観に合う可能性

> ガントとピクセルルームの **トーン統一** は frontend-design に依頼。

### 6.4 frontend-design に渡す前提

- 配色 / フォント / アイコンセット / スプライト / タイル / アニメーション仕様 / レスポンシブブレークポイントは **すべて frontend-design が決める**
- 本ドキュメントは「キャラ可視化の方針」までしか書かない

### 6.5 M0.8〜M0.13 feature の visual hint

frontend-design への hint（決定権は frontend-design に委譲）：

- **Worktree（§3.9）**: Room View に worktree ごとに「**サブルーム**」配置、subagent character の所属を branch ラベル等で識別
- **learned_guidance（§3.10）**: agent character 上に「**guidance 装着 indicator**」（idle 時 head 上の scroll icon 等）、詳細 panel で agent 選択 → guidance リスト
- **Process Discipline metrics（§3.12）**: discipline スコアを「**経験値ゲージ風**」表現（ピクセル RPG 世界観統一）、main UI header / status bar に live indicator badge 4 つ
- **Retro UI（§3.7）**: archive markdown を render する read 専用 view + 1-click action button（accept / reject / defer / discuss）
- **Coexistence Mode（§3.11）**: 設定画面 section、mode は radio button、5 feature group は個別 toggle

---

## 7. Phase 別優先度

### 7.1 Phase 1 (MVP) で必須

- §3 観測ニーズすべて（俯瞰 / 個別 / 計画 / 整合性 / セッション）
- §4 介入ニーズすべて（メモ / 注目フラグ / 計画編集 / 整合性アクション / プロジェクト設定 / 切替）
- §5 リアルタイム性・通知（指定 5 イベントの toast、再接続）
- §6 ビジュアル方針

**M0.8〜M0.13 feature 反映（Phase 1 昇格分）**：
- §3.7 / §4.6 Retro session（観測 5 + 介入 4）すべて MVP（M0.13 で codified action plan 化が中核機能のため Phase 2 候補から昇格）
- §3.8 / §4.7 Customization Layer 設定（観測 5 + 介入 4 — bulk apply のみ Phase 2）
- §3.9 / §4.8 Worktree 可視化（観測 4 + 介入 3 — base_path 設定変更のみ Phase 2）
- §3.10 / §4.9 learned_guidance（観測 6 + 介入 a/c のみ MVP、b/d/e/f は Phase 2）
- §3.11 / §4.10 Coexistence Mode（観測 4 + 介入 a/b/d/e MVP、観測 #4 と c は Phase 2）
- §3.12 / §4.11 Process Discipline metrics（観測 4 リアルタイム + 履歴 retro 統合 + 介入 a/c — alert threshold は Phase 2）

### 7.2 Phase 2 候補

- 複数プロジェクトを並べて俯瞰する「Atrium 画面」
- Activity Feed（tool 呼び出し含む詳細タイムライン）
- GUI からの spec/go 起動（CLI 不要化）
- キャラの移動アニメ（idle → 着席のような遷移をスムーズに）
- キーボードショートカット網羅
- 多言語化（英語化）
- 接続断中の write キューイング
- トークンメーターの詳細ドリルダウン
- §3.8.e / §4.7.e Customization Layer bulk apply（全 reviewer に同 model 適用など）
- §3.9.d / §4.8.d Worktree base_path / max_concurrent 設定変更
- §3.10.b / §4.9.b learned_guidance text 編集
- §3.10.d / §4.9.d learned_guidance bulk deactivate
- §3.10.e / §4.9.e learned_guidance scope 昇格 / 降格
- §3.10.f / §4.9.f learned_guidance 次 retro での review reminder セット
- §3.11.4 / §4.10.c Coexistence mode 変更履歴 + dry-run 影響予測
- §3.12.b / §4.11.b Discipline alert threshold 設定

### 7.3 Phase 3 候補

- マルチユーザー対応（複数開発者で 1 指令室を共有）
- 開発手法切替（agile 以外）

---

## 8. アクセシビリティ・基本要件

- カラーコントラストは **WCAG AA 相当** を frontend-design に依頼
- フォーカス可視化（Tab キーで操作可能）
- 言語：日本語 UI（英語化は Phase 2）
- ESC キーで modal / dialog を閉じる
- 破壊的アクション（Dismiss など）は確認なしでも undo 可能にする（trash bin パターン推奨）

---

## 9. frontend-design への委譲スコープ

以下は **frontend-design スキルに完全委譲**：

- ページ構成 / 画面遷移 / ナビゲーション構造
- レイアウト（サイドバー / ヘッダ / メインエリアの配置）
- 個別コンポーネントの形（テーブル / カード / モーダル）
- 配色 / タイポグラフィ / アイコン / スプライト
- アニメーション仕様（フレーム数、イージング）
- レスポンシブブレークポイント（Phase 1 は desktop 想定）
- マイクロインタラクション（hover、transition）

本ドキュメントは「**何を表示し、何ができるか**」までを定義し、見た目・触り心地の最終決定は frontend-design に渡す。

---

## 10. 関連ドキュメント

- `../SPEC.md` — メイン仕様（アーキテクチャ・データモデル・workflow）
- `EVENT_SCHEMA.md` — hook payload + WebSocket message 詳細（実装初期に作成）
- `../.superpowers/brainstorm/*/content/` — ブレインストーミング時の HTML mock（あくまで参考、本ドキュメントが優先）
- M0.8〜M0.13 feature 詳細：
  - `../docs/RETRO_GUIDE.md` — retro 機能 SSoT
  - `../docs/CODING_PRINCIPLES.md` — 13 原則
  - `../docs/plans/specs/2026-04-29-m0.9-design.md` — Customization Layer 設計
  - `../skills/loom-worktree/SKILL.md` — Worktree 5 用途 + Decision tree
  - SPEC §3.6.5 / §3.6.6 / §3.6.7 / §3.6.8 / §3.9 — feature SSoT

---

## 変更履歴

- 2026-04-26: 初版作成（ページ構成 / コンポーネント配置を含むレイアウト記述ベース）
- 2026-04-26: 全面書き直し。**「ユーザーが UI で何をしたいか」のみ** に絞り、レイアウトは frontend-design 委譲に統一
- 2026-04-26: §3.1 にプロジェクト切替主軸 + PM 常時表示 を明記、§3.6 進捗の時間軸表現（ガント系）追加、§6.3 ガントの表現方針追加（ピクセル世界観統一）
- 2026-04-29: M0.8〜M0.13 feature 反映ブラッシュアップ（Q1 Retro / Q2 Customization Layer / Q3 Worktree / Q4 learned_guidance / Q5 Coexistence Mode / Q6 Process Discipline metrics）。Phase 1 MVP に retro 画面昇格、観測 31 項目 + 介入 27 項目 追加。Visual hint 追加（sub-room / guidance indicator / 経験値ゲージ風）。
- 2026-04-30: §6.1 ダーク基調制約撤去、配色方針を完全に frontend-design 委譲に。§7.2 Phase 2「ライトテーマ」項目削除（dark/light の dichotomy 自体が消えたため）。SPEC §6.10 `ui.theme` default を `dark` → `system` に変更。
