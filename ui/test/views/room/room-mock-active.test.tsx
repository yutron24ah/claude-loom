/**
 * RoomView × mock=active scenario smoke test
 * -----------------------------------------------------------
 * Verifies the redesign port: when useScenario() returns an active
 * scenario, the corresponding cats render with the right DeskStatus
 * (status dot color via styled background) and the right speech-bubble
 * content (currentTool) coming from agent.change deltas.
 *
 * Replaces the equivalent visual check we'd otherwise do by opening
 * the dev server at /?mock=active in a real browser. Pairs with
 * existing room-view.test.tsx (which exercises the default idle path).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Scenario, AgentState } from '@claude-loom/redesign/api/types';

// WHY: ResizeObserver is not available in jsdom — polyfill for new RoomView.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// WHY: RoomView calls useNavigate() for poster clicks (modals removed M0.17 t6).
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// WHY: useViewStore tracks selected agent; mock to avoid store provider.
vi.mock('../../../src/store/view', () => ({
  useViewStore: {
    getState: () => ({ setSelectedAgentId: vi.fn() }),
  },
}));

// WHY: AgentDetailNotes uses tRPC hooks.
vi.mock('../../../src/views/room/AgentDetailNotes', () => ({
  AgentDetailNotes: () => null,
}));

import { RoomView } from '../../../src/views/room/RoomView';

// WHY: mock the redesign hook directly. This is the seam scenarios.js → daemon
// reducer; mocking here proves the consumer wiring without spinning up a WS.
const activeAgents: Record<string, AgentState> = {
  pm: { status: 'busy', currentReasoning: 'spec を読み返してる…' },
  dev: { status: 'busy', currentTool: 'Edit', currentReasoning: 'GREEN 追加' },
  'rev-code': { status: 'review', currentTool: 'Read' },
  'rev-test': { status: 'busy', currentTool: 'Bash' },
  'rev-sec': { status: 'idle', lastSeenAt: '21分前' },
};

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  // RoomView reads scenario.agents + scenario.gantt (GanttPoster) +
  // scenario.todos/milestones (PlanPoster) + scenario.findings (ConsistencyPoster).
  useScenario: () =>
    ({
      key: 'active',
      label: 'Dev サブエージェント実行中',
      now: '14:23',
      conn: 'connected',
      project: 'freee-mcp',
      branch: 'main',
      agents: activeAgents,
      // WHY: GanttPoster reads scenario.gantt.rows + nowPct.
      gantt: {
        windowLabel: '直近 30min',
        nowPct: 95,
        rows: [
          { worktree: 'main', agentId: 'pm',       label: 'PM',      bars: [], live: false },
          { worktree: 'main', agentId: 'dev',      label: 'Dev',     bars: [], live: false },
          { worktree: 'main', agentId: 'rev-code', label: 'CodeRev', bars: [], live: false },
          { worktree: 'main', agentId: 'rev-test', label: 'TestRev', bars: [], live: false },
          { worktree: 'main', agentId: 'rev-sec',  label: 'SecRev',  bars: [], live: false },
        ],
      },
      // WHY: PlanPoster reads scenario.todos / milestones / todosUpdatedAt.
      todos: [],
      milestones: [],
      todosUpdatedAt: '—',
      // WHY: ConsistencyPoster reads scenario.findings.
      findings: [],
      // WHY: RoomView reads scenario.pm.running for coldstart card.
      pm: { running: true },
      // WHY: RoomView reads scenario.worktrees for SubroomClone rendering.
      worktrees: [],
    }) as unknown as Scenario,
  useScenarioMockKey: () => 'active' as const,
  getScenarioStore: () => ({
    getSnapshot: () => ({ agents: activeAgents, worktrees: [], pm: { running: true } }) as unknown as Scenario,
    subscribe: () => () => {},
    applyAgentChange: () => {},
    connect: () => {},
  }),
  SCENARIO_KEYS: ['idle', 'active', 'failed'] as const,
}));

describe('RoomView × scenario.active', () => {
  it('renders dev cat with currentTool bubble = "Edit"', () => {
    render(<RoomView />);
    // The DeskStation renders the bubble text inside [data-testid="speech-bubble"].
    // active fixture sets dev.currentTool='Edit', so the bubble should contain it.
    const bubbles = screen.getAllByTestId('speech-bubble');
    const texts = bubbles.map((el) => el.textContent ?? '');
    expect(texts.some((t) => t.includes('Edit'))).toBe(true);
  });

  it('renders rev-code cat with bubble showing currentTool = "Read"', () => {
    render(<RoomView />);
    const bubbles = screen.getAllByTestId('speech-bubble');
    const texts = bubbles.map((el) => el.textContent ?? '');
    expect(texts.some((t) => t.includes('Read'))).toBe(true);
  });

  it('renders all 5 desk monitors regardless of agent status', () => {
    render(<RoomView />);
    // WHY 5 not 6: M0.17 t6 ROOM_AGENT_IDS = ['pm','dev','rev-code','rev-test','rev-sec'].
    // The old 'rev' desk (6th) was merged/removed in the redesign port.
    const monitors = screen.getAllByTestId('monitor-screen');
    expect(monitors).toHaveLength(5);
  });

  it('renders idle cat (rev-sec) with no speech bubble', () => {
    render(<RoomView />);
    // active fixture leaves rev-sec in idle with lastSeenAt only.
    // It must NOT produce a bubble (no currentTool / currentReasoning).
    const bubbles = screen.getAllByTestId('speech-bubble');
    // 4 bubbles expected: pm (reasoning) + dev (Edit) + rev-code (Read) + rev-test (Bash)
    expect(bubbles).toHaveLength(4);
  });
});
