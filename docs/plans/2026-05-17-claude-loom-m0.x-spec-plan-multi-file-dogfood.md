# M0.X-spec-plan-multi-file-dogfood: claude-loom 自身の SPEC.md multi-file 化 (Stage 2)

- **Date**: 2026-05-17
- **Branch**: `refactor/spec-plan-multi-file-dogfood` (作成済み)
- **Design spec**: [docs/plans/specs/2026-05-17-spec-plan-multi-file-dogfood-design.md](specs/2026-05-17-spec-plan-multi-file-dogfood-design.md)
- **Parent design spec**: [docs/plans/specs/2026-05-17-spec-plan-multi-file-thinking-design.md](specs/2026-05-17-spec-plan-multi-file-thinking-design.md) §8.2 Stage 2 SSoT
- **Master PLAN id**: M0.X-spec-plan-multi-file-dogfood
- **Status**: planned
- **Rename history**: M0.X-spec-plan-multi-file-dogfood は Stage 2 用 (Stage 1 = M0.X-spec-plan-multi-file = `m0.x-spec-plan-complete` tag で closure 済み)
- **Out of scope**: M1/M2 milestone 詳細 (584 行) の PLAN 移管は別 milestone (Stage 3) 分離

## Goal

Stage 1 で codify した multi-file 思想を claude-loom 自身に dogfood 適用、`SPEC.md` 2954 行を **master + spec/ 5 topics** (Mixed 5 topics axis) へ migration。新思想の practical validation が本 milestone の真の目的、技術的成果より retro での思想再検証が hi-value。

## Architecture

- **SSoT**: design spec §3 (Mixed 5 topics 構造)
- **carve operation**: design spec §4 の 5 step pattern を各 topic で sequential 実行
- **renumber rule**: 各 topic file 内 § を §1 から local 振り直し (SPEC §3.11.4 SSoT)
- **cross-ref rewrite**: `spec/<topic>.md §X.Y` 記法 (SPEC §3.11.4 SSoT)
- **既存 SPEC §X 古記法**: 書き換えない (design spec §5.1 SSoT)

## File structure

| 種別 | path | task |
|---|---|---|
| modify | `PLAN.md` (milestone entry) | t1 |
| create | `spec/harness.md` | t2 |
| modify | `SPEC.md` (harness 関連 section を pointer 化) | t2 |
| create | `spec/daemon-and-data.md` | t3 |
| modify | `SPEC.md` (daemon 関連 section を pointer 化) | t3 |
| create | `spec/ui-arch.md` | t4 |
| modify | `SPEC.md` (UI 関連 section を pointer 化) | t4 |
| create | `spec/retro-system.md` | t5 |
| modify | `SPEC.md` (§3.9 を pointer 化) | t5 |
| create | `spec/install-and-test.md` | t6 |
| modify | `SPEC.md` (§3.7 + §9 + §10 を pointer 化) | t6 |
| modify | `SPEC.md` (Topic Index 新設 + cleanup) | t7 |
| modify | `SPEC.md` + `spec/*.md` (cross-ref rewire) | t8 |
| modify | `tests/multi_file_skeleton_test.sh` (skeleton-n〜r 拡張) | t9 |
| - | doc consistency check 実行 (`docs/DOC_CONSISTENCY_CHECKLIST.md` 4 項目走査) | t10 |

## Batch 編成

- **全 task sequential** (t2〜t7 は全て `SPEC.md` を modify、planned_files overlap で parallel batch 不可 — CLAUDE.md 規律)
- t8 は t2〜t7 全完了後 (内部 cross-ref 全体俯瞰必要)
- t9 は t2〜t7 全完了後 (assertion 対象が揃ってから)
- t10 は最後 (全体整合確認)

<!-- planned_files: t2=SPEC.md+spec/harness.md, t3=SPEC.md+spec/daemon-and-data.md, t4=SPEC.md+spec/ui-arch.md, t5=SPEC.md+spec/retro-system.md, t6=SPEC.md+spec/install-and-test.md (全て SPEC.md 含むため sequential 必須) -->

## Tasks

### Task 1: PLAN.md master milestone entry 追加 (PM duty)

**Goal**: master roadmap に M0.X-spec-plan-multi-file-dogfood (Stage 2) を登録
**Files**: `PLAN.md` (modify)
**Spec ref**: design spec §1 (Problem statement) + §2 (Goal)
**Insertion points**: 既存 M0.X-spec-plan-multi-file (Stage 1) entry の直後
**Integrity check**: `grep -cE "^## マイルストーン M0\\.X-spec-plan-multi-file-dogfood" PLAN.md` → `1`
**Commit prefix**: `docs(plan): M0.X-spec-plan-multi-file-dogfood (Stage 2) entry`

### Task 2: spec/harness.md 新設 + master pointer 化

