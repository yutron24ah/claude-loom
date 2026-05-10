/**
 * CustomizationView × scenario.active — redesign port smoke tests (M0.15 t5)
 *
 * WHY: The existing customization.test.tsx mocks against hardcoded MOCK_SETTINGS
 * (the old fixture). This suite mocks useScenario (the new redesign hook) to verify
 * the redesign-driven CustomizationView renders:
 *   - 13 agent rows with effective model + preset from scenario.customization
 *   - scope chain trace expandable for agents with chain.length > 1 (override)
 *   - scope tag (default/user/project) per chain layer
 *   - preset emoji + name from PRESETS constant
 *   - model color indicator from MODELS constant
 *
 * REQ-065 acceptance criteria.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// WHY: Mock useScenario so the component never touches the real WS store.
// The mock fixture mirrors the scenario.customization shape from scenarios.js.
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      customization: {
        pm: {
          effective: { model: 'opus', preset: 'default' },
          chain: [{ scope: 'default', model: 'opus', preset: 'default' }],
        },
        dev: {
          effective: { model: 'sonnet', preset: 'friendly-mentor' },
          chain: [
            { scope: 'default', model: 'sonnet', preset: 'default' },
            { scope: 'project', preset: 'friendly-mentor', note: 'TDD red 順序の遵守を最優先で。' },
          ],
        },
        'rev-sec': {
          effective: { model: 'opus', preset: 'detective' },
          chain: [
            { scope: 'default', model: 'sonnet', preset: 'default' },
            { scope: 'user', model: 'opus', preset: 'detective', note: 'OWASP top 10 を必ず根拠に。' },
          ],
        },
        rev: {
          effective: { model: 'sonnet', preset: 'default' },
          chain: [{ scope: 'default', model: 'sonnet', preset: 'default' }],
        },
        'rev-code': {
          effective: { model: 'sonnet', preset: 'strict-drill' },
          chain: [
            { scope: 'default', model: 'sonnet', preset: 'default' },
            { scope: 'project', preset: 'strict-drill' },
          ],
        },
        'rev-test': {
          effective: { model: 'haiku', preset: 'default' },
          chain: [
            { scope: 'default', model: 'sonnet', preset: 'default' },
            { scope: 'user', model: 'haiku' },
          ],
        },
        'retro-pm': {
          effective: { model: 'opus', preset: 'default' },
          chain: [{ scope: 'default', model: 'opus', preset: 'default' }],
        },
        'retro-counter': {
          effective: { model: 'opus', preset: 'strict-drill' },
          chain: [
            { scope: 'default', model: 'opus', preset: 'default' },
            { scope: 'user', preset: 'strict-drill' },
          ],
        },
        'retro-meta': {
          effective: { model: 'opus', preset: 'detective' },
          chain: [
            { scope: 'default', model: 'opus', preset: 'default' },
            { scope: 'user', preset: 'detective' },
          ],
        },
        'retro-pj': {
          effective: { model: 'sonnet', preset: 'default' },
          chain: [{ scope: 'default', model: 'sonnet', preset: 'default' }],
        },
        'retro-research': {
          effective: { model: 'sonnet', preset: 'default' },
          chain: [{ scope: 'default', model: 'sonnet', preset: 'default' }],
        },
        'retro-proc': {
          effective: { model: 'sonnet', preset: 'default' },
          chain: [{ scope: 'default', model: 'sonnet', preset: 'default' }],
        },
        'retro-agg': {
          effective: { model: 'opus', preset: 'default' },
          chain: [{ scope: 'default', model: 'opus', preset: 'default' }],
        },
      },
    }) as unknown as Scenario,
}));

import { CustomizationView } from '../../../src/views/customization/CustomizationView';

afterEach(() => {
  cleanup();
});

describe('CustomizationView × scenario.active', () => {
  it('renders all 13 agent rows with effective model + preset', () => {
    render(<CustomizationView />);
    // 13 agent rows from scenario.customization (not MOCK_SETTINGS hardcoded)
    const rows = screen.getAllByTestId('agent-row');
    expect(rows).toHaveLength(13);
    // Each row should display the effective model as a button (aria-pressed=true)
    const pressedButtons = screen.getAllByRole('button', { pressed: true } as any);
    expect(pressedButtons.length).toBeGreaterThanOrEqual(13); // at least 1 active model per agent
  });

  it('renders chain trace expandable for agents with override (chain.length > 1)', () => {
    render(<CustomizationView />);
    // dev has chain.length=2, so its chain button should be shown with warning color or special styling
    // Each row has a "chain expand" button — for overridden agents it shows chain length > 1
    const chainButtons = screen.getAllByTestId('chain-expand-btn');
    expect(chainButtons.length).toBe(13);

    // dev chain has 2 layers — the button should indicate override
    // Find the dev agent row by data-agent-id attribute
    const devRow = document.querySelector('[data-agent-id="dev"]');
    expect(devRow).toBeTruthy();
    const chainBtn = devRow!.querySelector('[data-testid="chain-expand-btn"]');
    expect(chainBtn).toBeTruthy();
    // dev has 2 chain layers, should show "2 ▸" or similar
    expect(chainBtn?.textContent).toMatch(/2/);
  });

  it('renders scope tag (default/user/project) for each chain layer when expanded', () => {
    render(<CustomizationView />);
    // Expand the rev-sec agent's chain (has user scope override)
    const revSecRow = document.querySelector('[data-agent-id="rev-sec"]');
    expect(revSecRow).toBeTruthy();
    const chainBtn = revSecRow!.querySelector('[data-testid="chain-expand-btn"]');
    expect(chainBtn).toBeTruthy();
    fireEvent.click(chainBtn!);

    // After expansion the chain detail panel should show scope tags
    const scopeTags = screen.getAllByTestId('chain-scope-tag');
    expect(scopeTags.length).toBeGreaterThanOrEqual(2); // default + user
    const scopeTexts = scopeTags.map(t => t.textContent?.toUpperCase() ?? '');
    expect(scopeTexts).toContain('DEFAULT');
    expect(scopeTexts).toContain('USER');
  });

  it('renders preset emoji + name from PRESETS constant', () => {
    render(<CustomizationView />);
    // dev effective preset = 'friendly-mentor', PRESETS has emoji "🌱" + name "Friendly Mentor"
    // The preset buttons should show emoji + name for each PRESET
    // At least 'friendly-mentor' preset button should be visible for the dev row
    const devRow = document.querySelector('[data-agent-id="dev"]');
    expect(devRow).toBeTruthy();
    // The active preset for dev is friendly-mentor
    const presetBtns = devRow!.querySelectorAll('[data-testid^="preset-btn-"]');
    expect(presetBtns.length).toBeGreaterThanOrEqual(4); // all 4 presets shown per row
    // The active one should contain emoji — find the friendly-mentor button
    const friendlyMentorBtn = devRow!.querySelector('[data-testid="preset-btn-friendly-mentor"]');
    expect(friendlyMentorBtn).toBeTruthy();
    // emoji 🌱 should appear in button text
    expect(friendlyMentorBtn?.textContent).toContain('🌱');
  });

  it('renders model color indicator from MODELS constant', () => {
    render(<CustomizationView />);
    // The model buttons for pm (effective=opus) should have color background for opus
    const pmRow = document.querySelector('[data-agent-id="pm"]');
    expect(pmRow).toBeTruthy();
    const opusBtn = pmRow!.querySelector('[data-testid="model-option-opus"]');
    expect(opusBtn).toBeTruthy();
    // The opus button for pm should be aria-pressed=true (it's the effective model)
    expect(opusBtn?.getAttribute('aria-pressed')).toBe('true');
    // The button should have inline style with background color (from MODELS constant)
    const style = (opusBtn as HTMLElement)?.style;
    expect(style?.background).toBeTruthy();
  });

  it('renders dirty state indicator when save/cancel buttons are present', () => {
    render(<CustomizationView />);
    // The view should show 取消 (cancel) and 保存 (save) buttons per the design spec
    expect(screen.getByRole('button', { name: /取消/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /保存/ })).toBeInTheDocument();
  });

  it('renders SCOPE CHAIN detail panel description in initial state', () => {
    render(<CustomizationView />);
    // When no chain is expanded, the right panel shows explanatory text
    // The panel should contain "SCOPE CHAIN" header
    expect(screen.getByTestId('chain-detail-panel')).toBeInTheDocument();
  });
});
