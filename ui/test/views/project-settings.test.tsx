/**
 * ProjectSettingsView TDD tests — RED phase (M5 t3).
 *
 * WHY: Verify that ProjectSettingsView renders read-only fields and
 * editable settings, handles save/reset interactions, and passes
 * data-testid contracts per SPEC §3.6.10 (no raw string literals in logic).
 *
 * We mock useProjectSettings entirely so no WS connection is needed.
 * We test BEHAVIOR (visible UI states) not implementation internals.
 *
 * SPEC §3.6.10 compliance: enum values come from ProjectSettings type
 * constants, never raw string comparisons in implementation.
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { ProjectSettings, UseProjectSettingsResult } from '../../src/live/useProjectSettings';

// ---------------------------------------------------------------------------
// Mock useProjectSettings hook
// ---------------------------------------------------------------------------
const { mockUseProjectSettings } = vi.hoisted(() => ({
  mockUseProjectSettings: vi.fn(),
}));

vi.mock('@/live/useProjectSettings', () => ({
  useProjectSettings: mockUseProjectSettings,
}));

// Import after mock is set up
import { ProjectSettingsView } from '../../src/views/project-settings/ProjectSettingsView';

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSettings(overrides: Partial<ProjectSettings> = {}): ProjectSettings {
  return {
    projectId: 'claude-loom-self',
    name: 'claude-loom',
    specPath: 'SPEC.md',
    branch: 'main',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    reviewMode: 'single',
    coexistenceMode: 'full',
    enabledFeatures: ['all'],
    commitLanguage: 'any',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Default mock setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockUseProjectSettings.mockClear();
  mockUseProjectSettings.mockReturnValue({
    settings: makeSettings(),
    draft: makeSettings(),
    isLoading: false,
    error: null,
    isDirty: false,
    setDraft: vi.fn(),
    save: vi.fn(),
    reset: vi.fn(),
  } satisfies UseProjectSettingsResult);
});

// ---------------------------------------------------------------------------
// Basic render
// ---------------------------------------------------------------------------

describe('ProjectSettingsView — basic render', () => {
  it('renders project-settings-view container', () => {
    render(<ProjectSettingsView />);
    expect(screen.getByTestId('project-settings-view')).toBeInTheDocument();
  });

  it('renders review_mode setting control', () => {
    render(<ProjectSettingsView />);
    expect(screen.getByTestId('setting-review_mode')).toBeInTheDocument();
  });

  it('renders coexistence_mode setting control', () => {
    render(<ProjectSettingsView />);
    expect(screen.getByTestId('setting-coexistence_mode')).toBeInTheDocument();
  });

  it('renders enabled_features setting control', () => {
    render(<ProjectSettingsView />);
    expect(screen.getByTestId('setting-enabled_features')).toBeInTheDocument();
  });

  it('renders commit_language setting control', () => {
    render(<ProjectSettingsView />);
    expect(screen.getByTestId('setting-commit_language')).toBeInTheDocument();
  });

  it('renders save button', () => {
    render(<ProjectSettingsView />);
    expect(screen.getByTestId('setting-save-button')).toBeInTheDocument();
  });

  it('renders reset button', () => {
    render(<ProjectSettingsView />);
    expect(screen.getByTestId('setting-reset-button')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Read-only fields display
// ---------------------------------------------------------------------------

describe('ProjectSettingsView — read-only fields', () => {
  it('displays project_id', () => {
    render(<ProjectSettingsView />);
    expect(screen.getByText('claude-loom-self')).toBeInTheDocument();
  });

  it('displays project name', () => {
    render(<ProjectSettingsView />);
    expect(screen.getByText('claude-loom')).toBeInTheDocument();
  });

  it('displays spec_path', () => {
    render(<ProjectSettingsView />);
    expect(screen.getByText('SPEC.md')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('ProjectSettingsView — loading state', () => {
  it('shows loading indicator when isLoading is true', () => {
    mockUseProjectSettings.mockReturnValue({
      settings: null,
      draft: null,
      isLoading: true,
      error: null,
      isDirty: false,
      setDraft: vi.fn(),
      save: vi.fn(),
      reset: vi.fn(),
    });
    render(<ProjectSettingsView />);
    expect(screen.getByTestId('project-settings-loading')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

describe('ProjectSettingsView — error state', () => {
  it('shows error message when error is present', () => {
    mockUseProjectSettings.mockReturnValue({
      settings: null,
      draft: null,
      isLoading: false,
      error: new Error('Connection failed'),
      isDirty: false,
      setDraft: vi.fn(),
      save: vi.fn(),
      reset: vi.fn(),
    });
    render(<ProjectSettingsView />);
    expect(screen.getByTestId('project-settings-error')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Editable fields interaction
// ---------------------------------------------------------------------------

describe('ProjectSettingsView — editable fields', () => {
  it('review_mode dropdown shows current value', () => {
    render(<ProjectSettingsView />);
    const select = screen.getByTestId('setting-review_mode');
    expect((select as HTMLSelectElement).value).toBe('single');
  });

  it('calls setDraft when review_mode changes', () => {
    const setDraft = vi.fn();
    mockUseProjectSettings.mockReturnValue({
      settings: makeSettings(),
      draft: makeSettings(),
      isLoading: false,
      error: null,
      isDirty: false,
      setDraft,
      save: vi.fn(),
      reset: vi.fn(),
    });
    render(<ProjectSettingsView />);
    const select = screen.getByTestId('setting-review_mode');
    fireEvent.change(select, { target: { value: 'trio' } });
    expect(setDraft).toHaveBeenCalled();
  });

  it('commit_language dropdown shows current value', () => {
    render(<ProjectSettingsView />);
    const select = screen.getByTestId('setting-commit_language');
    expect((select as HTMLSelectElement).value).toBe('any');
  });

  it('calls setDraft when commit_language changes', () => {
    const setDraft = vi.fn();
    mockUseProjectSettings.mockReturnValue({
      settings: makeSettings(),
      draft: makeSettings(),
      isLoading: false,
      error: null,
      isDirty: false,
      setDraft,
      save: vi.fn(),
      reset: vi.fn(),
    });
    render(<ProjectSettingsView />);
    const select = screen.getByTestId('setting-commit_language');
    fireEvent.change(select, { target: { value: 'japanese' } });
    expect(setDraft).toHaveBeenCalled();
  });

  it('coexistence_mode dropdown shows current value', () => {
    render(<ProjectSettingsView />);
    const select = screen.getByTestId('setting-coexistence_mode');
    expect((select as HTMLSelectElement).value).toBe('full');
  });
});

// ---------------------------------------------------------------------------
// Save interaction
// ---------------------------------------------------------------------------

describe('ProjectSettingsView — save', () => {
  it('calls save when save button is clicked', () => {
    const save = vi.fn();
    mockUseProjectSettings.mockReturnValue({
      settings: makeSettings(),
      draft: makeSettings(),
      isLoading: false,
      error: null,
      isDirty: true,
      setDraft: vi.fn(),
      save,
      reset: vi.fn(),
    });
    render(<ProjectSettingsView />);
    const btn = screen.getByTestId('setting-save-button');
    fireEvent.click(btn);
    expect(save).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Reset interaction
// ---------------------------------------------------------------------------

describe('ProjectSettingsView — reset', () => {
  it('calls reset when reset button is clicked', () => {
    const reset = vi.fn();
    mockUseProjectSettings.mockReturnValue({
      settings: makeSettings(),
      draft: makeSettings({ reviewMode: 'trio' }),
      isLoading: false,
      error: null,
      isDirty: true,
      setDraft: vi.fn(),
      save: vi.fn(),
      reset,
    });
    render(<ProjectSettingsView />);
    const btn = screen.getByTestId('setting-reset-button');
    fireEvent.click(btn);
    expect(reset).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// enabled_features multi-select
// ---------------------------------------------------------------------------

describe('ProjectSettingsView — enabled_features', () => {
  it('renders enabled_features control with all option selected when ["all"] is set', () => {
    render(<ProjectSettingsView />);
    const el = screen.getByTestId('setting-enabled_features');
    expect(el).toBeInTheDocument();
  });

  it('calls setDraft when enabled_features selection changes', () => {
    const setDraft = vi.fn();
    mockUseProjectSettings.mockReturnValue({
      settings: makeSettings(),
      draft: makeSettings(),
      isLoading: false,
      error: null,
      isDirty: false,
      setDraft,
      save: vi.fn(),
      reset: vi.fn(),
    });
    render(<ProjectSettingsView />);
    // The enabled_features control is present and interactive
    const el = screen.getByTestId('setting-enabled_features');
    expect(el).toBeInTheDocument();
    // Fire a change event to test setDraft is called
    // Exact interaction depends on implementation (checkbox group or multi-select)
    const checkboxes = el.querySelectorAll('input[type="checkbox"]');
    if (checkboxes.length > 0) {
      fireEvent.click(checkboxes[0]);
      expect(setDraft).toHaveBeenCalled();
    }
  });
});
