# Doc Consistency Manual Checklist

> M4 で自動化される（doc 整合性エンジン v1）まで、SPEC を変更したらこのチェックリストを **PM が必ず実行** する。

## 手順

### 1. 変更内容の把握

```bash
git diff SPEC.md
# あるいは前回 commit からの差分
git diff HEAD~1 SPEC.md
```

### 2. 影響範囲の洗い出し

以下のドキュメントについて、SPEC 変更の影響を確認：

- [ ] `README.md` — ユーザー向け説明と齟齬がないか
- [ ] `CLAUDE.md` — 作業規約に変更が必要か
- [ ] `PLAN.md` — マイルストーン / タスクに追加・削除が必要か
- [ ] `docs/SCREEN_REQUIREMENTS.md` — 画面要件に波及するか
- [ ] `docs/plans/*.md` — 進行中の詳細プランに波及するか
- [ ] `tests/REQUIREMENTS.md` — 受入要件 ID の追加・削除が必要か
- [ ] `agents/*.md` — agent system prompt の振る舞いに変更が必要か
- [ ] `commands/*.md` — slash command の挙動に変更が必要か

### 3. 検出語彙の grep（軽量チェック）

SPEC で削除・変更された主要語句を grep：

```bash
# 例：SPEC から ANTHROPIC_API_KEY が消えた場合
grep -rn "ANTHROPIC_API_KEY" --include="*.md" .
```

### 4. ユーザー承認

影響を受ける可能性のあるドキュメント一覧を user に提示：

- 影響なし → 確認だけ報告
- 影響あり → 該当箇所を user 承認の上で更新

### 5. 更新の commit

ドキュメント更新は SPEC 変更とは別 commit に分ける：

```bash
git add <updated docs>
git commit -m "docs: align with SPEC update (X 機能)"
```

## 例：典型的なケース

### Case A: SPEC §X の削除

- 関連 grep → 言及のあるドキュメント特定 → 削除 / 書き換え

### Case B: 用語の rename

- 旧用語を grep → 全置換（手動確認しながら）

### Case C: スキーマ変更

- DB スキーマ変更 → 関連する SCREEN_REQUIREMENTS / EVENT_SCHEMA も更新

## このチェックリスト自体の改善

M4（doc 整合性エンジン v1）実装時に検出ルールを抽出する元データとして本チェックリストを使う。手で運用しながら気付いた検出パターンを追記すること。

## M0.9 Customization Layer 関連 check

SPEC `§3.6.5` / `§6.9.4` を編集した時：

- [ ] `templates/user-prefs.json.template` の `agents.*` 例が schema と一致
- [ ] `templates/project-prefs.json.template` の `agents.*` 例が schema と一致
- [ ] `docs/RETRO_GUIDE.md` の retro lens 観測対象に customization state が記述されとる
- [ ] `agents/loom-{pm,developer,reviewer 群,retro-* 群}.md` の Customization Layer 参照記述が schema 変更に追従
- [ ] `prompts/personalities/*.md` の preset 名と SPEC §6.9.4.4 の同梱表が一致

`docs/CODING_PRINCIPLES.md` を編集した時：

- [ ] `agents/loom-developer.md` の Coding Principles セクションが現行 13 原則を参照（追加/削除があれば反映）
- [ ] 全 reviewer agent prompt（`loom-reviewer.md` / `loom-code-reviewer.md` / `loom-test-reviewer.md`）の review 観点が CODING_PRINCIPLES.md と整合
- [ ] `README.md` で言及されとる原則数（13）が一致

## M0.10 Worktree 関連 check

`skills/loom-worktree/SKILL.md` を編集した時：

- [ ] Decision tree の 5 用途と SPEC §3.6.6.1 が一致
- [ ] Path convention で参照する `project-prefs.worktree.base_path` の placeholder 仕様と template が一致
- [ ] 3 agent (loom-pm / loom-developer / loom-retro-pm) prompt の Worktree section が skill 仕様と整合
- [ ] README の worktree 入門が skill / SPEC と整合

## M0.11 learned_guidance + lens tagging 関連 check

SPEC §3.6.5.4 / §3.9.x / §6.9.4 を編集した時：

- [ ] `templates/{user,project}-prefs.json.template` の `agents.<name>.learned_guidance` example が schema と一致
- [ ] `docs/RETRO_GUIDE.md` の lens tagging convention が SPEC §3.9.x と一致
- [ ] 4 retro lens (`agents/loom-retro-{pj,process,meta}-judge.md` + `loom-retro-researcher.md`) prompt が `target_artifact / target_agent / guidance_proposal` field 出力を記述
- [ ] 13 agent prompt の Customization Layer section が `learned_guidance` 注入経路を記述
- [ ] `agents/loom-retro-aggregator.md` の write logic が schema 仕様と整合
- [ ] `agents/loom-retro-counter-arguer.md` が tag fields を verdict pass 通過時に preserve

## M0.12 Coexistence Mode 関連 check

SPEC §3.6.7 / §3.7 / §6.9 を編集した時：

