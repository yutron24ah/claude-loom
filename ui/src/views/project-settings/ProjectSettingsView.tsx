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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '200px 1fr',
        gap: 14,
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: '1px dashed var(--p-border)',
      }}
    >
      <div>
        <div style={{ fontSize: 11, fontWeight: 700 }}>{label}</div>
        {hint && (
          <div
            style={{
              fontSize: 9,
              color: 'var(--p-text-muted)',
              marginTop: 2,
              lineHeight: 1.4,
            }}
          >
            {hint}
          </div>
        )}
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
    <div
      style={{
        maxWidth: 720,
        background: 'var(--p-paper)',
        border: '2px solid var(--p-border)',
        padding: '0 16px',
        boxShadow: '3px 3px 0 0 var(--p-shadow)',
      }}
    >
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
          style={{
            width: 100,
            padding: '4px 8px',
            fontSize: 11,
            border: '1.5px solid var(--p-border)',
            background: 'var(--p-tint)',
            fontFamily: 'ui-monospace, monospace',
          }}
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
          style={{
            width: '100%',
            maxWidth: 360,
            padding: '4px 8px',
            fontSize: 11,
            boxSizing: 'border-box',
            border: '1.5px solid var(--p-border)',
            background: 'var(--p-tint)',
            fontFamily: 'ui-monospace, monospace',
          }}
        />
      </Row>

      {/* Retro Schedule */}
      <Row label="Retro Schedule" hint="自動 retro の cron。enable=off で手動のみ。">
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <label
            style={{
              display: 'inline-flex',
              gap: 4,
              alignItems: 'center',
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
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
            style={{
              width: 140,
              padding: '4px 8px',
              fontSize: 11,
              opacity: draft.retroSchedule.enabled ? 1 : 0.4,
              border: '1.5px solid var(--p-border)',
              background: 'var(--p-tint)',
              fontFamily: 'ui-monospace, monospace',
            }}
          />
          <span
            data-testid="setting-retroSchedule-label"
            style={{ fontSize: 9, color: 'var(--p-text-muted)' }}
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
          style={{
            width: '100%',
            maxWidth: 360,
            padding: '6px 8px',
            fontSize: 10,
            boxSizing: 'border-box',
            border: '1.5px solid var(--p-border)',
            background: 'var(--p-tint)',
            fontFamily: 'ui-monospace, monospace',
            resize: 'vertical',
          }}
        />
      </Row>

      {/* Hooks */}
      <Row
        label="Hooks"
        hint="Claude Code hook の有効/無効。OFF にすると stream/gantt が止まる。"
      >
        <div style={{ display: 'flex', gap: 12, fontSize: 10 }}>
          {(
            [
              ['preToolUse', 'PreToolUse'],
              ['postToolUse', 'PostToolUse'],
              ['subagentStop', 'SubagentStop'],
            ] as const
          ).map(([k, l]) => (
            <label
              key={k}
              style={{
                display: 'inline-flex',
                gap: 4,
                alignItems: 'center',
                cursor: 'pointer',
              }}
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
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
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
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  padding: '3px 8px',
                  fontSize: 9,
                  fontWeight: 700,
                  border: '1.5px solid var(--p-border)',
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="range"
            data-testid="setting-parallelLimit"
            min={1}
            max={8}
            value={draft.parallelLimit}
            onChange={(e) =>
              setDraft((d) => ({ ...d, parallelLimit: +e.target.value }))
            }
            style={{ width: 200 }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'ui-monospace, monospace',
              color: 'var(--p-accent)',
              width: 30,
            }}
          >
            {draft.parallelLimit}
          </span>
        </div>
      </Row>

      {/* Log Retention */}
      <Row
        label="Log Retention"
        hint="agent_history.jsonl と stream tail の保持日数。古いものは zip archive。"
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
            style={{
              width: 80,
              padding: '4px 8px',
              fontSize: 11,
              border: '1.5px solid var(--p-border)',
              background: 'var(--p-tint)',
              fontFamily: 'ui-monospace, monospace',
            }}
          />
          <span style={{ fontSize: 10, color: 'var(--p-text-muted)' }}>日</span>
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

  // WHY: local draft state for controlled form inputs. Write hookup (PUT /settings)
  // is deferred to Phase 5 t16. Save/cancel buttons are present but noop.
  const [draft, setDraft] = React.useState<ProjectSettings>(s);
  const dirty = JSON.stringify(draft) !== JSON.stringify(s);

  return (
    <div
      data-testid="project-settings-view"
      style={{
        position: 'absolute',
        inset: 0,
        padding: 16,
        overflow: 'auto',
        background: 'var(--p-bg-sky)',
      }}
    >
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}
      >
        <div style={{ fontSize: 14, fontWeight: 700 }}>PROJECT SETTINGS</div>
        <span
          className="chip"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          {sc.project}/.claude/loom/project.json
        </span>
        <div style={{ flex: 1 }} />
        {dirty && (
          <span style={{ fontSize: 9, color: 'var(--p-warn)', fontWeight: 700 }}>
            未保存
          </span>
        )}
        {/* WHY: cancel and save are noop — write hookup is Phase 5 t16 */}
        <button
          className="btn-px ghost"
          onClick={() => setDraft(s)}
          disabled={!dirty}
        >
          取消
        </button>
        <button
          className={`btn-px ${dirty ? 'primary' : 'ghost'}`}
          onClick={() => undefined}
        >
          保存
        </button>
      </div>

      <SettingsForm draft={draft} setDraft={setDraft} />

      {/* Footer note */}
      <div
        style={{
          marginTop: 14,
          maxWidth: 720,
          padding: 12,
          fontSize: 9,
          color: 'var(--p-text-muted)',
          background: 'var(--p-paper)',
          border: '2px dashed var(--p-border)',
          lineHeight: 1.6,
        }}
      >
        user-prefs (~/.claude/loom/user-prefs.json) は CLI からのみ編集。
        <br />
        ここでの保存は project.json の write のみ — daemon が fs.watch で即反映。
        <br />
        「reset to defaults」は CLI の loom config reset から。GUI からの破壊的操作は意図的に外してます。
      </div>
    </div>
  );
}
