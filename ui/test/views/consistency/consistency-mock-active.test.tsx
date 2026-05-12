/**
 * ConsistencyView × scenario.active — redesign port smoke tests (M0.15 t11)
 *
 * WHY: The existing ConsistencyView uses hardcoded MOCK_FINDINGS fixture.
 * After the redesign port, ConsistencyView is driven by useScenario().findings
 * and useScenario().consistencyState — this suite mocks useScenario to verify:
 *   - 5 findings rendered with id + title
 *   - severity badge (high/medium/low) per finding
 *   - status badge (open/ack/fixed/dismissed) per finding
 *   - 4 action buttons (ack/fix/dismiss/discuss) for open findings
 *   - expandable detail+suggest sections
 *   - empty state when consistencyState === "empty"
 *
 * REQ-070 acceptance criteria.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// ---------------------------------------------------------------------------
// Hoisted mock factory — vi.fn() so we can override per test
// WHY: useScenario must be a vi.fn() to allow mockReturnValueOnce overrides
// ---------------------------------------------------------------------------
const { mockUseScenario } = vi.hoisted(() => ({
  mockUseScenario: vi.fn(),
}));

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: mockUseScenario,
}));

// Static 5-finding fixture — mirrors scenarios.js active scenario
const ACTIVE_SCENARIO: Pick<Scenario, 'findings' | 'consistencyState'> = {
  findings: [
    {
      id: 'F-12',
      sev: 'high',
      status: 'open',
      file: 'docs/SCREEN_REQUIREMENTS.md',
      lines: 'L284-L298',
      title: '§3.6 ガント縦軸定義が SPEC §3.6.5 と矛盾',
      detail: 'SCREEN_REQUIREMENTS は subagent 1 体 = 1 bar。SPEC は worktree 単位を想定。',
      suggest: 'SPEC §3.6.5 を SubagentRow ベースに修正、worktree グループ化を §3.9 へ移管',
      source: 'spec_diff (4h ago)',
    },
    {
      id: 'F-11',
      sev: 'high',
      status: 'ack',
      file: 'agents/loom-developer.md',
      lines: 'L42-L51',
      title: 'Developer の TDD red 順序定義が CODING_PRINCIPLES と乖離',
      detail: 'developer は test → impl → refactor の3段。原則は4段。',
      suggest: 'agent prompt に review 段階を追加',
      source: 'spec_diff (yesterday)',
    },
    {
      id: 'F-10',
      sev: 'medium',
      status: 'fixed',
      file: 'docs/RETRO_GUIDE.md',
      lines: 'L88',
      title: 'retro lens 名称が SPEC §3.7 と微妙に違う',
      detail: '用語ゆらぎ。codebase 全体 grep で 7 箇所。',
      suggest: '用語を counter-arguer に統一',
      source: 'spec_diff (2 days ago)',
    },
    {
      id: 'F-09',
      sev: 'low',
      status: 'dismissed',
      file: 'skills/loom-worktree/SKILL.md',
      lines: 'L120',
      title: 'worktree 5 用途のうち 1 つ (hotfix) の例が古い CLI 引数を使用',
      detail: '`--branch` は v0.8 で `--from` にリネーム済み',
      suggest: 'サンプル更新',
      source: 'manual (you)',
    },
    {
      id: 'F-08',
      sev: 'high',
      status: 'open',
      file: 'agents/loom-pm.md',
      lines: 'L103-L115',
      title: 'PM agent の review_mode 判定順序が SPEC §3.6.6.1 と乖離',
      detail: 'PM が meta block を先に読む仕様だが、agent prompt では project.json を先読みしている。',
      suggest: 'loom-meta block を最優先に、project.json は fallback に変更',
      source: 'spec_diff (3h ago)',
    },
  ],
  consistencyState: 'has-findings',
};

import { ConsistencyView } from '../../../src/views/consistency/ConsistencyView';

beforeEach(() => {
  mockUseScenario.mockClear();
  mockUseScenario.mockReturnValue(ACTIVE_SCENARIO as unknown as Scenario);
});

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Findings list — has-findings state
// ---------------------------------------------------------------------------
describe('ConsistencyView × scenario.active — findings list', () => {
  it('renders all 5 findings with id + title', () => {
    render(<ConsistencyView />);
    // Check IDs
    expect(screen.getByText('F-12')).toBeInTheDocument();
    expect(screen.getByText('F-11')).toBeInTheDocument();
    expect(screen.getByText('F-10')).toBeInTheDocument();
    expect(screen.getByText('F-09')).toBeInTheDocument();
    expect(screen.getByText('F-08')).toBeInTheDocument();
    // Check titles
    expect(screen.getByText('§3.6 ガント縦軸定義が SPEC §3.6.5 と矛盾')).toBeInTheDocument();
    expect(screen.getByText('PM agent の review_mode 判定順序が SPEC §3.6.6.1 と乖離')).toBeInTheDocument();
  });

  it('renders severity badge (high/medium/low) per finding', () => {
    const { container } = render(<ConsistencyView />);
    // Expect severity badges with data-sev attribute
    const highBadges = container.querySelectorAll('[data-sev="high"]');
    const medBadges = container.querySelectorAll('[data-sev="medium"]');
    const lowBadges = container.querySelectorAll('[data-sev="low"]');
    expect(highBadges.length).toBeGreaterThanOrEqual(1);
    expect(medBadges.length).toBeGreaterThanOrEqual(1);
    expect(lowBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders status badge (open/ack/fixed/dismissed)', () => {
    render(<ConsistencyView />);
    // F-11 has status 'ack', F-10 has status 'fixed', F-09 has status 'dismissed'
    // Status badges should be visible for non-open statuses
    expect(screen.getByTestId('status-badge-F-11')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-F-10')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-F-09')).toBeInTheDocument();
  });

  it('renders 4 action buttons (ack/fix/dismiss/discuss) per open finding', () => {
    const { container } = render(<ConsistencyView />);
    // F-12 and F-08 are 'open' — each should show ack + fix + dismiss + discuss buttons
    const ackButtons = container.querySelectorAll('[data-action="ack"]');
    const fixButtons = container.querySelectorAll('[data-action="fix"]');
    const dismissButtons = container.querySelectorAll('[data-action="dismiss"]');
    const discussButtons = container.querySelectorAll('[data-action="discuss"]');
    expect(ackButtons.length).toBeGreaterThanOrEqual(2);   // F-12 + F-08
    expect(fixButtons.length).toBeGreaterThanOrEqual(2);
    expect(dismissButtons.length).toBeGreaterThanOrEqual(2);
    expect(discussButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('expandable detail+suggest sections show on click', () => {
    render(<ConsistencyView />);
    // Find a toggle button for F-12 and click it
    const expandBtn = screen.getByTestId('expand-btn-F-12');
    expect(expandBtn).toBeInTheDocument();
    // Before expand, detail may be hidden
    fireEvent.click(expandBtn);
    // After click, detail text should be visible
    expect(screen.getByTestId('detail-F-12')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
describe('ConsistencyView × scenario.active — empty state', () => {
  it('switches to empty state when consistencyState === "empty"', () => {
    mockUseScenario.mockReturnValueOnce({
      findings: [],
      consistencyState: 'empty',
    } as unknown as Scenario);

    render(<ConsistencyView />);
    expect(screen.getByTestId('consistency-empty')).toBeInTheDocument();
  });
});
