# claude-loom — 仕様書（SPEC.md）

> **本ドキュメントは Single Source of Truth (SSoT)。実装と乖離が出た場合は SPEC を先に更新してから実装を合わせる。**
>
> 最終更新: 2026-04-26
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
- アクター層：4 ロール定義（PM / Developer / Code Reviewer / Security Reviewer / Test Reviewer）
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

1. ユーザーが任意のディレクトリで `/loom` を実行
2. スラッシュコマンドが `localhost:5757/health` を叩く
3. 無応答なら daemon を `nohup node ~/.claude-loom/daemon.js &` で起動、PID ファイル記録
4. 応答あり or 起動完了したら `open http://localhost:5757` でブラウザを開く
5. daemon は 30 分イベント無しでセルフシャットダウン
6. 明示停止は `/loom-stop`、状態確認は `/loom-status`

### 3.3 中央指令室モデル

- **PM = singleton セッション**：ユーザーが `/loom-pm` で 1 つ立ち上げ、開きっぱなしにする
- PM が複数プロジェクトを横断管理（cwd は任意、操作は絶対パス）
- Developer / Reviewer = プロジェクトごとのプール（後述）
- Phase 1 は単一プロジェクト切替で十分、複数 PJ 横断俯瞰の Atrium ビューは Phase 2 以降

#### PM セッションは PJ 非依存（global）

- PM session（role='pm'）は **特定プロジェクトに紐付かない**。`sessions.project_id` は NULL を許容
- PM が dispatch する Developer / Reviewer subagent は `agent_pool.project_id` 経由で PJ に紐付く（subagent_type に関わらず、prompt 先頭の `[loom-meta] project_id=xxx` で daemon が判定）
- GUI 上、PM キャラクターは **どのプロジェクトの Room View に切り替えても常に表示される**（PM は全 PJ を横断管理しているため）
- 通常の Developer 親セッション（Claude Code 通常使用）は従来通り `sessions.project_id` を NOT NULL 扱い（git root から自動判定）

#### プロジェクト切替の挙動

- GUI のプロジェクト切替は Room View / 進捗ビュー（ガント）/ Plan View 等を **同一 PJ コンテキストに連動切替** する
- ユーザーは「いま見ている PJ」を 1 つだけアクティブにする（複数同時表示は Phase 2 の Atrium 機能）

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

daemon → Web UI で push される event の主要型一覧（詳細 payload は実装フェーズで `docs/EVENT_SCHEMA.md` に定義）：

| event 名 | 発火タイミング | 用途 |
|---|---|---|
| `project_added` | projects に INSERT | プロジェクト切替リスト更新 |
| `project_updated` | projects 更新 | プロジェクト名・メタ更新 |
| `session_added` | sessions に INSERT | Session List 追加 |
| `session_updated` | sessions ステータス変更 | Room View のキャラ状態更新 |
| `session_ended` | sessions.ended_at 更新 | キャラの退場アニメ |
| `subagent_started` | subagents INSERT | Room View にキャラ着席 |
| `subagent_finished` | subagents 完了 | キャラ idle 戻り |
| `task_updated` | tasks 変更 | Plan View 短期レーン更新 |
| `plan_item_changed` | plan_items 変更 | Plan View 長期レーン更新 |
| `consistency_finding_new` | findings INSERT | バッジ通知 + リスト更新 |
| `token_usage_tick` | token_usage 更新 | メーター数値更新（5 分間隔） |
| `connection_ack` | クライアント接続時 | 初期 state スナップショット送信 |

クライアントは接続後 `connection_ack` で全状態を受信、以降は差分 event のみ受信する。

#### 3.6.1 M0.5 — Approval-Reduction Skills（M0 と M1 の橋渡し）

M0 で構築したハーネスを使った M1+ 開発の前に、承認プロンプト削減のための補助 skill を前倒しで shipping する。SPEC §3 元設計では skill 自動生成は Phase 2 だが、それは「Hermes 型自己進化で skill を**生成する**」フェーズの話。ここで shipping するのは **harness 利用者全員が必ず欲しがる手書き skill**：

- `loom-test`：ハーネステスト一括実行 + 結果サマリ
- `loom-status`：repo / harness 状態スナップショット
- `loom-tdd-cycle`：TDD 規律ガイド（loom-developer から呼ばれる）
- `loom-review-trio`：3 reviewer 並列 dispatch のプロンプトテンプレ
- `templates/settings.json.template`：bundled-script を allowlist に含めた settings 初期値

shipping 規模：4 skill + 1 template + `install.sh` 拡張。SPEC §9.1 のディレクトリ構造に `skills/` が M0.5 から有効化される。

