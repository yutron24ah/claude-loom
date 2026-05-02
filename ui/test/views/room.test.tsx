/**
 * RoomView TDD tests — M3.0 Phaser hybrid
 * WHY: verify the Phaser hybrid RoomView renders correctly.
 * DOM assertions are limited to the container and overlay (not sprite rendering,
 * which is Phaser-internal and cannot be verified in jsdom).
 * Phaser is mocked globally in setup.ts.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { RoomView } from '../../src/views/room/RoomView';

afterEach(() => {
  cleanup();
});

describe('RoomView — basic render', () => {
  it('renders room-canvas data-testid (required by AppShell tests)', () => {
    render(<RoomView />);
    expect(screen.getByTestId('room-canvas')).toBeInTheDocument();
  });

  it('renders with custom width and height props', () => {
    const { container } = render(<RoomView width={1080} height={660} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('RoomView — Phaser canvas mount', () => {
  it('renders the Phaser canvas container inside room-canvas', () => {
    const { container } = render(<RoomView />);
    // PhaserCanvas renders a div with style.width
    const canvas = container.querySelector('[data-testid="room-canvas"]');
    expect(canvas).toBeInTheDocument();
    // PhaserCanvas inner div should be present
    expect(canvas?.firstChild).toBeTruthy();
  });

  it('does not render AgentDetailPanel when no agent is selected', () => {
    render(<RoomView />);
    // AgentDetailPanel renders a close button; it should not be present by default
    expect(screen.queryByTestId('agent-detail-close')).not.toBeInTheDocument();
  });

  it('renders AgentDetailPanel when initialSelected agent id is provided', () => {
    render(<RoomView initialSelected="pm" />);
    // AgentDetailPanel should be rendered since pm is pre-selected
    expect(screen.getByTestId('agent-detail-close')).toBeInTheDocument();
    // PM agent name (ニケ) should be visible in the panel
    expect(screen.getByText('ニケ')).toBeInTheDocument();
  });
});
