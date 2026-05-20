/**
 * LearnedGuidanceView — retro/finding-derived guidance injected per agent.
 * WHY: Enables audit and pruning of learned_guidance entries injected into agent prompts.
 * SCREEN_REQUIREMENTS §3.10 / §4.9
 * Ported from ui/prototype/screens-c.jsx LearnedGuidanceView.
 * M0.11.4 t15: rewritten to use rpg-frame / rpg-title / chip / dot (Phase A SSoT).
 * M0.18 t4: scope filter pills + keyKind badge + keyPath display + WRITE badge.
 * Toggle and delete buttons are noop in this milestone; real mutations wired in M3+
 * via prefsRouter.learnedGuidance.toggle / .delete.
 * Types aligned with daemon LearnedGuidanceEntry (routes/prefs.ts).
 */
import React, { useState } from 'react';
import { CatSprite } from '../../components/CatSprite';
import { ROSTER, type RosterEntry } from '../room/roster';
import '../../styles/screens/guidance.css';

// -------------------------------------------------------------------------
// Types — aligned with daemon learnedGuidanceEntrySchema
// -------------------------------------------------------------------------

export type GuidanceCategory = 'tdd' | 'review' | 'security' | 'test' | 'process' | 'other';
export type GuidanceScope = 'user' | 'project';

/** WHY typed enum: keyKind — avoids string literal scatter in filter logic */
export type KeyKind = 'agent' | 'skill';

/** WHY typed enum: scope filter pill values — avoids string literal scatter */
export type ScopeFilter = 'all' | 'agents' | 'loom-review' | 'loom-retro';

/** Aggregator keyPath (skills/loom-retro/stages/aggregator) — WRITE badge scope */
const AGGREGATOR_KEY_PATH = 'skills/loom-retro/stages/aggregator';

export interface MockGuidanceItem {
  /** guidance id (nanoid in real impl) */
  id: string;
  agentId: string;
  agentName: string;
  active: boolean;
  category: GuidanceCategory;
  /** retro session id or finding id that produced this guidance */
  fromSource: string;
  /** guidance text injected into agent system prompt */
  text: string;
  addedAt: string;
  useCount: number;
  ttl: string;
  scope: GuidanceScope;
  /** WHY M0.18: distinguishes agent-keyed vs skill-scoped guidance */
  keyKind: KeyKind;
  /** WHY M0.18: hierarchical path — e.g. "agents/loom-pm" or "skills/loom-review/strategies/trio/code" */
  keyPath: string;
}

// -------------------------------------------------------------------------
// Mock data — 6+ guidance items across agents + skill scopes
// -------------------------------------------------------------------------

const MOCK_GUIDANCE: MockGuidanceItem[] = [
  {
    id: 'g-001',
    agentId: 'dev',
    agentName: 'サバ',
    active: true,
    category: 'tdd',
    fromSource: 'retro-2026-04-25',
    text: 'RED フェーズで test を書く前に impl を触らない。エディタを別 tab に分けて誤操作を防ぐ。',
    addedAt: '2026-04-25',
    useCount: 12,
    ttl: '永続',
    scope: 'user',
    keyKind: 'agent',
    keyPath: 'agents/loom-developer',
  },
  {
    id: 'g-002',
    agentId: 'rev-code',
    agentName: 'ペン',
    active: true,
    category: 'review',
    fromSource: 'retro-2026-04-22',
    text: 'verdict には必ず参照行番号 (file:Lxx) を含める。曖昧な指摘は reject する。',
    addedAt: '2026-04-22',
    useCount: 8,
    ttl: 'permanent',
    scope: 'project',
    keyKind: 'skill',
    keyPath: 'skills/loom-review/strategies/trio/code',
  },
  {
    id: 'g-003',
    agentId: 'rev-sec',
    agentName: 'シノビ',
    active: true,
    category: 'security',
    fromSource: 'finding-F-08',
    text: 'OAuth callback URL の検証は exact match のみ受理。prefix match は禁止。',
    addedAt: '2026-04-20',
    useCount: 3,
    ttl: 'permanent',
    scope: 'project',
    keyKind: 'skill',
    keyPath: 'skills/loom-review/strategies/trio/security',
  },
  {
    id: 'g-004',
    agentId: 'rev-test',
    agentName: 'メメ',
    active: false,
    category: 'test',
    fromSource: 'retro-2026-04-15',
    text: 'coverage 90% 未満は verdict 出さない。',
    addedAt: '2026-04-15',
    useCount: 5,
    ttl: 'expired',
    scope: 'user',
    keyKind: 'skill',
    keyPath: 'skills/loom-review/strategies/single',
  },
  {
    id: 'g-005',
    agentId: 'pm',
    agentName: 'ニケ',
    active: true,
    category: 'process',
    fromSource: 'retro-2026-04-25',
    text: '並列発射可能な dispatch は必ず単一 Task call に同梱する。逐次発射は violation 扱い。',
    addedAt: '2026-04-25',
    useCount: 19,
    ttl: 'permanent',
    scope: 'user',
    keyKind: 'agent',
    keyPath: 'agents/loom-pm',
  },
  {
    id: 'g-006',
    agentId: 'retro-pm',
    agentName: 'ヨミ',
    active: true,
    category: 'process',
    fromSource: 'retro-2026-04-20',
    text: 'retro 開始前に前回 retro の pending actions を必ず確認する。',
    addedAt: '2026-04-20',
    useCount: 7,
    ttl: 'permanent',
    scope: 'user',
    keyKind: 'skill',
    keyPath: 'skills/loom-retro/lenses/process-axis',
  },
  {
    id: 'g-007',
    agentId: 'retro-agg',
    agentName: 'マル',
    active: true,
    category: 'process',
    fromSource: 'retro-2026-04-18',
    text: 'aggregator は findings を 3 行以内に要約し action plan と照合する。',
    addedAt: '2026-04-18',
    useCount: 4,
    ttl: 'permanent',
    scope: 'project',
    keyKind: 'skill',
    keyPath: AGGREGATOR_KEY_PATH,
  },
];

