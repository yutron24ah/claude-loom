/**
 * B11 TDD test — ScenarioPicker activate() uses useSearchParams instead of
 * window.history.replaceState + popstate dispatch.
 *
 * REQ-105: ScenarioPicker の activate() が window.history.replaceState + manual
 * popstate dispatch ではなく React Router の setSearchParams を使うことを保証。
 *
 * RED: window.history.replaceState を直接呼ぶ実装では useSearchParams が更新
 *      されないため、MemoryRouter 上の URL が React Router の state として
 *      更新されない。テストは setSearchParams 経由の URL 同期を verify する。
 *
 * GREEN: activate() に useSearchParams + setSearchParams を使用すると PASS。
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// WHY: mock useScenario to provide minimal data AppShell needs.
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () => ({
    key: 'idle',
    label: 'idle',
    now: '00:00',
    conn: 'disconnected',
    project: 'test',
    branch: 'main',
    agents: {},
    todos: [],
    milestones: [],
    todosUpdatedAt: '—',
    findings: [],
    worktrees: [],
    stream: [],
    gantt: { windowLabel: '', nowPct: 0, rows: [] },
    retroSession: { id: '', title: '', startedAt: '', durationSec: 0, verdict: 'PASS', actionPlan: { immediate: 0, milestone: 0, deferred: 0 }, lenses: [], transcript: [], findings: [] },
    guidance: [],
    customization: {},
    disciplineMetrics: {
      parallel: 0.5,
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
    pricing: {},
    pm: {
      running: false,
      messages: [],
      pendingApprovals: [],
    },
  }),
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
  PMChatPanel: () => <div data-testid="pm-chat-panel">PM Chat Panel (mock)</div>,
}));

vi.mock('../../src/notifications/ToastContainer', () => ({
  ToastContainer: () => null,
}));

vi.mock('../../src/live/usePMSession', () => ({
  usePMSession: () => ({
    start: vi.fn(),
    say: vi.fn(),
    permission: vi.fn(),
    isLoading: false,
  }),
}));

import { AppShell } from '../../src/routing/AppShell';

afterEach(() => {
  cleanup();
});

function renderShellWithRoute(initialRoute = '/') {
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

// covers: SP-ROUTER-01, SP-SWITCH-01, SP-VISIBLE-01, SP-LIVE-01
describe('B11: ScenarioPicker activate() uses React Router setSearchParams', () => {
  it('[REQ-105] clicking a scenario button updates the active button state via React Router URL', async () => {
    renderShellWithRoute('/');

    const picker = screen.getByTestId('scenario-picker');
    expect(picker).toBeInTheDocument();

    // Find the "live" button (current = '' so it should be ".on")
    const liveBtn = Array.from(picker.querySelectorAll('button')).find(
      (b) => b.textContent === 'live',
    );
    expect(liveBtn).toBeDefined();
    expect(liveBtn).toHaveClass('on');

    // Find any non-"live" scenario button
    const scenarioBtns = Array.from(picker.querySelectorAll('button')).filter(
      (b) => b.textContent !== 'live',
    );
    expect(scenarioBtns.length).toBeGreaterThan(0);

    // Click first scenario button
    await act(async () => {
      fireEvent.click(scenarioBtns[0]);
    });

    // After click, the clicked button should have class "on"
    // GREEN: useSearchParams re-renders component; window.replaceState would NOT trigger
    // React re-render in MemoryRouter, so this test FAILS with old impl.
    const clickedKey = scenarioBtns[0].textContent ?? '';
    const updatedPicker = screen.getByTestId('scenario-picker');
    const updatedBtns = Array.from(updatedPicker.querySelectorAll('button'));
    const clickedBtn = updatedBtns.find((b) => b.textContent === clickedKey);
    expect(clickedBtn).toHaveClass('on');
  });

  it('[REQ-105] window.history.replaceState is NOT called when activating a scenario', async () => {
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

    renderShellWithRoute('/');

    const picker = screen.getByTestId('scenario-picker');
    const scenarioBtns = Array.from(picker.querySelectorAll('button')).filter(
      (b) => b.textContent !== 'live',
    );

    await act(async () => {
      fireEvent.click(scenarioBtns[0]);
    });

    // GREEN: setSearchParams does NOT call window.history.replaceState directly in jsdom
    // (React Router's MemoryRouter uses its own in-memory history)
    expect(replaceStateSpy).not.toHaveBeenCalled();

    replaceStateSpy.mockRestore();
  });
});
