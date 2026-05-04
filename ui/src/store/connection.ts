/**
 * Connection store — WS connection status state machine.
 * WHY: centralises connection status so ConnectionBanner (Task 8) and
 * other consumers can subscribe without coupling to the tRPC wsLink internals.
 * Task 7 (tRPC client) will call handleOpen/handleClose/handleError from wsLink callbacks.
 *
 * State machine:
 *   connecting  →  connected         (handleOpen)
 *   connected   →  disconnected      (handleClose, first attempt)
 *   disconnected → reconnecting      (handleClose, subsequent attempts)
 *   *           →  reconnecting      (handleError)
 *   reconnecting → connected         (handleOpen, wasReconnecting path)
 *
 * Toast emissions (Task 8):
 *   handleClose → emitDaemonDisconnected (warning, persistent)
 *   handleOpen (wasReconnecting) → emitDaemonReconnected (success, 3s)
 *
 * M3.1 t3: exports usePlanConflictSubscription — subscribes to plan.conflict events
 * and wires them to the planConflict store + plan_conflict_detected toast.
 *
 * M4 t7: exports useConsistencyFindingSubscription — subscribes to finding.new events
 * and emits consistency_finding_new toast.
 * M4 t7: exports useSpecChangeSubscription — subscribes to spec_change_detected events
 * and emits spec_change_detected toast (SPEC §7.5 Step 3 badge).
 */
import { create } from 'zustand';
import {
  emitDaemonDisconnected,
  emitDaemonReconnected,
  emitPlanConflictDetected,
  emitConsistencyFindingNew,
  emitSpecChangeDetected,
} from '../notifications/toastBus';
import { trpc } from '../trpc/client';
import { usePlanConflictStore } from './planConflict';
import type { PlanConflictEvent, FindingNewEvent, SpecChangeDetectedEvent } from '@claude-loom/daemon';

export type Status = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface ConnectionState {
  status: Status;
  attempts: number;
  handleOpen: () => void;
  handleClose: () => void;
  handleError: (err: unknown) => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  status: 'connecting',
  attempts: 0,

  handleOpen: () => {
    const { status } = get();
    const wasReconnecting = status === 'reconnecting';

    set({ status: 'connected', attempts: 0 });

    if (wasReconnecting) {
      // WHY: only emit reconnected toast on reconnect, not on the first connect
      emitDaemonReconnected();
    }
  },

  handleClose: () => {
    set((state) => {
      const nextAttempts = state.attempts + 1;
      // WHY: first close → disconnected (no prior reconnect cycle),
      //      subsequent closes → reconnecting (exponential backoff in progress)
      const nextStatus: Status = nextAttempts === 1 ? 'disconnected' : 'reconnecting';
      return { status: nextStatus, attempts: nextAttempts };
    });
    // WHY: emit after state update so subscribers see current status.
    //      daemon_disconnected is always emitted on any close event.
    emitDaemonDisconnected();
  },

  handleError: (_err: unknown) => {
    set({ status: 'reconnecting' });
    // WHY: error path also counts as a disconnect — user needs to know
    emitDaemonDisconnected();
  },
}));

/**
 * usePlanConflictSubscription — tRPC subscription hook for plan.conflict events.
 *
 * WHY: separated from useConnectionStore (the state machine) because React hooks
 * cannot live inside a zustand create() call. This hook is meant to be mounted
 * once in the app tree (e.g. AppShell) when the WS connection is active.
 *
 * On each plan.conflict event:
 *   1. calls planConflictStore.setConflict() with the payload
 *   2. emits plan_conflict_detected toast (persistent warning)
 *
 * M3.1 t3: initial implementation — no projectId filter (subscribes to all projects).
 */
export function usePlanConflictSubscription(): void {
  const status = useConnectionStore((s) => s.status);
  const isConnected = status === 'connected';

  trpc.events.onPlanConflict.useSubscription(undefined, {
    enabled: isConnected,
    onData: (event: PlanConflictEvent) => {
      const { setConflict } = usePlanConflictStore.getState();
      setConflict({
        projectId: event.payload.projectId,
        conflictType: event.payload.conflictType,
        fileMtime: event.payload.fileMtime,
        dbMtime: event.payload.dbMtime,
        affectedItemIds: event.payload.affectedItemIds,
        detectedAt: event.timestamp,
      });
      emitPlanConflictDetected();
    },
  });
}

/**
 * useConsistencyFindingSubscription — tRPC subscription hook for finding.new events.
 *
 * WHY: M4 t7 SPEC §7.5 Step 5 — after Phase A analysis emits findings via broadcaster,
 * the UI needs to display them. Mounted once in the app tree when WS is active.
 * Emits consistency_finding_new toast so user is notified of new findings.
 */
export function useConsistencyFindingSubscription(): void {
  const status = useConnectionStore((s) => s.status);
  const isConnected = status === 'connected';

  trpc.events.onFindingNew.useSubscription(undefined, {
    enabled: isConnected,
    onData: (_event: FindingNewEvent) => {
      emitConsistencyFindingNew();
    },
  });
}

/**
 * useSpecChangeSubscription — tRPC subscription hook for spec_change_detected events.
 *
 * WHY: M4 t7 SPEC §7.5 Step 3 badge — emitted immediately after spec_changes INSERT
 * in ingest.ts. The hook delivers the WS push to the frontend badge display.
 * Persistent toast because user must acknowledge the spec change.
 */
export function useSpecChangeSubscription(): void {
  const status = useConnectionStore((s) => s.status);
  const isConnected = status === 'connected';

  trpc.consistency.subscribeSpecChanges.useSubscription(undefined, {
    enabled: isConnected,
    onData: (_event: SpecChangeDetectedEvent) => {
      emitSpecChangeDetected();
    },
  });
}
