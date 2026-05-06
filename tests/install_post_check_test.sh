#!/usr/bin/env bash
# tests/install_post_check_test.sh — REQ-051: install.sh post-install stale tsx watch detection
#
# Tests:
#   1. stale tsx watch zombie detected → warning + PID list output
#   2. no stale tsx watch → "No stale tsx watch processes found" message
#   3. pgrep unavailable → graceful fallback, install.sh exit 0 maintained

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ============================================================
# Helper: run install.sh in sandboxed environment
# ============================================================
run_install() {
  local sandbox="$1"
  local loom_home="$2"
  shift 2
  CLAUDE_HOME="$sandbox/.claude" LOOM_HOME="$loom_home" bash "$ROOT_DIR/install.sh" 2>&1
}

# ============================================================
# Test 1: No stale tsx watch processes → clean message
# ============================================================
echo "--- REQ-051 Test 1: no stale tsx watch processes ---"

sandbox1=$(mktemp -d)
loom_home1=$(mktemp -d)
trap 'rm -rf "$sandbox1" "$loom_home1"' EXIT

output1=$(run_install "$sandbox1" "$loom_home1")

if echo "$output1" | grep -q "Post-install check: stale tsx watch processes"; then
  echo "PASS: REQ-051 T1: post-install check section present"
else
  echo "FAIL: REQ-051 T1: post-install check section NOT found in output"
  echo "--- output ---"
  echo "$output1"
  exit 1
fi

if echo "$output1" | grep -q "No stale tsx watch processes found"; then
  echo "PASS: REQ-051 T1: clean environment message present"
else
  echo "FAIL: REQ-051 T1: clean environment message NOT found in output"
  echo "--- output ---"
  echo "$output1"
  exit 1
fi

# ============================================================
# Test 2: Stale tsx watch zombie detected → warning + PID
# ============================================================
echo ""
echo "--- REQ-051 Test 2: stale tsx watch process detected ---"

sandbox2=$(mktemp -d)
loom_home2=$(mktemp -d)
trap 'rm -rf "$sandbox1" "$loom_home1" "$sandbox2" "$loom_home2"' EXIT

# Start a sleep process and mock pgrep by injecting a wrapper into PATH
mock_bin="$sandbox2/mock-bin"
mkdir -p "$mock_bin"

# Write a mock pgrep that outputs a fake PID when called with tsx.*server.ts pattern
cat > "$mock_bin/pgrep" <<'MOCK_PGREP'
#!/usr/bin/env bash
# Mock pgrep: if called with pattern matching tsx.*server.ts, output fake PID
args="$*"
if echo "$args" | grep -qF "tsx"; then
  echo "99999"
  exit 0
fi
# Otherwise fall back to real pgrep if available
if command -v "$(which pgrep 2>/dev/null || true)" >/dev/null 2>&1; then
  exec /usr/bin/pgrep "$@"
fi
exit 1
MOCK_PGREP
chmod +x "$mock_bin/pgrep"

output2=$(PATH="$mock_bin:$PATH" CLAUDE_HOME="$sandbox2/.claude" LOOM_HOME="$loom_home2" bash "$ROOT_DIR/install.sh" 2>&1)

if echo "$output2" | grep -q "WARNING: stale tsx watch processes detected"; then
  echo "PASS: REQ-051 T2: zombie warning present"
else
  echo "FAIL: REQ-051 T2: zombie WARNING NOT found in output"
  echo "--- output ---"
  echo "$output2"
  exit 1
fi

if echo "$output2" | grep -q "PID=99999"; then
  echo "PASS: REQ-051 T2: PID list shown"
else
  echo "FAIL: REQ-051 T2: PID=99999 NOT found in output"
  echo "--- output ---"
  echo "$output2"
  exit 1
fi

if echo "$output2" | grep -q "Recommended cleanup"; then
  echo "PASS: REQ-051 T2: cleanup suggestion present"
else
  echo "FAIL: REQ-051 T2: cleanup suggestion NOT found in output"
  echo "--- output ---"
  echo "$output2"
  exit 1
fi

# ============================================================
# Test 3: pgrep unavailable → graceful fallback, exit 0
# ============================================================
echo ""
echo "--- REQ-051 Test 3: pgrep unavailable → graceful fallback ---"

sandbox3=$(mktemp -d)
loom_home3=$(mktemp -d)
trap 'rm -rf "$sandbox1" "$loom_home1" "$sandbox2" "$loom_home2" "$sandbox3" "$loom_home3"' EXIT

# Create a mock_bin that provides no pgrep (empty placeholder that is not found)
mock_bin3="$sandbox3/mock-bin3"
mkdir -p "$mock_bin3"

# Write a stub that redirects pgrep to not-found by providing a broken stub
# We override PATH to a directory that only has essential tools but NOT pgrep
# Use a wrapper pgrep that exits non-zero (simulates absence)
cat > "$mock_bin3/pgrep" <<'MOCK_PGREP_ABSENT'
#!/usr/bin/env bash
# Simulate pgrep absent / always fails
exit 127
MOCK_PGREP_ABSENT
chmod +x "$mock_bin3/pgrep"

exit_code=0
output3=$(PATH="$mock_bin3:$PATH" CLAUDE_HOME="$sandbox3/.claude" LOOM_HOME="$loom_home3" bash "$ROOT_DIR/install.sh" 2>&1) || exit_code=$?

if [ "$exit_code" -eq 0 ]; then
  echo "PASS: REQ-051 T3: install.sh exit 0 maintained even when pgrep fails"
else
  echo "FAIL: REQ-051 T3: install.sh exited $exit_code (expected 0) when pgrep unavailable"
  echo "--- output ---"
  echo "$output3"
  exit 1
fi

echo ""
echo "All install_post_check_test checks passed"
