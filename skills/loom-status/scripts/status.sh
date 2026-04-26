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
git log --oneline -5 2>/dev/null || true
echo ""
echo "## installed agents (~/.claude/agents/loom-*.md)"
agents_list=$(find "${CLAUDE_HOME:-$HOME/.claude}/agents" -maxdepth 1 -type l -name "loom-*.md" 2>/dev/null | sed 's|.*/||' || true)
echo "${agents_list:-(none)}"
echo ""
echo "## installed commands (~/.claude/commands/loom-*.md)"
commands_list=$(find "${CLAUDE_HOME:-$HOME/.claude}/commands" -maxdepth 1 -type l -name "loom-*.md" 2>/dev/null | sed 's|.*/||' || true)
echo "${commands_list:-(none)}"
echo ""
echo "## installed skills (~/.claude/skills/loom-*/)"
skills_list=$(find "${CLAUDE_HOME:-$HOME/.claude}/skills" -mindepth 1 -maxdepth 1 -type l -name "loom-*" 2>/dev/null | sed 's|.*/||' || true)
echo "${skills_list:-(none)}"
echo ""
echo "## working tree"
porcelain=$(git status --porcelain 2>/dev/null || true)
if [ -z "$porcelain" ]; then
  echo "clean"
else
  echo "$porcelain"
fi

exit 0
