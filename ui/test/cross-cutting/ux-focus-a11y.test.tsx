/**
 * ux-focus-a11y.test.tsx — cross-cutting focus ring / a11y audit (m0.20-t1b)
 *
 * WHY: Verifies UX-FOCUS and UX-A11Y requirements that apply across all routes
 * and major overlay components. These are "horizontal slice" tests — they assert
 * structural accessibility properties that each component must satisfy, rather
 * than per-screen rendering logic.
 *
 * Cases covered in this file:
 *   UX-FOCUS-RING-01   — interactive elements carry a CSS class that enables a
 *                        visible focus ring (outline not suppressed globally)
 *   UX-A11Y-FOCUS-TRAP-01  — AgentDetailPanel traps focus within the overlay
 *                            drawer when open (Tab stays inside panel)
 *   UX-A11Y-FOCUS-RESTORE-01 — focus returns to the trigger element after
 *                              AgentDetailPanel is closed
 *   UX-A11Y-ARIA-LANDMARK-01 — AppShell renders semantic landmark elements
 *                              (<nav>, <main>, or role equivalents) for
 *                              screen-reader navigation
 *   UX-A11Y-SCREENREADER-01  — all Drawer nav links have an accessible name
 *                              (aria-label, title, or visible text label)
 *   UX-A11Y-SHORTCUT-01      — Esc key closes AgentDetailPanel; other keys
 *                              (Enter, Tab) do NOT trigger close
 *
 * Note: UX-A11Y-CONTRAST-01 (WCAG AA colour contrast) requires a browser-level
 * colour parser to evaluate computed CSS custom properties; it is tested in the
 * Playwright layer (ui/e2e/ux-keyboard-nav.spec.ts) via axe-core or
 * Lighthouse a11y audit which resolves CSS vars in a real rendering engine.
 *
 * Design source:
 *   ui/src/routing/AppShell.tsx   (Drawer, landmark structure)
 *   ui/src/views/room/AgentDetailPanel.tsx  (focus trap, Esc handler)
 *
 * Principle §8: test observable user-facing behaviour — not implementation
 * details like class names, except where the class directly encodes the
 * user-facing affordance (e.g. focus-ring-visible CSS token).
 */
// covers: UX-FOCUS-RING-01, UX-A11Y-FOCUS-TRAP-01, UX-A11Y-FOCUS-RESTORE-01, UX-A11Y-ARIA-LANDMARK-01, UX-A11Y-SCREENREADER-01, UX-A11Y-SHORTCUT-01

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AgentDetailPanel } from '../../src/views/room/AgentDetailPanel';

// ---------------------------------------------------------------------------
// jsdom polyfill — RoomView (transitively imported) uses ResizeObserver
// ---------------------------------------------------------------------------
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// WHY: AgentDetailNotes uses tRPC hooks that require a provider; not relevant
// for focus / a11y tests — stub with null render.
vi.mock('../../src/views/room/AgentDetailNotes', () => ({
  AgentDetailNotes: () => null,
}));

// WHY: CatSprite is an SVG component. Provide minimal stub so render does not
// throw when the component is mounted in jsdom.
vi.mock('../../src/components/CatSprite', () => ({
  CatSprite: ({ size }: { size?: number }) => (
    <div data-testid="cat-sprite" data-size={size} />
  ),
}));

// WHY: useScenario uses WebSocket + global window location; provide a stable
// idle scenario so AgentDetailPanel renders without network calls.
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () => ({
    key: 'idle',
    label: 'idle',
    now: '00:00',
    conn: 'disconnected',
    project: 'test-project',
    branch: 'main',
    agents: {
      pm: { status: 'idle', name: 'PM', currentTool: null, currentReasoning: null },
      dev: { status: 'idle', name: 'Dev', currentTool: null, currentReasoning: null },
    },
    pm: { running: false, pendingApprovals: [] },
    stream: [],
    tokens: { byAgent: [] },
    gantt: { windowLabel: '', nowPct: 0, rows: [] },
    todos: [],
    milestones: [],
    worktrees: [],
    todosUpdatedAt: '—',
    disciplineMetrics: {
      parallel: 0,
      taskTool: 'ok',
      taskToolLabel: 'ON',
      tddViolations: 0,
      verdict: 'PASS',
    },
  }),
}));

