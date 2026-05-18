# SPEC/PLAN multi-file thinking dogfood design (Stage 2)

- **Date**: 2026-05-17
- **Topic**: M0.X-spec-plan-multi-file (Stage 1) で codify した multi-file 思想を claude-loom 自身の SPEC.md に適用する dogfood migration
- **Status**: brainstorm 完了、implementation plan 待ち
- **Brainstorm session**: ユーザー mogi.k@saze.co.jp との対話 (2026-05-17、Stage 1 PR merge 後)
- **Parent design spec**: [2026-05-17-spec-plan-multi-file-thinking-design.md](2026-05-17-spec-plan-multi-file-thinking-design.md) §8.2 (Stage 2 SSoT)

## 1. Problem statement

Stage 1 で codify した multi-file 思想 (SPEC §3.11) を **claude-loom 自身に適用**する。本 dogfood migration は新思想の最初の実適用テストケースとなり、axis 選定 / SSoT 参照記法 / size threshold 設定の妥当性を retro で検証する。

現状:
- `SPEC.md` = **2954 行** (size threshold 1000 行を **3 倍近く超過**)
- `PLAN.md` = 1589 行 (threshold 1500 行を超過)
- Stage 1 で確立した自動検出 logic (loom-pm size 警告) が trigger する状態

本 design は Stage 2 (SPEC carve のみ) に絞る。M1/M2 milestone 詳細 (584 行) の PLAN 移管は Stage 3 (M0.X-spec-purity-restoration 仮称) で分離。

## 2. Goal

### In scope
- claude-loom `SPEC.md` を master + `spec/<topic 群>.md` へ migration (Mixed 5 topics 採用)
- master SPEC.md の topic index を新設、各 topic file へ pointer 設置
- 各 topic file 内の § 番号を file 内 local に振り直し (file ごと §1 から開始)
- master SPEC.md 内の cross-ref を新 file path 記法へ書き換え
- 各 topic file 内の cross-ref も新 file path 記法で記述
- harness test 拡張 (multi_file_skeleton_test.sh に migration verify 項目追加)
- 完了後 retro で新思想の practical validation

### Out of scope (Stage 3 / 別 milestone)
- M1/M2 milestone 詳細 (584 行) の PLAN/docs/plans 移管
- 既存 agent prompts / retro report 内の `SPEC.md §X` 古記法書き換え (design spec §5.1 SSoT、書き換えない)
- 既存 commit / docs にある `SPEC §X` 引用の retroactive 書き換え

## 3. Architecture

### 3.1. Mixed 5 topics carve (Stage 1 design spec §3.2 axis ガイドライン準拠)

```
SPEC.md (master、~600 行)
├── §1 プロダクト定位
├── §2 スコープ
├── §3.1 4 層構造 (overview のみ、layer 詳細は topic へ)
├── §3.4 設定ファイル一覧 (cross-layer)
├── §3.5 セキュリティモデル (cross-layer)
├── §3.11 Multi-file Spec/Plan 思想 (meta-convention、master 保持)
├── §7 doc 整合性エンジン v1 (M4 future)
├── §8 スラッシュコマンド一覧 (cross-layer)
├── §11 エラーハンドリング方針
├── §12 確定済み技術判断 (SSoT、重要)
├── §13 既知の TBD / 未決事項
├── §14 関連ドキュメント
├── 変更履歴
└── Topic Index (各 topic file への pointer + 責務 1 行)

spec/
├── harness.md (~500 行)
│   ├── §1 Agent Customization Layer (旧 SPEC §3.6.5)
│   ├── §2 Worktree 統合 (旧 SPEC §3.6.6)
│   ├── §3 Coexistence Mode (旧 SPEC §3.6.7)
│   ├── §4 Process Discipline (旧 SPEC §3.6.8)
│   ├── §5 コミット + ブランチ規約 (旧 SPEC §3.8)
│   ├── §6 superpowers Independence (旧 SPEC §3.10)
│   ├── §7 アクター（エージェント）定義 (旧 SPEC §4)
│   └── §8 標準ワークフロー (旧 SPEC §5)
│
├── daemon-and-data.md (~400 行)
│   ├── §1 Lazy Daemon ライフサイクル (旧 SPEC §3.2)
│   ├── §2 中央指令室モデル (旧 SPEC §3.3)
│   ├── §3 WebSocket メッセージスキーマ (旧 SPEC §3.6 main)
│   └── §4 データモデル SQLite (旧 SPEC §6)
│
├── ui-arch.md (~470 行)
│   ├── §1 M3 UI Architecture (旧 SPEC §3.6.9)
│   ├── §2 SSoT cross-check rule (旧 SPEC §3.6.10)
│   ├── §3 UI Smoke Test Skill (旧 SPEC §3.6.11)
│   ├── §4 Design Implementation (旧 SPEC §3.6.12)
│   ├── §5 Ceremony Reduction Trinity Marker (旧 SPEC §3.6.13)
│   ├── §6 UI Redesign Port (旧 SPEC §3.6.14)
│   └── §7 Playwright e2e OS-aware Baseline (旧 SPEC §3.6.15)
│
├── retro-system.md (~300 行)
│   └── §1 Retro 機能 (旧 SPEC §3.9 全部、内部 sub-section は §1.1〜 で local 振り直し)
│
└── install-and-test.md (~250 行)
    ├── §1 プロジェクトライフサイクルと adopt 戦略 (旧 SPEC §3.7)
    ├── §2 配布・インストール (旧 SPEC §9)
    └── §3 テスト戦略 (旧 SPEC §10)
```

