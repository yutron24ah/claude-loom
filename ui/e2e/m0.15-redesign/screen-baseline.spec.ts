/**
 * screen-baseline.spec.ts — M0.15 Phase 6 visual regression baselines.
 *
 * WHY: SPEC §3.6.14.5 (Layer 2.5 dogfood smoke matrix) requires Playwright e2e
 * visual baselines for all 12 redesign SPA routes + PMChat overlay.
 * These baselines ensure layout regressions, theme-token drift, and
 * redesign port breakage are caught at the screenshot level — jsdom/vitest
 * fundamentally cannot capture full-page visual state.
 *
 * Coverage (13 screenshots total):
 *   ① Room        — /                ?mock=active  (agents animated)
 *   ② Plan        — /plan            ?mock=active
 *   ③ Gantt       — /gantt           ?mock=active
 *   ④ Consistency — /consistency     ?mock=active
 *   ⑤ Retro       — /retro           ?mock=active
 *   ⑥ Worktree    — /worktree        ?mock=active
 *   ⑦ Customiz.   — /customization   ?mock=active
 *   ⑧ Guidance    — /guidance        ?mock=active
 *   ⑨ AgentDetail — /agents/dev      ?mock=active
 *   ⑩ Sessions    — /sessions        ?mock=active
 *   ⑪ Tokens      — /tokens          ?mock=active
 *   ⑫ Settings    — /project-settings?mock=active
 *   ⑬ PMChat      — /               ?mock=active  (overlay visible, pm.running=true)
 *
 * TDD RED → GREEN flow:
 *   RED : First run fails because no snapshot files exist yet.
 *   GREEN: `--update-snapshots` generates baselines; subsequent runs diff to 0.
 *
 * maxDiffPixelRatio: 0.2 is set globally in playwright.config.ts.
 * snapshotPathTemplate ensures single baseline file works across macOS + Linux.
 */
import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Navigate to a route with ?mock=active and wait for the app shell to mount.
 * WHY: waiting for room-canvas ensures AppShell + RoomView are fully hydrated
 * before navigating to child panel routes, avoiding empty screenshots.
 */
async function gotoWithMock(page: Parameters<typeof test>[1] extends infer T ? T extends { page: infer P } ? P : never : never, route: string): Promise<void> {
  const sep = route.includes('?') ? '&' : '?';
  await page.goto(`${route}${sep}mock=active`);
  // Wait for AppShell top bar — confirms React tree is mounted
  await page.waitForSelector('[data-testid="topbar"]', { timeout: 15_000 });
}

// ---------------------------------------------------------------------------
// Screen list
// ---------------------------------------------------------------------------

const SCREENS = [
  // ① Room — index route, no panel overlay
  { id: 'room',             route: '/',                  waitSelector: '[data-testid="room-canvas"]' },
  // ② Plan
  { id: 'plan',             route: '/plan',              waitSelector: '[data-testid="plan-long-term"]' },
  // ③ Gantt
  { id: 'gantt',            route: '/gantt',             waitSelector: '[data-testid="view-panel"]' },
  // ④ Consistency
  { id: 'consistency',      route: '/consistency',       waitSelector: '[data-testid="view-panel"]' },
  // ⑤ Retro
  { id: 'retro',            route: '/retro',             waitSelector: '[data-testid="view-panel"]' },
  // ⑥ Worktree
  { id: 'worktree',         route: '/worktree',          waitSelector: '[data-testid="worktree-view"]' },
  // ⑦ Customization
  { id: 'customization',    route: '/customization',     waitSelector: '[data-testid="customization-view"]' },
  // ⑧ Guidance / LearnedGuidance
  { id: 'guidance',         route: '/guidance',          waitSelector: '[data-testid="guidance-view"]' },
  // ⑩ Sessions
  { id: 'sessions',         route: '/sessions',          waitSelector: '[data-testid="session-list"]' },
  // ⑪ Tokens — route points to TokenMeterView (token-meter-view testid)
  // WHY: routes.tsx imports TokenMeterView (M5 t4 original), not redesign TokensView.
  // The testid for the routed component is "token-meter-view", not "tokens-view".
  { id: 'tokens',           route: '/tokens',            waitSelector: '[data-testid="token-meter-view"]' },
  // ⑫ Project Settings
  { id: 'project-settings', route: '/project-settings',  waitSelector: '[data-testid="project-settings-view"]' },
] as const;