### 3.7 プロジェクトライフサイクルと adopt 戦略

claude-loom は **新規プロジェクトの立ち上げ** にも **既存プロジェクトの取り込み（adopt）** にも対応する。両者は明確に区別され、PM が異なるフローで処理する。

#### 3.7.1 ライフサイクル 3 段階

| 段階 | 契機 | PM の動作 |
|---|---|---|
| **init** | 空ディレクトリ or 既存 git repo に loom 初導入 | テンプレから SPEC/PLAN/CLAUDE/README を生成、`.claude-loom/project.json` 作成 |
| **adopt** | 既存ファイルを持つ git repo に loom 導入 | 既存ファイルを **検知して尊重**、`.claude-loom/project.json` のみ生成、CLAUDE.md には loom セクションを追記マーカーで挿入 |
| **maintain** | 上記いずれか後の継続運用 | doc 整合性監視、ライフサイクル全体で全ドキュメントを保守対象とする |

#### 3.7.2 adopt 戦略（既存 PJ への侵略を防ぐ）

**non-destructive 原則**：既存ファイルは **user の明示承認なしに改変しない**。

PM が adopt フローで実施する内容：

1. cwd を git root 化、既存ファイル一覧を取得
2. 検知対象：
   - `SPEC.md` / `PLAN.md` / `CLAUDE.md` / `README.md` の有無
   - 既存テスト dir（`tests/` `__tests__/` `spec/` 等）
   - 既存 CI 設定（`.github/workflows/` 等）
   - branch / commit 規約の手がかり（`CONTRIBUTING.md` `CHANGELOG.md`）
3. 検知レポートを user に提示
4. user が項目ごとに承認 → PM が以下を実行：
   - **必ず生成**：`.claude-loom/project.json`（loom 固有、衝突不可能）
   - **既存あり**：尊重、変更しない（必要なら user 承認の上でテンプレ生成）
   - **既存 CLAUDE.md あり**：末尾に loom セクションを追記（マーカー区切り、§3.7.3）
   - **既存 CLAUDE.md なし**：テンプレから新規生成
   - **既存 README.md あり**：尊重、変更しない
   - **既存 README.md なし**：テンプレから最小スケルトンを生成

#### 3.7.3 loom-managed セクションマーカー

CLAUDE.md などに loom が追記する範囲は、視覚的に分離するためマーカーで囲む：

```markdown
（既存ユーザーコンテンツはそのまま）

<!-- claude-loom managed: start -->
## claude-loom 開発フロー

このプロジェクトは claude-loom で管理されています。
詳細は SPEC.md / PLAN.md を参照。

[loom が動的に管理する規約・ルール記述]
<!-- claude-loom managed: end -->
```

PM が CLAUDE.md を更新する際は **マーカー間のみを書き換える**。マーカー外の既存内容には絶対に触らない。マーカーが無い場合は新規追加（既存 CLAUDE.md の末尾、必要なら user 承認）。

#### 3.7.4 PM のドキュメント保守スコープ

PM は以下の **すべて** を保守対象として扱う：

| 種別 | 例 | 保守タイミング |
|---|---|---|
| 仕様書 | `SPEC.md` | spec フェーズで作成・更新、変更時に doc 整合性 trigger |
| 計画 | `PLAN.md` | 実装中に進捗反映、新規タスク追加時に更新 |
| 作業ガイド | `CLAUDE.md` | loom セクションは PM 管理、それ以外は変更しない |
| ユーザー向け | `README.md` | user 承認の上で更新 |
| その他 docs | `docs/**/*.md` | 整合性チェックの対象、変更は user 承認 |
| 受入要件 | `tests/REQUIREMENTS.md` | spec 変更で新規 REQ 追加時に PM が更新 |

**MVP では PM は doc 整合性 finding を提示するのみ**（自動修正は v2 = Phase 2）。ユーザーが各 finding に対して acknowledge / fix / dismiss を判断する。

---

## 4. アクター（エージェント）定義

### 4.1 ロール一覧

| ロール | 体数 | 起動者 | 配布 |
|---|---|---|---|
| PM | 1（singleton） | ユーザーが `/loom-pm` で起動 | `.claude/agents/loom-pm.md` (system prompt) |
| Developer | 1〜N（PJ ごと max 設定） | PM が Task tool でディスパッチ | `.claude/agents/loom-developer.md` |
| Reviewer (single mode) | 1〜N（PJ ごと max 設定、default mode） | Developer が Task tool でディスパッチ | `.claude/agents/loom-reviewer.md` |
| Code Reviewer | 1〜N（PJ ごと max 設定） | Developer が Task tool でディスパッチ | `.claude/agents/loom-code-reviewer.md` |
| Security Reviewer | 1〜N（PJ ごと max 設定） | Developer が Task tool でディスパッチ | `.claude/agents/loom-security-reviewer.md` |
| Test Reviewer | 1〜N（PJ ごと max 設定） | Developer が Task tool でディスパッチ | `.claude/agents/loom-test-reviewer.md` |

