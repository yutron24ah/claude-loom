---
schema: claude-loom-plan-v1
project_id: claude-loom-self
last_synced_at: 1777194000000
---

# claude-loom 実装計画（マスターロードマップ）

> 本ファイルは長期マイルストーン管理（SPEC §6.8 フォーマット準拠）。
> 各マイルストーンの **詳細実装プラン** は `docs/superpowers/plans/YYYY-MM-DD-claude-loom-mN-*.md` に分離。
> M0 完了後、M1 以降は各マイルストーンで writing-plans skill を再起動して詳細化する。
>
> **dogfood 戦略**：M0 = harness 完成後、M1 以降の実装は M0 の agent / command 群を使って進める（PM 主導、開発者が TDD、レビュー trio が並列レビュー）。

## マイルストーン M0: Dev Harness（ブートストラップ）

詳細: `docs/superpowers/plans/2026-04-26-claude-loom-m0-harness.md`

- [ ] リポジトリスカフォールド + CLAUDE.md ワークフローガイド <!-- id: m0-t1 status: todo -->
- [ ] project.json テンプレート <!-- id: m0-t2 status: todo -->
- [ ] markdown テンプレ 4 種（SPEC / PLAN / CLAUDE / README、loom-managed マーカー含む） <!-- id: m0-t3 status: todo -->
- [ ] doc 整合性 manual checklist <!-- id: m0-t4 status: todo -->
- [ ] tests/REQUIREMENTS.md 骨格 + run_tests.sh <!-- id: m0-t5 status: todo -->
- [ ] install.sh（TDD 駆動、symlink + idempotent） <!-- id: m0-t6 status: todo -->
- [ ] loom-pm agent definition（init/adopt フロー含む） <!-- id: m0-t7 status: todo -->
- [ ] loom-developer agent definition <!-- id: m0-t8 status: todo -->
- [ ] loom-code-reviewer agent definition <!-- id: m0-t9 status: todo -->
- [ ] loom-security-reviewer agent definition <!-- id: m0-t10 status: todo -->
- [ ] loom-test-reviewer agent definition <!-- id: m0-t11 status: todo -->
- [ ] /loom-pm スラッシュコマンド <!-- id: m0-t12 status: todo -->
- [ ] /loom-spec スラッシュコマンド <!-- id: m0-t13 status: todo -->
- [ ] /loom-go スラッシュコマンド <!-- id: m0-t14 status: todo -->
- [ ] スモークテスト + README usage 整備 <!-- id: m0-t15 status: todo -->

**M0 完成基準**：`/loom-pm` 起動 → PM システムプロンプトが load される → PM が Task tool で loom-developer を dispatch できる → developer が loom-code/security/test-reviewer の 3 体を並列ディスパッチできる、までが手元で動く。

## マイルストーン M1: Daemon + Hooks Foundation

詳細: 未作成（M0 完了後 writing-plans で詳細化）

- [ ] daemon プロセス雛形（Fastify + WebSocket、port 5757） <!-- id: m1-t1 status: todo -->
- [ ] SQLite 全 11 テーブル migration（SPEC §6.2 / §7.3） <!-- id: m1-t2 status: todo -->
- [ ] hooks スクリプト 5 種（session_start / pre_tool / post_tool / stop / SubagentStop） <!-- id: m1-t3 status: todo -->
- [ ] event 受信エンドポイント + 永続化 <!-- id: m1-t4 status: todo -->
- [ ] Subagent 相関 FIFO ロジック <!-- id: m1-t5 status: todo -->
- [ ] プロジェクト判定ロジック（git root + project.json marker） <!-- id: m1-t6 status: todo -->
- [ ] config.json デフォルト生成 + 読み込み <!-- id: m1-t7 status: todo -->
- [ ] セキュリティトークン生成 + 検証 <!-- id: m1-t8 status: todo -->
- [ ] events rolling delete（30 日 / 200MB） <!-- id: m1-t9 status: todo -->
- [ ] /loom スラッシュコマンド（daemon 起動 + ブラウザ open） <!-- id: m1-t10 status: todo -->
- [ ] /loom-status / /loom-stop <!-- id: m1-t11 status: todo -->
- [ ] daemon 自動シャットダウン（30 分アイドル） <!-- id: m1-t12 status: todo -->
- [ ] install.sh に settings.json 書き換え追加（jq + atomic mv） <!-- id: m1-t13 status: todo -->

