# daemon-and-data (topic spec)

> 本 file は claude-loom SPEC の topic spec。master は [SPEC.md](../SPEC.md)、用語表 / 確定済み技術判断 / SSoT 原則は master を参照。
>
> § 番号は本 file 内で local。cross-file 参照は `spec/<other-topic>.md §X.Y` 記法 (master SPEC §3.11.4 SSoT)。
>
> 最終更新: 2026-05-17 (M0.X-spec-plan-multi-file-dogfood で master SPEC §3.2 / §3.3 / §3.6 / §6 から migration)

## 1. Lazy Daemon ライフサイクル (旧 master §3.2)

trigger は **dual path**:
- **primary**: Claude Code の `SessionStart` hook 経由 (loom PJ で session 開始した瞬間に発火、retro 2026-05-06-002 F-USER-003 で正規化)
- **secondary**: 7 種 slash command（`/loom-pm`, `/loom-spec`, `/loom-go`, `/loom-retro`, `/loom-status`, `/loom-worktree`, `/loom-mode`）の markdown body bash invoke (補助 path、Claude execution priority に依存して確率的に発火)

1. session 開始時、`SessionStart` hook (`hooks/session_start.sh`) が cwd の `.claude-loom/` 存在を gate check (非 loom PJ は silent skip)
2. gate pass なら `hooks/loom-launch-ui.sh` を background fire-and-forget で invoke (session_start を block しない、fail-silent)
3. launch hook が `localhost:5757/health` を叩く
4. 無応答なら daemon を `nohup env LOOM_ENTRY=lazy-launch node ~/.claude-loom/daemon.js &` で起動（cold start）。PID ファイル (`~/.claude-loom/daemon.pid`) は debug breadcrumb として記録のみ、lock semantics は `/mode` endpoint が SSoT (§1.1)
5. **cold start 時のみ** `open http://localhost:5757` でブラウザを開く（既起動時は health-check のみで browser open せず、`xdg-open` 系のタブ氾濫を回避）
6. **headless 環境では browser open を skip し URL を terminal に出力**。検出条件: `$SSH_CONNECTION` セット / Linux で `$DISPLAY` 空 / `open`・`xdg-open`・`start` のいずれも不在。`LOOM_NO_UI=1` 環境変数で強制 skip 可能
7. daemon は 30 分イベント無しでセルフシャットダウン
8. 明示停止は `/loom-stop`、状態確認は `/loom-status`

**SessionStart hook 正規化の経緯 (retro 2026-05-06-002 F-USER-003)**: M0.11.5 trinity 設計時は slash command markdown body の bash invoke を primary trigger としたが、Claude execution priority に依存して確率的に発火せず、loom PJ 開始時の core promise (lazy daemon auto-launch → UI serve) が確実に機能しない silent failure を起こしていた (M0.11.5 retro F-USER-001 hypothesis 1 root cause)。SessionStart hook を primary trigger に正規化することで「loom PJ で session 開始した瞬間に必ず UI が立ち上がる」を guarantee 可能化。slash command markdown 経由の invoke は補助 path として残置 (multiple trigger redundancy)。

**`/loom` の役割**: daemon URL 表示 + clipboard コピー（user が「もう 1 タブ欲しい」時の救済路、cold-start-only open ポリシーを補完する dual path）。

**永続 opt-out**: `<project>/.claude-loom/project-prefs.json` の `ui.auto_launch: false` で PJ 単位で auto-launch 無効化。`LOOM_NO_UI=1` は session 単位の緊急上書き、`LOOM_NO_AUTO_UI=1` は session_start hook 経由の auto-launch のみ無効化 (slash command 経由は許可、CI / headless 環境用)。

**dev mode 切替**: `LOOM_DEV_MODE=1` で dev mode 起動（static serving skip、Vite :5173 を UI 提供元として想定）。`pnpm --filter @claude-loom/daemon dev` script は本 env var を auto-inject。lazy launch path は本 env var 未設定 (prod mode) が default。詳細は §1.2。

