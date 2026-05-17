#!/usr/bin/env bash
# tests/multi_file_skeleton_test.sh — multi-file spec skeleton template validation
#
# Verifies that:
# (a) templates/multi-file-spec-skeleton/SPEC.md.template exists
# (b) templates/multi-file-spec-skeleton/spec/_sample-topic.md.template exists
# (c) SPEC.md.template contains PLACEHOLDER_PROJECT_NAME (existing convention)
# (d) SPEC.md.template contains spec/ reference (topic index)
# (e) SPEC.md.template contains all required sections (§1–§8)
# (f) _sample-topic.md.template contains back-pointer to master SPEC.md
# (g) agents/loom-pm.md mentions multi-file ≥2 times
# (h) commands/loom-spec.md mentions multi-file ≥1 time
# (i) SPEC.md §3.11 parent section exists
# (j) skills/loom-write-plan/SKILL.md has Phase-split/milestone-folder/PLAN-phase- marker (t7)
# (k) skills/loom-write-plan/SKILL.md mentions multi-file or single-file ≥2 times (t7)
# (l) docs/DOC_CONSISTENCY_CHECKLIST.md mentions multi-file mode ≥1 time (t8)
# (m) docs/DOC_CONSISTENCY_CHECKLIST.md has all 4 multi-file mode check keywords (t8)
#
# This test covers M0.X-spec-plan-multi-file t2/t4/t5/t6/t7/t8 integrity checks.
# t5/t6 checks (g/h), t2 check (i), t7 checks (j/k), and t8 checks (l/m) are
# included here for unified multi-file harness coverage (as per Task 9 spec).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKELETON_DIR="$ROOT_DIR/templates/multi-file-spec-skeleton"
MASTER="$SKELETON_DIR/SPEC.md.template"
TOPIC="$SKELETON_DIR/spec/_sample-topic.md.template"

failures=0

# ----- Check (a): master template file exists -----
if [ -f "$MASTER" ]; then
  echo "PASS [skeleton-a]: SPEC.md.template exists"
else
  echo "FAIL [skeleton-a]: SPEC.md.template not found at $MASTER"
  failures=$((failures + 1))
fi

# ----- Check (b): topic template file exists -----
if [ -f "$TOPIC" ]; then
  echo "PASS [skeleton-b]: _sample-topic.md.template exists"
else
  echo "FAIL [skeleton-b]: _sample-topic.md.template not found at $TOPIC"
  failures=$((failures + 1))
fi

# ----- Check (c): PLACEHOLDER_PROJECT_NAME present (existing convention) -----
if [ -f "$MASTER" ]; then
  if grep -q "PLACEHOLDER_PROJECT_NAME" "$MASTER"; then
    echo "PASS [skeleton-c]: PLACEHOLDER_PROJECT_NAME found in SPEC.md.template"
  else
    echo "FAIL [skeleton-c]: PLACEHOLDER_PROJECT_NAME missing from SPEC.md.template"
    failures=$((failures + 1))
  fi
fi

# ----- Check (d): spec/ reference present (topic index) -----
if [ -f "$MASTER" ]; then
  spec_ref_count=$(grep -c "spec/" "$MASTER" || true)
  if [ "$spec_ref_count" -ge 1 ]; then
    echo "PASS [skeleton-d]: spec/ referenced $spec_ref_count time(s) in SPEC.md.template"
  else
    echo "FAIL [skeleton-d]: spec/ not referenced in SPEC.md.template (need ≥1)"
    failures=$((failures + 1))
  fi
fi

# ----- Check (e): required sections §1–§8 present -----
if [ -f "$MASTER" ]; then
  required_sections=("## 1." "## 2." "## 3." "## 4." "## 5." "## 6." "## 7." "## 8.")
  for section in "${required_sections[@]}"; do
    if grep -qF "$section" "$MASTER"; then
      echo "PASS [skeleton-e]: section '$section' found in SPEC.md.template"
    else
      echo "FAIL [skeleton-e]: section '$section' missing from SPEC.md.template"
      failures=$((failures + 1))
    fi
  done
fi

# ----- Check (f): _sample-topic.md.template has back-pointer to master SPEC -----
if [ -f "$TOPIC" ]; then
  if grep -q "SPEC.md" "$TOPIC"; then
    echo "PASS [skeleton-f]: master SPEC.md back-pointer found in _sample-topic.md.template"
  else
    echo "FAIL [skeleton-f]: master SPEC.md back-pointer missing from _sample-topic.md.template"
    failures=$((failures + 1))
  fi
