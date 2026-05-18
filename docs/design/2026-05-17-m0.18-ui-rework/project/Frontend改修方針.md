# フロントエンド改修方針 — PR#18〜#21 後のリプラン

> 対象: `yutron24ah/claude-loom@main` 以後 (PR #18 / #19 / #20 / #21 取り込み済の前提)
> 起点: `UI Status Report.md` (2026-05-16)
> 日付: 2026-05-17
> 関連: `docs/AGENT_PROMPT_DESIGN.md` / `docs/SKILL_MIGRATION.md` / SPEC §3.9.16 / §6.9.6 v3

---

## TL;DR

バックエンドは大きく変わったが、**フロントエンドの "見た目" は思ったほど変えない**。
変わるのは中の意味論：

- **13 agent → 3 persistent + 10 spirit** に再編 → Room / CharSheet / SessionList の **表現** だけ差し替え
- **agents flat → agents + skills tree** に再編 → CustomizationView は flat → tree、LearnedGuidance は filter 拡張
- **finding に 4 lifecycle field** 追加 → RetroView に carryover / re-evaluation 表示を増設
- **新 procedure `retro.reconstructFromArchive`** / **`approval.decide` が NOT_FOUND throw** → 小規模な admin/recovery UI と error toast

**実装上は触る範囲が広い**が、UX 上は「常駐3体 + 召喚演出」「tree navigation 1 つ」「lifecycle pip 表示」の **3 つの新概念** さえ理解させればよい。

本書はその 3 概念をどう既存 UI に編み込むかを定義する。

---

## 0. 概念マッピング (Before → After)

| 旧 mental model | 新 mental model | UI 上の差分 |
|---|---|---|
| 13 cat が全員 desk にいる | 3 cat が desk + 10 cat が dispatch 時のみ出現 | Room: ゾーン縮小、Spirit motion 追加 |
| Reviewer / Retro lens は agent | skill template が dispatch する "spirit" | 名前と猫種は維持、UI 上は半透明 / motion 付き |
| Customization は agent flat list | agents (3) + skills (2 with sub-scope) tree | 左 tree / 右 editor の 2-pane に変更 |
| Learned guidance は agent-keyed | agent-keyed (3) + skill-keyed (10 sub-scope) | filter pill 行 + key path 表示 |
| Finding 状態 = `pending/approved/...` のみ | + 4 lifecycle field (carryover_count / last_seen_in / expired_at / re_evaluated_in) | Finding card に carryover pip + verdict badge |
| pending.json は消えると詰む | archive markdown から復元可能 | Admin section に "Reconstruct" ボタン |
| `approval.decide` は `{success: false}` を返す | TRPCError NOT_FOUND throw | onError で toast 出す配線が必要 |

---

## 1. Tier 1 — major redesign (3 view)

### 🔴 1.1 RoomView — Persistent + Spirit

**変えること**

- desk は PM / Dev / Retro PM の 3 つだけ。Code/Sec/Test/Retro lens は desk を撤去
- Reviewer / Retro lens は **`<Spirit>`** コンポーネントで描画
- 同じ部屋に **「召喚エリア (Summon Zone)」** を持たせ、現在 dispatch 中の spirit をここに表示

**変えないこと**

- 部屋自体のレイアウト、ゾーン (PM / Dev / Review 跡地は Summon Zone)、ポスター3枚、subroom clone
- 13 体の猫種 / 名前 / 一言性格 (愛着の継承)
- 3 つの世界観 (noon / dusk / night)

**新規 motion — 3 候補から user 選択 (default: hybrid)**

| flavor | 出現 | 退場 | 補足 |
|---|---|---|---|
| **A. RPG 召喚精霊** | glow + 0.6→1.1→1.0 scale + 360ms steps(6) | 0.5 scale + blur + 280ms | accent 色の魔法陣を足元に |
| **B. 来客 (Office guest)** | door からスライド (translateX -30→0, 700ms) | 反対側 / 同じ door へスライドアウト | 右壁に "SUMMON GATE" door |
| **C. Hybrid (推奨)** | A の glow を控えめに | A と同じ | + 直近召喚を **半透明 echo** で残す (32% opacity, grayscale 0.6) |

**Tweaks で切替可** にする (default: hybrid)。設計案は本 PJ の `index.html` の "Spirit Summoning" セクション参照。

**新 wall plaque — 「召喚キュー」**

```
┌─ 召喚キュー ─────────────┐
│ ● review/trio.code   0:42 │  ← active
│ ● review/trio.test   0:18 │  ← active
│ ◌ retro/stages.aggregator —│  ← queued
└──────────────────────────┘
```

これによって「誰が呼ばれているか」と「いつ消えるか (ttl)」が **常に見える** ようにする。

**実装ファイル (本 PJ 側)**:
- `cat.jsx` — ROSTER に `kind: "persistent"|"spirit"` + `summonedBy` 追加済
- `cat.jsx` — `SKILLS` registry を新設 (loom-review / loom-retro の scope 構造)
- `room.jsx` — `<Spirit>` / `<SpiritEcho>` / `<RoomDoor>` / `<SummonQueue>` 追加済
- `styles.css` — `.spirit`, `.spirit-echo`, `.room-door`, `.summon-queue`, 3 motion keyframes 追加済

**ui/src 側で必要な実装**:
1. `views/room/Spirit.tsx` — 上記 3 種 motion を `.room--{rpg,office,hybrid}` で切替
2. `views/room/RoomDoor.tsx` — door SVG + open pulse
3. `views/room/SummonQueue.tsx` — `useDispatchQueue()` から live data
4. `useDispatchQueue` hook 新設 — `agent.change`/`Task.lifetime` イベントから currently-summoned を reduce
5. RoomView から rev/sec/test/retro-lens の desk 配置を削除
6. Tweaks panel に `spiritMode` ラジオ追加

---

### 🔴 1.2 CustomizationView — Tree navigation

**変えること**

- 既存の flat な agent table を廃止
- 左 pane = **hierarchical tree** (Agents / Skills > sub-scope)、右 pane = **leaf editor** に切替

```
LEFT (260px)                       RIGHT (1fr)
─────────────────────────         ─────────────────────────
▾ Agents (3)                      ┌ AGENT: loom-developer ─────────┐
  • loom-pm                       │  [opus] [sonnet] [haiku]       │
  • loom-developer  ←選択中        │  Personality preset:           │
  • loom-retro-pm                 │    [Default][Friendly][Drill][Det]│
▾ Skills (2)                      │  Custom override (free text):  │
  ▾ loom-review                   │    "TDD red 順序の遵守を..."    │
    ▾ strategies/                 │  Learned guidance: 4 entries   │
      • single                    │  Effective prompt preview ▸    │
      ▾ trio/                     └────────────────────────────────┘
        • code                    
        • security                
        • test                    
  ▾ loom-retro                    
    ▾ lenses/                     
      • pj-axis                   
      • process-axis              
      • meta-axis                 
      • researcher                
    ▾ stages/                     
      • counter-arguer            
      • aggregator [WRITE]        ← write 権限 badge
```

**新 UI 要件**

- leaf 種別 badge: `PERSISTENT AGENT` / `SKILL SCOPE`
- aggregator のみ `WRITE` badge を leaf と editor の両方に表示
- breadcrumb は不要 (tree で十分)
- 左 pane の `count` 表示は (3) / (2) を必ず添える
- editor 内：model 選択は agent のみ表示、skill scope では非表示

**state shape (新)**

```jsonc
// user-prefs.json / project.json
{
  "agents": {
    "loom-pm":        { "personality": "...", "learned_guidance": [] },
    "loom-developer": { "model": "sonnet", "personality": "...", "learned_guidance": [...] },
    "loom-retro-pm":  { "personality": "...", "learned_guidance": [] }
  },
  "skills": {
    "loom-review": {
      "strategies": {
        "single": { "personality": "...", "learned_guidance": [] },
        "trio":   { "code": {...}, "security": {...}, "test": {...} }
      }
    },
    "loom-retro": {
      "lenses": { "pj-axis": {...}, "process-axis": {...}, "meta-axis": {...}, "researcher": {...} },
      "stages": { "counter-arguer": {...}, "aggregator": {...} }
    }
  }
}
```

**実装ファイル**:
- `views/customization/CustomizationView.tsx` — 2-pane に丸ごと書き換え
- `views/customization/TreeNav.tsx` — 再帰 tree 描画
- `views/customization/LeafEditor.tsx` — leaf の種類別フォーム
- `useCustomization` hook — 上記 shape を扱うように schema 拡張
- `daemon/src/routes/customization.ts` — read / write が tree shape を扱えるように

---

### 🔴 1.3 RetroView — KPT board + lifecycle

**変えること**

- 既存の縦並び transcript + finding list + action plan **3 box** を、
  **KPT board (4 column)** に再編
- finding card に **carryover_count pip** + **re-evaluation verdict badge** を追加
- header に **admin section toggle** を追加 (Reconstruct / pending_summary 再生成 / approval retry)

**KPT board 構造 (agile retrospective framework に整合)**

```
┌─ KEEP ─────┬─ PROBLEM (今回) ─┬─ CARRYOVER (pending) ─┬─ TRY (action plan) ─┐
│ 良かった点 │ 新規 finding      │ 過去 retro 由来       │ immediate / milestone│
│ 継続事項   │ R-1, R-3, R-4...  │ pip 表示 + verdict    │ deferred + from refs │
└────────────┴───────────────────┴───────────────────────┴──────────────────────┘
```

- **KEEP** はユーザーから今後追加要件として吸い上げる枠 (今は lens の comment から拾う想定)
- **PROBLEM** = 当該 retro の新規 finding (今までの "FINDINGS" 相当)
- **CARRYOVER** = `pending.json` v3 の lifecycle 対象 (前 retro の未解消 finding)
- **TRY** = aggregator が確定した action plan、各 item は `from: R-xx / P-xx` で出典を保つ

**Carryover card 構造**

```
┌─────────────────────────────────────┐
│ [█] secret scan の pre-commit 未配置 │
│     P-07 · 元: 2026-04-08-001        │
│ carryover ▢▢▣  2/3  🔄 promoted     │
│ last_seen: 2026-04-22-001            │
│           re-eval: 2026-04-29-001    │
└─────────────────────────────────────┘
   ↑ pip: 残りライフ (▢=未消費, ▣=消費済)
   carryover_count = 2/3 で、次 retro で expire に flip
```

verdict 4-way: `still-relevant` (🔄 promoted) / `expired` (⏳ auto-expire) / `drop` (❌ lens-drop) / `null`

**Admin section**

```
⚠ ADMIN / RECOVERY — pending.json 消失時の復旧用
[ ↻ Reconstruct from archive markdown ]   ← retro.reconstructFromArchive() を invoke
[ 📄 pending_summary.json を再生成 ]
[ ↺ approval.decide retry (NOT_FOUND 検知時) ]
```

- 通常時は閉じている (header の `⚙ admin` で expand)
- `reconstructed_from_archive: true` marker が付与された finding はカードに小さく表示

**実装ファイル**:
- `views/retro/RetroView.tsx` — 全面書き換え (KPT board + admin)
- `views/retro/KptColumn.tsx` — 各列の共通 wrapper
- `views/retro/CarryoverCard.tsx` — pip + verdict badge + lifecycle metadata
- `views/retro/AdminPanel.tsx` — reconstruct ボタン
- `useRetroLifecycle` hook 新設 — `pending_summary.json` + `pending.json` から carryover を reduce
- 新 tRPC: `trpc.retro.reconstructFromArchive(retroId)` 配線

---

## 2. Tier 2 — moderate enhancement (2 view)

### 🟠 2.1 LearnedGuidance — 階層 filter + key path 表示

- header に **scope filter pill row** 追加: `all` / `Agents (3)` / `loom-review` / `loom-retro`
- 各 guidance card に **`AGENT` / `SKILL` badge** と **key path** (例: `skills/loom-review/strategies/trio/code`) を表示
- aggregator scope の guidance には `WRITE` badge

実装ファイル:
- `views/guidance/LearnedGuidanceView.tsx` — filter + badge 追加
- entry schema 拡張: `keyKind: "agent"|"skill"` + `keyPath: string`

---

### 🟠 2.2 SessionList — reviewer_agent column を skill identifier に rename

**現状**: 値は `"loom-reviewer"` / `"loom-code-reviewer"` 等の旧 agent 名 string が残る (interface contract identifier として preserve)
**変更**: 値を **skill identifier** に reformat: `loom-review/trio.code` / `loom-review/single` / `loom-review/trio.security`

理由: 値は変更不可 (DB 互換) ではないなら、見た目だけでも skill 名にすれば「agent ではない」ことが伝わる。

**列名も rename**: `reviewer_agent` → `reviewer (skill)`

実装ファイル:
- `views/session-list/SessionListView.tsx` — 列ヘッダ更新、値の reformat 関数追加
- `daemon/src/routes/sessions.ts` — projection で skill identifier に変換、または UI 側で旧文字列 → 新文字列 mapping

---

## 3. Tier 3 — minor (3 箇所)

### 🟡 3.1 TokenMeter — `useTokenUsage({ enabled })` の gate
- `enabled: !!session.active` を caller で渡す
- session 起動前は polling 抑止

### 🟡 3.2 Error toast — `approval.decide` NOT_FOUND throw 対応
- `onError` で `err.data?.code === 'NOT_FOUND'` を判別
- `toastBus.push({ kind: 'error', text: 'approval event が見つかりません (期限切れ?)', action: 'retry' })`
- retry action は同じ payload で再送

### 🟡 3.3 Sidebar.tsx — dead export 削除確認
- M0.17 で AppShell Drawer + TopBar に置換済のはずだが、`Sidebar.tsx` ファイル自体が残っていたら削除

---

## 4. 作業優先度 + 所要見積

| Pri | 項目 | LOC 目安 | 工数 |
|---|---|---|---|
| **P0** | Customization tree (1.2) | 400-500 | 1.5d |
| **P0** | Retro KPT + lifecycle + admin (1.3) | 350-450 | 1.5d |
| **P0** | Room Spirit + SummonQueue (1.1) | 250-350 | 1d |
| P1 | LearnedGuidance scope filter (2.1) | 80-120 | 0.5d |
| P1 | SessionList rename (2.2) | 40-60 | 0.25d |
| P1 | TokenMeter gate (3.1) | 10-20 | 0.1d |
| P1 | NOT_FOUND toast (3.2) | 30-50 | 0.25d |
| P2 | useDispatchQueue hook (1.1 supporting) | 100-150 | 0.5d |
| P2 | Spirit motion Tweaks (1.1 supporting) | 50-80 | 0.25d |
| P2 | `retro.reconstructFromArchive` tRPC 配線 (1.3 supporting) | 50-80 | 0.25d |

**合計**: 約 **6 日**

---

## 5. 設計の意図 — 変えないところの方が大事

ユーザーの「画面案はあんまり変わんなくていい」のコメント通り、本改修は **増築** が中心。

| 維持 | 理由 |
|---|---|
| 部屋メタファ / cat sprite / RPG タッチ | プロダクトの愛着の核。マイグレーションでも保つ |
| pop / dusk / night テーマ | 動作モデルと無関係。M0.X-skill-migration の影響なし |
| Gantt / Plan / Consistency ポスター | ポスターは observation 系。skill migration とは独立 |
| Worktree subroom 表現 | git worktree 由来。今回の skill migration とは別軸 |
| Subroom clone (dev 並列) | 同上 |
| AgentDetailPanel の構造 | spirit 側もこの panel で詳細表示 (kind: "spirit" の場合 model 列を隠す) |
| Plan / Gantt / Consistency view 自体 | 影響なし。Phase 2 で別途 enhance |

---

## 6. 設計案ファイル (本 PJ 側) と本実装のマッピング

| 設計案 (本 PJ) | 本実装の対応先 | 差分の意味 |
|---|---|---|
| `index.html` "Room — pop/dusk/night" | `views/room/RoomView.tsx` + theme tokens | 既存維持 |
| `index.html` **"Spirit Summoning" 新 section** (3 artboard) | `views/room/RoomView.tsx` + new `Spirit.tsx` | **新規。Tweaks で flavor 選択** |
| `index.html` "3 persistent + 10 spirit — character sheet" | 内部 ROSTER 定義 | グルーピング差し替え (core / review / retro-lens / retro-stage) |
| `screens-c.jsx` `CustomizationView` (tree) | `views/customization/CustomizationView.tsx` | **2-pane に再編** |
| `screens-b.jsx` `RetroView` (KPT) | `views/retro/RetroView.tsx` | **KPT board + lifecycle 追加** |
| `screens-c.jsx` `LearnedGuidanceView` (scope filter) | `views/guidance/LearnedGuidanceView.tsx` | filter pill row + key path badge |

---

## 7. テスト戦略

QA Test Matrix (`QA Test Matrix.html`) に以下のセクション追加:

- **SPIRIT-** prefix: spirit motion / queue / echo
- **CUSTOM-TREE-** prefix: tree navigation, leaf editor
- **RETRO-LC-** prefix: lifecycle pip, carryover state, re-eval verdict, 3-strike rule
- **RETRO-ADM-** prefix: admin / reconstruct
- **GD-SCOPE-** prefix: guidance scope filter
- **SES-LBL-** prefix: session reviewer column rename
- **ERR-NF-** prefix: approval.decide NOT_FOUND toast

詳細は `QA Test Matrix.html` の追補参照。

---

## 8. open questions

- spirit の **ttl 表示** は秒単位で十分か？分単位 / "実行中" 表記が好まれるか要確認
- KPT の **KEEP 列** をどうユーザーから収集するか (今は lens の "+ comment" を流用想定だが、PM chat から拾うのも候補)
- aggregator の **WRITE 権限** 表示は customization tree と learned-guidance の両方に出すが、project-settings の skill 管理画面にも出すべきか
- "spirit echo" の **fade 期間** は何分？(現案: 直近 60min)
- Reconstruct 後の `reconstructed_from_archive: true` finding の **見た目**: 通常 card と何で区別するか (枠線色 / 小さい marker / どちらか)

これらは次の retro での design lens 議題候補。
