# QA Suite 100% Pass Design (2026-05-21)

> **目的**: `docs/design/2026-05-17-m0.18-ui-rework/project/qa-suite.js` (515 case) を D1 厳密で 100% pass 化し、Phase 2 entry の構造的 gate にする。
> **対象 milestone**: M0.19 `test/qa-suite-gap-fill-phase1` + M0.20 `test/qa-suite-ux-edge-coverage`
> **背景**: 2026-05-20 audit (`docs/audit/2026-05-20-qa-suite-coverage.{md,json}`) で全 515 case 中 full 13% / missing 39%、cross-cutting 7 section が 0% coverage と判明。M0.18 で M0.18 scope は 90% 達成。残 416 case (M0.X-original) の Pre-Phase 2 entry gap 解消を本 design でカバー。

---

## 1. Architecture / Overall scope

### 全体構造

```
┌──────────── qa-suite.js (515 case) [SSoT] ─────────────────┐
│  pri:0/1/2 ✕ scenario:any ✕ layers:[ui|wire|backend]      │
└────────────────────────┬───────────────────────────────────┘
                         │ // covers: <case-id> で grep 紐付け
                         ▼
   ┌────── Vitest (ui/test/) ──────┐  ┌── Playwright (ui/e2e/) ──┐
   │ 1118 + 新規 200-300 test       │  │ 43 + 新規 ~50 spec       │
   │ unit / component / integration │  │ e2e / visual regression  │
   └────────────────────────────────┘  └──────────────────────────┘
                         │
                         ▼ CI green = D1 full coverage 維持
   ┌──────── audit script (新規) ──────────────────────────────┐
   │ qa-suite.js → // covers: grep → 515 case 全 ID マッチ確認 │
   │ unmatched ID 1 個でも → CI fail                            │
   └────────────────────────────────────────────────────────────┘
                         │
                         ▼ Phase boundary
   ┌──────── QA Test Matrix.html browser walkthrough ──────────┐
   │ 全 515 case 手動 pass marking → human visual verification │
   └────────────────────────────────────────────────────────────┘
```

### 2 milestone 構成

| milestone | branch | scope | 推定 test 数 | 期間目安 |
|---|---|---|---|---|
| **M0.19** | `test/qa-suite-gap-fill-phase1` | priority 0 missing 14 件 + `// covers:` 注入 (既存 covered ~110 件に) + impl_only 156 件 test 追加 + naming mismatch 解消 | ~100 新規 test + ~110 既存 test に covers 注入 (新規 test は記述時に同時) | 3-4 日 |
| **M0.20** | `test/qa-suite-ux-edge-coverage` | UX 26 / EG 18 / CH 14 / MS 24 / NT 7 / SEC 5 / IN 6 / PH 6 / AR 4 = **110 cross-cutting case** + missing 残 75 (panel/overlay/shell の機能 missing 分) | ~200 新規 test + 一部 impl 追加 | 5-7 日 |

両 milestone 通過で **全 515 case D1 full + walkthrough 全 pass = Phase 2 entry gate 通過**。

### Closure protocol (両 milestone 共通、SPEC §10.4 拡張)

- Layer 0 (新規): `pnpm audit:qa-coverage` 100% pass
- Layer 1: 全 vitest + Playwright pass
- Layer 2.5 PM dogfood smoke
- Layer 8 act CI sim
- **Phase boundary 限定** (M0.20 closure): QA Test Matrix.html 全 515 case walkthrough pass + export JSON commit

### 完成基準 (Phase 2 entry gate)

- 全 515 case が `// covers:` で test と紐付け済 (audit script green)
- 全 vitest + Playwright PASS
- QA Test Matrix.html で全 515 case が `pass` marking
- N/A 24 件すべて「再判定 → pass or 明示 N/A justification」のいずれかに分類

---

## 2. Components / Task breakdown

### M0.19 `test/qa-suite-gap-fill-phase1`