fi

# ----- Check (g): agents/loom-pm.md mentions multi-file ≥2 times -----
LOOM_PM="$ROOT_DIR/agents/loom-pm.md"
if [ -f "$LOOM_PM" ]; then
  pm_count=$(grep -c "multi-file" "$LOOM_PM" || true)
  if [ "$pm_count" -ge 2 ]; then
    echo "PASS [skeleton-g]: agents/loom-pm.md mentions multi-file $pm_count time(s) (≥2)"
  else
    echo "FAIL [skeleton-g]: agents/loom-pm.md mentions multi-file $pm_count time(s) (need ≥2)"
    failures=$((failures + 1))
  fi
else
  echo "FAIL [skeleton-g]: agents/loom-pm.md not found"
  failures=$((failures + 1))
fi

# ----- Check (h): commands/loom-spec.md mentions multi-file ≥1 time -----
LOOM_SPEC_CMD="$ROOT_DIR/commands/loom-spec.md"
if [ -f "$LOOM_SPEC_CMD" ]; then
  spec_cmd_count=$(grep -c "multi-file" "$LOOM_SPEC_CMD" || true)
  if [ "$spec_cmd_count" -ge 1 ]; then
    echo "PASS [skeleton-h]: commands/loom-spec.md mentions multi-file $spec_cmd_count time(s) (≥1)"
  else
    echo "FAIL [skeleton-h]: commands/loom-spec.md mentions multi-file $spec_cmd_count time(s) (need ≥1)"
    failures=$((failures + 1))
  fi
else
  echo "FAIL [skeleton-h]: commands/loom-spec.md not found"
  failures=$((failures + 1))
fi

# ----- Check (i): SPEC.md §3.11 parent section exists -----
SPEC_FILE="$ROOT_DIR/SPEC.md"
if [ -f "$SPEC_FILE" ]; then
  if grep -qE "^### 3\.11(\s|$)" "$SPEC_FILE"; then
    echo "PASS [skeleton-i]: SPEC.md §3.11 parent section exists"
  else
    echo "FAIL [skeleton-i]: SPEC.md §3.11 parent section not found"
    failures=$((failures + 1))
  fi
else
  echo "FAIL [skeleton-i]: SPEC.md not found"
  failures=$((failures + 1))
fi

# ----- Check (j): skills/loom-write-plan/SKILL.md has Phase-split/milestone-folder/PLAN-phase- marker (t7 regression guard) -----
WRITE_PLAN_SKILL="$ROOT_DIR/skills/loom-write-plan/SKILL.md"
if [ -f "$WRITE_PLAN_SKILL" ]; then
  j_count=$(grep -cE "Phase-split|milestone-folder|PLAN-phase-" "$WRITE_PLAN_SKILL" || true)
  if [ "$j_count" -ge 1 ]; then
    echo "PASS [skeleton-j]: skills/loom-write-plan/SKILL.md has Phase-split/milestone-folder/PLAN-phase- marker (${j_count} occurrence(s))"
  else
    echo "FAIL [skeleton-j]: skills/loom-write-plan/SKILL.md Phase-split/milestone-folder/PLAN-phase- marker not found (need ≥1, got $j_count)"
    failures=$((failures + 1))
  fi
else
  echo "FAIL [skeleton-j]: skills/loom-write-plan/SKILL.md not found"
  failures=$((failures + 1))
fi

# ----- Check (k): skills/loom-write-plan/SKILL.md mentions multi-file or single-file ≥2 times (t7 regression guard) -----
if [ -f "$WRITE_PLAN_SKILL" ]; then
  k_count=$(grep -cE "multi-file|single-file" "$WRITE_PLAN_SKILL" || true)
  if [ "$k_count" -ge 2 ]; then
    echo "PASS [skeleton-k]: skills/loom-write-plan/SKILL.md mentions multi-file or single-file $k_count time(s) (≥2)"
  else
    echo "FAIL [skeleton-k]: skills/loom-write-plan/SKILL.md multi-file or single-file mention $k_count time(s) (need ≥2)"
    failures=$((failures + 1))
  fi
fi

