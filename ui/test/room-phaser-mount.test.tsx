/**
 * PhaserCanvas TDD tests — t1 RED
 * WHY: verify Phaser game instance lifecycle (mount/unmount/HMR dispose).
 * Phaser is mocked — real Phaser.Game cannot run in jsdom (WebGL/Canvas noop).
 * Test only verifies constructor call count + destroy call timing.
 *
 * Updated for bug-1 fix: RoomScene and agentSpriteSync are now imported by
 * PhaserCanvas — they are mocked here to prevent jsdom incompatibility.
 * _resetModuleLevelGame() is called in beforeEach to isolate tests from the
 * module-level singleton that prevents StrictMode double-mount in production.
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import React from 'react';

// --- Phaser mock ---
// WHY: jsdom has no WebGL/Canvas, so Phaser.Game would fail at runtime.
// We mock the entire module and only track constructor + destroy calls.
const mockDestroy = vi.fn();
const MockGameConstructor = vi.fn(() => ({
  destroy: mockDestroy,
  // WHY: PhaserCanvas now calls game.events?.once() with optional chaining.
  // No events mock needed since optional chaining skips undefined safely.
}));

vi.mock('phaser', () => ({
  default: {
    Game: MockGameConstructor,
    AUTO: 0,
  },
}));

// WHY: PhaserCanvas now imports RoomScene. RoomScene extends Phaser.Scene
// (mocked above) but the constructor would still fail in jsdom. Mock it away.
vi.mock('../src/views/room/scenes/RoomScene', () => ({
  RoomScene: vi.fn().mockImplementation(() => ({})),
}));

// WHY: PhaserCanvas now imports syncAgentsToScene. It calls scene.add.graphics()
// which requires a real Phaser scene context. Mock it to a no-op.
vi.mock('../src/views/room/agentSpriteSync', () => ({
  syncAgentsToScene: vi.fn(),
}));

// Import AFTER mocks are set up
const { PhaserCanvas, _resetModuleLevelGame } = await import(
  '../src/views/room/PhaserCanvas'
);

beforeEach(() => {
  MockGameConstructor.mockClear();
  mockDestroy.mockClear();
  // WHY: reset module-level singleton so each test starts with a clean slate.
  // In production, the singleton prevents StrictMode double-mount. In tests,
  // each test case must create a fresh Phaser.Game to verify constructor counts.
  _resetModuleLevelGame();
});

afterEach(() => {
  cleanup();
});

describe('PhaserCanvas — mount lifecycle', () => {
  it('creates exactly one Phaser.Game instance on mount', async () => {
    await act(async () => {
      render(<PhaserCanvas />);
    });
    expect(MockGameConstructor).toHaveBeenCalledTimes(1);
  });

  it('calls game.destroy(true) on unmount', async () => {
    let unmount: () => void;
    await act(async () => {
      const result = render(<PhaserCanvas />);
      unmount = result.unmount;
    });
    expect(mockDestroy).not.toHaveBeenCalled();

    await act(async () => {
      unmount();
    });
    expect(mockDestroy).toHaveBeenCalledWith(true);
  });

  it('does not create additional Phaser.Game instances on re-render (stable ref)', async () => {
    const { rerender } = render(<PhaserCanvas />);
    expect(MockGameConstructor).toHaveBeenCalledTimes(1);

    await act(async () => {
      rerender(<PhaserCanvas />);
    });
    // WHY: useEffect with [] dep runs only once — Game constructor must not be called again
    expect(MockGameConstructor).toHaveBeenCalledTimes(1);
  });
});

describe('PhaserCanvas — HMR dispose', () => {
  it('registers dispose callback via _hmrRegisterDispose that calls game.destroy(true)', async () => {
    // WHY: HMR dispose must clean up Phaser instance to prevent memory leak on hot reload.
    // import.meta.hot is module-scoped and not patchable cross-module in Vitest.
    // We use the _hmrRegisterDispose seam prop to inject a mock registrar.
    const registeredCallbacks: Array<() => void> = [];
    const mockHmrRegister = (cb: () => void) => {
      registeredCallbacks.push(cb);
    };

    await act(async () => {
      render(<PhaserCanvas _hmrRegisterDispose={mockHmrRegister} />);
    });

    // The component should have registered exactly one dispose callback
    expect(registeredCallbacks).toHaveLength(1);

    // Simulate HMR fire: call the registered dispose callback
    registeredCallbacks[0]();
    expect(mockDestroy).toHaveBeenCalledWith(true);
  });
});
