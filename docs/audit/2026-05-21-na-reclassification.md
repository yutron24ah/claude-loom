# N/A Case Reclassification (2026-05-21)

> **Task**: m0.19-t8 — N/A 24 case 再判定 + allowlist 確定 (draft mode、PM 承認待ち)
> **Source**: `docs/audit/2026-05-20-qa-suite-coverage.{md,json}` + `docs/design/2026-05-17-m0.18-ui-rework/project/qa-suite.js`
> **Branch**: `test/qa-suite-gap-fill-phase1` (HEAD: 5004fe6)
> **Status**: DRAFT — PM + user 承認後に `configs/qa-na-allowlist.txt` を正式 commit

---

## Background

初版 audit (2026-05-20) の `coverage_distribution.n_a = 24` という値は auditor による implicit 推定値であり、
`section_summary` 内の明示 N/A 集計は 9 件 (security:2 + install:2 + spirit_m0_18:1 + retro_lifecycle_m0_18:3 + admin_recon_m0_18:1) にとどまった。

本 reclassification では現行 audit script (`scripts/audit-qa-coverage.sh`) が出力する **263 missing cases** を対象に、
「CI 環境内で物理的に reproduction 不能か」を strict に判定する。

**Judgment criteria (strict)**:

| 基準 | 分類 |
|---|---|
| CI 環境内で reproduction 物理的不能 (OS state / human judgment / external process 依存) | `true_na` |
| 将来 milestone で対応予定 (M0.20/M0.21 scope) | `testable` + `pending_milestone:` marker |
| daemon/test で扱える backend-only case | `testable` (daemon integration test) |
| Playwright / Vitest で assertion 可能 | `testable` |

---

## N/A Candidates Identified

The following cases were identified from the 263 missing list as potential N/A:

1. Cases from sections with n_a > 0 in section_summary (security:2, install:2, retro_lifecycle_m0_18:3, admin_recon_m0_18:1 — now covered via t7e, spirit_m0_18:1 — now covered)
2. Cases with qa-suite.js `layers: ['backend']` only
3. Cases requiring physical OS state, network inspection, or subjective human evaluation

---

## Reclassification Table

