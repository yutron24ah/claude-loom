/**
 * Connection store — WS connection status state machine.
 * WHY: centralises connection status so ConnectionBanner (Task 8) and
 * other consumers can subscribe without coupling to the tRPC wsLink internals.
 * Task 7 (tRPC client) will call handleOpen/handleClose/handleError from wsLink callbacks.
 * Task 8 will implement the actual toast emissions (see TODO markers below).
 *
 * State machine:
 *   connecting  →  connected         (handleOpen)
 *   connected   →  disconnected      (handleClose, first attempt)
 *   disconnected → reconnecting      (handleClose, subsequent attempts)
 *   *           →  reconnecting      (handleError)
 *   reconnecting → connected         (handleOpen, wasReconnecting path)
 */
import { create } from 'zustand';

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
      // TODO Task 8: emit toast — daemon_reconnected (success, 3s)
    }
  },

  handleClose: () => {
    set((state) => {
      const nextAttempts = state.attempts + 1;
      // WHY: first close → disconnected (no prior reconnect cycle),
      //      subsequent closes → reconnecting (exponential backoff in progress)
      const nextStatus: Status = nextAttempts === 1 ? 'disconnected' : 'reconnecting';
      // TODO Task 8: emit toast — daemon_disconnected (warning, persistent)
      return { status: nextStatus, attempts: nextAttempts };
    });
  },

  handleError: (_err: unknown) => {
    set({ status: 'reconnecting' });
    // TODO Task 8: emit toast — daemon_disconnected (warning, persistent) on error path
  },
}));
