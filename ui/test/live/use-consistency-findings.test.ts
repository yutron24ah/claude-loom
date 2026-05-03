/**
 * TDD tests for useConsistencyFindings hook (RED phase — written before implementation).
 *
 * WHY: Verify the hook:
 *   1. Calls trpc.consistency.list.useQuery with projectId
 *   2. Gate on isConnected (like usePlanItems pattern)
 *   3. Returns data / isLoading / error shape
 *
 * Follows use-plan-items.test.ts pattern exactly.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useConnectionStore } from '@/store/connection';

// ---------------------------------------------------------------------------
// Mock @/trpc/client
// ---------------------------------------------------------------------------
const { mockUseQuery } = vi.hoisted(() => ({
  mockUseQuery: vi.fn().mockReturnValue({ data: [], isLoading: false, error: null }),
}));

vi.mock('@/trpc/client', () => ({
  trpc: {
    consistency: {
      list: {
        useQuery: mockUseQuery,
      },
    },
  },
  wsClient: {},
  trpcClient: {},
}));

import { useConsistencyFindings } from '@/live/useConsistencyFindings';

describe('useConsistencyFindings — disabled when not connected', () => {
  beforeEach(() => {
    mockUseQuery.mockClear();
    mockUseQuery.mockReturnValue({ data: [], isLoading: false, error: null });
  });

  it('status="connecting" → enabled: false', () => {
    useConnectionStore.setState({ status: 'connecting', attempts: 0 });
    renderHook(() => useConsistencyFindings());
    const [, opts] = mockUseQuery.mock.calls[0] as [unknown, { enabled: boolean }];
    expect(opts.enabled).toBe(false);
  });

  it('status="disconnected" → enabled: false', () => {
    useConnectionStore.setState({ status: 'disconnected', attempts: 1 });
    renderHook(() => useConsistencyFindings());
    const [, opts] = mockUseQuery.mock.calls[0] as [unknown, { enabled: boolean }];
    expect(opts.enabled).toBe(false);
  });
});

describe('useConsistencyFindings — enabled when connected', () => {
  beforeEach(() => {
    mockUseQuery.mockClear();
    mockUseQuery.mockReturnValue({ data: [], isLoading: false, error: null });
  });

  it('status="connected" → enabled: true', () => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    renderHook(() => useConsistencyFindings());
    const [, opts] = mockUseQuery.mock.calls[0] as [unknown, { enabled: boolean }];
    expect(opts.enabled).toBe(true);
  });

  it('passes projectId "claude-loom" in input', () => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    renderHook(() => useConsistencyFindings());
    const [input] = mockUseQuery.mock.calls[0] as [{ projectId: string }, unknown];
    expect(input.projectId).toBe('claude-loom');
  });

  it('returns data, isLoading, error from useQuery', () => {
    const mockData = [{ id: 1, specChangeId: 1, targetPath: 'a.md', severity: 'high', findingType: 'section_changed', description: 'test', suggestedChange: null, status: 'open', createdAt: new Date() }];
    mockUseQuery.mockReturnValueOnce({ data: mockData, isLoading: false, error: null });
    useConnectionStore.setState({ status: 'connected', attempts: 0 });

    const { result } = renderHook(() => useConsistencyFindings());
    expect(result.current.data).toEqual(mockData);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
