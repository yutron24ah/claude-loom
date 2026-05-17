#!/usr/bin/env bash
# tests/retro_test.sh — M0.8 retro architecture validation
#
# REQ-017, REQ-018 をカバー（REQ-015/016 は既存 skills_test/agents_test に流れ込む）

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USER_PREFS_TPL="$ROOT_DIR/templates/user-prefs.json.template"
PROJECT_PREFS_TPL="$ROOT_DIR/templates/project-prefs.json.template"
GUIDE="$ROOT_DIR/docs/RETRO_GUIDE.md"

failures=0
passes=0

# ----- REQ-017 (a): user-prefs.json.template valid + schema_version -----
if [ ! -f "$USER_PREFS_TPL" ]; then
  echo "FAIL: REQ-017a: user-prefs.json.template not found at $USER_PREFS_TPL"
  failures=$((failures + 1))
else
  if ! jq empty "$USER_PREFS_TPL" 2>/dev/null; then
    echo "FAIL: REQ-017a: user-prefs.json.template invalid JSON"
    failures=$((failures + 1))
  else
    schema_ver=$(jq -r '.schema_version // empty' "$USER_PREFS_TPL")
    if [ "$schema_ver" != "1" ]; then
      echo "FAIL: REQ-017a: user-prefs.json.template missing schema_version: 1 (got: $schema_ver)"
      failures=$((failures + 1))
    else
      echo "PASS: REQ-017a: user-prefs.json.template valid + schema_version present"
    fi
  fi
fi

# ----- REQ-017 (b): project-prefs.json.template valid + schema_version -----
if [ ! -f "$PROJECT_PREFS_TPL" ]; then
  echo "FAIL: REQ-017b: project-prefs.json.template not found at $PROJECT_PREFS_TPL"
  failures=$((failures + 1))
else
  if ! jq empty "$PROJECT_PREFS_TPL" 2>/dev/null; then
    echo "FAIL: REQ-017b: project-prefs.json.template invalid JSON"
    failures=$((failures + 1))
  else
    schema_ver=$(jq -r '.schema_version // empty' "$PROJECT_PREFS_TPL")
    if [ "$schema_ver" != "1" ]; then
      echo "FAIL: REQ-017b: project-prefs.json.template missing schema_version: 1 (got: $schema_ver)"
      failures=$((failures + 1))
    else
      echo "PASS: REQ-017b: project-prefs.json.template valid + schema_version present"
    fi
  fi
fi

# ----- REQ-018: RETRO_GUIDE.md exists + non-empty + 4 lens names + category enum -----
if [ ! -s "$GUIDE" ]; then
  echo "FAIL: REQ-018: docs/RETRO_GUIDE.md not found or empty"
  failures=$((failures + 1))
