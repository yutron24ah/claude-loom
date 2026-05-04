/**
 * useAgentMutations — tRPC mutation wrapper hook for agent operations.
 *
 * WHY: Centralises agent mutation logic (markAttention) so AgentDetailPanel
 * stays a pure rendering + interaction component (SRP).
 *
 * Optimistic update strategy: the toggle is immediate in local UI state;
 * the mutation call syncs to daemon. On error, callers should re-fetch.
 *
 * Pattern follows usePlanMutations.ts (M3.1 t2) for consistency.
 */
import { trpc } from '../trpc/client';

export interface UseAgentMutationsResult {
  /** Toggle the attention flag on a subagent. */
  markAttention: (input: { agentId: string; flag: boolean }) => void;
  /** True while a markAttention mutation is in-flight. */
  isMarkAttentionPending: boolean;
}

/**
 * Provides mutation functions for agent operations.
 * markAttention invalidates agent.detail cache so the view re-renders.
 */
export function useAgentMutations(): UseAgentMutationsResult {
  const utils = trpc.useUtils();

  const markAttentionMutation = trpc.agent.markAttention.useMutation({
    onSuccess: () => {
      // WHY: invalidate detail cache so fresh attention state is shown
      void utils.agent.detail.invalidate();
    },
  });

  function markAttention(input: { agentId: string; flag: boolean }): void {
    markAttentionMutation.mutate(input);
  }

  return {
    markAttention,
    isMarkAttentionPending: markAttentionMutation.isPending,
  };
}
