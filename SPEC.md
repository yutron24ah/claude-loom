# claude-loom — 仕様書（SPEC.md）

> **本ドキュメントは Single Source of Truth (SSoT)。実装と乖離が出た場合は SPEC を先に更新してから実装を合わせる。**
>
> 最終更新: 2026-05-09
> ステータス: Phase 1 (MVP) 設計確定、実装計画は `PLAN.md` を参照

---

## 1. プロダクト定位

### 1.1 ビジョン

claude-loom は **Claude Code 上で agile 開発チームを丸ごと再現する「中央指令室」プラグイン** である。
ユーザーは指令室に入るだけで、PM・開発者・レビュー陣が常駐する開発環境を手に入れる。
複数プロジェクトを並列に管理でき、進捗・タスク・キャラクターの動きが GUI で一望できる。

### 1.2 解決する課題

- Claude Code でマルチエージェント / マルチセッション開発を行うと、現状把握がターミナルログ頼みになる
- 仕様書 (SPEC.md) を変更したとき、関連ドキュメント (README, CLAUDE, PLAN, docs/) との整合性維持を手作業で行うのは抜けが出やすい
- 並列稼働するエージェント群のトークン消費量が見えにくい
- プロジェクト立ち上げのたびに開発手法・ロール定義をゼロから書くのは非効率

### 1.3 提供価値

- **可視化**：開発室を GUI（ピクセル RPG 風）で常時表示、各エージェントの動きをキャラクターで可視化
- **既製チーム**：agile 流儀のデフォルトロール（PM / Developer / Reviewer trio）を即座に利用可能
- **ドキュメント整合性自動見張り**：PM が SPEC 変更を検知し、影響範囲を提示
- **マルチプロジェクト指揮**：単一の指令室から複数プロジェクトを横断管理

---

## 2. スコープ

### 2.1 Phase 構成

| Phase | 名称 | 内容 | ステータス |
|---|---|---|---|
| **Phase 1** | 動く開発室 (MVP) | ステージ + 既製チーム + 基本ワークフロー + doc 整合性 v1 + トークン表示 | **本仕様の対象** |
| Phase 2 | 賢くなる開発室 | doc 整合性 v2 (auto-fix) / Retro / skill 自動生成 / トークンバジェット制御 | 別仕様 |
| Phase 3 | 進化する開発室 | 開発手法切替 / Hermes 型自己進化 / 情報屋 | 構想 |

### 2.2 Phase 1 (MVP) スコープ

**含む**：
- ステージ層：lazy daemon、bash hooks、Web UI（ピクセル RPG）
- アクター層：6 ロール定義（PM / Developer / Reviewer (single mode default) / Code Reviewer / Security Reviewer / Test Reviewer）
- 標準ワークフロー：spec → 分解 → 並列開発 → 並列レビュー → ループ → 完了報告
- ルール config：ブランチ規約 / コミット粒度 / TDD 設定
- doc 整合性エンジン v1：検知 + 影響範囲提示（自動修正なし）
- トークン使用量表示：read-only
- マルチプロジェクト対応：同一指令室から複数 PJ を並列管理
- B レベル介入：メモ追加・注目フラグ・計画手編集を Web から書き戻し

**含まない**（Phase 2 以降）：
- doc 整合性 v2（自動修正・承認ループ）
- Retro / skill・hook 自動生成
- トークンバジェット制御（並列度自動調整）
- 開発手法の切替（agile 以外）
- Activity Feed（活動ログタイムライン）
- Atrium / Lobby ビュー
- 情報屋エージェント

---

## 3. 全体アーキテクチャ

### 3.1 4 層構造

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Claude Code セッション群                            │
│   - PM session（singleton、/loom-pm で起動）                 │
│   - Developer / Reviewer subagent（PM が Task で並列展開）   │
│   - Hooks 発火元                                              │
└─────────────────────────────────────────────────────────────┘
                            │ hooks 発火
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: hooks（bash + curl の極薄レイヤー）                  │
│   - PostToolUse / PreToolUse / SubagentStop / Stop /        │
│     SessionStart / PostToolUse(Edit|Write on SPEC)          │
│   - daemon に HTTP POST、daemon 落ちてたら fail-silent +    │
│     ローカル JSONL fallback                                   │
└─────────────────────────────────────────────────────────────┘
                            │ HTTP POST /events
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: claude-loom daemon (Node + Fastify + SQLite)       │
│   - Lazy 起動、30 分アイドルで自動停止                       │
│   - ポート: 5757（config 変更可）                            │
│   - SQLite: ~/.claude-loom/state.db                          │
│   - REST API: /api/sessions, /api/projects, /api/plan,      │
│     /api/notes, /api/consistency-check 等                    │
│   - WebSocket: /stream（リアルタイム push）                  │
│   - doc 整合性チェッカー: claude -p subprocess で起動        │
└─────────────────────────────────────────────────────────────┘
                            │ HTTP REST + WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Web UI (React + Tailwind + Phaser)                  │
