/**
 * RetroView TDD tests — updated for M0.15 t12 redesign port.
 *
 * WHY: The original M2 / M0.11.4 t14 test used hardcoded MOCK_* fixture
 * (RPG style: rpg-frame, rpg-title, rpg-label). After M0.15 t12 redesign
 * port, RetroView uses useScenario().retroSession as sole data source.
 * This test suite is updated to mock useScenario() and verify the redesign
 * visual contract (transcript player + lens cards + findings + action plan).
 *
 * Test behavior, not implementation (CODING_PRINCIPLES #8).
 * The old rpg-frame / rpg-title / retro-session-info testids no longer
 * exist in the redesign-driven view (visual SSoT: redesign/screens/retro.jsx).
 *
 * REQ-072 acceptance criteria (regression suite).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// WHY: Mock useScenario so tests never touch the real WS store.
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      retroSession: {
        id: 'retro-M0.12',
        title: 'Retro #M0.12 — 2026-04-29',
        startedAt: '2026-04-29T17:30:00+09:00',
        durationSec: 1820,
        verdict: 'PASS',
        actionPlan: { immediate: 3, milestone: 4, deferred: 1 },
        lenses: [
          { id: 'retro-pj',   lensName: 'PJ Judge',      count: 3, sev: ['high', 'med', 'low'] },
          { id: 'retro-proc', lensName: 'Process Judge',  count: 2, sev: ['high', 'med'] },
          { id: 'retro-meta', lensName: 'Meta Judge',     count: 1, sev: ['med'] },
          { id: 'user',       lensName: 'User Lens',      count: 2, sev: ['high', 'low'], isUser: true },
        ],
        transcript: [
          { ts: 0,   who: 'retro-pm',      kind: 'intro',   text: 'M0.12 振り返り、開始しまーす。' },
          { ts: 45,  who: 'retro-research', kind: 'report',  text: '発射回数 14 件、並列度 47%...' },
          { ts: 120, who: 'retro-pj',       kind: 'finding', refId: 'R-2', sev: 'high', text: 'PR #42 の verdict が証拠不足。' },
          { ts: 200, who: 'retro-agg',      kind: 'verdict', text: '総合 PASS。action plan 確定。' },
        ],
        findings: [
          { id: 'R-1', sev: 'high', lens: 'retro-proc', title: 'TDD red 順序が 1 commit 飛んでいる', target: 'auth.test.ts:42', status: 'open', category: 'process' },
          { id: 'R-2', sev: 'high', lens: 'retro-pj',   title: 'PR #42 の verdict 証拠が薄い',        target: 'PR #42',          status: 'open', category: 'review' },
          { id: 'R-3', sev: 'high', lens: 'user',       title: '並列度がここ 3 日で 60% → 40%',       target: 'metrics',         status: 'open', category: 'process' },
          { id: 'R-4', sev: 'med',  lens: 'retro-meta', title: 'reviewer の personality が混ざっている', target: 'config',       status: 'deferred', category: 'meta' },
        ],
      },
    } as unknown as Scenario),
}));

import { RetroView } from '../../src/views/retro/RetroView';

afterEach(() => {
  cleanup();
});

describe('RetroView — basic render', () => {
  it('renders without crashing', () => {
    const { container } = render(<RetroView />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders session title section', () => {
    render(<RetroView />);
    const titleEl = screen.getByTestId('retro-session-title');
    expect(titleEl).toBeInTheDocument();
    expect(titleEl.textContent).toContain('Retro #M0.12');
  });

  it('renders 4 lens cards', () => {
    render(<RetroView />);
    expect(screen.getByTestId('lens-card-retro-pj')).toBeInTheDocument();
    expect(screen.getByTestId('lens-card-retro-proc')).toBeInTheDocument();
    expect(screen.getByTestId('lens-card-retro-meta')).toBeInTheDocument();
    expect(screen.getByTestId('lens-card-user')).toBeInTheDocument();
  });
});

describe('RetroView — findings list (mock data: 4 findings)', () => {
  it('renders 4 finding items', () => {
    const { container } = render(<RetroView />);
    const findings = container.querySelectorAll('[data-testid="finding-item"]');
    expect(findings.length).toBe(4);
  });

  it('renders finding severity and category badges', () => {
    render(<RetroView />);
    const r1 = screen.getByTestId('finding-R-1');
    expect(r1.querySelector('[data-testid="finding-sev"]')?.textContent).toContain('high');
    expect(r1.querySelector('[data-testid="finding-category"]')?.textContent).toContain('process');
  });
});

describe('RetroView — action buttons per finding', () => {
  it('renders "accept" button for each finding', () => {
    render(<RetroView />);
    const acceptButtons = screen.getAllByRole('button', { name: /accept/i });
    expect(acceptButtons.length).toBe(4);
  });

  it('renders "reject" button for each finding', () => {
    render(<RetroView />);
    const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
    expect(rejectButtons.length).toBe(4);
  });

  it('renders "defer" button for each finding', () => {
    render(<RetroView />);
    const deferButtons = screen.getAllByRole('button', { name: /defer/i });
    expect(deferButtons.length).toBe(4);
  });

  it('renders "discuss" button for each finding', () => {
    render(<RetroView />);
    const discussButtons = screen.getAllByRole('button', { name: /discuss/i });
    expect(discussButtons.length).toBe(4);
  });
});

describe('RetroView — lens summary detail', () => {
  it('renders lens names in cards', () => {
    render(<RetroView />);
    expect(screen.getByText('PJ Judge')).toBeInTheDocument();
    expect(screen.getByText('Process Judge')).toBeInTheDocument();
    expect(screen.getByText('Meta Judge')).toBeInTheDocument();
    expect(screen.getByText('User Lens')).toBeInTheDocument();
  });

  it('renders user lens with isUser highlight', () => {
    render(<RetroView />);
    const userCard = screen.getByTestId('lens-card-user');
    expect(userCard.getAttribute('data-is-user')).toBe('true');
  });
});

describe('RetroView — transcript timeline', () => {
  it('renders transcript entries', () => {
    const { container } = render(<RetroView />);
    const entries = container.querySelectorAll('[data-testid="transcript-entry"]');
    expect(entries.length).toBe(4);
  });

  it('renders kind badges (intro, report, finding, verdict)', () => {
    render(<RetroView />);
    expect(screen.getAllByTestId('transcript-kind-intro').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('transcript-kind-report').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('transcript-kind-finding').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('transcript-kind-verdict').length).toBeGreaterThan(0);
  });
});

describe('RetroView — action plan tally', () => {
  it('renders action plan section', () => {
    render(<RetroView />);
    expect(screen.getByTestId('action-plan')).toBeInTheDocument();
  });

  it('renders immediate / milestone / deferred counts', () => {
    render(<RetroView />);
    expect(screen.getByTestId('action-plan-immediate').textContent).toContain('3');
    expect(screen.getByTestId('action-plan-milestone').textContent).toContain('4');
    expect(screen.getByTestId('action-plan-deferred').textContent).toContain('1');
  });

  it('renders verdict badge', () => {
    render(<RetroView />);
    const badge = screen.getByTestId('retro-verdict-badge');
    expect(badge.textContent).toContain('PASS');
  });
});
