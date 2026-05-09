/**
 * TDD test for tRPC client setup (client.ts + provider.tsx)
 * WHY: verifies exponential backoff formula and wsLink callback → connectionStore
 * bridge before any implementation exists (RED commit).
 *
 * Scope (Task 7):
 *   - retryDelayMs formula (exponential backoff, 30s cap)
 *   - wsLink onOpen callback → useConnectionStore.handleOpen()
 *   - wsLink onClose callback → useConnectionStore.handleClose()
 *   - wsLink onError callback → useConnectionStore.handleError()
 *
 * NOTE: We do NOT test actual WebSocket connections here (no real daemon).
 * We extract and test the pure functions / mock the wsLink factory.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useConnectionStore } from '@/store/connection';

// ---------------------------------------------------------------------------
// retryDelayMs — exponential backoff formula
// ---------------------------------------------------------------------------
// Import the bare formula function from client.ts once it exists.
// The function is exported separately so it can be unit-tested without
// instantiating a real WebSocket client.
import { retryDelayMs } from '@/trpc/client';

describe('retryDelayMs — exponential backoff', () => {
  it('attempt 0 → 1000ms (1s)', () => {
    expect(retryDelayMs(0)).toBe(1000);
  });

  it('attempt 1 → 2000ms (2s)', () => {
    expect(retryDelayMs(1)).toBe(2000);
  });

  it('attempt 2 → 4000ms (4s)', () => {
    expect(retryDelayMs(2)).toBe(4000);
  });

  it('attempt 4 → 16000ms (16s)', () => {
    expect(retryDelayMs(4)).toBe(16000);
  });

  it('attempt 5 → 30000ms (cap, Math.min(32000, 30000))', () => {
    expect(retryDelayMs(5)).toBe(30000);
  });

  it('attempt 10 → 30000ms (cap maintained)', () => {
    expect(retryDelayMs(10)).toBe(30000);
  });
});

// ---------------------------------------------------------------------------
// wsLink callback → connectionStore bridge
// ---------------------------------------------------------------------------
// We import the callback factory from client.ts and invoke each callback
// directly, then verify the store transitions as expected.
import { createWsCallbacks } from '@/trpc/client';

describe('wsLink callbacks → useConnectionStore bridge', () => {
  beforeEach(() => {
    // Reset store to clean initial state between tests
    useConnectionStore.setState({ status: 'connecting', attempts: 0 });
  });

  it('onOpen callback → status transitions to "connected"', () => {
    const { onOpen } = createWsCallbacks();
    onOpen();
    expect(useConnectionStore.getState().status).toBe('connected');
  });

  it('onOpen callback — wasReconnecting path → status "connected", attempts reset', () => {
    useConnectionStore.setState({ status: 'reconnecting', attempts: 3 });
    const { onOpen } = createWsCallbacks();
    onOpen();
    expect(useConnectionStore.getState().status).toBe('connected');
    expect(useConnectionStore.getState().attempts).toBe(0);
  });

  it('onClose callback → first close: status "disconnected" (attempts 1)', () => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    const { onClose } = createWsCallbacks();
    onClose();
    expect(useConnectionStore.getState().status).toBe('disconnected');
    expect(useConnectionStore.getState().attempts).toBe(1);
  });

  it('onClose callback → second close: status "reconnecting" (attempts 2)', () => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    const { onClose } = createWsCallbacks();
    onClose();
    onClose();
    expect(useConnectionStore.getState().status).toBe('reconnecting');
    expect(useConnectionStore.getState().attempts).toBe(2);
  });

  it('onError callback → status "reconnecting"', () => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    const { onError } = createWsCallbacks();
    onError(new Error('ws connection failed'));
    expect(useConnectionStore.getState().status).toBe('reconnecting');
  });

  it('onError callback — accepts any error type', () => {
    const { onError } = createWsCallbacks();
    onError('string error');
    expect(useConnectionStore.getState().status).toBe('reconnecting');

    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    onError(null);
    expect(useConnectionStore.getState().status).toBe('reconnecting');
  });
});

// ---------------------------------------------------------------------------
// Resilience: callbacks must NOT throw if the store binding is torn down by
// vitest's per-file module isolation. Non-TypeError throws (real bugs) must
// still propagate so they do not get silently masked.
// ---------------------------------------------------------------------------
describe('wsLink callbacks — resilient under store-binding teardown', () => {
  beforeEach(() => {
    useConnectionStore.setState({ status: 'connecting', attempts: 0 });
  });

  it('onOpen / onClose / onError do not throw when the store getState path fails', () => {
    const { onOpen, onClose, onError } = createWsCallbacks();

    // Snapshot the pre-call state so we can verify catch is a true no-op.
    const stateBefore = { ...useConnectionStore.getState() };

    // Simulate the failure mode: getState throws TypeError (proxy for the real
    // failure where `useConnectionStore` import resolves to undefined and
    // accessing `.getState` raises "Cannot read properties of undefined").
    const original = useConnectionStore.getState;
    (useConnectionStore as unknown as { getState: () => never }).getState = () => {
      throw new TypeError('Cannot read properties of undefined (reading "getState")');
    };

    try {
      expect(() => onOpen()).not.toThrow();
      expect(() => onClose()).not.toThrow();
      expect(() => onError(new Error('connection refused'))).not.toThrow();
    } finally {
      useConnectionStore.getState = original;
    }

    // No partial state mutation: catch must skip cleanly, not leave the store
    // half-updated. The teardown-race surface is "TypeError before any state
    // write", so the store status/attempts must be unchanged from the snapshot.
    const stateAfter = useConnectionStore.getState();
    expect(stateAfter.status).toBe(stateBefore.status);
    expect(stateAfter.attempts).toBe(stateBefore.attempts);
  });

  it('rethrows non-TypeError so real bugs in store handlers are not masked', () => {
    const { onClose } = createWsCallbacks();
    const original = useConnectionStore.getState;
    (useConnectionStore as unknown as { getState: () => never }).getState = () => {
      throw new RangeError('something other than TypeError');
    };

    try {
      expect(() => onClose()).toThrow(RangeError);
    } finally {
      useConnectionStore.getState = original;
    }
  });
});