│   - サイドバー: Room / Plan / Sessions / Agent Detail        │
│   - Phaser: Room View 専用（ピクセル RPG）                   │
│   - WebSocket でリアルタイム更新、B 介入は POST              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Lazy Daemon ライフサイクル

詳細は `spec/daemon-and-data.md` §1 参照（§1.1 Daemon mode / §1.2 dev-prod 役割分担 / §1.3 Boot health-check polling を含む）。

### 3.3 中央指令室モデル

詳細は `spec/daemon-and-data.md` §2 参照。

### 3.4 設定ファイル一覧

claude-loom が使う設定ファイルは 2 系統：

| ファイル | スコープ | 場所 | 用途 |
|---|---|---|---|
| `~/.claude-loom/config.json` | グローバル（ユーザー単位） | ホーム下 | daemon ポート、保持ポリシー、polling 間隔等 |
| `<project>/.claude-loom/project.json` | プロジェクト固有 | リポジトリ内（git 管理可） | spec_path、related_docs、プール上限、ルール等 |

詳細スキーマは §6.9（project.json）と §6.10（config.json）参照。

### 3.5 セキュリティモデル

claude-loom daemon は **ローカル開発支援ツール** であり、外部公開を想定しない。それでも以下の最低限の防御を実装する：

| 項目 | 方針 |
|---|---|
| バインドアドレス | **`127.0.0.1` のみ**（`0.0.0.0` には決して bind しない） |
| 認証トークン | 起動時に 32 バイトランダムトークンを生成 → `~/.claude-loom/.token` に 0600 パーミッションで保存 |
| URL | ブラウザに渡す URL は `http://127.0.0.1:5757/?token=xxx`、トークン無しのリクエストは 401 |
| WebSocket | 接続時にクエリパラメータでトークン検証 |
| `claude -p` subprocess | 標準入出力経由のみ、ネットワーク経由は不可 |
| SQLite | ファイルパーミッション 0600（他ユーザーから読めない） |

将来 Phase 2 以降でリモートアクセス等が要件になった場合は本節を改定。

### 3.6 WebSocket メッセージスキーマ概要

詳細は `spec/daemon-and-data.md` §3 参照（§3.1 M0.5 Approval-Reduction Skills を含む）。

### 3.6.5 Agent Customization Layer（M0.9 から有効）

詳細は `spec/harness.md` §1 参照。

### 3.6.6 Worktree 統合（M0.10 から）

詳細は `spec/harness.md` §2 参照。

### 3.6.7 Coexistence Mode（M0.12 から）

詳細は `spec/harness.md` §3 参照。

### 3.6.8 Process Discipline（M0.13 から）

詳細は `spec/harness.md` §4 参照。

### 3.6.9 M3 UI Architecture（M3 から）

詳細は `spec/ui-arch.md` §1 参照。

### 3.6.10 SSoT cross-check rule（M3.1 retro 由来、2026-05-03 から）

詳細は `spec/ui-arch.md` §2 参照。

### 3.6.11 UI Smoke Test Skill（M0.11.3 から、retro 2026-05-04-001 F-proc-005 拡張）

詳細は `spec/ui-arch.md` §3 参照。

### 3.6.12 Design Implementation（M0.11.4 から、Phase 1 aesthetic MVP completion）

詳細は `spec/ui-arch.md` §4 参照。

### 3.6.13 Ceremony Reduction Trinity Marker（2026-05-06-002 retro F-pj-001 由来、SSoT）

詳細は `spec/ui-arch.md` §5 参照。

### 3.6.14 UI Redesign Port（M0.15 から、SPEC SSoT）