### 3.2. master SPEC.md の Topic Index 形式

```markdown
## 15. Topic Index (multi-file mode)

| topic | 責務 | path |
|---|---|---|
| harness | agents / skills / commands / install workflow / process discipline | spec/harness.md |
| daemon-and-data | Lazy daemon arch / WS schema / SQLite data model | spec/daemon-and-data.md |
| ui-arch | M3 UI / smoke / design / redesign / Playwright | spec/ui-arch.md |
| retro-system | retro engine 全機能 | spec/retro-system.md |
| install-and-test | PJ lifecycle / 配布 / testing | spec/install-and-test.md |
```

### 3.3. topic file 内 header pattern (全 topic 共通)

```markdown
# <topic name> (topic spec)

> 本 file は claude-loom SPEC の topic spec。master は [SPEC.md](../SPEC.md)、用語表 / 確定済み技術判断 / SSoT 原則は master を参照。

> § 番号は本 file 内で local。cross-file 参照は `spec/<other-topic>.md §X.Y` 記法 (SPEC §3.11.4 SSoT)。

> 最終更新: 2026-05-17 (M0.X-spec-plan-multi-file-dogfood で master SPEC §X.Y から migration)

## 1. <first section>
...
```

## 4. Migration operation pattern (各 topic で同一)

各 topic carve task で実行する 5 step:

1. **Extract**: master SPEC.md 内の該当 § 範囲を抽出 (line range で sed)
2. **Topic file create**: 上記 header pattern + extracted content を新 topic file へ
3. **§ renumber**: file 内 § を §1 から local 振り直し (`### 3.6.5` → `## 1`、内部 sub-section も連動)
4. **Internal cross-ref rewrite**: file 内 content で他 § への参照を新 file path に書き換え (e.g., 「§6 参照」→「`spec/daemon-and-data.md` §4 参照」)
5. **Master remove + pointer**: master SPEC.md から元 section を削除し、pointer 1 行に置換 (e.g., 「§3.6.5 Agent Customization Layer の詳細は `spec/harness.md` §1 参照」)

## 5. Sequential constraint

各 carve task (t2-t7) が **全て master SPEC.md を modify** するため parallel batch 不可。Stage 1 で codify した「parallel batch 規律」(`planned_files` overlap 検出) で sequential 強制される。

**Approach 1 採用 (sequential carve)**: 各 task で 1 topic carve、PM が status update commit 挟みつつ次へ進む。中間状態の SPEC が壊れにくく、revert 単位も小さい。

**Approach 2 (parallel topic create + single master cut) 不採用 理由**: 中間状態で「topic file は新設されたが master から該当 section がまだ削除されてない」状態が発生、SSoT 違反 (同 content が 2 箇所に存在) の risk。

## 6. SSoT 参照記法の dogfood

Stage 1 で codify した記法 (`spec/<topic>.md §X.Y`) を本 migration で初めて実適用。検証ポイント:
- grep 一発で参照箇所追える: `grep -rn 'spec/harness.md' .` で全 ref 列挙可能
- IDE jumpable: VS Code / Cursor で file path をクリックで topic file へ jump
- agent prompt / retro report が新記法に自然移行できるか (Stage 2 完了後の自然な進化として観察)

## 7. Harness test 拡張

`tests/multi_file_skeleton_test.sh` を拡張、本 migration 完了状態を assertion で固定:

新 check group:
- `skeleton-n`: `spec/` folder + 5 topic file 全存在 (harness.md / daemon-and-data.md / ui-arch.md / retro-system.md / install-and-test.md)
- `skeleton-o`: master SPEC.md に「## 15. Topic Index」セクション存在
- `skeleton-p`: 各 topic file が back-pointer header (`master は [SPEC.md]`) を持つ
- `skeleton-q`: 各 topic file 内 § が §1 から開始 (file 内 local renumber 確認)
- `skeleton-r`: master SPEC.md の `### 3.6.5` / `### 3.2` / `### 3.9` 等の migrated section が pointer 化されとる (元位置に section が残ってない、pointer 1 行に置換済み)

