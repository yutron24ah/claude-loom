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
M1 以降の自分自身の実装は、この M0 + M0.5 + M0.6 + M0.8 harness を使って進める（dogfood）。Default review mode は single（1 体 reviewer）、critical path のみ trio mode に切替可。M0.8 で retro 機能（4-lens / 3-stage protocol / user-prefs / project-prefs）が加わり、milestone 完了時に振り返り → 改善提案 → 承認 → 反映のループが回る。

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

## 利用可能な skill（M0.5 + M0.6 + M0.8）

`./install.sh` 実行で以下の skill が `~/.claude/skills/` に配置される：

- **loom-test** — ハーネステスト一括実行 + 構造化サマリ（bundled bash script）
- **loom-status** — repo + harness 状態スナップショット（bundled bash script）
- **loom-tdd-cycle** — TDD 規律ガイド（loom-developer 中核ワークフロー）
- **loom-review** — 1 体 reviewer (loom-reviewer) dispatch のプロンプトテンプレ（**default**、多観点を順次、進捗テキスト付き）
- **loom-review-trio** — 3 reviewer 並列 dispatch のプロンプトテンプレ（opt-in deep mode、critical path 用）
- **loom-retro** — 4-lens 振り返り（pj-axis / process-axis / researcher / meta-axis）+ 3-stage protocol で改善提案、user 承認で適用（M0.8）

bundled script はインストール後 `templates/settings.json.template` を参考に各プロジェクトの `.claude/settings.json` allowlist に追加することで、承認プロンプトなしで利用可能。`PLACEHOLDER_CLAUDE_LOOM_INSTALL_PATH` は claude-loom の clone 先パス（例 `/Users/you/work/claude-loom`）に手動で置換する（M1 以降は自動化予定）。

## Customization Layer (M0.9 から)

各 agent の **モデル**と**人格 (personality)** をユーザー側でチューニングできる。

### prefs files

```
~/.claude-loom/user-prefs.json          # user 横断、複数 PJ で共通
<project>/.claude-loom/project-prefs.json  # PJ 固有、user-prefs を override
```

### Schema 例

```json
{
  "agents": {
    "loom-pm":           { "model": "opus",   "personality": "detective" },
    "loom-developer":    { "model": "sonnet", "personality": "friendly-mentor" },
    "loom-retro-pj-judge": { "model": "haiku" }
  }
}
```

### 同梱 personality preset (4 本)

| preset | キャラ | 用途 |
|---|---|---|
| `default` | 中立・専門的 | 既存挙動 |
| `friendly-mentor` | 優しい講師 | コーディング初心者向けチューニング |
| `strict-drill` | クールなコーディングプロ | 上級者の高速反復 |
| `detective` | 迷宮なしの名探偵（関西弁） | 遊び心、長時間セッション疲労軽減 |

ユーザー独自 preset：`prompts/personalities/<name>.md` に Markdown を置いて prefs に preset 名を指定。

### 不変条件

- personality は **「伝え方」のみ可変**
- `docs/CODING_PRINCIPLES.md` 13 原則 / TDD 規律 / SPEC 整合性は **不変**
- 違反検出と review verdict 基準は personality によらず同一

詳細は `SPEC.md §3.6.5 / §6.9.4` を参照。

## Worktree 統合 (M0.10 から)

並列 dev / 安全実験 / branch 比較 / hotfix 隔離 / 一時 review の 5 用途を `loom-worktree` skill で扱える。

明示 invoke: `/loom-worktree create feat/<branch>` で sibling dir に worktree 作成。
自律発動: PM / dev / retro-pm が必要と判断した時に skill 経由で invoke（user 確認あり）。
設定: `<project>/.claude-loom/project-prefs.json` の `worktree.base_path` で配置場所をカスタム可。

詳細: `skills/loom-worktree/SKILL.md` Decision tree。

## 開発規約

claude-loom は **Conventional Commits + GitHub Flow** を採用：

- **コミット**: `<type>(<optional scope>): <subject>`、type 11 種（`feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `chore` / `revert`）、atomic commit 原則
- **ブランチ**: `<type>/<short-kebab-name>`、main 直 commit 禁止、短命 feature ブランチ + PR 経由
- **言語**: `.claude-loom/project.json` の `rules.commit_language` で project ごとに英語/日本語/自由を選択（default `"any"`）

詳細ルール + good/bad 例は **`docs/COMMIT_GUIDE.md`** を参照。

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