詳細は `spec/ui-arch.md` §6 参照。

### 3.6.15 Playwright e2e OS-aware Baseline + local CI parity gate（M0.16 から、retro 2026-05-12-001 F-res-002 構造昇格、SPEC SSoT）

詳細は `spec/ui-arch.md` §7 参照。

### 3.7 プロジェクトライフサイクルと adopt 戦略

詳細は `spec/install-and-test.md` §1 参照。

### 3.8 コミット + ブランチ規約（Conventional Commits + GitHub Flow）

詳細は `spec/harness.md` §5 参照。

### 3.9 Retro 機能（M0.8 から有効、M0.X で skill-centric architecture へ移行）

詳細は `spec/retro-system.md` §1 参照（§1.x 基本方針〜§1.16 Pending Lifecycle Architecture 全 sub-section を含む）。

### 3.10 superpowers Independence（M0.9 から）

詳細は `spec/harness.md` §6 参照。

### 3.11 Multi-file Spec/Plan 思想（M0.X から）

claude-loom が promote する spec/plan 駆動開発において、単一ファイルに記述を集積し続けると「LLM context 食い / 人間の読みづらさ / 並列 PR 衝突 / doc 整合性 check の困難さ」という 4 つの痛みが同時発生する。§3.11 はこれを **PJ 規模・要件に応じた適応的 multi-file 構造**で構造的に解消する思想を codify する。

**SSoT**: `docs/plans/specs/2026-05-17-spec-plan-multi-file-thinking-design.md` §2 (Goal)

#### 3.11.1 思想（M0.X から）

PJ 規模に応じて 3 mode を共存させ、成長に従って自然 promotion する：

| mode | SPEC 構造 | PLAN 構造 | 想定 PJ 規模 |
|---|---|---|---|
| **1. minimal** | `SPEC.md` 単独 | `PLAN.md` + `docs/plans/*.md` | 小規模（個人 PJ、検証 PJ） |
| **2. spec-split** | master `SPEC.md` + `spec/` folder | `PLAN.md` + `docs/plans/*.md` | 中規模（アーキテクチャ層が複数） |
| **3. full split** | master `SPEC.md` + `spec/` folder | top-level index + Phase-split + milestone-folder | 大規模（多 Phase / 多領域 PJ） |

**自然 promotion 原則**: PJ 成長に従って `1 → 2 → 3` へ昇格。逆方向の demotion は仕組み化しない（手動 merge は可能だが PM agent は提案しない）。**画一 default は引かず**、PM agent が brainstorm で user と決定する。

**master spec の責務**（multi-file mode 時）: プロダクト定位 / scope / SSoT 原則 / 用語表（cross-file integrity の anchor）/ 確定済み技術判断 / 関連ドキュメント / 変更履歴 / topic への index（各 topic file の責務 1 行 + path）

**topic file の責務**: 1 axis 1 file（混在禁止）/ 自身の §1 から番号開始（file 内 local）/ 他 topic への参照は file path + § 番号で明示

**SSoT**: `docs/plans/specs/2026-05-17-spec-plan-multi-file-thinking-design.md` §3.1, §3.4

#### 3.11.2 Axis ガイドライン（M0.X から）

PM が brainstorm で参考にする典型 axis セット（固定 default ではなく判断材料）：

| axis 種別 | 例 | 適用 PJ 傾向 |
|---|---|---|
| **layer-based** | backend / frontend / db / infra | UI と server が明確に分離した中規模 PJ |
| **domain-based** | auth / billing / search / reports | DDD 寄り、業務領域が独立した大規模 PJ |
| **feature-group** | chat / file / dashboard | feature 中心の SaaS |
| **横断 axis** | api / external-integration / shared-types | 上記いずれかと組み合わせて利用 |

複数 axis 併用可（例: layer-based + 横断 api file）。**PM agent が brainstorm で user と axis を decide**、ガイドラインは判断材料に留まる。

**SSoT**: `docs/plans/specs/2026-05-17-spec-plan-multi-file-thinking-design.md` §3.2

#### 3.11.3 Trigger（M0.X から）

**初発（brainstorm 時の判定）**

`/loom-spec` の brainstorm phase で PM が PJ scope を user と棚卸し（領域数 / アクター数 / アーキテクチャ層 / external integration 数 / 想定 LoC オーダー）し、「single-file / multi-file どっち?」を user 確認する。multi-file 採用なら axis ガイドライン（§3.11.2）を提示し、PM と user で axis を決定する。

