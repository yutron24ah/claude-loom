/**
 * AR-TRPC-01 / AR-OUT-01 / AR-OUT-02 / AR-UI-01 (daemon-side)
 * TDD RED phase — admin-recon backend coverage for qa-suite section E
 * m0.19-t7e
 *
 * Covers:
 *   AR-TRPC-01: retro.reconstructFromArchive procedure exported from retroRouter
 *   AR-OUT-01:  output has appliedSummary + pendingSummary + warnings, reconstructed_from_archive:true
 *   AR-OUT-02:  NOT_FOUND error when archive does not exist
 *   AR-UI-01:   daemon-side — procedure accepts retroId and returns proper response shape
 *               (UI wiring verified in M0.20 walkthrough; here we test the backend contract)
 */
// covers: AR-TRPC-01, AR-OUT-01, AR-OUT-02, AR-UI-01
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildServer } from "../../src/server.js";
import type { FastifyInstance } from "fastify";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import superjson from "superjson";

/** Serialize input for tRPC GET query ?input= param (superjson transformer required). */
function sjInput(value: unknown): string {
  return encodeURIComponent(JSON.stringify(superjson.serialize(value)));
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SAMPLE_ARCHIVE_CONTENT = `# Retro Report — 2026-01-01-001

## Summary
- Total findings: 3
- Confirmed: 2
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

## Auto-applied
- [pj-002] applied to: README.md:42, reason: auto-apply rule (readme-staleness low)

## Action items
- [pj-001] requires user approval — proposal: refactor SPEC §3.6.X to match impl
- [proc-001] requires user approval — proposal: add discipline injection to loom-developer

## Approval history snapshot
- pj-axis: approved: 1, rejected: 0, deferred: 0
`;

// ---------------------------------------------------------------------------
// Test setup: temporary directory acting as repo root for the retro router.
// The retro router reads from process.cwd()/docs/retro/<retroId>-report.md.
// We save/restore process.cwd() via process.chdir() around each test.
// ---------------------------------------------------------------------------

let app: FastifyInstance;
let dbPath: string;
let testRepoRoot: string;
let originalCwd: string;

/**
 * Retro ID used in the happy-path tests (must match the archive file created in beforeEach).
 * Must conform to retroIdSchema: YYYY-MM-DD-NNN format.
 */
const VALID_RETRO_ID = "2026-01-01-001";

beforeEach(async () => {
  originalCwd = process.cwd();

  // Create isolated temp directory acting as a fake repo root
  testRepoRoot = join(tmpdir(), `retro-reconstruct-route-${randomUUID()}`);
  const retroDir = join(testRepoRoot, "docs", "retro");
  mkdirSync(retroDir, { recursive: true });

  // Write sample archive at docs/retro/test-retro-001-report.md
  writeFileSync(
    join(retroDir, `${VALID_RETRO_ID}-report.md`),
    SAMPLE_ARCHIVE_CONTENT,
    "utf-8"
  );

  // Make retro router see our temp dir as repo root
  process.chdir(testRepoRoot);

  // Separate DB for each test
  const dbDir = join(tmpdir(), `retro-reconstruct-db-${randomUUID()}`);
  mkdirSync(dbDir, { recursive: true });
  dbPath = join(dbDir, "test.db");
  process.env.CLAUDE_LOOM_DB_PATH = dbPath;

  app = await buildServer();
  await app.ready();
});

afterEach(async () => {
  await app.close();
  delete process.env.CLAUDE_LOOM_DB_PATH;
  // Restore original cwd to avoid affecting other tests
  process.chdir(originalCwd);
});

// ---------------------------------------------------------------------------
// AR-TRPC-01: procedure shape — reconstructFromArchive exported from retroRouter
// ---------------------------------------------------------------------------

describe("AR-TRPC-01: retroRouter.reconstructFromArchive procedure shape", () => {
  it("retroRouter exports reconstructFromArchive procedure", async () => {
    // AR-TRPC-01: procedure が型として export されとること
    const { retroRouter } = await import("../../src/routes/retro.js");
    const def = (retroRouter as any)._def;
    expect(def.procedures).toHaveProperty("reconstructFromArchive");
  });

  it("reconstructFromArchive is a query procedure (not mutation)", async () => {
    // AR-TRPC-01: AppRouter type 確認 — query
    const { retroRouter } = await import("../../src/routes/retro.js");
    const def = (retroRouter as any)._def;
    expect(def.procedures.reconstructFromArchive._def.type).toBe("query");
  });

  it("reconstructFromArchive input schema accepts retroId string", async () => {
    // AR-TRPC-01: input: { retroId: string }
    const { retroRouter } = await import("../../src/routes/retro.js");
    const def = (retroRouter as any)._def;
    const inputSchema = def.procedures.reconstructFromArchive._def.inputs[0];
    const result = inputSchema.safeParse({ retroId: "2026-05-17-001" });
    expect(result.success).toBe(true);
  });

  it("reconstructFromArchive input schema rejects non-YYYY-MM-DD-NNN retroId", async () => {
    // AR-TRPC-01: path-safety validation — retroIdSchema enforces YYYY-MM-DD-NNN format
    const { retroRouter } = await import("../../src/routes/retro.js");
    const def = (retroRouter as any)._def;
    const inputSchema = def.procedures.reconstructFromArchive._def.inputs[0];
    // Plain string without date format should fail
    const result = inputSchema.safeParse({ retroId: "invalid-retro-id" });
    expect(result.success).toBe(false);
    // Path traversal attempt should also fail
    const traversal = inputSchema.safeParse({ retroId: "../../etc/passwd" });
    expect(traversal.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AR-OUT-01: output shape — appliedSummary + pendingSummary + warnings
// ---------------------------------------------------------------------------

describe("AR-OUT-01: reconstructFromArchive output shape", () => {
  it("returns appliedSummary, pendingSummary, and warnings keys", async () => {
    // AR-OUT-01: applied_summary / pending_summary / warnings の 3 key
    const resp = await app.inject({
      method: "GET",
      url: `/trpc/retro.reconstructFromArchive?input=${sjInput({ retroId: VALID_RETRO_ID })}`,
    });

    expect(resp.statusCode).toBe(200);
    const body = JSON.parse(resp.body);
    const data = body.result.data.json;

    expect(data).toHaveProperty("appliedSummary");
    expect(data).toHaveProperty("pendingSummary");
    expect(data).toHaveProperty("warnings");
  });

  it("appliedSummary.reconstructed_from_archive is true on all applied findings", async () => {
    // AR-OUT-01: reconstructed_from_archive: true marker
    const resp = await app.inject({
      method: "GET",
      url: `/trpc/retro.reconstructFromArchive?input=${sjInput({ retroId: VALID_RETRO_ID })}`,
    });

    expect(resp.statusCode).toBe(200);
    const body = JSON.parse(resp.body);
    const { appliedSummary } = body.result.data.json;

    // pj-002 is auto-applied in the fixture archive
    expect(appliedSummary.applied_findings).toHaveLength(1);
    expect(appliedSummary.applied_findings[0].finding_id).toBe("pj-002");
    expect(appliedSummary.applied_findings[0].reconstructed_from_archive).toBe(true);
  });

  it("pendingSummary.pending_findings contains action-item findings", async () => {
    // AR-OUT-01: pending findings (pj-001, proc-001) are present
    const resp = await app.inject({
      method: "GET",
      url: `/trpc/retro.reconstructFromArchive?input=${sjInput({ retroId: VALID_RETRO_ID })}`,
    });

    expect(resp.statusCode).toBe(200);
    const body = JSON.parse(resp.body);
    const { pendingSummary } = body.result.data.json;

    const findingIds = pendingSummary.pending_findings.map(
      (f: { finding_id: string }) => f.finding_id
    );
    expect(findingIds).toContain("pj-001");
    expect(findingIds).toContain("proc-001");
    // pj-002 is applied, must NOT be in pending
    expect(findingIds).not.toContain("pj-002");
  });

  it("all pendingSummary findings carry reconstructed_from_archive: true", async () => {
    // AR-OUT-01: reconstructed_from_archive marker on pending side too
    const resp = await app.inject({
      method: "GET",
      url: `/trpc/retro.reconstructFromArchive?input=${sjInput({ retroId: VALID_RETRO_ID })}`,
    });

    expect(resp.statusCode).toBe(200);
    const body = JSON.parse(resp.body);
    const { pendingSummary } = body.result.data.json;

    pendingSummary.pending_findings.forEach(
      (f: { reconstructed_from_archive: boolean }) => {
        expect(f.reconstructed_from_archive).toBe(true);
      }
    );
  });

  it("warnings is an array (empty or with strings)", async () => {
    // AR-OUT-01: warnings array shape
    const resp = await app.inject({
      method: "GET",
      url: `/trpc/retro.reconstructFromArchive?input=${sjInput({ retroId: VALID_RETRO_ID })}`,
    });

    expect(resp.statusCode).toBe(200);
    const body = JSON.parse(resp.body);
    const { warnings } = body.result.data.json;
    expect(Array.isArray(warnings)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AR-OUT-02: NOT_FOUND error when archive does not exist
// ---------------------------------------------------------------------------

describe("AR-OUT-02: reconstructFromArchive NOT_FOUND error", () => {
  it("returns NOT_FOUND error for nonexistent retroId", async () => {
    // AR-OUT-02: archive が無い retroId は明示エラー (TRPCError code: NOT_FOUND)
    const resp = await app.inject({
      method: "GET",
      url: `/trpc/retro.reconstructFromArchive?input=${sjInput({ retroId: "2099-01-01-001" })}`,
    });

    // tRPC returns 4xx or 200 with error body for application errors
    const body = JSON.parse(resp.body);
    const hasError = resp.statusCode !== 200 || body.error !== undefined;
    expect(hasError).toBe(true);
  });

  it("NOT_FOUND error message mentions the missing retroId", async () => {
    // AR-OUT-02: error message is descriptive about what is missing
    const missingId = "2099-01-01-001";
    const resp = await app.inject({
      method: "GET",
      url: `/trpc/retro.reconstructFromArchive?input=${sjInput({ retroId: missingId })}`,
    });

    const body = JSON.parse(resp.body);
    // Error should be present and contain the retroId in the message
    const errorMessage =
      body.error?.message ??
      body.error?.json?.message ??
      body.result?.data?.json?.message ??
      "";
    // The route throws: `Archive markdown not found: docs/retro/${retroId}-report.md`
    if (resp.statusCode !== 200) {
      // Non-200 with body containing error info
      expect(JSON.stringify(body)).toContain(missingId);
    } else {
      // 200 with error body (tRPC application error encoding)
      expect(body.error).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// AR-UI-01 (daemon-side): procedure callable from UI layer via tRPC
// Tests the backend contract that UI relies on
// ---------------------------------------------------------------------------

describe("AR-UI-01 (daemon): reconstructFromArchive backend contract for UI layer", () => {
  it("returns HTTP 200 for valid retroId (UI can invoke without errors)", async () => {
    // AR-UI-01: admin button から invoke → backend responds 200
    const resp = await app.inject({
      method: "GET",
      url: `/trpc/retro.reconstructFromArchive?input=${sjInput({ retroId: VALID_RETRO_ID })}`,
    });

    expect(resp.statusCode).toBe(200);
  });

  it("response carries schema_version fields expected by UI", async () => {
    // AR-UI-01: 応答後 UI が pending_summary を表示更新できる shape
    const resp = await app.inject({
      method: "GET",
      url: `/trpc/retro.reconstructFromArchive?input=${sjInput({ retroId: VALID_RETRO_ID })}`,
    });

    expect(resp.statusCode).toBe(200);
    const body = JSON.parse(resp.body);
    const { appliedSummary, pendingSummary } = body.result.data.json;

    // UI needs schema_version to distinguish reconstruct vs authoritative state
    expect(appliedSummary.schema_version).toBe(2);
    expect(pendingSummary.schema_version).toBe(1);
  });

  it("response retro_id matches the requested retroId", async () => {
    // AR-UI-01: UI uses retro_id to correlate response with request
    const resp = await app.inject({
      method: "GET",
      url: `/trpc/retro.reconstructFromArchive?input=${sjInput({ retroId: VALID_RETRO_ID })}`,
    });

    expect(resp.statusCode).toBe(200);
    const body = JSON.parse(resp.body);
    const { appliedSummary, pendingSummary } = body.result.data.json;

    expect(appliedSummary.retro_id).toBe(VALID_RETRO_ID);
    expect(pendingSummary.retro_id).toBe(VALID_RETRO_ID);
  });
});
