/**
 * CustomizationView × write API hookup (REQ-077, M0.15 t16 / M0.18 Phase 1 t1)
 *
 * WHY: Verifies that the "保存" button in CustomizationView calls
 * useCustomizationMutation.mutate() with the current state.
 * The 2-pane tree rewrite maintains backward-compat write pathway.
 *
 * covers: CU-EDIT-01, CT-EDIT-AGENT-01
 *
 * M0.18: tree selection state drives what agentId is passed to mutate().
 * Model selection now happens in LeafEditor (not per-row inline buttons).
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
      customization: {},
    }) as unknown as Scenario,
}));

import { CustomizationView } from '../../../src/views/customization/CustomizationView';

afterEach(() => {
  cleanup();
  mutateFn.mockClear();
});

// covers: CU-EDIT-01, CT-SCHEMA-01
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

  it('tree renders leaf-editor by default (loom-developer selected)', () => {
    render(<CustomizationView />);
    // Default selection is loom-developer (agent kind), so model selector is visible
    expect(screen.getByTestId('leaf-editor')).toBeInTheDocument();
    expect(screen.getByTestId('leaf-editor-model-selector')).toBeInTheDocument();
  });
});
