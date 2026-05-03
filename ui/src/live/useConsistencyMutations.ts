/**
 * useConsistencyMutations — tRPC mutation wrapper hook for consistency_findings.
 *
 * WHY: Centralises acknowledge / markFixed / dismiss / openInEditor mutation logic
 * so ConsistencyViewLive stays a pure rendering + interaction component (SRP).
 * Pattern follows usePlanMutations.ts (M3.1).
 *
 * Cache invalidation: all mutations call utils.consistency.list.invalidate().
 * M4 t6: acknowledgeFinding now calls acknowledgeAndCreatePlanItem which also
 * invalidates plan.list (new plan item was created from the finding).
 *
 * openInEditor: uses vscode://file/<path> URL scheme for simple M4 impl.
 * WHY vscode:// only: M5 polish concern — covers the common dev env case
 * without requiring editor selection UI (YAGNI, KISS).
 *
 * projectId: fixed to 'claude-loom' for M4 — same as useConsistencyFindings.ts.
 */
import { trpc } from '../trpc/client';

// WHY: fixed for M4; M5 will resolve from project.json / env
const PROJECT_ID = 'claude-loom';

export interface UseConsistencyMutationsResult {
  /**
   * Acknowledge finding AND create a plan_item from it (SPEC §7.5 Step 6).
   * WHY: M4 t6 — acknowledgement promotes the finding to the long-term plan lane.
   * Internally calls acknowledgeAndCreatePlanItem mutation (not bare acknowledge).
   */
  acknowledgeFinding: (id: number) => void;
  /** Set finding status to 'fixed'. */
  markFindingFixed: (id: number) => void;
  /** Set finding status to 'dismissed'. */
  dismissFinding: (id: number) => void;
  /** Open finding targetPath in VS Code via vscode://file/<path> scheme. */
  openInEditor: (targetPath: string) => void;
  isAcknowledgePending: boolean;
  isMarkFixedPending: boolean;
  isDismissPending: boolean;
}

/**
 * Provides mutation functions for consistency_findings status transitions.
 * All status mutations invalidate the consistency.list cache so the view
 * re-renders with fresh data after each action.
 */
export function useConsistencyMutations(): UseConsistencyMutationsResult {
  const utils = trpc.useUtils();

  // M4 t6: use acknowledgeAndCreatePlanItem instead of bare acknowledge.
  // WHY: SPEC §7.5 Step 6 — Acknowledge = plan_items 追加 are unified.
  // On success: invalidate both consistency.list (status changed) and
  // plan.list (new plan item created from the finding).
  const acknowledgeMutation = trpc.consistency.acknowledgeAndCreatePlanItem.useMutation({
    onSuccess: () => {
      void utils.consistency.list.invalidate({ projectId: PROJECT_ID });
      void utils.plan.list.invalidate({ projectId: PROJECT_ID });
    },
  });

  const markFixedMutation = trpc.consistency.markFixed.useMutation({
    onSuccess: () => {
      void utils.consistency.list.invalidate({ projectId: PROJECT_ID });
    },
  });

  const dismissMutation = trpc.consistency.dismiss.useMutation({
    onSuccess: () => {
      void utils.consistency.list.invalidate({ projectId: PROJECT_ID });
    },
  });

  function acknowledgeFinding(id: number): void {
    // M4 t6: pass findingId + projectId for the combined acknowledge+plan mutation.
    acknowledgeMutation.mutate({ findingId: id, projectId: PROJECT_ID });
  }

  function markFindingFixed(id: number): void {
    markFixedMutation.mutate({ id });
  }

  function dismissFinding(id: number): void {
    dismissMutation.mutate({ id });
  }

  /**
   * Open targetPath in VS Code using the vscode://file/ URL scheme.
   * WHY: simplest cross-platform approach for dev env (M4 scope).
   * WHY encode segments: path segments may contain special chars (#, spaces)
   * that would be misinterpreted as URL fragment or query delimiters.
   * Each segment is encoded individually to preserve path separators (/).
   * M5 polish: add line number from finding or make editor configurable.
   */
  function openInEditor(targetPath: string): void {
    const encodedPath = targetPath.split('/').map(encodeURIComponent).join('/');
    window.open(`vscode://file/${encodedPath}`);
  }

  return {
    acknowledgeFinding,
    markFindingFixed,
    dismissFinding,
    openInEditor,
    isAcknowledgePending: acknowledgeMutation.isPending,
    isMarkFixedPending: markFixedMutation.isPending,
    isDismissPending: dismissMutation.isPending,
  };
}
