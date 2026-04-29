import Fastify from "fastify";
import websocket from "@fastify/websocket";
import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import { appRouter, type AppRouter } from "./router.js";
import { createContext } from "./trpc.js";
import { registerIngestRoute } from "./hooks/ingest.js";

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  await app.register(websocket);

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
  return app;
}

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((err) => {
    console.error("Failed to start daemon:", err);
    process.exit(1);
  });
}
