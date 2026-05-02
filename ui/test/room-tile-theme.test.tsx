/**
 * RoomScene tile + theme integration tests — t2 RED
 * WHY: verify that RoomScene reacts to data-theme changes and loads tile map JSON.
 * Phaser is mocked — real Phaser.Scene cannot run in jsdom.
 * Test only verifies:
 * - Background color method is called with token-derived value on scene create
 * - MutationObserver fires when data-theme attribute changes on <html>
 * - tile map JSON load is triggered in preload
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// --- Phaser Scene mock ---
// WHY: jsdom + Vitest cannot run real Phaser scenes (no WebGL). We mock the
// scene base class and capture method calls to verify behavior.

const mockSetBackgroundColor = vi.fn();
const mockAddImage = vi.fn();
const mockLoadJson = vi.fn();
const mockCamerasMain = { setBackgroundColor: mockSetBackgroundColor };

vi.mock('phaser', () => ({
  default: {
    Game: vi.fn(() => ({ destroy: vi.fn() })),
    AUTO: 0,
    Scene: class MockScene {
      cameras = { main: mockCamerasMain };
      add = { image: mockAddImage };
      load = { json: mockLoadJson };
      events = { on: vi.fn() };
      scene = { key: 'RoomScene' };
      // Provide sys stub so Scene can be instantiated
      sys: unknown = {};
    },
  },
}));

// Import AFTER mock
const { RoomScene } = await import('../src/views/room/scenes/RoomScene');

beforeEach(() => {
  mockSetBackgroundColor.mockClear();
  mockAddImage.mockClear();
  mockLoadJson.mockClear();
});

afterEach(() => {
  cleanup();
  // Restore data-theme
  document.documentElement.removeAttribute('data-theme');
});

describe('RoomScene — tile map JSON load', () => {
  it('calls load.json with room-base tile map in preload()', () => {
    const scene = new RoomScene();
    scene.preload();
    expect(mockLoadJson).toHaveBeenCalledTimes(1);
    const [key, url] = mockLoadJson.mock.calls[0];
    expect(key).toBe('room-base');
    expect(url).toMatch(/room-base\.json/);
  });
});

describe('RoomScene — background theme integration', () => {
  it('sets background color from CSS variable on create()', () => {
    // WHY: scene.create() should read --p-bg-floor from root element
    // and apply it as the Phaser background color.
    document.documentElement.style.setProperty('--p-bg-floor', '#e8dcc8');
    const scene = new RoomScene();
    scene.create();
    expect(mockSetBackgroundColor).toHaveBeenCalledTimes(1);
    // Background color value should be derived from --p-bg-floor
    const colorArg = mockSetBackgroundColor.mock.calls[0][0];
    expect(typeof colorArg).toBe('string');
    expect(colorArg.length).toBeGreaterThan(0);
  });

  it('registers MutationObserver on document.documentElement for data-theme change', () => {
    // WHY: when the user switches themes, the scene must update background color.
    // We verify a MutationObserver is registered on the root element.
    const observeSpy = vi.fn();
    const mockObserver = {
      observe: observeSpy,
      disconnect: vi.fn(),
      takeRecords: vi.fn(),
    };
    const MockMutationObserver = vi.fn(() => mockObserver);
    const OriginalMutationObserver = globalThis.MutationObserver;
    globalThis.MutationObserver = MockMutationObserver as unknown as typeof MutationObserver;

    const scene = new RoomScene();
    scene.create();

    expect(MockMutationObserver).toHaveBeenCalledTimes(1);
    expect(observeSpy).toHaveBeenCalledWith(
      document.documentElement,
      expect.objectContaining({ attributes: true }),
    );

    globalThis.MutationObserver = OriginalMutationObserver;
  });

  it('updates background color when data-theme attribute changes (dusk)', () => {
    // WHY: switching to "dusk" theme should trigger the MutationObserver callback
    // and update the scene background color.
    let mutationCallback: MutationCallback | null = null;
    const observeSpy = vi.fn();
    const mockObserver = {
      observe: observeSpy,
      disconnect: vi.fn(),
      takeRecords: vi.fn(),
    };
    const MockMutationObserver = vi.fn((cb: MutationCallback) => {
      mutationCallback = cb;
      return mockObserver;
    });
    const OriginalMutationObserver = globalThis.MutationObserver;
    globalThis.MutationObserver = MockMutationObserver as unknown as typeof MutationObserver;

    const scene = new RoomScene();
    scene.create();

    // Clear the initial call from create()
    mockSetBackgroundColor.mockClear();

    // Simulate data-theme change to "dusk"
    document.documentElement.setAttribute('data-theme', 'dusk');
    document.documentElement.style.setProperty('--p-bg-floor', '#2a1f3d');
    if (mutationCallback) {
      // Simulate mutation record
      mutationCallback(
        [{ type: 'attributes', attributeName: 'data-theme' }] as MutationRecord[],
        mockObserver as unknown as MutationObserver,
      );
    }

    expect(mockSetBackgroundColor).toHaveBeenCalledTimes(1);
    const colorArg = mockSetBackgroundColor.mock.calls[0][0];
    expect(typeof colorArg).toBe('string');

    globalThis.MutationObserver = OriginalMutationObserver;
  });
});
