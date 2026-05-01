/**
 * TDD test for useConnectionStore (connection.ts)
 * WHY: verifies the pure state machine behavior of WS connection status tracking
 * before any implementation exists (RED commit).
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Import will fail until connection.ts is created — RED phase
import { useConnectionStore } from '@/store/connection';

describe('useConnectionStore — initial state', () => {
  beforeEach(() => {
    // Reset store to initial state between tests using zustand's setState
    useConnectionStore.setState({ status: 'connecting', attempts: 0 });
  });

  it('should have status "connecting" on init', () => {
    const { status } = useConnectionStore.getState();
    expect(status).toBe('connecting');
  });

  it('should have attempts 0 on init', () => {
    const { attempts } = useConnectionStore.getState();
    expect(attempts).toBe(0);
  });
});

describe('useConnectionStore — handleOpen', () => {
  beforeEach(() => {
    useConnectionStore.setState({ status: 'connecting', attempts: 0 });
  });

  it('should transition to "connected" after handleOpen', () => {
    useConnectionStore.getState().handleOpen();
    expect(useConnectionStore.getState().status).toBe('connected');
  });

  it('should reset attempts to 0 after handleOpen', () => {
    useConnectionStore.setState({ status: 'reconnecting', attempts: 3 });
    useConnectionStore.getState().handleOpen();
    expect(useConnectionStore.getState().attempts).toBe(0);
  });

  it('should transition reconnecting → connected (wasReconnecting path)', () => {
    // Simulate reconnecting state (prior disconnect attempts)
    useConnectionStore.setState({ status: 'reconnecting', attempts: 2 });
    useConnectionStore.getState().handleOpen();
    expect(useConnectionStore.getState().status).toBe('connected');
    expect(useConnectionStore.getState().attempts).toBe(0);
  });
});

describe('useConnectionStore — handleClose', () => {
  beforeEach(() => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
  });

  it('should set status to "disconnected" on first close (attempts becomes 1)', () => {
    useConnectionStore.getState().handleClose();
    expect(useConnectionStore.getState().status).toBe('disconnected');
    expect(useConnectionStore.getState().attempts).toBe(1);
  });

  it('should set status to "reconnecting" on second close (attempts becomes 2)', () => {
    useConnectionStore.getState().handleClose();
    useConnectionStore.getState().handleClose();
    expect(useConnectionStore.getState().status).toBe('reconnecting');
    expect(useConnectionStore.getState().attempts).toBe(2);
  });

  it('should increment attempts on each handleClose', () => {
    useConnectionStore.getState().handleClose();
    useConnectionStore.getState().handleClose();
    useConnectionStore.getState().handleClose();
    expect(useConnectionStore.getState().attempts).toBe(3);
    expect(useConnectionStore.getState().status).toBe('reconnecting');
  });
});

describe('useConnectionStore — handleError', () => {
  beforeEach(() => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
  });

  it('should transition to "reconnecting" on handleError', () => {
    useConnectionStore.getState().handleError(new Error('test ws error'));
    expect(useConnectionStore.getState().status).toBe('reconnecting');
  });

  it('should accept any unknown error type', () => {
    useConnectionStore.getState().handleError('string error');
    expect(useConnectionStore.getState().status).toBe('reconnecting');
    useConnectionStore.getState().handleError(null);
    expect(useConnectionStore.getState().status).toBe('reconnecting');
  });
});
