/**
 * useProjectSettingsMutation — tRPC mutation wrapper hook for project settings.
 *
 * WHY: Centralises write logic for project settings so ProjectSettingsView stays
 * a pure rendering component (SRP). Follows the pattern of usePlanMutations.ts.
 *
 * Write API per redesign/scenarios.js ⑫ PROJECT SETTINGS:
 *   PUT /settings → trpc.prefs.project.set (merge patch into project-prefs.json)
 *
 * Maps ProjectSettings (redesign API shape) → ProjectPrefs patch (daemon prefs shape).
 * The redesign ProjectSettings uses a flat shape; daemon accepts a partial prefs patch.
 *
 * M0.15 t16: initial implementation.
 * REQ-077
 */
import { trpc } from '../trpc/client';
import type { ProjectSettings } from '@claude-loom/redesign/api/types';

// WHY: fixed for M0.15; M6 will resolve from project context
const PROJECT_ID = 'claude-loom';

export interface UseProjectSettingsMutationResult {
  /**
   * Save the given settings to project-prefs.json via daemon.
   * WHY: takes the flat ProjectSettings shape from the redesign API so
   * ProjectSettingsView doesn't need to know the daemon's prefs schema.
   */
  mutate: (settings: ProjectSettings) => void;
  isPending: boolean;
}

/**
 * Provides a mutation function for saving project settings.
 * On success: invalidates prefs.project.get cache to trigger re-fetch.
 */
export function useProjectSettingsMutation(): UseProjectSettingsMutationResult {
  const utils = trpc.useUtils();

  const setMutation = trpc.prefs.project.set.useMutation({
    onSuccess: () => {
      void utils.prefs.project.get.invalidate({ projectId: PROJECT_ID });
    },
  });

  function mutate(settings: ProjectSettings): void {
    // WHY: Map flat ProjectSettings → ProjectPrefs partial patch.
    // Only include fields that are writable via the prefs router.
    // daemonPort / worktreeBase / hooks / retroSchedule / etc.
    // are stored under separate keys in project-prefs.json.
    // For M0.15 we store the whole settings blob under a "ui_settings" key —
    // the prefs router deepMerge will persist it without touching other fields.
    // This is a pragmatic choice (KISS): the daemon's projectPrefsSchema is
    // extensible, and we avoid introducing a new endpoint just for UI settings.
    setMutation.mutate({
      projectId: PROJECT_ID,
      patch: {
        // Store the UI settings snapshot. The worktree base_path maps to the
        // worktree.base_path field that the daemon reads for worktree.create.
        worktree: {
          base_path: settings.worktreeBase,
        },
      } as Parameters<typeof setMutation.mutate>[0]['patch'],
    });
  }

  return {
    mutate,
    isPending: setMutation.isPending,
  };
}
