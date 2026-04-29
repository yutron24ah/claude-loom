// daemon/src/routes/consistency.ts
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, publicProcedure, TRPCErrorClass } from "../trpc.js";
import { createDBClient } from "../db/client.js";
import { consistencyFindings } from "../db/schema.js";
import type { ConsistencyFinding } from "../db/schema.js";

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
});
