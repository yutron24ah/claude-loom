#!/usr/bin/env bash
# tests/agents_test.sh — agent definition validity test
#
# REQ-005, REQ-007 をカバー

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENTS_DIR="$ROOT_DIR/agents"

if [ ! -d "$AGENTS_DIR" ] || [ -z "$(find "$AGENTS_DIR" -name "loom-*.md" 2>/dev/null)" ]; then
  echo "FAIL: agents/loom-*.md ファイルが存在しない"
  exit 1
fi

failures=0

for agent_file in "$AGENTS_DIR"/loom-*.md; do
  fname=$(basename "$agent_file")

  # frontmatter 抽出（最初の --- から次の --- まで）
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

  # YAML key/value 抽出（key: value 形式のみ対応、簡易パース）
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

# REQ-021: dev / reviewer agents reference CODING_PRINCIPLES.md
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

# Apply to developer + 3 reviewers (security-reviewer は原則責務範囲外で除外)
for fname in agents/loom-developer.md agents/loom-reviewer.md agents/loom-code-reviewer.md agents/loom-test-reviewer.md; do
    if [ -f "$fname" ]; then
        check_principles_reference "$fname" || ((failures++))
    fi
done

# REQ-022: 全 agent prompt が Customization Layer を参照
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

# Apply to all 13 agents
for fname in agents/loom-pm.md agents/loom-developer.md \
             agents/loom-reviewer.md agents/loom-code-reviewer.md \
             agents/loom-security-reviewer.md agents/loom-test-reviewer.md \
             agents/loom-retro-pm.md \
             agents/loom-retro-pj-judge.md agents/loom-retro-process-judge.md \
             agents/loom-retro-meta-judge.md agents/loom-retro-counter-arguer.md \
             agents/loom-retro-aggregator.md agents/loom-retro-researcher.md; do
    if [ -f "$fname" ]; then
        check_customization_reference "$fname" || ((failures++))
    fi
done

# REQ-025: 13 agent prompt が learned_guidance を参照
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

# Apply to all 13 agents
for fname in agents/loom-pm.md agents/loom-developer.md \
             agents/loom-reviewer.md agents/loom-code-reviewer.md \
             agents/loom-security-reviewer.md agents/loom-test-reviewer.md \
             agents/loom-retro-pm.md \
             agents/loom-retro-pj-judge.md agents/loom-retro-process-judge.md \
             agents/loom-retro-meta-judge.md agents/loom-retro-counter-arguer.md \
             agents/loom-retro-aggregator.md agents/loom-retro-researcher.md; do
    if [ -f "$fname" ]; then
        check_learned_guidance_reference "$fname" || ((failures++))
    fi
done

# REQ-026: 3 dispatcher agent が coexistence_mode を参照
check_coexistence_reference() {
    local fname="$1"
    if grep -q "coexistence_mode\|enabled_features" "$fname"; then
        echo "PASS [$fname]: references coexistence mode (M0.12)"
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

if [ "$failures" -gt 0 ]; then
  echo "agents_test FAILED with $failures violations"
  exit 1
fi

echo "agents_test passed"
