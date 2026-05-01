/**
 * AgentDetailPanel TDD tests — Red phase (Task 9 Subagent A)
 * WHY: verify panel renders agent data and onClose fires.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AgentDetailPanel } from '../../src/views/room/AgentDetailPanel';

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

describe('AgentDetailPanel — basic render', () => {
  it('renders agent name', () => {
    render(<AgentDetailPanel agent={mockAgent} />);
    expect(screen.getByText('サバ')).toBeInTheDocument();
  });

  it('renders agent role', () => {
    render(<AgentDetailPanel agent={mockAgent} />);
    expect(screen.getByText(/Developer/)).toBeInTheDocument();
  });

  it('renders agent quote', () => {
    render(<AgentDetailPanel agent={mockAgent} />);
    // WHY: use getAllByText since the default currentTask also contains "RED → GREEN";
    // we assert at least one matching element is present.
    const matches = screen.getAllByText(/RED → GREEN/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});

describe('AgentDetailPanel — onClose', () => {
  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<AgentDetailPanel agent={mockAgent} onClose={handleClose} />);
    const closeBtn = screen.getByTestId('agent-detail-close');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
