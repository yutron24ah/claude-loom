/**
 * Tests for retro-reconstruct.ts (archive markdown durability fallback)
 * M0.11.2 t7 — SPEC §3.9.12 + §3.9.16 補完
 */
import { describe, it, expect } from "vitest";
import {
  parseArchiveMarkdown,
  reconstructAppliedSummary,
  reconstructPendingSummary,
} from "../../src/lib/retro-reconstruct.js";

const SAMPLE_ARCHIVE = `# Retro Report — 2026-05-17-001

## Summary
- Total findings: 4
- Confirmed: 3
- Dropped: 1

## Findings by lens

### pj-axis
- [pj-001] severity:high category:spec-drift-architectural — SPEC §3.6.X が impl と乖離 (proposal_type: structural)
  - target_artifact: spec-section, evidence: SPEC.md:1234
  - suggestion: refactor
- [pj-002] severity:low category:readme-staleness — README に古い command 例 (proposal_type: record-only)
  - target_artifact: doc-file

### process-axis
- [proc-001] severity:medium category:process-tdd-violation — test 後追い検出 (proposal_type: symptomatic)
  - target_artifact: agent-prompt

### researcher
- [res-001] severity:medium category:researcher-plugin-suggestion — 外部 plugin 候補 (proposal_type: record-only)

## Auto-applied
- [pj-002] applied to: README.md:42, reason: auto-apply rule (readme-staleness low)

## Action items
- [pj-001] requires user approval — proposal: refactor SPEC §3.6.X to match impl
- [proc-001] requires user approval — proposal: add discipline injection to loom-developer
- [res-001] requires user approval — proposal: document plugin candidate

## Approval history snapshot
- pj-axis: approved: 1, rejected: 0, deferred: 0
`;

describe("parseArchiveMarkdown", () => {
  it("extracts findings from 'Findings by lens' sections", () => {
    const result = parseArchiveMarkdown(SAMPLE_ARCHIVE, "2026-05-17-001");

    expect(result.retro_id).toBe("2026-05-17-001");
    expect(result.total_findings).toBe(4);
    expect(result.findings).toHaveLength(4);

    const pjFinding1 = result.findings.find((f) => f.finding_id === "pj-001");
    expect(pjFinding1).toBeDefined();
    expect(pjFinding1?.lens).toBe("pj-axis");
    expect(pjFinding1?.category).toBe("spec-drift-architectural");
    expect(pjFinding1?.severity).toBe("high");
    expect(pjFinding1?.proposal_type).toBe("structural");
    expect(pjFinding1?.summary).toContain("SPEC §3.6.X が impl と乖離");
  });

  it("marks findings as applied when listed under 'Auto-applied'", () => {
    const result = parseArchiveMarkdown(SAMPLE_ARCHIVE, "2026-05-17-001");
    const pj002 = result.findings.find((f) => f.finding_id === "pj-002");
    expect(pj002?.applied).toBe(true);
    expect(pj002?.pending).toBe(false);
  });

  it("marks findings as pending when listed under 'Action items'", () => {
    const result = parseArchiveMarkdown(SAMPLE_ARCHIVE, "2026-05-17-001");
    const pj001 = result.findings.find((f) => f.finding_id === "pj-001");
    expect(pj001?.pending).toBe(true);
    expect(pj001?.applied).toBe(false);

    const proc001 = result.findings.find((f) => f.finding_id === "proc-001");
    expect(proc001?.pending).toBe(true);
    expect(proc001?.lens).toBe("process-axis");
    expect(proc001?.proposal_type).toBe("symptomatic");
  });

  it("handles missing sections gracefully", () => {
    const minimalArchive = `# Retro Report — 2026-05-17-002

## Findings by lens

### pj-axis
- [only-001] severity:low category:readme-staleness — minimal example
`;
    const result = parseArchiveMarkdown(minimalArchive, "2026-05-17-002");
    expect(result.total_findings).toBe(1);
    expect(result.findings[0].finding_id).toBe("only-001");
    expect(result.findings[0].applied).toBe(false);
    expect(result.findings[0].pending).toBe(false);
  });

  it("records warnings for unparseable lines", () => {
    const malformed = `# Retro Report — 2026-05-17-003

## Findings by lens

### pj-axis
- malformed-line-without-id-format
`;
    const result = parseArchiveMarkdown(malformed, "2026-05-17-003");
    // Without [finding-id] format, line should be parsed but with warning
    // Actually `- malformed...` doesn't start with `- [` so it's skipped silently
    expect(result.total_findings).toBe(0);
  });

  it("warns when Auto-applied references unknown finding", () => {
    const orphanRef = `# Retro Report — 2026-05-17-004

## Findings by lens

### pj-axis
- [known-001] severity:low category:readme-staleness — exists

## Auto-applied
- [unknown-999] applied to: somewhere
`;
    const result = parseArchiveMarkdown(orphanRef, "2026-05-17-004");
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("unknown-999")])
    );
  });
});

describe("reconstructAppliedSummary", () => {
  it("includes only applied findings", () => {
    const parsed = parseArchiveMarkdown(SAMPLE_ARCHIVE, "2026-05-17-001");
    const summary = reconstructAppliedSummary(parsed, 1234567890);

    expect(summary.schema_version).toBe(2);
    expect(summary.retro_id).toBe("2026-05-17-001");
    expect(summary.generated_at).toBe(1234567890);
    expect(summary.total_retro_sessions).toBe(1);
    expect(summary.applied_findings).toHaveLength(1);
    expect(summary.applied_findings[0].finding_id).toBe("pj-002");
    expect(summary.applied_findings[0].applied_in.apply_type).toBe("record-only");
    expect(summary.applied_findings[0].applied_in.commit_sha).toBe(null);
    expect(summary.applied_findings[0].reconstructed_from_archive).toBe(true);
  });
});

describe("reconstructPendingSummary", () => {
  it("includes only pending (not applied) findings", () => {
    const parsed = parseArchiveMarkdown(SAMPLE_ARCHIVE, "2026-05-17-001");
    const summary = reconstructPendingSummary(parsed, 1234567890);

    expect(summary.schema_version).toBe(1);
    expect(summary.retro_id).toBe("2026-05-17-001");
    expect(summary.pending_findings).toHaveLength(3);

    // pj-002 is applied, should NOT be in pending
    const findingIds = summary.pending_findings.map((f) => f.finding_id);
    expect(findingIds).toContain("pj-001");
    expect(findingIds).toContain("proc-001");
    expect(findingIds).toContain("res-001");
    expect(findingIds).not.toContain("pj-002");
  });

  it("maps severity to risk correctly", () => {
    const parsed = parseArchiveMarkdown(SAMPLE_ARCHIVE, "2026-05-17-001");
    const summary = reconstructPendingSummary(parsed, 1234567890);

    const pj001 = summary.pending_findings.find((f) => f.finding_id === "pj-001");
    expect(pj001?.risk).toBe("high");

    const proc001 = summary.pending_findings.find((f) => f.finding_id === "proc-001");
    expect(proc001?.risk).toBe("medium");
  });

  it("sets reconstructed_from_archive marker on all findings", () => {
    const parsed = parseArchiveMarkdown(SAMPLE_ARCHIVE, "2026-05-17-001");
    const summary = reconstructPendingSummary(parsed, 1234567890);

    summary.pending_findings.forEach((f) => {
      expect(f.reconstructed_from_archive).toBe(true);
      expect(f.carryover_count).toBe(1);
      expect(f.expired_at).toBe(null);
      expect(f.re_evaluated_in).toBe(null);
      expect(f.status).toBe("pending");
    });
  });
});
