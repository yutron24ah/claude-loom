# claude-loom M1.5: UI Prep Backend Implementation Plan

> 軽量フォーマット (M0.9.1 確立)。design SSoT は SCREEN_REQUIREMENTS.md の Q1-Q6 brainstorm 結果（M0.8-M0.13 feature の UI 要件）。本 milestone は M2 UI Shell 着手前に必要な backend procedure を追加。

**Goal**: M1 daemon foundation に **6 router を追加**、SCREEN_REQUIREMENTS.md で確定した M0.8-M0.13 feature の UI 要件に対応する API surface を整備。M2 UI Shell が procedure 不足で待たんで済む状態にする。

**Architecture**: M1 で確立した tRPC + zod + Drizzle pattern を踏襲、各 router は既存 8 router (project/session/agent/plan/consistency/approval/note/config) と同形式で実装。events router 拡張で 3 新 subscription 追加。

**Tech Stack**: M1 と同（tRPC + zod + Drizzle、Vitest）。新依存なし。

---

## File Structure

```
claude-loom/
├── PLAN.md                                            [Task 1, modify]
├── tests/REQUIREMENTS.md                              [Task 2, modify: REQ-029]
├── daemon/src/
│   ├── routes/
│   │   ├── retro.ts                                   [Task 3, NEW]
│   │   ├── prefs.ts                                   [Task 4, NEW]
│   │   ├── personality.ts                             [Task 5, NEW]
│   │   ├── worktree.ts                                [Task 6, NEW]
│   │   ├── coexistence.ts                             [Task 7, NEW]
│   │   ├── discipline.ts                              [Task 8, NEW]
│   │   └── events.ts                                  [Task 9, modify: 3 subscription 追加]
│   └── router.ts                                      [Task 10, modify: 6 router wire-up]
└── daemon/test/
    ├── retro-route.test.ts                            [Task 11, NEW]
    ├── prefs-route.test.ts                            [Task 11, NEW]
    ├── personality-route.test.ts                      [Task 11, NEW]
    ├── worktree-route.test.ts                         [Task 11, NEW]
    ├── coexistence-route.test.ts                      [Task 11, NEW]
    └── discipline-route.test.ts                       [Task 11, NEW]
```

---

## Tasks

### Task 1: PLAN.md M1.5 milestone insertion ✅

**Goal**: M1.5 block 挿入（12 tasks + 完成基準）
**Files**: `PLAN.md`
**Spec ref**: 本 plan + SCREEN_REQUIREMENTS Q1-Q6
**Integrity check**: `grep -c "id: m1\.5-t" PLAN.md` → `12`
**Commit prefix**: `docs(plan): add M1.5 milestone (UI Prep Backend - 6 routers)`

**Notes**: PM 実施済、commit のみ。

### Task 2: tests/REQUIREMENTS.md REQ-029 追加

**Goal**: M1.5 受入要件
**Files**: `tests/REQUIREMENTS.md`
**Spec ref**: 本 plan
**Insertion points**: REQ-028 (M1) の後
**Integrity check**: `grep -c "REQ-029" tests/REQUIREMENTS.md` → `1`
**Commit prefix**: `docs(tests): add REQ-029 for M1.5 UI Prep Backend`

### Task 3: daemon/src/routes/retro.ts 新設 (Q1)

**Goal**: retro UI 用 procedure
**Files**: `daemon/src/routes/retro.ts` (NEW)
**Spec ref**: SCREEN_REQUIREMENTS §3.7 / §4.6 + retro architecture (M0.8/M0.11)
**Procedures**:
- `list`: query, input `{ projectId?: string, limit?: number }`, output `RetroSession[]`（過去 retro 一覧、`docs/retro/<id>-report.md` の存在 + project-prefs.last_retro 情報集約）
- `detail`: query, input `{ retroId: string }`, output `{ archive: string, pending: PendingState }`（archive markdown + pending state JSON）
- `userDecision`: mutation, input `{ retroId: string, findingId: string, decision: "accept" | "reject" | "defer" | "discuss" }`, output `{ success: boolean }`（pending.json 更新）
- `trigger`: mutation, input `{ scope?: string }`, output `{ retroId: string }`（新 retro session 開始 hint、実際の lens dispatch は後続 milestone）
**Integrity check**: `grep -c "publicProcedure" daemon/src/routes/retro.ts` ≥ `4`
**Commit prefix**: `feat(daemon): routes/retro.ts (M1.5, Q1 retro UI backend)`

