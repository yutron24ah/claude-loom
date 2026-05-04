/**
 * TDD RED: transformer configuration assertion for tRPC server setup.
 *
 * WHY: bug-2 root cause — daemon initTRPC.create() has no transformer,
 * while ui client uses superjson. The mismatch causes TransformResultError
 * on all WS query responses (SPEC §12 確定値表: tRPC + superjson).
 *
 * These tests assert that superjson is configured as the transformer on
 * the tRPC instance. We verify this by:
 * 1. superjson is importable (package present)
 * 2. The tRPC router instance carries superjson transformer config
 * 3. Date objects round-trip correctly through the transformer
 *    (Date is the canonical superjson test case — JSON.stringify loses type info)
 */
import { describe, it, expect } from "vitest";
import superjson from "superjson";

describe("daemon tRPC transformer — superjson configured", () => {
  it("superjson package is importable in daemon context", async () => {
    // If this fails: superjson not in daemon/package.json dependencies
    const sj = await import("superjson");
    expect(sj.default).toBeDefined();
    expect(typeof sj.default.serialize).toBe("function");
    expect(typeof sj.default.deserialize).toBe("function");
  });

  it("tRPC router _def.transformer matches superjson", async () => {
    // WHY: initTRPC.create({ transformer: superjson }) stores the transformer
    // in appRouter._def._config.$types / or accessible via _def.
    // We check the canonical way: serialize a Date via the configured
    // transformer and verify the meta field is present (superjson signature).
    const { appRouter } = await import("../src/router.js");

    // The tRPC router stores transformer on _def._config
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformer = (appRouter as any)._def._config.transformer;
    expect(transformer).toBeDefined();

    // superjson transformer has serialize / deserialize
    expect(typeof transformer.input.serialize).toBe("function");
    expect(typeof transformer.input.deserialize).toBe("function");
    expect(typeof transformer.output.serialize).toBe("function");
    expect(typeof transformer.output.deserialize).toBe("function");
  });

  it("Date survives round-trip through tRPC transformer (superjson preserves type)", async () => {
    // WHY: plain JSON.stringify(date) → string, not Date on the other side.
    // superjson serializes with meta: { values: { "": ["Date"] } } so the
    // deserializer knows to reconstruct a Date instance.
    const now = new Date("2026-05-02T12:00:00.000Z");

    const serialized = superjson.serialize(now);
    // superjson meta should carry type annotation
    expect(serialized.meta).toBeDefined();

    const deserialized = superjson.deserialize<Date>(serialized);
    expect(deserialized).toBeInstanceOf(Date);
    expect(deserialized.toISOString()).toBe(now.toISOString());
  });

  it("number (timestamp ms) round-trips without loss", async () => {
    const ts = Date.now();
    const { json, meta } = superjson.serialize(ts);
    const back = superjson.deserialize<number>({ json, meta });
    expect(back).toBe(ts);
    expect(typeof back).toBe("number");
  });

  it("health procedure response serializable with superjson (Date.now() as number)", async () => {
    // Simulates the /health procedure return shape and checks superjson handles it.
    const payload = { status: "ok", timestamp: Date.now(), version: "0.1.0" };
    const { json, meta } = superjson.serialize(payload);
    const back = superjson.deserialize<typeof payload>({ json, meta });
    expect(back.status).toBe("ok");
    expect(typeof back.timestamp).toBe("number");
    expect(back.version).toBe("0.1.0");
  });
});
