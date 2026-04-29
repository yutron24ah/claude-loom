/**
 * Task 7 TDD: tRPC + zod base setup
 * RED: tests for trpc.ts and router.ts before they exist
 */
import { describe, it, expect, afterEach } from "vitest";

describe("tRPC base setup", () => {
  it("exports router and publicProcedure from trpc.ts", async () => {
    const { router, publicProcedure, createContext } = await import("../src/trpc.js");
    expect(typeof router).toBe("function");
    expect(typeof publicProcedure).toBe("object");
    expect(typeof createContext).toBe("function");
  });

  it("createContext extracts x-loom-token from headers", async () => {
    const { createContext } = await import("../src/trpc.js");
    const mockReq = {
      headers: { "x-loom-token": "test-token-123" },
    };
    // createContext takes CreateFastifyContextOptions shape
    const ctx = createContext({ req: mockReq } as never);
    expect(ctx.token).toBe("test-token-123");
  });

  it("createContext returns empty token when header absent", async () => {
    const { createContext } = await import("../src/trpc.js");
    const mockReq = { headers: {} };
    const ctx = createContext({ req: mockReq } as never);
    expect(ctx.token).toBeUndefined();
  });

  it("appRouter exports health procedure", async () => {
    const { appRouter } = await import("../src/router.js");
    expect(appRouter).toBeDefined();
    // appRouter._def should contain the router definition
    expect(appRouter._def).toBeDefined();
  });

  it("AppRouter type is exported from router.ts", async () => {
    // This is a compile-time type check — we just verify the module loads
    const routerModule = await import("../src/router.js");
    expect(routerModule.appRouter).toBeDefined();
  });
});

describe("tRPC Fastify integration", () => {
  let app: Awaited<ReturnType<typeof import("../src/server.js").buildServer>> | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("server mounts /trpc/* route with tRPC adapter", async () => {
    const { buildServer } = await import("../src/server.js");
    app = await buildServer();

    // tRPC health query via HTTP
    const response = await app.inject({
      method: "GET",
      url: "/trpc/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.result).toBeDefined();
    expect(body.result.data.status).toBe("ok");
    expect(typeof body.result.data.timestamp).toBe("number");
  });
});
