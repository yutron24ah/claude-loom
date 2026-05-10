/**
 * GuidanceView — redesign port of learned-guidance audit trail.
 * WHY: Replaces MOCK_GUIDANCE hardcoded fixture with useScenario().guidance
 * to enable live-driven display from the daemon WS reducer.
 *
 * Visual SSoT: redesign/screens/guidance.jsx
 * Data SSoT: redesign/api/types.ts GuidanceItem / GuidanceCategory / GuidanceScope
 * SPEC §3.6.14 / SCREEN_REQUIREMENTS §3.10 / §4.9
 *
 * Write hookup (DELETE /guidance/:id retire / toggle active) deferred to Phase 5 t16.
 * M0.15 t6: read-only visual port, useScenario() driven.
 */
import React, { useState } from 'react';
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { GuidanceItem, GuidanceCategory } from '@claude-loom/redesign/api/types';
import { CatSprite } from '../../components/CatSprite';
import { ROSTER } from '../room/roster';

// -------------------------------------------------------------------------
// Helpers — typed constants avoid string literal scatter (Principle: avoid string literals)
// -------------------------------------------------------------------------

/** WHY: category → dot CSS class mapping, typed to GuidanceCategory SSoT */
const CATEGORY_DOT_CLASS: Record<GuidanceCategory, string> = {
  tdd:      'dot tdd',
  review:   'dot review',
  security: 'dot fail',
  test:     'dot busy',
  process:  'dot idle',
};

// -------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------

interface GuidanceDiffPanelProps {
  diff: { before: string; after: string };
}

function GuidanceDiffPanel({ diff }: GuidanceDiffPanelProps): JSX.Element {
  return (
    <div
      data-testid="guidance-diff-panel"
      style={{ marginTop: 8, fontSize: 10, fontFamily: 'ui-monospace, monospace' }}
    >
      <div style={{
        padding: 6,
        background: 'rgba(220,80,80,0.12)',
        border: '1px solid var(--p-error)',
        marginBottom: 4,
      }}>
        <span style={{ color: 'var(--p-error)', fontWeight: 700 }}>- </span>
        {diff.before}
      </div>
      <div style={{
        padding: 6,
        background: 'rgba(80,180,120,0.12)',
        border: '1px solid var(--p-success)',
      }}>
        <span style={{ color: 'var(--p-success)', fontWeight: 700 }}>+ </span>
        {diff.after}
      </div>
    </div>
  );
}

interface GuidanceItemCardProps {
  item: GuidanceItem & { id?: string };
  diffOpen: boolean;
  onToggleDiff: () => void;
}

