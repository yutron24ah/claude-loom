/**
 * RoomView TDD tests — M0.11.4 DOM/SVG rewrite
 * WHY: verify the DOM/SVG RoomView renders correctly.
 * Phaser has been fully removed (M0.11.4 t17). RoomView is now DOM/SVG-only.
 * WHY mock AgentDetailNotes: M3.2 t3 added notes sub-component which uses tRPC hooks.
 * RoomView tests focus on the room container and panel visibility, not notes behavior.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';

// WHY: ResizeObserver not available in jsdom — new RoomView uses it internally.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// WHY: AgentDetailNotes uses tRPC hooks which require provider context.
// RoomView tests focus on canvas and panel visibility, not notes — mock away.
vi.mock('../../src/views/room/AgentDetailNotes', () => ({
  AgentDetailNotes: () => null,
}));

// WHY: useScenario connects to WebSocket daemon — mock idle scenario.
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () => ({
    key: 'idle', label: 'idle', now: '00:00', conn: 'disconnected',
    project: 'test', branch: 'main', agents: {},
    gantt: { windowLabel: '', nowPct: 0, rows: [] },
    todos: [], milestones: [], todosUpdatedAt: '—', findings: [],
    pm: { running: false }, worktrees: [],
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
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// WHY: useViewStore tracks selected agent.
vi.mock('../../src/store/view', () => ({
  useViewStore: {
    getState: () => ({ setSelectedAgentId: vi.fn() }),
  },
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

  it('renders without props (self-sizing via ResizeObserver)', () => {
    const { container } = render(<RoomView />);
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

  // WHY: initialSelected prop removed in M0.17 t6 (RoomView now self-managed sel state).
  // Agent selection is now triggered only by desk clicks, not initial prop.
  it('does not render AgentDetailPanel by default (no initialSelected prop)', () => {
    render(<RoomView />);
    expect(screen.queryByTestId('agent-detail-panel')).not.toBeInTheDocument();
  });
});
