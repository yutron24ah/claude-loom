/**
 * useConsistencyMutations — tRPC mutation wrapper hook for consistency_findings.
 *
 * WHY: Centralises acknowledge / markFixed / dismiss / openInEditor mutation logic
 * so ConsistencyViewLive stays a pure rendering + interaction component (SRP).
 * Pattern follows usePlanMutations.ts (M3.1).
 *
 * Cache invalidation: all mutations call utils.consistency.list.invalidate()
 * after success so the live query refetches with updated finding statuses.
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
  /** Set finding status to 'acknowledged'. */
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

  const acknowledgeMutation = trpc.consistency.acknowledge.useMutation({
    onSuccess: () => {
      void utils.consistency.list.invalidate({ projectId: PROJECT_ID });
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
    acknowledgeMutation.mutate({ id });
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
