#!/usr/bin/env bash
# tests/run_tests.sh — claude-loom test harness
#
# Usage:
#   ./tests/run_tests.sh           # run all tests
#   ./tests/run_tests.sh install   # run only tests/install_test.sh

set -euo pipefail

TESTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$TESTS_DIR/.." && pwd)"
cd "$ROOT_DIR"

filter="${1:-}"

failed=0
passed=0
skipped=0

for test_file in "$TESTS_DIR"/*_test.sh; do
  [ -e "$test_file" ] || continue
  test_name=$(basename "$test_file" _test.sh)

  if [ -n "$filter" ] && [ "$test_name" != "$filter" ]; then
    skipped=$((skipped + 1))
    continue
  fi

  echo "▶ Running $test_name..."
  if bash "$test_file"; then
    echo "✅ $test_name PASSED"
    passed=$((passed + 1))
  else
    echo "❌ $test_name FAILED"
    failed=$((failed + 1))
  fi
  echo ""
done

echo "=========================================="
echo "Passed: $passed   Failed: $failed   Skipped: $skipped"
echo "=========================================="

if [ -n "$filter" ] && [ "$passed" -eq 0 ] && [ "$failed" -eq 0 ]; then
  echo "WARNING: filter '$filter' matched no tests" >&2
  exit 1
fi

[ "$failed" -eq 0 ]
