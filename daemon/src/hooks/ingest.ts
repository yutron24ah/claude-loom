import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createDBClient, runMigrations } from "../db/client.js";
import { events, specChanges, projects } from "../db/schema.js";
import { broadcaster } from "../events/broadcaster.js";
import { SPEC_CHANGE_STATUS } from "../constants/consistency.js";
import { computeHash, computeDiff } from "../lib/spec-diff.js";
import { eq, and, desc } from "drizzle-orm";

const eventInputSchema = z.object({
  sessionId: z.string(),
  eventType: z.enum(["session_start", "pre_tool", "post_tool", "stop", "subagent_stop"]),
  toolName: z.string().nullable().optional(),
  payload: z.record(z.unknown()),
});

/**
 * Compute sha256 hex hash for given string content.
 * WHY: exported for unit testability per Principle §8 (test behavior, not implementation).
 * Delegates to lib/spec-diff.ts computeHash (DRY — single hash implementation SSoT).
 */
export function computeSpecHash(content: string): string {
  return computeHash(content);
}

/**
 * Handle spec_edit detection for post_tool events from Edit/Write tools.
 * Checks if the edited file is the project's spec file, computes hash,
 * and inserts a spec_changes row if content changed.
 *
 * WHY: Isolated from the main event insert path to maintain SRP (Principle §1).
 */
async function handleSpecEditDetection(
  db: ReturnType<typeof createDBClient>,
  toolName: string | null | undefined,
  payload: Record<string, unknown>,
): Promise<void> {
  // Only process Edit or Write tool events
  if (toolName !== "Edit" && toolName !== "Write") {
    return;
  }

  const specEditCandidate = payload.specEditCandidate as boolean | undefined;
  if (!specEditCandidate) {
    return;
  }

  const filePath = payload.filePath as string | undefined;
  const projectRootPath = payload.projectRootPath as string | undefined;

  if (!filePath || !projectRootPath) {
    return;
  }

  // Look up project by rootPath to get specPath
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.rootPath, projectRootPath))
    .get();

  if (!project) {
    return;
  }

  // Resolve the project's spec file path (default 'SPEC.md' if not set)
  const specRelPath = project.specPath ?? "SPEC.md";
  const resolvedSpecPath = join(projectRootPath, specRelPath);

  // Check that the edited file matches the project's spec path
  // Normalize both to compare (resolve relative filePath against project root if needed)
  const editedAbsPath = filePath;
  if (editedAbsPath !== resolvedSpecPath) {
    return;
  }

  // Read current file content
  if (!existsSync(resolvedSpecPath)) {
    return;
  }
  const currentContent = readFileSync(resolvedSpecPath, "utf-8");
  const currentHash = computeSpecHash(currentContent);

  // Find the most recent spec_changes row for this project+specPath to get the last known hash.
  // WHY: filter by specPath as well as projectId — a project may track multiple spec files
  // or change its specPath over time. Mixing rows from different specPaths would produce
  // a corrupt before_hash chain.
  const lastChange = await db
    .select()
    .from(specChanges)
    .where(and(
      eq(specChanges.projectId, project.projectId),
      eq(specChanges.specPath, specRelPath),
    ))
    .orderBy(desc(specChanges.id))
    .limit(1)
    .get();

  const lastKnownHash = lastChange?.afterHash ?? null;

  // Skip if content hasn't changed
  if (lastKnownHash !== null && lastKnownHash === currentHash) {
    return;
  }

  // Compute diff
  // WHY: before content is unavailable (we only store hashes, not snapshots — YAGNI for M4 t1).
  // Phase A (t3) only needs the hash chain to identify changes; the diff is advisory context.
  // Always use empty string as "before" — the hash chain is the authoritative change record.
  const { diff: diffStr } = computeDiff("", currentContent);

  const [inserted] = await db.insert(specChanges).values({
    projectId: project.projectId,
    specPath: specRelPath,
    beforeHash: lastKnownHash ?? computeSpecHash(""),
    afterHash: currentHash,
    diff: diffStr,
    detectedAt: new Date(),
    status: SPEC_CHANGE_STATUS.PENDING,
  }).returning();

  // WHY: M4 t7 — emit WS push immediately after INSERT so UI can display
  // "⚠️ SPEC 変更検知" badge without waiting for Phase A analysis (SPEC §7.5 Step 3).
  broadcaster.emitSpecChangeDetected({
    specChangeId: inserted.id,
    projectId: project.projectId,
    specPath: specRelPath,
  });
}

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

    // WHY: spec edit detection runs after event insert so the audit log is always preserved.
    // Spec detection failure must not prevent the event from being recorded (fail-safe).
    if (eventType === "post_tool") {
      await handleSpecEditDetection(db, toolName, payload).catch(() => {
        // fail-silent: spec detection errors must not break event ingest
      });
    }

    return { ok: true, eventId: inserted.id };
  });
}
