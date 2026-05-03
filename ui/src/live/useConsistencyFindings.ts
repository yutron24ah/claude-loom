/**
 * useConsistencyFindings — live tRPC query hook for consistency_findings.
 *
 * WHY: Centralises the trpc.consistency.list query so ConsistencyViewLive
 * stays a pure rendering component (SRP). Pattern follows usePlanItems.ts.
 *
 * enabled gate: only fire the query when the WS connection is 'connected'.
 * Prevents wasted reconnect-storm queries during daemon downtime.
 *
 * projectId: fixed to 'claude-loom' for M4. M5 polish will read from
 * project.json / env config (tracked as separate issue).
 */
import { trpc } from '../trpc/client';
import { useConnectionStore } from '../store/connection';
import type { ConsistencyFinding } from '@claude-loom/daemon';

// WHY: fixed for M4; M5 will resolve from project.json / env
const PROJECT_ID = 'claude-loom';

export interface UseConsistencyFindingsResult {
  data: ConsistencyFinding[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Query consistency findings from the daemon.
 * Returns loading / error / data states for ConsistencyViewLive to render.
 */
export function useConsistencyFindings(): UseConsistencyFindingsResult {
  const status = useConnectionStore((s) => s.status);
  const isConnected = status === 'connected';

  const result = trpc.consistency.list.useQuery(
    { projectId: PROJECT_ID },
    { enabled: isConnected },
  );

  return {
    data: result.data,
    isLoading: result.isLoading,
    error: result.error as Error | null,
  };
}
