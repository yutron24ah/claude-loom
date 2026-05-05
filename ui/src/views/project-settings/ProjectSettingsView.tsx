/**
 * ProjectSettingsView — project.json settings view + edit UI.
 *
 * WHY: M5 t3. Allows user to inspect and edit project-level settings stored
 * in project.json (review_mode, coexistence_mode, enabled_features,
 * commit_language) and project DB fields (name, specPath, pool limits).
 *
 * SRP: this component is a pure render layer. All state + mutations are
 * delegated to useProjectSettings hook.
 *
 * M0.11.4 Phase C t16: RPG style — rpg-frame for outer container and sections,
 * rpg-title for section headers, rpg-label for field labels,
 * btn-px for save/reset buttons.
 *
 * SPEC §3.6.10 compliance: dropdown values come from typed constants/enums,
 * never raw string literals in comparisons.
 *
 * data-testid map:
 *   project-settings-view        → outer container
 *   project-settings-loading     → loading indicator
 *   project-settings-error       → error message
 *   setting-review_mode          → review_mode <select>
 *   setting-coexistence_mode     → coexistence_mode <select>
 *   setting-enabled_features     → enabled_features checkbox group container
 *   setting-commit_language      → commit_language <select>
 *   setting-save-button          → Save <button>
 *   setting-reset-button         → Reset <button>
 */
import { useProjectSettings } from '../../live/useProjectSettings';
import type { ProjectSettings, ReviewMode, CoexistenceMode, CommitLanguage } from '../../live/useProjectSettings';

// ---------------------------------------------------------------------------
// Constants — SPEC §3.6.10: no raw string literals in comparisons
// ---------------------------------------------------------------------------

const REVIEW_MODE_OPTIONS: { value: ReviewMode; label: string }[] = [
  { value: 'single', label: 'single (default — 1 reviewer)' },
  { value: 'trio', label: 'trio (3 reviewers in parallel)' },
];

const COEXISTENCE_MODE_OPTIONS: { value: CoexistenceMode; label: string }[] = [
  { value: 'full', label: 'full (all loom features)' },
  { value: 'coexist', label: 'coexist (loom + other tools)' },
  { value: 'custom', label: 'custom (manual feature selection)' },
];

const COMMIT_LANGUAGE_OPTIONS: { value: CommitLanguage; label: string }[] = [
  { value: 'any', label: 'any (no restriction)' },
  { value: 'japanese', label: 'japanese' },
  { value: 'english', label: 'english' },
];

// WHY: 5 feature groups + "all" shorthand per SPEC §6.9
const FEATURE_GROUP_OPTIONS = [
  { value: 'all', label: 'all (shorthand — every group enabled)' },
  { value: 'core', label: 'core' },
  { value: 'retro', label: 'retro' },
  { value: 'customization', label: 'customization' },
  { value: 'worktree', label: 'worktree' },
  { value: 'native-skills', label: 'native-skills' },
] as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ReadOnlyFieldProps {
  label: string;
  value: string | null | undefined;
}

function ReadOnlyField({ label, value }: ReadOnlyFieldProps): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="rpg-label">{label}</span>
      <span className="chip">{value ?? '—'}</span>
    </div>
  );
}

interface EnabledFeaturesProps {
  value: string[];
  onChange: (features: string[]) => void;
}

function EnabledFeaturesControl({ value, onChange }: EnabledFeaturesProps): JSX.Element {
  function handleToggle(feature: string): void {
    if (feature === 'all') {
      // "all" shorthand: toggle the whole list
      onChange(value.includes('all') ? [] : ['all']);
      return;
    }
    // Remove "all" shorthand when selecting individual features
    const withoutAll = value.filter((f) => f !== 'all');
    if (withoutAll.includes(feature)) {
      onChange(withoutAll.filter((f) => f !== feature));
    } else {
      onChange([...withoutAll, feature]);
    }
  }

  return (
    <div
      data-testid="setting-enabled_features"
      className="flex flex-col gap-sp-1"
    >
      {FEATURE_GROUP_OPTIONS.map(({ value: featureVal, label }) => (
        <label
          key={featureVal}
          className="flex items-center gap-sp-2 text-fs-xs font-mono text-fg1 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={value.includes(featureVal)}
            onChange={() => handleToggle(featureVal)}
            className="accent-accent"
          />
          {label}
        </label>
      ))}
    </div>
  );
}

interface SettingsFormProps {
  draft: ProjectSettings;
  settings: ProjectSettings;
  isDirty: boolean;
  setDraft: (patch: Partial<ProjectSettings>) => void;
  save: () => void;
  reset: () => void;
}

