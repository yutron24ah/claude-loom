/**
 * TDD test for useConnectionStore × toastBus integration (store-connection-toast.test.ts)
 * WHY: verifies that handleClose/handleOpen emit the correct toasts via toastBus
 * before any implementation exists (RED commit).
 *
 * Principle 8: Test behavior (toast emissions), not implementation details.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useConnectionStore } from '@/store/connection';
import { toastBus } from '@/notifications/toastBus';
import type { Toast } from '@/notifications/toastBus';

describe('useConnectionStore × toastBus — handleClose emits daemon_disconnected toast', () => {
  beforeEach(() => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
  });

  it('should emit daemon_disconnected warning toast when handleClose is called', () => {
    const emitted: Toast[] = [];
    const unsub = toastBus.subscribe((t) => emitted.push(t));
    useConnectionStore.getState().handleClose();
    unsub();
    expect(emitted).toHaveLength(1);
    expect(emitted[0].event).toBe('daemon_disconnected');
    expect(emitted[0].kind).toBe('warning');
    expect(emitted[0].ttl_ms).toBeNull();
  });
});

describe('useConnectionStore × toastBus — handleOpen emits daemon_reconnected toast only on wasReconnecting', () => {
  it('should emit daemon_reconnected success toast when reconnecting → handleOpen', () => {
    useConnectionStore.setState({ status: 'reconnecting', attempts: 2 });
    const emitted: Toast[] = [];
    const unsub = toastBus.subscribe((t) => emitted.push(t));
    useConnectionStore.getState().handleOpen();
    unsub();
    expect(emitted).toHaveLength(1);
    expect(emitted[0].event).toBe('daemon_reconnected');
    expect(emitted[0].kind).toBe('success');
    expect(emitted[0].ttl_ms).toBe(3000);
  });

  it('should NOT emit any toast when connecting (initial) → handleOpen (wasReconnecting false)', () => {
    useConnectionStore.setState({ status: 'connecting', attempts: 0 });
    const emitted: Toast[] = [];
    const unsub = toastBus.subscribe((t) => emitted.push(t));
    useConnectionStore.getState().handleOpen();
    unsub();
    expect(emitted).toHaveLength(0);
  });
});

describe('useConnectionStore × toastBus — handleError emits daemon_disconnected toast', () => {
  it('should emit daemon_disconnected warning toast when handleError is called', () => {
    useConnectionStore.setState({ status: 'connected', attempts: 0 });
    const emitted: Toast[] = [];
    const unsub = toastBus.subscribe((t) => emitted.push(t));
    useConnectionStore.getState().handleError(new Error('ws error'));
    unsub();
    expect(emitted).toHaveLength(1);
    expect(emitted[0].event).toBe('daemon_disconnected');
    expect(emitted[0].kind).toBe('warning');
    expect(emitted[0].ttl_ms).toBeNull();
  });
});
