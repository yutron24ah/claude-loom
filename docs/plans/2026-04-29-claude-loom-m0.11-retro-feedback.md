# claude-loom M0.11: retro → agent prompt feedback loop Implementation Plan

> 軽量フォーマット (M0.9.1 確立)。design SSoT は本セッション対話履歴の合意：案 B (prefs 蓄積 + Customization Layer 注入) + tag schema (target_artifact / target_agent[] / guidance_proposal) + scope β (default project) + format i (1行 compact) + TTL α (v1 manual)。

**Goal**: M0.8 retro が生成・承認した finding を `agents.<name>.learned_guidance[]` に蓄積し、agent dispatch 時に `[loom-learned-guidance]` block として注入する自己進化機構を実装。`agents/*.md` は static SSoT のまま、prefs が動的学習層。

**Architecture**: M0.9 Customization Layer 機構の自然延長。retro lens が finding tag 付与 → counter-arguer 通過 → aggregator が user 承認後 prefs 書き込み → agent dispatch 時 read + 注入。書き込み主体は loom-retro-aggregator のみ、読み取りは全 13 agent。

**Tech Stack**: bash, jq, Markdown。新コード生成なし、既存 retro architecture (M0.8) + Customization Layer (M0.9) の拡張で完結。

---

## File Structure

```
claude-loom/
├── PLAN.md                                            [Task 1, modify]
├── SPEC.md                                            [Task 3, modify §3.6.5 / §3.9 / §6.9.4]
├── README.md                                          [Task 12, modify]
├── docs/RETRO_GUIDE.md                                [Task 4, modify: lens tagging convention]
├── docs/DOC_CONSISTENCY_CHECKLIST.md                  [Task 5, modify: M0.11 check items]
├── agents/loom-retro-pj-judge.md                      [Task 7, modify: tag fields]
├── agents/loom-retro-process-judge.md                 [Task 7, modify: tag fields]
├── agents/loom-retro-meta-judge.md                    [Task 7, modify: tag fields]
├── agents/loom-retro-researcher.md                    [Task 7, modify: tag fields]
├── agents/loom-retro-counter-arguer.md                [Task 9, modify: tag preservation]
├── agents/loom-retro-aggregator.md                    [Task 8, modify: write logic]
├── agents/loom-pm.md                                  [Task 10, modify: read+inject]
├── agents/loom-developer.md                           [Task 10, modify: read+inject]
├── agents/loom-{reviewer,code-reviewer,security-reviewer,test-reviewer}.md  [Task 10, modify]
├── agents/loom-retro-pm.md                            [Task 10, modify: read+inject]
├── templates/user-prefs.json.template                 [Task 6, modify: learned_guidance example]
├── templates/project-prefs.json.template              [Task 6, modify: learned_guidance example]
├── tests/REQUIREMENTS.md                              [Task 2, modify: REQ-025]
├── tests/prefs_test.sh                                [Task 11, modify: learned_guidance schema]
├── tests/agents_test.sh                               [Task 11, modify: read+inject 参照]
└── tests/retro_test.sh                                [Task 11, modify: lens tag assertion]
```

---

## Tasks

### Task 1: PLAN.md M0.11 milestone insertion ✅

**Goal**: M0.11 milestone block 挿入（13 tasks + 完成基準）
**Files**: `PLAN.md` (modify)
**Spec ref**: 本 plan 全体
**Integrity check**: `grep -c "id: m0\.11-t" PLAN.md` → `13`
**Commit prefix**: `docs(plan): add M0.11 milestone (retro → agent prompt feedback loop)`

**Notes**: PM 実施済、commit のみ。

### Task 2: tests/REQUIREMENTS.md REQ-025 追加

**Goal**: M0.11 受入要件を REQ-025 として明文化
**Files**: `tests/REQUIREMENTS.md` (modify)
**Spec ref**: M0.11 完成基準（PLAN.md）
**Insertion points**: M0.10 セクションの後、`## M1 以降は別 PR で追記` の前
**Integrity check**: `grep -c "REQ-025" tests/REQUIREMENTS.md` → `1`
**Commit prefix**: `docs(tests): add REQ-025 for M0.11 retro feedback loop`

