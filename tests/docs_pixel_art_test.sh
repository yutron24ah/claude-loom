#!/usr/bin/env bash
# tests/docs_pixel_art_test.sh — M5 t1: PIXEL_ART_HANDOFF.md validation
#
# REQ-041: docs/PIXEL_ART_HANDOFF.md が存在 + 非空 + 4 section 以上含む

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HANDOFF="$ROOT_DIR/docs/PIXEL_ART_HANDOFF.md"

failures=0

# REQ-041a: file exists and is non-empty
if [ ! -s "$HANDOFF" ]; then
  echo "FAIL [REQ-041a]: docs/PIXEL_ART_HANDOFF.md not found or empty"
  failures=$((failures + 1))
else
  echo "PASS [REQ-041a]: docs/PIXEL_ART_HANDOFF.md exists and is non-empty"
fi

# REQ-041b: has at least 4 sections (## headings)
if [ -f "$HANDOFF" ]; then
  section_count=$(grep -c "^## " "$HANDOFF" || true)
  if [ "$section_count" -lt 4 ]; then
    echo "FAIL [REQ-041b]: docs/PIXEL_ART_HANDOFF.md has $section_count section(s), need >= 4"
    failures=$((failures + 1))
  else
    echo "PASS [REQ-041b]: docs/PIXEL_ART_HANDOFF.md has $section_count section(s) (>= 4)"
  fi
fi

# REQ-041c: Vision section present (SPEC §12 visual direction)
if [ -f "$HANDOFF" ] && grep -q "Vision" "$HANDOFF"; then
  echo "PASS [REQ-041c]: docs/PIXEL_ART_HANDOFF.md has Vision section"
else
  echo "FAIL [REQ-041c]: docs/PIXEL_ART_HANDOFF.md missing Vision section"
  failures=$((failures + 1))
fi

# REQ-041d: placeholder state section present (agent list or tile map reference)
if [ -f "$HANDOFF" ] && grep -qE "placeholder|Placeholder" "$HANDOFF"; then
  echo "PASS [REQ-041d]: docs/PIXEL_ART_HANDOFF.md references placeholder state"
else
  echo "FAIL [REQ-041d]: docs/PIXEL_ART_HANDOFF.md missing placeholder state reference"
  failures=$((failures + 1))
fi

# REQ-041e: production option section present (Kenney or Option A/B/C/D)
if [ -f "$HANDOFF" ] && grep -qE "Kenney|Option [ABCD]|制作 option|制作option" "$HANDOFF"; then
  echo "PASS [REQ-041e]: docs/PIXEL_ART_HANDOFF.md has production option section"
else
  echo "FAIL [REQ-041e]: docs/PIXEL_ART_HANDOFF.md missing production option section"
  failures=$((failures + 1))
fi

# REQ-041f: post-MVP migration plan present
if [ -f "$HANDOFF" ] && grep -qE "post.MVP|post-MVP|migration" "$HANDOFF"; then
  echo "PASS [REQ-041f]: docs/PIXEL_ART_HANDOFF.md has post-MVP migration reference"
else
  echo "FAIL [REQ-041f]: docs/PIXEL_ART_HANDOFF.md missing post-MVP migration reference"
  failures=$((failures + 1))
fi

if [ "$failures" -gt 0 ]; then
  echo "docs_pixel_art_test FAILED with $failures violations"
  exit 1
fi

echo "docs_pixel_art_test passed"
