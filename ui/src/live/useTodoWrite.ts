/**
 * useTodoWrite — live subscription hook that mirrors the current TodoWrite todo list.
 *
 * WHY: SCREEN_REQUIREMENTS §3.x — Plan View short-term pane should reflect the
 * active session's TodoWrite state in real-time. This hook subscribes to
 * trpc.events.onTodoChange and holds the latest todos in local state.
 *
 * Enabled gate: only subscribe when connection status is 'connected'.
 * Prevents wasted reconnect-storm subscriptions during daemon downtime.
 *
 * State semantics: each todo.change event REPLACES the previous todos list
 * (mirror, not append). The hook always holds the latest snapshot.
 *
 * M3.1 t1: initial implementation — subscribes to all sessions (no sessionId filter).
 * A future task can add a sessionId prop if per-session filtering is needed.
 */
import { useState } from 'react';
import { trpc } from '../trpc/client';
import { useConnectionStore } from '../store/connection';
import type { TodoChangeEvent } from '@claude-loom/daemon';

/** A single todo item mirrored from TodoWrite. */
export interface TodoItem {
  status: 'pending' | 'in_progress' | 'completed';
  text: string;
}

export interface UseTodoWriteResult {
  /** Current todo list — empty until first todo.change event arrives. */
  todos: TodoItem[];
  /** True only when subscription is connecting (always false in current impl). */
  isLoading: boolean;
}

/**
 * Subscribe to todo.change events and maintain the latest todos list.
 * Returns the current mirror of TodoWrite todos, or empty array if no event yet.
 */
export function useTodoWrite(): UseTodoWriteResult {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const status = useConnectionStore((s) => s.status);
  const isConnected = status === 'connected';

  trpc.events.onTodoChange.useSubscription(undefined, {
    enabled: isConnected,
    onData: (event: TodoChangeEvent) => {
      // Replace todos with the latest snapshot from the event payload
      setTodos(event.payload.todos as TodoItem[]);
    },
  });

  return {
    todos,
    isLoading: false,
  };
}
