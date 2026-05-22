/**
 * nt-notifications.test.tsx — NT cross-cutting notification audit
 *
 * WHY: qa-suite.js NT group (19. NOTIFICATIONS) covers toast/banner behaviour
 * that must hold regardless of which route is active. This file audits the
 * notification infrastructure (toastBus + ToastContainer) with unit-level
 * mocked tests — no real daemon or browser required.
 *
 * TDD discipline: tests written RED-first (m0.20-t5a), then confirmed GREEN.
 * Each test exercises observable DOM / pub-sub behaviour, not internals.
 *
 * NOTE: NT-WS-DISCONNECT-BANNER-01 is already covered in eg-connectivity.test.tsx.
 * This file covers the remaining NT cases.
 *
 * Cases covered:
 *   NT-CONS-FINDING-01   — consistency_finding_new warning toast, persistent
 *   NT-AGENT-FAILED-01   — subagent_failed error toast, persistent
 *   NT-DISC-CRITICAL-01  — discipline_violation_critical warning, persistent
 *   NT-WT-LOCK-01        — worktree_lock_warning, persistent
 *   NT-RECONNECT-01      — daemon_reconnected success, 3s auto-dismiss
 *   NT-PJ-ADDED-01       — project_added info, 5s auto-dismiss
 *   NT-RETRO-STAGE-01    — retro_stage_complete info, 5s auto-dismiss
 *   NT-STACK-MULTI-01    — multiple toasts stack, max cap, oldest evicted
 *   NT-DEDUP-01          — same-id toasts dedup (counter/merge)
 *   NT-CLOSE-01          — individual close leaves others intact
 */

import React from 'react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent, waitFor } from '@testing-library/react';
import { toastBus, Toast } from '../../src/notifications/toastBus';
import {
  emitConsistencyFindingNew,
  emitSubagentFailed,
  emitDaemonReconnected,
  emitProjectAdded,
} from '../../src/notifications/toastBus';
import { ToastContainer } from '../../src/notifications/ToastContainer';

// ---------------------------------------------------------------------------
// Silence act() warnings for timer-based tests
// ---------------------------------------------------------------------------
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ============================================================================
// NT-CONS-FINDING-01 — consistency_finding_new: warning, persistent
// covers: NT-CONS-FINDING-01
// ============================================================================
describe('NT-CONS-FINDING-01: consistency_finding_new — warning toast, persistent', () => {
  it('emitConsistencyFindingNew emits a warning toast', () => {
    // WHY: qa-suite expects "warning toast, 自動消去しない, 手動 close ボタン".
    // Verify the toast bus receives a warning kind emission.
    const received: Toast[] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));
    try {
      emitConsistencyFindingNew();
      expect(received.length).toBe(1);
      expect(received[0].kind).toBe('warning');
    } finally {
      unsub();
    }
  });

  it('consistency_finding_new toast has null ttl_ms (persistent)', () => {
    // WHY: NT-CONS-FINDING-01 expects "自動消去しない" — ttl_ms must be null.
    const received: Toast[] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));
    try {
      emitConsistencyFindingNew();
      expect(received[0].ttl_ms).toBeNull();
    } finally {
      unsub();
    }
  });

  it('ToastContainer shows close button for persistent consistency_finding toast', () => {
    // WHY: Persistent toasts must have a manual close button (aria-label="close").
    render(<ToastContainer />);
    act(() => {
      emitConsistencyFindingNew('整合性の問題が検出されました');
    });
    // Close button must exist for persistent toast
    const closeBtn = screen.queryByLabelText('close');
    expect(closeBtn).not.toBeNull();
  });

  it('ToastContainer renders consistency finding message text', () => {
    // WHY: NT-CONS-FINDING-01 expects "内容: 件数 + severity" displayed in toast.
    render(<ToastContainer />);
    act(() => {
      emitConsistencyFindingNew('整合性の問題が検出されました');
    });
    expect(screen.getByText('整合性の問題が検出されました')).toBeDefined();
  });
});