**起動 entry tag**: `LOOM_ENTRY` env var で起動経路を識別。値: `lazy-launch` / `pnpm-dev` / `manual` (default)。`/mode` endpoint で expose（§1.1）、競合 detection 時の diagnostic message に活用。

### 1.1 Daemon mode と `/mode` endpoint（旧 §3.2.1、M0.X-startup-recovery で codify）

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

- `loom-launch-ui.sh` (lazy launch path)：`/health` 応答あり → `/mode` で既存 daemon の mode を probe → mode に応じて分岐 (§1.2)
- `pnpm --filter @claude-loom/daemon dev` (dev path)：tsx watch 起動前に pre-flight script が `/health` + `/mode` を probe → 既存 daemon 検出時は明確 diagnostic 出して exit
- 両 entry point ともに OS の port bind (EADDRINUSE) を atomic lock として併用

**rationale**: sidecar file (PID file + JSON state) を SSoT とすると race condition / stale file / 2-writer の edge case が構造的に発生する。daemon process 自身を SSoT にすることで、OS の port allocation atomic semantics + endpoint 応答の生死で edge case を構造的に消去。partial implementation pattern (F-USER-007/008 と同 class) の再発防止としても機能。

### 1.2 dev mode と prod mode の役割分担 (旧 §3.2.2)

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

### 1.3 Boot health-check polling (旧 §3.2.3、retro 2026-05-06-003 F-pj-002 由来、Bug A hotfix で codify)

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

## 2. 中央指令室モデル (旧 master §3.3)

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

## 3. WebSocket メッセージスキーマ概要 (旧 master §3.6 main)

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

#### 3.1 M0.5 — Approval-Reduction Skills（M0 と M1 の橋渡し）

M0 で構築したハーネスを使った M1+ 開発の前に、承認プロンプト削減のための補助 skill を前倒しで shipping する。SPEC §3 元設計では skill 自動生成は Phase 2 だが、それは「Hermes 型自己進化で skill を**生成する**」フェーズの話。ここで shipping するのは **harness 利用者全員が必ず欲しがる手書き skill**：

- `loom-test`：ハーネステスト一括実行 + 結果サマリ
- `loom-status`：repo / harness 状態スナップショット
- `loom-tdd-cycle`：TDD 規律ガイド（loom-developer から呼ばれる）
- `loom-review`：single + trio strategy の review skill (single = 1 multi-aspect、trio = 3 parallel aspect specialists)、旧 `loom-review-trio` skill は 2026-05 で本 skill に統合済
- `templates/settings.json.template`：bundled-script を allowlist に含めた settings 初期値

shipping 規模：4 skill + 1 template + `install.sh` 拡張。SPEC §9.1 のディレクトリ構造に `skills/` が M0.5 から有効化される。

## 4. データモデル（SQLite スキーマ）(旧 master §6)

### 4.1 テーブル一覧（全 11 テーブル）

§4 で 9 テーブル、§7（doc 整合性エンジン）で 2 テーブル追加：

- **§4 (本章)**: `projects / events / sessions / subagents / agent_pool / tasks / token_usage / notes / plan_items`
- **§7**: `spec_changes / consistency_findings`

### 4.2 スキーマ定義

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

### 4.3 Event payload 仕様

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

### 4.4 Subagent 相関ロジック

- PreToolUse(Task) と PostToolUse(Task) を **session 単位の FIFO キュー** で紐付け
- daemon が PreToolUse(Task) 受信時に uuid 採番、キューに enqueue
- PostToolUse(Task) で先頭を dequeue、subagent_id 確定
- prompt 先頭の `[loom-meta] project_id=xxx, slot=dev-N` をパースして agent_pool と紐付け
- **検証要件**：並列 Task 呼び出し時の挙動を実装初期に確認、必要なら uuid を tool_input に injection する方式に切替

### 4.5 Token 使用量取得

- `~/.claude/projects/*/transcripts/*.jsonl` を 30 秒 polling
- 各 message の `usage` フィールドを集計、5 分バケットで token_usage テーブルに upsert
- 実装時に Claude Code が hook 経由で usage を出すなら差し替え

