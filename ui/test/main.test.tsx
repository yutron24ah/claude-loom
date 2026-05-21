/**
 * Smoke test: verify App component renders AppShell into DOM.
 * WHY: App.tsx delegates to AppRouter (react-router v6 BrowserRouter + AppShell).
 * We verify the top-level shell structure is present: room-canvas + topbar.
 *
 * M0.15 t14 (REQ-075) replaced the discipline-header placeholder with the redesign
 * TopBar (4 discipline metrics + brand + project + conn dot). The smoke contract
 * is now "AppShell renders the redesign shell" — same intent, new testid.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// WHY: ResizeObserver not available in jsdom — new RoomView uses it internally.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// WHY: useScenario connects to WebSocket daemon — mock to avoid network in smoke test.
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
    pm: { running: false, pendingApprovals: [] },
    worktrees: [],
    disciplineMetrics: { tdd: 0, doc: 0, review: 0, retro: 0 },
  }),
  useScenarioMockKey: () => 'idle' as const,
  getScenarioStore: () => ({
    getSnapshot: () => ({
      agents: {},
      worktrees: [],
      pm: { running: false, pendingApprovals: [] },
    }),
    subscribe: () => () => {},
    applyAgentChange: () => {},
    connect: () => {},
  }),
  SCENARIO_KEYS: ['idle', 'active', 'failed'] as const,
}));

// WHY: mock usePMSession to avoid tRPC provider requirement in smoke test.
vi.mock('../src/live/usePMSession', () => ({
  usePMSession: () => ({
    start: () => {},
    say: () => {},
    permission: () => {},
    isLoading: false,
  }),
}));

// WHY: mock LiveRail to avoid StreamEvent type resolution in jsdom smoke test.
// AppShell renders LiveRail at '/' when pm.running is false.
vi.mock('../src/views/room/LiveRail', () => ({
  LiveRail: () => <div data-testid="live-rail">LiveRail (mock)</div>,
}));

import { AppShell } from '../src/routing/AppShell';

afterEach(() => {
  cleanup();
});

// covers: LR-MOUNT-01
describe('App smoke test', () => {
  it('renders AppShell with room-canvas into DOM', () => {
    // Render AppShell directly (App wraps it in BrowserRouter which is not available in jsdom)
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppShell />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('room-canvas')).toBeInTheDocument();
  });

  it('renders topbar (redesign shell) with brand and metrics', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppShell />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('topbar')).toBeInTheDocument();
  });
});
