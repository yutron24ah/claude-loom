import { router, publicProcedure } from "./trpc.js";
import { projectRouter } from "./routes/project.js";
import { sessionRouter } from "./routes/session.js";
import { agentRouter } from "./routes/agent.js";
import { planRouter } from "./routes/plan.js";
import { consistencyRouter } from "./routes/consistency.js";
import { approvalRouter } from "./routes/approval.js";
import { noteRouter } from "./routes/note.js";
import { configRouter } from "./routes/config.js";
import { eventsRouter } from "./routes/events.js";

// Sub-routers wired in Task 8 (M1), events added in Task 9
export const appRouter = router({
  health: publicProcedure.query(() => ({
    status: "ok",
    timestamp: Date.now(),
  })),
  project: projectRouter,
  session: sessionRouter,
  agent: agentRouter,
  plan: planRouter,
  consistency: consistencyRouter,
  approval: approvalRouter,
  note: noteRouter,
  config: configRouter,
  events: eventsRouter,
});

export type AppRouter = typeof appRouter;
