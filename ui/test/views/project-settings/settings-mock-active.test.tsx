/**
 * ProjectSettingsView × scenario.active — redesign port smoke tests (M0.15 t10)
 *
 * WHY: The existing ProjectSettingsView uses useProjectSettings (the old live hook
 * backed by tRPC). This suite mocks useScenario (the new redesign hook) to verify
 * the redesign-driven ProjectSettingsView renders the 8-field form:
 *   - daemonPort / worktreeBase / retroSchedule / consistencyScope
 *   - hooks (preToolUse/postToolUse/subagentStop) / defaultReviewers
 *   - parallelLimit / logRetention
 *
 * REQ-068 acceptance criteria.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// WHY: Mock useProjectSettingsMutation so tests don't need a tRPC provider (M0.15 t16).
vi.mock('../../../src/live/useProjectSettingsMutation', () => ({
  useProjectSettingsMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

// WHY: mock useScenario so the component never touches the real WS store or tRPC.
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      settings: {
        daemonPort: 5757,
        worktreeBase: '~/wt',
        retroSchedule: { enabled: true, cron: '0 17 * * 5', label: '毎週金曜 17:00' },
        consistencyScope: ['docs/**', 'agents/**', 'skills/**'],
        hooks: { preToolUse: true, postToolUse: true, subagentStop: true },
        logRetention: { days: 30 },
        defaultReviewers: ['rev-code', 'rev-test'],
        parallelLimit: 4,
      },
    }) as unknown as Scenario,
}));

import { ProjectSettingsView } from '../../../src/views/project-settings/ProjectSettingsView';

afterEach(() => {
  cleanup();
});

describe('ProjectSettingsView × scenario.active', () => {
  it('renders daemonPort field with value 5757', () => {
    // covers: PS-MOUNT-01
    render(<ProjectSettingsView />);
    // The daemon port input should display the value 5757 from scenario.settings
    const portInput = screen.getByTestId('setting-daemonPort');
    expect(portInput).toBeInTheDocument();
    expect((portInput as HTMLInputElement).value).toBe('5757');
  });

  it('renders worktreeBase field with value ~/wt', () => {
    render(<ProjectSettingsView />);
    // The worktree base input should display ~/wt from scenario.settings
    const wtInput = screen.getByTestId('setting-worktreeBase');
    expect(wtInput).toBeInTheDocument();
    expect((wtInput as HTMLInputElement).value).toBe('~/wt');
  });

  it('renders retroSchedule cron + label', () => {
    render(<ProjectSettingsView />);
    // The retro schedule section should show the cron expression and its label
    const cronInput = screen.getByTestId('setting-retroSchedule-cron');
    expect(cronInput).toBeInTheDocument();
    expect((cronInput as HTMLInputElement).value).toBe('0 17 * * 5');
    // The label should also appear
    expect(screen.getByTestId('setting-retroSchedule-label')).toBeInTheDocument();
    expect(screen.getByTestId('setting-retroSchedule-label').textContent).toContain('毎週金曜 17:00');
  });

  it('renders consistencyScope as multiline textarea or array editor', () => {
    render(<ProjectSettingsView />);
    // The consistency scope textarea should contain the 3 globs joined by newline
    const scopeArea = screen.getByTestId('setting-consistencyScope');
    expect(scopeArea).toBeInTheDocument();
    const textContent = (scopeArea as HTMLTextAreaElement).value;
    expect(textContent).toContain('docs/**');
    expect(textContent).toContain('agents/**');
    expect(textContent).toContain('skills/**');
  });

  it('renders 3 hooks toggles (preToolUse/postToolUse/subagentStop) all checked', () => {
    render(<ProjectSettingsView />);
    // All 3 hooks should be rendered as checked checkboxes since all are true
    const preToolUse = screen.getByTestId('setting-hook-preToolUse');
    const postToolUse = screen.getByTestId('setting-hook-postToolUse');
    const subagentStop = screen.getByTestId('setting-hook-subagentStop');
    expect(preToolUse).toBeInTheDocument();
    expect(postToolUse).toBeInTheDocument();
    expect(subagentStop).toBeInTheDocument();
    expect((preToolUse as HTMLInputElement).checked).toBe(true);
    expect((postToolUse as HTMLInputElement).checked).toBe(true);
    expect((subagentStop as HTMLInputElement).checked).toBe(true);
  });

  it('renders defaultReviewers + parallelLimit + logRetention', () => {
    render(<ProjectSettingsView />);
    // defaultReviewers: rev-code and rev-test should be selected/checked
    const revCode = screen.getByTestId('setting-reviewer-rev-code');
    const revTest = screen.getByTestId('setting-reviewer-rev-test');
    expect(revCode).toBeInTheDocument();
    expect(revTest).toBeInTheDocument();

    // parallelLimit: range input with value 4
    const parallelInput = screen.getByTestId('setting-parallelLimit');
    expect(parallelInput).toBeInTheDocument();
    expect((parallelInput as HTMLInputElement).value).toBe('4');

    // logRetention: input with value 30
    const logDaysInput = screen.getByTestId('setting-logRetention-days');
    expect(logDaysInput).toBeInTheDocument();
    expect((logDaysInput as HTMLInputElement).value).toBe('30');
  });
});
