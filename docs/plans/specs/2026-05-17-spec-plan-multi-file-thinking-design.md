# SPEC/PLAN multi-file thinking design

- **Date**: 2026-05-17
- **Topic**: claude-loom が promote する spec/plan 駆動の構造規約に「PJ 規模に応じて multi-file 化する」思想を組み込む
- **Status**: brainstorm 完了、implementation plan 待ち
- **Brainstorm session**: ユーザー mogi.k@saze.co.jp との対話 (2026-05-17)

## 1. Problem statement

claude-loom が提供する spec/plan 駆動開発において、生成・管理する SPEC / PLAN を 1 ファイルに突っ込み続けると下記 4 つの痛みが同時発生する:

1. **LLM context 食い** — agent が SPEC.md / PLAN.md を読むだけで context を大量消費
2. **人間の読みづらさ** — GitHub で開いた時に scroll 地獄、navigability 低下
3. **編集衝突 / merge conflict** — 並列 PR で同 file 編集が頻発
4. **doc 整合性 check が辛い** — SPEC §X を変えた時の影響範囲確認が困難、diff scope が広い

実際 claude-loom 自身の現状で症状確認済み:
- `SPEC.md` = 2865 行 (monolithic、M1/M2 milestone 詳細約 600 行も混入)
- `PLAN.md` = 1550 行 (既に `docs/plans/*.md` への 2-tier 分割は持っとるが master 自身も伸び続けとる)

これは claude-loom 自身のリポ整理だけの話ではなく、**claude-loom が promote する spec/plan 構造の設計思想** として codify すべき問題。

## 2. Goal

claude-loom が提供する spec/plan 駆動開発の **構造規約として multi-file 思想を組み込む**:

- PJ 規模・要件に応じて適応的に single-file / multi-file を選択
- 画一 default は引かず、PM agent が brainstorm で user と決定
- 後発の肥大化は size threshold で trigger
- SSoT 原則を維持 (どの記述がどの file の真実か明確)

**non-goals**:
- 本 milestone で claude-loom 自身の SPEC.md 2865 行を解体することは含まん (思想 codify を先行、自リポ migration は次 milestone)
- 既存 PR の参照記法 (`SPEC.md §X`) を一斉書き換えする migration は含まん (新規記述から段階的適用)

## 3. Architecture

### 3.1. SPEC 側構造

**single-file mode** (small PJ default):
```
SPEC.md      ← 全部 1 ファイル
```

**multi-file mode** (PJ 規模で発火):
```
SPEC.md      ← master spec
spec/
├── <topic-a>.md
├── <topic-b>.md
└── ...
```

**master spec の責務**:
- プロダクト定位 / scope
- SSoT 原則
- 用語表 (cross-file integrity の anchor)
- 確定済み技術判断
- 関連ドキュメント
- 変更履歴
- topic への index (各 topic file の責務 1 行 + path)

**topic file の責務**:
- 1 axis 1 file (混在禁止)
- 自身の §1 から番号開始 (file 内 local)
- 他 topic への参照は file path + § 番号で明示

### 3.2. axis ガイドライン (CLAUDE.md / SPEC §3.10 周辺に codify)

PM が brainstorm で参考にする典型 axis セット (固定 default ではない):

| axis 種別 | 例 | 適用 PJ 傾向 |
|---|---|---|
| **layer-based** | backend / frontend / db / infra | UI と server がはっきり分離した中規模 PJ |
| **domain-based** | auth / billing / search / reports | DDD 寄り、業務領域が独立した大規模 PJ |
| **feature-group** | chat / file / dashboard | feature 中心の SaaS |
| **横断 axis** | api / external-integration / shared-types | 上記いずれかと組み合わせ |

複数 axis 併用可 (e.g., layer-based + 横断 api file)。**PM agent が brainstorm で user と axis を decide**、ガイドラインは判断材料に留まる。

### 3.3. PLAN 側構造

**single milestone-detail mode** (現状):
```
PLAN.md                              ← master roadmap
docs/plans/YYYY-MM-DD-mN-<topic>.md  ← 各 milestone 詳細
```

**Phase-split mode** (大規模 PJ、master roadmap が肥大化):
```
PLAN.md                              ← top-level index: Phase 一覧 + 現在地
docs/plans/
├── PLAN-phase-A.md                  ← Phase A の milestone 列
├── PLAN-phase-B.md
└── _milestones/
    └── YYYY-MM-DD-mN-<topic>/
        ├── index.md                  ← milestone master: 依存関係 + 完了条件
        ├── backend.md
        ├── frontend.md
        └── db.md
```

