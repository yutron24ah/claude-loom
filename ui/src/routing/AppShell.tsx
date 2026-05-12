/**
 * AppShell — persistent Room canvas + sidebar + panel overlay routing structure.
 *
 * WHY: Room canvas must stay mounted at all times (Hybrid C routing pattern):
 * - RoomView is rendered at z-index 0, always in the DOM
 * - Route-specific views are rendered as semi-transparent panels at z-index 10
 * - Panel close: background click OR Escape key → navigate('/')
 *
 * Sidebar (z-25) sits above the panel overlay (z-10) and header (z-20) so it
 * remains accessible and clickable even when a panel is open. This allows users
 * to navigate between views without needing to dismiss the panel first.
 *
 * WHY z-25 for sidebar: header z-20, panel z-10. Sidebar must be above both
 * so navigation links are always clickable regardless of panel state.
 *
 * Right column (z-5): PMChatPanel mount slot. Added in M0.15 t13 as a right-
 * column anchor. Phase 4 t14 will do a full AppShell rewrite; this slot is the
 * only structural change in t13. Width 340px matches redesign SSoT (room.jsx).
 *
 * Panel is only shown when current location is NOT the root route.
 * Escape listener is attached on mount and cleaned up on unmount.
 */
import { useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { RoomView } from '../views/room/RoomView';
import { DisciplineHeader } from '../components/DisciplineHeader';
import { Sidebar } from '../components/Sidebar';
import { ConnectionBanner } from '../notifications/ConnectionBanner';
import { ToastContainer } from '../notifications/ToastContainer';
import { PMChatPanel } from '../views/pm-chat/PMChatPanel';
import { useScenario } from '@claude-loom/redesign/api/websocket';
import { getScenarioStore } from '@claude-loom/redesign/api/websocket';

export function AppShell(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const scenario = useScenario();
  const store = getScenarioStore();

  // Panel is visible when we're not at the root route
  const isPanelOpen = location.pathname !== '/';

  // Escape key dismisses panel → navigate to root
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape' && isPanelOpen) {
        navigate('/');
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPanelOpen, navigate]);

  function handlePanelBackgroundClick(): void {
    navigate('/');
  }

  // PM chat handlers — stub: call daemon REST endpoints and let WS events update state
  // Phase 5 t17 will replace these stubs with full tRPC mutations + proper error handling.
  const handlePmSend = useCallback((text: string) => {
    fetch('/pm/say', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }).catch(() => {
      // Fail silently — WS event (emitted by daemon) drives UI update, not response
    });
  }, []);

  const handlePmStart = useCallback(() => {
    fetch('/pm/start', { method: 'POST' }).catch(() => {});
  }, []);

  const handlePmPermission = useCallback((id: string, allow: boolean) => {
    fetch(`/pm/permission/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allow }),
    }).catch(() => {});
  }, []);

  // WHY: show PMChatPanel when PM is running or there are pending approvals.
  // Panel stays visible if there are pending approvals even when PM is not running
  // (edge case: PM crash mid-session). Always show when running.
  const showPmPanel = scenario.pm.running || scenario.pm.pendingApprovals.length > 0;

  // WHY: right column width 340px matches redesign/screens/room.jsx CHAT_W constant.
  const PM_PANEL_W = 340;

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Connection banner — always shown above all layers when not connected */}
      <div className="absolute top-0 left-0 right-0 z-30">
        <ConnectionBanner />
      </div>

      {/* Persistent discipline header — spans full width above sidebar */}
      <div className="absolute top-0 left-0 right-0 z-20">
        <DisciplineHeader />
      </div>

      {/* Sidebar — fixed left column, z-25 so it stays above panel overlay (z-10)
          and is always clickable for navigation regardless of panel state.
          WHY fixed width 220px: standard compact sidebar for a dense developer tool. */}
      <div className="absolute left-0 bottom-0 top-0 w-[220px] z-[25] pt-[var(--header-height,40px)]">
        <Sidebar />
      </div>

      {/* Room canvas — always mounted, z-index 0, offset right by sidebar width.
          WHY mr-[PM_PANEL_W]: when PM panel is visible, room canvas shrinks to
          avoid content being hidden under the right column (matches room.jsx W calc). */}
      <div
        className="absolute inset-0 z-0 ml-[220px]"
        style={{ marginRight: showPmPanel ? PM_PANEL_W : 0 }}
      >
        <RoomView />
      </div>

      {/* PMChatPanel right column mount slot (M0.15 t13).
          WHY z-5: between room canvas (z-0) and panel overlay (z-10). The right
          column is non-blocking for navigation; panel overlay still sits above it.
          Phase 4 t14 will do full AppShell rewrite; this is the minimal slot addition. */}
      {showPmPanel && (
        <div
          data-testid="pm-chat-right-column"
          className="absolute right-0 top-0 bottom-0 z-[5] pt-[var(--header-height,40px)]"
          style={{ width: PM_PANEL_W }}
        >
          <PMChatPanel
            pm={scenario.pm}
            stream={scenario.stream}
            onSend={handlePmSend}
            onStart={handlePmStart}
            onPermission={handlePmPermission}
          />
        </div>
      )}

      {/* Panel overlay — only rendered when not at root route.
          ml-[220px] keeps sidebar visible above panel background.
          WHY mr-[PM_PANEL_W]: panel overlay does not cover the PM right column. */}
      {isPanelOpen && (
        <div
          data-testid="view-panel"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-10 ml-[220px] bg-bg1/80 backdrop-blur-sm flex items-center justify-center"
          style={{ marginRight: showPmPanel ? PM_PANEL_W : 0 }}
          onClick={handlePanelBackgroundClick}
        >
          {/* Outlet renders the route-specific view inside the panel */}
          <Outlet />
        </div>
      )}

      {/* Toast container — always visible, z-50 above all layers */}
      <ToastContainer />
    </div>
  );
}
