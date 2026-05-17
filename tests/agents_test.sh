#!/usr/bin/env bash
# tests/agents_test.sh — agent definition + skill template validity test
#
# REQ-005, REQ-007, REQ-021, REQ-022, REQ-025, REQ-026, REQ-027, REQ-031, REQ-035, REQ-044
# Updated 2026-05 for skill-centric architecture (reviewer / retro lens migrated to skills).
# Persistent role agents: loom-pm / loom-developer / loom-retro-pm のみ.
# Reviewer / retro lens responsibilities are codified in skills/loom-review/SKILL.md +
# skills/loom-retro/SKILL.md (template SSoT).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENTS_DIR="$ROOT_DIR/agents"
SKILLS_DIR="$ROOT_DIR/skills"

if [ ! -d "$AGENTS_DIR" ] || [ -z "$(find "$AGENTS_DIR" -name "loom-*.md" 2>/dev/null)" ]; then
  echo "FAIL: agents/loom-*.md ファイルが存在しない"
  exit 1
fi

failures=0

# Frontmatter validity for all agent files
for agent_file in "$AGENTS_DIR"/loom-*.md; do
  fname=$(basename "$agent_file")

  frontmatter=$(awk '/^---$/{n++; next} n==1' "$agent_file")

  if [ -z "$frontmatter" ]; then
    echo "FAIL [$fname]: frontmatter が見つからない"
    failures=$((failures + 1))
    continue
  fi

  closer_count=$(grep -c "^---$" "$agent_file" 2>/dev/null || true)
  if [ -z "$closer_count" ] || [ "$closer_count" -lt 2 ]; then
    echo "FAIL [$fname]: frontmatter not closed (expected 2 '---' delimiters, found $closer_count)"
    failures=$((failures + 1))
    continue
  fi

  name_field=$(echo "$frontmatter" | grep -E "^name:" | sed 's/^name:[[:space:]]*//' | tr -d '"' | tr -d "'" || true)
  desc_field=$(echo "$frontmatter" | grep -E "^description:" | sed 's/^description:[[:space:]]*//' | tr -d '"' | tr -d "'" || true)

  if [ -z "$name_field" ]; then
    echo "FAIL [$fname]: REQ-005 violation: name field 必須"
    failures=$((failures + 1))
    continue
  fi

  if [ -z "$desc_field" ]; then
    echo "FAIL [$fname]: REQ-005 violation: description field 必須"
    failures=$((failures + 1))
    continue
  fi

  if [[ "$name_field" != loom-* ]]; then
    echo "FAIL [$fname]: REQ-007 violation: name は loom- プレフィックス必須（実際: $name_field）"
    failures=$((failures + 1))
    continue
  fi

  echo "PASS [$fname]: name=$name_field"
done

# Verify only 3 persistent role agents remain (post 2026-05 skill migration)
EXPECTED_AGENTS="loom-pm.md loom-developer.md loom-retro-pm.md"
for expected in $EXPECTED_AGENTS; do
  if [ ! -f "agents/$expected" ]; then
    echo "FAIL: expected agent file missing: agents/$expected"
    failures=$((failures + 1))
  fi
done

UNEXPECTED_AGENTS=$(ls agents/loom-*.md 2>/dev/null | xargs -n1 basename | grep -vxF -e "loom-pm.md" -e "loom-developer.md" -e "loom-retro-pm.md" || true)
if [ -n "$UNEXPECTED_AGENTS" ]; then
  echo "FAIL: unexpected agent files (should be skill-migrated): $UNEXPECTED_AGENTS"
  failures=$((failures + 1))
fi

# REQ-021: developer agent + review skill reference CODING_PRINCIPLES.md
check_principles_reference() {
    local fname="$1"
    if grep -q "CODING_PRINCIPLES\\.md" "$fname"; then
        echo "PASS [$fname]: references CODING_PRINCIPLES.md"
        return 0
    else
        echo "FAIL [$fname]: missing CODING_PRINCIPLES.md reference"
        return 1
    fi
}

for fname in agents/loom-developer.md skills/loom-review/SKILL.md; do
    if [ -f "$fname" ]; then
        check_principles_reference "$fname" || ((failures++))
    fi
done

# REQ-022: 3 persistent agents reference Customization Layer
check_customization_reference() {
    local fname="$1"
    if grep -q "loom-customization\|Customization Layer" "$fname"; then
        echo "PASS [$fname]: references Customization Layer"
        return 0
    else
        echo "FAIL [$fname]: missing Customization Layer reference"
        return 1
    fi
}

