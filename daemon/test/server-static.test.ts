/**
 * M0.11.5 t3 TDD: Fastify static plugin for ui/dist serving
 * Migrated (M0.X-runtime-mode-recovery t3): NODE_ENV → LOOM_DEV_MODE
 *
 * WHY: daemon must serve ui/dist at :5757 in prod mode (SPEC §3.2),
 * while NOT interfering with dev mode (Vite :5173 separate) or crashing
 * when ui/dist is absent.
 * SPEC §3.2.2: NODE_ENV === "production" dependency deprecated.
 * LOOM_DEV_MODE is the sole gate for static serving skip.
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("daemon static plugin — production mode (LOOM_DEV_MODE unset)", () => {
  let app: Awaited<ReturnType<typeof import("../src/server.js").buildServer>> | null = null;
  let testDistDir: string;
  let originalLoomDevMode: string | undefined;

  beforeEach(() => {
    // Create a temporary ui/dist directory with a minimal index.html
    testDistDir = join(tmpdir(), `loom-test-dist-${Date.now()}`);
    mkdirSync(testDistDir, { recursive: true });
    writeFileSync(join(testDistDir, "index.html"), "<html><body>Test UI</body></html>");

    // WHY: prod mode = LOOM_DEV_MODE unset (SPEC §3.2.2)
    originalLoomDevMode = process.env.LOOM_DEV_MODE;
    delete process.env.LOOM_DEV_MODE;
    process.env.LOOM_UI_DIST = testDistDir;
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
    // Restore env
    if (originalLoomDevMode === undefined) {
      delete process.env.LOOM_DEV_MODE;
    } else {
      process.env.LOOM_DEV_MODE = originalLoomDevMode;
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

describe("daemon static plugin — ui/dist absent in production mode (LOOM_DEV_MODE unset)", () => {
  let app: Awaited<ReturnType<typeof import("../src/server.js").buildServer>> | null = null;
  let originalLoomDevMode: string | undefined;

  beforeEach(() => {
    // WHY: prod mode = LOOM_DEV_MODE unset (SPEC §3.2.2)
    originalLoomDevMode = process.env.LOOM_DEV_MODE;
    delete process.env.LOOM_DEV_MODE;
    // Point to a non-existent directory
    process.env.LOOM_UI_DIST = "/nonexistent/path/to/dist-" + Date.now();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
    if (originalLoomDevMode === undefined) {
      delete process.env.LOOM_DEV_MODE;
    } else {
      process.env.LOOM_DEV_MODE = originalLoomDevMode;
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

describe("daemon static plugin — dev mode (LOOM_DEV_MODE=1)", () => {
  let app: Awaited<ReturnType<typeof import("../src/server.js").buildServer>> | null = null;
  let testDistDir: string;
  let originalLoomDevMode: string | undefined;

  beforeEach(() => {
    // Even with ui/dist present, LOOM_DEV_MODE=1 should NOT register static plugin
    testDistDir = join(tmpdir(), `loom-test-dist-dev-${Date.now()}`);
    mkdirSync(testDistDir, { recursive: true });
    writeFileSync(join(testDistDir, "index.html"), "<html><body>Dev should not serve this</body></html>");

    // WHY: dev mode = LOOM_DEV_MODE set to any truthy value (SPEC §3.2.2)
    originalLoomDevMode = process.env.LOOM_DEV_MODE;
    process.env.LOOM_DEV_MODE = "1";
    process.env.LOOM_UI_DIST = testDistDir;
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
    if (originalLoomDevMode === undefined) {
      delete process.env.LOOM_DEV_MODE;
    } else {
      process.env.LOOM_DEV_MODE = originalLoomDevMode;
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

describe("daemon static plugin — no env vars set, ui/dist absent (plain startup fallback)", () => {
  let app: Awaited<ReturnType<typeof import("../src/server.js").buildServer>> | null = null;
  let originalLoomDevMode: string | undefined;
  let originalLoomUiDist: string | undefined;

  beforeEach(() => {
    originalLoomDevMode = process.env.LOOM_DEV_MODE;
    originalLoomUiDist = process.env.LOOM_UI_DIST;
    // WHY: Simulate plain startup — neither LOOM_DEV_MODE set, ui/dist forced absent.
    // SPEC §3.2.2: no explicit dev override + ui/dist absent = no static serving.
    // We must override LOOM_UI_DIST to point to absent path because ui/dist may
    // actually exist in the repo (built artifact), and SPEC §3.2.2 says
    // "build artifact exists + no dev override = serve". So this test covers
    // the absent-ui/dist prod path specifically.
    delete process.env.LOOM_DEV_MODE;
    process.env.LOOM_UI_DIST = "/nonexistent/path/dist-" + Date.now();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
    if (originalLoomDevMode === undefined) {
      delete process.env.LOOM_DEV_MODE;
    } else {
      process.env.LOOM_DEV_MODE = originalLoomDevMode;
    }
    if (originalLoomUiDist === undefined) {
      delete process.env.LOOM_UI_DIST;
    } else {
      process.env.LOOM_UI_DIST = originalLoomUiDist;
    }
  });

  it("server starts when LOOM_DEV_MODE is unset and ui/dist is absent", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();
    expect(app).toBeDefined();
  });

  it("GET / returns 404 when LOOM_DEV_MODE unset and ui/dist absent (no static plugin registered)", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({
      method: "GET",
      url: "/",
    });

    // WHY: shouldServeStatic = !isDevMode && existsSync(uiDistPath)
    // isDevMode=false, existsSync=false → shouldServeStatic=false → 404
    expect(response.statusCode).toBe(404);
  });
});
