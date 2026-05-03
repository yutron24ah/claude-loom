// daemon/src/routes/agent.ts
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
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

  /**
   * markAttention — toggle the attention flag on a subagent.
   * WHY: lets PM/user flag a specific subagent for follow-up without
   * mutating unrelated fields. Returns the updated subagent row.
   */
  markAttention: publicProcedure
    .input(
      z.object({
        agentId: z.string(),
        flag: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(subagents)
        .set({ attention: input.flag })
        .where(eq(subagents.subagentId, input.agentId));

      const updated = await db
        .select()
        .from(subagents)
        .where(eq(subagents.subagentId, input.agentId))
        .get();

      return updated ?? null;
    }),

  /**
   * dispatchHistory — query all subagents spawned from a given parent session.
   * WHY: the AgentDetailPanel needs a timeline of dispatches for a session.
   * Orders by startedAt desc (newest first) for display purposes.
   */
  dispatchHistory: publicProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ input }) => {
      return await db
        .select({
          subagentId: subagents.subagentId,
          agentType: subagents.agentType,
          status: subagents.status,
          startedAt: subagents.startedAt,
          endedAt: subagents.endedAt,
          resultSummary: subagents.resultSummary,
        })
        .from(subagents)
        .where(eq(subagents.parentSessionId, input.agentId))
        .orderBy(desc(subagents.startedAt));
    }),
});
