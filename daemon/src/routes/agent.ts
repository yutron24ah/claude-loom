// daemon/src/routes/agent.ts
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, publicProcedure } from "../trpc.js";
import { createDBClient } from "../db/client.js";
import { subagents, agentPool } from "../db/schema.js";

const db = createDBClient();

export const agentRouter = router({
  list: publicProcedure
    .input(
      z.object({
        sessionId: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const conditions = [];

      if (input.sessionId !== undefined) {
        conditions.push(eq(subagents.parentSessionId, input.sessionId));
      }
      if (input.status !== undefined) {
        conditions.push(eq(subagents.status, input.status));
      }

      if (conditions.length === 0) {
        return await db.select().from(subagents);
      }
      return await db
        .select()
        .from(subagents)
        .where(and(...conditions));
    }),

  detail: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(subagents)
        .where(eq(subagents.subagentId, input.id))
        .get();
      return result ?? null;
    }),

  pool: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return await db
        .select()
        .from(agentPool)
        .where(eq(agentPool.projectId, input.projectId));
    }),
});
