/**
 * ScenarioPicker × non-room route test — SP-NONROOM-01
 *
 * REQ-075 scope (shell impl_only fill, M0.19 t7a)
 *
 * WHY: SP-NONROOM-01 verifies that ScenarioPicker (DEV-only debug widget)
 * is NOT rendered when the current route is NOT the room ('/').
 *
 * Implementation: AppShell.tsx line 309:
 *   `{isRoom && import.meta.env.DEV && <ScenarioPicker rightOffset={...} />}`
 *
 * The existing SP-VISIBLE-01 test (AppShell.redesign.test.tsx) verifies
 * ScenarioPicker IS visible at '/'. This test covers the complementary case:
 * ScenarioPicker is NOT visible at non-room routes like '/plan'.
 *
 * Mock note: `import.meta.env.DEV` is `true` in Vitest test runs by default,
 * so the DEV guard is satisfied — only the `isRoom` guard differentiates.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { Scenario } from '@claude-loom/redesign/api/types';

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      key: 'idle',
      label: 'idle',
      now: '10:00',
      conn: 'connected',
      project: 'test-proj',
      branch: 'main',
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
        parallel: 0.5, taskTool: 'ok', taskToolLabel: 'OK', tddViolations: 0, verdict: 'PASS',
      },
      consistencyState: 'empty',
      sessions: [],
      tokens: { period: '', byAgent: [], daily: [] },
      settings: {
        daemonPort: 5757, worktreeBase: '',
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
  usePMSession: () => ({
    start: () => {},
    say: () => {},
    permission: () => {},
    isLoading: false,
  }),
}));

import { AppShell } from '../../src/routing/AppShell';

afterEach(() => {
  cleanup();
});

function renderShell(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={null} />
          <Route path="plan" element={<div>Plan Content</div>} />
          <Route path="retro" element={<div>Retro Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// SP-NONROOM-01: 非 Room 画面では非表示
// WHY: ScenarioPicker is a Room-only debug tool (DEV builds only).
//      When navigating to /plan, isRoom=false → ScenarioPicker is NOT rendered.
// ---------------------------------------------------------------------------
// covers: SP-NONROOM-01
describe('ScenarioPicker: not rendered on non-room routes (SP-NONROOM-01)', () => {
  it('ScenarioPicker IS visible at root route (control case)', () => {
    // WHY: control case — at '/', isRoom=true and import.meta.env.DEV=true (Vitest)
    // → ScenarioPicker renders. Confirms the test env guard is satisfied.
    renderShell('/');
    expect(screen.getByTestId('scenario-picker')).toBeInTheDocument();
  });

  it('ScenarioPicker is NOT rendered at /plan route', () => {
    // WHY: SP-NONROOM-01 — "Room 限定" means isRoom=false → ScenarioPicker unmounts
    renderShell('/plan');
    expect(screen.queryByTestId('scenario-picker')).not.toBeInTheDocument();
  });

  it('ScenarioPicker is NOT rendered at /retro route', () => {
    renderShell('/retro');
    expect(screen.queryByTestId('scenario-picker')).not.toBeInTheDocument();
  });

  it('Plan content is fully visible while ScenarioPicker is absent', () => {
    renderShell('/plan');
    expect(screen.getByText('Plan Content')).toBeInTheDocument();
    expect(screen.queryByTestId('scenario-picker')).not.toBeInTheDocument();
  });
});
