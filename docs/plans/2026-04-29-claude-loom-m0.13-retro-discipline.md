# claude-loom M0.13: Retro Discipline & Process Hardening Implementation Plan

> 軽量フォーマット (M0.9.1 確立)。design SSoT は retro 2026-04-29-001 の findings + user 由来 retro 基本方針 3 項目。本 plan は retro outcome の SSoT 化 milestone。

**Goal**: Retro architecture を「**自己改善 + PJ 改善 + user 参加 + action plan 化**」の SSoT に upgrade、4 lens に freeform improvement instruction を追加（generic 禁止）。並行で PM/dev workflow に discipline 注入：parallel dispatch self-verify / TDD red 順序 enforcement / Task tool fallback degraded mode / spec flow 圧縮 / doc 並列化 / reviewer verdict 保存。

**Architecture**: 既存 retro architecture (M0.8) と Customization Layer (M0.9) を保持しつつ、prompt level での discipline 注入で実現。新 agent / 新 skill 不要、既存 file 編集中心。

**Tech Stack**: bash, Markdown。新コード生成なし、agent prompt + RETRO_GUIDE + SPEC 編集で完結。

---

## File Structure

```
claude-loom/
├── PLAN.md                                            [Task 1, modify]
├── SPEC.md                                            [Task 3, modify §3.9 + §3.6.x]
├── README.md                                          [Task 13, modify]
├── docs/
│   ├── RETRO_GUIDE.md                                 [Task 4, modify: 基本方針 + freeform + action plan]
│   ├── DOC_CONSISTENCY_CHECKLIST.md                   [Task 5, modify: M0.13 items]
│   └── retro/2026-04-29-001-report.md                 [Task 14 内, ADD: archive commit]
├── agents/
│   ├── loom-retro-pm.md                               [Task 6, modify: 基本方針 + user lens + verdict hook]
│   ├── loom-retro-pj-judge.md                         [Task 7, modify: freeform instruction]
│   ├── loom-retro-process-judge.md                    [Task 7, modify: freeform instruction]
│   ├── loom-retro-meta-judge.md                       [Task 7, modify: freeform instruction]
│   ├── loom-retro-researcher.md                       [Task 7, modify: freeform instruction]
│   ├── loom-retro-counter-arguer.md                   [Task 8, modify: freeform 検証強化]
│   ├── loom-retro-aggregator.md                       [Task 9, modify: action plan section 必須]
│   ├── loom-pm.md                                     [Task 10, modify: workflow discipline 5 項目]
│   └── loom-developer.md                              [Task 11, modify: TDD red 順序 enforcement]
├── tests/
│   ├── REQUIREMENTS.md                                [Task 2, modify: REQ-027]
│   ├── retro_test.sh                                  [Task 12, modify: freeform + 基本方針 assertion]
│   └── agents_test.sh                                 [Task 12, modify: parallel verify + TDD 順序 + Task tool fallback assertion]
└── (post-merge manual step)
    ├── ~/.claude-loom/user-prefs.json                 [Task 15: learned_guidance write]
    └── <repo>/.claude-loom/project-prefs.json         [Task 15: learned_guidance write]
```

---

## Tasks

### Task 1: PLAN.md M0.13 milestone insertion ✅

**Goal**: M0.13 milestone block 挿入（15 tasks + 完成基準）
**Files**: `PLAN.md` (modify)
**Spec ref**: 本 plan
**Integrity check**: `grep -c "id: m0\.13-t" PLAN.md` → `15`
**Commit prefix**: `docs(plan): add M0.13 milestone (Retro Discipline & Process Hardening)`

**Notes**: PM 実施済、commit のみ。

### Task 2: tests/REQUIREMENTS.md REQ-027 追加

**Goal**: M0.13 受入要件
**Files**: `tests/REQUIREMENTS.md` (modify)
**Spec ref**: 本 plan
**Insertion points**: M0.12 セクションの後
**Integrity check**: `grep -c "REQ-027" tests/REQUIREMENTS.md` → `1`
**Commit prefix**: `docs(tests): add REQ-027 for M0.13 Retro Discipline & Process Hardening`

### Task 3: SPEC.md §3.9 + §3.6.x 拡張

