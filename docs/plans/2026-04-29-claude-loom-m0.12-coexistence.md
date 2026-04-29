# claude-loom M0.12: Coexistence Mode Implementation Plan

> 軽量フォーマット (M0.9.1 確立)。design SSoT は本セッション対話履歴の合意：3 mode (full/coexist/custom) + 検出 ii + trigger β+γ + storage project.json + 粒度 iii (5 feature group)。

**Goal**: 既存 PJ に他 plugin / user 自身のルールが入っとる時の coexistence を解決。`full / coexist / custom` 3 mode を導入し、dispatcher 3 体（PM / dev / retro-pm）に runtime gate を入れて feature group 単位 (core / retro / customization / worktree / native-skills) で機能 ON/OFF 可能化。

**Architecture**: install.sh は不変（全 loom-* は常時 install）、mode 制御は **runtime gate** で実現。receiver agent (reviewer / retro lens) は mode 不要 — dispatch されへん限り走らんため自動 gate 完結。schema は project.json の `rules.coexistence_mode` + `rules.enabled_features` 2 field。

**Tech Stack**: bash, jq, Markdown。新コード生成なし、agent prompt 編集 + project.json schema 拡張で完結。

---

## File Structure

```
claude-loom/
├── PLAN.md                                            [Task 1, modify]
├── SPEC.md                                            [Task 3, modify §3.6.7 新設 + §3.7 + §6.9 拡張]
├── README.md                                          [Task 12, modify]
├── docs/DOC_CONSISTENCY_CHECKLIST.md                  [Task 4, modify]
├── agents/loom-pm.md                                  [Task 7, modify: lifecycle + 選択 prompt + gate]
├── agents/loom-developer.md                           [Task 8, modify: gate]
├── agents/loom-retro-pm.md                            [Task 9, modify: gate]
├── commands/loom-mode.md                              [Task 6, NEW]
├── templates/claude-loom/project.json.template        [Task 5, modify]
├── tests/REQUIREMENTS.md                              [Task 2, modify: REQ-026]
├── tests/prefs_test.sh                                [Task 10, modify]
├── tests/agents_test.sh                               [Task 11, modify]
└── tests/commands_test.sh                             [Task 11, modify]
```

---

## Tasks

### Task 1: PLAN.md M0.12 milestone insertion ✅

**Goal**: M0.12 milestone block 挿入（13 tasks + 完成基準）
**Files**: `PLAN.md` (modify)
**Spec ref**: 本 plan 全体
**Integrity check**: `grep -c "id: m0\.12-t" PLAN.md` → `13`
**Commit prefix**: `docs(plan): add M0.12 milestone (Coexistence Mode)`

**Notes**: PM 実施済、commit のみ。

### Task 2: tests/REQUIREMENTS.md REQ-026 追加

**Goal**: M0.12 受入要件を REQ-026 として明文化
**Files**: `tests/REQUIREMENTS.md` (modify)
**Spec ref**: M0.12 完成基準（PLAN.md）
**Insertion points**: M0.11 セクションの後、`## M1 以降は別 PR で追記` の前
**Integrity check**: `grep -c "REQ-026" tests/REQUIREMENTS.md` → `1`
**Commit prefix**: `docs(tests): add REQ-026 for M0.12 Coexistence Mode`

### Task 3: SPEC.md §3.6.7 / §3.7 / §6.9 拡張

**Goal**: SPEC に Coexistence Mode policy + lifecycle 拡張 + schema 拡張を明記
**Files**: `SPEC.md` (modify)
**Spec ref**: 本 plan の design 合意
**Insertion points**:
- §3.6.7 新設（§3.6.6 Worktree の後、§3.7 install の前）: Coexistence Mode 章
- §3.7 拡張: lifecycle に「mode 検出と選択」step 追加
- §6.9 schema 拡張: `rules.coexistence_mode` enum + `rules.enabled_features` array
**Integrity check**: `grep -cE "^### 3\.6\.7 |coexistence_mode|enabled_features" SPEC.md` ≥ `5`
**Commit prefix**: `docs(m0.12): SPEC §3.6.7 / §3.7 / §6.9 — Coexistence Mode policy + schema`

**Notes**:
- §3.6.7 内容: 3 mode 説明 (full / coexist / custom) + 5 feature group 説明 (core / retro / customization / worktree / native-skills) + runtime gate 機構
- §3.7 lifecycle 拡張: 既存 init/adopt/maintain の adopt mode 内で「detection ii による mode 選択 prompt」追記
- §6.9 schema: `rules.coexistence_mode: "full|coexist|custom"` (default "full") + `rules.enabled_features: array<string>` (default `["all"]`)

### Task 4: docs/DOC_CONSISTENCY_CHECKLIST.md M0.12 check items

**Goal**: SPEC §3.6.7 / project.json template / 3 dispatcher agent の整合性 check items 追加
**Files**: `docs/DOC_CONSISTENCY_CHECKLIST.md` (modify)
**Spec ref**: M0.9 / M0.10 / M0.11 の DOC_CONSISTENCY 拡張パターン踏襲
**Insertion points**: 末尾に M0.12 セクション
**Integrity check**: `grep -c "M0.12 Coexistence" docs/DOC_CONSISTENCY_CHECKLIST.md` → `1`
**Commit prefix**: `docs(consistency): add M0.12 Coexistence Mode check items`