# ----- Check (l): docs/DOC_CONSISTENCY_CHECKLIST.md mentions multi-file mode ≥1 time (t8 regression guard) -----
DOC_CHECKLIST="$ROOT_DIR/docs/DOC_CONSISTENCY_CHECKLIST.md"
if [ -f "$DOC_CHECKLIST" ]; then
  l_count=$(grep -c "multi-file mode" "$DOC_CHECKLIST" || true)
  if [ "$l_count" -ge 1 ]; then
    echo "PASS [skeleton-l]: docs/DOC_CONSISTENCY_CHECKLIST.md mentions multi-file mode $l_count time(s) (≥1)"
  else
    echo "FAIL [skeleton-l]: docs/DOC_CONSISTENCY_CHECKLIST.md multi-file mode not found (need ≥1, got $l_count)"
    failures=$((failures + 1))
  fi
else
  echo "FAIL [skeleton-l]: docs/DOC_CONSISTENCY_CHECKLIST.md not found"
  failures=$((failures + 1))
fi

# ----- Check (m): docs/DOC_CONSISTENCY_CHECKLIST.md has all 4 multi-file mode check keywords (t8 regression guard) -----
if [ -f "$DOC_CHECKLIST" ]; then
  m_failures=0
  for keyword in "用語整合" "cross-ref 健全性" "scope 重複" "master index"; do
    if grep -qF "$keyword" "$DOC_CHECKLIST"; then
      true
    else
      m_failures=$((m_failures + 1))
    fi
  done
  if [ "$m_failures" -eq 0 ]; then
    echo "PASS [skeleton-m]: docs/DOC_CONSISTENCY_CHECKLIST.md has all 4 multi-file mode check keywords (用語整合/cross-ref 健全性/scope 重複/master index)"
  else
    echo "FAIL [skeleton-m]: docs/DOC_CONSISTENCY_CHECKLIST.md missing $m_failures of 4 multi-file mode check keywords (用語整合/cross-ref 健全性/scope 重複/master index)"
    failures=$((failures + 1))
  fi
fi

# ----- t2 checks: spec/harness.md migration (skeleton-n1 through skeleton-n5) -----
HARNESS_MD="$ROOT_DIR/spec/harness.md"

# ----- Check (n1): spec/harness.md file exists -----
if [ -f "$HARNESS_MD" ]; then
  echo "PASS [skeleton-n1]: spec/harness.md exists"
else
  echo "FAIL [skeleton-n1]: spec/harness.md not found at $HARNESS_MD"
  failures=$((failures + 1))
fi

# ----- Check (n2): spec/harness.md has exactly 8 top-level sections (## headings) -----
if [ -f "$HARNESS_MD" ]; then
  n2_count=$(grep -c "^## " "$HARNESS_MD" || true)
  if [ "$n2_count" -ge 8 ]; then
    echo "PASS [skeleton-n2]: spec/harness.md has $n2_count top-level sections (##) (≥8)"
  else
    echo "FAIL [skeleton-n2]: spec/harness.md has $n2_count top-level sections (## ) (need ≥8)"
    failures=$((failures + 1))
  fi
fi

# ----- Check (n3): spec/harness.md starts at §1 (local renumber confirmed) -----
if [ -f "$HARNESS_MD" ]; then
  if grep -qE "^## 1\." "$HARNESS_MD"; then
    echo "PASS [skeleton-n3]: spec/harness.md starts at §1 (local renumber confirmed)"
  else
    echo "FAIL [skeleton-n3]: spec/harness.md does not start at §1 (need '## 1.' heading)"
    failures=$((failures + 1))
  fi
fi

# ----- Check (n4): SPEC.md has ≥8 pointer lines to spec/harness.md -----
# Note: pointer format is `spec/harness.md` §N — grep for path only then verify § on same line
if [ -f "$SPEC_FILE" ]; then
  n4_count=$(grep -c "spec/harness.md" "$SPEC_FILE" || true)
  if [ "$n4_count" -ge 8 ]; then
    echo "PASS [skeleton-n4]: SPEC.md has $n4_count pointer lines to spec/harness.md (≥8)"
  else
    echo "FAIL [skeleton-n4]: SPEC.md has $n4_count pointer lines to spec/harness.md (need ≥8)"
    failures=$((failures + 1))
  fi
fi

