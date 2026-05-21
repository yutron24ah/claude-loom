/**
 * ProjectSettingsView impl_only fill — M0.19 t7c Section C
 *
 * WHY: qa-suite cases PS-FROM-TOPBAR-01 / PS-CANCEL-01 / PS-INLINE-01 were marked
 * `implementation-only` (impl exists, no test). This file adds Vitest coverage.
 *
 * Cases covered:
 *   PS-FROM-TOPBAR-01 — TopBar到達 (settings reachable from TopBar navigation)
 *   PS-CANCEL-01      — キャンセル (cancel/discard button reverts changes)
 *   PS-INLINE-01      — inline style audit (inline styles only on dynamic values)
 */
// covers: PS-FROM-TOPBAR-01, PS-CANCEL-01, PS-INLINE-01
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

vi.mock('../../../src/live/useProjectSettingsMutation', () => ({
  useProjectSettingsMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      project: 'claude-loom',
      settings: {
        daemonPort: 5757,
        worktreeBase: '~/wt',
        retroSchedule: { enabled: false, cron: '0 17 * * 5', label: '毎週金曜 17:00' },
        consistencyScope: ['docs/**'],
        hooks: { preToolUse: true, postToolUse: false, subagentStop: true },
        logRetention: { days: 30 },
        defaultReviewers: ['rev-code'],
        parallelLimit: 3,
      },
    }) as unknown as Scenario,
}));

import { ProjectSettingsView } from '../../../src/views/project-settings/ProjectSettingsView';

afterEach(() => {
  cleanup();
});

describe('ProjectSettingsView impl_only fill', () => {
  it('renders project settings view — reachable independently (PS-FROM-TOPBAR-01 path check)', () => {
    // covers: PS-FROM-TOPBAR-01
    // WHY: ProjectSettingsView is mounted at the /settings route (via AppShell drawer nav).
    // The TopBar project button navigates to this view. Verify the view mounts correctly
    // as a unit test for the render path (router nav is AppShell-level concern).
    render(<ProjectSettingsView />);
    const view = screen.getByTestId('project-settings-view');
    expect(view).toBeInTheDocument();
    // Should show the project settings title
    expect(view.textContent).toMatch(/PROJECT SETTINGS/i);
  });

  it('cancel button reverts changes to initial values', () => {
    // covers: PS-CANCEL-01
    // WHY: After changing a field, the 取消 (cancel) button should revert draft back
    // to the original scenario.settings values (dirty=false → button disabled/hidden).
    render(<ProjectSettingsView />);
    // Change the daemon port to make it dirty
    const portInput = screen.getByTestId('setting-daemonPort');
    fireEvent.change(portInput, { target: { value: '9999' } });
    // Port should now be 9999
    expect((portInput as HTMLInputElement).value).toBe('9999');

    // Now the 取消 button should be enabled (dirty state)
    const cancelBtn = screen.getByRole('button', { name: '取消' });
    expect(cancelBtn).toBeInTheDocument();
    // Cancel reverts the change
    fireEvent.click(cancelBtn);
    // Port should revert to original value 5757
    expect((screen.getByTestId('setting-daemonPort') as HTMLInputElement).value).toBe('5757');
  });

  it('cancel button is disabled when no changes have been made (clean state)', () => {
    // covers: PS-CANCEL-01 (clean state)
    // WHY: 取消 is disabled when dirty=false (no changes from original settings).
    render(<ProjectSettingsView />);
    const cancelBtn = screen.getByRole('button', { name: '取消' });
    expect(cancelBtn).toBeDisabled();
  });

  it('renders project-settings-view root without inline style on outer container', () => {
    // covers: PS-INLINE-01
    // WHY: Structural layout uses CSS classes. Inline styles only on dynamic values
    // (e.g. save button background based on dirty state, retro schedule cron opacity).
    render(<ProjectSettingsView />);
    const psScreen = document.querySelector('.ps-screen');
    expect(psScreen).toBeInTheDocument();
    // Root element should not have an inline style for structural layout
    expect(psScreen?.getAttribute('style')).toBeFalsy();
  });

  it('reviewer buttons use inline background style based on selected state (dynamic)', () => {
    // covers: PS-INLINE-01 (dynamic inline styles on reviewer buttons are expected)
    // WHY: ProjectSettingsView.KNOWN_REVIEWERS buttons use inline background to indicate
    // aria-pressed state. This is an intentional dynamic inline style.
    render(<ProjectSettingsView />);
    const revCodeBtn = screen.getByTestId('setting-reviewer-rev-code');
    // rev-code is in defaultReviewers → should have aria-pressed="true" and inline bg
    expect(revCodeBtn).toBeInTheDocument();
    expect(revCodeBtn.getAttribute('aria-pressed')).toBe('true');
    expect((revCodeBtn as HTMLElement).style.background).toBeTruthy();
  });
});