### Task 5: templates/claude-loom/project.json.template に coexistence schema 追加

**Goal**: 既存 `rules` object に `coexistence_mode` + `enabled_features` 追加、jq empty で valid 維持
**Files**: `templates/claude-loom/project.json.template` (modify)
**Spec ref**: SPEC §6.9（Task 3）
**Insertion points**: 既存 `rules.review_mode` の隣
**Integrity check**:
- `jq empty templates/claude-loom/project.json.template` 成功
- `jq -e '.rules.coexistence_mode' templates/claude-loom/project.json.template` が `"full"` 等の string
- `jq -e '.rules.enabled_features | type == "array"' templates/claude-loom/project.json.template` → `true`
**Commit prefix**: `feat(templates): project.json gains coexistence_mode + enabled_features (M0.12)`

**Notes**:
- default 値: `coexistence_mode: "full"`、`enabled_features: ["all"]`（shorthand）
- `_comment` で「mode 説明 + feature group 名一覧」を含めると user 親切

### Task 6: commands/loom-mode.md 新設

**Goal**: 後から mode 切替する slash command（thin wrapper、loom-pm に詳細 logic 委譲）
**Files**: `commands/loom-mode.md` (NEW)
**Spec ref**: 既存 `commands/loom-{retro,worktree}.md` の構造を参考（thin wrapper pattern）
**Integrity check**: `head -1 commands/loom-mode.md` が `---`（frontmatter）+ `grep -c "coexistence_mode\|loom-mode" commands/loom-mode.md` ≥ `2`
**Commit prefix**: `feat(commands): add /loom-mode slash command (M0.12)`

**Notes**:
- frontmatter description: 「Switch claude-loom coexistence mode (full / coexist / custom)」
- 本文: 3 mode の簡潔説明 + 「PM が project.json を編集して mode 反映」の流れ + features 例
- ~30 行目安

### Task 7: agents/loom-pm.md lifecycle 拡張 + mode 選択 + runtime gate

**Goal**: PM agent prompt に M0.12 機能を追加。(a) lifecycle detection で他 plugin / 既存 setup を検出（detection ii）、(b) mode 未設定時に user に選択 prompt、(c) workflow 中に mode を check して runtime gate
**Files**: `agents/loom-pm.md` (modify)
**Spec ref**: SPEC §3.6.7 / §3.7（Task 3）+ 本 plan の runtime gate 仕様
**Insertion points**:
- 既存 lifecycle (init/adopt/maintain) section 内に「mode 選択」step 追記
- 既存 milestone hook / dispatch logic の中に runtime gate 追記
**Integrity check**: `grep -cE "coexistence_mode|enabled_features|loom-mode" agents/loom-pm.md` ≥ `4`
**Commit prefix**: `feat(agents): loom-pm gains lifecycle mode detection + runtime gate (M0.12)`

**Notes**:
- lifecycle 拡張: 既存 detect 後に「他 plugin (~/.claude/plugins/) / 既存 agents/skills/commands」検出、mode 未設定なら user に提案
- runtime gate (PM の責務範囲):
  - retro hook: `enabled_features` に "retro" あれば milestone hook 起動、無ければ skip
  - worktree autonomous decision: "worktree" あれば skill 参照、無ければ skip
  - subagent dispatch 時の `[loom-customization]` injection: "customization" あれば inject、無ければ skip
  - native-skills 推薦: "native-skills" あれば loom-write-plan / loom-debug 推薦、無ければ skip
- `enabled_features` の `"all"` shorthand は全機能 ON 扱い

### Task 8: agents/loom-developer.md runtime gate

**Goal**: developer agent も dispatcher として subagent dispatch するため、PM と同じ pattern で runtime gate
**Files**: `agents/loom-developer.md` (modify)
**Spec ref**: 同上
**Insertion points**: 既存 reviewer dispatch logic / Customization Layer 周辺
**Integrity check**: `grep -cE "coexistence_mode|enabled_features" agents/loom-developer.md` ≥ `2`
**Commit prefix**: `feat(agents): loom-developer gains runtime gate for native-skills/worktree/customization (M0.12)`

**Notes**:
- gate 対象:
  - reviewer dispatch 時の Customization Layer injection ("customization" 有無)
  - autonomous worktree decision ("worktree" 有無)
  - loom-write-plan / loom-debug 自発 invoke ("native-skills" 有無)

### Task 9: agents/loom-retro-pm.md runtime gate

**Goal**: retro 全体を gate、"retro" disabled なら早期 return、"customization" ぶら下がりとして learned_guidance write も連動 gate
**Files**: `agents/loom-retro-pm.md` (modify)
**Spec ref**: 同上
**Insertion points**: agent prompt 冒頭、retro flow 開始 logic の前
**Integrity check**: `grep -cE "coexistence_mode|enabled_features" agents/loom-retro-pm.md` ≥ `2`
**Commit prefix**: `feat(agents): loom-retro-pm gains retro/learned_guidance gate (M0.12)`