// WHY: usePMSession is imported by AppShell; stub so no real hook side-effects.
vi.mock('../../src/live/usePMSession', () => ({
  usePMSession: () => ({
    start: vi.fn(),
    say: vi.fn(),
    permission: vi.fn(),
    isLoading: false,
  }),
}));

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockAgent = {
  id: 'dev',
  kind: 'persistent' as const,
  summonedBy: null,
  name: 'サバ',
  role: 'Developer',
  jp: 'デベロッパー',
  breed: 'サバトラ',
  quote: 'RED → GREEN、まず落とすの。',
  hat: 'headband' as const,
  fur: '#b8a98c',
  cheek: '#f4a3b3',
  group: 'core' as const,
};

// ---------------------------------------------------------------------------
// UX-FOCUS-RING-01 — focus ring CSS not globally suppressed
// ---------------------------------------------------------------------------

describe('UX-FOCUS-RING-01 — focus ring must be visible on interactive elements', () => {
  // WHY: A common a11y failure is `outline: none` or `outline: 0` applied
  // globally (e.g. `* { outline: none }`). We verify that the close button
  // inside AgentDetailPanel does NOT have CSS that suppresses focus-visible.
  // jsdom does not compute stylesheet rules, so we assert the HTML element
  // carries no inline outline suppression and that the button is focusable
  // (tabIndex ≥ 0 or implicit from element type).

  it('close button is focusable (tabIndex not negative)', () => {
    render(<AgentDetailPanel agent={mockAgent} onClose={vi.fn()} />);
    const closeBtn = screen.getByTestId('agent-detail-close');
    // tabIndex -1 means programmatically focusable but not in tab order;
    // a button without explicit tabIndex defaults to 0 (in tab order).
    // The close button must be reachable by keyboard users.
    expect(closeBtn.tabIndex).toBeGreaterThanOrEqual(0);
  });

  it('panel root carries a tabIndex attribute enabling keyboard focus', () => {
    render(<AgentDetailPanel agent={mockAgent} onClose={vi.fn()} />);
    const panel = screen.getByTestId('agent-detail-panel');
    // tabIndex -1 is acceptable for the container (programmatic focus)
    // but it must be defined so the panel can receive focus for Esc handling.
    const tabIndex = parseInt(panel.getAttribute('tabindex') ?? '0', 10);
    expect(tabIndex).toBeGreaterThanOrEqual(-1);
    // Importantly, tabIndex should not be a large positive value that
    // disrupts tab order (anti-pattern: tabIndex > 0).
    expect(tabIndex).toBeLessThanOrEqual(0);
  });

  it('close button has no inline outline:none suppression', () => {
    render(<AgentDetailPanel agent={mockAgent} onClose={vi.fn()} />);
    const closeBtn = screen.getByTestId('agent-detail-close');
    // jsdom does not parse linked stylesheets; inline style is the only
    // thing we can check here. Playwright covers the computed-style path.
    const inlineOutline = closeBtn.style.outline;
    expect(inlineOutline).not.toBe('none');
    expect(inlineOutline).not.toBe('0');
  });
});

// ---------------------------------------------------------------------------
// UX-A11Y-SHORTCUT-01 — Esc closes panel; other keys do not
// ---------------------------------------------------------------------------