| task | scope | 推定工数 | parallel? |
|---|---|---|---|
| **t1** | `scripts/audit-qa-coverage.sh` 新規作成 + CI workflow 組込 + N/A allowlist (`configs/qa-na-allowlist.txt`) bootstrap | 0.5d | seq (gate) |
| **t2** | 既存 ~141 test file (vitest 86 + playwright 6 + daemon 49) のうち既存 covered case ~110 件 (full 63 + partial 47) に `// covers: <qa-suite-id>` comment 注入 (naming mismatch 同時解消)。section 単位 parallel 可 (RETRO-LC-* → RL-*, CUSTOM-TREE-* → CT-*, etc) | 1.5d | parallel × 5 |
| **t3** | StatusBar unit tests 新規 (SB-LAYOUT-01 / SB-CONN-01 / SB-SCENARIO-01) | 0.3d | parallel |
| **t4** | overall audit 5 件 (OV-CONSOLE-ERROR-01 / OV-ALL-BUTTONS-01 / OV-NO-ALERT-01 / OV-NO-PLACEHOLDER-01 / OV-BACK-FORWARD-01) — 静的 check は lint rule、動的 check は Playwright | 1d | parallel |
| **t5** | RT-BACK-01 (browser back/forward e2e) + RM-NOWRAP-01 (AppShell layout interaction) | 0.5d | parallel |
| **t6** | WT-QUERY-01 + LR-MOUNT-01 + LR-TAB-MERGED-01 + CT-SCHEMA-02 + DS status (audit doc 推奨 priority 4-7) | 0.5d | parallel |
| **t7** | impl_only 156 件 の Vitest test 追加 (section 単位 sub-batch、disjoint 確認後 parallel)。subagent 4-5 体 dispatch | 2d | parallel × 5 |
| **t8** | N/A 24 case 再判定 → 「pass 化可能」「真に N/A (justification 付き)」に分類、N/A allowlist 確定 | 0.3d | seq (review) |
| **t9** | closure: audit script 100% pass + Layer 1-8 + PLAN.md 更新 + tag `m0.19-complete` | 0.2d | seq |

**M0.19 完成基準**: priority 0 missing 14 件 ALL full、impl_only 156 件 ALL full、naming mismatch ALL 解消、N/A 24 件 ALL 分類済 → 全体で 515 - missing_phase2 = ~290 case full coverage 達成

### M0.20 `test/qa-suite-ux-edge-coverage`

| task | scope | 推定工数 | parallel? |
|---|---|---|---|
| **t1** | UX patterns 26 case (load/error/empty/focus/motion 等横断 pattern test) | 1.5d | parallel × 3 |
| **t2** | EG edge cases 18 件 (no-project / no-session / disconnected / migration scenario test) | 1d | parallel × 2 |
| **t3** | CH character visual diversity 14 件 (reviewer 4 + customizer 3 = 7 character の desk / panel layout 整合性) | 1d | parallel × 2 |
| **t4** | MS milestone feature audit 24 件 (milestone 別 feature 動作 verify) | 1.5d | parallel × 3 |
| **t5** | NT notifications 7 + SEC 5 + IN 6 + PH 6 + AR 4 = 28 件 (cross-cutting small batch) | 1d | parallel × 2 |
| **t6** | 残 missing 75 件 (section 内 機能 missing 部分。**impl 追加 + test の両方** が必要、section 単位 subagent dispatch) | 3d | parallel × 4 |
| **t7** | closure + **Phase 2 entry gate verification**: 全 515 case audit script pass + QA Test Matrix.html walkthrough (browser で 515 件 marking) + Layer 1-8 全 pass | 0.5d | seq |

**M0.20 完成基準**: 全 515 case が D1 full、QA Test Matrix.html 全 pass walkthrough 済、Phase 2 entry gate 通過

### Tooling 新規

- `scripts/audit-qa-coverage.sh` — coverage gate (M0.19 t1 で実装)
- `configs/qa-na-allowlist.txt` — N/A 24 件 + justification (M0.19 t8 で確定)
- `.github/workflows/ci.yml` — `audit:qa-coverage` step 追加 (M0.19 t1)
- `package.json` scripts → `"audit:qa-coverage": "bash scripts/audit-qa-coverage.sh"`
- `docs/qa-walkthrough/<date>-m0.20.json` — Phase boundary walkthrough 結果 (M0.20 t7 で commit)

### Subagent dispatch 戦略

- M0.19 t2 (`// covers:` 注入): 5 体 parallel (section 単位 disjoint、planned_files 完全切り分け前提)
- M0.19 t7 (impl_only 156 fill): 5 体 parallel (section 単位)
- M0.20 t6 (missing 75 件 + impl 追加): 4 体 parallel (panel/overlay/shell/cross-cutting 単位)
- **isolation worktree 必須**: 5+ subagent parallel batch では SPEC §3.6.8.6 通り `isolation: "worktree"` parameter 採用

