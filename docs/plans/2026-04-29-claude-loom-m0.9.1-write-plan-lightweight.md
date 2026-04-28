# claude-loom M0.9.1: loom-write-plan 軽量化 Implementation Plan

> **Note**: 本 plan は **新軽量フォーマット自体** を demonstrate する dogfood version。`skills/loom-write-plan/SKILL.md` (post-refactor) と整合する書式。subagent dispatch 時は本 plan + design 議論履歴を context として渡す。

**Goal**: `skills/loom-write-plan/SKILL.md` を必須 5 フィールド軽量版にリライト、Task ごとの exact code 転記を撤去、design spec への pointer 化。

**Architecture**: 1 file (SKILL.md, ~120 行) を refactor。新書式 spec + concrete example 1 つを含める。テスト構造（必須 section "When to use" / "Output structure" / "Process"）は維持。

**Tech Stack**: Markdown only。design 議論は本 session の対話履歴がそのまま SSoT。formal design spec ファイルは作らん（M0.9 で得た「小規模 milestone は spec 不要」教訓）。

---

## File Structure

```
claude-loom/
├── PLAN.md                                            [Task 2, UPDATE: M0.9.1 milestone block]
├── skills/loom-write-plan/SKILL.md                    [Task 1, REWRITE: 軽量版]
└── tests/skills_test.sh                               [Task 4, VERIFY ONLY: section 名互換確認]
```

---

## Tasks

### Task 1: skills/loom-write-plan/SKILL.md を軽量版にリライト

**Goal**: SKILL.md 全文を refactor、軽量フォーマット仕様 + concrete example + claude-loom 規約 hook を新内容に
**Files**: `skills/loom-write-plan/SKILL.md` (rewrite)
**Spec ref**: 本 plan の「期待新書式」セクション（後述）+ 対話履歴の Q1/Q2 合意（既存凍結 + 必須 5 フィールド）
**Integrity check**: `grep -E "^## (When to use|Output structure|Process|claude-loom 規約 hook|Anti-patterns)" skills/loom-write-plan/SKILL.md | wc -l` → `5`
**Commit prefix**: `refactor(skills): loom-write-plan を軽量フォーマット版にリライト (M0.9.1)`

**Notes**:
- 既存 frontmatter (name / description) は維持、description は軽量化を明記する形に微調整
- `When to use` 内容更新: 「~200-300 行 plan 生成」と明記
- `Output structure` セクションを新書式仕様に書き換え（必須 5 フィールド + 任意 3 フィールド）
- `Process` セクションは graphviz 図 + step list（簡潔化、現行 7 step → 5 step に圧縮可）
- `claude-loom 規約 hook` 更新: 「exact code は plan に書かん、design spec へ pointer」を明記
- `Anti-patterns` 更新: 「Task に exact code 転記」「Task ごとに HEREDOC commit msg 全文」を新たに anti-pattern 追加

### Task 2: PLAN.md M0.9.1 milestone insertion ✅

**Goal**: M0.9.1 milestone block を M0.9 の直後、M1 の直前に挿入（5 tasks + 完成基準）
**Files**: `PLAN.md` (modify)
**Spec ref**: 本 plan の Tasks 全体
**Integrity check**: `grep -c "id: m0\.9\.1-t" PLAN.md` → `5`
**Commit prefix**: `docs(plan): add M0.9.1 milestone (loom-write-plan lightweight)`

**注**: 本 task は本 plan 作成と同時に PM が実施済み。subagent dispatch 不要、commit のみ別 task として残す。

### Task 3: 軽量 plan サンプルを SKILL.md 内に追記

**Goal**: SKILL.md `Output structure` セクション内に concrete Task example を含めて、subagent / 後続 PM が即参考にできる形に
**Files**: `skills/loom-write-plan/SKILL.md` (Task 1 と同 commit でカバー可、または独立 commit)
**Spec ref**: 本 plan の「Tasks 1〜5 の書式」自体が見本になる
**Integrity check**: `grep -E "^### Task" skills/loom-write-plan/SKILL.md` で 1 個以上 hit
**Commit prefix**: Task 1 commit に統合可（独立 commit にする場合は `docs(skills): loom-write-plan に concrete example 追記`）

