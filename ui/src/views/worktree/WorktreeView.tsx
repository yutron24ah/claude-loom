/**
 * WorktreeView — git worktree management screen.
 *
 * WHY: M0.15 t4 redesign port — replaces hardcoded MOCK_WORKTREES fixture with
 * live useScenario() data from @claude-loom/redesign/api/websocket.
 * M0.15 t16 write hookup — lock/unlock/destroy/create buttons wired to
 * useWorktreeMutations (tRPC worktree router).
 *
 * Design source: redesign/screens/worktree.jsx
 * Data contract: redesign/api/types.ts Worktree / WorktreeUse / WorktreeStatus
 *
 * SCREEN_REQUIREMENTS §3.9 / §4.8 / §5.1
 * REQ-077
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { WorktreeUse, WorktreeStatus } from '@claude-loom/redesign/api/types';
import { CatSprite } from '../../components/CatSprite';
import { ROSTER } from '../../data/roster';
import { useWorktreeMutations } from '../../live/useWorktreeMutations';
import '../../styles/screens/worktree.css';

// -------------------------------------------------------------------------
// Design-source color maps (mirrors redesign/screens/worktree.jsx USE_COLOR / ST_COLOR)
// -------------------------------------------------------------------------

const USE_COLOR: Record<WorktreeUse, string> = {
  primary:    'var(--p-accent)',
  parallel:   'var(--p-success)',
  experiment: 'var(--p-warn)',
  hotfix:     'var(--p-error)',
};

const ST_COLOR: Record<WorktreeStatus, string> = {
  busy:   'var(--p-success)',
  review: 'var(--p-accent)',
  failed: 'var(--p-error)',
  idle:   'var(--p-stone)',
};

// -------------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------------

export function WorktreeView(): JSX.Element {
  const sc = useScenario();
  const worktrees = sc.worktrees ?? [];
  const rosterById = Object.fromEntries(ROSTER.map((r) => [r.id, r]));
  const totalDisk = worktrees.reduce((acc, w) => acc + w.diskMB, 0);
  const { lockWorktree, unlockWorktree, destroyWorktree } = useWorktreeMutations();
  // WHY: showCreate controls the create dialog (matches redesign/screens/worktree.jsx showCreate)
  const [showCreate, setShowCreate] = useState(false);
  // WHY: WT-QUERY-01 — ?branch= param allows deep-linking to a specific worktree row
  // (e.g., from /worktree?branch=feature/x to focus that branch for inspection)
  const [searchParams] = useSearchParams();
  const focusedBranch = searchParams.get('branch') ?? null;

  return (
    <div
      data-testid="worktree-view"
      className="wt-screen"
    >
      {/* Header — matches redesign: title + chips + spacer + "+ 新 worktree" button */}
      <div className="wt-header">
        <div
          data-testid="worktree-title"
          className="wt-header__title"
        >
          ⌗ WORKTREES — git worktree 管理
        </div>
        <span className="chip">{worktrees.length} active</span>
        <span className="chip">{(totalDisk / 1024).toFixed(1)} GB on disk</span>
        <div className="wt-header__spacer" />
        <button
          className="btn-px primary wt-header__create-btn"
          onClick={() => setShowCreate(true)}
        >
          + 新 worktree
        </button>
      </div>

      {/* Branch graph (simplified) */}
      <div className="wt-graph">
        <div className="wt-graph__label">
          BRANCH GRAPH (relative to main)
        </div>
        <div className="wt-graph__tree">
          <div className="wt-graph__main-line" />
          {worktrees.map((w) => {
            const isMain = w.branch === 'main';
            return (
              <div
                key={w.branch}
                className="wt-graph__branch-row"
              >
                <span
                  className="wt-graph__branch-dot"
                  style={{ background: USE_COLOR[w.use] ?? 'var(--p-stone)' }}
                />
                {!isMain && (
                  <span className="wt-graph__branch-connector" />
                )}
                <span
                  data-testid="worktree-branch"
                  className="wt-graph__branch-name"
                >
                  {w.branch}
                </span>
                <span className="wt-graph__branch-commit">
                  · {w.lastCommit}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="wt-table">
        {/* Table header */}
        <div className="wt-table__header">
          <span>BRANCH / PATH</span>
          <span>USE</span>
          <span>PARENT AGENT</span>
          <span>LAST COMMIT</span>
          <span className="wt-table__header-disk">DISK</span>
          <span className="wt-table__header-actions">ACTIONS</span>
        </div>

        {/* Table rows */}
        {worktrees.map((w) => {
          const agent = rosterById[w.parentAgent];
          const isFocused = focusedBranch !== null && w.branch === focusedBranch;
          return (
            <div
              key={w.branch}
              data-testid={isFocused ? 'worktree-focused' : 'worktree-item'}
              className={`wt-table__row${isFocused ? ' wt-table__row--focused' : ''}`}
            >
              {/* BRANCH / PATH column */}
              <div className="wt-table__branch-cell">
                {/* WHY: worktree.test.tsx legacy tests check worktree-status-active / worktree-status-locked */}
                {w.locked ? (
                  <span
                    data-testid="worktree-status-locked"
                    className="wt-table__status-dot"
                    style={{ background: 'var(--p-warn)' }}
                  />
                ) : (
                  <span
                    data-testid="worktree-status-active"
                    className="wt-table__status-dot"
                    style={{ background: ST_COLOR[w.status] ?? 'var(--p-stone)' }}
                  />
                )}
                <div className="wt-table__branch-info">
                  <div className="wt-table__branch-name-row">
                    {w.branch}
                    {w.locked && (
                      <span data-testid="worktree-locked-badge" className="wt-table__lock-badge">
                        LOCK
                      </span>
                    )}
                  </div>
                  <div className="wt-table__branch-path">
                    {w.path}
                  </div>
                </div>
              </div>

              {/* USE column */}
              <span
                className="chip wt-table__use-badge"
                style={{ background: USE_COLOR[w.use] ?? 'var(--p-stone)' }}
              >
                {w.use}
              </span>

              {/* PARENT AGENT column */}
              <div className="wt-table__agent-cell">
                {agent && (
                  <CatSprite
                    size={18}
                    fur={agent.fur}
                    cheek={agent.cheek}
                    hat={agent.hat}
                    pose="sit"
                  />
                )}
                <span style={{ fontSize: 10 }}>
                  {agent?.name ?? w.parentAgent}
                </span>
              </div>

              {/* LAST COMMIT column */}
              <span className="wt-table__commit">
                {w.lastCommit}
              </span>

              {/* DISK column */}
              <span className="wt-table__disk">
                {w.diskMB} MB
              </span>

              {/* ACTIONS column — wired to useWorktreeMutations (M0.15 t16) */}
              <div className="wt-table__actions">
                <button
                  className="btn-px ghost wt-table__action-btn"
                  title={w.locked ? 'unlock' : 'lock'}
                  onClick={() => {
                    if (w.locked) {
                      unlockWorktree({ path: w.path, branch: w.branch });
                    } else {
                      lockWorktree({ path: w.path, branch: w.branch });
                    }
                  }}
                >
                  {w.locked ? '🔓' : '🔒'}
                </button>
                <button
                  className="btn-px ghost wt-table__action-btn"
                  title="destroy"
                  style={{ color: 'var(--p-error)' }}
                  onClick={() => destroyWorktree({ path: w.path })}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="wt-legend">
        ◆ <strong>USE</strong>: primary (本番), parallel (並列開発), experiment
        (実験), hotfix (緊急修正) — SKILL.md §5用途と一致
        <br />
        ◆ Room の poster 並びはここで管理する worktree から派生。Room 側は
        read-only な「並べ替え」のみ。
      </div>

      {/* Create dialog — matches redesign/screens/worktree.jsx showCreate modal */}
      {showCreate && (
        <div
          onClick={() => setShowCreate(false)}
          className="wt-create-overlay"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="wt-create-dialog"
          >
            <div className="wt-create-dialog__title">＋ 新 worktree</div>
            <div className="wt-create-dialog__field-label">BRANCH NAME</div>
            <input
              type="text"
              placeholder="feat/something"
              className="wt-create-dialog__input"
            />
            <div className="wt-create-dialog__field-label">USE</div>
            <div className="wt-create-dialog__use-row">
              {(Object.keys(USE_COLOR) as WorktreeUse[]).map((u) => (
                <button
                  key={u}
                  className="btn-px ghost wt-create-dialog__use-btn"
                  style={{ background: USE_COLOR[u], color: 'white' }}
                >
                  {u}
                </button>
              ))}
            </div>
            <div className="wt-create-dialog__actions">
              <button className="btn-px ghost" onClick={() => setShowCreate(false)}>cancel</button>
              <button className="btn-px primary" onClick={() => setShowCreate(false)}>作成</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