### 4.2 各ロールの責務

#### 4.2.1 PM (loom-pm)
- **プロジェクトライフサイクル管理**：init（新規）/ adopt（既存）/ maintain（継続）の 3 段階を仕分けて処理（§3.7）
- ユーザーと spec 作成（spec-driven dev）
- 実装計画立案（タスク分解 + 開発者人数 N の提案、ユーザー手直し可）
- Developer への作業割り振り（Task tool）
- **doc 整合性の自動見張り**（中核責務、§7 参照）
- **全ドキュメントの保守**（SPEC / PLAN / CLAUDE / README / docs/**/*.md / tests/REQUIREMENTS.md、§3.7.4）
- Plan View の更新（TodoWrite + 構造化 plan ファイル）
- 進捗の集約とユーザーへの報告
- skill / hook の提案（Phase 2）

> CLAUDE.md / README.md など既存ファイルがある場合は **non-destructive 原則** を守る（§3.7.2）。loom-managed マーカーの範囲のみを書き換え可能。

#### 4.2.2 Developer (loom-developer)
- TDD ループの実行：
  1. 実装する機能の言語化
  2. 失敗するテストの作成
  3. 最小実装で緑にする
  4. リファクタ
  5. レビュー室にレビュー依頼
  6. 指摘あれば修正、再レビュー
- 完了したら PM に報告
- 作業ログをチームに共有

#### 4.2.3 Reviewer (loom-reviewer, single mode default)
- review_mode の **default**。1 体の subagent が **コード / セキュリティ / テスト 3 観点** を順次回し、各段階で進捗テキスト（`## 観点 N/3: 〜レビュー中...`）を逐次出力
- 観点ごとに findings を集めた後、`aspect` フィールド（`"code" | "security" | "test"`）付きで集約 JSON を 1 つ返す
- token コスト ≒ trio mode の 1/3。Modern Claude（Opus/Sonnet 4.x）の多観点単一パス能力を活用
- 大規模リファクタや critical path で trio mode が必要な場合は `[loom-meta] review_mode=trio` で per-task 切替可

> ピクセル RPG GUI（Phase 1 後半 / M3）でのキャラ表現は trio mode 時のみレビュー室に 3 人並ぶ絵が成立。single mode は 1 人キャラが 3 観点バッジを順次表示する設計（M3 で詳細化）。

#### 4.2.4 Review Trio (3 ロール独立、trio mode opt-in)
- **Code Reviewer**：可読性 / 設計 / コーディング規約
- **Security Reviewer**：脆弱性 / シークレット混入 / 認証認可
- **Test Reviewer**：テストカバレッジ / テストの妥当性 / エッジケース
- 3 体は **常に同時並列発火** することを workflow で強制（部分レビュー禁止）
- 各自指摘を返し、Developer が集約して修正

### 4.3 Developer / Reviewer プール管理

- プロジェクトごとに `max_developers / max_code_reviewers / max_security_reviewers / max_test_reviewers` を設定（default: 3 / 1 / 1 / 1）
- PM は spec フェーズで人数を提案、ユーザーが対話で手直し可
- pool_slot は永続的な「席」、subagent はその席が演じる「個別タスクの実行体」
- pool_slot 状態：`idle` / `busy`、busy 中は `current_subagent_id` を保持
- **review_mode** は `.claude-loom/project.json` の `rules.review_mode` で project default を指定（`"single"` | `"trio"`、未設定時は `"single"`）。`[loom-meta] review_mode=...` で per-task 上書き可（PM が critical path タスクで明示的に `trio` を指示する用途）

### 4.4 配布形態

- 全 agent definition は `.claude/agents/loom-*.md` として配布
- claude-loom リポジトリの `agents/` ディレクトリから `~/.claude/agents/` にシンボリックリンク（claude-blog-skill の `install.sh` パターン踏襲）
- 同様に `hooks/`, `commands/`, `skills/` もシンボリックリンク方式

---

## 5. 標準ワークフロー（agile デフォルト）

