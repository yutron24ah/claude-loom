/**
 * B4 TDD test — ColdStart "▶ PM を起動" button calls pm.start()
 *
 * REQ-104: ColdStart の「▶ PM を起動」ボタンが usePMSession().start() を
 * 呼ぶことを保証する (alert() placeholder ではない)。
 *
 * RED: alert() 直書きのままでは mockStart が呼ばれず FAIL する。
 * GREEN: usePMSession() を import + call に変更すると PASS。
 */
import { describe, it, expect, afterEach, vi } from 'vitest';

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('../../../src/views/room/AgentDetailNotes', () => ({
  AgentDetailNotes: () => null,
}));

const mockStart = vi.fn();

// WHY: mock usePMSession — the hook under test for B4. We only need start().
vi.mock('../../../src/live/usePMSession', () => ({
  usePMSession: () => ({
    start: mockStart,
    say: vi.fn(),
    permission: vi.fn(),
    isLoading: false,
  }),
}));

// WHY: idle scenario with pm.running === false triggers ColdStart card.
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () => ({
    key: 'idle',
    label: 'idle',
    now: '00:00',
    conn: 'disconnected',
    project: 'test',
    branch: 'main',
    agents: {
      pm: { status: 'idle' },
      dev: { status: 'idle' },
      'rev-code': { status: 'idle' },
      'rev-test': { status: 'idle' },
      'rev-sec': { status: 'idle' },
    },
    gantt: { windowLabel: '', nowPct: 0, rows: [] },
    todos: [],
    milestones: [],
    todosUpdatedAt: '—',
    findings: [],
    pm: { running: false },
    worktrees: [],
    stream: [],
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

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../../../src/store/view', () => ({
  useViewStore: {
    getState: () => ({ setSelectedAgentId: vi.fn() }),
  },
}));

import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { RoomView } from '../../../src/views/room/RoomView';

afterEach(() => {
  cleanup();
  mockStart.mockReset();
});

describe('B4: ColdStart "▶ PM を起動" button → usePMSession().start()', () => {
  it('[REQ-104] clicking "▶ PM を起動" calls pm.start(), not alert()', () => {
    // Spy on alert to confirm it is NOT called
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<RoomView />);

    // ColdStart card is shown when isIdleAll && !pm.running
    const startBtn = screen.getByText('▶ PM を起動');
    expect(startBtn).toBeInTheDocument();

    fireEvent.click(startBtn);

    // GREEN condition: mockStart must have been called
    expect(mockStart).toHaveBeenCalledOnce();
    // Alert must NOT be called (no placeholder)
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });
});
