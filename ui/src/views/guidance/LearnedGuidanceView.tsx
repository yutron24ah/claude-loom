/**
 * LearnedGuidanceView — retro/finding-derived guidance injected per agent.
 * WHY: Enables audit and pruning of learned_guidance entries injected into agent prompts.
 * SCREEN_REQUIREMENTS §3.10 / §4.9
 * Ported from ui/prototype/screens-c.jsx LearnedGuidanceView.
 * M0.11.4 t15: rewritten to use rpg-frame / rpg-title / chip / dot (Phase A SSoT).
 * Toggle and delete buttons are noop in this milestone; real mutations wired in M3+
 * via prefsRouter.learnedGuidance.toggle / .delete.
 * Types aligned with daemon LearnedGuidanceEntry (routes/prefs.ts).
 */
import { CatSprite } from '../../components/CatSprite';
import { ROSTER, type RosterEntry } from '../room/roster';
import '../../styles/screens/guidance.css';

// -------------------------------------------------------------------------
// Types — aligned with daemon learnedGuidanceEntrySchema
// -------------------------------------------------------------------------

export type GuidanceCategory = 'tdd' | 'review' | 'security' | 'test' | 'process' | 'other';
export type GuidanceScope = 'user' | 'project';

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
}

// -------------------------------------------------------------------------
// Mock data — 5+ guidance items across multiple agents
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
  },
];

// -------------------------------------------------------------------------
// Helpers — typed map avoids string literal scatter (Principle: avoid string literals)
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
// Sub-components
// -------------------------------------------------------------------------

interface GuidanceItemCardProps {
  item: MockGuidanceItem;
  agent: RosterEntry | undefined;
}

function GuidanceItemCard({ item, agent }: GuidanceItemCardProps): JSX.Element {
  return (
    <div
      data-testid="guidance-item"
      data-active={item.active}
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
        {/* Agent + category + source + scope */}
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

      {/* Guidance list */}
      <div className="lg-list">
        {MOCK_GUIDANCE.map((item) => (
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
