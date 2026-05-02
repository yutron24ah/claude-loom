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

# REQ-027: PM workflow discipline 5 項目
check_pm_discipline() {
    local fname="agents/loom-pm.md"
    local missing=()
    for keyword in "parallel.*verify|parallel dispatch self-verify" "degraded mode" "inline.*spec|inline spec edit" "doc.*並列|doc batch parallel" "reviewer verdict|verdict_evidence"; do
        if ! grep -qE "$keyword" "$fname"; then
            missing+=("$keyword")
        fi
    done
    if [ ${#missing[@]} -eq 0 ]; then
        echo "PASS [agents]: loom-pm.md has all 5 workflow discipline items (M0.13)"
    else
        echo "FAIL [agents]: loom-pm.md missing: ${missing[*]}"
        failures=$((failures + 1))
    fi
}
check_pm_discipline

# REQ-027: dev TDD red 順序
if grep -qE "TDD red.*順序|red commit.*先|時系列|process-tdd-violation" agents/loom-developer.md; then
    echo "PASS [agents]: loom-developer references TDD red commit ordering (M0.13)"
else
    echo "FAIL [agents]: loom-developer missing TDD red ordering enforcement"
    failures=$((failures + 1))
fi

# REQ-031 (a): loom-retro-pm Stage 0 verdict_evidence build step (M2.1)
# SPEC §6.9.5 lazy build 5 step + 独立 file path の記述が存在することを verify
if grep -q "verdict_evidence.json" agents/loom-retro-pm.md && \
   grep -qE "lazy build|5 step" agents/loom-retro-pm.md; then
    echo "PASS [agents]: loom-retro-pm.md has verdict_evidence.json lazy build (M2.1 REQ-031a)"
else
    echo "FAIL [agents]: loom-retro-pm.md missing verdict_evidence.json or lazy build 5 step description"
    failures=$((failures + 1))
fi

# REQ-031 (b): loom-pm [reviewer-dispatch-refs] block format (M2.1)
# PM hint reference block 形式の記述存在を verify
if grep -q "\[reviewer-dispatch-refs\]" agents/loom-pm.md; then
    echo "PASS [agents]: loom-pm.md has [reviewer-dispatch-refs] block format (M2.1 REQ-031b)"
else
    echo "FAIL [agents]: loom-pm.md missing [reviewer-dispatch-refs] block format description"
    failures=$((failures + 1))
fi

# REQ-031 (c) / M0.14 t7: loom-retro-process-judge 3 new category schema (M0.14)
# process-permission-friction / process-routine-automation-opportunity / process-keybind-opportunity
check_process_judge_categories() {
    local fname="agents/loom-retro-process-judge.md"
    local missing=()
    for category in "process-permission-friction" "process-routine-automation-opportunity" "process-keybind-opportunity"; do
        if ! grep -q "$category" "$fname"; then
            missing+=("$category")
        fi
    done
    if [ ${#missing[@]} -eq 0 ]; then
        echo "PASS [agents]: loom-retro-process-judge.md has all 3 new categories (M0.14 t7)"
    else
        echo "FAIL [agents]: loom-retro-process-judge.md missing categories: ${missing[*]}"
        failures=$((failures + 1))
    fi
}
check_process_judge_categories

# REQ-035: M0.11.1 — loom-retro-pm Stage 0 applied_summary lazy build 記述
if grep -q "applied_summary" agents/loom-retro-pm.md && \
   grep -q "lazy build" agents/loom-retro-pm.md; then
    echo "PASS [agents]: loom-retro-pm.md has applied_summary lazy build (M0.11.1 REQ-035)"
else
    echo "FAIL [agents]: loom-retro-pm.md missing applied_summary or lazy build description (M0.11.1 t8)"
    failures=$((failures + 1))
fi

# REQ-035: M0.11.1 — 4 lens prompt に applied_summary_path injection + Read 参照記述
for fname in agents/loom-retro-pj-judge.md agents/loom-retro-process-judge.md \
             agents/loom-retro-meta-judge.md agents/loom-retro-researcher.md; do
    if [ -f "$fname" ]; then
        if grep -q "applied_summary_path\|applied_summary" "$fname"; then
            echo "PASS [agents]: $fname has applied_summary_path reference (M0.11.1 REQ-035 t9)"
        else
            echo "FAIL [agents]: $fname missing applied_summary_path reference (M0.11.1 t9)"
            failures=$((failures + 1))
        fi
    fi
done

# REQ-035: M0.11.1 — loom-retro-counter-arguer に "stale finding detection" section 不在
# t12 物理削除後 green 化する assertion (削除前は FAIL)
if ! grep -q "stale finding detection" agents/loom-retro-counter-arguer.md; then
    echo "PASS [agents]: loom-retro-counter-arguer.md stale finding detection section absent (M0.11.1 t12 rollback)"
else
    echo "FAIL [agents]: loom-retro-counter-arguer.md still has stale finding detection section (M0.11.1 t12 rollback needed)"
    failures=$((failures + 1))
fi

# REQ-035: M0.11.1 — loom-retro-aggregator に auto-prune logic 記述
if grep -qE "auto-prune|ttl_sessions|last_used_in" agents/loom-retro-aggregator.md; then
    echo "PASS [agents]: loom-retro-aggregator.md has auto-prune logic (M0.11.1 REQ-035 t10)"
else
    echo "FAIL [agents]: loom-retro-aggregator.md missing auto-prune / ttl_sessions / last_used_in reference (M0.11.1 t10)"
    failures=$((failures + 1))
fi

if [ "$failures" -gt 0 ]; then
  echo "agents_test FAILED with $failures violations"
  exit 1
fi

echo "agents_test passed"
