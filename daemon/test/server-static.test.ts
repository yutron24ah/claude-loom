/**
 * M0.11.5 t3 TDD: Fastify static plugin for ui/dist serving
 * RED: tests written before static plugin implementation exists
 *
 * WHY: daemon must serve ui/dist at :5757 in production mode (SPEC §3.2),
 * while NOT interfering with dev mode (Vite :5173 separate) or crashing
 * when ui/dist is absent.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Capture the original env before each test
let originalNodeEnv: string | undefined;

describe("daemon static plugin — production mode", () => {
  let app: Awaited<ReturnType<typeof import("../src/server.js").buildServer>> | null = null;
  let testDistDir: string;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    // Create a temporary ui/dist directory with a minimal index.html
    testDistDir = join(tmpdir(), `loom-test-dist-${Date.now()}`);
    mkdirSync(testDistDir, { recursive: true });
    writeFileSync(join(testDistDir, "index.html"), "<html><body>Test UI</body></html>");

    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    process.env.LOOM_UI_DIST = testDistDir;
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
    // Restore env
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    delete process.env.LOOM_UI_DIST;

    // Clean up temp directory
    if (existsSync(testDistDir)) {
      rmSync(testDistDir, { recursive: true, force: true });
    }
  });

  it("GET / returns 200 with index.html content in production mode", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({
      method: "GET",
      url: "/",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("Test UI");
  });

  it("GET /index.html returns 200 with index.html content in production mode", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({
      method: "GET",
      url: "/index.html",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("Test UI");
  });

  it("GET /health still works when static plugin is registered", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("ok");
  });

  it("unknown path returns index.html (SPA fallback) in production mode", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({
      method: "GET",
      url: "/some/spa/route",
    });

    // SPA fallback: should return index.html or 404 (implementation choice)
    // We test that server does NOT crash
    expect([200, 404]).toContain(response.statusCode);
  });
});

describe("daemon static plugin — ui/dist absent in production mode", () => {
  let app: Awaited<ReturnType<typeof import("../src/server.js").buildServer>> | null = null;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    // Point to a non-existent directory
    process.env.LOOM_UI_DIST = "/nonexistent/path/to/dist-" + Date.now();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    delete process.env.LOOM_UI_DIST;
  });

  it("server starts without crash when ui/dist does not exist", async () => {
    const { buildServer } = await import("../src/server.js");
    // Should NOT throw
    app = await buildServer();
    expect(app).toBeDefined();
  });

  it("/health still returns ok when ui/dist is absent", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
  });

  it("static plugin is not registered when ui/dist is absent (GET / returns 404)", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({
      method: "GET",
      url: "/",
    });

    // No static plugin → 404 (not 200 with html)
    expect(response.statusCode).toBe(404);
  });
});

describe("daemon static plugin — dev mode (not production)", () => {
  let app: Awaited<ReturnType<typeof import("../src/server.js").buildServer>> | null = null;
  let testDistDir: string;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    // Even with ui/dist present, dev mode should NOT register static plugin
    testDistDir = join(tmpdir(), `loom-test-dist-dev-${Date.now()}`);
    mkdirSync(testDistDir, { recursive: true });
    writeFileSync(join(testDistDir, "index.html"), "<html><body>Dev should not serve this</body></html>");

    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    process.env.LOOM_UI_DIST = testDistDir;
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    delete process.env.LOOM_UI_DIST;

    if (existsSync(testDistDir)) {
      rmSync(testDistDir, { recursive: true, force: true });
    }
  });

  it("static plugin is NOT registered in development mode (GET / returns 404)", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({
      method: "GET",
      url: "/",
    });

    // Dev mode: static NOT served → 404
    expect(response.statusCode).toBe(404);
  });

  it("/health works in development mode", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("ok");
  });
});

describe("daemon static plugin — env var unset (legacy mode, not production)", () => {
  let app: Awaited<ReturnType<typeof import("../src/server.js").buildServer>> | null = null;
  let originalNodeEnv: string | undefined;
  let originalLoomUiDist: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    originalLoomUiDist = process.env.LOOM_UI_DIST;
    // Remove both env vars to simulate plain startup (no static)
    delete process.env.NODE_ENV;
    delete process.env.LOOM_UI_DIST;
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    if (originalLoomUiDist === undefined) {
      delete process.env.LOOM_UI_DIST;
    } else {
      process.env.LOOM_UI_DIST = originalLoomUiDist;
    }
  });

  it("server starts when NODE_ENV is unset", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();
    expect(app).toBeDefined();
  });

  it("GET / returns 404 when NODE_ENV is not production", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({
      method: "GET",
      url: "/",
    });

    expect(response.statusCode).toBe(404);
  });
});
