# M0.17 Layer 2.5 Dogfood Smoke Report

**Date**: 2026-05-14
**Executed by**: PM (loom-pm direct execution, no subagent dispatch)
**SPEC reference**: §3.6.15.4 + §10.4.1 + §3.6.14.5
**Branch**: `fix/m0.17-ui-redesign-correction`
**Milestone**: M0.17 UI Redesign Port Correction (REVIEW.md handoff 適用)
**Purpose**: closure tag (`m0.17-complete`) 設置前の最終 gate

---

## Step matrix (8 step、SPEC §3.6.15.4 Step 8 拡張版)

| Step | command | expected | result |
|---|---|---|---|
| 1 | `bash hooks/loom-launch-ui.sh` | Daemon launch trigger | ✅ `[loom-launch-ui] Daemon already running at http://127.0.0.1:5757` |
| 2 | `curl -sf http://127.0.0.1:5757/health` | `{"status":"ok"}` | ✅ `{"status":"ok","timestamp":1778765869239,"version":"0.1.0"}` |
| 3 | `curl -s http://127.0.0.1:5757/mode \| jq` | 6 field 充足 (SPEC §3.2.1) | ✅ `mode=prod`, `entry=manual`, `version=0.1.0`, `started_at=2026-05-14T11:49:23.195Z`, `pid=70450`, `ui_serving=true` 全 6 field 充足 |
| 4 | `curl -sI http://127.0.0.1:5757/` | 200 + `content-type: text/html` | ✅ `HTTP/1.1 200 OK` + `content-type: text/html; charset=utf-8` + `content-length: 416` |
| 5 | 12 SPA routes smoke | 全 200 (sibling routing 確認) | ✅ `/`=200 / `/plan`=200 / `/gantt`=200 / `/consistency`=200 / `/retro`=200 / `/worktree`=200 / `/customization`=200 / `/guidance`=200 / `/sessions`=200 / `/tokens`=200 / `/project-settings`=200 / `/agent-detail`=200 (全 12 route が SPA index 配信、AppShell sibling routing で content 切替) |
| 6 | Playwright screen-baseline darwin | 13 baseline + 全 pass | ✅ 13 `*-darwin.png` baseline 存在 (`ui/e2e/__screenshots__/m0.15-redesign/screen-baseline.spec.ts-snapshots/`)、M0.17 Phase 4.5 commit `7215138` で 16 darwin baseline 全種再撮影 + Playwright 19/19 pass evidence 済 |
| 7 | Playwright click flow + room baseline | 3 click flow + 3 room baseline pass | ✅ 3 darwin room-baseline 存在 + Phase 4.5 で Customization 保存 / PMChat 送信 / ProjectSettings 保存 click flow 3/3 pass、tRPC wsLink WS transport 整合済 |
| 8 | `act -W .github/workflows/ci.yml pull_request --container-architecture linux/amd64` | local CI parity OR graceful skip | ✅ **graceful skip** (`act` binary 不在、SPEC §3.6.15.4 期待動作の dogfood validation)、retro candidate: act adoption gap が M0.16 から連続 |

---

## Auxiliary verification

| Layer | command | result |
|---|---|---|
| Layer 1 (bash harness) | `bash tests/run_tests.sh` | **42/42 PASS** (fixture bump 後、後述 finding 1 参照) |
| Layer 1 (UI Vitest) | `pnpm --filter @claude-loom/ui test` | 958/958 PASS (Phase 4.5 evidence) |
| Layer 1 (daemon Vitest) | `pnpm --filter @claude-loom/daemon test` | 546/546 PASS |
| Layer 2 (Playwright e2e) | M0.17 Phase 4.5 `7215138` で実行済 | 19/19 PASS (12 screen + agent-detail + pm-chat-overlay + 3 click flow + 3 room baseline) |

---

## Findings detected during smoke

### Finding 1 (resolved during smoke): dry_run_applied_summary fixture stale (M0.17 由来でない pre-existing)

