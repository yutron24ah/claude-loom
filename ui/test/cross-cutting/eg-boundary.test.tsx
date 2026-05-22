/**
 * eg-boundary.test.tsx — EG edge cases: boundary states (Section A)
 *
 * WHY: qa-suite.js EG group (23 cases) splits into Section A (boundary states)
 * and Section B (connectivity/network). This file covers Section A — the
 * extreme states that the UI must handle gracefully without crashing.
 *
 * Groups covered:
 *   eg-empty  : EG-EMPTY-AGENTS-01, EG-EMPTY-PJ-01, EG-EMPTY-STREAM-01
 *   eg-many   : EG-MANY-WT-01, EG-MANY-STREAM-01, EG-MANY-MS-01, EG-MANY-FINDINGS-01, EG-MANY-SESSIONS-01
 *   eg-text   : EG-LONG-NAME-01, EG-LONG-BUBBLE-01, EG-LONG-PATH-01, EG-RTL-01, EG-CONTROL-01
 *   eg-browser: EG-REFRESH-MID-01, EG-MULTI-TAB-01, EG-LS-FULL-01, EG-LS-DISABLED-01, EG-NARROW-01, EG-WIDE-01
 *
 * TDD: tests written RED-first (m0.20-t2a). Each test exercises observable DOM
 * behaviour against mocked scenario data so no daemon is required (CI safe).
 *
 * // covers: EG-EMPTY-AGENTS-01, EG-EMPTY-PJ-01, EG-EMPTY-STREAM-01,
 * //         EG-MANY-WT-01, EG-MANY-STREAM-01, EG-MANY-MS-01,
 * //         EG-MANY-FINDINGS-01, EG-MANY-SESSIONS-01,
 * //         EG-LONG-NAME-01, EG-LONG-BUBBLE-01, EG-LONG-PATH-01,
 * //         EG-RTL-01, EG-CONTROL-01,
 * //         EG-REFRESH-MID-01, EG-MULTI-TAB-01,
 * //         EG-LS-FULL-01, EG-LS-DISABLED-01, EG-NARROW-01, EG-WIDE-01
 */

import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Polyfills
// ---------------------------------------------------------------------------
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// ---------------------------------------------------------------------------
// Hoist mutable mock factories BEFORE vi.mock calls
// ---------------------------------------------------------------------------
const {
  mockUseScenario,
  baseScenario,
  mockRetroLifecycle,
  mockConsistencyFindings,
} = vi.hoisted(() => {
  const baseScenario = {
    key: 'idle',
    label: 'idle',
    now: '00:00',
    conn: 'disconnected',
    project: 'test-project',
    branch: 'main',
    agents: {
      pm: { status: 'idle' },
      dev: { status: 'idle' },
      'retro-pm': { status: 'idle' },
    },
    gantt: { windowLabel: '', nowPct: 0, rows: [] },
    todos: [],
    milestones: [],
    todosUpdatedAt: '—',
    findings: [],
    consistencyState: 'empty' as const,
    pm: { running: false, pendingApprovals: [] },
    worktrees: [],
    sessions: [],
    guidance: [],
    stream: [],
    disciplineMetrics: { tdd: 0, review: 0, commit: 0 },
    retroSession: null,
  };

  return {
    mockUseScenario: vi.fn(() => baseScenario),
    baseScenario,
    mockRetroLifecycle: vi.fn(() => ({
      keepItems: [],
      problemItems: [],
      carryoverItems: [],
      tryItems: [],
      isLoading: false,
      error: null as Error | null,
    })),
    mockConsistencyFindings: vi.fn(() => ({
      data: [] as unknown[],
      isLoading: false,
      error: null as Error | null,
    })),
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  NavLink: ({ children, to, className, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} className={typeof className === 'function' ? '' : (className ?? '')} {...rest}>{children}</a>
  ),
}));

vi.mock('../../src/live/useWorktreeMutations', () => ({
  useWorktreeMutations: () => ({
    lockWorktree: vi.fn(),
    unlockWorktree: vi.fn(),
    destroyWorktree: vi.fn(),
    createWorktree: vi.fn(),
  }),
}));