**後発（size warning）**

master spec / master plan が size threshold 超え → PM が「分割提案」を surface：

- **default threshold**: `SPEC.md` 1000 行 / `PLAN.md` 1500 行
- **project-prefs.json で override 可**: `rules.spec_split_threshold` / `rules.plan_split_threshold`
- **自動分割は禁止**: 「PM 提案 → user 確認」が原則
- **検出箇所**: PM agent の SessionStart 系 hook（project 開始時の health check）/ `/loom-spec` / `/loom-write-plan` 実行時の前処理

**SSoT**: `docs/plans/specs/2026-05-17-spec-plan-multi-file-thinking-design.md` §4

#### 3.11.4 参照記法（M0.X から）

| mode | 参照記法 | 例 |
|---|---|---|
| single-file | `SPEC.md §X.Y`（現行） | `SPEC.md §3.2` |
| multi-file master | `SPEC.md §X.Y`（現行） | `SPEC.md §1.1`（定位） |
| multi-file topic | `spec/<topic>.md §X.Y` | `spec/architecture.md §3.2` |

**ルール**:
- § 番号は topic file 内で local に振り直し（各 file が §1 から開始、global 番号体系は引かない）
- master spec の用語表が cross-file integrity の **anchor**
- grep 一発で参照箇所追える（`grep -rn 'spec/architecture.md' .`）
- agent prompt / retro report / commit message 全てで同記法を使う

**既存記法との互換**: claude-loom 自身が将来 multi-file 化した時、既存 commit / retro report に残る `SPEC.md §X` 記法は書き換えない（git 履歴汚染を避ける）。新規記述から段階的に新記法へ移行する。

**SSoT**: `docs/plans/specs/2026-05-17-spec-plan-multi-file-thinking-design.md` §5, §5.1

#### 3.11.5 Doc Consistency 拡張（M0.X から）

**single-file mode**: 現状の `docs/DOC_CONSISTENCY_CHECKLIST.md` 手作業のまま継続。

**multi-file mode（新規 check 項目）**:

1. **用語整合性**: 各 topic file の用語が master spec 用語表と一致してるか
2. **cross-reference 健全性**: `spec/X.md` で言及される `spec/Y.md` が存在し、§ 番号が現存してるか（broken link 検出）
3. **scope 重複**: 同概念が複数 topic file で別記述されてないか（SSoT 単一性 check）
4. **master index 整合性**: master `SPEC.md` の index が `spec/` 直下 file 一覧と一致してるか

M4 の doc 整合性エンジン v1 候補（§7）。手作業期間は `docs/DOC_CONSISTENCY_CHECKLIST.md` に追記する。

**SSoT**: `docs/plans/specs/2026-05-17-spec-plan-multi-file-thinking-design.md` §6.2

## 4. アクター（エージェント）定義

詳細は `spec/harness.md` §7 参照。

---

## 5. 標準ワークフロー（agile デフォルト）

詳細は `spec/harness.md` §8 参照。

---

## 6. データモデル（SQLite スキーマ）

詳細は `spec/daemon-and-data.md` §4 参照（§4.1〜§4.10 全テーブル定義・スキーマ・prefs/config JSON スキーマを含む）。

---

## 7. doc 整合性エンジン v1

### 7.1 役割

> SPEC が変わったとき、影響を受ける可能性のある全ドキュメントを洗い出して、ユーザーに「ここ更新せなアカン」と提示する。**v1 では自動修正はせず、提示のみ**。

### 7.2 対象ドキュメント

`.claude-loom/project.json` で指定：

```json
{
  "project_id": "abc-123",
  "name": "claude-loom",
  "spec_path": "SPEC.md",
  "related_docs": [
    "PLAN.md", "README.md", "CLAUDE.md",
    "docs/**/*.md", "tests/REQUIREMENTS.md"
  ]
}
```

PM が spec フェーズで auto-discover（README, PLAN, docs/ を検出）、ユーザー手動で上書き可。

### 7.3 追加スキーマ