function SettingsForm({
  draft,
  settings,
  isDirty,
  setDraft,
  save,
  reset,
}: SettingsFormProps): JSX.Element {
  return (
    <div className="flex flex-col gap-sp-4">
      {/* Read-only section */}
      <section className="rpg-frame flex flex-col gap-sp-2">
        <h2 className="rpg-title border-b border-border pb-sp-1">
          Project Info (read-only)
        </h2>
        <div className="grid grid-cols-2 gap-sp-2">
          <ReadOnlyField label="project_id" value={settings.projectId} />
          <ReadOnlyField label="name" value={settings.name} />
          <ReadOnlyField label="spec_path" value={settings.specPath} />
          <ReadOnlyField label="branch" value={settings.branch} />
          <ReadOnlyField
            label="created_at"
            value={
              settings.createdAt instanceof Date
                ? settings.createdAt.toLocaleString()
                : String(settings.createdAt)
            }
          />
        </div>
      </section>

      {/* Editable rules section */}
      <section className="rpg-frame flex flex-col gap-sp-2">
        <h2 className="rpg-title border-b border-border pb-sp-1">
          Rules (editable)
        </h2>

        {/* review_mode */}
        <div className="flex flex-col gap-0.5">
          <label htmlFor="setting-review_mode" className="rpg-label">
            review_mode
          </label>
          <select
            id="setting-review_mode"
            data-testid="setting-review_mode"
            value={draft.reviewMode}
            onChange={(e) => setDraft({ reviewMode: e.target.value as ReviewMode })}
            className="bg-bg1 border border-border text-fg1 text-fs-xs px-sp-2 py-sp-1 w-fit"
          >
            {REVIEW_MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* coexistence_mode */}
        <div className="flex flex-col gap-0.5">
          <label htmlFor="setting-coexistence_mode" className="rpg-label">
            coexistence_mode
          </label>
          <select
            id="setting-coexistence_mode"
            data-testid="setting-coexistence_mode"
            value={draft.coexistenceMode}
            onChange={(e) => setDraft({ coexistenceMode: e.target.value as CoexistenceMode })}
            className="bg-bg1 border border-border text-fg1 text-fs-xs px-sp-2 py-sp-1 w-fit"
          >
            {COEXISTENCE_MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* enabled_features */}
        <div className="flex flex-col gap-0.5">
          <span className="rpg-label">enabled_features</span>
          <EnabledFeaturesControl
            value={draft.enabledFeatures}
            onChange={(features) => setDraft({ enabledFeatures: features })}
          />
        </div>

        {/* commit_language */}
        <div className="flex flex-col gap-0.5">
          <label htmlFor="setting-commit_language" className="rpg-label">
            commit_language
          </label>
          <select
            id="setting-commit_language"
            data-testid="setting-commit_language"
            value={draft.commitLanguage}
            onChange={(e) => setDraft({ commitLanguage: e.target.value as CommitLanguage })}
            className="bg-bg1 border border-border text-fg1 text-fs-xs px-sp-2 py-sp-1 w-fit"
          >
            {COMMIT_LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Action buttons */}
      <div className="flex gap-sp-2 pt-sp-2 border-t border-border">
        <button
          data-testid="setting-save-button"
          onClick={save}
          disabled={!isDirty}
          className={`btn-px ${isDirty ? 'primary' : 'ghost'}`}
        >
          Save
        </button>
        <button
          data-testid="setting-reset-button"
          onClick={reset}
          className="btn-px ghost"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProjectSettingsView(): JSX.Element {
  const { settings, draft, isLoading, error, isDirty, setDraft, save, reset } =
    useProjectSettings();

  if (isLoading) {
    return (
      <div
        data-testid="project-settings-view"
        className="rpg-frame flex flex-col gap-sp-3 w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div data-testid="project-settings-loading" className="rpg-label py-sp-3">
          読み込み中…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="project-settings-view"
        className="rpg-frame flex flex-col gap-sp-3 w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div data-testid="project-settings-error" className="text-error text-fs-sm py-sp-3">
          接続エラー: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="project-settings-view"
      className="rpg-frame flex flex-col gap-sp-3 w-full max-w-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-sp-2">
        <span className="rpg-title">Project Settings</span>
        {isDirty && (
          <span className="chip">unsaved changes</span>
        )}
      </div>

      {/* Form — shown even while settings are null to render skeleton controls */}
      {settings && draft ? (
        <SettingsForm
          draft={draft}
          settings={settings}
          isDirty={isDirty}
          setDraft={setDraft}
          save={save}
          reset={reset}
        />
      ) : (
        /* Fallback skeleton with all required data-testid anchors */
        <div className="flex flex-col gap-sp-2">
          <select data-testid="setting-review_mode" disabled className="bg-bg1 border border-border text-fg1 text-fs-xs px-sp-2 py-sp-1 w-fit" />
          <select data-testid="setting-coexistence_mode" disabled className="bg-bg1 border border-border text-fg1 text-fs-xs px-sp-2 py-sp-1 w-fit" />
          <div data-testid="setting-enabled_features" />
          <select data-testid="setting-commit_language" disabled className="bg-bg1 border border-border text-fg1 text-fs-xs px-sp-2 py-sp-1 w-fit" />
          <button data-testid="setting-save-button" disabled className="btn-px ghost cursor-not-allowed">Save</button>
          <button data-testid="setting-reset-button" disabled className="btn-px ghost">Reset</button>
        </div>
      )}
    </div>
  );
}
