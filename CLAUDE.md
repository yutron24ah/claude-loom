# CLAUDE.md — claude-loom リポジトリ作業ガイド

> **本ファイルは Claude Code agent 向けの作業規約。** ユーザー向け説明は `README.md`、製品仕様は `SPEC.md` を参照。

## 開発フロー

このリポジトリは **dogfood 方式** で開発する：
M0 + M0.5 + M0.6 で構築した harness（PM / Developer / Reviewer agent — single mode default、trio mode opt-in）を使って、M1 以降の自分自身の実装を進める。

### 通常の作業フロー

1. `/loom-pm` で PM mode に入る（この session が PM になる）
2. `/loom-spec` で SPEC を読み込み、当該タスクの詳細を user と確認
3. `/loom-go` で実装フェーズ起動 → PM が Task tool で developer subagent を dispatch
4. developer は TDD で実装 → reviewer dispatch（review_mode 判定：default `single` で 1 体、opt-in `trio` で 3 体並列）
5. 全 reviewer verdict pass → commit
6. PM が PLAN.md を更新

## ブランチ規約（GitHub Flow）

- `main` への直 commit 禁止、PR 経由のみ
- 1 要件 = 1 ブランチ、短命（数日〜数週間）
- 命名 `<type>/<short-kebab-name>`、type は `feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `chore` の 10 種
- 例: `feat/loom-reviewer-agent`, `fix/install-home-guard`, `docs/commit-guide`
- ブランチ単位で PR を上げる前に：全テスト pass + 全 reviewer verdict pass（single mode = 1 verdict、trio mode = 3 verdicts）
- merge は `--no-ff`（マイルストーン境界を残す）または squash（WIP 多い場合）

### Branch hygiene 規律（retro 2026-05-04-001 F-proc-004 由来）

Phase 1 MVP closure 時に「4 branch chain × 32+ commits ahead of main、PR 不在」状態が発生 (CLAUDE.md GitHub Flow 規約と乖離)。下記 hygiene rule を codify：

- **milestone tag 設置 = PR opening trigger**: `git tag -a m*-complete` 設置直後、PM は「このまま main へ PR 上げるか」を user に確認（hygiene check）。dogfood phase の continuous stacking で 32+ commits 累積する drift を防ぐ
- **branch chain depth ≥ 2 = PR mandatory**: 「parent branch も未 merge」状態で新 child branch を切る場合、parent の PR 開設を **strongly recommend** (mandatory ではない、dogfood phase の柔軟性を残すが、stack depth ≥ 3 で alert)
- **Phase boundary では必ず flush**: Phase 1 → Phase 2 等の phase boundary で全 stacked branch を main へ取り込む。Phase boundary 越えでの branch chain は禁止
- **rationale**: dogfood phase の single-developer 運用ゆえ実害は低いが、Phase 2 multi-contributor 時に PR review を起動する hygiene の前段階として codify

### Parallel batch claim 規律（retro 2026-05-06-002 F-proc-001 由来、PLAN.md SSoT）

**parallel claim ≠ actual parallel without file disjoint**: PLAN.md で「t-N + t-M を parallel batch」と書いた task entry は、各 task の `planned_files` リストが file scope で完全 disjoint な場合のみ実 parallel 可能。同 file edit を含む task を parallel と claim すると dispatch 時 conflict / lost-update が起きる。

- **planning 時**: PLAN.md task entry に `<!-- planned_files: ... -->` HTML comment で edit 対象 file path を絶対 / プロジェクト相対で明記
- **dispatch 時**: PM (agents/loom-pm.md Implementation Phase Step 3) が parallel dispatch 前に各 task の `planned_files` を比較、overlap 検出 → parallel claim 撤回 (sequential / unified annotation / task 分離 のいずれか)
- **rationale**: M0.11.6 t4/t5/t6 + M0.11.7 t4/t5 で parallel batch 宣言したが同 file 編集で実 parallel 不能、PM が dispatch 前 audit で検出した事象 (retro 2026-05-06-002 F-proc-001)
- **side-effect 注意 (retro 2026-05-06-003 F-proc-002)**: parallel dispatch 中は各 subagent の `SessionStart` hook が同時多重発火し、`POST /event` を daemon に集中送信する。daemon 不安定 (e.g., M0.X-hook-ingest-recovery で対象の Layer 3 spam) と組み合わさると `/health` probe timeout → false cold-start trigger → `open_browser` 多重 invoke → タブ大量起動 (Bug A symptom chain) を引き起こす。Bug A hotfix (commit `91cdcbb`) で start_daemon 側の defense in depth は入ったが、daemon load の根本対策は M0.X-hook-ingest-recovery scope

### Dependency audit 規律（retro 2026-05-06-001 F-USER-002 由来、SPEC §3.6.8.8 SSoT）

**default 値変更を含む milestone は、closure 前に依存 install / config / runtime pipeline 全 step verify を必須 check**:

- **trigger**: 既存 default 反転 / 新 runtime path active 化 / 新 hook・symlink・settings.json field の bootstrap 必須化のいずれかが milestone task に含まれる時
- **audit 4 step**: (1) `bash install.sh` fresh sandbox 実行で前提 file 配置確認 (2) templates / user-prefs / project-prefs の **3 source** で default 値整合確認 (3) 新 default 活性 code path の actual 動作 smoke check (4) opt-out 手段（env / config / `LOOM_NO_*`）の SSoT 明記確認
- **rationale**: M0.11.5 で `auto_launch: false → true` 反転と daemon 自動起動 default 化を並行実施したが、`install.sh` daemon symlink bootstrap 不在が closure 後に critical issue 化した（retro F-USER-001）。default 変更は前提 pipeline 全 step が揃わな成立せず、partial implementation は silent failure を生む
- **詳細**: SPEC §3.6.8.8 + agents/loom-pm.md milestone closure workflow を参照

## コミット粒度（Conventional Commits）

- 1 commit = 1 論理変更（atomic、revert 単位）、build & test pass 状態を維持
- 行数目安：200 行以下推奨、500 行超は分割（Google CL 流儀）
- 形式: `<type>(<optional scope>): <subject>` の 1 行件名 + 必要に応じて空行 + 本文
- type 11 種: `feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `chore` / `revert`
- 件名: 命令形 or 日本語体言止め可（≤50 英 / ≤40 日目安、末尾ピリオドなし）
- 本文（必要時）: WHY 中心、72 文字折返
- BREAKING CHANGE: `feat!:` または footer `BREAKING CHANGE: <description>`
- 言語ポリシー: `.claude-loom/project.json` の `rules.commit_language`（`"any"` default）
- 詳細ルール + 良い/悪い例: **`docs/COMMIT_GUIDE.md` を参照**

