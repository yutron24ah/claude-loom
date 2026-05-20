/**
 * LeafEditor — right pane editor for the selected tree leaf in CustomizationView.
 *
 * WHY: M0.18 Phase 1 t1 — separates the editing form from the tree navigation (SRP).
 * Leaf kind ('agent' | 'skill') determines which editor fields are shown:
 * - agent: model selector (Opus/Sonnet/Haiku) + personality preset + learned_guidance count
 * - skill scope: personality preset + learned_guidance count (no model selector)
 *
 * Design SSoT: customization.jsx §RIGHT — LEAF EDITOR section.
 *
 * WRITE badge is shown in editor header only for aggregator (writePermission=true in LEAVES).
 */
import { CatSprite } from '../../components/CatSprite';
import { ROSTER } from '../../data/roster';
import type { LeafKey } from './TreeNav';

// -------------------------------------------------------------------------
// Leaf metadata map (mirrors design SSoT customization.jsx LEAVES)
// WHY: static constant avoids prop-drilling the full leaf config; the component
// just needs the selectedKey to look up its own metadata here.
// -------------------------------------------------------------------------

/** Leaf kind — controls which editor fields appear */
type LeafKind = 'agent' | 'skill';

interface LeafMeta {
  kind: LeafKind;
  /** ROSTER entry id for the cat sprite */
  spiritId: string;
  preset: string;
  model?: string;
  custom?: string;
  writePermission?: boolean;
  note?: string;
}

// Maps leaf key path → metadata (static fixture, matches customization.jsx LEAVES)
const LEAVES: Record<LeafKey, LeafMeta> = {
  'agents/loom-pm': {
    kind: 'agent', spiritId: 'pm', preset: 'default', model: 'opus', custom: '',
    note: 'PM は model 切替不可 (SPEC §3.9.16 で固定)',
  },
  'agents/loom-developer': {
    kind: 'agent', spiritId: 'dev', preset: 'friendly-mentor', model: 'sonnet',
    custom: 'TDD red 順序の遵守を最優先で。',
  },
  'agents/loom-retro-pm': {
    kind: 'agent', spiritId: 'retro-pm', preset: 'default', model: 'opus', custom: '',
  },
  'skills/loom-review/strategies/single':        { kind: 'skill', spiritId: 'rev',          preset: 'default',       custom: '' },
  'skills/loom-review/strategies/trio/code':     { kind: 'skill', spiritId: 'rev-code',      preset: 'strict-drill',  custom: '' },
  'skills/loom-review/strategies/trio/security': { kind: 'skill', spiritId: 'rev-sec',       preset: 'detective',
    custom: 'OWASP top 10 を必ず根拠に。' },
  'skills/loom-review/strategies/trio/test':     { kind: 'skill', spiritId: 'rev-test',      preset: 'default',       custom: '' },
  'skills/loom-retro/lenses/pj-axis':            { kind: 'skill', spiritId: 'retro-pj',      preset: 'default',       custom: '' },
  'skills/loom-retro/lenses/process-axis':       { kind: 'skill', spiritId: 'retro-proc',    preset: 'default',       custom: '' },
  'skills/loom-retro/lenses/meta-axis':          { kind: 'skill', spiritId: 'retro-meta',    preset: 'detective',     custom: '' },
  'skills/loom-retro/lenses/researcher':         { kind: 'skill', spiritId: 'retro-research',preset: 'default',       custom: '' },
  'skills/loom-retro/stages/counter-arguer':     { kind: 'skill', spiritId: 'retro-counter', preset: 'strict-drill',  custom: '' },
  'skills/loom-retro/stages/aggregator':         {
    kind: 'skill', spiritId: 'retro-agg', preset: 'default', writePermission: true,
    custom: 'carryover_count >= 3 で auto-expire marker 付与。',
  },
};

// -------------------------------------------------------------------------
// Preset definitions (mirror of design SSoT PRESETS — read-only)
// -------------------------------------------------------------------------

interface PresetDef {
  id: string;
  emoji: string;
  name: string;
  desc: string;
}

const PRESETS: PresetDef[] = [
  { id: 'default',         emoji: '😌', name: 'Default',         desc: '標準。プロンプトは原型のまま。' },
  { id: 'friendly-mentor', emoji: '🌱', name: 'Friendly Mentor', desc: 'やさしく褒める。初学者向け。' },
  { id: 'strict-drill',    emoji: '💪', name: 'Strict Drill',    desc: '厳しく指摘、根拠重視。' },
  { id: 'detective',       emoji: '🔍', name: 'Detective',       desc: '問いで深掘り。仮説検証型。' },
];

// Model definitions (agent-only)
const MODELS = [
  { id: 'opus',   color: 'var(--p-accent)' },
  { id: 'sonnet', color: 'var(--p-success)' },
  { id: 'haiku',  color: 'var(--p-stone)' },
] as const;