```sql
CREATE TABLE spec_changes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id      TEXT NOT NULL,
  spec_path       TEXT NOT NULL,
  before_hash     TEXT NOT NULL,
  after_hash      TEXT NOT NULL,
  diff            TEXT NOT NULL,
  detected_at     INTEGER NOT NULL,
  analyzed_at     INTEGER,
  status          TEXT NOT NULL,                -- 'pending' / 'analyzed' / 'dismissed'
  FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

CREATE TABLE consistency_findings (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  spec_change_id  INTEGER NOT NULL,
  target_path     TEXT NOT NULL,
  severity        TEXT NOT NULL,                -- 'high' / 'medium' / 'low'
  finding_type    TEXT NOT NULL,                -- 'term_removed' / 'term_renamed' / 'section_changed' / 'semantic_drift' / 'term_mention'
  description     TEXT NOT NULL,
  suggested_change TEXT,
  status          TEXT NOT NULL,                -- 'open' / 'acknowledged' / 'fixed' / 'dismissed'
  created_at      INTEGER NOT NULL,
  FOREIGN KEY (spec_change_id) REFERENCES spec_changes(id)
);
```

### 7.4 解析エンジン：ハイブリッド方式

**Phase A: 機械的スクリーニング（regex / grep ベース）**
- SPEC diff から削除/追加された見出し語・固有名詞を抽出
- related_docs を grep し「削除された語句に言及するファイル」を flag
- 高速、決定的、API 不要

**Phase B: LLM 解析（claude -p subprocess）**
- Phase A で flag された候補ファイルのみを対象
- daemon が `claude -p "<prompt>" --output-format json` を subprocess 起動
- 入力：SPEC diff + 候補ファイル本文 + system prompt（findings JSON 配列を返せ）
- 出力：構造化 findings
- **Claude Code 認証を流用、追加の API キー設定不要**
- `claude` コマンドが PATH に無い場合は Phase A のみで degraded mode

### 7.5 標準ワークフロー

```
[1] User or PM が SPEC.md を編集
[2] PostToolUse(Edit | Write) hook 発火
    対象が project.spec_path にマッチするか判定
[3] daemon が前回 after_hash 時点の snapshot と現在の diff を計算
    spec_changes に INSERT (status='pending')
    WebSocket push: GUI に「⚠️ SPEC 変更検知」バッジ表示
[4] User が GUI のバッジをクリック → "整合性チェック実行" ボタン押下
    （半自動。auto では走らせない、トークン消費の暴走を防ぐ）
[5] daemon: Phase A → Phase B の順で実行
    consistency_findings に複数 INSERT
    spec_changes.status = 'analyzed'
    WebSocket push: GUI に findings リスト表示
[6] User が各 finding をレビュー：
    - Acknowledge（後で対応 → plan_items の長期レーンに追加）
    - Mark Fixed
    - Dismiss（false positive）
    - Open in Editor（VSCode URL handler）
[7] PM 次回起動時、open な findings を spec フェーズで言及
```

### 7.6 v1 / v2 境界

| 機能 | v1 | v2 (Phase 2) |
|---|---|---|
| 検知 | ✅ | ✅ |
| 影響範囲提示 | ✅ | ✅ |
| 提案 | テキスト文字列 | unified diff 形式 |
| 修正適用 | ナシ（手動） | apply ボタン → 承認ループ → 自動 patch |
| 検出トリガ | 半自動（GUI ボタン） | 自動（設定可） |

---

## 8. スラッシュコマンド一覧

| コマンド | 役割 | Phase |
|---|---|---|
| `/loom` | daemon 起動チェック → ブラウザ open | 1 |
| `/loom-pm` | PM session を起動（system prompt load、メイン session が PM になる） | 1 |
| `/loom-spec` | PM 起動済み前提、spec 作成フェーズ開始 | 1 |
| `/loom-go` | spec 完成後、実装フェーズ開始（Developer ディスパッチ） | 1 |
| `/loom-status` | daemon の生死確認、起動中なら URL 表示 | 1 |
| `/loom-stop` | daemon 明示停止 | 1 |
| `/loom-retro` | 3-stage retro protocol（4-lens parallel critique → counter-argument → aggregator）。`--report` flag で archive markdown のみ生成。詳細 §3.9 + `docs/RETRO_GUIDE.md` | 0.8 |

---

## 9. 配布・インストール

詳細は `spec/install-and-test.md` §2 参照。

---

## 10. テスト戦略

詳細は `spec/install-and-test.md` §3 参照。

