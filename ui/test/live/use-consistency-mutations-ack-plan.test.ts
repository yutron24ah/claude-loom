/**
 * M4 t6: useConsistencyMutations — acknowledgeAndCreatePlanItem tests
 * TDD RED phase — written before implementation exists.
 *
 * WHY: Separate file from use-consistency-mutations.test.ts to allow
 * extending the vi.mock without disrupting the original test's mock scope.
 * Tests verify:
 *   - acknowledgeFinding now calls acknowledgeAndCreatePlanItem (not bare acknowledge)
 *   - Both consistency.list AND plan.list are invalidated on success
 *   - Result shape includes isAcknowledgePending from the new mutation
 *
 * §3.6.10: PROJECT_ID constant, no inline string literals.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock @/trpc/client — extended with acknowledgeAndCreatePlanItem + plan.list
// ---------------------------------------------------------------------------
const {
  mockAcknowledgeAndCreatePlanItemMutate,
  mockMarkFixedMutate,
  mockDismissMutate,
  mockConsistencyListInvalidate,
  mockPlanListInvalidate,
} = vi.hoisted(() => ({
  mockAcknowledgeAndCreatePlanItemMutate: vi.fn(),
  mockMarkFixedMutate: vi.fn(),
  mockDismissMutate: vi.fn(),
  mockConsistencyListInvalidate: vi.fn(),
  mockPlanListInvalidate: vi.fn(),
}));

vi.mock('@/trpc/client', () => ({
  trpc: {
    consistency: {
      acknowledgeAndCreatePlanItem: {
        useMutation: vi.fn((opts: { onSuccess?: () => void }) => ({
          mutate: (input: unknown) => {
            mockAcknowledgeAndCreatePlanItemMutate(input);
            opts?.onSuccess?.();
          },
          isPending: false,
        })),
      },
      markFixed: {
        useMutation: vi.fn((opts: { onSuccess?: () => void }) => ({
          mutate: (input: unknown) => {
            mockMarkFixedMutate(input);
            opts?.onSuccess?.();
          },
          isPending: false,
        })),
      },
      dismiss: {
        useMutation: vi.fn((opts: { onSuccess?: () => void }) => ({
          mutate: (input: unknown) => {
            mockDismissMutate(input);
            opts?.onSuccess?.();
          },
          isPending: false,
        })),
      },
    },
    useUtils: vi.fn(() => ({
      consistency: {
        list: {
          invalidate: mockConsistencyListInvalidate,
        },
      },
      plan: {
        list: {
          invalidate: mockPlanListInvalidate,
        },
      },
    })),
  },
  wsClient: {},
  trpcClient: {},
}));

import { useConsistencyMutations } from '@/live/useConsistencyMutations';

// WHY: same PROJECT_ID as hook implementation (fixed for M4)
const PROJECT_ID = 'claude-loom';

// ---------------------------------------------------------------------------
// acknowledgeFinding → acknowledgeAndCreatePlanItem
// ---------------------------------------------------------------------------

describe('useConsistencyMutations M4 t6 — acknowledgeFinding via acknowledgeAndCreatePlanItem', () => {
  beforeEach(() => {
    mockAcknowledgeAndCreatePlanItemMutate.mockClear();
    mockConsistencyListInvalidate.mockClear();
    mockPlanListInvalidate.mockClear();
  });

  it('calls acknowledgeAndCreatePlanItem mutation with { findingId, projectId }', () => {
    const { result } = renderHook(() => useConsistencyMutations());
    act(() => {
      result.current.acknowledgeFinding(42);
    });
    expect(mockAcknowledgeAndCreatePlanItemMutate).toHaveBeenCalledWith({
      findingId: 42,
      projectId: PROJECT_ID,
    });
  });

  it('does NOT call the old bare acknowledge mutation', () => {
    // This test verifies we migrated away from the old acknowledge procedure.
    // After the t6 implementation, acknowledgeFinding should route through
    // acknowledgeAndCreatePlanItem only.
    const { result } = renderHook(() => useConsistencyMutations());
    act(() => {
      result.current.acknowledgeFinding(42);
    });
    // Only the new mutation should be called
    expect(mockAcknowledgeAndCreatePlanItemMutate).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Cache invalidation — both consistency.list AND plan.list
// ---------------------------------------------------------------------------

describe('useConsistencyMutations M4 t6 — dual cache invalidation on acknowledgeFinding', () => {
  beforeEach(() => {
    mockAcknowledgeAndCreatePlanItemMutate.mockClear();
    mockConsistencyListInvalidate.mockClear();
    mockPlanListInvalidate.mockClear();
  });

  it('acknowledgeFinding invalidates consistency.list cache', () => {
    const { result } = renderHook(() => useConsistencyMutations());
    act(() => {
      result.current.acknowledgeFinding(42);
    });
    expect(mockConsistencyListInvalidate).toHaveBeenCalledWith({ projectId: PROJECT_ID });
  });

  it('acknowledgeFinding also invalidates plan.list cache', () => {
    const { result } = renderHook(() => useConsistencyMutations());
    act(() => {
      result.current.acknowledgeFinding(42);
    });
    expect(mockPlanListInvalidate).toHaveBeenCalledWith({ projectId: PROJECT_ID });
  });
});

// ---------------------------------------------------------------------------
// Result shape includes isAcknowledgePending
// ---------------------------------------------------------------------------

describe('useConsistencyMutations M4 t6 — result shape', () => {
  it('returns isAcknowledgePending as boolean', () => {
    const { result } = renderHook(() => useConsistencyMutations());
    expect(typeof result.current.isAcknowledgePending).toBe('boolean');
  });

  it('returns all required functions', () => {
    const { result } = renderHook(() => useConsistencyMutations());
    expect(typeof result.current.acknowledgeFinding).toBe('function');
    expect(typeof result.current.markFindingFixed).toBe('function');
    expect(typeof result.current.dismissFinding).toBe('function');
    expect(typeof result.current.openInEditor).toBe('function');
  });
});
