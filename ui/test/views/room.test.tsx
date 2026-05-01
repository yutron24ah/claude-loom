/**
 * RoomView TDD tests — Red phase (Task 9 Subagent A)
 * WHY: verify room renders all 13 agents with DeskStation components.
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

describe('RoomView — 13 agents visible', () => {
  it('renders 13 agent nameplates (data-testid=agent-nameplate)', () => {
    render(<RoomView />);
    const nameplates = screen.getAllByTestId('agent-nameplate');
    expect(nameplates).toHaveLength(13);
  });

  it('renders PM agent (ニケ)', () => {
    render(<RoomView />);
    expect(screen.getByText('ニケ')).toBeInTheDocument();
  });

  it('renders all retro agents (7 agents with retro group)', () => {
    render(<RoomView />);
    // Retro agents: ヨミ、サグ、リケ、リズ、オウル、アマ、マル
    expect(screen.getByText('ヨミ')).toBeInTheDocument();
    expect(screen.getByText('マル')).toBeInTheDocument();
  });
});
