#!/bin/sh
# audit-qa-coverage.sh — QA Suite Coverage Audit Gate
#
# WHY: Ensures every qa-suite.js case ID is traceable to a test file via
#      "// covers: <ID>" comment. Orphan covers (refs to non-existent IDs)
#      are also detected to catch typos and rename misses.
#
# Exit codes:
#   0 — all qa-suite.js cases covered (or N/A allowlisted) and no orphan refs
#   1 — one or more cases uncovered or orphan covers detected
#
# Environment overrides (for testing / CI isolation):
#   QA_SUITE_PATH      — path to qa-suite.js   (default: auto-detect from repo root)
#   TEST_SEARCH_DIRS   — space-separated dirs to grep for // covers: (default: ui/test ui/e2e daemon/test)
#   NA_ALLOWLIST_PATH  — path to qa-na-allowlist.txt (default: configs/qa-na-allowlist.txt)
#
# Snapshot mode:
#   --snapshot         — write coverage JSON to docs/audit/<date>-qa-coverage-progress.json

# ── 0. Resolve paths ──────────────────────────────────────────────────────────

# Determine repo root: the directory containing this script's parent (scripts/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# QA suite source
QA_SUITE_PATH="${QA_SUITE_PATH:-${REPO_ROOT}/docs/design/2026-05-17-m0.18-ui-rework/project/qa-suite.js}"

# Test search dirs (space-separated; used as glob roots for // covers: grep)
if [ -z "${TEST_SEARCH_DIRS}" ]; then
  TEST_SEARCH_DIRS="${REPO_ROOT}/ui/test ${REPO_ROOT}/ui/e2e ${REPO_ROOT}/daemon/test"
fi

# N/A allowlist
NA_ALLOWLIST_PATH="${NA_ALLOWLIST_PATH:-${REPO_ROOT}/configs/qa-na-allowlist.txt}"

# ── 1. Validate inputs ────────────────────────────────────────────────────────

if [ ! -f "${QA_SUITE_PATH}" ]; then
  printf 'ERROR: qa-suite.js not found at %s\n' "${QA_SUITE_PATH}" >&2
  exit 1
fi

# ── Setup temp files (POSIX — no process substitution) ───────────────────────
TMPDIR_AUDIT="$(mktemp -d)"
cleanup() { rm -rf "${TMPDIR_AUDIT}"; }
trap cleanup EXIT INT TERM

ALL_IDS_FILE="${TMPDIR_AUDIT}/all_ids.txt"
COVERED_IDS_FILE="${TMPDIR_AUDIT}/covered_ids.txt"
NA_IDS_FILE="${TMPDIR_AUDIT}/na_ids.txt"
UNCOVERED_IDS_FILE="${TMPDIR_AUDIT}/uncovered_ids.txt"
MISSING_IDS_FILE="${TMPDIR_AUDIT}/missing_ids.txt"
ORPHAN_IDS_FILE="${TMPDIR_AUDIT}/orphan_ids.txt"

# ── 2. Extract all case IDs from qa-suite.js ─────────────────────────────────
# Pattern: id: 'XXX-YY-NN' (with optional surrounding whitespace)
# Strips surrounding quotes to get bare IDs.
grep -E "id:[[:space:]]*'[A-Z][A-Z0-9]*(-[A-Z0-9]+)+'" "${QA_SUITE_PATH}" \
  | grep -oE "'[A-Z][A-Z0-9]*(-[A-Z0-9]+)+'" \
  | tr -d "'" \
  | sort -u > "${ALL_IDS_FILE}"

TOTAL_IDS="$(wc -l < "${ALL_IDS_FILE}" | tr -d ' ')"

# ── 3. Extract covered IDs from test files ────────────────────────────────────
# Pattern: // covers: ID1, ID2, ID3  (comma-separated, optional spaces)
# Each ID on a covers line is extracted individually.
: > "${COVERED_IDS_FILE}"

for SEARCH_DIR in ${TEST_SEARCH_DIRS}; do
  if [ -d "${SEARCH_DIR}" ]; then
    # grep -rh: recursive, no filename prefix
    # Extract the part after "// covers:" then split on commas
    grep -rh -E '//[[:space:]]*covers:[[:space:]]*[A-Z][A-Z0-9]*(-[A-Z0-9]+)+' \
      "${SEARCH_DIR}" 2>/dev/null \
      | sed 's|.*//[[:space:]]*covers:[[:space:]]*||' \
      | tr ',' '\n' \
      | sed 's/[[:space:]]//g' \
      | grep -E '^[A-Z][A-Z0-9]*(-[A-Z0-9]+)+$' >> "${COVERED_IDS_FILE}"
  fi
