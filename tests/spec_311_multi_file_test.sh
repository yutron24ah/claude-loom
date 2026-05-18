#!/usr/bin/env bash
# tests/spec_311_multi_file_test.sh — SPEC §3.11 multi-file thinking SSoT validation
#
# Verifies that SPEC.md §3.11 and all 5 sub-sections exist with correct structure.
# This is the integrity check for M0.X-spec-plan-multi-file Task 2.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SPEC="$ROOT_DIR/SPEC.md"

failures=0

# ----- Check 1: §3.11 parent + sub-sections count (≥6 total) -----
# Match ### 3.11 (parent) and #### 3.11.x (sub-sections)
section_count=$(grep -cE "^(###|####) 3\.11(\.|[[:space:]]|$)" "$SPEC" || true)
if [ "$section_count" -lt 6 ]; then
  echo "FAIL [spec-311]: §3.11 parent + sub-section count=$section_count (need ≥6)"
  failures=$((failures + 1))
else
  echo "PASS [spec-311]: §3.11 parent + sub-section count=$section_count (≥6)"
fi

# ----- Check 2: §3.11.1–§3.11.5 sub-sections exist (exactly 5) -----
subsection_count=$(grep -cE "^#### 3\.11\.[1-5]" "$SPEC" || true)
if [ "$subsection_count" -ne 5 ]; then
  echo "FAIL [spec-311]: §3.11.1–§3.11.5 sub-section count=$subsection_count (need exactly 5)"
  failures=$((failures + 1))
else
  echo "PASS [spec-311]: §3.11.1–§3.11.5 sub-section count=$subsection_count (exactly 5)"
fi

# ----- Check 3: §3.11 placed between §3.10 and §4 -----
# Note: §3.10.2 content was migrated to spec/harness.md §6.2 (M0.X-spec-plan-multi-file-dogfood t2)
# Use §3.10 header as stable anchor instead
line_310=$(grep -n "^### 3\.10" "$SPEC" | head -1 | cut -d: -f1)
line_311=$(grep -n "^### 3\.11" "$SPEC" | head -1 | cut -d: -f1)
line_sec4=$(grep -n "^## 4\." "$SPEC" | head -1 | cut -d: -f1)

if [ -z "$line_310" ] || [ -z "$line_311" ] || [ -z "$line_sec4" ]; then
  echo "FAIL [spec-311]: anchor lines not found (§3.10=$line_310, §3.11=$line_311, §4=$line_sec4)"
  failures=$((failures + 1))
elif [ "$line_311" -gt "$line_310" ] && [ "$line_311" -lt "$line_sec4" ]; then
  echo "PASS [spec-311]: §3.11 positioned between §3.10 (line $line_310) and §4 (line $line_sec4) at line $line_311"
else
  echo "FAIL [spec-311]: §3.11 not properly positioned (§3.10=$line_310, §3.11=$line_311, §4=$line_sec4)"
  failures=$((failures + 1))
fi

# ----- Check 4: design spec full path reference present -----
design_spec_ref_count=$(grep -cE "docs/plans/specs/2026-05-17-spec-plan-multi-file-thinking-design\.md" "$SPEC" || true)
if [ "$design_spec_ref_count" -lt 1 ]; then
  echo "FAIL [spec-311]: no full path reference to design spec (need ≥1)"
  failures=$((failures + 1))
else
  echo "PASS [spec-311]: design spec full path referenced $design_spec_ref_count times"
fi

# ----- Check 5: key subsection content (spot check) -----

# §3.11.1: 3 modes present
if ! grep -qE "single-file|spec-split|full split" "$SPEC"; then
  echo "FAIL [spec-311]: §3.11.1 mode keywords (single-file/spec-split/full split) missing"
  failures=$((failures + 1))
else
  echo "PASS [spec-311]: §3.11.1 mode keywords present"
fi

# §3.11.2: axis table (layer-based present)
if ! grep -qE "layer-based|domain-based|feature-group" "$SPEC"; then
  echo "FAIL [spec-311]: §3.11.2 axis keywords missing"
  failures=$((failures + 1))
else
  echo "PASS [spec-311]: §3.11.2 axis keywords present"
fi

# §3.11.3: threshold values present
if ! grep -qE "spec_split_threshold|plan_split_threshold" "$SPEC"; then
  echo "FAIL [spec-311]: §3.11.3 threshold config keys missing"
  failures=$((failures + 1))
else
  echo "PASS [spec-311]: §3.11.3 threshold config keys present"
fi

# §3.11.4: reference syntax present
if ! grep -qE "spec/<topic>" "$SPEC"; then
  echo "FAIL [spec-311]: §3.11.4 reference syntax pattern missing"
  failures=$((failures + 1))
else
  echo "PASS [spec-311]: §3.11.4 reference syntax present"
fi

# §3.11.5: doc consistency check keywords
if ! grep -qE "cross-reference|scope 重複|master index" "$SPEC"; then
  echo "FAIL [spec-311]: §3.11.5 doc consistency check keywords missing"
  failures=$((failures + 1))
else
  echo "PASS [spec-311]: §3.11.5 doc consistency keywords present"
fi

if [ "$failures" -gt 0 ]; then
  echo "spec_311_multi_file_test FAILED with $failures violations"
  exit 1
fi

echo "spec_311_multi_file_test PASSED"