**Goal**: SPEC §3.9 (retro) に基本方針 P1/P2/P3 明記、§3.6.x (process discipline) を新設して PM/dev workflow discipline 5 項目を SSoT 化
**Files**: `SPEC.md` (modify)
**Spec ref**: retro 基本方針（user 由来 P1/P2/P3）+ findings proc-001/002/004/A/C
**Insertion points**:
- §3.9 既存 retro 章末尾 or 適切な sub-section に基本方針 3 追記
- §3.6.x 新設 (§3.6.7 Coexistence Mode の後、§3.7 install の前): "Process Discipline" 章
**Integrity check**: `grep -cE "P1|P2|P3|process-discipline|parallel.*verify|TDD.*red.*順序" SPEC.md` ≥ `5`
**Commit prefix**: `docs(m0.13): SPEC §3.9 + §3.6.x — retro 基本方針 + process discipline`

### Task 4: docs/RETRO_GUIDE.md 改訂

**Goal**: 基本方針 P1/P2/P3 明記 + freeform improvement instruction + verdict 保存 + action plan 化
**Files**: `docs/RETRO_GUIDE.md` (modify)
**Spec ref**: retro 基本方針 + meta-D
**Insertion points**: 冒頭付近に「基本方針」section 新設、既存 lens 説明の後に freeform instruction
**Integrity check**: `grep -cE "基本方針|P1|P2|P3|freeform|action plan" docs/RETRO_GUIDE.md` ≥ `5`
**Commit prefix**: `docs(retro): RETRO_GUIDE 改訂 — 基本方針 + freeform + action plan (M0.13)`

**Notes**:
- P1: 「retro = retrospective、自己改善 + PJ 改善 が基本目的」
- P2: 「user は retro 参加者（external lens 扱い、Stage 1 内に組込）」
- P3: 「findings は archive じゃなくて action plan 化、user と決定」
- freeform instruction: 「generic 禁止、`<file>:<line>` または concrete commit 参照必須、既存 4 category 補集合的視点を優先」
- verdict 保存: counter-arguer 通過 finding は pending state に lens / verdict / 経緯保存

### Task 5: docs/DOC_CONSISTENCY_CHECKLIST.md M0.13 check items

**Goal**: SPEC §3.9 / §3.6.x / RETRO_GUIDE / 4 lens / 3 dispatcher の整合性 check items
**Files**: `docs/DOC_CONSISTENCY_CHECKLIST.md` (modify)
**Insertion points**: 末尾に M0.13 セクション
**Integrity check**: `grep -c "M0.13 Retro Discipline" docs/DOC_CONSISTENCY_CHECKLIST.md` → `1`
**Commit prefix**: `docs(consistency): add M0.13 Retro Discipline check items`

### Task 6: agents/loom-retro-pm.md 改訂

**Goal**: 基本方針 P1/P2/P3 を retro-pm prompt に組込、user lens を Stage 1 公式メンバーに、verdict 保存 hook 追加
**Files**: `agents/loom-retro-pm.md` (modify)
**Spec ref**: SPEC §3.9（Task 3）+ RETRO_GUIDE（Task 4）
**Insertion points**: agent prompt 冒頭付近に「基本方針」section、Stage 1 dispatch logic に user lens 組込、Stage 3 移行前に verdict 保存
**Integrity check**: `grep -cE "基本方針|user lens|verdict 保存" agents/loom-retro-pm.md` ≥ `3`
**Commit prefix**: `feat(agents): loom-retro-pm gains 基本方針 + user lens + verdict hook (M0.13)`

### Task 7: 4 retro lens に freeform improvement instruction 追記

**Goal**: pj-judge / process-judge / meta-judge / researcher 4 file に共通骨格テキストとして freeform instruction 追加
**Files**: 4 file modify (loom-retro-{pj,process,meta}-judge + researcher)
**Spec ref**: RETRO_GUIDE（Task 4）+ meta-D
**Insertion points**: 既存 lens 説明 / category 列挙の後
**Integrity check**: 4 file それぞれで `grep -c "freeform-improvement\|freeform improvement" agents/loom-retro-<lens>.md` ≥ `1`
**Commit prefix**: `feat(agents): 4 retro lens gain freeform improvement instruction (M0.13)`

**Notes**: 共通テキスト骨格（M0.9/M0.10/M0.11/M0.12 の共通骨格パターン）。category enum に `freeform-improvement` 追加、generic 禁止を強調。

### Task 8: agents/loom-retro-counter-arguer.md 改訂

