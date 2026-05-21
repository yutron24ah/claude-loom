/**
 * room-baseline.spec.ts — Room View screenshot baselines for 3 theme palettes.
 *
 * WHY: SPEC §3.6.9.7 (res-001) + §3.6.9.1 改訂 (DOM/SVG α-2、3 theme palette)
 * requires Playwright e2e visual regression baselines for each theme so that
 * theme token drift, RPG primitive layout regressions, or CSS-variable wiring
 * breakage are caught at the screenshot level (jsdom/vitest cannot detect).
 *
 * Scope (M0.11.4 t18): 3 theme baselines — pop (default) / dusk / night.
 * Theme is switched by setting [data-theme="..."] on <html>, propagating new
 * --p-* / --pal-* CSS variables to all RPG primitives (rpg-frame / rpg-title
 * / chip / dot / exp-bar / btn-px) defined in tokens.css.
 */
import { test, expect } from '@playwright/test';

const THEMES = [
  { id: 'pop', label: 'pop (default)' },
  { id: 'dusk', label: 'dusk' },
  { id: 'night', label: 'night' },
] as const;

// covers: RT-INDEX-01, TB-LAYOUT-01
test.describe('Room View — 3 theme screenshot baselines', () => {
  for (const theme of THEMES) {
    test(`matches ${theme.label} theme baseline`, async ({ page }) => {
      await page.goto('/');

      // Apply theme via data-theme attribute on <html> root.
      // pop is the default (no attribute), but we still set it explicitly for symmetry.
      await page.evaluate((id) => {
        if (id === 'pop') {
          document.documentElement.removeAttribute('data-theme');
        } else {
          document.documentElement.setAttribute('data-theme', id);
        }
      }, theme.id);

      // Wait for RoomView to mount.
      await page.waitForSelector('[data-testid="room-canvas"]');

      // Visual regression: viewport screenshot vs stored baseline.
      // maxDiffPixelRatio is set globally in playwright.config.ts (0.2).
      await expect(page).toHaveScreenshot(`room-${theme.id}.png`, {
        fullPage: false,
      });
    });
  }
});
