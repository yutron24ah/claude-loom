/**
 * RetroView TDD tests — Red phase (Task 9 Subagent B)
 * WHY: verify retro findings and action buttons render with mock data.
 * Written FIRST (Red) before RetroView implementation.
 *
 * Behavior under test:
 * 1. Component renders without crashing
 * 2. Session info (id, milestone, completed_at) is visible
 * 3. 4-lens summary section renders
 * 4. Findings list renders with correct count
 * 5. 4 action buttons per finding: accept, reject, defer, discuss
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { RetroView } from '../../src/views/retro/RetroView';

afterEach(() => {
  cleanup();
});

describe('RetroView — basic render', () => {
  it('renders without crashing', () => {
    const { container } = render(<RetroView />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders session info section', () => {
    render(<RetroView />);
    const sessionInfo = screen.getByTestId('retro-session-info');
    expect(sessionInfo).toBeInTheDocument();
  });

  it('renders 4 lens summary cards', () => {
    const { container } = render(<RetroView />);
    const lensCards = container.querySelectorAll('[data-testid="lens-card"]');
    expect(lensCards.length).toBe(4);
  });
});

describe('RetroView — findings list (mock data: 4 findings)', () => {
  it('renders findings list section', () => {
    render(<RetroView />);
    const findingsList = screen.getByTestId('retro-findings');
    expect(findingsList).toBeInTheDocument();
  });

  it('renders 4 finding items (data-testid="finding-item")', () => {
    const { container } = render(<RetroView />);
    const findings = container.querySelectorAll('[data-testid="finding-item"]');
    expect(findings.length).toBe(4);
  });
});

describe('RetroView — action buttons per finding', () => {
  it('renders "accept" button for each finding', () => {
    render(<RetroView />);
    const acceptButtons = screen.getAllByRole('button', { name: /accept/i });
    expect(acceptButtons.length).toBe(4);
  });

  it('renders "reject" button for each finding', () => {
    render(<RetroView />);
    const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
    expect(rejectButtons.length).toBe(4);
  });

  it('renders "defer" button for each finding', () => {
    render(<RetroView />);
    const deferButtons = screen.getAllByRole('button', { name: /defer/i });
    expect(deferButtons.length).toBe(4);
  });

  it('renders "discuss" button for each finding', () => {
    render(<RetroView />);
    const discussButtons = screen.getAllByRole('button', { name: /discuss/i });
    expect(discussButtons.length).toBe(4);
  });
});

describe('RetroView — lens summary detail', () => {
  it('renders lens names in summary cards', () => {
    render(<RetroView />);
    // Mock data: 4 lens names visible
    const lensCards = screen.getAllByTestId('lens-card');
    expect(lensCards.length).toBe(4);
    // Each card shows role label
    lensCards.forEach(card => {
      expect(card.textContent).toBeTruthy();
    });
  });

  it('renders finding count badge per lens card', () => {
    const { container } = render(<RetroView />);
    const countBadges = container.querySelectorAll('[data-testid="lens-finding-count"]');
    expect(countBadges.length).toBe(4);
  });
});
