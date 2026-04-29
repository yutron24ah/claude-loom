# claude-loom M1: Daemon + Hooks Foundation Implementation Plan

> 軽量フォーマット (M0.9.1 確立)。design SSoT は SPEC §12 (確定済み技術判断、本 milestone で M1 関連項目 inline 拡張済) + SPEC §6.1〜§6.10（DB schema + lifecycle）+ §7.1〜§7.5（doc 整合性 schema、M4 で実装、M1 では table 定義のみ）。

**Goal**: claude-loom daemon を Node.js + TypeScript + tRPC + Drizzle + SQLite で実装し、bash hooks からの event ingestion → DB 永続化 → tRPC subscriptions で frontend (M2) に push する **一気通貫の foundation** を完成。frontend 渡し時の型ズレ完全排除（AppRouter + Drizzle schema を daemon export、frontend は直接 import）。

**Architecture**:
- Monorepo: 既存 harness 資産は root 維持、`daemon/` を sibling 追加（M2 で `ui/` も sibling）
- Stack: Node.js + TypeScript + pnpm workspaces / Fastify + @fastify/websocket / tRPC + zod / Drizzle ORM + better-sqlite3 / Vitest / nanoid
- API: hooks → daemon = plain HTTP POST `/event`、UI ↔ daemon = tRPC over HTTP/WS
- 型共有: daemon が `AppRouter` type + Drizzle schema type を export、frontend が `import type { AppRouter, Session, ... } from "@claude-loom/daemon"`

**Tech Stack**:
- runtime: Node.js LTS（>= 20）
- language: TypeScript（strict）
- monorepo: pnpm workspaces
- HTTP/WS: Fastify + `@fastify/websocket`
- API: `@trpc/server` + zod
- ORM: `drizzle-orm` + `better-sqlite3` + `drizzle-kit` (dev)
- ID: `nanoid` (21 chars text)
- Test: `vitest` + `tsx`（dev runner）

---

## File Structure

```
claude-loom/
├── package.json                   [Task 2, NEW: workspace root]
├── pnpm-workspace.yaml            [Task 2, NEW]
├── tsconfig.base.json             [Task 2, NEW: 共通 TS 設定]
├── .gitignore                     [Task 2, modify: node_modules / dist]
│
├── (既存 harness 資産は不変)
│   ├── agents/ skills/ commands/ templates/ tests/ docs/ install.sh
│
├── daemon/                        [Task 3+, NEW package]
│   ├── package.json               [Task 3]
│   ├── tsconfig.json              [Task 3]
│   ├── drizzle.config.ts          [Task 5: drizzle-kit config]
│   ├── src/
│   │   ├── server.ts              [Task 6: Fastify entry]
│   │   ├── router.ts              [Task 7: AppRouter export]
│   │   ├── trpc.ts                [Task 7: trpc init + middleware]
│   │   ├── db/
│   │   │   ├── schema.ts          [Task 4: Drizzle 11 table 定義]
│   │   │   ├── client.ts          [Task 5: better-sqlite3 client wrapper]
│   │   │   └── migrations/        [Task 5: drizzle-kit generate 出力]
│   │   ├── routes/
│   │   │   ├── project.ts         [Task 8]
│   │   │   ├── session.ts         [Task 8]
│   │   │   ├── agent.ts           [Task 8]
│   │   │   ├── plan.ts            [Task 8]
│   │   │   ├── consistency.ts     [Task 8]
│   │   │   ├── approval.ts        [Task 8]
│   │   │   ├── note.ts            [Task 8]
│   │   │   ├── config.ts          [Task 8]
│   │   │   └── events.ts          [Task 9: subscriptions]
│   │   ├── events/
│   │   │   ├── types.ts           [Task 10: WS event payload zod schemas]
│   │   │   └── broadcaster.ts     [Task 10: subscription hub]
│   │   ├── hooks/
│   │   │   ├── ingest.ts          [Task 11: POST /event handler]
│   │   │   └── correlation.ts     [Task 12: subagent FIFO]
│   │   ├── project/
│   │   │   └── detect.ts          [Task 13: git root + project.json]
│   │   ├── security/
│   │   │   └── token.ts           [Task 14: nanoid + chmod 600]
│   │   ├── lifecycle/
│   │   │   ├── idle-shutdown.ts   [Task 15]
│   │   │   └── event-cleanup.ts   [Task 16]
│   │   └── config.ts              [Task 17]
│   ├── test/                      [Task 21]
│   └── vitest.config.ts           [Task 21]
│
├── hooks/                         [Task 18, NEW: bash hooks]
│   ├── session_start.sh
│   ├── pre_tool.sh
│   ├── post_tool.sh
│   ├── stop.sh
│   └── SubagentStop.sh
│
├── commands/                      [Task 19, modify: 3 commands new]
│   ├── loom.md                    [NEW]
│   ├── loom-status.md             [NEW]
│   └── loom-stop.md               [NEW]
│
└── tests/
    └── daemon_test.sh             [Task 22, NEW: harness smoke test]
```

