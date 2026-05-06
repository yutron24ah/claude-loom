#!/usr/bin/env bash
# tests/docs_release_test.sh — M5 t6: README + CHANGELOG + package.json release readiness checks
#
# REQ-042: README.md has "## ライセンス" section (or placeholder with TODO comment)
#          CHANGELOG.md has "[0.1.0]" entry with non-empty Added section
#          package.json (root) has "version" field in string format

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

echo "=== docs_release_test ==="

# --- README checks ---

# REQ-042a: README.md "## ライセンス" or "## License" section exists (日英両対応)
# README.md primary is English ("## License"), README.ja.md holds Japanese variant.
if grep -qE "^## (ライセンス|License)" "$ROOT_DIR/README.md"; then
  check "README.md has '## ライセンス' or '## License' section" "ok"
else
  check "README.md has '## ライセンス' or '## License' section" "fail"
fi

# REQ-042b: README.md mentions Phase 1 MVP completion
if grep -q "Phase 1 MVP" "$ROOT_DIR/README.md"; then
  check "README.md mentions Phase 1 MVP" "ok"
else
  check "README.md mentions Phase 1 MVP" "fail"
fi

# REQ-042c: removed — internal milestone identifier (M5) exposure in user-facing README is
# not required. English README uses "Phase 1 MVP" language per Phase-based roadmap.

# REQ-042d: README.md has Phase 2 section
if grep -qE "^## Phase 2|Phase 2 以降" "$ROOT_DIR/README.md"; then
  check "README.md has Phase 2 section" "ok"
else
  check "README.md has Phase 2 section" "fail"
fi

# --- CHANGELOG checks ---

# REQ-042e: CHANGELOG.md exists
if [ -f "$ROOT_DIR/CHANGELOG.md" ]; then
  check "CHANGELOG.md exists" "ok"
else
  check "CHANGELOG.md exists" "fail"
fi

# REQ-042f: CHANGELOG.md has [0.1.0] entry
if grep -q "\[0\.1\.0\]" "$ROOT_DIR/CHANGELOG.md"; then
  check "CHANGELOG.md has [0.1.0] entry" "ok"
else
  check "CHANGELOG.md has [0.1.0] entry" "fail"
fi

# REQ-042g: CHANGELOG.md Added section is non-empty (has at least 1 bullet under ### Added)
if grep -A5 "^### Added" "$ROOT_DIR/CHANGELOG.md" 2>/dev/null | grep -q "^- "; then
  check "CHANGELOG.md Added section is non-empty" "ok"
else
  check "CHANGELOG.md Added section is non-empty" "fail"
fi

# --- package.json version checks ---

# REQ-042h: root package.json has "version" field
if jq -e '.version | type == "string"' "$ROOT_DIR/package.json" > /dev/null 2>&1; then
  check "root package.json has version field (string)" "ok"
else
  check "root package.json has version field (string)" "fail"
fi

# REQ-042i: daemon/package.json has "version" field
if jq -e '.version | type == "string"' "$ROOT_DIR/daemon/package.json" > /dev/null 2>&1; then
  check "daemon/package.json has version field (string)" "ok"
else
  check "daemon/package.json has version field (string)" "fail"
fi

# REQ-042j: ui/package.json has "version" field
if jq -e '.version | type == "string"' "$ROOT_DIR/ui/package.json" > /dev/null 2>&1; then
  check "ui/package.json has version field (string)" "ok"
else
  check "ui/package.json has version field (string)" "fail"
fi

echo ""
echo "Passed: $pass   Failed: $fail"

[ "$fail" -eq 0 ]