### 4.6 Events テーブル サイズ管理

- rolling delete: **30 日 OR 200MB 超** で古い順 vacuum
- daemon 起動時 + 6h 毎に実行
- 設定は `~/.claude-loom/config.json` の `retention_days` / `retention_mb`

### 4.7 プロジェクト判定ロジック

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
PM session の場合、サブエージェントの project 紐付けは prompt 先頭の `[loom-meta] project_id=xxx` で個別判定（§4.4 参照）。

### 4.8 PLAN.md フォーマット（長期レーンの正本）

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

### 4.9 `.claude-loom/project.json` 完全スキーマ

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

### 4.9.1 `~/.claude-loom/user-prefs.json` 完全スキーマ（M0.8 から）

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

### 4.9.2 `<project>/.claude-loom/project-prefs.json` 完全スキーマ（M0.8 から）

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
| `ui.auto_launch` | — | `true` | `false` で §1 lazy daemon auto-launch flow (step 2-5) を skip。PJ 単位の永続 opt-out。precedence: project-prefs > user-prefs > default `true`（M0.11.5 から） |

### 4.9.3 Effective config 計算規則

retro 開始時、project が user を field 単位 override：

- `effective.lenses[L]` = `project_prefs.lenses[L]` if defined else `user_prefs.lenses[L]`
- `effective.auto_apply.categories` = `project_prefs.auto_apply.categories` if defined else `user_prefs.auto_apply.categories`
- `effective.auto_apply.max_risk` = `project_prefs.auto_apply.max_risk` if defined else `user_prefs.auto_apply.max_risk`

設計理念: user-prefs = user の claude-loom 全体での好み（default）、project-prefs = 当 PJ の policy（override）。同 user が異なる PJ で異なる policy を運用可能。

### 4.9.4 `agents.*` セクション schema（M0.9 から）

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

#### 4.9.4.1 Field 仕様

| field | type | 値域 | default |
|---|---|---|---|
| `model` | `string \| null` | `"opus"` / `"sonnet"` / `"haiku"` | agent frontmatter の `model:` |
| `personality` | `string \| object \| null` | preset 名文字列 OR `{ preset, custom }` object | `"default"` |
| `learned_guidance` | `array<object> \| null` | retro 承認 finding の蓄積、各 entry は `{id, added_at, from_retro, from_finding_id, category, guidance, active, ttl_sessions, use_count}` | `[]` |

#### 4.9.4.2 Personality 短縮形と完全形

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

#### 4.9.4.3 Precedence rule

```
final_value = project_prefs.agents[name].field
           ?? user_prefs.agents[name].field
           ?? agent_frontmatter.field
```

- 値が `null` または key 不在 → 次の層へ fallback
- M0.8 既存 merge rule（project > user）と同一原則

#### 4.9.4.4 同梱 personality preset

| preset | キャラ | ファイル |
|---|---|---|
| `default` | 中立・専門的（注入実質スキップ） | `prompts/personalities/default.md` |
| `friendly-mentor` | 優しい講師（初心者向け） | `prompts/personalities/friendly-mentor.md` |
| `strict-drill` | クールな coding pro（上級者向け） | `prompts/personalities/strict-drill.md` |
| `detective` | 迷宮なしの名探偵（関西弁） | `prompts/personalities/detective.md` |

ユーザー独自 preset を作りたい場合は `prompts/personalities/<custom-name>.md` を追加し、prefs に preset 名を指定。

#### 4.9.4.5 learned_guidance auto-prune rule（M0.11.1 から）

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

### 4.9.5 `<project>/.claude-loom/retro/<retro_id>/verdict_evidence.json` 完全スキーマ（M2.1 から）

