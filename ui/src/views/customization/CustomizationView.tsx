/**
 * CustomizationView — 13 agent × model + personality configuration UI.
 * WHY: Allows user to tune each agent's model and personality per scope.
 * SCREEN_REQUIREMENTS §3.8 / §4.7
 * Ported from ui/prototype/screens-c.jsx CustomizationView.
 * All interactions are noop in this milestone; real mutations wired in M3+.
 * Types aligned with daemon prefs schema (routes/prefs.ts LearnedGuidanceEntry).
 */
import { ROSTER, type RosterEntry } from '../room/roster';

// -------------------------------------------------------------------------
// Types — aligned with daemon agentPrefsSchema
// -------------------------------------------------------------------------

export type ModelId = 'opus' | 'sonnet' | 'haiku';
export type PersonalityPresetId = 'default' | 'friendly-mentor' | 'strict-drill' | 'detective';
export type ScopeId = 'user' | 'project';

export interface PersonalityPreset {
  id: PersonalityPresetId;
  name: string;
  desc: string;
}

export interface AgentCustomization {
  agentId: string;
  model: ModelId;
  preset: PersonalityPresetId;
  scope: ScopeId;
  custom: string;
}

// -------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------

const PERSONALITY_PRESETS: PersonalityPreset[] = [
  { id: 'default',         name: 'Default',         desc: '標準。プロンプトは原型のまま。' },
  { id: 'friendly-mentor', name: 'Friendly Mentor',  desc: 'やさしく褒める。初学者向け。' },
  { id: 'strict-drill',    name: 'Strict Drill',     desc: '厳しく指摘、根拠重視。' },
  { id: 'detective',       name: 'Detective',        desc: '問いで深掘り。仮説検証型。' },
];

const MODELS: { id: ModelId; label: string }[] = [
  { id: 'opus',   label: 'opus' },
  { id: 'sonnet', label: 'sonnet' },
  { id: 'haiku',  label: 'haiku' },
];

// -------------------------------------------------------------------------
// Mock data — 13 agents
// -------------------------------------------------------------------------

const MOCK_SETTINGS: Record<string, AgentCustomization> = {
  'pm':            { agentId: 'pm',            model: 'opus',   preset: 'default',         scope: 'user',    custom: '' },
  'dev':           { agentId: 'dev',           model: 'sonnet', preset: 'friendly-mentor', scope: 'project', custom: 'TDD red 順序の遵守を最優先で。' },
  'rev':           { agentId: 'rev',           model: 'sonnet', preset: 'default',         scope: 'user',    custom: '' },
  'rev-code':      { agentId: 'rev-code',      model: 'sonnet', preset: 'strict-drill',    scope: 'project', custom: '' },
  'rev-sec':       { agentId: 'rev-sec',       model: 'opus',   preset: 'detective',       scope: 'user',    custom: 'OWASP top 10 を必ず根拠に。' },
  'rev-test':      { agentId: 'rev-test',      model: 'haiku',  preset: 'default',         scope: 'user',    custom: '' },
  'retro-pm':      { agentId: 'retro-pm',      model: 'opus',   preset: 'default',         scope: 'user',    custom: '' },
  'retro-counter': { agentId: 'retro-counter', model: 'opus',   preset: 'strict-drill',    scope: 'user',    custom: '' },
  'retro-meta':    { agentId: 'retro-meta',    model: 'opus',   preset: 'detective',       scope: 'user',    custom: '' },
  'retro-pj':      { agentId: 'retro-pj',      model: 'sonnet', preset: 'default',         scope: 'user',    custom: '' },
  'retro-research':{ agentId: 'retro-research',model: 'sonnet', preset: 'default',         scope: 'user',    custom: '' },
  'retro-proc':    { agentId: 'retro-proc',    model: 'sonnet', preset: 'default',         scope: 'user',    custom: '' },
  'retro-agg':     { agentId: 'retro-agg',     model: 'opus',   preset: 'default',         scope: 'user',    custom: '' },
};

// -------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------

interface ModelSelectorProps {
  currentModel: ModelId;
  agentId: string;
}

