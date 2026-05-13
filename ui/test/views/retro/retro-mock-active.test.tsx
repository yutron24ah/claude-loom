/**
 * RetroView × scenario.active — redesign port smoke tests (M0.15 t12)
 *
 * WHY: The existing retro.test.tsx covers the old RetroView (hardcoded MOCK_* fixture,
 * RPG style). This suite mocks useScenario (the new redesign hook) to verify the
 * redesign-driven RetroView renders:
 *   - retroSession title + verdict (PASS)
 *   - 4 lens cards (retro-pj, retro-proc, retro-meta, user)
 *   - user lens with isUser highlight
 *   - 4 findings with severity badge + category
 *   - transcript timeline with kind icons (intro/report/finding/rebuttal/verdict)
 *   - action plan tally (immediate: 3, milestone: 4, deferred: 1)
 *
 * REQ-072 acceptance criteria.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// WHY: Mock useScenario so the component never touches the real WS store.
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      retroSession: {
        id: 'retro-2026-04-29',
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
          { ts: 0,   who: 'retro-pm',       kind: 'intro',   text: 'M0.12 振り返り、開始しまーす。' },
          { ts: 45,  who: 'retro-research',  kind: 'report',  text: '発射回数 14 件、並列度 47%...' },
          { ts: 120, who: 'retro-pj',        kind: 'finding', refId: 'R-3', sev: 'high', text: 'PR #42 の verdict が証拠不足。' },
          { ts: 200, who: 'retro-proc',      kind: 'finding', refId: 'R-1', sev: 'high', text: 'TDD red 順序が 1 commit 飛んでる。' },
          { ts: 300, who: 'retro-counter',   kind: 'rebuttal', text: 'R-3 に対する反証: 証拠は十分と見なせる。' },
          { ts: 400, who: 'retro-meta',      kind: 'finding', refId: 'R-4', sev: 'med', text: 'reviewer の personality が混ざっている。' },
          { ts: 500, who: 'user',            kind: 'report',  text: '並列度がここ 3 日で 60% → 40%。' },
          { ts: 600, who: 'retro-agg',       kind: 'verdict', text: '総合 PASS。action plan 確定。' },
        ],
        findings: [
          { id: 'R-1', sev: 'high', lens: 'retro-proc', title: 'TDD red 順序が 1 commit 飛んでる', target: 'auth.test.ts:42', status: 'open', category: 'process' },
          { id: 'R-2', sev: 'high', lens: 'retro-pj',   title: 'PR #42 の verdict 証拠が薄い',    target: 'PR #42',          status: 'open', category: 'review' },
          { id: 'R-3', sev: 'high', lens: 'user',       title: '並列度がここ 3 日で 60% → 40%', target: 'metrics',         status: 'open', category: 'process' },
          { id: 'R-4', sev: 'med',  lens: 'retro-meta', title: 'reviewer の personality が混ざっている', target: 'config', status: 'deferred', category: 'meta' },
        ],
      },
    } as unknown as Scenario),
}));

// Import after mock
import { RetroView } from '../../../src/views/retro/RetroView';

afterEach(() => {
  cleanup();
});

describe('RetroView × scenario.active', () => {
  it('renders retroSession title + verdict (PASS)', () => {
    render(<RetroView />);
    // Title from retroSession.title
    expect(screen.getByTestId('retro-session-title').textContent).toContain('Retro #M0.12 — 2026-04-29');
    // Verdict badge shows PASS
    const verdictBadge = screen.getByTestId('retro-verdict-badge');
    expect(verdictBadge.textContent).toContain('PASS');
  });

  it('renders 4 lens cards (retro-pj, retro-proc, retro-meta, user)', () => {
    render(<RetroView />);
    expect(screen.getByTestId('lens-card-retro-pj')).toBeDefined();
    expect(screen.getByTestId('lens-card-retro-proc')).toBeDefined();
    expect(screen.getByTestId('lens-card-retro-meta')).toBeDefined();
    expect(screen.getByTestId('lens-card-user')).toBeDefined();
    // Lens names rendered
    expect(screen.getByText('PJ Judge')).toBeDefined();
    expect(screen.getByText('Process Judge')).toBeDefined();
    expect(screen.getByText('Meta Judge')).toBeDefined();
    expect(screen.getByText('User Lens')).toBeDefined();
  });

  it('renders user lens with isUser highlight', () => {
    render(<RetroView />);
    const userCard = screen.getByTestId('lens-card-user');
    // isUser=true → data-is-user attribute or highlight class
    expect(userCard.getAttribute('data-is-user')).toBe('true');
  });

  it('renders 4 findings with severity badge + category', () => {
    render(<RetroView />);
    // 4 findings
    const findings = screen.getAllByTestId('finding-item');
    expect(findings.length).toBe(4);
    // Each finding has sev badge and category badge
    const r1 = screen.getByTestId('finding-R-1');
    expect(r1.querySelector('[data-testid="finding-sev"]')?.textContent).toContain('high');
    expect(r1.querySelector('[data-testid="finding-category"]')?.textContent).toContain('process');
    const r4 = screen.getByTestId('finding-R-4');
    expect(r4.querySelector('[data-testid="finding-sev"]')?.textContent).toContain('med');
    expect(r4.querySelector('[data-testid="finding-category"]')?.textContent).toContain('meta');
  });

  it('renders transcript timeline with kind icons (intro/report/finding/rebuttal/verdict)', () => {
    render(<RetroView />);
    // transcript entries are all visible (cursor = transcript.length - 1 by default)
    const entries = screen.getAllByTestId('transcript-entry');
    expect(entries.length).toBe(8);
    // Kind labels rendered — use getAllByTestId since some kinds appear multiple times
    expect(screen.getAllByTestId('transcript-kind-intro').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('transcript-kind-report').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('transcript-kind-finding').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('transcript-kind-rebuttal').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('transcript-kind-verdict').length).toBeGreaterThan(0);
  });

  it('renders action plan tally (immediate: 3, milestone: 4, deferred: 1)', () => {
    render(<RetroView />);
    const actionPlan = screen.getByTestId('action-plan');
    expect(actionPlan).toBeDefined();
    // Tally values
    expect(screen.getByTestId('action-plan-immediate').textContent).toContain('3');
    expect(screen.getByTestId('action-plan-milestone').textContent).toContain('4');
    expect(screen.getByTestId('action-plan-deferred').textContent).toContain('1');
  });
});
