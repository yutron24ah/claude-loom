# claude-loom

> 言語: [English](README.md) | **日本語**

**Claude Code 用の「中央指令室」プラグイン** — agile 開発チーム（PM・Developer・Reviewer 陣）をまるごと注入し、その動きをリアルタイム GUI で**実際に見ながら**開発できる。

![status: Phase 1 MVP complete](https://img.shields.io/badge/status-Phase%201%20MVP-brightgreen) ![license: MIT](https://img.shields.io/badge/license-MIT-blue) ![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-orange)

---

## claude-loom とは？

claude-loom は **2 本柱** で構成された Claude Code プラグイン：

1. **Agent ハーネス** — agile 流儀のチーム（PM / Developer / Code・Security・Test Reviewer）を最初から組み上げ済み。TDD 規律・retrospective プロトコル・ドキュメント整合性監視まで標準装備。
2. **可視化 GUI** — ピクセル RPG 風の「指令室」で、各 agent が今何をしているかをリアルタイム表示。Plan view・Gantt chart・session 一覧・agent ごとの詳細パネル付き。

この 2 つを組み合わせることで、Claude Code は単一ウィンドウのチャットから **「マルチエージェント開発が実際に目で見える dev studio」** に変わる。

## 従来との違い — 開発体験はこう変わる

| 素の Claude Code | claude-loom 導入後 |
|---|---|
| 1 agent / 1 ターミナル | agile チームが subagent として並列稼働 |
| プロジェクトごとに workflow を毎回手作り | `spec → plan → TDD → review → retro` が標準フロー |
| 並列 agent の動きは見えない（ターミナルログ頼み） | GUI 上で各 agent が sprite として動くのが見える |
| `PLAN.md` とコードが静かに乖離する | Plan view とファイルが双方向同期 |
| 仕様変更後の README/SPEC 更新を忘れる | PM agent が doc 整合性違反を自動検出 |
| プロジェクト間の手動切替 | マルチ PJ 中央指令室で横断管理 |

## 主な機能

- **13 専門 subagent** — PM、Developer、single-mode Reviewer（default）、Code/Security/Test reviewer trio（opt-in）、retro 4 lens judge + counter-arguer + aggregator + retro PM
- **9 skill** — `loom-tdd-cycle`, `loom-review`, `loom-review-trio`, `loom-retro`, `loom-test`, `loom-status`, `loom-worktree`, `loom-write-plan`, `loom-debug`
- **9 slash command** — `/loom-pm`, `/loom-spec`, `/loom-go`, `/loom-retro`, `/loom-status`, `/loom-worktree`, `/loom-mode`, `/loom-stop`, `/loom`
- **リアルタイム GUI** — ピクセル RPG room view、Plan + Gantt（ファイル双方向同期）、Session 一覧、Agent Detail（React + Phaser/SVG）
- **ローカル daemon** — Node.js + Fastify + tRPC + Drizzle + SQLite、`127.0.0.1` 限定 bind、30 分アイドルで自動停止
- **Retro プロトコル** — 4-lens × 3-stage（並列批評 → 反証パス → 集約）でエコーチェンバーを抑制した自己改善ループ
- **Customization Layer** — agent ごとに model + personality preset 切替可（同梱 4 種：`default`, `friendly-mentor`, `strict-drill`, `detective`）
- **Coexistence Mode** — `full` / `coexist` / `custom` で既存 PJ への段階的 adoption をサポート
- **Worktree 統合** — 並列 dev / 安全実験 / hotfix 隔離を git worktree で実現

## 動作要件

- [Claude Code](https://claude.com/claude-code)（最新版）
- Node.js LTS（20 または 22 推奨）
- pnpm

## インストール

```bash
git clone https://github.com/yutron24ah/claude-loom.git
cd claude-loom
./install.sh
```

`install.sh` がすべて面倒みる：agent / slash command / skill を `~/.claude/` 以下に symlink で設置、loom hooks を `~/.claude/settings.json` に配線、続いて `pnpm install` と daemon + UI の build を実行して GUI を即起動できる状態にする。完了後 Claude Code 上で `/loom-pm`（or 任意の trigger command）を叩けば中央指令室が `http://127.0.0.1:5757` で開く。

Claude Code の設定ディレクトリが標準位置にない場合は環境変数で上書き可：

```bash
CLAUDE_HOME=/path/to/your/claude-config ./install.sh
```

`pnpm install` と build を自分で管理したい場合（CI、独自 workflow など）は `LOOM_NO_BUILD=1` で auto-build を skip：

```bash
LOOM_NO_BUILD=1 ./install.sh
pnpm install
pnpm build
```

## クイックスタート

任意のプロジェクトディレクトリで Claude Code を起動し、以下を実行：

```
/loom-pm       # PM mode に入る（この session が PM になる）
/loom-spec     # spec フェーズ — SPEC.md を読み、user とタスクを確認
/loom-go       # 実装フェーズ — PM が developer を dispatch
/loom-retro    # マイルストーン完了後の振り返り（4-lens / 3-stage protocol）
/loom-status   # ハーネス + repo 状態のスナップショット
```

slash command 一覧の詳細は [CLAUDE.md](CLAUDE.md) を参照。

## GUI の起動

`/loom-pm`・`/loom-spec`・`/loom-go`・`/loom-retro`・`/loom-status`・`/loom-worktree`・`/loom-mode` のいずれかを実行すると、**cold-start 時に daemon が自動起動し、ブラウザで中央指令室が開く**（`http://127.0.0.1:5757`）。daemon がすでに稼働中（warm-start）の場合はブラウザを再度開かない。

### Opt-out

| スコープ | 方法 |
|---|---|
| session 単位 | `LOOM_NO_UI=1` 環境変数を設定 |
| PJ 単位（永続） | `<project>/.claude-loom/project-prefs.json` に `ui.auto_launch: false` を設定 |
| headless 自動検知 | SSH / DISPLAY なし / ブラウザコマンドなし → ブラウザ起動を skip し URL を terminal に出力 |

### `/loom`（URL ヘルパー）

`/loom` を実行すると daemon URL を表示してクリップボードにコピーする（cross-platform）。別タブを開きたいときや URL を共有したいときに使う。

### Development workflow

claude-loom は `LOOM_DEV_MODE` 環境変数で制御される 2 つのモードで動作する：

| | **prod mode**（default） | **dev mode** |
|---|---|---|
| 起動 | SessionStart hook による自動起動 | `pnpm dev`（または `pnpm --filter @claude-loom/{daemon,ui} dev` 個別起動） |
| access URL | `http://127.0.0.1:5757` | API: `http://127.0.0.1:5757`、UI: `http://127.0.0.1:5173` |
| static serving | daemon が `ui/dist` を serve | skip — Vite が hot-reload UI を提供 |
| 用途 | end-user 消費、lazy daemon auto-launch | HMR 付き UI 開発 |

UI 開発中の hot-reload 用途では daemon と UI を並走起動する。root `pnpm dev` 1 コマンドで両方上がる：

```bash
pnpm dev
```

これは `concurrently` で `pnpm --filter @claude-loom/daemon dev` と `pnpm --filter @claude-loom/ui dev` を並列起動する script で、prefix 付き log を 1 ペインに混ぜて出力する。UI dev server だけ単独起動すると WS が daemon (:5757) 不在のまま再接続を繰り返すため、画面上部に「切断、再接続中…」の persistent banner が出続ける。原則 `pnpm dev` を推奨、片方だけ起動したい時は従来どおり：

```bash
pnpm --filter @claude-loom/daemon dev   # daemon（API のみ）: http://127.0.0.1:5757
pnpm --filter @claude-loom/ui dev       # UI（Vite + HMR）:   http://127.0.0.1:5173
```

daemon の `dev` script は `LOOM_DEV_MODE=1` を auto-inject し、prod daemon が稼働中に誤って dev daemon を起動することを防ぐ pre-flight check を実行する。実行時のモードは `GET /mode` endpoint で確認できる。役割分担の詳細は [SPEC.md §3.2.2](SPEC.md) を参照。

## カスタマイズ

各 agent の **モデル** と **人格 (personality)** は prefs ファイルで調整できる：

```
~/.claude-loom/user-prefs.json              # user 横断デフォルト
<project>/.claude-loom/project-prefs.json   # PJ 固有 override
```

```json
{
  "agents": {
    "loom-pm":        { "model": "opus",   "personality": "detective" },
    "loom-developer": { "model": "sonnet", "personality": "friendly-mentor" }
  }
}
```

コーディング原則・TDD 規律・SPEC 整合性は **不変** で、可変なのは「伝え方」のみ。詳細は [SPEC.md](SPEC.md) §3.6.5 / §6.9.4。

## 既存プロジェクトとの共存

3 つのモードで段階的 adoption に対応：

| mode | 有効機能 | 用途 |
|---|---|---|
| `full`（default） | 全機能 | greenfield / claude-loom がメインのハーネス |
| `coexist` | core のみ | 既存 setup の上に最小限で同居 |
| `custom` | user 明示指定 | 機能単位で細かく ON/OFF |

インストール後は `/loom-mode <mode>` で切替。

## アンインストール

```bash
./uninstall.sh        # 確認 prompt あり
./uninstall.sh --yes  # prompt スキップ
./uninstall.sh --yes --purge-state   # .claude-loom/ ローカル state も削除
```

デフォルトでは `.claude-loom/`（retro learned guidance、personality prefs 等）を保持するため、再インストール時に設定が引き継がれる。

## アーキテクチャ

```
Claude Code セッション  →  bash hooks  →  daemon (tRPC + SQLite)  →  React + Phaser UI
       (Layer 1)            (Layer 2)              (Layer 3)               (Layer 4)
```

daemon は `127.0.0.1` 限定 bind、認証は `~/.claude-loom/daemon-token`（chmod 600）の nanoid token。詳細は [SPEC.md](SPEC.md) §3。

## ドキュメント

- **[SPEC.md](SPEC.md)** — 製品仕様（Single Source of Truth）
- **[PLAN.md](PLAN.md)** — マイルストーンロードマップ
- **[CLAUDE.md](CLAUDE.md)** — agent 向け作業ガイド（Claude Code 自身が読む）
- **[docs/SCREEN_REQUIREMENTS.md](docs/SCREEN_REQUIREMENTS.md)** — UI 要件
- **[docs/COMMIT_GUIDE.md](docs/COMMIT_GUIDE.md)** — commit / branch 規約

## ステータス

Phase 1 MVP 完了（functional + verification + aesthetic）。Phase 2 計画中 — [PLAN.md](PLAN.md) 参照。

## ライセンス

[MIT](LICENSE) © 2026 Koki Mogi
