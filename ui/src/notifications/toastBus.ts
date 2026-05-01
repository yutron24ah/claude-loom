/**
 * toastBus — lightweight pub-sub for toast notifications.
 *
 * WHY: We need a decoupled channel so connection.ts (zustand store) can emit
 * toasts without importing React components, and ToastContainer can subscribe
 * without knowing about WS internals. A simple subscriber list is enough —
 * zustand would be overkill here (KISS + YAGNI).
 *
 * 5 event kinds defined in SCREEN_REQUIREMENTS §5.2.
 */

export type ToastKind = 'success' | 'info' | 'warning' | 'error';

export type ToastEvent =
  | 'daemon_disconnected'
  | 'daemon_reconnected'
  | 'consistency_finding_new'
  | 'subagent_failed'
  | 'project_added';

export interface Toast {
  /** Unique identifier — callers should provide a stable id (nanoid or Date.now()) */
  id: string;
  kind: ToastKind;
  event: ToastEvent;
  message: string;
  /** null = persistent (requires manual close). number = auto-dismiss after N ms. */
  ttl_ms: number | null;
}

type Handler = (toast: Toast) => void;

/** Internal subscriber registry. Module-level singleton is intentional (pub-sub bus). */
const handlers = new Set<Handler>();

export const toastBus = {
  /**
   * Emit a toast to all current subscribers.
   * If no subscribers are registered the toast is silently dropped
   * (fire-and-forget semantics, no buffering — YAGNI).
   */
  emit(toast: Toast): void {
    handlers.forEach((h) => h(toast));
  },

  /**
   * Subscribe to toast events.
   * Returns an unsubscribe function — callers MUST call it to prevent leaks.
   */
  subscribe(handler: Handler): () => void {
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
    };
  },
};

// ---------------------------------------------------------------------------
// 5-event helper functions (SCREEN_REQUIREMENTS §5.2)
// WHY: named helpers make call-sites readable and enforce the correct
//      kind/event/ttl_ms combination so callers cannot accidentally misconfigure.
// ---------------------------------------------------------------------------

/** Emit daemon_disconnected warning toast (persistent — user must close) */
export function emitDaemonDisconnected(message = 'デーモンから切断されました'): void {
  toastBus.emit({
    id: `daemon_disconnected-${Date.now()}`,
    kind: 'warning',
    event: 'daemon_disconnected',
    message,
    ttl_ms: null,
  });
}

/** Emit daemon_reconnected success toast (auto-dismiss 3 s) */
export function emitDaemonReconnected(message = 'デーモンに再接続しました'): void {
  toastBus.emit({
    id: `daemon_reconnected-${Date.now()}`,
    kind: 'success',
    event: 'daemon_reconnected',
    message,
    ttl_ms: 3000,
  });
}

/** Emit consistency_finding_new warning toast (persistent) */
export function emitConsistencyFindingNew(message = '整合性の問題が検出されました'): void {
  toastBus.emit({
    id: `consistency_finding_new-${Date.now()}`,
    kind: 'warning',
    event: 'consistency_finding_new',
    message,
    ttl_ms: null,
  });
}

/**
 * Emit subagent_failed error toast (persistent).
 * M2: export-only helper for test verification.
 * M3: wire to actual WS event subscription.
 */
export function emitSubagentFailed(message = 'サブエージェントが失敗しました'): void {
  toastBus.emit({
    id: `subagent_failed-${Date.now()}`,
    kind: 'error',
    event: 'subagent_failed',
    message,
    ttl_ms: null,
  });
}

/** Emit project_added info toast (auto-dismiss 5 s) */
export function emitProjectAdded(message = '新しいプロジェクトが検出されました'): void {
  toastBus.emit({
    id: `project_added-${Date.now()}`,
    kind: 'info',
    event: 'project_added',
    message,
    ttl_ms: 5000,
  });
}
