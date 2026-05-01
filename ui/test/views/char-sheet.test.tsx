/**
 * CharSheet TDD tests — Red phase (Task 9 Subagent A)
 * WHY: verify character sheet renders all 13 agents with names.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CharSheet } from '../../src/views/char-sheet/CharSheet';

afterEach(() => {
  cleanup();
});

describe('CharSheet — basic render', () => {
  it('renders char-sheet container (data-testid=char-sheet)', () => {
    render(<CharSheet />);
    expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
  });

  it('renders the title', () => {
    render(<CharSheet />);
    expect(screen.getByText(/13 agent/)).toBeInTheDocument();
  });
});

describe('CharSheet — 13 agents visible', () => {
  it('renders all 13 agent names', () => {
    render(<CharSheet />);
    const allNames = ['ニケ', 'サバ', 'ハカセ', 'ペン', 'シノビ', 'メメ', 'ヨミ', 'サグ', 'リケ', 'リズ', 'オウル', 'アマ', 'マル'];
    for (const name of allNames) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it('renders 13 agent-card elements (data-testid=agent-card)', () => {
    render(<CharSheet />);
    const cards = screen.getAllByTestId('agent-card');
    expect(cards).toHaveLength(13);
  });

  it('renders group section headers', () => {
    render(<CharSheet />);
    expect(screen.getByText('CORE')).toBeInTheDocument();
    expect(screen.getByText('REVIEWERS')).toBeInTheDocument();
    expect(screen.getByText('RETRO BOARD')).toBeInTheDocument();
  });
});
