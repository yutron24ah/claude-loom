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
  kind: 'persistent',
  summonedBy: null,
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
// covers: DS-SPRITE-01, DS-POS-PM-01, DS-POS-DEV-01, DS-POS-REVIEW-ROW-01
describe('DeskStation — basic render', () => {
  it('renders without crashing with required props', () => {
    const { container } = render(<DeskStation x={10} y={20} cat={testCat} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('root div has correct left and top from x/y props', () => {
    // WHY: M0.17 t9 class-based port — position/width come from .desk-station CSS class.
    // Only left/top remain as inline styles (dynamic, driven by RoomView positions table).
    const { container } = render(<DeskStation x={42} y={88} cat={testCat} />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.left).toBe('42px');
    expect(root.style.top).toBe('88px');
  });

  it('root div has .desk-station class (position/sizing via CSS)', () => {
    // WHY: M0.17 t9 — position:absolute and width are now set by .desk-station class in room.css
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} />);
    const root = container.firstChild as HTMLElement;
    expect(root.classList.contains('desk-station')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Speech bubble visibility
// ---------------------------------------------------------------------------
// covers: DS-BUBBLE-TOOL-01, DS-BUBBLE-REASON-01, DS-BUBBLE-NONE-01
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
// covers: DS-STATUS-DOT-01
describe('DeskStation — status dot', () => {
  it('renders status dot element', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} status="busy" />);
    const dot = container.querySelector('[data-testid="status-dot"]');
    expect(dot).not.toBeNull();
  });

  it('status=busy applies --busy modifier class on status-dot', () => {
    // WHY: M0.17 t9 class-based port — color from .desk-station__status-dot--{status} modifier.
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} status="busy" />);
    const dot = container.querySelector('[data-testid="status-dot"]') as HTMLElement;
    expect(dot.classList.contains('desk-station__status-dot--busy')).toBe(true);
  });

  it('status=idle applies --idle modifier class on status-dot', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} status="idle" />);
    const dot = container.querySelector('[data-testid="status-dot"]') as HTMLElement;
    expect(dot.classList.contains('desk-station__status-dot--idle')).toBe(true);
  });

  it('status=review applies --review modifier class on status-dot', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} status="review" />);
    const dot = container.querySelector('[data-testid="status-dot"]') as HTMLElement;
    expect(dot.classList.contains('desk-station__status-dot--review')).toBe(true);
  });

  it('status=fail applies --fail modifier class on status-dot', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} status="fail" />);
    const dot = container.querySelector('[data-testid="status-dot"]') as HTMLElement;
    expect(dot.classList.contains('desk-station__status-dot--fail')).toBe(true);
  });

  it('status=tdd applies --tdd modifier class on status-dot', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} status="tdd" />);
    const dot = container.querySelector('[data-testid="status-dot"]') as HTMLElement;
    expect(dot.classList.contains('desk-station__status-dot--tdd')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Monitor screen — fail vs normal
// ---------------------------------------------------------------------------
// covers: DS-MONITOR-BUSY-01, DS-MONITOR-IDLE-01, DS-MONITOR-FAIL-01
describe('DeskStation — monitor screen', () => {
  it('monitor screen has .desk-station__monitor class (screen bg via CSS)', () => {
    // WHY: M0.17 t9 class-based port — background color from CSS class, not inline style.
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} status="busy" />);
    const monitor = container.querySelector('[data-testid="monitor-screen"]') as HTMLElement;
    expect(monitor.classList.contains('desk-station__monitor')).toBe(true);
  });

  it('monitor screen has --fail modifier class when status=fail', () => {
    // WHY: fail state applies .desk-station__monitor--fail modifier for red background.
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} status="fail" />);
    const monitorScreen = container.querySelector('[data-testid="monitor-screen"]') as HTMLElement;
    expect(monitorScreen.classList.contains('desk-station__monitor--fail')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selected prop — outline
// ---------------------------------------------------------------------------
describe('DeskStation — selected prop', () => {
  it('button has .desk-station__btn class without --selected modifier when selected=false (default)', () => {
    // WHY: M0.17 t9 class-based port — outline via .desk-station__btn--selected CSS modifier.
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} />);
    const btn = container.querySelector('button') as HTMLButtonElement;
    expect(btn.classList.contains('desk-station__btn')).toBe(true);
    expect(btn.classList.contains('desk-station__btn--selected')).toBe(false);
  });

  it('button has .desk-station__btn--selected modifier when selected=true', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} selected={true} />);
    const btn = container.querySelector('button') as HTMLButtonElement;
    expect(btn.classList.contains('desk-station__btn--selected')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// onClick
// ---------------------------------------------------------------------------
// covers: DS-CLICK-SELECT-01, DS-CLICK-DESELECT-01
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
// covers: DS-TDD-TAG-01
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

  it('TDD tag has .desk-station__tdd class (background via CSS)', () => {
    // WHY: M0.17 t9 — background now set by .desk-station__tdd CSS class in room.css.
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} tdd="GREEN" />);
    const tag = container.querySelector('[data-testid="tdd-tag"]') as HTMLElement;
    expect(tag.classList.contains('desk-station__tdd')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Nameplate — cat.name + label/role
// ---------------------------------------------------------------------------
// covers: DS-NAMEPLATE-01
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
// desk-top class — desk top element (M0.17 t9: deskColor prop removed)
// ---------------------------------------------------------------------------
describe('DeskStation — desk-top element', () => {
  it('desk top element renders with .desk-station__top class', () => {
    // WHY: M0.17 t9 — deskColor prop removed; desk background is now --desk-surface
    // CSS variable set in room.css. data-testid preserved for regression detection.
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} />);
    const desk = container.querySelector('[data-testid="desk-top"]') as HTMLElement;
    expect(desk).not.toBeNull();
    expect(desk.classList.contains('desk-station__top')).toBe(true);
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

// ---------------------------------------------------------------------------
// walkTo prop — cat-walker animation wiring [REQ-091]
// covers: DS-WALK-01
// WHY: M0.17 t12 — DeskStation must accept walkTo prop and inject .cat-walker
// class + --walk-dx / --walk-dy CSS vars on the root element so shell.css
// @keyframes cat-walk-trip can drive the animation. Design source:
// redesign/screens/room.jsx L51-52 (Desk component, cat-walker class injection).
// ---------------------------------------------------------------------------
describe('DeskStation — walkTo prop', () => {
  it('does NOT add .cat-walker class when walkTo is undefined', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} />);
    const root = container.firstChild as HTMLElement;
    expect(root.classList.contains('cat-walker')).toBe(false);
  });

  it('adds .cat-walker class to root when walkTo is provided', () => {
    const { container } = render(
      <DeskStation x={0} y={0} cat={testCat} walkTo={{ dx: 100, dy: 50 }} />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.classList.contains('cat-walker')).toBe(true);
  });

  it('injects --walk-dx CSS variable when walkTo is provided', () => {
    const { container } = render(
      <DeskStation x={0} y={0} cat={testCat} walkTo={{ dx: 100, dy: 50 }} />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.style.getPropertyValue('--walk-dx')).toBe('100px');
  });

  it('injects --walk-dy CSS variable when walkTo is provided', () => {
    const { container } = render(
      <DeskStation x={0} y={0} cat={testCat} walkTo={{ dx: 100, dy: 50 }} />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.style.getPropertyValue('--walk-dy')).toBe('50px');
  });

  it('does NOT inject --walk-dx / --walk-dy when walkTo is undefined', () => {
    const { container } = render(<DeskStation x={0} y={0} cat={testCat} />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.getPropertyValue('--walk-dx')).toBe('');
    expect(root.style.getPropertyValue('--walk-dy')).toBe('');
  });
});
