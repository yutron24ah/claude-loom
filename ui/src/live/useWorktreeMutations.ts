/**
 * useWorktreeMutations — tRPC mutation wrapper hook for git worktree management.
 *
 * WHY: Centralises create / destroy / lock / unlock write logic so WorktreeView
 * stays a pure rendering component (SRP). Follows usePlanMutations.ts pattern.
 *
 * Write API per redesign/scenarios.js ⑥ WORKTREE:
 *   POST /worktree { branch, use }       → trpc.worktree.create
 *   DELETE /worktree/:branch             → trpc.worktree.remove
 *   POST /worktree/:branch/lock          → trpc.worktree.lock
 *   DELETE /worktree/:branch/lock (unlock) → trpc.worktree.unlock
 *
 * projectId: fixed to 'claude-loom' for M0.15 — same as other live hooks.
 *
 * M0.15 t16: initial implementation.
 * REQ-077
 */
import { trpc } from '../trpc/client';

// WHY: fixed for M0.15; M6 will resolve from project context
const PROJECT_ID = 'claude-loom';

export interface CreateWorktreeInput {
  branch: string;
  basePath?: string;
}

export interface DestroyWorktreeInput {
  /** Full path of the worktree to remove. */
  path: string;
}

export interface LockWorktreeInput {
  /** Full path of the worktree to lock. */
  path: string;
  /** Logical branch name (for UI feedback). */
  branch: string;
  reason?: string;
}

export interface UnlockWorktreeInput {
  /** Full path of the worktree to unlock. */
  path: string;
  /** Logical branch name (for UI feedback). */
  branch: string;
}

export interface UseWorktreeMutationsResult {
  createWorktree: (input: CreateWorktreeInput) => void;
  destroyWorktree: (input: DestroyWorktreeInput) => void;
  lockWorktree: (input: LockWorktreeInput) => void;
  unlockWorktree: (input: UnlockWorktreeInput) => void;
  isCreatePending: boolean;
  isDestroyPending: boolean;
  isLockPending: boolean;
  isUnlockPending: boolean;
}

/**
 * Provides mutation functions for git worktree CRUD + lock operations.
 * All writes invalidate the worktree.list cache so WorktreeView re-renders.
 */
export function useWorktreeMutations(): UseWorktreeMutationsResult {
  const utils = trpc.useUtils();

  const invalidate = (): void => {
    void utils.worktree.list.invalidate({ projectId: PROJECT_ID });
  };

  const createMutation = trpc.worktree.create.useMutation({ onSuccess: invalidate });
  const removeMutation = trpc.worktree.remove.useMutation({ onSuccess: invalidate });
  const lockMutation = trpc.worktree.lock.useMutation({ onSuccess: invalidate });
  const unlockMutation = trpc.worktree.unlock.useMutation({ onSuccess: invalidate });

  function createWorktree(input: CreateWorktreeInput): void {
    createMutation.mutate({
      projectId: PROJECT_ID,
      branch: input.branch,
      ...(input.basePath ? { basePath: input.basePath } : {}),
    });
  }

  function destroyWorktree(input: DestroyWorktreeInput): void {
    removeMutation.mutate({ projectId: PROJECT_ID, path: input.path });
  }

  function lockWorktree(input: LockWorktreeInput): void {
    lockMutation.mutate({
      projectId: PROJECT_ID,
      path: input.path,
      ...(input.reason ? { reason: input.reason } : {}),
    });
  }

  function unlockWorktree(input: UnlockWorktreeInput): void {
    unlockMutation.mutate({ projectId: PROJECT_ID, path: input.path });
  }

  return {
    createWorktree,
    destroyWorktree,
    lockWorktree,
    unlockWorktree,
    isCreatePending: createMutation.isPending,
    isDestroyPending: removeMutation.isPending,
    isLockPending: lockMutation.isPending,
    isUnlockPending: unlockMutation.isPending,
  };
}
