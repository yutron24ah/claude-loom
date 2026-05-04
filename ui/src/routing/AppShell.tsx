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
 * Panel is only shown when current location is NOT the root route.
 * Escape listener is attached on mount and cleaned up on unmount.
 */
import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { RoomView } from '../views/room/RoomView';
import { DisciplineHeader } from '../components/DisciplineHeader';
import { Sidebar } from '../components/Sidebar';
import { ConnectionBanner } from '../notifications/ConnectionBanner';
import { ToastContainer } from '../notifications/ToastContainer';

export function AppShell(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

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

      {/* Room canvas — always mounted, z-index 0, offset right by sidebar width */}
      <div className="absolute inset-0 z-0 ml-[220px]">
        <RoomView />
      </div>

      {/* Panel overlay — only rendered when not at root route.
          ml-[220px] keeps sidebar visible above panel background. */}
      {isPanelOpen && (
        <div
          data-testid="view-panel"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-10 ml-[220px] bg-bg1/80 backdrop-blur-sm flex items-center justify-center"
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
