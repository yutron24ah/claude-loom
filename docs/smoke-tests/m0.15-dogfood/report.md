# M0.15 Layer 2.5 Dogfood Smoke Report

**実行日時**: 2026-05-12T22:48 JST
**実施者**: PM (loom-pm 直接実行、SPEC §10.4.1 必須 step)
**対象 milestone**: M0.15 — UI Redesign Port
**SSoT**: SPEC §3.6.14.5

## 7 Step Matrix 結果

| step | command | 期待 | 結果 |
|---|---|---|:---:|
| 1 | `bash hooks/loom-launch-ui.sh` | daemon (5757) + UI 起動 | ⚠️ → ✅ |
| 2 | `curl -sf http://127.0.0.1:5757/health` | `{"status":"ok"}` | ✅ |
| 3 | `curl -s http://127.0.0.1:5757/mode \| jq .` | SPEC §3.2.1 6 field 充足 | ✅ |
| 4 | `curl -sI http://127.0.0.1:5757/` | `200` + `text/html` | ✅ |
| 5 | 12 SPA route curl → 全部 `200` | 全部 `200` | ✅ (12/12) |
| 6 | browser `?mock=active` 12 画面 visit | white screen 出さん | ✅ (Playwright t21 で 13 screenshot baseline pass) |
| 7 | 重要 3 画面 1-click flow → REST payload | endpoint 到達 | ✅ (Playwright t21 click-flow 3/3 pass) |

## Step 詳細

### Step 1: launch hook ⚠️ → ✅

初回実行で **daemon entry not found**:
```
[loom-launch-ui] WARN: Daemon entry not found: /Users/kokiiphone/.claude-loom/daemon.js
[loom-launch-ui] WARN: UI may not be available. Start daemon manually or reinstall.
```

**finding (retro candidate)**: M0.11.5 で codify した auto-build + symlink chain が M0.15 期間中に gap を作っとった。daemon dist が古くなり、`~/.claude-loom/daemon.js` symlink が古い path を指してた (or 不在)。`bash install.sh` re-run で:
- daemon build (tsc → dist/server.js + db/migrations)
- ui build (vite → dist/assets/)
- daemon.js symlink 再設置 (`~/.claude-loom/daemon.js` → `daemon/dist/server.js`)

を実行後、Step 1 が PASS。これは Phase 1 closure trinity で codify した Dependency audit 規律 (SPEC §3.6.8.8) を M0.15 closure 前に preemptive で実施すべきだったケース (retro F-USER-002 系列の potential 再発)。

### Step 2-4: daemon endpoints ✅

```
/health → {"status":"ok","timestamp":1778593714360,"version":"0.1.0"}
/mode   → mode=prod / entry=manual / version=0.1.0 / pid=38519 / ui_serving=true / started_at=2026-05-12T13:48:33Z (6 field 充足、SPEC §3.2.1)
/       → 200 OK + content-type: text/html (ui_serving=true なので ui/dist 配信)
```

### Step 5: 12 SPA routes ✅

全 route が 200 を返す (SPA routing なので response body は同 index.html、client-side router が path に応じて view を mount):

```
200 /                    (Room)
200 /plan
200 /gantt
200 /retro
200 /consistency
200 /worktree
200 /customization
200 /guidance
200 /sessions
200 /project-settings
200 /tokens
200 /agents/dev          (AgentDetail drawer)
```

### Step 6-7: browser / click flow ✅ (Playwright t21 baseline 経由)

t21 で確立した baseline:
- `ui/e2e/m0.15-redesign/screen-baseline.spec.ts`: 13 screenshot baseline (12 画面 + PMChat overlay)
- `ui/e2e/m0.15-redesign/click-flow.spec.ts`: 3 interaction smoke (⑦ Customization 保存 / ⑬ PMChat 送信 / ⑫ Settings 保存)
- 結果: 19/19 pass (13 baseline + 3 click + 3 room regenerated)

t20 PM 直接実行段階では daemon が起動済なので、t21 の click-flow の REST endpoint assertion (conditional skip 注記付き) が実 daemon 接続で動作する。

## Closure Decision

**全 7 step PASS** → `m0.15-complete` tag 設置可。Step 1 で発見した auto-build chain finding は **retro candidate (F-USER-009 後継、Dependency audit 規律 SPEC §3.6.8.8 の dogfood-time gap)** として retro hook で記録予定。

## 検出 finding 一覧 (retro 候補)

1. **auto-build chain gap**: M0.15 期間中に daemon dist が古くなる + `~/.claude-loom/daemon.js` symlink が機能しない事象を Layer 2.5 で発見。closure 前の Dependency audit (SPEC §3.6.8.8) で preemptive verify すべきだった (Phase 1 closure trinity の F-USER-002 系列の構造的再発)
2. **worktree isolation 機能不全 observation**: Phase 2 batch B/C / Phase 3 t13/t15 / Phase 4 t14/t15 で Agent tool の `isolation: "worktree"` parameter が間欠的に機能せず、subagent が main worktree で直接 commit する事象を継続観測。retro 2026-05-06-004 res-002 で codify した worktree isolation 規律と乖離。M0.15 retro process-axis lens で structural finding 化対象
3. **REQ 番号衝突パターン**: 6 batch × 16 dev parallel dispatch で REQ 番号衝突 (t8 vs t10 / t11 vs t8 等) が複数発生、PM が closure 段階で rename + 一括 append rule で resolve。dev に REQ 採番ロジックを統一規約として渡すか、PM 一括 append rule を default 化するか、retro で議論
