/**
 * RoomView TDD tests — M0.11.4 t12 DOM/SVG orchestration
 *
 * WHY: Full rewrite from Phaser hybrid tests (M3.0) to DOM/SVG orchestration tests.
 * Tests verify that all Phase B components are orchestrated correctly in RoomView,
 * state transitions work, and overlays appear on correct interactions.
 *
 * Phaser-internal canvas rendering is no longer tested here — replaced by DOM assertions.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';

// WHY: AgentDetailNotes uses tRPC hooks which require provider context.
// RoomView tests focus on layout and panel visibility, not notes — mock away.
vi.mock('../../../src/views/room/AgentDetailNotes', () => ({
  AgentDetailNotes: () => null,
}));

import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { RoomView } from '../../../src/views/room/RoomView';

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Basic render
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Phase B components rendered in normal mode
// ---------------------------------------------------------------------------
describe('RoomView — Phase B components (normal mode)', () => {
  it('renders RoomBackground SVG', () => {
    const { container } = render(<RoomView width={1080} height={660} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders RoomWallDecor: branch sign + clock sign + window', () => {
    render(<RoomView width={1080} height={660} />);
    expect(screen.getByText(/claude-loom — branch/)).toBeInTheDocument();
    expect(screen.getByText(/14:23 JST/)).toBeInTheDocument();
    // window div with class room-window
    const { container } = render(<RoomView width={1080} height={660} />);
    expect(container.querySelector('.room-window')).toBeInTheDocument();
  });

  it('renders GanttPoster wall poster', () => {
    render(<RoomView width={1080} height={660} />);
    expect(screen.getByTestId('gantt-poster')).toBeInTheDocument();
  });

  it('renders PlanPoster wall poster', () => {
    render(<RoomView width={1080} height={660} />);
    expect(screen.getByTestId('plan-poster')).toBeInTheDocument();
  });

  it('renders ConsistencyPoster wall poster', () => {
    render(<RoomView width={1080} height={660} />);
    expect(screen.getByTestId('consistency-poster')).toBeInTheDocument();
  });

  it('renders Islands (role zone floors)', () => {
    const { container } = render(<RoomView width={1080} height={660} />);
    expect(container.querySelector('.room-island--pm')).toBeInTheDocument();
    expect(container.querySelector('.room-island--dev')).toBeInTheDocument();
    expect(container.querySelector('.room-island--review')).toBeInTheDocument();
  });

  it('renders 6 DeskStation components (pm + dev + rev + rev-code + rev-test + rev-sec)', () => {
    const { container } = render(<RoomView width={1080} height={660} />);
    // Each DeskStation renders a monitor-screen testid
    const monitors = container.querySelectorAll('[data-testid="monitor-screen"]');
    expect(monitors).toHaveLength(6);
  });

  it('renders 2 SubroomClone ghost cats', () => {
    const { container } = render(<RoomView width={1080} height={660} />);
    const clones = container.querySelectorAll('.subroom-clone');
    expect(clones).toHaveLength(2);
  });

  it('renders Plant decor (at least 2 plants)', () => {
    const { container } = render(<RoomView width={1080} height={660} />);
    // Each Plant renders an svg with viewBox="0 0 16 20"
    const plantSvgs = Array.from(container.querySelectorAll('svg')).filter(
      (s) => s.getAttribute('viewBox') === '0 0 16 20',
    );
    expect(plantSvgs.length).toBeGreaterThanOrEqual(2);
  });

  it('renders RoomModeToggle button', () => {
    render(<RoomView width={1080} height={660} />);
    expect(screen.getByText('🔮 レトロ開始')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Agent click → AgentDetailPanel overlay
// ---------------------------------------------------------------------------
describe('RoomView — agent click → AgentDetailPanel overlay', () => {
  it('does not render AgentDetailPanel by default', () => {
    render(<RoomView width={1080} height={660} />);
    expect(screen.queryByTestId('agent-detail-panel')).not.toBeInTheDocument();
  });

  it('shows AgentDetailPanel when initialSelected is provided', () => {
    render(<RoomView width={1080} height={660} initialSelected="pm" />);
    expect(screen.getByTestId('agent-detail-panel')).toBeInTheDocument();
  });

  it('clicking a DeskStation button shows AgentDetailPanel overlay', () => {
    const { container } = render(<RoomView width={1080} height={660} />);
    // Click the first DeskStation button (PM)
    const deskButtons = container.querySelectorAll('button[style*="all: unset"]');
    expect(deskButtons.length).toBeGreaterThan(0);
    fireEvent.click(deskButtons[0]);
    expect(screen.getByTestId('agent-detail-panel')).toBeInTheDocument();
  });

  it('close button on AgentDetailPanel clears selection', () => {
    render(<RoomView width={1080} height={660} initialSelected="pm" />);
    expect(screen.getByTestId('agent-detail-panel')).toBeInTheDocument();
    const closeBtn = screen.getByTestId('agent-detail-close');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('agent-detail-panel')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Wall poster click → modal overlay
// ---------------------------------------------------------------------------
describe('RoomView — wall poster click → modal overlay', () => {
  it('clicking GanttPoster shows Gantt modal overlay', () => {
    render(<RoomView width={1080} height={660} />);
    fireEvent.click(screen.getByTestId('gantt-poster'));
    // Gantt overlay has class room-modal
    expect(screen.getByText(/GanttView/)).toBeInTheDocument();
  });

  it('clicking PlanPoster shows Plan modal overlay', () => {
    render(<RoomView width={1080} height={660} />);
    fireEvent.click(screen.getByTestId('plan-poster'));
    expect(screen.getByText(/PlanView/)).toBeInTheDocument();
  });

  it('clicking ConsistencyPoster shows Consistency modal overlay', () => {
    render(<RoomView width={1080} height={660} />);
    fireEvent.click(screen.getByTestId('consistency-poster'));
    expect(screen.getByText(/ConsistencyView/)).toBeInTheDocument();
  });

  it('Gantt modal close button hides overlay', () => {
    render(<RoomView width={1080} height={660} />);
    fireEvent.click(screen.getByTestId('gantt-poster'));
    expect(screen.getByText(/GanttView/)).toBeInTheDocument();
    // Close button in the modal
    const closeBtn = screen.getByTestId('modal-close-gantt');
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/GanttView/)).not.toBeInTheDocument();
  });

  it('Plan modal close button hides overlay', () => {
    render(<RoomView width={1080} height={660} />);
    fireEvent.click(screen.getByTestId('plan-poster'));
    expect(screen.getByText(/PlanView/)).toBeInTheDocument();
    const closeBtn = screen.getByTestId('modal-close-plan');
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/PlanView/)).not.toBeInTheDocument();
  });

  it('Consistency modal close button hides overlay', () => {
    render(<RoomView width={1080} height={660} />);
    fireEvent.click(screen.getByTestId('consistency-poster'));
    expect(screen.getByText(/ConsistencyView/)).toBeInTheDocument();
    const closeBtn = screen.getByTestId('modal-close-consistency');
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/ConsistencyView/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Room mode toggle → retroMode
// ---------------------------------------------------------------------------
describe('RoomView — room mode toggle', () => {
  it('clicking mode toggle switches to retro mode', () => {
    render(<RoomView width={1080} height={660} />);
    const toggleBtn = screen.getByText('🔮 レトロ開始');
    fireEvent.click(toggleBtn);
    // In retro mode the button text changes
    expect(screen.getByText('📋 通常モードへ')).toBeInTheDocument();
  });

  it('retro mode hides wall posters', () => {
    render(<RoomView width={1080} height={660} />);
    fireEvent.click(screen.getByText('🔮 レトロ開始'));
    expect(screen.queryByTestId('gantt-poster')).not.toBeInTheDocument();
    expect(screen.queryByTestId('plan-poster')).not.toBeInTheDocument();
    expect(screen.queryByTestId('consistency-poster')).not.toBeInTheDocument();
  });

  it('retro mode hides Islands', () => {
    const { container } = render(<RoomView width={1080} height={660} />);
    fireEvent.click(screen.getByText('🔮 レトロ開始'));
    expect(container.querySelector('.room-island--pm')).not.toBeInTheDocument();
  });

  it('retro mode shows RetroGathering (whiteboard)', () => {
    render(<RoomView width={1080} height={660} />);
    fireEvent.click(screen.getByText('🔮 レトロ開始'));
    expect(screen.getByTestId('whiteboard')).toBeInTheDocument();
  });

  it('retro mode shows RETRO ISLAND sign', () => {
    render(<RoomView width={1080} height={660} />);
    fireEvent.click(screen.getByText('🔮 レトロ開始'));
    expect(screen.getByText(/RETRO ISLAND/)).toBeInTheDocument();
  });

  it('clicking mode toggle again returns to normal mode', () => {
    render(<RoomView width={1080} height={660} />);
    fireEvent.click(screen.getByText('🔮 レトロ開始'));
    fireEvent.click(screen.getByText('📋 通常モードへ'));
    expect(screen.getByTestId('gantt-poster')).toBeInTheDocument();
    expect(screen.queryByTestId('whiteboard')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// SubroomClone click → SubroomView overlay
// ---------------------------------------------------------------------------
describe('RoomView — subroom clone click → SubroomView overlay', () => {
  it('clicking a SubroomClone shows SubroomView overlay', () => {
    const { container } = render(<RoomView width={1080} height={660} />);
    const cloneBtn = container.querySelector('.subroom-clone') as HTMLButtonElement;
    expect(cloneBtn).toBeInTheDocument();
    fireEvent.click(cloneBtn);
    // SubroomView renders "SUBROOM · WORKTREE" header text
    expect(screen.getByText(/SUBROOM/)).toBeInTheDocument();
  });

  it('clicking SubroomView close button hides overlay', () => {
    const { container } = render(<RoomView width={1080} height={660} />);
    const cloneBtn = container.querySelector('.subroom-clone') as HTMLButtonElement;
    fireEvent.click(cloneBtn);
    expect(screen.getByText(/SUBROOM/)).toBeInTheDocument();
    const closeBtn = screen.getByTestId('modal-close-subroom');
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/SUBROOM/)).not.toBeInTheDocument();
  });
});
