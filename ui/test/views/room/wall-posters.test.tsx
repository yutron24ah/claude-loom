/**
 * Wall Posters TDD tests — M0.11.4 t7
 *
 * WHY: Verify GanttPoster, PlanPoster, ConsistencyPoster render correctly
 * with correct CSS classes, header text, click callbacks, and body content.
 * Tests behavior (visible DOM structure) not implementation internals.
 *
 * Design source: /tmp/claude-room-handoff/claude-room/project/room.jsx L213-308
 * CSS SSoT: ui/src/styles/tokens.css .room-poster* classes (Phase A, commit ed628af)
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { GanttPoster } from '../../../src/views/room/wall-posters/GanttPoster';
import { PlanPoster } from '../../../src/views/room/wall-posters/PlanPoster';
import { ConsistencyPoster } from '../../../src/views/room/wall-posters/ConsistencyPoster';

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// GanttPoster
// ---------------------------------------------------------------------------

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

  it('renders header title "❖ 進捗 GANTT — 直近 1h"', () => {
    render(<GanttPoster {...defaultProps} />);
    expect(screen.getByText('❖ 進捗 GANTT — 直近 1h')).toBeInTheDocument();
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

  it('renders row names: ニケ, サバ, ペン, メメ, マル', () => {
    render(<GanttPoster {...defaultProps} />);
    expect(screen.getByText('ニケ')).toBeInTheDocument();
    expect(screen.getByText('サバ')).toBeInTheDocument();
    expect(screen.getByText('ペン')).toBeInTheDocument();
    expect(screen.getByText('メメ')).toBeInTheDocument();
    expect(screen.getByText('マル')).toBeInTheDocument();
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

  it('renders header title "📋 PLAN BOARD — 30 Apr"', () => {
    render(<PlanPoster {...defaultProps} />);
    expect(screen.getByText('📋 PLAN BOARD — 30 Apr')).toBeInTheDocument();
  });

  it('renders header hint "→ クリックで拡大"', () => {
    render(<PlanPoster {...defaultProps} />);
    expect(screen.getByText('→ クリックで拡大')).toBeInTheDocument();
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

  it('renders left col section-label "🗺 長期 — milestones"', () => {
    render(<PlanPoster {...defaultProps} />);
    expect(screen.getByText('🗺 長期 — milestones')).toBeInTheDocument();
  });

  it('renders right col section-label "📒 今週 — todos · 5件"', () => {
    render(<PlanPoster {...defaultProps} />);
    expect(screen.getByText('📒 今週 — todos · 5件')).toBeInTheDocument();
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