### Task 3: SPEC.md 拡張（§3.6.5 / §3.9 / §6.9.4）

**Goal**: SPEC に learned_guidance schema、lens tagging convention、注入機構を明記
**Files**: `SPEC.md` (modify)
**Spec ref**: 本 plan の design 合意（B + tag + β + i + α）
**Insertion points**:
- §3.6.5 拡張: 「3.6.5.4 learned_guidance 注入機構（M0.11 から）」を新設
- §3.9 拡張: 「3.9.x lens tagging + auto-write to learned_guidance」 sub-section
- §6.9.4 拡張: `learned_guidance: []` field schema 追加（id / added_at / from_retro / from_finding_id / category / guidance / active / ttl_sessions / use_count）
**Integrity check**: `grep -c "learned_guidance" SPEC.md` ≥ `5`
**Commit prefix**: `docs(m0.11): SPEC §3.6.5 / §3.9 / §6.9.4 — learned_guidance schema + lens tagging + injection`

### Task 4: docs/RETRO_GUIDE.md に lens tagging convention 追記

**Goal**: 4 lens (pj/process/meta/researcher) が finding 出力に target_artifact / target_agent[] / guidance_proposal を含む規約を SSoT として明記
**Files**: `docs/RETRO_GUIDE.md` (modify)
**Spec ref**: 本 plan の Q3 (E + β + ii) 合意
**Insertion points**: 既存 lens 説明セクションの後、または Stage 1 説明内
**Integrity check**: `grep -E "target_artifact|target_agent|guidance_proposal" docs/RETRO_GUIDE.md | wc -l` ≥ `3`
**Commit prefix**: `docs(retro): add lens tagging convention for M0.11 learned_guidance routing`

**Notes**:
- target_artifact enum: `agent-prompt | spec-section | doc-file | retro-config`
- target_agent[]: `["loom-developer"]` 等の配列、agent-prompt 時必須
- guidance_proposal: agent-prompt 時の注入 text 候補

### Task 5: docs/DOC_CONSISTENCY_CHECKLIST.md に M0.11 check items 追加

**Goal**: SPEC §3.6.5.4 / RETRO_GUIDE / agent prompt の整合性 check item を明文化
**Files**: `docs/DOC_CONSISTENCY_CHECKLIST.md` (modify)
**Spec ref**: M0.9 / M0.10 の DOC_CONSISTENCY 拡張パターン踏襲
**Insertion points**: 末尾に M0.11 セクション追加
**Integrity check**: `grep -c "M0.11" docs/DOC_CONSISTENCY_CHECKLIST.md` → `1`
**Commit prefix**: `docs(consistency): add M0.11 learned_guidance + lens tagging check items`

### Task 6: templates/{user,project}-prefs.json.template に learned_guidance example 追加

**Goal**: 既存 `agents.<name>` schema を拡張、`learned_guidance: []` example field を含める（jq empty で valid を維持）
**Files**: `templates/user-prefs.json.template`, `templates/project-prefs.json.template` (modify)
**Spec ref**: SPEC §6.9.4（Task 3 で更新）
**Insertion points**: 既存 `agents.loom-developer` 等の中、`personality` field の後
**Integrity check**:
- `jq empty templates/user-prefs.json.template` 成功
- `jq empty templates/project-prefs.json.template` 成功
- `jq -e '.agents."loom-developer".learned_guidance | type == "array"' templates/project-prefs.json.template` → `true`
**Commit prefix**: `feat(templates): prefs templates gain learned_guidance example (M0.11)`

**Notes**: example entry は 1 つ程度、`_comment` で「retro が自動で write、user は読み専用 + manual prune 推奨」を明記

### Task 7: 4 retro lens に finding tag fields 追加

