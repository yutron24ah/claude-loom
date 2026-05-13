import Fastify from "fastify";
import websocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import { appRouter, type AppRouter } from "./router.js";
import { createContext } from "./trpc.js";
import { registerIngestRoute } from "./hooks/ingest.js";
import { registerPmRoutes } from "./routes/pm.js";
import { createDBClient, runMigrations } from "./db/client.js";
import { startIdleShutdown } from "./lifecycle/idle-shutdown.js";
import { scheduleEventCleanup } from "./lifecycle/event-cleanup.js";
import { existsSync, realpathSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// WHY: resolve ui/dist relative to this file's location (daemon/src/server.ts),
// going up two levels to the repo root, then into ui/dist.
// LOOM_UI_DIST env var allows test override without touching filesystem structure.
function resolveUiDistPath(): string {
  if (process.env.LOOM_UI_DIST) {
    return process.env.LOOM_UI_DIST;
  }
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // daemon/src → daemon → repo root → ui/dist
  return resolve(__dirname, "..", "..", "ui", "dist");
}

export async function buildServer() {
  // WHY: Capture start time once at build time so /mode endpoint returns a stable
  // ISO8601 timestamp reflecting when this server instance was initialized.
  const startedAt = new Date().toISOString();

  // WHY: Route files (consistency.ts / project.ts / etc.) use module-level
  // `const db = createDBClient()` (no path) which binds to default
  // `~/.claude-loom/loom.db` at import time. Only `registerIngestRoute` runs
  // migrations, and only for `process.env.CLAUDE_LOOM_DB_PATH` if set. Fresh
  // environments (CI workers, first run) leave the default DB un-migrated,
  // breaking any non-ingest route that touches a table. Running migrations on
  // the default path here is idempotent (drizzle migrator skips applied ones)
  // and guarantees all module-level route dbs operate on a migrated schema.
  // SSoT: SPEC §3.2 (daemon startup pipeline integrity) — surfaced by retro
  // 2026-05-06-004 follow-up CI investigation (consistency-spec-changes.test.ts
  // failures on fresh CI workers, see commit 25593385889).
  runMigrations(createDBClient());

  // WHY: SPEC §3.2.2 — LOOM_DEV_MODE replaces NODE_ENV as the static serving gate.
  // "build artifact exists + no explicit dev override = serve" mental model.
  // NODE_ENV === "production" dependency is deprecated (SPEC §3.2.2 rationale).
  const isDevMode = !!process.env.LOOM_DEV_MODE;
  const uiDistPath = resolveUiDistPath();
  const shouldServeStatic = !isDevMode && existsSync(uiDistPath);

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  await app.register(websocket);

  // WHY: Register static serving BEFORE API routes so Fastify's route specificity
  // rules still prefer explicit API paths (/health, /trpc/*) over the wildcard static.
  // Only register when shouldServeStatic — dev mode skips static (Vite :5173 serves UI),
  // and prod mode skips when ui/dist is absent (SPEC §3.2.2).
  if (shouldServeStatic) {
    await app.register(fastifyStatic, {
      root: uiDistPath,
      // WHY explicit wildcard=true: load-bearing for the SPA fallback below.
      // When a file is missing, @fastify/static calls reply.callNotFound() so
      // setNotFoundHandler can serve index.html. With wildcard=false the file
      // list would freeze at register time (UI rebuilds → new hash → 404 until
      // daemon restart) — same anti-pattern family as module-level db caching
      // that broke test isolation. Set explicitly so a future "default change"
      // upstream can never silently regress this behavior.
      // SSoT: SPEC §3.2.2 + memory entry on init-time state freeze.
      wildcard: true,
      index: "index.html",
    });

    // WHY: SPA fallback for client-side routes (/plan, /retro, /worktree, ...).
    // Fastify falls through to this handler for any path not matched by an
    // explicit route or a static file. We delegate GET to index.html so React
    // Router can resolve the route on the client. API endpoints are guarded
    // explicitly because @fastify/static does not know they are reserved.
    const apiPrefixes = ["/trpc", "/event", "/health", "/mode"];
    app.setNotFoundHandler((req, reply) => {
      if (req.method !== "GET") {
        reply.code(404).send({ error: "Not Found" });
        return;
      }
      const url = req.url.split("?")[0];
      if (apiPrefixes.some((p) => url === p || url.startsWith(p + "/"))) {
        reply.code(404).send({ error: "Not Found" });
        return;
      }
      reply.sendFile("index.html");
    });

    app.log.info(`static: serving ui/dist from ${uiDistPath}`);
  } else if (!isDevMode) {
    // WHY: fallback = skip silently rather than crash (SPEC §3.2 fallback requirement).
    // Operator must build UI separately before starting in production mode.
    app.log.warn(`static: ui/dist not found at ${uiDistPath} — static serving skipped`);
  }

  await app.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    useWSS: true,
    trpcOptions: {
      router: appRouter,
      createContext,
    } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
  });

  app.get("/health", async () => ({
    status: "ok",
    timestamp: Date.now(),
    version: "0.1.0",
  }));

  // WHY: /mode is the canonical SSoT for daemon mode per SPEC §3.2.1.
  // External scripts (loom-launch-ui.sh, pnpm dev pre-flight) probe this endpoint
  // to determine mode (dev/prod) and whether static UI is being served.
  // PID file is debug breadcrumb only; /mode is the authoritative source.
  app.get("/mode", async () => ({
    mode: isDevMode ? "dev" : "prod",
    entry: (process.env.LOOM_ENTRY as "lazy-launch" | "pnpm-dev" | "manual") ?? "manual",
    version: "0.1.0",
    started_at: startedAt,
    pid: process.pid,
    ui_serving: shouldServeStatic,
  }));

  registerIngestRoute(app);
  registerPmRoutes(app);

  return app;
}

export async function startServer(port = 5757, host = "127.0.0.1") {
  const app = await buildServer();
  await app.listen({ port, host });
  app.log.info(`claude-loom daemon listening on http://${host}:${port}`);

  startIdleShutdown({
    onShutdown: () => app.close().then(() => process.exit(0)),
  });

  scheduleEventCleanup({});

  return app;
}

// CLI entry — realpath comparison handles symlink invocation (e.g. `node
// ~/.claude-loom/daemon.js` where daemon.js → daemon/dist/server.js). Naive
// `process.argv[1]` string compare fails because import.meta.url resolves to
// the real path while argv[1] retains the symlink path. retro 2026-05-06-003
// F-USER-007 — lazy daemon flow regression evidence.
const argvPath = process.argv[1] ? realpathSync(process.argv[1]) : "";
const importPath = fileURLToPath(import.meta.url);
if (argvPath === importPath) {
  // WHY: LOOM_PORT env var lets integration tests bind on a random port to
  // avoid colliding with any running production daemon on :5757.
  const port = process.env.LOOM_PORT ? parseInt(process.env.LOOM_PORT, 10) : 5757;
  startServer(port).catch((err) => {
    console.error("Failed to start daemon:", err);
    process.exit(1);
  });
}
