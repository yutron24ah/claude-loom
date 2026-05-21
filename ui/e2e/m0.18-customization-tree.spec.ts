/**
 * m0.18-customization-tree.spec.ts — CT-* visual + interaction baselines.
 *
 * WHY: m0.18-t1 replaced the flat AgentRow+ChainDetailPanel layout (374 lines)
 * with a 2-pane tree (left 260px TreeNav + right 1fr LeafEditor). These baselines
 * capture the new tree structure so layout regressions, pane-width drift, or
 * testid removal are caught at the visual level — jsdom/vitest cannot capture
 * full-page rendered state.
 *
 * covers: CT-TREE-01, CT-TREE-02, CT-TREE-03, CT-TREE-04, CT-TREE-05,
 *         CT-EDIT-AGENT-01, CT-EDIT-SKILL-01, CT-EDIT-WRITE-01
 *
 * Coverage (5 screenshots + 4 interaction checks):
 *   ① tree-initial     — default state (loom-developer selected, agents expanded)
 *   ② leaf-editor-agent — agent leaf selected → model selector visible
 *   ③ leaf-editor-skill — skill leaf selected → model selector absent
 *   ④ write-badge       — aggregator leaf WRITE badge visible
 *   ⑤ collapse-agents   — clicking Agents root collapses subtree
 *   Interaction:
 *   ⑥ tree-root-agents present with count badge (3)
 *   ⑦ tree-root-skills present with count badge (2)
 *   ⑧ loom-retro aggregator leaf has badge-write data-testid
 *
 * CT-* REQ coverage: REQ-117..REQ-123 (Vitest unit tests own assertion
 * logic; these e2e specs own browser rendering + real interaction path verification).
 */
import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function dismissToasts(page: Parameters<typeof test>[1] extends infer T
  ? T extends { page: infer P } ? P : never
  : never): Promise<void> {
  const closeButtons = page.locator('[data-testid^="toast-"] button');
  const count = await closeButtons.count();
  for (let i = 0; i < count; i++) {
    await closeButtons.nth(i).click({ force: true }).catch(() => undefined);
  }
  await page.waitForTimeout(200);
}

async function gotoCustomization(page: Parameters<typeof test>[1] extends infer T
  ? T extends { page: infer P } ? P : never
  : never): Promise<void> {
  // WHY: ?mock=idle (not active) — active scenario sets pm.running=true which shows
  // PMChatPanel (pma-overlay) that intercepts pointer events globally, blocking tree
  // leaf clicks. idle scenario has pm.running=false → no PMChat overlay.
  // CustomizationView renders from static ROSTER+SKILLS data regardless of mock scenario.
  await page.goto('/customization?mock=idle');
  await page.waitForSelector('[data-testid="topbar"]', { timeout: 15_000 });
  await page.waitForSelector('[data-testid="customization-view"]', { timeout: 10_000 });
  await page.waitForTimeout(300);
  await dismissToasts(page);
}

// ---------------------------------------------------------------------------
// ① tree-initial — default state visual baseline
// ---------------------------------------------------------------------------

// covers: CT-TREE-01, CT-TREE-02, CT-EDIT-PM-01, CT-EDIT-CUSTOM-01, CT-EDIT-LG-01
test.describe('m0.18 Customization Tree — ① initial state visual', () => {
  test('CustomizationView 2-pane tree initial render matches baseline', async ({ page }) => {
    await gotoCustomization(page);

    // Confirm both root nodes exist
    const agentsRoot = page.locator('[data-testid="tree-root-agents"]');
    const skillsRoot = page.locator('[data-testid="tree-root-skills"]');
    await expect(agentsRoot).toBeVisible({ timeout: 5_000 });
    await expect(skillsRoot).toBeVisible({ timeout: 5_000 });

    await expect(page).toHaveScreenshot('customization-tree-initial.png', { fullPage: false });
  });
});

// ---------------------------------------------------------------------------
// ② tree-root count badges — Agents(3) and Skills(2)
// ---------------------------------------------------------------------------

// covers: CT-TREE-01, CT-TREE-02
test.describe('m0.18 Customization Tree — ② root count badges', () => {
  test('Agents root node shows count 3', async ({ page }) => {
    await gotoCustomization(page);

    const agentsRoot = page.locator('[data-testid="tree-root-agents"]');
    // WHY: TreeNav renders count in a (N) span; verify text contains "3"
    await expect(agentsRoot).toContainText('3');
  });

  test('Skills root node shows count 2', async ({ page }) => {
    await gotoCustomization(page);

    const skillsRoot = page.locator('[data-testid="tree-root-skills"]');
    await expect(skillsRoot).toContainText('2');
  });
});

// ---------------------------------------------------------------------------
// ③ agent leaf selection → model selector visible
// ---------------------------------------------------------------------------

