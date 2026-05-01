/**
 * Smoke test: verify App component renders into DOM (Task 3, m2-t1)
 * WHY: confirms React 18 createRoot setup attaches to #root and renders placeholder content.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { App } from '../src/App';

afterEach(() => {
  cleanup();
});

describe('App smoke test', () => {
  it('renders placeholder heading into DOM', () => {
    render(<App />);
    // getByRole throws if element is absent — toHaveTextContent is the meaningful assertion
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('claude-loom UI');
  });
});
