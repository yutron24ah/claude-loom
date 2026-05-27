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
  | 'project_added'
  | 'plan_conflict_detected'
  | 'spec_change_detected'
  | 'approval_not_found'
  | 'discipline_violation_critical'
  | 'worktree_lock_warning'
  | 'retro_stage_complete';

/** Action that can be attached to a toast for user interaction. */
export type ToastAction = 'retry';

export interface Toast {
  /**
   * Identifier used for ToastContainer dedup (REQ-060).
   *   - state-style toasts (singleton state, e.g. daemon connection) MUST use a
   *     stable constant id (e.g. 'daemon_disconnected'); successive emits with
   *     the same id replace the existing entry instead of stacking.
   *   - occurrence-style toasts (countable events, e.g. a finding, a failed
   *     subagent, a new project) use a per-call unique id (Date.now()-based or
   *     nanoid) so each occurrence renders its own entry.
   */
  id: string;
  kind: ToastKind;
  event: ToastEvent;
  message: string;
  /** null = persistent (requires manual close). number = auto-dismiss after N ms. */
  ttl_ms: number | null;
  /**
   * Optional action attached to the toast.
   * 'retry' — caller provides a retry callback via ToastContainer or
   * the emitter stores the retry fn separately (decoupled design).
   * WHY: toastBus is a fire-and-forget channel; the retry mechanism
   * lives in useApprovalMutations (SRP). action field signals intent only.
   * REQ-160: approval_not_found toast uses action='retry'.
   */
  action?: ToastAction;
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
//
// TODO(REQ-060 follow-up): the 5 occurrence-style emitters below all use the
// `${event}-${Date.now()}` id template; if any becomes a hotspot for high-rate
// emits we should extract a shared `occurrenceId(event)` helper (and consider
// nanoid to defeat same-ms collisions). YAGNI today — none of the 5 events
// fires faster than user-perceptible cadence.
// ---------------------------------------------------------------------------

/**
 * Emit daemon_disconnected warning toast (persistent — user must close).
 * REQ-060: stable id so successive emits during WS exponential backoff
 * dedup at ToastContainer level instead of piling up.
 */
export function emitDaemonDisconnected(message = 'デーモンから切断されました'): void {
  toastBus.emit({
    id: 'daemon_disconnected',
    kind: 'warning',
    event: 'daemon_disconnected',
    message,
    ttl_ms: null,
  });
}

/**
 * Emit daemon_reconnected success toast (auto-dismiss 3 s).
 * REQ-060: stable id so a second reconnect doesn't double up if the user is
 * mid-network-flap.
 */
export function emitDaemonReconnected(message = 'デーモンに再接続しました'): void {
  toastBus.emit({
    id: 'daemon_reconnected',
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

/**
 * Emit plan_conflict_detected warning toast (persistent — user must resolve).
 * WHY: SPEC §3.6.9.4 toast 6 event — emitted when chokidar detects an external
 * PLAN.md edit that is older than the DB state (LWW conflict).
 */
export function emitPlanConflictDetected(message = 'PLAN.md の競合が検出されました'): void {
  toastBus.emit({
    id: `plan_conflict_detected-${Date.now()}`,
    kind: 'warning',
    event: 'plan_conflict_detected',
    message,
    ttl_ms: null,
  });
}

/**
 * Emit spec_change_detected warning toast (persistent — user must acknowledge).
 * WHY: SPEC §7.5 Step 3 badge — emitted when a SPEC file edit is detected
 * and spec_changes row is inserted, before Phase A analysis begins.
 * Persistent because user needs to be aware the spec changed.
 */
export function emitSpecChangeDetected(message = 'SPEC 変更が検知されました'): void {
  toastBus.emit({
    id: `spec_change_detected-${Date.now()}`,
    kind: 'warning',
    event: 'spec_change_detected',
    message,
    ttl_ms: null,
  });
}

/**
 * Emit approval_not_found error toast (persistent — user must retry or close).
 * REQ-160: approval.decide NOT_FOUND handler calls this with action='retry'.
 * WHY: occurrence-style per-call id (Date.now()) so multiple back-to-back
 * NOT_FOUND events each get their own toast entry (countable occurrences).
 * The retry mechanism lives in useApprovalMutations (SRP); action='retry'
 * signals to ToastContainer that a retry action button is expected.
 */
export function emitApprovalNotFound(
  message = 'approval event が見つかりません (期限切れ?)',
): void {
  toastBus.emit({
    id: `approval_not_found-${Date.now()}`,
    kind: 'error',
    event: 'approval_not_found',
    message,
    ttl_ms: null,
    action: 'retry',
  });
}

/**
 * Emit discipline_violation_critical error toast (persistent).
 * WHY: TDD rule violation or SPEC-bypass detected. Persistent because
 * the user must explicitly acknowledge the violation before continuing.
 * MS-TOAST-DISC-01: U-layer helper for discipline violation toast.
 */
export function emitDisciplineViolation(
  message = 'TDD 規律違反が検出されました',
): void {
  toastBus.emit({
    id: `discipline_violation_critical-${Date.now()}`,
    kind: 'error',
    event: 'discipline_violation_critical',
    message,
    ttl_ms: null,
  });
}

/**
 * Emit worktree_lock_warning warning toast (persistent — user must acknowledge).
 * WHY: A write was attempted on a locked worktree. The user must resolve the
 * lock before proceeding. Persistent to ensure the warning is seen.
 * MS-TOAST-WT-LOCK-01: U-layer helper for worktree lock toast.
 */
export function emitWorktreeLockWarning(
  message = 'Worktree はロック中です。書き込みをブロックしました。',
): void {
  toastBus.emit({
    id: `worktree_lock_warning-${Date.now()}`,
    kind: 'warning',
    event: 'worktree_lock_warning',
    message,
    ttl_ms: null,
  });
}

/**
 * Emit retro_stage_complete info toast (auto-dismiss 5 s).
 * WHY: Retro Stage 1/2/3 completion is a background event that the user
 * should be aware of. Auto-dismiss keeps it non-blocking.
 * MS-TOAST-RETRO-STAGE-01: U-layer helper for retro stage completion.
 */
export function emitRetroStageComplete(
  message = 'Retro stage が完了しました',
): void {
  toastBus.emit({
    id: `retro_stage_complete-${Date.now()}`,
    kind: 'info',
    event: 'retro_stage_complete',
    message,
    ttl_ms: 5000,
  });
}
