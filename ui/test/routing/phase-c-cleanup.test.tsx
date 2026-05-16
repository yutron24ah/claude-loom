/**
 * M0.17 Round 2 Phase C cleanup tests [REQ-106]
 *
 * Covers:
 * - S8: TopBar branch chip (data-testid="topbar-branch") shows scenario.branch
 * - M5: SCENARIO_KEYS includes 'live'; ScenarioPicker renders 4 unified buttons
 *       (idle / active / failed / live), no separate hardcoded 'live' button
 *
 * WHY separate test file: these are Phase C behavioral additions, not regressions.
 * AppShell.test.tsx covers sibling routing; this file covers the Phase C surface.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { Scenario } from '@claude-loom/redesign/api/types';
import { SCENARIO_KEYS } from '../../src/routing/constants';

// ---------------------------------------------------------------------------
// Module mocks (same seam isolation as AppShell.test.tsx)
// ---------------------------------------------------------------------------
vi.mock('../../src/views/room/RoomView', () => ({
  RoomView: () => <div data-testid="room-canvas">Room Canvas (mock)</div>,
}));
vi.mock('../../src/views/room/LiveRail', () => ({
  LiveRail: () => <div data-testid="live-rail">LiveRail (mock)</div>,
}));
vi.mock('../../src/views/pm-chat/PMChatPanel', () => ({
  PMChatPanel: () => <div data-testid="pm-chat-panel">PM Chat (mock)</div>,
}));
vi.mock('../../src/notifications/ToastContainer', () => ({
  ToastContainer: () => null,
}));
vi.mock('../../src/live/usePMSession', () => ({
  usePMSession: () => ({ start: () => {}, say: () => {}, permission: () => {}, isLoading: false }),
}));
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      key: 'idle',
      label: 'idle scenario',
      now: '10:00',
      conn: 'connected',
      project: 'test-project',
      branch: 'feat/m0.17-phase-c',
      agents: {},
      todos: [],
      todosUpdatedAt: '',
      milestones: [],
      findings: [],
      worktrees: [],
      stream: [],
      gantt: { windowLabel: '', nowPct: 0, rows: [] },
      retroSession: {
        id: '', title: '', startedAt: '', durationSec: 0, verdict: 'PASS',
        actionPlan: { immediate: 0, milestone: 0, deferred: 0 },
        lenses: [], transcript: [], findings: [],
      },
      guidance: [],
      customization: {},
      disciplineMetrics: {
        parallel: 0.6,
        taskTool: 'ok',
        taskToolLabel: 'OK',
        tddViolations: 0,
        verdict: 'PASS',
      },
      consistencyState: 'empty',
      sessions: [],
      tokens: { period: '', byAgent: [], daily: [] },
      settings: {
        daemonPort: 5757,
        worktreeBase: '',
        retroSchedule: { enabled: false, cron: '', label: '' },
        consistencyScope: [],
        hooks: { preToolUse: false, postToolUse: false, subagentStop: false },
        logRetention: { days: 7 },
        defaultReviewers: [],
        parallelLimit: 3,
      },
      pricing: {} as Scenario['pricing'],
      pm: { running: false, messages: [], pendingApprovals: [] },
    }) as unknown as Scenario,
  getScenarioStore: () => ({
    subscribe: () => () => {},
    getSnapshot: () => ({}),
  }),
}));

import { AppShell } from '../../src/routing/AppShell';

afterEach(() => {
  cleanup();
});

function renderAppShell(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={null} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// S8: TopBar branch chip
// ---------------------------------------------------------------------------
describe('AppShell — S8 TopBar branch chip (M0.17 Phase C)', () => {
  it('[REQ-106] renders topbar-branch chip with scenario.branch value', () => {
    // WHY: Round 2 review S8 — TopBar should show current branch for context.
    // The branch chip is a display element (non-interactive), data-testid="topbar-branch".
    renderAppShell('/');
    const branchChip = screen.getByTestId('topbar-branch');
    expect(branchChip).toBeInTheDocument();
    // branch chip shows "◆ branch: feat/m0.17-phase-c" (from mock scenario.branch)
    expect(branchChip.textContent).toContain('feat/m0.17-phase-c');
  });

  it('[REQ-106] project chip (topbar-project) is preserved alongside branch chip', () => {
    // WHY: project chip navigate (Phase A B7) must not be removed.
    renderAppShell('/');
    expect(screen.getByTestId('topbar-project')).toBeInTheDocument();
    expect(screen.getByTestId('topbar-branch')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// M5: SCENARIO_KEYS includes 'live', unified loop render
// ---------------------------------------------------------------------------
describe('constants — M5 SCENARIO_KEYS unified (M0.17 Phase C)', () => {
  it('[REQ-106] SCENARIO_KEYS includes live', () => {
    // WHY: 'live' was a hardcoded button outside the loop. Unifying into SCENARIO_KEYS
    // ensures ScenarioPicker renders all 4 buttons (idle/active/failed/live) via map.
    expect(SCENARIO_KEYS).toContain('live');
  });

  it('[REQ-106] SCENARIO_KEYS has exactly 4 elements: idle, active, failed, live', () => {
    expect(SCENARIO_KEYS).toHaveLength(4);
    expect(SCENARIO_KEYS[0]).toBe('idle');
    expect(SCENARIO_KEYS[1]).toBe('active');
    expect(SCENARIO_KEYS[2]).toBe('failed');
    expect(SCENARIO_KEYS[3]).toBe('live');
  });
});
