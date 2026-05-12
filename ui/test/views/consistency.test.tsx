/**
 * ConsistencyView TDD tests — Red phase (Task 9 Subagent C)
 * WHY: verify consistency findings render with severity badges and 4 action buttons.
 * SCREEN_REQUIREMENTS §3.4 / §4.3
 *
 * Updated for M0.15 t11 redesign port:
 * ConsistencyView now uses useScenario() from redesign/api/websocket.
 * WHY: mock useScenario so the component never touches the real WS store.
 * Fixture mirrors MOCK_FINDINGS from M0.11.4 for backward compatibility.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// ---------------------------------------------------------------------------
// Mock useScenario with same fixture as old MOCK_FINDINGS (all sev + all status)
// WHY: existing tests were written against M0.11.4 hardcoded fixture containing
//      all severity/status combinations. Mock preserves that contract.
// ---------------------------------------------------------------------------
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
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
          detail: 'developer は test → impl → refactor の 3 段。原則は4段。',
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
          source: 'spec_diff (2d ago)',
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
        {
          id: 'F-07',
          sev: 'medium',
          status: 'open',
          file: 'docs/CODING_PRINCIPLES.md',
          lines: 'L55-L60',
          title: 'Boy Scout Rule の scope 記述が CLAUDE.md と異なる',
          detail: 'CODING_PRINCIPLES は "PR スコープ"、CLAUDE.md は "sprawl 禁止" と表現差異あり。',
          suggest: '"scoped to PR" に表現を統一',
          source: 'spec_diff (1d ago)',
        },
      ],
      consistencyState: 'has-findings',
    } as unknown as Scenario),
}));

import { ConsistencyView } from '../../src/views/consistency/ConsistencyView';

afterEach(() => {
  cleanup();
});

describe('ConsistencyView — basic render', () => {
  it('renders the consistency view container', () => {
    render(<ConsistencyView />);
    expect(screen.getByTestId('consistency-view')).toBeInTheDocument();
  });

  it('renders the section title mentioning Consistency', () => {
    render(<ConsistencyView />);
    expect(screen.getByTestId('consistency-title')).toBeInTheDocument();
  });
});

describe('ConsistencyView — finding count', () => {
  it('renders 5-8 finding cards (data-testid=finding-card)', () => {
    render(<ConsistencyView />);
    const cards = screen.getAllByTestId('finding-card');
    expect(cards.length).toBeGreaterThanOrEqual(5);
    expect(cards.length).toBeLessThanOrEqual(8);
  });

  it('renders severity badges for each finding', () => {
    render(<ConsistencyView />);
    const badges = screen.getAllByTestId('finding-severity');
    expect(badges.length).toBeGreaterThanOrEqual(5);
  });
});

describe('ConsistencyView — severity display', () => {
  it('renders at least one high severity finding', () => {
    render(<ConsistencyView />);
    const highBadges = screen.getAllByTestId('severity-high');
    expect(highBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders at least one medium severity finding', () => {
    render(<ConsistencyView />);
    const mediumBadges = screen.getAllByTestId('severity-medium');
    expect(mediumBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders at least one low severity finding', () => {
    render(<ConsistencyView />);
    const lowBadges = screen.getAllByTestId('severity-low');
    expect(lowBadges.length).toBeGreaterThanOrEqual(1);
  });
});

describe('ConsistencyView — action buttons', () => {
  it('renders Acknowledge buttons for open findings', () => {
    render(<ConsistencyView />);
    const buttons = screen.getAllByTestId('action-acknowledge');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Mark Fixed buttons', () => {
    render(<ConsistencyView />);
    const buttons = screen.getAllByTestId('action-mark-fixed');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Dismiss buttons for open findings', () => {
    render(<ConsistencyView />);
    const buttons = screen.getAllByTestId('action-dismiss');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Open in Editor buttons', () => {
    render(<ConsistencyView />);
    const buttons = screen.getAllByTestId('action-open-editor');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });
});

// M0.11.4 t14 — RPG design structure assertions
describe('ConsistencyView — RPG design structure (M0.11.4 t14)', () => {
  it('wraps view in rpg-frame element', () => {
    const { container } = render(<ConsistencyView />);
    const rpgFrame = container.querySelector('.rpg-frame');
    expect(rpgFrame).toBeInTheDocument();
  });

  it('renders action buttons with btn-px class', () => {
    const { container } = render(<ConsistencyView />);
    const btnPxButtons = container.querySelectorAll('button.btn-px');
    expect(btnPxButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders severity chip elements with chip class', () => {
    const { container } = render(<ConsistencyView />);
    const chips = container.querySelectorAll('.chip');
    expect(chips.length).toBeGreaterThanOrEqual(1);
  });

  it('renders status dot elements with dot class', () => {
    const { container } = render(<ConsistencyView />);
    const dots = container.querySelectorAll('.dot');
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });

  it('renders at least one element with rpg-label class', () => {
    const { container } = render(<ConsistencyView />);
    const labels = container.querySelectorAll('.rpg-label');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Acknowledge action button with btn-px class', () => {
    const { container } = render(<ConsistencyView />);
    const ackButton = container.querySelector('[data-testid="action-acknowledge"]');
    expect(ackButton).not.toBeNull();
    expect(ackButton?.className).toContain('btn-px');
  });
});
