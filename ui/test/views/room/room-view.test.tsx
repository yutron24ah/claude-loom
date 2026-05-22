/**
 * RoomView TDD tests — M0.18 t3 updated (Spirit Summoning rewrite)
 *
 * WHY updated (M0.18 t3):
 *   - PERSISTENT DESKS ONLY: DeskStation is rendered only for kind="persistent"
 *     agents (pm / dev / retro-pm). Review and retro spirits are ephemeral.
 *     WHY: spec/ui-arch.md §8.2.1 — 3 persistent desks + 10 ephemeral spirits.
 *   - spiritMode prop added (default='hybrid').
 *   - Desk count changed: 5 → 3 (only pm + dev + retro-pm have desks).
 *
 * WHY updated (M0.17 t4+t5+t6):
 *   - RoomView no longer accepts width/height props (uses ResizeObserver internally)
 *   - Islands removed: zone floors now SVG rects in RoomBackground (no .room-island-* DOM)
 *   - Modal overlays removed: poster clicks → useNavigate('/plan', '/gantt', '/consistency')
 *   - Retro toggle button removed from JSX (retroMode internal state; toggle was deferred)
 *   - useScenario + useNavigate + ResizeObserver require mocks in jsdom
 *
 * Tests verify:
 *   1. Room canvas renders (data-testid="room-canvas")
 *   2. RoomBackground SVG present
 *   3. DeskStation monitors render (3 persistent agents: pm + dev + retro-pm)
 *   4. Agent click → AgentDetailPanel (without initialSelected prop)
 *   5. Poster click → navigate() called (not modal)
 *   6. SubroomClone renders when scenario has worktrees
 */
import { describe, it, expect, afterEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// jsdom polyfills
// ---------------------------------------------------------------------------
// WHY: new RoomView uses ResizeObserver to fill parent. jsdom lacks it.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// ---------------------------------------------------------------------------
// Module mocks (must precede imports)
// ---------------------------------------------------------------------------

// WHY: AgentDetailNotes uses tRPC hooks which require provider context.
vi.mock('../../../src/views/room/AgentDetailNotes', () => ({
  AgentDetailNotes: () => null,
}));

// WHY: useScenario connects to WebSocket daemon. Mock with idle scenario.
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () => ({
    key: 'idle',
    label: 'idle',
    now: '00:00',
    conn: 'disconnected',
    project: 'test',
    branch: 'main',
    agents: {},
    gantt: { windowLabel: '', nowPct: 0, rows: [] },
    todos: [],
    milestones: [],
    todosUpdatedAt: '—',
    findings: [],
    pm: { running: false },
    worktrees: [],
  }),
  useScenarioMockKey: () => 'idle' as const,
  getScenarioStore: () => ({
    getSnapshot: () => ({ agents: {}, worktrees: [], pm: { running: false } }),
    subscribe: () => () => {},
    applyAgentChange: () => {},
    connect: () => {},
  }),
  SCENARIO_KEYS: ['idle', 'active', 'failed'] as const,
}));

// WHY: useNavigate is part of react-router-dom; RoomView uses it for poster clicks.
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// WHY: useViewStore tracks selected agent across components.
vi.mock('../../../src/store/view', () => ({
  useViewStore: {
    getState: () => ({
      setSelectedAgentId: vi.fn(),
    }),
  },
}));

// WHY: RoomView now calls usePMSession() for the ColdStart button (B4).
// Mock to avoid tRPC context requirement in room-focused tests.
vi.mock('../../../src/live/usePMSession', () => ({
  usePMSession: () => ({
    start: vi.fn(),
    say: vi.fn(),
    permission: vi.fn(),
    isLoading: false,
  }),
}));

import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { RoomView } from '../../../src/views/room/RoomView';

afterEach(() => {
  cleanup();
  mockNavigate.mockReset();
});