**Notes**:
- gate logic: session 開始時に project.json read → "retro" 不在なら user に「retro disabled by mode、起動しますか？」と確認 + skip default
- learned_guidance write は aggregator が担うが、retro-pm が gate するので連動 disable される
- "customization" 単独 disable で retro は走るが learned_guidance だけ skip も対応（aggregator に伝える形）

### Task 10: tests/prefs_test.sh 拡張

**Goal**: project.json template の coexistence_mode + enabled_features schema 検証 assertion 追加
**Files**: `tests/prefs_test.sh` (modify)
**Spec ref**: SPEC §6.9（Task 3）+ Task 5 で追加した template
**Integrity check**:
- `./tests/prefs_test.sh` 単独 run で PASS
- `./tests/run_tests.sh` で 8 PASS 維持
**Commit prefix**: `test(prefs): assert project.json coexistence_mode + enabled_features schema (M0.12)`

**Notes**:
- 検証内容: `jq -e '.rules.coexistence_mode' templates/claude-loom/project.json.template` が valid string、`jq -e '.rules.enabled_features | type == "array"'` が true、enum value が `"full|coexist|custom"` のいずれか

### Task 11: tests/agents_test.sh + commands_test.sh 拡張

**Goal**: 3 dispatcher agent (PM / dev / retro-pm) prompt が `coexistence_mode` を参照すること + `commands/loom-mode.md` が valid frontmatter であることを assert
**Files**: `tests/agents_test.sh`, `tests/commands_test.sh` (2 file modify)
**Spec ref**: REQ-026
**TDD**: Tasks 6-9 完了で green、Task 10-11 でも green、本 task は green 確認 commit
**Integrity check**:
- agents_test: PM / dev / retro-pm に `coexistence_mode` 参照 PASS
- commands_test: loom-mode.md が valid frontmatter PASS
- 全体 8 PASS 維持
**Commit prefix**: `test: extend agents/commands tests for M0.12 coexistence mode references`

### Task 12: README.md に user-facing 入門追加

**Goal**: M0.12 の coexistence mode 概念を short intro として README に
**Files**: `README.md` (modify)
**Spec ref**: M0.10 / M0.11 README intro 入門パターン踏襲
**Insertion points**: 既存 `## Retro feedback loop (M0.11 から)` の後 or 末尾近く
**Integrity check**: `grep -c "Coexistence Mode\|coexistence_mode\|coexist" README.md` ≥ `1`
**Commit prefix**: `docs(readme): add Coexistence Mode intro (M0.12)`

**Notes**:
- 内容: 3 mode 表 + 5 feature group 表 + `/loom-mode` 切替方法 + project.json 設定例
- ~30 行目安

### Task 13: 全 test PASS + tag m0.12-complete + main merge

**Goal**: 全 test 維持、PLAN.md 13 task done、tag 設置、main merge
**Files**: `PLAN.md` (status: todo → done), git tag, git merge
**Spec ref**: M0.10 / M0.11 Task 13 と同手順
**Integrity check**:
- `./tests/run_tests.sh` → `Passed: 8   Failed: 0   Skipped: 0`
- `git tag -l --sort=-creatordate | head -2` → `m0.12-complete\nm0.11-complete`
- main HEAD が merge commit
**Commit prefix**: `docs(plan): mark M0.12 tasks done (13/13)` + tag annotation + merge commit

---

## Self-Review

**Spec coverage**:
- ✅ schema 拡張 → Tasks 3, 5
- ✅ Detection + selection prompt → Task 7
- ✅ /loom-mode command → Task 6
- ✅ Runtime gate (3 dispatcher) → Tasks 7, 8, 9
- ✅ Tests → Tasks 10, 11
- ✅ Doc → Tasks 3, 4, 12
- ✅ Tag + merge → Task 13

**Placeholder scan**: TBD/TODO なし、各 Task に exact action

**Type consistency**:
- `coexistence_mode` enum string `"full|coexist|custom"` を全 task で一貫
- 5 feature group 名 (`core / retro / customization / worktree / native-skills`) を全 task で同一
- `enabled_features` array 表記を全 task で同一

**Risk**:
- runtime gate の dispatcher 漏れ → receiver agent は dispatcher 経由でしか走らんから OK、独立 invoke される skill (loom-retro 等) は slash command level で gate
- `"all"` shorthand vs explicit list の同等性 → Task 5 の template comment + SPEC §6.9 で明記
- 既存 PJ が project.json 持ってない場合 → Task 7 の lifecycle 検出で adopt mode に分岐、必要なら template 適用 prompt
- 既存 `rules.review_mode` との共存 → 同 object 内 field、両方 default 値で valid JSON 維持

---

## Execution Handoff

Task 1 PM 実施済（commit のみ）。Tasks 2-12 は loom-developer 1-2 体で sequential or 2 batch。Task 13 PM 直接実施。