function GuidanceItemCard({ item, diffOpen, onToggleDiff }: GuidanceItemCardProps): JSX.Element {
  const rosterEntry = ROSTER.find((r) => r.id === item.agentId);

  return (
    <div
      data-testid="guidance-item"
      data-active={item.active}
      style={{
        marginBottom: 10,
        background: 'var(--p-paper)',
        border: '2px solid var(--p-border)',
        padding: 10,
        opacity: item.active ? 1 : 0.55,
      }}
    >
      {/* Header row: agent sprite + identity + category + scope */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        {rosterEntry && (
          <CatSprite
            size={26}
            fur={rosterEntry.fur}
            cheek={rosterEntry.cheek}
            hat={rosterEntry.hat}
            pose="sit"
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700 }}>
            {rosterEntry?.name ?? item.agentId}
          </div>
          <div style={{
            fontSize: 9,
            color: 'var(--p-text-muted)',
            fontFamily: 'ui-monospace, monospace',
          }}>
            {item.addedAt} · category:{' '}
            <span data-testid="guidance-category" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <span className={CATEGORY_DOT_CLASS[item.category]} />
              <b>{item.category}</b>
            </span>
            {' · '}scope:{' '}
            <span
              data-testid="guidance-scope"
              className="chip"
              style={item.scope === 'project'
                ? { background: 'var(--p-warn)', color: 'white', borderColor: 'var(--p-warn)', fontSize: 8 }
                : { fontSize: 8 }}
            >
              {item.scope}
            </span>
            {' · '}used {item.useCount}× · ttl: {item.ttl}
          </div>
        </div>
        {!item.active && (
          <span style={{
            fontSize: 8,
            fontWeight: 700,
            padding: '1px 5px',
            background: 'var(--p-stone)',
            color: 'white',
            border: '1px solid var(--p-border)',
          }}>
            EXPIRED
          </span>
        )}
      </div>

      {/* Guidance text */}
      <div style={{
        fontSize: 11,
        padding: 8,
        background: 'var(--p-tint)',
        border: '1.5px solid var(--p-border)',
        lineHeight: 1.5,
        marginBottom: 6,
      }}>
        {item.text}
      </div>

      {/* Action row: source link + diff toggle + retire */}
      <div style={{ display: 'flex', gap: 6, fontSize: 9, alignItems: 'center' }}>
        <button
          data-testid="guidance-source"
          className="btn-px ghost"
          style={{ fontSize: 9, padding: '2px 6px' }}
          onClick={() => undefined}
        >
          source: {item.from}
        </button>
        {item.diff && (
          <button
            data-testid="guidance-diff-toggle"
            className="btn-px ghost"
            style={{ fontSize: 9, padding: '2px 6px' }}
            onClick={onToggleDiff}
          >
            {diffOpen ? '' : ''} 前 version との diff
          </button>
        )}
        <span style={{ flex: 1 }} />
        {item.active && (
          <button
            data-testid="guidance-toggle"
            className="btn-px ghost"
            style={{ fontSize: 9, padding: '2px 6px', color: 'var(--p-text-muted)' }}
            onClick={() => undefined}
          >
            retire
          </button>
        )}
      </div>

      {/* Diff panel (conditional) */}
      {diffOpen && item.diff && (
        <GuidanceDiffPanel diff={item.diff} />
      )}
    </div>
  );
}

// -------------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------------

export function GuidanceView(): JSX.Element {
  const scenario = useScenario();
  const all: (GuidanceItem & { id?: string })[] = scenario.guidance ?? [];

  // Filter state — matches redesign/screens/guidance.jsx defaults
  const [activeOnly, setActiveOnly] = useState(true);
  const [agentFilter, setAgentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [diffOpenIndex, setDiffOpenIndex] = useState<number | null>(null);

  const rosterById = Object.fromEntries(ROSTER.map((r) => [r.id, r]));

  // Client-side filter (per redesign SSoT)
  const filtered = all.filter((g) =>
    (activeOnly ? g.active : true) &&
    (agentFilter === 'all' || g.agentId === agentFilter) &&
    (searchQuery === '' || g.text.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  // Unique agent IDs for the agent dropdown
  const agentIds = Array.from(new Set(all.map((g) => g.agentId)));

  return (
    <div
      data-testid="guidance-view"
      style={{
        position: 'absolute',
        inset: 0,
        padding: 16,
        overflow: 'auto',
        background: 'var(--p-bg-sky)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div
          data-testid="guidance-title"
          style={{ fontSize: 14, fontWeight: 700 }}
        >
          GUIDANCE — learned-guidance.md
        </div>
        <div style={{ flex: 1 }} />
        <span className="chip">
          {filtered.length} / {all.length} entries
        </span>
      </div>

      {/* Filter bar — matches redesign/screens/guidance.jsx */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: 8,
        marginBottom: 12,
        background: 'var(--p-paper)',
        border: '2px solid var(--p-border)',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <input
          type="text"
          placeholder="search guidance text..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: 180,
            padding: '4px 8px',
            fontSize: 10,
            border: '1.5px solid var(--p-border)',
            background: 'var(--p-tint)',
            fontFamily: 'ui-monospace, monospace',
          }}
        />
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          style={{
            padding: '4px 6px',
            fontSize: 10,
            border: '1.5px solid var(--p-border)',
            background: 'var(--p-tint)',
          }}
        >
          <option value="all">全 agent</option>
          {agentIds.map((id) => (
            <option key={id} value={id}>
              {rosterById[id]?.name ?? id}
            </option>
          ))}
        </select>
        <label style={{
          display: 'inline-flex',
          gap: 4,
          alignItems: 'center',
          fontSize: 10,
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            data-testid="filter-active-only"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          {' '}active のみ
        </label>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{
          padding: 30,
          textAlign: 'center',
          border: '2px dashed var(--p-border)',
          background: 'var(--p-paper)',
          fontSize: 10,
          color: 'var(--p-text-muted)',
        }}>
          条件にマッチする guidance はありません
        </div>
      )}

      {/* Guidance list */}
      {filtered.map((item, i) => (
        <GuidanceItemCard
          key={`${item.agentId}-${i}`}
          item={item}
          diffOpen={diffOpenIndex === i}
          onToggleDiff={() => setDiffOpenIndex((prev) => (prev === i ? null : i))}
        />
      ))}
    </div>
  );
}
