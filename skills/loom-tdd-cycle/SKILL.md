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

### 6. Review (dispatch the trio)
完了報告の前に **必ず** 3 reviewer に並列 dispatch：
- `loom-code-reviewer`
- `loom-security-reviewer`
- `loom-test-reviewer`

3 reviewer の prompt 内容は `loom-review-trio` skill を参照（または `agents/loom-developer.md` の Step 8）。

### 7. Aggregate findings
- いずれかの reviewer が `verdict: needs_fix` → fix → step 6 に戻って再 dispatch
- 全 reviewer が `verdict: pass` → step 8 へ

### 8. Commit
- プロジェクトの commit prefix 規約（`CLAUDE.md`）に従う
- 1 機能 = 1 commit

### 9. Report
- PM (or orchestrator) に：何を作ったか / 変更したファイルパス / test 件数 / commit SHA を返す

## 守るべき原則

- **失敗する test なしの実装は禁止**（"後でテスト追加" は永久に来ない）
- **test 失敗のままコミット禁止**
- **3 review 通過なしのコミット禁止**
- **新しい test ファイルを増やすときも TDD**：test ファイルが増える時はその test ファイル自体の構造をまず壊して、その上で実装に取りかかる
- **詰まったら止まる**：5 分以上同じエラーを直せないなら PM/orchestrator に質問する

## なぜこれが必要か

レビュー trio が安全網。一人の判断ミスを 3 視点（code quality / security / test quality）で網羅し、人間の review コストを後段に回せる。TDD でテストが先にあると、refactor が安全になる + 仕様の理解が固まる。

## いつ activate されるか

- claude-loom 管理プロジェクトで実装タスクを始める時
- `loom-developer` 役割の subagent としてディスパッチされた時
- ユーザーが "TDD で進めて" と明示した時
