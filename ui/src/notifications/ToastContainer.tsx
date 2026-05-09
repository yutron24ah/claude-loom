/**
 * ToastContainer — fixed top-right toast notification stack.
 *
 * WHY: toast notifications must be visually accessible regardless of which
 * route/panel is open. Fixed positioning (z-50) ensures toasts appear above
 * all content including the panel overlay (z-10). Stacking is implicit via
 * flexbox column layout.
 *
 * Timer management:
 * - `ttl_ms: number` → setTimeout auto-dismiss, cleared on unmount (leak prevention)
 * - `ttl_ms: null`   → persistent, manual close button only
 *
 * Subscribes to toastBus on mount; unsubscribes on unmount (no leaks).
 */
import { useState, useEffect, useCallback } from 'react';
import { toastBus } from './toastBus';
import type { Toast, ToastKind } from './toastBus';

// ---------------------------------------------------------------------------
// Internal state — each active toast tracks its own timer ref
// ---------------------------------------------------------------------------
interface ActiveToast {
  toast: Toast;
  timerId: ReturnType<typeof setTimeout> | null;
}

// ---------------------------------------------------------------------------
// Styling helpers — type-specific colour tokens from Tailwind config (Task 4)
// ---------------------------------------------------------------------------
function kindClasses(kind: ToastKind): string {
  switch (kind) {
    case 'success':
      return 'bg-bg2 border-l-4 border-green-500 text-fg1';
    case 'info':
      return 'bg-bg2 border-l-4 border-blue-400 text-fg1';
    case 'warning':
      return 'bg-bg2 border-l-4 border-yellow-400 text-fg1';
    case 'error':
      return 'bg-bg2 border-l-4 border-red-500 text-fg1';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ToastContainer(): JSX.Element {
  const [activeToasts, setActiveToasts] = useState<ActiveToast[]>([]);

  // Dismiss a single toast by id, clearing its timer if present
  const dismiss = useCallback((id: string) => {
    setActiveToasts((prev) => {
      const entry = prev.find((a) => a.toast.id === id);
      if (entry?.timerId != null) {
        clearTimeout(entry.timerId);
      }
      return prev.filter((a) => a.toast.id !== id);
    });
  }, []);

  // Subscribe to toastBus on mount
  useEffect(() => {
    const unsub = toastBus.subscribe((incoming: Toast) => {
      // REQ-060: dedup by id — if a toast with the same id already exists,
      // replace it (latest message wins) and reset its auto-dismiss timer.
      // State-style emitters (daemon_disconnected/reconnected) use a stable id
      // so WS backoff retries do not pile up; occurrence emitters keep per-call
      // unique ids and stack as before.
      //
      // WHY timer side-effect lives INSIDE the updater (acknowledged React API
      // trade-off): React documents setState updaters as "should be pure" but
      // does NOT enforce purity at runtime — Strict Mode double-invokes render
      // functions and useState initializers, NOT setState updaters (React 18
      // semantics, both dev and prod). Putting the side-effect here keeps the
      // observation of `prev` and the clear-then-schedule sequence atomic
      // against concurrent emits. Pulling the side-effect out would require
      // a useRef-tracked timer map and a manual atomicity guard, which adds
      // moving parts for a forward-compat concern that may never materialize.
      // If a future React version starts double-invoking updaters, switch to
      // an external timer registry. Tested in `re-emit of an auto-dismiss
      // toast resets the timer` to lock in the behavior.
      setActiveToasts((prev) => {
        const existingIndex = prev.findIndex((a) => a.toast.id === incoming.id);
        const existing = existingIndex >= 0 ? prev[existingIndex] : null;
        if (existing?.timerId != null) {
          clearTimeout(existing.timerId);
        }

        const timerId = incoming.ttl_ms != null
          ? setTimeout(() => {
              setActiveToasts((p) => p.filter((a) => a.toast.id !== incoming.id));
            }, incoming.ttl_ms)
          : null;

        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = { toast: incoming, timerId };
          return next;
        }
        return [...prev, { toast: incoming, timerId }];
      });
    });

    // Clean up subscription and all pending timers on unmount
    return () => {
      unsub();
      setActiveToasts((prev) => {
        prev.forEach((a) => {
          if (a.timerId != null) clearTimeout(a.timerId);
        });
        return [];
      });
    };
  }, []);

  return (
    <div
      aria-live="polite"
      aria-label="notifications"
      data-testid="toast-container"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {activeToasts.map(({ toast }) => (
        <div
          key={toast.id}
          role="alert"
          data-testid={`toast-${toast.id}`}
          data-kind={toast.kind}
          className={`
            flex items-start gap-2 px-4 py-3 rounded shadow-lg
            pointer-events-auto
            ${kindClasses(toast.kind)}
          `}
        >
          <span className="flex-1 text-sm">{toast.message}</span>

          {/* Manual close button — only shown for persistent toasts (ttl_ms null) */}
          {toast.ttl_ms == null && (
            <button
              type="button"
              aria-label="close"
              onClick={() => dismiss(toast.id)}
              className="ml-2 flex-shrink-0 text-fg1/60 hover:text-fg1 transition-colors"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
