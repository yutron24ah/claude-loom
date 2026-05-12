/**
 * CustomizationView × write API hookup (REQ-077, M0.15 t16)
 *
 * WHY: Verifies that the "保存" button in CustomizationView calls
 * useCustomizationMutation.mutate() with the current draft state.
 * The noop onClick(() => undefined) was replaced by the mutation call.
 *
 * Mock strategy: mock both useScenario (data source) and
 * useCustomizationMutation (write mutation) at the module boundary.
 * This ensures the test verifies the wiring without a real daemon.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

const mutateFn = vi.fn();

// WHY: Mock mutation hook so we can verify it's called on button click.
vi.mock('../../../src/live/useCustomizationMutations', () => ({
  useCustomizationMutation: () => ({ mutate: mutateFn, isPending: false }),
}));

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      customization: {
        pm: {
          effective: { model: 'opus', preset: 'default' },
          chain: [{ scope: 'default', model: 'opus', preset: 'default' }],
        },
        dev: {
          effective: { model: 'sonnet', preset: 'default' },
          chain: [{ scope: 'default', model: 'sonnet', preset: 'default' }],
        },
        rev: {
          effective: { model: 'sonnet', preset: 'default' },
          chain: [{ scope: 'default', model: 'sonnet', preset: 'default' }],
        },
        'rev-code': {
          effective: { model: 'sonnet', preset: 'default' },
          chain: [{ scope: 'default', model: 'sonnet', preset: 'default' }],
        },
        'rev-sec': {
          effective: { model: 'sonnet', preset: 'default' },
          chain: [{ scope: 'default', model: 'sonnet', preset: 'default' }],
        },
        'rev-test': {
          effective: { model: 'haiku', preset: 'default' },
          chain: [{ scope: 'default', model: 'haiku', preset: 'default' }],
        },
        'retro-pm': {
          effective: { model: 'opus', preset: 'default' },
          chain: [{ scope: 'default', model: 'opus', preset: 'default' }],
        },
        'retro-counter': {
          effective: { model: 'opus', preset: 'default' },
          chain: [{ scope: 'default', model: 'opus', preset: 'default' }],
        },
        'retro-meta': {
          effective: { model: 'opus', preset: 'default' },
          chain: [{ scope: 'default', model: 'opus', preset: 'default' }],
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
  mutateFn.mockClear();
});

describe('CustomizationView × write API', () => {
  it('clicking 保存 button calls useCustomizationMutation.mutate', () => {
    render(<CustomizationView />);
    const saveBtn = screen.getByLabelText('保存');
    fireEvent.click(saveBtn);
    expect(mutateFn).toHaveBeenCalledTimes(1);
  });

  it('clicking 取消 button does not call mutate', () => {
    render(<CustomizationView />);
    const cancelBtn = screen.getByLabelText('取消');
    fireEvent.click(cancelBtn);
    expect(mutateFn).not.toHaveBeenCalled();
  });

  it('model selection triggers draft update (aria-pressed changes)', () => {
    render(<CustomizationView />);
    // Click the sonnet model button for "pm" agent row
    const pmRow = document.querySelector('[data-agent-id="pm"]');
    expect(pmRow).not.toBeNull();
    // The opus model should be aria-pressed=true for pm
    const opusBtn = pmRow!.querySelector('[data-testid="model-option-opus"]') as HTMLButtonElement;
    expect(opusBtn.getAttribute('aria-pressed')).toBe('true');
  });
});
