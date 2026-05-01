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
      let timerId: ReturnType<typeof setTimeout> | null = null;

      if (incoming.ttl_ms != null) {
        // Schedule auto-dismiss — store timer id so we can clear on manual close
        timerId = setTimeout(() => {
          setActiveToasts((prev) => prev.filter((a) => a.toast.id !== incoming.id));
        }, incoming.ttl_ms);
      }

      setActiveToasts((prev) => [...prev, { toast: incoming, timerId }]);
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
