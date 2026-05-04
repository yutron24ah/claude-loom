/**
 * room-baseline.spec.ts — Room View pop theme screenshot baseline.
 *
 * WHY: SPEC §3.6.9.7 (res-001) requires a Playwright e2e visual regression
 * baseline to catch screenshot-level regressions (e.g. Phaser canvas layout
 * breaks, theme token drift) that vitest/jsdom cannot detect.
 *
 * Scope (M3.1): pop theme baseline only. dusk/night are M3.2+.
 *
 * First run generates the baseline image (--update-snapshots).
 * Subsequent runs compare against the stored baseline.
 */
import { test, expect } from '@playwright/test';

test.describe('Room View — pop theme baseline', () => {
  test('matches pop theme screenshot baseline', async ({ page }) => {
    // Navigate to root route which renders AppShell + RoomView
    await page.goto('/');

    // Verify data-theme="pop" is active (default theme, no override)
    // WHY: tokens.css :root defaults = pop theme; no data-theme attr means pop
    const htmlTheme = await page.locator('html').getAttribute('data-theme');
    // pop theme is the default (no attribute needed), but if set explicitly, verify it
    const isPop = htmlTheme === null || htmlTheme === 'pop';
    expect(isPop).toBe(true);

    // Wait for room-canvas testid to be present (RoomView mounted)
    await page.waitForSelector('[data-testid="room-canvas"]');

    // Visual regression: viewport screenshot against stored baseline.
    // maxDiffPixelRatio is set globally in playwright.config.ts (0.2) — no per-test override needed.
    await expect(page).toHaveScreenshot('room-pop.png', {
      fullPage: false,
    });
  });
});