**Goal**: freeform finding に対する検証強化（generic / vague は drop、concrete reference 無いと for_drop）
**Files**: `agents/loom-retro-counter-arguer.md` (modify)
**Insertion points**: 既存 verdict 判定 logic の中、freeform 専用検証 step 追加
**Integrity check**: `grep -c "freeform\|generic.*禁止" agents/loom-retro-counter-arguer.md` ≥ `2`
**Commit prefix**: `feat(agents): loom-retro-counter-arguer strengthens freeform finding verification (M0.13)`

### Task 9: agents/loom-retro-aggregator.md 改訂（action plan 化）

**Goal**: aggregator output に **action plan セクション必須化**、findings → user との合意による着手項目選定 → 改善計画提示の流れを enforce
**Files**: `agents/loom-retro-aggregator.md` (modify)
**Spec ref**: P3（Task 4）
**Insertion points**: 既存 archive markdown 生成 logic の隣
**Integrity check**: `grep -c "action plan\|着手項目\|改善計画" agents/loom-retro-aggregator.md` ≥ `2`
**Commit prefix**: `feat(agents): loom-retro-aggregator adds action plan section to output (M0.13, P3)`

**Notes**: action plan format（提案）：
- 「即時適用」: 軽量 fix、本 session で着手
- 「milestone 化」: 新 milestone 立てる finding
- 「保留 / archive only」: 後送り
- 各 finding に user の意思表示 (yes/no/defer) 記録、合意 plan を pending state に保存

### Task 10: agents/loom-pm.md workflow discipline 追記

**Goal**: PM prompt に discipline 5 項目組込
**Files**: `agents/loom-pm.md` (modify)
**Spec ref**: findings meta-B / proc-002 / proc-C / proc-A / proc-004
**Insertion points**: 既存 Customization Layer / Workflow section の中
**Integrity check**: `grep -cE "parallel.*verify|degraded mode|inline.*spec|doc.*並列|reviewer verdict" agents/loom-pm.md` ≥ `5`
**Commit prefix**: `feat(agents): loom-pm workflow discipline (parallel/Task-tool/spec/doc/reviewer) (M0.13)`

**Notes**:
- (a) **Parallel dispatch self-verify** (`meta-B`): 同 message 内に複数 Agent invocation 含むことを post-dispatch で確認、含まなければ "claimed parallel but actually sequential" finding 自己生成
- (b) **Task tool fallback degraded mode** (`proc-002`): session 開始時に Task tool 利用可否 check、不在なら user に「degraded mode で sequential self-review に switch」明示
- (c) **Inline spec edit** (`proc-C`): spec phase で brainstorm Q&A 中に design spec を inline 編集、Q&A の答えがそのまま section 内容に。formal "spec 書き出し" step を圧縮
- (d) **Doc batch parallelism** (`proc-A`): doc 5 file 以上の更新が必要な場合、複数 subagent 並列 dispatch（同 message 内に複数 Agent invocation）。secretary agent 化は将来検討
- (e) **Reviewer verdict 保存** (`proc-004`): milestone tag 設置時、直近 reviewer dispatch の verdict（commit / output ref）を `<project>/.claude-loom/retro/<retro-id>/pending.json` の verdict_evidence field に保存

### Task 11: agents/loom-developer.md TDD red 順序 enforcement

**Goal**: dev prompt に TDD red commit が test 拡張 commit より時系列で前にあることを enforce、red commit が無いと self-finding 生成
**Files**: `agents/loom-developer.md` (modify)
**Spec ref**: finding proc-001
**Insertion points**: 既存 TDD cycle 説明 / Customization Layer 周辺
**Integrity check**: `grep -cE "TDD red.*順序|red commit.*先|時系列" agents/loom-developer.md` ≥ `2`
**Commit prefix**: `feat(agents): loom-developer enforces TDD red commit ordering (M0.13)`

**Notes**: 自己 audit ロジック - 実装 commit 直前に `git log` で同 milestone 内の test commit が feat commit より前にあるか確認。無ければ警告 + 修正提案。

### Task 12: tests 拡張

**Goal**: retro_test と agents_test に M0.13 関連 assertion 追加
**Files**: `tests/retro_test.sh`, `tests/agents_test.sh` (2 file modify)
**Spec ref**: REQ-027
**Integrity check**: `./tests/run_tests.sh` で 8 PASS 維持
**Commit prefix**: `test: extend retro/agents tests for M0.13 freeform + parallel verify + TDD 順序`

