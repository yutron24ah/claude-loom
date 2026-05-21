/**
 * CustomizationView TDD tests — M0.18 Phase 1 t1 rewrite
 * WHY: M0.18 rewrites flat AgentRow + ChainDetailPanel to 2-pane tree
 * (Agents (3) + Skills (2 with sub-scopes)). Old flat-table tests are
 * replaced with tree-focused tests.
 *
 * covers: CU-MOUNT-01, CT-TREE-01, CT-TREE-02, CT-EDIT-AGENT-01
 *
 * SCREEN_REQUIREMENTS §3.8 / §4.7
 * REQ-115 through REQ-121 (CT-TREE-01 through CT-TREE-05, CT-EDIT-AGENT-01, CT-EDIT-SKILL-01)
 * detail tests in ui/test/views/customization/customization-tree.test.tsx
 *
 * This file covers basic render + header + save/cancel buttons (regression guard).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// WHY: Mock useCustomizationMutation so tests don't need a tRPC provider.
vi.mock('../../src/live/useCustomizationMutations', () => ({
  useCustomizationMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

// WHY: Mock useScenario — tree CustomizationView no longer depends on flat customization shape.
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () => ({ customization: {} }),
}));

import { CustomizationView } from '../../src/views/customization/CustomizationView';

afterEach(() => {
  cleanup();
});

// covers: CU-MOUNT-01
describe('CustomizationView — basic render', () => {
  it('renders the customization view container', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('customization-view')).toBeInTheDocument();
  });

  it('renders the section title mentioning Customization', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('customization-title')).toBeInTheDocument();
  });

  it('renders tree navigation pane', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('tree-root-agents')).toBeInTheDocument();
    expect(screen.getByTestId('tree-root-skills')).toBeInTheDocument();
  });

  it('renders leaf editor pane', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('leaf-editor')).toBeInTheDocument();
  });
});

// covers: CT-TREE-01, CT-TREE-02
describe('CustomizationView — tree structure (M0.18)', () => {
  it('shows Agents root with count (3)', () => {
    render(<CustomizationView />);
    const agentsRoot = screen.getByTestId('tree-root-agents');
    expect(agentsRoot).toHaveTextContent('3');
  });

  it('shows Skills root with count (2)', () => {
    render(<CustomizationView />);
    const skillsRoot = screen.getByTestId('tree-root-skills');
    expect(skillsRoot).toHaveTextContent('2');
  });

  it('shows 3 persistent agent leaves by default (expanded)', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('tree-leaf-agents/loom-pm')).toBeInTheDocument();
    expect(screen.getByTestId('tree-leaf-agents/loom-developer')).toBeInTheDocument();
    expect(screen.getByTestId('tree-leaf-agents/loom-retro-pm')).toBeInTheDocument();
  });

  it('shows skill leaves by default (expanded)', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('tree-leaf-skills/loom-review/strategies/single')).toBeInTheDocument();
    expect(screen.getByTestId('tree-leaf-skills/loom-retro/stages/aggregator')).toBeInTheDocument();
  });

  it('shows WRITE badge on aggregator leaf', () => {
    render(<CustomizationView />);
    const aggregatorLeaf = screen.getByTestId('tree-leaf-skills/loom-retro/stages/aggregator');
    expect(aggregatorLeaf.querySelector('[data-testid="badge-write"]')).toBeInTheDocument();
  });
});

// covers: CT-EDIT-AGENT-01
describe('CustomizationView — leaf editor default state', () => {
  it('shows model selector for default selection (loom-developer = agent)', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('leaf-editor-model-selector')).toBeInTheDocument();
  });
});

describe('CustomizationView — save/cancel actions', () => {
  it('renders cancel button', () => {
    render(<CustomizationView />);
    expect(screen.getByRole('button', { name: /取消/ })).toBeInTheDocument();
  });

  it('renders save button', () => {
    render(<CustomizationView />);
    expect(screen.getByRole('button', { name: /保存/ })).toBeInTheDocument();
  });
});
