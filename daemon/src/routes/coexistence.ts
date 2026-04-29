/**
 * tRPC sub-router: coexistence
 * SPEC §3.6.7 — coexistence_mode + enabled_features get/set + detect
 * M1.5 Task 7: Q5 UI backend
 *
 * Procedures:
 *  - get: read project.json rules.coexistence_mode + rules.enabled_features
 *  - set: atomic write to project.json (M1 config.ts pattern)
 *  - detect: filesystem ls — other plugins, agents, skills, CLAUDE.md presence
 */
import { z } from "zod";
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { nanoid } from "nanoid";
import { router, publicProcedure } from "../trpc.js";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const coexistenceModeEnum = z.enum(["full", "coexist", "custom"]);
export type CoexistenceMode = z.infer<typeof coexistenceModeEnum>;

const getInputSchema = z.object({
  projectId: z.string(),
});

const setInputSchema = z.object({
  projectId: z.string(),
  mode: coexistenceModeEnum,
  enabledFeatures: z.array(z.string()),
});

const detectInputSchema = z.object({
  projectId: z.string(),
});

// ---------------------------------------------------------------------------
// project.json helpers (atomic write — M1 config.ts pattern)
// ---------------------------------------------------------------------------

function projectJsonPath(projectId: string): string {
  // projectId is treated as the project root path
  return join(projectId, ".claude-loom", "project.json");
}

interface ProjectJsonRules {
  coexistence_mode?: string;
  enabled_features?: string[];
  [key: string]: unknown;
}

interface ProjectJson {
  rules?: ProjectJsonRules;
  [key: string]: unknown;
}

function readProjectJson(projectId: string): ProjectJson {
  const jsonPath = projectJsonPath(projectId);
  if (!existsSync(jsonPath)) {
    return {};
  }
  try {
    const raw = readFileSync(jsonPath, "utf-8");
    return JSON.parse(raw) as ProjectJson;
  } catch {
    return {};
  }
}

function writeProjectJsonAtomic(projectId: string, data: ProjectJson): void {
  const jsonPath = projectJsonPath(projectId);
  mkdirSync(dirname(jsonPath), { recursive: true });
  const tmpPath = join(dirname(jsonPath), `.project-${nanoid(8)}.tmp`);
  writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  renameSync(tmpPath, jsonPath);
}

// ---------------------------------------------------------------------------
// detect helpers (filesystem ls — no network)
// ---------------------------------------------------------------------------

function safeReaddirSync(dirPath: string): string[] {
  try {
    return readdirSync(dirPath);
  } catch {
    return [];
  }
}

function detectOtherPlugins(): string[] {
  // ~/.claude/plugins/cache/ — list non-claude-loom entries
  const pluginsDir = join(homedir(), ".claude", "plugins", "cache");
  return safeReaddirSync(pluginsDir).filter(
    (name) => !name.startsWith("claude-loom") && name !== ".DS_Store"
  );
}

function detectExistingClaudeMd(projectId: string): boolean {
  // project root CLAUDE.md existence check
  return existsSync(join(projectId, "CLAUDE.md"));
}

function detectExistingAgentsSkills(): string[] {
  // ~/.claude/agents/ non-loom-* agent files
  const agentsDir = join(homedir(), ".claude", "agents");
  const agentFiles = safeReaddirSync(agentsDir).filter(
    (name) => !name.startsWith("loom-") && !name.startsWith(".") && name.endsWith(".md")
  );

  // ~/.claude/skills/ non-loom-* skill dirs
  const skillsDir = join(homedir(), ".claude", "skills");
  const skillDirs = safeReaddirSync(skillsDir).filter(
    (name) => !name.startsWith("loom-") && !name.startsWith(".")
  );

  return [...agentFiles.map((f) => `agents/${f}`), ...skillDirs.map((d) => `skills/${d}`)];
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const coexistenceRouter = router({
  /**
   * get: read coexistence_mode + enabled_features from project.json
   * defaults: mode="full", features=["all"]
   */
  get: publicProcedure.input(getInputSchema).query(({ input }) => {
    const data = readProjectJson(input.projectId);
    const rules = data.rules ?? {};
    const mode = coexistenceModeEnum.catch("full").parse(rules.coexistence_mode ?? "full");
    const enabledFeatures: string[] = Array.isArray(rules.enabled_features)
      ? (rules.enabled_features as string[])
      : ["all"];
    return { mode, enabledFeatures };
  }),

  /**
   * set: atomic write coexistence_mode + enabled_features to project.json
   */
  set: publicProcedure.input(setInputSchema).mutation(({ input }) => {
    const data = readProjectJson(input.projectId);
    const rules: ProjectJsonRules = { ...(data.rules ?? {}) };
    rules.coexistence_mode = input.mode;
    rules.enabled_features = input.enabledFeatures;
    writeProjectJsonAtomic(input.projectId, { ...data, rules });
    return { mode: input.mode, enabledFeatures: input.enabledFeatures };
  }),

  /**
   * detect: filesystem ls — other plugins, CLAUDE.md, agents/skills
   * No network. Results are informational for the UI coexistence screen.
   */
  detect: publicProcedure.input(detectInputSchema).query(({ input }) => {
    const otherPlugins = detectOtherPlugins();
    const existingClaudeMd = detectExistingClaudeMd(input.projectId);
    const existingAgentsSkills = detectExistingAgentsSkills();
    return { otherPlugins, existingClaudeMd, existingAgentsSkills };
  }),
});
