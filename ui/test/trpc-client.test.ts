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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  afterEach(() => {
    vi.restoreAllMocks();
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
