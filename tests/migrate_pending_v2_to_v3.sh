#!/usr/bin/env bash
# tests/migrate_pending_v2_to_v3.sh — M0.11.2 t5
# 既存 retro session pending.json を schema_version 2 → 3 migrate
# Pending lifecycle 4 field 後付け書き込み (§3.9.16 + §6.9.6 v3):
#   - carryover_count: 0 (initial)
#   - last_seen_in: <self_retro_id> (own retro_id を default)
#   - expired_at: null
#   - re_evaluated_in: null
#
# macOS bash 3.2 compatible (no declare -A)

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RETRO_DIR="$REPO_ROOT/.claude-loom/retro"

passes=0
fails=0
skipped=0

log() { echo "[migrate-v3] $*"; }
warn() { echo "[migrate-v3:WARN] $*"; }

if [ ! -d "$RETRO_DIR" ]; then
    warn "$RETRO_DIR not found — nothing to migrate"
    exit 0
fi

migrate_session() {
    local session_dir="$1"
    local session_id
    session_id=$(basename "$session_dir")
    local pending="$session_dir/pending.json"

    if [ ! -f "$pending" ]; then
        warn "  $session_id/pending.json not found — skip"
        skipped=$((skipped + 1))
        return
    fi

    if ! jq empty "$pending" 2>/dev/null; then
        echo "[migrate-v3:FAIL]   $session_id/pending.json invalid JSON — skip"
        fails=$((fails + 1))
        return
    fi

    local schema_ver
    schema_ver=$(jq -r '.schema_version // "missing"' "$pending")

    if [ "$schema_ver" = "3" ]; then
        log "  $session_id: already schema_version 3 — skip"
        skipped=$((skipped + 1))
        return
    fi

    if [ "$schema_ver" != "2" ]; then
        warn "  $session_id: schema_version is $schema_ver (expected 2), running v2 migration first is recommended"
        # Proceed anyway — v3 migration is idempotent for missing fields
    fi

    log "  $session_id: migrating schema_version ${schema_ver} → 3"

    python3 - "$session_id" "$pending" <<'PYEOF'
import json
import sys

session_id = sys.argv[1]
pending_path = sys.argv[2]

with open(pending_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Update schema_version
data['schema_version'] = 3

# Migrate each finding — add 4 pending lifecycle fields
migrated_count = 0
for finding in data.get('findings', []):
    if 'carryover_count' not in finding:
        finding['carryover_count'] = 0
    if 'last_seen_in' not in finding:
        # Default to own retro_id (initial value、retro-pm Stage 0 が次 retro で increment 開始)
        finding['last_seen_in'] = session_id
    if 'expired_at' not in finding:
        finding['expired_at'] = None
    if 're_evaluated_in' not in finding:
        finding['re_evaluated_in'] = None
    migrated_count += 1

with open(pending_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"[migrate-v3:python] {session_id}: {migrated_count} findings migrated to schema_version 3")
PYEOF

    local exit_code=$?

    if [ $exit_code -ne 0 ]; then
        echo "[migrate-v3:FAIL]   $session_id: python migration failed"
        fails=$((fails + 1))
        return
    fi

    # Validate the output
    if ! jq empty "$pending" 2>/dev/null; then
        echo "[migrate-v3:FAIL]   $session_id: post-migration JSON invalid"
        fails=$((fails + 1))
        return
    fi

    local new_schema_ver
    new_schema_ver=$(jq -r '.schema_version' "$pending")

    # Verify all 4 new fields exist on every finding
    local field_check
    field_check=$(jq '[.findings[] | select(has("carryover_count") and has("last_seen_in") and has("expired_at") and has("re_evaluated_in") | not)] | length' "$pending")

    if [ "$new_schema_ver" = "3" ] && [ "$field_check" = "0" ]; then
        log "  $session_id: migration complete (schema_version: 3, all findings have 4 new fields)"
        passes=$((passes + 1))
    else
        echo "[migrate-v3:FAIL]   $session_id: schema_version=$new_schema_ver, $field_check findings missing new fields"
        fails=$((fails + 1))
    fi
}

log "Starting M0.11.2 pending.json schema v3 migration (pending lifecycle 4 fields)"
log "Retro dir: $RETRO_DIR"

for session_dir in "$RETRO_DIR"/*/; do
    [ -d "$session_dir" ] || continue
    migrate_session "$session_dir"
done

echo ""
echo "migrate_pending_v2_to_v3 summary: $passes migrated / $skipped skipped / $fails failed"
exit $fails
