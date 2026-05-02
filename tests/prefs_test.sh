#!/usr/bin/env bash
# tests/prefs_test.sh — REQ-019: agents.* schema validation + precedence

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

passes=0
fails=0

# REQ-019: user-prefs.json.template が valid JSON
check_jq() {
    local fname="$1"
    if jq empty "$fname" 2>/dev/null; then
        echo "PASS [prefs]: $fname is valid JSON"
        ((passes++))
    else
        echo "FAIL [prefs]: $fname is invalid JSON"
        ((fails++))
    fi
}

check_jq "templates/user-prefs.json.template"
check_jq "templates/project-prefs.json.template"

# REQ-019: agents.* セクションが存在
check_agents_section() {
    local fname="$1"
    if jq -e '.agents | type == "object"' "$fname" >/dev/null 2>&1; then
        echo "PASS [prefs]: $fname has agents section"
        ((passes++))
    else
        echo "FAIL [prefs]: $fname missing agents.* section"
        ((fails++))
    fi
}

check_agents_section "templates/user-prefs.json.template"
check_agents_section "templates/project-prefs.json.template"

# REQ-019: 最低 1 つの agent example が model または personality を持つ
check_agent_example() {
    local fname="$1"
    local count
    count=$(jq -r '.agents | to_entries | map(select(.value | type == "object")) | map(select(.value.model // .value.personality)) | length' "$fname" 2>/dev/null || echo 0)
    if [ "$count" -ge 1 ]; then
        echo "PASS [prefs]: $fname has $count agent example(s) with model/personality"
        ((passes++))
    else
        echo "FAIL [prefs]: $fname has no agent example"
        ((fails++))
    fi
}

check_agent_example "templates/user-prefs.json.template"
check_agent_example "templates/project-prefs.json.template"

# REQ-019: precedence rule simulation（jq merge で project が user を上書きするか）
test_precedence() {
    local user_json='{"agents":{"loom-pm":{"model":"opus"}}}'
    local project_json='{"agents":{"loom-pm":{"model":"sonnet"}}}'
    local merged
    merged=$(echo "$user_json $project_json" | jq -s '.[0] * .[1]')
    local result
    result=$(echo "$merged" | jq -r '.agents."loom-pm".model')
    if [ "$result" = "sonnet" ]; then
        echo "PASS [prefs]: project overrides user (precedence rule)"
        ((passes++))
    else
        echo "FAIL [prefs]: precedence broken, got '$result' expected 'sonnet'"
        ((fails++))
    fi
}

test_precedence

# REQ-025: agents.<name>.learned_guidance is array
check_learned_guidance_schema() {
    local fname="$1"
    if jq -e '.agents | to_entries | map(select(.value | type == "object" and has("learned_guidance"))) | all(.value.learned_guidance | type == "array")' "$fname" >/dev/null 2>&1; then
        echo "PASS [prefs]: $fname agents.<name>.learned_guidance is array (M0.11)"
        ((passes++))
    else
        echo "FAIL [prefs]: $fname agents.<name>.learned_guidance schema invalid"
        ((fails++))
    fi
}

check_learned_guidance_schema "templates/user-prefs.json.template"
check_learned_guidance_schema "templates/project-prefs.json.template"

# REQ-026: project.json template に coexistence_mode + enabled_features schema
check_coexistence_schema() {
    local fname="templates/claude-loom/project.json.template"
    if [ ! -f "$fname" ]; then
        echo "FAIL [prefs]: $fname missing"
        ((fails++))
        return
    fi
    if jq -e '.rules.coexistence_mode' "$fname" >/dev/null 2>&1; then
        local mode=$(jq -r '.rules.coexistence_mode' "$fname")
        if [[ "$mode" == "full" || "$mode" == "coexist" || "$mode" == "custom" ]]; then
            echo "PASS [prefs]: project.json coexistence_mode='$mode' valid (M0.12)"
            ((passes++))
        else
            echo "FAIL [prefs]: invalid coexistence_mode='$mode'"
            ((fails++))
        fi
    else
        echo "FAIL [prefs]: missing rules.coexistence_mode (M0.12)"
        ((fails++))
    fi
    if jq -e '.rules.enabled_features | type == "array"' "$fname" >/dev/null 2>&1; then
        echo "PASS [prefs]: project.json enabled_features is array (M0.12)"
        ((passes++))
    else
        echo "FAIL [prefs]: enabled_features schema invalid"
        ((fails++))
    fi
}

check_coexistence_schema

# REQ-035: M0.11.1 — learned_guidance entries に last_used_in field が存在する (string | null)
check_last_used_in_field() {
    local fname="$1"
    # all learned_guidance entries that exist should have last_used_in field (string or null)
    local count_entries
    count_entries=$(jq '[.agents | to_entries[] | select(.value | type == "object" and has("learned_guidance")) | .value.learned_guidance[]] | length' "$fname" 2>/dev/null || echo 0)
    if [ "$count_entries" -eq 0 ]; then
        # no learned_guidance entries — skip
        echo "PASS [prefs]: $fname has no learned_guidance entries, skip last_used_in check"
        ((passes++))
        return
    fi
    local missing
    missing=$(jq '[.agents | to_entries[] | select(.value | type == "object" and has("learned_guidance")) | .value.learned_guidance[] | select(has("last_used_in") | not)] | length' "$fname" 2>/dev/null || echo 1)
    if [ "$missing" -eq 0 ]; then
        echo "PASS [prefs]: $fname learned_guidance entries all have last_used_in field (REQ-035 M0.11.1)"
        ((passes++))
    else
        echo "FAIL [prefs]: $fname has $missing learned_guidance entries missing last_used_in field"
        ((fails++))
    fi
}

check_last_used_in_field "templates/user-prefs.json.template"
check_last_used_in_field "templates/project-prefs.json.template"

# REQ-035: M0.11.1 — last_used_in value は string or null
check_last_used_in_type() {
    local fname="$1"
    local invalid
    invalid=$(jq '[.agents | to_entries[] | select(.value | type == "object" and has("learned_guidance")) | .value.learned_guidance[] | select(has("last_used_in")) | .last_used_in | select(. != null and (type != "string"))] | length' "$fname" 2>/dev/null || echo 0)
    if [ "$invalid" -eq 0 ]; then
        echo "PASS [prefs]: $fname last_used_in values are string|null (REQ-035 M0.11.1)"
        ((passes++))
    else
        echo "FAIL [prefs]: $fname has $invalid last_used_in values with invalid type (expected string|null)"
        ((fails++))
    fi
}

check_last_used_in_type "templates/user-prefs.json.template"
check_last_used_in_type "templates/project-prefs.json.template"

echo ""
echo "prefs_test summary: $passes PASS / $fails FAIL"
exit $fails
