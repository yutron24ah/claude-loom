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
// M1.5 Task 10: 6 new routers
import { retroRouter } from "./routes/retro.js";
import { prefsRouter } from "./routes/prefs.js";
import { personalityRouter } from "./routes/personality.js";
import { worktreeRouter } from "./routes/worktree.js";
import { coexistenceRouter } from "./routes/coexistence.js";
import { disciplineRouter } from "./routes/discipline.js";

// Sub-routers wired in Task 8 (M1), events added in Task 9, 6 new in Task 10 (M1.5)
export const appRouter = router({
  health: publicProcedure.query(() => ({
    status: "ok",
    timestamp: Date.now(),
  })),
  // M1 existing 9 routers
  project: projectRouter,
  session: sessionRouter,
  agent: agentRouter,
  plan: planRouter,
  consistency: consistencyRouter,
  approval: approvalRouter,
  note: noteRouter,
  config: configRouter,
  events: eventsRouter,
  // M1.5 new 6 routers
  retro: retroRouter,
  prefs: prefsRouter,
  personality: personalityRouter,
  worktree: worktreeRouter,
  coexistence: coexistenceRouter,
  discipline: disciplineRouter,
});

export type AppRouter = typeof appRouter;
