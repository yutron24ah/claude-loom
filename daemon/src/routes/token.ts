/**
 * tokenRouter — read-only token usage queries for M5 t4.
 *
 * WHY: Phase 1 scope = read side only. Token data is written by hooks/ingest
 * (M1, existing). This router exposes aggregated summaries and time-series
 * data for the TokenMeterView polling UI.
 *
 * SPEC §3.6.10: TOKEN_TYPE constants (no raw string literals for token types).
 * SPEC §6.10: polling.token_usage_sec = 30 s (handled in UI, not daemon).
 */
import { z } from "zod";
import { gte, and, eq, sql } from "drizzle-orm";
import { router, publicProcedure } from "../trpc.js";
import { createDBClient } from "../db/client.js";
import { tokenUsage } from "../db/schema.js";

// WHY: lazy init per-request so CLAUDE_LOOM_DB_PATH env var (set in beforeEach)
// is read at query time, not at module load time. Same deferred pattern as
// hooks/ingest.ts registerIngestRoute(). Without this, test isolation fails
// because the module is loaded before beforeEach sets the env var.
function getDB() {
  return createDBClient(process.env.CLAUDE_LOOM_DB_PATH);
}

// ---------------------------------------------------------------------------
// Input schema — shared filter shape for both procedures
// ---------------------------------------------------------------------------

const TokenFilterInput = z.object({
  projectId: z.string().optional(),
  agentId: z.string().optional(),
  sessionId: z.string().optional(),
  sinceMs: z.number().int(),
});

// ---------------------------------------------------------------------------
// tokenRouter
// ---------------------------------------------------------------------------

export const tokenRouter = router({
  /**
   * getUsageSummary — aggregate input/output/cache tokens within time window.
   *
   * WHY: UI meter needs a single totals snapshot; sparkline uses getUsageSeries.
   * Returns zero totals when no data exists (never null/undefined).
   */
  getUsageSummary: publicProcedure
    .input(TokenFilterInput)
    .query(async ({ input }) => {
      const conditions = [gte(tokenUsage.bucketAt, input.sinceMs)];

      // Optional session filter — projectId and agentId reserved for M5+ extensions
      if (input.sessionId !== undefined) {
        conditions.push(eq(tokenUsage.sessionId, input.sessionId));
      }

      const result = await getDB()
        .select({
          inputTokens: sql<number>`sum(${tokenUsage.inputTokens})`.mapWith(Number),
          outputTokens: sql<number>`sum(${tokenUsage.outputTokens})`.mapWith(Number),
          cacheTokens: sql<number>`sum(${tokenUsage.cacheTokens})`.mapWith(Number),
        })
        .from(tokenUsage)
        .where(and(...conditions))
        .get();

      // Coerce null (no rows) to zero — keeps UI contract stable
      return {
        inputTokens: result?.inputTokens ?? 0,
        outputTokens: result?.outputTokens ?? 0,
        cacheTokens: result?.cacheTokens ?? 0,
      };
    }),

  /**
   * getUsageSeries — per-bucket time series for sparkline chart.
   *
   * WHY: GanttView SVG pattern reuse — UI renders self-contained SVG <rect>s
   * from this array. Returns rows ordered by bucketAt ascending for natural
   * left-to-right rendering.
   */
  getUsageSeries: publicProcedure
    .input(TokenFilterInput)
    .query(async ({ input }) => {
      const conditions = [gte(tokenUsage.bucketAt, input.sinceMs)];

      if (input.sessionId !== undefined) {
        conditions.push(eq(tokenUsage.sessionId, input.sessionId));
      }

      const rows = await getDB()
        .select({
          bucketAt: tokenUsage.bucketAt,
          inputTokens: sql<number>`sum(${tokenUsage.inputTokens})`.mapWith(Number),
          outputTokens: sql<number>`sum(${tokenUsage.outputTokens})`.mapWith(Number),
          cacheTokens: sql<number>`sum(${tokenUsage.cacheTokens})`.mapWith(Number),
        })
        .from(tokenUsage)
        .where(and(...conditions))
        .groupBy(tokenUsage.bucketAt)
        .orderBy(tokenUsage.bucketAt)
        .all();

      return rows;
    }),
});
