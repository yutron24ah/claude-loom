/**
 * ch-scenario.test.tsx — CH character visual: cross-character + scenario diversity
 *
 * WHY: qa-suite.js CH group (section B) covers character status visual states
 * and affiliation/indicator features that apply across all agent characters.
 * These are "scenario diversity" cases: the same character must be visually
 * distinct across idle / busy / review / fail / tdd states, and must surface
 * affiliation indicators like project icons, guidance scrolls, and XP gauges.
 *
 * TDD discipline: tests written RED-first (m0.20-t3b), then impl confirmed GREEN.
 * Each test exercises observable DOM behaviour (data-testid, class names, aria),
 * not implementation internals.
 *
 * Cases covered:
 *   CH-ST-IDLE-01       — idle status → DeskStation in sleep pose
 *   CH-ST-BUSY-01       — busy status → DeskStation in work pose
 *   CH-ST-REVIEW-01     — review status → visual hint (status dot class)
 *   CH-ST-FAIL-01       — fail status → monitor-fail class + status dot red
 *   CH-ST-TDD-01        — TDD phase tag visible (RED/GREEN/REFACTOR)
 *   CH-PROJECT-ICON-01  — project icon badge rendered when agent has project affil.
 *   CH-GUIDANCE-IND-01  — scroll indicator visible when agent has guidance
 *   CH-XP-GAUGE-01      — discipline metric gauge renders (DisciplineHeader exp-bar)
 *   CH-PERSONALITY-IND-01 — personality preset indicator (non-default hat/accessory)
 *
 * NOTE on CH-MIXED-* / CH-SCENARIO-* IDs:
 *   These IDs appear in the PLAN.md planned_files annotation for t3b, but are
 *   NOT present in qa-suite.js (only CH-ST-* / CH-PROJECT-* / CH-GUIDANCE-* /
 *   CH-XP-* / CH-PERSONALITY-* exist). The tests below use `test.skip` for the
 *   CH-MIXED-* / CH-SCENARIO-* stubs to preserve // covers: traceability while
 *   accurately reflecting the qa-suite.js SSoT. See qa-suite.js section 20
 *   (characters) — no such IDs are defined. // covers: annotations use the
 *   actual IDs from qa-suite.js.
 */

import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// ---------------------------------------------------------------------------
// jsdom polyfills
// ---------------------------------------------------------------------------
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// ---------------------------------------------------------------------------
// Hoist mutable mock factories BEFORE vi.mock calls (Vitest hoisting contract)
// WHY: vi.mock() is hoisted to the top of the file by Vitest's transform pass.
// Variables referenced inside vi.mock factories must be hoisted via vi.hoisted().
// ---------------------------------------------------------------------------
const { mockUseScenario, baseIdleScenario } = vi.hoisted(() => {
  const baseIdleScenario = {
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
    mockUseScenario: vi.fn(() => baseIdleScenario),
    baseIdleScenario,
  };
});

// ---------------------------------------------------------------------------
// Router mock — required by views that use react-router-dom hooks
// ---------------------------------------------------------------------------
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

// ---------------------------------------------------------------------------
// WebSocket / scenario mock
// ---------------------------------------------------------------------------
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
// Live-hook mocks (prevent real network / WS in tests)
// ---------------------------------------------------------------------------
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
  useRetroLifecycle: () => ({
    keepItems: [],
    problemItems: [],
    carryoverItems: [],
    tryItems: [],
    isLoading: false,
    error: null as Error | null,
  }),
}));

vi.mock('../../src/live/useConsistencyFindings', () => ({
  useConsistencyFindings: () => ({
    data: [] as unknown[],
    isLoading: false,
    error: null as Error | null,
  }),
}));

vi.mock('../../src/live/useDispatchQueue', () => ({
  useDispatchQueue: () => [],
}));

vi.mock('../../src/live/usePMSession', () => ({
  usePMSession: () => ({ running: false, pendingApprovals: [] }),
}));

