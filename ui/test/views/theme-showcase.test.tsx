/**
 * ThemeShowcase TDD tests — M0.11.4 t15 RED
 * WHY: new component displaying 3 theme palettes (default/dusk/night) as swatches.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ThemeShowcase } from '../../src/views/char-sheet/ThemeShowcase';

afterEach(() => {
  cleanup();
});

describe('ThemeShowcase — basic render', () => {
  it('renders theme-showcase container (data-testid=theme-showcase)', () => {
    render(<ThemeShowcase />);
    expect(screen.getByTestId('theme-showcase')).toBeInTheDocument();
  });

  it('renders title with rpg-title class', () => {
    render(<ThemeShowcase />);
    const title = document.querySelector('.rpg-title');
    expect(title).toBeTruthy();
  });
});

describe('ThemeShowcase — 3 theme columns (M0.11.4 t15)', () => {
  it('wraps container in rpg-frame class', () => {
    render(<ThemeShowcase />);
    const frame = document.querySelector('.rpg-frame');
    expect(frame).toBeTruthy();
  });

  it('renders 3 theme cards (data-testid=theme-card)', () => {
    render(<ThemeShowcase />);
    const cards = screen.getAllByTestId('theme-card');
    expect(cards).toHaveLength(3);
  });

  it('renders theme names for all 3 palettes', () => {
    render(<ThemeShowcase />);
    // Use getAllByText since the subtitle also contains "noon"
    expect(screen.getAllByText(/noon/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/dusk/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/night/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders swatch elements inside theme cards', () => {
    render(<ThemeShowcase />);
    const swatches = document.querySelectorAll('[data-testid="color-swatch"]');
    expect(swatches.length).toBeGreaterThanOrEqual(6);
  });
});
