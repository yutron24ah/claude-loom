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

    // WHY: SPA fallback contract is now explicit (M0.X-asset-cache-recovery):
    // GET to any unknown non-API path must return index.html so React Router
    // can resolve the route on the client. The previous soft assertion let a
    // 404 regression slip through silently.
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("Test UI");
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

describe("daemon static plugin — dynamic file serving + SPA fallback (M0.X-asset-cache-recovery)", () => {
  // WHY: regression net for the "rebuild → daemon restart required" trap caused
  // by `wildcard: false` freezing the dist file list at register time.
  // SPEC §3.2.2 + structural anti-pattern: init-time state freeze (cf. memory
  // entry "test isolation module-level db caching" — same root cause family).
  let app: Awaited<ReturnType<typeof import("../src/server.js").buildServer>> | null = null;
  let testDistDir: string;
  let originalLoomDevMode: string | undefined;

  beforeEach(() => {
    testDistDir = join(tmpdir(), `loom-test-dyn-${Date.now()}`);
    mkdirSync(testDistDir, { recursive: true });
    writeFileSync(join(testDistDir, "index.html"), "<html><body>Test UI</body></html>");
    originalLoomDevMode = process.env.LOOM_DEV_MODE;
    delete process.env.LOOM_DEV_MODE;
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

  it("serves an asset file added AFTER server boot (no init-time freeze)", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    // Simulate `pnpm build` running while daemon is alive: vite wipes dist and
    // writes new hashed assets. The daemon must serve them without a restart.
    mkdirSync(join(testDistDir, "assets"), { recursive: true });
    writeFileSync(
      join(testDistDir, "assets", "index-POSTBOOT.js"),
      "console.log('post-boot asset');"
    );

    const res = await app.inject({
      method: "GET",
      url: "/assets/index-POSTBOOT.js",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("post-boot asset");
  });

  it("SPA fallback: unknown GET path returns 200 with index.html content", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const res = await app.inject({ method: "GET", url: "/plan" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("Test UI");
    expect(res.headers["content-type"]).toMatch(/html/);
  });

  it("API guard: /health stays JSON, not hijacked by SPA fallback", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("ok");
  });

  it("API guard: /mode stays JSON, not hijacked by SPA fallback", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const res = await app.inject({ method: "GET", url: "/mode" });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/);
    const body = JSON.parse(res.body);
    expect(body.mode).toBe("prod");
  });

  it("API guard: /trpc/unknown.procedure returns non-HTML response", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const res = await app.inject({
      method: "GET",
      url: "/trpc/nonexistent.procedure",
    });

    // tRPC owns /trpc/* — whatever it returns (typically 4xx JSON) must NOT
    // be the HTML SPA fallback.
    expect(res.headers["content-type"] ?? "").not.toMatch(/text\/html/);
  });

  it("API guard: non-GET method on unknown path returns 404 (not SPA fallback)", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const res = await app.inject({
      method: "POST",
      url: "/random/spa-looking/path",
    });

    // POST to unknown path must not be treated as SPA navigation.
    expect(res.statusCode).not.toBe(200);
    expect(res.headers["content-type"] ?? "").not.toMatch(/text\/html/);
  });

  it("API guard: /event/<id> returns JSON 404, not SPA fallback", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const res = await app.inject({
      method: "GET",
      url: "/event/12345",
    });

    // /event is in apiPrefixes — must not be hijacked by SPA fallback.
    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toMatch(/json/);
  });

  it("SPA fallback: /plan?tab=retro (route with query string) returns index.html", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const res = await app.inject({
      method: "GET",
      url: "/plan?tab=retro",
    });

    // WHY: query-string strip in setNotFoundHandler must not break SPA fallback.
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("Test UI");
    expect(res.headers["content-type"]).toMatch(/html/);
  });

  it("SPA fallback: /healthcheck is NOT mis-classified as /health API prefix", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const res = await app.inject({
      method: "GET",
      url: "/healthcheck",
    });

    // WHY: prefix match must use `p === url || url.startsWith(p + "/")` so that
    // /healthcheck does not match /health. If a future refactor drops the
    // trailing-slash guard, this test catches the silent mis-classification.
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
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