// -------------------------------------------------------------------------
// Helpers — typed maps avoid string literal scatter (Principle: avoid string literals)
// -------------------------------------------------------------------------

/** WHY typed constant: category → dot class mapping, avoids repeat switch */
const CATEGORY_DOT_CLASS: Record<GuidanceCategory, string> = {
  tdd:      'dot tdd',
  review:   'dot review',
  security: 'dot fail',
  test:     'dot busy',
  process:  'dot idle',
  other:    'dot idle',
};

// -------------------------------------------------------------------------
// Filter helpers — pure functions, typed
// -------------------------------------------------------------------------

/** WHY: typed filter predicate — returns true if item passes the given scope filter */
function matchesScopeFilter(item: MockGuidanceItem, filter: ScopeFilter): boolean {
  switch (filter) {
    case 'all':         return true;
    case 'agents':      return item.keyKind === 'agent';
    case 'loom-review': return item.keyPath.startsWith('skills/loom-review/');
    case 'loom-retro':  return item.keyPath.startsWith('skills/loom-retro/');
  }
}

/** Count entries matching a given scope filter */
function countForFilter(items: MockGuidanceItem[], filter: ScopeFilter): number {
  return items.filter((i) => matchesScopeFilter(i, filter)).length;
}

// -------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------

interface ScopeFilterPillProps {
  label: string;
  count?: number;
  filter: ScopeFilter;
  active: boolean;
  onClick: () => void;
}

function ScopeFilterPill({ label, count, active, onClick }: ScopeFilterPillProps): JSX.Element {
  return (
    <button
      data-testid="scope-filter-pill"
      data-active={active}
      className={`lg-scope-pill${active ? ' lg-scope-pill--active' : ''}`}
      onClick={onClick}
    >
      {label}
      {count !== undefined && (
        <span className="lg-scope-pill__count"> ({count})</span>
      )}
    </button>
  );
}

interface KeyKindBadgeProps {
  keyKind: KeyKind;
}

function KeyKindBadge({ keyKind }: KeyKindBadgeProps): JSX.Element {
  return (
    <span
      data-testid="keykind-badge"
      className={keyKind === 'agent' ? 'lg-badge lg-badge--agent' : 'lg-badge lg-badge--skill'}
    >
      {keyKind === 'agent' ? 'AGENT' : 'SKILL'}
    </span>
  );
}

interface GuidanceItemCardProps {
  item: MockGuidanceItem;
  agent: RosterEntry | undefined;
}

