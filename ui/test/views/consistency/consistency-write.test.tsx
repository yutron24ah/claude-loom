/**
 * ConsistencyView × write API hookup (REQ-077, M0.15 t16)
 *
 * WHY: Verifies that the ack/fix/dismiss action buttons in ConsistencyView
 * call the correct useConsistencyMutations functions. Previously these buttons
 * had onClick={() => undefined) (noop).
 *
 * Mock strategy: mock both useScenario and useConsistencyMutations.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

const ackFn = vi.fn();
const fixFn = vi.fn();
const dismissFn = vi.fn();

// WHY: Mock mutation hook to verify wiring without real daemon.
vi.mock('../../../src/live/useConsistencyMutations', () => ({
  useConsistencyMutations: () => ({
    acknowledgeFinding: ackFn,
    markFindingFixed: fixFn,
    dismissFinding: dismissFn,
    openInEditor: vi.fn(),
    isAcknowledgePending: false,
    isMarkFixedPending: false,
    isDismissPending: false,
  }),
}));

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      consistencyState: 'has-findings',
      findings: [
        {
          // WHY: redesign Finding.id is string (e.g. 'F-01'); file replaces targetPath.
          id: 'F-01',
          sev: 'high',
          status: 'open',
          file: 'daemon/src/server.ts',
          lines: 'L12-L14',
          title: 'SPEC §3.5 は実装されていない',
          detail: 'daemon port が SPEC §3.5 と違う',
          suggest: 'daemon/src/server.ts の port 設定を確認',
          source: 'spec-diff',
        },
      ],
    }) as unknown as Scenario,
}));

import { ConsistencyView } from '../../../src/views/consistency/ConsistencyView';

afterEach(() => {
  cleanup();
  ackFn.mockClear();
  fixFn.mockClear();
  dismissFn.mockClear();
});

describe('ConsistencyView × write API', () => {
  it('clicking ack action calls acknowledgeFinding with finding id', () => {
    render(<ConsistencyView />);
    // WHY: use getByTestId to avoid ambiguity with "ACK" summary filter button
    // (M0.17 R3 Phase E added clickable summary cards that also contain "ACK" text)
    const ackBtn = screen.getByTestId('action-acknowledge');
    fireEvent.click(ackBtn);
    expect(ackFn).toHaveBeenCalledTimes(1);
    expect(ackFn).toHaveBeenCalledWith(1);
  });

  it('clicking fix action calls markFindingFixed with finding id', () => {
    render(<ConsistencyView />);
    // WHY: use getByTestId to avoid ambiguity with "FIXED" summary filter button
    const fixBtn = screen.getByTestId('action-mark-fixed');
    fireEvent.click(fixBtn);
    expect(fixFn).toHaveBeenCalledTimes(1);
    expect(fixFn).toHaveBeenCalledWith(1);
  });

  it('clicking dismiss action calls dismissFinding with finding id', () => {
    render(<ConsistencyView />);
    // WHY: use getByTestId to avoid ambiguity with "DISMISSED" summary filter button
    const dismissBtn = screen.getByTestId('action-dismiss');
    fireEvent.click(dismissBtn);
    expect(dismissFn).toHaveBeenCalledTimes(1);
    expect(dismissFn).toHaveBeenCalledWith(1);
  });
});