**Goal**: harness 関連 8 section (§3.6.5 / §3.6.6 / §3.6.7 / §3.6.8 / §3.8 / §3.10 / §4 / §5) を `spec/harness.md` へ carve、master を pointer 化
**Files**: `SPEC.md` (modify), `spec/harness.md` (create)
**Spec ref**: design spec §3.1 (harness.md 構造) + §4 (carve operation pattern)
**Insertion points (master 側 pointer)**: 各 removed section 位置に「§X.Y の詳細は `spec/harness.md` §Z 参照」を 1 行で
**Integrity check**:
- `test -f spec/harness.md` → exit 0
- `grep -c "^## " spec/harness.md` → `≥8` (8 section)
- `grep -c "^## 1\\." spec/harness.md` → `1` (§1 から開始、local renumber 確認)
- `grep -cE "spec/harness\\.md §" SPEC.md` → `≥1` (master pointer 設置確認)

**Commit prefix**: `refactor(spec): harness.md carve + master pointer 化 (m0.x-spec-plan-dogfood-t2)`
**Notes**:
- §3.6.5 Agent Customization → §1
- §3.6.6 Worktree 統合 → §2
- §3.6.7 Coexistence Mode → §3
- §3.6.8 Process Discipline → §4
- §3.8 Commit + Branch 規約 → §5
- §3.10 superpowers Independence (+ .1 .2 sub) → §6
- §4 アクター定義 → §7
- §5 ワークフロー → §8
- topic file header pattern: design spec §3.3 準拠

### Task 3: spec/daemon-and-data.md 新設 + master pointer 化

**Goal**: daemon 関連 + data model (§3.2 / §3.3 / §3.6 WS / §6) を `spec/daemon-and-data.md` へ carve、master を pointer 化
**Files**: `SPEC.md` (modify), `spec/daemon-and-data.md` (create)
**Spec ref**: design spec §3.1 (daemon-and-data.md 構造) + §4
**Integrity check**:
- `test -f spec/daemon-and-data.md` → exit 0
- `grep -c "^## " spec/daemon-and-data.md` → `≥4` (4 section)
- `grep -c "^## 1\\." spec/daemon-and-data.md` → `1`
- `grep -cE "spec/daemon-and-data\\.md §" SPEC.md` → `≥1`

**Commit prefix**: `refactor(spec): daemon-and-data.md carve + master pointer 化 (m0.x-spec-plan-dogfood-t3)`
**Notes**:
- §3.2 Lazy Daemon (+ .1 .2 .3 sub) → §1
- §3.3 中央指令室モデル → §2
- §3.6 WS message schema (main、§3.6.5〜.15 を除く) → §3
- §6 データモデル SQLite → §4

### Task 4: spec/ui-arch.md 新設 + master pointer 化

**Goal**: UI 系 7 section (§3.6.9 / §3.6.10 / §3.6.11 / §3.6.12 / §3.6.13 / §3.6.14 / §3.6.15) を `spec/ui-arch.md` へ carve、master を pointer 化
**Files**: `SPEC.md` (modify), `spec/ui-arch.md` (create)
**Spec ref**: design spec §3.1 (ui-arch.md 構造) + §4
**Integrity check**:
- `test -f spec/ui-arch.md` → exit 0
- `grep -c "^## " spec/ui-arch.md` → `≥7`
- `grep -c "^## 1\\." spec/ui-arch.md` → `1`
- `grep -cE "spec/ui-arch\\.md §" SPEC.md` → `≥1`

**Commit prefix**: `refactor(spec): ui-arch.md carve + master pointer 化 (m0.x-spec-plan-dogfood-t4)`
**Notes**:
- §3.6.9 M3 UI Architecture → §1
- §3.6.10 SSoT cross-check → §2
- §3.6.11 UI Smoke Test → §3
- §3.6.12 Design Implementation → §4
- §3.6.13 Ceremony Reduction → §5
- §3.6.14 UI Redesign Port → §6
- §3.6.15 Playwright e2e → §7

### Task 5: spec/retro-system.md 新設 + master pointer 化

**Goal**: §3.9 Retro 機能全体を `spec/retro-system.md` へ carve、master を pointer 化
**Files**: `SPEC.md` (modify), `spec/retro-system.md` (create)
**Spec ref**: design spec §3.1 (retro-system.md 構造) + §4
**Integrity check**:
- `test -f spec/retro-system.md` → exit 0
- `grep -c "^## 1\\." spec/retro-system.md` → `1`
- `wc -l spec/retro-system.md` → `≥250` (元 §3.9 が 301 行のため migration 後も同等規模)
- `grep -cE "spec/retro-system\\.md §" SPEC.md` → `≥1`

