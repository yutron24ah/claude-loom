// daemon/src/routes/approval.ts
// M1 note: No dedicated approvals table in DB (SPEC §6.1).
// Approval tracking uses events table — pre_tool event_type events represent
// pending approval requests. Decision metadata is stored via JSON update on payload.
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, publicProcedure } from "../trpc.js";
import { createDBClient } from "../db/client.js";
import { events } from "../db/schema.js";
import type { Event, NewEvent } from "../db/schema.js";

const db = createDBClient();

export const approvalRouter = router({
  // list: query pre_tool events (approval pending)
  // Optionally filter by sessionId
  list: publicProcedure
    .input(z.object({ sessionId: z.string().optional() }))
    .query(async ({ input }): Promise<Event[]> => {
      const conditions = [eq(events.eventType, "pre_tool")];
      if (input.sessionId !== undefined) {
        conditions.push(eq(events.sessionId, input.sessionId));
      }
      return await db.select().from(events).where(and(...conditions));
    }),

  // decide: record an approval decision
  // M1 simple impl: append a new event with decision metadata
  decide: publicProcedure
    .input(
      z.object({
        eventId: z.number(),
        decision: z.enum(["approve", "deny"]),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ input }): Promise<{ success: boolean }> => {
      // Fetch the original event to get sessionId
      const [original] = await db
        .select()
        .from(events)
        .where(eq(events.id, input.eventId));

      if (!original) {
        return { success: false };
      }

      // Append a decision event
      const decisionEvent: NewEvent = {
        sessionId: original.sessionId,
        eventType: "post_tool",
        toolName: original.toolName,
        payload: {
          approvalDecision: input.decision,
          originalEventId: input.eventId,
          note: input.note ?? null,
        },
        createdAt: new Date(),
      };

      await db.insert(events).values(decisionEvent);
      return { success: true };
    }),
});
