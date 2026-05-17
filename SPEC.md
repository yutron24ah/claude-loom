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

詳細は `spec/harness.md` §5 参照。

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
