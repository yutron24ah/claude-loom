/**
 * AgentDetailPanel TDD tests — M0.11.4 t10 extension
 * WHY: verify panel renders agent data and onClose fires.
 * WHY mock AgentDetailNotes: M3.2 t3 added notes sub-component which uses tRPC hooks.
 * WHY mock CatSprite: SVG pixel rendering not needed for structure tests.
 * AgentDetailPanel tests focus on panel structure, not notes/sprite behavior.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AgentDetailPanel } from '../../src/views/room/AgentDetailPanel';

// WHY: AgentDetailNotes uses tRPC hooks which require provider context.
// Panel tests focus on panel structure, not notes — mock away the sub-component.
vi.mock('../../src/views/room/AgentDetailNotes', () => ({
  AgentDetailNotes: () => null,
}));

// WHY: CatSprite is SVG component; use a testid-bearing stub for structure assertions.
vi.mock('../../src/components/CatSprite', () => ({
  CatSprite: ({ size }: { size?: number }) => (
    <div data-testid="cat-sprite" data-size={size} />
  ),
}));

afterEach(() => {
  cleanup();
});

const mockAgent = {
  id: 'dev',
  kind: 'persistent' as const,
  summonedBy: null,
  name: 'サバ',
  role: 'Developer',
  jp: 'デベロッパー',
  breed: 'サバトラ',
  quote: 'RED → GREEN、まず落とすの。',
  hat: 'headband' as const,
  fur: '#b8a98c',
  cheek: '#f4a3b3',
  group: 'core' as const,
};

// covers: AD-PROFILE-01, AD-OPEN-DEEPLINK-01
describe('AgentDetailPanel — basic render', () => {
  it('renders agent name', () => {
    render(<AgentDetailPanel agent={mockAgent} />);
    expect(screen.getByText('サバ')).toBeInTheDocument();
  });

  it('renders agent role', () => {
    render(<AgentDetailPanel agent={mockAgent} />);
    expect(screen.getByText(/Developer/)).toBeInTheDocument();
  });

  it('renders agent quote', () => {
    render(<AgentDetailPanel agent={mockAgent} />);
    // WHY: use getAllByText since the default currentTask also contains "RED → GREEN";
    // we assert at least one matching element is present.
    const matches = screen.getAllByText(/RED → GREEN/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});

// covers: AD-CLOSE-X-01
describe('AgentDetailPanel — onClose', () => {
  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<AgentDetailPanel agent={mockAgent} onClose={handleClose} />);
    const closeBtn = screen.getByTestId('agent-detail-close');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// M0.11.4 t10 — RPG-style design assertions (new, RED phase)
// ---------------------------------------------------------------------------

describe('AgentDetailPanel — RPG-style design (M0.11.4 t10)', () => {
  it('wraps content in rpg-frame class', () => {
    render(<AgentDetailPanel agent={mockAgent} />);
    const panel = screen.getByTestId('agent-detail-panel');
    expect(panel.className).toContain('rpg-frame');
  });

  it('renders CatSprite with size >= 64', () => {
    render(<AgentDetailPanel agent={mockAgent} />);
    const sprite = screen.getByTestId('cat-sprite');
    expect(sprite).toBeInTheDocument();
    const size = Number(sprite.getAttribute('data-size'));
    expect(size).toBeGreaterThanOrEqual(64);
  });

  it('renders agent jp name (Japanese role text)', () => {
    render(<AgentDetailPanel agent={mockAgent} />);
    expect(screen.getByText(/デベロッパー/)).toBeInTheDocument();
  });

  it('renders agent breed', () => {
    render(<AgentDetailPanel agent={mockAgent} />);
    expect(screen.getByText(/サバトラ/)).toBeInTheDocument();
  });

  it('renders quote with Japanese quotation marks', () => {
    render(<AgentDetailPanel agent={mockAgent} />);
    // quote is wrapped in 「」 marks per design source
    expect(screen.getByText(/「.*RED.*」/)).toBeInTheDocument();
  });
});