---

## Tasks

### Task 1: PLAN.md M1 milestone 拡張 ✅

**Goal**: M1 milestone block を 25 tasks + 完成基準で拡張、技術判断 inline 反映
**Files**: `PLAN.md` (modify)
**Spec ref**: 本 plan + SPEC §12
**Integrity check**: `grep -c "id: m1-t" PLAN.md` → `25`
**Commit prefix**: `docs(plan): expand M1 milestone with tech decisions (M1)`

**Notes**: PM 実施済（SPEC §12 inline 編集 + PLAN.md M1 block も完了）、commit のみ。

### Task 2: pnpm workspace root 初期化

**Goal**: monorepo root の package.json + pnpm-workspace.yaml + tsconfig.base.json + .gitignore 設定
**Files**: `package.json` (NEW), `pnpm-workspace.yaml` (NEW), `tsconfig.base.json` (NEW), `.gitignore` (modify)
**Spec ref**: SPEC §12（pnpm workspaces 採用）
**Integrity check**:
- `cat pnpm-workspace.yaml` で `packages: ["daemon"]` 含む（M2 で `"ui"` 追加予定）
- `pnpm -v` で動作確認
- `.gitignore` に `node_modules/` `dist/` 含む
**Commit prefix**: `feat(workspace): init pnpm monorepo root (M1)`

### Task 3: daemon package init

**Goal**: `daemon/` package を新規作成、TypeScript / 依存 install
**Files**: `daemon/package.json` (NEW), `daemon/tsconfig.json` (NEW)
**Spec ref**: 本 plan の Tech Stack
**Insertion points**: `daemon/` directory under root
**Integrity check**:
- `pnpm --filter @claude-loom/daemon install` 成功
- `daemon/node_modules/` に fastify / @trpc/server / zod / drizzle-orm / better-sqlite3 / nanoid / vitest / tsx 存在
**Commit prefix**: `feat(daemon): init package with TS + Fastify + tRPC + Drizzle + Vitest deps (M1)`

**Notes**:
- `daemon/package.json` の `name` を `"@claude-loom/daemon"`、`type: "module"`、`exports` 設定で AppRouter type 公開
- `daemon/tsconfig.json` extends `../tsconfig.base.json`、`composite: true` で frontend 側から型参照可

### Task 4: Drizzle schema for 11 tables

**Goal**: SPEC §6.1 の 11 テーブル全部を Drizzle で TS 化、各テーブルから `$inferSelect` / `$inferInsert` type を export
**Files**: `daemon/src/db/schema.ts` (NEW)
**Spec ref**: SPEC §6.2 (DB schema 詳細) + §7.3 (spec_changes / consistency_findings)
**Insertion points**: なし（新規）
**Integrity check**:
- `grep -c "^export const " daemon/src/db/schema.ts` ≥ `11`（各 table を const export）
- `grep -c "\\$inferSelect\\|\\$inferInsert" daemon/src/db/schema.ts` ≥ `11`（type export）
- `tsc --noEmit` で型エラーなし
**Commit prefix**: `feat(daemon): Drizzle schema for 11 tables (SPEC §6.2 / §7.3, M1)`