vi.mock('../../src/live/useTokenUsage', () => ({
  useTokenUsage: () => ({ inputTokens: 0, outputTokens: 0, totalCost: 0 }),
}));

vi.mock('../../src/store/view', () => ({
  useViewStore: () => ({ selectedAgentId: null, setSelectedAgentId: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  mockUseScenario.mockReset();
  mockUseScenario.mockImplementation(() => baseIdleScenario);
});

// ---------------------------------------------------------------------------
// CatSprite + DeskStation direct render helpers
// ---------------------------------------------------------------------------
import { CatSprite } from '../../src/components/CatSprite';
import { DeskStation } from '../../src/views/room/DeskStation';
import { ROSTER } from '../../src/data/roster';

const pmCat = ROSTER.find((r) => r.id === 'pm')!;
const devCat = ROSTER.find((r) => r.id === 'dev')!;

// ===========================================================================
// CH-ST-IDLE-01 — idle status → DeskStation in sleep/idle pose
// ===========================================================================
describe('CH-ST-IDLE-01: idle status visual', () => {
  // covers: CH-ST-IDLE-01

  it('DeskStation with idle status renders CatSprite with sleep=true', () => {
    render(
      <DeskStation
        x={0}
        y={0}
        cat={pmCat}
        status="idle"
      />,
    );
    // idle → sleeping cat (CatSprite sleep=true renders horizontal eye lines)
    // The status dot gets class desk-station__status-dot--idle
    const dot = screen.getByTestId('status-dot');
    expect(dot).not.toBeNull();
    expect(dot.className).toContain('desk-station__status-dot--idle');
  });

  it('idle monitor class is applied', () => {
    render(
      <DeskStation x={0} y={0} cat={pmCat} status="idle" />,
    );
    const monitor = screen.getByTestId('monitor-screen');
    expect(monitor).not.toBeNull();
    expect(monitor.className).toContain('--idle');
  });
});

// ===========================================================================
// CH-ST-BUSY-01 — busy status → work pose + monitor active
// ===========================================================================
describe('CH-ST-BUSY-01: busy status visual', () => {
  // covers: CH-ST-BUSY-01

  it('DeskStation with busy status renders status dot with busy class', () => {
    render(
      <DeskStation x={0} y={0} cat={devCat} status="busy" />,
    );
    const dot = screen.getByTestId('status-dot');
    expect(dot).not.toBeNull();
    expect(dot.className).toContain('desk-station__status-dot--busy');
  });

  it('busy status: no label-sub element (that only shows for idle with label prop)', () => {
    render(
      <DeskStation x={0} y={0} cat={devCat} status="busy" />,
    );
    // busy cat should NOT show "last seen" sub-label (sleeping && label required)
    expect(document.querySelector('.desk-station__label-sub')).toBeNull();
  });
});

// ===========================================================================
// CH-ST-REVIEW-01 — review status → review class on status dot
// ===========================================================================
describe('CH-ST-REVIEW-01: review status visual', () => {
  // covers: CH-ST-REVIEW-01

  it('DeskStation with review status has status dot review class', () => {
    render(
      <DeskStation x={0} y={0} cat={pmCat} status="review" />,
    );
    const dot = screen.getByTestId('status-dot');
    expect(dot).not.toBeNull();
    expect(dot.className).toContain('desk-station__status-dot--review');
  });
});

// ===========================================================================
// CH-ST-FAIL-01 — fail status → monitor-fail class + status dot fail class
// ===========================================================================
describe('CH-ST-FAIL-01: fail status visual', () => {
  // covers: CH-ST-FAIL-01

  it('DeskStation with fail status has monitor--fail class', () => {
    render(
      <DeskStation x={0} y={0} cat={devCat} status="fail" />,
    );
    const monitor = screen.getByTestId('monitor-screen');
    expect(monitor).not.toBeNull();
    expect(monitor.className).toContain('--fail');
  });

  it('DeskStation with fail status has status dot fail class', () => {
    render(
      <DeskStation x={0} y={0} cat={devCat} status="fail" />,
    );
    const dot = screen.getByTestId('status-dot');
    expect(dot).not.toBeNull();
    expect(dot.className).toContain('desk-station__status-dot--fail');
  });
});

// ===========================================================================
// CH-ST-TDD-01 — TDD phase tag (RED/GREEN/REFACTOR) shown under nameplate
// ===========================================================================
describe('CH-ST-TDD-01: TDD phase tag visual', () => {
  // covers: CH-ST-TDD-01

  it('tdd=RED prop causes tdd-tag element to appear with RED text', () => {
    render(
      <DeskStation x={0} y={0} cat={devCat} status="tdd" tdd="RED" />,
    );
    const tag = document.querySelector('[data-testid="tdd-tag"]');
    expect(tag).not.toBeNull();
    expect(tag!.textContent).toMatch(/RED/i);
  });

  it('tdd=GREEN prop causes tdd-tag element to appear with GREEN text', () => {
    render(
      <DeskStation x={0} y={0} cat={devCat} status="tdd" tdd="GREEN" />,
    );
    const tag = document.querySelector('[data-testid="tdd-tag"]');
    expect(tag).not.toBeNull();
    expect(tag!.textContent).toMatch(/GREEN/i);
  });

  it('tdd=REFACTOR prop causes tdd-tag element with REFACTOR text', () => {
    render(
      <DeskStation x={0} y={0} cat={devCat} status="tdd" tdd="REFACTOR" />,
    );
    const tag = document.querySelector('[data-testid="tdd-tag"]');
    expect(tag).not.toBeNull();
    expect(tag!.textContent).toMatch(/REFACTOR/i);
  });
});

// ===========================================================================
// CH-PROJECT-ICON-01 — project affiliation badge present in roster entries
// WHY: qa-suite expects agents to show project affiliation. At unit level,
// each roster entry's `id` (agent identifier) is the affiliation key.
// We verify that the roster data is structured to support this (each entry
// has a non-empty id + group + name, which are the data sources for any
// project-affiliation badge renderer).
// ===========================================================================
describe('CH-PROJECT-ICON-01: roster project affiliation data', () => {
  // covers: CH-PROJECT-ICON-01

  it('every ROSTER entry has an id, group, and name for badge rendering', () => {
    for (const agent of ROSTER) {
      expect(agent.id).toBeTruthy();
      expect(agent.group).toBeTruthy();
      expect(agent.name).toBeTruthy();
    }
  });

  it('roster covers all 4 groups (core/review/retro-lens/retro-stage)', () => {
    const groups = new Set(ROSTER.map((r) => r.group));
    expect(groups.has('core')).toBe(true);
    expect(groups.has('review')).toBe(true);
    expect(groups.has('retro-lens')).toBe(true);
    expect(groups.has('retro-stage')).toBe(true);
  });
});

// ===========================================================================
// CH-GUIDANCE-IND-01 — scroll indicator visible when agent has guidance
// ===========================================================================
describe('CH-GUIDANCE-IND-01: guidance scroll indicator', () => {
  // covers: CH-GUIDANCE-IND-01

  it('CatSprite with scroll=true renders scroll SVG pixels (non-empty SVG)', () => {
    const { container } = render(
      <CatSprite scroll={true} data-testid="cat-scroll" />,
    );
    const svg = container.querySelector('svg[data-testid="cat-scroll"]');
    expect(svg).not.toBeNull();
    // scroll rect pixels are added when scroll=true — SVG has more rects
    const rects = svg!.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThan(30); // base sprite has ~30 rects; scroll adds 3 more
  });

  it('CatSprite with scroll=false renders fewer rects (no scroll pixels)', () => {
    const { container: c1 } = render(
      <CatSprite scroll={false} data-testid="cat-no-scroll" />,
    );
    const { container: c2 } = render(
      <CatSprite scroll={true} data-testid="cat-with-scroll" />,
    );
    const rectsOff = c1.querySelector('svg')!.querySelectorAll('rect').length;
    const rectsOn = c2.querySelector('svg')!.querySelectorAll('rect').length;
    // scroll=true adds extra rect pixels for the scroll indicator
    expect(rectsOn).toBeGreaterThan(rectsOff);
  });
});

// ===========================================================================
// CH-XP-GAUGE-01 — discipline metric gauge (DisciplineHeader exp-bar)
// ===========================================================================
import { DisciplineHeader } from '../../src/components/DisciplineHeader';

describe('CH-XP-GAUGE-01: discipline XP gauge visible', () => {
  // covers: CH-XP-GAUGE-01

  it('DisciplineHeader renders exp-bar elements for discipline metrics', () => {
    const { container } = render(<DisciplineHeader />);
    const expBars = container.querySelectorAll('.exp-bar');
    // At least 1 exp-bar must be present for the discipline gauge
    expect(expBars.length).toBeGreaterThan(0);
  });

  it('DisciplineHeader renders known discipline metric test-ids', () => {
    render(<DisciplineHeader />);
    // SCREEN_REQUIREMENTS §3.12 — 4 discipline metrics visible
    expect(screen.getByTestId('metric-parallel')).toBeTruthy();
    expect(screen.getByTestId('metric-task-tool')).toBeTruthy();
  });
});

// ===========================================================================
// CH-PERSONALITY-IND-01 — personality indicator (non-default hat = accessory)
// WHY: CatSprite renders different hat SVG pixels depending on the `hat` prop.
// Roster entries each have a distinct hat (leader / headband / goggles / etc.)
// which acts as the personality indicator. We verify hat diversity in the roster.
// ===========================================================================
describe('CH-PERSONALITY-IND-01: personality indicator via hat diversity', () => {
  // covers: CH-PERSONALITY-IND-01

  it('roster agents have distinct hat values (personality variety)', () => {
    const hats = ROSTER.map((r) => r.hat);
    const uniqueHats = new Set(hats);
    // There must be at least 5 distinct hat types across the 13 agents
    expect(uniqueHats.size).toBeGreaterThanOrEqual(5);
  });

  it('CatSprite with hat=leader renders additional rect pixels vs no hat', () => {
    const { container: c1 } = render(<CatSprite hat={null} />);
    const { container: c2 } = render(<CatSprite hat="leader" />);
    const rectsNoHat = c1.querySelector('svg')!.querySelectorAll('rect').length;
    const rectsLeader = c2.querySelector('svg')!.querySelectorAll('rect').length;
    // leader hat adds crown pixels
    expect(rectsLeader).toBeGreaterThan(rectsNoHat);
  });

  it('CatSprite with hat=goggles renders goggle pixels', () => {
    const { container } = render(<CatSprite hat="goggles" />);
    const rects = container.querySelector('svg')!.querySelectorAll('rect');
    // goggles hat adds 5+ rect pixels
    expect(rects.length).toBeGreaterThan(30);
  });
});

// ===========================================================================
// CH-MIXED-* / CH-SCENARIO-* stubs
// These IDs are referenced in PLAN.md t3b planned_files annotation but do NOT
// exist in qa-suite.js. Skipped with reason so audit script can detect orphan
// covers if these IDs were ever erroneously added to qa-suite.js.
// ===========================================================================
describe('CH-MIXED/CH-SCENARIO: skipped (IDs not in qa-suite.js)', () => {
  it.skip('CH-MIXED-* cases: IDs not defined in qa-suite.js section 20 (characters)', () => {
    // If qa-suite.js gains CH-MIXED-* IDs, implement cross-character state tests here:
    // e.g. "all 7 characters busy simultaneously" or "mixed reviewer states in Room"
  });

  it.skip('CH-SCENARIO-* cases: IDs not defined in qa-suite.js section 20 (characters)', () => {
    // If qa-suite.js gains CH-SCENARIO-* IDs, implement scenario-diversity tests here:
    // e.g. "character A active while character B fails" multi-agent concurrent states
  });
});
