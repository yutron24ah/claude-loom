#!/usr/bin/env bash
# tests/dry_run_pending_summary_test.sh — M0.11.2 t6
# pending_summary build mechanism 動作確認 (§3.9.16 + §6.9.8 SSoT)
# 既存 retro session pending.json (v3) で pending_summary build → schema validate
#
# 依存: tests/migrate_pending_v2_to_v3.sh 実行済 (schema_version: 3) が前提
# macOS bash 3.2 compatible

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RETRO_DIR="$REPO_ROOT/.claude-loom/retro"
TEST_RETRO_ID="test-dry-run-pending"
OUTPUT_FILE="/tmp/pending_summary_dry_run_${TEST_RETRO_ID}.json"

passes=0
fails=0

log() { echo "[dry-run-pending] $*"; }
fail_check() { echo "[dry-run-pending:FAIL] $*"; fails=$((fails + 1)); }
pass_check() { echo "[dry-run-pending:PASS] $*"; passes=$((passes + 1)); }

# ── Step 1: Prerequisite check ────────────────────────────────────────────

if [ ! -d "$RETRO_DIR" ]; then
    log "RETRO_DIR not found: $RETRO_DIR (clean-slate environment、graceful skip)"
    pass_check "RETRO_DIR absence treated as graceful skip (no retro sessions to validate)"
    echo ""
    echo "dry_run_pending_summary summary: $passes PASS / $fails FAIL"
    exit 0
fi

# All pending.json must be schema_version 3 (M0.11.2 migration prerequisite)
schema_ok=1
for session_dir in "$RETRO_DIR"/*/; do
    [ -d "$session_dir" ] || continue
    pending="$session_dir/pending.json"
    [ -f "$pending" ] || continue
    ver=$(jq -r '.schema_version // "missing"' "$pending")
    if [ "$ver" != "3" ]; then
        fail_check "$(basename "$session_dir")/pending.json has schema_version=$ver (expected 3, run migrate_pending_v2_to_v3.sh first)"
        schema_ok=0
    fi
done

if [ "$schema_ok" -eq 1 ]; then
    pass_check "All pending.json files are schema_version: 3"
else
    echo ""
    echo "dry_run_pending_summary summary: $passes PASS / $fails FAIL"
    exit $fails
fi

# ── Step 2: Verify v3 lifecycle fields exist on all findings ─────────────

field_check_ok=1
for session_dir in "$RETRO_DIR"/*/; do
    [ -d "$session_dir" ] || continue
    pending="$session_dir/pending.json"
    [ -f "$pending" ] || continue
    session_id=$(basename "$session_dir")
    missing=$(jq '[.findings[] | select(has("carryover_count") and has("last_seen_in") and has("expired_at") and has("re_evaluated_in") | not)] | length' "$pending")
    if [ "$missing" != "0" ]; then
        fail_check "$session_id/pending.json has $missing findings missing v3 lifecycle fields"
        field_check_ok=0
    fi
done

if [ "$field_check_ok" -eq 1 ]; then
    pass_check "All findings across retro sessions have 4 v3 lifecycle fields"
fi

# ── Step 3: Build synthetic pending_summary.json ──────────────────────────
# Filter: status: "pending" + carryover_count >= 1 (本 retro 自身の新規 pending は除外、§3.9.16 a2 design)
# expired (carryover_count >= 3) は status: "expired" として残す (b1 design)

log "Building synthetic pending_summary.json from retro sessions"

python3 - "$RETRO_DIR" "$OUTPUT_FILE" "$TEST_RETRO_ID" <<'PYEOF'
import json
import os
import sys
import time

retro_dir = sys.argv[1]
output_path = sys.argv[2]
test_retro_id = sys.argv[3]

pending_summary_findings = []
total_scanned = 0

