/**
 * useCustomizationMutation — tRPC mutation wrapper hook for agent customization.
 *
 * WHY: Centralises write logic for per-agent model + personality settings so
 * CustomizationView stays a pure rendering component (SRP).
 * Follows the pattern of usePlanMutations.ts (M3.1) and useConsistencyMutations.ts.
 *
 * Write API: PUT /customization/:agentId { model?, preset?, scope: "user"|"project" }
 * maps to trpc.prefs.user.set / trpc.prefs.project.set in the daemon prefs router.
 *
 * The "scope" decides which JSON file gets the write-back:
 *   user   → ~/.claude-loom/user-prefs.json (agents.<agentId>.model / .personality)
 *   project → <project>/.claude-loom/project-prefs.json
 *
 * M0.15 t16: initial implementation. scope defaults to "project" per the redesign
 * SSoT (scenarios.js ⑦ CUSTOMIZATION: "project スコープは現 PJ のみ" is the UI default).
 *
 * REQ-077
 */
import { trpc } from '../trpc/client';

// WHY: fixed for M0.15; M6 will resolve from project context
const PROJECT_ID = 'claude-loom';

export type CustomizationScope = 'user' | 'project';

export interface CustomizationPatch {
  agentId: string;
  model?: string;
  preset?: string;
  scope?: CustomizationScope;
}

export interface UseCustomizationMutationResult {
  /**
   * Save model + preset for one agent at the given scope.
   * WHY: batching all agents in one call would require a loop; keeping it
   * per-agent lets the view call mutate() once per changed row (KISS).
   */
  mutate: (patch: CustomizationPatch) => void;
  /** True while a mutation is in-flight. */
  isPending: boolean;
}

/**
 * Provides a mutation function for saving agent customization (model + preset).
 * Writes to user-prefs or project-prefs depending on scope.
 */
export function useCustomizationMutation(): UseCustomizationMutationResult {
  const utils = trpc.useUtils();

  const userSetMutation = trpc.prefs.user.set.useMutation({
    onSuccess: () => {
      void utils.prefs.user.get.invalidate();
    },
  });

  const projectSetMutation = trpc.prefs.project.set.useMutation({
    onSuccess: () => {
      void utils.prefs.project.get.invalidate({ projectId: PROJECT_ID });
    },
  });

  function mutate(patch: CustomizationPatch): void {
    const scope = patch.scope ?? 'project';
    const agentPatch = {
      // WHY: We build the agents.<agentId> partial patch. The daemon deepMerge
      // will overlay this on top of the existing prefs without losing other agents.
      agents: {
        [patch.agentId]: {
          ...(patch.model !== undefined ? { model: patch.model as 'opus' | 'sonnet' | 'haiku' } : {}),
          ...(patch.preset !== undefined ? { personality: patch.preset } : {}),
        },
      },
    };

    if (scope === 'user') {
      userSetMutation.mutate({ patch: agentPatch });
    } else {
      projectSetMutation.mutate({ projectId: PROJECT_ID, patch: agentPatch });
    }
  }

  return {
    mutate,
    isPending: userSetMutation.isPending || projectSetMutation.isPending,
  };
}