```
[1] User × PM
    /loom-spec 起動 → 対話 → SPEC.md 生成
    実装計画 + 開発者人数 N も決定（PM 提案 → User 手直し）

[2] PM
    実装計画から N 個のタスクに分解
    Plan View に登録（短期=TodoWrite、長期=plan ファイル）

[3] PM → Developer (並列 N 体)
    Task tool で N 体を並列ディスパッチ
    prompt 先頭に [loom-meta] project_id=xxx, slot=dev-N, working_dir=/path/...

[4] Developer (各自)
    TDD ループ実行：
      失敗テスト → 実装 → 緑 → リファクタ
    review_mode 判定：
      [loom-meta] に review_mode 指定があればそれ採用
      なければ .claude-loom/project.json の rules.review_mode (default "single")
    review_mode == "single" → loom-reviewer 1 体ディスパッチ
    review_mode == "trio"   → loom-{code,security,test}-reviewer 3 体並列ディスパッチ

[5a] Reviewer (single mode、default)
     loom-reviewer が順次 3 観点回し、各段階で進捗テキスト出力
     findings を aspect 付き集約 JSON で返却

[5b] Review Trio (trio mode、opt-in)
     Code / Security / Test の 3 観点で並列レビュー
     各 reviewer が独立 JSON を返却、Developer が集約

[6] Developer ⇄ Review
    指摘 → 修正 → 再レビュー、を全クリアまで反復

[7] Developer → PM
    完了報告
    PM が Plan View を更新、コミット粒度ルール適用を確認

[8] PM
    spec 変更があれば doc 整合性エンジン v1 起動
    影響範囲を洗い出し → ユーザーに承認求める
```

---

## 6. データモデル（SQLite スキーマ）

### 6.1 テーブル一覧（全 11 テーブル）

§6 で 9 テーブル、§7（doc 整合性エンジン）で 2 テーブル追加：

- **§6 (本章)**: `projects / events / sessions / subagents / agent_pool / tasks / token_usage / notes / plan_items`
- **§7**: `spec_changes / consistency_findings`

### 6.2 スキーマ定義

```sql
-- 最上位エンティティ
CREATE TABLE projects (
  project_id     TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  root_path      TEXT NOT NULL UNIQUE,
  spec_path      TEXT,
  plan_path      TEXT,
  rules_path     TEXT,
  methodology    TEXT NOT NULL DEFAULT 'agile',
  max_developers          INTEGER NOT NULL DEFAULT 3,
  max_code_reviewers      INTEGER NOT NULL DEFAULT 1,
  max_security_reviewers  INTEGER NOT NULL DEFAULT 1,
  max_test_reviewers      INTEGER NOT NULL DEFAULT 1,
  status         TEXT NOT NULL,                -- 'active' / 'archived'
  created_at     INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL
);

-- append-only 監査ログ
CREATE TABLE events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id    TEXT NOT NULL,
  event_type    TEXT NOT NULL,                 -- session_start / pre_tool / post_tool / stop / subagent_stop
  tool_name     TEXT,
  payload       TEXT NOT NULL,                 -- JSON 全体
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_events_session ON events(session_id);
CREATE INDEX idx_events_time ON events(created_at);

-- derived state
CREATE TABLE sessions (
  session_id     TEXT PRIMARY KEY,
  project_id     TEXT,                          -- NULL 許容: PM session (role='pm') は PJ 非依存
  worktree_path  TEXT NOT NULL,
  role           TEXT,                          -- 'pm' / 'dev_parent' / null
  status         TEXT NOT NULL,                 -- 'active' / 'idle' / 'ended'
  started_at     INTEGER NOT NULL,
  ended_at       INTEGER,
  last_seen_at   INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(project_id)
);
CREATE INDEX idx_sessions_project ON sessions(project_id);
-- 制約: role='pm' の場合のみ project_id NULL 許容、それ以外は実装側で NOT NULL 扱い

CREATE TABLE subagents (
  subagent_id        TEXT PRIMARY KEY,
  parent_session_id  TEXT NOT NULL,
  pool_slot_id       TEXT,
  agent_type         TEXT NOT NULL,
  prompt_summary     TEXT,
  status             TEXT NOT NULL,            -- 'running' / 'done' / 'failed'
  started_at         INTEGER NOT NULL,
  ended_at           INTEGER,
  result_summary     TEXT,
  FOREIGN KEY (parent_session_id) REFERENCES sessions(session_id),
  FOREIGN KEY (pool_slot_id) REFERENCES agent_pool(pool_slot_id)
);
CREATE INDEX idx_subagents_parent ON subagents(parent_session_id);

CREATE TABLE agent_pool (
  pool_slot_id        TEXT PRIMARY KEY,
  project_id          TEXT NOT NULL,
  agent_type          TEXT NOT NULL,
  slot_number         INTEGER NOT NULL,
  status              TEXT NOT NULL,            -- 'idle' / 'busy'
  current_subagent_id TEXT,
  last_active_at      INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  UNIQUE(project_id, agent_type, slot_number)
);
CREATE INDEX idx_pool_project ON agent_pool(project_id);

CREATE TABLE tasks (
  task_id       TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL,
  content       TEXT NOT NULL,
  active_form   TEXT NOT NULL,
  status        TEXT NOT NULL,                  -- 'pending' / 'in_progress' / 'completed'
  position      INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

CREATE TABLE token_usage (
  session_id    TEXT NOT NULL,
  bucket_at     INTEGER NOT NULL,               -- 5 分単位 epoch
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_tokens  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (session_id, bucket_at)
);

-- user-writable (B 介入)
CREATE TABLE notes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  attached_type TEXT NOT NULL,                  -- 'project' / 'session' / 'subagent' / 'task' / 'pool_slot'
  attached_id   TEXT NOT NULL,
  content       TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_notes_attached ON notes(attached_type, attached_id);

CREATE TABLE plan_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id     TEXT NOT NULL,
  source         TEXT NOT NULL,                 -- 'file' / 'user'
  source_path    TEXT,
  parent_id      INTEGER,
  title          TEXT NOT NULL,
  body           TEXT,
  status         TEXT NOT NULL,                 -- 'todo' / 'doing' / 'done'
  position       INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (parent_id) REFERENCES plan_items(id)
);
```

