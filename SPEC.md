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

trigger は **dual path**:
- **primary**: Claude Code の `SessionStart` hook 経由 (loom PJ で session 開始した瞬間に発火、retro 2026-05-06-002 F-USER-003 で正規化)
- **secondary**: 7 種 slash command（`/loom-pm`, `/loom-spec`, `/loom-go`, `/loom-retro`, `/loom-status`, `/loom-worktree`, `/loom-mode`）の markdown body bash invoke (補助 path、Claude execution priority に依存して確率的に発火)

1. session 開始時、`SessionStart` hook (`hooks/session_start.sh`) が cwd の `.claude-loom/` 存在を gate check (非 loom PJ は silent skip)
2. gate pass なら `hooks/loom-launch-ui.sh` を background fire-and-forget で invoke (session_start を block しない、fail-silent)
3. launch hook が `localhost:5757/health` を叩く
4. 無応答なら daemon を `nohup env LOOM_ENTRY=lazy-launch node ~/.claude-loom/daemon.js &` で起動（cold start）。PID ファイル (`~/.claude-loom/daemon.pid`) は debug breadcrumb として記録のみ、lock semantics は `/mode` endpoint が SSoT (§3.2.1)
5. **cold start 時のみ** `open http://localhost:5757` でブラウザを開く（既起動時は health-check のみで browser open せず、`xdg-open` 系のタブ氾濫を回避）
6. **headless 環境では browser open を skip し URL を terminal に出力**。検出条件: `$SSH_CONNECTION` セット / Linux で `$DISPLAY` 空 / `open`・`xdg-open`・`start` のいずれも不在。`LOOM_NO_UI=1` 環境変数で強制 skip 可能
7. daemon は 30 分イベント無しでセルフシャットダウン
8. 明示停止は `/loom-stop`、状態確認は `/loom-status`

**SessionStart hook 正規化の経緯 (retro 2026-05-06-002 F-USER-003)**: M0.11.5 trinity 設計時は slash command markdown body の bash invoke を primary trigger としたが、Claude execution priority に依存して確率的に発火せず、loom PJ 開始時の core promise (lazy daemon auto-launch → UI serve) が確実に機能しない silent failure を起こしていた (M0.11.5 retro F-USER-001 hypothesis 1 root cause)。SessionStart hook を primary trigger に正規化することで「loom PJ で session 開始した瞬間に必ず UI が立ち上がる」を guarantee 可能化。slash command markdown 経由の invoke は補助 path として残置 (multiple trigger redundancy)。

**`/loom` の役割**: daemon URL 表示 + clipboard コピー（user が「もう 1 タブ欲しい」時の救済路、cold-start-only open ポリシーを補完する dual path）。

**永続 opt-out**: `<project>/.claude-loom/project-prefs.json` の `ui.auto_launch: false` で PJ 単位で auto-launch 無効化。`LOOM_NO_UI=1` は session 単位の緊急上書き、`LOOM_NO_AUTO_UI=1` は session_start hook 経由の auto-launch のみ無効化 (slash command 経由は許可、CI / headless 環境用)。

**dev mode 切替**: `LOOM_DEV_MODE=1` で dev mode 起動（static serving skip、Vite :5173 を UI 提供元として想定）。`pnpm --filter @claude-loom/daemon dev` script は本 env var を auto-inject。lazy launch path は本 env var 未設定 (prod mode) が default。詳細は §3.2.2。

**起動 entry tag**: `LOOM_ENTRY` env var で起動経路を識別。値: `lazy-launch` / `pnpm-dev` / `manual` (default)。`/mode` endpoint で expose（§3.2.1）、競合 detection 時の diagnostic message に活用。

### 3.2.1 Daemon mode と `/mode` endpoint（M0.X-startup-recovery で codify）

**mode 判定の SSoT は daemon process 自身**。起動時に `process.env.LOOM_DEV_MODE` の有無で `dev` / `prod` mode を固定し、`/mode` endpoint が canonical source of truth として外部に expose する。

**`/mode` endpoint の応答 shape**:

```json
GET /mode
{
  "mode": "dev" | "prod",
  "entry": "lazy-launch" | "pnpm-dev" | "manual",
  "version": "0.1.0",
  "started_at": "2026-05-06T15:46:00Z",
  "pid": 74382,
  "ui_serving": false
}
```

`ui_serving` は **prod mode かつ ui/dist 存在時のみ true**。`mode=dev` では常に false (Vite が UI を担うため、daemon は API のみ提供)。

**PID file (`~/.claude-loom/daemon.pid`) の位置付け**: debug breadcrumb として残置（user が `kill $(cat daemon.pid)` で daemon を救済停止する path を保持）。**decision logic では使用せず**、daemon の生死判定は `/health` 応答、mode 判定は `/mode` 応答が SSoT。

**競合 detection 規約**:

- `loom-launch-ui.sh` (lazy launch path)：`/health` 応答あり → `/mode` で既存 daemon の mode を probe → mode に応じて分岐 (§3.2.2)
- `pnpm --filter @claude-loom/daemon dev` (dev path)：tsx watch 起動前に pre-flight script が `/health` + `/mode` を probe → 既存 daemon 検出時は明確 diagnostic 出して exit
- 両 entry point ともに OS の port bind (EADDRINUSE) を atomic lock として併用

**rationale**: sidecar file (PID file + JSON state) を SSoT とすると race condition / stale file / 2-writer の edge case が構造的に発生する。daemon process 自身を SSoT にすることで、OS の port allocation atomic semantics + endpoint 応答の生死で edge case を構造的に消去。partial implementation pattern (F-USER-007/008 と同 class) の再発防止としても機能。

### 3.2.2 dev mode と prod mode の役割分担

| | **dev mode** (`pnpm dev`) | **prod mode** (lazy launch) |
|---|---|---|
| trigger | `pnpm --filter @claude-loom/daemon dev` が `LOOM_DEV_MODE=1` + `LOOM_ENTRY=pnpm-dev` を auto-inject | `loom-launch-ui.sh` が `LOOM_ENTRY=lazy-launch` のみ inject (env 無し = prod default) |
| static serving | **skip** (ui/dist が build 済でも無視) | **serve** (ui/dist 存在時のみ `@fastify/static` register) |
| UI 提供元 | Vite (:5173) + HMR | daemon (:5757) static |
| API | daemon (:5757) | daemon (:5757) |
| user の access URL | `http://127.0.0.1:5173` | `http://127.0.0.1:5757` |
| use case | claude-loom 自身の UI 開発 | end-user による消費 |

**static serving 判定 logic** (server.ts):

```ts
const isDevMode = !!process.env.LOOM_DEV_MODE;
const shouldServeStatic = !isDevMode && existsSync(uiDistPath);
```

`NODE_ENV === "production"` 依存は deprecate。`LOOM_DEV_MODE` の有無で判定する mental model に統一（"build artifact 存在 + 明示 dev override なし = serve" という直感的 rule）。

**dev daemon 検出時の lazy launch 挙動** (loom-launch-ui.sh):

1. `/health` OK + `/mode` 応答が `mode=dev` を検出
2. Vite (:5173) の health-check 実施
3. Vite 応答あり → `http://127.0.0.1:5173` を browser open（dev mode UI に redirect）
4. Vite 応答なし → warning log + URL stdout のみ（user が手動で起動する path 残置）

**prod daemon 検出時の `pnpm dev` 挙動** (pre-flight script):

1. tsx watch 起動前に `/health` + `/mode` probe
2. `mode=prod` 検出 → ERROR 出して exit:
   ```
   ERROR: production daemon already running (PID=<pid>, started by lazy launch).
       To switch to dev mode:
         → kill <pid> and run 'pnpm dev' again, OR
         → set LOOM_NO_AUTO_UI=1 in your shell to disable lazy launch
   ```
3. 既存 prod daemon が live な間は dev daemon を起動させない（port bind 競合で silent zombie 化することを構造的に防止）

**rationale**: dev / prod の役割分担を明文化することで、「lazy launch path で env 注入忘れ → static skip」のような partial implementation を構造的に防止。判定ロジックを `LOOM_DEV_MODE` 一本に集約することで、SSoT が明確化し、test fixture も `process.env.LOOM_DEV_MODE` の mutate のみで済む。

### 3.2.3 Boot health-check polling（retro 2026-05-06-003 F-pj-002 由来、Bug A hotfix で codify）

`hooks/loom-launch-ui.sh` の `start_daemon()` 関数は、`nohup` で daemon を launch した後 **port bind 成功を verify してから exit 0 を返す**。verify 失敗 (timeout / EADDRINUSE / module crash 等) の場合 exit 1 → main() で `open_browser` 呼ばれない。

**polling 仕様**:

| 項目 | default 値 | 備考 |
|---|---|---|
| max attempts | 5 | env override `LOOM_DAEMON_BOOT_MAX_ATTEMPTS` で変更可 |
| attempt interval | 0.5 秒 | sleep 0.5 で fixed (本 milestone scope 外、Phase 2 で exponential backoff 検討) |
| max wait | 2.5 秒 (default) | max_attempts × interval |
| probe target | `${DAEMON_URL}/health` | `LOOM_DAEMON_URL` env で URL override 可 |
| probe command | `curl -sf --max-time 1 "$DAEMON_URL/health"` | timeout 1 秒 |

**verify 失敗時 log 形式**:

```
[loom-launch-ui] WARN: Daemon launched (PID=<pid>) but failed to respond at <URL> within <max_attempts/2>s
[loom-launch-ui] WARN: Possible causes: EADDRINUSE (port already bound by another process), module crash, or slow init
```

**rationale**: `nohup` 成功 ≠ port bind 成功。EADDRINUSE / module crash で即死した daemon に対して open_browser が呼ばれる false positive を構造的に防止 (Bug A 修正、retro 2026-05-06-003)。F-USER-007/008 と同 class の partial implementation を再発させない。

**実装 trace**: `hooks/loom-launch-ui.sh` `start_daemon()`、test coverage は `tests/loom_launch_ui_bug_a_test.sh` (3 scenario)、REQ trace は `tests/REQUIREMENTS.md` REQ-055。

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
- `loom-review`：single + trio strategy の review skill (single = 1 multi-aspect、trio = 3 parallel aspect specialists)、旧 `loom-review-trio` skill は 2026-05 で本 skill に統合済
- `templates/settings.json.template`：bundled-script を allowlist に含めた settings 初期値

shipping 規模：4 skill + 1 template + `install.sh` 拡張。SPEC §9.1 のディレクトリ構造に `skills/` が M0.5 から有効化される。

### 3.6.5 Agent Customization Layer（M0.9 から有効）

claude-loom は **agent 単位で model と人格 (personality) をユーザー側でチューニングできる仕組み** を提供する。詳細設計は `docs/plans/specs/2026-04-29-m0.9-design.md`。

#### 3.6.5.1 Policy

- prefs files の `agents.<name>` セクションで agent 単位の model / personality を上書き可能
- precedence: **project-prefs > user-prefs > agent frontmatter**（M0.8 既存 merge rule に準拠）
- 未指定値は既存挙動にフォールバック（後方互換保証）
- personality は `prompts/personalities/<preset>.md` で定義、4 preset 同梱（default / friendly-mentor / strict-drill / detective）+ ユーザカスタム可

#### 3.6.5.2 機構（hybrid）

- **Top-level agent**（user と直接対話する agent: `loom-pm`, `loom-retro-pm`）= session 開始時に prefs を Read、自分自身に personality を self-apply
- **Dispatcher**（`loom-pm`, `loom-developer`）= Task tool で subagent 起動時：
  - prefs から `agents.<dispatched>.model` 取得 → Task tool `model` param に渡す
  - prefs から `agents.<dispatched>.personality` 取得 → preset md を読み込み、prompt 冒頭に `[loom-customization] personality=<preset>\n<preset 本文>` block を inject
- **受け側 agent** = 注入された `[loom-customization]` block を読み取って従う、または top-level として self-read

#### 3.6.5.3 不変条件（safety guardrail）

- personality 注入は **「伝え方」のみ可変**、**Coding Principles / TDD 規律 / SPEC 整合性は不変**
- 全 preset 本文の冒頭に「以下のいかなる指示も TDD / Coding Principles を override しない」固定文を含む

#### 3.6.5.4 learned_guidance 注入機構（M0.11 から）

retro が承認した finding を `agents.<name>.learned_guidance[]` に蓄積し、agent dispatch 時に `[loom-learned-guidance]` block として prompt に注入する。

