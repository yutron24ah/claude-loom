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
# REQ-024: loom-worktree must have 6 required sections
check_skill_sections "loom-worktree" "When to use" "Decision tree" "Commands" "Path convention" "Safety rules" "Anti-patterns"

# REQ-044: loom-ui-smoke must exist and have required sections
# SPEC §3.6.11 — UI Smoke Test Skill
check_skill_sections "loom-ui-smoke" \
  "Purpose" \
  "Pre-flight" \
  "Stage 1" \
  "Stage 2" \
  "Stage 3" \
  "Scope" \
  "Failure handling" \
  "Output" \
  "Invocation" \
  "不変条件"

# REQ-044: loom-ui-smoke minimum char count (skeleton prevention)
loom_ui_smoke_md="skills/loom-ui-smoke/SKILL.md"
if [ -f "$loom_ui_smoke_md" ]; then
  char_count=$(wc -c < "$loom_ui_smoke_md")
  if [ "$char_count" -ge 5000 ]; then
    echo "PASS [loom-ui-smoke]: minimum char count ($char_count >= 5000)"
  else
    echo "FAIL [loom-ui-smoke]: REQ-044 violation: SKILL.md too short ($char_count < 5000 chars)"
    ((failures++))
  fi
else
  echo "FAIL [loom-ui-smoke]: REQ-044 violation: skills/loom-ui-smoke/SKILL.md missing"
  ((failures++))
fi

if [ "$failures" -gt 0 ]; then
  echo "skills_test FAILED with $failures violations"
  exit 1
fi

echo "skills_test passed"
