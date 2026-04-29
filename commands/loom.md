---
description: Start the claude-loom daemon (Fastify server on 127.0.0.1:5757) and open the UI in browser. Daemon hosts tRPC API + WebSocket subscriptions for live updates from claude-loom managed projects.
---

# /loom

claude-loom daemon を起動し、UI をブラウザで開く（M2 で UI 完成後）。

## 動作

1. daemon の起動状態を check（`curl http://127.0.0.1:5757/health` 200 なら既起動）
2. 未起動なら `pnpm --filter @claude-loom/daemon dev` で起動（background）
3. M2 で UI 完成したら http://127.0.0.1:5757/ ブラウザ open

## 関連

- `commands/loom-status.md`：daemon 状態確認
- `commands/loom-stop.md`：daemon 停止

詳細：SPEC §6.2、`agents/loom-pm.md`。
