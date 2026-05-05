/**
 * RoomView TDD tests — M0.11.4 DOM/SVG rewrite
 * WHY: verify the DOM/SVG RoomView renders correctly.
 * Phaser has been fully removed (M0.11.4 t17). RoomView is now DOM/SVG-only.
 * WHY mock AgentDetailNotes: M3.2 t3 added notes sub-component which uses tRPC hooks.
 * RoomView tests focus on the room container and panel visibility, not notes behavior.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';

// WHY: AgentDetailNotes uses tRPC hooks which require provider context.
// RoomView tests focus on canvas and panel visibility, not notes — mock away.
vi.mock('../../src/views/room/AgentDetailNotes', () => ({
  AgentDetailNotes: () => null,
}));
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

describe('RoomView — DOM/SVG canvas content', () => {
  it('renders children inside room-canvas', () => {
    const { container } = render(<RoomView />);
    // WHY: room-canvas wrapper has DOM/SVG children (RoomBackground + decor layers)
    const canvas = container.querySelector('[data-testid="room-canvas"]');
    expect(canvas).toBeInTheDocument();
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
    // PM agent detail panel should be visible (data-testid is unambiguous)
    expect(screen.getByTestId('agent-detail-panel')).toBeInTheDocument();
  });
});