**Notes**:
- archive markdown は `<repo>/docs/retro/<retroId>-report.md` を fs.readFile
- pending.json は `<project>/.claude-loom/retro/<retroId>/pending.json`
- M1.5 では trigger は state 初期化のみ、lens 並列 dispatch は M2/M3 で（user yes/no flow が UI 必要）

### Task 4: daemon/src/routes/prefs.ts 新設 (Q2/Q4/Q5)

**Goal**: user-prefs / project-prefs の generic CRUD + learned_guidance helpers
**Files**: `daemon/src/routes/prefs.ts` (NEW)
**Spec ref**: SCREEN_REQUIREMENTS §3.8/§3.10/§3.11 + §4.7/§4.9/§4.10 + SPEC §6.9
**Procedures**:
- `user.get`: query → `UserPrefs`（`~/.claude-loom/user-prefs.json` 読取）
- `user.set`: mutation, input `{ patch: Partial<UserPrefs> }` → `UserPrefs`（atomic merge write）
- `project.get`: query, input `{ projectId: string }` → `ProjectPrefs`
- `project.set`: mutation, input `{ projectId: string, patch: Partial<ProjectPrefs> }` → `ProjectPrefs`
- `learnedGuidance.toggle`: mutation, input `{ scope: "user" | "project", projectId?: string, agentName: string, guidanceId: string, active: boolean }` → `{ success: boolean }`
- `learnedGuidance.delete`: mutation, input `{ scope, projectId?, agentName, guidanceId }` → `{ success: boolean }`
**Integrity check**: `grep -c "publicProcedure" daemon/src/routes/prefs.ts` ≥ `6`
**Commit prefix**: `feat(daemon): routes/prefs.ts (M1.5, Q2/Q4/Q5 prefs CRUD + learned_guidance)`

**Notes**:
- atomic write: nanoid tmp + rename pattern (M1 daemon/src/config.ts 参考)
- learned_guidance は project-prefs.agents.<name>.learned_guidance[] 配列を index で操作
- zod schema は SPEC §6.9 / §6.9.4 と整合

### Task 5: daemon/src/routes/personality.ts 新設 (Q2)

**Goal**: 4 preset 一覧 + 説明取得（read-only）
**Files**: `daemon/src/routes/personality.ts` (NEW)
**Spec ref**: SCREEN_REQUIREMENTS §3.8 + SPEC §6.9.4.4
**Procedures**:
- `list`: query → `Preset[]`（`<repo>/prompts/personalities/*.md` を glob、frontmatter parse）
- `detail`: query, input `{ name: string }` → `{ name: string, description: string, body: string }`（preset md 全文取得）
**Integrity check**: `grep -c "publicProcedure" daemon/src/routes/personality.ts` ≥ `2`
**Commit prefix**: `feat(daemon): routes/personality.ts (M1.5, Q2 preset list)`

**Notes**:
- read-only、書き込み無し（custom preset 追加は user 手動 OR M2 UI で別途）
- list は preset name + description (frontmatter から) + summary (本文先頭 100 字)

### Task 6: daemon/src/routes/worktree.ts 新設 (Q3)

**Goal**: git worktree CLI wrapper
**Files**: `daemon/src/routes/worktree.ts` (NEW)
**Spec ref**: SCREEN_REQUIREMENTS §3.9 / §4.8 + SPEC §3.6.6 + skills/loom-worktree
**Procedures**:
- `list`: query, input `{ projectId: string }` → `Worktree[]`（`git worktree list --porcelain` parse、各 worktree の path / branch / locked / state）
- `create`: mutation, input `{ projectId, branch, basePath?: string }` → `Worktree`
- `remove`: mutation, input `{ projectId, path }` → `{ success: boolean, removed: string[] }`（`git worktree remove`、uncommitted check 付き）
- `lock`: mutation, input `{ projectId, path, reason?: string }` → `{ success: boolean }`
- `unlock`: mutation, input `{ projectId, path }` → `{ success: boolean }`
**Integrity check**: `grep -c "publicProcedure" daemon/src/routes/worktree.ts` ≥ `5`
**Commit prefix**: `feat(daemon): routes/worktree.ts (M1.5, Q3 worktree CLI wrapper)`

