/**
 * TDD test for ToastContainer + toastBus (toast.test.tsx)
 * WHY: verifies toast display, TTL auto-dismiss, manual close, and 5-event helpers
 * before any implementation exists (RED commit).
 *
 * Principle 8: Test behavior, not implementation.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ToastContainer } from '@/notifications/ToastContainer';
import { toastBus } from '@/notifications/toastBus';
import {
  emitDaemonDisconnected,
  emitDaemonReconnected,
  emitConsistencyFindingNew,
  emitSubagentFailed,
  emitProjectAdded,
} from '@/notifications/toastBus';

describe('ToastContainer — basic display', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render toast when toastBus.emit is called', () => {
    render(<ToastContainer />);
    act(() => {
      toastBus.emit({
        id: 'test-1',
        kind: 'info',
        event: 'project_added',
        message: 'New project detected',
        ttl_ms: 5000,
      });
    });
    expect(screen.getByText('New project detected')).toBeDefined();
  });

  it('should show multiple toasts stacked', () => {
    render(<ToastContainer />);
    act(() => {
      toastBus.emit({ id: 't1', kind: 'info', event: 'project_added', message: 'Toast One', ttl_ms: 5000 });
      toastBus.emit({ id: 't2', kind: 'success', event: 'daemon_reconnected', message: 'Toast Two', ttl_ms: 3000 });
    });
    expect(screen.getByText('Toast One')).toBeDefined();
    expect(screen.getByText('Toast Two')).toBeDefined();
  });
});

describe('ToastContainer — TTL auto-dismiss', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should auto-dismiss toast after ttl_ms elapses', () => {
    render(<ToastContainer />);
    act(() => {
      toastBus.emit({ id: 'auto-1', kind: 'success', event: 'daemon_reconnected', message: 'Auto dismiss me', ttl_ms: 100 });
    });
    expect(screen.getByText('Auto dismiss me')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.queryByText('Auto dismiss me')).toBeNull();
  });

  it('should NOT auto-dismiss toast when ttl_ms is null (persistent)', () => {
    render(<ToastContainer />);
    act(() => {
      toastBus.emit({ id: 'persist-1', kind: 'warning', event: 'daemon_disconnected', message: 'Stay here', ttl_ms: null });
    });

    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(screen.getByText('Stay here')).toBeDefined();
  });
});

describe('ToastContainer — manual close button', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should show close button on persistent toast (ttl_ms null)', () => {
    render(<ToastContainer />);
    act(() => {
      toastBus.emit({ id: 'close-1', kind: 'error', event: 'subagent_failed', message: 'Agent failed', ttl_ms: null });
    });
    // close button should be present
    expect(screen.getByRole('button', { name: /close|dismiss|閉じる/i })).toBeDefined();
  });

  it('should dismiss persistent toast when close button is clicked', () => {
    render(<ToastContainer />);
    act(() => {
      toastBus.emit({ id: 'close-2', kind: 'error', event: 'subagent_failed', message: 'Dismiss me manually', ttl_ms: null });
    });
    const closeBtn = screen.getByRole('button', { name: /close|dismiss|閉じる/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Dismiss me manually')).toBeNull();
  });
});

describe('5-event toast helper functions', () => {
  it('emitDaemonDisconnected emits warning toast with ttl_ms null', () => {
    const received: Parameters<typeof toastBus.emit>[0][] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));
    emitDaemonDisconnected();
    unsub();
    expect(received).toHaveLength(1);
    expect(received[0].kind).toBe('warning');
    expect(received[0].event).toBe('daemon_disconnected');
    expect(received[0].ttl_ms).toBeNull();
  });

  it('emitDaemonReconnected emits success toast with ttl_ms 3000', () => {
    const received: Parameters<typeof toastBus.emit>[0][] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));
    emitDaemonReconnected();
    unsub();
    expect(received).toHaveLength(1);
    expect(received[0].kind).toBe('success');
    expect(received[0].event).toBe('daemon_reconnected');
    expect(received[0].ttl_ms).toBe(3000);
  });

  it('emitConsistencyFindingNew emits warning toast with ttl_ms null', () => {
    const received: Parameters<typeof toastBus.emit>[0][] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));
    emitConsistencyFindingNew('Spec drift detected');
    unsub();
    expect(received).toHaveLength(1);
    expect(received[0].kind).toBe('warning');
    expect(received[0].event).toBe('consistency_finding_new');
    expect(received[0].ttl_ms).toBeNull();
  });

  it('emitSubagentFailed emits error toast with ttl_ms null', () => {
    const received: Parameters<typeof toastBus.emit>[0][] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));
    emitSubagentFailed('dev-1 crashed');
    unsub();
    expect(received).toHaveLength(1);
    expect(received[0].kind).toBe('error');
    expect(received[0].event).toBe('subagent_failed');
    expect(received[0].ttl_ms).toBeNull();
  });

  it('emitProjectAdded emits info toast with ttl_ms 5000', () => {
    const received: Parameters<typeof toastBus.emit>[0][] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));
    emitProjectAdded('my-new-project');
    unsub();
    expect(received).toHaveLength(1);
    expect(received[0].kind).toBe('info');
    expect(received[0].event).toBe('project_added');
    expect(received[0].ttl_ms).toBe(5000);
  });
});
