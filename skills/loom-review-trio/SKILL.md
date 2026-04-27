---
name: loom-review-trio
description: Dispatch three review subagents (code / security / test) in parallel for any claude-loom feature or fix before commit (opt-in deep review mode). Use when ready to submit work and review_mode is "trio" — for critical path, large refactors, or high-stakes changes where independent perspectives reduce echo chamber risk. Default mode is single (loom-review skill).
---

# loom-review-trio

`loom-developer` が実装完了後、**trio mode（opt-in）** の review として 3 reviewer に並列 dispatch するためのプロンプトテンプレと運用ルール。`loom-tdd-cycle` skill の Step 6 と対になる、`loom-review` skill（default single mode）の対概念。

## いつ使うか

- `[loom-meta]` prefix に `review_mode=trio` 指定
- project.json の `rules.review_mode` が `"trio"`（critical path 中心の設定）
- 大規模 refactor / セキュリティ critical path / SPEC 大改訂 など、独立 3 視点の echo chamber 抑制効果が必要なケース

通常 task は `loom-review`（single mode、default）を使う。

## Dispatch — 3 Task calls in 1 message

複数 Task tool 呼び出しを **1 つのアシスタントメッセージに含めて並列実行** する。各 Task の subagent_type は対応する reviewer agent の名前。

### Reviewer prompt template (each of 3 reviewers gets this structure)

```
[loom-meta] project_id=<from project.json> slot=<reviewer-slot> working_dir=<absolute path> review_mode=trio

## What was implemented
<1-2 sentences describing the change>

## Files modified
- <relative/path/to/file1>
- <relative/path/to/file2>

## Test command + summary
$ ./tests/run_tests.sh <filter>
Passed: <N>   Failed: <M>   Skipped: <S>

## Git context
branch: <current branch>
HEAD: <commit SHA>
diff: git diff <BASE>..HEAD

## What to focus on (optional, reviewer-specific)
- code-reviewer: <hint about complex logic if any>
- security-reviewer: <hint about secrets/inputs if any>
- test-reviewer: <hint about coverage gaps you suspect>
```

3 つそれぞれに上記を埋め、`subagent_type` で `loom-code-reviewer` / `loom-security-reviewer` / `loom-test-reviewer` を指定。

## 集約ルール

- 3 reviewer の出力は構造化 JSON（`{reviewer, verdict, findings}`）
- `verdict == needs_fix` が一つでもあれば → fix → 再 dispatch
- 全 `verdict == pass` で初めて commit OK
- findings の severity（high / medium / low）を見て対応：high は必ず修正、medium は文脈次第、low はコメントで残せる場合あり

## なぜ並列か

- 3 reviewer は独立した観点を持つ → I/O 並列化で時間短縮
- 1 reviewer の判断が他 reviewer に影響しない（互いの output を見ない）→ echo chamber 抑制

## いつ activate されるか

- `loom-tdd-cycle` の Step 6 で必ず
- 大きめの変更で reviewer のサブセットだけ呼びたい時（例：doc only 変更で security/test を skip）も、デフォルトは 3 並列
- M1 以降で developer 以外の orchestrator（例：PM 直 review）が呼ぶ場合も同テンプレ