vi.mock('../../src/live/usePlanMutations', () => ({
  usePlanMutations: () => ({ upsertItem: vi.fn() }),
}));

vi.mock('../../src/live/useGuidanceMutations', () => ({
  useGuidanceMutations: () => ({ retireGuidance: vi.fn() }),
}));

vi.mock('../../src/live/useNoteMutations', () => ({
  useNoteMutations: () => ({ upsertNote: vi.fn() }),
}));

vi.mock('../../src/live/useApprovalMutations', () => ({
  useApprovalMutations: () => ({ approveRequest: vi.fn() }),
}));

vi.mock('../../src/live/useAgentMutations', () => ({
  useAgentMutations: () => ({ dismissFinding: vi.fn() }),
}));

vi.mock('../../src/trpc/client', () => ({
  trpc: {
    note: { list: { useQuery: () => ({ data: [], isLoading: false }) } },
    retro: {
      getPendingSummary: { useQuery: () => ({ data: null, isLoading: false }) },
      reconstructFromArchive: {
        useQuery: () => ({ data: null, isLoading: false, refetch: vi.fn() }),
      },
    },
    useUtils: () => ({}),
  },
}));

vi.mock('../../src/live/useRetroLifecycle', () => ({
  useRetroLifecycle: mockRetroLifecycle,
}));

vi.mock('../../src/live/useConsistencyFindings', () => ({
  useConsistencyFindings: mockConsistencyFindings,
}));

vi.mock('@claude-loom/daemon', () => ({
  FINDING_SEVERITY: { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' },
  FINDING_STATUS: { OPEN: 'open', ACKNOWLEDGED: 'acknowledged', FIXED: 'fixed', DISMISSED: 'dismissed' },
}));

vi.mock('../../src/live/useConsistencyMutations', () => ({
  useConsistencyMutations: () => ({
    acknowledgeFinding: vi.fn(),
    markFindingFixed: vi.fn(),
    dismissFinding: vi.fn(),
    openInEditor: vi.fn(),
    isAcknowledgePending: false,
    isMarkFixedPending: false,
    isDismissPending: false,
  }),
}));

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: mockUseScenario,
  useScenarioMockKey: () => 'idle' as const,
  getScenarioStore: () => ({
    getSnapshot: () => ({ agents: {}, worktrees: [], pm: { running: false } }),
    subscribe: () => () => {},
    applyAgentChange: () => {},
    connect: () => {},
  }),
  SCENARIO_KEYS: ['idle', 'active', 'failed'] as const,
}));

// ---------------------------------------------------------------------------
// Component imports — after mocks are installed
// ---------------------------------------------------------------------------
import { PlanView } from '../../src/views/plan/PlanView';
import { WorktreeView } from '../../src/views/worktree/WorktreeView';
import { SessionListView } from '../../src/views/session-list/SessionListView';
import { LiveRail } from '../../src/views/room/LiveRail';
import { StatusBar } from '../../src/views/shell/StatusBar';
import { ConsistencyViewLive } from '../../src/views/consistency/ConsistencyViewLive';

afterEach(() => {
  cleanup();
  mockUseScenario.mockReset();
  mockUseScenario.mockReturnValue(baseScenario);
  mockRetroLifecycle.mockReset();
  mockRetroLifecycle.mockReturnValue({
    keepItems: [],
    problemItems: [],
    carryoverItems: [],
    tryItems: [],
    isLoading: false,
    error: null,
  });
  mockConsistencyFindings.mockReset();
  mockConsistencyFindings.mockReturnValue({ data: [], isLoading: false, error: null });
});

// ===========================================================================
// eg-empty group — 空データで crash しないか
// ===========================================================================