---

## 11. エラーハンドリング方針

| 失敗ケース | 挙動 |
|---|---|
| daemon が落ちてる時の hook 発火 | hooks 側で fail-silent + ローカル JSONL に append、daemon 起動時に再送 |
| daemon 起動失敗（port 衝突等） | ユーザーに明示エラー、別 port を提案 |
| `claude -p` コマンド未検出 | doc 整合性は Phase A のみで動作、warning 表示 |
| WebSocket 切断 | Web UI は自動再接続（exponential backoff、最大 30s） |
| Subagent 相関失敗（FIFO ずれ） | events に `correlation_warning` を記録、UI で「相関未確定」表示 |
| `~/.claude-loom/state.db` 破損 | 起動時 integrity check 失敗で backup 取得 → 新 DB で再開 |

---

## 12. 確定済み技術判断

| 項目 | 確定値 | 理由 |
|---|---|---|
| Stack | Node.js / TypeScript（hooks のみ bash） | Web UI 連携、frontend-design との相性 |
| Web フレームワーク | React + Tailwind + Vite | エコシステム、開発速度 |
| ゲームエンジン | Phaser 4 (M3.0 から、3 → 4 major bump 互換確認済) | ピクセル RPG ルームに最適。M2 仕様時 Phaser 3 想定 → M3.0 で pnpm が ^4.1.0 解決、`Phaser.Game` / `Phaser.Scene` API 互換、major drift 影響なし確認済（retro 2026-05-02-002 pj-001）|
| **Phaser version pin（M3.0 から）** | `^4.1.0` (`ui/package.json` dependencies) | M3.0 で pnpm が解決した actual version、`PhaserCanvas.tsx` / `RoomScene.ts` / `agentSpriteSync.ts` で動作確認済 |
| Daemon フレームワーク | Fastify + WebSocket（`@fastify/websocket`） | 軽量、TypeScript fit |
| **API レイヤ（M1 から）** | **tRPC + zod**（HTTP RPC + WS subscriptions） | frontend に AppRouter type を直接 import させ型ズレ完全排除、zod schema は frontend form validation でも reuse 可 |
| **ORM（M1 から）** | **Drizzle ORM**（`drizzle-orm` + `better-sqlite3`） | TypeScript-first、schema = TS コード、type 自動 export、frontend が DB type を直接 import 可、`drizzle-kit generate` で migration SQL 自動生成 |
| 永続化 | SQLite | 単一ファイル、OS バンドル、クエリ容易 |
| **ID strategy（M1 から）** | **nanoid（21 文字、`text` 列）** | 推測不可（security）、autoinc 漏洩なし、URL safe |
| **Timestamp（M1 から）** | **integer ms (epoch)** + Drizzle `mode: 'timestamp_ms'` | JS native (`Date` 自動展開)、frontend 互換 max |
| **Validation（M1 から）** | **zod** | tRPC defacto、frontend と schema 共有可 |
| **Test framework（daemon、M1 から）** | **Vitest** | ESM-first、TS native、超高速、harness の bash test と並列共存 |
| **Monorepo tool（M1 から）** | **pnpm workspaces** | TS ecosystem 標準、disk 効率 |
| **Repo 構造（M1 から）** | 既存 harness 資産 (root) + `daemon/` sibling、M2 で `ui/` sibling 追加 | 最小 monorepo、既存 M0 系列に手入れなし |
| **型共有 pattern（M1 から）** | daemon が `AppRouter` type と Drizzle schema type を export、frontend が `import type { AppRouter, Session, ... } from "@claude-loom/daemon"` | tRPC 標準 pattern、shared package 不要 |
| 通信 | hooks→daemon: HTTP POST `/event`（plain）、daemon→UI: tRPC over HTTP/WS | hook ingestion は bash + curl 維持（tRPC 通さん）、UI は tRPC で完結 |
| **WS subscription 粒度（M1 から）** | event 種別ごと subscription（`onAgentChange` / `onPlanChange` / `onFindingNew` 等） | frontend が必要 channel だけ open、type safety max |
| 認証 | `claude -p` subprocess で Claude Code 認証流用 | 追加キー不要 |
| **Daemon auth token（M1 から）** | nanoid 生成、`~/.claude-loom/daemon-token` (chmod 600) に保存、tRPC headers で送信 | daemon `127.0.0.1` bind 前提でも UI 経由攻撃を防ぐ |
| **Bind address（M1 から）** | `127.0.0.1` のみ | localhost 専用、外部公開禁止 |
| **CORS（M1 から）** | development: `localhost:5173` (Vite default) 許可、production: 同 origin (UI も daemon serve) | M2 frontend dev 時 |
| Visual 方向性 | ピクセル RPG（Stardew 系）+ **猫系（or アニマル系）キャラ**「猫の開発室」コンセプト | キャラクター愛着優先（Q9）+ 統一感ある世界観 |
| **Phaser React 内 mount pattern（M3 から）** | 自前 `useEffect` + `useRef`、HMR 用 stable ref + `import.meta.hot.dispose` で `game.destroy()` | library 依存ゼロ、frontend-design 委譲との相性、α-1 確定 / 詳細 §3.6.9.1 |
| **Gantt 実装（M3 から）** | 自前 SVG（rect/line/text + tokens.css var 直参照、200-400 LoC） | 3 theme 統合 seamless、bundle 増ゼロ、γ-3 確定 / 詳細 §3.6.9.3 |
| **PLAN.md 双方向同期（M3 から）** | hybrid debounce (500ms-1s) + last-write-wins (mtime) + `plan_conflict_detected` toast + localStorage backup | data 救済 + race window 狭く + bundle 増ゼロ、β-3 確定 / 詳細 §3.6.9.2 |
| **Visual regression check（M3.1 から）** | Playwright e2e（`@playwright/test` devDep、`ui/e2e/`、`pnpm --filter @claude-loom/ui e2e`） | independent infra で既存 vitest 影響ゼロ + WebGL 実 render + `toHaveScreenshot()` built-in + M3.1 双方向同期 e2e と同 infra、res-001 確定 / 詳細 §3.6.9.7 |
| Daemon ライフサイクル | Lazy 起動、30 分アイドルで停止 | リソース節約 + シームレス UX |
| Daemon ポート | 5757（config 変更可） | — |
| プロジェクト判定 | git root + `.claude-loom/project.json` marker | 自動 + 明示の hybrid |
| **Events rolling delete（M1 から）** | 30 日 OR 200MB 上限到達で oldest から削除、daily 実行 | event log の無限肥大防止 |

