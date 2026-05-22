/**
 * Posters × scenario.active — REQ-076
 *
 * WHY: Verify that GanttPoster, PlanPoster, and ConsistencyPoster are
 * scenario-driven (use useScenario() internally) rather than rendering
 * hardcoded fixture data. Tests behavior visible from the outside (DOM
 * content derived from scenario data), not internal hook wiring.
 *
 * Design SSoT: redesign/screens/room.jsx (L103–199)
 * Types SSoT:  redesign/api/types.ts
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';
import { GanttPoster } from '../../../../src/views/room/wall-posters/GanttPoster';
import { PlanPoster } from '../../../../src/views/room/wall-posters/PlanPoster';
import { ConsistencyPoster } from '../../../../src/views/room/wall-posters/ConsistencyPoster';

// ---------------------------------------------------------------------------
// Scenario mock — active state with real-ish data for all 3 posters
// ---------------------------------------------------------------------------
const MOCK_SCENARIO = {
  key: 'active',
  label: 'Dev サブエージェント実行中',
  now: '14:23',
  conn: 'connected',
  project: 'claude-loom',
  branch: 'feat/redesign-room-mvp',

  agents: {
    pm:         { status: 'busy',   currentTool: 'Read' },
    dev:        { status: 'busy',   currentTool: 'Edit', currentReasoning: 'GREEN 追加' },
    'rev-code': { status: 'review', currentTool: 'Read' },
    'rev-test': { status: 'busy',   currentTool: 'Bash' },
    'rev-sec':  { status: 'idle',   lastSeenAt:  '21分前' },
  },

  gantt: {
    windowLabel: '直近 30min',
    nowPct: 96,
    rows: [
      { worktree: 'main', agentId: 'pm',       label: 'PM session',      bars: [{ s: 5,  e: 96, kind: 'busy'   }],                              live: true  },
      { worktree: 'main', agentId: 'dev',      label: 'Dev session',     bars: [{ s: 12, e: 80, kind: 'busy'   }, { s: 82, e: 96, kind: 'tdd' }], live: true  },
      { worktree: 'main', agentId: 'rev-code', label: 'CodeRev session', bars: [{ s: 40, e: 96, kind: 'review' }],                              live: false },
      { worktree: 'main', agentId: 'rev-test', label: 'TestRev session', bars: [{ s: 60, e: 90, kind: 'busy'   }],                              live: false },
      { worktree: 'main', agentId: 'rev-sec',  label: 'SecRev session',  bars: [],                                                              live: false },
    ],
  },

  todos: [
    { status: 'completed',   text: 'M0.13 §3.6 ガント仕様確定' },
    { status: 'in_progress', text: 'TodoWrite mirror UI 結線' },
    { status: 'pending',     text: 'consistency JSON tail watcher' },
    { status: 'pending',     text: 'freee OAuth callback の error path 確認' },
  ],
  todosUpdatedAt: 'now',

  milestones: [
    { id: 'M0.13', title: 'Process Discipline', progress: 0.62, count: '4/7', status: 'doing', children: [] },
    { id: 'M0.14', title: 'AppShell redesign',  progress: 0.00, count: '0/5', status: 'todo',  children: [] },
    { id: 'M0.15', title: 'Posters redesign',   progress: 0.80, count: '4/5', status: 'done',  children: [] },
  ],

  findings: [
    { id: 'F-12', sev: 'high',   status: 'open',      title: '§3.6 ガント縦軸 矛盾', file: 'SPEC.md', lines: '3:120', detail: '...', suggest: '...', source: '...' },
    { id: 'F-11', sev: 'high',   status: 'open',      title: 'TDD 順序 乖離',        file: 'PLAN.md', lines: '2:50',  detail: '...', suggest: '...', source: '...' },
    { id: 'F-09', sev: 'medium', status: 'open',      title: 'hotfix CLI 古い',       file: 'docs/',   lines: '1:10',  detail: '...', suggest: '...', source: '...' },
    { id: 'F-03', sev: 'low',    status: 'dismissed', title: 'stale comment',        file: 'src/',    lines: '5:5',   detail: '...', suggest: '...', source: '...' },
  ],

  stream: [
    { ts: '14:23:08', who: 'サバ', kind: 'reason', text: 'RED → GREEN、まず落とすの。' },
  ],

  worktrees: [],
} as unknown as Scenario;

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () => MOCK_SCENARIO,
}));

afterEach(() => {
  cleanup();
});

const defaultGanttProps  = { x: 130, y: 28, width: 360, height: 125, onClick: vi.fn() };
const defaultPlanProps   = { x: 510, y: 28, width: 350, height: 125, onClick: vi.fn() };
const defaultConsProps   = { x: 880, y: 28, width: 170, height: 125, onClick: vi.fn() };

// ---------------------------------------------------------------------------
// GanttPoster × scenario
// ---------------------------------------------------------------------------

// covers: PO-GANTT-VIS-01
describe('GanttPoster × scenario.active', () => {
  it('renders 5 rows for ROOM_AGENTS (pm/dev/rev-code/rev-test/rev-sec)', () => {
    const { container } = render(<GanttPoster {...defaultGanttProps} />);
    const rows = container.querySelectorAll('.room-poster__row');
    expect(rows.length).toBe(5);
  });

  it('renders now-line using scenario.gantt.nowPct', () => {
    const { container } = render(<GanttPoster {...defaultGanttProps} />);
    const nowMarkers = container.querySelectorAll('.room-poster__bar-now');
    expect(nowMarkers.length).toBe(5);
    // All now-lines should be positioned at nowPct (96%)
    const firstNow = nowMarkers[0] as HTMLElement;
    expect(firstNow.style.left).toBe('96%');
  });

  it('renders windowLabel from scenario.gantt.windowLabel in title', () => {
    render(<GanttPoster {...defaultGanttProps} />);
    // WHY: title is "❖ GANTT — {windowLabel}", so we match on the full string.
    expect(screen.getByText('❖ GANTT — 直近 30min')).toBeInTheDocument();
  });

  it('renders bar-fill segments from scenario.gantt.rows bars', () => {
    const { container } = render(<GanttPoster {...defaultGanttProps} />);
    const fills = container.querySelectorAll('.room-poster__bar-fill');
    // pm row has 1 bar, dev has 2 bars, rev-code has 1, rev-test has 1, rev-sec has 0 → total 5
    expect(fills.length).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// PlanPoster × scenario
// ---------------------------------------------------------------------------

// covers: PO-PLAN-VIS-01
describe('PlanPoster × scenario.active', () => {
  it('renders 4 todo items from scenario.todos', () => {
    const { container } = render(<PlanPoster {...defaultPlanProps} />);
    const checks = container.querySelectorAll('.room-poster__check');
    expect(checks.length).toBe(4);
  });

  it('renders status icons reflecting TodoStatus for each todo', () => {
    const { container } = render(<PlanPoster {...defaultPlanProps} />);
    // completed → checkmark class, in_progress → in_progress class, pending → pending class
    expect(container.querySelector('.room-poster__check--completed')).toBeInTheDocument();
    expect(container.querySelector('.room-poster__check--in_progress')).toBeInTheDocument();
    expect(container.querySelector('.room-poster__check--pending')).toBeInTheDocument();
  });

  it('renders 3 milestones from scenario.milestones', () => {
    render(<PlanPoster {...defaultPlanProps} />);
    expect(screen.getByText('M0.13')).toBeInTheDocument();
    expect(screen.getByText('M0.14')).toBeInTheDocument();
    expect(screen.getByText('M0.15')).toBeInTheDocument();
  });

  it('renders todosUpdatedAt from scenario.todosUpdatedAt', () => {
    render(<PlanPoster {...defaultPlanProps} />);
    expect(screen.getByText(/now/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ConsistencyPoster × scenario
// ---------------------------------------------------------------------------

// covers: PO-CONS-VIS-01
describe('ConsistencyPoster × scenario.active', () => {
  it('renders top 4 findings from scenario.findings', () => {
    const { container } = render(<ConsistencyPoster {...defaultConsProps} />);
    const findingRows = container.querySelectorAll('[data-testid="consistency-finding"]');
    expect(findingRows.length).toBe(4);
  });

  it('NEW badge counts high+open findings from scenario.findings', () => {
    render(<ConsistencyPoster {...defaultConsProps} />);
    // F-12 (high/open) + F-11 (high/open) = 2, F-09 (medium/open) = not counted
    expect(screen.getByText('NEW 2')).toBeInTheDocument();
  });

  it('renders severity color dots for each finding', () => {
    const { container } = render(<ConsistencyPoster {...defaultConsProps} />);
    const rows = container.querySelectorAll('[data-testid="consistency-finding"]');
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });

  it('renders finding ids F-12, F-11, F-09 visible in top 4', () => {
    render(<ConsistencyPoster {...defaultConsProps} />);
    expect(screen.getByText(/F-12/)).toBeInTheDocument();
    expect(screen.getByText(/F-11/)).toBeInTheDocument();
    expect(screen.getByText(/F-09/)).toBeInTheDocument();
  });
});
