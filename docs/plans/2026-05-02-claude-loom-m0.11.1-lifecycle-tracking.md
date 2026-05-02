# M0.11.1 Lifecycle Tracking Architecture 詳細プラン

> spec phase 2026-05-02 で確定した 5 design 分岐 (A1/B1/C2/D1/E3) を実装に落とし込む milestone。
> SSoT: SPEC §3.9.11 / §6.9.6 / §6.9.7 / §6.9.4.5 / RETRO_GUIDE Lifecycle Tracking section / tests/REQUIREMENTS.md REQ-035 / PLAN.md M0.11.1 セクション

## Goal

claude-loom retro architecture に **finding lifecycle + guidance lifecycle 構造的追跡 mechanism** を実装。M3.0 retro 由来の symptomatic patch (proc-NEW-1 counter-arguer stale check) を **物理削除して構造的解決に置換** = SPEC §3.9.x P4 「症状対処を構造解決後に消滅させる cleanup loop」の最初の実例として archive 価値最大化。

## Files (touched)

**新設**:
- `tests/migrate_pending_schema.sh` — 既存 4 retro session pending.json を schema_version 1 → 2 migrate (applied_in + apply_history field 後付け書き込み、apply commit 推定 by git log + commit message 解析)
- `tests/dry_run_applied_summary.sh` — applied_summary build mechanism 動作確認 (既存 4 retro session pending.json で applied_summary build → schema validate → fixture diff、t12 物理削除前安全網)

**改修 (agent prompt)**:
- `agents/loom-retro-pm.md` — Stage 0 拡張 (verdict_evidence build に加えて applied_summary lazy build 5 step、SPEC §6.9.7 手順)
- `agents/loom-retro-pj-judge.md` — applied_summary_path injection 受領 + Read tool 参照 mechanism
- `agents/loom-retro-process-judge.md` — 同上
- `agents/loom-retro-meta-judge.md` — 同上 + last_used_in audit による stale guidance proposal logic
- `agents/loom-retro-researcher.md` — 同上
- `agents/loom-retro-counter-arguer.md` — **stale finding detection section 物理削除** (P4 理想形初例)
- `agents/loom-retro-aggregator.md` — learned_guidance auto-prune logic 追加 (ttl_sessions main auto-deactivate + last_used_in update on retro reference)

**改修 (test)**:
- `tests/prefs_test.sh` — last_used_in field assertion + auto-prune rule integration assertion
- `tests/retro_test.sh` — applied_in schema (pending.json v2) + applied_summary build mechanism + auto-prune assertion
- `tests/agents_test.sh` — counter-arguer stale check section **不在** assertion (PM 物理削除後 enable)、retro-pm Stage 0 applied_summary build step assertion、4 lens applied_summary_path 注入 assertion

**改修 (data、migration 結果)**:
- `<project>/.claude-loom/retro/2026-04-29-001/pending.json` — schema_version 2 + applied_in/apply_history field 後付け
- `<project>/.claude-loom/retro/2026-05-02-001/pending.json` — 同上
- `<project>/.claude-loom/retro/2026-05-02-002/pending.json` — 同上 (本 retro session 由来 finding すべて)
- 古い 1 件 (要確認、glob で検出)

## Spec ref

- **SPEC §3.9.11** (Lifecycle Tracking Architecture、概念 + write timing + 責務 + rollback discipline)
- **SPEC §6.9.6** (pending.json 完全 schema v2、`applied_in` single + `apply_history` array、apply_type enum 4 種)
- **SPEC §6.9.7** (applied_summary.json 完全 schema、retro-pm Stage 0 lazy build 5 step、4 lens path injection mechanism)
- **SPEC §6.9.4.5** (learned_guidance auto-prune rule、ttl_sessions main + last_used_in audit hybrid)
- **docs/RETRO_GUIDE.md** "Lifecycle Tracking Architecture" section
- **tests/REQUIREMENTS.md** REQ-035
- **PLAN.md** M0.11.1 セクション impl phase 9 task

## Integrity check

