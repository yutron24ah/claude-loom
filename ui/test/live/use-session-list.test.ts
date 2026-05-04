/**
 * TDD tests for useSessionList hook (RED phase — M3.2 t1).
 *
 * WHY: The hook must:
 *   1. Call trpc.session.list.useQuery with { projectId } when connected
 *   2. Pass enabled: false when connection status is NOT 'connected'
 *   3. Subscribe to trpc.session.subscribe when connected (live update)
 *   4. Expose filter state: projectFilter, roleFilter (via useState)
 *   5. Expose sort state: sortOrder ('asc' | 'desc') via useState
 *   6. Expose setProjectFilter, setRoleFilter, toggleSortOrder callbacks
 *   7. Return sessions, isLoading, error from tRPC query
 *
 * We mock the tRPC client module entirely so no WS connection is needed.
 * We test BEHAVIOR (what the hook does with connection state + filter/sort ops)
 * not implementation internals.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConnectionStore } from '@/store/connection';

// ---------------------------------------------------------------------------
// Mock @/trpc/client
// ---------------------------------------------------------------------------
type SubscriptionOptions = {
  onData?: (data: unknown) => void;
  onError?: (err: unknown) => void;
  enabled?: boolean;
};

const { mockUseQuery, mockUseSubscription, capturedSubArgs, mockInvalidate } = vi.hoisted(() => {
  const subArgs: SubscriptionOptions[] = [];
  const subFn = vi.fn((_input: unknown, opts: SubscriptionOptions) => {
    subArgs.push(opts);
  });
  const invalidateFn = vi.fn().mockResolvedValue(undefined);
  return {
    mockUseQuery: vi.fn().mockReturnValue({ data: [], isLoading: false, error: null }),
    mockUseSubscription: subFn,
    capturedSubArgs: subArgs,
    mockInvalidate: invalidateFn,
  };
});

vi.mock('@/trpc/client', () => ({
  trpc: {
    session: {
      list: {
        useQuery: mockUseQuery,
      },
      subscribe: {
        useSubscription: mockUseSubscription,
      },
    },
    useUtils: () => ({
      session: {
        list: {
          invalidate: mockInvalidate,
        },
      },
    }),
  },
  wsClient: {},
  trpcClient: {},
}));

// Import after mock
import { useSessionList } from '@/live/useSessionList';

// ---------------------------------------------------------------------------
// Reset state between tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  mockUseQuery.mockClear();
  mockUseQuery.mockReturnValue({ data: [], isLoading: false, error: null });
  mockUseSubscription.mockClear();
  capturedSubArgs.length = 0;
});

// ---------------------------------------------------------------------------
// Query enabled gate
// ---------------------------------------------------------------------------

describe('useSessionList — query disabled when not connected', () => {
  it('status="connecting" → query called with enabled: false', () => {
    useConnectionStore.setState({ status: 'connecting', attempts: 0 });
    renderHook(() => useSessionList());
    expect(mockUseQuery).toHaveBeenCalledOnce();
    const [, opts] = mockUseQuery.mock.calls[0] as [unknown, { enabled: boolean }];
    expect(opts.enabled).toBe(false);
  });

  it('status="disconnected" → query called with enabled: false', () => {
    useConnectionStore.setState({ status: 'disconnected', attempts: 1 });
    renderHook(() => useSessionList());
    const [, opts] = mockUseQuery.mock.calls[0] as [unknown, { enabled: boolean }];
    expect(opts.enabled).toBe(false);
  });
});

describe('useSessionList — query enabled when connected', () => {
  it('status="connected" → query called with enabled: true', () => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    renderHook(() => useSessionList());
    const [, opts] = mockUseQuery.mock.calls[0] as [unknown, { enabled: boolean }];
    expect(opts.enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Subscription enabled gate
// ---------------------------------------------------------------------------

describe('useSessionList — subscription disabled when not connected', () => {
  it('status="disconnected" → subscription called with enabled: false', () => {
    useConnectionStore.setState({ status: 'disconnected', attempts: 1 });
    renderHook(() => useSessionList());
    expect(mockUseSubscription).toHaveBeenCalledOnce();
    const opts = capturedSubArgs[0];
    expect(opts.enabled).toBe(false);
  });
});

describe('useSessionList — subscription enabled when connected', () => {
  it('status="connected" → subscription called with enabled: true', () => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    renderHook(() => useSessionList());
    expect(mockUseSubscription).toHaveBeenCalledOnce();
    const opts = capturedSubArgs[0];
    expect(opts.enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('useSessionList — initial state', () => {
  it('initial projectFilter is null', () => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    const { result } = renderHook(() => useSessionList());
    expect(result.current.projectFilter).toBeNull();
  });

  it('initial roleFilter is null', () => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    const { result } = renderHook(() => useSessionList());
    expect(result.current.roleFilter).toBeNull();
  });

  it('initial sortOrder is "desc"', () => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    const { result } = renderHook(() => useSessionList());
    expect(result.current.sortOrder).toBe('desc');
  });

  it('returns empty sessions array initially', () => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    const { result } = renderHook(() => useSessionList());
    expect(result.current.sessions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Filter state mutations
// ---------------------------------------------------------------------------

describe('useSessionList — filter mutations', () => {
  it('setProjectFilter updates projectFilter', () => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    const { result } = renderHook(() => useSessionList());

    act(() => {
      result.current.setProjectFilter('claude-loom');
    });

    expect(result.current.projectFilter).toBe('claude-loom');
  });

  it('setProjectFilter with null clears the filter', () => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    const { result } = renderHook(() => useSessionList());

    act(() => {
      result.current.setProjectFilter('claude-loom');
    });
    act(() => {
      result.current.setProjectFilter(null);
    });

    expect(result.current.projectFilter).toBeNull();
  });

  it('setRoleFilter updates roleFilter', () => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    const { result } = renderHook(() => useSessionList());

    act(() => {
      result.current.setRoleFilter('pm');
    });

    expect(result.current.roleFilter).toBe('pm');
  });

  it('setRoleFilter with null clears the filter', () => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    const { result } = renderHook(() => useSessionList());

    act(() => {
      result.current.setRoleFilter('dev_parent');
    });
    act(() => {
      result.current.setRoleFilter(null);
    });

    expect(result.current.roleFilter).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Sort toggle
// ---------------------------------------------------------------------------

describe('useSessionList — sort toggle', () => {
  it('toggleSortOrder flips desc → asc', () => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    const { result } = renderHook(() => useSessionList());

    // Initial state is 'desc'
    expect(result.current.sortOrder).toBe('desc');

    act(() => {
      result.current.toggleSortOrder();
    });

    expect(result.current.sortOrder).toBe('asc');
  });

  it('toggleSortOrder flips asc → desc', () => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    const { result } = renderHook(() => useSessionList());

    // Flip to asc first
    act(() => {
      result.current.toggleSortOrder();
    });
    expect(result.current.sortOrder).toBe('asc');

    // Flip back to desc
    act(() => {
      result.current.toggleSortOrder();
    });
    expect(result.current.sortOrder).toBe('desc');
  });
});

// ---------------------------------------------------------------------------
// Session.subscribe event → refetch
// ---------------------------------------------------------------------------

describe('useSessionList — subscription event handling', () => {
  it('has onData callback in subscription options', () => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    renderHook(() => useSessionList());
    const opts = capturedSubArgs[0];
    expect(typeof opts.onData).toBe('function');
  });
});
