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
      // WHY: wildcard=false prevents @fastify/static from consuming unknown paths
      // with a 404 that blocks our own 404 handling. SPA routes that don't match
      // real files will fall through to Fastify's default 404 handler.
      wildcard: false,
      // Serve index.html at root
      index: "index.html",
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
  startServer().catch((err) => {
    console.error("Failed to start daemon:", err);
    process.exit(1);
  });
}
