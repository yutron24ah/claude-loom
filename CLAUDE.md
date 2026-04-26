# CLAUDE.md — claude-loom リポジトリ作業ガイド

> **本ファイルは Claude Code agent 向けの作業規約。** ユーザー向け説明は `README.md`、製品仕様は `SPEC.md` を参照。

## 開発フロー

このリポジトリは **dogfood 方式** で開発する：
M0 で構築した harness（PM / Developer / Reviewer trio agent）を使って、M1 以降の自分自身の実装を進める。

### 通常の作業フロー

1. `/loom-pm` で PM mode に入る（この session が PM になる）
2. `/loom-spec` で SPEC を読み込み、当該タスクの詳細を user と確認
3. `/loom-go` で実装フェーズ起動 → PM が Task tool で developer subagent を dispatch
4. developer は TDD で実装 → review trio に並列レビュー dispatch
5. レビュー全 pass → commit
6. PM が PLAN.md を更新

## ブランチ規約

- `main` への直 commit 禁止
- 1 要件 = 1 ブランチ。命名 `feat/<short-description>` `fix/<short-description>` `chore/<short-description>`
- ブランチ単位で PR を上げる前に：全テスト pass + 3 レビュー pass

## コミット粒度

- 1 機能 = 1 commit
- メッセージ prefix: `test(xxx)` / `feat(xxx)` / `fix(xxx)` / `chore(xxx)` / `docs:`
- 例: `feat(install): add idempotent symlink installer`

## TDD 必須

- 実装コードを書く前に必ず失敗するテストを書く
- Red → Green → Refactor の順
- テストなしの実装は review で reject される

## doc 整合性

- SPEC を変更したら `docs/DOC_CONSISTENCY_CHECKLIST.md` を必ず通す
- M4 で自動化するまでは手作業

## ファイル配置規約

- agents/ : Claude Code subagent 定義
- commands/ : slash command 定義
- hooks/ : bash hook scripts (M1 以降)
- skills/ : Claude Code skill (Phase 2 以降)
- templates/ : 新規 PJ 配布用テンプレ
- tests/ : bash test harness
- daemon/ : Node daemon (M1 以降)
- ui/ : React + Phaser UI (M2 以降)
- docs/ : ドキュメント

## テスト実行

```bash
./tests/run_tests.sh        # 全テスト
./tests/run_tests.sh install # 特定テスト
```

## 主要ドキュメント参照

- `SPEC.md` — 製品仕様（SSoT）
- `PLAN.md` — マスターロードマップ
- `docs/superpowers/plans/` — 各マイルストーン詳細プラン
- `docs/SCREEN_REQUIREMENTS.md` — UI 要件
- `tests/REQUIREMENTS.md` — 受入要件 ID
