// daemon/src/routes/consistency.ts
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { observable } from "@trpc/server/observable";
import { router, publicProcedure, TRPCErrorClass } from "../trpc.js";
import { createDBClient } from "../db/client.js";
import { consistencyFindings, specChanges } from "../db/schema.js";
import type { ConsistencyFinding, SpecChange } from "../db/schema.js";
import { SPEC_CHANGE_STATUS, FINDING_STATUS, FindingStatusSchema } from "../constants/consistency.js";
import { runPhaseA } from "../consistency/phase-a-runner.js";
import { broadcaster } from "../events/broadcaster.js";
import type { FindingNewEvent, SpecChangeDetectedEvent } from "../events/types.js";

const db = createDBClient();

/**
 * Shared helper for acknowledge / markFixed / dismiss mutations.
 * WHY: All three follow the identical update → select → null-check → return
 * pattern (DRY, rule of three). Extracted to eliminate structural duplication
 * while keeping each tRPC mutation as a 2-line wrapper.
 */
async function setFindingStatus(
  id: number,
  status: (typeof FINDING_STATUS)[keyof typeof FINDING_STATUS],
): Promise<ConsistencyFinding> {
  await db
    .update(consistencyFindings)
    .set({ status })
    .where(eq(consistencyFindings.id, id));
  const [updated] = await db
    .select()
    .from(consistencyFindings)
    .where(eq(consistencyFindings.id, id));
  if (!updated) {
    throw new TRPCErrorClass({ code: "NOT_FOUND", message: "Finding not found" });
  }
  return updated;
}