function GuidanceItemCard({ item, agent }: GuidanceItemCardProps): JSX.Element {
  const isAggregator = item.keyPath === AGGREGATOR_KEY_PATH;

  return (
    <div
      data-testid="guidance-item"
      data-active={item.active}
      data-keykind={item.keyKind}
      data-keypath={item.keyPath}
      className="lg-item"
      style={{ opacity: item.active ? 1 : 0.5 }}
    >
      {/* Active state marker (hidden visual indicator for tests) */}
      {item.active
        ? <span data-testid="guidance-active" className="sr-only">active</span>
        : <span data-testid="guidance-inactive" className="sr-only">inactive</span>
      }

      {/* Agent sprite with scroll icon when active */}
      <div className="lg-item__sprite-wrapper">
        <CatSprite
          size={36}
          fur={agent?.fur ?? '#aaa'}
          cheek={agent?.cheek ?? '#fda'}
          hat={agent?.hat ?? null}
          pose="sit"
          scroll={item.active}
        />
      </div>

      {/* Body */}
      <div className="lg-item__body">
        {/* Agent + category + source + scope + keyKind badge + WRITE badge */}
        <div className="lg-item__meta-row">
          <span data-testid="guidance-agent-name" className="lg-item__agent-name">
            {item.agentName}
          </span>
          {agent && <span className="rpg-label">{agent.role}</span>}
          <span data-testid="guidance-category" className="lg-item__category">
            <span className={CATEGORY_DOT_CLASS[item.category]} />
            <span className="rpg-label">{item.category}</span>
          </span>
          <span className="lg-item__from-source">from: {item.fromSource}</span>
          <span
            className="chip"
            style={item.scope === 'project'
              ? { background: 'var(--p-warn)', color: 'white', borderColor: 'var(--p-warn)' }
              : undefined}
          >
            {item.scope}
          </span>
          {!item.active && (
            <span className="chip lg-chip--inactive">inactive</span>
          )}
          {/* WHY M0.18: keyKind badge — AGENT (green) or SKILL (accent) */}
          <KeyKindBadge keyKind={item.keyKind} />
          {/* WHY M0.18: WRITE badge only for aggregator scope */}
          {isAggregator && (
            <span data-testid="write-badge" className="lg-badge lg-badge--write">WRITE</span>
          )}
        </div>

        {/* WHY M0.18: keyPath display — hierarchical path for audit traceability */}
        <div data-testid="guidance-keypath" className="lg-item__keypath">
          {item.keyPath}
        </div>

        {/* Guidance text */}
        <div data-testid="guidance-text" className="lg-item__text">
          {item.text}
        </div>

        {/* Meta row */}
        <div className="lg-item__stat-row">
          <span>added: {item.addedAt}</span>
          <span>use_count: {item.useCount}</span>
          <span>ttl: {item.ttl}</span>
          <div className="lg-item__btn-group">
            <button
              data-testid="guidance-toggle"
              className="btn-px ghost guidance-action-btn"
              onClick={() => undefined}
            >
              {item.active ? 'deactivate' : 'activate'}
            </button>
            <button
              data-testid="guidance-delete"
              className="btn-px ghost guidance-delete-btn"
              onClick={() => undefined}
            >
              削除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------------

export function LearnedGuidanceView(): JSX.Element {
  const rosterById = Object.fromEntries(ROSTER.map((r) => [r.id, r]));
  const activeCount = MOCK_GUIDANCE.filter((g) => g.active).length;
  const totalCount = MOCK_GUIDANCE.length;

  /** WHY typed state: typed enum prevents string literal scatter */
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');

  const filtered = MOCK_GUIDANCE.filter((item) => matchesScopeFilter(item, scopeFilter));

  // Pill config — count is pre-computed to display even when pill is inactive
  const agentCount = countForFilter(MOCK_GUIDANCE, 'agents');
  const reviewCount = countForFilter(MOCK_GUIDANCE, 'loom-review');
  const retroCount = countForFilter(MOCK_GUIDANCE, 'loom-retro');

  return (
    <div
      data-testid="guidance-view"
      className="rpg-frame pixel lg-root"
    >
      {/* Header */}
      <div className="lg-header">
        <div data-testid="guidance-title" className="rpg-title">
          Learned Guidance — agent に注入された学習
        </div>
        <span className="chip">
          active <b className="lg-header__badge-active">{activeCount}</b> / total {totalCount}
        </span>
        <span className="lg-header__audit-hint">
          retro / finding 由来は監査履歴あり
        </span>
      </div>

      {/* WHY M0.18: scope filter pill row — 4 values per GD-SCOPE-01 */}
      <div className="lg-scope-filter-row">
        <ScopeFilterPill
          label="all"
          filter="all"
          active={scopeFilter === 'all'}
          onClick={() => setScopeFilter('all')}
        />
        <ScopeFilterPill
          label="Agents"
          count={agentCount}
          filter="agents"
          active={scopeFilter === 'agents'}
          onClick={() => setScopeFilter('agents')}
        />
        <ScopeFilterPill
          label="loom-review"
          count={reviewCount}
          filter="loom-review"
          active={scopeFilter === 'loom-review'}
          onClick={() => setScopeFilter('loom-review')}
        />
        <ScopeFilterPill
          label="loom-retro"
          count={retroCount}
          filter="loom-retro"
          active={scopeFilter === 'loom-retro'}
          onClick={() => setScopeFilter('loom-retro')}
        />
      </div>

      {/* Guidance list */}
      <div className="lg-list">
        {filtered.map((item) => (
          <GuidanceItemCard
            key={item.id}
            item={item}
            agent={rosterById[item.agentId]}
          />
        ))}
      </div>

      {/* Footer hint */}
      <div className="lg-footer">
        guidance は agent の system prompt に append される。
        重複や矛盾は次 retro でレビュー候補としてマークされる（Phase 2）
      </div>
    </div>
  );
}
