/**
 * useAgentDispatchHistory — tRPC query hook for agent dispatch history.
 *
 * WHY: AgentDetailPanel needs to display the list of subagent dispatches
 * associated with a parent session. Separating this into its own hook keeps
 * the panel component free from data-fetching logic (SRP).
 *
 * Enabled flag: query is disabled when agentId is not provided or connection
 * is not established, following the same pattern as usePlanItems.ts.
 *
 * Pattern follows usePlanItems.ts (M3.1) for consistency.
 */
import { trpc } from '../trpc/client';
import { useConnectionStore } from '../store/connection';

export interface DispatchHistoryEntry {
  subagentId: string;
  agentType: string;
  status: string;
  startedAt: Date;
  endedAt: Date | null;
  resultSummary: string | null;
}

export interface UseAgentDispatchHistoryResult {
  data: DispatchHistoryEntry[] | undefined;
  isLoading: boolean;
  error: unknown;
}

/**
 * Queries dispatch history for a given agent (by parent session ID).
 * Returns an empty array until connected.
 */
export function useAgentDispatchHistory(agentId: string | undefined): UseAgentDispatchHistoryResult {
  const connectionStatus = useConnectionStore((s) => s.status);
  const isConnected = connectionStatus === 'connected';

  const result = trpc.agent.dispatchHistory.useQuery(
    { agentId: agentId ?? '' },
    { enabled: isConnected && !!agentId }
  );

  return {
    data: result.data as DispatchHistoryEntry[] | undefined,
    isLoading: result.isLoading,
    error: result.error,
  };
}
