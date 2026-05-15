/**
 * ProjectSettingsView — project-level config form, redesign-driven.
 *
 * WHY: M0.15 t10 — replaces M0.11.4 hardcoded fixture / useProjectSettings hook
 * with useScenario() (redesign WS hook) as the sole data source.
 *
 * SRP: pure render layer. Data comes from useScenario().settings.
 * Write hookup (PUT /settings) is Phase 5 t16 — buttons are noop here.
 *
 * REQ-068 acceptance criteria.
 *
 * data-testid map (matches settings-mock-active.test.tsx assertions):
 *   project-settings-view              → outer container
 *   setting-daemonPort                 → daemon port number input
 *   setting-worktreeBase               → worktree base text input
 *   setting-retroSchedule-cron         → retro schedule cron text input
 *   setting-retroSchedule-label        → retro schedule label span
 *   setting-consistencyScope           → consistency scope textarea
 *   setting-hook-preToolUse            → preToolUse hook checkbox
 *   setting-hook-postToolUse           → postToolUse hook checkbox
 *   setting-hook-subagentStop          → subagentStop hook checkbox
 *   setting-reviewer-{id}              → defaultReviewers toggle button (aria-pressed)
 *   setting-parallelLimit              → parallel limit range input
 *   setting-logRetention-days          → log retention days number input
 */
import React from 'react';
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { ProjectSettings } from '@claude-loom/redesign/api/types';
import { useProjectSettingsMutation } from '../../live/useProjectSettingsMutation';
import '../../styles/screens/project-settings.css';

// WHY: Reviewer options mirror the canonical 3-reviewer set from redesign/screens/settings.jsx.
// "all" shorthand and custom entries will be displayed as generic toggles.
const KNOWN_REVIEWERS = ['rev-code', 'rev-test', 'rev-sec'] as const;

// ---------------------------------------------------------------------------
// Row layout helper — mirrors redesign/screens/settings.jsx Row component
// ---------------------------------------------------------------------------

interface RowProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

