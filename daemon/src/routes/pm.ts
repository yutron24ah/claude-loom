/**
 * daemon/src/routes/pm.ts — PM chat REST endpoints.
 *
 * M0.15 stub implementation. Actual claude CLI spawn / stdin pipe is Phase 5 t17.
 * These endpoints exist to allow the frontend PMChatPanel to call the daemon
 * and receive broadcaster WS events back in real time.
 *
 * WHY REST (not tRPC): pm/* endpoints are thin pass-through stubs for now;
 * moving to tRPC mutations in Phase 5 is straightforward. REST avoids tying
 * the stub to a procedure input schema before the full contract is known.
 *
 * Principle §4 (KISS): minimal stub — only what's needed for the 4 endpoints.
 * Principle §9 (Fail fast): missing required body fields → 400 immediately.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { broadcaster } from "../events/broadcaster.js";
import { nanoid } from "nanoid";

interface SayBody {
  text?: unknown;
}

interface PermissionBody {
  allow?: unknown;
}

/** Register all /pm/* routes on the Fastify instance. */
export function registerPmRoutes(app: FastifyInstance): void {
  // POST /pm/start — emit a "PM session started" system message
  app.post("/pm/start", async (_req: FastifyRequest, reply: FastifyReply) => {
    const ts = new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
    broadcaster.emitPmMessage({
      who: "pm",
      text: "PM session を起動しました (stub)",
      ts,
    });
    return reply.send({ started: true });
  });

  // POST /pm/say { text } — echo user message then emit stub PM reply
  app.post("/pm/say", async (req: FastifyRequest<{ Body: SayBody }>, reply: FastifyReply) => {
    const body = req.body as SayBody;
    if (typeof body?.text !== "string" || body.text.trim() === "") {
      return reply.code(400).send({ error: "text field is required" });
    }
    const ts = new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

    // Broadcast user message
    broadcaster.emitPmMessage({ who: "user", text: body.text, ts });

    // WHY: stub PM echo response so frontend sees the round-trip.
    // Phase 5 t17 replaces this with actual claude stdout pipe.
    broadcaster.emitPmMessage({
      who: "pm",
      text: `[stub] 受け取りました: "${body.text}"`,
      ts,
    });

    return reply.send({ sent: true });
  });

  // POST /pm/permission/:reqId { allow: boolean } — resolve a pending approval
  app.post(
    "/pm/permission/:reqId",
    async (
      req: FastifyRequest<{ Params: { reqId: string }; Body: PermissionBody }>,
      reply: FastifyReply,
    ) => {
      const body = req.body as PermissionBody;
      if (typeof body?.allow !== "boolean") {
        return reply.code(400).send({ error: "allow field (boolean) is required" });
      }
      const { reqId } = req.params;
      broadcaster.emitPmPermissionResolved({ id: reqId, allow: body.allow });
      return reply.send({ resolved: true });
    },
  );

  // POST /pm/stop — emit a "PM session stopped" system message
  app.post("/pm/stop", async (_req: FastifyRequest, reply: FastifyReply) => {
    const ts = new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
    broadcaster.emitPmMessage({
      who: "pm",
      text: "PM session を停止しました (stub)",
      ts,
    });
    return reply.send({ stopped: true });
  });
}

// WHY: pmRouter exported for appRouter integration (tRPC sub-router stub).
// This thin wrapper gives the router.ts a pm sub-router with a start procedure
// so pm.start is discoverable via appRouter._def.procedures (required by tests).
import { router, publicProcedure } from "../trpc.js";
import { z } from "zod";

export const pmRouter = router({
  // stub tRPC procedures mirror the REST endpoints above.
  // Phase 5 t17 will expand these into full mutations with claude CLI wire.
  start: publicProcedure.mutation(async () => {
    const ts = new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
    broadcaster.emitPmMessage({ who: "pm", text: "PM session を起動しました (stub)", ts });
    return { started: true };
  }),
  say: publicProcedure
    .input(z.object({ text: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const ts = new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
      broadcaster.emitPmMessage({ who: "user", text: input.text, ts });
      broadcaster.emitPmMessage({ who: "pm", text: `[stub] 受け取りました: "${input.text}"`, ts });
      return { sent: true };
    }),
  stop: publicProcedure.mutation(async () => {
    const ts = new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
    broadcaster.emitPmMessage({ who: "pm", text: "PM session を停止しました (stub)", ts });
    return { stopped: true };
  }),
  // WHY: no tRPC for permission/:reqId because it uses a path param (:reqId).
  // REST endpoint (/pm/permission/:reqId) handles this in registerPmRoutes.
  // tRPC equivalent would use resolvePermission mutation with { reqId, allow } input.
  resolvePermission: publicProcedure
    .input(z.object({ reqId: z.string(), allow: z.boolean() }))
    .mutation(async ({ input }) => {
      broadcaster.emitPmPermissionResolved({ id: input.reqId, allow: input.allow });
      return { resolved: true };
    }),
});
