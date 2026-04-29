/**
 * Task 6 TDD: Fastify server scaffold
 * RED: tests for buildServer before server.ts exists
 */
import { describe, it, expect, afterEach } from "vitest";

describe("Fastify server scaffold", () => {
  let app: Awaited<ReturnType<typeof import("../src/server.js").buildServer>> | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("buildServer returns a Fastify instance", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe("function");
    expect(typeof app.close).toBe("function");
  });

  it("/health endpoint returns status ok with timestamp", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("ok");
    expect(typeof body.timestamp).toBe("number");
    expect(body.version).toBe("0.1.0");
  });

  it("/health timestamp is a recent epoch ms value", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const before = Date.now();
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });
    const after = Date.now();

    const body = JSON.parse(response.body);
    expect(body.timestamp).toBeGreaterThanOrEqual(before);
    expect(body.timestamp).toBeLessThanOrEqual(after);
  });
});
