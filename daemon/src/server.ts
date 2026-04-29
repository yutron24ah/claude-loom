import Fastify from "fastify";
import websocket from "@fastify/websocket";

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  await app.register(websocket);

  app.get("/health", async () => ({
    status: "ok",
    timestamp: Date.now(),
    version: "0.1.0",
  }));

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
