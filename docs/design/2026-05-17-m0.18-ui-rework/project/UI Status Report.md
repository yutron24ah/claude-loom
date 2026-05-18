# claude-loom UI 実装ステータス

> 対象: `yutron24ah/claude-loom@main` + PR#18〜#21 取り込み後
> 日付: 2026-05-17
> 関連: [Frontend改修方針.md](./Frontend改修方針.md) (本書の改修側 SSoT) / `Redesign App.html` (設計案 SSoT)
> 比較基準: `docs/SCREEN_REQUIREMENTS.md` §3-§5 / `docs/AGENT_PROMPT_DESIGN.md` / SPEC §3.9.16 / §6.9.6 v3

---

## TL;DR

旧 main は UI 骨格 ~90% / 配線 ~60% / Backend 動作 ~30% で「綺麗な箱があるが中身が動かない」状態だった。
**PR#18〜#21** で backend 側の意味論が大きく変化したため、フロントエンドは "塗り直し" ではなく **意味論差し替え** が必要。

### 変化の核 (PR#18〜#21)

| PR | 主旨 | UI への影響面積 |
|---|---|---|
| #18 `docs/agent-prompt-design` | Agent prompt 設計原則確立 + **13 → 3 agents** + skill template 体系 | 🔴 大 — Room / Customization / LearnedGuidance / SessionList の mental model |
| #19 `refactor/daemon-cleanup` | Daemon TS Phase 1 cleanup + `approval.decide` NOT_FOUND throw | 🟡 中 — error handling 追加 |
| #20 `feat/m0.11.2-pending-lifecycle-spec` | M0.11.2 spec (§3.9.16 / §6.9.6 v3 / §6.9.8) | 🟠 中 — Retro view 拡張の前提 |
| #21 `feat/m0.11.2-pending-lifecycle-impl` | finding に **4 lifecycle field** + auto-expire + reconstruct | 🔴 大 — Retro lifecycle UI |

→ 詳細な改修計画は **`Frontend改修方針.md`** を参照。本書は **現状の実装ステータス記録** に絞る。

---

## 🟢 維持できているもの (PR#18〜#21 でも壊れていない)

### Shell / Routing
- ✅ TopBar (drawer toggle / brand / project / branch chip / 4 メトリクス / WS status)
- ✅ TopBar 各メトリクスから drill-down (PARALLEL→/gantt, TASK TOOL→/sessions, TDD→/consistency?filter=tdd, VERDICT→/consistency)
- ✅ TopBar の project ボタン → `/project-settings`
- ✅ Drawer (12 nav link、active state、collapse)
- ✅ StatusBar (conn / scenario / events seen / path)
- ✅ Router (sibling screen routing, no overlay)
- ✅ ScenarioPicker (React Router 統合済)
- ✅ ToastContainer, ConnectionBanner, toastBus

### Room (旧構造)
- ✅ RoomBackground (SVG ラグ + 床透かし)
- ✅ RoomWallDecor (branch sign)
- ✅ 3 ポスター (Gantt / Plan / Consistency) + click navigate
- ✅ 5 デスク (PM / Dev / 3 Reviewer) — **PR#18 で 3 に再編必要**
- ✅ SubroomClone (worktree 上方配置)
- ✅ ResizeObserver + 比率レイアウト
- ✅ RetroGathering / room-mode-toggle
- ✅ DeskStation click → AgentDetailPanel

### 12 Screens (枠は実装済)
- ✅ Plan / Gantt / Consistency / Customization / Retro / Worktree / Guidance / LearnedGuidance / SessionList / ProjectSettings / TokenMeter / Tokens
- ✅ 個別 CSS ファイル切出済 (`styles/screens/*.css`)
- ✅ 全 view が `useScenario()` から live data 取得

### PM Chat (UI 側)
- ✅ PMChatPanel — CHAT / STREAM 2 タブ
- ✅ 入力 textarea + ⌘+Enter 送信
- ✅ メッセージログ + 自動スクロール
- ✅ collapse handle (◆ PM 縦タブ)
- ✅ PMApprovalModal (high risk)
- ✅ PMApprovalToast (med/low risk)
- ✅ pm.running=false で "▶ PM を起動" ボタン (`coldstart` 表示)

