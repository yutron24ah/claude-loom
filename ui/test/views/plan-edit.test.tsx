/**
 * PlanView tab interaction TDD tests — updated for redesign port (M0.15 t3).
 *
 * WHY rewrite: The original tests exercised usePlanMutations (upsert / status toggle /
 * inline edit). The M0.15 redesign port makes PlanView read-only; write API
 * will be reconnected in Phase 5 t16. This file now covers:
 *
 *   - Tab switching: active → done archive → edit
 *   - Active tab shows milestones with progress < 1
 *   - Done tab shows milestones with progress == 1
 *   - Edit tab shows 'edit' button per milestone
 *   - Status glyphs on milestone children
 *
 * WHY preserved as separate file: The "edit interaction" concern will be revived
 * in Phase 5 t16 when the write API is re-wired. Preserving the file structure
 * reduces merge conflict surface.
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// WHY: Mock usePlanMutations so tests don't need a tRPC provider (M0.15 t16).
vi.mock('../../src/live/usePlanMutations', () => ({
  usePlanMutations: () => ({
    upsertItem: vi.fn(),
    updateItemStatus: vi.fn(),
    deleteItem: vi.fn(),
    isUpsertPending: false,
    isUpdateStatusPending: false,
  }),
}));

const { mockUseScenario } = vi.hoisted(() => ({
  mockUseScenario: vi.fn(),
}));

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: mockUseScenario,
}));

import { PlanView } from '../../src/views/plan/PlanView';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mockUseScenario.mockReset();
});

/** Fixture: 1 active + 1 done milestone */
const MIXED_MILESTONES = {
  todos: [],
  todosUpdatedAt: '—',
  milestones: [
    {
      id: 'M0.13',
      title: 'Active milestone',
      progress: 0.62,
      count: '4/7',
      status: 'doing' as const,
      children: [
        { t: 'task alpha', st: 'completed' as const },
        { t: 'task beta', st: 'in_progress' as const },
      ],
    },
    {
      id: 'M0.12',
      title: 'Done milestone',
      progress: 1.0,
      count: '5/5',
      status: 'done' as const,
      children: [],
    },
  ],
} as unknown as Scenario;

// ---------------------------------------------------------------------------
// Active tab (default)
// ---------------------------------------------------------------------------
describe('PlanView (tab) — active tab (default)', () => {
  it('shows active milestones by default (progress < 1)', () => {
    // covers: PL-TAB-ACTIVE-01
    mockUseScenario.mockReturnValue(MIXED_MILESTONES);
    const { container } = render(<PlanView />);
    // Default tab = active: only M0.13 (progress 0.62) is visible
    const milestones = container.querySelectorAll('[data-testid="plan-milestone"]');
    expect(milestones.length).toBe(1);
    expect(screen.getByText('Active milestone')).toBeInTheDocument();
  });

  it('does not show done milestones on active tab', () => {
    mockUseScenario.mockReturnValue(MIXED_MILESTONES);
    render(<PlanView />);
    expect(screen.queryByText('Done milestone')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Done archive tab
// ---------------------------------------------------------------------------
describe('PlanView (tab) — done archive tab', () => {
  it('shows done milestones when done tab clicked', () => {
    // covers: PL-TAB-DONE-01
    mockUseScenario.mockReturnValue(MIXED_MILESTONES);
    const { container } = render(<PlanView />);
    fireEvent.click(screen.getByText('完了 archive'));
    const milestones = container.querySelectorAll('[data-testid="plan-milestone"]');
    expect(milestones.length).toBe(1);
    expect(screen.getByText('Done milestone')).toBeInTheDocument();
  });

  it('shows "完了 archive" section label on done tab', () => {
    mockUseScenario.mockReturnValue(MIXED_MILESTONES);
    render(<PlanView />);
    fireEvent.click(screen.getByText('完了 archive'));
    expect(screen.getByText('DONE ARCHIVE')).toBeInTheDocument();
  });

  it('switches back to active tab when active clicked after done', () => {
    mockUseScenario.mockReturnValue(MIXED_MILESTONES);
    const { container } = render(<PlanView />);
    fireEvent.click(screen.getByText('完了 archive'));
    fireEvent.click(screen.getByText('現行'));
    const milestones = container.querySelectorAll('[data-testid="plan-milestone"]');
    expect(milestones.length).toBe(1);
    expect(screen.getByText('Active milestone')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Edit tab
// ---------------------------------------------------------------------------
describe('PlanView (tab) — edit tab', () => {
  it('shows edit buttons per milestone on edit tab', () => {
    // covers: PL-TAB-EDIT-01, PL-EDIT-BTN-01
    mockUseScenario.mockReturnValue(MIXED_MILESTONES);
    const { container } = render(<PlanView />);
    // Edit tab shows active milestones with edit buttons
    fireEvent.click(screen.getByText('編集'));
    const editBtns = container.querySelectorAll('button.btn-px.ghost');
    // WHY: plan.jsx shows edit button per milestone on edit tab
    expect(editBtns.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Milestone children with status glyphs
// ---------------------------------------------------------------------------
describe('PlanView (milestone children) — status glyphs', () => {
  it('renders milestone children with completed glyph', () => {
    mockUseScenario.mockReturnValue(MIXED_MILESTONES);
    const { container } = render(<PlanView />);
    const children = container.querySelectorAll('[data-testid="milestone-child"]');
    // M0.13 has 2 children
    expect(children.length).toBe(2);

    // First child is completed
    const completedGlyph = children[0].querySelector('[data-status="completed"]');
    expect(completedGlyph).toBeInTheDocument();
  });

  it('renders milestone children with in_progress glyph', () => {
    mockUseScenario.mockReturnValue(MIXED_MILESTONES);
    const { container } = render(<PlanView />);
    const children = container.querySelectorAll('[data-testid="milestone-child"]');
    const inProgressGlyph = children[1].querySelector('[data-status="in_progress"]');
    expect(inProgressGlyph).toBeInTheDocument();
  });

  it('renders completed child with line-through text decoration', () => {
    mockUseScenario.mockReturnValue(MIXED_MILESTONES);
    const { container } = render(<PlanView />);
    const children = container.querySelectorAll('[data-testid="milestone-child"]');
    // First child (completed) should have line-through text
    const completedText = children[0].querySelector('span:last-child') as HTMLElement;
    expect(completedText).toBeInTheDocument();
    expect(completedText.style.textDecoration).toBe('line-through');
  });
});
