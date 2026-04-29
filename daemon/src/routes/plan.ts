// daemon/src/routes/plan.ts
import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { router, publicProcedure } from "../trpc.js";
import { createDBClient } from "../db/client.js";
import { planItems } from "../db/schema.js";
import type { PlanItem, NewPlanItem } from "../db/schema.js";

const db = createDBClient();

export const planRouter = router({
  // list: query all plan items for a project
  list: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }): Promise<PlanItem[]> => {
      return await db
        .select()
        .from(planItems)
        .where(eq(planItems.projectId, input.projectId))
        .orderBy(asc(planItems.position));
    }),

  // upsert: create or update a plan item
  upsert: publicProcedure
    .input(
      z.object({
        id: z.number().optional(),
        projectId: z.string(),
        source: z.string(),
        sourcePath: z.string().optional().nullable(),
        parentId: z.number().optional().nullable(),
        title: z.string(),
        body: z.string().optional().nullable(),
        // status restricted to schema-defined values
        status: z.enum(["todo", "doing", "done"]),
        position: z.number(),
        // updatedAt is set server-side; not exposed in input to avoid z.date() JSON coercion issues
      }),
    )
    .mutation(async ({ input }): Promise<PlanItem> => {
      const { id, ...fields } = input;
      const now = new Date();
      const data: NewPlanItem = {
        ...fields,
        updatedAt: now,
      };

      if (id !== undefined) {
        // Update existing
        await db.update(planItems).set(data).where(eq(planItems.id, id));
        const [updated] = await db
          .select()
          .from(planItems)
          .where(eq(planItems.id, id));
        return updated;
      } else {
        // Insert new
        const [inserted] = await db.insert(planItems).values(data).returning();
        return inserted;
      }
    }),

  // updateStatus: change the status of a plan item
  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["todo", "doing", "done"]),
      }),
    )
    .mutation(async ({ input }): Promise<PlanItem> => {
      const now = new Date();
      await db
        .update(planItems)
        .set({ status: input.status, updatedAt: now })
        .where(eq(planItems.id, input.id));
      const [updated] = await db
        .select()
        .from(planItems)
        .where(eq(planItems.id, input.id));
      return updated;
    }),

  // delete: remove a plan item
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }): Promise<{ success: boolean }> => {
      await db.delete(planItems).where(eq(planItems.id, input.id));
      return { success: true };
    }),
});
