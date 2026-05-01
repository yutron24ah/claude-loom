/**
 * tRPC client setup — wsLink with exponential backoff + connectionStore bridge.
 *
 * WHY: centralises the single WS client instance and tRPC React bindings so
 * all views share the same connection. The retryDelayMs formula and callback
 * factory are exported separately to keep them unit-testable without
 * instantiating a real WebSocket (SPEC §3.6 — behaviour > implementation).
 *
 * URL const: M2 uses localhost:5757 literal; M5 polish will env-var-ise this.
 * Auth token: M5 polish concern — dev env has no auth gate.
 */
import { createTRPCReact } from '@trpc/react-query';
import { createWSClient, wsLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '@claude-loom/daemon';
import { useConnectionStore } from '../store/connection';

// ---------------------------------------------------------------------------
// Exported helpers (unit-tested in trpc-client.test.ts)
// ---------------------------------------------------------------------------

/**
 * Exponential backoff with 30s cap.
 * attempt 0 → 1s, 1 → 2s, 2 → 4s, … 5+ → 30s.
 * WHY: gives the daemon time to restart without hammering the connection.
 */
export function retryDelayMs(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 30000);
}

/**
 * Factory returning the three wsLink callbacks wired to connectionStore.
 * Exported separately so tests can invoke each callback without a real WS.
 * WHY: decouples the callback logic from WebSocket instantiation.
 */
export function createWsCallbacks(): {
  onOpen: () => void;
  onClose: () => void;
  onError: (err: unknown) => void;
} {
  return {
    onOpen: () => {
      useConnectionStore.getState().handleOpen();
    },
    onClose: () => {
      useConnectionStore.getState().handleClose();
    },
    onError: (err: unknown) => {
      useConnectionStore.getState().handleError(err);
    },
  };
}

// ---------------------------------------------------------------------------
// tRPC + WS client singletons
// ---------------------------------------------------------------------------

const WS_URL = 'ws://localhost:5757/trpc';

const callbacks = createWsCallbacks();

export const wsClient = createWSClient({
  url: WS_URL,
  retryDelayMs,
  onOpen: callbacks.onOpen,
  onClose: callbacks.onClose,
  onError: callbacks.onError,
});

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    wsLink({
      client: wsClient,
      transformer: superjson,
    }),
  ],
});
