#!/usr/bin/env bash
# skills/loom-status/scripts/status.sh
#
# claude-loom ハーネス + repo の状態スナップショット
# Read-only

set -uo pipefail

find_project_root() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -f "$dir/SPEC.md" ] && [ -d "$dir/tests" ] && [ -f "$dir/tests/run_tests.sh" ]; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done
  return 1
}

ROOT="$(find_project_root)"
if [ -z "${ROOT:-}" ]; then
  echo "ERROR: claude-loom project root not found" >&2
  exit 1
fi

cd "$ROOT"

echo "=== claude-loom status ==="
echo ""
echo "## branch & tags"
git branch --show-current 2>/dev/null
echo "latest tag: $(git describe --tags --abbrev=0 2>/dev/null || echo '(none)')"
echo ""
echo "## last 5 commits"
git log --oneline -5
echo ""
echo "## installed agents (~/.claude/agents/loom-*.md)"
find "${CLAUDE_HOME:-$HOME/.claude}/agents" -maxdepth 1 -name "loom-*.md" 2>/dev/null | sed 's|.*/||' || echo "(none)"
echo ""
echo "## installed commands (~/.claude/commands/loom-*.md)"
find "${CLAUDE_HOME:-$HOME/.claude}/commands" -maxdepth 1 -name "loom-*.md" 2>/dev/null | sed 's|.*/||' || echo "(none)"
echo ""
echo "## installed skills (~/.claude/skills/loom-*/)"
find "${CLAUDE_HOME:-$HOME/.claude}/skills" -mindepth 1 -maxdepth 1 -type d -name "loom-*" 2>/dev/null | sed 's|.*/||' || echo "(none)"
echo ""
echo "## working tree"
if [ -z "$(git status --porcelain)" ]; then
  echo "clean"
else
  git status --short
fi
