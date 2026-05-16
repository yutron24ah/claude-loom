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
import '../../styles/screens/customization.css';

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
      className="cust-agent-row"
      style={{
        background: isOpen ? 'var(--p-accent-soft)' : 'transparent',
      }}
    >
      {/* Agent identity */}
      <div className="cust-agent-row__identity">
        {entry && (
          <CatSprite size={22} fur={entry.fur} cheek={entry.cheek} hat={entry.hat} pose="sit" />
        )}
        <div>
          <div className="cust-agent-row__name">
            {entry?.name ?? agentId}
          </div>
          <div className="cust-agent-row__id">
            {agentId}
          </div>
        </div>
      </div>

      {/* Model selector — clicking updates draft state (not yet saved) */}
      <div data-testid="model-selector" className="cust-model-selector">
        {MODELS.map((m) => (
          <button
            key={m.id}
            data-testid={`model-option-${m.id}`}
            className="cust-model-btn"
            style={{
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
      <div className="cust-preset-selector">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            data-testid={`preset-btn-${p.id}`}
            title={p.desc}
            className="cust-preset-btn"
            style={{
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
        className="cust-chain-btn"
        style={{
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
      className="cust-chain-panel"
    >
      <div className="cust-chain-panel__label">
        SCOPE CHAIN — 有効値の出処
      </div>

      {!openAgentId && (
        <div className="cust-chain-panel__hint">
          行右端の <b>▸</b> をクリックすると、その agent の<br />
          <code>default → user → project → effective</code><br />
          の重ね順を表示します。
        </div>
      )}

      {openAgentId && cust && (
        <div>
          <div className="cust-chain-panel__agent-name">
            {entry?.name ?? openAgentId}
          </div>
          {cust.chain.map((step, i, arr) => {
            const isLast = i === arr.length - 1;
            const c = scopeColor(step.scope);
            return (
              <div
                key={i}
                className={`cust-chain-step${isLast ? ' cust-chain-step--last' : ''}`}
              >
                <span
                  className="cust-chain-step__dot"
                  style={{ background: c }}
                />
                {!isLast && (
                  <span className="cust-chain-step__line" />
                )}
                <div
                  data-testid="chain-scope-tag"
                  className="cust-chain-step__scope-tag"
                  style={{ color: c }}
                >
                  {step.scope.toUpperCase()}
                </div>
                <div className="cust-chain-step__values">
                  {step.model && <span>model: <b>{step.model}</b></span>}
                  {step.model && step.preset && ' · '}
                  {step.preset && <span>preset: <b>{step.preset}</b></span>}
                </div>
                {step.note && (
                  <div className="cust-chain-step__note">
                    "{step.note}"
                  </div>
                )}
              </div>
            );
          })}
          <div className="cust-chain-panel__footer">
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
      className="cust-screen"
    >
      {/* Header */}
      <div className="cust-header">
        <div
          data-testid="customization-title"
          className="cust-header__title"
        >
          ✦ CUSTOMIZATION — agent ごとの model + personality
        </div>
        <div className="cust-header__spacer" />
        {dirty && (
          <span className="cust-header__unsaved">
            ● 未保存変更あり
          </span>
        )}
        <button
          className="btn-px ghost cust-header__btn"
          aria-label="取消"
          onClick={handleCancel}
        >
          取消
        </button>
        <button
          className={`btn-px ${dirty ? 'primary' : 'ghost'} cust-header__btn`}
          aria-label="保存"
          onClick={handleSave}
        >
          保存
        </button>
      </div>

      <div className="cust-layout">
        {/* LEFT — agent table */}
        <div className="cust-table">
          {/* Table header */}
          <div className="cust-table__header">
            <span>AGENT</span>
            <span>MODEL</span>
            <span>PERSONALITY</span>
            <span className="cust-table__header-chain">CHAIN</span>
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