| id | original_section | new_classification | reason |
|----|------------------|--------------------|--------|
| SEC-BIND-01 | security | true_na | steps: `ss/netstat で listen 確認` (OS-level network inspection) + `別 host から curl 試行` (external host access) — CI sandbox では物理的に別 host アクセス不可。daemon が 127.0.0.1 のみ bind することは daemon コード審査 (static analysis) で確認可能だが、runtime listen 確認は CI ネットワーク分離環境では不能。 |
| SEC-TOKEN-01 | security | testable | `curl 127.0.0.1:5757/projects (token なし)` → 401/403 — daemon/test の統合テストで再現可能。daemon を test mode で起動し HTTP request を発行するだけ。M0.20 t5 scope (SEC section 5件)。pending_milestone: m0.20 |
| SEC-TOKEN-WRONG-01 | security | testable | SEC-TOKEN-01 と同様、daemon/test で fake token を inject して 401 確認可能。M0.20 t5 scope。pending_milestone: m0.20 |
| SEC-TOKEN-FILE-01 | security | testable | `stat で確認` — daemon 起動後に `~/.claude-loom/daemon-token` の chmod を Node.js `fs.statSync().mode` で確認可能。daemon/test で実施。M0.20 t5 scope。pending_milestone: m0.20 |
| SEC-XSS-01 | security | testable | `<script>alert(1)</script>` を PM message に入力し、画面に text として表示されることを Playwright DOM assertion で確認可能。M0.20 t5 scope。pending_milestone: m0.20 |
| SEC-DEV-MODE-01 | security | testable | `curl /mode` → `{"mode": "prod"}` — daemon/test で GET /mode endpoint を叩くだけ。既に endpoint 実装済。M0.20 t5 scope。pending_milestone: m0.20 |
| SEC-DEV-CHECK-01 | security | testable | prod daemon 稼働中に `pnpm dev` pre-flight が止める — daemon/test で `/mode` probe を mock して pre-flight script の exit code を確認可能。M0.20 t5 scope。pending_milestone: m0.20 |
| SEC-MOCK-PROD-01 | security | testable | `?mock=active` クエリが prod build で無視される — Playwright で `?mock=active` URL で開き、real WS data が使われることを WS connection 観察で確認可能。M0.20 t5 scope。pending_milestone: m0.20 |
| IN-FRESH-01 | install | true_na | pre: `clean home dir` (fresh OS state) が必須。標準 CI では `~/.claude/` に既存設定が存在し得る。isolated Docker container per-test で解決可能だが、M0.19 scope では CI workflow 追加が必要 (= 追加 CI job で対応、M0.20 t6 scope に defer)。現時点は CI 環境内で物理的に保証不能。 |
| IN-CLAUDE-HOME-01 | install | testable | `CLAUDE_HOME=/x ./install.sh` — bash test で tmp dir を CLAUDE_HOME に設定して実行可能 (tests/run_tests.sh 形式と同様)。M0.20 t6 scope。pending_milestone: m0.20 |
| IN-NO-BUILD-01 | install | testable | `LOOM_NO_BUILD=1 ./install.sh` — bash test でフラグを設定して install.sh を実行、pnpm build が skip されたことを確認可能。M0.20 t6 scope。pending_milestone: m0.20 |
| IN-RE-INSTALL-01 | install | testable | tmp dir に 1回 install 後にもう一度実行して idempotent 確認 — bash test で実施可能。M0.20 t6 scope。pending_milestone: m0.20 |
| IN-UN-CONFIRM-01 | install | testable | `./uninstall.sh` の確認プロンプト + symlink 削除 — bash test で yes を pipe して確認可能。M0.20 t6 scope。pending_milestone: m0.20 |
| IN-UN-PURGE-01 | install | testable | `--yes --purge-state` で `.claude-loom/` 削除 — bash test で tmp state dir + purge flag 確認可能。M0.20 t6 scope。pending_milestone: m0.20 |
| IN-UN-PRESERVE-01 | install | testable | デフォルト uninstall で state 保持 — bash test で retro/personality fixture を tmp dir に置き、uninstall 後に残存確認可能。M0.20 t6 scope。pending_milestone: m0.20 |
| PH-PARALLEL-VISIBLE-01 | philosophy | testable | `複数 desk が同時に busy 表示` — Playwright + mock active scenario で複数 agent が busy な fixture を注入し、複数 desk の busy クラス存在を DOM assertion で確認可能。M0.20 t1 scope (UX patterns)。pending_milestone: m0.20 |
| PH-EMOTIONAL-01 | philosophy | testable | `scenario=idle で寝てる絵` — Playwright/Vitest で scenario=idle fixture の DOM に sleeping/idle 演出要素が存在するか確認可能。M0.20 t1 scope。pending_milestone: m0.20 |
| PH-WATCHABLE-01 | philosophy | true_na | steps: `動作を 5分間眺める` / expected: `視線が固定されない (適度な動き)` / `flicker しない` — 5分間の連続人間観察と主観的 UX 評価は automated test で代替不能。flicker 検出は Playwright animation frame 計測で一部可能だが "視線が固定されない" という subjective criterion は定量化不能。 |
| PH-CHARACTER-LOVE-01 | philosophy | true_na | steps: `1日使った感想` / expected: `自分の agent への愛着が芽生える` — 1日継続使用後の感情的 attachment は human subjective evaluation にのみ属し、CI automated test で検証不能。 |
| PH-PIXEL-WORLD-01 | philosophy | testable | `全画面巡回` → Room 世界観の一貫性 — Playwright visual regression (screenshot diff) + DOM class naming convention check で Gantt/Plan/Consistency が room-aesthetic class を持つことを確認可能。M0.20 t1 scope。pending_milestone: m0.20 |
| PH-FLOW-VISIBLE-01 | philosophy | testable | `今どのフェーズか分かる` (spec→plan→TDD→review→retro phase indicator) — Playwright で各ビューの phase indicator 要素存在と active state を確認可能。M0.20 t1 scope。pending_milestone: m0.20 |
| PH-DOC-DRIFT-01 | philosophy | testable | `doc 整合性自動検出が機能` (toast + badge) — Playwright + consistency-live mock fixture でトースト表示を確認可能 (既存 consistency tests の extension)。M0.20 t1 scope。pending_milestone: m0.20 |
| PH-TDD-VISIBLE-01 | philosophy | testable | `RED/GREEN/REFACTOR フェーズが見える` — Playwright で agent status が TDD phase tag を持つ場合の nameplate DOM assertion 可能。M0.20 t1 scope。pending_milestone: m0.20 |
| RL-PSUM-02 | retro_lifecycle_m0_18 | testable | `layers: ['backend']`; aggregator が `re_evaluated_in` を `origin retro の pending.json に back-fill` するのは daemon backend の retro aggregator 処理。`daemon/test/` で aggregator mock を使った unit test として実施可能。ただし aggregator は loom-retro-pm subagent (Claude Code process) であり、その file write を daemon から直接テストするには mock が必要。M0.20 t5 scope。pending_milestone: m0.20 |

---

## Summary

| classification | count | case IDs |
|---|---|---|
| **true_na** | **4** | SEC-BIND-01, IN-FRESH-01, PH-WATCHABLE-01, PH-CHARACTER-LOVE-01 |
| **testable** (pending_milestone: m0.20) | **20** | SEC-TOKEN-01, SEC-TOKEN-WRONG-01, SEC-TOKEN-FILE-01, SEC-XSS-01, SEC-DEV-MODE-01, SEC-DEV-CHECK-01, SEC-MOCK-PROD-01, IN-CLAUDE-HOME-01, IN-NO-BUILD-01, IN-RE-INSTALL-01, IN-UN-CONFIRM-01, IN-UN-PURGE-01, IN-UN-PRESERVE-01, PH-PARALLEL-VISIBLE-01, PH-EMOTIONAL-01, PH-PIXEL-WORLD-01, PH-FLOW-VISIBLE-01, PH-DOC-DRIFT-01, PH-TDD-VISIBLE-01, RL-PSUM-02 |

