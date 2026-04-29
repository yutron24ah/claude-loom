---
description: Stop the claude-loom daemon gracefully (await pending events flush, close DB, exit). Idle shutdown happens automatically after 30min, but use this for manual stop.
---

# /loom-stop

claude-loom daemon を graceful shutdown する。

## 動作

1. daemon の管理 PID を `~/.claude-loom/daemon.pid` から読む（M1 では未実装、process kill で代用）
2. `kill -TERM <pid>` で停止 signal、10s 内に exit
3. 強制停止が必要なら `kill -KILL <pid>`

## 関連

- 30 分 inactivity で auto-shutdown も実装済（lifecycle/idle-shutdown.ts）
- 手動停止は本 command、自動停止は idle-shutdown
