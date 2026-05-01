/**
 * LearnedGuidanceView TDD tests — Red phase (Task 9 Subagent C)
 * WHY: verify learned guidance renders with active/inactive state and toggle buttons.
 * SCREEN_REQUIREMENTS §3.10 / §4.9
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { LearnedGuidanceView } from '../../src/views/guidance/LearnedGuidanceView';

afterEach(() => {
  cleanup();
});

describe('LearnedGuidanceView — basic render', () => {
  it('renders the guidance view container', () => {
    render(<LearnedGuidanceView />);
    expect(screen.getByTestId('guidance-view')).toBeInTheDocument();
  });

  it('renders the section title mentioning Guidance', () => {
    render(<LearnedGuidanceView />);
    expect(screen.getByTestId('guidance-title')).toBeInTheDocument();
  });
});

describe('LearnedGuidanceView — guidance count', () => {
  it('renders at least 5 guidance items (data-testid=guidance-item)', () => {
    render(<LearnedGuidanceView />);
    const items = screen.getAllByTestId('guidance-item');
    expect(items.length).toBeGreaterThanOrEqual(5);
  });

  it('renders guidance text for each item', () => {
    render(<LearnedGuidanceView />);
    const texts = screen.getAllByTestId('guidance-text');
    expect(texts.length).toBeGreaterThanOrEqual(5);
  });
});

describe('LearnedGuidanceView — active/inactive state', () => {
  it('renders active guidance items (data-testid=guidance-active)', () => {
    render(<LearnedGuidanceView />);
    const activeItems = screen.getAllByTestId('guidance-active');
    expect(activeItems.length).toBeGreaterThanOrEqual(1);
  });

  it('renders at least one inactive guidance item', () => {
    render(<LearnedGuidanceView />);
    const inactiveItems = screen.getAllByTestId('guidance-inactive');
    expect(inactiveItems.length).toBeGreaterThanOrEqual(1);
  });
});

describe('LearnedGuidanceView — toggle and prune buttons', () => {
  it('renders active-toggle buttons for each guidance item', () => {
    render(<LearnedGuidanceView />);
    const toggleButtons = screen.getAllByTestId('guidance-toggle');
    expect(toggleButtons.length).toBeGreaterThanOrEqual(5);
  });

  it('renders delete/prune buttons for each guidance item', () => {
    render(<LearnedGuidanceView />);
    const deleteButtons = screen.getAllByTestId('guidance-delete');
    expect(deleteButtons.length).toBeGreaterThanOrEqual(5);
  });
});

describe('LearnedGuidanceView — agent identity', () => {
  it('renders agent name labels for guidance items', () => {
    render(<LearnedGuidanceView />);
    const agentLabels = screen.getAllByTestId('guidance-agent-name');
    expect(agentLabels.length).toBeGreaterThanOrEqual(5);
  });

  it('renders category badges for guidance items', () => {
    render(<LearnedGuidanceView />);
    const catBadges = screen.getAllByTestId('guidance-category');
    expect(catBadges.length).toBeGreaterThanOrEqual(5);
  });
});