**Commit prefix**: `refactor(spec): retro-system.md carve + master pointer 化 (m0.x-spec-plan-dogfood-t5)`
**Notes**:
- §3.9 Retro 機能 → §1
- §3.9 内の各 sub-section (`#### 3.9.x`) → `### 1.x` または file 内 sub-section として local 振り直し

### Task 6: spec/install-and-test.md 新設 + master pointer 化

**Goal**: PJ lifecycle (§3.7) + 配布 (§9) + testing (§10) を `spec/install-and-test.md` へ carve、master を pointer 化
**Files**: `SPEC.md` (modify), `spec/install-and-test.md` (create)
**Spec ref**: design spec §3.1 (install-and-test.md 構造) + §4
**Integrity check**:
- `test -f spec/install-and-test.md` → exit 0
- `grep -c "^## " spec/install-and-test.md` → `≥3`
- `grep -c "^## 1\\." spec/install-and-test.md` → `1`
- `grep -cE "spec/install-and-test\\.md §" SPEC.md` → `≥1`

**Commit prefix**: `refactor(spec): install-and-test.md carve + master pointer 化 (m0.x-spec-plan-dogfood-t6)`
**Notes**:
- §3.7 プロジェクトライフサイクル → §1
- §9 配布・インストール → §2
- §10 テスト戦略 → §3

### Task 7: master SPEC.md cleanup + Topic Index 新設

**Goal**: master SPEC.md の残留 section (§1, §2, §3.1, §3.4, §3.5, §3.11, §7, §8, §11, §12, §13, §14, 変更履歴) を整列、Topic Index section (§15) 新設
**Files**: `SPEC.md` (modify)
**Spec ref**: design spec §3.1 (master 構造) + §3.2 (Topic Index 形式)
**Insertion points**: §14 関連ドキュメントの直後、変更履歴の直前に「## 15. Topic Index (multi-file mode)」section 新設
**Integrity check**:
- `grep -cE "^## 15\\. Topic Index" SPEC.md` → `1`
- `grep -c "spec/harness.md" SPEC.md` → `≥2` (pointer 散在 + Topic Index)
- `grep -c "spec/daemon-and-data.md" SPEC.md` → `≥2`
- `grep -c "spec/ui-arch.md" SPEC.md` → `≥2`
- `grep -c "spec/retro-system.md" SPEC.md` → `≥2`
- `grep -c "spec/install-and-test.md" SPEC.md` → `≥2`
- master SPEC.md size: `wc -l SPEC.md` → `≤1000` (size threshold 1000 行以内に収束確認)

**Commit prefix**: `refactor(spec): master SPEC.md cleanup + Topic Index 新設 (m0.x-spec-plan-dogfood-t7)`
**Notes**:
- Topic Index は table 形式 (design spec §3.2 SSoT)
- 旧 milestone M1/M2 詳細 (1935〜2524 行) は本 task では touch せえへん (Stage 3 scope)

### Task 8: cross-ref rewire (master + 全 topic、broken link 検出 + 修正)

**Goal**: master SPEC.md + 全 topic file 内の cross-ref を新 file path 記法に書き換え、broken link 検出 + 修正
**Files**: `SPEC.md` (modify), `spec/harness.md`, `spec/daemon-and-data.md`, `spec/ui-arch.md`, `spec/retro-system.md`, `spec/install-and-test.md` (全 modify 可能性)
**Spec ref**: design spec §4 step 4 (Internal cross-ref rewrite) + SPEC §3.11.4 (参照記法 SSoT)
**Integrity check**:
- broken link 検出: 各 file 内の `spec/<topic>.md §X.Y` 形式 ref が実在するか scan (新規 script 作成 or grep + 手動 verify)
- `grep -rE "spec/[a-z-]+\\.md" SPEC.md spec/` 出力の各 ref を file 存在 + § 存在で確認
- 旧 `§3\\.[0-9]+\\.[0-9]+` 形式の dangling ref が 0 (master 内部の自己参照のみ残る想定)
- (注) 既存 agent prompts / retro report に embedded された `SPEC §X` 古記法は **対象外** (書き換えない、design spec §5.1 SSoT)

**Commit prefix**: `refactor(spec): cross-ref rewire to new file path 記法 (m0.x-spec-plan-dogfood-t8)`
**Notes**:
- ref scan は手動 grep でも可、t9 の harness test に automated check を組み込む

### Task 9: tests/multi_file_skeleton_test.sh 拡張 (skeleton-n〜r)

