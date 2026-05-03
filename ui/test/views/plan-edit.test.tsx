/**
 * Plan View long-term pane edit TDD tests (RED phase — written before implementation).
 *
 * WHY: Verifies that PlanView's long-term pane handles user interactions:
 *   - "+ 追加" button click fires upsert mutation (new item creation)
 *   - status square click fires updateStatus mutation (todo → doing → done cycle)
 *   - title click enters inline edit mode, blur fires upsert mutation
 *
 * We mock usePlanMutations, usePlanItems and useTodoWrite entirely so no
 * WS connection or real tRPC context is needed.
 * Focus: interaction behavior, not rendering details.
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import type { PlanItem } from '@claude-loom/daemon';

// WHY: vi.hoisted ensures mock fns are available when vi.mock factory runs (hoisting)
const { mockUsePlanItems, mockUseTodoWrite, mockUsePlanMutations } = vi.hoisted(() => ({
  mockUsePlanItems: vi.fn(),
  mockUseTodoWrite: vi.fn(),
  mockUsePlanMutations: vi.fn(),
}));

vi.mock('@/live/usePlanItems', () => ({
  usePlanItems: mockUsePlanItems,
}));

vi.mock('@/live/useTodoWrite', () => ({
  useTodoWrite: mockUseTodoWrite,
}));

vi.mock('@/live/usePlanMutations', () => ({
  usePlanMutations: mockUsePlanMutations,
}));

// Import after mocks are set up
import { PlanView } from '../../src/views/plan/PlanView';

afterEach(() => {
  cleanup();
});

/** Helper: build a minimal PlanItem. */
function makePlanItem(overrides: Partial<PlanItem> = {}): PlanItem {
  return {
    id: 1,
    projectId: 'claude-loom',
    source: 'file',
    sourcePath: null,
    parentId: null,
    title: 'Test milestone',
    body: null,
    status: 'todo',
    position: 0,
    updatedAt: new Date(),
    ...overrides,
  };
}

/** Default mutation mock — all fns are vi.fn() no-ops with isPending=false. */
function makeDefaultMutations() {
  return {
    upsertItem: vi.fn(),
    updateItemStatus: vi.fn(),
    deleteItem: vi.fn(),
    isUpsertPending: false,
    isUpdateStatusPending: false,
  };
}

beforeEach(() => {
  mockUsePlanItems.mockClear();
  mockUseTodoWrite.mockClear();
  mockUsePlanMutations.mockClear();

  // Default: empty short-term pane
  mockUseTodoWrite.mockReturnValue({ todos: [], isLoading: false });
  // Default: one plan item in long-term pane
  mockUsePlanItems.mockReturnValue({
    data: [makePlanItem({ id: 1, title: 'M0 milestone', status: 'todo' })],
    isLoading: false,
    error: null,
  });
  // Default: no-op mutations
  mockUsePlanMutations.mockReturnValue(makeDefaultMutations());
});

// ---------------------------------------------------------------------------
// "+ 追加" button
// ---------------------------------------------------------------------------
describe('PlanView (edit) — "+ 追加" button', () => {
  it('calls upsertItem when "+ 追加" button is clicked', () => {
    const upsertItem = vi.fn();
    mockUsePlanMutations.mockReturnValue({
      ...makeDefaultMutations(),
      upsertItem,
    });

    render(<PlanView />);
    const addBtn = screen.getByText('+ 追加');
    act(() => { fireEvent.click(addBtn); });

    expect(upsertItem).toHaveBeenCalledTimes(1);
  });

  it('calls upsertItem with parentId=null (root item) when adding', () => {
    const upsertItem = vi.fn();
    mockUsePlanMutations.mockReturnValue({
      ...makeDefaultMutations(),
      upsertItem,
    });

    render(<PlanView />);
    act(() => { fireEvent.click(screen.getByText('+ 追加')); });

    expect(upsertItem).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: null }),
    );
  });
});

