/**
 * CharSheet TDD tests — Red phase (Task 9 Subagent A) + M0.11.4 t15 RPG style
 * WHY: verify character sheet renders all 13 agents with names,
 * and that RPG design tokens (rpg-frame, rpg-title, chip) are applied.
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
    // M0.18 Phase 0: 'retro' group split into 'retro-lens' + 'retro-stage'
    render(<CharSheet />);
    expect(screen.getByText('CORE')).toBeInTheDocument();
    expect(screen.getByText('REVIEWERS')).toBeInTheDocument();
    expect(screen.getByText('RETRO LENSES')).toBeInTheDocument();
    expect(screen.getByText('RETRO STAGES')).toBeInTheDocument();
  });
});

describe('CharSheet — RPG design tokens (M0.11.4 t15)', () => {
  it('wraps the outer container in rpg-frame class', () => {
    render(<CharSheet />);
    const frame = document.querySelector('.rpg-frame');
    expect(frame).toBeTruthy();
  });

  it('renders the sheet title with rpg-title class', () => {
    render(<CharSheet />);
    const title = document.querySelector('.rpg-title');
    expect(title).toBeTruthy();
    expect(title?.textContent).toMatch(/13 agent/);
  });

  it('renders CatSprite for each agent card (data-testid=cat-sprite)', () => {
    render(<CharSheet />);
    const sprites = screen.getAllByTestId('cat-sprite');
    expect(sprites.length).toBeGreaterThanOrEqual(13);
  });
});
