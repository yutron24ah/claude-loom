/**
 * SessionListView — session list with filter + sort + live update.
 *
 * WHY: M3.2 t1. Allows users to inspect active/historical sessions,
 * filter by project and role, and sort by started_at.
 *
 * Delegates query/subscription/state to useSessionList hook.
 * This component is a pure render layer (SPEC §3.6 SRP principle).
 *
 * M0.11.4 Phase C t16: RPG style — rpg-frame wrapping, chip for metadata,
 * dot for status, rpg-title + rpg-label for headers.
 *
 * data-testid map:
 *   session-list             → outer container
 *   session-filter-project   → project filter <select>
 *   session-filter-role      → role filter <select>
 *   session-sort-toggle      → sort order toggle <button>
 *   session-list-loading     → loading indicator
 *   session-list-error       → error message
 *   session-list-empty       → empty state
 *   session-row              → one row per session
 *
 * SPEC §3.6.10: role values come from SESSION_ROLE_OPTIONS constant.
 * No raw string literals in filter/sort comparisons.
 */
import type { Session } from '@claude-loom/daemon';
import { useSessionList } from '../../live/useSessionList';

// ---------------------------------------------------------------------------
// Constants — SPEC §3.6.10: no raw string literals in comparisons
// ---------------------------------------------------------------------------

const SESSION_ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'pm', label: 'PM' },
  { value: 'dev_parent', label: 'Developer' },
] as const;

// WHY: typed map avoids raw string comparisons for dot variant (SPEC §3.6.10)
const STATUS_DOT_CLASS: Record<string, string> = {
  active: 'dot busy',
  idle:   'dot idle',
  ended:  'dot fail',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SessionRowProps {
  session: Session;
}

function SessionRow({ session }: SessionRowProps): JSX.Element {
  const startedAt = session.startedAt instanceof Date
    ? session.startedAt.toLocaleString()
    : new Date(Number(session.startedAt)).toLocaleString();

  const dotClass = STATUS_DOT_CLASS[session.status] ?? 'dot idle';

  return (
    <div
      data-testid="session-row"
      className="rpg-frame flex gap-sp-3 items-center"
    >
      {/* Status dot */}
      <span className={dotClass} title={session.status} />

      {/* Session ID */}
      <span className="rpg-label truncate flex-1 min-w-0" title={session.sessionId}>
        {session.sessionId}
      </span>

      {/* Project chip */}
      {session.projectId && (
        <span className="chip">{session.projectId}</span>
      )}

      {/* Role chip */}
      {session.role && (
        <span className="chip">{session.role}</span>
      )}

      {/* Started at */}
      <span className="rpg-label text-right" style={{ minWidth: '10ch' }}>
        {startedAt}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SessionListView(): JSX.Element {
  const {
    sessions,
    isLoading,
    error,
    projectFilter,
    roleFilter,
    sortOrder,
    setProjectFilter,
    setRoleFilter,
    toggleSortOrder,
  } = useSessionList();

  function handleProjectChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    setProjectFilter(e.target.value || null);
  }

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    setRoleFilter(e.target.value || null);
  }

  return (
    <div
      data-testid="session-list"
      className="rpg-frame flex flex-col gap-sp-3 w-full max-w-3xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-sp-2 flex-wrap">
        <span className="rpg-title">Sessions</span>
        <span className="rpg-label ml-auto">live</span>
      </div>

      {/* Controls: filter + sort */}
      <div className="flex gap-sp-2 flex-wrap items-center">
        {/* Project filter */}
        <select
          data-testid="session-filter-project"
          value={projectFilter ?? ''}
          onChange={handleProjectChange}
          className="bg-bg1 border border-border text-fg1 text-fs-xs px-sp-2 py-sp-1"
        >
          <option value="">All projects</option>
          <option value="claude-loom">claude-loom</option>
        </select>

        {/* Role filter */}
        <select
          data-testid="session-filter-role"
          value={roleFilter ?? ''}
          onChange={handleRoleChange}
          className="bg-bg1 border border-border text-fg1 text-fs-xs px-sp-2 py-sp-1"
        >
          {SESSION_ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Sort toggle */}
        <button
          data-testid="session-sort-toggle"
          onClick={toggleSortOrder}
          className="btn-px"
        >
          started_at {sortOrder}
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div data-testid="session-list-loading" className="rpg-label py-sp-3">
          読み込み中…
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div data-testid="session-list-error" className="text-error text-fs-sm py-sp-3">
          接続エラー: {error.message}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && sessions.length === 0 && (
        <div data-testid="session-list-empty" className="rpg-label py-sp-3">
          セッションがありません
        </div>
      )}

      {/* Session rows */}
      {!isLoading && !error && sessions.length > 0 && (
        <div className="flex flex-col gap-sp-2">
          {/* Column header */}
          <div className="flex gap-sp-3 items-center px-sp-2 pb-sp-1 border-b border-border">
            <span className="rpg-label flex-1">session_id</span>
            <span className="rpg-label">project</span>
            <span className="rpg-label">role</span>
            <span className="rpg-label">started_at</span>
          </div>
          {sessions.map((s) => (
            <SessionRow key={s.sessionId} session={s} />
          ))}
        </div>
      )}
    </div>
  );
}