- [ ] `templates/claude-loom/project.json.template` の `rules.coexistence_mode` enum 値と SPEC §3.6.7.1 が一致
- [ ] `rules.enabled_features` array の feature group 名と SPEC §3.6.7.2 が一致
- [ ] 3 dispatcher agent (`loom-pm` / `loom-developer` / `loom-retro-pm`) prompt の runtime gate 記述が SPEC §3.6.7.3 と整合
- [ ] `commands/loom-mode.md` が SPEC §3.6.7 と整合
- [ ] README.md の Coexistence Mode intro が SPEC と整合

## M0.13 Retro Discipline & Process Hardening 関連 check

SPEC §3.9.x / §3.6.8 / RETRO_GUIDE.md を編集した時：

- [ ] retro 基本方針 P1/P2/P3 が SPEC §3.9.x と RETRO_GUIDE.md で一致
- [ ] 4 retro lens prompt の freeform improvement instruction が RETRO_GUIDE.md と整合
- [ ] `agents/loom-retro-aggregator.md` の action plan section が P3 と整合
- [ ] `agents/loom-retro-counter-arguer.md` の freeform 検証強化が RETRO_GUIDE.md と整合
- [ ] `agents/loom-retro-pm.md` の user lens 公式組込 が SPEC §3.9.x と整合（verdict 保存 hook は M2.1 で SPEC §3.9.10 / §6.9.5 に refactor、本 checklist M2.1 セクション参照）
- [ ] `agents/loom-pm.md` の workflow discipline 5 項目が SPEC §3.6.8 と整合
- [ ] `agents/loom-developer.md` の TDD red 順序 enforcement が SPEC §3.6.8.6 と整合
- [ ] `tests/retro_test.sh` / `tests/agents_test.sh` の M0.13 assertion が SPEC と整合

## M1 Daemon + Hooks Foundation 関連 check

SPEC §6.2 / §6.3 / §6.4 / §6.10 / §7.3 / §12 を編集した時：

- [ ] `daemon/src/db/schema.ts` の Drizzle 定義が SPEC §6.1 / §6.2 / §7.3 の SQL DDL と semantic 一致（11 table、composite PK 含む）
- [ ] SPEC §12 の確定値（tRPC / Drizzle / nanoid / integer ms / etc.）と `daemon/package.json` の依存が整合
- [ ] `daemon/src/router.ts` の AppRouter export が frontend (M2) 渡し用 export pattern 維持
- [ ] `daemon/src/events/types.ts` の WS event schema が SPEC §6.3 Event payload 仕様と一致
- [ ] `daemon/src/hooks/ingest.ts` の POST /event handler input が `hooks/*.sh` の payload schema と一致
- [ ] `daemon/src/security/token.ts` の chmod 600 + bind 127.0.0.1 が SPEC §12 の security baseline と一致
- [ ] `install.sh` の hooks/ symlink + settings.json 配線が `hooks/*.sh` 5 種を完全 cover

`agents/*.md` を編集した時（M1 後の継続的維持）：

- [ ] daemon が読む event payload schema と各 agent の hook 起動経路が整合

## M2.1 verdict_evidence + M0.14 closure 関連 check

SPEC §3.9.10（verdict_evidence 概念 + write timing）/ §6.9.5（zod 完全 schema）を編集した時：

- [ ] `agents/loom-retro-pm.md` Stage 0 の verdict_evidence build 5 step（git log → task_id 推定 → transcript 抽出 → PM hint 優先 → zod validate + file write）が SPEC §6.9.5 lazy build 手順と整合
- [ ] `agents/loom-pm.md` milestone tag hook の `[reviewer-dispatch-refs]` block 形式（`task_id` / `commit_sha` / `reviewer_agent` / `review_mode` の 4 field 1 行 N entries）が SPEC §3.9.10 PM hint 規約と整合
- [ ] `docs/RETRO_GUIDE.md` "verdict_evidence 保存規律" section が SPEC §3.9.10 / §6.9.5 と整合
- [ ] `tests/agents_test.sh` の M2.1 assertion 3 種（retro-pm Stage 0 build step / PM hint block / process-judge 3 新 category）が SPEC + RETRO_GUIDE と整合

M0.14 essence cleanup（M2.1 統合実施、M0.14 t6/t7 closure）：

- [ ] `agents/loom-retro-process-judge.md` の 3 新 category（`process-permission-friction` / `process-routine-automation-opportunity` / `process-keybind-opportunity`）が SPEC §3.10.1 mandate/suggest table と整合（M0.14 essence は SPEC + CLAUDE.md + agents/loom-retro-process-judge.md に既反映済、M2.1 で test rigor 追加で closure）
- [ ] `tests/agents_test.sh` の process-judge 3 新 category schema assertion が SPEC §3.10.1 と整合（M0.14 t7 closure）
- [ ] PLAN.md M0.14 セクション末尾の PLAN-SSoT 整合性注記が retro 2026-05-02-001-report.md pj-003 / proc-004 と整合（M0.14 t6 closure 補強）

