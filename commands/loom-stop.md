---
description: Stop the claude-loom daemon gracefully (await pending events flush, close DB, exit). Use --all to also clean up tsx watch zombies and manual node launches. Idle shutdown happens automatically after 30min, but use this for manual stop.
---

# /loom-stop

claude-loom daemon を graceful shutdown する。

## 動作（引数なし）

1. daemon の `/shutdown` endpoint に POST（graceful shutdown）
2. フォールバック: `~/.claude-loom/daemon.pid` に記録された PID を `kill -TERM`
3. どちらも失敗しても exit 0（fail-silent）

## 動作（`--all` flag）

zombie プロセスを含む全 claude-loom 関連プロセスを一括 cleanup する。

1. live daemon に POST /shutdown（graceful shutdown）
2. `~/.claude-loom/daemon.pid` の PID を kill（stale 検出）
3. `pgrep -f "tsx.*server\.ts"` で tsx watch zombie を kill
4. `pgrep -f "node.*\.claude-loom/daemon\.js"` で manual launch を kill
5. killed PID 一覧 / not found 一覧を stdout に report
6. best-effort: 全ステップ後に exit 0

### 例

```bash
/loom-stop          # daemon 1 体を graceful shutdown
/loom-stop --all    # daemon + zombie 全プロセスを cleanup
```

### 実体 hook script

`hooks/loom-stop.sh` が本 command の実体。テスト環境では `LOOM_TEST_ZOMBIE_PIDS` 環境変数で mock PID を直接指定可能。

## 関連

- 30 分 inactivity で auto-shutdown も実装済（lifecycle/idle-shutdown.ts）
- 手動停止は本 command、自動停止は idle-shutdown
- zombie cleanup: `--all` flag が M0.X-runtime-mode-recovery t7 で追加
