/**
 * WorktreeView — git worktree management screen (read-only visual port).
 *
 * WHY: M0.15 t4 redesign port — replaces hardcoded MOCK_WORKTREES fixture with
 * live useScenario() data from @claude-loom/redesign/api/websocket.
 *
 * Design source: redesign/screens/worktree.jsx
 * Data contract: redesign/api/types.ts Worktree / WorktreeUse / WorktreeStatus
 *
 * Phase scope: read-only visual port. Write operations (POST /worktree,
 * DELETE /worktree/:branch, POST /worktree/:branch/lock) deferred to
 * Phase 5 t16.
 *
 * SCREEN_REQUIREMENTS §3.9 / §4.8 / §5.1
 */
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { WorktreeUse, WorktreeStatus } from '@claude-loom/redesign/api/types';
import { CatSprite } from '../../components/CatSprite';
import { ROSTER } from '../../data/roster';

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

  return (
    <div
      data-testid="worktree-view"
      className="rpg-frame pixel"
      style={{ padding: 16 }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div
          data-testid="worktree-title"
          className="rpg-title"
        >
          WORKTREES — git worktree 管理
        </div>
        <span className="chip">{worktrees.length} active</span>
        <span className="chip">{(totalDisk / 1024).toFixed(1)} GB on disk</span>
      </div>

      {/* Branch graph (simplified) */}
      <div
        style={{
          background: 'var(--p-paper)',
          border: '2px solid var(--p-border)',
          padding: 10,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: 'var(--p-text-muted)',
            letterSpacing: '0.06em',
            marginBottom: 6,
          }}
        >
          BRANCH GRAPH (relative to main)
        </div>
        <div
          style={{
            position: 'relative',
            paddingLeft: 80,
            fontFamily: 'ui-monospace, monospace',
            fontSize: 10,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 8,
              top: 0,
              bottom: 0,
              width: 2,
              background: 'var(--p-accent)',
            }}
          />
          {worktrees.map((w) => {
            const isMain = w.branch === 'main';
            return (
              <div
                key={w.branch}
                style={{
                  position: 'relative',
                  padding: '4px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: -76,
                    width: 16,
                    height: 16,
                    top: '50%',
                    marginTop: -8,
                    background: USE_COLOR[w.use] ?? 'var(--p-stone)',
                    border: '2px solid var(--p-border)',
                  }}
                />
                {!isMain && (
                  <span
                    style={{
                      position: 'absolute',
                      left: -60,
                      top: '50%',
                      width: 50,
                      height: 2,
                      background: 'var(--p-border)',
                    }}
                  />
                )}
                <span
                  data-testid="worktree-branch"
                  style={{ fontWeight: 700 }}
                >
                  {w.branch}
                </span>
                <span style={{ color: 'var(--p-text-muted)' }}>
                  · {w.lastCommit}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: 'var(--p-paper)',
          border: '2px solid var(--p-border)',
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 80px 1fr 1.2fr 80px 80px',
            fontSize: 9,
            color: 'var(--p-text-muted)',
            letterSpacing: '0.06em',
            padding: '6px 10px',
            borderBottom: '2px solid var(--p-border)',
            background: 'var(--p-tint)',
          }}
        >
          <span>BRANCH / PATH</span>
          <span>USE</span>
          <span>PARENT AGENT</span>
          <span>LAST COMMIT</span>
          <span style={{ textAlign: 'right' }}>DISK</span>
          <span style={{ textAlign: 'right' }}>ACTIONS</span>
        </div>

        {/* Table rows */}
        {worktrees.map((w) => {
          const agent = rosterById[w.parentAgent];
          return (
            <div
              key={w.branch}
              data-testid="worktree-item"
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 80px 1fr 1.2fr 80px 80px',
                alignItems: 'center',
                padding: '8px 10px',
                borderBottom: '1px dashed var(--p-border)',
                fontSize: 10,
                gap: 6,
              }}
            >
              {/* BRANCH / PATH column */}
              <div
                style={{
                  minWidth: 0,
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                }}
              >
                {/* WHY: worktree.test.tsx legacy tests check worktree-status-active / worktree-status-locked */}
                {w.locked ? (
                  <span
                    data-testid="worktree-status-locked"
                    style={{
                      width: 7,
                      height: 7,
                      background: 'var(--p-warn)',
                      border: '1px solid var(--p-border)',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <span
                    data-testid="worktree-status-active"
                    style={{
                      width: 7,
                      height: 7,
                      background: ST_COLOR[w.status] ?? 'var(--p-stone)',
                      border: '1px solid var(--p-border)',
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {w.branch}
                    {w.locked && (
                      <span
                        data-testid="worktree-locked-badge"
                        style={{
                          fontSize: 8,
                          fontWeight: 700,
                          padding: '1px 4px',
                          background: 'var(--p-warn)',
                          color: 'white',
                          border: '1px solid var(--p-border)',
                          marginLeft: 4,
                        }}
                      >
                        LOCK
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 8,
                      color: 'var(--p-text-muted)',
                      fontFamily: 'ui-monospace, monospace',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {w.path}
                  </div>
                </div>
              </div>

              {/* USE column */}
              <span
                className="chip"
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  padding: '1px 5px',
                  background: USE_COLOR[w.use] ?? 'var(--p-stone)',
                  color: 'white',
                  border: '1.5px solid var(--p-border)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  width: 'fit-content',
                }}
              >
                {w.use}
              </span>

              {/* PARENT AGENT column */}
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
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
              <span
                style={{
                  fontSize: 9,
                  fontFamily: 'ui-monospace, monospace',
                  color: 'var(--p-text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {w.lastCommit}
              </span>

              {/* DISK column */}
              <span
                style={{
                  fontSize: 9,
                  fontFamily: 'ui-monospace, monospace',
                  textAlign: 'right',
                  color: 'var(--p-text-muted)',
                }}
              >
                {w.diskMB} MB
              </span>

              {/* ACTIONS column (read-only stubs — Phase 5 t16 for live write) */}
              <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                <button
                  className="btn-px ghost"
                  title={w.locked ? 'unlock' : 'lock'}
                  style={{ fontSize: 10, padding: '1px 4px' }}
                  disabled
                >
                  {w.locked ? '🔓' : '🔒'}
                </button>
                <button
                  className="btn-px ghost"
                  title="destroy"
                  style={{ fontSize: 10, padding: '1px 4px', color: 'var(--p-error)' }}
                  disabled
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: 10,
          padding: '8px 10px',
          fontSize: 9,
          color: 'var(--p-text-muted)',
          background: 'var(--p-paper)',
          border: '2px dashed var(--p-border)',
          lineHeight: 1.6,
        }}
      >
        ◆ <strong>USE</strong>: primary (本番), parallel (並列開発), experiment
        (実験), hotfix (緊急修正)
        <br />
        ◆ Room の poster 並びはここで管理する worktree から派生。Room 側は
        read-only な「並べ替え」のみ。
      </div>
    </div>
  );
}
