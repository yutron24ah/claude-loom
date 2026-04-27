# claude-loom

Claude Code 上で agile 開発チームを丸ごと再現する「中央指令室」プラグイン。

## 何ができるか（Phase 1 完成時）

- ピクセル RPG 風 GUI で開発室を可視化
- agile デフォルト team（PM / Developer / Code/Security/Test Reviewer）が即座に使える
- マルチプロジェクト対応（中央指令室から全 PJ 横断管理）
- ドキュメント整合性の自動見張り（PM の責務）
- リアルタイム進捗ガントチャート + Plan View

## 現在のステータス：M0（Dev Harness）

GUI / daemon は未実装。**agent 定義 + slash command + ワークフロー規約** のみ動作。
M1 以降の自分自身の実装は、この M0 + M0.5 + M0.6 harness を使って進める（dogfood）。Default review mode は single（1 体 reviewer）、critical path のみ trio mode に切替可。

## インストール

```bash
git clone https://github.com/yutron24ah/claude-loom.git
cd claude-loom
./install.sh
```

`~/.claude/agents/` および `~/.claude/commands/` にシンボリックリンクが設置される。

Claude Code の設定ディレクトリが標準位置にない場合は環境変数で上書きできる：

```bash
CLAUDE_HOME=/path/to/your/claude-config ./install.sh
```

## 使い方（M0）

Claude Code を起動して：

```
/loom-pm     # PM mode に入る
/loom-spec   # spec フェーズ開始
/loom-go     # 実装フェーズ開始（PM が developer を dispatch）
```

詳細は `CLAUDE.md` を参照。

## 利用可能な skill（M0.5 + M0.6）

`./install.sh` 実行で以下の skill が `~/.claude/skills/` に配置される：

- **loom-test** — ハーネステスト一括実行 + 構造化サマリ（bundled bash script）
- **loom-status** — repo + harness 状態スナップショット（bundled bash script）
- **loom-tdd-cycle** — TDD 規律ガイド（loom-developer 中核ワークフロー）
- **loom-review** — 1 体 reviewer (loom-reviewer) dispatch のプロンプトテンプレ（**default**、多観点を順次、進捗テキスト付き）
- **loom-review-trio** — 3 reviewer 並列 dispatch のプロンプトテンプレ（opt-in deep mode、critical path 用）

bundled script はインストール後 `templates/settings.json.template` を参考に各プロジェクトの `.claude/settings.json` allowlist に追加することで、承認プロンプトなしで利用可能。`PLACEHOLDER_CLAUDE_LOOM_INSTALL_PATH` は claude-loom の clone 先パス（例 `/Users/you/work/claude-loom`）に手動で置換する（M1 以降は自動化予定）。

## ドキュメント

- `SPEC.md` — 製品仕様（Single Source of Truth）
- `PLAN.md` — マスター実装計画
- `docs/SCREEN_REQUIREMENTS.md` — UI 要件
- `docs/plans/` — 各マイルストーン詳細プラン
- `CLAUDE.md` — Claude Code 向け作業ガイド

## ライセンス

未定（リリース前に設定）

## 開発フロー

このリポジトリ自体が dogfood で開発される。詳細は `CLAUDE.md`。