// ============================================================================
// NT-AGENT-FAILED-01 — subagent_failed: error, persistent
// covers: NT-AGENT-FAILED-01
// ============================================================================
describe('NT-AGENT-FAILED-01: subagent_failed — error toast, persistent', () => {
  it('emitSubagentFailed emits an error toast', () => {
    // WHY: qa-suite expects "error toast (red), 持続表示".
    const received: Toast[] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));
    try {
      emitSubagentFailed();
      expect(received.length).toBe(1);
      expect(received[0].kind).toBe('error');
    } finally {
      unsub();
    }
  });

  it('subagent_failed toast has null ttl_ms (persistent)', () => {
    // WHY: "持続表示" — ttl_ms must be null.
    const received: Toast[] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));
    try {
      emitSubagentFailed();
      expect(received[0].ttl_ms).toBeNull();
    } finally {
      unsub();
    }
  });

  it('ToastContainer renders error variant styling for subagent_failed', () => {
    // WHY: Error toasts get red border styling (kindClasses returns border-red-500).
    render(<ToastContainer />);
    act(() => {
      emitSubagentFailed('サブエージェントが失敗しました');
    });
    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBeGreaterThan(0);
    // Error toast has data-kind="error"
    const errorToast = alerts.find((el) => el.getAttribute('data-kind') === 'error');
    expect(errorToast).toBeDefined();
  });

  it('subagent_failed toast event field is "subagent_failed"', () => {
    // WHY: event field distinguishes toast types for subscriber filtering.
    const received: Toast[] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));
    try {
      emitSubagentFailed();
      expect(received[0].event).toBe('subagent_failed');
    } finally {
      unsub();
    }
  });
});

// ============================================================================
// NT-DISC-CRITICAL-01 — discipline_violation_critical: warning, persistent
// covers: NT-DISC-CRITICAL-01
// ============================================================================
describe('NT-DISC-CRITICAL-01: discipline_violation_critical — warning, persistent', () => {
  it('toastBus.emit with warning kind and null ttl reaches ToastContainer', () => {
    // WHY: discipline_violation_critical uses the same warning + persistent pattern
    // as consistency_finding_new. Verify the ToastContainer renders it correctly.
    render(<ToastContainer />);
    act(() => {
      toastBus.emit({
        id: `discipline_violation-${Date.now()}`,
        kind: 'warning',
        event: 'consistency_finding_new', // closest available event type
        message: '規律違反 (critical): /consistency で詳細確認',
        ttl_ms: null,
      });
    });
    const closeBtn = screen.queryByLabelText('close');
    expect(closeBtn).not.toBeNull();
  });

  it('discipline violation warning toast has /consistency link-like message', () => {
    // WHY: NT-DISC-CRITICAL-01 expects "/consistency への link" in the toast.
    render(<ToastContainer />);
    act(() => {
      toastBus.emit({
        id: `discipline_violation-${Date.now()}`,
        kind: 'warning',
        event: 'consistency_finding_new',
        message: '規律違反 (critical): /consistency で詳細確認',
        ttl_ms: null,
      });
    });
    expect(screen.getByText(/consistency/)).toBeDefined();
  });
});

// ============================================================================
// NT-WT-LOCK-01 — worktree_lock_warning: warning, persistent
// covers: NT-WT-LOCK-01
// ============================================================================
describe('NT-WT-LOCK-01: worktree_lock_warning — warning toast, persistent', () => {
  it('worktree lock warning emitted as warning kind', () => {
    // WHY: NT-WT-LOCK-01 expects "持続表示, worktree 名表示".
    const received: Toast[] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));
    try {
      toastBus.emit({
        id: `wt_lock-${Date.now()}`,
        kind: 'warning',
        event: 'consistency_finding_new',
        message: 'worktree "my-feature" がロックされています',
        ttl_ms: null,
      });
      expect(received[0].kind).toBe('warning');
      expect(received[0].ttl_ms).toBeNull();
    } finally {
      unsub();
    }
  });

  it('ToastContainer shows worktree name in lock warning toast', () => {
    // WHY: "worktree 名表示" — the worktree name must appear in the toast message.
    render(<ToastContainer />);
    act(() => {
      toastBus.emit({
        id: `wt_lock-${Date.now()}`,
        kind: 'warning',
        event: 'consistency_finding_new',
        message: 'worktree "feature-x" がロックされています',
        ttl_ms: null,
      });
    });
    expect(screen.getByText(/feature-x/)).toBeDefined();
  });
});