### 6.3 Event payload 仕様

各 hook は固定スキーマで POST。詳細は `docs/EVENT_SCHEMA.md`（実装フェーズで作成）に分離する想定。
代表例：

```json
// session_start
POST /events
{ "type": "session_start", "session_id": "abc-123",
  "worktree_path": "/Users/.../proj-a", "timestamp": 1777200000000 }

// pre_tool(Task) — サブエージェント起動
{ "type": "pre_tool", "session_id": "abc-123", "tool_name": "Task",
  "tool_input": { "subagent_type": "loom-developer", "prompt": "..." },
  "timestamp": 1777200500000 }
```

### 6.4 Subagent 相関ロジック

- PreToolUse(Task) と PostToolUse(Task) を **session 単位の FIFO キュー** で紐付け
- daemon が PreToolUse(Task) 受信時に uuid 採番、キューに enqueue
- PostToolUse(Task) で先頭を dequeue、subagent_id 確定
- prompt 先頭の `[loom-meta] project_id=xxx, slot=dev-N` をパースして agent_pool と紐付け
- **検証要件**：並列 Task 呼び出し時の挙動を実装初期に確認、必要なら uuid を tool_input に injection する方式に切替

### 6.5 Token 使用量取得

- `~/.claude/projects/*/transcripts/*.jsonl` を 30 秒 polling
- 各 message の `usage` フィールドを集計、5 分バケットで token_usage テーブルに upsert
- 実装時に Claude Code が hook 経由で usage を出すなら差し替え

### 6.6 Events テーブル サイズ管理

- rolling delete: **30 日 OR 200MB 超** で古い順 vacuum
- daemon 起動時 + 6h 毎に実行
- 設定は `~/.claude-loom/config.json` の `retention_days` / `retention_mb`

### 6.7 プロジェクト判定ロジック

```
session_start hook 発火時：
  1. cwd を取得
  2. このセッションで /loom-pm が即座に走った（or 環境変数 LOOM_ROLE=pm）か？
     - YES → role='pm' を sessions に記録、project_id は NULL のまま（PM session は PJ 非依存）
     - NO  → 通常の Developer 親セッションとして判定処理続行（手順 3 へ）
  3. `git rev-parse --git-common-dir` で repo の正規パスを取る（worktree 対応）
  4. 正規パスのハッシュ = project_id 候補
  5. プロジェクトルートに `.claude-loom/project.json` マーカーあれば最優先
  6. projects テーブルに既存？
     - YES → sessions.project_id にセット（既存 PJ）
     - NO  → 「未登録」状態の暫定 row を INSERT、GUI で通知

PM が /loom-spec 実行時に追加判定（init / adopt 分岐）：
  7. 既存ファイル検知（SPEC.md / PLAN.md / CLAUDE.md / README.md / tests/）
     - すべて無し → init モード（テンプレから生成）
     - いずれかあり → adopt モード（§3.7 のフローに従う）
  8. user に検知レポート提示 → 項目ごとの承認
  9. .claude-loom/project.json を生成 → projects テーブル本登録
```

git 外のディレクトリは「無所属プロジェクト」（`projects.root_path = $HOME` の特殊レコード）として扱う。
PM session の場合、サブエージェントの project 紐付けは prompt 先頭の `[loom-meta] project_id=xxx` で個別判定（§6.4 参照）。

