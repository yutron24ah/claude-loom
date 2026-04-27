---
name: loom-review
description: Dispatch a single multi-aspect reviewer (loom-reviewer) for any claude-loom feature or fix before commit (default review mode). Use when ready to submit work for review and review_mode is "single" or unspecified — provides the canonical Task prompt template.
---

# loom-review

`loom-developer` が実装完了後、**single mode** の review として `loom-reviewer` 1 体に dispatch するためのプロンプトテンプレ。`loom-tdd-cycle` skill の Step 6 と対になる、`loom-review-trio` skill の対概念（opt-in trio mode）。

## いつ使うか

- `[loom-meta]` prefix に `review_mode` 指定がない、または `review_mode=single`
- project.json の `rules.review_mode` が `"single"`（default）
- 通常の feature / fix で 1 体 reviewer の総合判断で十分なケース

## Dispatch — 1 Task call

1 つの Task call、`subagent_type: "loom-reviewer"`。並列化なし、1 体の subagent が順次 3 観点を回す。

### Reviewer prompt template

```
[loom-meta] project_id=<from project.json> slot=reviewer working_dir=<absolute path> review_mode=single

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

## What to focus on (optional)
- <hint about complex logic / security-sensitive area / coverage gap, if any>
```

## 期待される reviewer 出力

`loom-reviewer` は以下を **assistant 出力として順次** 返す：

1. `## 観点 1/3: コードレビュー中...`（progress marker）
2. （内部分析、findings を内部に蓄積）
3. `## 観点 2/3: セキュリティレビュー中...`
4. （同上）
5. `## 観点 3/3: テストレビュー中...`
6. （同上）
7. fenced code block の集約 JSON：

```json
{
  "reviewer": "loom-reviewer",
  "verdict": "pass" | "needs_fix",
  "findings": [
    { "aspect": "code|security|test", "severity": "...", "file": "...", "line": ..., "category": "...", "description": "...", "suggestion": "..." }
  ]
}
```

## 集約 + 修正ループルール

- `verdict == "needs_fix"` → developer は findings の severity high を必ず修正、medium は文脈次第、low は文書化やコメント残しでも可
- 修正後 → 再 dispatch（same skill template、`subagent_type: "loom-reviewer"`）
- 全 verdict `pass` で初めて commit OK

## なぜ 1 体か

- M0/M0.5 で superpowers の subagent-driven-development を回した経験から、modern Claude（Opus/Sonnet 4.x）は **1 dispatch で 3 観点を網羅できる**ことが実証
- token コスト ≒ trio mode の 1/3、claude-loom 利用者の約 80% のタスクで十分
- critical path / 大規模リファクタは `[loom-meta] review_mode=trio` で per-task 切替、または project.json で trio default 化可

## いつ activate されるか

- `loom-tdd-cycle` の Step 6 で review_mode が `single` または未指定の時
- claude-loom 管理プロジェクトの通常 feature / fix dispatch
