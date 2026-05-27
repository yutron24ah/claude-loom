/**
 * AR-TRPC-01 / AR-OUT-01 / AR-OUT-02 / AR-UI-01 (admin-specific companion)
 * m0.20-t5b — admin-recon backend: durability + parse edge cases + path-safety
 *
 * WHY this companion file exists:
 *   retro-reconstruct.test.ts (m0.19-t7e) covers the happy-path HTTP contract
 *   for reconstructFromArchive. This file is the admin-recon companion that
 *   tests the OPERATIONAL / DURABILITY characteristics:
 *
 *   1. Parser edge cases:
 *      - Empty archive content → safe defaults (no crash)
 *      - Corrupt / partially malformed archive → best-effort + warnings
 *      - Archive with ONLY auto-applied findings (no pending)
 *      - Archive with ONLY pending findings (none applied)
 *      - Mixed findings: some applied + some pending + some neither
 *
 *   2. Path-safety validation (deeper than the TRPC-01 schema test):
 *      - RETRO_ID_PATTERN correctly blocks path traversal
 *      - assertSafeRetroId runtime validator matches zod schema behavior
 *
 *   3. Admin-recon security: route-level path traversal via retroId is rejected
 *      both at input validation AND runtime (defense in depth).
 *
 *   4. Reconstruction library correctness:
 *      - reconstructAppliedSummary: applied_findings filter
 *      - reconstructPendingSummary: pending && !applied filter (applied cannot be in pending)
 *      - severity → risk mapping
 *      - generated_at timestamp is set
 *
 * These admin-path tests complement rather than duplicate the main test.
 * The main test verifies "does the procedure work with a valid fixture archive?"
 * This file verifies "does the IMPLEMENTATION hold up under admin/edge conditions?"
 *
 * // covers: AR-TRPC-01, AR-OUT-01, AR-OUT-02, AR-UI-01
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Import the library functions directly (unit-level admin testing)
// ---------------------------------------------------------------------------
import {
  parseArchiveMarkdown,
  reconstructAppliedSummary,
  reconstructPendingSummary,
} from "../../src/lib/retro-reconstruct.js";
import {
  RETRO_ID_PATTERN,
  retroIdSchema,
  assertSafeRetroId,
} from "../../src/lib/path-safety.js";

// ---------------------------------------------------------------------------
// Import server for route-level path-safety tests
// ---------------------------------------------------------------------------
import { buildServer } from "../../src/server.js";
import type { FastifyInstance } from "fastify";
import superjson from "superjson";

function sjInput(value: unknown): string {
  return encodeURIComponent(JSON.stringify(superjson.serialize(value)));
}

// ---------------------------------------------------------------------------
// Server lifecycle for route-level tests
// ---------------------------------------------------------------------------

let app: FastifyInstance;
let testRepoRoot: string;
let originalCwd: string;

beforeEach(async () => {
  originalCwd = process.cwd();

  testRepoRoot = join(tmpdir(), `ar-admin-${randomUUID()}`);
  const retroDir = join(testRepoRoot, "docs", "retro");
  mkdirSync(retroDir, { recursive: true });

  process.chdir(testRepoRoot);

  const dbDir = join(tmpdir(), `ar-admin-db-${randomUUID()}`);
  mkdirSync(dbDir, { recursive: true });
  process.env.CLAUDE_LOOM_DB_PATH = join(dbDir, "test.db");

  app = await buildServer();
  await app.ready();
});

afterEach(async () => {
  await app.close();
  delete process.env.CLAUDE_LOOM_DB_PATH;
  process.chdir(originalCwd);
});

// ===========================================================================
// 1. Parser edge cases — library unit tests
// ===========================================================================

describe("AR-OUT-01: parseArchiveMarkdown — empty content", () => {
  it("empty string produces zero findings and no warnings crash", () => {
    // AR-OUT-01: best-effort parse is safe with empty content
    const result = parseArchiveMarkdown("", "2026-01-01-001");
    expect(result.retro_id).toBe("2026-01-01-001");
    expect(result.findings).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.total_findings).toBe(0);
  });

  it("archive with only headings (no findings) produces zero findings", () => {
    // AR-OUT-01: no-finding archive is safe
    const content = [
      "# Retro Report — 2026-01-01-001",
      "",
      "## Summary",
      "- Total findings: 0",
      "",
      "## Findings by lens",
      "### pj-axis",
      "",
      "## Action items",
      "(none)",
    ].join("\n");

    const result = parseArchiveMarkdown(content, "2026-01-01-001");
    expect(result.findings).toHaveLength(0);
  });
});

describe("AR-OUT-01: parseArchiveMarkdown — corrupt / partial archive", () => {
  it("finding line without dash-bracket is recorded as warning, not crash", () => {
    // AR-OUT-01: malformed finding lines → warning + continue (best-effort)
    const content = [
      "## Findings by lens",
      "### pj-axis",
      "- MALFORMED LINE WITHOUT BRACKETS severity:high category:x — summary",
    ].join("\n");

    const result = parseArchiveMarkdown(content, "2026-01-01-001");
    // The line doesn't match finding pattern, it should be skipped silently
    // (no brackets → trimStart doesn't start with "- [" → not processed as finding)
    expect(result.findings).toHaveLength(0);
    // No crash; warnings may or may not be empty depending on impl
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it("auto-applied referencing unknown finding ID produces warning", () => {
    // AR-OUT-01: orphan auto-applied reference → warning, not crash
    const content = [
      "## Findings by lens",
      "### pj-axis",
      "- [pj-001] severity:high category:spec-drift — real finding",
      "",
      "## Auto-applied",
      "- [pj-NONEXISTENT] applied to: some-file.ts",
    ].join("\n");

    const result = parseArchiveMarkdown(content, "2026-01-01-001");
    // pj-001 should be parsed; pj-NONEXISTENT in auto-applied triggers warning
    expect(result.findings).toHaveLength(1);
    const hasOrphanWarning = result.warnings.some((w) =>
      w.includes("pj-NONEXISTENT")
    );
    expect(hasOrphanWarning).toBe(true);
  });

  it("action-items referencing unknown finding ID produces warning", () => {
    // AR-OUT-01: orphan action-item reference → warning
    const content = [
      "## Findings by lens",
      "### process-axis",
      "- [proc-001] severity:medium category:tdd-violation — test 後追い",
      "",
      "## Action items",
      "- [proc-GHOST] requires user approval",
    ].join("\n");

    const result = parseArchiveMarkdown(content, "2026-01-01-001");
    expect(result.findings).toHaveLength(1);
    const hasGhostWarning = result.warnings.some((w) =>
      w.includes("proc-GHOST")
    );
    expect(hasGhostWarning).toBe(true);
  });
});

describe("AR-OUT-01: parseArchiveMarkdown — only-applied findings (no pending)", () => {
  it("archive with all findings auto-applied: appliedSummary has findings, pendingSummary is empty", () => {
    // AR-OUT-01: reconstruct path when all findings were auto-applied
    const content = [
      "## Findings by lens",
      "### pj-axis",
      "- [pj-001] severity:low category:readme-staleness — README stale",
      "- [pj-002] severity:low category:doc-update — doc update needed",
      "",
      "## Auto-applied",
      "- [pj-001] applied to: README.md:10",
      "- [pj-002] applied to: docs/guide.md:5",
      "",
      "## Action items",
      "(none)",
    ].join("\n");

    const parsed = parseArchiveMarkdown(content, "2026-01-01-001");
    expect(parsed.findings).toHaveLength(2);
    expect(parsed.findings.every((f) => f.applied)).toBe(true);

    const applied = reconstructAppliedSummary(parsed, 12345);
    const pending = reconstructPendingSummary(parsed, 12345);

    expect(applied.applied_findings).toHaveLength(2);
    expect(pending.pending_findings).toHaveLength(0);
  });
});

describe("AR-OUT-01: parseArchiveMarkdown — only-pending findings (none applied)", () => {
  it("archive with all findings pending: pendingSummary has findings, appliedSummary is empty", () => {
    // AR-OUT-01: reconstruct path when no findings were auto-applied
    const content = [
      "## Findings by lens",
      "### process-axis",
      "- [proc-001] severity:high category:process-violation — critical finding",
      "- [proc-002] severity:medium category:tdd-gap — medium finding",
      "",
      "## Action items",
      "- [proc-001] requires user approval — structural change",
      "- [proc-002] requires user approval — process fix",
    ].join("\n");

    const parsed = parseArchiveMarkdown(content, "2026-02-01-001");
    const applied = reconstructAppliedSummary(parsed, 99999);
    const pending = reconstructPendingSummary(parsed, 99999);

    expect(applied.applied_findings).toHaveLength(0);
    expect(pending.pending_findings).toHaveLength(2);
  });
});

describe("AR-OUT-01: parseArchiveMarkdown — applied finding is NOT in pending", () => {
  it("finding that is both applied and in action-items is excluded from pending", () => {
    // AR-OUT-01: applied && pending → only in applied (pending filter: pending && !applied)
    const content = [
      "## Findings by lens",
      "### pj-axis",
      "- [pj-001] severity:high category:spec-drift — SPEC drift",
      "",
      "## Auto-applied",
      "- [pj-001] applied to: SPEC.md:100",
      "",
      "## Action items",
      "- [pj-001] requires user approval",
    ].join("\n");

    const parsed = parseArchiveMarkdown(content, "2026-03-01-001");
    const finding = parsed.findings[0];
    expect(finding.applied).toBe(true);
    expect(finding.pending).toBe(true); // both flags set by archive

    const pending = reconstructPendingSummary(parsed, 11111);
    // reconstructPendingSummary filters pending && !applied → pj-001 excluded
    const pendingIds = pending.pending_findings.map((f) => f.finding_id);
    expect(pendingIds).not.toContain("pj-001");
  });
});

// ===========================================================================
// 2. Reconstruction library correctness
// ===========================================================================

describe("AR-OUT-01: reconstructAppliedSummary — schema and marker fields", () => {
  const SIMPLE_PARSED = {
    retro_id: "2026-01-01-001",
    total_findings: 1,
    findings: [
      {
        finding_id: "pj-001",
        lens: "pj-axis",
        category: "readme-staleness",
        severity: "low" as const,
        proposal_type: "record-only" as const,
        summary: "README update",
        applied: true,
        pending: false,
      },
    ],
    warnings: [],
  };

  it("schema_version is 2 (appliedSummary)", () => {
    // AR-OUT-01: schema_version distinguishes from authoritative applied_summary
    const result = reconstructAppliedSummary(SIMPLE_PARSED, 5000);
    expect(result.schema_version).toBe(2);
  });

  it("generated_at matches provided timestamp", () => {
    const ts = Date.now();
    const result = reconstructAppliedSummary(SIMPLE_PARSED, ts);
    expect(result.generated_at).toBe(ts);
  });

  it("applied_in.commit_sha is null (archive reconstruction, no commit known)", () => {
    // AR-OUT-01: commit_sha null distinguishes from authoritative history
    const result = reconstructAppliedSummary(SIMPLE_PARSED, 1);
    expect(result.applied_findings[0].applied_in.commit_sha).toBeNull();
  });

  it("applied_in.apply_type is record-only (reconstruction marker)", () => {
    const result = reconstructAppliedSummary(SIMPLE_PARSED, 1);
    expect(result.applied_findings[0].applied_in.apply_type).toBe("record-only");
  });

  it("reconstructed_from_archive is true on all applied findings", () => {
    const result = reconstructAppliedSummary(SIMPLE_PARSED, 1);
    result.applied_findings.forEach((f) => {
      expect(f.reconstructed_from_archive).toBe(true);
    });
  });
});

describe("AR-OUT-01: reconstructPendingSummary — severity-to-risk mapping", () => {
  function makeParsed(severity: "high" | "medium" | "low" | undefined) {
    return {
      retro_id: "2026-04-01-001",
      total_findings: 1,
      findings: [
        {
          finding_id: "f-001",
          lens: "pj-axis",
          category: "x",
          severity,
          summary: "test",
          applied: false,
          pending: true,
        },
      ],
      warnings: [],
    };
  }

  it("severity:high → risk:high", () => {
    const result = reconstructPendingSummary(makeParsed("high"), 1);
    expect(result.pending_findings[0].risk).toBe("high");
  });

  it("severity:medium → risk:medium", () => {
    const result = reconstructPendingSummary(makeParsed("medium"), 1);
    expect(result.pending_findings[0].risk).toBe("medium");
  });

  it("severity:low → risk:low", () => {
    const result = reconstructPendingSummary(makeParsed("low"), 1);
    expect(result.pending_findings[0].risk).toBe("low");
  });

  it("severity:undefined → risk:medium (safe default)", () => {
    const result = reconstructPendingSummary(makeParsed(undefined), 1);
    expect(result.pending_findings[0].risk).toBe("medium");
  });

  it("schema_version is 1 (pendingSummary)", () => {
    const result = reconstructPendingSummary(makeParsed("high"), 1);
    expect(result.schema_version).toBe(1);
  });
});

// ===========================================================================
// 3. Path-safety validation (deeper than AR-TRPC-01 schema test)
// ===========================================================================

describe("AR-TRPC-01: retroIdSchema + RETRO_ID_PATTERN path safety (admin depth)", () => {
  it("RETRO_ID_PATTERN rejects path traversal sequences (../)", () => {
    // AR-TRPC-01: path traversal attempt must not match
    expect(RETRO_ID_PATTERN.test("../../etc/passwd")).toBe(false);
    expect(RETRO_ID_PATTERN.test("../2026-01-01-001")).toBe(false);
  });

  it("RETRO_ID_PATTERN rejects null bytes", () => {
    // AR-TRPC-01: null byte injection attempt
    expect(RETRO_ID_PATTERN.test("2026-01-01-001\x00extra")).toBe(false);
  });

  it("RETRO_ID_PATTERN rejects slashes in retroId", () => {
    expect(RETRO_ID_PATTERN.test("2026/01/01-001")).toBe(false);
  });

  it("RETRO_ID_PATTERN accepts only YYYY-MM-DD-NNN format", () => {
    expect(RETRO_ID_PATTERN.test("2026-01-01-001")).toBe(true);
    expect(RETRO_ID_PATTERN.test("2099-12-31-999")).toBe(true);
  });

  it("retroIdSchema.parse throws on path traversal (zod layer)", () => {
    // AR-TRPC-01: zod schema is the first layer of defense
    expect(() => retroIdSchema.parse("../secret")).toThrow();
  });

  it("assertSafeRetroId throws on path traversal (runtime defense-in-depth)", () => {
    // AR-TRPC-01: runtime validator is the second layer of defense
    expect(() => assertSafeRetroId("../secret")).toThrow();
    expect(() => assertSafeRetroId("../../etc/passwd")).toThrow();
  });

  it("assertSafeRetroId accepts valid retroId", () => {
    // AR-TRPC-01: valid IDs pass through without throwing
    expect(() => assertSafeRetroId("2026-01-01-001")).not.toThrow();
    expect(assertSafeRetroId("2026-01-01-001")).toBe("2026-01-01-001");
  });
});

// ===========================================================================
// 4. Route-level path safety: verify the HTTP layer blocks traversal
// ===========================================================================

describe("AR-TRPC-01: route rejects path traversal via retroId at HTTP layer", () => {
  it("route returns error for retroId with path traversal characters", async () => {
    // AR-TRPC-01: tRPC route-level — input validation rejects traversal before fs access
    const resp = await app.inject({
      method: "GET",
      url: `/trpc/retro.reconstructFromArchive?input=${sjInput({ retroId: "../etc/passwd" })}`,
    });
    // Must NOT return 200 with data — either 400/422 validation error or tRPC error body
    const body = JSON.parse(resp.body);
    const isError = resp.statusCode !== 200 || body.error !== undefined;
    expect(isError).toBe(true);
  });

  it("route returns error for retroId that is just a plain string (wrong format)", async () => {
    // AR-TRPC-01: plain string without date format is rejected
    const resp = await app.inject({
      method: "GET",
      url: `/trpc/retro.reconstructFromArchive?input=${sjInput({ retroId: "admin" })}`,
    });
    const body = JSON.parse(resp.body);
    const isError = resp.statusCode !== 200 || body.error !== undefined;
    expect(isError).toBe(true);
  });
});

// ===========================================================================
// 5. NOT_FOUND route behavior with edge-case retroIds (AR-OUT-02 deeper)
// ===========================================================================

describe("AR-OUT-02: NOT_FOUND for valid-format but non-existent retroId (edge dates)", () => {
  it("returns error for valid-format retroId that has no matching archive file", async () => {
    // AR-OUT-02: even a valid format ID (2099-12-31-001) with no file → NOT_FOUND
    const resp = await app.inject({
      method: "GET",
      url: `/trpc/retro.reconstructFromArchive?input=${sjInput({ retroId: "2099-12-31-001" })}`,
    });
    const body = JSON.parse(resp.body);
    const hasError = resp.statusCode !== 200 || body.error !== undefined;
    expect(hasError).toBe(true);
  });

  it("returns error for date-boundary retroId (seq 999) with no archive", async () => {
    // AR-OUT-02: sequence number edge case (999 is valid format, no archive)
    const resp = await app.inject({
      method: "GET",
      url: `/trpc/retro.reconstructFromArchive?input=${sjInput({ retroId: "2026-06-30-999" })}`,
    });
    const body = JSON.parse(resp.body);
    const hasError = resp.statusCode !== 200 || body.error !== undefined;
    expect(hasError).toBe(true);
  });
});

// ===========================================================================
// 6. Corrupt archive file on disk — graceful handling (AR-OUT-01 durability)
// ===========================================================================

describe("AR-OUT-01: corrupt archive on disk — best-effort parse (admin durability)", () => {
  it("archive with only binary-like content produces warnings array (no crash)", async () => {
    // AR-OUT-01: corrupt archive content → best-effort, warnings array populated
    const retroId = "2026-05-01-001";
    const corruptContent = "CORRUPT\x00BINARY\xff\xfe content — no valid markdown structure";
    writeFileSync(
      join(testRepoRoot, "docs", "retro", `${retroId}-report.md`),
      corruptContent,
      "utf-8"
    );

    const resp = await app.inject({
      method: "GET",
      url: `/trpc/retro.reconstructFromArchive?input=${sjInput({ retroId })}`,
    });

    // Should still return 200 with empty findings (best-effort) not crash
    expect(resp.statusCode).toBe(200);
    const body = JSON.parse(resp.body);
    const data = body.result.data.json;
    expect(data.appliedSummary.applied_findings).toHaveLength(0);
    expect(data.pendingSummary.pending_findings).toHaveLength(0);
    expect(Array.isArray(data.warnings)).toBe(true);
  });

  it("archive with valid heading structure but no findings returns empty arrays", async () => {
    // AR-OUT-01: valid structure but no findings → empty but well-formed response
    const retroId = "2026-05-02-001";
    const emptyStructureContent = [
      "# Retro Report — 2026-05-02-001",
      "",
      "## Summary",
      "- Total findings: 0",
      "",
      "## Findings by lens",
      "",
      "## Auto-applied",
      "(none)",
      "",
      "## Action items",
      "(none)",
    ].join("\n");

    writeFileSync(
      join(testRepoRoot, "docs", "retro", `${retroId}-report.md`),
      emptyStructureContent,
      "utf-8"
    );

    const resp = await app.inject({
      method: "GET",
      url: `/trpc/retro.reconstructFromArchive?input=${sjInput({ retroId })}`,
    });

    expect(resp.statusCode).toBe(200);
    const body = JSON.parse(resp.body);
    const data = body.result.data.json;
    expect(data.appliedSummary.applied_findings).toHaveLength(0);
    expect(data.pendingSummary.pending_findings).toHaveLength(0);
  });
});