### Agent Detail Panel
- ✅ Live data (useScenario)
- ✅ NOW (currentTool + reasoning)
- ✅ RECENT DISPATCHES (gantt rows per agent)
- ✅ STREAM TAIL (filtered by agent)
- ✅ TOKEN — TODAY (in/out/cache)
- ✅ DISPATCH HISTORY (M3.2 backward compat)
- ✅ AgentDetailNotes (sub-component)
- ✅ ★ 注目 attention toggle

### Live data hooks (実装済)
- ✅ usePMSession, usePlanItems, useTodoWrite, usePlanMutations
- ✅ useConsistencyMutations, useConsistencyFindings
- ✅ useCustomizationMutations, useProjectSettings, useProjectSettingsMutation
- ✅ useGuidanceMutations, useNoteMutations
- ✅ useSessionList, useTokenUsage
- ✅ useWorktreeMutations, useGanttData
- ✅ useAgentDispatchHistory, useAgentMutations
- ✅ store: connection, planConflict, view

---

## 🔴 PR#18〜#21 で大幅 rework が必要な箇所

### 1. Room — 3 persistent + 10 spirit (PR#18)

| 現状 | 必要対応 |
|---|---|
| 5 desk hardcoded (`ROOM_AGENTS = [pm, dev, rev-code, rev-test, rev-sec]`) | 3 desk に縮小 (`[pm, dev, retro-pm]`) |
| rev / retro lens は常駐扱い | dispatch 時のみ `<Spirit>` で召喚、Task 完了で消滅 |
| desk 直接配置 | `<Spirit>` + `<SummonQueue>` + (option) `<RoomDoor>` / `<SpiritEcho>` |
| なし | `useDispatchQueue()` hook 新設、`agent.change`/`Task.lifetime` から live 召喚を reduce |
| なし | Tweaks panel に `spiritMode: rpg | office | hybrid` 切替 |

> 詳細: `Frontend改修方針.md` §1.1

---

### 2. CustomizationView — Tree navigation (PR#18 schema v2)

| 現状 | 必要対応 |
|---|---|
| 13 agent flat table | Agents (3) + Skills (2) tree に再編 |
| 1-pane | 左 tree / 右 leaf editor の 2-pane |
| なし | skill scope ごとに personality + learned_guidance |
| なし | aggregator scope に `WRITE` badge |
| なし | PM model 切替不可 (SPEC §3.9.16) 注記 |

> 詳細: `Frontend改修方針.md` §1.2

---

### 3. RetroView — KPT board + lifecycle (PR#20+21 schema v3)

| 現状 | 必要対応 |
|---|---|
| FINDINGS リスト + action plan | **KPT 4 column** (KEEP / PROBLEM / CARRYOVER / TRY) に再編 |
| finding に lifecycle 概念なし | `carryover_count / last_seen_in / re_evaluated_in / expired_at` を pip + badge で可視化 |
| `pending_summary.json` 読まない | carryover 集約 panel として読込 (CARRYOVER 列) |
| なし | re-evaluation verdict badge (🔄 promoted / ⏳ auto-expire / ❌ lens-drop) |
| なし | Admin section — `retro.reconstructFromArchive()` invoke ボタン |
| なし | aggregator が `re_evaluated_in` を origin pending.json に back-fill (Backend 側) |

> 詳細: `Frontend改修方針.md` §1.3

---

### 4. LearnedGuidanceView — scope hierarchy (PR#18)

| 現状 | 必要対応 |
|---|---|
| agent-keyed のみ表示 | agent-keyed (3) + skill-keyed (10 sub-scope) の scope filter pill 追加 |
| `agentId` のみ表示 | `AGENT/SKILL/WRITE` badge + `keyPath` (例: `skills/loom-review/strategies/trio/code`) 表示 |

> 詳細: `Frontend改修方針.md` §2.1

---

### 5. SessionListView — reviewer column rename (PR#18)

| 現状 | 必要対応 |
|---|---|
| `reviewer_agent` 列に `"loom-reviewer"` 等の旧 agent 名 | 列名 `reviewer (skill)` + 値を skill identifier (`loom-review/trio.code`) に reformat |

> 詳細: `Frontend改修方針.md` §2.2

