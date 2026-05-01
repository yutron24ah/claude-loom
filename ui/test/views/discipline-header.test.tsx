/**
 * DisciplineHeader TDD tests — Red phase (Task 9 Subagent B)
 * WHY: verify 4 discipline metrics render with mock data.
 * Written FIRST (Red) before DisciplineHeader implementation.
 *
 * Behavior under test:
 * 1. Component renders without crashing
 * 2. All 4 metric labels visible (PARALLEL, TASK TOOL, TDD ORDER, VERDICT)
 * 3. Mock metric values are visible
 * 4. data-testid="discipline-header" attribute is present
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { DisciplineHeader } from '../../src/components/DisciplineHeader';

afterEach(() => {
  cleanup();
});

describe('DisciplineHeader — basic render', () => {
  it('renders without crashing', () => {
    const { container } = render(<DisciplineHeader />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('has data-testid="discipline-header"', () => {
    render(<DisciplineHeader />);
    expect(screen.getByTestId('discipline-header')).toBeInTheDocument();
  });

  it('renders with default width prop', () => {
    render(<DisciplineHeader />);
    expect(screen.getByTestId('discipline-header')).toBeInTheDocument();
  });

  it('renders title text', () => {
    render(<DisciplineHeader />);
    expect(screen.getByText(/claude-loom/i)).toBeInTheDocument();
  });
});

describe('DisciplineHeader — 4 metric labels', () => {
  it('shows PARALLEL metric label', () => {
    render(<DisciplineHeader />);
    expect(screen.getByText('PARALLEL')).toBeInTheDocument();
  });

  it('shows TASK TOOL metric label', () => {
    render(<DisciplineHeader />);
    expect(screen.getByText('TASK TOOL')).toBeInTheDocument();
  });

  it('shows TDD ORDER metric label', () => {
    render(<DisciplineHeader />);
    expect(screen.getByText('TDD ORDER')).toBeInTheDocument();
  });

  it('shows VERDICT metric label', () => {
    render(<DisciplineHeader />);
    expect(screen.getByText('VERDICT')).toBeInTheDocument();
  });
});

describe('DisciplineHeader — mock metric values', () => {
  it('shows parallel rate value', () => {
    render(<DisciplineHeader />);
    // parallel_rate: 0.6 → "60%" or similar
    const header = screen.getByTestId('discipline-header');
    expect(header).toBeInTheDocument();
    // The parallel rate display should be present somewhere in the metric section
    expect(header.querySelector('[data-testid="metric-parallel"]')).toBeInTheDocument();
  });

  it('shows task tool status value', () => {
    render(<DisciplineHeader />);
    const header = screen.getByTestId('discipline-header');
    expect(header.querySelector('[data-testid="metric-task-tool"]')).toBeInTheDocument();
  });

  it('shows TDD violations value', () => {
    render(<DisciplineHeader />);
    const header = screen.getByTestId('discipline-header');
    expect(header.querySelector('[data-testid="metric-tdd-order"]')).toBeInTheDocument();
  });

  it('shows reviewer verdict value', () => {
    render(<DisciplineHeader />);
    const header = screen.getByTestId('discipline-header');
    expect(header.querySelector('[data-testid="metric-verdict"]')).toBeInTheDocument();
  });
});
