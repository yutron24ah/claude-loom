/**
 * RetroGathering component TDD tests — M0.11.4 t11
 * WHY: verify retro mode layout renders floor cushion, whiteboard center,
 * 13 perimeter cats with correct names, talk bubbles, selection, and
 * children injection for RetroView.
 *
 * Test behavior, not implementation (Principle 8):
 * - Assert observable DOM output (text, styles, attributes)
 * - Do not test internal perimeter config array structure
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { RetroGathering } from '../../../src/views/room/RetroGathering';

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Basic render
// ---------------------------------------------------------------------------
describe('RetroGathering — basic render', () => {
  it('renders without crashing with required props', () => {
    const { container } = render(
      <RetroGathering width={1080} height={760} sel={null} setSel={vi.fn()} />,
    );
    expect(container.firstChild).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Floor cushion
// ---------------------------------------------------------------------------
describe('RetroGathering — floor cushion', () => {
  it('renders an element with class room-floor-cushion', () => {
    const { container } = render(
      <RetroGathering width={1080} height={760} sel={null} setSel={vi.fn()} />,
    );
    const cushion = container.querySelector('.room-floor-cushion');
    expect(cushion).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Whiteboard center
// ---------------------------------------------------------------------------
describe('RetroGathering — whiteboard', () => {
  it('renders whiteboard wrapper with absolute position', () => {
    const { container } = render(
      <RetroGathering width={1080} height={760} sel={null} setSel={vi.fn()} />,
    );
    const board = container.querySelector('[data-testid="whiteboard"]') as HTMLElement;
    expect(board).not.toBeNull();
    expect(board.style.position).toBe('absolute');
  });

  it('whiteboard has boardLeft=40 and boardTop=130', () => {
    const { container } = render(
      <RetroGathering width={1080} height={760} sel={null} setSel={vi.fn()} />,
    );
    const board = container.querySelector('[data-testid="whiteboard"]') as HTMLElement;
    expect(board.style.left).toBe('40px');
    expect(board.style.top).toBe('130px');
  });

  it('whiteboard width = width - 80', () => {
    const { container } = render(
      <RetroGathering width={1080} height={760} sel={null} setSel={vi.fn()} />,
    );
    const board = container.querySelector('[data-testid="whiteboard"]') as HTMLElement;
    expect(board.style.width).toBe('1000px');
  });

  it('renders top tray with wood-dark background', () => {
    const { container } = render(
      <RetroGathering width={1080} height={760} sel={null} setSel={vi.fn()} />,
    );
    const tray = container.querySelector('[data-testid="whiteboard-tray-top"]') as HTMLElement;
    expect(tray).not.toBeNull();
    expect(tray.style.background).toBe('var(--p-wood-dark)');
  });

  it('renders bottom tray with wood-dark background', () => {
    const { container } = render(
      <RetroGathering width={1080} height={760} sel={null} setSel={vi.fn()} />,
    );
    const tray = container.querySelector('[data-testid="whiteboard-tray-bottom"]') as HTMLElement;
    expect(tray).not.toBeNull();
    expect(tray.style.background).toBe('var(--p-wood-dark)');
  });

  it('shows RetroView loading placeholder when no children provided', () => {
    render(
      <RetroGathering width={1080} height={760} sel={null} setSel={vi.fn()} />,
    );
    expect(screen.getByText('RetroView loading…')).toBeInTheDocument();
  });

  it('renders children instead of placeholder when children is provided', () => {
    render(
      <RetroGathering width={1080} height={760} sel={null} setSel={vi.fn()}>
        <div>Injected RetroView</div>
      </RetroGathering>,
    );
    expect(screen.getByText('Injected RetroView')).toBeInTheDocument();
    expect(screen.queryByText('RetroView loading…')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Perimeter cats — 13 total
// ---------------------------------------------------------------------------
describe('RetroGathering — perimeter cats (13 total)', () => {
  const allCatNames = [
    // top row (2)
    'ヨミ',    // retro-pm
    'アマ',    // retro-counter
    // bottom row (11)
    'ニケ',    // pm
    'サバ',    // dev
    'サグ',    // retro-research
    'リケ',    // retro-pj
    'リズ',    // retro-proc
    'オウル',  // retro-meta
    'マル',    // retro-agg
    'ハカセ',  // rev
    'ペン',    // rev-code
    'メメ',    // rev-test
    'シノビ',  // rev-sec
  ];

  allCatNames.forEach((name) => {
    it(`renders cat with name "${name}"`, () => {
      render(
        <RetroGathering width={1080} height={760} sel={null} setSel={vi.fn()} />,
      );
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it('renders exactly 13 perimeter cat buttons', () => {
    const { container } = render(
      <RetroGathering width={1080} height={760} sel={null} setSel={vi.fn()} />,
    );
    // Each PerimeterCat renders a button
    const buttons = container.querySelectorAll('button[data-testid^="perimeter-cat-"]');
    expect(buttons.length).toBe(13);
  });
});

// ---------------------------------------------------------------------------
// Talk bubbles
// ---------------------------------------------------------------------------
describe('RetroGathering — talk bubbles', () => {
  it('retro-pm has talk bubble text', () => {
    render(
      <RetroGathering width={1080} height={760} sel={null} setSel={vi.fn()} />,
    );
    expect(screen.getByText('じゃあ始めるよ〜')).toBeInTheDocument();
  });

  it('retro-counter has talk bubble text', () => {
    render(
      <RetroGathering width={1080} height={760} sel={null} setSel={vi.fn()} />,
    );
    expect(screen.getByText('本当にそうかな？')).toBeInTheDocument();
  });

  it('dev has talk bubble text', () => {
    render(
      <RetroGathering width={1080} height={760} sel={null} setSel={vi.fn()} />,
    );
    expect(screen.getByText('...聞いてる')).toBeInTheDocument();
  });

  it('retro-proc has talk bubble text', () => {
    render(
      <RetroGathering width={1080} height={760} sel={null} setSel={vi.fn()} />,
    );
    expect(screen.getByText('TDD red 順序ズレ')).toBeInTheDocument();
  });

  it('retro-meta has talk bubble text', () => {
    render(
      <RetroGathering width={1080} height={760} sel={null} setSel={vi.fn()} />,
    );
    expect(screen.getByText('仕組みを疑おう')).toBeInTheDocument();
  });

  it('talk bubble has paper background', () => {
    const { container } = render(
      <RetroGathering width={1080} height={760} sel={null} setSel={vi.fn()} />,
    );
    const bubbles = container.querySelectorAll('[data-testid="talk-bubble"]');
    expect(bubbles.length).toBeGreaterThan(0);
    const firstBubble = bubbles[0] as HTMLElement;
    expect(firstBubble.style.background).toBe('var(--p-paper)');
  });
});

// ---------------------------------------------------------------------------
// Selected outline
// ---------------------------------------------------------------------------
describe('RetroGathering — selected outline', () => {
  it('selected cat button shows accent outline', () => {
    const { container } = render(
      <RetroGathering width={1080} height={760} sel="retro-pm" setSel={vi.fn()} />,
    );
    // retro-pm button should have accent outline
    const selectedBtn = container.querySelector(
      '[data-testid="perimeter-cat-retro-pm"]',
    ) as HTMLElement;
    expect(selectedBtn).not.toBeNull();
    expect(selectedBtn.style.outline).toBe('3px solid var(--p-accent)');
  });

  it('non-selected cat button has no outline', () => {
    const { container } = render(
      <RetroGathering width={1080} height={760} sel="retro-pm" setSel={vi.fn()} />,
    );
    const nonSelectedBtn = container.querySelector(
      '[data-testid="perimeter-cat-dev"]',
    ) as HTMLElement;
    expect(nonSelectedBtn).not.toBeNull();
    expect(nonSelectedBtn.style.outline).toBe('none');
  });

  it('no cats have outline when sel is null', () => {
    const { container } = render(
      <RetroGathering width={1080} height={760} sel={null} setSel={vi.fn()} />,
    );
    const buttons = container.querySelectorAll('button[data-testid^="perimeter-cat-"]');
    buttons.forEach((btn) => {
      expect((btn as HTMLElement).style.outline).toBe('none');
    });
  });
});

// ---------------------------------------------------------------------------
// onClick — setSel called
// ---------------------------------------------------------------------------
describe('RetroGathering — onClick / setSel', () => {
  it('clicking an unselected cat calls setSel with cat id', () => {
    const setSel = vi.fn();
    const { container } = render(
      <RetroGathering width={1080} height={760} sel={null} setSel={setSel} />,
    );
    const btn = container.querySelector(
      '[data-testid="perimeter-cat-pm"]',
    ) as HTMLButtonElement;
    fireEvent.click(btn);
    expect(setSel).toHaveBeenCalledWith('pm');
  });

  it('clicking a selected cat calls setSel with null (deselect)', () => {
    const setSel = vi.fn();
    const { container } = render(
      <RetroGathering width={1080} height={760} sel="pm" setSel={setSel} />,
    );
    const btn = container.querySelector(
      '[data-testid="perimeter-cat-pm"]',
    ) as HTMLButtonElement;
    fireEvent.click(btn);
    expect(setSel).toHaveBeenCalledWith(null);
  });
});
