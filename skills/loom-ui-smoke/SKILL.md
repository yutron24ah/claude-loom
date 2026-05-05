---
name: loom-ui-smoke
description: claude-loom UI 開発時の browser-interactive smoke test skill。SCREEN_REQUIREMENTS / 機能要件 / design から test 戦略を derive、Playwright MCP browser_* tool で実機 verify、`docs/smoke-tests/<date>-<scope>/` に構造化 report 出力。SPEC §3.6.11 + §10.4 SSoT。M0.11.3 から、suggest skill (UI 開発時のみ)。
---

# loom-ui-smoke

claude-loom UI 開発時の **browser-interactive smoke test** skill。「automated test green ≠ 画面が動く」gap を構造的に塞ぐ。SPEC §3.6.11 + §10.4 SSoT。

## Purpose

画面要件 (`docs/SCREEN_REQUIREMENTS.md`)・機能要件 (`SPEC.md`)・design token から **test 戦略を AI が derive** し、Playwright MCP `browser_*` tool 経由で **実機 verify**、構造化 report を返す。UI 開発時のみ必要な **suggest skill** (§3.10.1 mandate vs suggest table)。

**解決する gap**: bash unit test + vitest が通っていても Phaser 描画ゼロ / WS transform error / mock 残存 / dead code といった「実機でしか見えない破綻」を検出できない。本 skill は Playwright MCP を通じた実ブラウザ verification で Layer 2 を担う (§10.4)。

---

## Pre-flight checklist

skill 起動時、最初に以下の依存を確認する。不在時は **WARN + skip**（強制終了せず実行可能な範囲で継続）。

### 必須依存

```bash
# 1. Playwright MCP tool 可用性確認
#    browser_navigate が callable か session で確認
#    利用不可の場合: WARN を出力してスキルを abort
echo "Playwright MCP: browser_navigate / browser_snapshot / browser_take_screenshot / browser_console_messages / browser_close が必要"

# 2. bash + jq 確認 (Stage 3 report formatter 用)
if ! command -v bash &>/dev/null; then
  echo "WARN: bash not found — Stage 3 script 実行不可" >&2
fi
if ! command -v jq &>/dev/null; then
  echo "WARN: jq not found — findings.json validation skip" >&2
fi
```

### 任意依存

- `pnpm dev` 起動済 (auto-detect、§3.6.11.7 / dev server lifecycle section 参照)

### graceful skip 規約

| 依存 | 不在時の挙動 |
|---|---|
| Playwright MCP | WARN 出力 + skill abort（browser 操作不可能のため続行不能） |
| jq | WARN 出力 + findings.json JSON schema validate step をスキップ |
| bash | WARN 出力 + Stage 3 script 呼び出し skip（report.md は AI 生成で代替） |
| dev server | §3.6.11.7 の lifecycle protocol に従い auto-start prompt または abort |

---

## dev server lifecycle

> SPEC §3.6.11.7 — hybrid Option C

skill 起動時に port 5757 (daemon) + 5173 (ui) listen を確認：

```bash
# port listen 確認コマンド
lsof -iTCP:5757 -sTCP:LISTEN 2>/dev/null | grep -q LISTEN && echo "daemon: running" || echo "daemon: not running"
lsof -iTCP:5173 -sTCP:LISTEN 2>/dev/null | grep -q LISTEN && echo "ui: running" || echo "ui: not running"
```

### 分岐判断

| 状態 | 挙動 |
|---|---|
| **既起動** | 既存 dev session を流用（user の `pnpm dev` 同居 friendly） |
| **未起動 + `--auto-start` flag** | `skills/loom-ui-smoke/scripts/start-servers.sh` を invoke して daemon + UI を background 起動、smoke test 完了後に `lsof -tiTCP:<port> | xargs kill` で cleanup |
| **未起動 + flag なし** | user に prompt「dev server 未起動、auto-start するか？」、yes で `--auto-start` 相当を実行、no で skill abort |
| **port conflict** | 別 port で起動 retry or skill abort + 明確 error message |

