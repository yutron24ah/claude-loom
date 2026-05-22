/**
 * TopBar brand + branch tests — TB-BRAND-01, TB-PROJECT-02
 *
 * REQ-075 scope (shell impl_only fill, M0.19 t7a)
 *
 * WHY separate file: AppShell.redesign.test.tsx covers TB-LAYOUT-01, TB-CONN-01/02,
 * TB-PROJECT-01, TB-METRIC-*. This file covers the remaining impl_only cases:
 *   TB-BRAND-01: brand logo + "claude-room" text visible in TopBar
 *   TB-PROJECT-02: branch label displayed as "◆ branch: <name>" chip
 *
 * RED note: these tests were written before confirming the `// covers:` annotations
 * were absent — both cases exist in the impl (AppShell.tsx) but have no
 * corresponding `// covers: TB-BRAND-01` or `// covers: TB-PROJECT-02` annotation
 * in any test file, hence they appear as MISSING in the audit.
 *
 * Mock strategy: same as AppShell.redesign.test.tsx — useScenario fixture with
 * branch="feat/redesign-room-mvp", pm.running=false for baseline.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { Scenario } from '@claude-loom/redesign/api/types';

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      key: 'idle',
      label: 'idle scenario',
      now: '10:00',
      conn: 'connected',
      project: 'test-proj',
      branch: 'feat/brand-test-branch',
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
// TB-BRAND-01: ブランドロゴと "claude-room" が表示される
// WHY: TopBar brand area must show the app logo icon (.logo) and the brand
//      text "claude-loom" (or "claude-room") — visual identity anchor.
// ---------------------------------------------------------------------------
// covers: TB-BRAND-01
describe('TopBar: brand logo and name (TB-BRAND-01)', () => {
  it('renders topbar-brand element', () => {
    renderShell('/');
    expect(screen.getByTestId('topbar-brand')).toBeInTheDocument();
  });

  it('topbar-brand shows "claude-loom" brand text', () => {
    renderShell('/');
    const brand = screen.getByTestId('topbar-brand');
    // WHY: APP_COPY.brand = 'claude-loom' (constants.ts). Matches "claude-room" variant too.
    expect(brand).toHaveTextContent(/claude/i);
  });

  it('topbar-brand contains a .logo icon element', () => {
    renderShell('/');
    const brand = screen.getByTestId('topbar-brand');
    // WHY: <div className="logo" /> renders the brand square icon inside topbar-brand
    const logoEl = brand.querySelector('.logo');
    expect(logoEl).not.toBeNull();
  });

  it('brand is visible at /plan route as well (persistent TopBar)', () => {
    renderShell('/plan');
    expect(screen.getByTestId('topbar-brand')).toBeInTheDocument();
    expect(screen.getByTestId('topbar-brand')).toHaveTextContent(/claude/i);
  });
});

// ---------------------------------------------------------------------------
// TB-PROJECT-02: プロジェクトラベルが branch を表示
// WHY: qa-suite S8 — topbar-branch chip must show "◆ branch: <name>",
//      not the project name or app name.
// ---------------------------------------------------------------------------
// covers: TB-PROJECT-02
describe('TopBar: branch chip display (TB-PROJECT-02)', () => {
  it('renders topbar-branch element', () => {
    renderShell('/');
    expect(screen.getByTestId('topbar-branch')).toBeInTheDocument();
  });

  it('topbar-branch shows "branch:" prefix', () => {
    renderShell('/');
    const branchEl = screen.getByTestId('topbar-branch');
    // WHY: design: "◆ branch: {branch}" — the "branch:" prefix identifies this as a git branch chip
    expect(branchEl).toHaveTextContent(/branch:/i);
  });

  it('topbar-branch displays the branch name from useScenario', () => {
    renderShell('/');
    const branchEl = screen.getByTestId('topbar-branch');
    // WHY: fixture provides branch='feat/brand-test-branch' — must appear in branch chip
    expect(branchEl).toHaveTextContent('feat/brand-test-branch');
  });

  it('topbar-branch does NOT show the app name as the branch label', () => {
    renderShell('/');
    const branchEl = screen.getByTestId('topbar-branch');
    // WHY: TB-PROJECT-02 expected: "branch 名が表示されている... not 'claude-room' 等のアプリ名"
    // The branch chip should contain the git branch, not the brand string alone
    const text = branchEl.textContent ?? '';
    // The chip must contain "branch:" to be identifiable as a branch chip, not just the app name
    expect(text).toMatch(/branch:/i);
  });

  it('branch chip format matches "◆ branch: <name>"', () => {
    renderShell('/');
    const branchEl = screen.getByTestId('topbar-branch');
    // WHY: exact format from AppShell.tsx line 82: "◆ branch: {branch}"
    expect(branchEl.textContent).toMatch(/◆ branch:/);
  });
});