// covers: CT-EDIT-AGENT-01
test.describe('m0.18 Customization Tree — ③ agent leaf selection', () => {
  test('clicking agent leaf shows leaf-editor-model-selector', async ({ page }) => {
    await gotoCustomization(page);

    // loom-developer leaf is present (agents root starts expanded)
    const devLeaf = page.locator('[data-testid="tree-leaf-agents/loom-developer"]');
    await expect(devLeaf).toBeVisible({ timeout: 5_000 });
    await devLeaf.click();
    await page.waitForTimeout(200);

    // leaf-editor-model-selector must be visible
    const modelSelector = page.locator('[data-testid="leaf-editor-model-selector"]');
    await expect(modelSelector).toBeVisible({ timeout: 5_000 });

    await expect(page).toHaveScreenshot('customization-tree-agent-editor.png', { fullPage: false });
  });
});

// ---------------------------------------------------------------------------
// ④ skill leaf selection → model selector absent
// ---------------------------------------------------------------------------

// covers: CT-EDIT-SKILL-01
test.describe('m0.18 Customization Tree — ④ skill leaf selection', () => {
  test('clicking skill leaf hides leaf-editor-model-selector', async ({ page }) => {
    await gotoCustomization(page);

    // Click the single strategy leaf (skills are expanded by default)
    const singleLeaf = page.locator('[data-testid="tree-leaf-skills/loom-review/strategies/single"]');
    await expect(singleLeaf).toBeVisible({ timeout: 5_000 });
    await singleLeaf.click();
    await page.waitForTimeout(200);

    // Model selector must NOT be in the DOM for skill kind
    const modelSelector = page.locator('[data-testid="leaf-editor-model-selector"]');
    await expect(modelSelector).not.toBeVisible();

    await expect(page).toHaveScreenshot('customization-tree-skill-editor.png', { fullPage: false });
  });
});

// ---------------------------------------------------------------------------
// ⑤ WRITE badge on aggregator leaf
// ---------------------------------------------------------------------------

// covers: CT-TREE-05, CT-EDIT-WRITE-01
test.describe('m0.18 Customization Tree — ⑤ aggregator WRITE badge', () => {
  test('aggregator leaf shows badge-write in tree nav', async ({ page }) => {
    await gotoCustomization(page);

    // aggregator leaf is visible (loom-retro/stages expanded by default)
    const aggregatorLeaf = page.locator('[data-testid="tree-leaf-skills/loom-retro/stages/aggregator"]');
    await expect(aggregatorLeaf).toBeVisible({ timeout: 5_000 });

    // WRITE badge must be visible within the aggregator leaf row
    const writeBadge = aggregatorLeaf.locator('[data-testid="badge-write"]');
    await expect(writeBadge).toBeVisible({ timeout: 5_000 });
  });

  test('clicking aggregator leaf shows WRITE badge in leaf editor header', async ({ page }) => {
    await gotoCustomization(page);

    const aggregatorLeaf = page.locator('[data-testid="tree-leaf-skills/loom-retro/stages/aggregator"]');
    await aggregatorLeaf.click();
    await page.waitForTimeout(200);

    // LeafEditor header renders WRITE badge when writePermission=true
    const editorWriteBadge = page.locator('[data-testid="leaf-editor-write-badge"]');
    await expect(editorWriteBadge).toBeVisible({ timeout: 5_000 });

    await expect(page).toHaveScreenshot('customization-tree-aggregator-write.png', { fullPage: false });
  });
});

// ---------------------------------------------------------------------------
// ⑥ expand/collapse — clicking Agents root toggles subtree
// ---------------------------------------------------------------------------

// covers: CT-TREE-01, CT-TREE-02
test.describe('m0.18 Customization Tree — ⑥ expand/collapse interaction', () => {
  test('clicking Agents root collapses agent leaves', async ({ page }) => {
    await gotoCustomization(page);

    // All leaves visible initially (tree starts fully expanded)
    const devLeaf = page.locator('[data-testid="tree-leaf-agents/loom-developer"]');
    await expect(devLeaf).toBeVisible({ timeout: 5_000 });

    // Click Agents root to collapse
    const agentsRoot = page.locator('[data-testid="tree-root-agents"]');
    await agentsRoot.click();
    await page.waitForTimeout(200);

    // Leaves should no longer be visible
    await expect(devLeaf).not.toBeVisible();
  });

  test('clicking Agents root twice restores expanded state', async ({ page }) => {
    await gotoCustomization(page);

    const agentsRoot = page.locator('[data-testid="tree-root-agents"]');
    const devLeaf = page.locator('[data-testid="tree-leaf-agents/loom-developer"]');

    // Collapse
    await agentsRoot.click();
    await page.waitForTimeout(200);
    await expect(devLeaf).not.toBeVisible();

    // Expand again
    await agentsRoot.click();
    await page.waitForTimeout(200);
    await expect(devLeaf).toBeVisible();
  });
});
