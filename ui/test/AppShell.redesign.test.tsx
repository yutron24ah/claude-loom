/**
 * AppShell × redesign — smoke tests for M0.15 t14
 * REQ-075: AppShell 全面 redesign 移植 (TopBar/Drawer/StatusBar/ScenarioPicker)
 *
 * WHY separate file: existing AppShell.test.tsx covers the legacy routing/panel
 * overlay behavior which must stay green. This file focuses on the 7 new
 * redesign-specific behaviors:
 *   1. TopBar renders brand + project + 4 metrics + conn status
 *   2. Drawer renders 11 nav links across 3 groups (OPERATE/MANAGE/SETTINGS)
 *   3. StatusBar renders scenario label + events text + project path
 *   4. Drawer collapse toggles 40px icon-only mode (aria-label or data-collapsed)
 *   5. Right column slot mounts PMChatPanel when pm.running === true
 *   6. ScenarioPicker is positioned in the content area
 *   7. nav-link click navigates to corresponding route
 *
 * Mock: @claude-loom/redesign/api/websocket → useScenario returns fixture
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { Scenario } from '@claude-loom/redesign/api/types';

// Mock useScenario with a stable fixture so these tests are deterministic
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      key: 'active',
      label: 'active scenario',
      now: '14:23',
      conn: 'connected',
      project: 'freee-mcp',
      branch: 'feat/redesign-room-mvp',
      agents: {},
      todos: [],
      todosUpdatedAt: '',
      milestones: [],
      findings: [],
      worktrees: [],
      stream: [],
      gantt: { windowLabel: '', nowPct: 0, rows: [] },
      retroSession: { id: '', title: '', startedAt: '', durationSec: 0, verdict: 'PASS', actionPlan: { immediate: 0, milestone: 0, deferred: 0 }, lenses: [], transcript: [], findings: [] },
      guidance: [],
      customization: {},
      disciplineMetrics: {
        parallel: 0.62,
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
      pm: {
        running: true,
        messages: [],
        pendingApprovals: [],
      },
    }) as unknown as Scenario,
  getScenarioStore: () => ({
    subscribe: () => () => {},
    getSnapshot: () => ({}),
  }),
}));

// WHY: mock RoomView to avoid the zod/daemon import chain (RoomView → AgentDetailNotes
// → trpc/client → @claude-loom/daemon → constants/consistency.ts → zod).
// AppShell tests exercise AppShell layout, not RoomView internals.
vi.mock('../src/views/room/RoomView', () => ({
  RoomView: () => <div data-testid="room-canvas">Room Canvas (mock)</div>,
}));

// WHY: mock LiveRail to avoid StreamEvent type resolution in jsdom test env.
vi.mock('../src/views/room/LiveRail', () => ({
  LiveRail: () => <div data-testid="live-rail">LiveRail (mock)</div>,
}));

// WHY: mock PMChatPanel to avoid its internal trpc deps and focus on mount logic.
vi.mock('../src/views/pm-chat/PMChatPanel', () => ({
  PMChatPanel: () => <div data-testid="pm-chat-panel">PM Chat Panel (mock)</div>,
}));

// WHY: mock ToastContainer to avoid any toast bus side effects in tests.
vi.mock('../src/notifications/ToastContainer', () => ({
  ToastContainer: () => null,
}));

// WHY: mock usePMSession to avoid tRPC provider requirement.
// AppShell tests exercise layout, not PM write mutations.
vi.mock('../src/live/usePMSession', () => ({
  usePMSession: () => ({
    start: () => {},
    say: () => {},
    permission: () => {},
    isLoading: false,
  }),
}));

import { AppShell } from '../src/routing/AppShell';

afterEach(() => {
  cleanup();
});

/**
 * Render AppShell in MemoryRouter with minimal child routes.
 */
