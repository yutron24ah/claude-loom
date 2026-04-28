# CLAUDE.md — claude-loom リポジトリ作業ガイド

> **本ファイルは Claude Code agent 向けの作業規約。** ユーザー向け説明は `README.md`、製品仕様は `SPEC.md` を参照。

## 開発フロー

このリポジトリは **dogfood 方式** で開発する：
M0 + M0.5 + M0.6 で構築した harness（PM / Developer / Reviewer agent — single mode default、trio mode opt-in）を使って、M1 以降の自分自身の実装を進める。

### 通常の作業フロー

1. `/loom-pm` で PM mode に入る（この session が PM になる）
2. `/loom-spec` で SPEC を読み込み、当該タスクの詳細を user と確認
3. `/loom-go` で実装フェーズ起動 → PM が Task tool で developer subagent を dispatch
4. developer は TDD で実装 → reviewer dispatch（review_mode 判定：default `single` で 1 体、opt-in `trio` で 3 体並列）
5. 全 reviewer verdict pass → commit
6. PM が PLAN.md を更新

## ブランチ規約（GitHub Flow）

- `main` への直 commit 禁止、PR 経由のみ
- 1 要件 = 1 ブランチ、短命（数日〜数週間）
- 命名 `<type>/<short-kebab-name>`、type は `feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `chore` の 10 種
- 例: `feat/loom-reviewer-agent`, `fix/install-home-guard`, `docs/commit-guide`
- ブランチ単位で PR を上げる前に：全テスト pass + 全 reviewer verdict pass（single mode = 1 verdict、trio mode = 3 verdicts）
- merge は `--no-ff`（マイルストーン境界を残す）または squash（WIP 多い場合）

## コミット粒度（Conventional Commits）

- 1 commit = 1 論理変更（atomic、revert 単位）、build & test pass 状態を維持
- 行数目安：200 行以下推奨、500 行超は分割（Google CL 流儀）
- 形式: `<type>(<optional scope>): <subject>` の 1 行件名 + 必要に応じて空行 + 本文
- type 11 種: `feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `chore` / `revert`
- 件名: 命令形 or 日本語体言止め可（≤50 英 / ≤40 日目安、末尾ピリオドなし）
- 本文（必要時）: WHY 中心、72 文字折返
- BREAKING CHANGE: `feat!:` または footer `BREAKING CHANGE: <description>`
- 言語ポリシー: `.claude-loom/project.json` の `rules.commit_language`（`"any"` default）
- 詳細ルール + 良い/悪い例: **`docs/COMMIT_GUIDE.md` を参照**

## TDD 必須

- 実装コードを書く前に必ず失敗するテストを書く
- Red → Green → Refactor の順
- テストなしの実装は review で reject される

## doc 整合性

- SPEC を変更したら `docs/DOC_CONSISTENCY_CHECKLIST.md` を必ず通す
- M4 で自動化するまでは手作業

## ファイル配置規約

- agents/ : Claude Code subagent 定義（loom-pm / loom-developer / loom-reviewer (single mode default) / loom-{code,security,test}-reviewer (trio mode opt-in) / loom-retro-* (M0.8 retro 7 体)）
- commands/ : slash command 定義
- hooks/ : bash hook scripts (M1 以降)
- skills/ : Claude Code skill (M0.5 から有効)
- templates/ : 新規 PJ 配布用テンプレ
- tests/ : bash test harness
- daemon/ : Node daemon (M1 以降)
- ui/ : React + Phaser UI (M2 以降)
- docs/ : ドキュメント
- ~/.claude-loom/user-prefs.json + <project>/.claude-loom/project-prefs.json : retro 学習状態（M0.8 から）

## テスト実行

```bash
./tests/run_tests.sh        # 全テスト
./tests/run_tests.sh install # 特定テスト
```

## 主要ドキュメント参照

- `SPEC.md` — 製品仕様（SSoT）
- `PLAN.md` — マスターロードマップ
- `docs/plans/` — 各マイルストーン詳細プラン（`writing-plans` skill を使う場合は default の `docs/superpowers/plans/` を上書きしてここに保存する）
- `docs/SCREEN_REQUIREMENTS.md` — UI 要件
- `tests/REQUIREMENTS.md` — 受入要件 ID

## skill 優先度ポリシー（M0.9 から）

このリポジトリで作業する claude agent は **`loom-*` skill を優先** すること：

| 用途 | 優先 skill | 代替 (使うな) |
|---|---|---|
| TDD discipline | `loom-tdd-cycle` | superpowers:test-driven-development |
| 実装 plan 作成 | `loom-write-plan` | superpowers:writing-plans |
| 系統的 debug | `loom-debug` | superpowers:systematic-debugging |
| code review | `loom-review` (single) / `loom-review-trio` (deep) | superpowers:requesting-code-review |
| retro 振り返り | `loom-retro` | (superpowers に該当なし) |
| harness self-test | `loom-test` | (superpowers に該当なし) |
| harness status 確認 | `loom-status` | (superpowers に該当なし) |

`superpowers:brainstorming` / `superpowers:executing-plans` 等の skill は claude-loom の `loom-pm` agent 内 spec phase / impl phase に同等動作が記述されとる。**bootstrapping 期 (M0.9 実装中)** を除き superpowers skill は invoke しない方針。

詳細：`SPEC.md §3.10` (superpowers Independence)。
