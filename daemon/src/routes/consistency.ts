// daemon/src/routes/consistency.ts
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { router, publicProcedure, TRPCErrorClass } from "../trpc.js";
import { createDBClient } from "../db/client.js";
import { consistencyFindings, specChanges } from "../db/schema.js";
import type { ConsistencyFinding, SpecChange } from "../db/schema.js";
import { SPEC_CHANGE_STATUS } from "../constants/consistency.js";

const db = createDBClient();

export const consistencyRouter = router({
  // list: query consistency findings for a project's spec changes
  // Filter by status if provided
  list: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        status: z
          .enum(["open", "acknowledged", "fixed", "dismissed"])
          .optional(),
      }),
    )
    .query(async ({ input }): Promise<ConsistencyFinding[]> => {
      // consistency_findings does not have projectId directly; it links via specChangeId.
      // For M1 simple impl: if status filter provided, filter by status; otherwise return all.
      // Full project-scoped filter requires joining spec_changes — left for future milestone.
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
    .mutation(async ({ input }): Promise<ConsistencyFinding> => {
      await db
        .update(consistencyFindings)
        .set({ status: "acknowledged" })
        .where(eq(consistencyFindings.id, input.id));
      const [updated] = await db
        .select()
        .from(consistencyFindings)
        .where(eq(consistencyFindings.id, input.id));
      if (!updated) {
        throw new TRPCErrorClass({ code: "NOT_FOUND", message: "Finding not found" });
      }
      return updated;
    }),

  // dismiss: set status to 'dismissed'
  dismiss: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }): Promise<ConsistencyFinding> => {
      await db
        .update(consistencyFindings)
        .set({ status: "dismissed" })
        .where(eq(consistencyFindings.id, input.id));
      const [updated] = await db
        .select()
        .from(consistencyFindings)
        .where(eq(consistencyFindings.id, input.id));
      if (!updated) {
        throw new TRPCErrorClass({ code: "NOT_FOUND", message: "Finding not found" });
      }
      return updated;
    }),

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
});