`scripts/start-servers.sh` の実装は Stage 2 dev-C 担当（本 SKILL.md が命名 SSoT）。

---

## Stage 1: 戦略 derive

> AI prompt-driven (creative phase)
> Output: `docs/smoke-tests/<YYYY-MM-DD>-<scope>/strategy.md`

### 読込み source

以下のファイルを Read して test 戦略を導出する：

1. `docs/SCREEN_REQUIREMENTS.md` — 9 view の要件定義
2. `SPEC.md §3.6.9` — 各 view の機能仕様
3. `docs/PIXEL_ART_HANDOFF.md` — sprite / tile / theme 仕様
4. `ui/src/styles/tokens.css` — 3 theme color token (pop/dusk/night)
5. `tests/REQUIREMENTS.md` — 受入要件 ID (REQ-xxx マッピング用)
6. `ui/src/routing/routes.tsx` (または相当する routing 定義ファイル) — route 一覧

### 戦略 derive 手順

各 route について以下を推論する：

1. **expected DOM elements** — 必須 DOM node / aria label / text content
2. **expected canvas state** — Phaser canvas mount / WebGL context (RoomView のみ)
3. **expected interactions** — click / navigate / WS data 流通の期待動作
4. **REQ refs** — 対応する受入要件 ID (REQ-xxx)

### strategy.md 出力フォーマット

```markdown
# Smoke Test Strategy — <YYYY-MM-DD> <scope>

## Scope: <full|route:<name>|smoke-only>

## Route matrix

| route | expected DOM elements | expected canvas state | expected interactions | REQ refs |
|---|---|---|---|---|
| /room | agentList, canvas#phaser-canvas | Phaser mounted, WebGL active | agent sprite visible | REQ-032 |
| /plan | gantt-container, plan-items | n/a | plan item click navigates | REQ-033 |
| /retro | retro-findings, lens-tabs | n/a | tab switch, finding expand | REQ-034 |
| ... | ... | ... | ... | ... |

## Known risk areas
<Phase 1 MVP 以降で発覚した past bug pattern を列挙、重点 verify 対象>
- Phaser 描画ゼロ (RoomView): WebGL context 欠如 / canvas mount 失敗
- WS transform error: zod schema mismatch による subscription failure
- Mock 残存: TodoWrite mock が production build に混入
- Sidebar dead code: navigate しても UI 更新されない
```

### output path

```
docs/smoke-tests/<YYYY-MM-DD>-<scope>/strategy.md
```

`<scope>` は invocation parameter から取得（`full` / `route:<name>` / `smoke-only`）。

### Phase 2 carryover (retro 2026-05-06-001 F-res-001 由来)

M0.11.5 lazy daemon auto-launch + 7 種 slash command 拡張 (`/loom-pm` / `/loom-spec` / `/loom-go` / `/loom-retro` / `/loom-status` / `/loom-mode` / `/loom-worktree`) で daemon trigger + browser open + WebSocket event 流通 の e2e UX が Phase 2 検証スコープに入る。本 SKILL.md scope を Phase 2 entry 時に下記項目で拡張：

- **daemon auto-launch trigger**: cold-start (daemon 不在状態) で slash command 発火 → `hooks/loom-launch-ui.sh` 経由で daemon 起動 + browser open 動作
- **headless detection**: `SSH_CONNECTION` / `DISPLAY` 不在環境で browser open skip + URL stdout 出力動作
- **LOOM_NO_UI override**: `LOOM_NO_UI=1` 環境変数で browser open skip + URL print 動作
- **clipboard copy** (option): URL stdout を pipe で `pbcopy` / `xclip` に流す UX 動作
- **warm-start path**: daemon 既起動状態で同 slash command 再発火 → health-check のみで browser 再 open しない動作
- **install.sh dependency audit pair**: REQ-046 (daemon.js symlink bootstrap、retro F-USER-001 hotfix) と pair で「`bash install.sh` 後に slash command auto-launch 動作」を browser smoke で verify

