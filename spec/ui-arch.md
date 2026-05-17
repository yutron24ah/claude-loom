# ui-arch (topic spec)

> 本 file は claude-loom SPEC の topic spec。master は [SPEC.md](../SPEC.md)、用語表 / 確定済み技術判断 / SSoT 原則は master を参照。
>
> § 番号は本 file 内で local。cross-file 参照は `spec/<other-topic>.md §X.Y` 記法 (master SPEC §3.11.4 SSoT)。
>
> 最終更新: 2026-05-17 (M0.X-spec-plan-multi-file-dogfood で master SPEC §3.6.9〜§3.6.15 から migration)

## 1. M3 UI Architecture (旧 master §3.6.9)

M3 milestone の核となる frontend 設計判断を SSoT として集約。spec phase 2026-05-02 で確定（design 分岐 α/β/γ + M3 分割判断の 4 件）。

### 1.1 Phaser 4 React 内 mount pattern（α-1 確定）

- **採用**: 自前 `useEffect` + `useRef` mount（library 依存ゼロ）
- **lifecycle**: `useEffect(() => { gameRef.current = new Phaser.Game(config); return () => gameRef.current?.destroy() }, [])`
- **state bridge**: zustand subscribe + Phaser scene event は **agent state → sprite state の単方向 push が主**、双方向 OT は不要
- **HMR**: Vite HMR で scene 状態保持のため stable ref + `import.meta.hot.dispose` で `game.destroy()` 必須
- **却下案**: react-phaser-fiber（library 更新ペース遅）/ @phaserjs/react（ecosystem 例少ない）/ canvas 直書き（SPEC §12 Phaser 4 確定値を覆す）

### 1.2 PLAN.md 双方向同期戦略（β-3 確定）

- **採用**: hybrid debounce + last-write-wins + `plan_conflict_detected` toast
- **debounce**: GUI 編集 500ms-1s で batch write、chokidar event も同 debounce で集約、race window を狭める
- **last-write-wins**: `mtime` 比較で新しい側採用、conflict 検知時は **新 toast event `plan_conflict_detected`** を push
- **data 救済**: GUI 側 change を localStorage に backup、user が手動 restore 可能
- **却下案**: pure last-write-wins（silent data loss）/ file lock + queue（lock manager 重）/ Yjs/Automerge OT（M3 で overkill、bundle 50-100KB 増）

### 1.3 Gantt 実装方法（γ-3 確定）

- **採用**: 自前 SVG（`<rect>` bar + `<line>` grid + `<text>` label）
- **theme 統合**: tokens.css の CSS variable `var(--color-bar)` 等を SVG 直参照、3 theme (pop/dusk/night) 即反映
- **scope**: read-only bar + 行 click で Agent Detail navigate（edit / zoom / pan は M5 以降）
- **実装規模**: 200-400 LoC（library 依存ゼロ、bundle 増ゼロ）
- **却下案**: gantt-task-react（50KB 増 + theme bridge hack）/ frappe-gantt（React wrapper 自前 + TS 型不在）/ react-google-charts（external CDN 依存、SPEC §3.5 security model と相性悪）

### 1.4 Toast event 拡張（M2 5 event → M3 6 event）

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

### 1.5 frontend「自前 control」哲学

α (Phaser mount) + γ (Gantt) の 2 大判断で **library 依存最小化** を選択。理由 3 つ：

1. **claude-loom dogfood project のメンテ負荷最小化** — library breaking change で詰まらん
2. **frontend-design 委譲との相性最大化（M5）** — pixel art aesthetic を library override で hack するより、自前で control する方が直接的
3. **3 theme (pop/dusk/night) 統合** — tokens.css CSS variable 直参照が最も seamless

trade-off として実装 LoC は増えるが、claude-loom が成熟するにつれ各 component を独立 refactor / 入れ替え可能な状態を維持。

### 1.6 M3 分割（3 段細分割）

M3 は scope 大（10 task = M2 同等規模 + 新技術 Phaser + 複雑 design 双方向同期）、proc-001 / proc-004 リスク低減のため **3 段細分割** を採用：

| sub-milestone | scope | task 数 | technical risk 軸 |
|---|---|---|---|
| **M3.0** Room View | Phaser mount + tile + sprite + 状態アニメ | 3 | 新技術 (Phaser) 投入、独立 milestone で retro 集中 |
| **M3.1** Plan + Gantt + sync + visual regression | Plan View 短期/長期 + 双方向同期 + Gantt + Playwright e2e baseline | 5 | 複雑 design (β-3 hybrid sync) + visual regression infra 初導入、独立 milestone で edge case finding |
| **M3.2** Detail views | Session List + Agent Detail + notes | 3 | CRUD polish、新技術/複雑 design は M3.0/M3.1 で扱い済 |

