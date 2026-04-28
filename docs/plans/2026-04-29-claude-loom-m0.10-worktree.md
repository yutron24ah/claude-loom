# claude-loom M0.10: git worktree 統合 Implementation Plan

> 軽量フォーマット (M0.9.1 確立)。design spec は本セッション対話履歴の合意（A=opt-in flag、δ=configurable default α sibling、autonomous decision via skill）が SSoT。

**Goal**: worktree 機能を claude-loom に統合、5 用途（並列 dev / 安全実験 / branch 比較 / hotfix 隔離 / 一時 review）を `loom-worktree` skill に集約、PM / developer / retro-pm が skill の Decision tree を参照して **自律発動**できる harness にする。

**Architecture**: 1 skill (主役) + 1 slash command (明示 invoke) + project-prefs schema 拡張（worktree base_path 設定） + 3 agent prompt 更新（自律参照記述）。default 動作不変（既存 PJ に impact なし）。

**Tech Stack**: bash, git worktree, Markdown。新コード生成なし（git CLI に乗っかる）、skill が discipline + safe pattern 集を提供。

---

## File Structure

```
claude-loom/
├── PLAN.md                                            [Task 1, modify]
├── SPEC.md                                            [Task 7, modify: §3.x worktree 章]
├── README.md                                          [Task 7, modify: worktree 入門]
├── docs/DOC_CONSISTENCY_CHECKLIST.md                  [Task 7, modify: M0.10 check items]
├── skills/loom-worktree/SKILL.md                      [Task 2, NEW]
├── commands/loom-worktree.md                          [Task 3, NEW]
├── templates/project-prefs.json.template              [Task 4, modify: worktree section]
├── agents/loom-pm.md                                  [Task 5, modify: 自律参照]
├── agents/loom-developer.md                           [Task 5, modify: 自律参照]
├── agents/loom-retro-pm.md                            [Task 5, modify: 自律参照]
└── tests/skills_test.sh                               [Task 6, modify: loom-worktree section 検証]
```

---

## Tasks

### Task 1: PLAN.md M0.10 milestone insertion ✅

**Goal**: M0.10 milestone block を M0.9.1 の直後に挿入（8 tasks + 完成基準）
**Files**: `PLAN.md` (modify)
**Spec ref**: 本 plan 全体
**Integrity check**: `grep -c "id: m0\.10-t" PLAN.md` → `8`
**Commit prefix**: `docs(plan): add M0.10 milestone (git worktree 統合)`

**Notes**: PM が本 plan 作成と同時に実施済、commit のみ別 task として残す。

### Task 2: skills/loom-worktree/SKILL.md 新設

**Goal**: worktree skill を新設、5 用途 + Decision tree + Commands + Path convention + Safety rules + Anti-patterns の 6 section、agent が自律判断できる decision criteria 込み
**Files**: `skills/loom-worktree/SKILL.md` (NEW), `mkdir -p skills/loom-worktree/`
**Spec ref**: 本 plan の design 議論（autonomous mode / 5 用途 / α default）+ M0.9 で確立した skill 構造（loom-write-plan / loom-debug 参照）
**Insertion points**: なし（新規ファイル）
**Integrity check**: `grep -E "^## (When to use|Decision tree|Commands|Path convention|Safety rules|Anti-patterns)" skills/loom-worktree/SKILL.md | wc -l` → `6`
**Commit prefix**: `feat(skills): add loom-worktree (M0.10、5 用途 + autonomous decision tree)`

**Notes**:
- frontmatter: `name: loom-worktree`、description は「worktree 5 用途 + autonomous decision」を明記
- Decision tree section が **agent 自律判断の核**：「並列 batch 異 branch / hotfix 緊急 / historical 比較 / 実験捨て可 / 単純 task = NO」のフローチャート
- Commands は `git worktree add/list/remove/lock/unlock/prune` の **safe wrapper パターン**（detached HEAD 警告、commit 漏れ check 等）
- Path convention: default `<parent>/<repo>-{branch-slug}/`、`project-prefs.worktree.base_path` で上書き可、`{branch}` placeholder 対応
- Safety rules: max_concurrent 上限（暴走防止）、cleanup discipline、nested worktree 禁止
- Anti-patterns: nested worktree / commit 漏れ放置 / tag 跨ぎ worktree / `prune` 無しで放置