## 8. doc consistency check の実適用

Stage 1 で `docs/DOC_CONSISTENCY_CHECKLIST.md` に追加した multi-file mode 4 項目を本 milestone で初めて実走査:
1. **用語整合性**: 各 topic file の用語が master spec 用語表と一致 (master に用語表が存在しない場合は本 milestone で master に用語表 section 追加 sub-task 化)
2. **cross-reference 健全性**: `spec/X.md` で言及される全 ref が dead link でない (file 存在 + § 存在)
3. **scope 重複**: 同概念が複数 topic file で別記述されてない
4. **master index 整合性**: master SPEC.md の Topic Index が `spec/` 直下 file 一覧と完全一致

## 9. Risks

1. **§ 番号 renumber 時の internal anchor 漏れ**: §3.6.5 の content 内に「§3.6.6 参照」のような近接参照が紛れとる場合、renumber で broken link 化。各 carve task で grep `§[0-9]\.` で全 anchor 抽出 → 整合確認必須
2. **master SPEC.md の sequential 編集 conflict**: t2-t7 全てが master を順次編集、PM の status update commit が間に挟まる。dev は dispatch 受領後に main pull せず branch 最新を確認、merge conflict を最小化
3. **新思想の dogfood validation failure**: 本 migration で新思想の practical 課題が露呈する可能性 (axis 選定の妥当性 / SSoT 参照記法の grep 容易性 / size threshold の妥当性)。完了後の retro で必ず検証、Stage 1 design spec を update する candidate
4. **既存 agent prompts に embedded された `SPEC §3.6.5` のような pointer**: 書き換えないが、master から該当 section が消えとる場合は dead link 状態になる (master に pointer 行が残るため厳密には dead link でなく redirected link)。retro で「pointer-only section の検出 mechanism」提案候補
5. **§7 / §8 のような cross-cutting section を master 保持と判断したが、規模次第で別 topic 化判断**: §7 doc 整合性エンジン v1 が将来 M4 で実装される際、独自 topic (`spec/doc-consistency-engine.md`) 候補。本 Stage 2 では master 保持

## 10. Open questions / TBD

- **用語表 section の master 追加要否**: 現状 master SPEC.md に明示的「用語表」section なし。本 milestone で sub-task として追加するか、Stage 3 で対応するか判断
- **size threshold 値の妥当性検証**: migration 後の master SPEC.md / 各 topic file size を retro で記録、threshold (SPEC 1000 行 / PLAN 1500 行) が現実 PJ で適切か検証
- **agent prompts / retro report の新記法移行**: 本 milestone scope 外だが、Stage 2 完了後の next milestone で「新規記述から新記法採用」を agent prompt 内 mandate に格上げするか判断

## 11. 設計 trade-off まとめ

| trade-off | 採用判断 | 理由 |
|---|---|---|
| 5 topics vs 4/8 topics | Mixed 5 (Stage 1 axis ガイドライン準拠 + 規模感バランス) | retro/ui が独立 substantial、harness/daemon 主柱で十分、install/test 軽量 |
| Stage 2 + Stage 3 分離 vs 一括 | 分離 (本 Stage 2 は carve のみ) | scope 制限、single PR review/revert 単位、新思想 validation 焦点化 |
| sequential vs parallel carve | sequential | master SPEC 編集競合回避、中間状態 SSoT 健全性維持 |
| 既存 SPEC §X 古記法 retroactive 書き換え | 書き換えない | Stage 1 design spec §5.1 SSoT、git 履歴汚染回避、新規記述から段階移行 |
| 用語表 master 追加 | TBD (本 milestone or Stage 3 判断) | doc consistency check で必要だが、現状不在のため追加 scope 判断要 |

## 12. Related

- Parent design spec: [docs/plans/specs/2026-05-17-spec-plan-multi-file-thinking-design.md](2026-05-17-spec-plan-multi-file-thinking-design.md) §8.2 Stage 2 SSoT
- SPEC §3.11 (Stage 1 で確立した思想 SSoT)
- `templates/multi-file-spec-skeleton/` (Stage 1 で確立した雛形、本 migration の reference)
- `tests/multi_file_skeleton_test.sh` (Stage 1 で確立した harness、本 migration で拡張)
- `docs/DOC_CONSISTENCY_CHECKLIST.md` multi-file mode 4 項目 (Stage 1 で確立、本 migration で初実走査)