---

## 13. 既知の TBD / 未決事項

| 項目 | 判断時期 |
|---|---|
| Phaser のシーン構成詳細（タイル / アセット） | frontend-design 委譲時 |
| キャラクタースプライトの調達（自作 / Kenney.nl / AI 生成） | frontend-design 委譲時 |
| `~/.claude-loom/config.json` 詳細スキーマ（`docs/CONFIG_SCHEMA.md` 分離） | 実装初期 |
| WebSocket payload 詳細（`docs/EVENT_SCHEMA.md` 分離） | 実装初期 |
| **PM singleton 競合時の挙動**（複数セッションで `/loom-pm` 走らせた場合の先勝ち / 後勝ち / エラー） | 実装初期、Phase 1 タスクとして残す |
| Phase A regex screening の語彙抽出ルール詳細 | 実装初期（test 駆動で固める） |
| Subagent 並列ディスパッチ時の FIFO 相関の検証 | 実装初期 |
| daemon の supervisord / launchd 化（クラッシュ自動再起動） | Phase 1.5 検討 |
| Windows サポート | Phase 2 以降（MVP は macOS / Linux のみ） |
| マルチユーザー対応（複数開発者の指令室共有） | Phase 3 以降 |
| Hermes 型自己進化のメカニクス詳細 | Phase 3 |

---

## 14. 関連ドキュメント

- `PLAN.md` — 実装マイルストーン（writing-plans skill で生成予定）+ 長期レーンの正本
- `docs/SCREEN_REQUIREMENTS.md` — 画面要件詳細
- `docs/EVENT_SCHEMA.md` — hook payload + WebSocket message 完全仕様（実装初期に作成）
- `docs/CONFIG_SCHEMA.md` — `~/.claude-loom/config.json` 詳細スキーマ（実装初期に作成）
- `tests/REQUIREMENTS.md` — 受入要件 ID 一覧（実装初期に作成）
- `CLAUDE.md` — Claude Code 向け作業ガイド（実装初期に作成）
- `docs/COMMIT_GUIDE.md` — Conventional Commits + GitHub Flow 詳細ルール + good/bad 例（§3.8 の policy 宣言から参照、M0.7 で追加）