### Task 3: commands/loom-worktree.md 新設

**Goal**: 明示 invoke 用の slash command、サブコマンド形式（`/loom-worktree <create|list|remove|prune> <args>`）で skill の Commands section に委譲
**Files**: `commands/loom-worktree.md` (NEW)
**Spec ref**: M0.8 で実装済の `commands/loom-retro.md` を参考（slash command 構造）
**Integrity check**: `head -1 commands/loom-worktree.md` が `---` 開始（frontmatter 形式）+ `grep -c "loom-worktree" commands/loom-worktree.md` ≥ `2`
**Commit prefix**: `feat(commands): add /loom-worktree slash command (M0.10)`

**Notes**: 既存 commands/loom-retro.md の構造を模倣、本体ロジックは loom-worktree skill に委譲する thin wrapper

### Task 4: project-prefs.json.template に worktree section 追加

**Goal**: `worktree.{base_path, auto_cleanup, max_concurrent}` schema を template に追加、skill / agent が読み取れる形に
**Files**: `templates/project-prefs.json.template` (modify)
**Spec ref**: 本 plan の design 議論（δ default + 設定可）
**Insertion points**: 既存 `last_retro` / `agents` セクションと同 object 内、末尾に追加
**Integrity check**: `jq -e '.worktree | type == "object"' templates/project-prefs.json.template` が `true`、`jq empty templates/project-prefs.json.template` が成功
**Commit prefix**: `feat(templates): project-prefs gains worktree section (M0.10)`

**Notes**:
- `base_path`: default `"<parent>/<repo>-{branch}"` placeholder 形式
- `auto_cleanup`: default `false`（v1 では手動）
- `max_concurrent`: default `5`（自律発動の暴走防止）

### Task 5: 3 agents に loom-worktree 自律参照追記

**Goal**: `agents/loom-pm.md` / `agents/loom-developer.md` / `agents/loom-retro-pm.md` に「`loom-worktree` skill の Decision tree を参照して、5 用途のいずれかに該当する場面では自律的に skill を invoke せよ」と明記
**Files**: 3 file modify（独立、内容類似）
**Spec ref**: 本 plan の「自律発動の運用境界」セクション
**Insertion points**: 各 agent の `Customization Layer` section 直後、または主要 workflow section 直前
**TDD**: `red: tests/agents_test.sh が loom-worktree 参照を assert すれば red、3 agent 編集後 green` （Task 6 で test 追加するから順序: t6 red → t5 green）
**Integrity check**: 3 file それぞれで `grep -c "loom-worktree" agents/loom-{pm,developer,retro-pm}.md` ≥ `1`
**Commit prefix**: `feat(agents): loom-pm/developer/retro-pm reference loom-worktree skill for autonomous worktree decisions (M0.10)`

**Notes**:
- 共通骨格テキスト 1 つを 3 file に挿入（Task 17 / 19 と同じ pattern）
- 「Decision tree の 5 用途のいずれかに該当 → skill 参照 → user 確認後 invoke」の運用を明記
- developer は単一 task では発動しない、historical state 比較等の特殊状況のみ
- retro-pm は archived state 観察用（M0.8 retro 拡張余地として記述）

### Task 6: tests/skills_test.sh に loom-worktree section 検証追加