**Goal**: pj-judge / process-judge / meta-judge / researcher の finding 出力 schema に `target_artifact` / `target_agent[]` / `guidance_proposal` 必須化（agent-prompt の場合）
**Files**: `agents/loom-retro-{pj-judge,process-judge,meta-judge,researcher}.md` (4 files modify)
**Spec ref**: docs/RETRO_GUIDE.md（Task 4 で更新）
**Insertion points**: 既存 finding JSON schema 例の中、関連 field の隣
**TDD**: `red: tests/retro_test.sh が tag fields を assert すれば red、Task 7 完了後 green` （Task 11 で test 追加）
**Integrity check**: 4 file それぞれで `grep -c "target_artifact" agents/loom-retro-<lens>.md` ≥ `1`
**Commit prefix**: `feat(agents): 4 retro lens emit target_artifact/target_agent/guidance_proposal (M0.11)`

**Notes**:
- 共通 schema 説明を 4 file で同一に
- pj-axis / process-axis lens は `target_artifact: agent-prompt` も生成し得る
- meta-axis / researcher は通常 retro-config / external 系、agent-prompt 出力は稀
- guidance_proposal は agent-prompt 時のみ必須、他 artifact では null OK

### Task 8: loom-retro-aggregator に learned_guidance write logic 追加

**Goal**: aggregator が user 承認 finding のうち `target_artifact: agent-prompt` を持つものを `agents.<target_agent[]>.learned_guidance[]` に書き込む logic を agent prompt に明記
**Files**: `agents/loom-retro-aggregator.md` (modify)
**Spec ref**: SPEC §3.9.x (Task 3 で更新), 本 plan の design 合意
**Insertion points**: 既存 archive markdown 生成 logic の隣、approval_history write logic の延長として
**Integrity check**: `grep -c "learned_guidance" agents/loom-retro-aggregator.md` ≥ `2`
**Commit prefix**: `feat(agents): loom-retro-aggregator writes learned_guidance entries on approval (M0.11)`

**Notes**:
- write 順: project-prefs default、user 昇格 opt-in 時のみ user-prefs
- new entry の id 採番 (e.g., `guidance-{uuid}` or `guidance-{timestamp}`)
- target_agent[] が複数 agent 含む場合、各 agent の entry に同 guidance を duplicate write
- max 20 entries / agent の上限 check、超過時 oldest を `active: false` に deactivate
- write 前に user に「これから書き込む内容」を diff として提示

### Task 9: loom-retro-counter-arguer の tag preservation

**Goal**: counter-arguer が verdict 通過 finding の tag fields (target_artifact / target_agent / guidance_proposal) を verbatim に保持して aggregator に渡すよう明記
**Files**: `agents/loom-retro-counter-arguer.md` (modify)
**Spec ref**: docs/RETRO_GUIDE.md（Task 4）
**Insertion points**: 既存 verdict 出力 schema 説明の中
**Integrity check**: `grep -c "target_artifact\|guidance_proposal" agents/loom-retro-counter-arguer.md` ≥ `1`
**Commit prefix**: `feat(agents): loom-retro-counter-arguer preserves tag fields through verdict pass (M0.11)`

### Task 10: 13 agent の Customization Layer に learned_guidance read+inject 追記

**Goal**: 13 agent prompt の Customization Layer section を拡張、`agents.<self>.learned_guidance` を read し active=true entries を `[loom-learned-guidance]` block として self-prompt に注入（top-level: self-read、dispatched: dispatcher 注入）
**Files**: 13 file modify (loom-pm + loom-developer + 4 reviewer + 7 retro)
**Spec ref**: M0.9 Customization Layer（既存）+ SPEC §3.6.5.4（Task 3）
**Insertion points**: 各 agent の `## Customization Layer` section 内、personality 関連記述の **直後**
**TDD**: `red: tests/agents_test.sh が learned_guidance 参照を assert すれば red、Task 10 完了後 green` （Task 11 で test 追加）
**Integrity check**: 13 file それぞれで `grep -c "learned_guidance\|loom-learned-guidance" agents/loom-*.md` ≥ `1`
**Commit prefix**: `feat(agents): all 13 agents read+inject learned_guidance via Customization Layer (M0.11)`

