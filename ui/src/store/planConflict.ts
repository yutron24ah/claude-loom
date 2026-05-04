/**
 * planConflict store — tracks PLAN.md vs DB conflict state.
 *
 * WHY: SPEC §3.6.9.2 β-3 conflict detection requires:
 *   1. Storing conflict metadata when plan.conflict event arrives
 *   2. Backing up unsaved user edits to localStorage before they are lost
 *   3. Restoring backup so users can recover edits after daemon overwrites
 *
 * localStorage key format: `claude-loom:plan-conflict-backup:<projectId>`
 * WHY: namespaced by projectId so multi-project setups don't collide.
 */
import { create } from 'zustand';

/** Conflict metadata broadcast by the daemon on LWW mtime mismatch. */
export interface PlanConflict {
  projectId: string;
  conflictType: 'file_vs_db';
  fileMtime: number;
  dbMtime: number;
  affectedItemIds: string[];
  detectedAt: number;
}

/** Partial plan item fields that may have changed and need backup. */
export type PartialPlanItem = {
  status?: string;
  title?: string;
  body?: string;
};

interface PlanConflictState {
  /** Non-null when a conflict has been detected and not yet resolved. */
  conflict: PlanConflict | null;
  /** Map of itemId → partial fields that were edited since the conflict was detected. */
  backupChanges: Record<string, PartialPlanItem>;
  /** Set the active conflict (called when plan.conflict WS event arrives). */
  setConflict: (conflict: PlanConflict) => void;
  /** Clear the conflict — called when user resolves or dismisses. */
  clearConflict: () => void;
  /**
   * Backup an in-progress edit to state and localStorage.
   * Requires conflict to be set (to know the projectId for the storage key).
   */
  backupChange: (itemId: string, partial: PartialPlanItem) => void;
  /**
   * Restore backup from localStorage into state for the given projectId.
   * Called on component mount or after reconnect to recover unsaved edits.
   */
  restoreBackup: (projectId: string) => void;
}

function localStorageKey(projectId: string): string {
  return `claude-loom:plan-conflict-backup:${projectId}`;
}

export const usePlanConflictStore = create<PlanConflictState>((set, get) => ({
  conflict: null,
  backupChanges: {},

  setConflict(conflict: PlanConflict): void {
    set({ conflict });
  },

  clearConflict(): void {
    set({ conflict: null });
  },

  backupChange(itemId: string, partial: PartialPlanItem): void {
    set((state) => {
      const updated = { ...state.backupChanges, [itemId]: { ...state.backupChanges[itemId], ...partial } };
      // Persist to localStorage if we know the project
      const projectId = state.conflict?.projectId;
      if (projectId) {
        try {
          localStorage.setItem(localStorageKey(projectId), JSON.stringify(updated));
        } catch {
          // WHY: localStorage may be unavailable (private mode / quota) — fail silently,
          // in-memory backup is still maintained.
        }
      }
      return { backupChanges: updated };
    });
  },

  restoreBackup(projectId: string): void {
    try {
      const raw = localStorage.getItem(localStorageKey(projectId));
      if (!raw) return;
      // TODO M3.2: zod validation on localStorage restore to guard against malformed/tampered data
      const parsed = JSON.parse(raw) as Record<string, PartialPlanItem>;
      set({ backupChanges: parsed });
    } catch {
      // WHY: malformed localStorage data should not crash the app — ignore.
    }
  },
}));
