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
M1 以降の自分自身の実装は、この M0 harness を使って進める（dogfood）。

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

## ドキュメント

- `SPEC.md` — 製品仕様（Single Source of Truth）
- `PLAN.md` — マスター実装計画
- `docs/SCREEN_REQUIREMENTS.md` — UI 要件
- `docs/superpowers/plans/` — 各マイルストーン詳細プラン
- `CLAUDE.md` — Claude Code 向け作業ガイド

## ライセンス

未定（リリース前に設定）

## 開発フロー

このリポジトリ自体が dogfood で開発される。詳細は `CLAUDE.md`。