**注**: Task 1 / 3 は同一ファイル編集なので **1 commit に統合推奨**。

### Task 4: skills_test.sh の section assertion 整合確認

**Goal**: skills_test の `check_skill_sections "loom-write-plan" "When to use" "Output structure" "Process"` が変更後も PASS することを確認
**Files**: `tests/skills_test.sh` (verify only, modify only if needed)
**Spec ref**: 既存 skills_test 構造（M0.9 Task 21 で追加済）
**Integrity check**: `./tests/run_tests.sh skills` → `skills_test passed`
**Commit prefix**: なし（変更不要なら commit なし）

**注**: section 名（"When to use" / "Output structure" / "Process"）を維持する制約を Task 1 で守れば test 変更不要。

### Task 5: 全 test PASS + tag m0.9.1-complete + main merge

**Goal**: 全 test 8 PASS 維持、PLAN.md 5 task done マーク、tag 設置、main へ merge
**Files**: `PLAN.md` (status: todo → done), git tag, git checkout main + merge
**Spec ref**: M0.9 Tasks 27-28 と同一手順（sed -E で status 更新、tag --no-ff merge）
**Integrity check**:
- `./tests/run_tests.sh` → `Passed: 8   Failed: 0   Skipped: 0`
- `git tag -l --sort=-creatordate | head -2` → `m0.9.1-complete\nm0.9-complete`
- `git log --oneline main | head -1` → merge commit on main
**Commit prefix**: `docs(plan): mark M0.9.1 tasks done (5/5)` + tag annotation + merge commit

---

## 期待新書式（Task 1 内で SKILL.md に反映する仕様）

### 必須 5 フィールド per Task

```markdown
### Task N: <name>

**Goal**: 1 文で達成目標
**Files**: create/modify/test の touch list
**Spec ref**: 内容導出元の design spec / SPEC section pointer
**Integrity check**: 1 行 grep/jq/wc command + 期待値
**Commit prefix**: Conventional Commits prefix + subject
```

### 任意フィールド（必要時のみ）

- **Insertion points**: doc 編集の挿入 anchor
- **TDD**: red→green 経路（`red: <test path> → green: <criteria>`）
- **Notes**: 落とし穴、edge case、独立 commit にしない判断 etc.

### Plan-level 構造

| section | 必須/任意 | 役割 |
|---|---|---|
| Header (Goal/Architecture/Tech Stack) | 必須 | milestone 全体把握 |
| File Structure | 必須 | touch ファイル overview |
| Batch 編成 | 任意 | 並列化 hint（sequential のみなら省略可） |
| Tasks 1-N | 必須 | 軽量 Task list |
| Self-Review | 必須 | spec coverage / placeholder / type consistency 3 軸 |
| Risks | 任意 | 非自明な時のみ |

### サイズ目標

- 28-task 大型 milestone: ~200-300 行
- 4-task 小型 milestone: ~50-80 行
- 本 plan（5 tasks）: ~80 行（自分で実証）

---

## Self-Review

**Spec coverage**:
- ✅ 必須 5 フィールドの仕様 → Task 1 で SKILL.md に明記
- ✅ 既存 plan 凍結 policy → Task 1 で SKILL.md `claude-loom 規約 hook` に明記
- ✅ M0.9.1 milestone block → Task 2
- ✅ concrete example → Task 1 / 3 に統合
- ✅ test 互換性 → Task 4 で確認
- ✅ 完成基準達成 → Task 5

**Placeholder scan**: TBD / TODO / fill in detail なし、各 Task に exact action 記述

**Type consistency**: 「軽量フォーマット / lightweight format / 必須 5 フィールド」用語を全 task で一貫使用

**Risk**: 軽量化で subagent が context 不足になる懸念 → 対策：subagent dispatch 時は **plan + design spec / SPEC へのポインタ + 本 session の対話履歴 sample** を提供する形に運用調整、これは PM の責務として残る

---

## Execution Handoff

Tasks 1-3 は loom-developer 1 体で sequential 実施可能（同一ファイル + PLAN 編集）。Task 4-5 は PM (controller) が直接実施。
