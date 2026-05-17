# M0.X-spec-plan-multi-file: SPEC/PLAN multi-file thinking 思想 codify (Stage 1)

- **Date**: 2026-05-17
- **Branch**: `docs/spec-plan-multi-file-thinking-design` (既設、design doc commit 済み)
- **Design spec**: [docs/plans/specs/2026-05-17-spec-plan-multi-file-thinking-design.md](specs/2026-05-17-spec-plan-multi-file-thinking-design.md)
- **Master PLAN id**: M0.X-spec-plan-multi-file (Stage 1)、Stage 2 (claude-loom 自身の migration) は M0.X-spec-plan-multi-file-dogfood placeholder
- **Status**: planned
- **Rename history**: 2026-05-17 当初 M0.X-spec-plan-multi-file で起案、M0.X-spec-plan-multi-file が M0.17 retro carryover placeholder と既に予約済みやったため M0.X-* convention へ rename (CLAUDE.md GitHub Flow 規約 + M0.X-* convention 準拠)

## Goal

claude-loom が promote する spec/plan 駆動開発の **構造規約として multi-file 思想を組み込む**。本 milestone は **思想 codify のみ** (SPEC §3.11 新設 + 関連 agent/command/skill/template 更新)。claude-loom 自身の SPEC.md 2865 行解体は M0.X-spec-plan-multi-file-dogfood の dogfood migration へ分離。

## Architecture

- **SSoT**: 新規 `SPEC.md §3.11` (multi-file spec/plan 思想 + axis ガイドライン + trigger + 参照記法)
- **配布**: `templates/SPEC.md.template` (single-file 既存維持) + `templates/multi-file-spec-skeleton/` (multi-file 新規)
- **発火 logic**: PM agent prompt + `/loom-spec` brainstorm prompt + size threshold 警告
- **PLAN 側拡張**: `loom-write-plan` skill に Phase-split + milestone 内 axis 分割サポート追加
- **doc consistency**: `docs/DOC_CONSISTENCY_CHECKLIST.md` に multi-file mode 用 4 check 項目追加

## File structure

| 種別 | path | task |
|---|---|---|
| modify | `PLAN.md` | t1 |
| modify | `SPEC.md` (§3.11 新設) | t2 |
| modify | `CLAUDE.md` | t3 |
| create | `templates/multi-file-spec-skeleton/SPEC.md.template` | t4 |
| create | `templates/multi-file-spec-skeleton/spec/_sample-topic.md.template` | t4 |
| modify | `agents/loom-pm.md` | t5 |
| modify | `commands/loom-spec.md` | t6 |
| modify | `skills/loom-write-plan/SKILL.md` | t7 |
| modify | `docs/DOC_CONSISTENCY_CHECKLIST.md` | t8 |
| create | `tests/multi_file_skeleton_test.sh` | t9 |

## Batch 編成

- **Phase A (sequential)**: t1 → t2 — PLAN.md + SPEC §3.11 が後続の SSoT anchor
- **Phase B (parallel candidate)**: t3 / t4 / t5 / t6 / t7 — `planned_files` 完全 disjoint、parallel batch 可
- **Phase C (sequential after B)**: t8 → t9 — t8 は §3.11 確立後の check 項目、t9 は templates/agents 全部揃った後の harness test

<!-- planned_files: t3=CLAUDE.md, t4=templates/multi-file-spec-skeleton/, t5=agents/loom-pm.md, t6=commands/loom-spec.md, t7=skills/loom-write-plan/SKILL.md -->

## Tasks

### Task 1: PLAN.md master milestone entry (M0.X-spec-plan-multi-file + M0.X-spec-plan-multi-file-dogfood)

**Goal**: master roadmap に Stage 1 (M0.X-spec-plan-multi-file) + Stage 2 (M0.X-spec-plan-multi-file-dogfood placeholder) を登録
**Files**: `PLAN.md` (modify)
**Spec ref**: design spec §8
**Insertion points**: 既存 M0.X-skill-migration milestone エントリの直後 (PLAN.md 行 1530 周辺、適切な timeline 順序へ挿入)
**Integrity check**: `grep -cE "^## マイルストーン M0\\.(18|19)" PLAN.md` → `2`
**Commit prefix**: `docs(plan): M0.X-spec-plan-multi-file + M0.X-spec-plan-multi-file-dogfood milestone entry 追加`

### Task 2: SPEC §3.11 新設 (multi-file thinking SSoT)

**Goal**: SPEC に §3.11 を新設し、思想 / axis ガイドライン / trigger / 参照記法 / doc consistency 拡張要件を codify
**Files**: `SPEC.md` (modify)
**Spec ref**: design spec §3, §4, §5, §6
**Insertion points**: `### 3.10.2 Agent prompt 設計原則` の直後、`## 4. アクター（エージェント）定義` の直前
**Integrity check**: `grep -cE "^### 3\\.11(\\s|$)" SPEC.md` → `1` (parent) && `grep -cE "^#### 3\\.11\\.[1-5]" SPEC.md` → `5` (sub-sections at `####` level、§3.10.x convention 準拠)
**Commit prefix**: `docs(spec): §3.11 multi-file spec/plan thinking 新設`
**Notes**: §3.11 の subsections として §3.11.1 (思想) / §3.11.2 (axis ガイドライン) / §3.11.3 (trigger) / §3.11.4 (参照記法) / §3.11.5 (doc consistency 拡張) を設置。design spec の §3〜§6 内容を要点圧縮で転記

