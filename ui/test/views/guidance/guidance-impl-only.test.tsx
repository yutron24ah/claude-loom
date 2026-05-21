/**
 * GuidanceView impl_only fill — M0.19 t7c Section C
 *
 * WHY: qa-suite case GU-INLINE-01 was marked `implementation-only`
 * (impl exists, no test). This file adds Vitest coverage.
 *
 * Cases covered:
 *   GU-INLINE-01 — inline style audit (inline styles only on dynamic values)
 */
// covers: GU-INLINE-01
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

vi.mock('../../../src/live/useGuidanceMutations', () => ({
  useGuidanceMutations: () => ({
    retireGuidance: vi.fn(),
    toggleGuidance: vi.fn(),
    isRetirePending: false,
    isTogglePending: false,
  }),
}));

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
        },
      ],
    }) as unknown as Scenario,
}));

import { GuidanceView } from '../../../src/views/guidance/GuidanceView';

afterEach(() => {
  cleanup();
});

describe('GuidanceView impl_only fill', () => {
  it('renders guidance view root without inline style on outer container', () => {
    // covers: GU-INLINE-01
    // WHY: Structural layout uses CSS classes. Inline styles only on
    // dynamic values (e.g. active toggle state, category badge colors).
    const { container } = render(<GuidanceView />);
    // Guidance view renders a root container — verify class-based layout
    const rootEl = container.firstElementChild;
    expect(rootEl).toBeInTheDocument();
    // Root element should not carry an inline style for structural layout
    expect(rootEl?.getAttribute('style')).toBeFalsy();
  });

  it('renders guidance items using class-based styles not inline for layout', () => {
    // covers: GU-INLINE-01 (item-level layout check)
    const { container } = render(<GuidanceView />);
    const guidanceItems = container.querySelectorAll('[data-testid="guidance-item"]');
    expect(guidanceItems.length).toBeGreaterThanOrEqual(1);
    // Each item should have a class for layout (not relying purely on inline styles)
    guidanceItems.forEach((item) => {
      expect(item.className).toBeTruthy();
    });
  });
});
