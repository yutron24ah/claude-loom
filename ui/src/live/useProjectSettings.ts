/**
 * useProjectSettings — tRPC query + mutation hook for project settings.
 *
 * WHY: M5 t3. Centralises project settings query + edit state so
 * ProjectSettingsView stays a pure rendering component (SPEC §3.6 SRP).
 *
 * Design:
 *   - `settings` = last successfully fetched server state (source of truth)
 *   - `draft` = user's in-progress edits (may differ from settings)
 *   - `isDirty` = draft !== settings (determines whether Save is meaningful)
 *   - `save` fires updateSettings mutation with draft values
 *   - `reset` reverts draft to current settings
 *
 * SPEC §3.6.10: mode / enum values use typed constants, never raw string
 * literals in comparisons.
 *
 * enabled gate: only fire query when WS connection is 'connected'.
 */
import { useState, useEffect } from 'react';
import { trpc } from '../trpc/client';
import { useConnectionStore } from '../store/connection';

// ---------------------------------------------------------------------------
// Types — SPEC §3.6.10: typed enums for all editable mode fields
// ---------------------------------------------------------------------------

/** Maps to rules.review_mode in project.json */
export type ReviewMode = 'single' | 'trio';

/** Maps to rules.coexistence_mode in project.json */
export type CoexistenceMode = 'full' | 'coexist' | 'custom';

/** Maps to rules.commit_language in project.json */
export type CommitLanguage = 'any' | 'japanese' | 'english';

/** Feature group names per SPEC §6.9 */
export type FeatureGroup = 'core' | 'retro' | 'customization' | 'worktree' | 'native-skills' | 'all';

/**
 * Flattened settings shape for the UI.
 * Combines project DB row fields (read-only) and editable rule/pool fields.
 */
export interface ProjectSettings {
  /** Read-only: from DB row */
  projectId: string;
  name: string;
  specPath: string | null;
  branch: string;
  createdAt: Date;
  /** Editable: rules / pool */
  reviewMode: ReviewMode;
  coexistenceMode: CoexistenceMode;
  enabledFeatures: string[];
  commitLanguage: CommitLanguage;
  /** Pool limits (editable) */
  maxDevelopers?: number;
  maxReviewers?: number;
}

export interface UseProjectSettingsResult {
  settings: ProjectSettings | null;
  draft: ProjectSettings | null;
  isLoading: boolean;
  error: Error | null;
  isDirty: boolean;
  setDraft: (patch: Partial<ProjectSettings>) => void;
  save: () => void;
  reset: () => void;
}

// WHY: project_id is resolved from the page's URL param or env. For M5, we
// use a fixed sentinel that the caller is expected to override. The hook
// consumer passes projectId as a prop; the view reads it from the URL or a
// global store. For the first iteration we default to the coexistence route
// pattern and expose the hook without a required argument — the view will
// supply the projectId via a context or prop in a future iteration.
//
// For M5 t3 initial implementation: projectId comes from the coexistence
// route which treats the rootPath as the projectId. We mirror that pattern.
const PROJECT_ROOT = process.env.VITE_PROJECT_ROOT ?? process.cwd?.() ?? '';

/**
 * Map raw project DB row + coexistence settings into the flat ProjectSettings shape.
 * project.json rules are read via coexistence route (existing pattern).
 * WHY: avoids adding a redundant project.json read path; reuses coexistenceRouter.
 */
function buildSettings(
  row: {
    projectId: string;
    name: string;
    specPath?: string | null;
    createdAt: Date;
  },
  coexistence: {
    mode: string;
    enabledFeatures: string[];
  },
  reviewMode: ReviewMode,
  commitLanguage: CommitLanguage,
): ProjectSettings {
  return {
    projectId: row.projectId,
    name: row.name,
    specPath: row.specPath ?? null,
    branch: 'main', // WHY: resolved from git in M6; static for M5 UI
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(Number(row.createdAt)),
    reviewMode,
    coexistenceMode: (coexistence.mode as CoexistenceMode) ?? 'full',
    enabledFeatures: coexistence.enabledFeatures,
    commitLanguage,
  };
}

/**
 * Hook for ProjectSettingsView. Queries project detail + coexistence settings,
 * provides draft editing state and save/reset actions.
 */
export function useProjectSettings(projectId?: string): UseProjectSettingsResult {
  const effectiveProjectId = projectId ?? PROJECT_ROOT;

  const status = useConnectionStore((s) => s.status);
  const isConnected = status === 'connected';

  // query: project detail (read-only fields)
  const detailResult = trpc.project.getDetail.useQuery(
    { projectId: effectiveProjectId },
    { enabled: isConnected && !!effectiveProjectId },
  );

  // query: coexistence settings (mode + enabled_features)
  const coexResult = trpc.coexistence.get.useQuery(
    { projectId: effectiveProjectId },
    { enabled: isConnected && !!effectiveProjectId },
  );

  // mutation: update project row fields
  const updateMutation = trpc.project.updateSettings.useMutation();

  // Build current settings from queries
  const isLoading = detailResult.isLoading || coexResult.isLoading;
  const error = (detailResult.error ?? coexResult.error) as Error | null;

  const row = detailResult.data;
  const coex = coexResult.data;

  // WHY: rules.review_mode and rules.commit_language are stored in project.json
  // (coexistence route reads rules.coexistence_mode and rules.enabled_features).
  // For M5 we fallback to 'single' / 'any' — full project.json read is M6 scope.
  const reviewMode: ReviewMode = 'single';
  const commitLanguage: CommitLanguage = 'any';

  const settings: ProjectSettings | null =
    row && coex
      ? buildSettings(row as Parameters<typeof buildSettings>[0], coex, reviewMode, commitLanguage)
      : null;

  const [draft, setDraftState] = useState<ProjectSettings | null>(null);

  // Sync draft from server state when it first loads or changes
  useEffect(() => {
    if (settings !== null && draft === null) {
      setDraftState(settings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings === null]);

  const isDirty =
    draft !== null &&
    settings !== null &&
    JSON.stringify(draft) !== JSON.stringify(settings);

  function setDraft(patch: Partial<ProjectSettings>): void {
    setDraftState((prev) => (prev ? { ...prev, ...patch } : null));
  }

  function save(): void {
    if (!draft) return;
    updateMutation.mutate({
      projectId: effectiveProjectId,
      name: draft.name,
      specPath: draft.specPath ?? undefined,
      maxDevelopers: draft.maxDevelopers,
      maxReviewers: draft.maxReviewers,
    });
  }

  function reset(): void {
    setDraftState(settings);
  }

  return {
    settings,
    draft,
    isLoading,
    error,
    isDirty,
    setDraft,
    save,
    reset,
  };
}
