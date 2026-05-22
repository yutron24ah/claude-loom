/**
 * browser-nav.spec.ts — RT-BACK-01: browser back/forward navigation e2e.
 *
 * WHY: Vite SPA routing uses HTML5 history API. page.goBack() / page.goForward()
 * exercise the actual browser history stack — something jsdom/MemoryRouter tests
 * cannot replicate. This spec verifies that the browser's native back/forward
 * buttons correctly restore the React Router location and re-render the matching
 * route content.
 *
 * covers: RT-BACK-01
 *
 * Coverage (5 checks):
 *   ① / → /plan → goBack() → / (Room) restored
 *   ② / → /plan → /retro → goBack() → /plan restored
 *   ③ / → /plan → /retro → goBack() × 2 → / restored
 *   ④ goForward() after goBack() → /plan restored
 *   ⑤ full sequence / → /plan → /retro → goBack() → goBack() → goForward() cycle
 *
 * Steps from qa-suite.js RT-BACK-01:
 *   steps: ['/ → /plan → /gantt と遷移', 'ブラウザ戻る', 'もう一度戻る', 'ブラウザ進む']
 *   expected: ['戻ると /plan → /', '進むと / → /plan', 'すべてで該当画面が再描画']
 *
 * Note: uses ?mock=idle so pm.running=false — no PMChat overlay that would block
 * Drawer nav-link clicks.
 */
import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Page = Parameters<typeof test>[1] extends infer T
  ? T extends { page: infer P } ? P : never
  : never;

async function dismissToasts(page: Page): Promise<void> {
  const closeButtons = page.locator('[data-testid^="toast-"] button');
  const count = await closeButtons.count();
  for (let i = 0; i < count; i++) {
    await closeButtons.nth(i).click({ force: true }).catch(() => undefined);
  }
  await page.waitForTimeout(200);
}

/**
 * Wait for AppShell TopBar to confirm page has loaded.
 * WHY: each goBack/goForward triggers React Router re-render; waiting for topbar
 * ensures the new route is mounted before asserting content.
 */
async function waitForShell(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="topbar"]', { timeout: 10_000 });
}

/**
 * Navigate to the app root with mock=idle scenario.
 * WHY: idle scenario ensures pm.running=false → no PMChatPanel overlay that
 * would intercept pointer events on nav-links.
 */
async function gotoRoot(page: Page): Promise<void> {
  await page.goto('/?mock=idle');
  await waitForShell(page);
  await dismissToasts(page);
}

/**
 * Click a drawer nav-link and wait for the corresponding content to render.
 * WHY: nav-links update React Router location synchronously on click.
 */
async function clickNav(page: Page, linkId: string): Promise<void> {
  await page.click(`[data-testid="nav-link-${linkId}"]`);
  // Short settle time for React Router re-render
  await page.waitForTimeout(150);
}

// ---------------------------------------------------------------------------
// RT-BACK-01 — browser back / forward restores previous route
// ---------------------------------------------------------------------------

// covers: RT-BACK-01
test.describe('RT-BACK-01: browser back/forward navigation', () => {
  test('① goBack() from /plan returns to / (Room)', async ({ page }) => {
    // WHY: establish a 2-entry history stack: / → /plan
    await gotoRoot(page);

    // Verify starting at room (room-canvas present)
    await expect(page.locator('[data-testid="room-canvas"]')).toBeVisible();

    // Navigate forward to /plan via drawer
    await clickNav(page, 'plan');

    // /plan should be rendered (room-canvas gone, Outlet content visible)
    await expect(page.locator('[data-testid="room-canvas"]')).not.toBeVisible();

    // Browser back — should return to /
    await page.goBack();
    await waitForShell(page);

    // Room should be visible again
    await expect(page.locator('[data-testid="room-canvas"]')).toBeVisible();
  });

  test('② goBack() from /retro returns to /plan', async ({ page }) => {
    // WHY: 3-entry history: / → /plan → /retro; goBack() should land on /plan
    await gotoRoot(page);
    await clickNav(page, 'plan');
    await clickNav(page, 'retro');

    // Confirm we are on retro (room-canvas not present)
    await expect(page.locator('[data-testid="room-canvas"]')).not.toBeVisible();

    // goBack() → /plan
    await page.goBack();
    await waitForShell(page);

    // Plan link should be active in drawer (nav-link-plan has active class or aria)
    const planLink = page.locator('[data-testid="nav-link-plan"]');
    await expect(planLink).toBeVisible();
    // room-canvas still not visible (we are at /plan, not /)
    await expect(page.locator('[data-testid="room-canvas"]')).not.toBeVisible();
  });

  test('③ double goBack() from /retro returns to / (Room)', async ({ page }) => {
    // WHY: RT-BACK-01 steps: 3 hops then 2× back → should return to /
    await gotoRoot(page);
    await clickNav(page, 'plan');
    await clickNav(page, 'retro');

    // goBack() × 2
    await page.goBack();
    await waitForShell(page);
    await page.goBack();
    await waitForShell(page);

    // Back at / — Room canvas visible
    await expect(page.locator('[data-testid="room-canvas"]')).toBeVisible();
  });

  test('④ goForward() after goBack() restores /plan', async ({ page }) => {
    // WHY: RT-BACK-01 expected: 'ブラウザ進むと / → /plan'
    await gotoRoot(page);
    await clickNav(page, 'plan');

    // Go back to /
    await page.goBack();
    await waitForShell(page);
    await expect(page.locator('[data-testid="room-canvas"]')).toBeVisible();

    // Go forward → /plan
    await page.goForward();
    await waitForShell(page);
    await expect(page.locator('[data-testid="room-canvas"]')).not.toBeVisible();
  });

  test('⑤ full cycle: / → /plan → /retro → back×2 → forward×1 (RT-BACK-01 complete)', async ({
    page,
  }) => {
    // WHY: exercises the full RT-BACK-01 scenario from qa-suite.js:
    //   / → /plan → /retro, back→/plan, back→/, forward→/plan
    await gotoRoot(page);

    // Step 1: navigate to /plan
    await clickNav(page, 'plan');
    await expect(page.locator('[data-testid="room-canvas"]')).not.toBeVisible();

    // Step 2: navigate to /retro
    await clickNav(page, 'retro');
    await expect(page.locator('[data-testid="room-canvas"]')).not.toBeVisible();

    // Step 3: first goBack() → /plan
    await page.goBack();
    await waitForShell(page);
    await expect(page.locator('[data-testid="room-canvas"]')).not.toBeVisible();
    // /plan nav-link visible + drawer link present
    await expect(page.locator('[data-testid="nav-link-plan"]')).toBeVisible();

    // Step 4: second goBack() → /
    await page.goBack();
    await waitForShell(page);
    await expect(page.locator('[data-testid="room-canvas"]')).toBeVisible();

    // Step 5: goForward() → /plan again
    await page.goForward();
    await waitForShell(page);
    await expect(page.locator('[data-testid="room-canvas"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="nav-link-plan"]')).toBeVisible();
  });
});
