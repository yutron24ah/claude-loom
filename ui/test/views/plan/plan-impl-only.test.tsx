/**
 * PlanView impl_only fill — M0.19 t7c Section C
 *
 * WHY: qa-suite cases PL-TITLE-01 / PL-TODOS-TIMESTAMP-01 / PL-TODOS-READONLY-01 / PL-INLINE-01
 * were marked `implementation-only` (impl exists, no test). This file adds Vitest coverage.
 *
 * Cases covered:
 *   PL-TITLE-01    — タイトル表記 (plan title label rendered)
 *   PL-TODOS-TIMESTAMP-01 — updatedAt timestamp display
 *   PL-TODOS-READONLY-01  — read-only hint text present
 *   PL-INLINE-01   — inline style audit (inline styles only on dynamic values)
 */
// covers: PL-TITLE-01, PL-TODOS-TIMESTAMP-01, PL-TODOS-READONLY-01, PL-INLINE-01
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// WHY: Mock usePlanMutations so tests don't need a tRPC provider.
vi.mock('../../../src/live/usePlanMutations', () => ({
  usePlanMutations: () => ({
    upsertItem: vi.fn(),
    updateItemStatus: vi.fn(),
    deleteItem: vi.fn(),
    isUpsertPending: false,
    isUpdateStatusPending: false,
  }),
}));

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      todos: [
        { status: 'completed', text: 'finish TDD cycle' },
        { status: 'in_progress', text: 'write tests' },
      ],
      todosUpdatedAt: '2026-05-21T10:00:00Z',
      milestones: [
        {
          id: 'M0.19',
          title: 'QA Suite Gap Fill',
          progress: 0.5,
          count: '5/10',
          status: 'doing',
          children: [
            { t: 'audit script', st: 'completed' },
            { t: 'impl_only fill', st: 'in_progress' },
          ],
        },
      ],
    }) as unknown as Scenario,
}));

import { PlanView } from '../../../src/views/plan/PlanView';

afterEach(() => {
  cleanup();
});

describe('PlanView impl_only fill', () => {
  it('renders plan title label in header', () => {
    // covers: PL-TITLE-01
    render(<PlanView />);
    // The plan header should include a title string with "PLAN"
    const header = document.querySelector('.plan-header');
    expect(header).toBeInTheDocument();
    expect(header?.textContent).toMatch(/PLAN/i);
  });

  it('renders todosUpdatedAt timestamp in todos panel', () => {
    // covers: PL-TODOS-TIMESTAMP-01
    render(<PlanView />);
    const updatedAtEl = screen.getByTestId('todos-updated-at');
    expect(updatedAtEl).toBeInTheDocument();
    expect(updatedAtEl.textContent).toContain('2026-05-21T10:00:00Z');
  });

  it('renders read-only hint text in todos panel', () => {
    // covers: PL-TODOS-READONLY-01
    render(<PlanView />);
    // The todos panel should contain a hint indicating read-only mirror
    const shortTermPanel = screen.getByTestId('plan-short-term');
    expect(shortTermPanel).toBeInTheDocument();
    expect(shortTermPanel.textContent).toContain('read-only');
  });

  it('inline styles appear only on dynamic values not on structural elements', () => {
    // covers: PL-INLINE-01
    // Verify that the plan-screen root container has no direct inline style attribute
    // (structural layout should be CSS classes, not inline styles)
    render(<PlanView />);
    const planScreen = document.querySelector('.plan-screen');
    expect(planScreen).toBeInTheDocument();
    // Root element should not have an inline style attribute
    // (dynamic inline styles on progress fill / status glyphs are allowed per design SSoT)
    expect(planScreen?.getAttribute('style')).toBeFalsy();
  });
});