## TDD 必須

- 実装コードを書く前に必ず失敗するテストを書く
- Red → Green → Refactor の順
- テストなしの実装は review で reject される

## doc 整合性

- SPEC を変更したら `docs/DOC_CONSISTENCY_CHECKLIST.md` を必ず通す
- M4 で自動化するまでは手作業

## ファイル配置規約

- agents/ : Claude Code subagent 定義（loom-pm / loom-developer / loom-reviewer (single mode default) / loom-{code,security,test}-reviewer (trio mode opt-in) / loom-retro-* (M0.8 retro 7 体)）
- commands/ : slash command 定義
- hooks/ : bash hook scripts (M1 以降)
- skills/ : Claude Code skill (M0.5 から有効)
- templates/ : 新規 PJ 配布用テンプレ
- tests/ : bash test harness
- daemon/ : Node daemon (M1 以降)
- ui/ : React + Phaser UI (M2 以降)
- docs/ : ドキュメント
- ~/.claude-loom/user-prefs.json + <project>/.claude-loom/project-prefs.json : retro 学習状態（M0.8 から）
- install.sh : symlink 設置 + settings.json hooks 配線
- uninstall.sh : install.sh が設置した symlink + hooks 配線を除去（M5 から）

## テスト実行

```bash
./tests/run_tests.sh        # 全テスト
./tests/run_tests.sh install # 特定テスト
```

## 主要ドキュメント参照

- `SPEC.md` — 製品仕様（SSoT）
- `PLAN.md` — マスターロードマップ
- `docs/plans/` — 各マイルストーン詳細プラン（`writing-plans` skill を使う場合は default の `docs/superpowers/plans/` を上書きしてここに保存する）
- `docs/SCREEN_REQUIREMENTS.md` — UI 要件
- `tests/REQUIREMENTS.md` — 受入要件 ID
- `docs/AGENT_PROMPT_DESIGN.md` — **agent prompt 設計原則**（2-layer structure / anti-patterns / size guideline、`agents/*.md` を書く・直す時の必読）

## skill 使い分けポリシー（M0.14 から、SPEC §3.10.1 SSoT）

このリポジトリの agent は **mandate skill** と **suggest skill** を区別する。blanket な「loom-* > superpowers」優先は撤廃済み（agent の自律的 skill discovery を阻害せんため）。

### Mandate skill — 必ず loom-* 版を使う（claude-loom 固有 workflow gate）

| 用途 | mandate skill | 理由 |
|---|---|---|
| TDD discipline | `loom-tdd-cycle` | claude-loom の Red→Green→Refactor→Review cycle 規律 |
| code review | `loom-review` (single) / `loom-review-trio` (deep) | Reviewer verdict を quality gate とする SPEC §3.6.6 規約 |
| retro 振り返り | `loom-retro` | 4 lens × counter-argument の 3 段階プロトコル必須 |
| harness self-test | `loom-test` | claude-loom 固有の install/agent/command/skill test |
| harness status 確認 | `loom-status` | claude-loom 固有のスナップショット |

### Suggest skill — agent の自律判断、他選択肢も可