**Notes**:
- ID column: `text("id").primaryKey().$defaultFn(() => nanoid())` pattern
- Timestamp: `integer("created_at", { mode: "timestamp_ms" })` で TS 側 `Date` 型展開
- JSON payload: `text("payload", { mode: "json" }).$type<EventPayload>()` で型付き
- 既存 SPEC §6.2 の SQL definition と semantic 一致を保つ
- 新 SPEC §12 の判断（nanoid + integer ms）に準拠

### Task 5: Drizzle migration generation + DB client wrapper

**Goal**: `drizzle.config.ts` 設定 + `drizzle-kit generate` で initial migration SQL 生成 + better-sqlite3 client wrapper
**Files**: `daemon/drizzle.config.ts` (NEW), `daemon/src/db/client.ts` (NEW), `daemon/src/db/migrations/0000_*.sql` (生成)
**Spec ref**: 本 plan
**Integrity check**:
- `pnpm --filter @claude-loom/daemon drizzle-kit generate` 成功
- `daemon/src/db/migrations/` に SQL ファイル生成
- client wrapper が `~/.claude-loom/loom.db` を open（path config 経由、Task 17 と整合）
**Commit prefix**: `feat(daemon): drizzle-kit migration + DB client (M1)`

### Task 6: Fastify server scaffold

**Goal**: Fastify インスタンス + WebSocket plugin + 127.0.0.1:5757 bind + /health endpoint
**Files**: `daemon/src/server.ts` (NEW)
**Spec ref**: SPEC §12（port 5757、bind 127.0.0.1）
**Integrity check**:
- `pnpm --filter @claude-loom/daemon dev` で daemon 起動
- `curl http://127.0.0.1:5757/health` → 200 OK + JSON body
**Commit prefix**: `feat(daemon): Fastify server scaffold + /health endpoint (M1)`

**Notes**: `dev` script は `tsx watch src/server.ts`、`start` は `node --import tsx dist/server.js`（または ts-node-esm）

### Task 7: tRPC + zod base setup

**Goal**: tRPC instance 初期化、middleware（auth token verify）、AppRouter root + Fastify integration
**Files**: `daemon/src/trpc.ts` (NEW), `daemon/src/router.ts` (NEW)
**Spec ref**: 本 plan API surface 設計
**Integrity check**:
- `daemon/src/router.ts` に `export const appRouter = router({ ... })` + `export type AppRouter = typeof appRouter`
- `tsc --noEmit` で型推論成功
- Fastify に `/trpc/*` adapter 配線
**Commit prefix**: `feat(daemon): tRPC base + AppRouter export + auth middleware (M1)`

### Task 8: 8 sub-routers 実装（project / session / agent / plan / consistency / approval / note / config）

**Goal**: 各 domain の tRPC router を実装、zod input/output schema 含む
**Files**: `daemon/src/routes/{project,session,agent,plan,consistency,approval,note,config}.ts` (8 file NEW)
**Spec ref**: SPEC §6 各テーブル + 本 plan API 構造
**TDD**: `red: vitest で各 router の query/mutation テスト red → impl で green`
**Integrity check**: 8 file それぞれに `export const <name>Router = router({ ... })`、各 router で 2 個以上 procedure 定義（list / detail / upsert / delete のいずれか）
**Commit prefix**: `feat(daemon): 8 tRPC sub-routers (project/session/agent/plan/consistency/approval/note/config) (M1)`

**Notes**:
- 各 router は最低限 `list` (query) + 主要 mutation 1 つ
- 後続の M2 で UI が必要に応じて procedure 追加していく形（M1 では skeleton）
- 8 file 共通の zod schema pattern：`<Entity>InputSchema` + `<Entity>OutputSchema`
- 並列 dispatch 候補：8 file 独立、subagent 2-3 体に分割可能

### Task 9: events.ts subscription procedures

**Goal**: tRPC subscriptions で WS push（onAgentChange / onPlanChange / onFindingNew / onApprovalRequest 等）
**Files**: `daemon/src/routes/events.ts` (NEW)
**Spec ref**: 本 plan WS subscription 粒度（事種別ごと）
**Integrity check**: `grep -c "subscription" daemon/src/routes/events.ts` ≥ `4`、`grep "broadcaster" daemon/src/routes/events.ts` で broadcaster import 確認
**Commit prefix**: `feat(daemon): events.ts subscription procedures (M1)`