- `./tests/run_tests.sh` で **12 PASS** 維持（既存 12 test files + applied_in / applied_summary build / auto-prune / counter-arguer stale check 不在 assertion 拡張）
- 既存 4 retro session pending.json が schema_version: 2 + applied_in/apply_history field 含む状態に migrate 完了
- `agents/loom-retro-counter-arguer.md` から stale finding detection section が **物理削除されとる** (grep -L で確認、symptomatic patch 消滅、SPEC §3.9.x P4 archive)
- agents/loom-retro-pm.md Stage 0 で verdict_evidence + applied_summary 両方 build mechanism 記述
- 4 lens prompt が applied_summary_path injection + Read tool 参照 mechanism 記述
- agents/loom-retro-aggregator.md に auto-prune logic (ttl_sessions auto-deactivate + last_used_in update) 記述
- dry-run test (tests/dry_run_applied_summary.sh) が pass、既存 4 retro session の applied_summary build → schema validate → fixture diff で動作確認
- working tree clean、Strategy a (dev 自身 commit、`committed_sha` 必須) で全 commit 完遂

## Commit prefix

`feat` (M0.11.1 = lifecycle tracking architecture 新機能)

各 sub-task に対応する commit pattern:
1. **t13 RED**: `test: M0.11.1 RED — applied_in / applied_summary / auto-prune / stale check 不在 assertion`
2. **t7 GREEN**: `feat(retro): M0.11.1 t7 — migration script + 4 retro session schema v2`
3. **t8 GREEN**: `feat(agent): M0.11.1 t8 — loom-retro-pm Stage 0 applied_summary lazy build 5 step`
4. **t9 GREEN**: `feat(agent): M0.11.1 t9 — 4 lens に applied_summary_path injection + Read 参照`
5. **t10 GREEN**: `feat(agent): M0.11.1 t10 — loom-retro-aggregator auto-prune logic (ttl + last_used_in hybrid)`
6. **t11 GREEN**: `test: M0.11.1 t11 — applied_summary dry-run test (rollback 前安全網)`
7. **t12 ROLLBACK**: `refactor(agent): M0.11.1 t12 — loom-retro-counter-arguer stale check section 物理削除 (SPEC §3.9.x P4 理想形初例 archive)`
8. **PLAN status update**: `chore(plan): M0.11.1 task t6-t13 done`

---

## 実装 sequence (dev 1 体 sequential、Strategy a)

### Step 1: t13 RED phase (assertion 追加)

`tests/{prefs,retro,agents}_test.sh` に以下 assertion 追加:

**prefs_test.sh**:
- learned_guidance entry に `last_used_in` field 存在 assertion (template + project-prefs example)
- jq で valid + last_used_in が string | null

**retro_test.sh**:
- pending.json schema_version 2 assertion (4 retro session 全て)
- approved finding に applied_in + apply_history field 存在 assertion
- applied_summary.json schema 整合性 assertion (lazy build 結果が SPEC §6.9.7 schema valid)

**agents_test.sh**:
- agents/loom-retro-pm.md Stage 0 に "applied_summary" or "lazy build" 記述存在 assertion
- agents/loom-retro-{pj-judge,process-judge,meta-judge,researcher}.md に "applied_summary_path" or "Read tool" 参照記述存在 assertion
- agents/loom-retro-counter-arguer.md に **"stale finding detection" section 不在** assertion (grep -L で確認)
  - **重要**: t12 物理削除前は assertion fail する、impl 順序として t11 dry-run pass → t12 物理削除 → t13 assertion enable で green 確認
- agents/loom-retro-aggregator.md に "auto-prune" or "ttl_sessions" or "last_used_in" 記述存在 assertion

→ `./tests/run_tests.sh` で fail 確認 → red commit (commit message: `test: M0.11.1 RED — ...`)

### Step 2: t7 GREEN — migration script + 4 retro session schema v2

`tests/migrate_pending_schema.sh` を新設:
- `<project>/.claude-loom/retro/*/pending.json` を glob、各 file を read
- schema_version: 1 (or 不在) なら以下 migrate:
  - 各 finding に applied_in: null (default、approved finding は git log で commit 推定して populate) + apply_history: [] 追加
  - schema_version: 2 に update
