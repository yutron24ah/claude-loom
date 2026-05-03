/**
 * TDD tests for useConsistencyMutations hook (RED phase — written before implementation).
 *
 * WHY: Verify mutations call correct tRPC procedures and invalidate the list cache.
 * Follows usePlanMutations pattern (M3.1).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock @/trpc/client — expose consistency mutation spies
// ---------------------------------------------------------------------------
const {
  mockAcknowledgeMutate,
  mockMarkFixedMutate,
  mockDismissMutate,
  mockInvalidate,
} = vi.hoisted(() => ({
  mockAcknowledgeMutate: vi.fn(),
  mockMarkFixedMutate: vi.fn(),
  mockDismissMutate: vi.fn(),
  mockInvalidate: vi.fn(),
}));

vi.mock('@/trpc/client', () => ({
  trpc: {
    consistency: {
      acknowledge: {
        useMutation: vi.fn((opts: { onSuccess?: () => void }) => ({
          mutate: (input: unknown) => {
            mockAcknowledgeMutate(input);
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
      useUtils: vi.fn(() => ({
        consistency: {
          list: {
            invalidate: mockInvalidate,
          },
        },
      })),
    },
    useUtils: vi.fn(() => ({
      consistency: {
        list: {
          invalidate: mockInvalidate,
        },
      },
    })),
  },
  wsClient: {},
  trpcClient: {},
}));

import { useConsistencyMutations } from '@/live/useConsistencyMutations';

describe('useConsistencyMutations — acknowledgeFinding', () => {
  beforeEach(() => {
    mockAcknowledgeMutate.mockClear();
    mockMarkFixedMutate.mockClear();
    mockDismissMutate.mockClear();
    mockInvalidate.mockClear();
  });

  it('calls acknowledge mutation with { id }', () => {
    const { result } = renderHook(() => useConsistencyMutations());
    act(() => {
      result.current.acknowledgeFinding(42);
    });
    expect(mockAcknowledgeMutate).toHaveBeenCalledWith({ id: 42 });
  });
});

describe('useConsistencyMutations — markFindingFixed', () => {
  beforeEach(() => {
    mockMarkFixedMutate.mockClear();
  });

  it('calls markFixed mutation with { id }', () => {
    const { result } = renderHook(() => useConsistencyMutations());
    act(() => {
      result.current.markFindingFixed(55);
    });
    expect(mockMarkFixedMutate).toHaveBeenCalledWith({ id: 55 });
  });
});

describe('useConsistencyMutations — dismissFinding', () => {
  beforeEach(() => {
    mockDismissMutate.mockClear();
  });

  it('calls dismiss mutation with { id }', () => {
    const { result } = renderHook(() => useConsistencyMutations());
    act(() => {
      result.current.dismissFinding(99);
    });
    expect(mockDismissMutate).toHaveBeenCalledWith({ id: 99 });
  });
});

describe('useConsistencyMutations — openInEditor', () => {
  it('exposes openInEditor function', () => {
    const { result } = renderHook(() => useConsistencyMutations());
    expect(typeof result.current.openInEditor).toBe('function');
  });

  it('openInEditor with a path does not throw', () => {
    const { result } = renderHook(() => useConsistencyMutations());
    expect(() => {
      act(() => {
        result.current.openInEditor('docs/SPEC.md');
      });
    }).not.toThrow();
  });

  // Finding #9 (LOW): openInEditor URL assert — calls window.open with vscode:// URL
  it('openInEditor calls window.open with vscode:// URL for the given path', () => {
    const mockOpen = vi.fn();
    const original = window.open;
    window.open = mockOpen;
    try {
      const { result } = renderHook(() => useConsistencyMutations());
      act(() => {
        result.current.openInEditor('docs/SPEC.md');
      });
      expect(mockOpen).toHaveBeenCalledWith('vscode://file/docs/SPEC.md');
    } finally {
      window.open = original;
    }
  });

  // Finding #5 (MEDIUM): URL encode path segments to prevent injection
  it('openInEditor encodes path segments with special characters', () => {
    const mockOpen = vi.fn();
    const original = window.open;
    window.open = mockOpen;
    try {
      const { result } = renderHook(() => useConsistencyMutations());
      act(() => {
        // Path with space and # in segment name
        result.current.openInEditor('docs/my spec#1/SPEC.md');
      });
      // Each segment should be encoded, separators preserved
      expect(mockOpen).toHaveBeenCalledWith('vscode://file/docs/my%20spec%231/SPEC.md');
    } finally {
      window.open = original;
    }
  });
});

// Finding #6 (MEDIUM): all mutations invalidate cache on success
describe('useConsistencyMutations — cache invalidation on success', () => {
  beforeEach(() => {
    mockAcknowledgeMutate.mockClear();
    mockMarkFixedMutate.mockClear();
    mockDismissMutate.mockClear();
    mockInvalidate.mockClear();
  });

  it('acknowledgeFinding invalidates consistency.list cache after success', () => {
    const { result } = renderHook(() => useConsistencyMutations());
    act(() => {
      result.current.acknowledgeFinding(42);
    });
    expect(mockInvalidate).toHaveBeenCalledWith({ projectId: 'claude-loom' });
  });

  it('markFindingFixed invalidates consistency.list cache after success', () => {
    const { result } = renderHook(() => useConsistencyMutations());
    act(() => {
      result.current.markFindingFixed(55);
    });
    expect(mockInvalidate).toHaveBeenCalledWith({ projectId: 'claude-loom' });
  });

  it('dismissFinding invalidates consistency.list cache after success', () => {
    const { result } = renderHook(() => useConsistencyMutations());
    act(() => {
      result.current.dismissFinding(99);
    });
    expect(mockInvalidate).toHaveBeenCalledWith({ projectId: 'claude-loom' });
  });
});

describe('useConsistencyMutations — result shape', () => {
  it('returns expected function and boolean shape', () => {
    const { result } = renderHook(() => useConsistencyMutations());
    expect(typeof result.current.acknowledgeFinding).toBe('function');
    expect(typeof result.current.markFindingFixed).toBe('function');
    expect(typeof result.current.dismissFinding).toBe('function');
    expect(typeof result.current.openInEditor).toBe('function');
    expect(typeof result.current.isAcknowledgePending).toBe('boolean');
    expect(typeof result.current.isMarkFixedPending).toBe('boolean');
    expect(typeof result.current.isDismissPending).toBe('boolean');
  });
});
