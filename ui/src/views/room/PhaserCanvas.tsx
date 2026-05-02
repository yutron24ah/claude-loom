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
 */
import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
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

export function PhaserCanvas({
  agents = [],
  width = 1080,
  height = 660,
  _hmrRegisterDispose = DEFAULT_HMR_REGISTER,
}: PhaserCanvasProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // WHY: guard against double-mount in React 18 StrictMode
    if (gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current ?? undefined,
      width,
      height,
      backgroundColor: '#e8dcc8',
      // RoomScene added in Step 2 (t2)
      scene: [],
    };

    gameRef.current = new Phaser.Game(config);

    // Store initial agents reference for later use by scene
    (gameRef.current as unknown as { _agents?: Agent[] })._agents = agents;

    // HMR dispose: destroy the game instance when the module is hot-replaced.
    // WHY: without this, each hot reload creates a new canvas without cleaning up the old one.
    if (_hmrRegisterDispose) {
      _hmrRegisterDispose(() => {
        gameRef.current?.destroy(true);
      });
    }

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
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
