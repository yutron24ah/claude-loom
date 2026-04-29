/**
 * tRPC sub-router: config
 * SPEC §6.10 — ~/.claude-loom/config.json read/write
 * M1 Task 17: rewired to use daemon/src/config.ts wrapper
 */
import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";
import { readConfig, updateConfig, configSchema } from "../config.js";

export const configRouter = router({
  /**
   * get: read config from ~/.claude-loom/config.json
   * returns default values if file does not exist
   */
  get: publicProcedure.query(() => ({ config: readConfig() })),

  /**
   * set: merge patch into existing config and persist atomically
   */
  set: publicProcedure
    .input(z.object({ patch: configSchema.partial() }))
    .mutation(({ input }) => ({ config: updateConfig(input.patch) })),
});
