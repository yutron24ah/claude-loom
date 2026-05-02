#!/usr/bin/env bash
# tests/dry_run_applied_summary.sh — M0.11.1 t11
# applied_summary build mechanism 動作確認 (rollback 前安全網)
# 既存 retro session pending.json で applied_summary build → schema validate → fixture diff
#
# 依存: tests/migrate_pending_schema.sh 実行済 (schema_version: 2) が前提
# macOS bash 3.2 compatible

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RETRO_DIR="$REPO_ROOT/.claude-loom/retro"
FIXTURE="$REPO_ROOT/tests/fixtures/applied_summary_expected.json"
TEST_RETRO_ID="test-dry-run"
OUTPUT_FILE="/tmp/applied_summary_dry_run_${TEST_RETRO_ID}.json"

passes=0
fails=0

log() { echo "[dry-run] $*"; }
fail_check() { echo "[dry-run:FAIL] $*"; fails=$((fails + 1)); }
pass_check() { echo "[dry-run:PASS] $*"; passes=$((passes + 1)); }

# ── Step 1: Prerequisite check ────────────────────────────────────────────

if [ ! -d "$RETRO_DIR" ]; then
    fail_check "RETRO_DIR not found: $RETRO_DIR"
    echo ""
    echo "dry_run_applied_summary summary: $passes PASS / $fails FAIL"
    exit $fails
fi

# All pending.json must be schema_version 2 (migration prerequisite)
schema_ok=1
for session_dir in "$RETRO_DIR"/*/; do
    [ -d "$session_dir" ] || continue
    pending="$session_dir/pending.json"
    [ -f "$pending" ] || continue
    ver=$(jq -r '.schema_version // "missing"' "$pending")
    if [ "$ver" != "2" ]; then
        fail_check "$(basename "$session_dir")/pending.json has schema_version=$ver (expected 2, run migrate_pending_schema.sh first)"
        schema_ok=0
    fi
done

if [ "$schema_ok" -eq 1 ]; then
    pass_check "All pending.json files are schema_version: 2 (migration prerequisite)"
else
    echo ""
    echo "dry_run_applied_summary summary: $passes PASS / $fails FAIL"
    exit $fails
fi

# ── Step 2: Build applied_summary from existing pending.json ──────────────

log "Building applied_summary from $RETRO_DIR"

python3 - "$RETRO_DIR" "$TEST_RETRO_ID" "$OUTPUT_FILE" <<'PYEOF'
import json
import os
import sys

retro_dir = sys.argv[1]
retro_id = sys.argv[2]
output_path = sys.argv[3]

applied_findings = []
total_sessions = 0

for session_id in sorted(os.listdir(retro_dir)):
    session_dir = os.path.join(retro_dir, session_id)
    if not os.path.isdir(session_dir):
        continue
    pending_path = os.path.join(session_dir, "pending.json")
    if not os.path.exists(pending_path):
        continue

    total_sessions += 1

    with open(pending_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for finding in data.get('findings', []):
        status = finding.get('status', 'pending')
        applied_in = finding.get('applied_in')

        # Extract findings that are approved/accepted AND have applied_in field populated
        if status in ('approved', 'accepted') and applied_in is not None:
            history = finding.get('apply_history', [])
            last_entry = history[-1] if history else None

            summary_text = finding.get('summary', '')
            if not summary_text and finding.get('description'):
                summary_text = finding['description'][:80]

            entry = {
                "finding_id": finding['id'],
                "origin_retro_id": session_id,
                "category": finding.get('category', ''),
                "proposal_type": finding.get('proposal_type'),
                "summary": summary_text,
                "applied_in": {
                    "commit_sha": applied_in.get('commit_sha'),
                    "milestone_tag": applied_in.get('milestone_tag', None),
                    "applied_at": applied_in.get('applied_at', 1778025600),
                    "apply_type": applied_in['apply_type']
                },
                "last_apply_history_entry": {
                    "commit_sha": last_entry.get('commit_sha'),
                    "apply_type": last_entry.get('apply_type'),
                    "note": last_entry.get('note', '')
                } if last_entry else None
            }
            applied_findings.append(entry)

applied_summary = {
    "schema_version": 1,
    "retro_id": retro_id,
    "generated_at": 1778025600,
    "total_retro_sessions": total_sessions,
    "applied_findings": applied_findings
}

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(applied_summary, f, ensure_ascii=False, indent=2)

print(f"[dry-run:python] built applied_summary: {len(applied_findings)} findings from {total_sessions} sessions")
PYEOF

if [ $? -ne 0 ]; then
    fail_check "Python applied_summary build failed"
    echo ""
    echo "dry_run_applied_summary summary: $passes PASS / $fails FAIL"
    exit $fails
fi

pass_check "applied_summary build succeeded: $OUTPUT_FILE"

# ── Step 3: Schema validation ──────────────────────────────────────────────

log "Validating schema structure..."

# Required top-level fields
for field in "schema_version" "retro_id" "generated_at" "total_retro_sessions" "applied_findings"; do
    val=$(jq -r "has(\"$field\")" "$OUTPUT_FILE" 2>/dev/null)
    if [ "$val" = "true" ]; then
        pass_check "applied_summary has required field: $field"
    else
        fail_check "applied_summary missing required field: $field"
    fi
done

# schema_version == 1
sv=$(jq -r '.schema_version' "$OUTPUT_FILE")
if [ "$sv" = "1" ]; then
    pass_check "applied_summary schema_version: 1"
else
    fail_check "applied_summary schema_version=$sv (expected 1)"
fi

# applied_findings is array
arr_type=$(jq -r '.applied_findings | type' "$OUTPUT_FILE")
if [ "$arr_type" = "array" ]; then
    pass_check "applied_findings is array"
else
    fail_check "applied_findings is not array (got: $arr_type)"
fi

# Each entry has required fields
entry_count=$(jq '.applied_findings | length' "$OUTPUT_FILE")
log "Validating $entry_count applied finding entries..."

invalid_entries=$(jq '
  [.applied_findings[] | select(
    (has("finding_id") | not) or
    (has("origin_retro_id") | not) or
    (has("category") | not) or
    (has("applied_in") | not) or
    (.applied_in | type != "object")
  )] | length
' "$OUTPUT_FILE")

if [ "$invalid_entries" -eq 0 ]; then
    pass_check "All $entry_count applied_finding entries have required fields"
else
    fail_check "$invalid_entries entries missing required fields (finding_id/origin_retro_id/category/applied_in)"
fi

# apply_type values are valid enum
invalid_types=$(jq '
  [.applied_findings[].applied_in.apply_type |
   select(. != "immediate" and . != "milestone" and . != "record-only" and . != "rollback")]
  | length
' "$OUTPUT_FILE")

if [ "$invalid_types" -eq 0 ]; then
    pass_check "All applied_in.apply_type values are valid enum (SPEC §6.9.6)"
else
    fail_check "$invalid_types entries have invalid apply_type values"
fi

# total_retro_sessions matches actual session count
session_count=$(ls -d "$RETRO_DIR"/*/ 2>/dev/null | wc -l | tr -d ' ')
total_in_file=$(jq -r '.total_retro_sessions' "$OUTPUT_FILE")
if [ "$total_in_file" -eq "$session_count" ]; then
    pass_check "total_retro_sessions=$total_in_file matches actual session count"
