/**
 * TDD tests for usePlanItems hook (RED phase — written before implementation).
 *
 * WHY: Candidate A vertical slice. The hook must:
 *   1. Call trpc.plan.list.useQuery with { projectId: 'claude-loom' }
 *   2. Pass enabled: false when connection status is NOT 'connected'
 *   3. Pass enabled: true when connection status IS 'connected'
 *
 * We mock the tRPC client module entirely so no WS connection is needed.
 * We test BEHAVIOR (what the hook does with connection state) not implementation.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useConnectionStore } from '@/store/connection';

// ---------------------------------------------------------------------------
// Mock @/trpc/client — exposes a `trpc` object whose plan.list.useQuery
// is a spy we can inspect.
// WHY: vi.hoisted ensures mock fn is created before vi.mock factory runs.
// ---------------------------------------------------------------------------
const { mockUseQuery } = vi.hoisted(() => ({
  mockUseQuery: vi.fn().mockReturnValue({ data: [], isLoading: false, error: null }),
}));

vi.mock('@/trpc/client', () => ({
  trpc: {
    plan: {
      list: {
        useQuery: mockUseQuery,
      },
    },
  },
  // wsClient + trpcClient not needed for this hook
  wsClient: {},
  trpcClient: {},
}));

// Import after mock is set up
import { usePlanItems } from '@/live/usePlanItems';

describe('usePlanItems — tRPC query disabled when not connected', () => {
  beforeEach(() => {
    mockUseQuery.mockClear();
    mockUseQuery.mockReturnValue({ data: [], isLoading: false, error: null });
  });

  it('status="connecting" → query called with enabled: false', () => {
    useConnectionStore.setState({ status: 'connecting', attempts: 0 });
    renderHook(() => usePlanItems());
    expect(mockUseQuery).toHaveBeenCalledOnce();
    const [, opts] = mockUseQuery.mock.calls[0] as [unknown, { enabled: boolean }];
    expect(opts.enabled).toBe(false);
  });

  it('status="disconnected" → query called with enabled: false', () => {
    useConnectionStore.setState({ status: 'disconnected', attempts: 1 });
    renderHook(() => usePlanItems());
    expect(mockUseQuery).toHaveBeenCalledOnce();
    const [, opts] = mockUseQuery.mock.calls[0] as [unknown, { enabled: boolean }];
    expect(opts.enabled).toBe(false);
  });

  it('status="reconnecting" → query called with enabled: false', () => {
    useConnectionStore.setState({ status: 'reconnecting', attempts: 2 });
    renderHook(() => usePlanItems());
    expect(mockUseQuery).toHaveBeenCalledOnce();
    const [, opts] = mockUseQuery.mock.calls[0] as [unknown, { enabled: boolean }];
    expect(opts.enabled).toBe(false);
  });
});

describe('usePlanItems — tRPC query enabled when connected', () => {
  beforeEach(() => {
    mockUseQuery.mockClear();
    mockUseQuery.mockReturnValue({ data: [], isLoading: false, error: null });
  });

  it('status="connected" → query called with enabled: true', () => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    renderHook(() => usePlanItems());
    expect(mockUseQuery).toHaveBeenCalledOnce();
    const [, opts] = mockUseQuery.mock.calls[0] as [unknown, { enabled: boolean }];
    expect(opts.enabled).toBe(true);
  });

  it('status="connected" → query called with projectId "claude-loom"', () => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    renderHook(() => usePlanItems());
    expect(mockUseQuery).toHaveBeenCalledOnce();
    const [input] = mockUseQuery.mock.calls[0] as [{ projectId: string }, unknown];
    expect(input.projectId).toBe('claude-loom');
  });

  it('returns the query result from useQuery', () => {
    const mockData = [
      { id: 1, projectId: 'claude-loom', title: 'M1 milestone', status: 'doing' as const,
        source: 'file', sourcePath: null, parentId: null, body: null, position: 0,
        updatedAt: new Date() },
    ];
    mockUseQuery.mockReturnValueOnce({ data: mockData, isLoading: false, error: null });
    useConnectionStore.setState({ status: 'connected', attempts: 0 });

    const { result } = renderHook(() => usePlanItems());
    expect(result.current.data).toEqual(mockData);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