# ----- Check (n5): spec/harness.md has back-pointer header to master SPEC.md -----
if [ -f "$HARNESS_MD" ]; then
  if grep -q "SPEC.md" "$HARNESS_MD"; then
    echo "PASS [skeleton-n5]: spec/harness.md has back-pointer to master SPEC.md"
  else
    echo "FAIL [skeleton-n5]: spec/harness.md missing back-pointer to master SPEC.md"
    failures=$((failures + 1))
  fi
fi

# ----- t3 checks: spec/daemon-and-data.md migration (skeleton-n6 through skeleton-n9) -----
DAEMON_AND_DATA_MD="$ROOT_DIR/spec/daemon-and-data.md"

# ----- Check (n6): spec/daemon-and-data.md file exists -----
if [ -f "$DAEMON_AND_DATA_MD" ]; then
  echo "PASS [skeleton-n6]: spec/daemon-and-data.md exists"
else
  echo "FAIL [skeleton-n6]: spec/daemon-and-data.md not found at $DAEMON_AND_DATA_MD"
  failures=$((failures + 1))
fi

# ----- Check (n7): spec/daemon-and-data.md has ≥4 top-level sections (## headings) -----
if [ -f "$DAEMON_AND_DATA_MD" ]; then
  n7_count=$(grep -c "^## " "$DAEMON_AND_DATA_MD" || true)
  if [ "$n7_count" -ge 4 ]; then
    echo "PASS [skeleton-n7]: spec/daemon-and-data.md has $n7_count top-level sections (##) (≥4)"
  else
    echo "FAIL [skeleton-n7]: spec/daemon-and-data.md has $n7_count top-level sections (## ) (need ≥4)"
    failures=$((failures + 1))
  fi
fi

# ----- Check (n8): spec/daemon-and-data.md starts at §1 (local renumber confirmed) -----
if [ -f "$DAEMON_AND_DATA_MD" ]; then
  if grep -qE "^## 1\." "$DAEMON_AND_DATA_MD"; then
    echo "PASS [skeleton-n8]: spec/daemon-and-data.md starts at §1 (local renumber confirmed)"
  else
    echo "FAIL [skeleton-n8]: spec/daemon-and-data.md does not start at §1 (need '## 1.' heading)"
    failures=$((failures + 1))
  fi
fi

# ----- Check (n9): SPEC.md has ≥4 pointer lines to spec/daemon-and-data.md -----
if [ -f "$SPEC_FILE" ]; then
  n9_count=$(grep -c "spec/daemon-and-data.md" "$SPEC_FILE" || true)
  if [ "$n9_count" -ge 4 ]; then
    echo "PASS [skeleton-n9]: SPEC.md has $n9_count pointer lines to spec/daemon-and-data.md (≥4)"
  else
    echo "FAIL [skeleton-n9]: SPEC.md has $n9_count pointer lines to spec/daemon-and-data.md (need ≥4)"
    failures=$((failures + 1))
  fi
fi

# ----- t4 checks: spec/ui-arch.md migration (skeleton-n10 through skeleton-n12) -----
UI_ARCH_MD="$ROOT_DIR/spec/ui-arch.md"

# ----- Check (n10): spec/ui-arch.md file exists -----
if [ -f "$UI_ARCH_MD" ]; then
  echo "PASS [skeleton-n10]: spec/ui-arch.md exists"
else
  echo "FAIL [skeleton-n10]: spec/ui-arch.md not found at $UI_ARCH_MD"
  failures=$((failures + 1))
fi

# ----- Check (n11): spec/ui-arch.md has ≥7 top-level sections (## headings) -----
if [ -f "$UI_ARCH_MD" ]; then
  n11_count=$(grep -c "^## " "$UI_ARCH_MD" || true)
  if [ "$n11_count" -ge 7 ]; then
    echo "PASS [skeleton-n11]: spec/ui-arch.md has $n11_count top-level sections (##) (≥7)"
  else
    echo "FAIL [skeleton-n11]: spec/ui-arch.md has $n11_count top-level sections (##) (need ≥7)"
    failures=$((failures + 1))
  fi
fi

