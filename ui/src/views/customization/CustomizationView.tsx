/**
 * CustomizationView — per-agent model + personality with scope chain trace.
 * WHY: Redesign port (M0.15 t5). Uses useScenario() as single data source.
 * Visual layout driven by redesign/screens/customization.jsx SSoT.
 * Static JSON overlay (default → user → project) is read-only in this phase;
 * write hookup (PUT /customization/:id) lands in Phase 5 t16.
 *
 * SCREEN_REQUIREMENTS §3.8 / §4.7
 * REQ-065
 */
import { useState } from 'react';
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { AgentCustomization, CustomizationLayer, ModelId, PresetId } from '@claude-loom/redesign/api/types';
import { CatSprite } from '../../components/CatSprite';
import { ROSTER } from '../room/roster';

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
}

function AgentRow({ agentId, cust, isOpen, onToggle }: AgentRowProps): JSX.Element {
  const entry = ROSTER.find((r) => r.id === agentId);
  const eff = cust.effective;
  const overridden = cust.chain.length > 1;
  const preset = PRESETS.find((p) => p.id === eff.preset) ?? PRESETS[0];

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

      {/* Model selector */}
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
              background: m.id === eff.model ? m.color : 'var(--p-tint)',
              color: m.id === eff.model ? 'white' : 'var(--p-text)',
            }}
            aria-pressed={m.id === eff.model}
            aria-label={`${agentId} model ${m.id}`}
            onClick={() => undefined}
          >
            {m.id}
          </button>
        ))}
      </div>

      {/* Personality presets */}
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
              background: p.id === eff.preset ? 'var(--p-accent)' : 'var(--p-tint)',
              color: p.id === eff.preset ? 'white' : 'var(--p-text)',
            }}
            onClick={() => undefined}
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

export function CustomizationView(): JSX.Element {
  const sc = useScenario();
  const customization = sc.customization;
  const [openAgentId, setOpenAgentId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

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
          onClick={() => setDirty(false)}
        >
          取消
        </button>
        <button
          className={`btn-px ${dirty ? 'primary' : 'ghost'}`}
          style={{ fontSize: 9, padding: '3px 8px' }}
          aria-label="保存"
          onClick={() => setDirty(false)}
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
            return (
              <AgentRow
                key={entry.id}
                agentId={entry.id}
                cust={cust}
                isOpen={openAgentId === entry.id}
                onToggle={() => setOpenAgentId((o) => (o === entry.id ? null : entry.id))}
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
