/**
 * ConnectionBanner — top-of-screen banner shown when WS connection is not established.
 *
 * WHY: users need immediate visual feedback when the daemon is unreachable.
 * We subscribe to useConnectionStore so the banner reacts to status changes
 * without any prop drilling. It is rendered inside AppShell so it appears
 * on every route (URL-independent per SCREEN_REQUIREMENTS §5.3).
 *
 * Status messages:
 *   connecting   → 「接続を確立中…」 (initial connect attempt)
 *   disconnected → 「接続を確立中…」 (first disconnect, attempting reconnect)
 *   reconnecting → 「切断、再接続中…」 (exponential backoff in progress)
 *   connected    → banner not rendered
 */
import { useConnectionStore } from '../store/connection';
import type { Status } from '../store/connection';

function getBannerMessage(status: Status): string {
  if (status === 'reconnecting') {
    return '切断、再接続中…';
  }
  // connecting + disconnected both show initial-connection message
  return '接続を確立中…';
}

export function ConnectionBanner(): JSX.Element | null {
  const status = useConnectionStore((s) => s.status);

  if (status === 'connected') {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="connection-banner"
      data-status={status}
      className="w-full px-4 py-2 text-center text-sm font-medium bg-warning/20 text-warning border-b border-warning/40"
    >
      {getBannerMessage(status)}
    </div>
  );
}