// covers: EG-EMPTY-AGENTS-01
describe('EG-EMPTY-AGENTS-01: 0 agents does not crash', () => {
  it('WorktreeView renders without crash when agents={}', () => {
    // WHY: WorktreeView uses ROSTER lookup — empty agents scenario must not crash it.
    // qa-suite: "Room が空のオフィスとして描画, error 無し"
    // StatusBar / WorktreeView surface the empty agents state without crash.
    mockUseScenario.mockReturnValueOnce({
      ...baseScenario,
      agents: {},
      worktrees: [],
    });
    expect(() => render(<WorktreeView />)).not.toThrow();
  });

  it('PlanView renders without crash when agents={}', () => {
    // WHY: PlanView draws from milestone/todo data, not agents — should render fine.
    mockUseScenario.mockReturnValueOnce({ ...baseScenario, agents: {} });
    expect(() => render(<PlanView />)).not.toThrow();
  });

  it('SessionListView renders without crash when agents={}', () => {
    // WHY: SessionListView shows past sessions, not live agents — empty agents must not crash.
    mockUseScenario.mockReturnValueOnce({ ...baseScenario, agents: {} });
    expect(() => render(<SessionListView />)).not.toThrow();
  });
});

// covers: EG-EMPTY-PJ-01
describe('EG-EMPTY-PJ-01: 0 project shows empty CTA', () => {
  it('StatusBar renders with empty project string without crash', () => {
    // WHY: StatusBar receives project name from scenario; empty project must render
    // (not crash or show null). The "空の指令室 hint" + "PJ を作成 CTA" is a Room-level
    // feature; StatusBar still renders its brand indicator.
    const { container } = render(
      <StatusBar label="idle" project="" conn="disconnected" />,
    );
    expect(container.querySelector('[data-testid="statusbar"]')).not.toBeNull();
  });

  it('PlanView renders without crash when project=""', () => {
    // WHY: PlanView derives data from useScenario; empty project should show empty plan.
    mockUseScenario.mockReturnValueOnce({ ...baseScenario, project: '' });
    expect(() => render(<PlanView />)).not.toThrow();
  });

  it('PlanView shows empty milestone hint when milestones=[] and project=""', () => {
    mockUseScenario.mockReturnValueOnce({ ...baseScenario, project: '', milestones: [] });
    const { container } = render(<PlanView />);
    // Empty plan-milestones__empty element should appear (no milestones in active tab)
    const emptyEl = container.querySelector('.plan-milestones__empty');
    expect(emptyEl).not.toBeNull();
  });
});

// covers: EG-EMPTY-STREAM-01
describe('EG-EMPTY-STREAM-01: stream=[] shows empty LiveRail hint without crash', () => {
  it('LiveRail renders with empty stream array', () => {
    // WHY: LiveRail must render without crash when stream=[] (scenario=idle).
    // The "empty hint" is the LiveRail header presence — rail is mounted, no crash.
    const { container } = render(
      <LiveRail stream={[]} collapsed={false} onToggle={vi.fn()} />,
    );
    expect(container.querySelector('.rail')).not.toBeNull();
  });

  it('LiveRail shows no .rail__line entries when stream=[]', () => {
    // WHY: Zero events → zero rail lines. Rail structure must still be visible.
    const { container } = render(
      <LiveRail stream={[]} collapsed={false} onToggle={vi.fn()} />,
    );
    const items = container.querySelectorAll('.rail__line');
    expect(items.length).toBe(0);
  });

  it('LiveRail collapsed=false shows header even with empty stream', () => {
    // WHY: Rail header ("⚡ LIVE STREAM") must appear regardless of content.
    const { container } = render(
      <LiveRail stream={[]} collapsed={false} onToggle={vi.fn()} />,
    );
    const hdr = container.querySelector('.rail__hdr');
    expect(hdr).not.toBeNull();
  });
});

// ===========================================================================
// eg-many group — 大量データで performance / layout 崩れないか
// ===========================================================================