**Notes**:
- `child_process.execFile("git", ["worktree", ...])` で git CLI 呼び出し
- project root から git command 実行、project は `routes/project.ts` の `current` で取得
- max_concurrent 上限は project-prefs から read、超過時 error
- uncommitted check: `git status --porcelain` 結果で warning return

### Task 7: daemon/src/routes/coexistence.ts 新設 (Q5)

**Goal**: coexistence_mode + enabled_features の get/set + detect
**Files**: `daemon/src/routes/coexistence.ts` (NEW)
**Spec ref**: SCREEN_REQUIREMENTS §3.11 / §4.10 + SPEC §3.6.7
**Procedures**:
- `get`: query, input `{ projectId: string }` → `{ mode, enabledFeatures: string[] }`
- `set`: mutation, input `{ projectId, mode, enabledFeatures }` → `{ mode, enabledFeatures }`
- `detect`: query, input `{ projectId: string }` → `{ otherPlugins: string[], existingClaudeMd: boolean, existingAgentsSkills: string[] }`（既存 setup 検出）
**Integrity check**: `grep -c "publicProcedure" daemon/src/routes/coexistence.ts` ≥ `3`
**Commit prefix**: `feat(daemon): routes/coexistence.ts (M1.5, Q5 mode + features + detect)`

**Notes**:
- get/set は project.json の rules.coexistence_mode + rules.enabled_features 操作
- detect は `~/.claude/plugins/`、`~/.claude/agents/` 等を ls して既存 setup 一覧

### Task 8: daemon/src/routes/discipline.ts 新設 (Q6)

**Goal**: process discipline metrics + violations
**Files**: `daemon/src/routes/discipline.ts` (NEW)
**Spec ref**: SCREEN_REQUIREMENTS §3.12 / §4.11 + SPEC §3.6.8
**Procedures**:
- `metrics.live`: query → `LiveMetrics`（直近 N 分集計：parallel rate / Task tool status / TDD violations / verdict coverage）
- `metrics.history`: query, input `{ projectId: string, milestone?: string }` → `HistoricalMetrics[]`
- `violations.list`: query, input `{ projectId: string, type?: string }` → `Violation[]`
- `violations.ack`: mutation, input `{ violationId: string }` → `{ success: boolean }`
**Integrity check**: `grep -c "publicProcedure" daemon/src/routes/discipline.ts` ≥ `4`
**Commit prefix**: `feat(daemon): routes/discipline.ts (M1.5, Q6 metrics + violations)`

**Notes**:
- metrics.live は events table を時間 window で集計（parallel = 同 timestamp 範囲内の dispatch event 数 等）
- M1.5 では simple aggregate query のみ、retro lens 連動の violation 詳細は M3/M4 で深堀り
- violations.list は events table の特定 event_type filter（具体 violation 検出 logic は未定、M1.5 では skeleton）

### Task 9: events.ts に subscription 3 種追加

**Goal**: M1 既存 4 subscription (onAgentChange/onPlanChange/onFindingNew/onApprovalRequest) に 3 追加
**Files**: `daemon/src/routes/events.ts` (modify), `daemon/src/events/types.ts` (modify), `daemon/src/events/broadcaster.ts` (modify)
**Spec ref**: SCREEN_REQUIREMENTS §5.1
**Subscriptions to add**:
- `onLearnedGuidanceChange`: prefs.learnedGuidance.toggle / delete 連動
- `onWorktreeChange`: worktree.create / remove / lock / unlock 連動
- `onDisciplineMetricUpdate`: discipline metrics 更新（events table 集計時）
**Integrity check**: `grep -c "subscription" daemon/src/routes/events.ts` ≥ `7` (4 既存 + 3 新)
**Commit prefix**: `feat(daemon): events 3 subscriptions (learnedGuidance/worktree/discipline) (M1.5)`