---

### 6. Cross-cutting — error handling + admin (PR#19/#21)

| 項目 | 必要対応 |
|---|---|
| `approval.decide` の `{success: false}` → TRPCError NOT_FOUND throw | `onError` で NOT_FOUND を catch → toast 表示 → retry action |
| `retro.reconstructFromArchive` procedure 新設 | RetroView admin section から invoke |
| `useTokenUsage` polling | `enabled: !!session.active` で session 起動前は抑止 |

---

## 🔴 PR#18〜#21 と独立な未解決問題 (旧 main 由来)

> これらは旧 status report から引き継ぎ。PR#18〜#21 とは独立。
> Phase 5 t17 / Phase 2 entry の課題として依然残る。

### A. PM チャット — UI は動くが PM が echo しか返さない 【最重要】

`daemon/src/routes/pm.ts` の冒頭コメント:
> M0.15 stub implementation. Actual claude CLI spawn / stdin pipe is Phase 5 t17.

ユーザーが何を入力しても `[stub] 受け取りました: "..."` という echo を返すだけ。

**何が無いか:**
- claude CLI を spawn する spawn パス
- stdin pipe で user message を渡す処理
- stdout pipe で claude 出力を broadcaster に流す処理
- PM session state machine (spec/impl/retro phase 管理)
- compaction 後の resume
- 並列 subagent dispatch の wire

→ Phase 5 t17 deferred。これが claude-loom の core 価値提案の前提。

---

### B. AgentDetailPanel の「メモ」ボタン — onClick 無し
- `useNoteMutations` hook + `AgentDetailNotes` 共に存在
- ボタン自体は noop
- §4.1 介入要件のうち UI トリガーが半分しか繋がってない

### C. 注目フラグ ★ — 永続化 backend 不明
- `onAttentionToggle` が optional prop で AppShell 未渡しの可能性
- `subagents_attention.sql` migration はあるので backend テーブルは存在

### D. Worktree 操作 — `useWorktreeMutations` あるが UI 不在
- 用途 5 種選択 UI / uncommitted check confirm / lock indicator が要確認

### E. Retro 起動 (GUI から) — §4.6 介入要件
- §4.6 が要求する「新 retro 起動（GUI ボタン、CLI 不要）」が UI に存在しない可能性
- 設計案では RetroView header に `+ 新 retro 起動` ボタン提案 (Frontend改修方針 §1.3)

### F. Consistency Findings — アクション 4 種の完成度
- Acknowledge / Mark Fixed / Dismiss / Open in Editor のうち後 3 つは要確認

### G. 手動 consistency check — §4.3 介入
- バッジ + 手動 trigger UI が見当たらない

### H. Coexistence Mode UI — §3.11 / §4.10
- `daemon/src/routes/coexistence.ts` は実装あり (5668 bytes)
- `ProjectSettingsView.tsx` に section が存在するか要確認

### I. PM session phase indicator
- M0.11.6 / M0.11.7 で codify した spec / impl / retro phase 管理が UI 側に見えない

### J. cat-walker アニメーション
- `DeskStation.tsx` の `walkTo` prop と `@keyframes cat-walk-trip` の wire が要確認

### K. Toast 8 種 — emit パス
- `toastBus.ts` は実装あるが各 WS event → toastBus.push の 8 経路が揃ってるか要確認

### L. Multi-project switcher
- TopBar の `◆ <project> ▾` は dropdown じゃなく直 `/project-settings` 遷移
- 実質「project switcher」が無い (Phase 2 候補)

---

## 📊 実装率の体感 (本日時点)

| 領域 | UI 描画 | 配線 | Backend 動作 |
|---|---|---|---|
| シェル / Routing | 95% | 90% | n/a |
| Room の見た目 | 90% (旧) → **要 rework** | 50% | n/a |
| 12 screen の枠 | 85% | 60% | n/a |
| Customization (新 tree) | **0%** (旧 flat のみ) | 0% | 0% |
| Retro (KPT + lifecycle) | **20%** (旧 finding のみ) | 0% | spec only |
| Guidance (scope filter) | 70% (旧) | 50% | 0% |
| SessionList (rename) | 100% (旧) | n/a | n/a |
| PM chat の UI | 90% | n/a | n/a |
| PM chat の実動作 | n/a | n/a | **15%** (echo stub) |
| Spirit summoning | **0%** | 0% | event はある |
| Admin / Reconstruct | **0%** | 0% | 100% (procedure 完備) |
| Error toast (NOT_FOUND) | 0% | 0% | 100% |
| **全体** | **約 55%** | **約 40%** | **約 30%** |

