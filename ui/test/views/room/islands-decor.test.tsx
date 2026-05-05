/**
 * Islands + decor components TDD tests — M0.11.4 t8
 * WHY: verify Islands (3 role zones + signs) and decor components
 * (Plant, Whiteboard, Sign, RoomWallDecor, RoomModeToggle) render
 * correct DOM structure and respond to props.
 * Design source: /tmp/claude-room-handoff/claude-room/project/room.jsx L97-128, L207-211, L311-331.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { Islands } from '../../../src/views/room/Islands';
import { Plant } from '../../../src/views/room/decor/Plant';
import { Whiteboard } from '../../../src/views/room/decor/Whiteboard';
import { Sign } from '../../../src/views/room/decor/Sign';
import { RoomWallDecor } from '../../../src/views/room/decor/RoomWallDecor';
import { RoomModeToggle } from '../../../src/views/room/decor/RoomModeToggle';

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Islands
// ---------------------------------------------------------------------------
describe('Islands — 3 island divs', () => {
  it('renders 3 island divs with role classes', () => {
    const { container } = render(<Islands width={900} height={600} />);
    expect(container.querySelector('.room-island--pm')).not.toBeNull();
    expect(container.querySelector('.room-island--dev')).not.toBeNull();
    expect(container.querySelector('.room-island--review')).not.toBeNull();
  });

  it('all 3 islands also have base room-island class', () => {
    const { container } = render(<Islands width={900} height={600} />);
    const islands = container.querySelectorAll('.room-island');
    expect(islands.length).toBe(3);
  });

  it('renders 3 island signs with correct labels', () => {
    const { container } = render(<Islands width={900} height={600} />);
    expect(container.querySelector('.room-sign--island--pm')).not.toBeNull();
    expect(container.querySelector('.room-sign--island--dev')).not.toBeNull();
    expect(container.querySelector('.room-sign--island--review')).not.toBeNull();
  });

  it('island signs contain diamond + role name text', () => {
    const { container } = render(<Islands width={900} height={600} />);
    const pmSign = container.querySelector('.room-sign--island--pm');
    expect(pmSign?.textContent).toContain('PM');
    const devSign = container.querySelector('.room-sign--island--dev');
    expect(devSign?.textContent).toContain('DEV');
    const reviewSign = container.querySelector('.room-sign--island--review');
    expect(reviewSign?.textContent).toContain('REVIEW');
  });

  it('pm island is positioned at top: 200', () => {
    const { container } = render(<Islands width={900} height={600} />);
    const pmIsland = container.querySelector('.room-island--pm') as HTMLElement | null;
    expect(pmIsland?.style.top).toBe('200px');
  });

  it('dev island is positioned at left: 40', () => {
    const { container } = render(<Islands width={900} height={600} />);
    const devIsland = container.querySelector('.room-island--dev') as HTMLElement | null;
    expect(devIsland?.style.left).toBe('40px');
  });
});

describe('Islands — visible prop', () => {
  it('renders all content when visible=true (default)', () => {
    const { container } = render(<Islands width={900} height={600} visible={true} />);
    expect(container.querySelector('.room-island')).not.toBeNull();
  });

  it('hides all islands when visible=false', () => {
    const { container } = render(<Islands width={900} height={600} visible={false} />);
    expect(container.querySelector('.room-island')).toBeNull();
    expect(container.querySelector('.room-sign--island--pm')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Plant
// ---------------------------------------------------------------------------
describe('Plant — SVG render', () => {
  it('renders an svg element', () => {
    const { container } = render(<Plant x={100} y={200} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('SVG has viewBox "0 0 16 20"', () => {
    const { container } = render(<Plant x={100} y={200} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 16 20');
  });

  it('SVG has imageRendering pixelated style', () => {
    const { container } = render(<Plant x={100} y={200} />);
    const svg = container.querySelector('svg') as SVGElement | null;
    expect(svg?.style.imageRendering).toBe('pixelated');
  });

  it('default size=1 renders width=28 height=36', () => {
    const { container } = render(<Plant x={0} y={0} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('28');
    expect(svg?.getAttribute('height')).toBe('36');
  });

  it('size=0.8 scales width and height', () => {
    const { container } = render(<Plant x={0} y={0} size={0.8} />);
    const svg = container.querySelector('svg');
    // 28 * 0.8 ≈ 22.4, 36 * 0.8 ≈ 28.8 — use parseFloat for float precision
    expect(parseFloat(svg?.getAttribute('width') ?? '0')).toBeCloseTo(22.4, 1);
    expect(parseFloat(svg?.getAttribute('height') ?? '0')).toBeCloseTo(28.8, 1);
  });

  it('renders pot rect with wood fill', () => {
    const { container } = render(<Plant x={0} y={0} />);
    const rects = Array.from(container.querySelectorAll('rect'));
    const potRect = rects.find(
      r => r.getAttribute('x') === '3' && r.getAttribute('y') === '14',
    );
    expect(potRect).not.toBeUndefined();
    expect(potRect?.getAttribute('fill')).toBe('var(--p-wood)');
  });

  it('renders leaf rects with leaf fill', () => {
    const { container } = render(<Plant x={0} y={0} />);
    const rects = Array.from(container.querySelectorAll('rect'));
    const leafRects = rects.filter(r => r.getAttribute('fill') === 'var(--p-leaf)');
    expect(leafRects.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Whiteboard
// ---------------------------------------------------------------------------
describe('Whiteboard — title + lines render', () => {
  it('renders the title text', () => {
    render(
      <Whiteboard x={10} y={20} title="PLAN BOARD" lines={[]} />,
    );
    expect(screen.getByText('PLAN BOARD')).toBeInTheDocument();
  });

  it('renders line text items', () => {
    render(
      <Whiteboard
        x={10}
        y={20}
        title="TODO"
        lines={[{ t: 'item one' }, { c: 'var(--p-success)', t: 'item two' }]}
      />,
    );
    expect(screen.getByText('item one')).toBeInTheDocument();
    expect(screen.getByText('item two')).toBeInTheDocument();
  });

  it('renders bullet squares for each line', () => {
    const { container } = render(
      <Whiteboard
        x={0}
        y={0}
        title="X"
        lines={[{ t: 'a' }, { t: 'b' }, { t: 'c' }]}
      />,
    );
    // WHY: each line has a bullet span with fixed width/height for visual dot
    const bullets = container.querySelectorAll('span[style*="width: 6px"]');
    expect(bullets.length).toBe(3);
  });

  it('uses custom bullet color when c prop provided', () => {
    const { container } = render(
      <Whiteboard
        x={0}
        y={0}
        title="X"
        lines={[{ c: 'var(--p-success)', t: 'ok' }]}
      />,
    );
    const bullet = container.querySelector('span[style*="background: var(--p-success)"]');
    expect(bullet).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Sign
// ---------------------------------------------------------------------------
describe('Sign — label + color', () => {
  it('renders label text', () => {
    render(<Sign x={0} y={0} label="branch: main" />);
    expect(screen.getByText('branch: main')).toBeInTheDocument();
  });

  it('is positioned absolutely at x/y', () => {
    const { container } = render(<Sign x={42} y={88} label="test" />);
    const el = container.firstChild as HTMLElement | null;
    expect(el?.style.left).toBe('42px');
    expect(el?.style.top).toBe('88px');
  });

  it('default color uses --p-accent as background', () => {
    const { container } = render(<Sign x={0} y={0} label="x" />);
    const el = container.firstChild as HTMLElement | null;
    expect(el?.style.background).toContain('--p-accent');
  });

  it('accepts custom color prop', () => {
    const { container } = render(<Sign x={0} y={0} label="x" color="red" />);
    const el = container.firstChild as HTMLElement | null;
    expect(el?.style.background).toBe('red');
  });
});

// ---------------------------------------------------------------------------
// RoomWallDecor
// ---------------------------------------------------------------------------
describe('RoomWallDecor — branch + clock + window', () => {
  it('renders branch sign', () => {
    const { container } = render(<RoomWallDecor width={900} />);
    expect(container.querySelector('.room-sign--branch')).not.toBeNull();
  });

  it('branch sign contains claude-loom text', () => {
    const { container } = render(<RoomWallDecor width={900} />);
    const sign = container.querySelector('.room-sign--branch');
    expect(sign?.textContent).toContain('claude-loom');
  });

  it('renders clock sign', () => {
    const { container } = render(<RoomWallDecor width={900} />);
    expect(container.querySelector('.room-sign--clock')).not.toBeNull();
  });

  it('clock sign is positioned at right side (left = width - 150)', () => {
    const { container } = render(<RoomWallDecor width={900} />);
    const clock = container.querySelector('.room-sign--clock') as HTMLElement | null;
    expect(clock?.style.left).toBe('750px');
  });

  it('renders window div with room-window class', () => {
    const { container } = render(<RoomWallDecor width={900} />);
    expect(container.querySelector('.room-window')).not.toBeNull();
  });

  it('window is positioned at left: 30 top: 32', () => {
    const { container } = render(<RoomWallDecor width={900} />);
    const win = container.querySelector('.room-window') as HTMLElement | null;
    expect(win?.style.left).toBe('30px');
    expect(win?.style.top).toBe('32px');
  });
});

// ---------------------------------------------------------------------------
// RoomModeToggle
// ---------------------------------------------------------------------------
describe('RoomModeToggle — text + toggle', () => {
  it('shows レトロ開始 text when retroMode=false', () => {
    render(
      <RoomModeToggle retroMode={false} onToggle={() => {}} width={900} />,
    );
    expect(screen.getByText(/レトロ開始/)).toBeInTheDocument();
  });

  it('shows 通常モードへ text when retroMode=true', () => {
    render(
      <RoomModeToggle retroMode={true} onToggle={() => {}} width={900} />,
    );
    expect(screen.getByText(/通常モードへ/)).toBeInTheDocument();
  });

  it('has room-mode-toggle class', () => {
    const { container } = render(
      <RoomModeToggle retroMode={false} onToggle={() => {}} width={900} />,
    );
    expect(container.querySelector('.room-mode-toggle')).not.toBeNull();
  });

  it('has room-mode-toggle--active class when retroMode=true', () => {
    const { container } = render(
      <RoomModeToggle retroMode={true} onToggle={() => {}} width={900} />,
    );
    expect(container.querySelector('.room-mode-toggle--active')).not.toBeNull();
  });

  it('does NOT have room-mode-toggle--active when retroMode=false', () => {
    const { container } = render(
      <RoomModeToggle retroMode={false} onToggle={() => {}} width={900} />,
    );
    expect(container.querySelector('.room-mode-toggle--active')).toBeNull();
  });

  it('calls onToggle when button is clicked', () => {
    const onToggle = vi.fn();
    render(
      <RoomModeToggle retroMode={false} onToggle={onToggle} width={900} />,
    );
    fireEvent.click(screen.getByText(/レトロ開始/));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// barrel export
// ---------------------------------------------------------------------------
describe('decor barrel export', () => {
  it('exports Plant, Whiteboard, Sign, RoomWallDecor, RoomModeToggle from index', async () => {
    const mod = await import('../../../src/views/room/decor/index');
    expect(mod.Plant).toBeDefined();
    expect(mod.Whiteboard).toBeDefined();
    expect(mod.Sign).toBeDefined();
    expect(mod.RoomWallDecor).toBeDefined();
    expect(mod.RoomModeToggle).toBeDefined();
  });
});