### Task 10: events/broadcaster.ts WS event hub

**Goal**: subscription hub 実装、events table への write と並行して broadcast、subscriber filtering
**Files**: `daemon/src/events/types.ts` (NEW), `daemon/src/events/broadcaster.ts` (NEW)
**Spec ref**: 本 plan WS event 配信
**Integrity check**: `grep "EventEmitter\\|TypedEmitter\\|Subject" daemon/src/events/broadcaster.ts`、event types.ts に zod schema 5+
**Commit prefix**: `feat(daemon): events/broadcaster + types schema (M1)`

### Task 11: hooks/ingest.ts POST /event handler

**Goal**: bash hook からの plain HTTP POST `/event` を受け取り、events table 永続化 + broadcaster へ push
**Files**: `daemon/src/hooks/ingest.ts` (NEW), `daemon/src/server.ts` (modify: route 追加)
**Spec ref**: SPEC §6.3 Event payload + 本 plan hook ingestion
**TDD**: `red: vitest integration で POST /event → events table row + WS subscriber 通知の e2e test red → impl で green`
**Integrity check**: `vitest run hooks/ingest` で test PASS
**Commit prefix**: `feat(daemon): hooks/ingest.ts POST /event handler (M1)`

### Task 12: hooks/correlation.ts subagent FIFO

**Goal**: subagent 相関ロジック（SPEC §6.4）：parent session id 推定、subagent dispatch tree 構築
**Files**: `daemon/src/hooks/correlation.ts` (NEW)
**Spec ref**: SPEC §6.4
**Integrity check**: vitest unit test で SPEC §6.4 の例 input → 期待 parent_session_id mapping
**Commit prefix**: `feat(daemon): hooks/correlation.ts subagent FIFO logic (SPEC §6.4, M1)`

### Task 13: project/detect.ts プロジェクト判定

**Goal**: git root + `.claude-loom/project.json` marker での project 判定（SPEC §6.7）
**Files**: `daemon/src/project/detect.ts` (NEW)
**Spec ref**: SPEC §6.7
**Integrity check**: vitest unit test で fixture（`tmp/git-init` + `.claude-loom/project.json` あり / なし）から正しい project_id resolve
**Commit prefix**: `feat(daemon): project/detect.ts (SPEC §6.7, M1)`

### Task 14: security/token.ts auth token

**Goal**: nanoid 生成 + `~/.claude-loom/daemon-token` (chmod 600) read/write、tRPC middleware で headers verify
**Files**: `daemon/src/security/token.ts` (NEW), `daemon/src/trpc.ts` (modify: middleware 接続)
**Spec ref**: SPEC §12（token + chmod 600）
**Integrity check**: vitest で token 生成 → file 存在 + permissions 600 + tRPC middleware で wrong header reject
**Commit prefix**: `feat(daemon): security/token.ts auth + tRPC middleware (M1)`

### Task 15: lifecycle/idle-shutdown.ts

**Goal**: 30 分 inactivity で auto-shutdown（最終 event timestamp 監視）
**Files**: `daemon/src/lifecycle/idle-shutdown.ts` (NEW), `daemon/src/server.ts` (modify: 起動時 schedule)
**Spec ref**: SPEC §12（30 分アイドル）
**Integrity check**: vitest で fake timer + minimum reproduction（idle event 30min → process.exit called）
**Commit prefix**: `feat(daemon): lifecycle/idle-shutdown.ts 30min auto-shutdown (M1)`

### Task 16: lifecycle/event-cleanup.ts rolling delete

**Goal**: events table を 30 日 OR 200MB 上限で oldest から削除、daily 実行
**Files**: `daemon/src/lifecycle/event-cleanup.ts` (NEW), `daemon/src/server.ts` (modify: 起動時 schedule)
**Spec ref**: SPEC §6.6 + §12
**Integrity check**: vitest で 31 日前 event seed + cleanup invoke → 削除確認
**Commit prefix**: `feat(daemon): lifecycle/event-cleanup.ts rolling delete (SPEC §6.6, M1)`

### Task 17: config.ts daemon-side config