---

## 変更履歴

- 2026-04-26: 初版作成（ブレインストーミング Q3-Q12 + §1-§4 設計合意を反映）
- 2026-04-26: §3.4-3.6（設定ファイル / セキュリティ / WebSocket スキーマ）、§6.8-6.10（PLAN.md フォーマット / project.json / config.json）、§9.2-9.3（install/uninstall 詳細）、§13 拡充、§14 追加ドキュメント追記
- 2026-04-26: §3.3（PM session の PJ 非依存モデル明記）、§6.2（sessions.project_id を NULL 許容に変更）、§6.7（PM session の project 判定例外を追記）。SCREEN_REQUIREMENTS と整合：プロジェクト切替で Room/Gantt 連動、PM キャラは全 Room に常時表示
- 2026-04-26: §3.7 新節（プロジェクトライフサイクルと adopt 戦略：init/adopt/maintain の 3 段階、loom-managed マーカー仕様、PM の全ドキュメント保守スコープ）、§4.2.1 PM 責務に「ライフサイクル管理」「全ドキュメント保守」追加、§6.7 に init/adopt 分岐追記、§9.1 templates/ に CLAUDE.md.template / README.md.template / SPEC.md.template 追加
- 2026-04-26: §3.6.1 追加 + §9.1 skills/ 注記更新（M0.5 で skill 前倒し shipping 決定）
- 2026-04-27: §4.1 ロール一覧 + §4.2.3/4.2.4 reviewer mode 分岐 + §4.3 review_mode pool 説明 + §5 workflow Step [4]/[5] mode 分岐対応（M0.6 = single reviewer default）
- 2026-04-27: §6.9 project.json schema に rules.review_mode フィールド追加（M0.6）
- 2026-04-27: §2.2 ロール数 4→6 / §4.2.4 trio mode 条件付き発火 + 独立 JSON 明記 / §9.1 skills tree に loom-review/ 追加 / §4.3・§6.2・§6.9 に max_reviewers (single mode pool) 追加（M0.6 review 後 fix）
- 2026-04-27: §3.8 追加（CC + GitHub Flow 採用宣言、commit/branch 規約サマリ、commit_language ポリシー、M0.7）
- 2026-04-27: §6.9 commit_prefixes 11 種拡張 + branch_types / commit_language フィールド追加（M0.7）
- 2026-04-27: §3.9 追加（M0.8 retro 機能、4 lens / 3-stage protocol / 3-file state / hybrid auto-apply / recursive 自己最適化）
- 2026-04-27: §6.9.1 / §6.9.2 / §6.9.3 追加（M0.8 retro の user-prefs / project-prefs schema + merge 規則）
- 2026-05-02: §3.6.9.7 追加 + §3.6.9.6 表 M3.1 行更新 (task 4→5、scope に visual regression infra 追記) + §12 確定値表に "Visual regression check (M3.1 から)" 行追加（res-001 確定 = Playwright e2e、retro 2026-05-02-002 由来、M3.1 spec phase 解決）
- 2026-05-03: §3.6.10 新設「SSoT cross-check rule」+ Coding 原則「文字列リテラル回避、enum/定数経由比較」codify（retro 2026-05-03-001 pj-002 由来、M3.1 t3 で偶然発見した SSoT enum drift bug を構造 pattern として spec 化、user feedback memory 「avoid string literals, prefer typed constants/enums」を SSoT 昇格）
- 2026-05-05: §3.6.11 新設「UI Smoke Test Skill」+ §10.4 新設「Browser-interactive verification layer」（retro 2026-05-04-001 F-proc-005 拡張、Phase 1 MVP main 統合直後 4 件 critical bug 発覚を構造的に塞ぐ skill 設計、user feedback memory「UI smoke test capability」を SSoT 昇格、M0.11.3 milestone で実装）
- 2026-05-05: §3.6.12 新設「Design Implementation」+ §3.6.9.1 改訂 (Phaser α-1 → DOM/SVG α-2 strategy A 採用、claude-room-handoff.zip design bundle 受領、Phase 1 aesthetic MVP completion を M0.11.4 milestone で実装、Phaser dependency rollback)