else
    fail_check "total_retro_sessions=$total_in_file but actual session dirs=$session_count"
fi

# ── Step 4: Fixture diff ───────────────────────────────────────────────────

if [ -f "$FIXTURE" ]; then
    log "Comparing with fixture: $FIXTURE"

    # Normalize: remove retro_id (it's the test ID, varies) and generated_at for comparison
    ACTUAL_NORM=$(jq 'del(.retro_id, .generated_at)' "$OUTPUT_FILE")
    EXPECTED_NORM=$(jq 'del(.retro_id, .generated_at)' "$FIXTURE")

    if [ "$ACTUAL_NORM" = "$EXPECTED_NORM" ]; then
        pass_check "applied_summary matches fixture (after retro_id/generated_at normalization)"
    else
        fail_check "applied_summary differs from fixture"
        # Show diff for debugging
        diff <(echo "$ACTUAL_NORM" | jq -S .) <(echo "$EXPECTED_NORM" | jq -S .) | head -40
    fi
else
    log "WARNING: Fixture not found at $FIXTURE, generating baseline..."
    cp "$OUTPUT_FILE" "$FIXTURE"
    # Update retro_id to test-dry-run
    jq '.retro_id = "test-dry-run" | .generated_at = 1778025600' "$FIXTURE" > /tmp/fixture_tmp.json && mv /tmp/fixture_tmp.json "$FIXTURE"
    pass_check "Fixture generated at $FIXTURE (baseline for future runs)"
fi

# ── Cleanup ────────────────────────────────────────────────────────────────

rm -f "$OUTPUT_FILE"

echo ""
echo "dry_run_applied_summary summary: $passes PASS / $fails FAIL"
exit $fails