function Row({ label, hint, children }: RowProps): JSX.Element {
  return (
    <div className="ps-row">
      <div>
        <div className="ps-row__label">{label}</div>
        {hint && <div className="ps-row__hint">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings form — controlled inputs, writes are noop until Phase 5 t16
// ---------------------------------------------------------------------------

interface SettingsFormProps {
  draft: ProjectSettings;
  setDraft: React.Dispatch<React.SetStateAction<ProjectSettings>>;
}

function SettingsForm({ draft, setDraft }: SettingsFormProps): JSX.Element {
  // WHY: Generic deep-setter mirrors the path-based set() in redesign/screens/settings.jsx.
  // Using explicit field setters here keeps TypeScript types sound (no string indexing).
  return (
    <div className="ps-form">
      {/* Daemon Port */}
      <Row label="Daemon Port" hint="loom daemon が listen する port。WS + REST 共用。">
        <input
          type="number"
          data-testid="setting-daemonPort"
          value={draft.daemonPort}
          onChange={(e) =>
            setDraft((d) => ({ ...d, daemonPort: +e.target.value }))
          }
          // WHY: noop onClick per Phase 5 t16 write hookup deferral
          className="ps-input ps-input--number"
        />
      </Row>

      {/* Worktree Base */}
      <Row label="Worktree Base" hint="新 worktree を作る親 directory。git worktree add の引数。">
        <input
          type="text"
          data-testid="setting-worktreeBase"
          value={draft.worktreeBase}
          onChange={(e) =>
            setDraft((d) => ({ ...d, worktreeBase: e.target.value }))
          }
          className="ps-input ps-input--text"
        />
      </Row>

      {/* Retro Schedule */}
      <Row label="Retro Schedule" hint="自動 retro の cron。enable=off で手動のみ。">
        <div className="ps-retro-row">
          <label className="ps-retro-label">
            <input
              type="checkbox"
              data-testid="setting-retroSchedule-enabled"
              checked={draft.retroSchedule.enabled}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  retroSchedule: { ...d.retroSchedule, enabled: e.target.checked },
                }))
              }
            />{' '}
            enabled
          </label>
          <input
            type="text"
            data-testid="setting-retroSchedule-cron"
            value={draft.retroSchedule.cron}
            disabled={!draft.retroSchedule.enabled}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                retroSchedule: { ...d.retroSchedule, cron: e.target.value },
              }))
            }
            className="ps-input ps-input--cron"
            style={{ opacity: draft.retroSchedule.enabled ? 1 : 0.4 }}
          />
          <span
            data-testid="setting-retroSchedule-label"
            className="ps-retro-cron-label"
          >
            {draft.retroSchedule.label}
          </span>
        </div>
      </Row>

      {/* Consistency Scope */}
      <Row label="Consistency Scope" hint="spec_diff が scan する path glob。1行1件。">
        <textarea
          data-testid="setting-consistencyScope"
          value={draft.consistencyScope.join('\n')}
          rows={3}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              consistencyScope: e.target.value.split('\n').filter(Boolean),
            }))
          }
          className="ps-input ps-input--textarea"
        />
      </Row>

      {/* Hooks */}
      <Row
        label="Hooks"
        hint="Claude Code hook の有効/無効。OFF にすると stream/gantt が止まる。"
      >
        <div className="ps-hooks-row">
          {(
            [
              ['preToolUse', 'PreToolUse'],
              ['postToolUse', 'PostToolUse'],
              ['subagentStop', 'SubagentStop'],
            ] as const
          ).map(([k, l]) => (
            <label
              key={k}
              className="ps-hooks-label"
            >
              <input
                type="checkbox"
                data-testid={`setting-hook-${k}`}
                checked={draft.hooks[k]}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    hooks: { ...d.hooks, [k]: e.target.checked },
                  }))
                }
              />{' '}
              {l}
            </label>
          ))}
        </div>
      </Row>

      {/* Default Reviewers */}
      <Row
        label="Default Reviewers"
        hint="PR review で自動 dispatch される reviewer の既定セット。"
      >
        <div className="ps-reviewers-row">
          {KNOWN_REVIEWERS.map((r) => {
            const on = draft.defaultReviewers.includes(r);
            return (
              <button
                key={r}
                data-testid={`setting-reviewer-${r}`}
                aria-pressed={on}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    defaultReviewers: on
                      ? d.defaultReviewers.filter((x) => x !== r)
                      : [...d.defaultReviewers, r],
                  }))
                }
                className="ps-reviewer-btn"
                style={{
                  background: on ? 'var(--p-accent)' : 'var(--p-tint)',
                  color: on ? 'white' : 'var(--p-text)',
                }}
              >
                {on ? '✓ ' : ''}
                {r}
              </button>
            );
          })}
        </div>
      </Row>

      {/* Parallel Limit */}
      <Row
        label="Parallel Limit"
        hint="同時 dispatch 可能な subagent 数の上限。超えると queue 待ち。"
      >
        <div className="ps-parallel-row">
          <input
            type="range"
            data-testid="setting-parallelLimit"
            min={1}
            max={8}
            value={draft.parallelLimit}
            onChange={(e) =>
              setDraft((d) => ({ ...d, parallelLimit: +e.target.value }))
            }
            className="ps-input--range"
          />
          <span className="ps-parallel-value">
            {draft.parallelLimit}
          </span>
        </div>
      </Row>

      {/* Log Retention */}
      <Row
        label="Log Retention"
        hint="agent_history.jsonl と stream tail の保持日数。古いものは zip archive。"
      >
        <div className="ps-log-row">
          <input
            type="number"
            data-testid="setting-logRetention-days"
            value={draft.logRetention.days}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                logRetention: { ...d.logRetention, days: +e.target.value },
              }))
            }
            className="ps-input ps-input--log-days"
          />
          <span className="ps-log-unit">日</span>
        </div>
      </Row>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProjectSettingsView(): JSX.Element {
  const sc = useScenario();
  const s = sc.settings;

  // WHY: local draft state for controlled form inputs.
  // Write hookup (PUT /settings) wired in M0.15 t16 via useProjectSettingsMutation.
  const [draft, setDraft] = React.useState<ProjectSettings>(s);
  const dirty = JSON.stringify(draft) !== JSON.stringify(s);
  const { mutate: saveMutation } = useProjectSettingsMutation();

  return (
    <div
      data-testid="project-settings-view"
      className="ps-screen"
    >
      {/* Header */}
      <div className="ps-header">
        <div className="ps-header__title">⚙ PROJECT SETTINGS</div>
        <span className="chip ps-chip--mono">
          {sc.project}/.claude/loom/project.json
        </span>
        <div className="ps-header__spacer" />
        {dirty && (
          <span className="ps-header__unsaved">
            未保存
          </span>
        )}
        {/* WHY: cancel resets draft; save calls useProjectSettingsMutation (M0.15 t16) */}
        <button
          className="btn-px ghost"
          onClick={() => setDraft(s)}
          disabled={!dirty}
        >
          取消
        </button>
        <button
          className={`btn-px ${dirty ? 'primary' : 'ghost'}`}
          onClick={() => saveMutation(draft)}
        >
          保存
        </button>
      </div>

      <SettingsForm draft={draft} setDraft={setDraft} />

      {/* Footer note */}
      <div className="ps-footer">
        user-prefs (~/.claude/loom/user-prefs.json) は CLI からのみ編集。
        <br />
        ここでの保存は project.json の write のみ — daemon が fs.watch で即反映。
        <br />
        「reset to defaults」は CLI の loom config reset から。GUI からの破壊的操作は意図的に外してます。
      </div>
    </div>
  );
}