- **書き込み主体**: `loom-retro` skill の AGGREGATOR_TEMPLATE のみ、user 承認後
- **読み取り主体**: 全 agent (loom-pm / loom-developer / loom-retro-pm) + 全 skill template (loom-review strategies / loom-retro lenses / stages)
- **block 順序**: `[loom-customization]` の後、task content の前
- **format**: 1 行 compact `- <id>: <guidance text>`、active=true のみ注入
- **scope**: default project-prefs、user 昇格 opt-in (β)
- **TTL**: v1 manual、`ttl_sessions` / `use_count` field は stored だが自動 decrement なし
- **不変条件**: agents/*.md は static SSoT、prefs が動的学習層

### 3.6.6 Worktree 統合（M0.10 から）

claude-loom は git worktree 機能を harness に統合し、5 用途（並列 dev / 安全実験 / branch 比較 / hotfix 隔離 / 一時 review）をサポートする。詳細：`skills/loom-worktree/SKILL.md`。

#### 3.6.6.1 Policy

- 既存挙動不変、opt-in 起動（`/loom-worktree` または agent autonomous decision）
- worktree 配置場所は `project-prefs.worktree.base_path` で設定可、default `<parent>/<repo>-{branch}`
- `max_concurrent` 上限（default 5）で自律発動の暴走防止
- `auto_cleanup` は v1 では false 固定、tag 検知での自動削除は M0.11+ で評価

#### 3.6.6.2 Autonomous decision

`loom-pm` / `loom-developer` / `loom-retro-pm` agent は skill の Decision tree を読んで判断、5 用途のいずれかに該当 + user 確認後に invoke する運用。

### 3.6.7 Coexistence Mode（M0.12 から）

claude-loom は既存 PJ への **段階的 adoption** を支援するため、機能 ON/OFF を mode で制御する。

#### 3.6.7.1 3 modes

| mode | enabled_features default | use case |
|---|---|---|
| `full` (default) | `["all"]` 全機能 ON | greenfield、claude-loom メインで使う |
| `coexist` | `["core"]` のみ | 既存 setup あるが loom-* 一部試したい |
| `custom` | user 明示指定 | 細かく制御したい power user |

#### 3.6.7.2 5 feature groups

- **core**: base agents/skills/commands（常時 ON、disable 不可）
- **retro**: retro architecture (lens / counter-arguer / aggregator / learned_guidance)
- **customization**: personality preset + Customization Layer 注入
- **worktree**: /loom-worktree + autonomous worktree decision
- **native-skills**: loom-write-plan + loom-debug

`enabled_features` の `"all"` shorthand は全 group ON 扱い。

#### 3.6.7.3 Runtime gate

install.sh は不変、loom-* は常時 install。Mode 制御は **runtime gate** で実現：dispatcher 3 体 (PM / dev / retro-pm) が project.json を read、`enabled_features` に該当 group が含まれない場合は該当機能を skip。Receiver agent (reviewer / retro lens) は mode 不要 — dispatcher が gate する。

### 3.6.8 Process Discipline（M0.13 から）

claude-loom の PM / dev agent prompt に組み込む 5 項目の workflow discipline：

#### 3.6.8.1 Parallel dispatch self-verify

PM が「parallel batch」と plan で宣言した task を dispatch する場合、**同 message 内に複数 Agent invocation を含めること**。1 message = 1 Agent invocation = sequential dispatch であり、parallel ではない。post-dispatch で self-check を行い、宣言と実装が乖離していたら process-axis finding として retro pending state に記録。

**side-effect note (retro 2026-05-06-003 F-proc-002 由来)**: parallel dispatch では各 subagent の `SessionStart` hook が同時多重発火し、`POST /event` を daemon に集中送信する。daemon が一時的に busy になり `/health` probe timeout → false cold-start trigger を引き起こす可能性あり (Bug A symptom chain の trigger 部分)。Bug A hotfix (SPEC §3.2.3 Boot health-check polling) で start_daemon 側の defense は入ったが、daemon load 根本対策は M0.X-hook-ingest-recovery (Layer 3 POST /event spam fix) scope。parallel batch を multiple subagent で宣言する場面では本 side-effect を念頭に置く。

#### 3.6.8.2 Task tool fallback degraded mode

session 開始時に Task tool 利用可否を check、利用不能なら user に「**degraded mode で sequential self-review に switch**」と明示宣言。silent fallback 禁止。

#### 3.6.8.3 Inline spec edit

PM の spec phase で brainstorm Q&A 中に design spec を inline 編集、Q&A の答えがそのまま section 内容に反映される運用。formal「spec 書き出し」step を圧縮、brainstorm → spec → plan の中間段階を 1 step 削減。

#### 3.6.8.4 Doc batch parallelism

doc 5 file 以上の更新が必要な場合、複数 subagent 並列 dispatch（同 message 内に複数 Agent invocation）。secretary agent 化（loom-doc-keeper 等）は将来の M0.13.x or M0.14 で評価。

#### 3.6.8.5 Reviewer verdict 保存

retro session 開始時、`loom-retro-pm` agent が **直前 milestone の reviewer dispatch evidence を独立 file `<project>/.claude-loom/retro/<retro_id>/verdict_evidence.json` に lazy build + write**。「review skip」と「指摘ゼロ pass」の判別を可能化。詳細規約は §3.9.10 + §6.9.5（zod 完全 schema、M2.1 から）参照。M0.13 で codify された旧設計（`pending.json` 内 field）は M2.1 で refactor、独立 file + zod schema 化に移行済。

#### 3.6.8.6 TDD red commit 履歴 enforcement（2026-05-04 retro F-pj-002 で default inversion）

**M0.13 codification (legacy)**: dev は milestone 内で test 拡張 commit が feat 実装 commit より時系列で **前** にあることを保証。実装直前に `git log` で確認、無ければ「process-tdd-violation」self-finding 生成。

**Strategy b (PM 統合 commit) 採用時の commit 分割規約 (M3.1 retro 2026-05-03-001 proc-001 由来 → 2026-05-04-001 retro F-pj-002 で default inversion)**：

retro 2026-05-03-001 で「2-commit 分割 (RED 単独 → GREEN) を default 推奨、annotation path は例外」と codify されたが、M3.2 / M4 Stage 2 / M4 Stage 3 / M5 Stage 1 / M5 Stage 2 の **5 連続 unified annotation 採用** で実用が逆転。M5 closure 時点で **default を inversion**：

- **default = unified-with-annotation**: PM は 1 task = 1 統合 commit、commit message に `[RED+GREEN unified]` annotation 必須付与（git log で grep 検出可能化）。file overlap が常態化する parallel batch / Strategy b で実用的
- **2-commit 分割 = strict mode**: file が完全 disjoint (test/* と src/* が衝突なし、かつ複数 task 間で file 共有なし) な場合のみ採用可能。RED + GREEN を 2 commit に分割、git history で RED 単独 commit 存在を verify 可能化
- **TDD audit 性の維持**: dev は test-first で書き final report に `tdd_red_confirmed: true` + RED test fail output 抜粋を明記、reviewer は test/* と src/* の diff を時系列逆並びで cross-check 可能 (Strategy a と同等の audit 性)

**Strategy a sub-variant: 2-commit RED→GREEN+REFACTOR**（2026-05-06 retro F-proc-002 由来）：

Strategy a (dev 自身 commit) で 3-commit (RED → GREEN → REFACTOR) が strict default だが、以下の場合の **2-commit 統合 (RED → GREEN+REFACTOR)** も acceptable とする：

- **REFACTOR 規模が trivial**: 数行の rename / dead code 削除 / lint fix 等、独立 commit 化で git log を逆に汚すレベル
- **REFACTOR が GREEN と論理的同一 unit**: GREEN 実装直後の minor cleanup で、独立 commit value が低い (revert 単位として分離する必要なし)
- **TDD audit 性は維持**: RED commit は単独で存在、GREEN+REFACTOR commit message に `[GREEN+REFACTOR squashed]` annotation 必須付与 (git log で grep 検出可能化、reviewer cross-check 可能)

**3-commit strict mode** は以下の場合に必須：
- REFACTOR が大規模 (50+ 行 / 複数 file 触る / SSoT cross-check rule 違反検出 等)
- revert 単位として REFACTOR を独立確保したい case
- reviewer が「RED → GREEN → REFACTOR の各段階を独立 commit で audit したい」と指定

**rationale**: M0.11.5 t4 dev (commit 8087071) で GREEN+REFACTOR 1 commit 統合が偶発的に発生、TDD red 順序遵守は維持されとるが SPEC 上 acceptable / strict 不明確だった点を本 sub-variant で codify。実害ゼロ + 軽微 REFACTOR で 3-commit chain を強要しない柔軟性確保。

#### 3.6.8.7 Reviewer dispatch triple path（2026-05-04 retro F-proc-001 由来 → 2026-05-06 retro F-proc-003 で **path C default 反転**）

dev が reviewer dispatch を実施する Step 9 に **3 つの path** を 1st-class option として定義。**default = path C** (2026-05-06 反転、累積 evidence: M0.11.5 6/6 dispatch 全部 path C で pass、Task tool 一貫 deferred 環境での運用 fit)：

- **path C — self-review with explicit safety checklist (default、2026-05-06 反転)**: dev が Step 9 開始時に **必ず Task tool 利用可能性 probe**（`ToolSearch select:Task` 空結果 → degraded mode 自動 enter、Strategy b unified annotation default 反転と同 pattern）。Task tool deferred 環境での safety checklist 経由 self-review が default：
  1. final report に `self_review: true` + `task_tool_deferred: <bool>` 明示
  2. 4 観点 self-checklist 必須記載 (code 観点 / security 観点 / test 観点 / SPEC §3.6.10 SSoT cross-check 観点)
  3. 各観点で 3 行以上の reasoning + 該当 file:line 参照
  4. PM が follow-up `loom-review` skill dispatch を後で実施する option を残す (path C completion ≠ formal review、interim safety net)
- **path A — same-session iterate (opt-in、Task tool 利用可能時)**: probe pass + fix scope clear AND context budget 余裕あり → 同 session 内で fix → re-run tests → re-submit
- **path B — PM follow-up handoff**: fix scope unclear OR context budget tight → final report に `handoff_required: true + reasoning + recommended next step + 残 findings 全文` 明記
- **silent self-review 禁止**: path A/B/C のいずれかを final report で必ず宣言

詳細実装: `agents/loom-developer.md` Step 9、`agents/loom-pm.md` 受領規律。

**反転 rationale (2026-05-06 retro F-proc-003)**: 旧 default = path A (Task tool dispatch) は Task tool 利用可能性を前提とするが、本 environment (Claude Agent SDK) は Task tool 一貫 deferred 状態が constant condition、agent prompt と現実が乖離した状態で毎回 path C を verbal で fallback 宣言する運用負荷が累積。M0.11.5 で 6/6 dispatch 全部 path C で pass という evidence + 2 retro 連続 degraded mode persistence (2026-05-05 + 2026-05-06) の累積で default 反転条件成立 (M0.14 Strategy b 反転と同 pattern)。

#### 3.6.8.8 Dependency audit on default change（2026-05-06 retro F-USER-002 由来）

milestone scope に「**default 値変更**」（auto_launch default true 化、review_mode default 反転、Strategy a/b default 反転 等）を含む場合、PM は milestone closure 前に **依存 install / config / runtime pipeline 全 step verify** を必須 check として実施。

**Trigger**: 以下のいずれかが milestone 内 task に含まれる：
- 既存 SPEC default 値の反転（`auto_launch: false → true`、`review_mode: trio → single` 等）
- 新規 runtime path の active 化（lazy launch、auto-apply、auto-prune 等）
- 新規 hook / symlink / settings.json field の bootstrap 必須化

**Audit checklist** (closure 前に PM が機械的に走らせる)：
1. **install path**: `bash install.sh` を fresh sandbox で実行、新 default が機能する前提 file（symlink / dir / config）が全て配置されるか確認
2. **config path**: `templates/*.template` + `~/.claude-loom/user-prefs.json` + `<project>/.claude-loom/project-prefs.json` の **3 source** に新 default が反映されとるか jq query で確認
3. **runtime path**: 新 default が活性化する code path（hook / agent prompt / daemon entry）が install 後の env で actual に動作するか smoke check（手動 or `loom-ui-smoke` skill 経由）
4. **rollback path**: user が opt-out する手段（env 変数 / config field / `LOOM_NO_*` flag）が SSoT に明記されとるか確認

**rationale**: M0.11.5 で `auto_launch: false → true` 反転と並行して `hooks/loom-launch-ui.sh` 経由 daemon 自動起動を default 化したが、`install.sh` に daemon symlink bootstrap step 不在が milestone closure 後に retro F-USER-001 として critical surface 化した（2026-05-06-001）。default 変更は前提 pipeline 全 step が揃って初めて成立、step の partial implementation は user 環境で silent failure を生む構造的 risk。本 audit は M0.11.5 と同 pattern の class を構造的に塞ぐ。

**実装**: `agents/loom-pm.md` の milestone closure workflow に audit step として組込、F-USER-002 codify。

#### 3.6.8.9 PM Auto-Spec Entry（M0.11.6 から）

**方針**: ハイブリッド検知（C 案）— PM 起動時に context を評価し、高信頼なら 1 問確認後 spec phase 自動突入、中信頼なら短い分岐質問、低信頼なら従来の idle PM 動作。`/loom-pm` 起動のたびに ceremony を強制せず、context から intent が読める場合は自動 entry する。

**trinity 位置付け**: M0.11.5（`/loom-pm` 起動時 UI auto-launch、§3.2）→ **本章 M0.11.6**（spec phase auto-entry）→ M0.11.7（`/loom-go` impl phase auto-entry）の 3 本柱で「context から intent 読めるなら ceremony 強制せえ」哲学を段階的に実装。

**検知ロジック 2 軸（AND 条件で高信頼判定）**:

- **軸 1 — 直近 user message scan**: spec 系 keyword を検出。impl 系（「commit」「PR」「deploy」等）ではなく spec 系（「実装したい」「機能追加」「bug」「fix」「PLAN」「SPEC」「task」「設計」「要件」「新機能」「不具合」「改善したい」等、具体リストは t4 で確定）を含む message が直前に存在するか判定。
- **軸 2 — cwd state**: `SPEC.md` 存在 + `PLAN.md` 内に `status: todo` の task が残存 → 既存 PJ context あり。どちらの軸も Bash tool（`ls`, `grep`, `git log --oneline -5` 等）で probe 可能。

**AND 条件採用 rationale**: OR 条件にすると誤爆（false-positive）が増加し、user が望まない spec 突入が多発する。高信頼判定は **両軸が揃う** ことを必須とする。

**3 信頼レベルと動作**:

- **① 高信頼（intent + state 両方揃い）**: 「○○ の spec phase 入りますで、ええか？」1 問確認 → yes なら即 spec phase 突入（`/loom-spec` と同等の処理を invoke）
- **② 中信頼（いずれか片方のみ）**: 「新規 PJ spec / 既存 plan レビュー / status 確認」3 択分岐質問 → user の選択に応じて処理
- **③ 低信頼（intent も state も無し）**: 従来通り idle PM として user 入力待ち。無用な質問も発しない。

**`/loom-spec` の位置付け（残置 + override path）**:

`/loom-spec` slash command は **明示 override / re-entry path として存続**する。削除・deprecated 化しない。用途：
- context 圧縮後の復帰（PM が auto-entry を見送った場合の手動 trigger）
- 別案件の spec し直し（auto-entry が誤判定した場合の override）
- low-confidence PM で明示的に spec phase を開始したい場合
- M0.11.5 SPEC §3.2 の `/loom-spec` trigger list も残置

**誤爆抑制策まとめ**:

1. 高信頼判定は AND 条件（OR 禁止）
2. 中信頼以下では **必ず 1 問確認**を挟む（silent 突入禁止）
3. retro process-axis lens で false-positive rate を継続観察、閾値超過で keyword list 見直し
4. user が意図していない spec entry と気づいた場合 `/loom-spec` で明示 re-entry 可能

**degraded mode との整合（§3.9.13 probe との連携）**:

PM auto-spec entry の context 評価は Bash tool で `git log --oneline -5`, `grep -c "status: todo" PLAN.md`, `ls SPEC.md` 等を probe する形で実現。Task tool 不在時（degraded mode）も Bash tool で代替評価可能、**本機構は degraded mode でも機能する設計**とする。degraded mode での spec entry は sequential self-review（§3.6.8.7 path C）と組み合わせて運用。

**SSoT 宣言**: 本章（§3.6.8.9）が PM Auto-Spec Entry 機能の SSoT。`agents/loom-pm.md`（t3 担当）+ `commands/loom-pm.md` は本章を参照し実装。他 doc（CLAUDE.md / PLAN.md）からの参照は本章 section 番号を引用。

#### 3.6.8.10 PM Auto-Go Entry（M0.11.7 から）

**方針**: ハイブリッド検知（C 案）— spec phase 完了後、user の直近 message に impl intent を検出した場合、1 問確認後 impl phase（`/loom-go` 相当）に自動突入。曖昧なら短い分岐質問、低信頼なら従来 PM idle。§3.6.8.9 PM Auto-Spec Entry の**論理的延長**として、spec → impl の 2 段階 auto flow を完成させる。

**trinity 完成**: §3.2（M0.11.5、UI auto-launch）→ §3.6.8.9（M0.11.6、spec phase auto-entry）→ **本章 §3.6.8.10（M0.11.7、impl phase auto-entry）**の 3 本柱で「context から intent 読めるなら ceremony 強制せえ」哲学の ceremony reduction trinity が SSoT として整う。

**検知ロジック 3 軸（AND 条件で高信頼判定）**:

- **軸 1 — PLAN.md state 変化**: 直近 N session で PLAN に新規 task 追加 または 既存 task に `status: todo` が残存 → impl 作業が残っている証拠（Bash probe: `grep -c "status: todo" PLAN.md`）
- **軸 2 — spec phase 完了 marker**: SPEC.md 編集 commit + PLAN.md 編集 commit が直近 git log に存在 → spec が終わって impl 待ちの状態（Bash probe: `git log --oneline -10 | grep -E "SPEC|PLAN|spec|docs"`）
- **軸 3 — user message intent**: 「実装」「進めて」「go」「dispatch」「task 振って」「開発して」「コーディング」「始めて」等の impl intent keyword を直近 user message が含む（§3.6.8.9 の spec keyword list と分離、具体 list は t4 で確定）

**AND 条件採用 rationale**: 3 軸全 AND は §3.6.8.9 の 2 軸 AND より厳しい条件。「PLAN 残あり + user が雑談してるだけ」の誤発火を spec phase 完了 marker（軸 2）が防ぐ。OR 条件や 2 軸 AND では false-positive が増加し user が望まない impl 突入が多発するため採用しない。

**3 信頼レベルと動作**:

- **① 高信頼（3 軸全部揃い）**: 「○○ task の impl phase 入りますで、ええか？」1 問確認 → yes なら即 impl phase 突入（`/loom-go` と同等の処理を invoke）
- **② 中信頼（2 軸揃い）**: 「impl 開始 / spec 修正 / status 確認」3 択分岐質問 → user の選択に応じて処理
- **③ 低信頼（1 軸以下）**: 従来通り PM idle として user 入力待ち。無用な質問も発しない。

**`/loom-go` の位置付け（残置 + override path）**:

`/loom-go` slash command は **明示 override / re-entry path として存続**する。削除・deprecated 化しない。用途：
- context 圧縮後の復帰（PM が auto-entry を見送った場合の手動 trigger）
- 別案件の impl やり直し（auto-entry が誤判定した場合の override）
- 低信頼 PM で明示的に impl phase を開始したい場合
- M0.11.5 SPEC §3.2 の `/loom-go` trigger list にも残置

**§3.6.8.9 との関係（sibling chapter / 検知ロジックパターン共有）**:

本章は §3.6.8.9 PM Auto-Spec Entry の sibling chapter。検知ロジックパターン（3 信頼レベル / AND 条件 / override 残置 / false-positive 抑制）は §3.6.8.9 と同形式を採用し重複記述を避ける。ロジック実装は agent prompt 層（t3）で §3.6.8.9 の Session Start Hook を拡張統合する形で実現。

**誤爆抑制策まとめ**:

1. 高信頼判定は 3 軸全 AND（§3.6.8.9 の 2 軸より厳格）
2. 中信頼以下では **必ず 1 問確認**を挟む（silent 突入禁止）
3. retro process-axis lens で false-positive rate を継続観察、閾値超過で keyword list / 軸定義見直し
4. user が意図していない impl entry と気づいた場合 `/loom-go` で明示 re-entry 可能

**degraded mode との整合（§3.9.13 probe との連携）**:

PM auto-go entry の context 評価は Bash tool で `grep -c "status: todo" PLAN.md`, `git log --oneline -10` 等を probe する形で実現。Task tool 不在時（degraded mode）も Bash tool 単体で代替評価可能、**本機構は degraded mode でも機能する設計**とする。

**SSoT 宣言**: 本章（§3.6.8.10）が PM Auto-Go Entry 機能の SSoT。`agents/loom-pm.md`（t3 担当）は本章を参照し実装。他 doc（CLAUDE.md / PLAN.md）からの参照は本章 section 番号を引用。

#### 3.6.8.11 Post-tag hotfix protocol（retro 2026-05-06-003 F-pj-001 由来）

milestone tag 設置後に同 branch 上で発覚した bug への hotfix を **正規化された運用 pattern** として codify。precedent 2 連続:

- F-USER-007/008 hotfix (commit `c31a88e`、M0.11.5 tag 後) — symlink CLI guard + hooks SDK 仕様準拠
- Bug A hotfix (commit `91cdcbb`、M0.X-runtime-mode-recovery tag 後) — start_daemon port bind verify gap

**Protocol rules**:

1. **tag 移動禁止**: hotfix commit を milestone tag に取り込まず、tag は当該 milestone の closure marker として **不変** に保つ。git history を時系列線形に保ち、release tag semantics を破壊しない
2. **commit message annotation 必須**: hotfix commit message に `[post-tag-hotfix]` 文字列を含める (git log grep 検出可能化)。subject prefix or body どちらでも可、ただし grep で機械的 detect できる位置に配置
3. **同 branch 継続**: hotfix は milestone branch (`fix/m0.x-...`) に追加 commit、別 branch を切らない (PR review scope 統一)
4. **当該 milestone retro scope への必須 inclusion**: post-tag hotfix が発生した場合、当該 milestone retro 起動時の scope に **必ず含める** (retro-pm dispatch prompt の `## Scope` block + `## Milestone scope (N commits)` table に hotfix commit を明記)
5. **PR description note**: PR body の "## 修正内容" に "post-tag hotfix" subsection を追加、root cause + fix + precedent 参照を明記

**rationale**: post-tag hotfix を「process bug の繰り返し」と判定するか「正規化された pattern」と認めるかは retro でしか判断できない。本 protocol は precedent 2 連続を受けて後者と認め、構造的な codify で次回以降の運用 ambiguity を解消する。同時に、retro scope に必ず含めることで「tag 設置 = 完成」の illusion を構造的に解体し、Layer 2.5 (§10.4.1) との pair で trust recovery process を成立させる。

**SSoT 宣言**: 本章（§3.6.8.11）が post-tag hotfix protocol の SSoT。`agents/loom-pm.md` milestone closure workflow + `agents/loom-retro-pm.md` retro scope 定義は本章を参照する。

### 3.6.9 M3 UI Architecture（M3 から）

M3 milestone の核となる frontend 設計判断を SSoT として集約。spec phase 2026-05-02 で確定（design 分岐 α/β/γ + M3 分割判断の 4 件）。

#### 3.6.9.1 Phaser 4 React 内 mount pattern（α-1 確定）

- **採用**: 自前 `useEffect` + `useRef` mount（library 依存ゼロ）
- **lifecycle**: `useEffect(() => { gameRef.current = new Phaser.Game(config); return () => gameRef.current?.destroy() }, [])`
- **state bridge**: zustand subscribe + Phaser scene event は **agent state → sprite state の単方向 push が主**、双方向 OT は不要
- **HMR**: Vite HMR で scene 状態保持のため stable ref + `import.meta.hot.dispose` で `game.destroy()` 必須
- **却下案**: react-phaser-fiber（library 更新ペース遅）/ @phaserjs/react（ecosystem 例少ない）/ canvas 直書き（SPEC §12 Phaser 4 確定値を覆す）

#### 3.6.9.2 PLAN.md 双方向同期戦略（β-3 確定）

- **採用**: hybrid debounce + last-write-wins + `plan_conflict_detected` toast
- **debounce**: GUI 編集 500ms-1s で batch write、chokidar event も同 debounce で集約、race window を狭める
- **last-write-wins**: `mtime` 比較で新しい側採用、conflict 検知時は **新 toast event `plan_conflict_detected`** を push
- **data 救済**: GUI 側 change を localStorage に backup、user が手動 restore 可能
- **却下案**: pure last-write-wins（silent data loss）/ file lock + queue（lock manager 重）/ Yjs/Automerge OT（M3 で overkill、bundle 50-100KB 増）

#### 3.6.9.3 Gantt 実装方法（γ-3 確定）

- **採用**: 自前 SVG（`<rect>` bar + `<line>` grid + `<text>` label）
- **theme 統合**: tokens.css の CSS variable `var(--color-bar)` 等を SVG 直参照、3 theme (pop/dusk/night) 即反映
- **scope**: read-only bar + 行 click で Agent Detail navigate（edit / zoom / pan は M5 以降）
- **実装規模**: 200-400 LoC（library 依存ゼロ、bundle 増ゼロ）
- **却下案**: gantt-task-react（50KB 増 + theme bridge hack）/ frappe-gantt（React wrapper 自前 + TS 型不在）/ react-google-charts（external CDN 依存、SPEC §3.5 security model と相性悪）

#### 3.6.9.4 Toast event 拡張（M2 5 event → M3 6 event）

M2 で確定した 5 event に **`plan_conflict_detected`** を追加：

| # | event | 起源 | 意味 |
|---|---|---|---|
| 1 | `daemon_disconnected` | M2 | daemon 接続切断 |
| 2 | `daemon_reconnected` | M2 | daemon 再接続成功 |
| 3 | `consistency_finding_new` | M2 | doc 整合性 finding 検出（M4 で発火） |
| 4 | `subagent_failed` | M2 | subagent dispatch 失敗 |
| 5 | `project_added` | M2 | 新規 project 検出 |
| 6 | `plan_conflict_detected` | **M3** | PLAN.md 双方向同期で conflict 検知 |

§6.3 Event payload 仕様に payload 定義追加（schema は実装時 `daemon/src/events/types.ts` で確定）。

#### 3.6.9.5 frontend「自前 control」哲学

α (Phaser mount) + γ (Gantt) の 2 大判断で **library 依存最小化** を選択。理由 3 つ：

1. **claude-loom dogfood project のメンテ負荷最小化** — library breaking change で詰まらん
2. **frontend-design 委譲との相性最大化（M5）** — pixel art aesthetic を library override で hack するより、自前で control する方が直接的
3. **3 theme (pop/dusk/night) 統合** — tokens.css CSS variable 直参照が最も seamless

trade-off として実装 LoC は増えるが、claude-loom が成熟するにつれ各 component を独立 refactor / 入れ替え可能な状態を維持。

#### 3.6.9.6 M3 分割（3 段細分割）

M3 は scope 大（10 task = M2 同等規模 + 新技術 Phaser + 複雑 design 双方向同期）、proc-001 / proc-004 リスク低減のため **3 段細分割** を採用：

| sub-milestone | scope | task 数 | technical risk 軸 |
|---|---|---|---|
| **M3.0** Room View | Phaser mount + tile + sprite + 状態アニメ | 3 | 新技術 (Phaser) 投入、独立 milestone で retro 集中 |
| **M3.1** Plan + Gantt + sync + visual regression | Plan View 短期/長期 + 双方向同期 + Gantt + Playwright e2e baseline | 5 | 複雑 design (β-3 hybrid sync) + visual regression infra 初導入、独立 milestone で edge case finding |
| **M3.2** Detail views | Session List + Agent Detail + notes | 3 | CRUD polish、新技術/複雑 design は M3.0/M3.1 で扱い済 |

各 milestone closure 後に retro hook（M0.13 milestone retro 規約）、verdict_evidence (M2.1 整備済) の運用試験 3 回 = proc-003 hook 妥当性も並行検証。詳細 task は PLAN.md M3.0 / M3.1 / M3.2 セクション参照。

#### 3.6.9.7 Visual regression check 機構（M3.1 から、res-001 確定）

M3.0 mock-only test の構造的 hole（Phaser を完全 vi.mock、canvas pixel 描画 / sprite 位置 / アニメ未検証）を sprite 拡張前に塞ぐため、M3.1 で independent e2e infra を導入。retro 2026-05-02-002 res-001 由来、2026-05-02 spec phase で確定。

- **採用**: **Playwright e2e**
  - independent infra: 既存 vitest unit test に影響ゼロ（M3.0 13 test の green 状態保持）
  - WebGL 実 render: Phaser 4 の `Phaser.AUTO` → WebGL path を実 browser で検証可能
  - screenshot baseline built-in: `expect(page).toHaveScreenshot()` で plugin 不要、3 theme (pop/dusk/night) snapshot を 3 ファイルで管理可能
  - M3.1 双方向同期 e2e との親和性: chokidar + GUI 編集 + 500ms debounce + `plan_conflict_detected` toast の e2e fixture が同 infra で natural に書ける
  - M5 frontend-design 委譲時の baseline として継続価値: pixel art 確定後の visual regression baseline を Playwright snapshot で固定、frontend-design 後の breaking 検出に使える
- **却下案**:
  - `canvas` polyfill (node-canvas via jsdom): native build (cairo/pixman) 追加負債、WebGL 不可で `Phaser.AUTO` → CANVAS fallback 必要、`better-sqlite3` Node 25 workaround の轍（CLAUDE.md daemon note）
  - `@vitest/browser`: vitest 1.6 時点で experimental、stability risk、Playwright dependency も結局必要、CI 速度低下
- **M3.1 scope**: Playwright 導入 + Room View pop theme screenshot baseline 1 件確立 + CI workflow 統合のみ。test 大量化（dusk/night 拡張、双方向同期 e2e、Gantt e2e 等）は M3.2 以降に分配
- **dependency**: `@playwright/test` (`ui/package.json` devDependencies)、`ui/e2e/` dir、`pnpm --filter @claude-loom/ui e2e` script、CI workflow に並列 step 追加（vitest と独立 fail で原因切り分け）
- **frontend「自前 control」哲学整合**: §3.6.9.5 の library 依存最小化方針に対し、Playwright は「test infra」レイヤで application code には侵入せず、独立 infra として breaking risk を application 本体に伝播させない設計

### 3.6.10 SSoT cross-check rule（M3.1 retro 由来、2026-05-03 から）

#### 3.6.10.1 背景

M3.1 t3 で `daemon/src/events/types.ts` の `planChangeEventSchema.status` enum が `'in_progress'` だった一方、DB schema (drizzle / `daemon/src/db/schema.ts`) と plan.ts route の status は `'doing'` に統一されとった。**M0.X 系列で看過されとった SSoT enum drift** を、M3.1 t3 の reviewer が **偶然** high severity finding として発見・修正。SSoT 規約持つ project で SSoT 群 (DB schema / event schema / UI store / config) 間の **cross-check 機構が無い** 構造 gap を露呈した（retro 2026-05-03-001 finding pj-002）。

#### 3.6.10.2 Coding 原則: 文字列リテラル回避

backend / frontend 問わず、code 中の文字列リテラル（特に enum / status / type 値）を可能な限り **変数・定数・enum 経由** で比較・参照する。文字列直接比較ではなく **typed constant の比較** で保守性と SSoT 整合性を上げる方針。

- **理由**: 文字列直接記述は SSoT drift の温床、type system の保護を受けられず、refactor 時の検出が grep 頼みになる
- **具体例**:
  - ❌ `if (item.status === 'doing')` — 文字列直接
  - ✅ `if (item.status === PlanItemStatus.Doing)` — enum 参照
  - ✅ `import { planItemStatusEnum } from "../db/schema"` で primary SSoT を引っ張る

#### 3.6.10.3 SSoT cross-check rule

enum / schema / status 値を複数 file で共有する場合：

1. **primary SSoT file 明示**: 当該値の source of truth となる単一 file を define（例: enum ならば DB schema が SSoT、event schema は派生）
2. **派生 file は import 経由**: primary SSoT file から `import type` or `import { ... }` で参照し、派生定義禁止。型 export pattern (SPEC §12 「daemon が AppRouter / Drizzle schema type を export、frontend が import type ...」) を活用
3. **import 不可な場合は test cross-check**: `<a>` と `<b>` で同 enum を独立に持つ必然性ある場合（例: zod schema と TS const が別 layer で必要）、両者の値が一致することを assert する test を必ず追加。`tests/REQUIREMENTS.md` に該当 cross-check assertion を REQ 化

#### 3.6.10.4 適用対象

primary SSoT 候補（M3.1 retro 時点）:

| domain | primary SSoT | 派生 file 群 |
|---|---|---|
| plan_items status enum | `daemon/src/db/schema.ts` (Drizzle) | `daemon/src/events/types.ts` / `daemon/src/routes/plan.ts` / `ui/src/views/plan/*` / `ui/src/store/planConflict.ts` |
| TodoWrite status | `daemon/src/events/types.ts` (`todoChangeEventSchema`) | `ui/src/live/useTodoWrite.ts` / `ui/src/views/plan/PlanView.tsx` |
| toast event 種別 | `daemon/src/events/types.ts` (`loomEventSchema` discriminated union) | `ui/src/store/connection.ts` / `ui/src/notifications/toastBus.ts` |
| review_mode | `templates/claude-loom/project.json.template` (`rules.review_mode`) | `agents/loom-developer.md` / skills/loom-review/* |

#### 3.6.10.5 reviewer 観点への組込

`skills/loom-review/SKILL.md` の各 review template (single SINGLE_REVIEWER_PROMPT_BODY + trio CODE_REVIEWER_PROMPT) の review checklist に「文字列リテラル直接比較の検出 → constant/enum 抽出提案 (severity: medium 候補)」「派生 file の SSoT cross-check 確認」を追加。

#### 3.6.10.6 doc consistency checklist 連動

`docs/DOC_CONSISTENCY_CHECKLIST.md` に M3.1 retro 関連 section を追加し、enum / schema を持つ file を編集した時の派生 file cross-check 項目を明記する。

### 3.6.11 UI Smoke Test Skill（M0.11.3 から、retro 2026-05-04-001 F-proc-005 拡張）

#### 3.6.11.1 背景

retro 2026-05-04-001 で F-proc-005「t2 E2E verification gate effectiveness」を success record として記録、M5 t2 の bash + automated test 7-stage verification が 4 件 MVP-blocking bug を発見・修正した実例を codify。しかし**その verification layer は browser interactive を含まず**、Phase 1 MVP main 統合直後の Playwright MCP 経由 smoke test で **追加 4 件 critical bug**（Phaser 描画ゼロ / WS transform error / TodoWrite mock 残存 / Sidebar dead code）が発覚。「automated test green ≠ 画面が動く」gap を構造的に塞ぐ skill を新設。

#### 3.6.11.2 Skill purpose

**画面要件・機能要件・design から test 戦略を derive、Playwright MCP browser tool 経由で実機 verify、構造化 report を返す。** UI 開発時のみ必要、blanket mandate せん **suggest skill** category（§3.10.1 mandate vs suggest table）。

#### 3.6.11.3 4 stage pipeline (hybrid Option C)

| Stage | 方式 | output |
|---|---|---|
| **Stage 1: 戦略 derive** | AI prompt-driven (creative) | `docs/smoke-tests/<date>-<scope>/strategy.md` (route × expected behavior matrix) |
| **Stage 2: 実機 verify** | AI が SKILL.md 手順に従い Playwright MCP `browser_*` tool 駆動 (deterministic order) | `screenshots/<NN>-<route>.png` + `console.log` (各 route の error / warning capture) |
| **Stage 3: report 生成** | bundled script (`scripts/format-report.sh`、jq + bash) | `report.md` (REQ マッピング込み) + `findings.json` (machine-readable、JSON schema validate) |

#### 3.6.11.4 Output 階層構造

```
docs/smoke-tests/                              ← git-tracked (history of UI verification)
└── <YYYY-MM-DD>-<scope>/                     ← <date>-<scope>、scope = milestone tag or hotfix label
    ├── strategy.md                           ← Stage 1 derive 結果
    ├── report.md                             ← Stage 3 final report
    ├── screenshots/
    │   ├── 01-home.png                       ← <NN>-<route>.png
    │   ├── 02-plan.png
    │   └── ...
    ├── console.log                           ← 全 route 通しの error + warning collected
    └── findings.json                         ← machine-readable findings (failed assertion + REQ ref)
```

#### 3.6.11.5 Invocation pattern

3 pattern 全て support：

1. **`/loom-ui-smoke` slash command**: user 手動 ad-hoc smoke test
2. **`[loom-meta] suggest_skill=loom-ui-smoke` injection**: loom-developer / loom-pm が UI feature dispatch 時に skill 名注入、agent 自律判断で invoke
3. **自律 invoke (milestone closure default)**: loom-pm が `git tag -a m*-complete` 設置直後に skill 自動 invoke、F-proc-005 codify の 2 層 verification (bash E2E + browser smoke) 第 2 layer

#### 3.6.11.6 Scope parameter

```bash
/loom-ui-smoke              # default = full (全 route navigate + verify、screenshot 取得)
/loom-ui-smoke route:plan   # 単一 route のみ（部分 verify）
/loom-ui-smoke smoke-only   # screenshot 取らず console error / DOM check only (light mode、CI-friendly)
```

#### 3.6.11.7 dev server lifecycle (hybrid Option C)

skill 起動時に port 5757 (daemon) + 5173 (ui) listen 確認：

- **既起動**: 既存 dev session を流用 (user の `pnpm dev` 同居 friendly)
- **未起動 + `--auto-start` flag**: skill が `pnpm --filter @claude-loom/{daemon,ui} dev` を background 起動、smoke test 完了後に `lsof -tiTCP:<port> | xargs kill` で cleanup
- **未起動 + flag なし**: user に prompt「dev server 未起動、auto-start するか？」、yes で起動 / no で abort
- **graceful fallback**: ぴあぴあ port conflict 検出時は別 port で起動 retry or skill abort + 明確 error message

#### 3.6.11.8 Failure handling（responsibility separation）

skill は **読み取り専用 + report 生成のみ**、bug 発見時に fix dispatch せん（SRP 整合）：

- skill final report に pass/fail 件数 + failure 詳細 (route × expected vs actual + screenshot ref) + recommended next action
- recommended action 候補: `loom-developer dispatch` (PM 経由)、retro session への carryover findings 提案、follow-up smoke test schedule
- PM がそれを受領して fix dispatch 判断（user 確認後）

#### 3.6.11.9 依存

- **必須**: Playwright MCP tool 群 (`browser_navigate` / `browser_snapshot` / `browser_take_screenshot` / `browser_console_messages` / `browser_close`)
- **必須**: `bash` + `jq` (script formatter 用)
- **任意**: `pnpm dev` 起動済 (auto-detect、§3.6.11.7)
- skill `SKILL.md` 冒頭で dependency check 手順記載、不在時は graceful skip + WARN 出力

#### 3.6.11.10 Consumer agents

primary: **loom-developer** (UI feature 実装完了時 + milestone closure E2E task)、secondary: **loom-pm** (milestone closure default invoke)。**loom-review skill の test aspect template は consumer 外** (review 責任が scope、execution は SRP 違反)。各 agent prompt に suggest skill 参照記述：

```
UI 関連 task / milestone closure verification の候補として `loom-ui-smoke` skill。
他 verification approach (Playwright e2e baseline / 手動 browser test) も agent 自律判断で可。
```

### 3.6.12 Design Implementation（M0.11.4 から、Phase 1 aesthetic MVP completion）

#### 3.6.12.1 背景

M0.11.3 で `loom-ui-smoke` skill 完成 + Phase 1 functional MVP 検証完了したが、実機 smoke で「automated test green ≠ design vision 達成」を user が指摘：13 cat agent + Stardew 系 pixel RPG room + 3 theme + RPG window chrome の design intent (PIXEL_ART_HANDOFF.md / SPEC §12 visual 方向性) が **placeholder 円 dot のまま** で aesthetic MVP closure 未達成。

design source: `claude-room-handoff.zip` (Claude Design tool export bundle、`/tmp/claude-room-handoff/claude-room/project/` 配置、index.html + 7 jsx component file + tokens.css + styles.css + 6 PNG asset)。本 milestone (M0.11.4) で full design implementation pass を実施、aesthetic MVP completion を達成。

#### 3.6.12.2 戦略 A 確定: Phaser → DOM/SVG 採用

design は **all SVG + DOM + CSS** で構築 (Phaser 不使用)。M3.0 の Phaser 4 React mount infrastructure (§3.6.9.1 α-1) は **本 milestone で rollback**:

- **理由**: design CatSprite は `<svg viewBox="0 0 16 16">` + 32 個 `<rect>` で pixel grid 構築、Phaser WebGL 描画では design pixel-perfect 実現困難
- **trade-off**: M3.0 投資 (3 task = Phaser mount + tile + sprite state animation) は learning として archive、production code から Phaser 依存削除
- **Phase 2 evolution**: 将来 sprite 動的 animation 必要時に **要素単位** で Phaser 再導入余地、ただし Room view 全体じゃなく特定 component (例: 歩く猫 bar) のみ対象

#### 3.6.12.3 SPEC §3.6.9.1 改訂 (Phaser α-1 → DOM/SVG α-2)

旧: 「Phaser 4 React 内 mount = 自前 `useEffect` + `useRef`」
新: 「**DOM/SVG pixel-perfect rendering = `<svg viewBox>` + `<rect shapeRendering="crispEdges">` + `image-rendering: pixelated` CSS**、library 依存ゼロ、design pixel-perfect、HMR 単純」

§12 確定値表の Phaser 行は **「M3.0 で Phaser 4 試行 → M0.11.4 で DOM/SVG 採用 (rollback)」** と注記、archive value として履歴保存。

#### 3.6.12.4 Component port matrix (15 view + 共通 components)

| design source | port target | scope |
|---|---|---|
| `cat.jsx` CatSprite | `ui/src/components/CatSprite.tsx` | 16x16 pixel grid SVG、9 hat × 3 pose × 13 agent パターン |
| `cat.jsx` ROSTER | `ui/src/data/roster.ts` | 13 agent metadata (id / role / jp / name / breed / quote / hat / fur / cheek / group) |
| `room.jsx` RoomView | `ui/src/views/room/RoomView.tsx` (M3.0 → 全面書直し) | RoomBackground + DeskStation + posters + islands + retro mode |
| `room.jsx` SubroomClone | `ui/src/views/room/SubroomClone.tsx` | worktree sub-agent ghost cat |
| `screens-a.jsx` DisciplineHeader | `ui/src/components/DisciplineHeader.tsx` (拡張) | RPG-style header |
| `screens-a.jsx` AgentDetailPanel | `ui/src/views/room/AgentDetailPanel.tsx` (M3.2 → 全面書直し) | RPG-style overlay |
| `screens-a.jsx` Gantt | `ui/src/views/gantt/GanttView.tsx` (M3.1 → 全面書直し) | 歩く猫 bar の Gantt |
| `screens-b.jsx` PlanView | `ui/src/views/plan/PlanView.tsx` (M3.1 → 全面書直し) | RPG-style plan board |
| `screens-b.jsx` RetroView | `ui/src/views/retro/RetroView.tsx` (M2 → 全面書直し) | 4 lens findings + action plan |
| `screens-b.jsx` WorktreeView | `ui/src/views/worktree/WorktreeView.tsx` | worktree list RPG-style |
| `screens-c.jsx` ConsistencyView | `ui/src/views/consistency/ConsistencyView.tsx` (M4 → 全面書直し) | finding × 4 アクション |
| `screens-c.jsx` CustomizationView | `ui/src/views/customization/CustomizationView.tsx` | model + personality 設定 RPG-style |
| `screens-c.jsx` LearnedGuidanceView | `ui/src/views/guidance/LearnedGuidanceView.tsx` | guidance 監査 RPG-style |
| `char-sheet.jsx` CharSheet | `ui/src/views/char-sheet/CharSheet.tsx` | 13 agent character sheet |
| `char-sheet.jsx` ThemeShowcase | `ui/src/views/char-sheet/ThemeShowcase.tsx` | 3 theme palette 紹介 |
| `subroom.jsx` SubroomView | `ui/src/views/worktree/SubroomView.tsx` | sub-agent 詳細 modal |

新 view (M3.2 t1 / M5 t3 / M5 t4 由来、design source 不在) は本 milestone で **RPG style 言語に合わせて 新規設計**:

- `ui/src/views/session-list/SessionListView.tsx` (M3.2 t1) — RPG-style session list
- `ui/src/views/tokens/TokenMeterView.tsx` (M5 t4) — RPG-style token meter
- `ui/src/views/project-settings/ProjectSettingsView.tsx` (M5 t3) — RPG-style settings

#### 3.6.12.5 Token + style primitives port

`ui/src/styles/tokens.css` を **design tokens.css + styles.css** の primitives で書き直し:

- 3 theme palette: `:root` (default = pop / cozy noon) + `.theme-dusk` + `.theme-night`、各 theme 約 25 個 `--p-*` variable (bg-sky / bg-floor / wall / wood / cat-base / cat-line / cat-cheek / screen / screen-glow / paper / tint / accent / success / error / warn / shadow / 等)
- RPG primitives: `.rpg-frame`, `.rpg-frame-tight`, `.rpg-title`, `.rpg-label`, `.dot`, `.chip`, `.exp-bar`, `.btn-px` (5 variant)
- Room primitives: `.room`, `.room__bg`, `.room-window`, `.room-sign` (5 variant), `.room-poster` (3 variant + sub-elements), `.room-island` (3 variant), `.room-floor-cushion`, `.room-mode-toggle`, `.room-modal`
- Subroom primitives: `.subroom-clone` + sub-elements, `.subroom-portal`
- 既存 Tailwind 設定 (`tailwind.config.ts`) は keep、新 RPG style primitive は **CSS variable 直参照** で coexist

#### 3.6.12.6 MVP closure 再定義

| tag | 意味 | 状態 |
|---|---|---|
| `m5-complete` | **functional MVP completion** (機能完成) | 設置済 (2026-05-04) |
| `m0.11.3-complete` | **verification infra completion** (UI smoke skill 整備) | 設置済 (2026-05-05) |
| `m0.11.4-complete` (新) | **aesthetic MVP completion** (design vision 達成、Phase 1 真の MVP 完成) | M0.11.4 closure 時 |

`README.md` 「Phase 1 MVP completed」記述は m0.11.4 完成時に **完全達成** marker として update、aesthetic + functional の両輪 closure を user に明示。

#### 3.6.12.7 Phaser dependency removal

`ui/package.json` から `phaser` (^4.1.0) dependency 削除、関連 file (`ui/src/views/room/PhaserCanvas.tsx`、`ui/src/views/room/scenes/RoomScene.ts`、`ui/src/views/room/agentSpriteSync.ts`) を **物理削除** (SPEC §3.9.x P4 理想形「symptomatic patch 構造解決後の rollback」と同 pattern、Phaser infra rollback)。Playwright e2e baseline (`ui/e2e/__screenshots__/room-baseline.spec.ts-snapshots/room-pop.png`) は新 design 実装後に再生成。

### 3.6.13 Ceremony Reduction Trinity Marker（2026-05-06-002 retro F-pj-001 由来、SSoT）

claude-loom Phase 1 closure trinity (M0.11.5 / M0.11.6 / M0.11.7) で codify された design principle 「**context から intent 読めるなら ceremony 強制せえ**」の cross-reference を 1 箇所で参照可能にする SSoT marker。Phase 2 candidate 設計時に毎回 3 章探索コストが発生する discoverability gap を解消する。

| trinity 章 | milestone | scope | rationale |
|---|---|---|---|
| **§3.2** Lazy Daemon ライフサイクル | M0.11.5 | session 開始時の SessionStart hook + slash command dual path で UI auto-launch、cold-start-only browser open | user が `/loom-pm` 起動直後に GUI を自然に視界へ出す ceremony reduction、context = "loom PJ 開始した" → intent = "GUI も見たい" の自動推論 |
| **§3.6.8.9** PM Auto-Spec Entry | M0.11.6 | PM が context (PLAN.md status / git log / SPEC.md unchanged time) から spec phase 必要性を probe、auto-entry | user が `/loom-spec` 明示宣言不要、context = "milestone 境界 + SPEC drift" → intent = "spec 確認したい" の自動推論 |
| **§3.6.8.10** PM Auto-Go Entry | M0.11.7 | PM が context (PLAN.md status / spec phase 完了 marker) から impl phase 必要性を probe、auto-entry | user が `/loom-go` 明示宣言不要、context = "spec done + PLAN ready" → intent = "実装着手したい" の自動推論 |

**共通 design principle**:
- ceremony (明示 slash command 宣言) は default off、context probe で intent を満たせない時のみ user が ceremony で override
- 全 trinity 章は §3.6.8.7 path C (degraded mode = first-class operating mode) と整合、Bash tool 単体で context probe 可能 (Task tool 不要)
- intent keyword (`/loom-spec` / `/loom-go` invoke 直前の user 文言) を SPEC §3.6.8.9 / §3.6.8.10 に列挙、PM は keyword 検出で auto-entry の信頼度を上げる

**Phase 2 application**: Phase 2 candidate (`Phase 2 candidate pool: UX refinement series`) の優先順位判定軸として、本 marker を 1st-class 評価軸とする。「該当 candidate が ceremony reduction trinity の延長線上にあるか」を design phase で確認すること。

**M0.15 continuation marker** (retro 2026-05-12-001 F-res-003 由来、success record):

Phase 1 closure trinity (M0.11.5/6/7) で codify した design principle 「context から intent 読めるなら ceremony 強制せえ」 の **UI 側 hardening 続編** として、§3.6.14 M0.15 UI Redesign Port が結実。trinity の自己再帰的開発 workflow (lazy daemon + auto-spec + auto-go) が 12 画面の visual surface を最終完成させ、Phase 2 Kickoff (M1.0) の事前条件達成。dogfood phase の continuous self-improvement loop が **M0.11.5 → M0.15** 連続成功し、M0.15 を Phase 1 hardening trinity の "final visual surface" marker として位置付ける。

### 3.6.14 UI Redesign Port（M0.15 から、SPEC SSoT）

claude.ai/design で詰めた UI 再設計を本実装に書き起こす milestone scope の SSoT。設計の納品物 (`redesign/scenarios.js` + `redesign/screens/*.jsx` + `redesign/Redesign App.html` + `redesign/cat.jsx` + `redesign/styles.css` + `redesign/tokens.css` + `redesign/_chat{1,2}.md`) は claude-loom リポジトリ内 `redesign/` 配下に保管され、本 milestone 完了後も **絶対に削除されない** 不変な mock fixture / data dependency 仕様書として運用する。

#### 3.6.14.1 Scope と前提

- **対象**: 既存 `ui/src/views/` 下の M0.11.4 で実装された Phase B aesthetic MVP のハードコード fixture (例: `AGENT_STATES = [{ task: "GREEN にする" }, ...]` 系) を全 12 画面で撤去、`useScenario()` 経由の scenario 駆動に書き換える
- **対象外**: `redesign/` 配下の prototype HTML/JSX 自体（mock fixture として永続保管、§3.6.14.3 absolute rule）
- **前提**: M0.X-startup-recovery + M0.11.5/6/7 (Phase 1 closure trinity) + M5 (M3 prep cleanup) 完了済、daemon broadcaster が 15 event 型 emit (agent.change / plan.change / finding.new / approval.request / event.raw / learned_guidance.change / worktree.change / discipline_metric.update / todo.change / plan.conflict / session.change / spec_change_detected + **M0.15 t13 追加**: pm.message / pm.permission_request / pm.permission_resolved)、daemon に 17 sub-router (agent / approval / coexistence / config / consistency / discipline / events / note / personality / plan / prefs / project / retro / session / token / worktree + **M0.15 t13 追加**: pm) 実装済

#### 3.6.14.2 Phase 1 closure trinity との関係

§3.6.13 で codify された 「context から intent 読めるなら ceremony 強制せえ」 design principle の **UI 側 hardening** = Phase 1 hardening trinity の論理的続編として位置付け：

| trinity 章 | M0.15 での visual surface 完成 |
|---|---|
| §3.2 Lazy Daemon ライフサイクル (M0.11.5) | UI auto-launch flow → M0.15 で実 user-visible 12 画面が live data で動く |
| §3.6.8.9 PM Auto-Spec Entry (M0.11.6) | ③ Plan view + Room poster で auto-entry 結果が可視化 |
| §3.6.8.10 PM Auto-Go Entry (M0.11.7) | ② Gantt view で impl phase の dispatch live が可視化 |

M0.15 は Phase 1 trinity が成立させた「dogfood phase の自己再帰的開発 workflow」の **最終 visual surface** を完成させる milestone。Phase 2 Kickoff (M1.0) の事前条件。

#### 3.6.14.3 Mock fixture 保全規律 (絶対消すな rule、harness gate)

claude.ai/design 由来の以下 file 群は **3 役割を兼ねる SSoT**：

1. **API contract**: `redesign/scenarios.js` 内 SCENARIOS object の shape = daemon WS reducer の output 型契約 (TypeScript 化は `redesign/api/types.ts` で実施済)
2. **Mock fallback**: `?mock=idle | ?mock=active | ?mock=failed` URL query で開発中 visual confirm + visual regression baseline source
3. **Data dependency 仕様書**: `redesign/screens/*.jsx` 各 file 冒頭の destructuring が当該画面の data dependency 仕様

これらは M0.15 内で **編集も削除も禁止**。本規律は harness test (`tests/redesign_invariant_test.sh`、本 milestone t18 で新設) で構造的に gate する：

| file | 編集禁止 | 編集可 |
|---|:---:|:---:|
| `redesign/scenarios.js` | ✓ |  |
| `redesign/screens/*.jsx` (12 file) | ✓ |  |
| `redesign/Redesign App.html` | ✓ |  |
| `redesign/cat.jsx` | ✓ |  |
| `redesign/styles.css` / `redesign/tokens.css` | ✓ |  |
| `redesign/_chat{1,2}.md` / `redesign/_BUNDLE_README.md` | ✓ |  |
| `redesign/scenarios.d.ts` |  | ✓ (production type shim) |
| `redesign/api/*.ts` |  | ✓ (production 実装契約) |
| `redesign/README.md` |  | ✓ (運用 doc) |
| `redesign/package.json` |  | ✓ (workspace 設定) |

scenarios.js の **fixture 内容** に変更が必要な場合は、(a) `redesign/api/mock-fixtures.ts` を新設して production 用 fixture を別管理する、または (b) 本 SPEC §3.6.14 を update して新 milestone scope で再 design する、のいずれか。直接 edit は禁止。

**REQ 採番 PM 一括 append rule** (retro 2026-05-12-001 F-proc-004 由来):

並列 batch dispatch で複数 dev が `tests/REQUIREMENTS.md` に同時 REQ 番号を採番すると衝突する (実観測: M0.15 で REQ-068 が t8 Sessions / t10 Settings の両方で claim、REQ-070 が t11 Consistency / t8 Sessions で claim)。これを構造的に回避するため、parallel batch 内の dev には `tests/REQUIREMENTS.md` への REQ entry append を **task 内で禁止**し、PM が milestone closure 段階で全 REQ entry を一括 append する規律を採用する。

- **dispatch prompt 規約**: PM が parallel batch dispatch する subagent prompt に「本 task では `tests/REQUIREMENTS.md` は touch 禁止 (PM closure 一括 append rule)」を明示
- **PM 一括 append 手順**: milestone closure (m\*-complete tag 設置直前) で PM が全 task の REQ entry を連番で append、各 entry に commit_sha を含めて trace 可能化
- **dev report 規約**: dev は final report に `REQ_id_proposal` field を含めて PM に通知、PM が一括 append 時に整合 verify
- **single dev task では適用不要** (single dev は通常通り REQ entry を自身で書く)、parallel batch (3+ dev simultaneous) のみ本 rule 適用

#### 3.6.14.4 Phase 構成 (6 phase / 22 task) — PLAN SSoT 参照

PLAN.md M0.15 section が task list の SSoT。本 SPEC は Phase 構成の概要のみ:

1. **Phase 1**: reducer foundation (1 task, sequential) — `redesign/api/websocket.ts` に 8 event reducer 追加
2. **Phase 2**: parallel screen batches (3 batch × 3 task = 9 task, worktree isolation 必須) — 12 画面のうち 9 画面 (Gantt / Plan / Worktree / Customization / Guidance / AgentDetailPanel / Sessions / Tokens / Settings)
3. **Phase 3**: 中信頼 + PMChat (3 task) — Consistency / Retro + ⑬ PMChat (daemon `pm.*` sub-router 新設、3 新 event 型追加)
4. **Phase 4**: shell + posters (2 task) — AppShell.tsx redesign 移植 + Room 3 posters scenario 化
5. **Phase 5**: write API hookup (2 task) — 既存 daemon REST に button hook + PMChat write
6. **Phase 6**: closure gates (5 task) — harness test / doc update / Layer 2.5 smoke / Playwright e2e / `m0.15-complete` tag + retro hook

reviewer mode: single default、trio opt-in は 3 task のみ (⑦ Customization t5 / ⑬ PMChat t13 / Layer 2.5 smoke t20)。

#### 3.6.14.5 Layer 2.5 dogfood smoke matrix (closure 必須、SPEC §10.4.1 整合)

milestone tag (`m0.15-complete`) 設置 **直前** に PM 自身が以下を sequential 実行:

| step | command | 期待 |
|---|---|---|
| 1 | `bash hooks/loom-launch-ui.sh` | daemon (5757) + UI (5173) 両方起動 |
| 2 | `curl -sf http://127.0.0.1:5757/health` | `{"status":"ok"}` |
| 3 | `curl -s http://127.0.0.1:5757/mode \| jq .` | SPEC §3.2.1 6 field 充足 |
| 4 | `curl -sI http://127.0.0.1:5757/` | `200` + `content-type: text/html` |
| 5 | 12 画面の SPA route (`/`, `/plan`, `/gantt`, `/retro`, `/consistency`, `/worktree`, `/customization`, `/guidance`, `/sessions`, `/project-settings`, `/tokens`, `/agents/:id`) を curl | 全部 `200` |
| 6 | browser actual で `?mock=active` 付き 12 画面 visit | white screen 出さず claude.ai/design fixture が表示される |
| 7 | 重要 3 画面の 1-click flow (⑦ Customization 保存 / ⑬ PMChat 送信 / ⑫ Settings 保存) | REST endpoint に payload が届く (daemon event log で confirm) |

**Step 8 (M0.16 から、SPEC §3.6.15 構造昇格)**: `act -W .github/workflows/ci.yml pull_request --container-architecture linux/amd64` で local CI simulation 全 green を確認 (Docker daemon 起動が前提)。M0.16 で codify した push 前 CI red detect gate。Docker daemon 不在時は skip 注記 + retro candidate finding として記録、closure 自体は block しない (graceful fallback、SPEC §3.6.15.4 SSoT)。

任意 step 失敗 → tag 設置 BLOCK (Step 8 は graceful fallback 例外)、failed step を user に報告 + fix task を PLAN.md に追加して closure 延期。

**Playwright baseline regenerate workflow** (retro 2026-05-12-001 F-res-002 由来、M0.16 で structural fix 完了予定):

UI redesign で既存 baseline screenshot (例: `ui/e2e/__screenshots__/room-baseline.spec.ts-snapshots/room-{pop,dusk,night}.png`) が visual 変化により diff 検出する場合、baseline を意図的に regenerate する手順:

1. `pnpm --filter @claude-loom/ui e2e --update-snapshots` で baseline 再生成
2. `git diff --stat ui/e2e/__screenshots__/` で変更画像数を確認、想定範囲内か audit
3. 該当 baseline を commit (commit message に `[playwright-baseline-regenerate]` annotation 必須、retro 検出可能化)
4. 後続 milestone で意図しない visual regression が起きた時、本 commit を遡って原因 milestone を特定可能化

#### 3.6.14.6 完成基準 (PLAN.md M0.15 完成基準と整合)

- [x] 12 画面全部が `?mock=active` で動く (browser white screen 出さない) ← Phase 1-4 (t0-t15) で全 12 画面 mock hookup 完了
- [x] 12 画面全部が daemon WS から live data を受信 (mock query 無し時 = production data) ← t1 useScenario reducer + Phase 5 live hookup (t6-t15) で達成
- [x] 重要 3 画面 (⑦ Customization / ⑬ PMChat / ⑫ Settings) の 1-click flow が daemon REST に payload を届ける ← Phase 5 t16 (write API hookup 6 screens) / t17 (usePMSession) で達成
- [x] `redesign/scenarios.js` + `redesign/screens/*.jsx` + `redesign/Redesign App.html` + `redesign/cat.jsx` + `redesign/styles.css` + `redesign/tokens.css` が untouched (`tests/redesign_invariant_test.sh` で gate) ← t18 (commit 393c633) で 20 file SHA-256 baseline gate 新設完了
- [x] Layer 1 全 test pass (bash + ui + daemon) ← 1007 ui tests + daemon 546 tests GREEN (feat/redesign-room-mvp HEAD)
- [x] Layer 2 browser-interactive smoke pass ← t21 (commit af2c07f) で Playwright e2e baseline 19/19 pass、Layer 2 browser-interactive 相当を達成
- [x] Layer 2.5 dogfood smoke 全 7 step pass ← t20 (commit 58329d8) で PM 直接実行、`docs/smoke-tests/m0.15-dogfood/report.md` に structured report 出力
- [x] Playwright e2e baseline (12 画面 screenshot + 重要 3 画面 1-click flow) pass ← t21 で 13 screenshot + 3 click flow + 3 room regenerated = 19/19 pass
- [x] SPEC §3.6.14 + `docs/SCREEN_REQUIREMENTS.md` (12 画面の useScenario shape) + `docs/DOC_CONSISTENCY_CHECKLIST.md` (M0.15 check items) update 済 ← t19 で完了
- [x] tag `m0.15-complete` 設置 + retro hook trigger ← t22 (commit 62ce2f1 後) で PM 設置完了、retro-2026-05-12-001 trigger 済
- [x] `m0`〜`m5-complete` 全 tag 保持 ← t22 closure で git tag -l --sort=-creatordate verify 済

### 3.6.15 Playwright e2e OS-aware Baseline + local CI parity gate（M0.16 から、retro 2026-05-12-001 F-res-002 構造昇格、SPEC SSoT）

retro 2026-05-12-001 で defer codify した F-res-002 (Playwright baseline regenerate workflow workaround) を post-merge follow-up で Phase 2 hardening continuation milestone として structural fix する。M0.15 PR #9 で 4 連続 post-tag-hotfix (`9dfd307` → `41e8d0a` → `697fc97` → `1ed449c`) を経験した「local pass → CI red」dogfood gap を構造解消し、Phase 2 entry の reliability foundation を整える。

#### 3.6.15.1 Scope と前提

- **対象**: 3 axis structural fix
  1. `snapshotPathTemplate` を OS-aware に refactor (`{snapshotDir}/{testFilePath}-snapshots/{arg}-{platform}{ext}`)
  2. CI workflow に `workflow_dispatch` trigger + `--update-snapshots` step + auto-PR で CI Linux baseline 自動生成
  3. Layer 2.5 dogfood smoke (SPEC §3.6.14.5) に Step 8 = `act` で CI simulation 全 green を必須 step として codify
- **対象外**: visual regression test 自体の structure (M0.15 t21 で確立済の 13 screen + 3 click flow + 3 room baseline は維持)、`playwright.config.ts` 以外の global config 変更
- **前提**: M0.15 closure 済 (Phase 1 hardening trinity + UI Redesign Port 完了)、Phase 1 closure trinity continuation marker 成立 (§3.6.13 末尾)、Docker daemon が user 環境で利用可能 (act 依存)

#### 3.6.15.2 retro 2026-05-12-001 F-res-002 との関係

| stage | retro 時 | post-merge follow-up (本 milestone trigger) | M0.16 structural fix |
|---|---|---|---|
| status | low / proposal / workaround spec として codify | PR #9 で 4 連続 hotfix iteration、user の dogfood gap 観察を contextual surface | 3 axis 全 structural fix で 90%+ resolved |
| coverage | Playwright regenerate workflow の手順 doc | per-test threshold + fullPage 戦略の trial & error | snapshotPathTemplate OS-aware + CI workflow + act Step 8 |

retro 段階では「snapshotPathTemplate を OS 別 baseline 別 path に分ける structural fix を Phase 2 で codify」と defer された。M0.15 closure 後の PR #9 hotfix iteration で user の指摘 (「local pass → CI red を local で検知できる仕組みが必要」) を受けて、structural fix の Phase 2 milestone 化が urgent と判断、M0.16 として early Phase 2 入り。

#### 3.6.15.3 Phase 構成 (4 phase / 11 task) — PLAN SSoT 参照

PLAN.md M0.16 section が task list の SSoT。本 SPEC は Phase 構成の概要のみ:

1. **Phase 1**: snapshotPathTemplate OS-aware refactor (2 task) — playwright.config.ts edit + 既存 baseline migrate (`<arg>.png` → `<arg>-darwin.png` rename + local Playwright 19/19 verify)
2. **Phase 2**: CI Linux baseline 生成 (2 task) — `.github/workflows/ci.yml` に `workflow_dispatch` trigger + `--update-snapshots` step + auto-PR (or auto-commit) 追加、初回 invoke で Linux baseline 自動生成
3. **Phase 3**: Layer 2.5 act integration (3 task) — SPEC §3.6.14.5 に Step 8 codify + `agents/loom-pm.md` closure workflow 更新 + `tests/act_smoke_test.sh` 新設 (optional harness、Docker daemon 不在時 graceful skip)
4. **Phase 4**: doc + closure (4 task) — SCREEN_REQUIREMENTS / DOC_CONSISTENCY_CHECKLIST update + REQUIREMENTS REQ append + Layer 2.5 dogfood smoke (Step 8 含む self-test) + tag

reviewer mode: single default、CI workflow 変更 (Phase 2 t3) は security 観点 review で trio opt-in 候補 1 task。

#### 3.6.15.4 act 依存と graceful fallback

`act` (https://github.com/nektos/act) は GitHub Actions を local Docker container で再現するツール。M0.16 で Layer 2.5 Step 8 として必須化するが、以下の graceful fallback 規律を codify:

- **Docker daemon 起動**: `docker info` で daemon 接続確認、不在時 act invocation skip + Layer 2.5 dogfood smoke は Step 8 skip notice を report に記録 (full GREEN とは扱わない、partial GREEN として user 認識可能化)
- **act install 不在**: `command -v act` で binary 確認、不在時 user に `brew install act` (macOS) / `gh extension install nektos/gh-act` (gh extension) を案内 + skip
- **platform option**: macOS local で act 起動時は `--container-architecture linux/amd64` flag で qemu emulation (Apple Silicon 上で linux/amd64 image を強制) を推奨、Layer 2.5 Step 8 invocation の standard option として codify
- **PR closure block ではない警告**: act skip でも Layer 2.5 Step 1-7 + Playwright e2e local pass が達成済なら closure 可、ただし retro 候補 finding として記録 (CI red を push 前検知する gate が欠落している事実)

#### 3.6.15.5 完成基準

- [ ] `ui/e2e/playwright.config.ts` の `snapshotPathTemplate` が `{snapshotDir}/{testFilePath}-snapshots/{arg}-{platform}{ext}` に refactor
- [ ] 既存 baseline (M0.15 t21 生成分) を `<arg>-darwin.png` に migrate、`pnpm --filter @claude-loom/ui exec playwright test --config e2e/playwright.config.ts e2e/m0.15-redesign/` で 19/19 pass
- [ ] `.github/workflows/ci.yml` に `workflow_dispatch` trigger + Linux baseline 生成 step 追加
- [ ] CI workflow_dispatch invoke で `<arg>-linux.png` 自動生成 + auto-PR が機能、main 取込み後 CI Linux + local darwin 両環境で Playwright e2e 全 pass
- [ ] SPEC §3.6.14.5 Layer 2.5 dogfood smoke に Step 8 = `act` invocation 必須化、Step 7 までと同等 importance
- [ ] `agents/loom-pm.md` closure workflow に Step 8 `act` invocation 必須 step として codify、graceful fallback (Docker 不在時 skip + retro finding 記録) 規律も明記
- [ ] `tests/act_smoke_test.sh` 新設 (optional harness)、`bash tests/run_tests.sh` で auto-glob discover、Docker daemon 起動時のみ実 invoke、不在時 skip
- [ ] `docs/SCREEN_REQUIREMENTS.md` / `docs/DOC_CONSISTENCY_CHECKLIST.md` M0.16 check items update
- [ ] `learned_guidance lg-2026-05-13-001` (project-prefs.json local persist、ttl: until-m0.16-complete) を SPEC §3.6.15 で formal 規律として昇格、ttl expire
- [ ] tag `m0.16-complete` 設置 + retro hook trigger
- [ ] `m0`〜`m0.15-complete` 全 tag 保持

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

#### 3.7.5 mode detection と選択（M0.12 から）

adopt mode の中で以下の追加検出を行う：
- 既存他 plugin の存在 (`~/.claude/plugins/` 配下)
- 既存 agents / skills / commands (loom-* 以外)
- 既存 user-authored CLAUDE.md / project.json

検出結果を提示し、`coexistence_mode` 未設定時は user に 3 mode のうち選択を促す。
default は `full`（greenfield 想定）、user が「既存 setup 尊重」と意思表示したら `coexist`、細かく指定したいなら `custom`。

---

### 3.8 コミット + ブランチ規約（Conventional Commits + GitHub Flow）

claude-loom は **Conventional Commits**（[conventionalcommits.org](https://www.conventionalcommits.org)）と **GitHub Flow** を明示採用する。詳細ルール + good/bad 例は `docs/COMMIT_GUIDE.md` を参照。

#### 3.8.1 コミット規約サマリ

- **形式**: `<type>(<optional scope>): <subject>` の 1 行件名 + 必要に応じて空行 + 本文
- **type 11 種**: `feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `chore` / `revert`
- **scope**: 任意（`feat(skills): ...` のように該当モジュールを括弧で）
- **件名**: 命令形（"Add feature" / "Update workflow"）または日本語の体言止め可。≤50 文字英 / ≤40 文字日目安。末尾ピリオドなし
- **本文**: WHY 中心、72 文字折返（日本語は自然な改行）
- **BREAKING CHANGE**: `feat!:` または footer `BREAKING CHANGE: <description>`
- **atomic commits**: 1 commit = 1 論理変更 / revert 単位 / build & test pass / ≤200 行目安（Google CL 流儀）

#### 3.8.2 ブランチ規約サマリ（GitHub Flow）

- **戦略**: `main` + 短命 feature ブランチのみ（GitHub Flow）。Git Flow の `develop` / `release` ブランチは使わない
- **命名**: `<type>/<short-kebab-name>`、type は commit type と同一（`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore` の 10 種、`revert` はインラインで使うのでブランチ名には含めない）
- **寿命**: 数日〜数週間程度。長期化したら分割を検討
- **merge**: `main` への direct commit 禁止。PR 経由、reviewer verdict pass 必須。merge 戦略は `--no-ff`（マイルストーン boundary を history に残す）または squash（WIP commit が多い場合）

#### 3.8.3 言語ポリシー（commit_language）

`.claude-loom/project.json` の `rules.commit_language` で件名/本文の言語を設定：
- `"any"`（default）：日本語 / 英語どちらも可。個人・国内チーム向け
- `"english"`：英語強制。国際 OSS / 機械処理優先
- `"japanese"`：日本語強制（実用上は珍しい設定）

claude-loom 自身は `"any"`（既存 commit が日英混在のため）。

### 3.9 Retro 機能（M0.8 から有効、M0.X で skill-centric architecture へ移行）

claude-loom は **retro 機能** をハーネスの中核に組み込む。詳細設計は `docs/plans/specs/2026-04-27-retro-design.md`、運用 SSoT は `docs/RETRO_GUIDE.md`、template SSoT は `skills/loom-retro/SKILL.md`。

**Architecture (skill-centric、`docs/SKILL_MIGRATION.md` で migration 詳細)**:

- **`loom-retro-pm` agent (persistent role)** — retro session orchestrator、`/loom-retro` で起動、Stage 0 file build + Stage 4 presentation を直接担当、Stage 1-3 は skill template を read して `general-purpose` subagent に inject する形で dispatch
- **`skills/loom-retro/SKILL.md`** — Stage 0-3 protocol + 4 lens template (LENS_PJ / LENS_PROCESS / LENS_META / LENS_RESEARCHER) + COUNTER_ARGUER_TEMPLATE + AGGREGATOR_TEMPLATE の SSoT
- **lens / counter-arguer / aggregator は agent file を持たない** (skill template として codify)、旧 `loom-retro-{pj,process,meta}-judge` + `loom-retro-counter-arguer` + `loom-retro-aggregator` + `loom-retro-researcher` の 6 agent file は本 architecture 移行で削除

#### 3.9.x retro 基本方針（M0.13 から、SSoT）

retro 機能は以下 3 原則を不変条件とする：

- **P1**: retro = retrospective、**自己改善（claude-loom 自身の workflow / agent prompt 最適化）+ PJ 改善（user の PJ への提案・改善）の両輪が基本目的**
- **P2**: **user は retro 参加者**（external lens じゃなく Stage 1 内に正式組込）、user findings は retro-pm finding と同等扱い
- **P3**: retro = 改善点洗い出し → **action 化** → 計画立てる、findings は archive じゃなくて actionable plan に。user と着手項目を決定し、改善計画を pending state に保存
- **P4**: **Root cause first**（retro 2026-05-02-002 meta-NEW-1 起源、user 由来）— **症状対処（discipline 注入 / 注意喚起 / prompt 強化）は再発リスクが高い**。常に構造的 root cause（schema / hook / agent definition / observability mechanism）を優先検討、症状対処は明示的に「次回も忘れる前提で書く」最終手段とする。finding 提案時は `proposal_type` field（`symptomatic` / `structural` / `record-only`）で区別を明示。symptomatic 採用時は **構造的代替の併設**（後で symptomatic patch を rollback できる structural 機構） を試みる。

#### 3.9.1 retro の役割

PJ 軸（製品）+ Process 軸（仕事の進め方）+ 外部研究 + 自己最適化（meta）の 4 観点で振り返り → archive markdown + 会話で user に提示 → 承認された改善を user-prefs / project-prefs / SPEC / 各種ファイルに反映。「user × claude × project の組み合わせごとに動的最適化される開発室」を実現する。

#### 3.9.2 4 lens 構成 (skill templates、`skills/loom-retro/SKILL.md` SSoT)

| lens identifier | skill template | 観点 | データ source |
|---|---|---|---|
| `pj-axis` | LENS_PJ_TEMPLATE | SPEC drift / feature gap / UX 摩擦 | SPEC / PLAN / README / git log / agent definitions |
| `process-axis` | LENS_PROCESS_TEMPLATE | TDD / review / commit 粒度 / blocker / permission friction / 自動化機会 | session transcripts / git log / reviewer JSON / command_frequency.json |
| `researcher` | LENS_RESEARCHER_TEMPLATE | plugin / Claude latest / UX best practice | WebSearch / context7 / WebFetch（reactive + light proactive） |
| `meta-axis` | LENS_META_TEMPLATE | auto-apply 拡張提案 / lens 削除提案 / risk threshold 提案 | 過去 retro outputs / user-prefs.json / approval 履歴 |

各 lens は agent file を持たず、retro-pm が skill から template を read → `general-purpose` subagent + template injection で dispatch する。

#### 3.9.3 3-stage protocol

1. **Parallel critique**: 4 lens template (LENS_PJ / LENS_PROCESS / LENS_META / LENS_RESEARCHER) を retro-pm が 1 message 内 4 parallel Task calls で dispatch
2. **Counter-argument pass**: COUNTER_ARGUER_TEMPLATE を retro-pm が 1 Task call で dispatch、各 finding に verdict (confirmed / for_downgrade / for_drop) 付与
3. **Aggregator**: AGGREGATOR_TEMPLATE を retro-pm が 1 Task call で dispatch、confirmed findings 統合 → archive markdown 生成 → user 提示

#### 3.9.4 Trigger

- 手動: `/loom-retro [--report]` で任意の起動
- Milestone hook: tag 設置後、PM agent が「retro しとく？」と user に提案

#### 3.9.5 Mode

- 会話駆動 mode（default）: PM agent が finding 1 件ずつ提示、user が口頭返答
- report mode（`--report` flag）: archive markdown のみ生成して exit

#### 3.9.6 State 管理

3 ファイル分離（責務独立）：
- `<project>/.claude-loom/project.json` — human spec、retro は読むだけ
- `<project>/.claude-loom/project-prefs.json` — retro auto-update（PJ 学習状態）
- `~/.claude-loom/user-prefs.json` — retro auto-update（user 横断学習）

merge 規則: project が user を field 単位 override（PJ 固有 policy が user グローバル設定を上書き）。schema 詳細は §6.9.1 / §6.9.2。

#### 3.9.7 Auto-apply mechanism

各 finding は `category` + `risk` + `auto_applicable_eligible` を持つ。`safety guardrail`（`auto_applicable_eligible: false` は always ASK_USER）+ `category opt-in`（user 明示承認）+ `risk threshold`（`max_risk` 以下を自動）の 3 段判定。

#### 3.9.8 Recursive 自己最適化（meta-axis）

retro 自身が承認パターンを観察 → 「category X 連続承認、auto-apply 拡張？」「lens Y 採用率低い、disable？」「max_risk 上げる？」を proposal finding として user に提示。承認されれば user-prefs / project-prefs に反映、次 retro 以降適用。

#### 3.9.9 lens tagging + auto-write to learned_guidance（M0.11 から）

retro 4 lens template (LENS_PJ / LENS_PROCESS / LENS_META / LENS_RESEARCHER) は finding 出力に以下 field を含む：

- `target_artifact`: enum `agent-prompt | spec-section | doc-file | retro-config`
- `target_agent[]`: array of agent or skill identifier strings、agent-prompt 時必須
- `guidance_proposal`: agent-prompt 時の注入 text 候補

AGGREGATOR_TEMPLATE は user 承認後、`target_artifact == "agent-prompt"` の finding を以下に書き込む：

- agent-keyed (`loom-pm` / `loom-developer` / `loom-retro-pm`): `agents.<target>.learned_guidance[]`
- skill-keyed (`loom-review.strategies.<single|trio.<aspect>>` / `loom-retro.lenses.<lens>` / `loom-retro.stages.<counter-arguer|aggregator>`): `skills.<target>.learned_guidance[]`

詳細は `docs/RETRO_GUIDE.md`。

#### 3.9.10 verdict_evidence 保存（M2.1 から）

retro session 開始時、`loom-retro-pm` agent は **直前 milestone の reviewer dispatch evidence を `<project>/.claude-loom/retro/<retro_id>/verdict_evidence.json` に保存する**。「review skip」と「指摘ゼロ pass」を retro 中 / 後の audit で機械的に区別可能にするための discipline 機構（M0.13 retro discipline の延長、proc-003 finding 起源）。

**責務 / write timing**:
- **書込主体**: `loom-retro-pm` (Stage 0、retro_id 採番直後 / Stage 1 dispatch 前)
- **build 戦略**: lazy build — git log（永続）+ session transcript（reviewer JSON ref）+ commit message を遡って合成
- **読込主体**: 4 lens (Stage 1)、特に process-axis lens が「review skip vs pass」audit に使用
- **PM hint**: `loom-pm` agent は milestone tag 設置時、**final report に reviewer JSON 取得 reference を残す**（dispatch 時の task_id / commit SHA / reviewer agent name）。retro-pm の lazy build accuracy 補強用、PM 自身は file write しない

**schema**: §6.9.5 (zod 完全定義)

**保存 path 規約**: `<project>/.claude-loom/retro/<retro_id>/verdict_evidence.json`（retro session 単位の per-instance file、prefs と分離）

#### 3.9.11 Lifecycle Tracking Architecture（M0.11.1 から）

retro 機能の **finding lifecycle + guidance lifecycle** を構造的に追跡する mechanism。SPEC §3.9.x P4 (Root cause first) の理想形：M3.0 retro 由来の symptomatic patch（proc-NEW-1 counter-arguer stale finding detection section）を本 architecture で構造的に置換、symptomatic patch を rollback する cleanup loop の最初の実例。

**責務 / write timing**:
- **書込主体**:
  - `pending.json.<finding>.applied_in` + `apply_history`: aggregator（or PM 中継時 retro-pm）が apply commit 時に update
  - `applied_summary.json`: `loom-retro-pm` が Stage 0 lazy build（retro_id 採番直後 / Stage 1 dispatch 前）
- **build 戦略**: Lazy build — retro-pm Stage 0 で過去 retro session の `<project>/.claude-loom/retro/*/pending.json` を scan、applied finding 集約 → `<project>/.claude-loom/retro/<retro_id>/applied_summary.json` write。M2.1 §6.9.5 verdict_evidence.json と同 pattern（**retro file architecture = file 永続 + lazy read by lens** SSoT 統一）。
- **読込主体**: 4 lens（Stage 1）、特に「過去 retro で applied 済 finding を re-up しない」stale prevention に使用。lens は agent prompt prefix で渡された `applied_summary_path` を `Read` tool で参照、必要時のみ load（C2 design 確定）。
- **rollback discipline**: M3.0 retro proc-NEW-1（counter-arguer stale check）は本 architecture 完成時 **rollback 必須**（M0.11.1 task list 内 mandatory）、SPEC §3.9.x P4「symptomatic patch 構造解決後の消滅」理想形 archive 例。

**apply commit 時の back-fill 責務**（2026-05-06 retro F-pj-002 + F-meta-003 由来 SSoT）:

`<project>/.claude-loom/retro/<retro_id>/pending.json` の `applied_in` + `apply_history` field は **apply 実行主体が書込責任**を持つ：

- **path 1 (in-session apply)**: `loom-retro-pm` が会話 mode で finding 1 件ずつ user 承認 → 即時 apply する場合、retro-pm が apply commit 直後に該当 finding の `applied_in` (commit_sha + apply_type + applied_at) と `apply_history[]` (entry append) を update。`loom-retro-pm` 自身が write 主体
- **path 2 (out-of-session apply)**: archive markdown のみ生成 (report mode) → 後日 apply commit する場合、apply 実行主体（typically `loom-pm` or 直接の dev session）が apply 完了後に該当 retro_id の pending.json を Read + 更新 + Write で back-fill。Phase 2 で `/loom-retro-apply` 実装予定だが、**v1 では apply 実行主体の手動 back-fill 責務**として SSoT 化
- **schema_version v2 必須**: back-fill 時 `schema_version: 2` field を維持、`applied_in: null` → `{commit_sha, apply_type, applied_at}` に更新、`apply_history: []` に entry append
- **back-fill 検証**: 次回 retro session の Stage 0 で `applied_summary.json` lazy build 時、`applied_in: null` のまま `status: "approved"` の finding を検出 → WARN log + applied_summary build は continue（mechanical SSoT drift detection）

**未 back-fill 時の影響**: `applied_summary.json` 機械的 build 時に approved+applied 済 finding が漏れ、4 lens が同 finding を re-up する echo-chamber risk。本 SSoT は M0.11.5 retro 2026-05-05-001 の 14 finding 全採用 (commit ffd3848) で発生した **back-fill missing drift** を構造的に塞ぐ。

**schema**:
- `pending.json` 完全 schema: §6.9.6（schema_version 1 → 2 で `applied_in` + `apply_history` field 追加）
- `applied_summary.json` 完全 schema: §6.9.7

**保存 path 規約**:
- `<project>/.claude-loom/retro/<retro_id>/pending.json`（既存、`applied_in` + `apply_history` field 追加）
- `<project>/.claude-loom/retro/<retro_id>/applied_summary.json`（新設、retro session 単位の per-instance file）

#### 3.9.12 Retro state durability（2026-05-04 retro F-meta-002 由来）

`<project>/.claude-loom/` は `.gitignore` 対象 (local-only)、M5 t5 の incident で `.claude-loom/retro/` が削除されると過去 retro pending.json が消失、`applied_summary` build 不能（graceful skip は症状対処）。下記 durability mechanism を SPEC SSoT 化：

- **archive markdown SSoT**: `<project>/docs/retro/<retro_id>-report.md` は git-tracked、過去 retro の findings + applied/recorded status を可読形式で永続保存。これは M0.8 から既存の機構、本 SPEC 改訂で **retro state durability の primary SSoT** として位置付け
- **pending.json は cache layer**: `.claude-loom/retro/*/pending.json` は archive markdown から **再生成可能な cache** として扱う、消失時は archive markdown から reconstruct (manual or M0.11.2 milestone で auto reconstruction logic 導入候補)
- **retro-pm Stage 0 fallback**: applied_summary build 時 pending.json 不在なら graceful skip + WARN 出力、archive markdown scan による applied/recorded status 抽出は **M0.11.2 milestone で導入候補** (本 SPEC では durability boundary を define するのみ、reconstruction logic は別 milestone)
- **uninstall.sh との関係**: `--purge-state` flag で `.claude-loom/` 削除しても archive markdown は残存、retro 履歴の git-tracked SSoT を user に保証

#### 3.9.13 Degraded synthesis protocol（2026-05-04 retro F-meta-005 由来 + 2026-05-06 F-meta-001 で probe 強制化 + persistence escalation）

Task tool unavailable 時 (degraded mode) に retro-pm が 4 lens dispatch 不能、自前で synthesis する flow が ad-hoc。下記 protocol を SPEC SSoT 化：

- **degraded mode probe 強制化** (2026-05-06 F-meta-001): retro-pm Stage 0 開始時に **必ず `ToolSearch select:Task` を走らせる**、空結果 → degraded mode 自動 enter（手動 verbal fallback 宣言を不要化）。本 protocol は agent definition (`agents/loom-retro-pm.md`) の Stage 0 hook として codified
- **degraded mode 検出**: retro-pm session 開始時 Task tool 利用可否 check、不可 → degraded mode 突入を user に明示宣言
- **synthesis 自前実施**: retro-pm が 4 lens (pj-axis / process-axis / meta-axis / researcher) の責務を sequential 実行、各 lens の prompt 規約 (RETRO_GUIDE.md §1) を self-apply
- **echo-chamber risk acknowledge**: 通常 protocol の 4 並列 lens + counter-arguer 別 agent による echo-chamber 抑制が degraded mode では適用されず、findings は **retro-pm 単一視点の synthesis**。confidence は通常 retro より低めに評価
- **findings tag 必須**: degraded mode 由来 findings は全て `degraded_mode_synthesis: true` field を含む、user に透明化
- **archive markdown disclosure**: archive markdown 末尾に "degraded-mode-synthesis disclosure" section を必須記載、findings の confidence について user に明示
- **schema_version 出力規律**: retro-pm が pending.json を新規 write する時 `schema_version: 2` 必須 (§6.9.6 v2、§6.9.6.1 SSoT 統一表組参照)、`schema_version: 1.0.0` 等の semver 形式 / v1 形式 出力は invalid (本 retro session で発生した bug の codify)
- **persistence escalation rule** (2026-05-06 F-meta-001): degraded mode が **3 retro 連続持続** したら本 §3.9.13 の review 必須。Task tool 復旧条件 (Claude Agent SDK env 制約 / harness 起動 mode 制約) を user + meta lens で再評価、agent definition update or workaround codify を進める

##### 3.9.13.1 3-strike trigger 後の必須 action items（2026-05-06-002 retro F-proc-003 由来、SSoT）

degraded mode が 3 retro 連続持続して escalation rule が trigger された時点で、retro-pm + PM 連携で下記 action を必須執行する：

1. **path C default 昇格の追認**: §3.6.8.7 path C default 反転 (2026-05-06) を SSoT として確認、「degraded」呼称を内部 detection 用語に縮退、user 向け呼称は **first-class operating mode** へ正規化（path C は abnormal fallback ではなく Claude Agent SDK 環境での通常運用 mode）
2. **subordinate research task 起票** (HARD blocker ではなく Phase 内並行調査): Task tool availability の Claude Code 公式 API upstream 調査を `docs/research/task-tool-availability.md` に新設し、Phase の中で並行で進める。完了は milestone closure / Phase 移行の HARD blocker にしない
3. **probe 標準化の再確認**: agents/loom-retro-pm.md の `Degraded mode protocol` section に `ToolSearch query="select:Task" max_results=1` の標準 probe 手順が明記されとるか audit、不明なら更新
4. **archive 透明化**: 該当 retro archive markdown 冒頭に `escalation_status: 3-strike-trigger-N回目` を必須記載、user に escalation 進行を可視化
5. **synthesis confidence 注釈**: 3-strike 達成 retro の findings は通常 retro より一段 confidence を下げて評価、approval flow で user に明示

**rationale**: 2026-05-05-001 / 2026-05-06-001 / 2026-05-06-002 の 3 連続 degraded mode 発生で 1 回目 trigger 達成、本 subsection が初適用 case。Phase 2 entry を blocker で留めるよりも path C を first-class 化して進行を維持し、Task tool 復旧調査は subordinate research として並行で進める判断 (累積 evidence: M0.11.5 6/6 dispatch 全部 path C で pass、運用 fit 立証済)。

##### 3.9.13.2 N-strike persistence count tracking（retro 2026-05-06-003 F-meta-001 由来）

3-strike trigger 達成後も degraded mode が持続する場合、escalation status を **N-strike-continuation form** で継続記録する。本 subsection で transparency tracking を SSoT 化：

**escalation_status field 表記 (pending.json + user-prefs.json retro_session_history 共通)**:

| 状態 | 表記 example | 意味 |
|---|---|---|
| 1〜2 retro 連続 | `1-strike` / `2-strike` | accumulating (3-strike trigger 未達) |
| 3 retro 連続 (初 trigger) | `3-strike-trigger-1st` | 初 trigger、§3.9.13.1 必須 action 5 項目発動 |
| 4 retro 連続以降 | `4-strike-continuation` / `5-strike-continuation` / ... | trigger 後の持続記録 (transparency) |

**記録方法**:
- `pending.json` の root level に `escalation_status` field を retro-pm が write する (既存 schema_version 2 に追加)
- `~/.claude-loom/user-prefs.json` の `retro_session_history[].escalation_status` field に同値を mirror (aggregator が session 完了時 update)

**future trigger 候補 (codify、未発動)**:

- **6-strike continuation**: 6 retro 連続持続したら、Task tool 復旧調査 (`docs/research/task-tool-availability.md`) を **HARD blocker promotion 検討 trigger** とする。3-strike では subordinate research に留めたが、6-strike では Phase 移行 blocker として user 判断仰ぐ。**未発動、現時点では future codify**
- **9-strike continuation**: 9 retro 連続持続したら、path C default を **正規 default** として SPEC §3.6.8.7 から「default 反転 (2026-05-06)」のような暫定的呼称を除去、運用は first-class operating mode と完全 codify

**rationale**: 2026-05-05-001 (1-strike) → 2026-05-06-001 (2-strike) → 2026-05-06-002 (3-strike-trigger-1st) → 2026-05-06-003 (4-strike-continuation) の累積で escalation rule の運用が始まった。trigger 後の transparency が無いと「1 度発動したらそれっきり」になり、Phase 2 entry や Task tool 復旧 timing の判断材料が失われる。本 codify で N-strike continuation を継続可視化、6+ で blocker promotion 議論を可能化する。

**guidance lifecycle 統合**:
`learned_guidance` の auto-prune rule（§6.9.4 末尾拡張参照）: `ttl_sessions` main（`null` = infinite default、`> 0` = N retro 後 auto-deactivate） + `last_used_in` audit（retro 参照時 aggregator update、N session 連続未使用 → meta lens stale guidance finding）。責務分離: auto-deactivate = 決定論的（ttl）、user 承認 prune = dynamic（last_used_in 経由 meta lens proposal）。

#### 3.9.14 Carryover escalation rule（2026-05-06 retro F-proc-004 由来）

retro carryover findings (前 retro で defer された pre-existing test failures や architectural debt) が無期限残置されると carryover の意味が薄れ、**累積負債が milestone 進行を silent に阻害**する構造的 risk。下記 escalation rule を SPEC SSoT 化：

- **carryover 検出**: retro-pm Stage 0 で `applied_summary.json` build 時、`status: "deferred"` の finding を origin_retro_id 別に集計
- **連続未解決 count**: 同 finding が **3 retro 連続 deferred** state で残置されとる場合（applied_summary 内の `applied_in: null` + `status: "deferred"` が 3 retro 連続）、retro-pm Stage 1 dispatch 前に PM agent に escalation event を発火
- **escalation 必須 action**: 発火時、PM agent は user に「以下 N 件 carryover finding が 3 retro 連続未解決、専用 fix milestone (M0.X-debt-cleanup 仮称) を PLAN.md に insert すべき」と提案し、user 承認後 PLAN.md insertion を必須化
- **専用 fix milestone scope 例**: `M0.X-test-debt-cleanup` (pre-existing test failures cluster fix)、`M0.Y-spec-drift-cleanup` (累積 SPEC drift 一括 reconcile)、`M0.Z-doc-consistency-cleanup` (DOC_CONSISTENCY_CHECKLIST 自動化前段の手動 sweep)
- **目的**: carryover の意味回復 (defer ≠ 無視)、累積負債を milestone scope に格上げして可視化、Phase 2 移行前の cleanup loop 起動

**M0.11.5 retro 適用 case**: pre-existing test failures 3 件 (`docs_release_test.sh` / `dry_run_applied_summary_test.sh` / `m1_docs_test.sh`) は M0.X 系列で 3 retro 連続 carryover、本 retro F-proc-004 で escalation rule が適用された初例。専用 fix milestone は本 retro 後の PLAN.md insertion で対応。

#### 3.9.15 Command frequency probe (data-driven retro context)（2026-05-06-002 retro F-USER-004 由来）

retro architecture を data 駆動化し、Phase 2 candidate prioritization に reality data を提供するための probe 機構。

- **collection**: `hooks/post_tool.sh` 内で `tool_name == "SlashCommand"` を check、command name を `~/.claude-loom/command-frequency.log` に append。format `<unix_ms> <session_id> <command_name>` の 1 line / event
- **opt-out**: `LOOM_NO_FREQUENCY_LOG=1` env 経由で session 単位 disable (privacy concern 用)、`LOOM_FREQUENCY_LOG=<path>` で log path override 可能
- **lifecycle**: log は append-only、size cap / rotation は M4 doc consistency engine の collateral として後続 codify (本節時点では simple text log)
- **retro Stage 0 拡張**: `loom-retro-pm` が verdict_evidence + applied_summary build に続き、command-frequency.log を直近 N 日分集計 → 4 lens の Stage 1 dispatch prompt に context 注入。lens 側は invocation pattern (e.g., `/loom-spec` 高頻度 + `/loom-go` 低頻度 = spec phase ceremony 過剰の signal) を Phase 2 candidate prioritization 軸として活用
- **責務分離**: probe 自体は post_tool hook の bash 内で完結 (daemon 経由不要、daemon 停止時も収集継続可能)。集計・lens 注入は retro-pm Stage 0 の Read tool 経由
- **目的**: Phase 1 までの retro は code state + git log を主 evidence としていたが、user 行動 (どの slash command を何回使うか) という reality data の欠落で「使用頻度が低い command を rich 化」のような誤った prioritization を生むリスクがあった。frequency log 導入で reality data 駆動の prioritization を可能化
- **silent failure 検出強化 (retro 2026-05-06-003 F-meta-004 由来)**: `~/.claude-loom/command-frequency.log` 不在時、retro-pm Stage 0 は **空 tally で proceed するだけでなく warning log を出力** (`log_warn "command-frequency.log not found at <path>; post_tool hook may not be wired or LOOM_FREQUENCY_LOG override mismatched"`)。post_tool hook が actual 発火しとるかを Bash で path 検証 (`ls -la ~/.claude-loom/command-frequency.log` 等)、log 不在が連続検出される場合は M0.X-hook-ingest-recovery scope の post_tool hook investigation task を retro-pm が PM に escalation 提案する
- **SDK input 依存 (retro 2026-05-06-004 F-pj-007 由来、α post-tag t6 fix で actual 解決)**: command name 抽出は Claude Code SDK の **stdin JSON input** から `.tool_name` + `.tool_input.command` を `jq` parse する path が primary (REQ-057)。env var (`CLAUDE_TOOL_NAME` / `CLAUDE_TOOL_INPUT_COMMAND` / `CLAUDE_TOOL_INPUT`) は **fallback chain** として残置 (test invoke / interactive 起動時の compat)、SDK が env var を set せん仕様で env-only path は永久 false negative になる。`hooks/post_tool.sh` 実装は `if [ ! -t 0 ]; then HOOK_STDIN=$(cat); fi` で stdin 利用可能時のみ read、`jq` 不在環境では env var fallback に degrade。CMD_NAME=`unknown` log entries は SDK env var が set されとらん環境 (= 通常の Claude Code session 経由 invoke) を示す signal、stdin reading 経由なら command name が正常に extract される

#### 3.9.16 Pending Lifecycle Architecture（M0.11.2 から、retro 2026-05-03-001 meta-003 由来）

M0.11.1 で確立した **applied finding lifecycle tracking** (§3.9.11) の **pending side 拡張**。`status: pending` のまま carryover される finding が permanent に積み上がる pattern を構造的に解決する。retro origin: `docs/retro/2026-05-03-001-report.md` finding meta-003 ("'pending として宙ぶらりん状態' が permanent 積み上がる")。

**責務 / write timing**:
- **書込主体**: `loom-retro-pm` が Stage 0 で lazy build (verdict_evidence + applied_summary + command_frequency に続く 4 件目の Stage 0 file)
- **読込主体**: 4 lens template (`skills/loom-retro/SKILL.md` § LENS_PJ / LENS_PROCESS / LENS_META / LENS_RESEARCHER)、Stage 1 で `Read` tool 経由参照
- **build 戦略**: 過去全 retro session の `<project>/.claude-loom/retro/*/pending.json` を scan、`status: "pending"` + `carryover_count >= 1` の finding を集約 → `<project>/.claude-loom/retro/<retro_id>/pending_summary.json` write

**含める scope**: carryover 1+ のみ (本 retro 自身の output / 直近 retro の新規 pending は除外)。lens が「本 retro の新 finding」と「過去 carryover」を混同せん scope clean design。

**lens の責務 — 're-evaluation' 判定 (B1 design、lens 自前)**:

4 lens template は pending_summary を Read、各 carryover finding に対して以下を判定し finding 出力 JSON に reflection：

```typescript
{
  // 既存 lens output fields
  id, category, severity, risk, target_artifact, ...

  // 新規 (pending lifecycle 関連)
  source_pending_id: string | null              // pending_summary 由来なら origin finding id
  re_evaluation_verdict: "still-relevant" | "expired" | "drop" | null
}
```

- `re_evaluation_verdict: "still-relevant"` → counter-arguer + aggregator が **本 retro の新 finding と同等に扱う**、origin pending finding は **promoted** (pending.json で `re_evaluated_in: <current_retro_id>` set)
- `re_evaluation_verdict: "expired"` → 即時 auto-expire (TTL 到達を待たず)
- `re_evaluation_verdict: "drop"` → lens 判定で削除 (state は永続化、lens は意見表明のみ、削除主体は aggregator)
- `re_evaluation_verdict: null` (default) → 通常 finding flow、pending との関連無し

**Auto-expiration policy (A1 design、N retro sessions threshold)**:

`carryover_count >= 3` の finding は **自動 expire** (3-strike rule、§3.9.13 degraded mode escalation と同 number)：

- expiration trigger: retro-pm Stage 0 で pending_summary build 時、`carryover_count >= 3` を検出 → 該当 pending.json の finding に `expired_at: <now_ms>` set
- expired finding は **pending_summary に `status: "expired"` で残す** (b1 design、audit trail 維持)
- expired finding を lens は read するが新規 finding 化はせえへん (record-only として扱う、retry / re-up しない)
- expired finding を user が manually 復活させたい場合は archive markdown から手動 re-create、自動 mechanism は提供せん

**N retro sessions count rule (carryover_count 増分)**:

```
carryover_count = 0  ← 新規 finding (本 retro 出力時の initial value)
carryover_count = 1  ← 次 retro で pending として scan された時に retro-pm が increment
carryover_count = 2  ← さらに次 retro で scan された時
carryover_count = 3  ← 自動 expire trigger、`expired_at` set される
```

increment 主体: retro-pm Stage 0 build 時 (lazy + idempotent — 既に increment 済 retro_id なら skip、`last_seen_in` field で重複 increment 防止)。

**`re_evaluated_in` field (promotion trace)**:

`re_evaluation_verdict: "still-relevant"` で promote された origin pending finding は：

- origin pending.json: 元 finding の `re_evaluated_in: <current_retro_id>` set + `status: "approved"` には移行せず `pending` 維持 (promotion ≠ approval、独立 concept)
- current retro pending.json: 新 finding として entry 追加、`source_pending_id` field で origin reference 保持
- 次 retro Stage 0 で `re_evaluated_in: not null` の pending は **carryover_count increment 対象外** (promote 済として excluded、新 retro の新 finding 側が active carryover として扱われる)

**schema**:
- `pending.json` 完全 schema: §6.9.6 (schema_version 2 → 3 で `carryover_count` + `last_seen_in` + `expired_at` + `re_evaluated_in` field 追加、§6.9.6.1 表組 update)
- `pending_summary.json` 完全 schema: §6.9.8 新設
- lens output JSON 拡張 (`source_pending_id` + `re_evaluation_verdict`) は `skills/loom-retro/SKILL.md` LENS_*_TEMPLATE 内で codify

**保存 path 規約**:
- `<project>/.claude-loom/retro/<retro_id>/pending.json` (既存、新 field 追加)
- `<project>/.claude-loom/retro/<retro_id>/pending_summary.json` (新設、retro session 単位 per-instance file)

**§3.9.14 (Carryover escalation rule) との関係**:

§3.9.14 は **`status: "deferred"`** の finding が 3 retro 連続未解決時の専用 fix milestone insertion proposal。本 §3.9.16 は **`status: "pending"`** finding の lifecycle 構造化。両者は orthogonal:

- `deferred` finding → §3.9.14 escalation: 専用 fix milestone (e.g., M0.X-debt-cleanup) を PLAN.md に insert proposal
- `pending` finding → §3.9.16 lifecycle: auto-expire (3-strike) + lens re-evaluation で structural cleanup

両 rule の coexistence によって retro state debt の 2 軸 (defer 系 + pending 系) を独立に管理可能。

**Migration policy**:

既存 retro session の `pending.json` (schema_version 2) に対して、M0.11.2 task で migration script を実装：

- `carryover_count: 0` (initial)
- `last_seen_in: <self_retro_id>` (own retro_id を default)
- `expired_at: null`
- `re_evaluated_in: null`
- schema_version `2 → 3` flag

migration 後の lens 動作: 既存 pending finding は `carryover_count: 0` でも本 retro Stage 0 で +1 increment、3 retro 後に expire 開始。

### 3.10 superpowers Independence（M0.9 から）

claude-loom は **superpowers plugin に依存せずに完結する** ことを設計目標とする。

- M0.9 時点で `loom-write-plan` / `loom-debug` skill を新設し、claude-loom 自前で spec → plan → implement → debug の workflow を完結
- claude-loom 固有の **workflow 品質ゲート** となる skill（`loom-tdd-cycle` / `loom-review` (single + trio strategies) / `loom-retro` / `loom-test` / `loom-status`）は loom-* 版を使う（agent prompt で mandate）。それ以外（`loom-write-plan` / `loom-debug` 等の suggest 系）は agent の自律的 skill discovery に委ね、blanket な「loom-* > superpowers」優先は強制しない
- 残る superpowers skill（brainstorming / executing-plans / verification-before-completion 等）は claude-loom の `loom-pm` / `loom-developer` agent prompt 内に同等動作が記述済みのため、独立 skill 化はしない（YAGNI）
- 将来 superpowers が global uninstall された場合でも、claude-loom 単独で全 milestone を進められる

#### 3.10.1 Skill Mandate vs Suggest 使い分け（M0.14 から）

agent prompt 内の skill 参照は **mandate**（強制）と **suggest**（推奨）を区別する。これは agent の自律的 skill discovery（"1% chance でも invoke" ルール）と claude-loom の品質ゲートを両立するための原則。

**mandate skill** — workflow 品質ゲートとなる skill。逸脱すると review reject される類。

| 場面 | mandate skill | 理由 |
|---|---|---|
| TDD discipline（実装/修正時） | `loom-tdd-cycle` | claude-loom の Red→Green→Refactor→Review cycle 規律 |
| commit 前 review gate | `loom-review` (strategy=single default / strategy=trio opt-in via review_mode) | Reviewer verdict を quality gate とする SPEC §3.6.8.7 規約 |
| milestone 完了後 retro | `loom-retro` | 4 lens × counter-argument の 3 段階プロトコル必須 |
| harness self-test | `loom-test` | claude-loom 固有の install/agent/command/skill test |
| harness status 確認 | `loom-status` | claude-loom 固有のスナップショット |

agent prompt 記述形式: `「X 時は Y skill を使う」`（命令形）

**suggest skill** — 最適化候補。他の skill / approach でも目的達成可能で、agent の自律的判断を阻害せん書き方をする。

| 場面 | suggest skill | 代替手段 |
|---|---|---|
| Refactor phase での再利用/品質改善 | `simplify` | 直接 refactor、`loom-debug` 経由の root-cause refactor |
| permission 拒否多発時の env 改善 | `fewer-permission-prompts` | 手動 settings.json 編集 |
| 定型作業反復時の hook/permission 設定 | `update-config` | 手動 settings.json 編集 |
| keybind 改善機会 | `keybindings-help` | 手動 keybindings.json 編集 |
| 実装 plan 作成 | `loom-write-plan` | inline spec edit（M0.13 から brainstorm-with-spec 化済） |
| 系統的 debug | `loom-debug` | ad-hoc debugging |

agent prompt 記述形式: `「X 時の候補として Y skill。他の skill / approach も可」`（推奨形）

**運用原則**:
- mandate skill の追加は SPEC 改訂を伴う（品質ゲート増設）
- suggest skill の追加は agent prompt 単体更新で可
- retro lens は suggest skill の活用機会を検出し finding 化する（`process-axis` lens の責務、§3.9 参照）

#### 3.10.2 Agent prompt 設計原則（M0.17 から）

claude-loom の `agents/*.md` は **Claude Code に loom-specific なロールを overlay する** ための prompt であり、ゼロから AI agent を構築する prompt ではない。

**設計原則の SSoT**: `docs/AGENT_PROMPT_DESIGN.md` を参照。

要旨：

- **2-layer 構造**: Reasoning layer (mission / character / workflow semantic / judgment axes、薄く judgment を Claude Code に委ねる) + Contract layer (interface contracts / file paths / hard constraints、precise に prescribe)
- **Anti-patterns**: mechanical keyword matching / Claude Code 基本能力の再教示 / prompt template verbatim 固定 / step-by-step bash command prescription / historical retro reference embed / replicated structure across sections
- **Size guideline**: PM 200-250 行 / developer 150-200 行 / reviewer 100-150 行（specialized 80-120 行）/ retro-pm 150-200 行 / retro lens 80-120 行
- **SPEC → prompt の単方向 flow**: prompt 側で新 rule を発明せえへん。SPEC §X.X SSoT がある内容は引用 1 行に圧縮、過去の retro 由来 tactical rule は SPEC 昇格後に prompt 反映

agent prompt の新規作成・改修時は本 SPEC §3.10.2 + `docs/AGENT_PROMPT_DESIGN.md` の verification checklist 9 項目を満たすこと。

## 4. アクター（エージェント）定義

### 4.1 ロール一覧

| ロール | 体数 | 起動者 | 配布 |
|---|---|---|---|
| PM | 1（singleton） | ユーザーが `/loom-pm` で起動 | `.claude/agents/loom-pm.md` (system prompt) |
| Developer | 1〜N（PJ ごと max 設定） | PM が Task tool でディスパッチ | `.claude/agents/loom-developer.md` |
| Retro PM | 1（per retro session） | `/loom-retro` で起動 | `.claude/agents/loom-retro-pm.md` |
| Reviewer (single + trio strategies) | task-scoped、persistent identity 無し | Developer が `loom-review` skill 経由で `general-purpose` subagent + skill template injection で dispatch (single = 1 体、trio = 3 体並列) | `.claude/skills/loom-review/SKILL.md` (template SSoT) |
| Retro lens / counter-arguer / aggregator | task-scoped、persistent identity 無し | Retro PM が `loom-retro` skill 経由で `general-purpose` subagent + skill template injection で dispatch (Stage 1 = 4 体並列、Stage 2 = 1 体、Stage 3 = 1 体) | `.claude/skills/loom-retro/SKILL.md` (template SSoT) |

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

#### 4.2.3 Reviewer (`loom-review` skill、agent file なし)

review は agent 単位の persistent role ではなく **`skills/loom-review/SKILL.md` 経由の 1-shot subagent dispatch** で実施する (2026-05 architectural cleanup、`docs/SKILL_MIGRATION.md` 参照)。

- **single strategy** (default、`review_mode=single`): 1 Task call、`subagent_type="general-purpose"`、`SINGLE_REVIEWER_PROMPT_BODY` template inject、3 観点 (code / security / test) を sequential 評価、各段階で進捗 marker 出力、aspect-tagged findings 配列 + verdict を 1 JSON で返却
- **trio strategy** (opt-in、`review_mode=trio`): 1 message 内 3 parallel Task calls、各 `subagent_type="general-purpose"`、`CODE_REVIEWER_PROMPT` / `SECURITY_REVIEWER_PROMPT` / `TEST_REVIEWER_PROMPT` をそれぞれ inject、各 1 aspect 専で独立 JSON 返却、Developer が集約
- **token コスト**: single ≒ trio の 1/3、modern Claude (Opus/Sonnet 4.x) の多観点単一パス能力を活用
- **strategy 切替**: `.claude-loom/project.json` の `rules.review_mode` で default 指定、`[loom-meta] review_mode=...` で per-task 上書き可

> ピクセル RPG GUI のキャラ表現は trio strategy 時のみレビュー室に 3 人並ぶ絵が成立。single strategy は 1 人キャラが 3 観点バッジを順次表示する設計。

#### 4.2.4 Retro PM (loom-retro-pm)

retro session orchestrator (persistent role)。Stage 0 file build (verdict_evidence / applied_summary / command_frequency) + Stage 4 presentation (conversation / report mode) を直接担当。Stage 1-3 (lens / counter-argument / aggregation) は `skills/loom-retro/SKILL.md` の template を read して `general-purpose` subagent + template injection で dispatch する。詳細責務: §3.9。

#### 4.2.5 Retro pipeline (`loom-retro` skill、agent file なし)

Retro の Stage 1 lens (pj-axis / process-axis / meta-axis / researcher) + Stage 2 counter-arguer + Stage 3 aggregator は agent 単位の persistent role ではなく **`skills/loom-retro/SKILL.md` 経由の 1-shot subagent dispatch** で実施する (2026-05 architectural cleanup、`docs/SKILL_MIGRATION.md` 参照)。

- Stage 1 lens template: LENS_PJ / LENS_PROCESS / LENS_META / LENS_RESEARCHER
- Stage 2 counter-arguer template: COUNTER_ARGUER_TEMPLATE
- Stage 3 aggregator template: AGGREGATOR_TEMPLATE

### 4.3 Developer / Reviewer プール管理

- プロジェクトごとに `max_developers` を設定（default: 3）。reviewer / retro lens は agent file を持たず skill-dispatch ゆえ pool 不要、developer 1 体あたり review_mode に応じた subagent (single=1 / trio=3 並列) が dispatch される
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
    review_mode == "single" → loom-review skill (single strategy) で general-purpose subagent 1 体 dispatch
    review_mode == "trio"   → loom-{code,security,test}-reviewer 3 体並列ディスパッチ

[5a] Reviewer (single mode、default)
     skill template が順次 3 観点回し、各段階で進捗テキスト出力
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
  max_reviewers           INTEGER NOT NULL DEFAULT 1,   -- single mode default
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
    "max_reviewers": 1,
    "max_code_reviewers": 1,
    "max_security_reviewers": 1,
    "max_test_reviewers": 1
  },

  "rules": {
    "tdd_required": true,
    "branch_pattern": "<type>/{short-kebab-name}",
    "branch_types": ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore"],
    "commit_prefixes": ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"],
    "commit_language": "any",
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
| `rules.commit_prefixes` | — | 11 種（CC type 全部） | コミット prefix の有効値（`feat`/`fix`/`docs`/`style`/`refactor`/`perf`/`test`/`build`/`ci`/`chore`/`revert`） |
| `rules.review_mode` | — | `"single"` | `"single"` (default、`loom-review` skill single strategy = 1 体) or `"trio"` (skill trio strategy = 3 体 parallel) |
| `rules.branch_types` | — | 10 種（CC type 準拠、`revert` 除く） | branch 名 prefix の有効値リスト |
| `rules.commit_language` | — | `"any"` | コミット件名/本文の言語ポリシー：`"any"` / `"english"` / `"japanese"` |
| `rules.coexistence_mode` | — | `"full"` | `"full" | "coexist" | "custom"` — 機能 ON/OFF の mode（M0.12 から） |
| `rules.enabled_features` | — | `["all"]` | feature group 名（`"core" | "retro" | "customization" | "worktree" | "native-skills"`）または `["all"]` shorthand（M0.12 から） |
| `consistency_engine.*` | — | (上記) | エンジン挙動 |

### 6.9.1 `~/.claude-loom/user-prefs.json` 完全スキーマ（M0.8 から）

retro が auto-update する user 横断学習状態。

```json
{
  "$schema": "https://claude-loom.dev/schemas/user-prefs-v1.json",
  "schema_version": 1,

  "default_retro_mode": "conversation",

  "lenses": {
    "pj-axis":      { "weight": 1.0, "enabled": true },
    "process-axis": { "weight": 1.0, "enabled": true },
    "researcher":   { "weight": 1.0, "enabled": true },
    "meta-axis":    { "weight": 1.0, "enabled": true }
  },

  "auto_apply": {
    "categories": [],
    "max_risk": "never"
  },

  "approval_history": {
    "spec-drift-doc-update": {
      "presented_count": 0,
      "approved_count": 0,
      "rejected_count": 0,
      "last_updated": 0
    }
  },

  "communication_style": {
    "verbosity": "balanced",
    "language_preference": "ja"
  },

  "retro_session_history": []
}
```

| フィールド | 必須 | デフォルト | 説明 |
|---|---|---|---|
| `schema_version` | ✓ | 1 | スキーマバージョン |
| `default_retro_mode` | — | `"conversation"` | retro mode default：`"conversation"` / `"report"` |
| `lenses.<id>.weight` | — | 1.0 | lens 重み |
| `lenses.<id>.enabled` | — | true | lens 有効化フラグ |
| `auto_apply.categories` | — | `[]` | 自動適用 opt-in category 一覧 |
| `auto_apply.max_risk` | — | `"never"` | 自動適用 risk threshold：`"never"` / `"low"` / `"medium"` / `"high"` |
| `approval_history.<category>.*` | — | 0 | meta-axis 観察用、retro auto-update |
| `communication_style.verbosity` | — | `"balanced"` | `"terse"` / `"balanced"` / `"verbose"` |
| `communication_style.language_preference` | — | `"ja"` | `"ja"` / `"en"` / `"auto"` |
| `retro_session_history` | — | `[]` | 過去 retro session の id / project / completed_at 一覧（archive と相互参照） |

### 6.9.2 `<project>/.claude-loom/project-prefs.json` 完全スキーマ（M0.8 から）

retro が auto-update する PJ 固有学習状態。`project.json`（human spec、static）と分離。

```json
{
  "$schema": "https://claude-loom.dev/schemas/project-prefs-v1.json",
  "schema_version": 1,

  "lenses": {
    "pj-axis": { "weight": 1.5, "enabled": true }
  },

  "auto_apply": {
    "categories": [],
    "max_risk": "never"
  },

  "last_retro": {
    "id": "2026-04-27-001",
    "milestone": "m0.7",
    "completed_at": 0
  },

  "learned_patterns": {
    "common_blockers": [],
    "frequent_finding_categories": []
  }
}
```

| フィールド | 必須 | デフォルト | 説明 |
|---|---|---|---|
| `schema_version` | ✓ | 1 | スキーマバージョン |
| `lenses.<id>.*` | — | （未定義時 user-prefs fallback）| PJ 固有 override |
| `auto_apply.*` | — | （同上） | PJ 固有 auto-apply policy |
| `last_retro.id` | — | — | 直近 retro session id |
| `last_retro.milestone` | — | — | 直近 retro 対象 milestone（manual の場合 `"manual"`）|
| `last_retro.completed_at` | — | 0 | UNIX timestamp |
| `learned_patterns.common_blockers` | — | `[]` | この PJ で繰り返し検出された blocker パターン |
| `learned_patterns.frequent_finding_categories` | — | `[]` | この PJ で頻出する finding category |
| `ui.auto_launch` | — | `true` | `false` で SPEC §3.2 lazy daemon auto-launch flow (step 2-5) を skip。PJ 単位の永続 opt-out。precedence: project-prefs > user-prefs > default `true`（M0.11.5 から） |

### 6.9.3 Effective config 計算規則

retro 開始時、project が user を field 単位 override：

- `effective.lenses[L]` = `project_prefs.lenses[L]` if defined else `user_prefs.lenses[L]`
- `effective.auto_apply.categories` = `project_prefs.auto_apply.categories` if defined else `user_prefs.auto_apply.categories`
- `effective.auto_apply.max_risk` = `project_prefs.auto_apply.max_risk` if defined else `user_prefs.auto_apply.max_risk`

設計理念: user-prefs = user の claude-loom 全体での好み（default）、project-prefs = 当 PJ の policy（override）。同 user が異なる PJ で異なる policy を運用可能。

### 6.9.4 `agents.*` セクション schema（M0.9 から）

`user-prefs.json` および `project-prefs.json` 共通で以下の field を許可：

```json
{
  "agents": {
    "<agent-name>": {
      "model": "opus|sonnet|haiku",
      "personality": "<preset-name>"
    }
  }
}
```

#### 6.9.4.1 Field 仕様

| field | type | 値域 | default |
|---|---|---|---|
| `model` | `string \| null` | `"opus"` / `"sonnet"` / `"haiku"` | agent frontmatter の `model:` |
| `personality` | `string \| object \| null` | preset 名文字列 OR `{ preset, custom }` object | `"default"` |
| `learned_guidance` | `array<object> \| null` | retro 承認 finding の蓄積、各 entry は `{id, added_at, from_retro, from_finding_id, category, guidance, active, ttl_sessions, use_count}` | `[]` |

#### 6.9.4.2 Personality 短縮形と完全形

短縮形（preset 名のみ）:

```json
"personality": "friendly-mentor"
```

完全形（preset + custom 補強）:

```json
"personality": {
  "preset": "friendly-mentor",
  "custom": "ただし TDD 違反時は厳しく指摘"
}
```

`custom` は preset 本文の **末尾に append** される。

#### 6.9.4.3 Precedence rule

```
final_value = project_prefs.agents[name].field
           ?? user_prefs.agents[name].field
           ?? agent_frontmatter.field
```

- 値が `null` または key 不在 → 次の層へ fallback
- M0.8 既存 merge rule（project > user）と同一原則

#### 6.9.4.4 同梱 personality preset

| preset | キャラ | ファイル |
|---|---|---|
| `default` | 中立・専門的（注入実質スキップ） | `prompts/personalities/default.md` |
| `friendly-mentor` | 優しい講師（初心者向け） | `prompts/personalities/friendly-mentor.md` |
| `strict-drill` | クールな coding pro（上級者向け） | `prompts/personalities/strict-drill.md` |
| `detective` | 迷宮なしの名探偵（関西弁） | `prompts/personalities/detective.md` |

ユーザー独自 preset を作りたい場合は `prompts/personalities/<custom-name>.md` を追加し、prefs に preset 名を指定。

#### 6.9.4.5 learned_guidance auto-prune rule（M0.11.1 から）

M0.11 で「v1 manual prune」と意識的 deferral 決定された learned_guidance lifecycle を M0.11.1 で structural 自動化。`learned_guidance` schema に `last_used_in` field を追加 + 2 mechanism hybrid auto-prune を導入。

```ts
const learnedGuidanceSchema = z.object({
  // 既存 field (M0.11 から)
  id: z.string(),
  added_at: z.string(),                                 // ISO date
  from_retro: z.string(),
  from_finding_id: z.string(),
  category: z.string(),
  guidance: z.string(),
  active: z.boolean(),
  ttl_sessions: z.number().int().nullable(),            // null = infinite default、> 0 = N retro 後 auto-expire
  use_count: z.number().int().default(0),

  // M0.11.1 新設
  last_used_in: z.string().nullable().optional(),       // 最終参照 retro_id、null = 未使用
});
```

**auto-prune 2 mechanism**:

1. **`ttl_sessions` main（auto-deactivate、決定論的）**: aggregator が retro 終了時に以下 logic 実行
   - 各 active learned_guidance について `retro_session_distance = current_retro_session_count - first_retro_session_index_after_added_at`
   - `ttl_sessions != null && retro_session_distance >= ttl_sessions` → `active: false` 自動化
   - `ttl_sessions: null`（default）は infinite、break compat なし
2. **`last_used_in` audit（proposal、dynamic）**: meta lens が Stage 1 で以下 audit 実行
   - 各 active learned_guidance の `last_used_in` を確認
   - `current_retro_id - last_used_in > 3`（N retro session 連続未使用、3 は threshold initial value）→ "stale guidance" として meta-axis finding 化
   - user 承認後 deactivate（auto じゃない、user 主導）

**lens 参照時の `last_used_in` update**: 各 retro lens が learned_guidance を Customization Layer 経由で injection した時、aggregator が retro 終了時に該当 guidance の `last_used_in: <current_retro_id>` を update（lens は read のみ、write は aggregator 中央集権、責務分離）。

### 6.9.5 `<project>/.claude-loom/retro/<retro_id>/verdict_evidence.json` 完全スキーマ（M2.1 から）

retro session 開始時に `loom-retro-pm` が write する per-retro-instance file。schema は zod で定義され、daemon (M3+) からも `import type { VerdictEvidence } from "@claude-loom/daemon"` で参照可能（M3 以降で daemon-side 永続化検討）。proc-003 finding 起源、概念 / write timing は §3.9.10 参照。

```ts
import { z } from "zod";

export const verdictEvidenceSchema = z.object({
  schema_version: z.literal(1),
  retro_id: z.string(),                        // e.g., "2026-05-02-001"
  milestone_tag: z.string(),                   // e.g., "m2-complete"
  created_at: z.number().int(),                // integer ms (Date.now())
  reviewer_dispatches: z.array(z.object({
    task_id: z.string(),                       // PLAN.md HTML comment id, e.g., "m2-t5"
    commit_sha: z.string().nullable(),         // 40-char SHA or null (commit handoff anomaly 等で commit 不在)
    reviewer_agent: z.enum([
      "loom-reviewer",                         // single strategy (loom-review skill SINGLE_REVIEWER_PROMPT_BODY が設定する identifier、historical agent 名 互換)
      "loom-code-reviewer",                    // trio strategy code aspect (CODE_REVIEWER_PROMPT が設定する identifier)
      "loom-security-reviewer",                // trio strategy security aspect
      "loom-test-reviewer",                    // trio strategy test aspect
    ]),
    review_mode: z.enum(["single", "trio"]),
    verdict: z.enum(["pass", "fail", "partial"]),
    aspect_findings: z.array(z.object({
      aspect: z.enum(["code", "security", "test"]),
      verdict: z.enum(["pass", "fail"]),
      findings_count: z.number().int().nonnegative(),
      output_ref: z.string().nullable(),       // session transcript ref (e.g., "transcript:skill=loom-review:strategy=single:dispatch=m2-t5") / M3 daemon-side で path 化候補
    })),
    dispatched_at: z.number().int(),
  })),
});

export type VerdictEvidence = z.infer<typeof verdictEvidenceSchema>;
```

**field 説明**:

| field | 説明 | 補足 |
|---|---|---|
| `schema_version` | schema バージョン (`1`) | 将来 breaking change で increment |
| `retro_id` | retro session id | `YYYY-MM-DD-NNN` 形式 |
| `milestone_tag` | 直前 milestone tag | e.g., `m2-complete` |
| `created_at` | 作成 timestamp (ms) | retro_id 採番直後に lazy build した時点 |
| `reviewer_dispatches[]` | dispatch ごとの 1 entry | `[]` 空配列も valid（review 0 件 milestone） |
| `.task_id` | PLAN.md task id | HTML comment `<!-- id: m2-t5 -->` 由来 |
| `.commit_sha` | GREEN commit SHA | commit handoff anomaly で commit 不在の場合 `null`、proc-001 の audit に直結 |
| `.reviewer_agent` | dispatch された reviewer agent name | 4 値 enum |
| `.review_mode` | `"single"`（default 1 体）/ `"trio"`（opt-in 3 体並列） | SPEC §4 / §3.6.6 と整合 |
| `.verdict` | dispatch 全体の verdict | `partial` は trio mode で一部 reviewer fail / 一部 pass |
| `.aspect_findings[]` | 観点別 verdict | single mode = 3 element (code/security/test 順次)、trio mode = dispatch 別 reviewer 出力 |
| `.aspect_findings[].output_ref` | reviewer JSON への text reference | M2.1 時点では transcript ref のみ、M3+ で daemon path 化 |
| `.dispatched_at` | dispatch timestamp (ms) | git log commit timestamp で代用可 |

**lazy build 手順**（`loom-retro-pm` Stage 0 で実行）:

1. `git log --oneline <prev_tag>..<curr_tag>` で milestone 内 commit 列挙
2. 各 commit の commit message から `<!-- id: m2-tN -->` 由来の task_id 推定（commit body or task ref）
3. session transcript（直前 implementation phase）から該当 task_id の reviewer dispatch JSON を抽出
4. PM final report の hint reference があれば優先的に使用（PM hint 機構、§3.9.10 参照）
5. zod schema validate → file write、schema 不整合は warning として log（retro 自体は continue、機能 block しない）

### 6.9.6 `<project>/.claude-loom/retro/<retro_id>/pending.json` 完全スキーマ（M0.8 から、M0.11.1 で v2、M0.11.2 で v3 拡張）

retro session の finding queue + user 確定 verdict + apply trace + pending lifecycle tracking 用 file。M0.8 から運用、M0.11.1 で `applied_in` + `apply_history` field 追加 (v1 → v2)、M0.11.2 で `carryover_count` + `last_seen_in` + `expired_at` + `re_evaluated_in` field 追加 (v2 → v3、§3.9.16 SSoT)。M3.0 retro 起源の **finding lifecycle tracking** SSoT。

```ts
import { z } from "zod";

export const pendingFindingSchema = z.object({
  id: z.string(),                                   // e.g., "pj-001", "proc-NEW-1"
  lens: z.enum(["pj-axis", "process-axis", "researcher", "meta-axis", "user-axis"]),
  category: z.string(),                             // category enum (RETRO_GUIDE §2 参照)
  risk: z.enum(["low", "medium", "high", "medium-high"]),
  auto_applicable_eligible: z.boolean(),
  status: z.enum(["pending", "approved", "for_drop", "for_downgrade", "rejected", "deferred"]),

  // M0.11 から
  target_artifact: z.array(z.enum(["agent-prompt", "spec-section", "doc-file", "retro-config", "test-strategy", "plan-file"])).optional(),
  target_agent: z.array(z.string()).nullable().optional(),
  guidance_proposal: z.string().nullable().optional(),

  // M3.0 retro meta-NEW-1 から (proposal_type 区別)
  proposal_type: z.enum(["symptomatic", "structural", "record-only"]).optional(),

  // M0.11.1 新設 (applied lifecycle tracking)
  applied_in: z.object({
    commit_sha: z.string().nullable(),              // 最新 apply 状態の commit、record-only なら null
    milestone_tag: z.string().nullable(),           // 別 milestone scope で apply された場合
    applied_at: z.number().int(),                   // ms
    apply_type: z.enum(["immediate", "milestone", "record-only", "rollback"]),
  }).nullable(),                                    // applied 前は null
  apply_history: z.array(z.object({
    commit_sha: z.string(),
    applied_at: z.number().int(),
    apply_type: z.enum(["immediate", "milestone", "record-only", "rollback"]),
    note: z.string().optional(),                    // rollback の理由等
  })).default([]),                                  // multi-apply / rollback の trace

  // M0.11.2 新設 (pending lifecycle tracking、§3.9.16)
  carryover_count: z.number().int().nonnegative().default(0),  // 過去 retro 越え count、新規 = 0
  last_seen_in: z.string(),                         // 最後に retro-pm が scan した retro_id (idempotent increment 用)
  expired_at: z.number().int().nullable().default(null),       // carryover_count >= 3 で auto-expire 時 ms、未 expire は null
  re_evaluated_in: z.string().nullable().default(null),        // lens が "still-relevant" promote した先の retro_id、未 promote は null

  // 既存 (M0.8 から)
  applicable_files: z.array(z.string()).optional(),
  summary: z.string(),
  description: z.string().optional(),
  proposal: z.string().optional(),
  approved_at: z.number().int().optional(),
  drop_reason: z.string().optional(),
  pm_note: z.string().optional(),
  origin: z.string().optional(),
  milestone_assignment: z.string().optional(),      // approved + 新 milestone scope 時
});

export const pendingSchema = z.object({
  schema_version: z.literal(3),                      // M0.8 v1 → M0.11.1 v2 → M0.11.2 v3 (pending lifecycle 4 field 追加)
  retro_id: z.string(),
  milestone_tag: z.string(),
  mode: z.enum(["conversation", "report"]),
  executor_protocol: z.enum(["normal", "degraded"]).optional(),
  findings: z.array(pendingFindingSchema),
});

export type Pending = z.infer<typeof pendingSchema>;
export type PendingFinding = z.infer<typeof pendingFindingSchema>;
```

**`apply_type` enum 定義**:

| value | 意味 | 例 |
|---|---|---|
| `immediate` | retro session 内で即時 apply | M3.0 retro meta-NEW-1 (e4aa0ea) |
| `milestone` | 別 milestone scope で apply | M3.0 retro proc-NEW-2 (M0.11.1) |
| `record-only` | commit なし observability | M3.0 retro proc-001 / meta-003 |
| `rollback` | symptomatic patch を構造的解決後に rollback | M0.11.1 closure 時の proc-NEW-1 rollback |

**migration**:
- v1 → v2 (M0.11.1 task `m0.11.1-t7`): `applied_in` + `apply_history` 後付け、apply commit を git log + commit message 解析で推定
- v2 → v3 (M0.11.2 task `m0.11.2-t5`): pending lifecycle 4 field 後付け、`carryover_count: 0` / `last_seen_in: <self_retro_id>` / `expired_at: null` / `re_evaluated_in: null` initial、schema_version `2 → 3` flag

#### 6.9.6.1 schema_version SSoT 統一表組（2026-05-06 retro F-pj-004 + F-meta-002 由来）

retro 系 + prefs 系 file 間で schema_version の format / 値 drift を防ぐため、以下 SSoT 表組を確立：

| file | current schema_version | format | 過去 file 移行 policy |
|---|---|---|---|
| `~/.claude-loom/user-prefs.json` | `1` | integer | leave-as-is、新規 write 時のみ v1 維持 |
| `<project>/.claude-loom/project-prefs.json` | `1` | integer | leave-as-is、新規 write 時のみ v1 維持 |
| `<project>/.claude-loom/retro/<retro_id>/pending.json` | `3` | integer | M0.11.1 task t7 で v1 → v2 migration、M0.11.2 task t5 で v2 → v3 migration (pending lifecycle 4 field 追加)、新規 write は必ず v3 |
| `<project>/.claude-loom/retro/<retro_id>/applied_summary.json` | `2` | integer | 過去 v1.0.0 文字列形式 file は **leave-as-is** (rebuild 時に v2 上書き)、新規 write は必ず v2 |
| `<project>/.claude-loom/retro/<retro_id>/pending_summary.json` | `1` | integer | M0.11.2 から新設、initial v1、新規 write は必ず v1 |
| `<project>/.claude-loom/retro/<retro_id>/verdict_evidence.json` | `2` | integer | M2.1 から v2 が initial、leave-as-is なし |

**format 規律 (degraded mode bug 由来)**:

- ❌ invalid: `"schema_version": "1.0.0"` (semver 文字列形式)
- ❌ invalid: `"schema_version": 1` を v2 schema 期待 file に書く (v2 移行後 deprecated)
- ✅ valid: `"schema_version": 2` (integer、現行 v2)

**新規 write 時の規律**: retro-pm / aggregator が pending.json or applied_summary.json or verdict_evidence.json を新規 write する時は **必ず integer 形式で current schema_version**。過去 file (v1.0.0 文字列) は触らずそのまま、retro-pm Stage 0 lazy rebuild で v2 上書きされるまで共存。

### 6.9.7 `<project>/.claude-loom/retro/<retro_id>/applied_summary.json` 完全スキーマ（M0.11.1 から、M0.11.5 で v2 統一）

retro session 開始時に `loom-retro-pm` が **過去全 retro session の pending.json を scan + 集約** した file。4 lens が Stage 1 で `Read` tool で参照、stale finding re-up を構造的に防ぐ。M2.1 §6.9.5 verdict_evidence.json と同 pattern（lazy build family）。

```ts
export const appliedSummarySchema = z.object({
  schema_version: z.literal(2),                      // M0.11.1 v1 → M0.11.5 v2 (F-pj-004 SSoT 統一、§6.9.6.1)
  retro_id: z.string(),                              // 本 retro session の id (生成元)
  generated_at: z.number().int(),
  total_retro_sessions: z.number().int(),            // scan 対象 retro session 数
  applied_findings: z.array(z.object({
    finding_id: z.string(),                          // 元 retro 内 id (e.g., "pj-001")
    origin_retro_id: z.string(),                     // どの retro session 由来か
    category: z.string(),
    proposal_type: z.enum(["symptomatic", "structural", "record-only"]).optional(),
    summary: z.string(),
    applied_in: z.object({
      commit_sha: z.string().nullable(),
      milestone_tag: z.string().nullable(),
      applied_at: z.number().int(),
      apply_type: z.enum(["immediate", "milestone", "record-only", "rollback"]),
    }),
    last_apply_history_entry: z.object({              // apply_history の最新 entry (rollback case の trace)
      commit_sha: z.string(),
      apply_type: z.string(),
      note: z.string().optional(),
    }).nullable(),
  })),
});

export type AppliedSummary = z.infer<typeof appliedSummarySchema>;
```

**lazy build 5 step**（`loom-retro-pm` Stage 0 で実行）:
1. `<project>/.claude-loom/retro/*/pending.json` を glob、existing retro session list 取得
2. 各 pending.json を read、`status: "approved"` + `applied_in: not null` finding を抽出
3. finding ごとに集約 entry build（`finding_id` + `origin_retro_id` + summary + apply trace）
4. apply_history が rollback entry を含む場合は `last_apply_history_entry` に最新 rollback note を埋め込み（lens に「once applied but later rolled back」を伝える）
5. zod schema validate → file write、schema 不整合は warning として log（retro 自体は continue、機能 block しない）

**lens 注入 mechanism**:
- 4 lens template (LENS_PJ / LENS_PROCESS / LENS_META / LENS_RESEARCHER、`skills/loom-retro/SKILL.md`) の dispatch prompt prefix に `applied_summary_path: <path>` を追加
- lens は category 関連 finding を `Read` tool で参照、stale check を Stage 1 内で自前実行
- M3.0 retro proc-NEW-1 の「counter-arguer 単独 stale check」を構造的に置換、4 lens 全体が stale 判別能力を獲得（root cause 解決、SPEC §3.9.x P4 理想形）

### 6.9.8 `<project>/.claude-loom/retro/<retro_id>/pending_summary.json` 完全スキーマ（M0.11.2 から）

retro session 開始時に `loom-retro-pm` が **過去全 retro session の pending finding を集約** した file。4 lens template (`skills/loom-retro/SKILL.md` § LENS_PJ / LENS_PROCESS / LENS_META / LENS_RESEARCHER) が Stage 1 で `Read` tool で参照、carryover finding の `still-relevant` 再評価 + auto-expire 判定の input として活用。M0.11.1 §6.9.7 applied_summary.json と同 pattern (lazy build family、§3.9.16 SSoT)。

**含める scope**: `status: "pending"` + `carryover_count >= 1` の finding のみ (本 retro 自身の新規 pending は除外、scope clean design)。expired finding (`expired_at: not null`) は audit trail として残す (`status: "expired"` 扱い)。

```ts
import { z } from "zod";