| 用途 | 候補 skill | 補足 |
|---|---|---|
| 実装 plan 作成 | `loom-write-plan` | inline spec edit / brainstorm-with-spec でも可 |
| 系統的 debug | `loom-debug` | ad-hoc debugging でも可 |
| Refactor phase の品質改善 | `simplify` | 直接 refactor でも可 |
| permission 拒否多発 → env 改善 | `fewer-permission-prompts` | retro process-axis lens が finding 化 |
| 定型作業反復 → hook/permission 設定 | `update-config` | retro process-axis lens が finding 化 |
| keybind 改善 | `keybindings-help` | retro process-axis lens が finding 化 |

`superpowers:brainstorming` / `superpowers:executing-plans` 等の skill は claude-loom の `loom-pm` agent 内 spec phase / impl phase に同等動作が記述されとるため自前 skill 化はせず（YAGNI）。superpowers が global uninstall されても claude-loom 単独で完結する設計（SPEC §3.10）。

詳細：`SPEC.md §3.10` + `§3.10.1` (Skill Mandate vs Suggest 使い分け)。

## Daemon 開発 note（M1 から）

claude-loom 内で daemon (TypeScript / Fastify / tRPC) を開発する際の追加規約：

### dev mode と prod mode の使い分け（SPEC §3.2.2）

| | **dev mode** | **prod mode** |
|---|---|---|
| 起動コマンド | `pnpm --filter @claude-loom/daemon dev` | 自動（SessionStart hook 経由 lazy launch） |
| env 注入 | `LOOM_DEV_MODE=1 LOOM_ENTRY=pnpm-dev`（auto-inject） | `LOOM_ENTRY=lazy-launch`（env なし = prod default） |
| access URL | UI: `http://127.0.0.1:5173`（Vite）、API: `http://127.0.0.1:5757` | `http://127.0.0.1:5757`（daemon が UI + API を serve） |
| static serving | **skip**（ui/dist があっても無視、Vite が UI を担う） | **serve**（ui/dist 存在時のみ `@fastify/static` register） |
| 用途 | claude-loom 自身の UI 開発（hot-reload 付き） | end-user による消費、lazy daemon auto-launch |

**mode 判定 SSoT**: `GET /mode` endpoint。daemon process が起動時に `LOOM_DEV_MODE` の有無で固定、以後は `/mode` 応答が canonical source（PID ファイルを decision logic に使ってはいけない）。

**競合 detection**:
- `pnpm dev` 起動前に pre-flight script が `/health` + `/mode` を probe → prod daemon 検出時は ERROR + PID を出力して exit 1（tsx watch を起動させない）
- lazy launch path は `/mode` probe で dev daemon 検出 → Vite (:5173) に redirect

**opt-out**:
- `LOOM_DEV_MODE=1` を手動 set で dev mode 強制（`pnpm dev` の auto-inject が標準 path）
- `LOOM_NO_UI=1` で browser open skip（session 単位の緊急上書き）
- `LOOM_NO_AUTO_UI=1` で SessionStart hook 経由の auto-launch のみ無効化（slash command 経由は許可）

詳細: `SPEC.md §3.2.1` + `§3.2.2`。

### Node.js 環境

- **Node LTS（20 or 22）推奨**。Node 25 (current) では `better-sqlite3` の native build に CXXFLAGS workaround が必要な場合あり、LTS 環境を強く推奨
- 依存 install: `pnpm install`（root から）

### daemon ディレクトリ構造

```
daemon/src/
├── server.ts              # Fastify entry
├── router.ts              # AppRouter (frontend export 起点)
├── trpc.ts                # tRPC + auth middleware
├── db/                    # Drizzle schema + migrations + client
├── routes/                # 9 sub-router (project/session/agent/plan/consistency/approval/note/config/events)
├── events/                # broadcaster + types
├── hooks/                 # ingest (POST /event) + correlation (FIFO)
├── project/detect.ts      # git root + project.json marker
├── security/token.ts      # nanoid token + verify
├── lifecycle/             # idle-shutdown + event-cleanup
└── config.ts              # ~/.claude-loom/config.json wrapper
```

### test

- daemon: `pnpm --filter @claude-loom/daemon test`（Vitest、138+ test）
- harness: `bash tests/run_tests.sh`（既存 + daemon_init_test + daemon_commands_test）
- 全 test: `pnpm test`（root から、両方走る）

### 編集 SSoT

- API surface (tRPC procedures): `daemon/src/router.ts` + `routes/*.ts`
- DB schema: `daemon/src/db/schema.ts`（Drizzle）
- WS event types: `daemon/src/events/types.ts`（zod）
- frontend 渡し型: `import type { AppRouter, Session, ... } from "@claude-loom/daemon"`

### M1 で確定済み技術判断

詳細は SPEC §12。M1 で追加された主な確定値：
- API: tRPC + zod
- ORM: Drizzle + better-sqlite3
- ID: nanoid、Timestamp: integer ms
- Test: Vitest（daemon）+ bash test（harness）並列共存
- Type 共有: daemon が AppRouter + Drizzle schema type を export
- Auth: nanoid token in `~/.claude-loom/daemon-token` (chmod 600)
