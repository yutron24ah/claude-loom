#!/usr/bin/env bash
# Pre-flight: verify no prod daemon on :5757 before tsx watch starts (SPEC §3.2.2)
#
# WHY: dev daemon and prod daemon share the same port (5757). If a prod daemon is
# already running (started by loom-launch-ui.sh / lazy launch), tsx watch would
# fail with EADDRINUSE and silently zombie. This script detects the conflict and
# emits a clear diagnostic before tsx watch even tries to bind.
#
# Exit codes:
#   0 — safe to start (no daemon, dev daemon, or probe failure — all non-blocking)
#   1 — prod daemon detected (block tsx watch, user must act)
set -uo pipefail

DAEMON_URL="${LOOM_DAEMON_URL:-http://127.0.0.1:5757}"

# Step 1: health probe — if daemon is not listening, nothing to check
if ! curl -sf --max-time 2 "$DAEMON_URL/health" >/dev/null 2>&1; then
    exit 0  # daemon absent — safe to start
fi

# Step 2: /mode probe to distinguish prod vs dev vs unknown
mode_response=$(curl -s --max-time 2 "$DAEMON_URL/mode" 2>/dev/null || echo "")
mode=$(echo "$mode_response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('mode', 'unknown'))" 2>/dev/null || echo "unknown")
pid=$(echo "$mode_response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('pid', 'unknown'))" 2>/dev/null || echo "unknown")
entry=$(echo "$mode_response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('entry', 'unknown'))" 2>/dev/null || echo "unknown")

# Step 3: block only if prod — dev mode or unknown are non-blocking
if [ "$mode" = "prod" ]; then
    echo "ERROR: production daemon already running (PID=$pid, started by '$entry')." >&2
    echo "       To switch to dev mode, choose one:" >&2
    echo "         → kill $pid && pnpm --filter @claude-loom/daemon dev" >&2
    echo "         → or set LOOM_NO_AUTO_UI=1 in your shell to disable lazy launch" >&2
    exit 1
fi

exit 0  # dev mode (continue) or unknown (graceful)
