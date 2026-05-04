/**
 * SessionListView — session list with filter + sort + live update.
 *
 * WHY: M3.2 t1. Allows users to inspect active/historical sessions,
 * filter by project and role, and sort by started_at.
 *
 * Delegates query/subscription/state to useSessionList hook.
 * This component is a pure render layer (SPEC §3.6 SRP principle).
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

  const statusColor: Record<string, string> = {
    active: 'text-success',
    idle: 'text-fg2',
    ended: 'text-text-muted',
  };

  return (
    <div
      data-testid="session-row"
      className="bg-bg1 border border-border p-sp-2 flex gap-sp-3 items-center font-mono text-fs-xs"
    >
      {/* Session ID */}
      <span className="text-fg1 truncate flex-1 min-w-0" title={session.sessionId}>
        {session.sessionId}
      </span>

      {/* Project */}
      <span className="text-fg2 w-32 truncate" title={session.projectId ?? '—'}>
        {session.projectId ?? '—'}
      </span>

      {/* Role */}
      <span className="text-fg2 w-24">
        {session.role ?? '—'}
      </span>

      {/* Status */}
      <span className={`w-16 ${statusColor[session.status] ?? 'text-fg2'}`}>
        {session.status}
      </span>

      {/* Started at */}
      <span className="text-text-muted w-40 text-right">
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
      className="bg-bg2 rounded-card p-sp-4 flex flex-col gap-sp-3 w-full max-w-3xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-sp-2 flex-wrap">
        <span className="text-fs-md font-bold text-fg1">Sessions</span>
        <span className="ml-auto text-fs-xs text-text-muted font-mono">
          live
        </span>
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
          className="bg-bg1 border border-border text-fg1 text-fs-xs px-sp-2 py-sp-1 hover:bg-bg3"
        >
          started_at {sortOrder}
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div data-testid="session-list-loading" className="text-fg2 text-fs-sm py-sp-3">
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
        <div data-testid="session-list-empty" className="text-text-muted text-fs-sm py-sp-3">
          セッションがありません
        </div>
      )}

      {/* Session rows */}
      {!isLoading && !error && sessions.length > 0 && (
        <div className="flex flex-col gap-sp-1">
          {/* Column header */}
          <div className="flex gap-sp-3 items-center font-mono text-fs-xs text-text-muted px-sp-2 pb-sp-1 border-b border-border">
            <span className="flex-1">session_id</span>
            <span className="w-32">project</span>
            <span className="w-24">role</span>
            <span className="w-16">status</span>
            <span className="w-40 text-right">started_at</span>
          </div>
          {sessions.map((s) => (
            <SessionRow key={s.sessionId} session={s} />
          ))}
        </div>
      )}
    </div>
  );
}
