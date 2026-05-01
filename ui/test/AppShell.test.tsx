/**
 * AppShell TDD test (Task 5, m2-t3)
 * WHY: verify persistent Room canvas + panel overlay routing behavior.
 * Written FIRST (Red) before AppShell implementation to enforce TDD discipline.
 *
 * Behavior under test:
 * 1. RoomView (data-testid="room-canvas") is always present in DOM regardless of route
 * 2. At `/` route, no panel overlay (data-testid="view-panel") is rendered
 * 3. At `/plan` route, Room canvas stays + panel overlay is rendered
 * 4. Panel background click → navigates to `/`
 * 5. Escape key → navigates to `/`
 * 6. Room canvas is NOT remounted across route changes (same DOM node identity)
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from '../src/routing/AppShell';

// Minimal placeholder views for routing test
function PlanView() {
  return <div>Plan</div>;
}

afterEach(() => {
  cleanup();
});

/**
 * Wrap AppShell in a MemoryRouter with configurable initial route.
 * Provides minimal route definitions for the test surface.
 */
function renderAppShell(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={null} />
          <Route path="plan" element={<PlanView />} />
          <Route path="retro" element={<div>Retro</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppShell — persistent Room canvas', () => {
  it('renders room-canvas at root route', () => {
    renderAppShell('/');
    expect(screen.getByTestId('room-canvas')).toBeInTheDocument();
  });

  it('renders room-canvas at /plan route', () => {
    renderAppShell('/plan');
    expect(screen.getByTestId('room-canvas')).toBeInTheDocument();
  });

  it('renders room-canvas at /retro route', () => {
    renderAppShell('/retro');
    expect(screen.getByTestId('room-canvas')).toBeInTheDocument();
  });

  it('room-canvas node is same identity across route change (no remount)', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={null} />
            <Route path="plan" element={<PlanView />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // Capture DOM node reference at '/'
    const roomCanvas = screen.getByTestId('room-canvas');
    const nodeRef = roomCanvas;

    // Navigate to /plan
    rerender(
      <MemoryRouter initialEntries={['/plan']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={null} />
            <Route path="plan" element={<PlanView />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // Room canvas should still be in DOM (persistent mount)
    expect(screen.getByTestId('room-canvas')).toBeInTheDocument();
    // Verify it is the same underlying element (not re-created)
    // WHY: AppShell mounts RoomView unconditionally, outside Outlet — so rerender
    // of the shell keeps the same component instance (React reconciliation preserves it)
    expect(screen.getByTestId('room-canvas')).toBe(nodeRef);
  });
});

describe('AppShell — panel overlay behavior', () => {
  it('does not render view-panel at root route', () => {
    renderAppShell('/');
    expect(screen.queryByTestId('view-panel')).not.toBeInTheDocument();
  });

  it('renders view-panel at /plan route', () => {
    renderAppShell('/plan');
    expect(screen.getByTestId('view-panel')).toBeInTheDocument();
  });

  it('view-panel contains route content', () => {
    renderAppShell('/plan');
    expect(screen.getByTestId('view-panel')).toBeInTheDocument();
    expect(screen.getByText('Plan')).toBeInTheDocument();
  });
});

describe('AppShell — panel close interactions', () => {
  it('Escape key navigates to / (panel dismissal)', async () => {
    let currentPath = '/plan';

    const { container } = render(
      <MemoryRouter initialEntries={['/plan']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={null} />
            <Route path="plan" element={<PlanView />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // panel should be visible at /plan
    expect(screen.getByTestId('view-panel')).toBeInTheDocument();

    // Fire Escape key on document
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    });

    // After Escape, panel should be gone (navigated to /)
    // WHY: MemoryRouter internal state changes — panel visibility reflects current route
    expect(screen.queryByTestId('view-panel')).not.toBeInTheDocument();
  });

  it('panel background click navigates to /', async () => {
    render(
      <MemoryRouter initialEntries={['/plan']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={null} />
            <Route path="plan" element={<PlanView />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // panel visible
    const panel = screen.getByTestId('view-panel');
    expect(panel).toBeInTheDocument();

    // Click the panel background (not the content inside it)
    await act(async () => {
      fireEvent.click(panel);
    });

    // panel should be dismissed
    expect(screen.queryByTestId('view-panel')).not.toBeInTheDocument();
  });
});

describe('AppShell — discipline-header placeholder', () => {
  it('renders discipline-header at root route', () => {
    renderAppShell('/');
    expect(screen.getByTestId('discipline-header')).toBeInTheDocument();
  });

  it('renders discipline-header at /plan route', () => {
    renderAppShell('/plan');
    expect(screen.getByTestId('discipline-header')).toBeInTheDocument();
  });
});
