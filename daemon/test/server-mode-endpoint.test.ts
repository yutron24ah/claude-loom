/**
 * REQ-049: /mode endpoint + LOOM_DEV_MODE-based static serving判定
 *
 * TDD RED phase — written before implementation exists.
 *
 * WHY: SPEC §3.2.1 mandates /mode endpoint as canonical source of truth for
 * daemon mode. SPEC §3.2.2 requires LOOM_DEV_MODE to replace NODE_ENV as the
 * static serving gate (NODE_ENV dependency is deprecated).
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// WHY: Vitest module cache must be reset between tests that mutate env vars
// affecting module-level constants (started_at is captured once at import time).
// We use a fresh import approach via inline dynamic import inside each test
// so that each test gets the buildServer from the same module instance, and
// we only rely on env vars that are read at buildServer() call time.

describe("/mode endpoint — SPEC §3.2.1 shape validation", () => {
  let app: Awaited<ReturnType<typeof import("../src/server.js").buildServer>> | null = null;
  let testDistDir: string;
  let originalLoomDevMode: string | undefined;
  let originalLoomEntry: string | undefined;
  let originalLoomUiDist: string | undefined;

  beforeEach(() => {
    testDistDir = join(tmpdir(), `loom-test-mode-${Date.now()}`);
    mkdirSync(testDistDir, { recursive: true });
    writeFileSync(join(testDistDir, "index.html"), "<html><body>Mode Test UI</body></html>");

    originalLoomDevMode = process.env.LOOM_DEV_MODE;
    originalLoomEntry = process.env.LOOM_ENTRY;
    originalLoomUiDist = process.env.LOOM_UI_DIST;

    // Default: no dev mode, ui/dist present, manual entry
    delete process.env.LOOM_DEV_MODE;
    delete process.env.LOOM_ENTRY;
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
    if (originalLoomEntry === undefined) {
      delete process.env.LOOM_ENTRY;
    } else {
      process.env.LOOM_ENTRY = originalLoomEntry;
    }
    if (originalLoomUiDist === undefined) {
      delete process.env.LOOM_UI_DIST;
    } else {
      process.env.LOOM_UI_DIST = originalLoomUiDist;
    }
    if (existsSync(testDistDir)) {
      rmSync(testDistDir, { recursive: true, force: true });
    }
  });

  it("GET /mode returns all required SPEC §3.2.1 shape fields", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({
      method: "GET",
      url: "/mode",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    // All 6 required fields from SPEC §3.2.1
    expect(body).toHaveProperty("mode");
    expect(body).toHaveProperty("entry");
    expect(body).toHaveProperty("version");
    expect(body).toHaveProperty("started_at");
    expect(body).toHaveProperty("pid");
    expect(body).toHaveProperty("ui_serving");
  });

  it("GET /mode returns mode=prod when LOOM_DEV_MODE is unset", async () => {
    delete process.env.LOOM_DEV_MODE;
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({ method: "GET", url: "/mode" });
    const body = JSON.parse(response.body);

    expect(body.mode).toBe("prod");
  });

  it("GET /mode returns entry=manual when LOOM_ENTRY is unset (default)", async () => {
    delete process.env.LOOM_ENTRY;
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({ method: "GET", url: "/mode" });
    const body = JSON.parse(response.body);

    expect(body.entry).toBe("manual");
  });

  it("GET /mode pid matches process.pid", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({ method: "GET", url: "/mode" });
    const body = JSON.parse(response.body);

    expect(body.pid).toBe(process.pid);
  });

  it("GET /mode started_at is ISO8601 string", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({ method: "GET", url: "/mode" });
    const body = JSON.parse(response.body);

    expect(typeof body.started_at).toBe("string");
    // Verify it's parseable as ISO8601
    const parsed = new Date(body.started_at);
    expect(parsed.toString()).not.toBe("Invalid Date");
  });

  it("GET /mode version is a non-empty string", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({ method: "GET", url: "/mode" });
    const body = JSON.parse(response.body);

    expect(typeof body.version).toBe("string");
    expect(body.version.length).toBeGreaterThan(0);
  });
});

describe("/mode endpoint — LOOM_DEV_MODE env var behavior", () => {
  let app: Awaited<ReturnType<typeof import("../src/server.js").buildServer>> | null = null;
  let testDistDir: string;
  let originalLoomDevMode: string | undefined;
  let originalLoomUiDist: string | undefined;

  beforeEach(() => {
    testDistDir = join(tmpdir(), `loom-test-devmode-${Date.now()}`);
    mkdirSync(testDistDir, { recursive: true });
    writeFileSync(join(testDistDir, "index.html"), "<html><body>Dev UI</body></html>");

    originalLoomDevMode = process.env.LOOM_DEV_MODE;
    originalLoomUiDist = process.env.LOOM_UI_DIST;
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
    if (originalLoomUiDist === undefined) {
      delete process.env.LOOM_UI_DIST;
    } else {
      process.env.LOOM_UI_DIST = originalLoomUiDist;
    }
    if (existsSync(testDistDir)) {
      rmSync(testDistDir, { recursive: true, force: true });
    }
  });

  it("LOOM_DEV_MODE=1 → mode=dev, ui_serving=false (even if ui/dist exists)", async () => {
    process.env.LOOM_DEV_MODE = "1";
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({ method: "GET", url: "/mode" });
    const body = JSON.parse(response.body);

    expect(body.mode).toBe("dev");
    // WHY: SPEC §3.2.1 "ui_serving は prod mode かつ ui/dist 存在時のみ true"
    expect(body.ui_serving).toBe(false);
  });

  it("LOOM_DEV_MODE unset + ui/dist exists → mode=prod, ui_serving=true", async () => {
    delete process.env.LOOM_DEV_MODE;
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({ method: "GET", url: "/mode" });
    const body = JSON.parse(response.body);

    expect(body.mode).toBe("prod");
    expect(body.ui_serving).toBe(true);
  });

  it("LOOM_DEV_MODE unset + ui/dist absent → mode=prod, ui_serving=false", async () => {
    delete process.env.LOOM_DEV_MODE;
    // Point to non-existent path
    process.env.LOOM_UI_DIST = "/nonexistent/path/dist-" + Date.now();
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({ method: "GET", url: "/mode" });
    const body = JSON.parse(response.body);

    expect(body.mode).toBe("prod");
    expect(body.ui_serving).toBe(false);
  });

  it("LOOM_DEV_MODE=1 → static NOT served (GET / returns 404, not html)", async () => {
    process.env.LOOM_DEV_MODE = "1";
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const staticResponse = await app.inject({ method: "GET", url: "/" });
    // WHY: dev mode should never serve static even if ui/dist exists (SPEC §3.2.2)
    expect(staticResponse.statusCode).toBe(404);
  });
});

describe("/mode endpoint — LOOM_ENTRY reflection", () => {
  let app: Awaited<ReturnType<typeof import("../src/server.js").buildServer>> | null = null;
  let originalLoomEntry: string | undefined;
  let originalLoomDevMode: string | undefined;

  beforeEach(() => {
    originalLoomEntry = process.env.LOOM_ENTRY;
    originalLoomDevMode = process.env.LOOM_DEV_MODE;
    // Use dev mode to avoid needing ui/dist
    process.env.LOOM_DEV_MODE = "1";
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
    if (originalLoomEntry === undefined) {
      delete process.env.LOOM_ENTRY;
    } else {
      process.env.LOOM_ENTRY = originalLoomEntry;
    }
    if (originalLoomDevMode === undefined) {
      delete process.env.LOOM_DEV_MODE;
    } else {
      process.env.LOOM_DEV_MODE = originalLoomDevMode;
    }
  });

  it("LOOM_ENTRY=lazy-launch → entry=lazy-launch", async () => {
    process.env.LOOM_ENTRY = "lazy-launch";
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({ method: "GET", url: "/mode" });
    const body = JSON.parse(response.body);

    expect(body.entry).toBe("lazy-launch");
  });

  it("LOOM_ENTRY=pnpm-dev → entry=pnpm-dev", async () => {
    process.env.LOOM_ENTRY = "pnpm-dev";
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({ method: "GET", url: "/mode" });
    const body = JSON.parse(response.body);

    expect(body.entry).toBe("pnpm-dev");
  });

  it("LOOM_ENTRY=manual → entry=manual", async () => {
    process.env.LOOM_ENTRY = "manual";
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    const response = await app.inject({ method: "GET", url: "/mode" });
    const body = JSON.parse(response.body);

    expect(body.entry).toBe("manual");
  });
});