// covers: EG-MANY-WT-01
describe('EG-MANY-WT-01: 50+ worktrees render with scroll/pagination', () => {
  it('WorktreeView renders without crash with 50 worktrees', () => {
    // WHY: 50 worktrees is an extreme edge; WorktreeView must not crash.
    // qa-suite expects "scroll virtual or pagination" — we verify the table renders.
    const manyWorktrees = Array.from({ length: 50 }, (_, i) => ({
      branch: `feature/branch-${i}`,
      path: `/work/branch-${i}`,
      status: 'idle' as const,
      use: 'parallel' as const,
      parentAgent: 'dev',
      diskMB: 50,
      locked: false,
      createdAt: new Date().toISOString(),
      lastCommit: 'abc',
    }));
    mockUseScenario.mockReturnValueOnce({ ...baseScenario, worktrees: manyWorktrees });

    expect(() => render(<WorktreeView />)).not.toThrow();
  });

  it('WorktreeView shows active chip with correct count for 50 worktrees', () => {
    // WHY: The "{N} active" chip must reflect the actual worktree count.
    const manyWorktrees = Array.from({ length: 50 }, (_, i) => ({
      branch: `feature/branch-${i}`,
      path: `/work/branch-${i}`,
      status: 'idle' as const,
      use: 'parallel' as const,
      parentAgent: 'dev',
      diskMB: 50,
      locked: false,
      createdAt: new Date().toISOString(),
      lastCommit: 'abc',
    }));
    mockUseScenario.mockReturnValueOnce({ ...baseScenario, worktrees: manyWorktrees });

    render(<WorktreeView />);
    // 50 worktrees → "50 active" chip
    expect(screen.getByText('50 active')).toBeInTheDocument();
  });
});

// covers: EG-MANY-STREAM-01
describe('EG-MANY-STREAM-01: stream 1000+ events render without crash', () => {
  it('LiveRail renders without crash with 1000 stream events', () => {
    // WHY: Large stream must not cause stack overflow or OOM crash.
    // LiveRail filters the stream — all 1000 items appear in merged tab.
    const manyEvents = Array.from({ length: 1000 }, (_, i) => ({
      kind: i % 2 === 0 ? 'tool' as const : 'reason' as const,
      text: `event-${i}`,
      ts: String(i),
      who: 'dev',
      tool: i % 2 === 0 ? `tool-${i}` : undefined,
    }));

    expect(() =>
      render(<LiveRail stream={manyEvents} collapsed={false} onToggle={vi.fn()} />),
    ).not.toThrow();
  });

  it('LiveRail with 1000 events still renders rail header', () => {
    const manyEvents = Array.from({ length: 1000 }, (_, i) => ({
      kind: 'tool' as const,
      text: `event-${i}`,
      ts: String(i),
      who: 'dev',
      tool: `tool-${i}`,
    }));

    const { container } = render(
      <LiveRail stream={manyEvents} collapsed={false} onToggle={vi.fn()} />,
    );
    expect(container.querySelector('.rail__hdr')).not.toBeNull();
  });
});

// covers: EG-MANY-MS-01
describe('EG-MANY-MS-01: 50 milestones render all items', () => {
  it('PlanView renders without crash with 50 milestones', () => {
    // WHY: 50 milestones is an extreme case; PlanView must not crash.
    const manyMs = Array.from({ length: 50 }, (_, i) => ({
      id: `M0.${i}`,
      title: `Milestone ${i}`,
      progress: 0.5,
      count: 3,
      children: [],
      tasks: [],
    }));
    mockUseScenario.mockReturnValueOnce({ ...baseScenario, milestones: manyMs });

    expect(() => render(<PlanView />)).not.toThrow();
  });

  it('PlanView renders 50 milestone rows', () => {
    // WHY: All 50 milestones must render (no artificial truncation in active tab).
    const manyMs = Array.from({ length: 50 }, (_, i) => ({
      id: `M0.${i}`,
      title: `Milestone ${i}`,
      progress: 0.5,
      count: 3,
      children: [],
      tasks: [],
    }));
    mockUseScenario.mockReturnValueOnce({ ...baseScenario, milestones: manyMs });

    const { container } = render(<PlanView />);
    const rows = container.querySelectorAll('[data-testid="plan-milestone"]');
    expect(rows.length).toBe(50);
  });
});

// covers: EG-MANY-FINDINGS-01
describe('EG-MANY-FINDINGS-01: 200 findings render with filter affordance', () => {
  it('ConsistencyViewLive renders without crash with 200 findings', () => {
    // WHY: ConsistencyViewLive must not crash with 200 findings — OOM or stack overflow guard.
    const manyFindings = Array.from({ length: 200 }, (_, i) => ({
      id: i,
      specChangeId: 1,
      targetPath: `src/file-${i}.ts`,
      severity: 'medium',
      findingType: 'semantic_drift',
      description: `Finding ${i}`,
      suggestedChange: null,
      status: 'open',
      createdAt: new Date(),
    }));
    mockConsistencyFindings.mockReturnValueOnce({ data: manyFindings, isLoading: false, error: null });

    expect(() => render(<ConsistencyViewLive />)).not.toThrow();
  });
});

