/**
 * ConsistencyView TDD tests — Red phase (Task 9 Subagent C)
 * WHY: verify consistency findings render with severity badges and 4 action buttons.
 * SCREEN_REQUIREMENTS §3.4 / §4.3
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ConsistencyView } from '../../src/views/consistency/ConsistencyView';

afterEach(() => {
  cleanup();
});

describe('ConsistencyView — basic render', () => {
  it('renders the consistency view container', () => {
    render(<ConsistencyView />);
    expect(screen.getByTestId('consistency-view')).toBeInTheDocument();
  });

  it('renders the section title mentioning Consistency', () => {
    render(<ConsistencyView />);
    expect(screen.getByTestId('consistency-title')).toBeInTheDocument();
  });
});

describe('ConsistencyView — finding count', () => {
  it('renders 5-8 finding cards (data-testid=finding-card)', () => {
    render(<ConsistencyView />);
    const cards = screen.getAllByTestId('finding-card');
    expect(cards.length).toBeGreaterThanOrEqual(5);
    expect(cards.length).toBeLessThanOrEqual(8);
  });

  it('renders severity badges for each finding', () => {
    render(<ConsistencyView />);
    const badges = screen.getAllByTestId('finding-severity');
    expect(badges.length).toBeGreaterThanOrEqual(5);
  });
});

describe('ConsistencyView — severity display', () => {
  it('renders at least one high severity finding', () => {
    render(<ConsistencyView />);
    const highBadges = screen.getAllByTestId('severity-high');
    expect(highBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders at least one medium severity finding', () => {
    render(<ConsistencyView />);
    const mediumBadges = screen.getAllByTestId('severity-medium');
    expect(mediumBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders at least one low severity finding', () => {
    render(<ConsistencyView />);
    const lowBadges = screen.getAllByTestId('severity-low');
    expect(lowBadges.length).toBeGreaterThanOrEqual(1);
  });
});

describe('ConsistencyView — action buttons', () => {
  it('renders Acknowledge buttons for open findings', () => {
    render(<ConsistencyView />);
    const buttons = screen.getAllByTestId('action-acknowledge');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Mark Fixed buttons', () => {
    render(<ConsistencyView />);
    const buttons = screen.getAllByTestId('action-mark-fixed');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Dismiss buttons for open findings', () => {
    render(<ConsistencyView />);
    const buttons = screen.getAllByTestId('action-dismiss');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Open in Editor buttons', () => {
    render(<ConsistencyView />);
    const buttons = screen.getAllByTestId('action-open-editor');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });
});
