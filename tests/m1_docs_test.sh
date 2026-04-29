#!/usr/bin/env bash
# tests/m1_docs_test.sh — M1 daemon doc section validation (Tasks 23 + 24)
#
# Verifies README.md, CLAUDE.md, and DOC_CONSISTENCY_CHECKLIST.md
# contain the required M1 daemon documentation sections.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
README="$ROOT_DIR/README.md"
CLAUDE="$ROOT_DIR/CLAUDE.md"
CHECKLIST="$ROOT_DIR/docs/DOC_CONSISTENCY_CHECKLIST.md"

failures=0

# ----- Task 23-A: README.md has M1 Daemon section -----

if ! grep -q "## Daemon Foundation (M1 から)" "$README"; then
  echo "FAIL [m1-docs]: README.md missing '## Daemon Foundation (M1 から)' section"
  failures=$((failures + 1))
else
  echo "PASS [m1-docs]: README.md has Daemon Foundation section"
fi

if ! grep -qE "pnpm.*daemon|AppRouter|tRPC" "$README"; then
  echo "FAIL [m1-docs]: README.md missing pnpm/AppRouter/tRPC references"
  failures=$((failures + 1))
else
  count=$(grep -cE "pnpm.*daemon|AppRouter|tRPC" "$README" || true)
  if [ "$count" -lt 2 ]; then
    echo "FAIL [m1-docs]: README.md pnpm/AppRouter/tRPC count=$count (need >= 2)"
    failures=$((failures + 1))
  else
    echo "PASS [m1-docs]: README.md has $count pnpm/AppRouter/tRPC references (>= 2)"
  fi
fi

if ! grep -q "127.0.0.1:5757" "$README"; then
  echo "FAIL [m1-docs]: README.md missing daemon bind address 127.0.0.1:5757"
  failures=$((failures + 1))
else
  echo "PASS [m1-docs]: README.md has daemon bind address"
fi

if ! grep -q "Drizzle" "$README"; then
  echo "FAIL [m1-docs]: README.md missing Drizzle reference"
  failures=$((failures + 1))
else
  echo "PASS [m1-docs]: README.md has Drizzle reference"
fi

# ----- Task 23-B: CLAUDE.md has M1 Daemon dev note section -----

if ! grep -q "## Daemon 開発 note（M1 から）" "$CLAUDE"; then
  echo "FAIL [m1-docs]: CLAUDE.md missing '## Daemon 開発 note（M1 から）' section"
  failures=$((failures + 1))
else
  echo "PASS [m1-docs]: CLAUDE.md has Daemon 開発 note section"
fi

if ! grep -qE "pnpm.*daemon|AppRouter|Drizzle|Vitest" "$CLAUDE"; then
  echo "FAIL [m1-docs]: CLAUDE.md missing pnpm/AppRouter/Drizzle/Vitest references"
  failures=$((failures + 1))
else
  count=$(grep -cE "pnpm.*daemon|AppRouter|Drizzle|Vitest" "$CLAUDE" || true)
  if [ "$count" -lt 2 ]; then
    echo "FAIL [m1-docs]: CLAUDE.md pnpm/AppRouter/Drizzle/Vitest count=$count (need >= 2)"
    failures=$((failures + 1))
  else
    echo "PASS [m1-docs]: CLAUDE.md has $count pnpm/AppRouter/Drizzle/Vitest references (>= 2)"
  fi
fi

if ! grep -q "daemon/src/" "$CLAUDE"; then
  echo "FAIL [m1-docs]: CLAUDE.md missing daemon/src/ directory structure"
  failures=$((failures + 1))
else
  echo "PASS [m1-docs]: CLAUDE.md has daemon/src/ directory structure"
fi

# ----- Task 24: DOC_CONSISTENCY_CHECKLIST.md has M1 section -----

checklist_count=$(grep -c "M1 Daemon" "$CHECKLIST" || true)
if [ "$checklist_count" -lt 1 ]; then
  echo "FAIL [m1-docs]: DOC_CONSISTENCY_CHECKLIST.md missing 'M1 Daemon' section (count=$checklist_count)"
  failures=$((failures + 1))
else
  echo "PASS [m1-docs]: DOC_CONSISTENCY_CHECKLIST.md has M1 Daemon section (count=$checklist_count)"
fi

if ! grep -q "daemon/src/db/schema.ts" "$CHECKLIST"; then
  echo "FAIL [m1-docs]: DOC_CONSISTENCY_CHECKLIST.md missing daemon schema.ts check item"
  failures=$((failures + 1))
else
  echo "PASS [m1-docs]: DOC_CONSISTENCY_CHECKLIST.md has daemon schema.ts check item"
fi

if ! grep -q "install.sh" "$CHECKLIST"; then
  echo "FAIL [m1-docs]: DOC_CONSISTENCY_CHECKLIST.md missing install.sh check item"
  failures=$((failures + 1))
else
  echo "PASS [m1-docs]: DOC_CONSISTENCY_CHECKLIST.md has install.sh check item"
fi

if [ "$failures" -gt 0 ]; then
  echo "m1_docs_test FAILED with $failures violations"
  exit 1
fi

echo "m1_docs_test passed"
