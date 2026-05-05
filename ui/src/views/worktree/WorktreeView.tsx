/**
 * WorktreeView — Worktree list with branch status and subagent assignment.
 * WHY: Visual audit of all active/locked worktrees; cat devs shown per branch.
 * SCREEN_REQUIREMENTS §3.9 / §4.8 / §5.1
 * Ported from ui/prototype/subroom.jsx (179 lines).
 * M0.11.4 t15: rewritten to use rpg-frame / rpg-title / chip / dot (Phase A SSoT).
 * Mock data is hard-coded; real data wired in M3+ via tRPC worktreeRouter.
 */
import { CatSprite } from '../../components/CatSprite';
import { ROSTER, type RosterEntry } from '../room/roster';

// -------------------------------------------------------------------------
// Types — aligned with daemon Worktree schema (routes/worktree.ts)
// -------------------------------------------------------------------------

export type WorktreeStatus = 'active' | 'locked';

export interface WorktreeMock {
  /** git branch name */
  branch: string;
  /** short description of current use */
  use: string;
  /** filesystem path of the worktree */
  path: string;
  /** 1-2 agent ids from ROSTER */
  agentIds: string[];
  lock: boolean;
  max: boolean;
}

// -------------------------------------------------------------------------
// Mock data — 4 worktrees matching design source
// -------------------------------------------------------------------------

const MOCK_WORKTREES: WorktreeMock[] = [
  {
    branch: 'main',
    use: 'parallel dev',
    path: '~/work/loom',
    agentIds: ['pm', 'dev'],
    lock: false,
    max: false,
  },
  {
    branch: 'feat/m0.13-discipline',
    use: 'parallel dev',
    path: '~/wt/m0.13',
    agentIds: ['rev-code', 'rev-test'],
    lock: false,
    max: false,
  },
  {
    branch: 'exp/retro-ui-redesign',
    use: '安全実験',
    path: '~/wt/retro-redesign',
    agentIds: ['retro-pj'],
    lock: true,
    max: false,
  },
  {
    branch: 'hotfix/secret-scan',
    use: 'hotfix',
    path: '~/wt/hotfix-sec',
    agentIds: ['rev-sec'],
    lock: false,
    max: false,
  },
];

// -------------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------------

export function WorktreeView(): JSX.Element {
  const rosterById = Object.fromEntries(ROSTER.map((r) => [r.id, r]));
  const activeCount = MOCK_WORKTREES.filter((w) => !w.lock).length;

  return (
    <div
      data-testid="worktree-view"
      className="rpg-frame pixel"
      style={{ padding: 16 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div
          data-testid="worktree-title"
          className="rpg-title"
        >
          Worktree — サブルーム配置
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="chip">{activeCount} / {MOCK_WORKTREES.length} active</span>
          <button className="btn-px primary" style={{ fontSize: 9, padding: '4px 8px' }}>
            + 新規 worktree
          </button>
        </div>
      </div>

      {/* Worktree grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {MOCK_WORKTREES.map((wt, i) => {
          const cats = wt.agentIds
            .map((id) => rosterById[id])
            .filter((c): c is RosterEntry => c !== undefined);
          return (
            <div
              key={i}
              data-testid="worktree-item"
              style={{
                padding: 12,
                background: 'var(--p-tint)',
                border: '2px solid var(--p-border)',
                position: 'relative',
              }}
            >
              {/* Mini-room preview */}
              <div style={{
                height: 70,
                background: 'var(--p-bg-floor)',
                border: '2px solid var(--p-border)',
                position: 'relative',
                overflow: 'hidden',
                marginBottom: 8,
              }}>
                {/* Floor lines */}
                {[0, 1, 2, 3, 4].map((j) => (
                  <div key={j} style={{
                    position: 'absolute', top: 0, bottom: 0,
                    left: `${j * 20}%`, width: 1,
                    background: 'var(--p-bg-floor-2)',
                  }} />
                ))}
                {/* Desk */}
                <div style={{
                  position: 'absolute', bottom: 6, left: 16, right: 16, height: 6,
                  background: 'var(--p-wood)',
                  border: '2px solid var(--p-border)',
                }} />
                {/* Cat sprites */}
                <div style={{ position: 'absolute', bottom: 12, left: 24, display: 'flex', gap: 6 }}>
                  {cats.map((c) => (
                    <CatSprite
                      key={c.id}
                      data-testid="worktree-cat-sprite"
                      size={36}
                      fur={c.fur}
                      hat={c.hat}
                      pose="work"
                    />
                  ))}
                </div>
                {/* Lock badge */}
                {wt.lock && (
                  <div style={{
                    position: 'absolute', top: 4, right: 4,
                    padding: '2px 5px',
                    background: 'var(--p-warn)',
                    color: 'white',
                    fontSize: 9,
                    fontWeight: 700,
                    border: '1px solid var(--p-border)',
                  }}>
                    LOCK
                  </div>
                )}
              </div>

              {/* Branch info + status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div
                    data-testid="worktree-branch"
                    style={{ fontSize: 11, fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}
                  >
                    {wt.branch}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--p-text-muted)', fontFamily: 'ui-monospace, monospace' }}>
                    {wt.path}
                  </div>
                </div>
                <span className="chip">{wt.use}</span>
              </div>

              {/* Status dot + badges */}
              <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                {wt.lock ? (
                  <span
                    data-testid="worktree-status-locked"
                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <span className="dot fail" />
                    <span className="rpg-label">locked</span>
                  </span>
                ) : (
                  <span
                    data-testid="worktree-status-active"
                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <span className="dot busy" />
                    <span className="rpg-label">active</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
