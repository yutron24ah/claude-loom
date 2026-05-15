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
import '../../styles/screens/agent-detail.css';

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
    <div data-testid="agent-notes-section" className="adn-section">
      {/* Section header */}
      <div className="adn-header">
        <div className="adn-header__label">NOTES</div>
        <button
          data-testid="agent-note-add-button"
          onClick={() => setShowForm(true)}
          className="adn-add-btn"
        >
          +
        </button>
      </div>

      {/* Inline add form */}
      {showForm && (
        <div className="adn-form">
          <textarea
            data-testid="agent-note-textarea"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            className="adn-textarea"
            placeholder="note..."
          />
          <div className="adn-form-actions">
            <button
              data-testid="agent-note-save-button"
              onClick={handleSave}
              disabled={isCreatePending}
              className="adn-save-btn"
            >
              save
            </button>
            <button
              data-testid="agent-note-cancel-button"
              onClick={handleCancel}
              className="adn-cancel-btn"
            >
              cancel
            </button>
          </div>
        </div>
      )}

      {/* Notes list — time-ascending */}
      {isLoading && <div className="adn-loading">loading...</div>}
      {sortedNotes.map((note) => (
        <div key={note.id} data-testid="agent-note-item" className="adn-note-item">
          <span className="adn-note-item__text">{note.content}</span>
          <button
            data-testid={`agent-note-delete-${note.id}`}
            onClick={() => deleteNote({ id: note.id })}
            className="adn-note-item__delete"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
