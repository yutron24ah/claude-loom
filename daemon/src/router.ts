import { router, publicProcedure } from "./trpc.js";

// Sub-routers added in Task 8. M1 base provides skeleton with health check.
export const appRouter = router({
  health: publicProcedure.query(() => ({
    status: "ok",
    timestamp: Date.now(),
  })),
  // project: projectRouter,    // Task 8
  // session: sessionRouter,    // Task 8
  // agent: agentRouter,        // Task 8
  // plan: planRouter,          // Task 8
  // consistency: consistencyRouter,  // Task 8
  // approval: approvalRouter,  // Task 8
  // note: noteRouter,          // Task 8
  // config: configRouter,      // Task 8
});

export type AppRouter = typeof appRouter;
