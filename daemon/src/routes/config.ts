/**
 * tRPC sub-router: config
 * SPEC §6.10 — ~/.claude-loom/config.json read/write
 * M1 Task 8 Subset C (stub — Task 17 で wrapper 化)
 */
import { z } from "zod";
import { homedir } from "node:os";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { dirname } from "node:path";
import { router, publicProcedure } from "../trpc.js";

const configSchema = z.object({
  port: z.number().default(5757),
  bindAddress: z.string().default("127.0.0.1"),
  idleShutdownMinutes: z.number().default(30),
  eventRetentionDays: z.number().default(30),
  eventMaxSizeMb: z.number().default(200),
});

type ConfigSchema = z.infer<typeof configSchema>;

const CONFIG_PATH = `${homedir()}/.claude-loom/config.json`;

function readConfig(): ConfigSchema {
  if (!existsSync(CONFIG_PATH)) {
    return configSchema.parse({});
  }
  const raw = readFileSync(CONFIG_PATH, "utf-8");
  return configSchema.parse(JSON.parse(raw));
}

function writeConfig(config: ConfigSchema): void {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export const configRouter = router({
  /**
   * get: read config from ~/.claude-loom/config.json
   * returns default values if file does not exist
   */
  get: publicProcedure
    .query((): { config: ConfigSchema } => {
      const config = readConfig();
      return { config };
    }),

  /**
   * set: merge patch into existing config and persist
   */
  set: publicProcedure
    .input(z.object({ patch: configSchema.partial() }))
    .mutation(({ input }): { config: ConfigSchema } => {
      const current = readConfig();
      const merged = configSchema.parse({ ...current, ...input.patch });
      writeConfig(merged);
      return { config: merged };
    }),
});