### 6.8 PLAN.md フォーマット（長期レーンの正本）

長期レーン (plan_items) のソースとなるファイル形式。**YAML frontmatter + Markdown 本文** を採用。
git で読みやすい diff、人間が手で編集しやすい、daemon がパースして DB へ同期しやすい、の 3 点を満たす。

```markdown
---
schema: claude-loom-plan-v1
project_id: abc-123
last_synced_at: 1777200000000
---

# claude-loom 実装計画

## マイルストーン M1: ステージ層

- [ ] daemon プロセス雛形 (Fastify + WebSocket) <!-- id: m1-t1 status: todo -->
- [x] hooks スクリプト 5 種の枠組み <!-- id: m1-t2 status: done -->
- [ ] SQLite スキーマ migration <!-- id: m1-t3 status: doing -->

## マイルストーン M2: アクター層

- [ ] loom-pm agent definition <!-- id: m2-t1 status: todo -->
- [ ] loom-developer agent definition <!-- id: m2-t2 status: todo -->
```

**パース仕様**：

- `##` 見出し = マイルストーン (parent_id = NULL)
- `- [ ]` / `- [x]` 行 = タスク (parent_id = 直前のマイルストーン id)
- 末尾 HTML コメント `<!-- id: xxx status: yyy -->` がメタ情報。id は daemon が初回同期時に採番、以後安定
- ステータス：`todo` / `doing` / `done`
- 最大 2 階層（マイルストーン → タスク）

**同期方向**：

- daemon は plan ファイルを `chokidar` で監視 → 変更検知で plan_items に upsert
- Web UI からの編集は daemon が plan ファイルへ書き戻し（atomic write: tmp + rename）
- 競合（手編集と GUI 編集が同時）は daemon の最終書き込みが勝つ（last-write-wins）。MVP の割り切り
- 双方向同期だがバージョン管理は git に委譲（merge conflict はユーザーが解決）

### 6.9 `.claude-loom/project.json` 完全スキーマ

```json
{
  "$schema": "https://claude-loom.dev/schemas/project-v1.json",
  "schema_version": 1,

  "project_id": "abc-123-def-456",
  "name": "claude-loom",

  "spec_path": "SPEC.md",
  "plan_path": "PLAN.md",
  "related_docs": [
    "README.md", "CLAUDE.md", "docs/**/*.md", "tests/REQUIREMENTS.md"
  ],

  "methodology": "agile",

  "pool": {
    "max_developers": 3,
    "max_code_reviewers": 1,
    "max_security_reviewers": 1,
    "max_test_reviewers": 1
  },

  "rules": {
    "tdd_required": true,
    "branch_pattern": "feat/{ticket}",
    "commit_prefixes": ["test", "feat", "fix", "chore", "docs"],
    "main_branch": "main",
    "no_direct_commit_to_main": true,
    "review_mode": "single"
  },

  "consistency_engine": {
    "trigger_mode": "manual",
    "regex_screen_enabled": true,
    "llm_analysis_enabled": true
  }
}
```

| フィールド | 必須 | デフォルト | 説明 |
|---|---|---|---|
| `schema_version` | ✓ | 1 | スキーマバージョン |
| `project_id` | ✓ | uuid 自動生成 | unique 識別子 |
| `name` | ✓ | git repo 名 fallback | 表示名 |
| `spec_path` | ✓ | `SPEC.md` | SPEC ファイル相対パス |
| `plan_path` | — | `PLAN.md` | 長期計画ファイル |
| `related_docs` | — | `[README.md, CLAUDE.md]` | 整合性チェック対象 (glob 対応) |
| `methodology` | — | `agile` | Phase 1 は agile 固定 |
| `pool.*` | — | 3/1/1/1 | プール上限 |
| `rules.*` | — | (上記) | チームルール |
| `rules.review_mode` | — | `"single"` | `"single"` (default、loom-reviewer 1 体) or `"trio"` (loom-{code,security,test}-reviewer 並列 3 体) |
| `consistency_engine.*` | — | (上記) | エンジン挙動 |

### 6.10 `~/.claude-loom/config.json` スキーマ（方針サマリ）

詳細は実装フェーズで `docs/CONFIG_SCHEMA.md` に分離。Phase 1 の必須フィールド：

| フィールド | デフォルト | 説明 |
|---|---|---|
| `daemon.port` | 5757 | daemon リッスンポート |
| `daemon.idle_timeout_min` | 30 | アイドル自動停止までの分数 |
| `daemon.bind_host` | `127.0.0.1` | バインドアドレス（変更非推奨） |
| `retention.days` | 30 | events 保持日数 |
| `retention.size_mb` | 200 | events 最大サイズ MB |
| `polling.token_usage_sec` | 30 | transcript polling 間隔 |
| `ui.theme` | `dark` | テーマ（Phase 1 は dark のみ） |
| `consistency.claude_cmd` | `claude` | `claude -p` 起動時のコマンド名 |

