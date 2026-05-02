/**
 * Vitest setup file — imports jest-dom matchers for DOM assertions.
 *
 * WHY global Phaser mock:
 * RoomView now imports PhaserCanvas which imports Phaser. In jsdom environment,
 * Phaser tries to call HTMLCanvasElement.prototype.getContext which is not
 * implemented. All tests that render AppShell or RoomView transitively import
 * Phaser, so we mock it globally here.
 *
 * Tests that need fine-grained Phaser mock behavior (room-phaser-mount,
 * room-tile-theme, room-sprite-state) provide their own vi.mock('phaser')
 * before the dynamic import, which overrides this setup-level mock.
 */
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Game: vi.fn(() => ({ destroy: vi.fn() })),
    AUTO: 0,
    Scene: class MockScene {
      cameras = { main: { setBackgroundColor: vi.fn() } };
      add = { graphics: vi.fn(() => ({
        fillStyle: vi.fn(),
        fillCircle: vi.fn(),
        clear: vi.fn(),
        destroy: vi.fn(),
        setPosition: vi.fn(),
      })) };
      load = { json: vi.fn() };
      events = { on: vi.fn() };
      tweens = { add: vi.fn(() => ({ stop: vi.fn() })), killTweensOf: vi.fn() };
      spriteMap = new Map();
      sys: unknown = {};
    },
  },
}));
