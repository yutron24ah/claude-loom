#!/usr/bin/env bash
# tests/migrate_pending_schema.sh — M0.11.1 t7
# 既存 retro session pending.json を schema_version 1 → 2 migrate
# applied_in + apply_history field を後付け書き込み、apply commit を git log + commit message 解析で推定
#
# macOS bash 3.2 compatible (no declare -A)

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RETRO_DIR="$REPO_ROOT/.claude-loom/retro"

passes=0
fails=0

log() { echo "[migrate] $*"; }
warn() { echo "[migrate:WARN] $*"; }

if [ ! -d "$RETRO_DIR" ]; then
    warn "$RETRO_DIR not found — nothing to migrate"
    exit 0
fi

# ── Migrate each retro session using Python for all JSON manipulation ──────

migrate_session() {
    local session_dir="$1"
    local session_id
    session_id=$(basename "$session_dir")
    local pending="$session_dir/pending.json"

    if [ ! -f "$pending" ]; then
        warn "  $session_id/pending.json not found — skip"
        return
    fi

    if ! jq empty "$pending" 2>/dev/null; then
        echo "[migrate:FAIL]   $session_id/pending.json invalid JSON — skip"
        fails=$((fails + 1))
        return
    fi

    local schema_ver
    schema_ver=$(jq -r '.schema_version // "missing"' "$pending")

    if [ "$schema_ver" = "2" ]; then
        log "  $session_id: already schema_version 2 — skip"
        passes=$((passes + 1))
        return
    fi

    log "  $session_id: migrating schema_version ${schema_ver} → 2"

    python3 - "$session_id" "$pending" <<'PYEOF'
import json
import sys

session_id = sys.argv[1]
pending_path = sys.argv[2]

# apply commit mapping — derived from git log + commit message analysis
# format: key="<session_id>/<finding_id>", value=(commit_sha_or_None, apply_type, note)
apply_map = {
    # === 2026-04-29-001 ===
    # finding-pj-001: PLAN.md staleness → addressed via Phaser fix + plan update commits
    "2026-04-29-001/finding-pj-001": ("300e2cb", "commit", "pj-001 Phaser version drift fix (commit 300e2cb)"),
    # finding-proc-001: TDD red 順序 → M2.1 loom-developer.md codify
    "2026-04-29-001/finding-proc-001": ("d190168", "commit", "proc-001 TDD red 順序 codify in loom-developer.md Strategy a/b"),
    # Others: not yet applied (pending/deferred)
    "2026-04-29-001/finding-proc-002": (None, None, ""),
    "2026-04-29-001/finding-proc-004": (None, None, ""),
    "2026-04-29-001/finding-meta-001": (None, None, ""),
    "2026-04-29-001/finding-pj-002": (None, None, ""),
    "2026-04-29-001/finding-pj-004": (None, None, ""),
    "2026-04-29-001/finding-proc-003": (None, None, ""),
    "2026-04-29-001/finding-pj-003": (None, None, ""),

    # === 2026-05-02-001 ===
    # pj-002 (accepted): README §M2 tRPC sample alignment
    "2026-05-02-001/pj-002": ("860fee3", "commit", "README §M2 tRPC sample aligned (860fee3)"),
    # proc-001 (accepted): dev commit handoff codify
    "2026-05-02-001/proc-001": ("d190168", "commit", "loom-developer Strategy a/b commit handoff codify (d190168)"),
    # proc-002 (accepted): commit handoff strategy codify
    "2026-05-02-001/proc-002": ("d190168", "commit", "loom-pm + loom-developer commit_handoff strategy codify (d190168)"),
    # Others: pending/deferred
    "2026-05-02-001/pj-001": (None, None, ""),
    "2026-05-02-001/pj-003": (None, None, ""),
    "2026-05-02-001/proc-003": (None, None, ""),
    "2026-05-02-001/proc-004": (None, None, ""),
    "2026-05-02-001/proc-005": (None, None, ""),
    "2026-05-02-001/proc-006": (None, None, ""),
    "2026-05-02-001/res-001": (None, None, ""),
    "2026-05-02-001/meta-001": (None, None, ""),
    "2026-05-02-001/meta-002": (None, None, ""),
    "2026-05-02-001/meta-003": (None, None, ""),

    # === 2026-05-02-002 ===
    # pj-001 (approved): Phaser 3→4 version drift fix
    "2026-05-02-002/pj-001": ("300e2cb", "commit", "pj-001 Phaser 3→4 fix (300e2cb)"),
    # pj-002 (for_drop): stale finding — not applied
    "2026-05-02-002/pj-002": (None, None, ""),
    # proc-001 (approved): record-only success record
    "2026-05-02-002/proc-001": (None, "record-only", "record-only: M2.1 codify effect 0-anomaly success record"),
    # res-001 (approved): M3.1 visual regression task
    "2026-05-02-002/res-001": (None, "milestone", "milestone: M3.1 spec phase visual regression task 組み込み予定"),
    # meta-001 (approved): approval_history accumulation → M3.1 milestone planning
    "2026-05-02-002/meta-001": (None, "milestone", "milestone: M3.1 spec phase aggregator promote logic codify 予定"),
    # meta-002 (approved): learned_guidance use_count manual → record-only
    "2026-05-02-002/meta-002": (None, "record-only", "record-only: manual update acknowledged, structural auto-prune M0.11.1 scope"),
    # meta-003 (approved): M2.1 codify effect record
    "2026-05-02-002/meta-003": (None, "record-only", "record-only: M2.1 codify effect record"),
    # proc-NEW-1 (approved): counter-arguer stale check interim safety net
    "2026-05-02-002/proc-NEW-1": ("a3f3cee", "commit", "proc-NEW-1 counter-arguer stale check added (a3f3cee)"),
    # proc-NEW-2 (approved): M0.11.1 milestone insertion
    "2026-05-02-002/proc-NEW-2": ("fd3c1c3", "milestone", "milestone: M0.11.1 lifecycle tracking milestone insertion (fd3c1c3)"),
    # meta-NEW-1 (pending→applied): P4 + 7 agent prompt injection
    "2026-05-02-002/meta-NEW-1": ("e4aa0ea", "commit", "meta-NEW-1 P4 Root cause first + 7 retro agent prompt (e4aa0ea)"),
}

with open(pending_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Update schema_version
data['schema_version'] = 2

# Migrate each finding
for finding in data.get('findings', []):
    fid = finding.get('id', '')
    key = f"{session_id}/{fid}"

    # Ensure fields exist even if not in map
    if 'applied_in' not in finding:
        finding['applied_in'] = None
    if 'apply_history' not in finding:
        finding['apply_history'] = []

    if key in apply_map:
        commit_sha, apply_type, note = apply_map[key]
        if apply_type is not None:
            finding['applied_in'] = {
                "commit_sha": commit_sha,
                "apply_type": apply_type,
                "applied_at": 1778025600
            }
            if note:
                finding['apply_history'] = [{
                    "commit_sha": commit_sha,
                    "apply_type": apply_type,
                    "applied_at": 1778025600,
                    "note": note
                }]

with open(pending_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"[migrate:python] {session_id}: {len(data.get('findings',[]))} findings migrated to schema_version 2")
PYEOF

    local exit_code=$?

    if [ $exit_code -ne 0 ]; then
        echo "[migrate:FAIL]   $session_id: python migration failed"
        fails=$((fails + 1))
        return
    fi

    # Validate the output
    if ! jq empty "$pending" 2>/dev/null; then
        echo "[migrate:FAIL]   $session_id: post-migration JSON invalid"
        fails=$((fails + 1))
        return
    fi

    local new_schema_ver
    new_schema_ver=$(jq -r '.schema_version' "$pending")
    if [ "$new_schema_ver" = "2" ]; then
        log "  $session_id: migration complete (schema_version: 2)"
        passes=$((passes + 1))
    else
        echo "[migrate:FAIL]   $session_id: schema_version not updated (got: $new_schema_ver)"
        fails=$((fails + 1))
    fi
}

log "Starting M0.11.1 pending.json schema v2 migration"
log "Retro dir: $RETRO_DIR"

for session_dir in "$RETRO_DIR"/*/; do
    [ -d "$session_dir" ] || continue
    migrate_session "$session_dir"
done

echo ""
echo "migrate_pending_schema summary: $passes migrated/ok / $fails failed"
exit $fails
