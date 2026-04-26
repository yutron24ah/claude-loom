---
name: loom-test
description: Run the claude-loom harness test suite (install + agents + commands + skills) and report a structured summary. Use when verifying harness state after edits, before commits, or as part of TDD cycle gating in any claude-loom managed project.
---

# loom-test

claude-loom リポジトリで全テストを 1 コマンドで実行し、Pass/Fail/Skip カウントを構造化して返す。

## 使い方

このスキルが起動されたら、bundled script を呼ぶ：

```bash
/path/to/claude-loom/skills/loom-test/scripts/run.sh
```

オプション引数で test group をフィルタできる：

- `agents` — agents test のみ
- `commands` — commands test のみ
- `install` — install test のみ
- `skills` — skills test のみ
- 引数なし — 全テスト

## 出力例

成功時：
```
=== loom-test summary ===
filter: (all)
passed: 4
failed: 0
skipped: 0
exit_code: 0
```

失敗時は full output が続く。

## 設計メモ

- スクリプトは project root を SPEC.md + tests/run_tests.sh の存在で自動探索（cwd or ancestor）
- read-only：テストは `mktemp -d` sandbox で実行されるため repo state を変更しない
- exit code は run_tests.sh の rc を維持

## いつ呼ぶか

- TDD red → green の確認ステップ
- commit 前の自動 gating
- レビュー dispatch 前のセルフチェック
- harness 改修後の regression check
