/**
 * SessionListView × scenario.active — redesign port smoke tests (M0.15 t8)
 *
 * WHY: The existing SessionListView uses useSessionList (live daemon hook)
 * with hardcoded fixture. After the redesign port, SessionListView is driven
 * by useScenario().sessions — this suite mocks useScenario to verify the
 * redesign-driven view renders:
 *   - 7 session entries from scenario.sessions
 *   - verdict badge (PASS/FAIL) per entry
 *   - filesTouched / relatedFindings / relatedRetro per entry
 *   - search input + filter bar (agent filter + verdict filter)
 *   - search interaction narrows entries
 *
 * REQ-068 acceptance criteria.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// WHY: Mock useScenario so the component never touches the real WS store.
// The mock fixture mirrors the scenario.sessions shape from scenarios.js.
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
          filesTouched: ['src/services/user.service.ts', 'src/services/user.service.test.ts', 'PR #42'],
          relatedFindings: ['F-12'],
          relatedRetro: 'retro-2026-04-29',
          summary: 'M0.13 §3.6 ガント定義の議論 + auth 重複メール拒否 TDD',
        },
        {
          id: 's-2026-04-28-0930',
          startedAt: '2026-04-28 09:30',
          durationSec: 2400,
          agentRoot: 'dev',
          turns: 52,
          verdict: 'PASS',
          filesTouched: ['ui/src/views/room/RoomView.tsx', 'ui/test/views/room.test.tsx'],
          relatedFindings: [],
          relatedRetro: undefined,
          summary: 'M0.11.4 RoomView RPG redesign + CatSprite integration',
        },
        {
          id: 's-2026-04-27-1430',
          startedAt: '2026-04-27 14:30',
          durationSec: 3600,
          agentRoot: 'pm',
          turns: 71,
          verdict: 'FAIL',
          filesTouched: ['SPEC.md', 'PLAN.md', 'agents/loom-pm.md'],
          relatedFindings: ['F-07', 'F-08'],
          relatedRetro: 'retro-2026-04-27',
          summary: 'M0.10 worktree skill 設計 + TDD violation self-finding',
        },
        {
          id: 's-2026-04-26-1100',
          startedAt: '2026-04-26 11:00',
          durationSec: 1200,
          agentRoot: 'rev',
          turns: 21,
          verdict: 'PASS',
          filesTouched: ['daemon/src/routes/session.ts'],
          relatedFindings: [],
          relatedRetro: undefined,
          summary: 'M0.9 daemon session route review + findings clear',
        },
        {
          id: 's-2026-04-25-0900',
          startedAt: '2026-04-25 09:00',
          durationSec: 2700,
          agentRoot: 'dev',
          turns: 45,
          verdict: 'PASS',
          filesTouched: ['daemon/src/db/schema.ts', 'daemon/src/routes/events.ts', 'daemon/test/events.test.ts'],
          relatedFindings: ['F-05'],
          relatedRetro: 'retro-2026-04-25',
          summary: 'M0.8 daemon events schema + retro learned guidance 初期 wiring',
        },
        {
          id: 's-2026-04-24-1600',
          startedAt: '2026-04-24 16:00',
          durationSec: 900,
          agentRoot: 'rev-sec',
          turns: 15,
          verdict: 'PASS',
          filesTouched: ['daemon/src/security/token.ts'],
          relatedFindings: [],
          relatedRetro: undefined,
          summary: 'M0.7 security token nanoid 256-bit review — pass',
        },
        {
          id: 's-2026-04-23-1030',
          startedAt: '2026-04-23 10:30',
          durationSec: 4200,
          agentRoot: 'pm',
          turns: 88,
          verdict: 'FAIL',
          filesTouched: ['SPEC.md', 'PLAN.md', 'tests/REQUIREMENTS.md', 'docs/plans/m0-6.md'],
          relatedFindings: ['F-01', 'F-02', 'F-03'],
          relatedRetro: 'retro-2026-04-23',
          summary: 'M0.6 reviewer trio 設計 + 初回 batch dispatch 失敗 triage',
        },
      ],
    }) as unknown as Scenario,
}));

import { SessionListView } from '../../../src/views/session-list/SessionListView';

afterEach(() => {
  cleanup();
});

describe('SessionListView × scenario.active', () => {
  it('renders all 7 session entries', () => {
    render(<SessionListView />);
    const entries = screen.getAllByTestId('session-entry');
    expect(entries).toHaveLength(7);
  });

  it('renders verdict badge (PASS/FAIL) per entry', () => {
    render(<SessionListView />);
    const badges = screen.getAllByTestId('session-verdict-badge');
    expect(badges).toHaveLength(7);
    // 5 PASS, 2 FAIL in the mock fixture
    const passCount = badges.filter(b => b.textContent === 'PASS').length;
    const failCount = badges.filter(b => b.textContent === 'FAIL').length;
    expect(passCount).toBe(5);
    expect(failCount).toBe(2);
  });

  it('renders filesTouched / relatedFindings / relatedRetro for each entry', () => {
    render(<SessionListView />);
    // First entry: 3 filesTouched, 1 relatedFinding, 1 relatedRetro
    // Check files are visible in the first entry
    expect(screen.getByText('src/services/user.service.ts')).toBeInTheDocument();
    // Check relatedRetro is visible
    expect(screen.getByText('retro-2026-04-29')).toBeInTheDocument();
    // Check relatedFinding chip
    expect(screen.getByText(/F-12/)).toBeInTheDocument();
  });

  it('renders search input + filter bar', () => {
    render(<SessionListView />);
    // Search input
    const searchInput = screen.getByTestId('session-search-input');
    expect(searchInput).toBeInTheDocument();
    // Agent filter
    const agentFilter = screen.getByTestId('session-filter-agent');
    expect(agentFilter).toBeInTheDocument();
    // Verdict filter
    const verdictFilter = screen.getByTestId('session-filter-verdict');
    expect(verdictFilter).toBeInTheDocument();
  });

  it('search input narrows entries (interaction)', () => {
    render(<SessionListView />);
    const entries = screen.getAllByTestId('session-entry');
    expect(entries).toHaveLength(7);

    const searchInput = screen.getByTestId('session-search-input');
    // Search for something unique to only the first entry
    fireEvent.change(searchInput, { target: { value: 'auth 重複メール拒否' } });

    const filteredEntries = screen.getAllByTestId('session-entry');
    expect(filteredEntries).toHaveLength(1);
    expect(filteredEntries[0].textContent).toContain('auth 重複メール拒否');
  });
});
