#!/usr/bin/env bash
# tests/m0115_t8_readme_autolaunch_test.sh — M0.11.5 t8: README auto-launch section assertion
#
# TDD RED: these assertions fail before README is updated.
# TDD GREEN: assertions pass after README sections are rewritten.
#
# Coverage:
#   NEGATIVE: README.md must NOT contain old "M0.11.5" roadmap tracking text
#   NEGATIVE: README.md must NOT contain old "Phase 2 roadmap" forward-tense text
#   POSITIVE: README.md must mention "LOOM_NO_UI" (opt-out)
#   POSITIVE: README.md must mention "ui.auto_launch" (prefs opt-out)
#   POSITIVE: README.md must mention "cold-start" (behavior description)
#   MIRROR: README.ja.md mirrors all above assertions in Japanese context
#   NEGATIVE: README.ja.md must NOT contain old tracking text
#   POSITIVE: README.ja.md must mention "LOOM_NO_UI"
#   POSITIVE: README.ja.md must mention "ui.auto_launch"
#   POSITIVE: README.ja.md must mention "cold-start" (or equivalent concept)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
README_EN="$ROOT_DIR/README.md"
README_JA="$ROOT_DIR/README.ja.md"

failures=0
pass=0

check_pass() { echo "PASS: $1"; pass=$((pass + 1)); }
check_fail() { echo "FAIL: $1"; failures=$((failures + 1)); }

echo "--- m0115_t8_readme_autolaunch_test ---"

# ── Preconditions: both files exist ───────────────────────────────────────────

if [ -f "$README_EN" ]; then
  check_pass "[README.md] file exists"
else
  check_fail "[README.md] file not found"
  echo "m0115_t8_readme_autolaunch_test: PASS=${pass} FAIL=${failures}"
  exit 1
fi

if [ -f "$README_JA" ]; then
  check_pass "[README.ja.md] file exists"
else
  check_fail "[README.ja.md] file not found"
  echo "m0115_t8_readme_autolaunch_test: PASS=${pass} FAIL=${failures}"
  exit 1
fi

# ── README.md: NEGATIVE — old roadmap tracking text must be gone ──────────────

# Old text: "is tracked as **M0.11.5** (Phase 1 closure cleanup) in [PLAN.md](PLAN.md)"
if grep -q "is tracked as \*\*M0\.11\.5\*\*" "$README_EN"; then
  check_fail "[README.md] still contains old roadmap tracking text 'is tracked as **M0.11.5**' — must be removed"
else
  check_pass "[README.md] old 'is tracked as **M0.11.5**' roadmap text is gone"
fi

# Old text: "Phase 1 closure cleanup" in GUI section context
if grep -q "Phase 1 closure cleanup" "$README_EN"; then
  check_fail "[README.md] still contains 'Phase 1 closure cleanup' text — must be removed"
else
  check_pass "[README.md] 'Phase 1 closure cleanup' text is gone"
fi

# ── README.md: POSITIVE — auto-launch features must be documented ─────────────

# LOOM_NO_UI opt-out
if grep -q "LOOM_NO_UI" "$README_EN"; then
  check_pass "[README.md] contains LOOM_NO_UI opt-out documentation"
else
  check_fail "[README.md] missing LOOM_NO_UI opt-out — must be documented"
fi

# ui.auto_launch prefs opt-out
if grep -q "ui\.auto_launch" "$README_EN"; then
  check_pass "[README.md] contains ui.auto_launch prefs opt-out documentation"
else
  check_fail "[README.md] missing ui.auto_launch prefs opt-out — must be documented"
fi

# cold-start behavior
if grep -q "cold.start" "$README_EN"; then
  check_pass "[README.md] contains cold-start behavior description"
else
  check_fail "[README.md] missing cold-start behavior description"
fi

# ── README.ja.md: NEGATIVE — old roadmap tracking text must be gone ───────────

# Old text: "M0.11.5**（Phase 1 closure cleanup）として [PLAN.md](PLAN.md) に track 中"
if grep -q "track 中" "$README_JA"; then
  check_fail "[README.ja.md] still contains old roadmap 'track 中' text — must be removed"
else
  check_pass "[README.ja.md] old 'track 中' roadmap text is gone"
fi

if grep -q "Phase 1 closure cleanup" "$README_JA"; then
  check_fail "[README.ja.md] still contains 'Phase 1 closure cleanup' text — must be removed"
else
  check_pass "[README.ja.md] 'Phase 1 closure cleanup' text is gone"
fi

# ── README.ja.md: POSITIVE — auto-launch features must be documented ─────────

# LOOM_NO_UI opt-out (same env var name in both languages)
if grep -q "LOOM_NO_UI" "$README_JA"; then
  check_pass "[README.ja.md] contains LOOM_NO_UI opt-out documentation"
else
  check_fail "[README.ja.md] missing LOOM_NO_UI opt-out — must be documented"
fi

# ui.auto_launch prefs opt-out
if grep -q "ui\.auto_launch" "$README_JA"; then
  check_pass "[README.ja.md] contains ui.auto_launch prefs opt-out documentation"
else
  check_fail "[README.ja.md] missing ui.auto_launch prefs opt-out — must be documented"
fi

# cold-start or equivalent (Japanese README can use cold-start as-is or 初回起動時)
if grep -qE "cold.start|初回起動時" "$README_JA"; then
  check_pass "[README.ja.md] contains cold-start / 初回起動時 concept"
else
  check_fail "[README.ja.md] missing cold-start or 初回起動時 equivalent concept"
fi

# ── Mirror structure check: both must have Development workflow section ────────

if grep -q "Development workflow" "$README_EN"; then
  check_pass "[README.md] contains 'Development workflow' section"
else
  check_fail "[README.md] missing 'Development workflow' section"
fi

if grep -qE "Development workflow|開発 workflow|開発時の起動" "$README_JA"; then
  check_pass "[README.ja.md] contains Development workflow / 開発 section"
else
  check_fail "[README.ja.md] missing Development workflow section (EN or JA)"
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "m0115_t8_readme_autolaunch_test: PASS=${pass} FAIL=${failures}"

if [ "$failures" -gt 0 ]; then
  echo "m0115_t8_readme_autolaunch_test FAILED with $failures violations"
  exit 1
fi

echo "m0115_t8_readme_autolaunch_test passed"
