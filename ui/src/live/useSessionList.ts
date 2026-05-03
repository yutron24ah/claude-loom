/**
 * useSessionList — live tRPC query + subscription hook for sessions.
 *
 * WHY: M3.2 t1. Centralises session list query + filter/sort state so
 * SessionListView stays a pure rendering component.
 *
 * Filter semantics:
 *   - projectFilter: null = show all projects
 *   - roleFilter: null = show all roles ('pm' | 'dev_parent' | null-role sessions)
 *
 * Sort semantics:
 *   - sortOrder 'desc' = newest first (default)
 *   - sortOrder 'asc' = oldest first
 *
 * Live update: subscribes to trpc.session.subscribe; on any session.change
 * event, invalidates the query to trigger a refetch. This keeps the list
 * up-to-date without full page reload.
 *
 * SPEC §3.6.10: filter/sort values are never raw string literals in logic —
 * sortOrder uses the SortOrder type ('asc' | 'desc').
 *
 * enabled gate: only fire query/subscription when WS connection is 'connected'.
 */
import { useState } from 'react';
import { trpc } from '../trpc/client';
import { useConnectionStore } from '../store/connection';
import type { Session, SessionChangeEvent } from '@claude-loom/daemon';

// ---------------------------------------------------------------------------
// Types — SPEC §3.6.10: enum-like type for sort order
// ---------------------------------------------------------------------------

export type SortOrder = 'asc' | 'desc';

export interface UseSessionListResult {
  sessions: Session[];
  isLoading: boolean;
  error: Error | null;
  projectFilter: string | null;
  roleFilter: string | null;
  sortOrder: SortOrder;
  setProjectFilter: (v: string | null) => void;
  setRoleFilter: (v: string | null) => void;
  toggleSortOrder: () => void;
}

// WHY: fixed to 'claude-loom' for M3; M5 will resolve from project.json / env
const PROJECT_ID = 'claude-loom';

/**
 * Query session list from daemon and subscribe to live session change events.
 * Exposes filter and sort controls as part of the returned interface.
 */
export function useSessionList(): UseSessionListResult {
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const status = useConnectionStore((s) => s.status);
  const isConnected = status === 'connected';

  const utils = trpc.useUtils();

  const result = trpc.session.list.useQuery(
    { projectId: PROJECT_ID },
    { enabled: isConnected },
  );

  // Subscribe to session.change events and invalidate query on change
  trpc.session.subscribe.useSubscription(undefined, {
    enabled: isConnected,
    onData: (_event: SessionChangeEvent) => {
      // WHY: invalidate triggers a refetch so the list is always current
      // without the hook needing to know the event details.
      void utils.session.list.invalidate();
    },
  });

  // Apply client-side filter and sort on top of the raw query data
  const allSessions: Session[] = result.data ?? [];

  const filtered = allSessions.filter((s) => {
    if (projectFilter !== null && s.projectId !== projectFilter) return false;
    if (roleFilter !== null && s.role !== roleFilter) return false;
    return true;
  });

  // Sort by startedAt using the SortOrder type (never raw string comparison)
  const sorted = [...filtered].sort((a, b) => {
    const aMs = a.startedAt instanceof Date ? a.startedAt.getTime() : Number(a.startedAt);
    const bMs = b.startedAt instanceof Date ? b.startedAt.getTime() : Number(b.startedAt);
    return sortOrder === 'desc' ? bMs - aMs : aMs - bMs;
  });

  function toggleSortOrder(): void {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  }

  return {
    sessions: sorted,
    isLoading: result.isLoading,
    error: result.error as Error | null,
    projectFilter,
    roleFilter,
    sortOrder,
    setProjectFilter,
    setRoleFilter,
    toggleSortOrder,
  };
}