**Goal**: `~/.claude-loom/config.json` read/write、default 生成（SPEC §6.10 schema）
**Files**: `daemon/src/config.ts` (NEW)
**Spec ref**: SPEC §6.10
**Integrity check**: vitest で config absent → default 生成、existing → load
**Commit prefix**: `feat(daemon): config.ts ~/.claude-loom/config.json (SPEC §6.10, M1)`

### Task 18: bash hooks 5 種

**Goal**: claude-loom/hooks/ に 5 bash script、各 script は curl POST /event
**Files**: `hooks/{session_start,pre_tool,post_tool,stop,SubagentStop}.sh` (5 NEW)
**Spec ref**: SPEC §6.3 + §6.4
**Integrity check**:
- `chmod +x hooks/*.sh` 適用
- 各 script の `bash -n` で syntax OK
- daemon 起動状態で hooks 手動実行 → events table row 増加（smoke）
**Commit prefix**: `feat(hooks): 5 bash hook scripts for Claude Code event ingestion (M1)`

**Notes**:
- 各 script は env vars (`CLAUDE_TOOL_NAME` など) を JSON payload に整形して POST
- Token は `~/.claude-loom/daemon-token` から read
- daemon 不在時 fail silent（`curl --max-time 1 ... || true`）

### Task 19: 3 slash commands

**Goal**: `/loom` (起動 + browser open) / `/loom-status` / `/loom-stop` の slash command
**Files**: `commands/loom.md` (NEW), `commands/loom-status.md` (NEW), `commands/loom-stop.md` (NEW)
**Spec ref**: SPEC §8
**Integrity check**: 3 file それぞれ valid frontmatter（`head -1` `---`）+ description field
**Commit prefix**: `feat(commands): /loom + /loom-status + /loom-stop slash commands (M1)`

### Task 20: install.sh 拡張（settings.json 書き換え + daemon 配線）

**Goal**: install.sh に settings.json への hooks 配線追加（jq + atomic mv）、`hooks/` も symlink ターゲットに追加
**Files**: `install.sh` (modify), `tests/install_test.sh` (modify: REQ-024 の延長で REQ-028)
**Spec ref**: SPEC §9 install
**Integrity check**: `bash install.sh` 実行で `~/.claude/settings.json` に 5 hook の配線追加 + `~/.claude/hooks/loom-*.sh` symlink 存在
**Commit prefix**: `feat(install): settings.json hooks 配線 + hooks/ symlink (M1)`

**Notes**: 既存 install.sh の `install_links` / `install_dir_links` パターン拡張、jq + atomic mv で settings.json を destructive 書き換えしない（既存 user-managed 部分を保持）

### Task 21: Vitest setup + daemon test suite

**Goal**: daemon/test/ ディレクトリ + vitest.config.ts、各 router の unit test + ingestion / lifecycle integration test
**Files**: `daemon/vitest.config.ts` (NEW), `daemon/test/**/*.test.ts` (5+ NEW)
**Spec ref**: 本 plan Test framework
**Integrity check**:
- `pnpm --filter @claude-loom/daemon test` で全 PASS
- coverage は M1 では設定のみ、enforcement は M5 で
**Commit prefix**: `test(daemon): Vitest setup + initial unit + integration tests (M1)`

### Task 22: REQ-028 + tests/daemon_test.sh

**Goal**: REQ-028 を REQUIREMENTS に追加、harness 側 smoke test として bash daemon_test.sh
**Files**: `tests/REQUIREMENTS.md` (modify), `tests/daemon_test.sh` (NEW)
**Spec ref**: M1 完成基準
**Integrity check**: `./tests/run_tests.sh` で 9 PASS（既存 8 + daemon_test）
**Commit prefix**: `test: REQ-028 + harness daemon_test.sh smoke test (M1)`

**Notes**: smoke test は daemon 起動 → /health 200 → POST /event → events table row → daemon shutdown の最小 e2e

### Task 23: README.md + CLAUDE.md

**Goal**: README に daemon 起動方法 + tRPC AppRouter import 例、CLAUDE.md に M1 daemon 関連の作業 note
**Files**: `README.md` (modify), `CLAUDE.md` (modify)
**Spec ref**: 本 plan + SPEC §12
**Integrity check**: `grep -c "pnpm.*daemon\\|AppRouter\\|tRPC" README.md` ≥ `2`
**Commit prefix**: `docs: README + CLAUDE M1 daemon usage (M1)`