実装は Phase 2 entry milestone (推定 M0.11.x or Phase 2 1st task) で本 SKILL.md scope に組込、checklist 追加。

---

## Stage 2: 実機 verify

> AI が SKILL.md 手順に従い Playwright MCP `browser_*` tool を deterministic order で駆動
> Output: `screenshots/<NN>-<route>.png` + `console.log` (各 route の error/warning)

### verify 手順（deterministic order）

各 route について以下を **この順序で** 実行する：

```
a. browser_navigate で URL を開く
   → http://localhost:5173/<route>

b. browser_snapshot で accessibility tree を取得
   → strategy.md の expected DOM elements と照合
   → mismatch は assertion failure として記録

c. browser_take_screenshot で screenshot を保存
   → path: docs/smoke-tests/<date>-<scope>/screenshots/<NN>-<route>.png
   → smoke-only scope の場合はこの step をスキップ

d. browser_console_messages で console error / warning を capture
   → error level: assertion failure として記録
   → warning level: report に記録（failure には昇格しない）

e. expected DOM / canvas / interaction を strategy.md と照合
   → canvas state は `browser_evaluate` で document.querySelector('canvas') 確認
   → assertion result を console.log に追記
```

### screenshot 命名規約

```
01-home.png       → route /
02-room.png       → route /room
03-plan.png       → route /plan
04-retro.png      → route /retro
05-worktree.png   → route /worktree
06-consistency.png→ route /consistency
07-customization.png → route /customization
08-learned-guidance.png → route /learned-guidance
09-char-sheet.png → route /char-sheet
```

NN は 01 始まり 2 桁ゼロ埋め、route 名は kebab-case。

### console.log 集約

```
docs/smoke-tests/<date>-<scope>/console.log
```

各 route の console output を append、フォーマット：

```
=== route: /room ===
[error] TypeError: Cannot read properties of undefined ...
[warn]  WebSocket connection unstable
=== route: /plan ===
(no errors)
```

### Stage 2 cleanup

```bash
# browser close
browser_close

# auto-start した場合のみ dev server kill
if [ "$AUTO_STARTED" = "true" ]; then
  lsof -tiTCP:5757 | xargs kill 2>/dev/null || true
  lsof -tiTCP:5173 | xargs kill 2>/dev/null || true
fi
```

---

## Stage 3: report 生成

> bundled script 呼び出し (jq + bash)
> Output: `report.md` (human-readable) + `findings.json` (machine-readable)

### script 呼び出し

```bash
skills/loom-ui-smoke/scripts/format-report.sh \
  --strategy  "docs/smoke-tests/<date>-<scope>/strategy.md" \
  --console   "docs/smoke-tests/<date>-<scope>/console.log" \
  --screenshots-dir "docs/smoke-tests/<date>-<scope>/screenshots/" \
  --output-dir "docs/smoke-tests/<date>-<scope>/"
```

`scripts/format-report.sh` の実装は Stage 2 dev-B 担当（本 SKILL.md が命名 SSoT）。

### report.md フォーマット

```markdown
# Smoke Test Report — <YYYY-MM-DD> <scope>

## Summary
- Total routes: N
- Passed: N
- Failed: N
- Warnings: N

## Results by route

### /room — PASS / FAIL
- DOM check: PASS / FAIL (detail)
- Canvas check: PASS / FAIL (detail)
- Console errors: 0 / N
- Screenshot: screenshots/02-room.png
- REQ refs: REQ-032

...

## Recommended next action
<pass 時>: No action required. All routes verified.
<fail 時>: loom-developer dispatch 推奨 (PM 経由)、or retro carryover findings として積む
```

### findings.json フォーマット

```json
{
  "schema_version": 1,
  "date": "YYYY-MM-DD",
  "scope": "full|route:<name>|smoke-only",
  "summary": {
    "total": 9,
    "passed": 8,
    "failed": 1,
    "warnings": 2
  },
  "findings": [
    {
      "route": "/room",
      "status": "fail",
      "assertion": "canvas#phaser-canvas found",
      "expected": "canvas element present",
      "actual": "canvas not found in DOM snapshot",
      "screenshot": "screenshots/02-room.png",
      "req_refs": ["REQ-032"],
      "console_errors": ["TypeError: ..."]
    }
  ]
}
```