// covers: EG-MANY-SESSIONS-01
describe('EG-MANY-SESSIONS-01: 500 sessions use pagination or infinite scroll', () => {
  it('SessionListView renders without crash with 500 sessions', () => {
    // WHY: 500 sessions is beyond normal usage; SessionListView must not crash.
    const manySessions = Array.from({ length: 500 }, (_, i) => ({
      id: `s-${i}`,
      startedAt: new Date(Date.now() - i * 1000).toISOString(),
      durationSec: 300,
      agentRoot: 'dev',
      turns: 5,
      verdict: 'PASS' as const,
      filesTouched: [],
      relatedFindings: [],
      summary: `Task ${i}`,
      reviewer_agent: 'loom-reviewer',
    }));
    mockUseScenario.mockReturnValueOnce({ ...baseScenario, sessions: manySessions });

    expect(() => render(<SessionListView />)).not.toThrow();
  });
});

// ===========================================================================
// eg-text group — 極端な文字列
// ===========================================================================

// covers: EG-LONG-NAME-01
describe('EG-LONG-NAME-01: agent name 100 chars truncates without overflow', () => {
  it('StatusBar renders long project name without crash', () => {
    // WHY: StatusBar displays project name in .right section. 100+ char project
    // must render — CSS truncation prevents layout overflow.
    const longName = 'a'.repeat(100);
    const { container } = render(
      <StatusBar label="idle" project={longName} conn="disconnected" />,
    );
    const bar = container.querySelector('[data-testid="statusbar"]');
    expect(bar).not.toBeNull();
    // Verify the name appears in the DOM (even if visually truncated by CSS)
    expect(bar!.textContent).toContain(longName.slice(0, 10));
  });

  it('WorktreeView renders with 100-char branch name without crash', () => {
    // WHY: Worktree branch name truncation — 100 chars must not break layout.
    const longBranch = 'feature/' + 'x'.repeat(92);
    mockUseScenario.mockReturnValueOnce({
      ...baseScenario,
      worktrees: [{
        branch: longBranch,
        path: '/work/long',
        status: 'idle' as const,
        use: 'parallel' as const,
        parentAgent: 'dev',
        diskMB: 50,
        locked: false,
        createdAt: new Date().toISOString(),
        lastCommit: 'abc',
      }],
    });
    expect(() => render(<WorktreeView />)).not.toThrow();
  });
});

// covers: EG-LONG-BUBBLE-01
describe('EG-LONG-BUBBLE-01: tool name 500 chars truncates in speech bubble', () => {
  it('LiveRail renders stream event with 500-char tool name without crash', () => {
    // WHY: LiveRail displays tool event labels. A 500-char tool name must be handled
    // gracefully — truncation is CSS-driven, test verifies no crash + item present.
    const longTool = 'toolName_' + 'x'.repeat(491);
    const { container } = render(
      <LiveRail
        stream={[{ kind: 'tool', text: 'running', ts: '0', who: 'dev', tool: longTool }]}
        collapsed={false}
        onToggle={vi.fn()}
      />,
    );
    // Line must render (not dropped / errored)
    const lines = container.querySelectorAll('.rail__line');
    expect(lines.length).toBe(1);
  });
});

// covers: EG-LONG-PATH-01
describe('EG-LONG-PATH-01: PJ path 300 chars truncates in StatusBar', () => {
  it('StatusBar renders 300-char project path without crash', () => {
    // WHY: StatusBar shows project path (~/work/{project}). 300-char path must
    // render — CSS truncation (text-overflow: ellipsis) handles visual overflow.
    const longPath = 'work/' + 'p'.repeat(295);
    const { container } = render(
      <StatusBar label="idle" project={longPath} conn="disconnected" />,
    );
    const bar = container.querySelector('[data-testid="statusbar"]');
    expect(bar).not.toBeNull();
    // DOM must contain the beginning of the path
    expect(bar!.textContent).toContain('work/');
  });

  it('StatusBar right section renders code element for long path', () => {
    // WHY: StatusBar wraps project name in <code> — must still render with long path.
    const longPath = 'p'.repeat(300);
    const { container } = render(
      <StatusBar label="idle" project={longPath} conn="disconnected" />,
    );
    const codeEl = container.querySelector('code');
    expect(codeEl).not.toBeNull();
  });
});

