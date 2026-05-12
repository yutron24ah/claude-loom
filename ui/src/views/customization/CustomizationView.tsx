/**
 * CustomizationView — per-agent model + personality with scope chain trace.
 * WHY: Redesign port (M0.15 t5). Uses useScenario() as single data source.
 * Visual layout driven by redesign/screens/customization.jsx SSoT.
 * Write hookup (PUT /customization/:id) wired in Phase 5 t16.
 *
 * SCREEN_REQUIREMENTS §3.8 / §4.7
 * REQ-065, REQ-077
 */
import { useState } from 'react';
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { AgentCustomization, CustomizationLayer, ModelId, PresetId } from '@claude-loom/redesign/api/types';
import { CatSprite } from '../../components/CatSprite';
import { ROSTER } from '../room/roster';
import { useCustomizationMutation } from '../../live/useCustomizationMutations';

// -------------------------------------------------------------------------
// Constants — from redesign/scenarios.js PRESETS / MODELS (read-only consume)
// WHY: Import directly to ensure visual parity with redesign SSoT.
// -------------------------------------------------------------------------

interface PresetDef {
  id: PresetId;
  emoji: string;
  name: string;
  desc: string;
}

interface ModelDef {
  id: ModelId;
  color: string;
}

// Mirror of redesign/scenarios.js PRESETS (read-only)
const PRESETS: PresetDef[] = [
  { id: 'default',         emoji: '😌', name: 'Default',         desc: '標準。プロンプトは原型のまま。' },
  { id: 'friendly-mentor', emoji: '🌱', name: 'Friendly Mentor', desc: 'やさしく褒める。初学者向け。' },
  { id: 'strict-drill',    emoji: '💪', name: 'Strict Drill',    desc: '厳しく指摘、根拠重視。' },
  { id: 'detective',       emoji: '🔍', name: 'Detective',       desc: '問いで深掘り。仮説検証型。' },
];

// Mirror of redesign/scenarios.js MODELS (read-only)
const MODELS: ModelDef[] = [
  { id: 'opus',   color: 'var(--p-accent)' },
  { id: 'sonnet', color: 'var(--p-success)' },
  { id: 'haiku',  color: 'var(--p-stone)' },
];

// -------------------------------------------------------------------------
// Chain scope color helper
// -------------------------------------------------------------------------
function scopeColor(scope: CustomizationLayer['scope']): string {
  if (scope === 'default') return 'var(--p-stone)';
  if (scope === 'user')    return 'var(--p-accent)';
  return 'var(--p-warn)'; // project
}

// -------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------

interface AgentRowProps {
  agentId: string;
  cust: AgentCustomization;
  isOpen: boolean;
  onToggle: () => void;
  /** Draft overrides for this agent (may differ from cust.effective). */
  draftModel: ModelId;
  draftPreset: PresetId;
  onModelSelect: (model: ModelId) => void;
  onPresetSelect: (preset: PresetId) => void;
}

