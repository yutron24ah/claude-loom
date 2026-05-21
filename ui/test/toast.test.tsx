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

// covers: TS-TOAST-STACK-01
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

// ---------------------------------------------------------------------------
// REQ-060 (feat/dev-mode-ux item 1B): dedup contract for state-style toasts
// WHY: WS exponential backoff (1s/3s/7s/15s/31s/61s/91s...) calls
// emitDaemonDisconnected on every retry close+error. Without dedup the toasts
// pile up, defeating the persistent-warning UX. State-style events (daemon
// connection) must use stable ids so the container can replace, not append.
// Occurrence-style events (consistency findings, subagent failures) keep
// per-event ids so multiple instances stack as today.
// ---------------------------------------------------------------------------
describe('toastBus — daemon connection state toasts use stable ids (REQ-060)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emitDaemonDisconnected uses a stable id across emits separated in time', () => {
    const received: Parameters<typeof toastBus.emit>[0][] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));
    emitDaemonDisconnected();
    // WHY: advance fake timers between emits to defeat any "same-ms Date.now()"
    // coincidence and prove the id is genuinely stable, not timing-dependent.
    vi.advanceTimersByTime(50);
    emitDaemonDisconnected();
    vi.advanceTimersByTime(50);
    emitDaemonDisconnected();
    unsub();
    expect(received).toHaveLength(3);
    expect(received[0].id).toBe(received[1].id);
    expect(received[1].id).toBe(received[2].id);
  });

  it('emitDaemonReconnected uses a stable id across emits separated in time', () => {
    const received: Parameters<typeof toastBus.emit>[0][] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));
    emitDaemonReconnected();
    vi.advanceTimersByTime(50);
    emitDaemonReconnected();
    unsub();
    expect(received).toHaveLength(2);
    expect(received[0].id).toBe(received[1].id);
  });

  it('emitConsistencyFindingNew keeps per-emit unique ids (occurrence-style preserved)', () => {
    const received: Parameters<typeof toastBus.emit>[0][] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));
    emitConsistencyFindingNew('finding A');
    // advance the clock so the two Date.now() reads produce distinct id values
    vi.advanceTimersByTime(2);
    emitConsistencyFindingNew('finding B');
    unsub();
    expect(received).toHaveLength(2);
    expect(received[0].id).not.toBe(received[1].id);
  });
});

describe('ToastContainer — dedup by stable id (REQ-060)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('replaces an existing toast when a new toast with the same id arrives', () => {
    render(<ToastContainer />);
    act(() => {
      emitDaemonDisconnected('first message');
    });
    expect(screen.getAllByText('first message')).toHaveLength(1);

    act(() => {
      emitDaemonDisconnected('second message');
      emitDaemonDisconnected('third message');
    });

    // Only the latest message remains; first/second are replaced
    expect(screen.queryByText('first message')).toBeNull();
    expect(screen.queryByText('second message')).toBeNull();
    expect(screen.getAllByText('third message')).toHaveLength(1);

    // Only ONE rendered alert with the daemon_disconnected id, not three
    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1);
  });

  it('keeps occurrence-style toasts stacked (different ids)', () => {
    render(<ToastContainer />);
    act(() => {
      emitConsistencyFindingNew('finding A');
      // advance the clock so the two Date.now() reads produce distinct id values
      vi.advanceTimersByTime(2);
      emitConsistencyFindingNew('finding B');
    });
    expect(screen.getByText('finding A')).toBeDefined();
    expect(screen.getByText('finding B')).toBeDefined();
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });

  it('re-emit after manual dismiss restores the toast', () => {
    render(<ToastContainer />);
    act(() => {
      emitDaemonDisconnected('first');
    });
    expect(screen.getAllByRole('alert')).toHaveLength(1);

    // user clicks the close button — toast disappears
    fireEvent.click(screen.getByLabelText('close'));
    expect(screen.queryAllByRole('alert')).toHaveLength(0);

    // daemon disconnects again later — toast must come back
    act(() => {
      emitDaemonDisconnected('second');
    });
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByText('second')).toBeDefined();
  });

  it('re-emit of an auto-dismiss toast resets the timer', () => {
    render(<ToastContainer />);
    act(() => {
      // ttl_ms = 3000 (auto-dismiss)
      emitDaemonReconnected('first');
    });
    expect(screen.getAllByRole('alert')).toHaveLength(1);

    // 1 second later, re-emit — old timer must be cleared, new 3000 ms timer
    // started so the toast survives past the original 3000 ms boundary.
    act(() => {
      vi.advanceTimersByTime(1000);
      emitDaemonReconnected('second');
    });

    // Total elapsed: 1000 ms. Original timer would have fired at 3000 ms; if
    // it had not been cleared, the toast would dismiss at the next advance.
    // Advance to 3001 ms total — original fire moment + 1 ms — and assert the
    // toast is STILL visible (proves old timer was cleared).
    act(() => {
      vi.advanceTimersByTime(2001);
    });
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByText('second')).toBeDefined();

    // Advance the remaining ~1000 ms of the new timer — toast should dismiss.
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });
});
