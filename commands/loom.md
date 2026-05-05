---
description: Start the claude-loom daemon (Fastify server on 127.0.0.1:5757) and open the UI in browser. Daemon hosts tRPC API + WebSocket subscriptions for live updates from claude-loom managed projects. Also displays the daemon URL and copies it to clipboard (rescue path for opening additional tabs).
---

# /loom

claude-loom daemon を起動し、UI をブラウザで開く（M2 で UI 完成後）。daemon URL を terminal に表示し、clipboard にコピーする（user が「もう 1 タブ欲しい」時の救済路）。

## 動作

1. daemon の起動状態を check（`curl http://127.0.0.1:5757/health` 200 なら既起動）
2. 未起動なら `pnpm --filter @claude-loom/daemon dev` で起動（background）
3. M2 で UI 完成したら http://127.0.0.1:5757/ ブラウザ open

## URL 表示 + clipboard コピー（M0.11.5）

daemon URL `http://127.0.0.1:5757` を terminal に出力し、clipboard にコピーする。
cold-start-only browser open ポリシーを補完する dual path として機能する（SPEC §3.2）。

### clipboard cross-platform fallback chain

以下の順で利用可能なコマンドを試す：

```bash
LOOM_URL="http://127.0.0.1:5757"
echo "$LOOM_URL"

if command -v pbcopy &>/dev/null; then
    # macOS
    echo -n "$LOOM_URL" | pbcopy
    echo "(URL を clipboard にコピーしました: pbcopy)"
elif command -v wl-copy &>/dev/null; then
    # Wayland (Linux)
    echo -n "$LOOM_URL" | wl-copy
    echo "(URL を clipboard にコピーしました: wl-copy)"
elif command -v xclip &>/dev/null; then
    # X11 (Linux)
    echo -n "$LOOM_URL" | xclip -selection clipboard
    echo "(URL を clipboard にコピーしました: xclip)"
elif command -v clip &>/dev/null; then
    # Windows (WSL / Git Bash)
    echo -n "$LOOM_URL" | clip
    echo "(URL を clipboard にコピーしました: clip)"
else
    echo "(clipboard 不在、手動 copy してくれ: $LOOM_URL)"
fi
```

- URL は stdout に出力（downstream pipe 対応）
- clipboard コピーは bonus path（環境依存で skip されても URL は常に表示）

## 関連

- `commands/loom-status.md`：daemon 状態確認
- `commands/loom-stop.md`：daemon 停止

詳細：SPEC §3.2、SPEC §6.2、`agents/loom-pm.md`。