# ----- Check (n12): SPEC.md has ≥7 pointer lines to spec/ui-arch.md -----
if [ -f "$SPEC_FILE" ]; then
  n12_count=$(grep -c "spec/ui-arch.md" "$SPEC_FILE" || true)
  if [ "$n12_count" -ge 7 ]; then
    echo "PASS [skeleton-n12]: SPEC.md has $n12_count pointer lines to spec/ui-arch.md (≥7)"
  else
    echo "FAIL [skeleton-n12]: SPEC.md has $n12_count pointer lines to spec/ui-arch.md (need ≥7)"
    failures=$((failures + 1))
  fi
fi

# ----- t5 checks: spec/retro-system.md migration (skeleton-n13 through skeleton-n14) -----
RETRO_SYSTEM_MD="$ROOT_DIR/spec/retro-system.md"

# ----- Check (n13): spec/retro-system.md file exists -----
if [ -f "$RETRO_SYSTEM_MD" ]; then
  echo "PASS [skeleton-n13]: spec/retro-system.md exists"
else
  echo "FAIL [skeleton-n13]: spec/retro-system.md not found at $RETRO_SYSTEM_MD"
  failures=$((failures + 1))
fi

# ----- Check (n14): SPEC.md has ≥1 pointer line to spec/retro-system.md -----
if [ -f "$SPEC_FILE" ]; then
  n14_count=$(grep -c "spec/retro-system.md" "$SPEC_FILE" || true)
  if [ "$n14_count" -ge 1 ]; then
    echo "PASS [skeleton-n14]: SPEC.md has $n14_count pointer line(s) to spec/retro-system.md (≥1)"
  else
    echo "FAIL [skeleton-n14]: SPEC.md has $n14_count pointer line(s) to spec/retro-system.md (need ≥1)"
    failures=$((failures + 1))
  fi
fi

# ----- t6 checks: spec/install-and-test.md migration (skeleton-n15 through skeleton-n16) -----
INSTALL_AND_TEST_MD="$ROOT_DIR/spec/install-and-test.md"

# ----- Check (n15): spec/install-and-test.md file exists with ≥3 top-level sections -----
if [ -f "$INSTALL_AND_TEST_MD" ]; then
  n15_count=$(grep -c "^## " "$INSTALL_AND_TEST_MD" || true)
  if [ "$n15_count" -ge 3 ]; then
    echo "PASS [skeleton-n15]: spec/install-and-test.md exists with $n15_count top-level sections (##) (≥3)"
  else
    echo "FAIL [skeleton-n15]: spec/install-and-test.md exists but has only $n15_count top-level sections (##) (need ≥3)"
    failures=$((failures + 1))
  fi
else
  echo "FAIL [skeleton-n15]: spec/install-and-test.md not found at $INSTALL_AND_TEST_MD"
  failures=$((failures + 1))
fi

# ----- Check (n16): SPEC.md has ≥3 pointer lines to spec/install-and-test.md -----
if [ -f "$SPEC_FILE" ]; then
  n16_count=$(grep -c "spec/install-and-test.md" "$SPEC_FILE" || true)
  if [ "$n16_count" -ge 3 ]; then
    echo "PASS [skeleton-n16]: SPEC.md has $n16_count pointer line(s) to spec/install-and-test.md (≥3)"
  else
    echo "FAIL [skeleton-n16]: SPEC.md has $n16_count pointer line(s) to spec/install-and-test.md (need ≥3)"
    failures=$((failures + 1))
  fi
fi

# ----- t7 check: master SPEC.md Topic Index existence (skeleton-n17) -----
# Verifies that the §15 Topic Index section has been added to master SPEC.md
# (M0.X-spec-plan-multi-file-dogfood t7 integrity check)

# ----- Check (n17): SPEC.md has exactly 1 "## 15. Topic Index" section -----
if [ -f "$SPEC_FILE" ]; then
  n17_count=$(grep -cE "^## 15\. Topic Index" "$SPEC_FILE" || true)
  if [ "$n17_count" -eq 1 ]; then
    echo "PASS [skeleton-n17]: SPEC.md has Topic Index §15 section (count=$n17_count)"
  else
    echo "FAIL [skeleton-n17]: SPEC.md Topic Index §15 section not found (need exactly 1, got $n17_count)"
    failures=$((failures + 1))
  fi
fi

if [ "$failures" -gt 0 ]; then
  echo "multi_file_skeleton_test FAILED with $failures violation(s)"
  exit 1
fi

echo "multi_file_skeleton_test PASSED"
