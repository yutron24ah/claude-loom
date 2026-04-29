/**
 * Daemon-side config wrapper: ~/.claude-loom/config.json
 * SPEC §6.10
 * M1 Task 17
 */
import { z } from "zod";
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { nanoid } from "nanoid";

export const configSchema = z.object({
  port: z.number().int().min(1).max(65535).default(5757),
  bindAddress: z.string().default("127.0.0.1"),
  idleShutdownMinutes: z.number().int().min(1).default(30),
  eventRetentionDays: z.number().int().min(1).default(30),
  eventMaxSizeMb: z.number().int().min(1).default(200),
  dbPath: z.string().default(`${homedir()}/.claude-loom/loom.db`),
});

export type Config = z.infer<typeof configSchema>;

const DEFAULT_CONFIG_PATH = `${homedir()}/.claude-loom/config.json`;

export function readConfig(configPath = DEFAULT_CONFIG_PATH): Config {
  if (!existsSync(configPath)) {
    return configSchema.parse({});
  }
  const raw = readFileSync(configPath, "utf-8");
  return configSchema.parse(JSON.parse(raw));
}

/**
 * Atomic write via tmp + rename (POSIX atomic).
 */
export function writeConfig(config: Config, configPath = DEFAULT_CONFIG_PATH): void {
  mkdirSync(dirname(configPath), { recursive: true });
  const tmpPath = join(dirname(configPath), `.config-${nanoid(8)}.tmp`);
  writeFileSync(tmpPath, JSON.stringify(config, null, 2));
  renameSync(tmpPath, configPath);
}

/**
 * Patch + write atomic.
 */
export function updateConfig(patch: Partial<Config>, configPath = DEFAULT_CONFIG_PATH): Config {
  const current = readConfig(configPath);
  const next = configSchema.parse({ ...current, ...patch });
  writeConfig(next, configPath);
  return next;
}
