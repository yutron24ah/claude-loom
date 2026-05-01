/**
 * WorktreeView — Worktree list with branch status and subagent assignment.
 * WHY: Visual audit of all active/locked worktrees; cat devs shown per branch.
 * SCREEN_REQUIREMENTS §3.9 / §4.8 / §5.1
 * Ported from ui/prototype/subroom.jsx (179 lines).
 * Mock data is hard-coded; real data wired in M3+ via tRPC worktreeRouter.
 */
import { ROSTER, type RosterEntry } from '../room/roster';

// -------------------------------------------------------------------------
// Types — aligned with daemon Worktree schema (routes/worktree.ts)
// -------------------------------------------------------------------------

export type WorktreeStatus = 'active' | 'locked';

export interface WorktreeMock {
  /** git branch name */
  branch: string;
  /** filesystem path of the worktree */
  path: string;
  /** ISO date string */
  createdAt: string;
  status: WorktreeStatus;
  /** 1-2 agent ids from ROSTER */
  agentIds: string[];
  /** current TDD phase displayed in the subroom header */
  tddPhase: string;
  /** short description of the current task */
  task: string;
}

// -------------------------------------------------------------------------
// Mock data (3-5 worktrees)
// -------------------------------------------------------------------------

const MOCK_WORKTREES: WorktreeMock[] = [
  {
    branch: 'feat/m2-ui-shell',
    path: '~/loom/worktrees/feat-m2-ui-shell',
    createdAt: '2026-04-30',
    status: 'active',
    agentIds: ['dev', 'rev'],
    tddPhase: 'GREEN',
    task: 'M2 UI Shell コンポーネント実装',
  },
  {
    branch: 'feat/daemon-tRPC',
    path: '~/loom/worktrees/feat-daemon-tRPC',
    createdAt: '2026-04-28',
    status: 'active',
    agentIds: ['dev'],
    tddPhase: 'RED',
    task: 'tRPC subscription エンドポイント追加',
  },
  {
    branch: 'fix/test-flake',
    path: '~/loom/worktrees/fix-test-flake',
    createdAt: '2026-04-27',
    status: 'locked',
    agentIds: ['dev', 'rev-test'],
    tddPhase: 'DIAGNOSE',
    task: 'タイミング依存 flake 修正',
  },
  {
    branch: 'docs/screen-requirements',
    path: '~/loom/worktrees/docs-screen-requirements',
    createdAt: '2026-04-26',
    status: 'locked',
    agentIds: ['pm'],
    tddPhase: '—',
    task: 'SCREEN_REQUIREMENTS §3.9 記述更新',
  },
];

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function tddPhaseClass(phase: string): string {
  if (phase === 'RED') return 'bg-error text-white';
  if (phase === 'GREEN') return 'bg-success text-white';
  if (phase === 'REFACTOR') return 'bg-accent text-white';
  return 'bg-bg3 text-text-muted';
}

function statusClass(status: WorktreeStatus): string {
  return status === 'active'
    ? 'bg-success text-white'
    : 'bg-bg3 text-text-muted';
}

// -------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------

interface AgentTagProps {
  entry: RosterEntry;
}

function AgentTag({ entry }: AgentTagProps): JSX.Element {
  return (
    <span
      className="inline-flex items-center gap-sp-1 px-sp-2 py-0.5 border border-border text-fs-xs font-bold text-fg1 bg-bg2"
    >
      {entry.name}
      <span className="text-text-muted font-normal">{entry.role}</span>
    </span>
  );
}

interface WorktreeItemProps {
  wt: WorktreeMock;
  agents: RosterEntry[];
}

function WorktreeItem({ wt, agents }: WorktreeItemProps): JSX.Element {
  return (
    <div
      data-testid="worktree-item"
      className="bg-bg2 border-2 border-border p-sp-3 flex flex-col gap-sp-2"
    >
      {/* Header row: branch + status */}
      <div className="flex items-center justify-between gap-sp-2">
        <span
          data-testid="worktree-branch"
          className="font-mono font-bold text-accent text-fs-sm"
        >
          @{wt.branch}
        </span>
        <div className="flex items-center gap-sp-2">
          <span
            className={`text-fs-xs font-bold px-sp-2 py-0.5 border border-border ${tddPhaseClass(wt.tddPhase)}`}
          >
            TDD: {wt.tddPhase}
          </span>
          {wt.status === 'active' ? (
            <span
              data-testid="worktree-status-active"
              className={`text-fs-xs font-bold uppercase px-sp-2 py-0.5 border border-border ${statusClass(wt.status)}`}
            >
              active
            </span>
          ) : (
            <span
              data-testid="worktree-status-locked"
              className={`text-fs-xs font-bold uppercase px-sp-2 py-0.5 border border-border ${statusClass(wt.status)}`}
            >
              locked
            </span>
          )}
        </div>
      </div>

      {/* Current task */}
      <div className="text-fs-sm text-fg1">{wt.task}</div>

      {/* Agent tags + path */}
      <div className="flex items-center justify-between gap-sp-2 flex-wrap">
        <div className="flex gap-sp-1 flex-wrap">
          {agents.map((a) => (
            <AgentTag key={a.id} entry={a} />
          ))}
        </div>
        <span className="font-mono text-fs-xs text-text-muted">{wt.path}</span>
      </div>

      {/* Created at */}
      <div className="text-fs-xs text-text-muted border-t border-border pt-sp-1">
        created: {wt.createdAt}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------------

export function WorktreeView(): JSX.Element {
  const rosterById = Object.fromEntries(ROSTER.map((r) => [r.id, r]));

  return (
    <div
      data-testid="worktree-view"
      className="bg-bg2 rounded-card p-sp-4 flex flex-col gap-sp-3"
    >
      {/* Header */}
      <div className="flex items-center gap-sp-3">
        <span
          data-testid="worktree-title"
          className="text-fs-md font-bold text-fg1"
        >
          Worktree — サブルーム一覧
        </span>
        <span className="text-fs-xs font-bold px-sp-2 py-0.5 bg-accent text-white border border-border">
          {MOCK_WORKTREES.filter((w) => w.status === 'active').length} active
        </span>
        <span className="text-fs-xs text-text-muted">
          / {MOCK_WORKTREES.length} total
        </span>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-sp-2 text-fs-xs">
        <div className="bg-bg3 border border-border p-sp-2">
          <div className="text-text-muted uppercase tracking-widest">ACTIVE</div>
          <div className="font-bold text-success text-fs-md font-mono">
            {MOCK_WORKTREES.filter((w) => w.status === 'active').length}
          </div>
        </div>
        <div className="bg-bg3 border border-border p-sp-2">
          <div className="text-text-muted uppercase tracking-widest">LOCKED</div>
          <div className="font-bold text-text-muted text-fs-md font-mono">
            {MOCK_WORKTREES.filter((w) => w.status === 'locked').length}
          </div>
        </div>
      </div>

      {/* Worktree list */}
      <div className="flex flex-col gap-sp-2">
        {MOCK_WORKTREES.map((wt) => {
          const agents = wt.agentIds
            .map((id) => rosterById[id])
            .filter((a): a is RosterEntry => a !== undefined);
          return (
            <WorktreeItem key={wt.branch} wt={wt} agents={agents} />
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="text-fs-xs text-text-muted bg-bg3 border border-dashed border-border p-sp-2 leading-relaxed">
        worktree path: ~/loom/worktrees/&lt;branch&gt; — merge: 検証 PASS 後 → main へ
      </div>
    </div>
  );
}