**Notes**:
- types.ts に 3 新 event schema 追加（既存 5 種パターン踏襲）
- broadcaster.ts に対応 emit 関数追加
- prefs.ts / worktree.ts の mutation 後に broadcaster.emitX() 呼び出す

### Task 10: router.ts に 6 router wire-up + AppRouter type 更新

**Goal**: 全 6 新 router を appRouter に登録、frontend 用 type 公開
**Files**: `daemon/src/router.ts` (modify), `daemon/src/index.ts` (modify if needed)
**Spec ref**: 本 plan
**Integrity check**: `grep -cE "retro:|prefs:|personality:|worktree:|coexistence:|discipline:" daemon/src/router.ts` ≥ `6`
**Commit prefix**: `feat(daemon): wire 6 new routers into AppRouter (M1.5)`

### Task 11: daemon vitest 拡張

**Goal**: 6 新 router の test file 作成（最低 2-3 test/router、procedure 存在確認 + 1 functional test）
**Files**: `daemon/test/{retro,prefs,personality,worktree,coexistence,discipline}-route.test.ts` (6 NEW)
**Spec ref**: REQ-029 + 各 router 仕様
**Integrity check**: `pnpm --filter @claude-loom/daemon test` で 138 baseline + 各 router test → 全 PASS
**Commit prefix**: `test(daemon): unit tests for 6 new routers (M1.5)`

**Notes**:
- 最低限 router.list / router.detail / router.upsert (mutation がある場合) の存在確認 + zod schema 動作確認
- DB / fs / git 依存 procedure は mock OR fixture（既存 test pattern 踏襲）
- M1.5 では skeleton test、integration / e2e は M2 UI 着手後

### Task 12: 全 test PASS + tag m1.5-complete + main merge

**Goal**: 全 test 維持、PLAN.md done mark、tag、main merge
**Files**: `PLAN.md`, git tag, git merge
**Spec ref**: M1 Task 25 と同手順
**Integrity check**:
- `pnpm test` で全 PASS（daemon vitest + harness bash）
- `git tag -l --sort=-creatordate | head -2` → `m1.5-complete\nm1-complete`
**Commit prefix**: `docs(plan): mark M1.5 tasks done (12/12)` + tag annotation + merge commit

---

## Self-Review

**Spec coverage**:
- ✅ Q1 Retro UI → routes/retro.ts (Task 3)
- ✅ Q2/Q4/Q5 prefs → routes/prefs.ts (Task 4) + routes/personality.ts (Task 5)
- ✅ Q3 Worktree → routes/worktree.ts (Task 6)
- ✅ Q5 Coexistence → routes/coexistence.ts (Task 7)
- ✅ Q6 Discipline → routes/discipline.ts (Task 8)
- ✅ Realtime push → events 3 subscriptions (Task 9)

**Placeholder scan**: TBD/TODO なし

**Type consistency**: AppRouter / Drizzle / zod / nanoid 用語統一、router 名前 6 個統一

**Risk**:
- 6 router 同時実装は parallel 候補（M0.13 codified meta-B fix の真投入機会）→ 3 subagent 並列で 2 router/subagent
- worktree.ts は git CLI subprocess 呼び出し、execFile の error handling 必要
- discipline.ts の metrics 集計は M1.5 では simple aggregate のみ、本格 violation 検出は M3/M4
- prefs.ts atomic write は M1 config.ts pattern 流用で safety 確保

---

## Execution Handoff

Task 1 PM 実施済（commit のみ）。
Task 2 + Task 9 + Task 10 + Task 11 (test setup) は sequential（依存あり）、loom-developer 1 体。
Task 3-8 (6 routers) は **parallel 候補** — 3 subagent 並列で 2 router/subagent (parallel dispatch self-verify M0.13 codified discipline 反復実証):
- Subagent A: retro.ts + prefs.ts (Q1/Q2/Q4/Q5、最複雑)
- Subagent B: personality.ts + worktree.ts (Q2/Q3、中程度)
- Subagent C: coexistence.ts + discipline.ts (Q5/Q6、aggregate metrics)
Task 12 PM 直接実施（test + tag + merge）。
