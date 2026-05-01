/**
 * usePlanItems — live tRPC query hook for plan_items.
 *
 * WHY: Candidate A vertical slice (M2 Task 10). Centralises the tRPC
 * plan.list query so PlanView stays a pure rendering component.
 *
 * enabled gate: only fire the query when the WS connection is 'connected'.
 * Prevents wasted reconnect-storm queries during daemon downtime.
 *
 * projectId: fixed to 'claude-loom' for M2. M5 polish will read from
 * project.json / env config (tracked as separate issue).
 */
import { trpc } from '../trpc/client';
import { useConnectionStore } from '../store/connection';
import type { PlanItem } from '@claude-loom/daemon';

// WHY: fixed for M2; M5 will resolve from project.json / env
const PROJECT_ID = 'claude-loom';

export interface UsePlanItemsResult {
  data: PlanItem[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Query plan items from the daemon.
 * Returns loading / error / data states for PlanView to render.
 */
export function usePlanItems(): UsePlanItemsResult {
  const status = useConnectionStore((s) => s.status);
  const isConnected = status === 'connected';

  const result = trpc.plan.list.useQuery(
    { projectId: PROJECT_ID },
    { enabled: isConnected },
  );

  return {
    data: result.data,
    isLoading: result.isLoading,
    error: result.error as Error | null,
  };
}