**Goal**: skills_test に `check_skill_sections "loom-worktree" ...` 行を追加、必須 6 section（When to use / Decision tree / Commands / Path convention / Safety rules / Anti-patterns）を assert + 3 agent の loom-worktree 参照 assert（agents_test 拡張ではなく skills_test 内で完結可能、agents_test ですでに `Customization Layer` 検査がある延長線として agents_test に追加もアリ）
**Files**: `tests/skills_test.sh` (modify), 任意で `tests/agents_test.sh` も
**Spec ref**: M0.9 Task 21 で追加した `check_skill_sections` パターン
**TDD**: `red: Task 2 完了前は section 不在で FAIL → Task 2 で skill 作成して green`、`agent 参照 assert は Task 5 完了で green`
**Integrity check**: `./tests/run_tests.sh skills` が PASS、`./tests/run_tests.sh agents` も PASS（agents 側に追加した場合）
**Commit prefix**: `test(skills): assert loom-worktree section structure (M0.10, REQ-024)`

**Notes**: REQ-024 として `tests/REQUIREMENTS.md` にも追記、Task 7 で SPEC 更新と同 commit にまとめてもよい

### Task 7: SPEC / README / DOC_CONSISTENCY / REQUIREMENTS 更新

**Goal**: SPEC §3.x に worktree 機能章追加、README に user-facing 入門追加、DOC_CONSISTENCY に M0.10 check items 追加、REQUIREMENTS に REQ-024 追加
**Files**: `SPEC.md`, `README.md`, `docs/DOC_CONSISTENCY_CHECKLIST.md`, `tests/REQUIREMENTS.md` (4 file modify)
**Spec ref**: M0.9 Task 22-25 と同パターン（doc 整備 batch）
**Insertion points**:
- SPEC: §3.6.5 Customization Layer の後 / §3.7 install の前 (or 適切な §3.x sub-section)
- README: `## Skills` または `## Customization Layer` の後
- DOC_CONSISTENCY: 末尾に M0.10 セクション
- REQUIREMENTS: M0.9 REQ-023 の後に M0.10 セクション
**Integrity check**: `grep -c "REQ-024" tests/REQUIREMENTS.md` → `1`、`grep "loom-worktree" SPEC.md` ≥ `1`、`grep "worktree" README.md` ≥ `1`
**Commit prefix**: `docs(m0.10): SPEC + README + DOC_CONSISTENCY + REQUIREMENTS for worktree (M0.10)`

**Notes**: 4 file まとめて 1 commit、本 task の中核は SPEC §3.x 章新設、他は連動更新

### Task 8: 全 test PASS + tag m0.10-complete + main merge

**Goal**: 全 test 8 PASS 維持、PLAN.md 8 task done マーク、tag 設置、main へ merge
**Files**: `PLAN.md` (status: todo → done), git tag, git merge
**Spec ref**: M0.9 Task 28 / M0.9.1 Task 5 と同手順
**Integrity check**:
- `./tests/run_tests.sh` → `Passed: 8   Failed: 0   Skipped: 0`
- `git tag -l --sort=-creatordate | head -2` → `m0.10-complete\nm0.9.1-complete`
- main HEAD が merge commit
**Commit prefix**: `docs(plan): mark M0.10 tasks done (8/8)` + tag annotation + merge commit on main

---

## Self-Review

**Spec coverage**:
- ✅ skill (main artifact) → Task 2
- ✅ slash command → Task 3
- ✅ schema 拡張 → Task 4
- ✅ agent autonomy → Task 5
- ✅ test → Task 6
- ✅ doc consistency → Task 7
- ✅ tag + merge → Task 8

**Placeholder scan**: TBD/TODO なし、各 Task に exact action 記述

**Type consistency**: 「`loom-worktree`」「Decision tree」「base_path」用語を全 task で一貫使用

**Risk**:
- 自律発動の暴走 → Task 4 で `max_concurrent` 上限導入、Task 2 の Safety rules で「不確実なら user に聞け」明記
- 既存 PJ への impact → opt-in design（A）と default 同 tree 動作維持で吸収、既存挙動変えない
- worktree path 衝突 → branch slug をユニーク source に、`project-prefs` で base_path カスタム可

---

## Execution Handoff

Task 1 は PM 実施済（commit のみ）。Tasks 2-3、4 は loom-developer 1 体で sequential、Tasks 5-7 も連続編集可、Task 8 は PM (controller) 直接実施。
