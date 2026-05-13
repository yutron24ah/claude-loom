/**
 * useGuidanceMutations — tRPC mutation wrapper hook for learned-guidance entries.
 *
 * WHY: Centralises retire (delete) + toggle-active write logic so GuidanceView
 * stays a pure rendering component (SRP). Follows usePlanMutations.ts pattern.
 *
 * Write API per redesign/scenarios.js ⑧ GUIDANCE:
 *   DELETE /guidance/:id (retire)  → trpc.prefs.learnedGuidance.delete
 *   PATCH  /guidance/:id (toggle)  → trpc.prefs.learnedGuidance.toggle
 *
 * Scope default: the UI shows guidance from both user + project prefs.
 * Each GuidanceItem carries a scope field; mutations use that scope.
 *
 * M0.15 t16: initial implementation.
 * REQ-077
 */
import { trpc } from '../trpc/client';

// WHY: fixed for M0.15; M6 will resolve from project context
const PROJECT_ID = 'claude-loom';

export interface RetireGuidanceInput {
  id: string;
  agentId: string;
  scope: 'user' | 'project';
}

export interface ToggleGuidanceInput {
  id: string;
  agentId: string;
  scope: 'user' | 'project';
  active: boolean;
}

export interface UseGuidanceMutationsResult {
  /** Hard-delete a guidance entry (retire). */
  retireGuidance: (input: RetireGuidanceInput) => void;
  /** Toggle the active flag on a guidance entry. */
  toggleGuidance: (input: ToggleGuidanceInput) => void;
  isRetirePending: boolean;
  isTogglePending: boolean;
}

/**
 * Provides mutation functions for learned-guidance entries.
 * Both mutations invalidate the prefs cache after success.
 */
export function useGuidanceMutations(): UseGuidanceMutationsResult {
  const utils = trpc.useUtils();

  const deleteMutation = trpc.prefs.learnedGuidance.delete.useMutation({
    onSuccess: (_, variables) => {
      if (variables.scope === 'user') {
        void utils.prefs.user.get.invalidate();
      } else {
        void utils.prefs.project.get.invalidate({ projectId: variables.projectId ?? PROJECT_ID });
      }
    },
  });

  const toggleMutation = trpc.prefs.learnedGuidance.toggle.useMutation({
    onSuccess: (_, variables) => {
      if (variables.scope === 'user') {
        void utils.prefs.user.get.invalidate();
      } else {
        void utils.prefs.project.get.invalidate({ projectId: variables.projectId ?? PROJECT_ID });
      }
    },
  });

  function retireGuidance(input: RetireGuidanceInput): void {
    deleteMutation.mutate({
      scope: input.scope,
      agentName: input.agentId,
      guidanceId: input.id,
      ...(input.scope === 'project' ? { projectId: PROJECT_ID } : {}),
    });
  }

  function toggleGuidance(input: ToggleGuidanceInput): void {
    toggleMutation.mutate({
      scope: input.scope,
      agentName: input.agentId,
      guidanceId: input.id,
      active: input.active,
      ...(input.scope === 'project' ? { projectId: PROJECT_ID } : {}),
    });
  }

  return {
    retireGuidance,
    toggleGuidance,
    isRetirePending: deleteMutation.isPending,
    isTogglePending: toggleMutation.isPending,
  };
}
