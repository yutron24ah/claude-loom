/**
 * Sidebar TDD tests — M0.11.4 Phase C t16 RPG style.
 *
 * WHY: Verify that Sidebar renders navigation links with RPG style primitives
 * (rpg-frame, dot active/inactive, rpg-label) and preserves existing nav
 * data-testid contracts for AppShell integration.
 *
 * We test BEHAVIOR (visible UI, testid presence, RPG class presence) not
 * implementation internals.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../../src/components/Sidebar';

afterEach(() => {
  cleanup();
});

/**
 * Sidebar requires React Router context (NavLink).
 */
function renderSidebar(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Sidebar />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Basic render
// ---------------------------------------------------------------------------

describe('Sidebar — basic render', () => {
  it('renders sidebar container', () => {
    renderSidebar();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('renders link to /plan', () => {
    renderSidebar();
    expect(screen.getByTestId('sidebar-link-plan')).toBeInTheDocument();
  });

  it('renders link to /sessions', () => {
    renderSidebar();
    expect(screen.getByTestId('sidebar-link-sessions')).toBeInTheDocument();
  });

  it('renders link to /tokens', () => {
    renderSidebar();
    expect(screen.getByTestId('sidebar-link-tokens')).toBeInTheDocument();
  });

  it('renders link to /project-settings', () => {
    renderSidebar();
    expect(screen.getByTestId('sidebar-link-project-settings')).toBeInTheDocument();
  });

  it('renders link to /retro', () => {
    renderSidebar();
    expect(screen.getByTestId('sidebar-link-retro')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// RPG style assertions (M0.11.4 Phase C t16)
// ---------------------------------------------------------------------------

describe('Sidebar — RPG style', () => {
  it('renders nav wrapped in rpg-frame class', () => {
    const { container } = renderSidebar();
    const frame = container.querySelector('.rpg-frame');
    expect(frame).toBeInTheDocument();
  });

  it('renders dot elements for nav item status indicators', () => {
    const { container } = renderSidebar();
    const dots = container.querySelectorAll('.dot');
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });

  it('renders nav entry labels with rpg-label class', () => {
    const { container } = renderSidebar();
    const labels = container.querySelectorAll('.rpg-label');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});
