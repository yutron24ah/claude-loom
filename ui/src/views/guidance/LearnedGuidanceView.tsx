/**
 * LearnedGuidanceView — retro/finding-derived guidance injected per agent.
 * WHY: Enables audit and pruning of learned_guidance entries injected into agent prompts.
 * SCREEN_REQUIREMENTS §3.10 / §4.9
 * Ported from ui/prototype/screens-c.jsx LearnedGuidanceView.
 * Toggle and delete buttons are noop in this milestone; real mutations wired in M3+
 * via prefsRouter.learnedGuidance.toggle / .delete.
 * Types aligned with daemon LearnedGuidanceEntry (routes/prefs.ts).
 */
import { ROSTER, type RosterEntry } from '../room/roster';

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
// Helpers
// -------------------------------------------------------------------------

function categoryColorClass(cat: GuidanceCategory): string {
  const map: Record<GuidanceCategory, string> = {
    tdd:      'bg-accent text-white',
    review:   'bg-accent text-white',
    security: 'bg-error text-white',
    test:     'bg-success text-white',
    process:  'bg-bg3 text-fg2',
    other:    'bg-bg3 text-fg2',
  };
  return map[cat] ?? 'bg-bg3 text-fg2';
}

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
      className={`bg-bg1 border-2 border-border p-sp-3 flex gap-sp-3 items-start ${!item.active ? 'opacity-50' : ''}`}
    >
      {/* Active state marker (hidden visual indicator for tests) */}
      {item.active
        ? <span data-testid="guidance-active" className="sr-only">active</span>
        : <span data-testid="guidance-inactive" className="sr-only">inactive</span>
      }

      {/* Body */}
      <div className="flex-1 min-w-0">
        {/* Agent + category + source + scope */}
        <div className="flex gap-sp-2 items-center flex-wrap mb-sp-1">
          <span
            data-testid="guidance-agent-name"
            className="text-fs-sm font-bold text-fg1"
          >
            {item.agentName}
          </span>
          {agent && (
            <span className="text-fs-xs text-text-muted">{agent.role}</span>
          )}
          <span
            data-testid="guidance-category"
            className={`text-fs-xs font-bold px-sp-1 py-0.5 border border-border uppercase tracking-wider ${categoryColorClass(item.category)}`}
          >
            {item.category}
          </span>
          <span className="font-mono text-fs-xs text-text-muted">
            from: {item.fromSource}
          </span>
          <span
            className={`text-fs-xs px-sp-1 py-0.5 border border-border ${
              item.scope === 'project'
                ? 'bg-accent text-white border-accent'
                : 'bg-transparent text-fg2'
            }`}
          >
            {item.scope}
          </span>
          {!item.active && (
            <span className="text-fs-xs text-text-muted px-sp-1 py-0.5 border border-border">
              inactive
            </span>
          )}
        </div>

        {/* Guidance text */}
        <div
          data-testid="guidance-text"
          className="text-fs-xs text-fg1 leading-relaxed px-sp-2 py-sp-1 bg-bg3 border-l-2 border-accent mb-sp-1"
        >
          {item.text}
        </div>

        {/* Meta row */}
        <div className="flex gap-sp-3 text-fs-xs text-text-muted font-mono items-center flex-wrap">
          <span>added: {item.addedAt}</span>
          <span>use_count: {item.useCount}</span>
          <span>ttl: {item.ttl}</span>
          <div className="ml-auto flex gap-sp-1">
            <button
              data-testid="guidance-toggle"
              className="px-sp-2 py-0.5 border border-border bg-bg2 text-fg1 text-fs-xs hover:bg-bg3"
              onClick={() => undefined}
            >
              {item.active ? 'deactivate' : 'activate'}
            </button>
            <button
              data-testid="guidance-delete"
              className="px-sp-2 py-0.5 border border-border bg-bg2 text-error text-fs-xs hover:bg-bg3"
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
      className="bg-bg2 rounded-card p-sp-4 flex flex-col gap-sp-3"
    >
      {/* Header */}
      <div className="flex items-center gap-sp-3 flex-wrap">
        <span
          data-testid="guidance-title"
          className="text-fs-md font-bold text-fg1"
        >
          Learned Guidance — agent に注入された学習
        </span>
        <span className="text-fs-xs px-sp-2 py-0.5 border border-border bg-bg3 text-fg2">
          active <strong>{activeCount}</strong> / total {totalCount}
        </span>
        <span className="ml-auto text-fs-xs text-text-muted">
          retro / finding 由来は監査履歴あり
        </span>
      </div>

      {/* Guidance list */}
      <div className="flex flex-col gap-sp-2">
        {MOCK_GUIDANCE.map((item) => (
          <GuidanceItemCard
            key={item.id}
            item={item}
            agent={rosterById[item.agentId]}
          />
        ))}
      </div>

      {/* Footer hint */}
      <div className="text-fs-xs text-text-muted bg-bg3 border-2 border-dashed border-border p-sp-2 leading-relaxed">
        guidance は agent の system prompt に append される。
        重複や矛盾は次 retro でレビュー候補としてマークされる（Phase 2）
      </div>
    </div>
  );
}