各 milestone closure 後に retro hook（M0.13 milestone retro 規約）、verdict_evidence (M2.1 整備済) の運用試験 3 回 = proc-003 hook 妥当性も並行検証。詳細 task は PLAN.md M3.0 / M3.1 / M3.2 セクション参照。

### 1.7 Visual regression check 機構（M3.1 から、res-001 確定）

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
- **frontend「自前 control」哲学整合**: §1.5 の library 依存最小化方針に対し、Playwright は「test infra」レイヤで application code には侵入せず、独立 infra として breaking risk を application 本体に伝播させない設計

## 2. SSoT cross-check rule (旧 master §3.6.10)

### 2.1 背景

M3.1 t3 で `daemon/src/events/types.ts` の `planChangeEventSchema.status` enum が `'in_progress'` だった一方、DB schema (drizzle / `daemon/src/db/schema.ts`) と plan.ts route の status は `'doing'` に統一されとった。**M0.X 系列で看過されとった SSoT enum drift** を、M3.1 t3 の reviewer が **偶然** high severity finding として発見・修正。SSoT 規約持つ project で SSoT 群 (DB schema / event schema / UI store / config) 間の **cross-check 機構が無い** 構造 gap を露呈した（retro 2026-05-03-001 finding pj-002）。

### 2.2 Coding 原則: 文字列リテラル回避

backend / frontend 問わず、code 中の文字列リテラル（特に enum / status / type 値）を可能な限り **変数・定数・enum 経由** で比較・参照する。文字列直接比較ではなく **typed constant の比較** で保守性と SSoT 整合性を上げる方針。

- **理由**: 文字列直接記述は SSoT drift の温床、type system の保護を受けられず、refactor 時の検出が grep 頼みになる
- **具体例**:
  - ❌ `if (item.status === 'doing')` — 文字列直接
  - ✅ `if (item.status === PlanItemStatus.Doing)` — enum 参照
  - ✅ `import { planItemStatusEnum } from "../db/schema"` で primary SSoT を引っ張る

### 2.3 SSoT cross-check rule

enum / schema / status 値を複数 file で共有する場合：

1. **primary SSoT file 明示**: 当該値の source of truth となる単一 file を define（例: enum ならば DB schema が SSoT、event schema は派生）
2. **派生 file は import 経由**: primary SSoT file から `import type` or `import { ... }` で参照し、派生定義禁止。型 export pattern (SPEC §12 「daemon が AppRouter / Drizzle schema type を export、frontend が import type ...」) を活用
3. **import 不可な場合は test cross-check**: `<a>` と `<b>` で同 enum を独立に持つ必然性ある場合（例: zod schema と TS const が別 layer で必要）、両者の値が一致することを assert する test を必ず追加。`tests/REQUIREMENTS.md` に該当 cross-check assertion を REQ 化

### 2.4 適用対象

primary SSoT 候補（M3.1 retro 時点）:

| domain | primary SSoT | 派生 file 群 |
|---|---|---|
| plan_items status enum | `daemon/src/db/schema.ts` (Drizzle) | `daemon/src/events/types.ts` / `daemon/src/routes/plan.ts` / `ui/src/views/plan/*` / `ui/src/store/planConflict.ts` |
| TodoWrite status | `daemon/src/events/types.ts` (`todoChangeEventSchema`) | `ui/src/live/useTodoWrite.ts` / `ui/src/views/plan/PlanView.tsx` |
| toast event 種別 | `daemon/src/events/types.ts` (`loomEventSchema` discriminated union) | `ui/src/store/connection.ts` / `ui/src/notifications/toastBus.ts` |
| review_mode | `templates/claude-loom/project.json.template` (`rules.review_mode`) | `agents/loom-developer.md` / skills/loom-review/* |

### 2.5 reviewer 観点への組込

`skills/loom-review/SKILL.md` の各 review template (single SINGLE_REVIEWER_PROMPT_BODY + trio CODE_REVIEWER_PROMPT) の review checklist に「文字列リテラル直接比較の検出 → constant/enum 抽出提案 (severity: medium 候補)」「派生 file の SSoT cross-check 確認」を追加。

### 2.6 doc consistency checklist 連動

`docs/DOC_CONSISTENCY_CHECKLIST.md` に M3.1 retro 関連 section を追加し、enum / schema を持つ file を編集した時の派生 file cross-check 項目を明記する。

## 3. UI Smoke Test Skill (旧 master §3.6.11)

### 3.1 背景

retro 2026-05-04-001 で F-proc-005「t2 E2E verification gate effectiveness」を success record として記録、M5 t2 の bash + automated test 7-stage verification が 4 件 MVP-blocking bug を発見・修正した実例を codify。しかし**その verification layer は browser interactive を含まず**、Phase 1 MVP main 統合直後の Playwright MCP 経由 smoke test で **追加 4 件 critical bug**（Phaser 描画ゼロ / WS transform error / TodoWrite mock 残存 / Sidebar dead code）が発覚。「automated test green ≠ 画面が動く」gap を構造的に塞ぐ skill を新設。

### 3.2 Skill purpose

**画面要件・機能要件・design から test 戦略を derive、Playwright MCP browser tool 経由で実機 verify、構造化 report を返す。** UI 開発時のみ必要、blanket mandate せん **suggest skill** category（SPEC §3.10.1 mandate vs suggest table）。

### 3.3 4 stage pipeline (hybrid Option C)

| Stage | 方式 | output |
|---|---|---|
| **Stage 1: 戦略 derive** | AI prompt-driven (creative) | `docs/smoke-tests/<date>-<scope>/strategy.md` (route × expected behavior matrix) |
| **Stage 2: 実機 verify** | AI が SKILL.md 手順に従い Playwright MCP `browser_*` tool 駆動 (deterministic order) | `screenshots/<NN>-<route>.png` + `console.log` (各 route の error / warning capture) |
| **Stage 3: report 生成** | bundled script (`scripts/format-report.sh`、jq + bash) | `report.md` (REQ マッピング込み) + `findings.json` (machine-readable、JSON schema validate) |

### 3.4 Output 階層構造

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

### 3.5 Invocation pattern

3 pattern 全て support：

1. **`/loom-ui-smoke` slash command**: user 手動 ad-hoc smoke test
2. **`[loom-meta] suggest_skill=loom-ui-smoke` injection**: loom-developer / loom-pm が UI feature dispatch 時に skill 名注入、agent 自律判断で invoke
3. **自律 invoke (milestone closure default)**: loom-pm が `git tag -a m*-complete` 設置直後に skill 自動 invoke、F-proc-005 codify の 2 層 verification (bash E2E + browser smoke) 第 2 layer

### 3.6 Scope parameter

```bash
/loom-ui-smoke              # default = full (全 route navigate + verify、screenshot 取得)
/loom-ui-smoke route:plan   # 単一 route のみ（部分 verify）
/loom-ui-smoke smoke-only   # screenshot 取らず console error / DOM check only (light mode、CI-friendly)
```

### 3.7 dev server lifecycle (hybrid Option C)

skill 起動時に port 5757 (daemon) + 5173 (ui) listen 確認：

- **既起動**: 既存 dev session を流用 (user の `pnpm dev` 同居 friendly)
- **未起動 + `--auto-start` flag**: skill が `pnpm --filter @claude-loom/{daemon,ui} dev` を background 起動、smoke test 完了後に `lsof -tiTCP:<port> | xargs kill` で cleanup
- **未起動 + flag なし**: user に prompt「dev server 未起動、auto-start するか？」、yes で起動 / no で abort
- **graceful fallback**: ぴあぴあ port conflict 検出時は別 port で起動 retry or skill abort + 明確 error message

### 3.8 Failure handling（responsibility separation）

skill は **読み取り専用 + report 生成のみ**、bug 発見時に fix dispatch せん（SRP 整合）：

- skill final report に pass/fail 件数 + failure 詳細 (route × expected vs actual + screenshot ref) + recommended next action
- recommended action 候補: `loom-developer dispatch` (PM 経由)、retro session への carryover findings 提案、follow-up smoke test schedule
- PM がそれを受領して fix dispatch 判断（user 確認後）

### 3.9 依存

- **必須**: Playwright MCP tool 群 (`browser_navigate` / `browser_snapshot` / `browser_take_screenshot` / `browser_console_messages` / `browser_close`)
- **必須**: `bash` + `jq` (script formatter 用)
- **任意**: `pnpm dev` 起動済 (auto-detect、§3.7)
- skill `SKILL.md` 冒頭で dependency check 手順記載、不在時は graceful skip + WARN 出力

### 3.10 Consumer agents

primary: **loom-developer** (UI feature 実装完了時 + milestone closure E2E task)、secondary: **loom-pm** (milestone closure default invoke)。**loom-review skill の test aspect template は consumer 外** (review 責任が scope、execution は SRP 違反)。各 agent prompt に suggest skill 参照記述：

```
UI 関連 task / milestone closure verification の候補として `loom-ui-smoke` skill。
他 verification approach (Playwright e2e baseline / 手動 browser test) も agent 自律判断で可。
```

## 4. Design Implementation (旧 master §3.6.12)

### 4.1 背景

M0.11.3 で `loom-ui-smoke` skill 完成 + Phase 1 functional MVP 検証完了したが、実機 smoke で「automated test green ≠ design vision 達成」を user が指摘：13 cat agent + Stardew 系 pixel RPG room + 3 theme + RPG window chrome の design intent (PIXEL_ART_HANDOFF.md / SPEC §12 visual 方向性) が **placeholder 円 dot のまま** で aesthetic MVP closure 未達成。

design source: `claude-room-handoff.zip` (Claude Design tool export bundle、`/tmp/claude-room-handoff/claude-room/project/` 配置、index.html + 7 jsx component file + tokens.css + styles.css + 6 PNG asset)。本 milestone (M0.11.4) で full design implementation pass を実施、aesthetic MVP completion を達成。

### 4.2 戦略 A 確定: Phaser → DOM/SVG 採用

design は **all SVG + DOM + CSS** で構築 (Phaser 不使用)。M3.0 の Phaser 4 React mount infrastructure (§1.1 α-1) は **本 milestone で rollback**:

- **理由**: design CatSprite は `<svg viewBox="0 0 16 16">` + 32 個 `<rect>` で pixel grid 構築、Phaser WebGL 描画では design pixel-perfect 実現困難
- **trade-off**: M3.0 投資 (3 task = Phaser mount + tile + sprite state animation) は learning として archive、production code から Phaser 依存削除
- **Phase 2 evolution**: 将来 sprite 動的 animation 必要時に **要素単位** で Phaser 再導入余地、ただし Room view 全体じゃなく特定 component (例: 歩く猫 bar) のみ対象

### 4.3 §1.1 改訂 (Phaser α-1 → DOM/SVG α-2)

旧: 「Phaser 4 React 内 mount = 自前 `useEffect` + `useRef`」
新: 「**DOM/SVG pixel-perfect rendering = `<svg viewBox>` + `<rect shapeRendering="crispEdges">` + `image-rendering: pixelated` CSS**、library 依存ゼロ、design pixel-perfect、HMR 単純」

SPEC §12 確定値表の Phaser 行は **「M3.0 で Phaser 4 試行 → M0.11.4 で DOM/SVG 採用 (rollback)」** と注記、archive value として履歴保存。

### 4.4 Component port matrix (15 view + 共通 components)

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

### 4.5 Token + style primitives port

`ui/src/styles/tokens.css` を **design tokens.css + styles.css** の primitives で書き直し:

- 3 theme palette: `:root` (default = pop / cozy noon) + `.theme-dusk` + `.theme-night`、各 theme 約 25 個 `--p-*` variable (bg-sky / bg-floor / wall / wood / cat-base / cat-line / cat-cheek / screen / screen-glow / paper / tint / accent / success / error / warn / shadow / 等)
- RPG primitives: `.rpg-frame`, `.rpg-frame-tight`, `.rpg-title`, `.rpg-label`, `.dot`, `.chip`, `.exp-bar`, `.btn-px` (5 variant)
- Room primitives: `.room`, `.room__bg`, `.room-window`, `.room-sign` (5 variant), `.room-poster` (3 variant + sub-elements), `.room-island` (3 variant), `.room-floor-cushion`, `.room-mode-toggle`, `.room-modal`
- Subroom primitives: `.subroom-clone` + sub-elements, `.subroom-portal`
- 既存 Tailwind 設定 (`tailwind.config.ts`) は keep、新 RPG style primitive は **CSS variable 直参照** で coexist

### 4.6 MVP closure 再定義

| tag | 意味 | 状態 |
|---|---|---|
| `m5-complete` | **functional MVP completion** (機能完成) | 設置済 (2026-05-04) |
| `m0.11.3-complete` | **verification infra completion** (UI smoke skill 整備) | 設置済 (2026-05-05) |
| `m0.11.4-complete` (新) | **aesthetic MVP completion** (design vision 達成、Phase 1 真の MVP 完成) | M0.11.4 closure 時 |

`README.md` 「Phase 1 MVP completed」記述は m0.11.4 完成時に **完全達成** marker として update、aesthetic + functional の両輪 closure を user に明示。

### 4.7 Phaser dependency removal

`ui/package.json` から `phaser` (^4.1.0) dependency 削除、関連 file (`ui/src/views/room/PhaserCanvas.tsx`、`ui/src/views/room/scenes/RoomScene.ts`、`ui/src/views/room/agentSpriteSync.ts`) を **物理削除** (SPEC §3.9.x P4 理想形「symptomatic patch 構造解決後の rollback」と同 pattern、Phaser infra rollback)。Playwright e2e baseline (`ui/e2e/__screenshots__/room-baseline.spec.ts-snapshots/room-pop.png`) は新 design 実装後に再生成。

## 5. Ceremony Reduction Trinity Marker (旧 master §3.6.13)

claude-loom Phase 1 closure trinity (M0.11.5 / M0.11.6 / M0.11.7) で codify された design principle 「**context から intent 読めるなら ceremony 強制せえ**」の cross-reference を 1 箇所で参照可能にする SSoT marker。Phase 2 candidate 設計時に毎回 3 章探索コストが発生する discoverability gap を解消する。

| trinity 章 | milestone | scope | rationale |
|---|---|---|---|
| **§3.2** Lazy Daemon ライフサイクル | M0.11.5 | session 開始時の SessionStart hook + slash command dual path で UI auto-launch、cold-start-only browser open | user が `/loom-pm` 起動直後に GUI を自然に視界へ出す ceremony reduction、context = "loom PJ 開始した" → intent = "GUI も見たい" の自動推論 |
| **§3.6.8.9** PM Auto-Spec Entry | M0.11.6 | PM が context (PLAN.md status / git log / SPEC.md unchanged time) から spec phase 必要性を probe、auto-entry | user が `/loom-spec` 明示宣言不要、context = "milestone 境界 + SPEC drift" → intent = "spec 確認したい" の自動推論 |
| **§3.6.8.10** PM Auto-Go Entry | M0.11.7 | PM が context (PLAN.md status / spec phase 完了 marker) から impl phase 必要性を probe、auto-entry | user が `/loom-go` 明示宣言不要、context = "spec done + PLAN ready" → intent = "実装着手したい" の自動推論 |

**共通 design principle**:
- ceremony (明示 slash command 宣言) は default off、context probe で intent を満たせない時のみ user が ceremony で override
- 全 trinity 章は `spec/harness.md` §4.7 path C (degraded mode = first-class operating mode) と整合、Bash tool 単体で context probe 可能 (Task tool 不要)
- intent keyword (`/loom-spec` / `/loom-go` invoke 直前の user 文言) を SPEC §3.6.8.9 / §3.6.8.10 に列挙、PM は keyword 検出で auto-entry の信頼度を上げる

**Phase 2 application**: Phase 2 candidate (`Phase 2 candidate pool: UX refinement series`) の優先順位判定軸として、本 marker を 1st-class 評価軸とする。「該当 candidate が ceremony reduction trinity の延長線上にあるか」を design phase で確認すること。

**M0.15 continuation marker** (retro 2026-05-12-001 F-res-003 由来、success record):

Phase 1 closure trinity (M0.11.5/6/7) で codify した design principle 「context から intent 読めるなら ceremony 強制せえ」 の **UI 側 hardening 続編** として、§6 M0.15 UI Redesign Port が結実。trinity の自己再帰的開発 workflow (lazy daemon + auto-spec + auto-go) が 12 画面の visual surface を最終完成させ、Phase 2 Kickoff (M1.0) の事前条件達成。dogfood phase の continuous self-improvement loop が **M0.11.5 → M0.15** 連続成功し、M0.15 を Phase 1 hardening trinity の "final visual surface" marker として位置付ける。

## 6. UI Redesign Port (旧 master §3.6.14)

claude.ai/design で詰めた UI 再設計を本実装に書き起こす milestone scope の SSoT。設計の納品物 (`redesign/scenarios.js` + `redesign/screens/*.jsx` + `redesign/Redesign App.html` + `redesign/cat.jsx` + `redesign/styles.css` + `redesign/tokens.css` + `redesign/_chat{1,2}.md`) は claude-loom リポジトリ内 `redesign/` 配下に保管され、本 milestone 完了後も **絶対に削除されない** 不変な mock fixture / data dependency 仕様書として運用する。

### 6.1 Scope と前提

- **対象**: 既存 `ui/src/views/` 下の M0.11.4 で実装された Phase B aesthetic MVP のハードコード fixture (例: `AGENT_STATES = [{ task: "GREEN にする" }, ...]` 系) を全 12 画面で撤去、`useScenario()` 経由の scenario 駆動に書き換える
- **対象外**: `redesign/` 配下の prototype HTML/JSX 自体（mock fixture として永続保管、§6.3 absolute rule）
- **前提**: M0.X-startup-recovery + M0.11.5/6/7 (Phase 1 closure trinity) + M5 (M3 prep cleanup) 完了済、daemon broadcaster が 15 event 型 emit (agent.change / plan.change / finding.new / approval.request / event.raw / learned_guidance.change / worktree.change / discipline_metric.update / todo.change / plan.conflict / session.change / spec_change_detected + **M0.15 t13 追加**: pm.message / pm.permission_request / pm.permission_resolved)、daemon に 17 sub-router (agent / approval / coexistence / config / consistency / discipline / events / note / personality / plan / prefs / project / retro / session / token / worktree + **M0.15 t13 追加**: pm) 実装済

### 6.2 Phase 1 closure trinity との関係

§5 で codify された 「context から intent 読めるなら ceremony 強制せえ」 design principle の **UI 側 hardening** = Phase 1 hardening trinity の論理的続編として位置付け：

| trinity 章 | M0.15 での visual surface 完成 |
|---|---|
| §3.2 Lazy Daemon ライフサイクル (M0.11.5) | UI auto-launch flow → M0.15 で実 user-visible 12 画面が live data で動く |
| §3.6.8.9 PM Auto-Spec Entry (M0.11.6) | ③ Plan view + Room poster で auto-entry 結果が可視化 |
| §3.6.8.10 PM Auto-Go Entry (M0.11.7) | ② Gantt view で impl phase の dispatch live が可視化 |

M0.15 は Phase 1 trinity が成立させた「dogfood phase の自己再帰的開発 workflow」の **最終 visual surface** を完成させる milestone。Phase 2 Kickoff (M1.0) の事前条件。

### 6.3 Mock fixture 保全規律 (絶対消すな rule、harness gate)

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

scenarios.js の **fixture 内容** に変更が必要な場合は、(a) `redesign/api/mock-fixtures.ts` を新設して production 用 fixture を別管理する、または (b) 本 SPEC §6 を update して新 milestone scope で再 design する、のいずれか。直接 edit は禁止。

**REQ 採番 PM 一括 append rule** (retro 2026-05-12-001 F-proc-004 由来):

並列 batch dispatch で複数 dev が `tests/REQUIREMENTS.md` に同時 REQ 番号を採番すると衝突する (実観測: M0.15 で REQ-068 が t8 Sessions / t10 Settings の両方で claim、REQ-070 が t11 Consistency / t8 Sessions で claim)。これを構造的に回避するため、parallel batch 内の dev には `tests/REQUIREMENTS.md` への REQ entry append を **task 内で禁止**し、PM が milestone closure 段階で全 REQ entry を一括 append する規律を採用する。

- **dispatch prompt 規約**: PM が parallel batch dispatch する subagent prompt に「本 task では `tests/REQUIREMENTS.md` は touch 禁止 (PM closure 一括 append rule)」を明示
- **PM 一括 append 手順**: milestone closure (m\*-complete tag 設置直前) で PM が全 task の REQ entry を連番で append、各 entry に commit_sha を含めて trace 可能化
- **dev report 規約**: dev は final report に `REQ_id_proposal` field を含めて PM に通知、PM が一括 append 時に整合 verify
- **single dev task では適用不要** (single dev は通常通り REQ entry を自身で書く)、parallel batch (3+ dev simultaneous) のみ本 rule 適用

### 6.4 Phase 構成 (6 phase / 22 task) — PLAN SSoT 参照

PLAN.md M0.15 section が task list の SSoT。本 SPEC は Phase 構成の概要のみ:

1. **Phase 1**: reducer foundation (1 task, sequential) — `redesign/api/websocket.ts` に 8 event reducer 追加
2. **Phase 2**: parallel screen batches (3 batch × 3 task = 9 task, worktree isolation 必須) — 12 画面のうち 9 画面 (Gantt / Plan / Worktree / Customization / Guidance / AgentDetailPanel / Sessions / Tokens / Settings)
3. **Phase 3**: 中信頼 + PMChat (3 task) — Consistency / Retro + ⑬ PMChat (daemon `pm.*` sub-router 新設、3 新 event 型追加)
4. **Phase 4**: shell + posters (2 task) — AppShell.tsx redesign 移植 + Room 3 posters scenario 化
5. **Phase 5**: write API hookup (2 task) — 既存 daemon REST に button hook + PMChat write
6. **Phase 6**: closure gates (5 task) — harness test / doc update / Layer 2.5 smoke / Playwright e2e / `m0.15-complete` tag + retro hook

reviewer mode: single default、trio opt-in は 3 task のみ (⑦ Customization t5 / ⑬ PMChat t13 / Layer 2.5 smoke t20)。

### 6.5 Layer 2.5 dogfood smoke matrix (closure 必須、SPEC §10.4.1 整合)

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

**Step 8 (M0.16 から、`spec/ui-arch.md` §7 構造昇格)**: `act -W .github/workflows/ci.yml pull_request --container-architecture linux/amd64` で local CI simulation 全 green を確認 (Docker daemon 起動が前提)。M0.16 で codify した push 前 CI red detect gate。Docker daemon 不在時は skip 注記 + retro candidate finding として記録、closure 自体は block しない (graceful fallback、`spec/ui-arch.md` §7.4 SSoT)。

任意 step 失敗 → tag 設置 BLOCK (Step 8 は graceful fallback 例外)、failed step を user に報告 + fix task を PLAN.md に追加して closure 延期。

**Playwright baseline regenerate workflow** (retro 2026-05-12-001 F-res-002 由来、M0.16 で structural fix 完了予定):

UI redesign で既存 baseline screenshot (例: `ui/e2e/__screenshots__/room-baseline.spec.ts-snapshots/room-{pop,dusk,night}.png`) が visual 変化により diff 検出する場合、baseline を意図的に regenerate する手順:

1. `pnpm --filter @claude-loom/ui e2e --update-snapshots` で baseline 再生成
2. `git diff --stat ui/e2e/__screenshots__/` で変更画像数を確認、想定範囲内か audit
3. 該当 baseline を commit (commit message に `[playwright-baseline-regenerate]` annotation 必須、retro 検出可能化)
4. 後続 milestone で意図しない visual regression が起きた時、本 commit を遡って原因 milestone を特定可能化

### 6.6 完成基準 (PLAN.md M0.15 完成基準と整合)

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

## 7. Playwright e2e OS-aware Baseline + local CI parity gate (旧 master §3.6.15)

retro 2026-05-12-001 で defer codify した F-res-002 (Playwright baseline regenerate workflow workaround) を post-merge follow-up で Phase 2 hardening continuation milestone として structural fix する。M0.15 PR #9 で 4 連続 post-tag-hotfix (`9dfd307` → `41e8d0a` → `697fc97` → `1ed449c`) を経験した「local pass → CI red」dogfood gap を構造解消し、Phase 2 entry の reliability foundation を整える。

### 7.1 Scope と前提

- **対象**: 3 axis structural fix
  1. `snapshotPathTemplate` を OS-aware に refactor (`{snapshotDir}/{testFilePath}-snapshots/{arg}-{platform}{ext}`)
  2. CI workflow に `workflow_dispatch` trigger + `--update-snapshots` step + auto-PR で CI Linux baseline 自動生成
  3. Layer 2.5 dogfood smoke (§6.5) に Step 8 = `act` で CI simulation 全 green を必須 step として codify
- **対象外**: visual regression test 自体の structure (M0.15 t21 で確立済の 13 screen + 3 click flow + 3 room baseline は維持)、`playwright.config.ts` 以外の global config 変更
- **前提**: M0.15 closure 済 (Phase 1 hardening trinity + UI Redesign Port 完了)、Phase 1 closure trinity continuation marker 成立 (§5 末尾)、Docker daemon が user 環境で利用可能 (act 依存)

### 7.2 retro 2026-05-12-001 F-res-002 との関係

| stage | retro 時 | post-merge follow-up (本 milestone trigger) | M0.16 structural fix |
|---|---|---|---|
| status | low / proposal / workaround spec として codify | PR #9 で 4 連続 hotfix iteration、user の dogfood gap 観察を contextual surface | 3 axis 全 structural fix で 90%+ resolved |
| coverage | Playwright regenerate workflow の手順 doc | per-test threshold + fullPage 戦略の trial & error | snapshotPathTemplate OS-aware + CI workflow + act Step 8 |

retro 段階では「snapshotPathTemplate を OS 別 baseline 別 path に分ける structural fix を Phase 2 で codify」と defer された。M0.15 closure 後の PR #9 hotfix iteration で user の指摘 (「local pass → CI red を local で検知できる仕組みが必要」) を受けて、structural fix の Phase 2 milestone 化が urgent と判断、M0.16 として early Phase 2 入り。

### 7.3 Phase 構成 (4 phase / 11 task) — PLAN SSoT 参照

PLAN.md M0.16 section が task list の SSoT。本 SPEC は Phase 構成の概要のみ:

1. **Phase 1**: snapshotPathTemplate OS-aware refactor (2 task) — playwright.config.ts edit + 既存 baseline migrate (`<arg>.png` → `<arg>-darwin.png` rename + local Playwright 19/19 verify)
2. **Phase 2**: CI Linux baseline 生成 (2 task) — `.github/workflows/ci.yml` に `workflow_dispatch` trigger + `--update-snapshots` step + auto-PR (or auto-commit) 追加、初回 invoke で Linux baseline 自動生成
3. **Phase 3**: Layer 2.5 act integration (3 task) — §6.5 に Step 8 codify + `agents/loom-pm.md` closure workflow 更新 + `tests/act_smoke_test.sh` 新設 (optional harness、Docker daemon 不在時 graceful skip)
4. **Phase 4**: doc + closure (4 task) — SCREEN_REQUIREMENTS / DOC_CONSISTENCY_CHECKLIST update + REQUIREMENTS REQ append + Layer 2.5 dogfood smoke (Step 8 含む self-test) + tag

reviewer mode: single default、CI workflow 変更 (Phase 2 t3) は security 観点 review で trio opt-in 候補 1 task。

### 7.4 act 依存と graceful fallback

`act` (https://github.com/nektos/act) は GitHub Actions を local Docker container で再現するツール。M0.16 で Layer 2.5 Step 8 として必須化するが、以下の graceful fallback 規律を codify:

- **Docker daemon 起動**: `docker info` で daemon 接続確認、不在時 act invocation skip + Layer 2.5 dogfood smoke は Step 8 skip notice を report に記録 (full GREEN とは扱わない、partial GREEN として user 認識可能化)
- **act install 不在**: `command -v act` で binary 確認、不在時 user に `brew install act` (macOS) / `gh extension install nektos/gh-act` (gh extension) を案内 + skip
- **platform option**: macOS local で act 起動時は `--container-architecture linux/amd64` flag で qemu emulation (Apple Silicon 上で linux/amd64 image を強制) を推奨、Layer 2.5 Step 8 invocation の standard option として codify
- **PR closure block ではない警告**: act skip でも Layer 2.5 Step 1-7 + Playwright e2e local pass が達成済なら closure 可、ただし retro 候補 finding として記録 (CI red を push 前検知する gate が欠落している事実)

### 7.5 完成基準

- [ ] `ui/e2e/playwright.config.ts` の `snapshotPathTemplate` が `{snapshotDir}/{testFilePath}-snapshots/{arg}-{platform}{ext}` に refactor
- [ ] 既存 baseline (M0.15 t21 生成分) を `<arg>-darwin.png` に migrate、`pnpm --filter @claude-loom/ui exec playwright test --config e2e/playwright.config.ts e2e/m0.15-redesign/` で 19/19 pass
- [ ] `.github/workflows/ci.yml` に `workflow_dispatch` trigger + Linux baseline 生成 step 追加
- [ ] CI workflow_dispatch invoke で `<arg>-linux.png` 自動生成 + auto-PR が機能、main 取込み後 CI Linux + local darwin 両環境で Playwright e2e 全 pass
- [ ] §6.5 Layer 2.5 dogfood smoke に Step 8 = `act` invocation 必須化、Step 7 までと同等 importance
- [ ] `agents/loom-pm.md` closure workflow に Step 8 `act` invocation 必須 step として codify、graceful fallback (Docker 不在時 skip + retro finding 記録) 規律も明記
- [ ] `tests/act_smoke_test.sh` 新設 (optional harness)、`bash tests/run_tests.sh` で auto-glob discover、Docker daemon 起動時のみ実 invoke、不在時 skip
- [ ] `docs/SCREEN_REQUIREMENTS.md` / `docs/DOC_CONSISTENCY_CHECKLIST.md` M0.16 check items update
- [ ] `learned_guidance lg-2026-05-13-001` (project-prefs.json local persist、ttl: until-m0.16-complete) を §7 で formal 規律として昇格、ttl expire
- [ ] tag `m0.16-complete` 設置 + retro hook trigger
- [ ] `m0`〜`m0.15-complete` 全 tag 保持
