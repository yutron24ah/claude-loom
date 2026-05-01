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
 */
import { create } from 'zustand';
import { emitDaemonDisconnected, emitDaemonReconnected } from '../notifications/toastBus';

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