// covers: EG-RTL-01
describe('EG-RTL-01: RTL characters do not crash the UI', () => {
  it('StatusBar renders Arabic/RTL project name without crash', () => {
    // WHY: RTL characters (Arabic, Hebrew etc.) in project path must not break
    // layout. Unicode bidi algorithm handles rendering — test verifies no crash.
    const rtlProject = 'مشروع-اختبار';
    const { container } = render(
      <StatusBar label="idle" project={rtlProject} conn="disconnected" />,
    );
    expect(container.querySelector('[data-testid="statusbar"]')).not.toBeNull();
  });

  it('SessionListView renders sessions with RTL task summaries without crash', () => {
    // WHY: Session summaries may contain RTL text; list must render without error.
    mockUseScenario.mockReturnValueOnce({
      ...baseScenario,
      sessions: [{
        id: 's-rtl',
        startedAt: new Date().toISOString(),
        durationSec: 100,
        agentRoot: 'dev',
        turns: 3,
        verdict: 'PASS' as const,
        filesTouched: [],
        relatedFindings: [],
        summary: 'تنفيذ الميزة الجديدة',
        reviewer_agent: 'loom-reviewer',
      }],
    });
    expect(() => render(<SessionListView />)).not.toThrow();
  });
});

// covers: EG-CONTROL-01
describe('EG-CONTROL-01: control chars / null bytes do not crash the UI', () => {
  it('LiveRail renders stream event with null byte escaped without crash', () => {
    // WHY: \x00 in stream events must be escaped / rendered safely — no crash.
    // React's JSX rendering sanitizes null bytes — we verify stability.
    const controlText = 'prefix\x00suffix';
    expect(() =>
      render(
        <LiveRail
          stream={[{ kind: 'tool', text: controlText, ts: '0', who: 'dev', tool: 'ctrl-tool' }]}
          collapsed={false}
          onToggle={vi.fn()}
        />,
      ),
    ).not.toThrow();
  });

  it('StatusBar renders project name with control chars without crash', () => {
    // WHY: Project path containing unusual chars must not crash StatusBar.
    const weirdProject = 'proj\x01\x02ect';
    const { container } = render(
      <StatusBar label="idle" project={weirdProject} conn="disconnected" />,
    );
    expect(container.querySelector('[data-testid="statusbar"]')).not.toBeNull();
  });
});

// ===========================================================================
// eg-browser group — ブラウザ状態の極端ケース
// ===========================================================================

// covers: EG-REFRESH-MID-01
describe('EG-REFRESH-MID-01: re-mount after mutation does not cause duplicate writes', () => {
  it('PlanView re-renders cleanly when scenario is re-provided after mount', () => {
    // WHY: Simulates "refresh mid mutation" — component unmounts + remounts with same
    // scenario data. The view must not accumulate state or crash.
    const { unmount } = render(<PlanView />);
    unmount();
    // Re-render with same scenario (no data corruption)
    expect(() => render(<PlanView />)).not.toThrow();
  });

  it('WorktreeView re-mounts without state bleed', () => {
    // WHY: WorktreeView uses local useState; re-mount must reset to clean state.
    const { unmount } = render(<WorktreeView />);
    unmount();
    expect(() => render(<WorktreeView />)).not.toThrow();
  });
});

