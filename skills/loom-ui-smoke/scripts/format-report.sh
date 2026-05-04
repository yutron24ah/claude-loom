#!/usr/bin/env bash
# skills/loom-ui-smoke/scripts/format-report.sh
#
# Stage 3 deterministic report formatter for loom-ui-smoke skill.
# Reads findings JSON from stdin, validates against schema, and generates:
#   - $SMOKE_OUTPUT_DIR/report.md  (human-readable markdown report)
#   - $SMOKE_OUTPUT_DIR/findings.json  (machine-readable, schema-validated)
#
# Exit codes:
#   0 = success
#   2 = JSON schema validation failure (invalid findings input)
#   3 = missing required input (files / env vars not found)
#
# SPEC §3.6.11.3 Stage 3 bundled script + §3.6.11.9 bash+jq-only constraint
# §3.6.10 SSoT: severity/category values are constant-ized to avoid magic strings
#
# Usage:
#   SMOKE_OUTPUT_DIR=<dir> STRATEGY_FILE=<path> CONSOLE_LOG=<path> \
#   SCREENSHOTS_DIR=<dir> bash format-report.sh < findings.json

set -uo pipefail

# --- Constants (§3.6.10 SSoT: no magic strings) ---
SEVERITY_HIGH="high"
SEVERITY_MEDIUM="medium"
SEVERITY_LOW="low"
SEVERITY_INFO="info"

CATEGORY_RENDERING="rendering"
CATEGORY_DATA_FLOW="data-flow"
CATEGORY_NAVIGATION="navigation"
CATEGORY_THEME="theme"
CATEGORY_INTERACTIVITY="interactivity"
CATEGORY_CONSOLE_ERROR="console-error"
CATEGORY_SCREENSHOT_MISMATCH="screenshot-mismatch"

SCHEMA_VERSION=1

# Silence SC2034 — constants used in documentation/validation context
: "${SEVERITY_HIGH}" "${SEVERITY_MEDIUM}" "${SEVERITY_LOW}" "${SEVERITY_INFO}"
: "${CATEGORY_RENDERING}" "${CATEGORY_DATA_FLOW}" "${CATEGORY_NAVIGATION}"
: "${CATEGORY_THEME}" "${CATEGORY_INTERACTIVITY}" "${CATEGORY_CONSOLE_ERROR}"
: "${CATEGORY_SCREENSHOT_MISMATCH}"

# --- Locate script directory for relative path resolution ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# WHY: SCHEMA_FILE path is kept as a reference constant for external callers
# (e.g., tests that validate findings.json against the schema with jq).
# The formatter validates inline rather than via ajv-cli to satisfy §3.6.11.9 (bash+jq only).
export SCHEMA_FILE="$SCRIPT_DIR/../templates/findings.schema.json"

# --- Global: validated findings JSON (set in main after validation) ---
FINDINGS_JSON=""

# --- Validate required environment variables / files (exit 3 on missing) ---
validate_inputs() {
  local missing=0

  if [ -z "${SMOKE_OUTPUT_DIR:-}" ]; then
    echo "ERROR: SMOKE_OUTPUT_DIR environment variable is not set" >&2
    missing=1
  elif [ ! -d "$SMOKE_OUTPUT_DIR" ]; then
    echo "ERROR: SMOKE_OUTPUT_DIR directory does not exist: $SMOKE_OUTPUT_DIR" >&2
    missing=1
  fi

  if [ -z "${STRATEGY_FILE:-}" ]; then
    echo "ERROR: STRATEGY_FILE environment variable is not set" >&2
    missing=1
  elif [ ! -f "$STRATEGY_FILE" ]; then
    echo "ERROR: STRATEGY_FILE does not exist: $STRATEGY_FILE" >&2
    missing=1
  fi

  if [ -z "${CONSOLE_LOG:-}" ]; then
    echo "ERROR: CONSOLE_LOG environment variable is not set" >&2
    missing=1
  elif [ ! -f "$CONSOLE_LOG" ]; then
    echo "ERROR: CONSOLE_LOG does not exist: $CONSOLE_LOG" >&2
    missing=1
  fi

  if [ -z "${SCREENSHOTS_DIR:-}" ]; then
    echo "ERROR: SCREENSHOTS_DIR environment variable is not set" >&2
    missing=1
  elif [ ! -d "$SCREENSHOTS_DIR" ]; then
    echo "ERROR: SCREENSHOTS_DIR directory does not exist: $SCREENSHOTS_DIR" >&2
    missing=1
  fi

  if [ "$missing" -ne 0 ]; then
    exit 3
  fi
}

