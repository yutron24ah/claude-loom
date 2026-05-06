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

function isProductionMode(): boolean {
  return process.env.NODE_ENV === "production";
}

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  await app.register(websocket);

  // WHY: Register static serving BEFORE API routes so Fastify's route specificity
  // rules still prefer explicit API paths (/health, /trpc/*) over the wildcard static.
  // Only register in production mode AND when ui/dist actually exists — dev mode uses
  // Vite dev server on :5173 separately (SPEC §3.2, dev mode separation).
  if (isProductionMode()) {
    const uiDistPath = resolveUiDistPath();
    if (existsSync(uiDistPath)) {
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
    } else {
      // WHY: fallback = skip silently rather than crash (SPEC §3.2 fallback requirement).
      // Operator must build UI separately before starting in production mode.
      app.log.warn(`static: ui/dist not found at ${uiDistPath} — static serving skipped`);
    }
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
