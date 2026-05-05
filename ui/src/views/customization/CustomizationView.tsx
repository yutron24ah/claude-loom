/**
 * CustomizationView — 13 agent × model + personality configuration UI.
 * WHY: Allows user to tune each agent's model and personality per scope.
 * SCREEN_REQUIREMENTS §3.8 / §4.7
 * Ported from ui/prototype/screens-c.jsx CustomizationView.
 * M0.11.4 t15: rewritten to use rpg-frame / rpg-title / chip / btn-px (Phase A SSoT).
 * All interactions are noop in this milestone; real mutations wired in M3+.
 * Types aligned with daemon prefs schema (routes/prefs.ts LearnedGuidanceEntry).
 */
import { CatSprite } from '../../components/CatSprite';
import { ROSTER, type RosterEntry } from '../room/roster';

// -------------------------------------------------------------------------
// Types — aligned with daemon agentPrefsSchema
// -------------------------------------------------------------------------

export type ModelId = 'opus' | 'sonnet' | 'haiku';
export type PersonalityPresetId = 'default' | 'friendly-mentor' | 'strict-drill' | 'detective';
export type ScopeId = 'user' | 'project';

export interface PersonalityPreset {
  id: PersonalityPresetId;
  /** Display emoji for the preset */
  emoji: string;
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
// Constants — typed to avoid string literal scatter (Principle: avoid string literals)
// -------------------------------------------------------------------------

const PERSONALITY_PRESETS: PersonalityPreset[] = [
  { id: 'default',         emoji: '',   name: 'Default',         desc: '標準。プロンプトは原型のまま。' },
  { id: 'friendly-mentor', emoji: '',   name: 'Friendly Mentor',  desc: 'やさしく褒める。初学者向け。' },
  { id: 'strict-drill',    emoji: '',   name: 'Strict Drill',     desc: '厳しく指摘、根拠重視。' },
  { id: 'detective',       emoji: '',   name: 'Detective',        desc: '問いで深掘り。仮説検証型。' },
];

const MODELS: { id: ModelId; label: string; color: string }[] = [
  { id: 'opus',   label: 'opus',   color: 'var(--p-accent)' },
  { id: 'sonnet', label: 'sonnet', color: 'var(--p-success)' },
  { id: 'haiku',  label: 'haiku',  color: 'var(--p-stone)' },
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
      style={{ display: 'flex', border: '2px solid var(--p-border)', overflow: 'hidden', width: 'fit-content' }}
    >
      {MODELS.map((m) => (
        <button
          key={m.id}
          data-testid={`model-option-${m.id}`}
          style={{
            padding: '4px 10px',
            fontSize: 10,
            fontWeight: 700,
            fontFamily: 'ui-monospace, monospace',
            background: currentModel === m.id ? m.color : 'transparent',
            color: currentModel === m.id ? 'white' : 'var(--p-text-muted)',
            border: 'none',
            borderRight: '1px solid var(--p-border)',
            cursor: 'pointer',
          }}
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
    <div data-testid="personality-display" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span className="chip" style={{ background: 'var(--p-tint)' }}>
        {preset?.name ?? 'default'}
      </span>
      {custom && (
        <div style={{
          fontSize: 10,
          fontFamily: 'ui-monospace, monospace',
          color: 'var(--p-text)',
          padding: '4px 6px',
          background: 'var(--p-tint)',
          borderLeft: '3px solid var(--p-accent)',
        }}>
          {custom}
        </div>
      )}
      {custom && (
        <span style={{ fontSize: 9, color: 'var(--p-text-muted)' }}>+ custom override</span>
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
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr 1.4fr 80px',
        gap: 8,
        padding: '8px 10px',
        alignItems: 'center',
        background: 'var(--p-paper)',
        borderBottom: '1px solid var(--p-border)',
      }}
    >
      {/* Agent identity with CatSprite */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <CatSprite size={28} fur={entry.fur} cheek={entry.cheek} hat={entry.hat} pose="sit" />
        <div>
          <div style={{ fontSize: 11, fontWeight: 700 }}>{entry.name}</div>
          <div style={{ fontSize: 8, color: 'var(--p-text-muted)' }}>{entry.role}</div>
        </div>
      </div>

      {/* Model selector — segmented */}
      <ModelSelector currentModel={settings.model} agentId={entry.id} />

      {/* Personality */}
      <PersonalityDisplay preset={preset} custom={settings.custom} />

      {/* Scope */}
      <div>
        <span
          data-testid="scope-badge"
          className="chip"
          style={settings.scope === 'project'
            ? { background: 'var(--p-warn)', color: 'white', borderColor: 'var(--p-warn)' }
            : undefined}
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
      className="rpg-frame pixel"
      style={{ padding: 18 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div
          data-testid="customization-title"
          className="rpg-title"
        >
          Customization Layer — 13 agent
        </div>
        <span className="chip">
          scope: <b style={{ marginLeft: 4 }}>user-prefs</b> / project override {projectOverrideCount}件
        </span>
        <div style={{ flex: 1 }} />
        <button className="btn-px ghost" onClick={() => undefined}>
          Reset to defaults
        </button>
      </div>

      {/* Preset legend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
        {PERSONALITY_PRESETS.map((p) => (
          <div key={p.id} style={{
            background: 'var(--p-tint)',
            border: '2px solid var(--p-border)',
            padding: '8px 10px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{p.name}</div>
            <div style={{ fontSize: 9, color: 'var(--p-text-muted)', lineHeight: 1.4 }}>{p.desc}</div>
          </div>
        ))}
      </div>

      {/* Table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr 1.4fr 80px',
        gap: 8,
        padding: '6px 10px',
        fontSize: 9,
        color: 'var(--p-text-muted)',
        letterSpacing: '0.06em',
        borderBottom: '2px solid var(--p-border)',
      }}>
        <span>AGENT</span>
        <span>MODEL</span>
        <span>PERSONALITY</span>
        <span>SCOPE</span>
      </div>

      {/* Agent rows */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0 }}>
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
      <div style={{
        marginTop: 12,
        padding: '8px 12px',
        fontSize: 10,
        color: 'var(--p-text-muted)',
        background: 'var(--p-tint)',
        border: '2px dashed var(--p-border)',
        lineHeight: 1.5,
      }}>
        scope: user-prefs はすべての PJ に適用 / project は当 PJ のみ override。
        custom override は preset の上に重ねがけされ、最終 prompt は両方を結合して agent に渡される。
      </div>
    </div>
  );
}