- 既存 approved finding (pj-001 / pj-002 (drop) / proc-001 / res-001 / meta-001/002/003 / proc-NEW-1 / proc-NEW-2 / meta-NEW-1) の apply commit を git log + commit message 解析で推定:
  - pj-001 → 300e2cb (Phaser 4 fix)
  - meta-NEW-1 → e4aa0ea (P4 + 7 agent prompt)
  - proc-NEW-1 → a3f3cee (counter-arguer stale check)
  - proc-NEW-2 → fd3c1c3 (M0.11.1 milestone insertion only、apply_type: milestone)
  - record-only (proc-001, meta-003) → null commit, apply_type: record-only
  - meta-002 (.gitignore 対象) → null commit, apply_type: record-only (or pm_note 別途)
- migration 完了後 jq empty で valid 確認

Migration 実行 → 4 retro session pending.json が schema v2 化 → green commit。

### Step 3: t8 GREEN — agents/loom-retro-pm.md Stage 0 applied_summary build

agents/loom-retro-pm.md の Stage 0 section (verdict_evidence 関連記述あれば、その隣) に SPEC §6.9.7 lazy build 5 step を追記:

1. `<project>/.claude-loom/retro/*/pending.json` を glob
2. 各 pending.json から `status: "approved"` + `applied_in: not null` finding 抽出
3. finding ごとに `finding_id` + `origin_retro_id` + summary + apply trace を集約
4. apply_history が rollback entry を含む場合は最新 rollback note を `last_apply_history_entry` に埋め込み
5. zod schema validate → `<project>/.claude-loom/retro/<retro_id>/applied_summary.json` write、warning は log

→ green commit。

### Step 4: t9 GREEN — 4 lens prompt に applied_summary_path injection + Read 参照

`agents/loom-retro-{pj-judge,process-judge,meta-judge,researcher}.md` 各 file に以下 1-2 段落追記:

```markdown
### applied_summary 参照 (M0.11.1 から、Lifecycle Tracking)

retro-pm からの dispatch prompt prefix で `applied_summary_path: <project>/.claude-loom/retro/<retro_id>/applied_summary.json` を受け取る。

Stage 1 で finding 提案前に **必須** で applied_summary を `Read` tool で参照、過去 retro で approved + applied 済 finding を re-up しないこと。proposal が既に反映されとる current state は SPEC / PLAN / agent prompt を grep して確認、stale なら finding 化せず skip。

(meta-judge のみ追記) `last_used_in` audit: 各 active learned_guidance の `last_used_in` を確認、N retro session 連続未使用 (initial threshold = 3) なら "stale guidance" として meta-axis finding 化、user 承認後 deactivate を提案 (auto じゃない、user 主導)。
```

→ green commit。

### Step 5: t10 GREEN — agents/loom-retro-aggregator.md auto-prune logic

agents/loom-retro-aggregator.md の learned_guidance write logic section に以下追記:

```markdown
### learned_guidance auto-prune (M0.11.1 から、SPEC §6.9.4.5 SSoT)

retro 終了時 (action plan 後の最終 step) で以下 logic 実行:

**ttl_sessions main (auto-deactivate)**:
- 各 active learned_guidance を scan
- `retro_session_distance = current_retro_session_count - first_retro_session_index_after_added_at` (retro_session_history から計算)
- `ttl_sessions != null && retro_session_distance >= ttl_sessions` → `active: false` 自動化
- `ttl_sessions: null` (default) は infinite、break compat なし

**last_used_in update (lens 参照時)**:
- 各 lens が dispatch 時に Customization Layer 経由 learned_guidance injection
- 参照された guidance について aggregator が `last_used_in: <current_retro_id>` 更新 (lens は read のみ、aggregator が write 中央集権)

**meta lens stale guidance audit (proposal、auto じゃない)**:
- `current_retro_id - last_used_in > 3` (N session 連続未使用) → meta-axis finding 化候補、user 承認後 deactivate
```

→ green commit。

### Step 6: t11 GREEN — applied_summary dry-run test

`tests/dry_run_applied_summary.sh` 新設:
- 既存 4 retro session pending.json (migration 後) で applied_summary build mechanism を実行
- build 結果 JSON を schema validate (jq + 必要 field 存在 check)
- fixture diff (期待値 fixture file との比較、初回は generate で baseline 作成可)
- pass 確認 → green commit

**重要**: 本 step は **t12 物理削除の前提 = rollback 前安全網**。dry-run test pass しない場合 t12 物理削除を skip、structural mechanism failure として report。

### Step 7: t12 ROLLBACK — counter-arguer stale check section 物理削除