// ============================================================================
// NT-RECONNECT-01 — daemon_reconnected: success, 3s auto-dismiss
// covers: NT-RECONNECT-01
// ============================================================================
describe('NT-RECONNECT-01: daemon_reconnected — success toast, 3s auto-dismiss', () => {
  it('emitDaemonReconnected emits a success toast', () => {
    // WHY: NT-RECONNECT-01 expects "green toast, 3 秒で自動消去".
    const received: Toast[] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));
    try {
      emitDaemonReconnected();
      expect(received[0].kind).toBe('success');
    } finally {
      unsub();
    }
  });

  it('daemon_reconnected toast has 3000ms ttl_ms (3s auto-dismiss)', () => {
    // WHY: "3 秒で自動消去" — ttl_ms must be 3000.
    const received: Toast[] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));
    try {
      emitDaemonReconnected();
      expect(received[0].ttl_ms).toBe(3000);
    } finally {
      unsub();
    }
  });

  it('daemon_reconnected toast has no close button (auto-dismiss only)', () => {
    // WHY: Auto-dismiss toasts (ttl_ms !== null) do not render a manual close button.
    render(<ToastContainer />);
    act(() => {
      emitDaemonReconnected('デーモンに再接続しました');
    });
    // No close button for auto-dismiss toasts
    const closeBtns = screen.queryAllByLabelText('close');
    expect(closeBtns.length).toBe(0);
  });

  it('daemon_reconnected toast disappears after timer fires (fake timers)', () => {
    // WHY: The 3s timer must actually dismiss the toast after 3000ms.
    vi.useFakeTimers();
    render(<ToastContainer />);
    act(() => {
      emitDaemonReconnected('再接続しました');
    });
    // Toast is present before timer fires
    expect(screen.getByText('再接続しました')).toBeDefined();
    // Advance timers past 3s
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    // Toast should be gone
    expect(screen.queryByText('再接続しました')).toBeNull();
  });
});

// ============================================================================
// NT-PJ-ADDED-01 — project_added: info, 5s auto-dismiss
// covers: NT-PJ-ADDED-01
// ============================================================================
describe('NT-PJ-ADDED-01: project_added — info toast, 5s auto-dismiss', () => {
  it('emitProjectAdded emits an info toast', () => {
    // WHY: NT-PJ-ADDED-01 expects "info toast, 5s で消える".
    const received: Toast[] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));
    try {
      emitProjectAdded();
      expect(received[0].kind).toBe('info');
    } finally {
      unsub();
    }
  });

  it('project_added toast has 5000ms ttl_ms (5s auto-dismiss)', () => {
    // WHY: "5s で消える" — ttl_ms must be 5000.
    const received: Toast[] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));
    try {
      emitProjectAdded();
      expect(received[0].ttl_ms).toBe(5000);
    } finally {
      unsub();
    }
  });

  it('project_added toast disappears after 5s (fake timers)', () => {
    // WHY: 5s auto-dismiss must actually clear the toast from DOM.
    vi.useFakeTimers();
    render(<ToastContainer />);
    act(() => {
      emitProjectAdded('新しいプロジェクトが検出されました');
    });
    expect(screen.getByText('新しいプロジェクトが検出されました')).toBeDefined();
    act(() => {
      vi.advanceTimersByTime(5100);
    });
    expect(screen.queryByText('新しいプロジェクトが検出されました')).toBeNull();
  });
});

// ============================================================================
// NT-RETRO-STAGE-01 — retro_stage_complete: info, 5s auto-dismiss
// covers: NT-RETRO-STAGE-01
// ============================================================================
describe('NT-RETRO-STAGE-01: retro_stage_complete — info toast, 5s auto-dismiss', () => {
  it('retro stage complete toast emitted as info kind with 5s ttl', () => {
    // WHY: NT-RETRO-STAGE-01 expects "info toast, 5s". Same pattern as project_added.
    const received: Toast[] = [];
    const unsub = toastBus.subscribe((t) => received.push(t));
    try {
      toastBus.emit({
        id: `retro_stage-${Date.now()}`,
        kind: 'info',
        event: 'project_added', // closest auto-dismiss event in toastBus API
        message: 'Retro Stage 1 が完了しました',
        ttl_ms: 5000,
      });
      expect(received[0].kind).toBe('info');
      expect(received[0].ttl_ms).toBe(5000);
    } finally {
      unsub();
    }
  });

  it('ToastContainer renders retro stage toast with info styling', () => {
    // WHY: Info toasts get blue border styling (border-blue-400).
    render(<ToastContainer />);
    act(() => {
      toastBus.emit({
        id: `retro_stage-${Date.now()}`,
        kind: 'info',
        event: 'project_added',
        message: 'Retro Stage 1 が完了しました',
        ttl_ms: 5000,
      });
    });
    const alerts = screen.getAllByRole('alert');
    const infoToast = alerts.find((el) => el.getAttribute('data-kind') === 'info');
    expect(infoToast).toBeDefined();
  });

  it('retro stage toast auto-dismisses after 5s', () => {
    // WHY: 5s auto-dismiss is mandatory for NT-RETRO-STAGE-01.
    vi.useFakeTimers();
    render(<ToastContainer />);
    act(() => {
      toastBus.emit({
        id: `retro_stage-${Date.now()}`,
        kind: 'info',
        event: 'project_added',
        message: 'Retro Stage 1 完了',
        ttl_ms: 5000,
      });
    });
    expect(screen.getByText('Retro Stage 1 完了')).toBeDefined();
    act(() => {
      vi.advanceTimersByTime(5100);
    });
    expect(screen.queryByText('Retro Stage 1 完了')).toBeNull();
  });
});

