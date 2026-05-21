/**
 * Drawer version display test — DR-VERSION-01
 *
 * REQ-075 scope (shell impl_only fill, M0.19 t7a)
 *
 * WHY: DR-VERSION-01 verifies that the Drawer's bottom area shows an
 * app version/identifier string when the drawer is NOT collapsed.
 *
 * Implementation: AppShell.tsx Drawer component renders
 *   `{!collapsed && <div className="drawer__group drawer__version">{APP_COPY.versionLine}</div>}`
 *   where APP_COPY.versionLine = 'v0.15 · 127.0.0.1:5757'
 *
 * DR-COLLAPSED-01 is deferred (localStorage persistence not implemented yet).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
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

vi.mock('../../../src/views/room/RoomView', () => ({
  RoomView: () => <div data-testid="room-canvas">Room Canvas (mock)</div>,
}));

vi.mock('../../../src/views/room/LiveRail', () => ({
  LiveRail: () => <div data-testid="live-rail">LiveRail (mock)</div>,
}));

vi.mock('../../../src/views/pm-chat/PMChatPanel', () => ({
  PMChatPanel: () => <div data-testid="pm-chat-panel">PM Chat (mock)</div>,
}));

vi.mock('../../../src/notifications/ToastContainer', () => ({
  ToastContainer: () => null,
}));

vi.mock('../../../src/live/usePMSession', () => ({
  usePMSession: () => ({
    start: () => {},
    say: () => {},
    permission: () => {},
    isLoading: false,
  }),
}));

import { AppShell } from '../../../src/routing/AppShell';

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
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// DR-VERSION-01: バージョン表記
// WHY: Drawer bottom area shows .drawer__version with app version string.
//      When collapsed, the version line is hidden (icon-only mode).
// ---------------------------------------------------------------------------
// covers: DR-VERSION-01
describe('Drawer: version display (DR-VERSION-01)', () => {
  it('renders .drawer__version element when drawer is expanded', () => {
    renderShell('/');
    const drawer = screen.getByTestId('drawer');
    // WHY: drawer is initially NOT collapsed — version line should be visible
    expect(drawer).not.toHaveAttribute('data-collapsed', 'true');
    const versionEl = drawer.querySelector('.drawer__version');
    expect(versionEl).not.toBeNull();
  });

  it('.drawer__version contains an app version or identifier string', () => {
    renderShell('/');
    const drawer = screen.getByTestId('drawer');
    const versionEl = drawer.querySelector('.drawer__version');
    expect(versionEl).not.toBeNull();
    // WHY: APP_COPY.versionLine = 'v0.15 · 127.0.0.1:5757' — must have non-empty text
    expect(versionEl!.textContent).not.toBe('');
    expect((versionEl!.textContent ?? '').length).toBeGreaterThan(0);
  });

  it('.drawer__version text contains version indicator (v<N> or port)', () => {
    renderShell('/');
    const drawer = screen.getByTestId('drawer');
    const versionEl = drawer.querySelector('.drawer__version');
    expect(versionEl).not.toBeNull();
    // WHY: versionLine = 'v0.15 · 127.0.0.1:5757' — must contain "v" prefix or port
    const text = versionEl!.textContent ?? '';
    expect(text).toMatch(/v\d|:\d{4}/);
  });

  it('.drawer__version is hidden when drawer is collapsed', async () => {
    renderShell('/');
    const toggleBtn = screen.getByTestId('topbar-drawer-toggle');

    // Collapse the drawer
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    const drawer = screen.getByTestId('drawer');
    expect(drawer).toHaveAttribute('data-collapsed', 'true');

    // WHY: Drawer.tsx line 178: `{!collapsed && <div className="drawer__group drawer__version">...`
    // When collapsed, version line is NOT rendered
    const versionEl = drawer.querySelector('.drawer__version');
    expect(versionEl).toBeNull();
  });
});
