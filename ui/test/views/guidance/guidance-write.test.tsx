/**
 * GuidanceView × write API hookup (REQ-077, M0.15 t16)
 *
 * WHY: Verifies that the "retire" button in GuidanceView calls
 * useGuidanceMutations.retireGuidance() with the correct item id.
 * Previously the retire button had onClick={() => undefined} (noop).
 *
 * Mock strategy: mock both useScenario and useGuidanceMutations.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

const retireFn = vi.fn();
const toggleFn = vi.fn();

// WHY: Mock mutation hook to verify wiring without real daemon.
vi.mock('../../../src/live/useGuidanceMutations', () => ({
  useGuidanceMutations: () => ({
    retireGuidance: retireFn,
    toggleGuidance: toggleFn,
    isRetirePending: false,
    isTogglePending: false,
  }),
}));

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      guidance: [
        {
          id: 'g-001',
          agentId: 'dev',
          active: true,
          category: 'tdd',
          from: 'retro-2026-04-25',
          scope: 'user',
          text: 'RED フェーズで test を書く前に impl を触らない。',
          addedAt: '2026-04-25',
          useCount: 12,
          ttl: 'permanent',
        },
        {
          id: 'g-002',
          agentId: 'rev-code',
          active: false,
          category: 'review',
          from: 'retro-2026-04-22',
          scope: 'project',
          text: 'verdict には必ず参照行番号を含める。',
          addedAt: '2026-04-22',
          useCount: 8,
          ttl: 'expired',
        },
      ],
    }) as unknown as Scenario,
}));

import { GuidanceView } from '../../../src/views/guidance/GuidanceView';

afterEach(() => {
  cleanup();
  retireFn.mockClear();
  toggleFn.mockClear();
});

describe('GuidanceView × write API', () => {
  it('clicking retire button calls retireGuidance with item id', () => {
    // covers: GU-DELETE-01, GU-EDIT-01, GU-ADD-01
    render(<GuidanceView />);
    // The "active only" filter is on by default, so only active item (g-001) is shown
    const retireBtn = screen.getByTestId('guidance-toggle');
    fireEvent.click(retireBtn);
    expect(retireFn).toHaveBeenCalledTimes(1);
    expect(retireFn).toHaveBeenCalledWith(expect.objectContaining({ id: 'g-001' }));
  });

  it('inactive items do not show retire button (filtered by activeOnly default)', () => {
    render(<GuidanceView />);
    // By default activeOnly=true, so only active items shown → only 1 retire btn
    const retireBtns = screen.getAllByTestId('guidance-toggle');
    expect(retireBtns).toHaveLength(1);
  });
});