**Notes**:
- retro_test: 4 lens prompt が `freeform-improvement` または `freeform improvement` 参照、aggregator が `action plan` 参照
- agents_test: PM prompt が parallel verify / Task tool fallback / inline spec / doc 並列 / reviewer verdict すべて参照、developer が TDD red 順序参照

### Task 13: README.md user-facing intro

**Goal**: M0.13 の retro discipline + process hardening を README に短く紹介
**Files**: `README.md` (modify)
**Spec ref**: M0.10/M0.11/M0.12 の README intro pattern 踏襲
**Insertion points**: 既存 `## Coexistence Mode (M0.12 から)` の後 or 末尾近く
**Integrity check**: `grep -c "Retro Discipline\|process discipline\|基本方針" README.md` ≥ `1`
**Commit prefix**: `docs(readme): add Retro Discipline & Process Hardening intro (M0.13)`

### Task 14: 全 test PASS + tag + main merge + retro archive commit

**Goal**: 全 test 維持、retro archive (`docs/retro/2026-04-29-001-report.md`) を本 branch に commit、PLAN.md done mark、tag、main merge
**Files**: `PLAN.md` (status update), `docs/retro/2026-04-29-001-report.md` (commit), git tag, git merge
**Spec ref**: M0.10/M0.11/M0.12 Task 13 と同手順
**Integrity check**:
- `./tests/run_tests.sh` → `Passed: 8   Failed: 0   Skipped: 0`
- `git tag -l --sort=-creatordate | head -2` → `m0.13-complete\nm0.12-complete`
- `git ls-files docs/retro/` で retro report が tracked
**Commit prefix**: `docs: archive retro 2026-04-29-001 + mark M0.13 tasks done` + tag annotation + merge commit

### Task 15: D2: learned_guidance write to prefs（post-merge manual step）

**Goal**: retro 9 finding を新 retro architecture 経由 or 手動で `agents.<name>.learned_guidance[]` に書き込み
**Files**: `~/.claude-loom/user-prefs.json`, `<repo>/.claude-loom/project-prefs.json`（gitignored、commit 不要）
**Spec ref**: retro action plan
**Integrity check**: `jq '.agents | to_entries | map(select(.value.learned_guidance | length > 1))' ~/.claude-loom/user-prefs.json` で M0.13 由来 entries が複数記録
**Commit prefix**: なし（prefs は gitignored、commit 不要）

**Notes**:
- M0.13 完了 + main merge 後に実施
- 9 finding（proc-001 / proc-002 / proc-004 / proc-A / proc-C / meta-B / meta-D / pj-002 / 他 for_downgrade）の guidance_proposal を該当 agent の learned_guidance に追加
- 手動 jq edit or `/loom-retro --apply <retro-id>` (Phase 2 で実装) で反映
- v1 では手動

---

## Self-Review

**Spec coverage**:
- ✅ 基本方針 P1/P2/P3 → Tasks 3, 4, 6
- ✅ freeform improvement (meta-D) → Tasks 4, 7, 8
- ✅ action plan 化 (P3) → Tasks 4, 9
- ✅ parallel verify (meta-B 構造的修正) → Task 10
- ✅ Task tool fallback (proc-002) → Task 10
- ✅ TDD red 順序 (proc-001) → Task 11
- ✅ Reviewer verdict 保存 (proc-004) → Task 10
- ✅ Spec flow 圧縮 (proc-C) → Task 10
- ✅ Doc 並列化 (proc-A) → Task 10
- ✅ pj-002 (6 案件対応表) → Stage 1 で実施済（main `395197c`）
- ✅ meta-001 (prefs 作成) → Stage 1 で実施済
- ✅ retro archive commit → Task 14

**Placeholder scan**: TBD/TODO なし

**Type consistency**: 「P1/P2/P3」「freeform-improvement」「action plan」「parallel verify」用語統一

**Risk**:
- 多数 file 編集（10+ agent prompt + 5 doc）→ 軽量 plan で task 切り分け、subagent dispatch で吸収可
- learned_guidance write が gitignored prefs 編集 → audit trail は retro archive markdown に依存
- Stage 1 i2 が main 直 commit で CLAUDE.md 違反 → 本 plan の self-review に明記、次 retro で finding 化候補

---

## Execution Handoff

Tasks 2-13 は loom-developer 1-2 体で sequential or 2 batch 実施可能（agent prompt 編集は 1 batch、test/README は別 batch）。Task 14 は PM 直接実施（test + tag + retro archive commit + merge）。Task 15 は post-merge manual step。
