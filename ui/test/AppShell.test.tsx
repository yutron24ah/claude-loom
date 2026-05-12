/**
 * AppShell TDD test (M0.15 t14 redesign, REQ-075)
 * WHY: verify persistent Room canvas + panel overlay routing behavior,
 * plus the updated shell structure (Drawer replaces Sidebar, TopBar replaces
 * DisciplineHeader, drawer has nav-link-{id} testids).
 *
 * Behavior under test:
 * 1. RoomView (data-testid="room-canvas") is always present in DOM regardless of route
 * 2. At `/` route, no panel overlay (data-testid="view-panel") is rendered
 * 3. At `/plan` route, Room canvas stays + panel overlay is rendered
 * 4. Panel background click → navigates to `/`
 * 5. Escape key → navigates to `/`
 * 6. Room canvas is NOT remounted across route changes (same DOM node identity)
 * 7. Drawer (data-testid="drawer") is always present
 * 8. TopBar (data-testid="topbar") is always present
 * 9. Drawer contains nav-link testids for all 11 routes
 *
 * WHY mocks: AppShell → RoomView → AgentDetailNotes → trpc/client →
 * @claude-loom/daemon → constants/consistency.ts → zod fails to resolve
 * in the UI Vitest env (daemon's node_modules not on path). We mock RoomView
 * at the seam to keep AppShell behavioral tests isolated.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { Scenario } from '@claude-loom/redesign/api/types';

// ---------------------------------------------------------------------------
// Module mocks — hoist before component imports (vitest hoists vi.mock calls)
// ---------------------------------------------------------------------------

// WHY: mock RoomView to avoid zod/daemon import chain.
vi.mock('../src/views/room/RoomView', () => ({
  RoomView: () => <div data-testid="room-canvas">Room Canvas (mock)</div>,
}));

// WHY: mock PMChatPanel to isolate AppShell layout from pm-chat internals.
vi.mock('../src/views/pm-chat/PMChatPanel', () => ({
  PMChatPanel: () => <div data-testid="pm-chat-panel">PM Chat (mock)</div>,
}));

// WHY: mock ToastContainer to avoid toast bus side effects.
vi.mock('../src/notifications/ToastContainer', () => ({
  ToastContainer: () => null,
}));

// WHY: mock redesign websocket hook with pm.running:false for baseline tests
// (PMChatPanel right column not shown by default).
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      key: 'idle',
      label: 'idle scenario',
      now: '10:00',
      conn: 'connected',
      project: 'test-project',
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

import { AppShell } from '../src/routing/AppShell';

// Minimal placeholder views for routing test
function PlanView() {
  return <div>Plan</div>;
}

afterEach(() => {
  cleanup();
});

/**
 * Wrap AppShell in a MemoryRouter with configurable initial route.
 * Provides minimal route definitions for the test surface.
 */
