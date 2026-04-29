// daemon/src/routes/session.ts
import { z } from "zod";
import { eq, desc, lt, and } from "drizzle-orm";
import { router, publicProcedure } from "../trpc.js";
import { createDBClient } from "../db/client.js";
import { sessions, events } from "../db/schema.js";

const db = createDBClient();

export const sessionRouter = router({
  list: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      const query = db
        .select()
        .from(sessions)
        .where(eq(sessions.projectId, input.projectId))
        .orderBy(desc(sessions.startedAt));

      if (input.limit !== undefined) {
        return await query.limit(input.limit);
      }
      return await query;
    }),

  detail: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionId, input.sessionId))
        .get();
      return result ?? null;
    }),

  events: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        limit: z.number().int().positive().optional(),
        beforeId: z.number().int().optional(),
      })
    )
    .query(async ({ input }) => {
      const conditions = [eq(events.sessionId, input.sessionId)];
      if (input.beforeId !== undefined) {
        conditions.push(lt(events.id, input.beforeId));
      }

      const query = db
        .select()
        .from(events)
        .where(and(...conditions))
        .orderBy(desc(events.id));

      if (input.limit !== undefined) {
        return await query.limit(input.limit);
      }
      return await query;
    }),
});
