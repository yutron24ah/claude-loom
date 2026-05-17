#!/usr/bin/env bash
# tests/multi_file_skeleton_test.sh — multi-file spec skeleton template validation
#
# Verifies that:
# (a) templates/multi-file-spec-skeleton/SPEC.md.template exists
# (b) templates/multi-file-spec-skeleton/spec/_sample-topic.md.template exists
# (c) SPEC.md.template contains PLACEHOLDER_PROJECT_NAME (existing convention)
# (d) SPEC.md.template contains spec/ reference (topic index)
# (e) SPEC.md.template contains all required sections (§1–§8)
# (f) _sample-topic.md.template contains back-pointer to master SPEC.md
# (g) agents/loom-pm.md mentions multi-file ≥2 times
# (h) commands/loom-spec.md mentions multi-file ≥1 time
# (i) SPEC.md §3.11 parent section exists
#
# This test covers M0.X-spec-plan-multi-file t4 integrity checks.
# t5/t6 checks (g/h) and t2 check (i) are included here for unified
# multi-file harness coverage (as per Task 9 spec).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKELETON_DIR="$ROOT_DIR/templates/multi-file-spec-skeleton"
MASTER="$SKELETON_DIR/SPEC.md.template"
TOPIC="$SKELETON_DIR/spec/_sample-topic.md.template"

failures=0

# ----- Check (a): master template file exists -----
if [ -f "$MASTER" ]; then
  echo "PASS [skeleton-a]: SPEC.md.template exists"
else
  echo "FAIL [skeleton-a]: SPEC.md.template not found at $MASTER"
  failures=$((failures + 1))
fi

# ----- Check (b): topic template file exists -----
if [ -f "$TOPIC" ]; then
  echo "PASS [skeleton-b]: _sample-topic.md.template exists"
else
  echo "FAIL [skeleton-b]: _sample-topic.md.template not found at $TOPIC"
  failures=$((failures + 1))
fi

# ----- Check (c): PLACEHOLDER_PROJECT_NAME present (existing convention) -----
if [ -f "$MASTER" ]; then
  if grep -q "PLACEHOLDER_PROJECT_NAME" "$MASTER"; then
    echo "PASS [skeleton-c]: PLACEHOLDER_PROJECT_NAME found in SPEC.md.template"
  else
    echo "FAIL [skeleton-c]: PLACEHOLDER_PROJECT_NAME missing from SPEC.md.template"
    failures=$((failures + 1))
  fi
fi

# ----- Check (d): spec/ reference present (topic index) -----
if [ -f "$MASTER" ]; then
  spec_ref_count=$(grep -c "spec/" "$MASTER" || true)
  if [ "$spec_ref_count" -ge 1 ]; then
    echo "PASS [skeleton-d]: spec/ referenced $spec_ref_count time(s) in SPEC.md.template"
  else
    echo "FAIL [skeleton-d]: spec/ not referenced in SPEC.md.template (need ≥1)"
    failures=$((failures + 1))
  fi
fi

# ----- Check (e): required sections §1–§8 present -----
if [ -f "$MASTER" ]; then
  required_sections=("## 1." "## 2." "## 3." "## 4." "## 5." "## 6." "## 7." "## 8.")
  for section in "${required_sections[@]}"; do
    if grep -qF "$section" "$MASTER"; then
      echo "PASS [skeleton-e]: section '$section' found in SPEC.md.template"
    else
      echo "FAIL [skeleton-e]: section '$section' missing from SPEC.md.template"
      failures=$((failures + 1))
    fi
  done
fi

# ----- Check (f): _sample-topic.md.template has back-pointer to master SPEC -----
if [ -f "$TOPIC" ]; then
  if grep -q "SPEC.md" "$TOPIC"; then
    echo "PASS [skeleton-f]: master SPEC.md back-pointer found in _sample-topic.md.template"
  else
    echo "FAIL [skeleton-f]: master SPEC.md back-pointer missing from _sample-topic.md.template"
    failures=$((failures + 1))
  fi
fi

# ----- Check (g): agents/loom-pm.md mentions multi-file ≥2 times -----
LOOM_PM="$ROOT_DIR/agents/loom-pm.md"
if [ -f "$LOOM_PM" ]; then
  pm_count=$(grep -c "multi-file" "$LOOM_PM" || true)
  if [ "$pm_count" -ge 2 ]; then
    echo "PASS [skeleton-g]: agents/loom-pm.md mentions multi-file $pm_count time(s) (≥2)"
  else
    echo "FAIL [skeleton-g]: agents/loom-pm.md mentions multi-file $pm_count time(s) (need ≥2)"
    failures=$((failures + 1))
  fi
else
  echo "FAIL [skeleton-g]: agents/loom-pm.md not found"
  failures=$((failures + 1))
fi

# ----- Check (h): commands/loom-spec.md mentions multi-file ≥1 time -----
LOOM_SPEC_CMD="$ROOT_DIR/commands/loom-spec.md"
if [ -f "$LOOM_SPEC_CMD" ]; then
  spec_cmd_count=$(grep -c "multi-file" "$LOOM_SPEC_CMD" || true)
  if [ "$spec_cmd_count" -ge 1 ]; then
    echo "PASS [skeleton-h]: commands/loom-spec.md mentions multi-file $spec_cmd_count time(s) (≥1)"
  else
    echo "FAIL [skeleton-h]: commands/loom-spec.md mentions multi-file $spec_cmd_count time(s) (need ≥1)"
    failures=$((failures + 1))
  fi
else
  echo "FAIL [skeleton-h]: commands/loom-spec.md not found"
  failures=$((failures + 1))
fi

# ----- Check (i): SPEC.md §3.11 parent section exists -----
SPEC_FILE="$ROOT_DIR/SPEC.md"
if [ -f "$SPEC_FILE" ]; then
  if grep -qE "^### 3\.11(\s|$)" "$SPEC_FILE"; then
    echo "PASS [skeleton-i]: SPEC.md §3.11 parent section exists"
  else
    echo "FAIL [skeleton-i]: SPEC.md §3.11 parent section not found"
    failures=$((failures + 1))
  fi
else
  echo "FAIL [skeleton-i]: SPEC.md not found"
  failures=$((failures + 1))
fi

if [ "$failures" -gt 0 ]; then
  echo "multi_file_skeleton_test FAILED with $failures violation(s)"
  exit 1
fi

echo "multi_file_skeleton_test PASSED"
