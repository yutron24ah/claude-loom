#!/usr/bin/env bash
# tests/redesign_invariant_test.sh — mock fixture 保全 invariant test
#
# REQ-079: redesign/ mock fixture (scenarios.js / screens/*.jsx / Redesign App.html /
# cat.jsx / styles.css / tokens.css / _chat{1,2}.md / _BUNDLE_README.md) が
# 消去・改変されていないことを SHA-256 hash で verify する
#
# SPEC §3.6.14.3 の "編集禁止 / 削除禁止" 規律を構造的に gate する harness test。
# baseline file: tests/.redesign-invariant-baseline.txt

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE="$ROOT_DIR/tests/.redesign-invariant-baseline.txt"

# Protected files (relative to ROOT_DIR) — SPEC §3.6.14.3 編集禁止 file table より
PROTECTED_FILES=(
  "redesign/scenarios.js"
  "redesign/Redesign App.html"
  "redesign/cat.jsx"
  "redesign/styles.css"
  "redesign/tokens.css"
  "redesign/_chat1.md"
  "redesign/_chat2.md"
  "redesign/_BUNDLE_README.md"
  "redesign/screens/agent-detail.jsx"
  "redesign/screens/consistency.jsx"
  "redesign/screens/customization.jsx"
  "redesign/screens/gantt.jsx"
  "redesign/screens/guidance.jsx"
  "redesign/screens/plan.jsx"
  "redesign/screens/retro.jsx"
  "redesign/screens/room.jsx"
  "redesign/screens/sessions.jsx"
  "redesign/screens/settings.jsx"
  "redesign/screens/tokens.jsx"
  "redesign/screens/worktree.jsx"
)

failures=0
checks=0

# ------------------------------------------------------------------
# Step 1: baseline file must exist
# ------------------------------------------------------------------
if [ ! -f "$BASELINE" ]; then
  echo "FAIL: baseline file not found: tests/.redesign-invariant-baseline.txt"
  echo "  Run: bash tests/redesign_invariant_test.sh --generate-baseline  to create it"
  exit 1
fi

# ------------------------------------------------------------------
# Step 2: for each protected file, assert existence + hash match
# ------------------------------------------------------------------
for rel_path in "${PROTECTED_FILES[@]}"; do
  abs_path="$ROOT_DIR/$rel_path"
  checks=$((checks + 1))

  # Assert: file must exist
  if [ ! -f "$abs_path" ]; then
    echo "FAIL [$rel_path]: file does not exist (deletion detected)"
    failures=$((failures + 1))
    continue
  fi

  # Compute current SHA-256 hash
  current_hash=$(shasum -a 256 "$abs_path" | awk '{print $1}')

  # Look up baseline hash
  # baseline format: "<hash>  <rel_path>" (shasum -a 256 output, 2 spaces before path)
  baseline_entry=$(grep -F "  $rel_path" "$BASELINE" 2>/dev/null || true)

  if [ -z "$baseline_entry" ]; then
    echo "FAIL [$rel_path]: no baseline entry found in $BASELINE"
    failures=$((failures + 1))
    continue
  fi

  expected_hash=$(echo "$baseline_entry" | awk '{print $1}')

  if [ "$current_hash" = "$expected_hash" ]; then
    echo "PASS [$rel_path]: hash match ($current_hash)"
  else
    echo "FAIL [$rel_path]: hash mismatch (tampering detected)"
    echo "  expected: $expected_hash"
    echo "  actual:   $current_hash"
    failures=$((failures + 1))
  fi
done

echo ""
echo "Checked: $checks  Failed: $failures"

[ "$failures" -eq 0 ]
