/**
 * overall-audit.spec.ts — OV-* overall quality audit cases.
 *
 * WHY: Cross-cutting quality properties that cannot be verified with jsdom/vitest
 * because they require an actual browser environment:
 *   - console.error detection requires real browser console interception
 *   - button onClick wiring requires React event fiber inspection in a live DOM
 *   - browser back/forward requires real browser history API
 *
 * // covers: OV-CONSOLE-ERROR-01, OV-ALL-BUTTONS-01, OV-BACK-FORWARD-01
 *
 * Design decisions:
 *   - All routes are navigated with ?mock=idle to avoid daemon dependency
 *   - console.error listener is attached before each route navigation
 *   - OV-ALL-BUTTONS-01 checks React fiber event handlers via __reactFiber access
 *     as a proxy for "this button has an onClick handler" (DOM onclick attribute
 *     is not set by React synthetic events, so fiber inspection is the correct path)
 *   - OV-BACK-FORWARD-01 uses page.goBack/goForward with URL assertions
 */
import { test, expect } from '@playwright/test';

// All UI routes defined in routes.tsx
const ALL_ROUTES = [
  '/',
  '/plan',
  '/gantt',
  '/retro',
  '/worktree',
  '/consistency',
  '/customization',
  '/guidance',
  '/sessions',
  '/project-settings',
  '/tokens',
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Page = Parameters<typeof test>[1] extends infer T
  ? T extends { page: infer P }
    ? P
    : never
  : never;

/**
 * Navigate to a route with ?mock=idle and wait for topbar to render.
 * WHY: ?mock=idle prevents daemon connection attempts that produce console.error
 * messages unrelated to the UI code under test.
 */
async function gotoRoute(page: Page, path: string): Promise<void> {
  const url = path === '/' ? '/?mock=idle' : `${path}?mock=idle`;
  await page.goto(url);
  await page.waitForSelector('[data-testid="topbar"]', { timeout: 15_000 });
  // Allow React hydration / lazy suspense to settle
  await page.waitForTimeout(300);
}

// ---------------------------------------------------------------------------
// OV-CONSOLE-ERROR-01 — No console.error on any route
// ---------------------------------------------------------------------------

// covers: OV-CONSOLE-ERROR-01
test.describe('OV-CONSOLE-ERROR-01 — no console.error on all routes', () => {
  test('navigating all routes produces zero console.error calls', async ({ page }) => {
    // WHY: Attach listener before any navigation so errors during initial load
    // are captured. The listener is attached at the page level so it covers
    // all subsequent navigations within this test.
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    // Navigate every route and allow React rendering to settle
    for (const route of ALL_ROUTES) {
      await gotoRoute(page, route);
    }

    // Filter out known non-code errors (network errors from daemon absence, favicon)
    // WHY: In e2e test environment, the daemon is not running, so WebSocket connection
    // errors and tRPC network errors are expected infrastructure noise, not code bugs.
    // We filter these to avoid false positives while still catching React errors,
    // undefined component errors, and other application-level console.error calls.
    const appErrors = errors.filter((e) => {
      // Network / WebSocket errors from daemon absence (expected in test env)
      if (e.includes('WebSocket') || e.includes('ECONNREFUSED') || e.includes('ERR_CONNECTION_REFUSED')) return false;
      if (e.includes('Failed to fetch') || e.includes('fetch failed')) return false;
      if (e.includes('net::ERR_')) return false;
      // tRPC errors from daemon absence
      if (e.includes('TRPCClientError') || e.includes('Unable to connect')) return false;
      // Favicon 404 (non-code)
      if (e.includes('favicon')) return false;
      return true;
    });

    expect(appErrors, `console.error calls detected:\n${appErrors.join('\n')}`).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// OV-ALL-BUTTONS-01 — All buttons have wired onClick handlers
// ---------------------------------------------------------------------------

// covers: OV-ALL-BUTTONS-01
test.describe('OV-ALL-BUTTONS-01 — all buttons have onClick handlers', () => {
  // WHY: We test the Room route (index) and one panel route to cover both
  // the AppShell toolbar buttons (Drawer nav) and panel-specific buttons.
  // Testing all 11 routes would be slow and the toolbar buttons repeat; Room + Retro
  // gives good coverage of the main button surfaces.
  const BUTTON_CHECK_ROUTES = ['/', '/retro'] as const;

  for (const route of BUTTON_CHECK_ROUTES) {
    test(`all buttons on ${route || '/'} have React onClick handlers`, async ({ page }) => {
      await gotoRoute(page, route);

      // WHY: React does not set the native DOM 'onclick' attribute.
      // Instead, it attaches event listeners via a single root delegated listener.
      // To check if a specific button has an onClick prop, we must inspect the
      // React fiber tree via __reactFiber / __reactProps keys on the DOM node.
      // Buttons without onClick props will have no 'onClick' in their fiber props.
      const result = await page.evaluate((): { total: number; missing: string[] } => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const missing: string[] = [];

        for (const btn of buttons) {
          // Skip hidden buttons (display:none or visibility:hidden) — they may be
          // legitimately inert (e.g., conditionally rendered items not yet active)
          const style = window.getComputedStyle(btn);
          if (style.display === 'none' || style.visibility === 'hidden') continue;

          // Access React fiber props via internal key
          // WHY: React 18 attaches __reactFiber$XXXX and __reactProps$XXXX
          // keys to DOM nodes. We find the props key dynamically.
          const propsKey = Object.keys(btn).find(
            (k) => k.startsWith('__reactProps$'),
          );

          let hasOnClick = false;

          if (propsKey) {
            // @ts-expect-error — dynamic React internals key
            const props = btn[propsKey] as Record<string, unknown>;
            hasOnClick = typeof props['onClick'] === 'function';
          }

          // Alternative: if the button is inside a form or has type="submit",
          // it may legitimately lack an explicit onClick (form submission handles it)
          if (!hasOnClick && btn.type === 'submit') continue;

          // Alternative: if the button has a data-action attribute, it may use
          // event delegation rather than a direct onClick prop — treat as wired
          if (!hasOnClick && btn.dataset['action']) continue;

          if (!hasOnClick) {
            const label = btn.textContent?.trim().slice(0, 40) ?? '';
            const testId = btn.dataset['testid'] ?? '';
            const cls = btn.className.slice(0, 40);
            missing.push(
              `[${testId || cls || 'no-id'}] "${label}"`,
            );
          }
        }

        return { total: buttons.length, missing };
      });

      expect(
        result.missing,
        `Buttons without onClick on ${route}:\n${result.missing.join('\n')}`,
      ).toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// OV-BACK-FORWARD-01 — Browser back/forward navigates correctly
// ---------------------------------------------------------------------------

// covers: OV-BACK-FORWARD-01
test.describe('OV-BACK-FORWARD-01 — browser back/forward navigates correctly', () => {
  test('back/forward through route history lands on correct routes', async ({ page }) => {
    // Navigation sequence: / → /plan → /gantt → back → back → forward
    // Expected: back lands on /plan, back again on /, forward back on /plan

    // Step 1: Navigate to / (initial)
    await gotoRoute(page, '/');
    expect(page.url()).toContain('localhost');

    // Step 2: Navigate to /plan
    await page.goto('/plan?mock=idle');
    await page.waitForSelector('[data-testid="topbar"]', { timeout: 10_000 });
    await page.waitForTimeout(200);
    expect(page.url()).toContain('/plan');

    // Step 3: Navigate to /gantt
    await page.goto('/gantt?mock=idle');
    await page.waitForSelector('[data-testid="topbar"]', { timeout: 10_000 });
    await page.waitForTimeout(200);
    expect(page.url()).toContain('/gantt');

    // Step 4: Back → should land on /plan
    await page.goBack();
    await page.waitForSelector('[data-testid="topbar"]', { timeout: 10_000 });
    await page.waitForTimeout(200);
    expect(page.url()).toContain('/plan');

    // Step 5: Back again → should land on / (root room route)
    await page.goBack();
    await page.waitForSelector('[data-testid="topbar"]', { timeout: 10_000 });
    await page.waitForTimeout(200);
    // Root route: URL ends with / or contains /?mock=idle (no path segment after host)
    const urlAfterSecondBack = page.url();
    const parsedPath = new URL(urlAfterSecondBack).pathname;
    expect(parsedPath).toBe('/');

    // Step 6: Forward → should return to /plan
    await page.goForward();
    await page.waitForSelector('[data-testid="topbar"]', { timeout: 10_000 });
    await page.waitForTimeout(200);
    expect(page.url()).toContain('/plan');
  });
});