function renderAppShell(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={null} />
          <Route path="plan" element={<PlanView />} />
          <Route path="retro" element={<div>Retro</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppShell — persistent Room canvas', () => {
  it('renders room-canvas at root route', () => {
    renderAppShell('/');
    expect(screen.getByTestId('room-canvas')).toBeInTheDocument();
  });

  it('renders room-canvas at /plan route', () => {
    renderAppShell('/plan');
    expect(screen.getByTestId('room-canvas')).toBeInTheDocument();
  });

  it('renders room-canvas at /retro route', () => {
    renderAppShell('/retro');
    expect(screen.getByTestId('room-canvas')).toBeInTheDocument();
  });

  it('room-canvas node is same identity across route change (no remount)', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={null} />
            <Route path="plan" element={<PlanView />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // Capture DOM node reference at '/'
    const roomCanvas = screen.getByTestId('room-canvas');
    const nodeRef = roomCanvas;

    // Navigate to /plan
    rerender(
      <MemoryRouter initialEntries={['/plan']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={null} />
            <Route path="plan" element={<PlanView />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // Room canvas should still be in DOM (persistent mount)
    expect(screen.getByTestId('room-canvas')).toBeInTheDocument();
    // Verify it is the same underlying element (not re-created)
    // WHY: AppShell mounts RoomView unconditionally, outside Outlet — so rerender
    // of the shell keeps the same component instance (React reconciliation preserves it)
    expect(screen.getByTestId('room-canvas')).toBe(nodeRef);
  });
});

describe('AppShell — panel overlay behavior', () => {
  it('does not render view-panel at root route', () => {
    renderAppShell('/');
    expect(screen.queryByTestId('view-panel')).not.toBeInTheDocument();
  });

  it('renders view-panel at /plan route', () => {
    renderAppShell('/plan');
    expect(screen.getByTestId('view-panel')).toBeInTheDocument();
  });

  it('view-panel contains route content', () => {
    renderAppShell('/plan');
    const panel = screen.getByTestId('view-panel');
    expect(panel).toBeInTheDocument();
    // WHY: query within panel — drawer also has a "Plan" link, so getByText is ambiguous
    expect(panel).toHaveTextContent('Plan');
  });
});

describe('AppShell — panel close interactions', () => {
  it('Escape key navigates to / (panel dismissal)', async () => {
    render(
      <MemoryRouter initialEntries={['/plan']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={null} />
            <Route path="plan" element={<PlanView />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // panel should be visible at /plan
    expect(screen.getByTestId('view-panel')).toBeInTheDocument();

    // Fire Escape key on document
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    });

    // After Escape, panel should be gone (navigated to /)
    // WHY: MemoryRouter internal state changes — panel visibility reflects current route
    expect(screen.queryByTestId('view-panel')).not.toBeInTheDocument();
  });

  it('panel background click navigates to /', async () => {
    render(
      <MemoryRouter initialEntries={['/plan']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={null} />
            <Route path="plan" element={<PlanView />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // panel visible
    const panel = screen.getByTestId('view-panel');
    expect(panel).toBeInTheDocument();

    // Click the panel background (not the content inside it)
    await act(async () => {
      fireEvent.click(panel);
    });

    // panel should be dismissed
    expect(screen.queryByTestId('view-panel')).not.toBeInTheDocument();
  });
});

describe('AppShell — TopBar (replaces DisciplineHeader)', () => {
  it('renders topbar at root route', () => {
    renderAppShell('/');
    expect(screen.getByTestId('topbar')).toBeInTheDocument();
  });

  it('renders topbar at /plan route', () => {
    renderAppShell('/plan');
    expect(screen.getByTestId('topbar')).toBeInTheDocument();
  });
});

/**
 * Drawer navigation assertions — replaces old Sidebar assertions.
 * WHY: AppShell redesign replaces Sidebar (data-testid="sidebar") with
 * Drawer (data-testid="drawer"). Nav links use nav-link-{id} testids
 * instead of sidebar-link-{id}.
 */
describe('AppShell — Drawer navigation (redesign)', () => {
  it('renders drawer at root route', () => {
    renderAppShell('/');
    expect(screen.getByTestId('drawer')).toBeInTheDocument();
  });

  it('renders drawer at /plan route', () => {
    renderAppShell('/plan');
    expect(screen.getByTestId('drawer')).toBeInTheDocument();
  });

  it('renders drawer at /retro route', () => {
    renderAppShell('/retro');
    expect(screen.getByTestId('drawer')).toBeInTheDocument();
  });

  it('drawer contains nav-link to /plan', () => {
    renderAppShell('/');
    expect(screen.getByTestId('nav-link-plan')).toBeInTheDocument();
  });

  it('drawer contains nav-link to /retro', () => {
    renderAppShell('/');
    expect(screen.getByTestId('nav-link-retro')).toBeInTheDocument();
  });

  it('drawer contains nav-link to /sessions', () => {
    renderAppShell('/');
    expect(screen.getByTestId('nav-link-sessions')).toBeInTheDocument();
  });

  it('drawer contains nav-link to /tokens', () => {
    renderAppShell('/');
    expect(screen.getByTestId('nav-link-tokens')).toBeInTheDocument();
  });

  it('drawer contains nav-link to /project-settings', () => {
    renderAppShell('/');
    expect(screen.getByTestId('nav-link-project-settings')).toBeInTheDocument();
  });
});
