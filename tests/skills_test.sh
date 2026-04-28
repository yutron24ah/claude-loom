#!/usr/bin/env bash
# tests/skills_test.sh — skill definition validity test
#
# REQ-010, REQ-011 をカバー

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS_DIR="$ROOT_DIR/skills"

if [ ! -d "$SKILLS_DIR" ] || [ -z "$(find "$SKILLS_DIR" -mindepth 1 -maxdepth 1 -type d -name "loom-*" 2>/dev/null)" ]; then
  echo "FAIL: skills/loom-*/ ディレクトリが存在しない"
  exit 1
fi

failures=0

for skill_dir in "$SKILLS_DIR"/loom-*/; do
  skill_dir="${skill_dir%/}"
  skill_name=$(basename "$skill_dir")
  skill_md="$skill_dir/SKILL.md"

  if [ ! -f "$skill_md" ]; then
    echo "FAIL [$skill_name]: SKILL.md が存在しない"
    failures=$((failures + 1))
    continue
  fi

  # frontmatter 抽出（最初の --- から次の --- まで）
  frontmatter=$(awk '/^---$/{n++; next} n==1' "$skill_md")

  if [ -z "$frontmatter" ]; then
    echo "FAIL [$skill_name]: frontmatter が見つからない"
    failures=$((failures + 1))
    continue
  fi

  closer_count=$(grep -c "^---$" "$skill_md" 2>/dev/null || true)
  if [ -z "$closer_count" ] || [ "$closer_count" -lt 2 ]; then
    echo "FAIL [$skill_name]: frontmatter not closed (expected 2 '---' delimiters, found $closer_count)"
    failures=$((failures + 1))
    continue
  fi

  name_field=$(echo "$frontmatter" | grep -E "^name:" | sed 's/^name:[[:space:]]*//' | tr -d '"' | tr -d "'" || true)
  desc_field=$(echo "$frontmatter" | grep -E "^description:" | sed 's/^description:[[:space:]]*//' | tr -d '"' | tr -d "'" || true)

  if [ -z "$name_field" ]; then
    echo "FAIL [$skill_name]: REQ-010 violation: name field 必須"
    failures=$((failures + 1))
    continue
  fi

  if [ -z "$desc_field" ]; then
    echo "FAIL [$skill_name]: REQ-010 violation: description field 必須"
    failures=$((failures + 1))
    continue
  fi

  if [[ "$name_field" != loom-* ]]; then
    echo "FAIL [$skill_name]: REQ-011 violation: name は loom- プレフィックス必須（実際: $name_field）"
    failures=$((failures + 1))
    continue
  fi

  echo "PASS [$skill_name]: name=$name_field"
done

# REQ-022: new M0.9 skills must have specific sections
check_skill_sections() {
    local skill="$1"
    shift
    local fname="skills/$skill/SKILL.md"
    if [ ! -f "$fname" ]; then
        echo "FAIL [skills]: $fname missing"
        ((failures++))
        return
    fi
    for section in "$@"; do
        if grep -q "$section" "$fname"; then
            echo "PASS [skills]: $skill has section '$section'"
        else
            echo "FAIL [skills]: $skill missing section '$section'"
            ((failures++))
        fi
    done
}

# loom-write-plan: must have these sections
check_skill_sections "loom-write-plan" "When to use" "Output structure" "Process"
# loom-debug: must have these sections
check_skill_sections "loom-debug" "When to use" "Process" "Hypothesis enumeration"

if [ "$failures" -gt 0 ]; then
  echo "skills_test FAILED with $failures violations"
  exit 1
fi

echo "skills_test passed"
