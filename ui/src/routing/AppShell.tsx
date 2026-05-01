/**
 * AppShell — persistent Room canvas + panel overlay routing structure.
 *
 * WHY: Room canvas must stay mounted at all times (Hybrid C routing pattern):
 * - RoomView is rendered at z-index 0, always in the DOM
 * - Route-specific views are rendered as semi-transparent panels at z-index 10
 * - Panel close: background click OR Escape key → navigate('/')
 *
 * Panel is only shown when current location is NOT the root route.
 * Escape listener is attached on mount and cleaned up on unmount.
 */
import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { RoomView } from '../views/room/RoomView';

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
      {/* Persistent discipline header — Task 9 Subagent B で本実装 */}
      <header
        data-testid="discipline-header"
        className="absolute top-0 left-0 right-0 z-20 h-sp-10 bg-bg2 border-b border-border"
      />

      {/* Room canvas — always mounted, z-index 0 */}
      <div className="absolute inset-0 z-0">
        <RoomView />
      </div>

      {/* Panel overlay — only rendered when not at root route */}
      {isPanelOpen && (
        <div
          data-testid="view-panel"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-10 bg-bg1/80 backdrop-blur-sm flex items-center justify-center"
          onClick={handlePanelBackgroundClick}
        >
          {/* Outlet renders the route-specific view inside the panel */}
          <Outlet />
        </div>
      )}
    </div>
  );
}