config.json が存在しない場合は daemon 起動時にデフォルト値で生成。

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
| `/loom-retro` | プロジェクト終了時の振り返り（claude-blog-skill の /retro 参考） | 2 |

---

## 9. 配布・インストール

### 9.1 ディレクトリ構造（claude-loom リポジトリ）

```
claude-loom/
├── SPEC.md                  ← 本ドキュメント
├── PLAN.md                  ← 実装計画（後で writing-plans で生成）
├── CLAUDE.md                ← Claude Code 向け作業ガイド
├── README.md                ← ユーザー向け説明
├── install.sh               ← シンボリックリンク設置 + daemon ファイル配置
├── uninstall.sh
├── docs/
│   ├── SCREEN_REQUIREMENTS.md  ← 画面要件（別ドキュメント）
│   └── EVENT_SCHEMA.md         ← hook payload 詳細
├── agents/
│   ├── loom-pm.md
│   ├── loom-developer.md
│   ├── loom-code-reviewer.md
│   ├── loom-security-reviewer.md
│   └── loom-test-reviewer.md
├── commands/
│   ├── loom.md
│   ├── loom-pm.md
│   ├── loom-spec.md
│   ├── loom-go.md
│   ├── loom-status.md
│   └── loom-stop.md
├── hooks/
│   ├── loom-session-start.sh
│   ├── loom-pre-tool.sh
│   ├── loom-post-tool.sh
│   └── loom-stop.sh
├── skills/                  ← M0.5 から有効。M0.5 で 4 つの harness 補助 skill を shipping。Phase 2 で Hermes 型自動生成が加わる
│   ├── loom-test/
│   ├── loom-status/
│   ├── loom-tdd-cycle/
│   └── loom-review-trio/
├── daemon/                  ← Node プロジェクト
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts
├── ui/                      ← React + Vite + Phaser
│   ├── package.json
│   └── src/
├── templates/               ← 新規 PJ / adopt 用テンプレ
│   ├── SPEC.md.template
│   ├── PLAN.md.template
│   ├── CLAUDE.md.template          ← loom-managed セクション含む
│   ├── README.md.template          ← 最小スケルトン
│   ├── settings.json.template            ← bundled-script allowlist 初期値（M0.5）
│   └── claude-loom/
│       └── project.json.template
└── tests/
    ├── REQUIREMENTS.md      ← 受入要件（claude-blog-skill 流儀）
    └── *_test.sh / *_test.ts
```

### 9.2 install.sh の振る舞い詳細

```bash
install.sh の流れ:

1. 前提チェック
   - bash / jq / curl / node (>=20) / claude コマンドの存在確認
   - 不足あればエラーで停止、不足分一覧を表示

2. ディレクトリ準備
   - mkdir -p ~/.claude/{agents,commands,hooks,skills}
   - mkdir -p ~/.claude-loom

3. シンボリックリンク設置 (claude-blog-skill 流儀)
   for f in agents/loom-*.md commands/loom-*.md hooks/loom-*.sh; do
     dest=~/.claude/<type>/$(basename "$f")
     if [ -e "$dest" ] && [ ! -L "$dest" ]; then
       echo "ERROR: $dest が通常ファイルとして存在。手動で対応してくれ" → 停止
     elif [ -L "$dest" ]; then
       echo "INFO: 既存リンクを更新"
       rm "$dest"
     fi
     ln -s "$(realpath "$f")" "$dest"
   done

4. daemon ビルド & 配置
   - cd daemon && npm ci && npm run build
   - cp -r daemon/dist ~/.claude-loom/daemon
   - chmod 0700 ~/.claude-loom

5. UI ビルド & 配置
   - cd ui && npm ci && npm run build
   - cp -r ui/dist ~/.claude-loom/ui

6. settings.json 更新 (jq + atomic mv)
   src=~/.claude/settings.json
   tmp=${src}.tmp
   bak=${src}.bak.$(date +%s)
   cp "$src" "$bak"
   jq --arg hook "$(realpath hooks/loom-pre-tool.sh)" \
      '.hooks.PreToolUse += [{"matcher": "Task", "hooks": [{"type": "command", "command": $hook}]}]' \
      "$src" > "$tmp"
   jq empty "$tmp" || { echo "ERROR: 不正な JSON"; exit 1; }   # 再検証
   mv "$tmp" "$src"
   rm "$bak"   # 成功時は backup 削除
   # ※ 同様に PostToolUse / SessionStart / Stop も登録

7. 完了表示
   - 「インストール完了。`/loom` で起動できる」を表示
```

