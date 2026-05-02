/**
 * PhaserCanvas TDD tests — t1 RED
 * WHY: verify Phaser game instance lifecycle (mount/unmount/HMR dispose).
 * Phaser is mocked — real Phaser.Game cannot run in jsdom (WebGL/Canvas noop).
 * Test only verifies constructor call count + destroy call timing.
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
}));

vi.mock('phaser', () => ({
  default: {
    Game: MockGameConstructor,
    AUTO: 0,
  },
}));

// Import AFTER mock is set up
const { PhaserCanvas } = await import('../src/views/room/PhaserCanvas');

beforeEach(() => {
  MockGameConstructor.mockClear();
  mockDestroy.mockClear();
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