describe('UX-A11Y-SHORTCUT-01 — Escape key closes AgentDetailPanel', () => {
  it('pressing Escape fires onClose', () => {
    const handleClose = vi.fn();
    render(<AgentDetailPanel agent={mockAgent} onClose={handleClose} />);
    const panel = screen.getByTestId('agent-detail-panel');
    fireEvent.keyDown(panel, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('pressing Enter does NOT fire onClose', () => {
    const handleClose = vi.fn();
    render(<AgentDetailPanel agent={mockAgent} onClose={handleClose} />);
    const panel = screen.getByTestId('agent-detail-panel');
    fireEvent.keyDown(panel, { key: 'Enter', code: 'Enter' });
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('pressing Tab does NOT fire onClose', () => {
    const handleClose = vi.fn();
    render(<AgentDetailPanel agent={mockAgent} onClose={handleClose} />);
    const panel = screen.getByTestId('agent-detail-panel');
    fireEvent.keyDown(panel, { key: 'Tab', code: 'Tab' });
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('pressing Space does NOT fire onClose', () => {
    const handleClose = vi.fn();
    render(<AgentDetailPanel agent={mockAgent} onClose={handleClose} />);
    const panel = screen.getByTestId('agent-detail-panel');
    fireEvent.keyDown(panel, { key: ' ', code: 'Space' });
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('Escape fires onClose only once per keydown event', () => {
    const handleClose = vi.fn();
    render(<AgentDetailPanel agent={mockAgent} onClose={handleClose} />);
    const panel = screen.getByTestId('agent-detail-panel');
    // Simulate held-down key (repeated keydown events for same Esc press)
    fireEvent.keyDown(panel, { key: 'Escape', code: 'Escape', repeat: true });
    // Still called — the handler doesn't gate on repeat, but should not
    // double-call (one keydown event = one call regardless of repeat flag).
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not throw when onClose is not provided and Escape is pressed', () => {
    render(<AgentDetailPanel agent={mockAgent} />);
    const panel = screen.getByTestId('agent-detail-panel');
    expect(() => {
      fireEvent.keyDown(panel, { key: 'Escape', code: 'Escape' });
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// UX-A11Y-FOCUS-TRAP-01 — focus stays inside overlay when open
// ---------------------------------------------------------------------------

describe('UX-A11Y-FOCUS-TRAP-01 — focus must stay inside AgentDetailPanel while open', () => {
  // WHY: A focus trap means that Tab/Shift+Tab cycling remains within the
  // panel boundaries. jsdom does not implement real browser focus management,
  // so we test the structural precondition: the panel contains at least one
  // focusable interactive element that a keyboard user can reach.
  // The browser-level Tab cycling behaviour is tested in the Playwright layer.

  it('panel contains at least one focusable button for keyboard navigation', () => {
    render(<AgentDetailPanel agent={mockAgent} onClose={vi.fn()} />);
    const panel = screen.getByTestId('agent-detail-panel');
    const focusableButtons = within(panel).getAllByRole('button');
    expect(focusableButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('close button is accessible by role within panel', () => {
    render(<AgentDetailPanel agent={mockAgent} onClose={vi.fn()} />);
    const panel = screen.getByTestId('agent-detail-panel');
    // close button is inside panel — keyboard user can reach it via Tab
    const closeBtn = within(panel).getByTestId('agent-detail-close');
    expect(closeBtn.tagName.toLowerCase()).toBe('button');
    expect(closeBtn).toBeVisible();
  });

  it('panel root has tabIndex enabling programmatic focus on open', () => {
    render(<AgentDetailPanel agent={mockAgent} onClose={vi.fn()} />);
    const panel = screen.getByTestId('agent-detail-panel');
    // tabIndex -1 allows the container to receive programmatic focus
    // so focus management code can move focus into the panel on open.
    const tabIdx = parseInt(panel.getAttribute('tabindex') ?? '0', 10);
    expect(tabIdx).toBeGreaterThanOrEqual(-1);
  });

  it('backdrop click handler is present for mouse dismiss (paired with Esc)', () => {
    const handleClose = vi.fn();
    render(<AgentDetailPanel agent={mockAgent} onClose={handleClose} />);
    // WHY: The backdrop div has an onClick={onClose}. Verifying it is present
    // ensures the "click outside to close" and Esc paths are symmetric.
    const panel = screen.getByTestId('agent-detail-panel');
    const backdrop = panel.querySelector('.ad-backdrop');
    expect(backdrop).not.toBeNull();
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalledTimes(1);
    }
  });
});

// ---------------------------------------------------------------------------
// UX-A11Y-FOCUS-RESTORE-01 — focus returns to trigger element after close
// ---------------------------------------------------------------------------

describe('UX-A11Y-FOCUS-RESTORE-01 — focus must return to trigger element when panel closes', () => {
  // WHY: WCAG 2.1 SC 2.4.3 (Focus Order) requires that when a dialog closes,
  // focus is moved back to the element that triggered the dialog.
  // jsdom supports basic focus() / document.activeElement, so we test that:
  // (a) the trigger button retains its identity after a panel render cycle, and
  // (b) programmatic focus on the trigger works (enabling calling code to
  //     restore focus on onClose callback).

  it('trigger button can receive programmatic focus (pre-condition for restore)', () => {
    const { container } = render(
      <div>
        {/* Simulate a desk button that triggers the panel */}
        <button data-testid="desk-trigger">Open Agent</button>
        <AgentDetailPanel agent={mockAgent} onClose={vi.fn()} />
      </div>
    );
    const trigger = screen.getByTestId('desk-trigger');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);
  });

  it('onClose callback is invoked when close button is clicked (focus restore hook point)', () => {
    // WHY: The onClose callback is the integration point where calling code
    // should call triggerElement.focus(). We verify it fires on button click
    // so the restore contract is clear for implementors.
    const handleClose = vi.fn();
    render(<AgentDetailPanel agent={mockAgent} onClose={handleClose} />);
    const closeBtn = screen.getByTestId('agent-detail-close');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('onClose fires via Escape key as well as click (both are restore entry points)', () => {
    const handleClose = vi.fn();
    render(<AgentDetailPanel agent={mockAgent} onClose={handleClose} />);

    const panel = screen.getByTestId('agent-detail-panel');
    // Esc path
    fireEvent.keyDown(panel, { key: 'Escape' });
    // Click path
    const closeBtn = screen.getByTestId('agent-detail-close');
    fireEvent.click(closeBtn);

    // Both paths invoke onClose, giving the caller two hooks to restore focus.
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// UX-A11Y-ARIA-LANDMARK-01 — semantic landmarks in AppShell
// ---------------------------------------------------------------------------

describe('UX-A11Y-ARIA-LANDMARK-01 — AppShell must provide semantic landmark regions', () => {
  // WHY: ARIA landmarks (nav, main, header, footer) allow screen-reader users
  // to jump directly to key sections of the page. The AppShell must provide
  // at minimum a navigation region and a main content area.
  // We test AppShell with all external dependencies mocked.

  let rendered: RenderResult;

  // Local mocks for AppShell dependencies
  beforeEach(async () => {
    const { AppShell } = await import('../../src/routing/AppShell');
    rendered = render(
      <MemoryRouter initialEntries={['/plan']}>
        <AppShell />
      </MemoryRouter>
    );
  });

  afterEach(() => {
    cleanup();
    vi.resetModules();
  });

  it('Drawer renders as a nav landmark (role=navigation or <nav> element)', () => {
    // WHY: The Drawer contains nav-links and should be marked as navigation
    // region. The current impl uses a <div data-testid="drawer">; this test
    // asserts either (a) the drawer has role=navigation or (b) a nav element
    // wraps the links, OR (c) the test passes when we add the landmark later.
    // Failing here drives the a11y improvement.
    const drawer = document.querySelector('[data-testid="drawer"]');
    expect(drawer).not.toBeNull();
    const drawerTag = drawer?.tagName.toLowerCase();
    const drawerRole = drawer?.getAttribute('role');
    // Acceptable: <nav> or role="navigation"
    const isNavLandmark = drawerTag === 'nav' || drawerRole === 'navigation';
    expect(isNavLandmark).toBe(true);
  });

  it('main content area is a <main> element or has role=main', () => {
    // WHY: Screen readers use the main landmark to skip navigation.
    // The content div wrapping <Outlet/> / <RoomView> should be <main>.
    const mainEl = document.querySelector('main, [role="main"]');
    expect(mainEl).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// UX-A11Y-SCREENREADER-01 — nav links have accessible names
// ---------------------------------------------------------------------------

describe('UX-A11Y-SCREENREADER-01 — Drawer nav links must have accessible names', () => {
  // WHY: Screen-reader users navigate via link lists. Each NavLink in the
  // Drawer must announce its purpose. An accessible name comes from:
  //   - visible text content (preferred)
  //   - aria-label
  //   - title attribute
  // We test that every rendered nav-link has a non-empty accessible name.

  beforeEach(async () => {
    const { AppShell } = await import('../../src/routing/AppShell');
    render(
      // WHY /plan: avoids rendering RoomView (complex scenario deps) while still
      // exercising the AppShell Drawer and nav links under test.
      <MemoryRouter initialEntries={['/plan']}>
        <AppShell />
      </MemoryRouter>
    );
  });

  afterEach(() => {
    cleanup();
    vi.resetModules();
  });

  it('all nav-link elements have non-empty accessible name (text, aria-label, or title)', () => {
    const navLinks = document.querySelectorAll('[data-testid^="nav-link-"]');
    // WHY: We expect at least 2 nav links (room + one other) to be present.
    expect(navLinks.length).toBeGreaterThanOrEqual(2);

    navLinks.forEach((link) => {
      const textContent = link.textContent?.trim() ?? '';
      const ariaLabel = link.getAttribute('aria-label') ?? '';
      const title = link.getAttribute('title') ?? '';
      const hasAccessibleName = textContent.length > 0 || ariaLabel.length > 0 || title.length > 0;
      expect(hasAccessibleName, `nav-link ${link.getAttribute('data-testid')} has no accessible name`).toBe(true);
    });
  });

  it('each nav-link renders as an anchor element for keyboard navigation', () => {
    const navLinks = document.querySelectorAll('[data-testid^="nav-link-"]');
    navLinks.forEach((link) => {
      // NavLink renders as <a> — this makes it keyboard-focusable by default
      expect(link.tagName.toLowerCase(), `nav-link ${link.getAttribute('data-testid')} should be <a>`).toBe('a');
    });
  });
});