for fname in agents/loom-pm.md agents/loom-developer.md agents/loom-retro-pm.md; do
    if [ -f "$fname" ]; then
        check_customization_reference "$fname" || ((failures++))
    fi
done

# REQ-025: 3 persistent agents + 2 skills reference learned_guidance
check_learned_guidance_reference() {
    local fname="$1"
    if grep -q "learned_guidance\|loom-learned-guidance" "$fname"; then
        echo "PASS [$fname]: references learned_guidance (M0.11)"
        return 0
    else
        echo "FAIL [$fname]: missing learned_guidance reference"
        return 1
    fi
}

for fname in agents/loom-pm.md agents/loom-developer.md agents/loom-retro-pm.md \
             skills/loom-review/SKILL.md skills/loom-retro/SKILL.md; do
    if [ -f "$fname" ]; then
        check_learned_guidance_reference "$fname" || ((failures++))
    fi
done

# REQ-026: 3 dispatcher agents reference coexistence_mode / Runtime Gate
check_coexistence_reference() {
    local fname="$1"
    if grep -q "coexistence_mode\|enabled_features\|Runtime Gate" "$fname"; then
        echo "PASS [$fname]: references Runtime Gate (M0.12)"
        return 0
    else
        echo "FAIL [$fname]: missing coexistence mode reference"
        return 1
    fi
}

for fname in agents/loom-pm.md agents/loom-developer.md agents/loom-retro-pm.md; do
    if [ -f "$fname" ]; then
        check_coexistence_reference "$fname" || ((failures++))
    fi
done

