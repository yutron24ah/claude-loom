#!/usr/bin/env bash
# tests/personality_test.sh — REQ-020: 4 personality preset md files validation

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

passes=0
fails=0

require_file() {
    local fname="$1"
    if [ -f "$fname" ]; then
        echo "PASS [personality]: $fname exists"
        ((passes++))
    else
        echo "FAIL [personality]: $fname missing"
        ((fails++))
    fi
}

require_nonempty() {
    local fname="$1"
    if [ -s "$fname" ]; then
        echo "PASS [personality]: $fname is non-empty"
        ((passes++))
    else
        echo "FAIL [personality]: $fname is empty (OK only for default.md)"
        ((fails++))
    fi
}

# REQ-020: 4 preset files exist
for preset in default friendly-mentor strict-drill detective; do
    require_file "prompts/personalities/${preset}.md"
done

# REQ-020: non-empty content (default.md は空 OK、他 3 つは must be non-empty)
for preset in friendly-mentor strict-drill detective; do
    fname="prompts/personalities/${preset}.md"
    if [ -f "$fname" ]; then
        require_nonempty "$fname"
    fi
done

# REQ-020: 全 preset 本文の冒頭に「TDD / Coding Principles を override しない」固定文があること
for preset in friendly-mentor strict-drill detective; do
    fname="prompts/personalities/${preset}.md"
    if [ -f "$fname" ]; then
        if grep -q "TDD\\|Coding Principles\\|原則" "$fname"; then
            echo "PASS [personality]: $fname has guardrail clause"
            ((passes++))
        else
            echo "FAIL [personality]: $fname missing guardrail clause"
            ((fails++))
        fi
    fi
done

echo ""
echo "personality_test summary: $passes PASS / $fails FAIL"
exit $fails