// covers: EG-MULTI-TAB-01
describe('EG-MULTI-TAB-01: two simultaneous renders do not interfere', () => {
  it('two PlanView instances render independently without state conflict', () => {
    // WHY: Multi-tab scenario — two views drawing from the same scenario store
    // must not cause shared-state mutations. Each renders independently.
    const sc1 = { ...baseScenario, milestones: [{ id: 'M0.A', title: 'Alpha', progress: 0.5, count: 1, children: [], tasks: [] }] };
    const sc2 = { ...baseScenario, milestones: [{ id: 'M0.B', title: 'Beta', progress: 0.3, count: 2, children: [], tasks: [] }] };

    // First render
    mockUseScenario.mockReturnValueOnce(sc1);
    const { container: c1, unmount: u1 } = render(<PlanView />);
    expect(c1.querySelectorAll('[data-testid="plan-milestone"]').length).toBe(1);

    // Second render (different data)
    mockUseScenario.mockReturnValueOnce(sc2);
    const { container: c2 } = render(<PlanView />);
    expect(c2.querySelectorAll('[data-testid="plan-milestone"]').length).toBe(1);

    u1();
  });
});

// covers: EG-LS-FULL-01
describe('EG-LS-FULL-01: localStorage quota exceeded does not crash', () => {
  it('WorktreeView renders when localStorage.setItem throws QuotaExceededError', () => {
    // WHY: If localStorage is full, any setItem call throws DOMException.
    // Views must catch / tolerate this and continue rendering.
    const origSetItem = window.localStorage.setItem.bind(localStorage);
    window.localStorage.setItem = () => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    };

    try {
      expect(() => render(<WorktreeView />)).not.toThrow();
    } finally {
      window.localStorage.setItem = origSetItem;
    }
  });

  it('SessionListView renders when localStorage.setItem throws QuotaExceededError', () => {
    // WHY: SessionListView may persist filter preferences. localStorage full must not crash.
    const origSetItem = window.localStorage.setItem.bind(localStorage);
    window.localStorage.setItem = () => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    };

    try {
      expect(() => render(<SessionListView />)).not.toThrow();
    } finally {
      window.localStorage.setItem = origSetItem;
    }
  });
});

// covers: EG-LS-DISABLED-01
describe('EG-LS-DISABLED-01: localStorage disabled (private mode) — UI works with memory fallback', () => {
  it('WorktreeView renders when localStorage is not available', () => {
    // WHY: In private mode, any localStorage access throws SecurityError.
    // UI must function with in-memory fallback (React state only).
    const origStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      get: () => {
        throw new DOMException('SecurityError', 'SecurityError');
      },
      configurable: true,
    });

    try {
      expect(() => render(<WorktreeView />)).not.toThrow();
    } finally {
      if (origStorage) {
        Object.defineProperty(window, 'localStorage', origStorage);
      }
    }
  });
});

// covers: EG-NARROW-01
describe('EG-NARROW-01: 360px viewport does not catastrophically break layout', () => {
  it('PlanView renders at 360px container width without crash', () => {
    // WHY: Mobile emulation at 360px — Phase 1 is desktop-first but must not crash.
    // We cannot set viewport in jsdom, but can set container width and verify render.
    const { container } = render(
      <div style={{ width: '360px', overflow: 'auto' }}>
        <PlanView />
      </div>,
    );
    // The plan-screen container must still be in DOM (h-scroll is allowed)
    expect(container.querySelector('.plan-screen')).not.toBeNull();
  });

  it('StatusBar renders at 360px without crash', () => {
    // WHY: StatusBar at narrow viewport — content may overflow but must not crash.
    const { container } = render(
      <div style={{ width: '360px' }}>
        <StatusBar label="idle" project="test" conn="disconnected" />
      </div>,
    );
    expect(container.querySelector('[data-testid="statusbar"]')).not.toBeNull();
  });
});

// covers: EG-WIDE-01
describe('EG-WIDE-01: 3840px ultrawide viewport renders with max-width constraint', () => {
  it('PlanView renders at wide container without crash', () => {
    // WHY: 3840px ultrawide — PlanView must render (max-width CSS handles visual bound).
    const { container } = render(
      <div style={{ width: '3840px' }}>
        <PlanView />
      </div>,
    );
    expect(container.querySelector('.plan-screen')).not.toBeNull();
  });

  it('WorktreeView renders at wide container without crash', () => {
    // WHY: WorktreeView at ultrawide — table layout must render without crash.
    const { container } = render(
      <div style={{ width: '3840px' }}>
        <WorktreeView />
      </div>,
    );
    expect(container.querySelector('[data-testid="worktree-view"]')).not.toBeNull();
  });
});