// -------------------------------------------------------------------------
// Props
// -------------------------------------------------------------------------

export interface LeafEditorProps {
  selectedKey: LeafKey | null;
  /** Called when model is changed (agent kind only) */
  onModelChange?: (key: LeafKey, model: string) => void;
  /** Called when preset is changed */
  onPresetChange?: (key: LeafKey, preset: string) => void;
}

// -------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------

export function LeafEditor({ selectedKey, onModelChange, onPresetChange }: LeafEditorProps): JSX.Element {
  const leaf = selectedKey ? LEAVES[selectedKey] : null;
  const cat = leaf ? ROSTER.find((r) => r.id === leaf.spiritId) : null;

  if (!leaf || !selectedKey) {
    return (
      <div data-testid="leaf-editor" className="cust-editor cust-editor--empty">
        <div className="cust-editor__hint">
          左の tree から agent / skill scope を選んでください
        </div>
      </div>
    );
  }

  return (
    <div data-testid="leaf-editor" className="cust-editor">
      {/* ---- Header ---- */}
      <div className="cust-editor__hd">
        {cat && (
          <CatSprite size={42} fur={cat.fur} cheek={cat.cheek} hat={cat.hat} pose="sit" />
        )}
        <div className="cust-editor__hd-info">
          <div className="cust-editor__hd-path">{selectedKey}</div>
          <div className="cust-editor__hd-name">
            {cat?.name ?? '—'}
            <span className="cust-editor__hd-role">{cat?.role}</span>
          </div>
        </div>
        {/* kind badge */}
        <span className={`cust-badge${leaf.kind === 'agent' ? ' cust-badge--agent' : ' cust-badge--skill'}`}>
          {leaf.kind === 'agent' ? 'PERSISTENT AGENT' : 'SKILL SCOPE'}
        </span>
        {/* WRITE badge — aggregator only */}
        {leaf.writePermission && (
          <span data-testid="leaf-editor-write-badge" className="cust-badge cust-badge--write">
            WRITE
          </span>
        )}
      </div>

      {/* ---- Model selector — agents only ---- */}
      {leaf.kind === 'agent' && (
        <div className="cust-editor__section" data-testid="leaf-editor-model-selector">
          <div className="cust-editor__label">MODEL</div>
          <div className="cust-editor__model-row">
            {MODELS.map((m) => (
              <div
                key={m.id}
                data-testid={`leaf-editor-model-${m.id}`}
                className="cust-editor__model-btn"
                style={{
                  background: leaf.model === m.id ? m.color : 'transparent',
                  color: leaf.model === m.id ? 'white' : 'var(--p-text-muted)',
                }}
                onClick={() => onModelChange?.(selectedKey, m.id)}
              >
                {m.id}
              </div>
            ))}
          </div>
          {leaf.note && (
            <div className="cust-editor__note">{leaf.note}</div>
          )}
        </div>
      )}

      {/* ---- Personality preset ---- */}
      <div className="cust-editor__section">
        <div className="cust-editor__label">PERSONALITY PRESET</div>
        <div className="cust-editor__preset-grid">
          {PRESETS.map((p) => (
            <div
              key={p.id}
              data-testid={`leaf-editor-preset-${p.id}`}
              className="cust-editor__preset-btn"
              style={{
                background: leaf.preset === p.id ? 'var(--p-accent)' : 'var(--p-tint)',
                color: leaf.preset === p.id ? 'white' : 'var(--p-text)',
              }}
              onClick={() => onPresetChange?.(selectedKey, p.id)}
            >
              <div className="cust-editor__preset-name">{p.emoji} {p.name}</div>
              <div className="cust-editor__preset-desc">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Custom override ---- */}
      <div className="cust-editor__section">
        <div className="cust-editor__label">CUSTOM OVERRIDE — free-form prompt addendum</div>
        <div className="cust-editor__custom-text">
          {leaf.custom || '(空 — preset がそのまま使われます)'}
        </div>
      </div>

      {/* ---- Learned guidance count ---- */}
      <div className="cust-editor__guidance-row">
        <div className="cust-editor__guidance-box">
          <div className="cust-editor__guidance-label">LEARNED GUIDANCE</div>
          <div className="cust-editor__guidance-count">0 entries</div>
        </div>
        <div className="cust-editor__guidance-box">
          <div className="cust-editor__guidance-label">EFFECTIVE PROMPT</div>
          <div className="cust-editor__guidance-preview">preview ▸</div>
        </div>
      </div>

      {/* ---- Footer info ---- */}
      <div className="cust-editor__footer">
        ◆ <b>2-layer prompt</b>: persona + tactical instructions の二層構成。<br />
        ◆ custom override は preset の上に重ねがけ。<br />
        {leaf.kind === 'skill' && (
          <>◆ skill scope では personality を leaf 単位で分離可能。</>
        )}
      </div>
    </div>
  );
}
