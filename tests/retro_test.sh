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

# REQ-025: 4 retro lens に target_artifact 記述
check_lens_tag_fields() {
    local fname="$1"
    if grep -q "target_artifact" "$fname"; then
        echo "PASS [$fname]: documents target_artifact field (M0.11)"
        passes=$((passes + 1))
    else
        echo "FAIL [$fname]: missing target_artifact documentation"
        failures=$((failures + 1))
    fi
}

for fname in agents/loom-retro-pj-judge.md agents/loom-retro-process-judge.md agents/loom-retro-meta-judge.md agents/loom-retro-researcher.md; do
    [ -f "$fname" ] && check_lens_tag_fields "$fname"
done

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

# REQ-027: 4 lens に freeform improvement instruction
for fname in agents/loom-retro-pj-judge.md agents/loom-retro-process-judge.md agents/loom-retro-meta-judge.md agents/loom-retro-researcher.md; do
    if [ -f "$fname" ]; then
        if grep -q "freeform-improvement\|freeform improvement" "$fname"; then
            echo "PASS [retro]: $fname has freeform instruction (M0.13)"
            passes=$((passes + 1))
        else
            echo "FAIL [retro]: $fname missing freeform instruction"
            failures=$((failures + 1))
        fi
    fi
done

# REQ-027: aggregator action plan
if grep -qE "action plan|action_plan|着手項目" agents/loom-retro-aggregator.md; then
    echo "PASS [retro]: aggregator references action plan (M0.13, P3)"
    passes=$((passes + 1))
else
    echo "FAIL [retro]: aggregator missing action plan reference"
    failures=$((failures + 1))
fi

if [ "$failures" -gt 0 ]; then
  echo "retro_test FAILED with $failures violations"
  exit 1
fi

echo "retro_test passed"
