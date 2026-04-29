/**
 * Task 15: lifecycle/idle-shutdown.ts tests
 * TDD: RED phase — write failing tests first
 * Tests idle shutdown with fake timers
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startIdleShutdown } from "../src/lifecycle/idle-shutdown.js";
import { broadcaster } from "../src/events/broadcaster.js";

describe("lifecycle/idle-shutdown.ts (Task 15)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("exports startIdleShutdown function", () => {
    expect(typeof startIdleShutdown).toBe("function");
  });

  it("returns a stop() function", () => {
    const onShutdown = vi.fn();
    const handle = startIdleShutdown({ idleMs: 1000, onShutdown });
    expect(typeof handle.stop).toBe("function");
    handle.stop();
  });

  it("does NOT call onShutdown before idle time elapses", () => {
    const onShutdown = vi.fn();
    const idleMs = 30 * 60 * 1000;
    const handle = startIdleShutdown({ idleMs, onShutdown });

    // Advance 29 minutes — should NOT trigger
    vi.advanceTimersByTime(29 * 60 * 1000);
    expect(onShutdown).not.toHaveBeenCalled();

    handle.stop();
  });

  it("calls onShutdown after idle time elapses", async () => {
    const onShutdown = vi.fn().mockResolvedValue(undefined);
    const idleMs = 5 * 60 * 1000; // 5 min for test speed

    startIdleShutdown({ idleMs, onShutdown });

    // Advance past idle threshold (check runs every 60s)
    vi.advanceTimersByTime(idleMs + 61 * 1000);
    // Allow promise microtasks to resolve
    await vi.runAllTimersAsync();

    expect(onShutdown).toHaveBeenCalledOnce();
  });

  it("resets idle timer when broadcaster emits an event", async () => {
    const onShutdown = vi.fn().mockResolvedValue(undefined);
    const idleMs = 5 * 60 * 1000; // 5 min

    startIdleShutdown({ idleMs, onShutdown });

    // Advance 4 minutes (still idle — no shutdown)
    vi.advanceTimersByTime(4 * 60 * 1000);
    expect(onShutdown).not.toHaveBeenCalled();

    // Simulate a broadcaster event — resets last activity
    broadcaster.emit("*", { type: "event.raw", timestamp: Date.now(), payload: {} });

    // Advance another 4 minutes (total 8 min, but last activity was 4 min ago)
    vi.advanceTimersByTime(4 * 60 * 1000);
    // Should NOT have called shutdown (only 4 min since last event)
    expect(onShutdown).not.toHaveBeenCalled();
  });

  it("stop() prevents onShutdown from being called", async () => {
    const onShutdown = vi.fn().mockResolvedValue(undefined);
    const idleMs = 5 * 60 * 1000;

    const handle = startIdleShutdown({ idleMs, onShutdown });

    // Stop before timeout
    handle.stop();

    // Advance well past timeout
    vi.advanceTimersByTime(idleMs * 2 + 61 * 1000);
    await vi.runAllTimersAsync();

    expect(onShutdown).not.toHaveBeenCalled();
  });

  it("uses default idle of 30 minutes if idleMs not provided", async () => {
    const onShutdown = vi.fn().mockResolvedValue(undefined);

    startIdleShutdown({ onShutdown });

    // Advance 29 min — should not trigger
    vi.advanceTimersByTime(29 * 60 * 1000);
    expect(onShutdown).not.toHaveBeenCalled();

    // Advance 2 more min (total 31 min + 1 check interval)
    vi.advanceTimersByTime(2 * 60 * 1000);
    await vi.runAllTimersAsync();

    expect(onShutdown).toHaveBeenCalledOnce();
  });
});
