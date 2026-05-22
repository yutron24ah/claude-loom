/**
 * TDD tests for approval.decide NOT_FOUND toast (not-found-toast.test.tsx)
 *
 * WHY: REQ-159..161 — when approval.decide throws a TRPCError with code
 * NOT_FOUND (event expired / pruned server-side), the UI must catch it,
 * emit an error toast with retry action, and allow retrying the same payload.
 *
 * prefix: ENF-* (was ERR-NF-*, renamed per m0.19-t2e naming mismatch resolution)
 * SSoT: spec/ui-arch.md §8.2.4, qa-suite.js lines 4187-4225
 *
 * Hard constraints:
 *   - No raw string comparison for TRPC error codes (TRPC_CODES const)
 *   - No style={{}} inline dynamic values outside necessary exceptions
 *   - Other tasks' files not touched (t6 TokenMeter / t8 Sidebar)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { toastBus } from '@/notifications/toastBus';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

/**
 * Build a TRPCClientError that mimics a server NOT_FOUND throw.
 * The shape.data.code field is what the onError handler must read.
 */
function makeNotFoundError(message = 'Event 42 not found'): TRPCClientError<any> {
  return new TRPCClientError(message, {
    result: {
      error: {
        message,
        code: -32004, // TRPC_ERROR_CODES_BY_KEY.NOT_FOUND
        data: {
          code: 'NOT_FOUND',
          httpStatus: 404,
          path: 'approval.decide',
          stack: '',
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Mock trpc — useApprovalMutations depends on trpc.approval.decide.useMutation
// ---------------------------------------------------------------------------

const decideMutate = vi.fn();

vi.mock('@/trpc/client', () => ({
  trpc: {
    approval: {
      decide: {
        useMutation: vi.fn(() => ({
          mutate: decideMutate,
          isPending: false,
        })),
      },
    },
  },
}));

// ---------------------------------------------------------------------------
// Import hook under test (after mocks)
// ---------------------------------------------------------------------------
import { useApprovalMutations, TRPC_CODES } from '@/live/useApprovalMutations';

// ---------------------------------------------------------------------------
// ENF-CATCH-01 (REQ-159): TRPC_CODES.NOT_FOUND is typed constant 'NOT_FOUND'
// ---------------------------------------------------------------------------

// covers: ENF-CATCH-01
describe('NOT_FOUND try/catch — TRPC_CODES typed constant (REQ-159)', () => {
  it('TRPC_CODES.NOT_FOUND equals "NOT_FOUND" (typed constant, not raw string in call-sites)', () => {
    // WHY: Hard constraint — no raw string comparison for TRPC error codes.
    // Exporting TRPC_CODES lets callers use it for comparison and tests to verify
    // the constant value is correct.
    expect(TRPC_CODES.NOT_FOUND).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// ENF-TOAST-01 (REQ-160): NOT_FOUND onError → error toast with retry action
// ---------------------------------------------------------------------------

// covers: ENF-CATCH-01, ENF-TOAST-01
describe('NOT_FOUND error toast — onError emits error toast with retry action (REQ-160)', () => {
  beforeEach(() => {
    decideMutate.mockClear();
  });

  it('emits a toast with kind=error and action=retry when NOT_FOUND is thrown', () => {
    const received: Parameters<typeof toastBus.emit>[0][] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));

    const { result } = renderHook(() => useApprovalMutations(), {
      wrapper: createWrapper(),
    });

    // Simulate the onError callback from the mutation being called externally
    act(() => {
      result.current.simulateDecideError(makeNotFoundError(), {
        eventId: 42,
        decision: 'approve',
      });
    });

    unsub();

    expect(received).toHaveLength(1);
    const toast = received[0];
    expect(toast.kind).toBe('error');
    expect(toast.message).toBe('approval event が見つかりません (期限切れ?)');
    expect((toast as { action?: string }).action).toBe('retry');
  });

  it('does NOT emit a toast for non-NOT_FOUND errors (other codes fall through)', () => {
    const received: Parameters<typeof toastBus.emit>[0][] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));

    const { result } = renderHook(() => useApprovalMutations(), {
      wrapper: createWrapper(),
    });

    // Build a non-NOT_FOUND error
    const otherError = new TRPCClientError('Internal error', {
      result: {
        error: {
          message: 'Internal error',
          code: -32603, // INTERNAL_SERVER_ERROR
          data: {
            code: 'INTERNAL_SERVER_ERROR',
            httpStatus: 500,
            path: 'approval.decide',
            stack: '',
          },
        },
      },
    });

    act(() => {
      result.current.simulateDecideError(otherError, {
        eventId: 99,
        decision: 'deny',
      });
    });

    unsub();

    // Other errors must not produce a toast (existing behaviour maintained)
    expect(received).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ENF-RETRY-01 (REQ-161): retry action re-invokes decide with same payload
// ---------------------------------------------------------------------------

// covers: ENF-RETRY-01
describe('retry action — re-invokes approval.decide with same payload (REQ-161)', () => {
  beforeEach(() => {
    decideMutate.mockClear();
  });

  it('retryLastDecide() calls mutate again with the original payload', () => {
    const { result } = renderHook(() => useApprovalMutations(), {
      wrapper: createWrapper(),
    });

    const payload = { eventId: 42, decision: 'approve' as const };

    act(() => {
      // Trigger NOT_FOUND error first — sets the retryable payload
      result.current.simulateDecideError(makeNotFoundError(), payload);
    });

    act(() => {
      // Simulate user clicking the retry action button
      result.current.retryLastDecide();
    });

    // mutate should have been called once with the retry payload
    expect(decideMutate).toHaveBeenCalledWith(payload);
  });
});