## マイルストーン M2: UI Shell

詳細: 未作成（M1 完了後 writing-plans で詳細化）

- [ ] React + Vite + Tailwind 雛形 <!-- id: m2-t1 status: todo -->
- [ ] WebSocket 接続層（exponential backoff、最大 30s） <!-- id: m2-t2 status: todo -->
- [ ] zustand store（state shape 設計） <!-- id: m2-t3 status: todo -->
- [ ] プロジェクト切替コンポーネント <!-- id: m2-t4 status: todo -->
- [ ] サイドバーナビゲーション <!-- id: m2-t5 status: todo -->
- [ ] ダークテーマベース <!-- id: m2-t6 status: todo -->
- [ ] エラー / ローディング / 切断バナー <!-- id: m2-t7 status: todo -->
- [ ] toast 通知システム（5 イベント対応） <!-- id: m2-t8 status: todo -->

## マイルストーン M3: Room View + Plan View + Gantt

詳細: 未作成（M2 完了後 writing-plans で詳細化）

- [ ] Phaser 3 React 内 mount <!-- id: m3-t1 status: todo -->
- [ ] ピクセルルーム基本タイル <!-- id: m3-t2 status: todo -->
- [ ] エージェントスプライト + 状態アニメ（idle/busy/失敗） <!-- id: m3-t3 status: todo -->
- [ ] Plan View 短期レーン（TodoWrite ミラー、read-only） <!-- id: m3-t4 status: todo -->
- [ ] Plan View 長期レーン（plan_items ツリー、編集可） <!-- id: m3-t5 status: todo -->
- [ ] PLAN.md パース + 双方向同期（chokidar） <!-- id: m3-t6 status: todo -->
- [ ] 進捗ビュー（ガントチャート、リアクティブ bar） <!-- id: m3-t7 status: todo -->
- [ ] Session List <!-- id: m3-t8 status: todo -->
- [ ] Agent Detail（履歴 + 注目フラグ） <!-- id: m3-t9 status: todo -->
- [ ] notes 書き込み API + UI <!-- id: m3-t10 status: todo -->

## マイルストーン M4: Doc Consistency Engine v1

詳細: 未作成（M3 完了後 writing-plans で詳細化）

- [ ] PostToolUse(Edit|Write) hook で SPEC 編集検知 <!-- id: m4-t1 status: todo -->
- [ ] spec_changes / consistency_findings テーブル + diff 計算 <!-- id: m4-t2 status: todo -->
- [ ] Phase A: 語彙抽出 + grep スクリーニング <!-- id: m4-t3 status: todo -->
- [ ] Phase B: claude -p subprocess による意味解析 <!-- id: m4-t4 status: todo -->
- [ ] Consistency Findings UI（severity 別、4 アクション） <!-- id: m4-t5 status: todo -->
- [ ] Acknowledge → plan_items 自動追加 <!-- id: m4-t6 status: todo -->
- [ ] バッジ通知 + WebSocket push <!-- id: m4-t7 status: todo -->

## マイルストーン M5: Integration + Polish

詳細: 未作成（M4 完了後 writing-plans で詳細化）

- [ ] frontend-design に渡してピクセルアート確定 <!-- id: m5-t1 status: todo -->
- [ ] エンドツーエンド体験チェック <!-- id: m5-t2 status: todo -->
- [ ] Project Settings 画面 <!-- id: m5-t3 status: todo -->
- [ ] トークン使用量 polling + メーター <!-- id: m5-t4 status: todo -->
- [ ] uninstall.sh + ドキュメント完成 <!-- id: m5-t5 status: todo -->
- [ ] README + リリース準備 <!-- id: m5-t6 status: todo -->
