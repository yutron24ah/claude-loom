#!/usr/bin/env bash
# tests/root_dev_script_test.sh — REQ-059 (feat/dev-mode-ux item 1A)
#
# WHY: dev-mode workflow UX. `pnpm --filter @claude-loom/ui dev` 単独運用は
# WS が daemon (:5757) に繋がらず disconnect toast が exponential backoff
# 周期で連発する。root `pnpm dev` で daemon + UI を `concurrently` 並走
# 起動できることを契約として固定する。
#
# Contract (REQ-059):
#   - root package.json `scripts.dev` invokes `concurrently`
#   - root package.json `scripts.dev` invokes both `@claude-loom/daemon dev`
#     and `@claude-loom/ui dev`
#   - root package.json declares `concurrently` in devDependencies (so
#     `pnpm install` brings it in for new contributors)

set -euo pipefail

TESTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$TESTS_DIR/.." && pwd)"

pass=0
fail=0

check() {
  local desc="$1"
  local result="$2"
  if [ "$result" = "ok" ]; then
    echo "  PASS: $desc"
    pass=$((pass + 1))
  else
    echo "  FAIL: $desc"
    fail=$((fail + 1))
  fi
}

echo "=== root_dev_script_test ==="

if ! command -v jq >/dev/null 2>&1; then
  echo "  SKIP: jq not installed (test requires jq)" >&2
  exit 0
fi

PKG="$ROOT_DIR/package.json"

# scripts.dev includes "concurrently"
if jq -er '.scripts.dev' "$PKG" 2>/dev/null | grep -q "concurrently"; then
  check "scripts.dev invokes concurrently" "ok"
else
  check "scripts.dev invokes concurrently" "fail"
fi

# scripts.dev includes daemon dev invocation
if jq -er '.scripts.dev' "$PKG" 2>/dev/null | grep -q "@claude-loom/daemon"; then
  check "scripts.dev invokes @claude-loom/daemon dev" "ok"
else
  check "scripts.dev invokes @claude-loom/daemon dev" "fail"
fi

# scripts.dev includes ui dev invocation
if jq -er '.scripts.dev' "$PKG" 2>/dev/null | grep -q "@claude-loom/ui"; then
  check "scripts.dev invokes @claude-loom/ui dev" "ok"
else
  check "scripts.dev invokes @claude-loom/ui dev" "fail"
fi

# concurrently declared as devDependency
if jq -er '.devDependencies.concurrently' "$PKG" >/dev/null 2>&1; then
  check "devDependencies has concurrently" "ok"
else
  check "devDependencies has concurrently" "fail"
fi

echo ""
echo "Passed: $pass   Failed: $fail"
[ "$fail" -eq 0 ]