### Task 3: CLAUDE.md ファイル配置規約 + 主要ドキュメント参照 更新

**Goal**: CLAUDE.md に multi-file pattern (master + spec/ folder) を記述、SPEC §3.11 へのポインタを設置
**Files**: `CLAUDE.md` (modify)
**Spec ref**: SPEC §3.11 (Task 2 で確立)
**Insertion points**:
- 「ファイル配置規約」セクション (現状 `agents/` `commands/` `hooks/` 等の列挙) に `spec/ (multi-file mode 時)` 行追加
- 「主要ドキュメント参照」セクションに「multi-file mode 時の参照記法 (`spec/<topic>.md §X.Y`)」追記
**Integrity check**: `grep -c "spec/" CLAUDE.md` → `≥1` && `grep -c "§3\\.11" CLAUDE.md` → `≥1`
**Commit prefix**: `docs: CLAUDE.md に multi-file spec/plan pattern 追記`

### Task 4: templates/multi-file-spec-skeleton/ 新規追加

**Goal**: multi-file SPEC 雛形を新設 (master + sample topic)
**Files**:
- `templates/multi-file-spec-skeleton/SPEC.md.template` (create) — master 雛形: 定位 / scope / SSoT 原則 / 用語表 / 確定済み技術判断 / 関連ドキュメント / 変更履歴 / topic index
- `templates/multi-file-spec-skeleton/spec/_sample-topic.md.template` (create) — topic file 雛形: §1 から番号開始 / cross-ref pattern 例示 / master 参照 placeholder
**Spec ref**: design spec §7
**Integrity check**: `test -f templates/multi-file-spec-skeleton/SPEC.md.template && test -f templates/multi-file-spec-skeleton/spec/_sample-topic.md.template`
**Commit prefix**: `feat(templates): multi-file-spec-skeleton 新規追加`
**TDD**: red — t9 の `tests/multi_file_skeleton_test.sh` を t4 と同 PR 内で red→green (t9 完成は最後だが、t4 commit 時点で template 存在 assertion パス確認)
**Notes**: 既存 `templates/SPEC.md.template` は single-file 用として現状維持、touch せえへん。multi-file 採用 PJ は本 skeleton を carve

### Task 5: agents/loom-pm.md に multi-file 判定 step 追加

**Goal**: PM agent prompt に spec phase での multi-file 判定 step + post-creation size threshold 警告 logic を追加
**Files**: `agents/loom-pm.md` (modify)
**Spec ref**: SPEC §3.11.3 (trigger) + design spec §4
**Insertion points**:
- `### spec → impl → verify → retro` セクション (line 45 周辺): brainstorm 時の multi-file 判定 step 追記
- `## Milestone closure protocol` 周辺: master spec/plan の size threshold 警告 surface 責務追加 (default `SPEC.md` 1000 行 / `PLAN.md` 1500 行、`project-prefs.json` の `rules.spec_split_threshold` / `rules.plan_split_threshold` で override 可)
**Integrity check**: `grep -c "multi-file" agents/loom-pm.md` → `≥2` (spec phase + closure protocol 両方)
**Commit prefix**: `feat(agents): loom-pm に multi-file 判定 step + size 警告 logic`
**Notes**: judgment は user 確認介在、自動分割禁止を agent prompt 内で明示

### Task 6: commands/loom-spec.md に multi-file brainstorm prompt 追加

**Goal**: `/loom-spec` command 内に multi-file 判定の brainstorm guidance を追加
**Files**: `commands/loom-spec.md` (modify)
**Spec ref**: SPEC §3.11.3 (初発 trigger) + design spec §4.1
**Insertion points**: 既存 brainstorm phase 記述内、PJ scope 棚卸し step の延長として multi-file 判定 prompt 追記
**Integrity check**: `grep -c "multi-file" commands/loom-spec.md` → `≥1`
**Commit prefix**: `feat(commands): loom-spec に multi-file 判定 brainstorm 追加`

### Task 7: skills/loom-write-plan に PLAN Phase 分割 サポート追加

**Goal**: loom-write-plan skill に PLAN Phase-split + milestone 内 axis 分割サポートを追加
**Files**: `skills/loom-write-plan/SKILL.md` (modify)
**Spec ref**: SPEC §3.11 + design spec §3.3
**Insertion points**:
- `## Output structure` セクション: PLAN-phase-A.md / milestone-folder pattern を新 mode として記述
- `## Process` セクション: PM judgment による mode 選択 step 追記
**Integrity check**: `grep -cE "Phase-split|milestone-folder|PLAN-phase-" skills/loom-write-plan/SKILL.md` → `≥1`
**Commit prefix**: `feat(skills): loom-write-plan に PLAN Phase 分割 サポート`

