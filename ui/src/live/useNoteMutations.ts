/**
 * useNoteMutations — tRPC mutation + query wrapper hook for notes CRUD.
 *
 * WHY: Centralises note mutation logic (create / delete) so AgentDetailNotes
 * stays a pure rendering + interaction component (SRP).
 *
 * Attachment pattern: notes use generic attachedType/attachedId.
 * Agent notes use attachedType='subagent', plan_item notes use attachedType='plan_item'.
 * WHY: the notes table was designed with generic attachments (SPEC §6.2).
 * NOTE_ATTACHED_TYPE is imported from @claude-loom/daemon (SSoT) — not redefined here.
 * SPEC §3.6.10 + LOW 1 fix: ui imports constants from daemon package to avoid duplication.
 */
import { trpc } from '../trpc/client';
import type { Note } from '@claude-loom/daemon';
// WHY: NOTE_ATTACHED_TYPE primary SSoT lives in daemon/src/routes/note.ts,
// re-exported via daemon/src/index.ts. Importing here avoids ui-side duplicate definition.
import { NOTE_ATTACHED_TYPE } from '@claude-loom/daemon';
import type { NoteAttachedType } from '@claude-loom/daemon';

// Re-export so AgentDetailNotes.tsx can import from this hook file without
// depending on @claude-loom/daemon directly (single import path per consumer).
export { NOTE_ATTACHED_TYPE };
export type { NoteAttachedType };

export interface UseNoteListResult {
  data: Note[] | undefined;
  isLoading: boolean;
}

export interface UseNoteMutationsResult {
  createNote: (input: { attachedType: NoteAttachedType; attachedId: string; content: string }) => void;
  deleteNote: (input: { id: number }) => void;
  isCreatePending: boolean;
  isDeletePending: boolean;
}

/**
 * Provides mutation functions for notes CRUD.
 * All writes invalidate the note.list cache so consumers re-render fresh data.
 */
export function useNoteMutations(): UseNoteMutationsResult {
  const utils = trpc.useUtils();

  const createMutation = trpc.note.create.useMutation({
    onSuccess: () => {
      void utils.note.list.invalidate();
    },
  });

  const deleteMutation = trpc.note.delete.useMutation({
    onSuccess: () => {
      void utils.note.list.invalidate();
    },
  });

  function createNote(input: { attachedType: NoteAttachedType; attachedId: string; content: string }): void {
    createMutation.mutate(input);
  }

  function deleteNote(input: { id: number }): void {
    deleteMutation.mutate(input);
  }

  return {
    createNote,
    deleteNote,
    isCreatePending: createMutation.isPending,
    isDeletePending: deleteMutation.isPending,
  };
}
