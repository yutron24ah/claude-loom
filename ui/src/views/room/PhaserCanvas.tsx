/**
 * PhaserCanvas — mounts a Phaser 3 game instance inside a React component.
 *
 * WHY: SPEC §3.6.9.1 mandates self-owned useEffect + useRef mount (no library).
 * This avoids react-phaser-fiber or phaser-react dependencies, keeping the
 * Phaser lifecycle fully under our control.
 *
 * HMR: Vite hot module replacement fires import.meta.hot.dispose before
 * re-executing the module. We register a cleanup callback so the old
 * Phaser.Game instance is destroyed before the new one is created.
 * Without this, hot reload accumulates multiple Game instances (memory leak).
 *
 * React 18 StrictMode: in dev mode, StrictMode intentionally unmounts + remounts
 * components to detect side effects. Our guard uses a module-level singleton ref
 * (not just a component ref) so the second StrictMode effect invocation sees the
 * existing game and skips creation. This prevents the double Phaser boot log.
 * WHY module-level (not component-level): useRef is per-component-instance, but
 * StrictMode creates the SAME instance twice (mount → cleanup → mount). A module-level
 * ref persists across both cycles; after the first cleanup we set it to null only on
 * actual unmount (not StrictMode synthetic cleanup) by checking containerRef.
 */
import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { RoomScene } from './scenes/RoomScene';
import { syncAgentsToScene } from './agentSpriteSync';
import type { RosterEntry } from './roster';

export interface Agent extends RosterEntry {
  status?: 'idle' | 'busy' | 'fail';
}

export interface PhaserCanvasProps {
  /** Agent list passed to the Phaser scene for sprite initialization */
  agents?: Agent[];
  width?: number;
  height?: number;
  /**
   * HMR dispose registrar — injected in tests to verify HMR cleanup.
   * WHY: import.meta.hot is module-scoped and cannot be patched across module
   * boundaries in Vitest. This seam allows tests to verify the dispose path
   * without contaminating production code with test concerns.
   * Production default: import.meta.hot?.dispose (bound at component load).
   */
  _hmrRegisterDispose?: ((cb: () => void) => void) | null;
}

// WHY: bind import.meta.hot?.dispose at module load time so it can be captured
// in the default prop. Using optional chaining here avoids a reference error
// when import.meta.hot is undefined (production build / vitest environment).
const DEFAULT_HMR_REGISTER =
  typeof import.meta.hot?.dispose === 'function'
    ? (cb: () => void) => import.meta.hot!.dispose(cb)
    : null;

// WHY: module-level singleton to prevent React StrictMode double-mount from
// creating two Phaser.Game instances. StrictMode in dev fires:
//   effect (mount) → cleanup → effect (mount) on the same component instance.
// A component-level useRef is reset to null during the StrictMode cleanup, so
// the second effect run sees null and creates another game. A module-level ref
// survives the cleanup cycle and lets the second run detect the live game.
let _moduleLevelGame: Phaser.Game | null = null;

/** Reset module singleton — exposed so tests can isolate between test cases. */
export function _resetModuleLevelGame(): void {
  _moduleLevelGame = null;
}

export function PhaserCanvas({
  agents = [],
  width = 1080,
  height = 660,
  _hmrRegisterDispose = DEFAULT_HMR_REGISTER,
}: PhaserCanvasProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // WHY: guard against double-mount from React StrictMode.
    // If the module-level singleton already holds a live game, skip creation.
    if (_moduleLevelGame) {
      gameRef.current = _moduleLevelGame;
      return;
    }

    const scene = new RoomScene();

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current ?? undefined,
      width,
      height,
      backgroundColor: '#e8dcc8',
      // WHY: RoomScene must be in the scene list so preload/create lifecycle fires.
      // Previously `scene: []` caused blank canvas — RoomScene was never started.
      scene: [scene],
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;
    _moduleLevelGame = game;

    // Sync initial agent sprites once the scene is ready.
    // WHY: Phaser scene 'create' is async; we listen for the Phaser 'ready'
    // game event before calling syncAgentsToScene to avoid calling scene.add
    // before the scene's create() has run.
    // 'ready' is the string value of Phaser.Core.Events.READY.
    // Optional chaining guards against unit test mocks where game.events is absent.
    game.events?.once('ready', () => {
      const roomScene = game.scene?.getScene?.('RoomScene') as RoomScene | null;
      if (roomScene && agents.length > 0) {
        syncAgentsToScene(roomScene, agents);
      }
    });

    // HMR dispose: destroy the game instance when the module is hot-replaced.
    // WHY: without this, each hot reload creates a new canvas without cleaning up the old one.
    if (_hmrRegisterDispose) {
      _hmrRegisterDispose(() => {
        gameRef.current?.destroy(true);
        gameRef.current = null;
        _moduleLevelGame = null;
      });
    }

    return () => {
      // WHY: only destroy if this component still owns the game (not StrictMode
      // synthetic cleanup where the same game will be reused in the next mount cycle).
      // We check if the container is still in the document to distinguish real unmount
      // from StrictMode cleanup.
      const isRealUnmount = !containerRef.current?.isConnected;
      if (isRealUnmount) {
        gameRef.current?.destroy(true);
        gameRef.current = null;
        _moduleLevelGame = null;
      }
    };
    // WHY: empty dep array — game is created once on mount, destroyed on unmount.
    // agents changes are pushed via scene events, not by re-mounting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width, height, position: 'relative', imageRendering: 'pixelated' }}
    />
  );
}