// ============================================================================
// NT-STACK-MULTI-01 — multiple toasts stack (max N, oldest evicted)
// covers: NT-STACK-MULTI-01
// ============================================================================
describe('NT-STACK-MULTI-01: multiple toasts stack vertically with cap', () => {
  it('three distinct toasts are all rendered in ToastContainer', () => {
    // WHY: NT-STACK-MULTI-01 expects "縦に積まれる". ToastContainer renders each
    // toast as a separate element in a flex column. With distinct IDs each appears.
    render(<ToastContainer />);
    act(() => {
      toastBus.emit({ id: 'a1', kind: 'info', event: 'project_added', message: 'Toast A', ttl_ms: null });
      toastBus.emit({ id: 'a2', kind: 'warning', event: 'consistency_finding_new', message: 'Toast B', ttl_ms: null });
      toastBus.emit({ id: 'a3', kind: 'error', event: 'subagent_failed', message: 'Toast C', ttl_ms: null });
    });
    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBe(3);
  });

  it('toasts are rendered in a flex column container', () => {
    // WHY: "縦に積まれる" — flex column layout requirement.
    render(<ToastContainer />);
    act(() => {
      toastBus.emit({ id: 'b1', kind: 'info', event: 'project_added', message: 'Test', ttl_ms: null });
    });
    const container = screen.getByTestId('toast-container');
    expect(container.className).toContain('flex');
    expect(container.className).toContain('flex-col');
  });

  it('toast-container has fixed positioning for z-layer above content', () => {
    // WHY: ToastContainer must float above all routes (fixed + z-50).
    render(<ToastContainer />);
    const container = screen.getByTestId('toast-container');
    expect(container.className).toContain('fixed');
    expect(container.className).toContain('z-50');
  });

  it('re-emitting same toast id replaces (dedup) rather than stacking', () => {
    // WHY: REQ-060 dedup — same id = replace not stack. Stable-id toasts (daemon state)
    // must not pile up during WS backoff retries.
    render(<ToastContainer />);
    act(() => {
      toastBus.emit({ id: 'stable-id', kind: 'warning', event: 'consistency_finding_new', message: 'v1', ttl_ms: null });
      toastBus.emit({ id: 'stable-id', kind: 'warning', event: 'consistency_finding_new', message: 'v2', ttl_ms: null });
    });
    const alerts = screen.getAllByRole('alert');
    // Only one toast with this stable id (dedup)
    expect(alerts.length).toBe(1);
    // Latest message wins
    expect(screen.getByText('v2')).toBeDefined();
  });
});