### 9.3 uninstall.sh の振る舞い

```bash
uninstall.sh の流れ:

1. daemon 停止 (動作中なら)
   - localhost:5757/shutdown を叩く、応答無くば SIGTERM
2. シンボリックリンク削除
   - ~/.claude/<type>/loom-* で symlink のものだけ削除
3. settings.json から hooks エントリを削除
   - jq で .hooks.PreToolUse[] | select(.command | contains("loom-")) | del 等
4. ~/.claude-loom/ の扱い
   - state.db, config.json, .token を保持するかユーザーに確認
   - --purge オプション付きなら全削除
```

### 9.4 依存関係

- bash, jq, curl（hooks 層）
- Node.js >= 20（daemon, UI build）
- Claude Code CLI（`claude` コマンドが PATH に必要）
- SQLite 3（OS バンドルで OK）

---

## 10. テスト戦略

### 10.1 TDD 基本ルール

- main 直コミット禁止、ブランチ単位で /review + /security-review 指摘ゼロ必須
- コミット粒度：`test(xxx)` / `feat(xxx)` / `fix(xxx)` / `chore(xxx)` / `docs:` の 5 prefix
- 1 要件 = 1 ブランチ、1 機能 = 1 コミット

### 10.2 テスト配置

- bash hooks: `tests/*_test.sh`（claude-blog-skill 流儀、自前ハーネス）
- daemon (TypeScript): `daemon/src/**/*.test.ts`（vitest）
- UI: `ui/src/**/*.test.tsx`（vitest + testing-library）
- 統合テスト: `tests/integration/*_test.sh`（daemon 起動 → hook 発火 → DB 検証）

### 10.3 受入要件

`tests/REQUIREMENTS.md` に ID 付きで記録（claude-blog-skill 流儀）。
例：`REQ-001: /loom 実行で daemon が起動し、ブラウザが localhost:5757 を開く`

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
| ゲームエンジン | Phaser 3 | ピクセル RPG ルームに最適 |
| Daemon フレームワーク | Fastify + ws | 軽量、TypeScript fit |
| 永続化 | SQLite | 単一ファイル、OS バンドル、クエリ容易 |
| 通信 | hooks→daemon: HTTP POST、daemon→UI: WebSocket | fire-and-forget vs リアルタイム push |
| 認証 | `claude -p` subprocess で Claude Code 認証流用 | 追加キー不要 |
| Visual 方向性 | ピクセル RPG（Stardew 系） | キャラクター愛着優先（Q9） |
| Daemon ライフサイクル | Lazy 起動、30 分アイドルで停止 | リソース節約 + シームレス UX |
| Daemon ポート | 5757（config 変更可） | — |
| プロジェクト判定 | git root + `.claude-loom/project.json` marker | 自動 + 明示の hybrid |

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

---

## 変更履歴

- 2026-04-26: 初版作成（ブレインストーミング Q3-Q12 + §1-§4 設計合意を反映）
- 2026-04-26: §3.4-3.6（設定ファイル / セキュリティ / WebSocket スキーマ）、§6.8-6.10（PLAN.md フォーマット / project.json / config.json）、§9.2-9.3（install/uninstall 詳細）、§13 拡充、§14 追加ドキュメント追記
- 2026-04-26: §3.3（PM session の PJ 非依存モデル明記）、§6.2（sessions.project_id を NULL 許容に変更）、§6.7（PM session の project 判定例外を追記）。SCREEN_REQUIREMENTS と整合：プロジェクト切替で Room/Gantt 連動、PM キャラは全 Room に常時表示
- 2026-04-26: §3.7 新節（プロジェクトライフサイクルと adopt 戦略：init/adopt/maintain の 3 段階、loom-managed マーカー仕様、PM の全ドキュメント保守スコープ）、§4.2.1 PM 責務に「ライフサイクル管理」「全ドキュメント保守」追加、§6.7 に init/adopt 分岐追記、§9.1 templates/ に CLAUDE.md.template / README.md.template / SPEC.md.template 追加
- 2026-04-26: §3.6.1 追加 + §9.1 skills/ 注記更新（M0.5 で skill 前倒し shipping 決定）
- 2026-04-27: §4.1 ロール一覧 + §4.2.3/4.2.4 reviewer mode 分岐 + §4.3 review_mode pool 説明 + §5 workflow Step [4]/[5] mode 分岐対応（M0.6 = single reviewer default）
- 2026-04-27: §6.9 project.json schema に rules.review_mode フィールド追加（M0.6）
