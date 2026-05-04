// daemon/src/routes/session.ts
import { z } from "zod";
import { eq, desc, lt, and } from "drizzle-orm";
import { observable } from "@trpc/server/observable";
import { router, publicProcedure } from "../trpc.js";
import { createDBClient } from "../db/client.js";
import { sessions, events } from "../db/schema.js";
import { broadcaster } from "../events/broadcaster.js";
import type { SessionChangeEvent } from "../events/types.js";

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

  // M3.2 t1: session change subscription — broadcasts when sessions are
  // started, ended, or updated. UI subscribes to trigger list refetch.
  // WHY: pushes changes to all connected clients without polling.
  subscribe: publicProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .subscription(({ input }) => {
      return observable<SessionChangeEvent>((emit) => {
        const handler = (event: SessionChangeEvent) => {
          // Filter by projectId when caller specifies one
          if (input?.projectId && event.payload.projectId !== input.projectId) return;
          emit.next(event);
        };
        broadcaster.on("session.change", handler);
        return () => {
          broadcaster.off("session.change", handler);
        };
      });
    }),
});