// ---------------------------------------------------------------------------
// Basic render
// ---------------------------------------------------------------------------
// covers: RM-FILL-01, RM-RESIZE-01
describe('RoomView — basic render', () => {
  it('renders room-canvas data-testid (required by AppShell tests)', () => {
    render(<RoomView />);
    expect(screen.getByTestId('room-canvas')).toBeInTheDocument();
  });

  it('renders with no props (ResizeObserver self-sizing)', () => {
    const { container } = render(<RoomView />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Phase B components rendered in normal mode
// ---------------------------------------------------------------------------
// covers: WD-BRANCH-01, WD-CLOCK-01, PO-GANTT-VIS-01, PO-PLAN-VIS-01, PO-CONS-VIS-01, BG-NO-BOX-01, BG-DOM-PLANT-01
describe('RoomView — Phase B components (normal mode)', () => {
  it('renders RoomBackground SVG', () => {
    const { container } = render(<RoomView />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders RoomWallDecor: branch sign + clock sign present', () => {
    const { container } = render(<RoomView />);
    // RoomWallDecor renders .room-sign--branch and .room-sign--clock divs
    expect(container.querySelector('.room-sign--branch')).toBeInTheDocument();
    expect(container.querySelector('.room-sign--clock')).toBeInTheDocument();
  });

  it('renders GanttPoster wall poster', () => {
    render(<RoomView />);
    expect(screen.getByTestId('gantt-poster')).toBeInTheDocument();
  });

  it('renders PlanPoster wall poster', () => {
    render(<RoomView />);
    expect(screen.getByTestId('plan-poster')).toBeInTheDocument();
  });

  it('renders ConsistencyPoster wall poster', () => {
    render(<RoomView />);
    expect(screen.getByTestId('consistency-poster')).toBeInTheDocument();
  });

  // WHY: Islands (room-island-* DOM divs) deleted in M0.17 t4+t6.
  // Zone surfaces are now SVG rects inside RoomBackground. This test
  // confirms the old DOM structure is gone (no regression to box-zones).
  it('does NOT render .room-island--* DOM divs (Islands deleted, zones are SVG)', () => {
    const { container } = render(<RoomView />);
    expect(container.querySelector('.room-island--pm')).not.toBeInTheDocument();
    expect(container.querySelector('.room-island--dev')).not.toBeInTheDocument();
    expect(container.querySelector('.room-island--review')).not.toBeInTheDocument();
  });

  // WHY 3 not 5: m0.18-t3 Spirit Summoning rewrite — only persistent agents
  // (pm + dev + retro-pm) have DeskStations. Review/retro spirits are ephemeral
  // and appear via Spirit Summoning, not desks. spec/ui-arch.md §8.2.1 SSoT.
  it('renders 3 DeskStation components (pm + dev + retro-pm, persistent only)', () => {
    const { container } = render(<RoomView />);
    // Each DeskStation renders a monitor-screen testid
    const monitors = container.querySelectorAll('[data-testid="monitor-screen"]');
    expect(monitors).toHaveLength(3);
  });

  it('renders no SubroomClone ghost cats when worktrees is empty', () => {
    const { container } = render(<RoomView />);
    const clones = container.querySelectorAll('.subroom-clone');
    expect(clones).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Poster clicks → navigate() (no modal overlay — M0.17 t6 change)
// ---------------------------------------------------------------------------
// covers: PO-NAV-GANTT-01, PO-NAV-PLAN-01, PO-NAV-CONS-01, PO-NO-MODAL-01
describe('RoomView — wall poster click → useNavigate (not modal)', () => {
  it('clicking GanttPoster calls navigate("/gantt")', () => {
    render(<RoomView />);
    fireEvent.click(screen.getByTestId('gantt-poster'));
    expect(mockNavigate).toHaveBeenCalledWith('/gantt');
  });

  it('clicking PlanPoster calls navigate("/plan")', () => {
    render(<RoomView />);
    fireEvent.click(screen.getByTestId('plan-poster'));
    expect(mockNavigate).toHaveBeenCalledWith('/plan');
  });

  it('clicking ConsistencyPoster calls navigate("/consistency")', () => {
    render(<RoomView />);
    fireEvent.click(screen.getByTestId('consistency-poster'));
    expect(mockNavigate).toHaveBeenCalledWith('/consistency');
  });

  // WHY: modal overlays (showGantt/showPlan/showConsistency state + room-modal div)
  // removed in M0.17 t6. No room-modal elements should appear on poster click.
  it('poster click does NOT produce .room-modal overlay (modals removed)', () => {
    const { container } = render(<RoomView />);
    fireEvent.click(screen.getByTestId('gantt-poster'));
    expect(container.querySelector('.room-modal')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Agent click → AgentDetailPanel overlay
// ---------------------------------------------------------------------------
// covers: AP-OPEN-01, AP-CLOSE-01, DS-COUNT-01, DS-CLICK-SELECT-01, DS-CLICK-DESELECT-01
describe('RoomView — agent click → AgentDetailPanel overlay', () => {
  it('does not render AgentDetailPanel by default', () => {
    render(<RoomView />);
    expect(screen.queryByTestId('agent-detail-panel')).not.toBeInTheDocument();
  });

  it('clicking a DeskStation renders AgentDetailPanel', () => {
    const { container } = render(<RoomView />);
    // DeskStation renders a button with class "desk-station__btn" (M0.17 t9: class-based port)
    const deskBtns = container.querySelectorAll('button.desk-station__btn');
    expect(deskBtns.length).toBeGreaterThan(0);
    fireEvent.click(deskBtns[0]);
    expect(screen.getByTestId('agent-detail-panel')).toBeInTheDocument();
  });

  it('close button on AgentDetailPanel clears selection', () => {
    const { container } = render(<RoomView />);
    const deskBtns = container.querySelectorAll('button.desk-station__btn');
    expect(deskBtns.length).toBeGreaterThan(0);
    fireEvent.click(deskBtns[0]);
    expect(screen.getByTestId('agent-detail-panel')).toBeInTheDocument();
    const closeBtn = screen.getByTestId('agent-detail-close');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('agent-detail-panel')).not.toBeInTheDocument();
  });
});
