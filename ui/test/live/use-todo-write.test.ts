/**
 * TDD tests for useTodoWrite hook (RED phase — written before implementation).
 *
 * WHY: The hook must:
 *   1. Subscribe to trpc.events.onTodoChange when the component mounts
 *   2. Initialize with empty todos array (no data before first event)
 *   3. Update todos state when a todo.change event arrives with new todos
 *   4. Replace todos (not append) on each new event — mirror the latest TodoWrite state
 *   5. Unsubscribe on unmount (cleanup, prevents memory leaks + HMR safe)
 *   6. NOT fire subscription when connection status is NOT 'connected'
 *   7. Re-subscribe when connection transitions to 'connected'
 *
 * We mock the tRPC client module entirely so no WS connection is needed.
 * Behavior under test: external state propagation from subscription events.
 * NOT testing implementation internals (no spy on useState, etc.)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConnectionStore } from '@/store/connection';

// ---------------------------------------------------------------------------
// Mock @/trpc/client — exposes trpc.events.onTodoChange.useSubscription
//
// WHY vi.hoisted: mock fn must exist before vi.mock factory runs.
// onTodoChange.useSubscription is the tRPC React hook for subscription.
// We capture the onData callback passed to it so we can simulate events.
// ---------------------------------------------------------------------------
type SubscriptionOptions = {
  onData?: (data: unknown) => void;
  onError?: (err: unknown) => void;
  enabled?: boolean;
};

const { mockUseSubscription, capturedCallArgs } = vi.hoisted(() => {
  // Track all calls: we need to inspect opts.enabled and call onData.
  // tRPC useSubscription signature: useSubscription(input, opts)
  // So we capture the second argument (opts) here.
  const callArgs: SubscriptionOptions[] = [];
  const fn = vi.fn((_input: unknown, opts: SubscriptionOptions) => {
    callArgs.push(opts);
  });
  return { mockUseSubscription: fn, capturedCallArgs: callArgs };
});

vi.mock('@/trpc/client', () => ({
  trpc: {
    events: {
      onTodoChange: {
        useSubscription: mockUseSubscription,
      },
    },
  },
  wsClient: {},
  trpcClient: {},
}));

// Import after mock is set up
import { useTodoWrite } from '@/live/useTodoWrite';

// ---------------------------------------------------------------------------
// Helper: TodoItem type (matches what the hook returns)
// ---------------------------------------------------------------------------
interface TodoItem {
  status: 'pending' | 'in_progress' | 'completed';
  text: string;
}

describe('useTodoWrite — subscription disabled when not connected', () => {
  beforeEach(() => {
    mockUseSubscription.mockClear();
    capturedCallArgs.length = 0;
    // Reset connection state to disconnected
    useConnectionStore.setState({ status: 'disconnected', attempts: 1 });
  });

  it('calls useSubscription with enabled: false when status is "disconnected"', () => {
    useConnectionStore.setState({ status: 'disconnected', attempts: 1 });
    renderHook(() => useTodoWrite());
    expect(mockUseSubscription).toHaveBeenCalledOnce();
    const opts = capturedCallArgs[0];
    expect(opts.enabled).toBe(false);
  });

  it('calls useSubscription with enabled: false when status is "connecting"', () => {
    useConnectionStore.setState({ status: 'connecting', attempts: 0 });
    renderHook(() => useTodoWrite());
    expect(mockUseSubscription).toHaveBeenCalledOnce();
    const opts = capturedCallArgs[0];
    expect(opts.enabled).toBe(false);
  });

  it('calls useSubscription with enabled: false when status is "reconnecting"', () => {
    useConnectionStore.setState({ status: 'reconnecting', attempts: 2 });
    renderHook(() => useTodoWrite());
    expect(mockUseSubscription).toHaveBeenCalledOnce();
    const opts = capturedCallArgs[0];
    expect(opts.enabled).toBe(false);
  });
});

describe('useTodoWrite — subscription enabled when connected', () => {
  beforeEach(() => {
    mockUseSubscription.mockClear();
    capturedCallArgs.length = 0;
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
  });

  it('calls useSubscription with enabled: true when status is "connected"', () => {
    renderHook(() => useTodoWrite());
    expect(mockUseSubscription).toHaveBeenCalledOnce();
    const opts = capturedCallArgs[0];
    expect(opts.enabled).toBe(true);
  });
});

describe('useTodoWrite — initial state', () => {
  beforeEach(() => {
    mockUseSubscription.mockClear();
    capturedCallArgs.length = 0;
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
  });

  it('returns empty todos array before any event arrives', () => {
    const { result } = renderHook(() => useTodoWrite());
    expect(result.current.todos).toEqual([]);
  });

  it('returns isLoading: false initially', () => {
    const { result } = renderHook(() => useTodoWrite());
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useTodoWrite — state propagation from subscription events', () => {
  beforeEach(() => {
    mockUseSubscription.mockClear();
    capturedCallArgs.length = 0;
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
  });

  it('updates todos when onData is called with a todo.change event', () => {
    const { result } = renderHook(() => useTodoWrite());

    const newTodos: TodoItem[] = [
      { status: 'in_progress', text: 'Write failing test' },
      { status: 'pending', text: 'Implement hook' },
    ];

    // Simulate receiving a todo.change event via the subscription
    act(() => {
      const opts = capturedCallArgs[capturedCallArgs.length - 1];
      opts.onData?.({
        type: 'todo.change',
        timestamp: Date.now(),
        payload: {
          sessionId: 'session-abc',
          todos: newTodos,
        },
      });
    });

    expect(result.current.todos).toEqual(newTodos);
  });

  it('replaces todos (not appends) when a second event arrives', () => {
    const { result } = renderHook(() => useTodoWrite());

    const firstTodos: TodoItem[] = [
      { status: 'in_progress', text: 'First task' },
    ];
    const secondTodos: TodoItem[] = [
      { status: 'completed', text: 'First task' },
      { status: 'in_progress', text: 'Second task' },
    ];

    act(() => {
      const opts = capturedCallArgs[capturedCallArgs.length - 1];
      opts.onData?.({
        type: 'todo.change',
        timestamp: Date.now(),
        payload: { sessionId: 'session-abc', todos: firstTodos },
      });
    });

    act(() => {
      const opts = capturedCallArgs[capturedCallArgs.length - 1];
      opts.onData?.({
        type: 'todo.change',
        timestamp: Date.now(),
        payload: { sessionId: 'session-abc', todos: secondTodos },
      });
    });

    // Must be exactly secondTodos — replaced, not appended
    expect(result.current.todos).toEqual(secondTodos);
    expect(result.current.todos).toHaveLength(2);
  });

  it('handles empty todos array in event payload (TodoWrite cleared)', () => {
    const { result } = renderHook(() => useTodoWrite());

    // First set some todos
    act(() => {
      const opts = capturedCallArgs[capturedCallArgs.length - 1];
      opts.onData?.({
        type: 'todo.change',
        timestamp: Date.now(),
        payload: {
          sessionId: 'session-abc',
          todos: [{ status: 'in_progress', text: 'Something' }],
        },
      });
    });

    // Then clear them
    act(() => {
      const opts = capturedCallArgs[capturedCallArgs.length - 1];
      opts.onData?.({
        type: 'todo.change',
        timestamp: Date.now(),
        payload: { sessionId: 'session-abc', todos: [] },
      });
    });

    expect(result.current.todos).toEqual([]);
  });

  it('returns todos with correct status values', () => {
    const { result } = renderHook(() => useTodoWrite());

    const todos: TodoItem[] = [
      { status: 'pending', text: 'Task A' },
      { status: 'in_progress', text: 'Task B' },
      { status: 'completed', text: 'Task C' },
    ];

    act(() => {
      const opts = capturedCallArgs[capturedCallArgs.length - 1];
      opts.onData?.({
        type: 'todo.change',
        timestamp: Date.now(),
        payload: { sessionId: 'session-xyz', todos },
      });
    });

    expect(result.current.todos[0].status).toBe('pending');
    expect(result.current.todos[1].status).toBe('in_progress');
    expect(result.current.todos[2].status).toBe('completed');
  });
});