else
  required_lens_names=("pj-axis" "process-axis" "researcher" "meta-axis")
  missing_lenses=()
  for lens in "${required_lens_names[@]}"; do
    if ! grep -qF "$lens" "$GUIDE"; then
      missing_lenses+=("$lens")
    fi
  done
  if [ ${#missing_lenses[@]} -gt 0 ]; then
    echo "FAIL: REQ-018: RETRO_GUIDE.md missing lens names: ${missing_lenses[*]}"
    failures=$((failures + 1))
  fi

  required_categories=("spec-drift-doc-update" "process-tdd-violation" "researcher-plugin-suggestion" "meta-auto-apply-proposal")
  missing_cats=()
  for cat in "${required_categories[@]}"; do
    if ! grep -qF "$cat" "$GUIDE"; then
      missing_cats+=("$cat")
    fi
  done
  if [ ${#missing_cats[@]} -gt 0 ]; then
    echo "FAIL: REQ-018: RETRO_GUIDE.md missing category enum entries: ${missing_cats[*]}"
    failures=$((failures + 1))
  fi

  if [ ${#missing_lenses[@]} -eq 0 ] && [ ${#missing_cats[@]} -eq 0 ]; then
    echo "PASS: REQ-018: RETRO_GUIDE.md present with 4 lens names + category enum"
  fi
fi

# REQ-025: loom-retro skill (4 lens template + aggregator) に target_artifact 記述
# Post 2026-05 skill migration: retro lens は agent file ではなく skills/loom-retro/SKILL.md 内 template
RETRO_SKILL="$ROOT_DIR/skills/loom-retro/SKILL.md"
if [ -f "$RETRO_SKILL" ]; then
    if grep -q "target_artifact" "$RETRO_SKILL"; then
        echo "PASS [skills]: loom-retro skill documents target_artifact field (M0.11)"
        passes=$((passes + 1))
    else
        echo "FAIL [skills]: loom-retro skill missing target_artifact documentation"
        failures=$((failures + 1))
    fi
else
    echo "FAIL: skills/loom-retro/SKILL.md not found"
    failures=$((failures + 1))
fi

# REQ-027: retro 基本方針 + freeform + action plan assertion
check_retro_principles() {
    if grep -qE "P1|P2|P3|基本方針" docs/RETRO_GUIDE.md; then
        echo "PASS [retro]: RETRO_GUIDE has 基本方針 P1/P2/P3 (M0.13)"
        passes=$((passes + 1))
    else
        echo "FAIL [retro]: RETRO_GUIDE missing 基本方針"
        failures=$((failures + 1))
    fi
}
check_retro_principles

# REQ-027: loom-retro skill に freeform improvement instruction (旧 4 lens 各 agent → 統合 1 skill)
if [ -f "$RETRO_SKILL" ]; then
    if grep -q "freeform-improvement\|freeform improvement\|Freeform improvement" "$RETRO_SKILL"; then
        echo "PASS [skills]: loom-retro skill has freeform instruction (M0.13)"
        passes=$((passes + 1))
    else
        echo "FAIL [skills]: loom-retro skill missing freeform instruction"
        failures=$((failures + 1))
    fi
fi

# REQ-027: aggregator template action plan (旧 loom-retro-aggregator.md → AGGREGATOR_TEMPLATE in skill)
if [ -f "$RETRO_SKILL" ] && grep -qE "action plan|action_plan|Action plan|着手項目" "$RETRO_SKILL"; then
    echo "PASS [skills]: loom-retro skill AGGREGATOR_TEMPLATE references action plan (M0.13, P3)"
    passes=$((passes + 1))
else
    echo "FAIL [skills]: loom-retro skill missing action plan reference"
    failures=$((failures + 1))
fi

# REQ-035 / M0.11.2 — pending.json schema_version 3 + pending lifecycle 4 field
RETRO_DIR="$ROOT_DIR/.claude-loom/retro"

check_pending_schema_v3() {
    local session_dir="$1"
    local session_id
    session_id=$(basename "$session_dir")
    local pending="$session_dir/pending.json"
    if [ ! -f "$pending" ]; then
        echo "SKIP [retro]: $session_id/pending.json not found, skip schema v3 check"
        return
    fi
    if ! jq empty "$pending" 2>/dev/null; then
        echo "FAIL [retro]: $session_id/pending.json invalid JSON"
        failures=$((failures + 1))
        return
    fi
    local schema_ver
    schema_ver=$(jq -r '.schema_version // "missing"' "$pending")
    if [ "$schema_ver" = "3" ]; then
        echo "PASS [retro]: $session_id/pending.json has schema_version: 3 (M0.11.2 §6.9.6 v3)"
        passes=$((passes + 1))
    else
        echo "FAIL [retro]: $session_id/pending.json schema_version=$schema_ver (expected 3)"
        failures=$((failures + 1))
    fi
}

check_pending_lifecycle_fields() {
    local session_dir="$1"
    local session_id
    session_id=$(basename "$session_dir")
    local pending="$session_dir/pending.json"
    if [ ! -f "$pending" ]; then
        return
    fi
    # All findings should have 4 pending lifecycle fields after v3 migration
    local missing
    missing=$(jq '[.findings[] | select(has("carryover_count") and has("last_seen_in") and has("expired_at") and has("re_evaluated_in") | not)] | length' "$pending" 2>/dev/null || echo 1)
    if [ "$missing" -eq 0 ]; then
        echo "PASS [retro]: $session_id/pending.json all findings have 4 pending lifecycle fields (M0.11.2)"
        passes=$((passes + 1))
    else
        echo "FAIL [retro]: $session_id/pending.json has $missing findings missing pending lifecycle fields"
        failures=$((failures + 1))
    fi
}

check_pending_applied_in_field() {
    local session_dir="$1"
    local session_id
    session_id=$(basename "$session_dir")
    local pending="$session_dir/pending.json"
    if [ ! -f "$pending" ]; then
        return
    fi
    # All findings (approved or pending) should have applied_in field after migration
    local missing
    missing=$(jq '[.findings[] | select(has("applied_in") | not)] | length' "$pending" 2>/dev/null || echo 1)
    if [ "$missing" -eq 0 ]; then
        echo "PASS [retro]: $session_id/pending.json all findings have applied_in field (REQ-035 M0.11.1)"
        passes=$((passes + 1))
    else
        echo "FAIL [retro]: $session_id/pending.json has $missing findings missing applied_in field"
        failures=$((failures + 1))
    fi
}

check_pending_apply_history_field() {
    local session_dir="$1"
    local session_id
    session_id=$(basename "$session_dir")
    local pending="$session_dir/pending.json"
    if [ ! -f "$pending" ]; then
        return
    fi
    # All findings should have apply_history array field after migration
    local missing
    missing=$(jq '[.findings[] | select(has("apply_history") | not)] | length' "$pending" 2>/dev/null || echo 1)
    if [ "$missing" -eq 0 ]; then
        echo "PASS [retro]: $session_id/pending.json all findings have apply_history field (REQ-035 M0.11.1)"
        passes=$((passes + 1))
    else
        echo "FAIL [retro]: $session_id/pending.json has $missing findings missing apply_history field"
        failures=$((failures + 1))
    fi
}

if [ -d "$RETRO_DIR" ]; then
    for session_dir in "$RETRO_DIR"/*/; do
        [ -d "$session_dir" ] || continue
        check_pending_schema_v3 "$session_dir"
        check_pending_applied_in_field "$session_dir"
        check_pending_apply_history_field "$session_dir"
        check_pending_lifecycle_fields "$session_dir"
    done
else
    echo "SKIP [retro]: $RETRO_DIR not found, skip pending.json schema v2 checks"
fi

if [ "$failures" -gt 0 ]; then
  echo "retro_test FAILED with $failures violations"
  exit 1
fi

echo "retro_test passed"