`templates/findings.schema.json` で JSON schema validate する。schema ファイルの実装は Stage 2 dev-B 担当（本 SKILL.md が命名 SSoT）。

### Stage 3 final report

Stage 3 完了後、AI が以下を PM / user に返却する：

```
## loom-ui-smoke Report — <scope>

Passed: N / Total: N   Warnings: N

<failed route が 1 件以上の場合>
### Failures
- /room: canvas not found (REQ-032)

### Recommended next action
loom-developer dispatch (PM 経由) で RoomView Phaser mount 修正を推奨。
findings: docs/smoke-tests/<date>-<scope>/findings.json
```

---

## Scope parameter

> SPEC §3.6.11.6

```bash
/loom-ui-smoke              # default = full (全 route navigate + verify、screenshot 取得)
/loom-ui-smoke route:plan   # 単一 route のみ（部分 verify）
/loom-ui-smoke smoke-only   # screenshot 取らず console error / DOM check only (light mode、CI-friendly)
```

### scope 解釈手順

1. invocation 引数を parse する（space / colon 区切り）
2. 引数なし → `full` を採用
3. `route:<name>` → route filter を `/<name>` に設定、Stage 2 で該当 route のみ実行
4. `smoke-only` → Stage 2 の `browser_take_screenshot` step をスキップ
5. scope を strategy.md の header に明記

---

## Failure handling

> SPEC §3.6.11.8 — responsibility separation

skill は **読み取り専用 + report 生成のみ**。bug 発見時に fix dispatch しない（SRP 整合）。

### 責務の明確な分離

| 責務 | 担当 |
|---|---|
| smoke test 実行 + report 生成 | **loom-ui-smoke skill** (本 skill) |
| fix dispatch 判断 | **PM** (user 確認後) |
| fix 実装 | **loom-developer** (PM から dispatch) |

### skill final report の内容

- pass/fail 件数 + failure 詳細 (route × expected vs actual + screenshot ref)
- recommended next action 候補：
  - `loom-developer dispatch` (PM 経由) で fix 実装
  - retro session への carryover findings 提案
  - follow-up smoke test schedule (hotfix 後の再 verify)

### エラーとの区別

| 種別 | 扱い |
|---|---|
| assertion failure (DOM mismatch / canvas 不在 / WS error) | findings.json の `status: fail` として記録 |
| console warning | report に記録、failure 扱いしない |
| skill 実行エラー (Playwright MCP 不在 / dev server 起動失敗) | skill abort + 明確エラーメッセージ |

---

## Output 階層構造

> SPEC §3.6.11.4

```
docs/smoke-tests/                              ← git-tracked (UI verification 履歴)
└── <YYYY-MM-DD>-<scope>/                     ← <date>-<scope>、scope = milestone tag or hotfix label
    ├── strategy.md                           ← Stage 1 derive 結果
    ├── report.md                             ← Stage 3 final report (human-readable)
    ├── console.log                           ← 全 route 通しの error + warning collected
    ├── findings.json                         ← machine-readable findings (JSON schema validate 済)
    └── screenshots/
        ├── 01-home.png                       ← <NN>-<route>.png
        ├── 02-room.png
        └── ...
```

### path 命名規約

- `<YYYY-MM-DD>`: 実行日 (JST)
- `<scope>`: `full` / `route-<route-name>` / `smoke-only`
- milestone closure 時の scope 例: `2026-05-04-full` / `2026-05-04-route-room`

---

## Invocation patterns

> SPEC §3.6.11.5

3 pattern 全て support：

### 1. slash command (user 手動 ad-hoc)

```
/loom-ui-smoke
/loom-ui-smoke route:plan
/loom-ui-smoke smoke-only
```

`commands/loom-ui-smoke.md` が slash command 定義を持つ（Stage 2 dev-B が実装、本 SKILL.md が命名 SSoT）。

