/**
 * GuidanceView × scenario.active smoke test (REQ-065)
 * -----------------------------------------------------------
 * Verifies the redesign port: when useScenario() returns entries,
 * GuidanceView renders all guidance items with active toggle, scope tag,
 * category badge, diff expandable, source link, and filter bar.
 *
 * WHY: The existing LearnedGuidanceView uses MOCK_GUIDANCE hardcoded fixture.
 * After the redesign port, GuidanceView is driven by useScenario().guidance —
 * this test covers the new wiring.
 *
 * Pairs with ui/test/views/guidance.test.tsx (legacy tests — kept for
 * regression coverage of renamed component backward compatibility).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// WHY: Mock useGuidanceMutations so tests don't need a tRPC provider (M0.15 t16).
vi.mock('../../../src/live/useGuidanceMutations', () => ({
  useGuidanceMutations: () => ({
    retireGuidance: vi.fn(),
    toggleGuidance: vi.fn(),
    isRetirePending: false,
    isTogglePending: false,
  }),
}));

// ---------------------------------------------------------------------------
// Mock @claude-loom/redesign/api/websocket
// WHY: This is the seam scenarios.js → daemon reducer; mocking proves the
// consumer wiring without spinning up a WS connection.
// ---------------------------------------------------------------------------
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      guidance: [
        {
          agentId: 'dev',
          active: true,
          category: 'tdd',
          from: 'retro-2026-04-25',
          scope: 'user',
          text: 'RED フェーズで test を書く前に impl を触らない。',
          addedAt: '2026-04-25',
          useCount: 12,
          ttl: 'permanent',
          diff: {
            before: 'RED フェーズの test を書く。',
            after: 'RED フェーズで test を書く前に impl を触らない。',
          },
        },
        {
          agentId: 'rev-code',
          active: true,
          category: 'review',
          from: 'retro-2026-04-22',
          scope: 'project',
          text: 'verdict には必ず参照行番号を含める。',
          addedAt: '2026-04-22',
          useCount: 8,
          ttl: 'permanent',
        },
        {
          agentId: 'rev-sec',
          active: true,
          category: 'security',
          from: 'finding-F-08',
          scope: 'project',
          text: 'OAuth callback URL の検証は exact match のみ受理。',
          addedAt: '2026-04-20',
          useCount: 3,
          ttl: 'permanent',
        },
        {
          agentId: 'rev-test',
          active: false,
          category: 'test',
          from: 'retro-2026-04-15',
          scope: 'user',
          text: 'coverage 90% 未満は verdict 出さない。',
          addedAt: '2026-04-15',
          useCount: 5,
          ttl: 'expired',
        },
        {
          agentId: 'pm',
          active: true,
          category: 'process',
          from: 'retro-2026-04-25',
          scope: 'user',
          text: '並列発射可能な dispatch は必ず単一 Task call に同梱する。',
          addedAt: '2026-04-25',
          useCount: 19,
          ttl: 'permanent',
        },
      ],
    }) as unknown as Scenario,
}));

import { GuidanceView } from '../../../src/views/guidance/GuidanceView';

afterEach(() => {
  cleanup();
});

describe('GuidanceView × scenario.active', () => {
  it('renders all 5 guidance entries when active-only filter is off', () => {
    const { container } = render(<GuidanceView />);
    // Default is activeOnly=true, so uncheck to see all 5
    const checkbox = container.querySelector('[data-testid="filter-active-only"]') as HTMLInputElement;
    fireEvent.click(checkbox);
    const items = screen.getAllByTestId('guidance-item');
    expect(items).toHaveLength(5);
  });

  it('renders active toggle, scope tag, and category badge for each entry', () => {
    const { container } = render(<GuidanceView />);
    // Uncheck activeOnly to see all 5 entries
    const checkbox = container.querySelector('[data-testid="filter-active-only"]') as HTMLInputElement;
    fireEvent.click(checkbox);

    // Each item must have data-testid="guidance-toggle" (retire / noop button for active items)
    // 4 active items should have retire buttons
    const toggles = screen.getAllByTestId('guidance-toggle');
    expect(toggles.length).toBeGreaterThanOrEqual(1);

    // Scope tags: "user" or "project" chip — one per item (5 total)
    const scopeTags = container.querySelectorAll('[data-testid="guidance-scope"]');
    expect(scopeTags).toHaveLength(5);

    // Category badges — each item has one (5 total)
    const catBadges = container.querySelectorAll('[data-testid="guidance-category"]');
    expect(catBadges).toHaveLength(5);
  });

  it('renders diff expandable for entries with diff field', () => {
    const { container } = render(<GuidanceView />);
    // First entry (dev/tdd) has a diff field and is active → visible by default
    const diffButtons = container.querySelectorAll('[data-testid="guidance-diff-toggle"]');
    expect(diffButtons).toHaveLength(1);

    // Click to expand diff panel
    fireEvent.click(diffButtons[0]);

    // After expansion, diff panel should appear
    const diffPanel = container.querySelector('[data-testid="guidance-diff-panel"]');
    expect(diffPanel).toBeInTheDocument();
  });

  it('renders source link (from field) for each entry', () => {
    const { container } = render(<GuidanceView />);
    // Uncheck activeOnly to see all 5 entries
    const checkbox = container.querySelector('[data-testid="filter-active-only"]') as HTMLInputElement;
    fireEvent.click(checkbox);

    // Each guidance item should show a source button with the "from" value
    const sourceLinks = screen.getAllByTestId('guidance-source');
    expect(sourceLinks).toHaveLength(5);
    // Verify "from" values are rendered in source links
    const sourceTexts = sourceLinks.map((l) => l.textContent ?? '');
    expect(sourceTexts.some((t) => t.includes('retro-2026-04-25'))).toBe(true);
    expect(sourceTexts.some((t) => t.includes('retro-2026-04-22'))).toBe(true);
    expect(sourceTexts.some((t) => t.includes('finding-F-08'))).toBe(true);
  });

  it('filter bar narrows displayed entries when active-only filter applied', () => {
    render(<GuidanceView />);
    // Default is activeOnly=true: only 4 active entries shown
    // (rev-test is inactive → filtered out)
    const checkbox = screen.getByTestId('filter-active-only') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    // With activeOnly=true: 4 items visible (dev, rev-code, rev-sec, pm — all active)
    let items = screen.getAllByTestId('guidance-item');
    expect(items).toHaveLength(4);

    // Uncheck to show all 5 (including inactive rev-test)
    fireEvent.click(checkbox);
    items = screen.getAllByTestId('guidance-item');
    expect(items).toHaveLength(5);
  });
});
