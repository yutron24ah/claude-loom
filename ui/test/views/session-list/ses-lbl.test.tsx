/**
 * SessionListView × SES-LBL — reviewer_agent column rename tests (m0.18-t5)
 *
 * WHY: M0.18 t5 renames the reviewer_agent display in SessionListView:
 *   - detail panel label → "reviewer (skill)"
 *   - DB values → skill identifiers via projection function
 *   - unknown values → raw + (unmapped) badge
 *
 * REQ-150: detail panel shows "reviewer (skill)" label when reviewer_agent present
 * REQ-151: DB value "loom-reviewer" projects to "loom-review/single"
 * REQ-152: DB value "loom-code-reviewer" projects to "loom-review/trio.code"
 * REQ-153: unmapped DB value shows raw + (unmapped) badge
 * REQ-154: absent reviewer_agent field → no reviewer row rendered
 * REQ-155: all 4 mapping values project correctly
 *
 * SES-LBL-01 → REQ-150 (detail panel label)
 * SES-LBL-02 → REQ-151 (loom-reviewer → loom-review/single)
 * SES-LBL-03 → REQ-152 (loom-code-reviewer → loom-review/trio.code)
 * SES-LBL-04 → REQ-153 (unmapped → raw + (unmapped) badge)
 * SES-LBL-05 → REQ-154 (absent → no row)
 * SES-LBL-06 → REQ-155 (full mapping table)
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// ---------------------------------------------------------------------------
// Variable that the mock reads per-test.
// ---------------------------------------------------------------------------

let _mockReviewerAgent: string | undefined = undefined;

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      sessions: [
        {
          id: 'ses-lbl-test-01',
          startedAt: '2026-05-19 10:00',
          durationSec: 600,
          agentRoot: 'dev',
          turns: 10,
          verdict: 'PASS',
          filesTouched: ['ui/src/views/session-list/SessionListView.tsx'],
          relatedFindings: [],
          relatedRetro: undefined,
          summary: 'SES-LBL test session',
          reviewer_agent: _mockReviewerAgent,
        },
      ],
      project: 'claude-loom',
    }) as unknown as Scenario,
}));

import { SessionListView } from '../../../src/views/session-list/SessionListView';

afterEach(() => {
  cleanup();
  _mockReviewerAgent = undefined;
});

// ---------------------------------------------------------------------------
// SES-LBL-01 — REQ-150: label text "reviewer (skill)"
// ---------------------------------------------------------------------------

describe('SES-LBL-01 (REQ-150) — reviewer (skill) label in detail panel', () => {
  it('shows "reviewer (skill)" label when reviewer_agent is present', () => {
    _mockReviewerAgent = 'loom-reviewer';
    render(<SessionListView />);

    const entries = screen.getAllByTestId('session-entry');
    fireEvent.click(entries[0]);

    expect(screen.getByTestId('session-reviewer-label')).toHaveTextContent('reviewer (skill)');
  });
});

// ---------------------------------------------------------------------------
// SES-LBL-02 — REQ-151: loom-reviewer → loom-review/single
// ---------------------------------------------------------------------------

describe('SES-LBL-02 (REQ-151) — loom-reviewer maps to loom-review/single', () => {
  it('displays "loom-review/single" for DB value "loom-reviewer"', () => {
    _mockReviewerAgent = 'loom-reviewer';
    render(<SessionListView />);

    const entries = screen.getAllByTestId('session-entry');
    fireEvent.click(entries[0]);

    expect(screen.getByTestId('session-reviewer-value')).toHaveTextContent('loom-review/single');
    // Must NOT show raw DB value as the primary text
    expect(screen.queryByText('loom-reviewer')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// SES-LBL-03 — REQ-152: loom-code-reviewer → loom-review/trio.code
// ---------------------------------------------------------------------------

describe('SES-LBL-03 (REQ-152) — loom-code-reviewer maps to loom-review/trio.code', () => {
  it('displays "loom-review/trio.code" for DB value "loom-code-reviewer"', () => {
    _mockReviewerAgent = 'loom-code-reviewer';
    render(<SessionListView />);

    const entries = screen.getAllByTestId('session-entry');
    fireEvent.click(entries[0]);

    expect(screen.getByTestId('session-reviewer-value')).toHaveTextContent('loom-review/trio.code');
  });
});

// ---------------------------------------------------------------------------
// SES-LBL-04 — REQ-153: unmapped value → raw + (unmapped) badge
// ---------------------------------------------------------------------------

describe('SES-LBL-04 (REQ-153) — unmapped DB value shows raw + (unmapped) badge', () => {
  it('displays raw value + (unmapped) badge for unknown DB value', () => {
    _mockReviewerAgent = 'some-unknown-old-agent';
    render(<SessionListView />);

    const entries = screen.getAllByTestId('session-entry');
    fireEvent.click(entries[0]);

    const valueEl = screen.getByTestId('session-reviewer-value');
    expect(valueEl).toHaveTextContent('some-unknown-old-agent');
    expect(screen.getByTestId('session-reviewer-unmapped-badge')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// SES-LBL-05 — REQ-154: absent reviewer_agent → no reviewer row
// ---------------------------------------------------------------------------

describe('SES-LBL-05 (REQ-154) — absent reviewer_agent shows no reviewer row', () => {
  it('does not render reviewer row when reviewer_agent is undefined', () => {
    _mockReviewerAgent = undefined;
    render(<SessionListView />);

    const entries = screen.getAllByTestId('session-entry');
    fireEvent.click(entries[0]);

    expect(screen.queryByTestId('session-reviewer-label')).not.toBeInTheDocument();
    expect(screen.queryByTestId('session-reviewer-value')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// SES-LBL-06 — REQ-155: full mapping table verification
// ---------------------------------------------------------------------------

describe('SES-LBL-06 (REQ-155) — full mapping table correctness', () => {
  const MAPPING: Array<[string, string]> = [
    ['loom-reviewer', 'loom-review/single'],
    ['loom-code-reviewer', 'loom-review/trio.code'],
    ['loom-security-reviewer', 'loom-review/trio.security'],
    ['loom-test-reviewer', 'loom-review/trio.test'],
  ];

  for (const [dbValue, expectedSkillId] of MAPPING) {
    it(`maps "${dbValue}" → "${expectedSkillId}"`, () => {
      _mockReviewerAgent = dbValue;
      render(<SessionListView />);

      const entries = screen.getAllByTestId('session-entry');
      fireEvent.click(entries[0]);

      expect(screen.getByTestId('session-reviewer-value')).toHaveTextContent(expectedSkillId);
      cleanup();
    });
  }
});