## M3 UI Architecture 関連 check（M3.0 / M3.1 / M3.2）

SPEC §3.6.9（M3 UI Architecture）/ §12 stack 確定値（Phaser mount / Gantt / PLAN sync）を編集した時：

- [ ] §3.6.9.1（Phaser mount α-1）と §12 確定値表の "Phaser React 内 mount pattern" 行が整合
- [ ] §3.6.9.2（PLAN sync β-3）と §12 確定値表の "PLAN.md 双方向同期" 行が整合
- [ ] §3.6.9.3（Gantt γ-3）と §12 確定値表の "Gantt 実装" 行が整合
- [ ] §3.6.9.4 toast 6 event 表と §6.3 Event payload 仕様（実装後 `daemon/src/events/types.ts`）が整合
- [ ] §3.6.9.6 M3 分割（M3.0/.1/.2）と `PLAN.md` M3 系列セクション + `tests/REQUIREMENTS.md` REQ-032/033/034 が整合

M3.0（Room View）実装時：

- [ ] `ui/src/views/RoomView/` の Phaser mount pattern が SPEC §3.6.9.1（自前 useEffect + useRef + HMR `import.meta.hot.dispose`）と整合
- [ ] tile map JSON + tokens.css `var(--color-bg)` 連携が SPEC §3.6.9.1 + M2 3 theme 仕様と整合
- [ ] agent sprite 状態アニメ（idle/busy/失敗）が daemon `agent` subscription event schema と整合

M3.1（Plan View + Gantt + sync）実装時：

- [ ] PLAN.md 双方向同期実装（debounce + LWW + `plan_conflict_detected` toast + localStorage backup）が SPEC §3.6.9.2 と整合
- [ ] daemon chokidar + 500ms debounce + conflict resolution が SPEC §3.6.9.2 と整合
- [ ] Gantt SVG 実装（`<rect>` / `<line>` / `<text>` + tokens.css var 直参照）が SPEC §3.6.9.3 と整合
- [ ] toast 6 event の `plan_conflict_detected` payload が SPEC §3.6.9.4 + `daemon/src/events/types.ts` と整合

M3.2（Session/Agent/notes）実装時：

- [ ] Session List filter / sort / subscription が daemon `session` route + WS event types と整合
- [ ] Agent Detail `agent.markAttention` mutation が daemon `agent` route + DB schema と整合
- [ ] notes `note.create` mutation + plan_items 連結が daemon `note` route + `plan_items` table schema と整合

## M0.11.1 Lifecycle Tracking Architecture 関連 check

SPEC §3.9.11（Lifecycle Tracking Architecture）/ §6.9.6（pending.json schema v2）/ §6.9.7（applied_summary.json schema）/ §6.9.4.5（learned_guidance auto-prune rule）を編集した時：

- [ ] §3.9.11 の write timing / 責務 / lazy build 戦略が §6.9.6 + §6.9.7 schema と整合
- [ ] §6.9.6 schema_version: 2 が `pending.json` 既存 4 retro session の migration 後 state と整合
- [ ] §6.9.7 lazy build 5 step が `agents/loom-retro-pm.md` Stage 0 拡張記述と整合
- [ ] §6.9.4.5 auto-prune 2 mechanism (ttl_sessions + last_used_in) が `agents/loom-retro-aggregator.md` write logic と整合
- [ ] 4 lens prompt（pj-judge / process-judge / meta-judge / researcher）が `applied_summary_path` injection + `Read` tool 参照 mechanism を記述
- [ ] `agents/loom-retro-counter-arguer.md` の stale finding detection section が **物理削除** (M0.11.1 closure 時、SPEC §3.9.x P4 理想形 archive)
- [ ] `templates/{user,project}-prefs.json.template` の learned_guidance example に `last_used_in` field 追加
- [ ] `docs/RETRO_GUIDE.md` "Lifecycle Tracking Architecture" section が SPEC §3.9.11 + §6.9.6 + §6.9.7 + §6.9.4.5 と整合
- [ ] migration script (M0.11.1 t7) が既存 4 retro session の pending.json に `applied_in` + `apply_history` 後付けして schema_version 2 に migrate 完了
- [ ] dry-run test (M0.11.1 t12) で applied_summary build → schema validate → fixture diff の動作確認 (rollback 前安全網)

## SCREEN_REQUIREMENTS.md 更新時の整合性 check

`docs/SCREEN_REQUIREMENTS.md` を編集した時：

- [ ] §3 観測ニーズと SPEC §6 (DB schema) / §6.9 (prefs schema) が整合
- [ ] §4 介入ニーズと daemon tRPC procedure (M1 で実装、後続で追加) が対応
- [ ] §5 通知 toast と daemon WS event types (`daemon/src/events/types.ts`) が対応
- [ ] §6 visual hint と SPEC §12 visual 方向性 (ピクセル RPG) が整合
- [ ] §7 Phase 振り分けと PLAN.md M2-M5 milestone tasks が整合
