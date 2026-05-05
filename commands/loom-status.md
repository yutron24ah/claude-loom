---
description: Check claude-loom daemon status (running / port / uptime / current project / event count). Reports health endpoint + recent stats from SQLite events table.
---

<!-- M0.11.5: lazy daemon auto-launch trigger (SPEC §3.2) -->
Before anything else, invoke the daemon + UI helper via Bash tool (fail-silent — do not abort if this fails):

```bash
bash "${CLAUDE_LOOM_INSTALL_PATH:-/Users/kokiiphone/Documents/work/claude-loom}/hooks/loom-launch-ui.sh"
```

# /loom-status

claude-loom daemon の動作状況を確認する。

## 動作

1. `curl -sS http://127.0.0.1:5757/health` で health check
2. レスポンスに status / timestamp / version 含む
3. 不在時は「daemon not running」と表示

## 関連

- `commands/loom.md`：daemon 起動
- `commands/loom-stop.md`：daemon 停止
