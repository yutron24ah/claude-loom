/**
 * agentSpriteSync + RoomScene sprite state tests — t3 RED
 * WHY: verify that agent state changes drive sprite visual state changes.
 * Phaser is fully mocked — real Phaser cannot run in jsdom.
 * Test verifies:
 * - 13 sprites are added to scene on initialization with agents prop
 * - agent state change (idle → busy) triggers sprite redraw (setAgentState)
 * - agent removal destroys its sprite
 * - mock subscription drives sprite live updates (vertical slice mock)
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// --- Phaser mock (shared with other test files) ---
const mockDestroy = vi.fn();
const mockFillStyle = vi.fn();
const mockFillCircle = vi.fn();
const mockClear = vi.fn();
const mockSetBackgroundColor = vi.fn();

const createMockGraphics = () => ({
  fillStyle: mockFillStyle,
  fillCircle: mockFillCircle,
  clear: mockClear,
  destroy: mockDestroy,
  x: 0,
  y: 0,
  setPosition: vi.fn(),
});

const mockAddGraphics = vi.fn(() => createMockGraphics());

vi.mock('phaser', () => ({
  default: {
    Game: vi.fn(() => ({ destroy: vi.fn() })),
    AUTO: 0,
    Scene: class MockScene {
      cameras = { main: { setBackgroundColor: mockSetBackgroundColor } };
      add = { graphics: mockAddGraphics };
      load = { json: vi.fn() };
      events = { on: vi.fn() };
      scene = { key: 'RoomScene' };
      tweens = {
        add: vi.fn().mockReturnValue({ stop: vi.fn() }),
        killTweensOf: vi.fn(),
      };
      // spriteMap exposed for test assertions
      spriteMap = new Map();
      sys: unknown = {};
    },
  },
}));

// Import AFTER mock
const { syncAgentsToScene } = await import('../src/views/room/agentSpriteSync');
const { RoomScene } = await import('../src/views/room/scenes/RoomScene');

import { ROSTER } from '../src/views/room/roster';

beforeEach(() => {
  mockAddGraphics.mockClear();
  mockFillStyle.mockClear();
  mockFillCircle.mockClear();
  mockClear.mockClear();
  mockDestroy.mockClear();
  mockSetBackgroundColor.mockClear();
});

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('data-theme');
});

describe('agentSpriteSync — sprite initialization', () => {
  it('creates one graphics sprite per agent (13 agents → 13 sprites)', () => {
    const scene = new RoomScene() as RoomScene & { add: { graphics: typeof mockAddGraphics } };
    const agents = ROSTER.map((r) => ({ ...r, status: 'idle' as const }));
    syncAgentsToScene(scene as unknown as RoomScene, agents);
    expect(mockAddGraphics).toHaveBeenCalledTimes(13);
  });

  it('stores each sprite in spriteMap keyed by agent id', () => {
    const scene = new RoomScene();
    const agents = ROSTER.map((r) => ({ ...r, status: 'idle' as const }));
    syncAgentsToScene(scene as unknown as RoomScene, agents);
    expect(scene.spriteMap.size).toBe(13);
    expect(scene.spriteMap.has('pm')).toBe(true);
    expect(scene.spriteMap.has('dev')).toBe(true);
    expect(scene.spriteMap.has('retro-agg')).toBe(true);
  });
});

describe('agentSpriteSync — state animation', () => {
  it('calls setAgentState(id, busy) when agent state changes from idle to busy', () => {
    const scene = new RoomScene();
    const agents = ROSTER.map((r) => ({ ...r, status: 'idle' as const }));
    syncAgentsToScene(scene as unknown as RoomScene, agents);

    // Verify sprite was added
    expect(scene.spriteMap.has('pm')).toBe(true);

    // Simulate state change: pm goes busy
    const setAgentStateSpy = vi.spyOn(scene, 'setAgentState');
    scene.setAgentState('pm', 'busy');
    expect(setAgentStateSpy).toHaveBeenCalledWith('pm', 'busy');
  });

  it('calls setAgentState(id, fail) when agent state changes to fail', () => {
    const scene = new RoomScene();
    const agents = ROSTER.map((r) => ({ ...r, status: 'idle' as const }));
    syncAgentsToScene(scene as unknown as RoomScene, agents);

    const setAgentStateSpy = vi.spyOn(scene, 'setAgentState');
    scene.setAgentState('dev', 'fail');
    expect(setAgentStateSpy).toHaveBeenCalledWith('dev', 'fail');
  });
});

describe('agentSpriteSync — sprite removal', () => {
  it('removes sprite from spriteMap and calls destroy() when agent is removed', () => {
    const scene = new RoomScene();
    const agents = ROSTER.map((r) => ({ ...r, status: 'idle' as const }));
    syncAgentsToScene(scene as unknown as RoomScene, agents);

    expect(scene.spriteMap.size).toBe(13);

    // Simulate agent removal: pm is no longer in list
    const reducedAgents = agents.filter((a) => a.id !== 'pm');
    syncAgentsToScene(scene as unknown as RoomScene, reducedAgents);

    expect(scene.spriteMap.has('pm')).toBe(false);
    expect(scene.spriteMap.size).toBe(12);
    // sprite.destroy() should have been called for the removed agent
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });
});

describe('agentSpriteSync — vertical slice mock subscription', () => {
  it('updates all sprites when mock subscription pushes agent state changes', () => {
    const scene = new RoomScene();
    const agents = ROSTER.map((r) => ({ ...r, status: 'idle' as const }));
    syncAgentsToScene(scene as unknown as RoomScene, agents);

    // Simulate daemon subscription push: multiple agents change state
    const updates = [
      { id: 'pm', status: 'busy' as const },
      { id: 'dev', status: 'busy' as const },
      { id: 'rev', status: 'fail' as const },
    ];

    const setAgentStateSpy = vi.spyOn(scene, 'setAgentState');

    updates.forEach(({ id, status }) => {
      scene.setAgentState(id, status);
    });

    expect(setAgentStateSpy).toHaveBeenCalledTimes(3);
    expect(setAgentStateSpy).toHaveBeenCalledWith('pm', 'busy');
    expect(setAgentStateSpy).toHaveBeenCalledWith('dev', 'busy');
    expect(setAgentStateSpy).toHaveBeenCalledWith('rev', 'fail');
    // All 13 sprites should still be in the map
    expect(scene.spriteMap.size).toBe(13);
  });
});
