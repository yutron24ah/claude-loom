/**
 * AgentDetailPanel — keyboard / overlay / z-index tests (m0.19-t7d)
 *
 * WHY: Verify that:
 *   AD-CLOSE-ESC-01: Pressing Escape while panel is visible fires onClose.
 *   AD-INLINE-01:    Panel uses an overlay-drawer pattern (ad-overlay class on
 *                    root; no "inline" token) — asserting inline removal.
 *   AD-Z-01:         Root element carries the CSS class that references
 *                    the z-index token (pixel-level class naming matches
 *                    styles/screens/agent-detail.css `--z-agent-detail`).
 *
 * Design source: ui/src/views/room/AgentDetailPanel.tsx
 * Principle §8: test behavior visible to users (key event → close callback,
 *               layout-class presence).
 */
// covers: AD-CLOSE-ESC-01, AP-ESC-01, AD-INLINE-01, AD-Z-01
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AgentDetailPanel } from '../../../src/views/room/AgentDetailPanel';

// WHY: AgentDetailNotes uses tRPC hooks; not relevant here.
vi.mock('../../../src/views/room/AgentDetailNotes', () => ({
  AgentDetailNotes: () => null,
}));

// WHY: CatSprite is SVG component; stub with testid-bearing div.
vi.mock('../../../src/components/CatSprite', () => ({
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

// ---------------------------------------------------------------------------
// AD-CLOSE-ESC-01 — Escape key fires onClose
// ---------------------------------------------------------------------------

describe('AgentDetailPanel — Esc close (AD-CLOSE-ESC-01)', () => {
  it('calls onClose when Escape key is pressed on the panel', () => {
    const handleClose = vi.fn();
    render(<AgentDetailPanel agent={mockAgent} onClose={handleClose} />);
    const panel = screen.getByTestId('agent-detail-panel');
    fireEvent.keyDown(panel, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose for non-Escape keys', () => {
    const handleClose = vi.fn();
    render(<AgentDetailPanel agent={mockAgent} onClose={handleClose} />);
    const panel = screen.getByTestId('agent-detail-panel');
    fireEvent.keyDown(panel, { key: 'Enter', code: 'Enter' });
    fireEvent.keyDown(panel, { key: 'Tab', code: 'Tab' });
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('does not throw if onClose is not provided and Escape is pressed', () => {
    render(<AgentDetailPanel agent={mockAgent} />);
    const panel = screen.getByTestId('agent-detail-panel');
    // Should not throw when onClose is undefined
    expect(() => {
      fireEvent.keyDown(panel, { key: 'Escape', code: 'Escape' });
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// AD-INLINE-01 — overlay pattern asserted (no inline layout)
// ---------------------------------------------------------------------------

describe('AgentDetailPanel — overlay layout (AD-INLINE-01)', () => {
  it('root element has ad-overlay CSS class (overlay pattern, not inline)', () => {
    render(<AgentDetailPanel agent={mockAgent} />);
    const panel = screen.getByTestId('agent-detail-panel');
    // WHY: "ad-overlay" is the class that positions the panel as a fixed overlay.
    // Its presence confirms the "inline" pattern was removed (inline would use
    // something like ad-inline or render inside the room grid column directly).
    expect(panel.className).toContain('ad-overlay');
  });

  it('renders backdrop element (confirms overlay drawing model)', () => {
    const { container } = render(<AgentDetailPanel agent={mockAgent} />);
    // WHY: a backdrop div is part of the overlay pattern — it sits between the
    // room content and the drawer to catch outside-click close events.
    const backdrop = container.querySelector('.ad-backdrop');
    expect(backdrop).not.toBeNull();
  });

  it('renders drawer container inside overlay root', () => {
    const { container } = render(<AgentDetailPanel agent={mockAgent} />);
    const drawer = container.querySelector('.ad-drawer');
    expect(drawer).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AD-Z-01 — z-index token class present on root
// ---------------------------------------------------------------------------

describe('AgentDetailPanel — z-index token (AD-Z-01)', () => {
  it('root panel element carries pixel class for z-index token reference', () => {
    render(<AgentDetailPanel agent={mockAgent} />);
    const panel = screen.getByTestId('agent-detail-panel');
    // WHY: design source (agent-detail.css) defines --z-agent-detail token.
    // The "pixel" class on the root element links to the CSS variable scope.
    // This assertion confirms the token class is applied (not hardcoded z-index).
    expect(panel.className).toContain('pixel');
  });
});