**true_na 件数: 4 (≤ 10 の理想内、≤ 24 の上限内)**

---

## Discrepancy from original "24 N/A" count

初版 audit の `coverage_distribution.n_a = 24` と本 reclassification の `true_na = 4` の差異:

| 差異 | 説明 |
|---|---|
| AR-TRPC-01 / AR-OUT-01 / AR-OUT-02 | t7e (M0.19) で daemon/test に実際の backend test を追加、全件 covered 化済。N/A 不要。 |
| RL-* 3件 (retro_lifecycle_m0_18) | RL-PSUM-02 のみ backend-only だが daemon/test で testable。RL-ADM-TOGGLE-01 / RL-ADM-RECON-02 は `layers: ['ui']` で UI test 可能 (既に partial coverage)。 |
| spirit_m0_18 1件 | t2b の // covers: 注入により全 SP-* covered 化済。 |
| admin_recon_m0_18 1件 | t7e で AR-TRPC-01 を covered。 |
| SEC group 2件 → 1件 | SEC-TOKEN-01 は daemon/test で testable と再判定。SEC-BIND-01 のみ true_na。 |
| IN group 2件 → 1件 | IN-FRESH-01 のみ fresh OS state 要件で true_na。他 IN-* は bash test で testable と再判定。 |
| 初版が implicit に N/A とした backend cases | AR-OUT-01/02 等は実は daemon/test で testable。strict N/A 基準で除外。 |

---

## true_na 件の justification

### SEC-BIND-01

**原因**: steps が `ss/netstat で listen 確認` (OS-level binary) + `別 host から curl 試行` (外部 host ネットワーク分離) を必要とする。
CI sandbox は同一 host 内での 127.0.0.1 access は可能だが、「外部 host からのアクセス試行」は物理的に別マシンまたは Docker network 分離が必要。
daemon の bind address 設定は static code review (config.ts の host: '127.0.0.1') で確認可能だが、runtime listen confirmation はCI 環境制約。

**代替検証**: `daemon/src/config.ts` に `host: '127.0.0.1'` の存在を lint/grep test で確認することは可能 (M0.20 static check scope)。ただし runtime behavior verification は N/A。

### IN-FRESH-01

**原因**: pre: `clean home dir` が必須。標準 CI (GitHub Actions) では `~/.claude/` に Claude Code の既存設定が存在し、fresh state を保証するには runner 環境の完全 isolation (Docker container per job) が必要。これは M0.19 scope では CI workflow 変更が必要であり、dedicated sandbox CI job として M0.20 t6 で対応予定。

### PH-WATCHABLE-01

**原因**: steps: `動作を 5分間眺める` / expected: `視線が固定されない (適度な動き)`, `flicker しない`, `何が起きてるか視線移動で分かる` — これらは定量的 assertion に変換不能な subjective UX experience。5分間の continuous human observation が必要条件。Playwright animation frame sampling は可能だが "視線が固定されない" という criterion は human judge のみが評価可能。

### PH-CHARACTER-LOVE-01

**原因**: steps: `1日使った感想` / expected: `13体を区別できる`, `自分の agentへの愛着が芽生える` — 継続使用後の emotional attachment は human affective response であり、任意の CI assertion では代替不能。definition が human longitudinal study を前提としている。

---

## Notes for allowlist consumers

- `configs/qa-na-allowlist.txt` に登録する 4 件は CI の `audit:qa-coverage` が `missing` から除外する
- 行追加は PR review 必須 (PM + user 承認)
- 各行末の `# <reason>` は必須 (audit script が読み取る訳ではないが、PR review 証跡として)
- `true_na` 件数が 24 を超えた場合は user 承認 escalate (design.md §4)
- 現在の true_na 4件はこの threshold を大幅に下回る

---

## M0.20 scope markers (testable cases)

以下 20 件は N/A allowlist に登録しない。M0.20 各 task で covered 化する:

| milestone task | cases |
|---|---|
| M0.20 t5 (SEC 5件 + NT + IN + PH + AR) | SEC-TOKEN-01, SEC-TOKEN-WRONG-01, SEC-TOKEN-FILE-01, SEC-XSS-01, SEC-DEV-MODE-01, SEC-DEV-CHECK-01, SEC-MOCK-PROD-01, RL-PSUM-02 |
| M0.20 t6 (install harness tests) | IN-CLAUDE-HOME-01, IN-NO-BUILD-01, IN-RE-INSTALL-01, IN-UN-CONFIRM-01, IN-UN-PURGE-01, IN-UN-PRESERVE-01 |
| M0.20 t1 (UX patterns) | PH-PARALLEL-VISIBLE-01, PH-EMOTIONAL-01, PH-PIXEL-WORLD-01, PH-FLOW-VISIBLE-01, PH-DOC-DRIFT-01, PH-TDD-VISIBLE-01 |

---

*Authored by: loom-developer (dev-1 slot, m0.19-t8)*
*Date: 2026-05-21*
*Status: DRAFT — awaiting PM + user approval before git commit*