retro session 開始時に `loom-retro-pm` が write する per-retro-instance file。schema は zod で定義され、daemon (M3+) からも `import type { VerdictEvidence } from "@claude-loom/daemon"` で参照可能（M3 以降で daemon-side 永続化検討）。proc-003 finding 起源、概念 / write timing は `spec/retro-system.md` §1.10 参照。

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
| `.review_mode` | `"single"`（default 1 体）/ `"trio"`（opt-in 3 体並列） | `spec/harness.md` §4 / §2 と整合 |
| `.verdict` | dispatch 全体の verdict | `partial` は trio mode で一部 reviewer fail / 一部 pass |
| `.aspect_findings[]` | 観点別 verdict | single mode = 3 element (code/security/test 順次)、trio mode = dispatch 別 reviewer 出力 |
| `.aspect_findings[].output_ref` | reviewer JSON への text reference | M2.1 時点では transcript ref のみ、M3+ で daemon path 化 |
| `.dispatched_at` | dispatch timestamp (ms) | git log commit timestamp で代用可 |

**lazy build 手順**（`loom-retro-pm` Stage 0 で実行）:

1. `git log --oneline <prev_tag>..<curr_tag>` で milestone 内 commit 列挙
2. 各 commit の commit message から `<!-- id: m2-tN -->` 由来の task_id 推定（commit body or task ref）
3. session transcript（直前 implementation phase）から該当 task_id の reviewer dispatch JSON を抽出
4. PM final report の hint reference があれば優先的に使用（PM hint 機構、`spec/retro-system.md` §1.10 参照）
5. zod schema validate → file write、schema 不整合は warning として log（retro 自体は continue、機能 block しない）

### 4.9.6 `<project>/.claude-loom/retro/<retro_id>/pending.json` 完全スキーマ（M0.8 から、M0.11.1 で v2、M0.11.2 で v3 拡張）

retro session の finding queue + user 確定 verdict + apply trace + pending lifecycle tracking 用 file。M0.8 から運用、M0.11.1 で `applied_in` + `apply_history` field 追加 (v1 → v2)、M0.11.2 で `carryover_count` + `last_seen_in` + `expired_at` + `re_evaluated_in` field 追加 (v2 → v3、`spec/retro-system.md` §1.16 SSoT)。M3.0 retro 起源の **finding lifecycle tracking** SSoT。

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

  // M0.11.2 新設 (pending lifecycle tracking、§4.9.16)
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

#### 4.9.6.1 schema_version SSoT 統一表組（2026-05-06 retro F-pj-004 + F-meta-002 由来）

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

### 4.9.7 `<project>/.claude-loom/retro/<retro_id>/applied_summary.json` 完全スキーマ（M0.11.1 から、M0.11.5 で v2 統一）

retro session 開始時に `loom-retro-pm` が **過去全 retro session の pending.json を scan + 集約** した file。4 lens が Stage 1 で `Read` tool で参照、stale finding re-up を構造的に防ぐ。M2.1 §4.9.5 verdict_evidence.json と同 pattern（lazy build family）。

```ts
export const appliedSummarySchema = z.object({
  schema_version: z.literal(2),                      // M0.11.1 v1 → M0.11.5 v2 (F-pj-004 SSoT 統一、§4.9.6.1)
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

### 4.9.8 `<project>/.claude-loom/retro/<retro_id>/pending_summary.json` 完全スキーマ（M0.11.2 から）

retro session 開始時に `loom-retro-pm` が **過去全 retro session の pending finding を集約** した file。4 lens template (`skills/loom-retro/SKILL.md` § LENS_PJ / LENS_PROCESS / LENS_META / LENS_RESEARCHER) が Stage 1 で `Read` tool で参照、carryover finding の `still-relevant` 再評価 + auto-expire 判定の input として活用。M0.11.1 §4.9.7 applied_summary.json と同 pattern (lazy build family、`spec/retro-system.md` §1.16 SSoT)。

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

  // pending lifecycle state (§4.9.16)
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

**Lazy build 手順** (retro-pm Stage 0、`spec/retro-system.md` §1.11 + §1.16):

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

### 4.10 `~/.claude-loom/config.json` スキーマ（方針サマリ）

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
