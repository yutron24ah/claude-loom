/**
 * GuidanceView — redesign port of learned-guidance audit trail.
 * WHY: Replaces MOCK_GUIDANCE hardcoded fixture with useScenario().guidance
 * to enable live-driven display from the daemon WS reducer.
 *
 * Visual SSoT: redesign/screens/guidance.jsx
 * Data SSoT: redesign/api/types.ts GuidanceItem / GuidanceCategory / GuidanceScope
 * SPEC §3.6.14 / SCREEN_REQUIREMENTS §3.10 / §4.9
 *
 * Write hookup (DELETE /guidance/:id retire / toggle active) wired in Phase 5 t16.
 * REQ-065, REQ-077
 */
import React, { useState } from 'react';
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { GuidanceItem, GuidanceCategory } from '@claude-loom/redesign/api/types';
import { CatSprite } from '../../components/CatSprite';
import { ROSTER } from '../room/roster';
import { useGuidanceMutations } from '../../live/useGuidanceMutations';
import '../../styles/screens/guidance.css';

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
    <div data-testid="guidance-diff-panel" className="guidance-diff-panel">
      <div className="guidance-diff__before">
        <span className="guidance-diff__minus">- </span>
        {diff.before}
      </div>
      <div className="guidance-diff__after">
        <span className="guidance-diff__plus">+ </span>
        {diff.after}
      </div>
    </div>
  );
}

interface GuidanceItemCardProps {
  item: GuidanceItem & { id?: string };
  diffOpen: boolean;
  onToggleDiff: () => void;
  onRetire: () => void;
}

function GuidanceItemCard({ item, diffOpen, onToggleDiff, onRetire }: GuidanceItemCardProps): JSX.Element {
  const rosterEntry = ROSTER.find((r) => r.id === item.agentId);

  return (
    <div
      data-testid="guidance-item"
      data-active={item.active}
      className="guidance-item"
      style={{ opacity: item.active ? 1 : 0.55 }}
    >
      {/* Header row: agent sprite + identity + category + scope */}
      <div className="guidance-item__header">
        {rosterEntry && (
          <CatSprite
            size={26}
            fur={rosterEntry.fur}
            cheek={rosterEntry.cheek}
            hat={rosterEntry.hat}
            pose="sit"
          />
        )}
        <div className="guidance-item__identity">
          <div className="guidance-item__name">
            {rosterEntry?.name ?? item.agentId}
          </div>
          <div className="guidance-item__meta">
            {item.addedAt} · category:{' '}
            <span data-testid="guidance-category" className="guidance-item__category">
              <span className={CATEGORY_DOT_CLASS[item.category]} />
              <b>{item.category}</b>
            </span>
            {' · '}scope:{' '}
            <span
              data-testid="guidance-scope"
              className="chip guidance-item__scope"
              style={item.scope === 'project'
                ? { background: 'var(--p-warn)', color: 'white', borderColor: 'var(--p-warn)' }
                : undefined}
            >
              {item.scope}
            </span>
            {' · '}used {item.useCount}× · ttl: {item.ttl}
          </div>
        </div>
        {!item.active && (
          <span className="guidance-item__expired-badge">EXPIRED</span>
        )}
      </div>

      {/* Guidance text */}
      <div className="guidance-item__text">{item.text}</div>

      {/* Action row: source link + diff toggle + retire */}
      <div className="guidance-item__actions">
        <button
          data-testid="guidance-source"
          className="btn-px ghost guidance-action-btn"
          onClick={() => undefined}
        >
          ↗ source: {item.from}
        </button>
        {item.diff && (
          <button
            data-testid="guidance-diff-toggle"
            className="btn-px ghost guidance-action-btn"
            onClick={onToggleDiff}
          >
            {diffOpen ? '▾' : '▸'} 前 version との diff
          </button>
        )}
        <span className="guidance-item__spacer" />
        {item.active && (
          <button
            data-testid="guidance-toggle"
            className="btn-px ghost guidance-retire-btn"
            onClick={onRetire}
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
  const { retireGuidance } = useGuidanceMutations();

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
    <div data-testid="guidance-view" className="guidance-screen">
      {/* Header */}
      <div className="guidance-header">
        <div data-testid="guidance-title" className="guidance-header__title">
          ❉ GUIDANCE — learned-guidance.md 監査
        </div>
        <div className="guidance-header__spacer" />
        <span className="chip">
          {filtered.length} / {all.length} entries
        </span>
      </div>

      {/* Filter bar — matches redesign/screens/guidance.jsx */}
      <div className="guidance-filter-bar">
        <input
          type="text"
          placeholder="search guidance text..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="guidance-search-input"
        />
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="guidance-agent-select"
        >
          <option value="all">全 agent</option>
          {agentIds.map((id) => (
            <option key={id} value={id}>
              {rosterById[id]?.name ?? id}
            </option>
          ))}
        </select>
        <label className="guidance-filter-label">
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
        <div className="guidance-empty">
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
          onRetire={() => retireGuidance({
            id: item.id ?? `${item.agentId}-${i}`,
            agentId: item.agentId,
            scope: item.scope as 'user' | 'project',
          })}
        />
      ))}
    </div>
  );
}
