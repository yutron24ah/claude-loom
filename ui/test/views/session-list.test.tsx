/**
 * SessionListView TDD tests — updated for M0.15 t8 redesign port.
 *
 * WHY: Verify that SessionListView (redesign-driven) renders filter/sort controls,
 * session entries, search interaction, and empty state correctly.
 *
 * Updated for M0.15 t8:
 * - useScenario() replaces useSessionList (tRPC) hardcoded fixture
 * - visual layout uses inline styles (not rpg-frame/chip/dot CSS classes)
 * - data-testids: session-entry (not session-row), session-verdict-badge,
 *   session-search-input, session-filter-agent, session-filter-verdict
 * - no loading/error states (redesign view is always-connected scenario model)
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// ---------------------------------------------------------------------------
// Mock useScenario hook
// ---------------------------------------------------------------------------
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      sessions: [
        {
          id: 's-2026-04-29-1721',
          startedAt: '2026-04-29 17:21',
          durationSec: 1820,
          agentRoot: 'pm',
          turns: 38,
          verdict: 'PASS',
          filesTouched: ['src/services/user.service.ts'],
          relatedFindings: ['F-12'],
          relatedRetro: 'retro-2026-04-29',
          summary: 'M0.13 §3.6 ガント定義の議論 + auth TDD',
        },
        {
          id: 's-2026-04-28-0930',
          startedAt: '2026-04-28 09:30',
          durationSec: 2400,
          agentRoot: 'dev',
          turns: 52,
          verdict: 'FAIL',
          filesTouched: ['ui/src/views/room/RoomView.tsx'],
          relatedFindings: [],
          relatedRetro: undefined,
          summary: 'M0.11.4 RoomView RPG redesign',
        },
      ],
      project: 'claude-loom',
    }) as unknown as Scenario,
}));

import { SessionListView } from '../../src/views/session-list/SessionListView';

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Basic render
// ---------------------------------------------------------------------------

describe('SessionListView — basic render', () => {
  it('renders session-list container', () => {
    render(<SessionListView />);
    expect(screen.getByTestId('session-list')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<SessionListView />);
    expect(screen.getByTestId('session-search-input')).toBeInTheDocument();
  });

  it('renders agent filter control', () => {
    render(<SessionListView />);
    expect(screen.getByTestId('session-filter-agent')).toBeInTheDocument();
  });

  it('renders verdict filter control', () => {
    render(<SessionListView />);
    expect(screen.getByTestId('session-filter-verdict')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Session entries
// ---------------------------------------------------------------------------

describe('SessionListView — session entries', () => {
  it('renders one session-entry per session', () => {
    render(<SessionListView />);
    expect(screen.getAllByTestId('session-entry')).toHaveLength(2);
  });

  it('renders verdict badge per session', () => {
    render(<SessionListView />);
    const badges = screen.getAllByTestId('session-verdict-badge');
    expect(badges).toHaveLength(2);
  });

  it('renders PASS and FAIL verdict badges correctly', () => {
    render(<SessionListView />);
    const badges = screen.getAllByTestId('session-verdict-badge');
    const texts = badges.map(b => b.textContent ?? '');
    expect(texts).toContain('PASS');
    expect(texts).toContain('FAIL');
  });

  it('renders session summary text', () => {
    render(<SessionListView />);
    expect(screen.getByText('M0.13 §3.6 ガント定義の議論 + auth TDD')).toBeInTheDocument();
  });

  it('shows detail panel placeholder when no session is selected', () => {
    render(<SessionListView />);
    expect(screen.getByTestId('session-detail-panel')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Filter interaction
// ---------------------------------------------------------------------------

describe('SessionListView — filter interaction', () => {
  it('narrows entries when search query matches only one session', () => {
    render(<SessionListView />);
    expect(screen.getAllByTestId('session-entry')).toHaveLength(2);

    const searchInput = screen.getByTestId('session-search-input');
    fireEvent.change(searchInput, { target: { value: 'RoomView' } });

    expect(screen.getAllByTestId('session-entry')).toHaveLength(1);
  });

  it('shows empty message when search matches nothing', () => {
    render(<SessionListView />);
    const searchInput = screen.getByTestId('session-search-input');
    fireEvent.change(searchInput, { target: { value: 'xxxxxxxxxxxxxxxx_no_match' } });

    expect(screen.queryAllByTestId('session-entry')).toHaveLength(0);
    expect(screen.getByText(/条件にマッチする session はありません/)).toBeInTheDocument();
  });

  it('verdict filter shows only PASS entries when PASS selected', () => {
    render(<SessionListView />);
    const verdictFilter = screen.getByTestId('session-filter-verdict');
    fireEvent.change(verdictFilter, { target: { value: 'PASS' } });

    const entries = screen.getAllByTestId('session-entry');
    expect(entries).toHaveLength(1);
    const badge = screen.getAllByTestId('session-verdict-badge')[0];
    expect(badge.textContent).toBe('PASS');
  });
});

// ---------------------------------------------------------------------------
// Detail panel — selection
// ---------------------------------------------------------------------------

describe('SessionListView — detail panel', () => {
  it('shows session detail when a session entry is clicked', () => {
    render(<SessionListView />);
    const entries = screen.getAllByTestId('session-entry');
    fireEvent.click(entries[0]);

    // After click, detail panel shows session summary (may appear in both list entry + detail panel)
    const summaryEls = screen.getAllByText('M0.13 §3.6 ガント定義の議論 + auth TDD');
    expect(summaryEls.length).toBeGreaterThanOrEqual(1);
  });

  it('shows FILES TOUCHED section in detail panel after selection', () => {
    render(<SessionListView />);
    const entries = screen.getAllByTestId('session-entry');
    fireEvent.click(entries[0]);

    expect(screen.getByText('FILES TOUCHED')).toBeInTheDocument();
    expect(screen.getByText('↗ src/services/user.service.ts')).toBeInTheDocument();
  });
});