### 期間目安

- M0.19: 3-4 days
- M0.20: 5-7 days
- 合計: **8-11 days** (1.5-2 週間)

---

## 3. Workflow / Data flow

### 平時 (各 task 着手中)

```
developer subagent:
  ├─ qa-suite.js を読む (case ID + steps + expected を理解)
  ├─ TDD で test 書く (Red)
  ├─ test の describe block 頭に // covers: <case-id> 注入
  ├─ impl (Green) → Refactor
  ├─ pnpm audit:qa-coverage  ← 該当 case ID が grep ヒットすることを local 確認
  └─ commit (前提: D1 full = test PASS + // covers grep ヒット + impl 存在)
```

### CI (push / PR 時)

```
.github/workflows/ci.yml:
  ├─ Step A: pnpm install
  ├─ Step B: vitest run            ← 1118 + 新規 PASS 必須
  ├─ Step C: playwright e2e        ← 43 + 新規 PASS 必須
  └─ Step D: pnpm audit:qa-coverage ← 新規 gate、未 covered case 検出で fail
```

`audit:qa-coverage` の挙動:
- `qa-suite.js` 内の全 `id: 'XXX-YY-NN'` を grep extract
- `ui/test/`, `ui/e2e/`, `daemon/test/` 内の `// covers: XXX-YY-NN` を grep extract
- diff → `configs/qa-na-allowlist.txt` (N/A 24 件 + justification) を除外 → 未 covered 列挙
- 未 covered 1 件でも → exit 1 + 該当 ID + section 出力
- orphan covers (case ID 不存在) も検出して fail (typo / リネーム漏れ防止)

### Phase boundary (M1/M2 entry 時)

```
PM milestone closure protocol §10.4 拡張 (M0.20 closure 時に強制):
  ├─ Layer 0 audit:qa-coverage 100% pass    ← M0.19 から導入
  ├─ Layer 1 vitest + playwright 全 PASS
  ├─ Layer 2.5 PM dogfood smoke
  ├─ Layer 8 act CI sim
  └─ Layer X (新規): QA Test Matrix walkthrough  ← M0.20 closure + 以降 Phase boundary 時必須
       ├─ 1. PM が browser で QA Test Matrix.html 開く
       ├─ 2. 全 515 case を手動 walkthrough (~1-2h)
       ├─ 3. fail 検出 → 該当 task を 別 PR で fix → 再 walkthrough
       ├─ 4. 全 pass 達成 → export ボタンで JSON download
       ├─ 5. JSON を docs/qa-walkthrough/<date>-<milestone>.json として commit
       └─ 6. project-prefs.json の last_walkthrough.{milestone, date, total_pass} 更新
```

### N/A 24 case 再判定 process (M0.19 t8)

PM + developer ペアで 24 件レビュー、各 case について:

```
Is this UI/wire/backend testable in CI?
   YES → re-classify → impl + test 追加 (該当 milestone or 次)
   NO  → reason を qa-na-allowlist.txt の該当行 comment に明記
```

`qa-na-allowlist.txt` 行例:

```
SEC-LEAK-PROC-01  # CI 環境では process memory inspection 不可
IN-MIGRATION-02   # install.sh fresh sandbox 実行は別 CI workflow
AR-MARKDOWN-99    # archive markdown を fixture 化できない (rate limit)
```

`configs/qa-na-allowlist.txt` 自体は **D1 violation の例外承認 list** として PR review 必須 (PM + user)。

### Data flow 図

```
qa-suite.js (515 case definitions)
   │
   ├──────► HTML viewer (QA Test Matrix.html)
   │           │
   │           └─► browser walkthrough → JSON export → docs/qa-walkthrough/ commit
   │
   ├──────► audit script (CI gate)
   │           │
   │           └─► // covers: grep ↔ qa-suite.js diff → exit 0/1
   │
   └──────► developer reference (TDD 時に steps/expected 確認)
```

### naming mismatch 解消 path (M0.19 t2)

audit doc が指摘した既存 test prefix vs qa-suite.js ID の grep traceability 破綻：