---

## 🎯 Phase 2 entry 前に必要な作業 (post PR#18〜#21)

優先度順。詳細工数は `Frontend改修方針.md` §4 を参照。

### P0 (約 4 日)
1. **CustomizationView tree** (1.5d) — schema v2 対応
2. **RetroView KPT + lifecycle + admin** (1.5d) — schema v3 対応
3. **Room Spirit + SummonQueue** (1d) — 3 persistent + ephemeral

### P1 (約 1.5 日)
4. **PM chat の claude CLI 接続** (Phase 5 t17 / 別計画) — claude-loom の core 価値
5. **LearnedGuidance scope filter** (0.5d)
6. **SessionList rename** (0.25d)
7. **TokenMeter gate** (0.1d)
8. **NOT_FOUND error toast** (0.25d)
9. **AgentDetailPanel メモボタン onClick 配線** (0.1d)
10. **Worktree create UI** (用途選択 + uncommitted check) — 別途見積

### P2 (Phase 2 候補)
- Multi-project switcher dropdown
- Customization custom personality free-form + preview
- Memo on task (Plan view 側)
- Focus flag (`★`) の永続化確認
- Coexistence Mode UI section
- `useDispatchQueue` hook (Spirit support)
- Spirit motion Tweaks (rpg / office / hybrid)

---

## 🔍 確認すべきファイル (個別深堀り対象)

| 領域 | ファイル | 確認ポイント |
|---|---|---|
| Customization tree | `ui/src/views/customization/CustomizationView.tsx` | 旧 flat → tree の rewrite。schema v2 migration |
| Retro lifecycle | `ui/src/views/retro/RetroView.tsx` | KPT 4 column 化 + carryover pip + admin |
| Retro lib | `daemon/src/lib/retro-reconstruct.ts` | archive markdown parser の完成度 |
| Guidance | `ui/src/views/guidance/{Guidance,LearnedGuidance}View.tsx` | 2 ファイル併存の意味、scope filter pill 追加位置 |
| Session list | `ui/src/views/session-list/SessionListView.tsx` | reviewer 列 rename + 値 reformat |
| PMChat | `daemon/src/routes/pm.ts` | claude CLI spawn (Phase 5 t17 stub 解消) |
| Worktree | `ui/src/views/worktree/WorktreeView.tsx` | create modal / 用途選択 / lock indicator |
| Consistency | `ui/src/views/consistency/ConsistencyView.tsx` | Open in Editor / undo |
| Settings | `ui/src/views/project-settings/ProjectSettingsView.tsx` | Coexistence Mode section |
| Toast | `ui/src/notifications/toastBus.ts` + `daemon/src/events/broadcaster.ts` | 8 種 emit パス完成度 |

---

## まとめ

「画面でチャットする機能とかないじゃん」は **半分正しい** (旧 main):
- UI: ある（PMChatPanel は実装済）
- 実動作: ない（PM が echo しか返さない）

**Phase 5 t17 で claude CLI spawn が来るまで、PM chat は実質「動かない」**。

そして今回 **PR#18〜#21** によって UI 側にも追加の rework が発生:
- Customization / Retro / Room の **mental model** が変わった
- 既存の UI は agents flat / 13 agent / no-lifecycle の前提で書かれている
- 設計案 (`Redesign App.html` / `redesign/screens/*.jsx`) は既に新モデルに合わせ済

→ 次の PR は **Tier 1 の 3 view の rework** から着手するのが ROI 最大。
詳細手順は `Frontend改修方針.md` を参照。

QA テストマトリクスは **`QA Test Matrix.html`** で 6 新セクション (SPIRIT- / CT- / RL- / GS- / SL- / ENF- / AR-) を追加済。
各機能の **「UI 描画」「onClick 配線」「backend 動作」** の 3 段階で管理する。