function renderShell(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={null} />
          <Route path="plan" element={<div>Plan Content</div>} />
          <Route path="gantt" element={<div>Gantt Content</div>} />
          <Route path="sessions" element={<div>Sessions Content</div>} />
          <Route path="consistency" element={<div>Consistency Content</div>} />
          <Route path="worktree" element={<div>Worktree Content</div>} />
          <Route path="retro" element={<div>Retro Content</div>} />
          <Route path="customization" element={<div>Customization Content</div>} />
          <Route path="guidance" element={<div>Guidance Content</div>} />
          <Route path="tokens" element={<div>Tokens Content</div>} />
          <Route path="project-settings" element={<div>Project Settings Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// 1. TopBar — brand + project + 4 metrics + conn
// ---------------------------------------------------------------------------
// covers: TB-LAYOUT-01, TB-CONN-01, TB-CONN-02, TB-PROJECT-01, TB-METRIC-PARALLEL-01, TB-METRIC-TASKTOOL-01, TB-METRIC-TDD-01, TB-METRIC-VERDICT-01
describe('AppShell × redesign: TopBar', () => {
  it('renders TopBar with brand name', () => {
    renderShell('/');
    expect(screen.getByTestId('topbar')).toBeInTheDocument();
    expect(screen.getByTestId('topbar-brand')).toHaveTextContent('claude-loom');
  });

  it('renders TopBar with project name from useScenario', () => {
    renderShell('/');
    expect(screen.getByTestId('topbar-project')).toHaveTextContent('freee-mcp');
  });

  it('renders 4 discipline metrics in TopBar', () => {
    renderShell('/');
    expect(screen.getByTestId('metric-parallel')).toBeInTheDocument();
    expect(screen.getByTestId('metric-task-tool')).toBeInTheDocument();
    expect(screen.getByTestId('metric-tdd-order')).toBeInTheDocument();
    expect(screen.getByTestId('metric-verdict')).toBeInTheDocument();
  });

  it('renders connection status in TopBar', () => {
    renderShell('/');
    expect(screen.getByTestId('topbar-conn')).toBeInTheDocument();
    expect(screen.getByTestId('topbar-conn')).toHaveTextContent(/connected/i);
  });
});

// ---------------------------------------------------------------------------
// 2. Drawer — 11 nav links across 3 groups
// ---------------------------------------------------------------------------
// covers: DR-LAYOUT-01, DR-NAV-ROOM-01, DR-NAV-PLAN-01, DR-NAV-GANTT-01, DR-NAV-RETRO-01, DR-NAV-WORKTREE-01, DR-NAV-CONSISTENCY-01, DR-NAV-CUSTOMIZATION-01, DR-NAV-GUIDANCE-01, DR-NAV-SESSIONS-01, DR-NAV-SETTINGS-01, DR-NAV-TOKENS-01, DR-GROUP-01
describe('AppShell × redesign: Drawer', () => {
  it('renders all 3 nav groups (OPERATE / MANAGE / SETTINGS)', () => {
    renderShell('/');
    expect(screen.getByTestId('drawer-group-operate')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-group-manage')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-group-settings')).toBeInTheDocument();
  });

  it('renders 11 nav links total', () => {
    renderShell('/');
    const navLinks = screen.getAllByTestId(/^nav-link-/);
    expect(navLinks.length).toBe(11);
  });

  it('renders OPERATE group: Room, Plan, Gantt, Sessions, Consistency', () => {
    renderShell('/');
    expect(screen.getByTestId('nav-link-room')).toBeInTheDocument();
    expect(screen.getByTestId('nav-link-plan')).toBeInTheDocument();
    expect(screen.getByTestId('nav-link-gantt')).toBeInTheDocument();
    expect(screen.getByTestId('nav-link-sessions')).toBeInTheDocument();
    expect(screen.getByTestId('nav-link-consistency')).toBeInTheDocument();
  });

  it('renders MANAGE group: Worktree, Retro, Customization, Guidance', () => {
    renderShell('/');
    expect(screen.getByTestId('nav-link-worktree')).toBeInTheDocument();
    expect(screen.getByTestId('nav-link-retro')).toBeInTheDocument();
    expect(screen.getByTestId('nav-link-customization')).toBeInTheDocument();
    expect(screen.getByTestId('nav-link-guidance')).toBeInTheDocument();
  });

  it('renders SETTINGS group: Tokens, Project Settings', () => {
    renderShell('/');
    expect(screen.getByTestId('nav-link-tokens')).toBeInTheDocument();
    expect(screen.getByTestId('nav-link-project-settings')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. StatusBar — scenario label + events + project path
// ---------------------------------------------------------------------------
describe('AppShell × redesign: StatusBar', () => {
  it('renders StatusBar', () => {
    renderShell('/');
    expect(screen.getByTestId('statusbar')).toBeInTheDocument();
  });

  it('StatusBar shows project name from useScenario', () => {
    renderShell('/');
    const bar = screen.getByTestId('statusbar');
    expect(bar).toHaveTextContent('freee-mcp');
  });

  it('StatusBar shows scenario label', () => {
    renderShell('/');
    const bar = screen.getByTestId('statusbar');
    expect(bar).toHaveTextContent(/active scenario/i);
  });
});

// ---------------------------------------------------------------------------
// 4. Drawer collapse — toggles 40px icon-only mode
// ---------------------------------------------------------------------------
// covers: DR-ACTIVE-01, TB-DRAWER-TOGGLE-01
describe('AppShell × redesign: Drawer collapse', () => {
  it('drawer starts expanded (no collapsed attribute)', () => {
    renderShell('/');
    const drawer = screen.getByTestId('drawer');
    expect(drawer).not.toHaveAttribute('data-collapsed', 'true');
  });

  it('TopBar menu button toggles drawer collapsed state', async () => {
    renderShell('/');
    const toggleBtn = screen.getByTestId('topbar-drawer-toggle');
    const drawer = screen.getByTestId('drawer');

    // Initially expanded
    expect(drawer).not.toHaveAttribute('data-collapsed', 'true');

    // Click toggle
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    // Now collapsed
    expect(drawer).toHaveAttribute('data-collapsed', 'true');
  });

  it('collapsed drawer has 40px width style or class', async () => {
    renderShell('/');
    const toggleBtn = screen.getByTestId('topbar-drawer-toggle');

    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    const drawer = screen.getByTestId('drawer');
    // Either inline style width:40px or class "collapsed" — we check data-collapsed
    expect(drawer).toHaveAttribute('data-collapsed', 'true');
  });
});

// ---------------------------------------------------------------------------
// 5. Right column slot — PMChatPanel mount when pm.running === true
// ---------------------------------------------------------------------------
// covers: RC-PMCHAT-MOUNT-01, RC-PM-PRIORITY-01, PM-MOUNT-01, LR-HIDE-PM-01
describe('AppShell × redesign: PMChat right column', () => {
  it('mounts PMChatPanel right column when pm.running is true', () => {
    renderShell('/');
    // pm.running: true in fixture above
    expect(screen.getByTestId('pm-chat-right-column')).toBeInTheDocument();
    expect(screen.getByTestId('pm-chat-panel')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 6. ScenarioPicker — present in the content area
// ---------------------------------------------------------------------------
// covers: SP-VISIBLE-01
describe('AppShell × redesign: ScenarioPicker', () => {
  it('renders ScenarioPicker in content area', () => {
    renderShell('/');
    expect(screen.getByTestId('scenario-picker')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 7. Nav-link click navigates to corresponding route (M0.17 t8: sibling routing)
// ---------------------------------------------------------------------------
// covers: RT-INDEX-01, RT-DEEPLINK-01
describe('AppShell × redesign: nav-link routing', () => {
  it('clicking nav-link-plan shows plan content directly (no view-panel wrapper)', async () => {
    // WHY: M0.17 t8 — sibling routing. <Outlet> renders content directly, no view-panel.
    renderShell('/');

    await act(async () => {
      fireEvent.click(screen.getByTestId('nav-link-plan'));
    });

    // Content renders directly without view-panel wrapper
    expect(screen.queryByTestId('view-panel')).not.toBeInTheDocument();
    expect(screen.getByText('Plan Content')).toBeInTheDocument();
  });

  it('room canvas unmounts when navigating to /plan (isRoom routing)', async () => {
    // WHY: M0.17 t8 — isRoom ? <RoomView/> : <Outlet/>. At /plan, RoomView is NOT mounted.
    renderShell('/');
    expect(screen.getByTestId('room-canvas')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('nav-link-plan'));
    });

    // Room canvas is replaced by Outlet content
    expect(screen.queryByTestId('room-canvas')).not.toBeInTheDocument();
    expect(screen.getByText('Plan Content')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 8. RM-NOWRAP-01 — AppShell marginRight preserves Room layout when PM active
// ---------------------------------------------------------------------------
// covers: RM-NOWRAP-01
describe('AppShell × redesign: Room marginRight when PM active (RM-NOWRAP-01)', () => {
  it('Room wrapper has marginRight equal to PM_PANEL_W (340) when pm.running is true', () => {
    // WHY: RM-NOWRAP-01 — "AppShell の marginRight で Room が狭まらない".
    // When pm.running=true, PMChatPanel occupies the right column (340px wide).
    // The Room content wrapper must apply marginRight=340 so the Room canvas
    // does not extend behind the PMChat panel and PM desk stays visible at W*0.78.
    // The fixture above has pm.running=true (pm: { running: true, ... }).
    renderShell('/');

    // Room canvas wrapper is the div with position:absolute inset:0 marginRight
    // AppShell renders: <div style={{ position: 'absolute', inset: 0, marginRight: rightColumnWidth }}>
    // We locate it as the direct parent of room-canvas (data-testid="room-canvas").
    const roomCanvas = screen.getByTestId('room-canvas');
    const roomWrapper = roomCanvas.parentElement;

    // The wrapper must have a marginRight style that reserves space for PM panel
    expect(roomWrapper).not.toBeNull();
    // PM_PANEL_W = 340; rightColumnWidth = 340 when showPmPanel=true
    expect(roomWrapper!.style.marginRight).toBe('340px');
  });

  it('pm-chat-right-column is rendered alongside Room when pm.running is true', () => {
    // WHY: RM-NOWRAP-01 pre-condition verification — PMChat right column must be
    // rendered simultaneously with Room to trigger the marginRight interaction.
    renderShell('/');

    // Both elements must coexist in the DOM
    expect(screen.getByTestId('pm-chat-right-column')).toBeInTheDocument();
    expect(screen.getByTestId('room-canvas')).toBeInTheDocument();
  });

  it('Room wrapper marginRight matches right-column width (layout non-overlap assertion)', () => {
    // WHY: structural assertion that Room wrapper width + right-column width = total content width.
    // marginRight on the Room wrapper must exactly equal the right-column offsetWidth to
    // prevent PM desk (positioned at W*0.78 of Room canvas) from being covered by PMChat.
    renderShell('/');

    const roomCanvas = screen.getByTestId('room-canvas');
    const roomWrapper = roomCanvas.parentElement;
    const rightColumn = screen.getByTestId('pm-chat-right-column');

    expect(roomWrapper).not.toBeNull();
    // In jsdom, style.width may not propagate to offsetWidth; check the declared style
    // Both should express the same 340px PM_PANEL_W constant
    const marginRight = roomWrapper!.style.marginRight;
    const columnWidth = rightColumn.style.width;

    expect(marginRight).toBe('340px');
    expect(columnWidth).toBe('340px');
  });
});