export const pendingSummaryFindingSchema = z.object({
  finding_id: z.string(),                            // 元 retro 内 id (e.g., "pj-001")
  origin_retro_id: z.string(),                       // どの retro session 由来か
  lens: z.enum(["pj-axis", "process-axis", "researcher", "meta-axis", "user-axis"]),
  category: z.string(),
  severity: z.enum(["low", "medium", "high"]).optional(),
  risk: z.enum(["low", "medium", "high", "medium-high"]),
  proposal_type: z.enum(["symptomatic", "structural", "record-only"]).optional(),
  summary: z.string(),
  description: z.string().optional(),

  // pending lifecycle state (§3.9.16)
  status: z.enum(["pending", "expired"]),            // expired は carryover_count >= 3 で auto-flip
  carryover_count: z.number().int().positive(),      // pending_summary は carryover 1+ のみ含むので positive
  last_seen_in: z.string(),                          // 最後に scan された retro_id
  expired_at: z.number().int().nullable(),           // status=expired 時 ms、pending 時 null

  // re-evaluation trace (lens 出力で promote された場合)
  re_evaluated_in: z.string().nullable(),            // null = 未 promote、retro_id = "still-relevant" 判定で promote 済
});

export const pendingSummarySchema = z.object({
  schema_version: z.literal(1),                       // M0.11.2 から initial v1
  retro_id: z.string(),                              // 本 retro session の id (生成元)
  generated_at: z.number().int(),
  total_retro_sessions_scanned: z.number().int(),    // scan 対象 retro session 数
  pending_findings: z.array(pendingSummaryFindingSchema),
});