### Task 8: docs/DOC_CONSISTENCY_CHECKLIST.md に multi-file mode 項目追加

**Goal**: doc consistency checklist に multi-file mode 用 4 項目追加 (用語整合 / cross-ref 健全性 / scope 重複 / master index 整合性)
**Files**: `docs/DOC_CONSISTENCY_CHECKLIST.md` (modify)
**Spec ref**: SPEC §3.11.5 (Task 2) + design spec §6.2
**Integrity check**: `grep -c "multi-file mode" docs/DOC_CONSISTENCY_CHECKLIST.md` → `≥1` && `grep -cE "用語整合|cross-ref 健全性|scope 重複|master index" docs/DOC_CONSISTENCY_CHECKLIST.md` → `≥4`
**Commit prefix**: `docs: DOC_CONSISTENCY_CHECKLIST に multi-file mode check 項目追加`

### Task 9: tests/multi_file_skeleton_test.sh 新規追加 (harness test)

**Goal**: bash harness test で (1) template 構造 (2) agent prompt marker (3) SPEC §3.11 存在 を verify
**Files**: `tests/multi_file_skeleton_test.sh` (create)
**Spec ref**: design spec §7, §9 (Task 2/4/5/6/7 全完了が前提)
**Integrity check**: `bash tests/run_tests.sh multi_file_skeleton` → PASS
**Commit prefix**: `test(harness): multi-file skeleton + agent prompt marker test 追加`
**TDD**: red (t2/t4/t5/t6/t7 完了前なら失敗) → green (全 Task 完了後 PASS)
**Notes**: test 内容 — (a) `templates/multi-file-spec-skeleton/SPEC.md.template` + `spec/_sample-topic.md.template` 存在 (b) `agents/loom-pm.md` 内 `multi-file` 言及 ≥2 (c) `commands/loom-spec.md` 内 `multi-file` 言及 ≥1 (d) `SPEC.md §3.11` セクション存在

## Self-Review

### Spec coverage

- design spec §3 (Architecture: SPEC/PLAN/3 mode 共存) → t2 (SPEC §3.11.1/.2) + t7 (PLAN 側 skill)
- design spec §4 (Triggering) → t2 (SPEC §3.11.3) + t5 (PM agent) + t6 (loom-spec command)
- design spec §5 (参照記法) → t2 (SPEC §3.11.4) + t3 (CLAUDE.md)
- design spec §6 (doc consistency 拡張) → t2 (SPEC §3.11.5) + t8 (DOC_CONSISTENCY_CHECKLIST)
- design spec §7 (template) → t4 + t9 (test)
- design spec §8 Stage 1 scope → t1 (M0.X-spec-plan-multi-file entry) + 全 task
- design spec §8 Stage 2 → t1 (M0.X-spec-plan-multi-file-dogfood placeholder entry のみ、本 milestone scope 外)
- design spec §9 影響範囲 → 9 task で全 file 網羅

### Placeholder scan

- 全 task 内に `TBD` / `TODO` / `後で` なし
- design spec §10 Open questions は本 milestone scope 外 (運用後 retro 調整 / M4 接続 / 3-tier nesting YAGNI)

### Type / 名前 一貫性

- `multi-file mode` / `single-file mode` は design spec + 全 task で統一
- §3.11 sub-section 番号 (.1〜.5) は t2 で確定、t3/t5/t6/t7/t8 で同番号 ref
- `templates/multi-file-spec-skeleton/` path は t4/t9 で一致
- threshold 値 (1000 行 SPEC / 1500 行 PLAN) は design spec §4.2 + t5 で一致

## Risks

- **§3.11 番号 conflict リスク**: 別 milestone (M0.X-skill-migration、active branch) が §3.10.x へ加筆中の可能性。t2 開始前に main 最新を fetch し、SPEC §3.11 が他 branch で予約されてないか確認。conflict 時は §3.12 へ shift
- **PLAN.md M0.X-spec-plan-multi-file/M0.X-spec-plan-multi-file-dogfood 番号 conflict リスク**: 別 active branch が同番号予約してないか確認。conflict 時は M0.X-spec-plan-multi-file prefix へ rename
- **agent prompt size guideline**: t5 で `agents/loom-pm.md` (現 200-250 行 guideline) に追記、size 上限超過の場合は判断 logic を SPEC §3.11.3 SSoT 引用 1 行 + skill delegation で圧縮 (SPEC §3.10.2 Agent prompt 設計原則 準拠)

## Out of scope (Stage 2 / M0.X-spec-plan-multi-file-dogfood)

- claude-loom 自身の SPEC.md (2865 行) 解体
- claude-loom 自身の M1/M2 milestone 詳細 (SPEC 内 行 1846〜2435) を PLAN 側へ移管
- 既存 agent prompts / retro report に残る `SPEC.md §X` 記法の一斉書き換え (新規記述から段階的適用が design spec §5.1 SSoT)
