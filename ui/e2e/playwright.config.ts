/**
 * playwright.config.ts — claude-loom UI e2e configuration.
 *
 * WHY separate from vitest:
 * SPEC §3.6.9.7 (res-001) requires an independent visual regression test layer.
 * Playwright e2e tests run in a real browser (headless Chromium) and can capture
 * full-page screenshots — a capability jsdom/vitest fundamentally cannot provide.
 *
 * Design decisions:
 * - headless Chromium only (Desktop Chrome device config) — CI and local parity
 * - webServer auto-starts `pnpm dev` on port 5173, reuses if already running
 * - screenshot baselines stored in ui/e2e/__screenshots__/ (git-tracked)
 * - maxDiffPixelRatio: 0.2 — tolerates anti-aliasing and sub-pixel rendering noise
 *   without hiding genuine layout regressions
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // e2e test files are co-located in ui/e2e/
  testDir: '.',

  // WHY: explicit outputDir so CI artifact upload path is unambiguous.
  // Playwright default resolves relative to config location (ui/e2e/) which would
  // place results at ui/e2e/../test-results = ui/test-results/. Being explicit
  // ensures the CI 'path: ui/e2e/test-results/' artifact step matches reality.
  outputDir: './test-results',

  // Run tests in parallel within a file (default), no cross-file parallelism in CI
  fullyParallel: false,

  // Do not retry on CI — flaky visual baseline = real problem
  retries: 0,

  // Single worker to avoid port conflict with webServer
  workers: 1,

  // Screenshot baselines stored in __screenshots__/ alongside specs
  snapshotDir: './__screenshots__',

  // WHY: strip browser+OS suffix from snapshot names so a single baseline file
  // works across macOS (local dev) and Linux (ubuntu-latest CI).
  // Without this, Playwright generates 'room-pop-chromium-darwin.png' locally
  // and 'room-pop-chromium-linux.png' on CI — two different files for the same test.
  snapshotPathTemplate: '{snapshotDir}/{testFilePath}-snapshots/{arg}{ext}',

  // Global screenshot diff threshold for toHaveScreenshot()
  // WHY: 0.2 = 20% pixel ratio — tolerates sub-pixel anti-aliasing noise
  // without hiding genuine layout regressions
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.2,
    },
  },

  use: {
    // Base URL for page.goto('/') calls
    baseURL: 'http://localhost:5173',

    // Headless — required for CI and consistent cross-platform captures
    headless: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Auto-start Vite dev server before running tests
  webServer: {
    command: 'pnpm dev',
    port: 5173,
    // Reuse an already-running dev server (useful in local development)
    reuseExistingServer: true,
    // Wait up to 30s for the server to be ready
    timeout: 30000,
  },
});
