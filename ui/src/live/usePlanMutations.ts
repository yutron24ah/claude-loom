/**
 * usePlanMutations — tRPC mutation wrapper hook for plan_items.
 *
 * WHY: Centralises plan mutation logic (upsert / updateStatus / delete) so
 * PlanView stays a pure rendering + interaction component (SRP).
 *
 * Debounce strategy: inline edit blur → debounceUpsert waits 500ms before
 * calling the tRPC mutation. This collapses rapid edits into a single
 * write-back without requiring an external debounce library (YAGNI / KISS).
 * We use a plain setTimeout ref rather than `use-debounce` package.
 *
 * Cache invalidation: both upsert and updateStatus call
 * utils.plan.list.invalidate() after success so the live query refetches.
 *
 * projectId: fixed to 'claude-loom' for M3.1 — same as usePlanItems.ts.
 * M5 polish will read from project config (tracked separately).
 */
import { useRef } from 'react';
import { trpc } from '../trpc/client';
import type { PlanItem } from '@claude-loom/daemon';

// WHY: fixed for M3.1; M5 will resolve from project.json / env
const PROJECT_ID = 'claude-loom';

/** Input for creating or updating a plan item via upsertItem. */
export interface UpsertItemInput {
  id?: number;
  title: string;
  status: PlanItem['status'];
  position: number;
  parentId?: number | null;
  body?: string | null;
  sourcePath?: string | null;
}

export interface UsePlanMutationsResult {
  /** Create or update a plan item. Debounced 500ms on repeated calls with same id. */
  upsertItem: (input: UpsertItemInput) => void;
  /** Update only the status of a plan item (immediate, no debounce). */
  updateItemStatus: (input: { id: number; status: PlanItem['status'] }) => void;
  /** Delete a plan item by id. */
  deleteItem: (input: { id: number }) => void;
  /** True while an upsert mutation is in-flight. */
  isUpsertPending: boolean;
  /** True while an updateStatus mutation is in-flight. */
  isUpdateStatusPending: boolean;
}

/**
 * Provides mutation functions for plan_items CRUD.
 * All writes invalidate the plan.list cache so PlanView re-renders fresh data.
 */
export function usePlanMutations(): UsePlanMutationsResult {
  const utils = trpc.useUtils();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const upsertMutation = trpc.plan.upsert.useMutation({
    onSuccess: () => {
      void utils.plan.list.invalidate({ projectId: PROJECT_ID });
    },
  });

  const updateStatusMutation = trpc.plan.updateStatus.useMutation({
    onSuccess: () => {
      void utils.plan.list.invalidate({ projectId: PROJECT_ID });
    },
  });

  const deleteMutation = trpc.plan.delete.useMutation({
    onSuccess: () => {
      void utils.plan.list.invalidate({ projectId: PROJECT_ID });
    },
  });

  /**
   * Debounced upsert: clears any pending timer, then fires after 500ms.
   * WHY: inline title edits can fire many times per keystroke; we only
   * want to write-back once the user has paused (Principle of Least Surprise).
   */
  function upsertItem(input: UpsertItemInput): void {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      upsertMutation.mutate({
        projectId: PROJECT_ID,
        source: 'ui',
        title: input.title,
        status: input.status,
        position: input.position,
        parentId: input.parentId ?? null,
        body: input.body ?? null,
        sourcePath: input.sourcePath ?? null,
        ...(input.id !== undefined ? { id: input.id } : {}),
      });
    }, 500);
  }

  function updateItemStatus(input: { id: number; status: PlanItem['status'] }): void {
    updateStatusMutation.mutate(input);
  }

  function deleteItem(input: { id: number }): void {
    deleteMutation.mutate(input);
  }

  return {
    upsertItem,
    updateItemStatus,
    deleteItem,
    isUpsertPending: upsertMutation.isPending,
    isUpdateStatusPending: updateStatusMutation.isPending,
  };
}
