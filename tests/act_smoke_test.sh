#!/usr/bin/env bash
# tests/act_smoke_test.sh — act smoke harness (graceful skip when Docker / act unavailable)
#
# M0.16 Phase 3 t7
# REQ: SPEC §3.6.15.4 act 依存と graceful fallback 規律
#
# Purpose: Layer 2.5 dogfood smoke Step 8 の harness layer。
# Docker daemon 起動 + act binary install を check、両方揃ったら
# `act -W .github/workflows/ci.yml pull_request` で local CI simulation 実行、
# 不在時 skip + exit 0 (closure 自体は block しない、SPEC §3.6.15.4 graceful fallback)。
#
# WHY graceful skip instead of hard fail:
# - act requires Docker Desktop which is not available in all dev environments
# - CI/CD environments (GitHub Actions) cannot nest Docker trivially
# - SPEC §3.6.15.4 codifies: act skip does not block closure if Step 1-7 pass;
#   treat as "partial GREEN" + retro candidate finding
# - tests/run_tests.sh auto-glob discovers *_test.sh; this test integrates automatically

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# --------------------------------------------------------------------------
# Step 1: act binary check (graceful skip if not installed)
# WHY: act is an optional local tool; user must opt-in via 'brew install act'
# --------------------------------------------------------------------------
if ! command -v act &>/dev/null; then
  echo "SKIP: act binary not found (install via 'brew install act' on macOS)"
  echo "Layer 2.5 Step 8 graceful fallback — closure not blocked (SPEC §3.6.15.4)"
  exit 0
fi

# --------------------------------------------------------------------------
# Step 2: Docker daemon check (graceful skip if not running)
# WHY: act delegates container execution to Docker; daemon must be active
# --------------------------------------------------------------------------
if ! docker info &>/dev/null 2>&1; then
  echo "SKIP: Docker daemon not running (start Docker Desktop and retry)"
  echo "Layer 2.5 Step 8 graceful fallback — closure not blocked (SPEC §3.6.15.4)"
  exit 0
fi

# --------------------------------------------------------------------------
# Step 3: workflow file existence check (defensive — hard fail if missing)
# WHY: if act + Docker are available but ci.yml is gone, that is a real error
# --------------------------------------------------------------------------
CI_WORKFLOW="${ROOT_DIR}/.github/workflows/ci.yml"
if [[ ! -f "${CI_WORKFLOW}" ]]; then
  echo "FAIL: ${CI_WORKFLOW} not found"
  echo "Expected: .github/workflows/ci.yml must exist (M0.16 Phase 2 t3 created it)"
  exit 1
fi

# --------------------------------------------------------------------------
# Step 4: invoke act with linux/amd64 architecture
# WHY: Apple Silicon (M-series) requires --container-architecture linux/amd64
# for qemu emulation to run linux/amd64 GitHub Actions runner images correctly.
# SPEC §3.6.15.4 codifies this as the standard invocation option.
# --------------------------------------------------------------------------
echo "Running: act -W .github/workflows/ci.yml pull_request --container-architecture linux/amd64"

if act -W "${CI_WORKFLOW}" pull_request --container-architecture linux/amd64 --quiet; then
  echo "PASS: act simulation completed successfully (local CI parity verified)"
  exit 0
else
  rc=$?
  echo "FAIL: act simulation exited with code ${rc}"
  echo "Verify CI workflow locally: act -W .github/workflows/ci.yml pull_request --container-architecture linux/amd64"
  exit "${rc}"
fi
