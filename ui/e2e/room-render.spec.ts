/**
 * room-render.spec.ts — Phaser canvas render verification.
 *
 * WHY: The existing room-baseline.spec.ts uses toHaveScreenshot() which compares
 * against a stored baseline — a baseline captured when the canvas was EMPTY
 * (bug state). This spec uses observable-state assertions that do NOT depend on a
 * stored baseline, verifying that the Phaser scene actually ran its lifecycle.
 *
 * TDD: written RED (failing) before the fix is applied.
 *
 * Root causes being tested against:
 * 1. PhaserCanvas.tsx `scene: []` — RoomScene was never passed to Phaser.Game config,
 *    so preload/create never ran → blank canvas.
 * 2. HMR double-mount — React StrictMode + HMR dispose registration races cause
 *    Phaser to boot twice, leaving stale canvas state.
 *
 * Testability approach:
 * - PhaserCanvas.tsx exposes `window.__roomSceneReady = true` once RoomScene.create()
 *   fires (set via Phaser scene event). This is a testability seam (WHY: WebGL canvas
 *   pixel data is not cross-origin readable via getImageData; a window flag is the
 *   minimal viable seam for verifying scene lifecycle in e2e).
 * - Phaser boot count is measured by counting "Phaser v" strings in console output.
 *
 * SPEC §3.6.9.7 (res-001): Playwright e2e layer for Phaser visual verification.
 */
import { test, expect } from '@playwright/test';

test.describe('Room View — Phaser canvas renders content', () => {
  test('RoomScene.create() runs and sets window.__roomSceneReady flag', async ({
    page,
  }) => {
    // WHY: `window.__roomSceneReady` is set in RoomScene.create() as a testability
    // seam. Without the fix (scene: [] in PhaserCanvas), create() never fires and
    // this flag stays falsy → test RED.
    const consoleLogs: string[] = [];
    page.on('console', (msg) => consoleLogs.push(msg.text()));

    await page.goto('/');

    // Wait for Phaser canvas element to appear
    await page.waitForSelector('[data-testid="room-canvas"] canvas', {
      timeout: 10000,
    });

    // Wait up to 3s for the scene lifecycle to complete
    await page.waitForTimeout(3000);

    const sceneReady = await page.evaluate(() => {
      return (window as unknown as Record<string, unknown>)['__roomSceneReady'];
    });

    expect(sceneReady).toBe(true);
  });

  test('Phaser boots exactly once (no double-mount from HMR/StrictMode)', async ({
    page,
  }) => {
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="room-canvas"] canvas', {
      timeout: 10000,
    });
    await page.waitForTimeout(2000);

    // Count Phaser boot logs — should be exactly 1 after fix
    // WHY: HMR double-mount bug causes Phaser to boot twice in dev mode.
    // After the fix (proper HMR cleanup), game instance boots exactly once.
    const phaserLogs = consoleLogs.filter((msg) =>
      msg.includes('Phaser v'),
    );

    // Expect exactly 1 boot — 2+ means double-mount bug still present
    expect(phaserLogs.length).toBe(1);
  });
});