**Notes**:
- 共通骨格テキスト 1 つを 13 file に挿入（M0.9 Task 17/19 / M0.10 Task 5 と同パターン）
- 注入 format: `[loom-learned-guidance]\n- guidance-001: <text>\n- guidance-005: <text>` (active のみ、1 行 compact)
- block 順序: `[loom-customization]` の後、task content の前
- top-level: self-read、dispatched: dispatcher (PM/dev) が注入

### Task 11: tests 拡張（prefs / agents / retro）

**Goal**: 3 つの test file に M0.11 関連 assertion 追加、Tasks 6/10/7 の green 確認
**Files**: `tests/prefs_test.sh`, `tests/agents_test.sh`, `tests/retro_test.sh` (3 files modify)
**Spec ref**: REQ-025（Task 2）+ SPEC §6.9.4（Task 3）
**Integrity check**:
- `./tests/run_tests.sh` で `Passed: 8   Failed: 0   Skipped: 0` 維持
- `prefs_test`: agents.<name>.learned_guidance schema validation (jq -e で type == "array")
- `agents_test`: 13 agent prompt が `learned_guidance` または `loom-learned-guidance` を参照
- `retro_test`: 4 lens prompt が `target_artifact` を含む
**Commit prefix**: `test: extend prefs/agents/retro tests for M0.11 learned_guidance + lens tagging`

### Task 12: README.md に user-facing 説明追加

**Goal**: M0.11 機能を README に短く紹介、user が「retro が学習を蓄積する」仕組みを把握できる
**Files**: `README.md` (modify)
**Spec ref**: M0.10 の README 入門パターン踏襲
**Insertion points**: 既存 `## Customization Layer` セクションの中 or 末尾近く、または `## Worktree 統合` の後
**Integrity check**: `grep -c "learned_guidance\|retro.*feedback\|蓄積" README.md` ≥ `1`
**Commit prefix**: `docs(readme): add learned_guidance / retro feedback loop intro (M0.11)`

### Task 13: 全 test PASS + tag m0.11-complete + main merge

**Goal**: 全 test 維持、PLAN.md 13 task done、tag 設置、main merge
**Files**: `PLAN.md` (status: todo → done), git tag, git merge
**Spec ref**: M0.10 Task 8 と同手順
**Integrity check**:
- `./tests/run_tests.sh` → `Passed: 8   Failed: 0   Skipped: 0`
- `git tag -l --sort=-creatordate | head -2` → `m0.11-complete\nm0.10-complete`
- main HEAD が merge commit
**Commit prefix**: `docs(plan): mark M0.11 tasks done (13/13)` + tag annotation + merge commit

---

## Self-Review

**Spec coverage**:
- ✅ schema (learned_guidance) → Tasks 3, 6, 11
- ✅ lens tagging → Tasks 4, 7, 9, 11
- ✅ aggregator write logic → Task 8
- ✅ 13 agent read+inject → Tasks 10, 11
- ✅ user-facing doc → Tasks 5, 12
- ✅ tag + merge → Task 13

**Placeholder scan**: TBD/TODO なし、各 Task に exact action

**Type consistency**:
- `learned_guidance` 用語を全 task で一貫
- `target_artifact / target_agent / guidance_proposal` field 名を全 task で同一表記
- `[loom-learned-guidance]` block 名を 全 13 agent で同一

**Risk**:
- 13 agent prompt 編集が大量 → 共通テキスト 1 つの parallel batch 推奨（M0.9 Task 17/19 と同パターン）
- max 20 entries 上限の運用 → Task 8 の deactivate 機構で吸収
- conflict (同 category 複数 entry) → Task 8 で「同 category 新 entry が old を deactivate」logic 明記
- testing scope → 単に「参照記述あり」を確認、注入の actual runtime 動作は smoke test (Task 13 範囲外、user 実機検証)

---

## Execution Handoff

Task 1 は PM 実施済（commit のみ）。Tasks 2-12 は loom-developer 1-2 体で sequential or parallel-batch 実施可（13 agent 編集は parallel-batch 推奨）。Task 13 は PM 直接実施（test + tag + merge）。
