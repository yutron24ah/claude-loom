/**
 * DeskStation TDD tests — Red phase (Task 9 Subagent A)
 * WHY: verify desk station renders correctly and onClick fires.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { DeskStation } from '../../src/views/room/DeskStation';

afterEach(() => {
  cleanup();
});

const mockCat = {
  id: 'dev',
  name: 'サバ',
  role: 'Developer',
  fur: '#b8a98c',
  cheek: '#f4a3b3',
  hat: 'headband' as const,
};

describe('DeskStation — basic render', () => {
  it('renders the cat name', () => {
    render(<DeskStation x={0} y={0} cat={mockCat} status="busy" />);
    expect(screen.getByText('サバ')).toBeInTheDocument();
  });

  it('renders the role label', () => {
    render(<DeskStation x={0} y={0} cat={mockCat} status="busy" />);
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });
});

describe('DeskStation — status colors', () => {
  it('renders status indicator element (data-testid=desk-status)', () => {
    render(<DeskStation x={0} y={0} cat={mockCat} status="busy" />);
    expect(screen.getByTestId('desk-status')).toBeInTheDocument();
  });

  it('renders different status for review', () => {
    render(<DeskStation x={0} y={0} cat={mockCat} status="review" />);
    const statusEl = screen.getByTestId('desk-status');
    expect(statusEl).toBeInTheDocument();
  });
});

describe('DeskStation — onClick', () => {
  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<DeskStation x={0} y={0} cat={mockCat} status="busy" onClick={handleClick} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('DeskStation — speech bubble', () => {
  it('renders task speech bubble when task is provided', () => {
    render(<DeskStation x={0} y={0} cat={mockCat} status="busy" task="GREEN にする" />);
    expect(screen.getByText('GREEN にする')).toBeInTheDocument();
  });
});
