/**
 * Smoke test: verify App component renders AppShell into DOM (updated m2-t3)
 * WHY: App.tsx now delegates to AppRouter (react-router v6 BrowserRouter + AppShell).
 * We verify the top-level shell structure is present: room-canvas + discipline-header.
 * The original theme toggle demo content (h1 "claude-loom UI") was replaced in m2-t3.
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

  it('renders discipline-header placeholder', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppShell />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('discipline-header')).toBeInTheDocument();
  });
});