// ---------------------------------------------------------------------------
// Status square click → updateStatus mutation
// ---------------------------------------------------------------------------
describe('PlanView (edit) — status square click', () => {
  it('calls updateItemStatus when status square is clicked', () => {
    const updateItemStatus = vi.fn();
    mockUsePlanMutations.mockReturnValue({
      ...makeDefaultMutations(),
      updateItemStatus,
    });

    render(<PlanView />);
    // The status square is the clickable element in the long-term pane
    const statusSquares = screen.getAllByTestId('plan-item-status');
    act(() => { fireEvent.click(statusSquares[0]); });

    expect(updateItemStatus).toHaveBeenCalledTimes(1);
  });

  it('cycles status todo → doing when clicked (first cycle step)', () => {
    const updateItemStatus = vi.fn();
    mockUsePlanMutations.mockReturnValue({
      ...makeDefaultMutations(),
      updateItemStatus,
    });
    mockUsePlanItems.mockReturnValue({
      data: [makePlanItem({ id: 1, status: 'todo' })],
      isLoading: false,
      error: null,
    });

    render(<PlanView />);
    act(() => { fireEvent.click(screen.getAllByTestId('plan-item-status')[0]); });

    expect(updateItemStatus).toHaveBeenCalledWith({ id: 1, status: 'doing' });
  });

  it('cycles status doing → done when clicked', () => {
    const updateItemStatus = vi.fn();
    mockUsePlanMutations.mockReturnValue({
      ...makeDefaultMutations(),
      updateItemStatus,
    });
    mockUsePlanItems.mockReturnValue({
      data: [makePlanItem({ id: 1, status: 'doing' })],
      isLoading: false,
      error: null,
    });

    render(<PlanView />);
    act(() => { fireEvent.click(screen.getAllByTestId('plan-item-status')[0]); });

    expect(updateItemStatus).toHaveBeenCalledWith({ id: 1, status: 'done' });
  });

  it('cycles status done → todo when clicked', () => {
    const updateItemStatus = vi.fn();
    mockUsePlanMutations.mockReturnValue({
      ...makeDefaultMutations(),
      updateItemStatus,
    });
    mockUsePlanItems.mockReturnValue({
      data: [makePlanItem({ id: 1, status: 'done' })],
      isLoading: false,
      error: null,
    });

    render(<PlanView />);
    act(() => { fireEvent.click(screen.getAllByTestId('plan-item-status')[0]); });

    expect(updateItemStatus).toHaveBeenCalledWith({ id: 1, status: 'todo' });
  });
});

// ---------------------------------------------------------------------------
// Inline edit — title click → input mode → blur fires upsert
// ---------------------------------------------------------------------------
describe('PlanView (edit) — inline title edit', () => {
  it('shows input field after clicking plan item title', () => {
    render(<PlanView />);
    const titleEl = screen.getByTestId('plan-item-title-1');
    act(() => { fireEvent.click(titleEl); });

    // Should now show an input element in edit mode
    const input = screen.getByTestId('plan-item-input-1');
    expect(input).toBeInTheDocument();
  });

  it('pre-fills input with current item title', () => {
    mockUsePlanItems.mockReturnValue({
      data: [makePlanItem({ id: 1, title: 'My milestone title' })],
      isLoading: false,
      error: null,
    });

    render(<PlanView />);
    act(() => { fireEvent.click(screen.getByTestId('plan-item-title-1')); });

    const input = screen.getByTestId('plan-item-input-1') as HTMLInputElement;
    expect(input.value).toBe('My milestone title');
  });

  it('calls upsertItem with updated title on blur', () => {
    const upsertItem = vi.fn();
    mockUsePlanMutations.mockReturnValue({
      ...makeDefaultMutations(),
      upsertItem,
    });
    mockUsePlanItems.mockReturnValue({
      data: [makePlanItem({ id: 1, title: 'Old title', status: 'todo', position: 0 })],
      isLoading: false,
      error: null,
    });

    render(<PlanView />);
    act(() => { fireEvent.click(screen.getByTestId('plan-item-title-1')); });
    const input = screen.getByTestId('plan-item-input-1');

    // Change value and blur
    act(() => {
      fireEvent.change(input, { target: { value: 'New title' } });
      fireEvent.blur(input);
    });

    expect(upsertItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, title: 'New title' }),
    );
  });

  it('does not call upsertItem if title is unchanged on blur', () => {
    const upsertItem = vi.fn();
    mockUsePlanMutations.mockReturnValue({
      ...makeDefaultMutations(),
      upsertItem,
    });
    mockUsePlanItems.mockReturnValue({
      data: [makePlanItem({ id: 1, title: 'Same title' })],
      isLoading: false,
      error: null,
    });

    render(<PlanView />);
    act(() => { fireEvent.click(screen.getByTestId('plan-item-title-1')); });
    const input = screen.getByTestId('plan-item-input-1');

    // Blur without changing
    act(() => { fireEvent.blur(input); });

    // Should not call upsert if nothing changed
    expect(upsertItem).not.toHaveBeenCalled();
  });

  it('exits edit mode after blur', () => {
    render(<PlanView />);
    act(() => { fireEvent.click(screen.getByTestId('plan-item-title-1')); });
    expect(screen.getByTestId('plan-item-input-1')).toBeInTheDocument();

    act(() => { fireEvent.blur(screen.getByTestId('plan-item-input-1')); });

    expect(screen.queryByTestId('plan-item-input-1')).not.toBeInTheDocument();
  });
});
