#!/usr/bin/env bash
# tests/conventions_test.sh — CC + GitHub Flow conventions validation
#
# REQ-012, REQ-013, REQ-014 をカバー

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="$ROOT_DIR/templates/claude-loom/project.json.template"
GUIDE="$ROOT_DIR/docs/COMMIT_GUIDE.md"

failures=0

# ----- REQ-012: commit_prefixes contains 11 CC types -----
required_prefixes=("feat" "fix" "docs" "style" "refactor" "perf" "test" "build" "ci" "chore" "revert")

if [ ! -f "$TEMPLATE" ]; then
  echo "FAIL: REQ-012: template file not found at $TEMPLATE"
  failures=$((failures + 1))
else
  template_prefixes=$(jq -r '.rules.commit_prefixes[]?' "$TEMPLATE" 2>/dev/null || true)
  missing_prefixes=()
  for p in "${required_prefixes[@]}"; do
    if ! echo "$template_prefixes" | grep -qx "$p"; then
      missing_prefixes+=("$p")
    fi
  done
  if [ ${#missing_prefixes[@]} -gt 0 ]; then
    echo "FAIL: REQ-012: commit_prefixes missing: ${missing_prefixes[*]}"
    failures=$((failures + 1))
  else
    echo "PASS: REQ-012: all 11 commit_prefixes present"
  fi
fi

# ----- REQ-013: branch_types contains 10 types -----
required_branch_types=("feat" "fix" "docs" "style" "refactor" "perf" "test" "build" "ci" "chore")

if [ -f "$TEMPLATE" ]; then
  template_branch_types=$(jq -r '.rules.branch_types[]?' "$TEMPLATE" 2>/dev/null || true)
  missing_branch_types=()
  for b in "${required_branch_types[@]}"; do
    if ! echo "$template_branch_types" | grep -qx "$b"; then
      missing_branch_types+=("$b")
    fi
  done
  if [ ${#missing_branch_types[@]} -gt 0 ]; then
    echo "FAIL: REQ-013: branch_types missing: ${missing_branch_types[*]}"
    failures=$((failures + 1))
  else
    echo "PASS: REQ-013: all 10 branch_types present"
  fi
fi

# ----- REQ-014: COMMIT_GUIDE.md exists and is non-empty -----
if [ ! -s "$GUIDE" ]; then
  echo "FAIL: REQ-014: docs/COMMIT_GUIDE.md not found or empty"
  failures=$((failures + 1))
else
  echo "PASS: REQ-014: docs/COMMIT_GUIDE.md present"
fi

if [ "$failures" -gt 0 ]; then
  echo "conventions_test FAILED with $failures violations"
  exit 1
fi

echo "conventions_test passed"
