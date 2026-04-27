---
name: loom-tdd-cycle
description: Strict TDD discipline for claude-loom developers. Activate when implementing any feature or bug fix in a claude-loom-managed project. Provides the canonical Red→Green→Refactor→Review cycle that loom-developer agents follow.
---

# loom-tdd-cycle

claude-loom の開発者が **どんな小さな変更でも** 守る TDD ループ。`loom-developer` agent definition の中核ワークフローを skill 化したもの。implementor を兼ねる subagent はこれに従う。

## The Cycle (MUST follow exactly)

各実装単位で：

### 1. Read
- `SPEC.md` / `PLAN.md` / `CLAUDE.md` の関連箇所を読む
- task の受入条件を確認

### 2. Verbalize
1〜2 文で「成功とは何か」を声に出す（書く）。

### 3. Red — Write the failing test FIRST
- 該当する `tests/` 配下に test を書く
- `./tests/run_tests.sh <filter>` で実行
- **必ず FAIL を確認**。偶然 PASS したら test が間違ってる → 書き直し。

### 4. Green — Minimal implementation
- 最小限のコードで test を PASS させる
- 「過剰な抽象化」「将来のための拡張ポイント」を書かない
- `./tests/run_tests.sh <filter>` で PASS を確認

### 5. Refactor
- コードが汚いと感じたら整える
- リファクタ毎にテストを再実行

### 6. Review (dispatch reviewer per review_mode)
完了報告の前に **必ず** review_mode を判定して reviewer を dispatch：

- review_mode = `"single"`（default）→ `loom-reviewer` を **1 体** dispatch（順次 3 観点を回し、進捗テキスト出力）。詳細は `loom-review` skill 参照
- review_mode = `"trio"`（opt-in、critical path）→ `loom-{code,security,test}-reviewer` を **3 体並列** dispatch。詳細は `loom-review-trio` skill 参照

review_mode 判定順序: `[loom-meta]` prefix → `.claude-loom/project.json` の `rules.review_mode` → default `"single"`（詳細は `agents/loom-developer.md` Step 8）。

### 7. Aggregate findings
- いずれかの reviewer が `verdict: needs_fix` → fix → step 6 に戻って再 dispatch（同じ mode で）
- 全 reviewer verdict が `pass` → step 8 へ

### 8. Commit
- プロジェクトの commit prefix 規約（`CLAUDE.md`）に従う
- 1 機能 = 1 commit

### 9. Report
- PM (or orchestrator) に：何を作ったか / 変更したファイルパス / test 件数 / commit SHA を返す

## 守るべき原則

- **失敗する test なしの実装は禁止**（"後でテスト追加" は永久に来ない）
- **test 失敗のままコミット禁止**
- **review pass なしのコミット禁止**（single mode = 1 verdict、trio mode = 3 verdicts、いずれも全て pass が条件）
- **新しい test ファイルを増やすときも TDD**：test ファイルが増える時はその test ファイル自体の構造をまず壊して、その上で実装に取りかかる
- **詰まったら止まる**：5 分以上同じエラーを直せないなら PM/orchestrator に質問する

## なぜこれが必要か

Reviewer（single mode default = 1 体多観点、trio mode opt-in = 3 体独立並列）が安全網。code quality / security / test quality の 3 視点を順次 or 並列で網羅し、人間の review コストを後段に回せる。TDD でテストが先にあると、refactor が安全になる + 仕様の理解が固まる。

## いつ activate されるか

- claude-loom 管理プロジェクトで実装タスクを始める時
- `loom-developer` 役割の subagent としてディスパッチされた時
- ユーザーが "TDD で進めて" と明示した時