# --- Validate findings JSON from raw string ---
# Sets global FINDINGS_JSON on success; exits 2 on validation failure.
# WHY: we validate inline (not in a subshell via $()) so exit 2 reaches the parent process.
validate_findings_json() {
  local raw_json="$1"

  # Validate it is parseable JSON
  if ! printf '%s' "$raw_json" | jq empty 2>/dev/null; then
    echo "ERROR: stdin is not valid JSON" >&2
    exit 2
  fi

  # Validate required top-level fields
  local schema_ver
  schema_ver=$(printf '%s' "$raw_json" | jq -r '.schema_version // empty' 2>/dev/null || true)
  if [ "$schema_ver" != "$SCHEMA_VERSION" ]; then
    echo "ERROR: findings JSON schema_version must be $SCHEMA_VERSION, got '${schema_ver:-missing}'" >&2
    exit 2
  fi

  local smoke_id
  smoke_id=$(printf '%s' "$raw_json" | jq -r '.smoke_id // empty' 2>/dev/null || true)
  if [ -z "$smoke_id" ]; then
    echo "ERROR: findings JSON missing required field: smoke_id" >&2
    exit 2
  fi

  local scope
  scope=$(printf '%s' "$raw_json" | jq -r '.scope // empty' 2>/dev/null || true)
  if [ -z "$scope" ]; then
    echo "ERROR: findings JSON missing required field: scope" >&2
    exit 2
  fi

  local has_stats
  has_stats=$(printf '%s' "$raw_json" | jq 'has("stats")' 2>/dev/null || echo "false")
  if [ "$has_stats" != "true" ]; then
    echo "ERROR: findings JSON missing required field: stats" >&2
    exit 2
  fi

  local has_findings
  has_findings=$(printf '%s' "$raw_json" | jq 'has("findings")' 2>/dev/null || echo "false")
  if [ "$has_findings" != "true" ]; then
    echo "ERROR: findings JSON missing required field: findings" >&2
    exit 2
  fi

  # Validate findings array items have required fields
  local invalid_finding
  invalid_finding=$(printf '%s' "$raw_json" | jq -r '
    .findings[] |
    select(
      (.id | not) or
      (.route | not) or
      (.severity | not) or
      (.category | not) or
      (.description | not)
    ) | .id // "unknown"
  ' 2>/dev/null | head -1 || true)

  if [ -n "$invalid_finding" ]; then
    echo "ERROR: finding '$invalid_finding' missing required fields (id/route/severity/category/description)" >&2
    exit 2
  fi

  # Validate severity values
  local bad_severity
  bad_severity=$(printf '%s' "$raw_json" | jq -r '
    .findings[] |
    select(.severity | IN("high","medium","low","info") | not) |
    "\(.id): \(.severity)"
  ' 2>/dev/null | head -1 || true)

  if [ -n "$bad_severity" ]; then
    echo "ERROR: finding has invalid severity — $bad_severity" >&2
    exit 2
  fi

  # Validate category values
  local bad_category
  bad_category=$(printf '%s' "$raw_json" | jq -r '
    .findings[] |
    select(.category | IN("rendering","data-flow","navigation","theme","interactivity","console-error","screenshot-mismatch") | not) |
    "\(.id): \(.category)"
  ' 2>/dev/null | head -1 || true)

  if [ -n "$bad_category" ]; then
    echo "ERROR: finding has invalid category — $bad_category" >&2
    exit 2
  fi

  FINDINGS_JSON="$raw_json"
}

# --- Format timestamp to human-readable date (seconds or ms epoch) ---
format_epoch() {
  local ts="$1"
  # If > 1e12 treat as milliseconds, else as seconds
  if [ "${#ts}" -ge 13 ]; then
    ts=$((ts / 1000))
  fi
  if command -v date &>/dev/null; then
    date -r "$ts" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "$ts"
  else
    echo "$ts"
  fi
}

# --- Generate report.md ---
generate_report_md() {
  local output_file="$SMOKE_OUTPUT_DIR/report.md"

  local smoke_id scope started_at completed_at
  smoke_id=$(printf '%s' "$FINDINGS_JSON" | jq -r '.smoke_id')
  scope=$(printf '%s' "$FINDINGS_JSON" | jq -r '.scope')
  started_at=$(printf '%s' "$FINDINGS_JSON" | jq -r '.started_at // 0')
  completed_at=$(printf '%s' "$FINDINGS_JSON" | jq -r '.completed_at // 0')

  local routes_tested routes_passed routes_failed console_errors console_warnings
  routes_tested=$(printf '%s' "$FINDINGS_JSON" | jq -r '.stats.routes_tested')
  routes_passed=$(printf '%s' "$FINDINGS_JSON" | jq -r '.stats.routes_passed')
  routes_failed=$(printf '%s' "$FINDINGS_JSON" | jq -r '.stats.routes_failed')
  console_errors=$(printf '%s' "$FINDINGS_JSON" | jq -r '.stats.console_errors')
  console_warnings=$(printf '%s' "$FINDINGS_JSON" | jq -r '.stats.console_warnings')

  local findings_count
  findings_count=$(printf '%s' "$FINDINGS_JSON" | jq '.findings | length')

  {
    echo "# Smoke Test Report — ${smoke_id}"
    echo ""
    echo "## Summary"
    echo ""
    echo "| Field | Value |"
    echo "|---|---|"
    echo "| Smoke ID | ${smoke_id} |"
    echo "| Scope | ${scope} |"
    if [ "${started_at}" != "0" ] && [ "${started_at}" != "null" ]; then
      echo "| Started | $(format_epoch "$started_at") |"
    fi
    if [ "${completed_at}" != "0" ] && [ "${completed_at}" != "null" ]; then
      echo "| Completed | $(format_epoch "$completed_at") |"
    fi
    echo ""
    echo "## Stats"
    echo ""
    echo "| Metric | Count |"
    echo "|---|---|"
    echo "| Routes Tested | ${routes_tested} |"
    echo "| Routes Passed | ${routes_passed} |"
    echo "| Routes Failed | ${routes_failed} |"
    echo "| Console Errors | ${console_errors} |"
    echo "| Console Warnings | ${console_warnings} |"
    echo ""

    if [ "$findings_count" -gt 0 ]; then
      echo "## Findings"
      echo ""

      # Print findings grouped by severity: high → medium → low → info
      for severity in "$SEVERITY_HIGH" "$SEVERITY_MEDIUM" "$SEVERITY_LOW" "$SEVERITY_INFO"; do
        local group_count
        group_count=$(printf '%s' "$FINDINGS_JSON" | jq --arg sev "$severity" '[.findings[] | select(.severity == $sev)] | length')

        if [ "$group_count" -eq 0 ]; then
          continue
        fi

        local severity_upper
        severity_upper=$(echo "$severity" | tr '[:lower:]' '[:upper:]')
        echo "### ${severity_upper}"
        echo ""

        local i=0
        while [ "$i" -lt "$group_count" ]; do
          local finding
          finding=$(printf '%s' "$FINDINGS_JSON" | jq --arg sev "$severity" --argjson idx "$i" '
            [.findings[] | select(.severity == $sev)] | .[$idx]
          ')

          local f_id f_route f_category f_description f_screenshot f_expected f_actual f_req_refs f_action
          f_id=$(echo "$finding" | jq -r '.id')
          f_route=$(echo "$finding" | jq -r '.route')
          f_category=$(echo "$finding" | jq -r '.category')
          f_description=$(echo "$finding" | jq -r '.description')
          f_screenshot=$(echo "$finding" | jq -r '.screenshot_ref // ""')
          f_expected=$(echo "$finding" | jq -r '.expected // ""')
          f_actual=$(echo "$finding" | jq -r '.actual // ""')
          f_req_refs=$(echo "$finding" | jq -r '(.req_refs // []) | join(", ")')
          f_action=$(echo "$finding" | jq -r '.recommended_action // ""')

          echo "#### ${f_id}: ${f_route}"
          echo ""
          echo "- **Category**: ${f_category}"
          echo "- **Description**: ${f_description}"
          if [ -n "$f_screenshot" ]; then
            echo "- **Screenshot**: [${f_screenshot}](${f_screenshot})"
          fi
          if [ -n "$f_expected" ]; then
            echo "- **Expected**: ${f_expected}"
          fi
          if [ -n "$f_actual" ]; then
            echo "- **Actual**: ${f_actual}"
          fi
          if [ -n "$f_req_refs" ]; then
            echo "- **REQ refs**: ${f_req_refs}"
          fi
          if [ -n "$f_action" ]; then
            echo "- **Recommended action**: ${f_action}"
          fi
          echo ""

          i=$((i + 1))
        done
      done
    else
      echo "## Findings"
      echo ""
      echo "No findings. All routes passed."
      echo ""
    fi

    echo "## Output Links"
    echo ""
    echo "- Strategy: [strategy.md](strategy.md)"
    echo "- Screenshots: [screenshots/](screenshots/)"
    echo "- Console log: [console.log](console.log)"
    echo "- Findings (machine-readable): [findings.json](findings.json)"
    echo ""

    echo "## Recommended Next Action"
    echo ""
    if [ "$routes_failed" -gt 0 ] || [ "$findings_count" -gt 0 ]; then
      echo "loom-developer dispatch recommended (via PM) to address ${routes_failed} failed route(s) and ${findings_count} finding(s)."
      echo "Alternatively, add as retro carryover findings."
    else
      echo "No action required. All routes verified."
    fi
  } > "$output_file"

  echo "report.md written to: $output_file"
}

# --- Write validated findings.json to output dir ---
write_findings_json() {
  local output_file="$SMOKE_OUTPUT_DIR/findings.json"

  printf '%s' "$FINDINGS_JSON" | jq '.' > "$output_file"
  echo "findings.json written to: $output_file"
}

# --- Main ---
main() {
  # Validate all required inputs exist
  validate_inputs

  # Read stdin fully before validation (inline, not in a subshell)
  # WHY: reading in subshell via $() would swallow exit 2 from validate_findings_json
  local raw_stdin
  raw_stdin=$(cat)

  # Validate findings JSON — exits 2 directly on failure (no subshell)
  validate_findings_json "$raw_stdin"

  # Generate outputs
  generate_report_md
  write_findings_json

  echo "Stage 3 report generation complete."
  exit 0
}

main "$@"