`agents/loom-retro-counter-arguer.md` の以下 section を **物理削除**:
- "### 役割固有：stale finding detection（M3.0 retro proc-NEW-1 起源、interim safety net）"
- 該当 section 全体 (about 28 行)

物理削除後:
- `grep -i "stale" agents/loom-retro-counter-arguer.md` で stale 関連記述 0 件確認
- agents_test.sh の "stale check 不在 assertion" が green 化確認

commit message に **SPEC §3.9.x P4 理想形初例として archive** を明記:
```
refactor(agent): M0.11.1 t12 — loom-retro-counter-arguer stale check section 物理削除 (SPEC §3.9.x P4 理想形初例 archive)

M3.0 retro 2026-05-02-002 で proc-NEW-1 (interim safety net symptomatic
patch) として approve された counter-arguer stale finding detection
section を、M0.11.1 lifecycle tracking architecture (structural 解決) 完成
を受けて物理削除。SPEC §3.9.x P4「症状対処を構造解決後に消滅させる
cleanup loop」の最初の実例として archive 価値最大。

stale 判別能力は applied_summary mechanism (SPEC §6.9.7) で 4 lens 全体に
分散、counter-arguer 単独 stage の symptomatic 注入は不要に。

検証:
- grep -i "stale" agents/loom-retro-counter-arguer.md で stale 関連記述 0 件
- agents_test.sh "stale check 不在 assertion" green
- t11 dry-run test pass 後 (rollback 前安全網確保) の物理削除
- pending.json apply_history に rollback entry 記録 (apply_type: rollback、
  note: "structural M0.11.1 完成、symptomatic patch 物理削除")
```

### Step 8: 全 test rerun + final commit

- `./tests/run_tests.sh` で 12 PASS 維持 + 新 assertion 全 green 確認
- working tree clean
- final report に全 commit_sha 明記、`commit_handoff: dev` (Strategy a)

---

## TDD discipline

`loom-tdd-cycle` skill 必須。

順序:
1. **RED** (Step 1, t13): assertion 追加 → fail 確認 → red commit
2. **GREEN** (Step 2-6, t7+t8+t9+t10+t11): 実装 → assertion green 化 → 各 step ごと commit
3. **ROLLBACK** (Step 7, t12): t11 dry-run test pass 後の意図的削除 → assertion green 化 → commit
4. **REVIEW**: 各 commit batch 終了時に `loom-review` skill で `loom-reviewer` 1 体 dispatch、verdict pass を待つ
   - review tier 案: t7+t8 (migration + retro-pm) → review、t9+t10 (4 lens + aggregator) → review、t11+t12 (dry-run + rollback) → review (3 round)
   - または scope 分散して 1 round に統合する判断は dev 任せ
5. **COMMIT 完遂**: reviewer pass 後、working tree clean まで dev 自身が commit (proc-001 fix 規約)

red commit が green commit より時系列で前にあることを `git log` で確認 (SPEC §3.6.8.6)。

---

## 注意事項

- **Migration 結果は pending.json 群、これは .gitignore 対象**: 既存 4 retro session の pending.json を schema v2 migrate しても git に commit されん。**migration script (tests/migrate_pending_schema.sh) 自体は commit 対象**。dev 完了報告に「migration 後の pending.json 状態 sample」を含めて trace 可能化。
- **t11 dry-run test の fixture file 配置**: `tests/fixtures/applied_summary_expected.json` 等を新設、initial baseline は dev が generate して commit。fixture file は git tracked (`.gitignore` 対象外)。
- **t12 物理削除の確実性**: rollback 前に必ず t11 dry-run test pass を確認。pass しない場合は t12 を skip して PM に escalate (rollback 前安全網)。
- **既存 4 retro session 確認**: `<project>/.claude-loom/retro/` 内に何個 retro session 存在するか dev が `ls` で confirm、3 (2026-04-29-001 + 2026-05-02-001 + 2026-05-02-002) + 古い 1 件 = 計 4 か、それ以外か (古い 1 件は実は 不在の可能性、その場合 3 retro session として処理)。
- **last_used_in update timing**: aggregator の auto-prune logic で扱う、lens は read のみ、retro session 終了時 aggregator が中央集権で write。本 commit batch では aggregator prompt 記述のみ、実 update 動作は M3.1 retro 起動時に observable。
