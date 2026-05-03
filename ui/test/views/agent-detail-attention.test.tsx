/**
 * TDD RED phase — AgentDetailPanel dispatch history + attention toggle
 *
 * Tests written BEFORE implementation exists.
 * WHY: verifies AgentDetailPanel renders dispatch history and attention toggle
 * with correct data-testid attributes per M3.2 t2 spec.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AgentDetailPanel } from '../../src/views/room/AgentDetailPanel';

// WHY: AgentDetailNotes uses tRPC hooks which require provider context.
// Attention/dispatch-history tests focus on panel attention+history structure, not notes.
vi.mock('../../src/views/room/AgentDetailNotes', () => ({
  AgentDetailNotes: () => null,
}));

afterEach(() => {
  cleanup();
});

const mockAgent = {
  id: 'dev',
  name: 'サバ',
  role: 'Developer',
  jp: 'デベロッパー',
  breed: 'サバトラ',
  quote: 'RED → GREEN、まず落とすの。',
  hat: 'headband' as const,
  fur: '#b8a98c',
  cheek: '#f4a3b3',
  group: 'core' as const,
};

const mockDispatchHistory = [
  {
    subagentId: 'sa-001',
    agentType: 'loom-developer',
    status: 'done' as const,
    startedAt: new Date('2026-05-02T10:00:00Z'),
  },
  {
    subagentId: 'sa-002',
    agentType: 'loom-reviewer',
    status: 'done' as const,
    startedAt: new Date('2026-05-02T11:30:00Z'),
  },
];

// ---------------------------------------------------------------------------
// data-testid tests
// ---------------------------------------------------------------------------

describe('AgentDetailPanel — data-testid attributes', () => {
  it('renders agent-detail-panel wrapper with data-testid', () => {
    render(<AgentDetailPanel agent={mockAgent} />);
    expect(screen.getByTestId('agent-detail-panel')).toBeInTheDocument();
  });

  it('renders agent-attention-toggle button with data-testid', () => {
    render(<AgentDetailPanel agent={mockAgent} />);
    expect(screen.getByTestId('agent-attention-toggle')).toBeInTheDocument();
  });

  it('renders agent-dispatch-history section with data-testid', () => {
    render(<AgentDetailPanel agent={mockAgent} />);
    expect(screen.getByTestId('agent-dispatch-history')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Attention toggle behavior
// ---------------------------------------------------------------------------

describe('AgentDetailPanel — attention toggle', () => {
  it('calls onAttentionToggle when attention button is clicked', () => {
    const handleToggle = vi.fn();
    render(<AgentDetailPanel agent={mockAgent} onAttentionToggle={handleToggle} />);
    const toggleBtn = screen.getByTestId('agent-attention-toggle');
    fireEvent.click(toggleBtn);
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('shows "★ 注目" label on attention toggle button', () => {
    render(<AgentDetailPanel agent={mockAgent} />);
    const toggleBtn = screen.getByTestId('agent-attention-toggle');
    expect(toggleBtn.textContent).toContain('注目');
  });

  it('shows active state when agent.attention is true', () => {
    render(<AgentDetailPanel agent={{ ...mockAgent, attention: true }} />);
    const toggleBtn = screen.getByTestId('agent-attention-toggle');
    // Active state is communicated via aria-pressed or data-attention attribute
    const isAttention =
      toggleBtn.getAttribute('aria-pressed') === 'true' ||
      toggleBtn.getAttribute('data-attention') === 'true';
    expect(isAttention).toBe(true);
  });

  it('shows inactive state when agent.attention is false', () => {
    render(<AgentDetailPanel agent={{ ...mockAgent, attention: false }} />);
    const toggleBtn = screen.getByTestId('agent-attention-toggle');
    const isAttention =
      toggleBtn.getAttribute('aria-pressed') === 'true' ||
      toggleBtn.getAttribute('data-attention') === 'true';
    expect(isAttention).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Dispatch history render
// ---------------------------------------------------------------------------

describe('AgentDetailPanel — dispatch history render', () => {
  it('renders dispatch history items when dispatchHistory prop is provided', () => {
    render(
      <AgentDetailPanel
        agent={mockAgent}
        dispatchHistory={mockDispatchHistory}
      />
    );
    const historySection = screen.getByTestId('agent-dispatch-history');
    expect(historySection).toBeInTheDocument();
    // Should show both agents
    expect(historySection.textContent).toContain('loom-developer');
    expect(historySection.textContent).toContain('loom-reviewer');
  });

  it('renders dispatch history with status', () => {
    render(
      <AgentDetailPanel
        agent={mockAgent}
        dispatchHistory={mockDispatchHistory}
      />
    );
    const historySection = screen.getByTestId('agent-dispatch-history');
    expect(historySection.textContent).toContain('done');
  });

  it('renders empty state when dispatchHistory is empty', () => {
    render(
      <AgentDetailPanel agent={mockAgent} dispatchHistory={[]} />
    );
    const historySection = screen.getByTestId('agent-dispatch-history');
    expect(historySection).toBeInTheDocument();
    // Empty state should still render the section
  });
});
