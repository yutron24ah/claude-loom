/**
 * Wall Posters TDD tests — M0.11.4 t7 (updated M0.15 t15 for scenario-driven)
 *
 * WHY: Verify GanttPoster, PlanPoster, ConsistencyPoster render correctly
 * with correct CSS classes, header text, click callbacks, and body content.
 * Tests behavior (visible DOM structure) not implementation internals.
 *
 * Design source: redesign/screens/room.jsx L103-199
 * CSS SSoT: ui/src/styles/tokens.css .room-poster* classes (Phase A, commit ed628af)
 *
 * M0.15 t15: posters are now scenario-driven via useScenario(). This test
 * file mocks useScenario to provide controlled data so assertions remain
 * deterministic (same shape as before, but sourced from scenario).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';
import { GanttPoster } from '../../../src/views/room/wall-posters/GanttPoster';
import { PlanPoster } from '../../../src/views/room/wall-posters/PlanPoster';
import { ConsistencyPoster } from '../../../src/views/room/wall-posters/ConsistencyPoster';

// ---------------------------------------------------------------------------
// Scenario mock — deterministic fixture matching the original hardcoded data
// so the existing DOM-structure assertions continue to hold after scenario
// migration (M0.15 t15).
// ---------------------------------------------------------------------------
const WALL_POSTERS_SCENARIO = {
  key: 'active',
  agents: {},

  gantt: {
    // WHY: windowLabel used in GanttPoster header title.
    windowLabel: '直近 1h',
    nowPct: 95,
    // WHY: rows ordered to match ROOM_AGENTS (pm/dev/rev-code/rev-test/rev-sec).
    // Bars replicate the M0.11.4 DEFAULT_ROWS bar values using GanttBarKind.
    rows: [
      // pm → ニケ: 1 bar 5-95
      { worktree: 'main', agentId: 'pm',       label: 'PM',       bars: [{ s: 5,  e: 95, kind: 'busy' }],   live: true },
      // dev → サバ: 3 bars
      { worktree: 'main', agentId: 'dev',      label: 'Dev',      bars: [{ s: 12, e: 38, kind: 'busy' }, { s: 44, e: 74, kind: 'review' }, { s: 76, e: 92, kind: 'busy' }], live: false },
      // rev-code → ペン: 2 bars
      { worktree: 'main', agentId: 'rev-code', label: 'CodeRev',  bars: [{ s: 40, e: 56, kind: 'busy' }, { s: 70, e: 84, kind: 'fail' }],  live: false },
      // rev-test → メメ: 2 bars
      { worktree: 'main', agentId: 'rev-test', label: 'TestRev',  bars: [{ s: 22, e: 48, kind: 'busy' }, { s: 60, e: 80, kind: 'busy' }],  live: false },
      // rev-sec → シノビ: 1 bar
      { worktree: 'main', agentId: 'rev-sec',  label: 'SecRev',   bars: [{ s: 86, e: 95, kind: 'busy' }],   live: false },
    ],
  },

  todos: [
    { status: 'in_progress', text: 'user.service.test.ts GREEN' },
    { status: 'pending',     text: 'freee OAuth callback 確認' },
    { status: 'completed',   text: 'PR #41 verdict' },
  ],
  todosUpdatedAt: '30 Apr',

  milestones: [
    { id: 'M0.13', title: 'Process Discipline', progress: 0.25, count: '3/7', status: 'doing', children: [] },
    { id: 'M0.14', title: 'AppShell redesign',  progress: 0.00, count: '0/4', status: 'todo',  children: [] },
    { id: 'M1.0',  title: 'Phase 1 MVP',        progress: 0.00, count: '0/12', status: 'todo', children: [] },
  ],

  findings: [
    { id: 'F-12', sev: 'high',   status: 'open', title: '§3.6 ガント縦軸 矛盾', file: 'SPEC.md', lines: '3:120', detail: '', suggest: '', source: '' },
    { id: 'F-11', sev: 'high',   status: 'open', title: 'TDD 順序 乖離',        file: 'PLAN.md', lines: '2:50',  detail: '', suggest: '', source: '' },
    { id: 'F-09', sev: 'medium', status: 'open', title: 'hotfix CLI 古い',       file: 'docs/',   lines: '1:10',  detail: '', suggest: '', source: '' },
  ],

  stream: [],
  worktrees: [],
} as unknown as Scenario;

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () => WALL_POSTERS_SCENARIO,
}));

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// GanttPoster
// ---------------------------------------------------------------------------

// covers: PO-GANTT-VIS-01, PO-NAV-GANTT-01
describe('GanttPoster — render', () => {
  const defaultProps = { x: 130, y: 28, width: 360, height: 125, onClick: vi.fn() };

  it('renders as a button with room-poster and room-poster--gantt class', () => {
    const { container } = render(<GanttPoster {...defaultProps} />);
    const btn = container.querySelector('button.room-poster.room-poster--gantt');
    expect(btn).toBeInTheDocument();
  });

  it('renders data-testid="gantt-poster"', () => {
    render(<GanttPoster {...defaultProps} />);
    expect(screen.getByTestId('gantt-poster')).toBeInTheDocument();
  });

  it('renders header title "❖ GANTT — 直近 1h" (windowLabel from scenario.gantt)', () => {
    render(<GanttPoster {...defaultProps} />);
    expect(screen.getByText('❖ GANTT — 直近 1h')).toBeInTheDocument();
  });

  it('renders header hint "now → / クリックで拡大"', () => {
    render(<GanttPoster {...defaultProps} />);
    expect(screen.getByText('now → / クリックで拡大')).toBeInTheDocument();
  });

  it('calls onClick when button is clicked', () => {
    const onClick = vi.fn();
    render(<GanttPoster {...defaultProps} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('gantt-poster'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders 5 rows (default design source data)', () => {
    const { container } = render(<GanttPoster {...defaultProps} />);
    const rows = container.querySelectorAll('.room-poster__row');
    expect(rows.length).toBe(5);
  });

  it('renders row names from ROSTER for ROOM_AGENTS: ニケ, サバ, ペン, メメ, シノビ', () => {
    render(<GanttPoster {...defaultProps} />);
    expect(screen.getByText('ニケ')).toBeInTheDocument();
    expect(screen.getByText('サバ')).toBeInTheDocument();
    expect(screen.getByText('ペン')).toBeInTheDocument();
    expect(screen.getByText('メメ')).toBeInTheDocument();
    // rev-sec in ROSTER is "シノビ" (not "マル"; マル is retro-agg)
    expect(screen.getByText('シノビ')).toBeInTheDocument();
  });

  it('renders bar-fill elements with inline style width', () => {
    const { container } = render(<GanttPoster {...defaultProps} />);
    const fills = container.querySelectorAll('.room-poster__bar-fill');
    expect(fills.length).toBeGreaterThan(0);
    // First fill (ニケ): left 5%, width 90%
    const firstFill = fills[0] as HTMLElement;
    expect(firstFill.style.width).toBe('90%');
  });

  it('renders bar-now marker on each row', () => {
    const { container } = render(<GanttPoster {...defaultProps} />);
    const nowMarkers = container.querySelectorAll('.room-poster__bar-now');
    expect(nowMarkers.length).toBe(5);
  });

  it('uses header CSS classes: room-poster__header, __title, __hint', () => {
    const { container } = render(<GanttPoster {...defaultProps} />);
    expect(container.querySelector('.room-poster__header')).toBeInTheDocument();
    expect(container.querySelector('.room-poster__title')).toBeInTheDocument();
    expect(container.querySelector('.room-poster__hint')).toBeInTheDocument();
  });

  it('positions absolutely with x/y/width/height style', () => {
    const { container } = render(<GanttPoster x={130} y={28} width={360} height={125} onClick={vi.fn()} />);
    const btn = container.querySelector('button') as HTMLElement;
    expect(btn.style.left).toBe('130px');
    expect(btn.style.top).toBe('28px');
    expect(btn.style.width).toBe('360px');
    expect(btn.style.height).toBe('125px');
  });
});

// ---------------------------------------------------------------------------
// PlanPoster
// ---------------------------------------------------------------------------

// covers: PO-PLAN-VIS-01, PO-NAV-PLAN-01
describe('PlanPoster — render', () => {
  const defaultProps = { x: 510, y: 28, width: 350, height: 125, onClick: vi.fn() };

  it('renders as a button with room-poster and room-poster--plan class', () => {
    const { container } = render(<PlanPoster {...defaultProps} />);
    const btn = container.querySelector('button.room-poster.room-poster--plan');
    expect(btn).toBeInTheDocument();
  });

  it('renders data-testid="plan-poster"', () => {
    render(<PlanPoster {...defaultProps} />);
    expect(screen.getByTestId('plan-poster')).toBeInTheDocument();
  });

  it('renders header title "📋 PLAN — TodoWrite + plan_items" (scenario-driven)', () => {
    render(<PlanPoster {...defaultProps} />);
    expect(screen.getByText('📋 PLAN — TodoWrite + plan_items')).toBeInTheDocument();
  });

  it('renders header hint with todosUpdatedAt from scenario', () => {
    render(<PlanPoster {...defaultProps} />);
    expect(screen.getByText('updated: 30 Apr')).toBeInTheDocument();
  });

  it('calls onClick when button is clicked', () => {
    const onClick = vi.fn();
    render(<PlanPoster {...defaultProps} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('plan-poster'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders 2 columns (room-poster__col)', () => {
    const { container } = render(<PlanPoster {...defaultProps} />);
    const cols = container.querySelectorAll('.room-poster__col');
    expect(cols.length).toBe(2);
  });

  it('renders left col section-label "🗺 milestones" (scenario-driven)', () => {
    render(<PlanPoster {...defaultProps} />);
    expect(screen.getByText('🗺 milestones')).toBeInTheDocument();
  });

  it('renders right col section-label "📒 todos · 3件" (scenario.todos.length)', () => {
    render(<PlanPoster {...defaultProps} />);
    expect(screen.getByText('📒 todos · 3件')).toBeInTheDocument();
  });

  it('renders milestone names: M0.13, M0.14, M1.0', () => {
    render(<PlanPoster {...defaultProps} />);
    expect(screen.getByText('M0.13')).toBeInTheDocument();
    expect(screen.getByText('M0.14')).toBeInTheDocument();
    expect(screen.getByText('M1.0')).toBeInTheDocument();
  });

  it('renders milestone meta counts: 3/7, 0/4, 0/12', () => {
    render(<PlanPoster {...defaultProps} />);
    expect(screen.getByText('3/7')).toBeInTheDocument();
    expect(screen.getByText('0/4')).toBeInTheDocument();
    expect(screen.getByText('0/12')).toBeInTheDocument();
  });

  it('renders 3 todo check items', () => {
    const { container } = render(<PlanPoster {...defaultProps} />);
    const checks = container.querySelectorAll('.room-poster__check');
    expect(checks.length).toBe(3);
  });

  it('renders check variant classes: --completed, --in_progress, --pending', () => {
    const { container } = render(<PlanPoster {...defaultProps} />);
    expect(container.querySelector('.room-poster__check--completed')).toBeInTheDocument();
    expect(container.querySelector('.room-poster__check--in_progress')).toBeInTheDocument();
    expect(container.querySelector('.room-poster__check--pending')).toBeInTheDocument();
  });

  it('renders completed todo with line-through class', () => {
    const { container } = render(<PlanPoster {...defaultProps} />);
    expect(container.querySelector('.room-poster__check-text--completed')).toBeInTheDocument();
  });

  it('renders body with room-poster__body class', () => {
    const { container } = render(<PlanPoster {...defaultProps} />);
    expect(container.querySelector('.room-poster__body')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ConsistencyPoster
// ---------------------------------------------------------------------------

// covers: PO-CONS-VIS-01, PO-NAV-CONS-01, PO-NO-MODAL-01
describe('ConsistencyPoster — render', () => {
  const defaultProps = { x: 880, y: 28, width: 170, height: 125, onClick: vi.fn() };

  it('renders as a button with room-poster and room-poster--consistency class', () => {
    const { container } = render(<ConsistencyPoster {...defaultProps} />);
    const btn = container.querySelector('button.room-poster.room-poster--consistency');
    expect(btn).toBeInTheDocument();
  });

  it('renders data-testid="consistency-poster"', () => {
    render(<ConsistencyPoster {...defaultProps} />);
    expect(screen.getByTestId('consistency-poster')).toBeInTheDocument();
  });

  it('renders header title "📜 整合性 INBOX"', () => {
    render(<ConsistencyPoster {...defaultProps} />);
    expect(screen.getByText('📜 整合性 INBOX')).toBeInTheDocument();
  });

  it('renders NEW 2 badge', () => {
    render(<ConsistencyPoster {...defaultProps} />);
    expect(screen.getByText('NEW 2')).toBeInTheDocument();
  });

  it('calls onClick when button is clicked', () => {
    const onClick = vi.fn();
    render(<ConsistencyPoster {...defaultProps} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('consistency-poster'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders 3 finding rows', () => {
    const { container } = render(<ConsistencyPoster {...defaultProps} />);
    // Each finding has a dot span + text span in a row div
    const findingRows = container.querySelectorAll('[data-testid="consistency-finding"]');
    expect(findingRows.length).toBe(3);
  });

  it('renders finding text: F-12, F-11, F-09', () => {
    render(<ConsistencyPoster {...defaultProps} />);
    expect(screen.getByText(/F-12/)).toBeInTheDocument();
    expect(screen.getByText(/F-11/)).toBeInTheDocument();
    expect(screen.getByText(/F-09/)).toBeInTheDocument();
  });

  it('renders footer "クリックで詳細"', () => {
    render(<ConsistencyPoster {...defaultProps} />);
    expect(screen.getByText('クリックで詳細')).toBeInTheDocument();
  });

  it('renders footer with room-poster__footer class', () => {
    const { container } = render(<ConsistencyPoster {...defaultProps} />);
    expect(container.querySelector('.room-poster__footer')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Barrel export
// ---------------------------------------------------------------------------

describe('wall-posters barrel export', () => {
  it('GanttPoster is importable from barrel', async () => {
    const { GanttPoster: G } = await import('../../../src/views/room/wall-posters/index');
    expect(typeof G).toBe('function');
  });

  it('PlanPoster is importable from barrel', async () => {
    const { PlanPoster: P } = await import('../../../src/views/room/wall-posters/index');
    expect(typeof P).toBe('function');
  });

  it('ConsistencyPoster is importable from barrel', async () => {
    const { ConsistencyPoster: C } = await import('../../../src/views/room/wall-posters/index');
    expect(typeof C).toBe('function');
  });
});
