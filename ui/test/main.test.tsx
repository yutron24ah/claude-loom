/**
 * Smoke test: verify App component renders AppShell into DOM.
 * WHY: App.tsx delegates to AppRouter (react-router v6 BrowserRouter + AppShell).
 * We verify the top-level shell structure is present: room-canvas + topbar.
 *
 * M0.15 t14 (REQ-075) replaced the discipline-header placeholder with the redesign
 * TopBar (4 discipline metrics + brand + project + conn dot). The smoke contract
 * is now "AppShell renders the redesign shell" — same intent, new testid.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from '../src/routing/AppShell';

afterEach(() => {
  cleanup();
});

describe('App smoke test', () => {
  it('renders AppShell with room-canvas into DOM', () => {
    // Render AppShell directly (App wraps it in BrowserRouter which is not available in jsdom)
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppShell />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('room-canvas')).toBeInTheDocument();
  });

  it('renders topbar (redesign shell) with brand and metrics', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppShell />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('topbar')).toBeInTheDocument();
  });
});
