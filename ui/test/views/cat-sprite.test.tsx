/**
 * CatSprite TDD tests — Red phase (Task 9 Subagent A)
 * WHY: verify SVG pixel-art cat renders correctly with various props.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CatSprite } from '../../src/views/room/CatSprite';

afterEach(() => {
  cleanup();
});

describe('CatSprite — basic render', () => {
  it('renders an svg element', () => {
    const { container } = render(<CatSprite />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies size prop to svg width and height', () => {
    const { container } = render(<CatSprite size={32} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
  });
});

describe('CatSprite — scroll prop', () => {
  it('renders scroll icon (data-testid=cat-scroll) when scroll=true', () => {
    render(<CatSprite scroll={true} data-testid="cat-with-scroll" />);
    expect(screen.getByTestId('cat-scroll')).toBeInTheDocument();
  });

  it('does NOT render scroll icon when scroll=false', () => {
    render(<CatSprite scroll={false} />);
    expect(screen.queryByTestId('cat-scroll')).not.toBeInTheDocument();
  });
});

describe('CatSprite — sleep prop', () => {
  it('renders sleep indicator (data-testid=cat-sleep) when sleep=true', () => {
    render(<CatSprite sleep={true} />);
    expect(screen.getByTestId('cat-sleep')).toBeInTheDocument();
  });
});