```typescript
// ui/test/views/retro-lifecycle.test.tsx (例):
describe('RetroView lifecycle', () => {
  // 旧: describe('RETRO-LC-01 lifecycle render')
  // 新:
  // covers: RL-INIT-01, RL-INIT-02
  describe('lifecycle render', () => { ... });
});
```

注入対象 ~141 test file (vitest 86 + playwright 6 + daemon 49) のうち既存 covered case ~110 件、section 単位で 5 subagent parallel dispatch、各 subagent の planned_files は section disjoint で overlap 0 (M0.19 t2 の前提条件)。

---

## 4. Error handling / Edge cases

### qa-suite.js 自体が milestone 中に変更された場合

| event | handling |
|---|---|
| **case 追加** | 新規 case は `pri:` 値で priority 分類、現 milestone scope なら即 covers 注入 + test 追加、scope 外なら N/A allowlist の `pending_milestone:` 行に一時退避 |
| **case 削除** | `qa-suite.js` から削除 + 該当 `// covers:` comment も grep して削除 (audit script は orphan covers も警告対象) |
| **case rename** | rename 時に `// covers:` comment 全件更新 (sed -i で grep-replace、PR 内で diff verify) |
| **pri 値変更** | priority 変更だけで coverage には影響なし、audit script はノータッチ |

**Governance**: `qa-suite.js` 編集は **PM 承認** 必須 (SPEC §3.6.8.3 SPEC.md edit rule に準拠)。developer は qa-suite.js を直接編集せず、変更 proposal を PM に escalate。

### `// covers:` comment の typo / リネーム漏れ

`audit:qa-coverage` script の機能 (M0.19 t1 で実装):

```bash
# Step 5: orphan covers detection
ORPHAN_COVERS=$(comm -13 <(echo "$ALL_IDS" | sort -u) <(echo "$COVERED_IDS" | sort -u))
if [ -n "$ORPHAN_COVERS" ]; then
  echo "ORPHAN // covers: refs (case ID 不存在):"
  echo "$ORPHAN_COVERS"
  exit 1
fi
```

typo (`RL-INIT-99` を `RL-INTI-99` と書いた等) も検出。

### impl_only 156 件で「実は機能が壊れてた」case 発覚

M0.19 t7 (impl_only fill) 中、test 書いて Red → 既存 impl 流しても Green にならない pattern:

1. developer は Red を観測した時点で「**bug 発見**」を final report に明示 (`bug_found: true`, `case_id: <ID>`)
2. PM は impl fix を該当 task に inline で挟むか、別 fix task を切るか判断
3. fix scope が大きすぎる場合 → 該当 case を **M0.19 内に新 task** として追加、milestone period 延伸を user と合意
4. fix が trivial (~30 min) → 同 task 内で fix + test の両方 commit

### missing 件で「実は impl 既に存在してた」case 発覚

M0.20 t6 (missing 75 件 + impl 追加) 中、test 書く前に audit doc の classify が古い (impl_only に再分類すべき) 発覚 pattern:

- audit doc を **手動 update せず**、test 追加で full 化させて結果オーライ
- M0.20 closure 時点で「実際の coverage 分布」を audit script 再 run で snapshot、retro 入力に使う

### parallel subagent batch の file overlap 検出

M0.19 t2 / t7、M0.20 t6 で 4-5 体 parallel dispatch する際、CLAUDE.md「parallel batch claim 規律」+ SPEC §3.6.8.6 通り:

```
PM dispatch 前:
  ├─ 各 task の planned_files HTML comment を PLAN.md から読む
  ├─ overlap 検出 (例: ui/test/views/retro/*.test.tsx を 2 subagent が編集予定)
  ├─ overlap → ① sequential 化 / ② unified annotation でまとめ commit / ③ task 分離 / ④ isolation worktree 採用
  └─ 5+ subagent parallel batch は必ず isolation: "worktree" parameter (SPEC §3.6.8.6 SSoT)
```

### N/A allowlist の維持

`configs/qa-na-allowlist.txt` は **D1 violation の例外承認 list**、安易な肥大化を防ぐ:

- 行追加は PR review 必須 (PM + user 承認)
- 各行末に `# <reason>` justification 必須
- M0.20 closure 後の Phase 2 entry gate で **N/A allowlist 件数が 24 件以下** を維持確認 (24 件は audit 時点の上限、これ以上増えるのは「実装諦め」signal なので user 承認 escalate)