### 2. suggest skill injection (agent 自律判断)

loom-developer / loom-pm が UI feature dispatch 時に `[loom-meta]` prefix へ注入：

```
[loom-meta] suggest_skill=loom-ui-smoke
```

agent は注入を受けて自律判断で invoke。invoke 基準：
- UI コンポーネント追加 / 変更を含む実装完了時
- Phaser / WS / routing 変更を含む milestone closure 時

### 3. 自律 invoke (milestone closure default)

loom-pm が `git tag -a m*-complete` 設置直後に skill を自動 invoke：

```
# loom-pm 内の milestone closure hook
git tag -a m<N>-complete -m "..."
# → loom-ui-smoke skill を full scope で invoke
# F-proc-005 codify の 2 層 verification (bash E2E + browser smoke) 第 2 layer
```

---

## Stage 2 dev 向け script + template path 仕様（命名 SSoT）

本 SKILL.md が以下の path を確定する。Stage 2 担当 dev はこの path に実装すること。

### scripts/

| file | 担当 | 役割 |
|---|---|---|
| `skills/loom-ui-smoke/scripts/start-servers.sh` | Stage 2 dev-C | hybrid Option C 補助。port 5757/5173 listen 確認、`--auto-start` flag 対応、dev server lifecycle |
| `skills/loom-ui-smoke/scripts/format-report.sh` | Stage 2 dev-B | deterministic report formatter。strategy.md + console.log + screenshot list → report.md + findings.json 生成 |

### templates/

| file | 担当 | 役割 |
|---|---|---|
| `skills/loom-ui-smoke/templates/findings.schema.json` | Stage 2 dev-B | findings.json の JSON schema (jq validate 用) |

### commands/

| file | 担当 | 役割 |
|---|---|---|
| `commands/loom-ui-smoke.md` | Stage 2 dev-B | slash command 定義、valid frontmatter + `--scope=full|route:<name>|smoke-only` parameter 認識 |

---

## 不変条件

skill は以下の操作のみ実施する。これ以外の操作は **SRP 違反**：

| 許可操作 | 禁止操作 |
|---|---|
| `Read` — docs / SPEC / routing 等の読込み | production code 編集（`Edit` / `Write`） |
| Playwright MCP `browser_*` tool — 実機 verify | fix dispatch (loom-developer や loom-pm への Task 送信) |
| `Bash` — report script 呼び出し + port check | SPEC.md / PLAN.md の編集 |
| `Write` — `docs/smoke-tests/` 配下のみ | `docs/smoke-tests/` 外のファイル書込み |
| `Bash` — dev server cleanup (auto-start した場合のみ) | git commit |

### 補足

- `docs/smoke-tests/` ディレクトリは git-tracked（UI verification 履歴を保持）
- findings.json は machine-readable → PM / retro agent が読込んで action plan に転換可能
- skill 自身は report + recommended action 提案のみ、fix の実施は PM 判断

---

## いつ使うか

- UI 機能実装完了後（loom-developer が suggest skill として invoke）
- milestone closure 時（loom-pm が自律 invoke）
- hotfix 後の regression verify（user または PM が手動 invoke）
- 「画面が動くか確認したい」という場面（user が `/loom-ui-smoke` で手動 invoke）

## 使わない場面（YAGNI）

- daemon-only の milestone（UI 変更なし）
- agent-prompt-only の milestone（UI 変更なし）
- Playwright MCP が利用不可の環境（graceful abort）

---

## 関連参照

- `SPEC.md §3.6.11` — UI Smoke Test Skill 全 10 sub-section (SSoT)
- `SPEC.md §10.4` — Browser-interactive verification layer (2 層 verification 規約)
- `docs/SCREEN_REQUIREMENTS.md` — 9 view の UI 要件
- `tests/REQUIREMENTS.md REQ-044` — acceptance 仕様
- `agents/loom-developer.md` — Consumer agent (UI feature 実装時)
- `agents/loom-pm.md` — Consumer agent (milestone closure 自律 invoke)