**milestone 内 axis 分割は opt-in**: 通常は 1 file (現状の `docs/plans/*.md`)、大規模 milestone のみ folder 化。PM が milestone planning で user 確認。

### 3.4. 3 mode 共存と自然 promotion

| mode | SPEC | PLAN | 想定 PJ 規模 |
|---|---|---|---|
| **1. minimal** | `SPEC.md` 単独 | `PLAN.md` + `docs/plans/*.md` | 小規模 (個人 PJ、検証 PJ) |
| **2. spec-split** | master + `spec/` | `PLAN.md` + `docs/plans/*.md` | 中規模 (アーキテクチャ層が複数) |
| **3. full split** | master + `spec/` | top-level index + Phase-split + milestone-folder | 大規模 (多 Phase / 多領域 PJ) |

PJ 成長に従って `1 → 2 → 3` へ自然 promotion。逆方向 demotion は通常起きん。

## 4. Triggering mechanism

### 4.1. 初発 (brainstorm 時の判定)

`/loom-spec` の brainstorm phase で PM が PJ scope を user と棚卸し:
- 領域数 (DDD 的 bounded context)
- アクター数
- アーキテクチャ層 (UI / API / DB / infra)
- external integration 数
- 想定 LoC オーダー

PM が「single-file / multi-file どっち?」を user 確認。multi-file 採用なら axis ガイドライン (§3.2) を提示し、PM と user で axis を決定。

### 4.2. 後発 (size warning)

master spec / master plan が size threshold 超え → PM が「分割提案」を surface:
- **default threshold**: `SPEC.md` 1000 行 / `PLAN.md` 1500 行
- **project-prefs.json で override 可**: `rules.spec_split_threshold` / `rules.plan_split_threshold`
- **自動分割は禁止**: 「PM 提案 → user 確認」が原則
- **検出箇所**:
  - PM agent の `SessionStart` 系 hook (project 開始時の health check)
  - `/loom-spec` / `/loom-write-plan` 実行時の前処理

### 4.3. demotion なし

一度 multi-file へ promote した PJ を single-file へ戻す操作は仕組み化しない。手動で merge 可能だが、PM agent は提案しない (思想として「分割後に再統合すべき強い理由は通常ない」)。

## 5. SSoT reference syntax

| mode | 参照記法 | 例 |
|---|---|---|
| single-file | `SPEC.md §X.Y` (現行) | `SPEC.md §3.2` |
| multi-file master | `SPEC.md §X.Y` (現行) | `SPEC.md §1.1` (定位) |
| multi-file topic | `spec/<topic>.md §X.Y` | `spec/architecture.md §3.2` |

**ルール**:
- § 番号は topic file 内で local に振り直し (各 file が §1 から開始、global 番号体系は引かない)
- master spec の用語表が cross-file integrity の **anchor**
- grep 一発で参照箇所追える (`grep -rn 'spec/architecture.md' .`)
- agent prompt / retro report / commit message 全てで同記法を使う

### 5.1. 既存記法との互換

claude-loom 自身が将来 multi-file 化した時、既存 commit / retro report に残る `SPEC.md §X` 記法は **書き換えない** (git 履歴汚染を避ける)。新規記述から段階的に新記法へ。

## 6. doc consistency check 拡張

### 6.1. single-file mode

現状の `docs/DOC_CONSISTENCY_CHECKLIST.md` 手作業のまま。

### 6.2. multi-file mode (新規 check 項目)

1. **用語整合性**: 各 topic file の用語が master spec 用語表と一致してるか
2. **cross-reference 健全性**: `spec/X.md` で言及される `spec/Y.md` が存在し、§ 番号が現存してるか (broken link 検出)
3. **scope 重複**: 同概念が複数 topic file で別記述されてないか (SSoT 単一性 check)
4. **master index 整合性**: master `SPEC.md` の index が `spec/` 直下 file 一覧と一致してるか

M4 の doc 整合性エンジン v1 (SPEC §7) 候補。手作業期間は `docs/DOC_CONSISTENCY_CHECKLIST.md` に追記。

## 7. Template (新規 PJ 配布)

```
templates/
├── SPEC.md                          ← single-file 用 (現行維持)
└── multi-file-spec-skeleton/        ← multi-file 用 (新規)
    ├── SPEC.md                       ← master 雛形 (定位 / scope / SSoT 原則 / 用語表 / index sample)
    └── spec/
        └── _sample-topic.md          ← topic file 雛形 (見出し構造 / cross-ref pattern)
```

PM が brainstorm 結果に応じて、`SPEC.md` 単独 or `multi-file-spec-skeleton/` 一式を carve して project へ配布。

## 8. claude-loom 自身の migration