function ModelSelector({ currentModel, agentId }: ModelSelectorProps): JSX.Element {
  return (
    <div
      data-testid="model-selector"
      className="flex border-2 border-border overflow-hidden w-fit"
    >
      {MODELS.map((m) => (
        <button
          key={m.id}
          data-testid={`model-option-${m.id}`}
          className={`px-sp-3 py-1 text-fs-xs font-bold font-mono border-r border-border last:border-r-0 ${
            currentModel === m.id
              ? 'bg-accent text-white'
              : 'bg-transparent text-text-muted hover:bg-bg3'
          }`}
          /* WHY noop: real mutation wired in M3+ via prefsRouter */
          onClick={() => undefined}
          aria-pressed={currentModel === m.id}
          aria-label={`${agentId} model ${m.id}`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

interface PersonalityDisplayProps {
  preset: PersonalityPreset | undefined;
  custom: string;
}

function PersonalityDisplay({ preset, custom }: PersonalityDisplayProps): JSX.Element {
  return (
    <div data-testid="personality-display" className="flex flex-col gap-sp-1">
      <span className="text-fs-xs px-sp-2 py-0.5 bg-bg3 border border-border font-bold text-fg1 w-fit">
        {preset?.name ?? 'default'}
      </span>
      {custom && (
        <div className="text-fs-xs font-mono text-fg1 px-sp-2 py-sp-1 bg-bg3 border-l-2 border-accent leading-relaxed">
          {custom}
        </div>
      )}
      {custom && (
        <span className="text-fs-xs text-text-muted">+ custom override</span>
      )}
    </div>
  );
}

interface AgentRowProps {
  entry: RosterEntry;
  settings: AgentCustomization;
}

function AgentRow({ entry, settings }: AgentRowProps): JSX.Element {
  const preset = PERSONALITY_PRESETS.find((p) => p.id === settings.preset);

  return (
    <div
      data-testid="agent-row"
      className="grid gap-sp-2 p-sp-2 bg-bg1 border-b border-border items-center"
      style={{ gridTemplateColumns: '160px 1fr 1.4fr 72px' }}
    >
      {/* Agent identity */}
      <div className="flex flex-col gap-0.5">
        <span className="text-fs-sm font-bold text-fg1">{entry.name}</span>
        <span className="text-fs-xs text-text-muted">{entry.role}</span>
      </div>

      {/* Model selector */}
      <ModelSelector currentModel={settings.model} agentId={entry.id} />

      {/* Personality */}
      <PersonalityDisplay preset={preset} custom={settings.custom} />

      {/* Scope */}
      <div>
        <span
          data-testid="scope-badge"
          className={`text-fs-xs font-bold px-sp-2 py-0.5 border border-border ${
            settings.scope === 'project'
              ? 'bg-accent text-white'
              : 'bg-bg3 text-fg2'
          }`}
        >
          {settings.scope}
        </span>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------------

export function CustomizationView(): JSX.Element {
  const projectOverrideCount = Object.values(MOCK_SETTINGS).filter(
    (s) => s.scope === 'project'
  ).length;

  return (
    <div
      data-testid="customization-view"
      className="bg-bg2 rounded-card p-sp-4 flex flex-col gap-sp-3"
    >
      {/* Header */}
      <div className="flex items-center gap-sp-3 flex-wrap">
        <span
          data-testid="customization-title"
          className="text-fs-md font-bold text-fg1"
        >
          Customization Layer — 13 agent
        </span>
        <span className="text-fs-xs px-sp-2 py-0.5 border border-border bg-bg3 text-fg2">
          scope: <strong>user-prefs</strong> / project override {projectOverrideCount}件
        </span>
        <button
          className="ml-auto text-fs-xs px-sp-3 py-1 border border-border bg-bg2 text-fg1 hover:bg-bg3"
          onClick={() => undefined}
        >
          Reset to defaults
        </button>
      </div>

      {/* Preset legend */}
      <div className="grid grid-cols-4 gap-sp-2">
        {PERSONALITY_PRESETS.map((p) => (
          <div key={p.id} className="bg-bg3 border-2 border-border p-sp-2">
            <div className="text-fs-xs font-bold mb-0.5">{p.name}</div>
            <div className="text-fs-xs text-text-muted leading-relaxed">{p.desc}</div>
          </div>
        ))}
      </div>

      {/* Table header */}
      <div
        className="grid gap-sp-2 px-sp-2 pb-sp-1 border-b-2 border-border text-fs-xs text-text-muted uppercase tracking-widest"
        style={{ gridTemplateColumns: '160px 1fr 1.4fr 72px' }}
      >
        <span>AGENT</span>
        <span>MODEL</span>
        <span>PERSONALITY</span>
        <span>SCOPE</span>
      </div>

      {/* Agent rows */}
      <div className="flex flex-col">
        {ROSTER.map((entry) => {
          const settings = MOCK_SETTINGS[entry.id] ?? {
            agentId: entry.id,
            model: 'sonnet' as ModelId,
            preset: 'default' as PersonalityPresetId,
            scope: 'user' as ScopeId,
            custom: '',
          };
          return (
            <AgentRow key={entry.id} entry={entry} settings={settings} />
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="text-fs-xs text-text-muted bg-bg3 border-2 border-dashed border-border p-sp-2 leading-relaxed">
        scope: user-prefs はすべての PJ に適用 / project は当 PJ のみ override。
        custom override は preset の上に重ねがけされ、最終 prompt は両方を結合して agent に渡される。
      </div>
    </div>
  );
}
