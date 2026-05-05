/**
 * DeskStation component TDD tests — M0.11.4 t6
 * WHY: verify desk station renders cat + monitor + speech bubble + nameplate + TDD tag
 * and responds correctly to all props. Design source: room.jsx L7-95.
 *
 * Test behavior, not implementation (Principle 8):
 * - Assert observable DOM/text output, not internal mapping details
 * - statusColor checked via data-testid presence / background-color attribute
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { DeskStation } from '../../../src/views/room/DeskStation';
import type { RosterEntry } from '../../../src/data/roster';

afterEach(() => {
  cleanup();
});

// Minimal RosterEntry fixture for testing
const testCat: RosterEntry = {
  id: 'dev',
  role: 'Developer',
  jp: 'デベロッパー',
  name: 'サバ',
  breed: 'サバトラ',
  quote: 'RED → GREEN',
  hat: 'headband',
  fur: '#b8a98c',
  cheek: '#f4a3b3',
  group: 'core',
};

// ---------------------------------------------------------------------------
// Basic render
// ---------------------------------------------------------------------------
describe('DeskStation — basic render', () => {
  it('renders without crashing with required props', () => {
    const { container } = render(<DeskStation x={10} y={20} cat={testCat} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('root div has absolute position with correct left and top from x/y props', () => {
    const { container } = render(<DeskStation x={42} y={88} cat={testCat} />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.position).toBe('absolute');
    expect(root.style.left).toBe('42px');
    expect(root.style.top).toBe('88px');
  });

  it('root div has width 100px', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.width).toBe('100px');
  });
});

// ---------------------------------------------------------------------------
// Speech bubble visibility
// ---------------------------------------------------------------------------
describe('DeskStation — speech bubble', () => {
  it('does not render speech bubble when task prop is omitted', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} />);
    const bubble = container.querySelector('[data-testid="speech-bubble"]');
    expect(bubble).toBeNull();
  });

  it('renders speech bubble when task prop is provided', () => {
    const { container } = render(
      <DeskStation x={0} y={0} cat={testCat} task="writing tests" />,
    );
    const bubble = container.querySelector('[data-testid="speech-bubble"]');
    expect(bubble).not.toBeNull();
  });

  it('speech bubble contains task text', () => {
    render(<DeskStation x={0} y={0} cat={testCat} task="RED phase" />);
    expect(screen.getByText('RED phase')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Status dot — statusColor mapping (5 variants)
// ---------------------------------------------------------------------------
describe('DeskStation — status dot', () => {
  it('renders status dot element', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} status="busy" />);
    const dot = container.querySelector('[data-testid="status-dot"]');
    expect(dot).not.toBeNull();
  });

  it('status=busy uses success color', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} status="busy" />);
    const dot = container.querySelector('[data-testid="status-dot"]') as HTMLElement;
    expect(dot.style.background).toBe('var(--p-success)');
  });

  it('status=idle uses stone color', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} status="idle" />);
    const dot = container.querySelector('[data-testid="status-dot"]') as HTMLElement;
    expect(dot.style.background).toBe('var(--p-stone)');
  });

  it('status=review uses accent color', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} status="review" />);
    const dot = container.querySelector('[data-testid="status-dot"]') as HTMLElement;
    expect(dot.style.background).toBe('var(--p-accent)');
  });

  it('status=fail uses error color', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} status="fail" />);
    const dot = container.querySelector('[data-testid="status-dot"]') as HTMLElement;
    expect(dot.style.background).toBe('var(--p-error)');
  });

  it('status=tdd uses warn color', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} status="tdd" />);
    const dot = container.querySelector('[data-testid="status-dot"]') as HTMLElement;
    expect(dot.style.background).toBe('var(--p-warn)');
  });
});

// ---------------------------------------------------------------------------
// Monitor screen — fail vs normal
// ---------------------------------------------------------------------------
describe('DeskStation — monitor screen', () => {
  it('monitor screen has screen bg when status is not fail', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} status="busy" />);
    const screen = container.querySelector('[data-testid="monitor-screen"]') as HTMLElement;
    expect(screen.style.background).toBe('var(--p-screen)');
  });

  it('monitor screen has error bg when status=fail', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} status="fail" />);
    const monitorScreen = container.querySelector('[data-testid="monitor-screen"]') as HTMLElement;
    expect(monitorScreen.style.background).toBe('var(--p-error)');
  });
});

// ---------------------------------------------------------------------------
// selected prop — outline
// ---------------------------------------------------------------------------
describe('DeskStation — selected prop', () => {
  it('button has no outline when selected=false (default)', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} />);
    const btn = container.querySelector('button') as HTMLButtonElement;
    expect(btn.style.outline).toBe('none');
  });

  it('button has accent outline when selected=true', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} selected={true} />);
    const btn = container.querySelector('button') as HTMLButtonElement;
    expect(btn.style.outline).toBe('3px solid var(--p-accent)');
  });
});

// ---------------------------------------------------------------------------
// onClick
// ---------------------------------------------------------------------------
describe('DeskStation — onClick', () => {
  it('calls onClick when button is clicked', () => {
    const onClick = vi.fn();
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} onClick={onClick} />);
    const btn = container.querySelector('button') as HTMLButtonElement;
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not throw when onClick is not provided and button is clicked', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} />);
    const btn = container.querySelector('button') as HTMLButtonElement;
    expect(() => fireEvent.click(btn)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// TDD phase tag
// ---------------------------------------------------------------------------
describe('DeskStation — TDD tag', () => {
  it('does not render TDD tag when tdd prop is omitted', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} />);
    const tag = container.querySelector('[data-testid="tdd-tag"]');
    expect(tag).toBeNull();
  });

  it('renders TDD tag when tdd prop is provided', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} tdd="GREEN" />);
    const tag = container.querySelector('[data-testid="tdd-tag"]');
    expect(tag).not.toBeNull();
  });

  it('TDD tag shows the tdd prop text', () => {
    render(<DeskStation x={0} y={0} cat={testCat} tdd="RED" />);
    expect(screen.getByText('RED')).toBeInTheDocument();
  });

  it('TDD tag has warn background', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} tdd="GREEN" />);
    const tag = container.querySelector('[data-testid="tdd-tag"]') as HTMLElement;
    expect(tag.style.background).toBe('var(--p-warn)');
  });
});

// ---------------------------------------------------------------------------
// Nameplate — cat.name + label/role
// ---------------------------------------------------------------------------
describe('DeskStation — nameplate', () => {
  it('nameplate shows cat.name', () => {
    render(<DeskStation x={0} y={0} cat={testCat} />);
    expect(screen.getByText('サバ')).toBeInTheDocument();
  });

  it('nameplate shows cat.role when label is omitted', () => {
    render(<DeskStation x={0} y={0} cat={testCat} />);
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  it('nameplate shows label prop instead of cat.role when label is provided', () => {
    render(<DeskStation x={0} y={0} cat={testCat} label="Front-end" />);
    expect(screen.getByText('Front-end')).toBeInTheDocument();
    expect(screen.queryByText('Developer')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deskColor prop — desk top background
// ---------------------------------------------------------------------------
describe('DeskStation — deskColor prop', () => {
  it('desk top uses var(--p-wood) by default', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} />);
    const desk = container.querySelector('[data-testid="desk-top"]') as HTMLElement;
    expect(desk.style.background).toBe('var(--p-wood)');
  });

  it('desk top uses custom deskColor when provided', () => {
    const { container } = render(
      <DeskStation x={0} y={0} cat={testCat} deskColor="var(--p-accent)" />,
    );
    const desk = container.querySelector('[data-testid="desk-top"]') as HTMLElement;
    expect(desk.style.background).toBe('var(--p-accent)');
  });
});

// ---------------------------------------------------------------------------
// CatSprite props — sleep + pose based on status
// ---------------------------------------------------------------------------
describe('DeskStation — CatSprite integration', () => {
  it('renders CatSprite SVG', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  // WHY: idle status means sleeping cat (sleep=true → sleep eye lines rendered)
  // sit pose with sleep renders ~30 rects; work pose renders fewer (no tail curl)
  it('status=idle renders more SVG rects (sit+sleep) than status=busy (work pose)', () => {
    const { container: idleContainer } = render(
      <DeskStation x={0} y={0} cat={testCat} status="idle" />,
    );
    const { container: busyContainer } = render(
      <DeskStation x={0} y={0} cat={testCat} status="busy" />,
    );
    const idleRects = idleContainer.querySelectorAll('svg rect').length;
    const busyRects = busyContainer.querySelectorAll('svg rect').length;
    // idle (sit + sleep Z markers) has more rects than busy (work pose, no Z markers)
    expect(idleRects).toBeGreaterThan(busyRects);
  });
});
