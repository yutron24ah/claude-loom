/**
 * ProjectSettingsView × write API hookup (REQ-077, M0.15 t16)
 *
 * WHY: Verifies that the "保存" button in ProjectSettingsView calls
 * useProjectSettingsMutation.mutate() with the current draft state.
 * Previously the save button was noop (Phase 5 t16 write hookup deferred).
 *
 * Mock strategy: mock useScenario and useProjectSettingsMutation.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

const mutateFn = vi.fn();

// WHY: Mock the settings mutation hook to verify wiring without real daemon.
vi.mock('../../../src/live/useProjectSettingsMutation', () => ({
  useProjectSettingsMutation: () => ({
    mutate: mutateFn,
    isPending: false,
  }),
}));

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      project: 'claude-loom',
      settings: {
        daemonPort: 5757,
        worktreeBase: '.claude/worktrees',
        retroSchedule: { enabled: false, cron: '0 18 * * 5', label: 'every Friday 18:00' },
        consistencyScope: ['SPEC.md', 'PLAN.md'],
        hooks: { preToolUse: true, postToolUse: true, subagentStop: true },
        defaultReviewers: ['rev-code', 'rev-test', 'rev-sec'],
        parallelLimit: 3,
        logRetention: { days: 30 },
      },
    }) as unknown as Scenario,
}));

import { ProjectSettingsView } from '../../../src/views/project-settings/ProjectSettingsView';

afterEach(() => {
  cleanup();
  mutateFn.mockClear();
});

describe('ProjectSettingsView × write API', () => {
  it('clicking 保存 button calls useProjectSettingsMutation.mutate with draft state', () => {
    render(<ProjectSettingsView />);
    const saveBtn = screen.getByRole('button', { name: '保存' });
    fireEvent.click(saveBtn);
    expect(mutateFn).toHaveBeenCalledTimes(1);
    expect(mutateFn).toHaveBeenCalledWith(
      expect.objectContaining({ daemonPort: 5757 }),
    );
  });

  it('clicking 取消 resets draft without calling mutate', () => {
    render(<ProjectSettingsView />);
    // Change daemon port to mark dirty
    const portInput = screen.getByTestId('setting-daemonPort') as HTMLInputElement;
    fireEvent.change(portInput, { target: { value: '9999' } });
    expect(portInput.value).toBe('9999');
    // Cancel
    const cancelBtn = screen.getByRole('button', { name: '取消' });
    fireEvent.click(cancelBtn);
    expect(mutateFn).not.toHaveBeenCalled();
    // Port should revert to original
    expect(portInput.value).toBe('5757');
  });
});
