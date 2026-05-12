/**
 * usePMSession — tRPC mutation hook for PM chat write operations.
 *
 * WHY: Centralises the three PM write mutations (start / say / resolvePermission)
 * so AppShell is a pure layout component and PM write logic lives in one place.
 * Replaces the fetch() stub handlers that lived directly in AppShell.tsx.
 *
 * Design SSoT: redesign/scenarios.js BACKEND INTEGRATION NOTES ⑬ PM CHAT block.
 * Daemon procedures: pmRouter.start / pmRouter.say / pmRouter.resolvePermission
 * (daemon/src/routes/pm.ts — stub implementations; real claude CLI spawn is
 * Phase 5 t17 follow-up).
 *
 * Principle §1 (SRP): this hook owns PM write mutations only; read state
 * comes from useScenario().pm via WS reducer.
 * Principle §4 (KISS): minimal wrapper — expose start/say/permission + isLoading.
 * Principle §9 (Fail fast): errors are swallowed at mutation level for now
 * (WS events drive UI state, not response bodies — consistent with prior stubs).
 */
import { trpc } from '../trpc/client';

export interface UsePMSessionResult {
  /** Launch a new PM session (POST /pm/start stub). */
  start: () => void;
  /** Send a user message to the PM (POST /pm/say { text }). */
  say: (text: string) => void;
  /**
   * Resolve a pending permission request.
   * Maps to pmRouter.resolvePermission({ reqId, allow }).
   */
  permission: (id: string, allow: boolean) => void;
  /** True while any PM mutation is in-flight. */
  isLoading: boolean;
}

/**
 * Provides mutation functions for PM chat write operations.
 * WS events (applyPmMessage / applyPmPermissionResolved reducers in
 * redesign/api/websocket.ts) drive UI state updates; these mutations
 * only send commands to the daemon.
 */
export function usePMSession(): UsePMSessionResult {
  const startMutation = trpc.pm.start.useMutation();
  const sayMutation = trpc.pm.say.useMutation();
  const permissionMutation = trpc.pm.resolvePermission.useMutation();

  function start(): void {
    startMutation.mutate(undefined);
  }

  function say(text: string): void {
    sayMutation.mutate({ text });
  }

  function permission(id: string, allow: boolean): void {
    permissionMutation.mutate({ reqId: id, allow });
  }

  return {
    start,
    say,
    permission,
    isLoading:
      startMutation.isPending ||
      sayMutation.isPending ||
      permissionMutation.isPending,
  };
}