export type PendingSummary = z.infer<typeof pendingSummarySchema>;
export type PendingSummaryFinding = z.infer<typeof pendingSummaryFindingSchema>;
```

**Lazy build 手順** (retro-pm Stage 0、§3.9.11 + §3.9.16):

1. `<project>/.claude-loom/retro/*/pending.json` を glob (全 retro session)
2. 各 pending.json の `findings` から `status: "pending"` + `carryover_count >= 1` を抽出
3. 同時に `carryover_count` を **idempotent increment**:
   - `last_seen_in === <current_retro_id>` なら skip (既 increment 済)
   - `last_seen_in !== <current_retro_id>` なら `carryover_count + 1`、`last_seen_in: <current_retro_id>` set
   - increment 後 `carryover_count >= 3` なら `expired_at: <now_ms>` set + `status: "expired"` flip (内部、pending.json 側 finding は status 不変、pending_summary 内 status のみ flip)
4. `re_evaluated_in: not null` の finding は **carryover_count increment 対象外** (promote 済として skip、新 retro 側の新 finding が active carryover)
5. pending_summary_findings array に集約 → `<project>/.claude-loom/retro/<current_retro_id>/pending_summary.json` write
6. schema validate (zod) → file 不整合は WARN log、retro 自体は continue

**Lens 読込 + re-evaluation 責務**:

4 lens template が Stage 1 で pending_summary を Read、各 finding に対して以下を判定：

- 本 retro の context (現 SPEC / 現 codebase / 現 git log) で **still relevant** か → finding 出力 JSON に `source_pending_id: <id>` + `re_evaluation_verdict: "still-relevant"` set
- 既に解消済 (state changed) なら → `re_evaluation_verdict: "expired"` (即時 expire)
- lens 判定で削除すべき (誤検出だった) なら → `re_evaluation_verdict: "drop"`
- 通常 finding (pending_summary と無関係) → `source_pending_id: null` + `re_evaluation_verdict: null`

aggregator template が verdict を集約、origin pending.json の `re_evaluated_in` field を update (lazy back-fill)。

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
| `ui.theme` | `system` | テーマ（frontend-design の決定に従う、`system` / `dark` / `light` 等を許容） |
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
| `/loom-retro` | 3-stage retro protocol（4-lens parallel critique → counter-argument → aggregator）。`--report` flag で archive markdown のみ生成。詳細 §3.9 + `docs/RETRO_GUIDE.md` | 0.8 |

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
├── agents/                  ← 3 persistent role only (reviewer / retro lens は skill template に migrate 済)
│   ├── loom-pm.md
│   ├── loom-developer.md
│   └── loom-retro-pm.md
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
├── skills/                  ← workflow + template SSoT。reviewer / retro lens は agent file ではなく skill template として codify (2026-05 architectural cleanup)
│   ├── loom-test/
│   ├── loom-status/
│   ├── loom-tdd-cycle/
│   ├── loom-review/        ← single + trio strategy 統合、aspect template (code / security / test) を内包
│   ├── loom-retro/         ← Stage 0-3 protocol + 4 lens + counter-arguer + aggregator template を内包
│   ├── loom-write-plan/
│   ├── loom-debug/
│   ├── loom-worktree/
│   └── loom-ui-smoke/
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

#### 9.3.1 LOCAL_STATE_DIR safety boundary（retro 2026-05-04-001 F-pj-003 / F-proc-003）

M5 t5 で uninstall.sh が repo の `.claude-loom/retro/` を削除する incident 発生（root cause: `LOCAL_STATE_DIR="${LOOM_STATE_DIR:-${PWD}/.claude-loom}"` で default が repo-local PWD に解決された）。下記 boundary を SPEC SSoT 化：

- **LOCAL_STATE_DIR default は `${HOME}/.claude-loom` 固定**（user state global SSoT）
- **`LOOM_STATE_DIR` env var で override 可能**（test sandbox 用、`mktemp -d` で temp dir に向ける）
- **safety boundary check**: uninstall.sh は実行時に LOCAL_STATE_DIR が git repo 内に解決されとるか check、解決されとる場合は `--repo-state-ok` flag が無ければ refuse + exit code 2
- **`--repo-state-ok` flag**: repo-local state を意図的に対象とする場合（test fixture / 開発時）の明示 opt-in
- **tests/uninstall_test.sh**: 全 test scenario で `LOOM_STATE_DIR=$SBn/.claude-loom` を必ず set、repo-local default に依存せん write boundary 厳密化

### 9.4 依存関係

- bash, jq, curl（hooks 層）
- Node.js >= 20（daemon, UI build）
- Claude Code CLI（`claude` コマンドが PATH に必要）
- SQLite 3（OS バンドルで OK）

---

## 10. テスト戦略

### 10.1 TDD 基本ルール

- main 直コミット禁止、ブランチ単位で /review + /security-review 指摘ゼロ必須
- コミット粒度：Conventional Commits 準拠（11 type — 詳細は §3.8.1 参照、`docs/COMMIT_GUIDE.md` に good/bad 例）
- 1 要件 = 1 ブランチ、1 機能 = 1 コミット

### 10.2 テスト配置

- bash hooks: `tests/*_test.sh`（claude-blog-skill 流儀、自前ハーネス）
- daemon (TypeScript): `daemon/src/**/*.test.ts`（vitest）
- UI: `ui/src/**/*.test.tsx`（vitest + testing-library）
- 統合テスト: `tests/integration/*_test.sh`（daemon 起動 → hook 発火 → DB 検証）

### 10.3 受入要件

`tests/REQUIREMENTS.md` に ID 付きで記録（claude-blog-skill 流儀）。
例：`REQ-001: /loom 実行で daemon が起動し、ブラウザが localhost:5757 を開く`

### 10.4 Browser-interactive verification layer（M0.11.3 から、retro 2026-05-04-001 F-proc-005 拡張）

UI 開発時の test 戦略を **2 層化**：

| Layer | 担当 | 検出する gap |
|---|---|---|
| **Layer 1: bash + automated test** | `bash tests/run_tests.sh` + `pnpm test` (vitest unit + integration) + `pnpm e2e` (Playwright baseline) | 論理 correctness、build / install / unit behavior、既知 baseline regression |
| **Layer 2: browser-interactive smoke** | `loom-ui-smoke` skill (§3.6.11)、Playwright MCP `browser_*` tool 経由 | **実機での描画・WS 流通・state propagation・navigation・interactivity** が automated test mock の隙間に隠れた gap を検出 |

両 layer を **milestone closure default** として実行、F-proc-005 success record の継続的拡張。Layer 2 は UI 開発を含む milestone のみ適用 (suggest skill、§3.10.1)、daemon-only / agent-prompt-only の milestone では skip 可能。

#### 10.4.1 Layer 2.5: PM dogfood smoke（M0.X-runtime-mode-recovery 後 retro 2026-05-06-003 F-USER-009 由来、必須）

**trust recovery milestone series 3 連続発覚 pattern (F-USER-005/006 + F-USER-007/008 + Bug A) は全て Layer 1 + Layer 2 が pass した状態で user 直接 dogfood verify でしか発覚しなかった**。Layer 1 (automated test) と Layer 2 (UI smoke) の隙間に「実 user fixture path」が抜けとる構造的 gap。本 layer はその gap を構造的に塞ぐ：

| Layer | 担当 | 検出する gap |
|---|---|---|
| **Layer 2.5: PM dogfood smoke** | PM agent が milestone tag 設置 **直前** に Bash + curl + (optional) WebFetch で実機 verify | **install path → lazy launch hook 起動 → daemon 起動 → /health + /mode probe → UI HTML 取得 → 重要 endpoint 動作** までの user-facing pipeline 全体の actual 動作 |

**verify steps (PM が milestone closure 直前に必ず実行)**:

1. `bash hooks/loom-launch-ui.sh` (or 同等の lazy launch trigger) を user fixture と同条件で実行
2. `curl -sf http://127.0.0.1:5757/health` → `{"status":"ok"}` 応答確認
3. `curl -s http://127.0.0.1:5757/mode | jq .` → SPEC §3.2.1 shape (mode/entry/version/started_at/pid/ui_serving) 全 field 充足確認
4. `curl -sI http://127.0.0.1:5757/` → `200` + `content-type: text/html` 応答確認 (ui/dist 存在 milestone のみ)
5. milestone scope の他 user-visible endpoint があれば追加 verify
6. 結果を `docs/smoke-tests/<date>-<milestone>-dogfood.md` に出力 (任意 format、key signal 列挙)

**failure handling**:
- Layer 2.5 で **任意の失敗を検出 → tag 設置を block**、failed step を user に報告 + fix task を PLAN.md に追加して closure 延期
- pass のみで tag 設置可、後続の milestone retro hook + branch hygiene PR opening trigger に進む

**rationale**:
- F-USER-005/006 (install / build artifact gap) → install path 通せばすぐ気づく
- F-USER-007/008 (symlink CLI guard / hooks SDK 仕様) → lazy launch + /health probe で immediate 検出
- F-USER-009 / Bug A (NODE_ENV / static serving / port bind verify gap) → / + /mode 直接 curl で immediate 検出
- 3 連続全て Layer 2.5 で Layer 1+2 通過後にも検出可能だった (post-hoc analysis)

#### 10.4.2 Layer 3: user verify request（補助 layer、record only）

**Layer 3 は anti-pattern として明示**：開発側の Layer 2.5 dogfood gap を user 拘束 ("動作確認してくれ") で塞ぐ運用は持続不能 (Phase 2 multi-contributor 時に scale せず、user trust を消耗する)。Layer 3 は補助的に **emergency case (Layer 2.5 で気づけない user environment 固有の issue)** にのみ依存し、default workflow からは除外する。

agents/loom-pm.md milestone closure workflow は Layer 1 → Layer 2 (UI 開発時) → **Layer 2.5 (必須)** → tag 設置 → Layer 3 (user-side、record only) の順序で固定。

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