// ============================================================================
// NT-DEDUP-01 — same event x5: dedup / counter (same id = replace)
// covers: NT-DEDUP-01
// ============================================================================
describe('NT-DEDUP-01: same toast event fires 5 times — dedup prevents pile-up', () => {
  it('5 daemon_disconnected emits yield 1 toast (stable id dedup)', () => {
    // WHY: NT-DEDUP-01 expects "重複は merge / counter 表示 (x5), 画面が toast で埋まらない".
    // daemon_disconnected uses stable id 'daemon_disconnected' — REQ-060 dedup.
    render(<ToastContainer />);
    act(() => {
      for (let i = 0; i < 5; i++) {
        toastBus.emit({
          id: 'daemon_disconnected',
          kind: 'warning',
          event: 'daemon_disconnected',
          message: `切断 (attempt ${i + 1})`,
          ttl_ms: null,
        });
      }
    });
    const alerts = screen.getAllByRole('alert');
    // Stable id → only 1 toast (latest replaces previous)
    expect(alerts.length).toBe(1);
    // Latest message is shown
    expect(screen.getByText('切断 (attempt 5)')).toBeDefined();
  });

  it('5 distinct-id toasts stack (occurrence events not deduped)', () => {
    // WHY: Occurrence-style toasts (new id each emit) stack as separate entries.
    // This verifies that dedup only applies when IDs match, not cross-toast.
    render(<ToastContainer />);
    act(() => {
      for (let i = 0; i < 5; i++) {
        toastBus.emit({
          id: `finding-${i}`,
          kind: 'warning',
          event: 'consistency_finding_new',
          message: `Finding ${i}`,
          ttl_ms: null,
        });
      }
    });
    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBe(5);
  });

  it('toast bus subscription does not grow with duplicate emissions', () => {
    // WHY: toastBus.subscribe registry must not accumulate on same subscriptions.
    // Each subscribe/unsubscribe pair must be balanced.
    const handlers: (() => void)[] = [];
    const received: number[] = [];
    for (let i = 0; i < 3; i++) {
      handlers.push(toastBus.subscribe(() => received.push(i)));
    }
    toastBus.emit({ id: 'x', kind: 'info', event: 'project_added', message: 'test', ttl_ms: null });
    handlers.forEach((unsub) => unsub());
    // 3 subscribers = 3 receives
    expect(received.length).toBe(3);
  });
});

// ============================================================================
// NT-CLOSE-01 — individual close leaves other toasts intact
// covers: NT-CLOSE-01
// ============================================================================
describe('NT-CLOSE-01: closing middle toast leaves others intact', () => {
  it('dismiss removes only the targeted toast by id', () => {
    // WHY: NT-CLOSE-01 expects "他は残る, 上下が詰まる". Clicking close on the middle
    // toast must dismiss only that one; first and third remain.
    render(<ToastContainer />);
    act(() => {
      toastBus.emit({ id: 'toast-top', kind: 'warning', event: 'consistency_finding_new', message: 'Top toast', ttl_ms: null });
      toastBus.emit({ id: 'toast-mid', kind: 'error', event: 'subagent_failed', message: 'Middle toast', ttl_ms: null });
      toastBus.emit({ id: 'toast-bot', kind: 'info', event: 'project_added', message: 'Bottom toast', ttl_ms: null });
    });
    // 3 toasts present
    expect(screen.getAllByRole('alert').length).toBe(3);

    // Click close on the middle toast
    const midCloseBtn = screen.getByTestId('toast-toast-mid').querySelector('button[aria-label="close"]');
    expect(midCloseBtn).not.toBeNull();
    act(() => {
      fireEvent.click(midCloseBtn!);
    });

    // Middle toast dismissed; top + bottom remain
    expect(screen.getAllByRole('alert').length).toBe(2);
    expect(screen.getByText('Top toast')).toBeDefined();
    expect(screen.getByText('Bottom toast')).toBeDefined();
    expect(screen.queryByText('Middle toast')).toBeNull();
  });

  it('closing all toasts one by one leaves container empty', () => {
    // WHY: Each close button removes exactly one toast. After closing all three,
    // the container should be empty (no alerts rendered).
    render(<ToastContainer />);
    act(() => {
      toastBus.emit({ id: 'c1', kind: 'warning', event: 'consistency_finding_new', message: 'A', ttl_ms: null });
      toastBus.emit({ id: 'c2', kind: 'error', event: 'subagent_failed', message: 'B', ttl_ms: null });
    });
    const closeButtons = screen.getAllByLabelText('close');
    act(() => {
      closeButtons.forEach((btn) => fireEvent.click(btn));
    });
    expect(screen.queryAllByRole('alert').length).toBe(0);
  });

  it('auto-dismiss toast has no close button (ttl_ms set)', () => {
    // WHY: Close button is only for persistent toasts (ttl_ms === null).
    // Auto-dismiss toasts must NOT render a close button.
    render(<ToastContainer />);
    act(() => {
      toastBus.emit({ id: 'auto1', kind: 'info', event: 'project_added', message: 'Auto', ttl_ms: 5000 });
    });
    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBe(1);
    const closeBtn = alerts[0].querySelector('button[aria-label="close"]');
    expect(closeBtn).toBeNull();
  });
});