// ---------------------------------------------------------------------------
// Tests — one screenshot per screen
// ---------------------------------------------------------------------------

test.describe('M0.15 — 12-screen visual regression baselines (?mock=active)', () => {
  for (const screen of SCREENS) {
    test(`screenshot baseline: ${screen.id}`, async ({ page }) => {
      const sep = screen.route.includes('?') ? '&' : '?';
      await page.goto(`${screen.route}${sep}mock=active`);

      // Wait for app shell
      await page.waitForSelector('[data-testid="topbar"]', { timeout: 15_000 });

      // Wait for the primary view element (confirms content is rendered)
      await page.waitForSelector(screen.waitSelector, { timeout: 10_000 });

      // Allow any CSS animations / transitions to settle
      await page.waitForTimeout(300);

      // WHY maxDiffPixelRatio: CI Linux runner と local macOS で font sub-pixel
      // rendering 差が発生、2% (0.02) 許容で visual regression の意義は保ちつつ
      // OS 差 noise を吸収。Phase 2 で snapshotPathTemplate による OS 別 baseline
      // refactor 候補 (retro 2026-05-12-001 F-res-002)。
      await expect(page).toHaveScreenshot(`${screen.id}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});

// ---------------------------------------------------------------------------
// ⑨ Agent Detail — triggered from Room by clicking the first DeskStation
// ---------------------------------------------------------------------------
//
// WHY not /agents/:id direct navigation:
// AgentDetailPanel requires an `agent: RosterEntry` prop. When rendered as a
// route (routes.tsx `<AgentDetailPanel />`), no prop is passed and the
// component throws at `agent.id`. The AgentDetailPanel is correctly opened via
// RoomView's DeskStation click → useViewStore.setSelectedAgentId. This test
// replicates that user path.

test.describe('M0.15 — ⑨ AgentDetail overlay baseline', () => {
  test('screenshot baseline: agent-detail', async ({ page }) => {
    // WHY ?mock=idle (not active): active scenario shows PMChatPanel with an
    // approval modal at z-5 which intercepts pointer events on the Room canvas,
    // blocking DeskStation clicks even with force:true (browser-level routing).
    // idle scenario has pm.running=false → no PMChat → DeskStation fully clickable.
    await page.goto('/?mock=idle');

    await page.waitForSelector('[data-testid="room-canvas"]', { timeout: 15_000 });

    // Click the first DeskStation desk-top to open AgentDetailPanel.
    // WHY: DeskStation onClick calls useViewStore.setSelectedAgentId → RoomView
    // renders <AgentDetailPanel> conditionally when selectedEntry is non-null.
    const firstDesk = page.locator('[data-testid="desk-top"]').first();
    await expect(firstDesk).toBeVisible({ timeout: 10_000 });
    await firstDesk.click();

    // Wait for the AgentDetailPanel to appear
    await page.waitForSelector('[data-testid="agent-detail-panel"]', { timeout: 10_000 });

    // Allow animations to settle
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('agent-detail.png', {
      // @ts-ignore — maxDiffPixelRatio is supported but typing may lag
      maxDiffPixelRatio: 0.02,
      fullPage: true,
    });
  });
});

// ---------------------------------------------------------------------------
// ⑬ PMChat overlay — Room route with pm.running=true (mock=active)
// ---------------------------------------------------------------------------

test.describe('M0.15 — PMChat overlay baseline (?mock=active)', () => {
  test('screenshot baseline: pm-chat-overlay', async ({ page }) => {
    // WHY: ?mock=active sets pm.running = true, making PMChatPanel visible
    // on the right column without navigating away from the Room route.
    await page.goto('/?mock=active');

    await page.waitForSelector('[data-testid="room-canvas"]', { timeout: 15_000 });

    // PMChatPanel should be visible because pm.running = true in active scenario
    await page.waitForSelector('[data-testid="pm-chat-right-column"]', { timeout: 10_000 });

    // Allow layout to settle
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('pm-chat-overlay.png', {
      // @ts-ignore — maxDiffPixelRatio is supported but typing may lag
      maxDiffPixelRatio: 0.02,
      fullPage: true,
    });
  });
});