# REQ-027: PM character + interface contracts (post-refactor、prescriptive workflow は除外)
# 旧 PM workflow discipline 5 項目 (parallel verify / degraded mode / inline spec edit / doc batch parallel /
# reviewer verdict) のうち、prompt design principle に従って残された core contracts のみ check.
check_pm_essentials() {
    local fname="agents/loom-pm.md"
    local missing=()
    for keyword in "Your mission" "Your character" "Hard constraints" "\\[loom-meta\\]" "reviewer-dispatch-refs"; do
        if ! grep -qE "$keyword" "$fname"; then
            missing+=("$keyword")
        fi
    done
    if [ ${#missing[@]} -eq 0 ]; then
        echo "PASS [agents]: loom-pm.md has Mission / Character / Hard constraints / interface contracts"
    else
        echo "FAIL [agents]: loom-pm.md missing: ${missing[*]}"
        failures=$((failures + 1))
    fi
}
check_pm_essentials

# REQ-027: developer TDD ordering
if grep -qE "TDD red.*順序|red commit.*先|時系列|process-tdd-violation|TDD red commit|Red.*Green.*Refactor" agents/loom-developer.md; then
    echo "PASS [agents]: loom-developer references TDD discipline"
else
    echo "FAIL [agents]: loom-developer missing TDD red ordering enforcement"
    failures=$((failures + 1))
fi

# REQ-031 (a): loom-retro-pm Stage 0 verdict_evidence build (M2.1)
if grep -q "verdict_evidence.json" agents/loom-retro-pm.md; then
    echo "PASS [agents]: loom-retro-pm.md has verdict_evidence.json reference (M2.1 REQ-031a)"
else
    echo "FAIL [agents]: loom-retro-pm.md missing verdict_evidence.json reference"
    failures=$((failures + 1))
fi

# REQ-031 (b): loom-pm [reviewer-dispatch-refs] block format
if grep -q "\[reviewer-dispatch-refs\]" agents/loom-pm.md; then
    echo "PASS [agents]: loom-pm.md has [reviewer-dispatch-refs] block format (M2.1 REQ-031b)"
else
    echo "FAIL [agents]: loom-pm.md missing [reviewer-dispatch-refs] block format description"
    failures=$((failures + 1))
fi

# REQ-031 (c): process-axis lens 3 new category schema (M0.14、now in loom-retro skill)
check_process_lens_categories() {
    local fname="skills/loom-retro/SKILL.md"
    local missing=()
    for category in "process-permission-friction" "process-routine-automation-opportunity" "process-keybind-opportunity"; do
        if ! grep -q "$category" "$fname"; then
            missing+=("$category")
        fi
    done
    if [ ${#missing[@]} -eq 0 ]; then
        echo "PASS [skills]: loom-retro skill has all 3 process-axis new categories (M0.14 t7)"
    else
        echo "FAIL [skills]: loom-retro skill missing categories: ${missing[*]}"
        failures=$((failures + 1))
    fi
}
check_process_lens_categories

# REQ-035: loom-retro-pm Stage 0 applied_summary build
if grep -q "applied_summary" agents/loom-retro-pm.md; then
    echo "PASS [agents]: loom-retro-pm.md has applied_summary reference (M0.11.1 REQ-035)"
else
    echo "FAIL [agents]: loom-retro-pm.md missing applied_summary reference"
    failures=$((failures + 1))
fi

# REQ-035: 4 lens template + applied_summary reference (now in skill)
if grep -q "applied_summary_path\|applied_summary" skills/loom-retro/SKILL.md; then
    echo "PASS [skills]: loom-retro skill has applied_summary_path reference (M0.11.1 REQ-035 t9)"
else
    echo "FAIL [skills]: loom-retro skill missing applied_summary_path reference"
    failures=$((failures + 1))
fi

# REQ-035: aggregator template has auto-prune logic (now in skill)
if grep -qE "auto-prune|ttl_sessions|last_used_in" skills/loom-retro/SKILL.md; then
    echo "PASS [skills]: loom-retro skill has auto-prune logic (M0.11.1 REQ-035 t10)"
else
    echo "FAIL [skills]: loom-retro skill missing auto-prune / ttl_sessions / last_used_in reference"
    failures=$((failures + 1))
fi

# REQ-044: loom-developer + loom-pm reference loom-ui-smoke suggest skill
if grep -q "loom-ui-smoke" agents/loom-developer.md; then
    echo "PASS [agents]: loom-developer.md references loom-ui-smoke suggest skill (M0.11.3 t7)"
else
    echo "FAIL [agents]: loom-developer.md missing loom-ui-smoke reference"
    failures=$((failures + 1))
fi

if grep -q "loom-ui-smoke" agents/loom-pm.md; then
    echo "PASS [agents]: loom-pm.md references loom-ui-smoke suggest skill (M0.11.3 t7)"
else
    echo "FAIL [agents]: loom-pm.md missing loom-ui-smoke reference"
    failures=$((failures + 1))
fi

# REQ-044: loom-pm has Milestone closure protocol
if grep -qE "Milestone closure|milestone closure|Layer 2|browser.*smoke" agents/loom-pm.md; then
    echo "PASS [agents]: loom-pm.md has Milestone closure protocol (M0.11.3 t7)"
else
    echo "FAIL [agents]: loom-pm.md missing Milestone closure description"
    failures=$((failures + 1))
fi

# NEW: skill-migration verification — 2 skills must exist with required templates
if [ -f "skills/loom-review/SKILL.md" ]; then
    review_missing=0
    for template_keyword in "Single strategy" "Trio strategy" "CODE_REVIEWER_PROMPT" "SECURITY_REVIEWER_PROMPT" "TEST_REVIEWER_PROMPT"; do
        if ! grep -qF "$template_keyword" skills/loom-review/SKILL.md; then
            echo "FAIL [skills]: loom-review skill missing template: $template_keyword"
            failures=$((failures + 1))
            review_missing=$((review_missing + 1))
        fi
    done
    [ "$review_missing" -eq 0 ] && echo "PASS [skills]: loom-review skill has required templates"
else
    echo "FAIL: skills/loom-review/SKILL.md not found"
    failures=$((failures + 1))
fi

if [ -f "skills/loom-retro/SKILL.md" ]; then
    retro_missing=0
    for template_keyword in "LENS_PJ_TEMPLATE" "LENS_PROCESS_TEMPLATE" "LENS_META_TEMPLATE" "LENS_RESEARCHER_TEMPLATE" "COUNTER_ARGUER_TEMPLATE" "AGGREGATOR_TEMPLATE"; do
        if ! grep -qF "$template_keyword" skills/loom-retro/SKILL.md; then
            echo "FAIL [skills]: loom-retro skill missing template: $template_keyword"
            failures=$((failures + 1))
            retro_missing=$((retro_missing + 1))
        fi
    done
    [ "$retro_missing" -eq 0 ] && echo "PASS [skills]: loom-retro skill has all required templates"
else
    echo "FAIL: skills/loom-retro/SKILL.md not found"
    failures=$((failures + 1))
fi

if [ "$failures" -gt 0 ]; then
  echo "agents_test FAILED with $failures violations"
  exit 1
fi

echo "agents_test passed"