### Task 24: docs/DOC_CONSISTENCY_CHECKLIST.md M1 check items

**Goal**: M1 関連 doc 整合性 check items 追記
**Files**: `docs/DOC_CONSISTENCY_CHECKLIST.md` (modify)
**Spec ref**: M0.9-M0.13 と同パターン
**Insertion points**: 末尾に M1 セクション
**Integrity check**: `grep -c "M1 Daemon" docs/DOC_CONSISTENCY_CHECKLIST.md` → `1`
**Commit prefix**: `docs(consistency): add M1 Daemon Foundation check items`

### Task 25: 全 test PASS + tag m1-complete + main merge

**Goal**: 全 test 維持、PLAN.md done mark、tag、main merge
**Files**: `PLAN.md` (status update), git tag, git merge
**Spec ref**: M0.9〜M0.13 Task 末尾と同手順
**Integrity check**:
- `pnpm test` で daemon 全 PASS
- `./tests/run_tests.sh` で 9 PASS
- `git tag -l --sort=-creatordate | head -2` → `m1-complete\nm0.13-complete`
**Commit prefix**: `docs(plan): mark M1 tasks done (25/25)` + tag annotation + merge commit

---

## Self-Review

**Spec coverage**:
- ✅ Tech stack 全項目 → SPEC §12 inline 反映済 + Tasks 2-3
- ✅ DB schema 11 table → Task 4-5
- ✅ tRPC API surface → Tasks 7-9
- ✅ Hook ingestion → Tasks 11-12
- ✅ Project detection → Task 13
- ✅ Security → Task 14
- ✅ Lifecycle → Tasks 15-16
- ✅ Config → Task 17
- ✅ bash hooks → Task 18
- ✅ Slash commands → Task 19
- ✅ Install → Task 20
- ✅ Tests → Tasks 21-22
- ✅ Doc → Tasks 23-24

**Placeholder scan**: TBD/TODO なし

**Type consistency**:
- `AppRouter`、`tRPC`、`Drizzle`、`nanoid`、`zod`、`Vitest` 用語統一
- `127.0.0.1:5757` port + bind 一貫
- file path `daemon/src/...` 一貫

**Risk**:
- 25 tasks の大型 milestone → M0.9 (28 tasks) と同規模、subagent 並列 dispatch で対応可（Tasks 8 の 8 router は parallel 候補）
- Drizzle schema が SPEC §6.2 の SQL DDL と semantic ズレるリスク → Task 4 で SPEC §6.2 を SSoT として参照、type 自動 export で frontend と整合
- pnpm install が初回時に重い → Task 2-3 で `pnpm install` を early に、後続 task は cached state で動く
- M0.13 で codify した parallel dispatch self-verify を **本 milestone で初実投入**：Task 8（8 router）で 2-3 subagent 並列 dispatch、これが M0.13 codification の実効性 test
- bash hooks の curl 失敗時 daemon 不在ケース → Task 18 で `--max-time 1 || true` で fail-silent、Claude Code 動作を妨げん

---

## Execution Handoff

Task 1 PM 実施済（commit のみ）。
Tasks 2-3 sequential（workspace + daemon package init、依存 install を含むため）、loom-developer 1 体。
Tasks 4-7 sequential（schema → migration → server → tRPC base、prerequisite chain）、loom-developer 1 体。
Tasks 8 parallel 候補（8 router 独立）、**parallel dispatch 真投入機会**：subagent 2-3 体並列で試す。
Tasks 9-17 sequential（broadcaster / hooks / project / security / lifecycle / config）、loom-developer 1 体。
Tasks 18-20 sequential（bash hooks / slash commands / install.sh）、loom-developer 1 体。
Tasks 21-24 sequential（test setup / smoke / README / DOC_CONSISTENCY）、loom-developer 1 体。
Task 25 PM 直接実施（test + tag + merge）。

**実装時間概算**: ~4-6 時間（subagent 換算、並列化次第で短縮）。1 session で全 25 task 完走は野心的、batch 区切りで休憩入れるのが現実的。