**Goal**: harness test に migration verify assertion 追加
**Files**: `tests/multi_file_skeleton_test.sh` (modify)
**Spec ref**: design spec §7 (Harness test 拡張)
**Insertion points**: 既存 skeleton-a〜m の後に新 check group 追加
**Integrity check**:
- `bash tests/run_tests.sh multi_file_skeleton` → exit 0
- `grep -c "PASS \[skeleton-" output` → `≥24` (元 20 + 新 4-5)
- 新 check group:
  - skeleton-n: 5 topic file 全存在
  - skeleton-o: master SPEC.md Topic Index 存在
  - skeleton-p: 各 topic file back-pointer header 存在
  - skeleton-q: 各 topic file §1 から local 振り直し確認
  - skeleton-r: master SPEC.md の migrated section が pointer 化済み

**Commit prefix**: `test(harness): multi_file_skeleton を Stage 2 migration verify で拡張 (m0.x-spec-plan-dogfood-t9)`

### Task 10: doc consistency check 実行 + 修正 (Stage 1 で確立した 4 項目を初実走査)

**Goal**: `docs/DOC_CONSISTENCY_CHECKLIST.md` の multi-file mode 4 項目を実走査、検出された issue を修正
**Files**: 実行結果次第 (SPEC.md / spec/*.md / 用語表追加 etc.)
**Spec ref**: SPEC §3.11.5 + design spec §8 (doc consistency check 実適用)
**Integrity check**:
- 用語整合性: 各 topic file の用語 (e.g., "PM" / "developer" / "reviewer" / "session" / "subagent") が一貫
- cross-reference 健全性: `grep -rE "spec/[a-z-]+\\.md §" SPEC.md spec/` の全 ref が dead でない
- scope 重複: 同概念 (e.g., "Customization Layer") が複数 topic file で別記述になっとらん
- master index 整合性: master Topic Index と `spec/` 直下 file 一覧が完全一致

**Commit prefix**: `docs: multi-file mode doc consistency check 実走査 + 修正 (m0.x-spec-plan-dogfood-t10)`
**Notes**:
- 用語表が master SPEC.md に存在しない場合、本 task で master に「§N 用語表」section 追加 sub-task 化判断 (Stage 3 へ deferral も可)
- 検出 issue が 0 の場合は本 task は no-op commit でなく skip (commit せず)、PM が report で `consistency clean` 記録

## Self-Review

### Spec coverage

- design spec §3 (Architecture: 5 topics) → t2〜t6 で 5 topic carve
- design spec §3.2 (Topic Index) → t7
- design spec §3.3 (topic file header) → t2〜t6 各 task で適用
- design spec §4 (carve operation 5 step) → t2〜t6 で同 pattern 反復
- design spec §5 (sequential constraint) → 全 task が sequential、batch 編成で明示
- design spec §6 (SSoT 参照記法 dogfood) → t8 cross-ref rewire
- design spec §7 (Harness test 拡張) → t9
- design spec §8 (doc consistency check 実適用) → t10
- design spec §9 Risks → t2〜t6 各 task の Notes + t8 で broken link 検出 step

### Placeholder scan

- 全 task 内に `TBD` / `TODO` / `後で` なし
- design spec §10 Open questions (用語表 / size threshold / 新記法移行) は retro 検証項目、本 milestone scope 外

### Type / 名前 一貫性

- topic file 名: `spec/harness.md` / `spec/daemon-and-data.md` / `spec/ui-arch.md` / `spec/retro-system.md` / `spec/install-and-test.md` (全 task で統一)
- task ID 形式: `m0.x-spec-plan-dogfood-tN` (旧 Stage 1 の `m0.x-spec-plan-tN` と区別、`-dogfood-` suffix で識別)
- commit prefix: `refactor(spec):` (carve task) / `docs(plan):` (PM duty) / `test(harness):` (test) / `docs:` (consistency)

## Risks

- **t2〜t6 sequential constraint**: 各 task 間で `SPEC.md` の状態が変化するため、dev は branch 最新を確認してから work 開始必須。前 task の commit から作業開始までの間に他 commit が入った場合は要 rebase
- **§ renumber 時の internal anchor 漏れ**: design spec §9.1 で詳述、各 carve task で grep `§[0-9]\\.` 全 anchor 抽出 → 整合確認を Done when に含める
- **size guideline (loom-pm.md 250 行) 影響**: 本 milestone は agent prompt size に影響なし、loom-pm.md は touch せえへん
- **dogfood validation 失敗 risk**: 新思想の practical 課題が migration 中に露呈する可能性。露呈した場合は本 milestone を pause、Stage 1 design spec へ feedback retro で対応 (Stage 1 design spec §10 Open questions 拡張)

## Out of scope (Stage 3 へ deferral)

- M1/M2 milestone 詳細 (現 SPEC.md 1935〜2524 行、約 590 行) の PLAN/docs/plans 移管
- 既存 agent prompts / retro report 内の `SPEC.md §X` 古記法書き換え (design spec §5.1 SSoT)
- 用語表 section の master SPEC.md 追加 (t10 で判断、Stage 3 deferral 可)