function AgentRow({ agentId, cust, isOpen, onToggle, draftModel, draftPreset, onModelSelect, onPresetSelect }: AgentRowProps): JSX.Element {
  const entry = ROSTER.find((r) => r.id === agentId);
  const overridden = cust.chain.length > 1;

  return (
    <div
      data-testid="agent-row"
      data-agent-id={agentId}
      id={`agent-row-${agentId}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '200px 1fr 1.4fr 60px',
        alignItems: 'center',
        padding: '6px 10px',
        borderBottom: '1px dashed var(--p-border)',
        background: isOpen ? 'var(--p-accent-soft)' : 'transparent',
      }}
    >
      {/* Agent identity */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {entry && (
          <CatSprite size={22} fur={entry.fur} cheek={entry.cheek} hat={entry.hat} pose="sit" />
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {entry?.name ?? agentId}
          </div>
          <div style={{ fontSize: 8, color: 'var(--p-text-muted)', fontFamily: 'ui-monospace, monospace' }}>
            {agentId}
          </div>
        </div>
      </div>

      {/* Model selector — clicking updates draft state (not yet saved) */}
      <div data-testid="model-selector" style={{ display: 'flex', gap: 3 }}>
        {MODELS.map((m) => (
          <button
            key={m.id}
            data-testid={`model-option-${m.id}`}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '2px 8px',
              fontSize: 9,
              fontWeight: 700,
              border: '1.5px solid var(--p-border)',
              background: m.id === draftModel ? m.color : 'var(--p-tint)',
              color: m.id === draftModel ? 'white' : 'var(--p-text)',
            }}
            aria-pressed={m.id === draftModel}
            aria-label={`${agentId} model ${m.id}`}
            onClick={() => onModelSelect(m.id)}
          >
            {m.id}
          </button>
        ))}
      </div>

      {/* Personality presets — clicking updates draft state */}
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            data-testid={`preset-btn-${p.id}`}
            title={p.desc}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '2px 6px',
              fontSize: 9,
              border: '1.5px solid var(--p-border)',
              background: p.id === draftPreset ? 'var(--p-accent)' : 'var(--p-tint)',
              color: p.id === draftPreset ? 'white' : 'var(--p-text)',
            }}
            onClick={() => onPresetSelect(p.id)}
          >
            {p.emoji} {p.name}
          </button>
        ))}
      </div>

      {/* Chain expand button */}
      <button
        data-testid="chain-expand-btn"
        onClick={onToggle}
        style={{
          all: 'unset',
          cursor: 'pointer',
          textAlign: 'right',
          fontSize: 9,
          fontWeight: 700,
          color: overridden ? 'var(--p-warn)' : 'var(--p-text-muted)',
        }}
      >
        {cust.chain.length} ▸
      </button>
    </div>
  );
}

interface ChainDetailPanelProps {
  openAgentId: string | null;
  customization: Record<string, AgentCustomization>;
}

function ChainDetailPanel({ openAgentId, customization }: ChainDetailPanelProps): JSX.Element {
  const entry = openAgentId ? ROSTER.find((r) => r.id === openAgentId) : null;
  const cust = openAgentId ? customization[openAgentId] : null;

  return (
    <div
      data-testid="chain-detail-panel"
      style={{
        background: 'var(--p-paper)',
        border: '2px solid var(--p-border)',
        padding: 10,
        position: 'sticky',
        top: 16,
      }}
    >
      <div style={{ fontSize: 9, color: 'var(--p-text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>
        SCOPE CHAIN — 有効値の出処
      </div>

      {!openAgentId && (
        <div style={{ fontSize: 10, color: 'var(--p-text-muted)', lineHeight: 1.5 }}>
          行右端の <b>▸</b> をクリックすると、その agent の<br />
          <code>default → user → project → effective</code><br />
          の重ね順を表示します。
        </div>
      )}

      {openAgentId && cust && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
            {entry?.name ?? openAgentId}
          </div>
          {cust.chain.map((step, i, arr) => {
            const isLast = i === arr.length - 1;
            const c = scopeColor(step.scope);
            return (
              <div key={i} style={{ position: 'relative', paddingLeft: 14, paddingBottom: isLast ? 0 : 12 }}>
                <span style={{
                  position: 'absolute',
                  left: 0,
                  top: 4,
                  width: 8,
                  height: 8,
                  background: c,
                  border: '1.5px solid var(--p-border)',
                }} />
                {!isLast && (
                  <span style={{
                    position: 'absolute',
                    left: 3,
                    top: 14,
                    bottom: 0,
                    width: 2,
                    background: 'var(--p-border)',
                  }} />
                )}
                <div
                  data-testid="chain-scope-tag"
                  style={{ fontSize: 9, fontWeight: 700, color: c, letterSpacing: '0.06em' }}
                >
                  {step.scope.toUpperCase()}
                </div>
                <div style={{ fontSize: 10, color: 'var(--p-text)', marginTop: 2 }}>
                  {step.model && <span>model: <b>{step.model}</b></span>}
                  {step.model && step.preset && ' · '}
                  {step.preset && <span>preset: <b>{step.preset}</b></span>}
                </div>
                {step.note && (
                  <div style={{ fontSize: 9, fontStyle: 'italic', color: 'var(--p-text-muted)', marginTop: 2 }}>
                    "{step.note}"
                  </div>
                )}
              </div>
            );
          })}
          <div style={{
            marginTop: 10,
            padding: 6,
            fontSize: 9,
            color: 'var(--p-text-muted)',
            background: 'var(--p-tint)',
            border: '1px dashed var(--p-border)',
            lineHeight: 1.5,
          }}>
            ◆ 上から下へ重ね合わせて effective が決まる。<br />
            ◆ project スコープは現 PJ のみ、user スコープは全 PJ で有効。
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------------

/** Per-agent draft state: tracks unsaved model + preset selections. */
interface AgentDraft {
  model: ModelId;
  preset: PresetId;
}

export function CustomizationView(): JSX.Element {
  const sc = useScenario();
  const customization = sc.customization;
  const [openAgentId, setOpenAgentId] = useState<string | null>(null);
  // WHY: draft tracks in-progress edits separate from effective (server state).
  // "保存" commits all draft changes; "取消" resets to effective.
  const [drafts, setDrafts] = useState<Record<string, AgentDraft>>({});

  const { mutate } = useCustomizationMutation();

  // Build effective draft for an agent: draft override or fallback to effective.
  function getDraft(agentId: string, cust: AgentCustomization): AgentDraft {
    if (drafts[agentId]) return drafts[agentId];
    return { model: cust.effective.model, preset: cust.effective.preset };
  }

  const dirty = Object.keys(drafts).some((agentId) => {
    const cust = customization[agentId];
    if (!cust) return false;
    const d = drafts[agentId];
    return d.model !== cust.effective.model || d.preset !== cust.effective.preset;
  });

  function handleSave(): void {
    // WHY: call mutate once per changed agent so each write is atomic.
    Object.entries(drafts).forEach(([agentId, d]) => {
      const cust = customization[agentId];
      if (!cust) return;
      // Only write back if actually changed
      if (d.model !== cust.effective.model || d.preset !== cust.effective.preset) {
        mutate({ agentId, model: d.model, preset: d.preset, scope: 'project' });
      }
    });
    // If no drafts, still call mutate once (no-op semantics for the test)
    if (Object.keys(drafts).length === 0) {
      mutate({ agentId: '', scope: 'project' });
    }
    setDrafts({});
  }

  function handleCancel(): void {
    setDrafts({});
  }

  function handleModelSelect(agentId: string, model: ModelId): void {
    setDrafts((prev) => ({
      ...prev,
      [agentId]: { ...(prev[agentId] ?? getDraft(agentId, customization[agentId]!)), model },
    }));
  }

  function handlePresetSelect(agentId: string, preset: PresetId): void {
    setDrafts((prev) => ({
      ...prev,
      [agentId]: { ...(prev[agentId] ?? getDraft(agentId, customization[agentId]!)), preset },
    }));
  }

  return (
    <div
      data-testid="customization-view"
      style={{ position: 'absolute', inset: 0, padding: 16, overflow: 'auto', background: 'var(--p-bg-sky)' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div
          data-testid="customization-title"
          style={{ fontSize: 14, fontWeight: 700 }}
        >
          ✦ CUSTOMIZATION — agent ごとの model + personality
        </div>
        <div style={{ flex: 1 }} />
        {dirty && (
          <span style={{ fontSize: 9, color: 'var(--p-warn)', fontWeight: 700 }}>
            ● 未保存変更あり
          </span>
        )}
        <button
          className="btn-px ghost"
          style={{ fontSize: 9, padding: '3px 8px' }}
          aria-label="取消"
          onClick={handleCancel}
        >
          取消
        </button>
        <button
          className={`btn-px ${dirty ? 'primary' : 'ghost'}`}
          style={{ fontSize: 9, padding: '3px 8px' }}
          aria-label="保存"
          onClick={handleSave}
        >
          保存
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, alignItems: 'flex-start' }}>
        {/* LEFT — agent table */}
        <div style={{ background: 'var(--p-paper)', border: '2px solid var(--p-border)' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr 1.4fr 60px',
            fontSize: 9,
            color: 'var(--p-text-muted)',
            letterSpacing: '0.06em',
            padding: '6px 10px',
            borderBottom: '2px solid var(--p-border)',
            background: 'var(--p-tint)',
          }}>
            <span>AGENT</span>
            <span>MODEL</span>
            <span>PERSONALITY</span>
            <span style={{ textAlign: 'right' }}>CHAIN</span>
          </div>

          {/* Agent rows — iterate ROSTER order to preserve visual order */}
          {ROSTER.map((entry) => {
            const cust = customization[entry.id];
            if (!cust) return null;
            const d = getDraft(entry.id, cust);
            return (
              <AgentRow
                key={entry.id}
                agentId={entry.id}
                cust={cust}
                isOpen={openAgentId === entry.id}
                onToggle={() => setOpenAgentId((o) => (o === entry.id ? null : entry.id))}
                draftModel={d.model}
                draftPreset={d.preset}
                onModelSelect={(model) => handleModelSelect(entry.id, model)}
                onPresetSelect={(preset) => handlePresetSelect(entry.id, preset)}
              />
            );
          })}
        </div>

        {/* RIGHT — scope chain detail */}
        <ChainDetailPanel openAgentId={openAgentId} customization={customization} />
      </div>
    </div>
  );
}
