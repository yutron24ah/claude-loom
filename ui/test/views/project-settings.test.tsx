/**
 * ProjectSettingsView TDD tests — updated for M0.15 t10 redesign port.
 *
 * WHY: The original M5 t3 test mocked useProjectSettings (old tRPC hook).
 * After M0.15 t10 redesign port, the view uses useScenario() as sole data source.
 * This test suite is updated to mock useScenario() and verify the redesign
 * visual contract (daemonPort / worktreeBase / retroSchedule / etc.)
 *
 * Test behavior, not implementation (CODING_PRINCIPLES #8).
 * The old rpg-frame / setting-review_mode / setting-coexistence_mode testids
 * no longer exist in the redesign-driven view.
 *
 * REQ-068 acceptance criteria.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Scenario } from '@claude-loom/redesign/api/types';

// WHY: Mock useProjectSettingsMutation so tests don't need a tRPC provider (M0.15 t16).
vi.mock('../../src/live/useProjectSettingsMutation', () => ({
  useProjectSettingsMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

// WHY: Mock useScenario so tests never touch the real WS store or tRPC.
vi.mock('@claude-loom/redesign/api/websocket', () => ({
  useScenario: () =>
    ({
      project: 'claude-loom',
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

import { ProjectSettingsView } from '../../src/views/project-settings/ProjectSettingsView';

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Basic render
// ---------------------------------------------------------------------------

describe('ProjectSettingsView — basic render', () => {
  it('renders project-settings-view container', () => {
    render(<ProjectSettingsView />);
    expect(screen.getByTestId('project-settings-view')).toBeInTheDocument();
  });

  it('renders PROJECT SETTINGS header', () => {
    render(<ProjectSettingsView />);
    expect(screen.getByText(/PROJECT SETTINGS/)).toBeInTheDocument();
  });

  it('renders cancel and save buttons', () => {
    render(<ProjectSettingsView />);
    expect(screen.getByRole('button', { name: /取消/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /保存/ })).toBeInTheDocument();
  });

  it('renders project path chip', () => {
    // WHY: footer also contains "project.json" text, so we query the chip element directly
    // instead of using getByText which would match multiple elements.
    const { container } = render(<ProjectSettingsView />);
    const chip = container.querySelector('.chip');
    expect(chip).toBeInTheDocument();
    expect(chip?.textContent).toMatch(/project\.json/);
  });
});

// ---------------------------------------------------------------------------
// 8-field form rendering
// ---------------------------------------------------------------------------

describe('ProjectSettingsView — 8-field form', () => {
  it('renders daemonPort input with value from scenario', () => {
    render(<ProjectSettingsView />);
    const input = screen.getByTestId('setting-daemonPort');
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe('5757');
  });

  it('renders worktreeBase input with value from scenario', () => {
    render(<ProjectSettingsView />);
    const input = screen.getByTestId('setting-worktreeBase');
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe('~/wt');
  });

  it('renders retroSchedule enabled checkbox + cron input + label', () => {
    render(<ProjectSettingsView />);
    const cronInput = screen.getByTestId('setting-retroSchedule-cron');
    expect((cronInput as HTMLInputElement).value).toBe('0 17 * * 5');
    const label = screen.getByTestId('setting-retroSchedule-label');
    expect(label.textContent).toContain('毎週金曜 17:00');
  });

  it('renders consistencyScope textarea with all 3 globs', () => {
    render(<ProjectSettingsView />);
    const area = screen.getByTestId('setting-consistencyScope');
    const val = (area as HTMLTextAreaElement).value;
    expect(val).toContain('docs/**');
    expect(val).toContain('agents/**');
    expect(val).toContain('skills/**');
  });

  it('renders 3 hooks checkboxes all checked', () => {
    render(<ProjectSettingsView />);
    const pre = screen.getByTestId('setting-hook-preToolUse') as HTMLInputElement;
    const post = screen.getByTestId('setting-hook-postToolUse') as HTMLInputElement;
    const sub = screen.getByTestId('setting-hook-subagentStop') as HTMLInputElement;
    expect(pre.checked).toBe(true);
    expect(post.checked).toBe(true);
    expect(sub.checked).toBe(true);
  });

  it('renders reviewer toggle buttons with aria-pressed for selected reviewers', () => {
    render(<ProjectSettingsView />);
    const revCode = screen.getByTestId('setting-reviewer-rev-code');
    const revTest = screen.getByTestId('setting-reviewer-rev-test');
    const revSec = screen.getByTestId('setting-reviewer-rev-sec');
    // rev-code and rev-test are in defaultReviewers, rev-sec is not
    expect(revCode.getAttribute('aria-pressed')).toBe('true');
    expect(revTest.getAttribute('aria-pressed')).toBe('true');
    expect(revSec.getAttribute('aria-pressed')).toBe('false');
  });

  it('renders parallelLimit range input with value 4', () => {
    render(<ProjectSettingsView />);
    const input = screen.getByTestId('setting-parallelLimit') as HTMLInputElement;
    expect(input.value).toBe('4');
  });

  it('renders logRetention days input with value 30', () => {
    render(<ProjectSettingsView />);
    const input = screen.getByTestId('setting-logRetention-days') as HTMLInputElement;
    expect(input.value).toBe('30');
  });
});

// ---------------------------------------------------------------------------
// Interaction — controlled form updates (local draft state)
// ---------------------------------------------------------------------------

describe('ProjectSettingsView — editable fields', () => {
  it('updates daemonPort draft when input changes', () => {
    render(<ProjectSettingsView />);
    const input = screen.getByTestId('setting-daemonPort') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '9999' } });
    expect(input.value).toBe('9999');
  });

  it('updates worktreeBase draft when input changes', () => {
    render(<ProjectSettingsView />);
    const input = screen.getByTestId('setting-worktreeBase') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '~/new-wt' } });
    expect(input.value).toBe('~/new-wt');
  });

  it('shows 未保存 indicator when draft differs from scenario', () => {
    render(<ProjectSettingsView />);
    const input = screen.getByTestId('setting-daemonPort') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '9999' } });
    // After changing, the dirty indicator should appear
    expect(screen.getByText(/未保存/)).toBeInTheDocument();
  });

  it('clears 未保存 indicator when cancel is clicked', () => {
    render(<ProjectSettingsView />);
    const input = screen.getByTestId('setting-daemonPort') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '9999' } });
    // dirty state visible
    expect(screen.getByText(/未保存/)).toBeInTheDocument();
    // click cancel to restore
    const cancelBtn = screen.getByRole('button', { name: /取消/ });
    fireEvent.click(cancelBtn);
    // 未保存 should disappear
    expect(screen.queryByText(/未保存/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Footer note
// ---------------------------------------------------------------------------

describe('ProjectSettingsView — footer note', () => {
  it('renders footer with user-prefs note', () => {
    render(<ProjectSettingsView />);
    expect(screen.getByText(/user-prefs/)).toBeInTheDocument();
  });
});