**2 段階分離**:

### 8.1. Stage 1: 思想 codify (本 milestone)

本設計書で定義した思想・機構を下記 file に組み込む:
- `CLAUDE.md` (ファイル配置規約 / 主要ドキュメント参照)
- `SPEC.md §3.10` 周辺 (思想記述 + axis ガイドライン)
- `agents/loom-pm.md` (spec phase / plan phase で multi-file 判定 step)
- `commands/loom-spec.md` (brainstorm で multi-file 判定 prompt)
- `skills/loom-write-plan.md` (PLAN Phase 分割 + milestone 内 axis 分割)
- `templates/SPEC.md` + `templates/multi-file-spec-skeleton/` (雛形拡充)
- `docs/DOC_CONSISTENCY_CHECKLIST.md` (multi-file mode check 項目)
- `PLAN.md` (本 milestone + 次 milestone エントリ追加)

claude-loom 自身の現 `SPEC.md` 2865 行は **触らん**。

### 8.2. Stage 2: claude-loom 自身の dogfood migration (次 milestone)

新思想を自リポに適用:
- PM brainstorm で claude-loom の axis を decide (layer-based / domain-based / 横断 混合になる見込み)
- `SPEC.md` 解体 → master + `spec/topic 群` へ移管
- M1/M2 milestone 詳細 (現 SPEC.md 行 1846〜2435) を PLAN 側へ移管
- 既存参照 (agent prompts 等) は **書き換えない** (§5.1 既存記法との互換)、新規記述から新記法

**分離の理由**:
- 「思想 codify」と「2865 行解体」は scope と risk が違う
- 1 PR に混ぜると review が辛い + revert 単位が巨大化
- migration milestone が **新思想の最初の dogfood テストケース** になる (規律の自己 verification、retro で skill 調整可能)

## 9. 影響範囲 (must-update file 一覧、Stage 1 scope)

| file | 変更内容 |
|---|---|
| `CLAUDE.md` | 「ファイル配置規約」「主要ドキュメント参照」に multi-file pattern 追記 |
| `SPEC.md §3.10` 周辺 | 思想記述 + axis ガイドライン |
| `agents/loom-pm.md` | spec phase で multi-file 判定 step + size threshold 警告 logic |
| `commands/loom-spec.md` | brainstorm で multi-file 判定 prompt |
| `skills/loom-write-plan.md` | PLAN Phase 分割 + milestone 内 axis 分割サポート |
| `templates/SPEC.md` | 雛形維持 (single-file 用) |
| `templates/multi-file-spec-skeleton/` (新規) | master + spec/_sample-topic.md |
| `docs/DOC_CONSISTENCY_CHECKLIST.md` | multi-file mode check 項目追加 |
| `PLAN.md` | Stage 1 milestone + Stage 2 milestone エントリ |

## 10. Open questions / TBD

- **size threshold 具体値の妥当性**: SPEC 1000 行 / PLAN 1500 行は経験則ベース、運用後 retro で調整
- **project-prefs.json 拡張**: `rules.spec_split_threshold` / `rules.plan_split_threshold` を追加するか、別 namespace (`rules.doc_split.*`) にするか
- **doc 整合性エンジン v1 (M4) との接続**: multi-file mode の cross-file check を M4 scope に組み込むタイミング
- **超大規模 PJ での `spec/` folder 内さらなる nesting**: spec/backend/auth.md / billing.md など、3-tier 対応は YAGNI で本設計では除外、必要になったら別 brainstorm

## 11. 設計 trade-off まとめ

| trade-off | 採用判断 | 理由 |
|---|---|---|
| 画一 default vs 適応的 | 適応的 (PM brainstorm 判断) | PJ 規模差が大きい、画一は小規模で過剰 |
| axis 固定 vs ガイドライン | ガイドラインのみ codify | PJ 性質で最適 axis 違う、固定は judgment を奪う |
| 参照記法: file+§ vs tag | file path + § | grep 容易、IDE jumpable、現行記法と連続性 |
| size 自動分割 vs 提案 | PM 提案 → user 確認 | 自動は user judgment を奪う、SSoT 整合の最終判断は人 |
| Stage 1+2 一括 vs 分離 | 分離 | review / revert 単位、Stage 2 が dogfood テストケース |

## 12. Related

- `SPEC.md §3.10` (skill mandate / suggest 区別)
- `SPEC.md §3.6.8.8` (dependency audit 規律)
- `CLAUDE.md` (ファイル配置規約 / 主要ドキュメント参照)
- `agents/loom-pm.md`
- `commands/loom-spec.md`
- `skills/loom-write-plan.md`