### QA matrix walkthrough fail の severity 分類

Phase boundary walkthrough (M0.20 closure 時) で fail が見つかった時:

| severity | 例 | handling |
|---|---|---|
| **CRITICAL** | 基本 nav 壊れ、core feature 0 動作 | block Phase 2 entry、即 fix task |
| **MAJOR** | minor button 動作不良、layout shift | fix task を M0.20 内に inline 追加、再 walkthrough |
| **MINOR** | text label 微差、color contrast 1px | retro finding に escalate、M0.21+ で fix |
| **DEFER** | 知っとる既知 (M3 で対応予定) | qa-na-allowlist.txt の `pending_milestone:` 行に追加、user 承認 |

PM が severity 判定、user が CRITICAL/MAJOR 確認。MINOR/DEFER の境界判断は PM 裁量。

### CI flake (Playwright visual regression noise)

Linux baseline 環境固有の noise (font hint / antialias) で false positive fail のリスク:

- 1 PR 内で同 spec が 3 回連続 fail → real regression と判定、fix task
- 1-2 回散発 fail → CI re-run で pass 確認、`pixelTolerance` パラメータ調整 (現状 default 値、必要なら spec 単位で緩める)
- 体系的 flake (頻発 + 特定 spec 集中) → retro process-axis lens で `feedback_test_isolation_*` 系 finding 化

### M0.19 → M0.20 間 / 以降の new case 追加

user が「これも audit 対象に入れたい」と new case 追加する pattern:

- PM が `qa-suite.js` 編集承認、新規 case ID 割当
- M0.20 scope に inline 追加 (該当 milestone がカバーするべき範囲なら) or M0.21+ defer
- audit script は新 case を即 missing 扱いするので、CI が fail 化 → forcing function として機能

---

## 5. Testing strategy / Done criteria

### Per-case Done criteria (D1 厳密)

各 case が「pass」と見なされる条件:

| 条件 | 検証手段 |
|---|---|
| **C1** Vitest test 内に `// covers: <case-id>` 注入済 | `audit:qa-coverage` grep ヒット |
| **C2** Vitest or Playwright test が 1 個以上 PASS | CI vitest/playwright 全 green |
| **C3** UI impl 存在 (該当 case が指す path/component が repo に存在) | manual code review (developer self-check) |
| **C4** QA Test Matrix.html で walkthrough pass marking | Phase boundary 時に export JSON で確認 |

- Phase boundary 時 (M0.20 closure 以降): `pass = C1 && C2 && C3 && C4`
- 平時 / minor milestone CI 判定: `pass = C1 && C2 && C3`

N/A 例外: `qa-na-allowlist.txt` に登録された case のみ C1 除外 OK、justification 必須。

### M0.19 closure 条件

1. `pnpm audit:qa-coverage` exit 0 (M0.19 scope の全 case + 既存 covered case が grep ヒット)
2. vitest + Playwright 全 PASS (~1218+ vitest + 50+ Playwright = 1300+ total)
3. naming mismatch 完全解消 (旧 prefix `RETRO-LC-* / CUSTOM-TREE-*` 等が test source から 0 件)
4. N/A allowlist 24 行に justification comment 完備、PM + user 承認済
5. priority 0 missing 14 件 ALL → full
6. impl_only 156 件 ALL → full
7. Layer 1 + 2.5 + 8 verification pass
8. PLAN.md M0.19 task entries `status: done`
9. tag `m0.19-complete`
10. retro 起動提案 (user yes → loom-retro-pm dispatch)

(QA matrix full walkthrough は M0.20 closure で実施、M0.19 は CI gate のみ)

### M0.20 closure 条件 (= Phase 2 entry gate)

1. M0.19 closure 条件 ALL 引き継ぎ + 維持
2. cross-cutting 110 件 (UX/EG/CH/MS/NT/SEC/IN/PH/AR) ALL → full
3. 残 missing 75 件 ALL → impl 追加 + test 追加で full
4. **QA Test Matrix.html walkthrough**: 全 515 case marked pass (export JSON で証跡)
5. JSON を `docs/qa-walkthrough/2026-XX-XX-m0.20.json` として commit
6. `project-prefs.json` の `last_walkthrough.{milestone: "m0.20", date, total_pass: 515}` 更新
7. **Phase 2 entry gate**: SPEC §10.4 全 Layer + Layer X walkthrough pass
8. tag `m0.20-complete` + `phase-2-entry-ready`
9. retro 起動提案

