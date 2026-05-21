/**
 * CustomizationView 2-pane tree rewrite TDD tests
 * WHY: M0.18 Phase 1 t1 — flat AgentRow + ChainDetailPanel replaced by
 * 2-pane tree (left 260px hierarchical tree + right 1fr leaf editor).
 * Tree shape: Agents(3) + Skills(2) with sub-scopes, WRITE badge for aggregator.
 *
 * covers: CT-TREE-01, CT-TREE-02, CT-TREE-03, CT-TREE-04, CT-TREE-05,
 *         CT-EDIT-AGENT-01, CT-EDIT-SKILL-01, CT-EDIT-WRITE-01
 *
 * REQ-117: CT-TREE-01 — Agents root node expand
 * REQ-118: CT-TREE-02 — Skills root node expand
 * REQ-119: CT-TREE-03 — loom-review expand shows 4 strategies
 * REQ-120: CT-TREE-04 — loom-retro expand shows lenses(4) + stages(2)
 * REQ-121: CT-TREE-05 — aggregator leaf has WRITE badge
 * REQ-122: CT-EDIT-AGENT-01 / CT-EDIT-SKILL-01 — agent leaf shows model selector, skill leaf hides it
 * REQ-123: CT-TREE-01, CT-TREE-02 — count display Agents(3) / Skills(2)
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';

// WHY: Mock mutation hook — tree rewrite still uses the same write pathway
vi.mock('../../../src/live/useCustomizationMutations', () => ({
  useCustomizationMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

// WHY: Mock useScenario — tree does not depend on old flat customization shape
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () => ({
    customization: {},
  }),
}));

import { CustomizationView } from '../../../src/views/customization/CustomizationView';

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// covers: CT-TREE-01, CT-TREE-02
// REQ-115
// ---------------------------------------------------------------------------
describe('tree renders Agents + Skills root nodes', () => {
  it('renders a tree root node labeled Agents', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('tree-root-agents')).toBeInTheDocument();
  });

  it('renders a tree root node labeled Skills', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('tree-root-skills')).toBeInTheDocument();
  });

  it('both root nodes are present simultaneously', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('tree-root-agents')).toBeInTheDocument();
    expect(screen.getByTestId('tree-root-skills')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// covers: CT-TREE-01
// REQ-116
// ---------------------------------------------------------------------------
describe('Agents expand shows 3 persistent agents', () => {
  it('renders loom-pm leaf when agents are expanded', () => {
    render(<CustomizationView />);
    // agents root should be expanded by default
    expect(screen.getByTestId('tree-leaf-agents/loom-pm')).toBeInTheDocument();
  });

  it('renders loom-developer leaf when agents are expanded', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('tree-leaf-agents/loom-developer')).toBeInTheDocument();
  });

  it('renders loom-retro-pm leaf when agents are expanded', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('tree-leaf-agents/loom-retro-pm')).toBeInTheDocument();
  });

  it('shows exactly 3 persistent agent leaves under Agents', () => {
    render(<CustomizationView />);
    const agentsRoot = screen.getByTestId('tree-root-agents');
    const agentLeaves = within(agentsRoot.parentElement!).queryAllByTestId(/^tree-leaf-agents\//);
    expect(agentLeaves).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// covers: CT-TREE-03
// REQ-117
// ---------------------------------------------------------------------------
describe('loom-review expand shows 4 strategies', () => {
  it('renders single strategy leaf', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('tree-leaf-skills/loom-review/strategies/single')).toBeInTheDocument();
  });

  it('renders trio/code strategy leaf', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('tree-leaf-skills/loom-review/strategies/trio/code')).toBeInTheDocument();
  });

  it('renders trio/security strategy leaf', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('tree-leaf-skills/loom-review/strategies/trio/security')).toBeInTheDocument();
  });

  it('renders trio/test strategy leaf', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('tree-leaf-skills/loom-review/strategies/trio/test')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// covers: CT-TREE-04
// REQ-118
// ---------------------------------------------------------------------------
describe('loom-retro expand shows lenses(4) + stages(2)', () => {
  it('renders pj-axis lens leaf', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('tree-leaf-skills/loom-retro/lenses/pj-axis')).toBeInTheDocument();
  });

  it('renders process-axis lens leaf', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('tree-leaf-skills/loom-retro/lenses/process-axis')).toBeInTheDocument();
  });

  it('renders meta-axis lens leaf', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('tree-leaf-skills/loom-retro/lenses/meta-axis')).toBeInTheDocument();
  });

  it('renders researcher lens leaf', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('tree-leaf-skills/loom-retro/lenses/researcher')).toBeInTheDocument();
  });

  it('renders counter-arguer stage leaf', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('tree-leaf-skills/loom-retro/stages/counter-arguer')).toBeInTheDocument();
  });

  it('renders aggregator stage leaf', () => {
    render(<CustomizationView />);
    expect(screen.getByTestId('tree-leaf-skills/loom-retro/stages/aggregator')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// covers: CT-TREE-05, CT-EDIT-WRITE-01
// REQ-119
// ---------------------------------------------------------------------------
describe('aggregator leaf has WRITE badge', () => {
  it('renders WRITE badge in the tree leaf row for aggregator', () => {
    render(<CustomizationView />);
    const aggregatorLeaf = screen.getByTestId('tree-leaf-skills/loom-retro/stages/aggregator');
    expect(within(aggregatorLeaf).getByTestId('badge-write')).toBeInTheDocument();
  });

  it('does not render WRITE badge on non-aggregator leaves', () => {
    render(<CustomizationView />);
    const pmLeaf = screen.getByTestId('tree-leaf-agents/loom-pm');
    expect(within(pmLeaf).queryByTestId('badge-write')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// covers: CT-EDIT-AGENT-01, CT-EDIT-SKILL-01
// REQ-120
// ---------------------------------------------------------------------------
describe('agent vs skill leaf editor model selector visibility', () => {
  it('clicking an agent leaf shows model selector in editor', () => {
    render(<CustomizationView />);
    // Click the loom-developer agent leaf
    fireEvent.click(screen.getByTestId('tree-leaf-agents/loom-developer'));
    expect(screen.getByTestId('leaf-editor-model-selector')).toBeInTheDocument();
  });

  it('clicking a skill scope leaf hides model selector in editor', () => {
    render(<CustomizationView />);
    // Click the single strategy skill leaf
    fireEvent.click(screen.getByTestId('tree-leaf-skills/loom-review/strategies/single'));
    expect(screen.queryByTestId('leaf-editor-model-selector')).not.toBeInTheDocument();
  });

  it('switching from agent to skill leaf removes model selector', () => {
    render(<CustomizationView />);
    // First select agent
    fireEvent.click(screen.getByTestId('tree-leaf-agents/loom-pm'));
    expect(screen.getByTestId('leaf-editor-model-selector')).toBeInTheDocument();
    // Then select skill
    fireEvent.click(screen.getByTestId('tree-leaf-skills/loom-retro/lenses/researcher'));
    expect(screen.queryByTestId('leaf-editor-model-selector')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// covers: CT-TREE-01, CT-TREE-02
// REQ-121
// ---------------------------------------------------------------------------
describe('count display on root nodes', () => {
  it('Agents root shows count of 3', () => {
    render(<CustomizationView />);
    const agentsRoot = screen.getByTestId('tree-root-agents');
    expect(agentsRoot).toHaveTextContent('3');
  });

  it('Skills root shows count of 2', () => {
    render(<CustomizationView />);
    const skillsRoot = screen.getByTestId('tree-root-skills');
    expect(skillsRoot).toHaveTextContent('2');
  });
});