for session_id in sorted(os.listdir(retro_dir)):
    session_path = os.path.join(retro_dir, session_id)
    if not os.path.isdir(session_path):
        continue
    pending_path = os.path.join(session_path, "pending.json")
    if not os.path.isfile(pending_path):
        continue

    with open(pending_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    total_scanned += 1

    for finding in data.get("findings", []):
        status = finding.get("status", "")
        carryover_count = finding.get("carryover_count", 0)
        expired_at = finding.get("expired_at", None)
        re_evaluated_in = finding.get("re_evaluated_in", None)

        # scope: pending + carryover >= 1 (§3.9.16 a2)
        if status != "pending":
            continue
        if carryover_count < 1:
            continue
        # promote 済は除外
        if re_evaluated_in is not None:
            continue

        # status flip: auto-expire (carryover >= 3) → "expired" in summary
        summary_status = "expired" if (expired_at is not None or carryover_count >= 3) else "pending"

        pending_summary_findings.append({
            "finding_id": finding.get("id", ""),
            "origin_retro_id": session_id,
            "lens": finding.get("lens", ""),
            "category": finding.get("category", ""),
            "risk": finding.get("risk", "medium"),
            "summary": finding.get("summary", ""),
            "status": summary_status,
            "carryover_count": carryover_count,
            "last_seen_in": finding.get("last_seen_in", session_id),
            "expired_at": expired_at,
            "re_evaluated_in": re_evaluated_in,
        })

result = {
    "schema_version": 1,
    "retro_id": test_retro_id,
    "generated_at": int(time.time() * 1000),
    "total_retro_sessions_scanned": total_scanned,
    "pending_findings": pending_summary_findings,
}

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"[dry-run-pending] built pending_summary: {len(pending_summary_findings)} carryover findings from {total_scanned} retro sessions")
PYEOF

if [ $? -ne 0 ]; then
    fail_check "python build of pending_summary failed"
    echo ""
    echo "dry_run_pending_summary summary: $passes PASS / $fails FAIL"
    exit $fails
fi

# ── Step 4: Validate output schema ────────────────────────────────────────

if [ ! -f "$OUTPUT_FILE" ]; then
    fail_check "Output file not created: $OUTPUT_FILE"
    echo ""
    echo "dry_run_pending_summary summary: $passes PASS / $fails FAIL"
    exit $fails
fi

if ! jq empty "$OUTPUT_FILE" 2>/dev/null; then
    fail_check "Output is invalid JSON"
    echo ""
    echo "dry_run_pending_summary summary: $passes PASS / $fails FAIL"
    exit $fails
fi

pass_check "Output is valid JSON"

# schema_version: 1 check
sv=$(jq -r '.schema_version' "$OUTPUT_FILE")
if [ "$sv" = "1" ]; then
    pass_check "Output schema_version: 1 (§6.9.8 initial)"
else
    fail_check "Output schema_version=$sv (expected 1)"
fi

# Required top-level fields
for field in retro_id generated_at total_retro_sessions_scanned pending_findings; do
    if jq -e "has(\"$field\")" "$OUTPUT_FILE" > /dev/null; then
        pass_check "Top-level field present: $field"
    else
        fail_check "Top-level field missing: $field"
    fi
done

# Per-finding required fields
finding_count=$(jq '.pending_findings | length' "$OUTPUT_FILE")
log "Output contains $finding_count pending_findings"

if [ "$finding_count" -gt 0 ]; then
    missing=$(jq '[.pending_findings[] | select(has("finding_id") and has("origin_retro_id") and has("lens") and has("category") and has("risk") and has("status") and has("carryover_count") and has("last_seen_in") and has("expired_at") and has("re_evaluated_in") | not)] | length' "$OUTPUT_FILE")
    if [ "$missing" = "0" ]; then
        pass_check "All pending_findings have required schema fields (§6.9.8)"
    else
        fail_check "$missing pending_findings are missing required fields"
    fi

    # status enum check
    invalid_status=$(jq '[.pending_findings[] | select(.status != "pending" and .status != "expired")] | length' "$OUTPUT_FILE")
    if [ "$invalid_status" = "0" ]; then
        pass_check "All pending_findings have valid status (pending | expired)"
    else
        fail_check "$invalid_status pending_findings have invalid status value"
    fi

    # carryover_count >= 1 check (scope: carryover 1+ のみ含める)
    invalid_carryover=$(jq '[.pending_findings[] | select(.carryover_count < 1)] | length' "$OUTPUT_FILE")
    if [ "$invalid_carryover" = "0" ]; then
        pass_check "All pending_findings have carryover_count >= 1 (§3.9.16 scope: carryover 1+ のみ)"
    else
        fail_check "$invalid_carryover pending_findings have carryover_count < 1 (should be excluded from summary)"
    fi
else
    log "No carryover pending findings detected (clean state、scope a2 design 通り)"
fi

# ── Cleanup ───────────────────────────────────────────────────────────────

rm -f "$OUTPUT_FILE"

echo ""
echo "dry_run_pending_summary summary: $passes PASS / $fails FAIL"
exit $fails
