/**
 * useApprovalMutations — tRPC mutation hook for approval.decide.
 *
 * WHY: Centralises approval mutation logic with NOT_FOUND error handling so
 * call-sites (AdminPanel retry button, PMChatPanel etc.) stay pure renderers
 * (SRP). The onError handler catches TRPCClientError code NOT_FOUND and emits
 * an error toast with action='retry', then stores the last payload so callers
 * can invoke retryLastDecide() without knowing the original input.
 *
 * Design SSoT:
 *   spec/ui-arch.md §8.2.4 Cross-cutting NOT_FOUND toast
 *   qa-suite.js ENF-CATCH-01 / ENF-TOAST-01 / ENF-RETRY-01 (lines 4187-4225)
 *
 * Principle §1 (SRP): only owns approval.decide mutation + NOT_FOUND handling.
 * Principle §4 (KISS): minimal wrapper — expose decide/retryLastDecide/isPending.
 * Principle §6 (Illegal states): TRPC_CODES typed const prevents raw string
 *   comparison for error code check (project mandate, CLAUDE.md feedback).
 * Principle §9 (Fail fast): non-NOT_FOUND errors propagate unchanged (no mask).
 *
 * REQ-159: TRPC_CODES typed constant (no raw string comparison in call-sites).
 * REQ-160: NOT_FOUND → emitApprovalNotFound() with action='retry'.
 * REQ-161: retryLastDecide() re-invokes mutate with stored payload.
 */
import { useRef } from 'react';
import { TRPCClientError } from '@trpc/client';
import { trpc } from '../trpc/client';
import { emitApprovalNotFound } from '../notifications/toastBus';

// ---------------------------------------------------------------------------
// Typed constant for TRPC error codes (mandate: no raw string comparison).
// WHY: Using a typed const object instead of raw 'NOT_FOUND' strings in
// comparisons ensures lint/refactor safety and satisfies the project hard
// constraint (feedback_avoid_string_literals MEMORY).
// ---------------------------------------------------------------------------

/**
 * Subset of TRPC error codes used in this module.
 * Add entries here as additional codes need handling (YAGNI — only what's used).
 */
export const TRPC_CODES = {
  NOT_FOUND: 'NOT_FOUND',
} as const;

export type TrpcCode = (typeof TRPC_CODES)[keyof typeof TRPC_CODES];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApprovalDecision = 'approve' | 'deny';

export interface DecideInput {
  eventId: number;
  decision: ApprovalDecision;
  note?: string;
}

export interface UseApprovalMutationsResult {
  /** Invoke approval.decide with the given payload. */
  decide: (input: DecideInput) => void;
  /** Re-invoke decide with the last attempted payload (for retry action). */
  retryLastDecide: () => void;
  /** True while a decide mutation is in-flight. */
  isPending: boolean;
  /**
   * TEST-ONLY escape hatch: simulate the onError callback externally.
   * WHY: tRPC mutation callbacks are wired inside useMutation options — Vitest
   * can't trigger them without a real WS connection. This helper lets tests
   * call the exact same error-handling logic without needing a daemon.
   * Principle §8 (Test behaviour, not implementation): tests verify the
   * observable side-effects (toast emitted, retry payload stored).
   */
  simulateDecideError: (error: unknown, input: DecideInput) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns mutation functions for the approval.decide tRPC procedure.
 * NOT_FOUND errors are caught and surfaced as error toasts with retry action.
 * All other errors pass through unchanged (existing error boundary / WS reducer
 * handles them — no masking).
 */
export function useApprovalMutations(): UseApprovalMutationsResult {
  /**
   * Store the last payload so retryLastDecide() can re-invoke without
   * requiring callers to track it themselves.
   * WHY: useRef (not useState) — retry payload is not display state, updating
   * it must not trigger a re-render.
   */
  const lastInputRef = useRef<DecideInput | null>(null);

  /**
   * Core error handler — shared between the real onError callback and the
   * simulateDecideError test helper to ensure identical behaviour.
   * WHY: Single implementation point (DRY) — no drift between test path and
   * production path.
   */
  function handleDecideError(error: unknown, input: DecideInput): void {
    if (
      error instanceof TRPCClientError &&
      error.data?.code === TRPC_CODES.NOT_FOUND
    ) {
      // Store payload for potential retry before emitting the toast.
      lastInputRef.current = input;
      emitApprovalNotFound();
      // NOT_FOUND is handled; do not re-throw (crash prevention per ENF-CATCH-01).
      return;
    }
    // Non-NOT_FOUND errors: do not emit a toast here, let callers/error
    // boundaries handle them. We intentionally do not re-throw either —
    // tRPC useMutation already surfaces the error on mutation.error.
  }

  const decideMutation = trpc.approval.decide.useMutation({
    onError(error, input) {
      handleDecideError(error, input);
    },
  });

  function decide(input: DecideInput): void {
    lastInputRef.current = input;
    decideMutation.mutate(input);
  }

  function retryLastDecide(): void {
    const last = lastInputRef.current;
    if (last === null) return;
    decideMutation.mutate(last);
  }

  function simulateDecideError(error: unknown, input: DecideInput): void {
    handleDecideError(error, input);
  }

  return {
    decide,
    retryLastDecide,
    isPending: decideMutation.isPending,
    simulateDecideError,
  };
}