done

sort -u "${COVERED_IDS_FILE}" -o "${COVERED_IDS_FILE}"

# ── 4. Load N/A allowlist ─────────────────────────────────────────────────────
: > "${NA_IDS_FILE}"
if [ -f "${NA_ALLOWLIST_PATH}" ]; then
  # Lines: <CASE-ID>  # <justification>  (skip comment-only and blank lines)
  grep -v '^[[:space:]]*#' "${NA_ALLOWLIST_PATH}" \
    | grep -E '^[A-Z][A-Z0-9]*(-[A-Z0-9]+)+[[:space:]]' \
    | awk '{print $1}' \
    | sort -u > "${NA_IDS_FILE}"
fi

# ── 5. Compute missing (uncovered and not N/A) ────────────────────────────────
# comm -23: lines only in ALL_IDS (= uncovered)
comm -23 "${ALL_IDS_FILE}" "${COVERED_IDS_FILE}" > "${UNCOVERED_IDS_FILE}"

# Remove N/A IDs from uncovered
comm -23 "${UNCOVERED_IDS_FILE}" "${NA_IDS_FILE}" > "${MISSING_IDS_FILE}"

MISSING_COUNT="$(wc -l < "${MISSING_IDS_FILE}" | tr -d ' ')"

# ── 6. Orphan covers detection ────────────────────────────────────────────────
# IDs in COVERED_IDS that are NOT in ALL_IDS = orphan (typo / renamed / deleted case)
comm -23 "${COVERED_IDS_FILE}" "${ALL_IDS_FILE}" > "${ORPHAN_IDS_FILE}"

ORPHAN_COUNT="$(wc -l < "${ORPHAN_IDS_FILE}" | tr -d ' ')"

# ── 7. Output ─────────────────────────────────────────────────────────────────

COVERED_COUNT="$(wc -l < "${COVERED_IDS_FILE}" | tr -d ' ')"
NA_COUNT="$(wc -l < "${NA_IDS_FILE}" | tr -d ' ')"

printf '═══════════════════════════════════════════════════════\n'
printf ' QA Suite Coverage Audit\n'
printf '═══════════════════════════════════════════════════════\n'
printf ' Total cases in qa-suite.js : %d\n' "${TOTAL_IDS}"
printf ' Covered (// covers: refs)  : %d\n' "${COVERED_COUNT}"
printf ' N/A allowlisted            : %d\n' "${NA_COUNT}"
printf ' Missing (need coverage)    : %d\n' "${MISSING_COUNT}"
printf ' Orphan covers (typo/stale) : %d\n' "${ORPHAN_COUNT}"
printf '───────────────────────────────────────────────────────\n'

FAIL=0

if [ "${MISSING_COUNT}" -gt 0 ]; then
  printf '\nMISSING — uncovered cases (%d):\n' "${MISSING_COUNT}"
  cat "${MISSING_IDS_FILE}"
  FAIL=1
fi

if [ "${ORPHAN_COUNT}" -gt 0 ]; then
  printf '\nORPHAN // covers: refs (case ID not in qa-suite.js) (%d):\n' "${ORPHAN_COUNT}"
  cat "${ORPHAN_IDS_FILE}"
  FAIL=1
fi

if [ "${FAIL}" -eq 0 ]; then
  printf '\nAll %d cases covered (covered: %d + N/A: %d). OK\n' \
    "${TOTAL_IDS}" "${COVERED_COUNT}" "${NA_COUNT}"
fi

# ── 8. Snapshot mode (--snapshot) ────────────────────────────────────────────
if [ "$1" = "--snapshot" ]; then
  SNAPSHOT_DIR="${REPO_ROOT}/docs/audit"
  mkdir -p "${SNAPSHOT_DIR}"
  SNAP_DATE="$(date '+%Y-%m-%d')"
  SNAP_FILE="${SNAPSHOT_DIR}/${SNAP_DATE}-qa-coverage-progress.json"
  STATUS="$([ "${FAIL}" -eq 0 ] && printf 'green' || printf 'red')"
  cat > "${SNAP_FILE}" <<JSON
{
  "snapshot_date": "${SNAP_DATE}",
  "total_cases": ${TOTAL_IDS},
  "covered": ${COVERED_COUNT},
  "n_a_allowlist": ${NA_COUNT},
  "missing": ${MISSING_COUNT},
  "orphan_covers": ${ORPHAN_COUNT},
  "audit_script_ci_status": "${STATUS}"
}
JSON
  printf '\nSnapshot written: %s\n' "${SNAP_FILE}"
fi

exit "${FAIL}"