### Regression keeper の継続条件 (Phase 2 以降)

M0.20 以降のすべての milestone:

- `audit:qa-coverage` を CI gate に常時組込 (M0.19 t1 から永続)
- minor milestone (M0.X.Y patch): audit script gate のみ
- **major milestone (M0.X.0 / Phase boundary)**: + QA matrix walkthrough 必須
- new case 追加時の forcing function: qa-suite.js 更新 → 即 audit fail → CI block → 該当 milestone scope に取り込み or N/A allowlist 登録

### 計測指標 (retro 入力 / dashboard 用)

各 milestone closure 時に `docs/audit/<date>-qa-coverage-progress.json` を auto-snapshot:

```json
{
  "snapshot_date": "2026-XX-XX",
  "milestone": "m0.19-complete",
  "total_cases": 515,
  "full": 290,
  "n_a_allowlist": 24,
  "pending_next_milestone": 165,
  "delta_from_previous": { "full": +227, "missing": -227 },
  "audit_script_ci_status": "green"
}
```

memory `project_qa_suite_basis` の延長記録として残し、retro で referencing。

### Anti-pattern (やったら fail)

- test file 作るだけ `// covers:` 注入忘れ → audit script で fail
- test PASS だが impl が空関数 → developer self-review で D1 違反、reviewer reject
- N/A allowlist に justification なしで追加 → PR review で reject
- Phase boundary walkthrough を「時間が無いので skip」 → memory `feedback_100_percent_expectation` 違反
- qa-suite.js を developer が直接編集 → SPEC §3.6.8.3 違反 (PM 承認必須)
- 「impl 一部 missing でも mock test で full にする」 → memory `feedback_mock_only_dogfood_gap` 違反

---

## 6. References

- **SSoT**: `docs/design/2026-05-17-m0.18-ui-rework/project/qa-suite.js` (515 case)
- **Viewer**: `docs/design/2026-05-17-m0.18-ui-rework/project/QA Test Matrix.html`
- **Current audit**: `docs/audit/2026-05-20-qa-suite-coverage.{md,json}`
- **PM workflow**: SPEC §3.6.8 (Implementation phase) + §10.4 (closure protocol)
- **Branch hygiene**: CLAUDE.md "Branch hygiene 規律" + retro 2026-05-04-001
- **Parallel claim**: CLAUDE.md "Parallel batch claim 規律" + retro 2026-05-06-002
- **Dependency audit**: SPEC §3.6.8.8
- **Memory referencing**: `feedback_100_percent_expectation`, `feedback_mock_only_dogfood_gap`, `feedback_aggressive_cleanup`, `project_qa_suite_basis`

## 7. Brainstorming decision log

| Q | 決定 | rationale |
|---|---|---|
| Q1 scope lens | A + B 両方 (UI 実装 + 自動 test 両輪) | user 確認: 両 lens で「散々」 |
| Q2 scope size | S1 (515 全部 100%、N/A も再判定込) | memory `feedback_100_percent_expectation` と整合 |
| Q3 done def | D1 (full + `// covers: <case-id>` 厳密) | audit doc 推奨と一致、grep traceability 完全 |
| Q4 milestone | T1 (2 milestone: `gap-fill-phase1` + `ux-edge-coverage`) | audit doc gap_fill_recommendation 直系、scope manageable |
| Q5 regression | R3 (CI 自動化主軸 + Phase boundary walkthrough hybrid) | CI gate + dogfood 規律の二重 safety、memory `feedback_mock_only_dogfood_gap` 構造的解決 |
| Q6 walkthrough state | b1 (`docs/qa-walkthrough/<date>.json` commit) | PR review に証跡残る、後続 milestone で diff 検出可能 |

---

## 8. Next step

本 design 承認後、`writing-plans` skill を起動して以下 2 plan を作成:

- `docs/plans/2026-05-21-m0.19-qa-gap-fill.md`
- `docs/plans/2026-05-21-m0.20-qa-ux-edge.md`

各 plan は task 単位 5 field (Goal / Files / Spec ref / Integrity check / Commit prefix) + planned_files HTML comment 完備。