- **症状**: `bash tests/run_tests.sh` で `dry_run_applied_summary_test.sh` が `total_retro_sessions: 7 (actual) ≠ 6 (fixture)` で 1 件 FAIL
- **root cause**: `.claude-loom/retro/2026-05-12-001` (M0.16 期間中の retro session) が `tests/fixtures/applied_summary_expected.json` の `total_retro_sessions` 値に反映されとらん、M0.16 closure 時の fixture bump 漏れ (M0.17 由来でない pre-existing harness state drift)
- **fix**: smoke 内で fixture を `6 → 7` に bump (1 line edit)、`dry_run_applied_summary_test.sh` 13/13 PASS 確認後 `bash tests/run_tests.sh` 全 42/42 PASS 達成
- **retro candidate**: process-axis lens 候補 — M0.16 closure 時の harness state fixture 更新漏れ pattern、Phase 2 hardening 対象 (CI gate に fixture drift detect step を追加する案)
- **scope 判定**: M0.17 closure 内 chore commit で carryover (M0.16 forgotten housekeeping、M0.17 in-scope hotfix と同質的)

### Finding 2 (no action): act adoption gap (M0.16 → M0.17 連続 graceful skip)

- **症状**: Step 8 (`act` invocation) が M0.16 + M0.17 連続 graceful skip 状態
- **背景**: M0.16 で codify した Step 8 が act binary adoption (user dev 環境) が未達成、closure 自体は graceful skip 設計通りで block しないが連続発生は構造的 gap signal
- **retro candidate**: process-axis lens 候補 — M0.16 で codify した CI parity gate (Step 8) の adoption rate が 0/2 milestone、retro で「act binary 導入の cost-benefit + alternative (`gh workflow run` で CI 即時 trigger) 検討」推奨
- **scope 判定**: M0.17 closure block しない、retro inclusion 推奨

### Finding 3 (no action): No M0.17-introduced regressions detected

- SPA route smoke 12/12 pass → sibling routing が正しく機能 (B1 + B2 + B3 + S1 + S2 fix が integrated working)
- daemon endpoint 全 health (mode/health/HEAD/static serving 影響なし)
- Layer 1-2 全 layer pass (regression 0)
- Phase 4.5 hotfix で発見した root cause A/B/C 修正後の状態は安定

---

## Closure verdict

| 項目 | 結果 |
|---|---|
| Step 1-7 全 PASS | ✅ |
| Step 8 graceful skip (SPEC §3.6.15.4 期待動作) | ✅ |
| Layer 1 (UI 958 + daemon 546 + bash 42) 全 PASS | ✅ |
| Layer 2 (Playwright 19/19 darwin baseline) PASS | ✅ |
| M0.17-introduced regression 0 件 | ✅ |
| pre-existing fixture drift 解消 (M0.16 carryover) | ✅ |

→ **M0.17 closure tag `m0.17-complete` 設置可能**、t19 (tag + retro hook + main PR open) へ進む。

---

## Retro candidates (M0.17 closure 後 user 判断)

1. **Process axis**: M0.16 closure 時の harness state fixture 更新漏れ (`total_retro_sessions: 7` 反映漏れ) — CI gate 化候補
2. **Process axis**: `act` Step 8 adoption gap 連続 (M0.16 + M0.17 = 0/2 milestone で graceful skip) — alternative (`gh workflow run`) 検討
3. **PJ axis**: proposed file SSoT の oversight (Phase 4.5 root cause A — proposed AppShell が drop した marginRight wrapper) — design handoff bundle の review gate 強化 (proposed file への自動 lint / type check)
4. **PJ axis**: stale Playwright test selector (Phase 4.5 root cause B — `[data-testid="view-panel"]`) — refactor 時の test selector update 連動 mechanism
5. **Researcher axis**: `StreamEvent → StreamMsg` 型名 stale を dev が独自検出 + 修正 — proposed file の type SSoT 整合性事前検証 method 候補
6. **Meta axis**: M0.17 で 7 dev dispatch + 1 PM closure session で 5 feat + 1 fix + 1 chore (doc) + 1 chore (fixture bump) の commit chain、Phase 単位 commit + retro candidate accumulation の dogfood 成功 record
