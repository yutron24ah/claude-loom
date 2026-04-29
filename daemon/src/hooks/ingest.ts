import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createDBClient, runMigrations } from "../db/client.js";
import { events } from "../db/schema.js";
import { broadcaster } from "../events/broadcaster.js";

const eventInputSchema = z.object({
  sessionId: z.string(),
  eventType: z.enum(["session_start", "pre_tool", "post_tool", "stop", "subagent_stop"]),
  toolName: z.string().nullable().optional(),
  payload: z.record(z.unknown()),
});

export function registerIngestRoute(app: FastifyInstance) {
  const dbPath = process.env.CLAUDE_LOOM_DB_PATH;
  const db = createDBClient(dbPath);
  runMigrations(db);

  app.post("/event", async (req, reply) => {
    const parsed = eventInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid event", details: parsed.error.format() });
    }
    const { sessionId, eventType, toolName, payload } = parsed.data;

    const [inserted] = await db.insert(events).values({
      sessionId,
      eventType,
      toolName: toolName ?? null,
      payload: payload as Record<string, unknown>,
      createdAt: new Date(),
    }).returning();

    broadcaster.emitRaw({
      eventId: inserted.id,
      sessionId,
      eventType,
      toolName: toolName ?? null,
    });

    return { ok: true, eventId: inserted.id };
  });
}
