/**
 * CustomizationView × mock-active — M0.18 Phase 1 t1 rewrite
 *
 * WHY: Old suite tested flat 13-agent row structure (agent-row testids,
 * chain-detail-panel, chain-expand-btn). M0.18 rewrites the view to 2-pane tree.
 * Tests updated to verify tree-based rendering with mock-active scenario data.
 *
 * REQ-065 acceptance criteria (updated for tree structure).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// WHY: Mock useCustomizationMutation so tests don't need a tRPC provider.
vi.mock('../../../src/live/useCustomizationMutations', () => ({
  useCustomizationMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

// WHY: Mock useScenario — tree CustomizationView uses static LEAVES metadata.
// The flat customization shape is no longer read by the view (Phase 1 scope).
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      customization: {
        pm:             { effective: { model: 'opus',   preset: 'default' },         chain: [] },
        dev:            { effective: { model: 'sonnet', preset: 'friendly-mentor' }, chain: [] },
        'retro-pm':     { effective: { model: 'opus',   preset: 'default' },         chain: [] },
      },
    }) as unknown as Scenario,
}));

import { CustomizationView } from '../../../src/views/customization/CustomizationView';

afterEach(() => {
  cleanup();
});

describe('CustomizationView × scenario.active (M0.18 tree)', () => {
  it('renders the tree root nodes (Agents + Skills)', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('tree-root-agents')).toBeInTheDocument();
    expect(screen.getByTestId('tree-root-skills')).toBeInTheDocument();
  });

  it('renders 3 persistent agent leaves (not 13)', () => {
    render(<CustomizationView />);
    // M0.18: only 3 persistent agents in tree (pm/developer/retro-pm)
    expect(screen.getByTestId('tree-leaf-agents/loom-pm')).toBeInTheDocument();
    expect(screen.getByTestId('tree-leaf-agents/loom-developer')).toBeInTheDocument();
    expect(screen.getByTestId('tree-leaf-agents/loom-retro-pm')).toBeInTheDocument();
  });

  it('renders skill scope leaves for loom-review strategies', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('tree-leaf-skills/loom-review/strategies/single')).toBeInTheDocument();
    expect(screen.getByTestId('tree-leaf-skills/loom-review/strategies/trio/code')).toBeInTheDocument();
    expect(screen.getByTestId('tree-leaf-skills/loom-review/strategies/trio/security')).toBeInTheDocument();
    expect(screen.getByTestId('tree-leaf-skills/loom-review/strategies/trio/test')).toBeInTheDocument();
  });

  it('renders WRITE badge for aggregator in tree leaf', () => {
    render(<CustomizationView />);
    const aggLeaf = screen.getByTestId('tree-leaf-skills/loom-retro/stages/aggregator');
    expect(aggLeaf.querySelector('[data-testid="badge-write"]')).toBeTruthy();
  });

  it('clicking agent leaf shows model selector in leaf editor', () => {
    render(<CustomizationView />);
    fireEvent.click(screen.getByTestId('tree-leaf-agents/loom-pm'));
    expect(screen.getByTestId('leaf-editor-model-selector')).toBeInTheDocument();
  });

  it('clicking skill scope leaf hides model selector in leaf editor', () => {
    render(<CustomizationView />);
    fireEvent.click(screen.getByTestId('tree-leaf-skills/loom-review/strategies/single'));
    expect(screen.queryByTestId('leaf-editor-model-selector')).not.toBeInTheDocument();
  });

  it('renders dirty state indicator when save/cancel buttons are present', () => {
    render(<CustomizationView />);
    expect(screen.getByRole('button', { name: /取消/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /保存/ })).toBeInTheDocument();
  });
});
