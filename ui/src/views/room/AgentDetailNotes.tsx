/**
 * AgentDetailNotes — notes section sub-component for AgentDetailPanel.
 *
 * WHY: extracted as a separate file to avoid file-level conflicts with
 * M3.2 t2 (dispatch history + attention toggle) which also touches
 * AgentDetailPanel.tsx. Physical separation prevents merge conflicts.
 *
 * Attachment: uses attachedType='subagent' + attachedId=agentId per
 * the generic notes table design (SPEC §6.2). The NOTE_ATTACHED_TYPE
 * constant is used to avoid raw string literals (SPEC §3.6.10).
 *
 * SRP: note mutations (create/delete) are delegated to useNoteMutations hook.
 * AgentDetailNotes owns rendering + interaction state only.
 */
import React, { useState } from 'react';
import { trpc } from '../../trpc/client';
import { NOTE_ATTACHED_TYPE, useNoteMutations } from '../../live/useNoteMutations';

// WHY: M5 で env-var 化予定。既存の useSessionList.ts / usePlanItems.ts と同じ pattern
const PROJECT_ID = 'claude-loom';

export interface AgentDetailNotesProps {
  agentId: string;
}

/**
 * Notes section for an agent — add / list / delete notes.
 * Inline form toggle: "+" button opens textarea, save/cancel close it.
 */
export function AgentDetailNotes({ agentId }: AgentDetailNotesProps): JSX.Element {
  const [showForm, setShowForm] = useState(false);
  const [noteText, setNoteText] = useState('');

  const { data: notes, isLoading } = trpc.note.list.useQuery({
    projectId: PROJECT_ID,
    attachedType: NOTE_ATTACHED_TYPE.SUBAGENT,
    attachedId: agentId,
  });

  // WHY: mutations delegated to hook (SRP — this component owns UI state only)
  const { createNote, deleteNote, isCreatePending } = useNoteMutations();

  function handleSave(): void {
    if (noteText.trim() === '') return;
    createNote({
      attachedType: NOTE_ATTACHED_TYPE.SUBAGENT,
      attachedId: agentId,
      content: noteText.trim(),
    });
    setNoteText('');
    setShowForm(false);
  }

  function handleCancel(): void {
    setNoteText('');
    setShowForm(false);
  }

  const sortedNotes = notes
    ? [...notes].sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
        return aTime - bTime;
      })
    : [];

  return (
    <div
      data-testid="agent-notes-section"
      style={{ marginTop: 14 }}
    >
      {/* Section header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 4,
      }}>
        <div style={{
          fontSize: 9, letterSpacing: '0.06em',
          color: 'var(--p-text-muted, #64748b)', textTransform: 'uppercase',
        }}>
          NOTES
        </div>
        <button
          data-testid="agent-note-add-button"
          onClick={() => setShowForm(true)}
          style={{
            all: 'unset', cursor: 'pointer',
            fontSize: 9, padding: '1px 5px',
            background: 'var(--p-tint, #e8e0d0)',
            border: '1px solid var(--p-border, #2a2a35)',
            color: 'var(--p-text, #1a1a2e)',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          +
        </button>
      </div>

      {/* Inline add form */}
      {showForm && (
        <div style={{ marginBottom: 6 }}>
          <textarea
            data-testid="agent-note-textarea"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            style={{
              width: '100%', fontSize: 10,
              fontFamily: 'ui-monospace, monospace',
              background: 'var(--p-tint, #e8e0d0)',
              border: '1px solid var(--p-border, #2a2a35)',
              color: 'var(--p-text, #1a1a2e)',
              padding: 4, boxSizing: 'border-box', resize: 'vertical',
            }}
            placeholder="note..."
          />
          <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
            <button
              data-testid="agent-note-save-button"
              onClick={handleSave}
              disabled={isCreatePending}
              style={{
                all: 'unset', cursor: 'pointer',
                fontSize: 9, padding: '2px 6px',
                background: 'var(--p-accent, #6366f1)',
                border: '1px solid var(--p-border, #2a2a35)',
                color: 'white',
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 700,
              }}
            >
              save
            </button>
            <button
              data-testid="agent-note-cancel-button"
              onClick={handleCancel}
              style={{
                all: 'unset', cursor: 'pointer',
                fontSize: 9, padding: '2px 6px',
                background: 'transparent',
                border: '1px solid var(--p-border, #2a2a35)',
                color: 'var(--p-text, #1a1a2e)',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              cancel
            </button>
          </div>
        </div>
      )}

      {/* Notes list — time-ascending */}
      {isLoading && (
        <div style={{ fontSize: 9, color: 'var(--p-text-muted, #64748b)' }}>loading...</div>
      )}
      {sortedNotes.map((note) => (
        <div
          key={note.id}
          data-testid="agent-note-item"
          style={{
            display: 'flex', gap: 4, alignItems: 'flex-start',
            padding: '3px 0', borderBottom: '1px solid var(--p-tint, #e8e0d0)',
          }}
        >
          <span
            style={{
              flex: 1, fontSize: 10,
              color: 'var(--p-text, #1a1a2e)',
              wordBreak: 'break-word',
            }}
          >
            {note.content}
          </span>
          <button
            data-testid={`agent-note-delete-${note.id}`}
            onClick={() => deleteNote({ id: note.id })}
            style={{
              all: 'unset', cursor: 'pointer',
              fontSize: 8, padding: '0 3px',
              color: 'var(--p-text-muted, #64748b)',
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