export const consistencyRouter = router({
  // list: query consistency findings for a project's spec changes
  // Filter by status if provided
  list: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        status: FindingStatusSchema.optional(),
      }),
    )
    .query(async ({ input }): Promise<ConsistencyFinding[]> => {
      // consistency_findings does not have projectId directly; it links via specChangeId.
      // For M4 simple impl: if status filter provided, filter by status; otherwise return all.
      // TODO(M5): project-scoped filter requires JOIN with spec_changes on projectId — see SPEC §7.x.
      // Until then, ensure single-project deployment.
      const conditions = [];
      if (input.status !== undefined) {
        conditions.push(eq(consistencyFindings.status, input.status));
      }
      const query = db.select().from(consistencyFindings);
      if (conditions.length > 0) {
        return await query.where(and(...conditions));
      }
      return await query;
    }),

  // acknowledge: set status to 'acknowledged'
  acknowledge: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }): Promise<ConsistencyFinding> =>
      setFindingStatus(input.id, FINDING_STATUS.ACKNOWLEDGED),
    ),

  // markFixed: set status to 'fixed'
  markFixed: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }): Promise<ConsistencyFinding> =>
      setFindingStatus(input.id, FINDING_STATUS.FIXED),
    ),

  // dismiss: set status to 'dismissed'
  dismiss: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }): Promise<ConsistencyFinding> =>
      setFindingStatus(input.id, FINDING_STATUS.DISMISSED),
    ),

  // ---------------------------------------------------------------------------
  // M4 t2: spec_changes procedures
  // ---------------------------------------------------------------------------

  /**
   * recordSpecChange: insert a new spec_changes row.
   * Called by ingest.ts (t1) after detecting a SPEC file edit.
   * status defaults to 'pending'.
   */
  recordSpecChange: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        specPath: z.string(),
        beforeHash: z.string(),
        afterHash: z.string(),
        diff: z.string(),
      }),
    )
    .mutation(async ({ input }): Promise<SpecChange> => {
      const now = new Date();
      const [inserted] = await db
        .insert(specChanges)
        .values({
          projectId: input.projectId,
          specPath: input.specPath,
          beforeHash: input.beforeHash,
          afterHash: input.afterHash,
          diff: input.diff,
          detectedAt: now,
          status: SPEC_CHANGE_STATUS.PENDING,
        })
        .returning();
      return inserted;
    }),

  /**
   * getLatestSpecChange: return the most recent spec_changes row for a project.
   * Returns null if no rows exist for the given projectId.
   * Used by ingest.ts to determine the previous hash for chain tracking.
   */
  getLatestSpecChange: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }): Promise<SpecChange | null> => {
      const [row] = await db
        .select()
        .from(specChanges)
        .where(eq(specChanges.projectId, input.projectId))
        .orderBy(desc(specChanges.id))
        .limit(1);
      return row ?? null;
    }),

  /**
   * dismissSpecChange: set a spec_changes row status to 'dismissed'.
   * Used by PM / UI when a spec change is intentional and needs no analysis.
   */
  dismissSpecChange: publicProcedure
    .input(z.object({ specChangeId: z.number() }))
    .mutation(async ({ input }): Promise<SpecChange> => {
      await db
        .update(specChanges)
        .set({ status: SPEC_CHANGE_STATUS.DISMISSED })
        .where(eq(specChanges.id, input.specChangeId));
      const [updated] = await db
        .select()
        .from(specChanges)
        .where(eq(specChanges.id, input.specChangeId));
      if (!updated) {
        throw new TRPCErrorClass({
          code: "NOT_FOUND",
          message: `SpecChange id=${input.specChangeId} not found`,
        });
      }
      return updated;
    }),

  // ---------------------------------------------------------------------------
  // M4 t3: runAnalysis — Phase A screening
  // ---------------------------------------------------------------------------

  /**
   * runAnalysis: execute Phase A screening for a given spec_changes row.
   * Extracts removed terms from the diff, greps related_docs, inserts findings.
   * Updates spec_changes.status → 'analyzed' upon completion.
   *
   * WHY Phase A only: Phase B (claude -p subprocess) is M4 t4.
   * related_docs resolution: uses project.json related_docs if available,
   * falling back to hardcoded defaults. Glob expansion is the caller's
   * responsibility (t3 uses file paths already passed in or default literals).
   *
   * For M4 t3 scope: related_docs from project.json are NOT resolved via glob
   * (glob support is YAGNI here — t5/UI will provide file paths). The runner
   * receives absolute paths already resolved by the route handler.
   *
   * input:  { specChangeId: number }
   * output: { findingsCreated: number }
   */
  runAnalysis: publicProcedure
    .input(z.object({ specChangeId: z.number() }))
    .mutation(async ({ input }): Promise<{ findingsCreated: number }> => {
      // Verify the spec change exists before delegating to runner
      const [specChange] = await db
        .select()
        .from(specChanges)
        .where(eq(specChanges.id, input.specChangeId));

      if (!specChange) {
        throw new TRPCErrorClass({
          code: "NOT_FOUND",
          message: `SpecChange id=${input.specChangeId} not found`,
        });
      }

      // WHY empty relatedDocPaths for t3 route-level: the route does not have
      // access to the filesystem path for related_docs glob resolution at this
      // layer. The runner accepts the paths and handles file reads. Phase A is
      // still useful even with 0 related docs (it updates status → analyzed).
      // Full related_docs resolution from project.json + glob is M4 t5 scope.
      const findingIds = await runPhaseA(
        input.specChangeId,
        specChange.projectId,
        [],
        db,
      );

      return { findingsCreated: findingIds.length };
    }),

  // ---------------------------------------------------------------------------
  // M4 t7: WS subscription procedures
  // ---------------------------------------------------------------------------

  /**
   * subscribeFindings: tRPC subscription for finding.new events.
   * WHY: SPEC §7.5 Step 5 — after Phase A analysis, findings are broadcast
   * so the UI Consistency View can display them without polling.
   * t3 dev calls broadcaster.emitFindingNew() from phase-a-runner;
   * this subscription provides the tRPC WS push path to the frontend.
   *
   * NOTE on dual-path: events router also has onFindingNew. The two paths serve
   * different consumers — consistency router is the domain-scoped subscription for
   * Consistency View; events router is the generic cross-domain subscription for
   * debug/monitor consumers. Both subscribe to the same broadcaster channel.
   */
  subscribeFindings: publicProcedure
    .subscription(() => {
      return observable<FindingNewEvent>((emit) => {
        const handler = (event: FindingNewEvent) => emit.next(event);
        broadcaster.on("finding.new", handler);
        return () => {
          broadcaster.off("finding.new", handler);
        };
      });
    }),

  /**
   * subscribeSpecChanges: tRPC subscription for spec_change_detected events.
   * WHY: SPEC §7.5 Step 3 badge — immediately after spec_changes INSERT,
   * ingest.ts calls broadcaster.emitSpecChangeDetected(); this subscription
   * delivers it to the frontend for the badge display.
   */
  subscribeSpecChanges: publicProcedure
    .subscription(() => {
      return observable<SpecChangeDetectedEvent>((emit) => {
        const handler = (event: SpecChangeDetectedEvent) => emit.next(event);
        broadcaster.on("spec_change_detected", handler);
        return () => {
          broadcaster.off("spec_change_detected", handler);
        };
      });
    }),
});
