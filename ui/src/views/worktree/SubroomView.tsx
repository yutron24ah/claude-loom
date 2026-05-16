/**
 * SubroomView — Worktree sub-agent detail modal.
 *
 * WHY this component: clicking a SubroomClone ghost cat opens this view,
 * showing branch state, current task, path info, disk usage, and status.
 *
 * M0.15 t4 redesign port: replaces hardcoded SESSIONS fixture with live
 * scenario.worktrees[] data from useScenario(). Structural sections
 * (NOW / ACTIVITY / THIS BRANCH / PARENT) are preserved for test
 * compatibility (subroom-view.test.tsx M0.11.4 contract).
 *
 * RoomView calling interface is unchanged:
 *   branch: string, parentCat: RosterEntry, status?: SubroomStatus, width?: number
 *
 * Full port of /tmp/claude-room-handoff/claude-room/project/subroom.jsx (179 lines).
 * RPG-style frame uses .rpg-frame CSS class from Phase A tokens.css.
 */
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { Worktree } from '@claude-loom/redesign/api/types';
import { CatSprite } from '../../components/CatSprite';
import type { RosterEntry } from '../../data/roster';
import '../../styles/screens/worktree.css';

type SubroomStatus = 'busy' | 'review' | 'idle';

interface SubroomViewProps {
  width?: number;
  branch: string;
  parentCat: RosterEntry;
  status?: SubroomStatus;
}

const STATUS_COLOR: Record<SubroomStatus, string> = {
  busy:   'var(--p-success)',
  review: 'var(--p-accent)',
  idle:   'var(--p-stone)',
};

// WHY: activity kind → background colour mapping mirrors design source exactly.
// Kept for structural rendering even when live data is minimal.
const KIND_BG: Record<string, string> = {
  test:    'var(--p-warn)',
  code:    'var(--p-accent)',
  spec:    'var(--p-success)',
  git:     'var(--p-stone)',
  verdict: 'var(--p-accent)',
  diag:    'var(--p-warn)',
};

// -------------------------------------------------------------------------
// Data derivation from Worktree (scenario-driven)
// -------------------------------------------------------------------------

interface DerivedSession {
  task: string;
  tdd: string;
  tddDetail: string;
  file: string;
  diffAdds: number;
  diffDels: number;
  commits: number;
  activity: Array<{ t: string; m: string; k: string }>;
  bars: Array<{ s: number; e: number; c: string; l: string }>;
  path: string;
  diskMB: number;
  lastCommit: string;
}

/**
 * Derives display data from a Worktree entry.
 * WHY: Worktree type doesn't carry session-level data (diff/activity/gantt bars);
 * we show lastCommit as the "NOW" task, and derive a simple gantt bar from status.
 * Full session data will be wired in Phase 3 t13 via daemon subscription.
 */
function deriveSession(wt: Worktree | undefined): DerivedSession {
  if (!wt) {
    return {
      task: '—',
      tdd: '—',
      tddDetail: '',
      file: '',
      diffAdds: 0,
      diffDels: 0,
      commits: 0,
      activity: [],
      bars: [],
      path: '',
      diskMB: 0,
      lastCommit: '',
    };
  }

  // Derive TDD label from status
  const tddMap: Record<string, string> = {
    busy:   'ACTIVE',
    review: 'REVIEW',
    idle:   'IDLE',
    failed: 'FAILED',
  };
  const tdd = tddMap[wt.status] ?? '—';

  // Derive a single gantt bar color from status
  const barColorMap: Record<string, string> = {
    busy:   'var(--p-success)',
    review: 'var(--p-accent)',
    idle:   'var(--p-stone)',
    failed: 'var(--p-error)',
  };
  const barColor = barColorMap[wt.status] ?? 'var(--p-stone)';

  // Derive activity entry from lastCommit
  const activity: Array<{ t: string; m: string; k: string }> = wt.lastCommit
    ? [{ t: wt.createdAt, m: wt.lastCommit, k: 'git' }]
    : [];

  return {
    task: wt.lastCommit || '—',
    tdd,
    tddDetail: `${wt.use} worktree · ${wt.diskMB} MB`,
    file: wt.path,
    diffAdds: 0,
    diffDels: 0,
    commits: 0,
    activity,
    bars: [{ s: 0, e: 95, c: barColor, l: wt.status }],
    path: wt.path,
    diskMB: wt.diskMB,
    lastCommit: wt.lastCommit,
  };
}

export function SubroomView({
  width = 720,
  branch,
  parentCat,
  status = 'busy',
}: SubroomViewProps): JSX.Element {
  const sc = useScenario();
  const worktrees = sc.worktrees ?? [];
  const matchedWt = worktrees.find((w) => w.branch === branch);
  const session = deriveSession(matchedWt);
  const statusColor = STATUS_COLOR[status];

  return (
    <div
      className="rpg-frame pixel sr-root"
      style={{ width }}
    >
      {/* HEADER STRIP — branch + clone identity */}
      <div className="sr-header">
        <div className="sr-header__left">
          <div className="sr-header__cat-wrap">
            <CatSprite
              size={32}
              fur={parentCat?.fur || '#aaa'}
              cheek={parentCat?.cheek || '#fda'}
              hat={parentCat?.hat}
              pose="work"
            />
          </div>
          <div>
            <div className="sr-header__subtitle">
              SUBROOM · WORKTREE
            </div>
            <div className="sr-header__branch">
              @{branch}
            </div>
          </div>
        </div>
        <div className="sr-header__status-group">
          <span
            className="sr-header__status-dot"
            style={{
              background: statusColor,
              animation: status === 'busy' ? 'subroom-pulse 1.2s ease-in-out infinite' : 'none',
            }}
          />
          <span className="sr-header__status-label">
            {status}
          </span>
        </div>
      </div>

      {/* BODY — 2 columns */}
      <div className="sr-body">
        {/* LEFT — current task + disk info + activity */}
        <div className="sr-left">
          {/* NOW section — current task (last commit) */}
          <div>
            <div className="sr-section-label">▶ NOW</div>
            <div className="sr-now__task">
              {session.task}
            </div>
            <div className="sr-now__badges">
              <span className="sr-now__tdd-badge">
                TDD: {session.tdd}
              </span>
              <span className="sr-now__tdd-detail">
                {session.tddDetail}
              </span>
            </div>
          </div>

          {/* Path / disk info */}
          {session.file && (
            <div className="sr-path-panel">
              <div className="sr-path-panel__label">PATH</div>
              <div className="sr-path-panel__path">
                {session.file}
              </div>
              {session.diskMB > 0 && (
                <div className="sr-path-panel__disk">
                  <span className="sr-path-panel__disk-label">
                    {session.diskMB} MB on disk
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ACTIVITY section */}
          <div>
            <div className="sr-section-label">▶ ACTIVITY</div>
            <div className="sr-activity-list">
              {session.activity.length > 0 ? (
                session.activity.map((a, i) => (
                  <div key={i} className="sr-activity-row">
                    <span className="sr-activity-row__ts">{a.t}</span>
                    <span
                      className="sr-activity-row__kind"
                      style={{ background: KIND_BG[a.k] || 'var(--p-stone)' }}
                    >
                      {a.k}
                    </span>
                    <span className="sr-activity-row__msg">{a.m}</span>
                  </div>
                ))
              ) : (
                <span className="sr-activity-empty">— no recent activity</span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — mini gantt + meta */}
        <div className="sr-right">
          {/* THIS BRANCH section — mini gantt */}
          <div>
            <div className="sr-gantt__label">▶ THIS BRANCH · 1h</div>
            <div className="sr-gantt__bars">
              {session.bars.map((b, i) => (
                <div key={i} className="sr-gantt__bar-row">
                  <span className="sr-gantt__bar-label">{b.l}</span>
                  <div className="sr-gantt__bar-track">
                    <div
                      style={{
                        position: 'absolute',
                        left: `${b.s}%`,
                        width: `${b.e - b.s}%`,
                        top: 0,
                        bottom: 0,
                        background: b.c,
                        backgroundImage:
                          'repeating-linear-gradient(45deg, rgba(255,255,255,0.25) 0 2px, transparent 2px 4px)',
                      }}
                    />
                    {/* current-time marker at 95% */}
                    <div className="sr-gantt__now-line" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PARENT meta panel */}
          <div className="sr-parent-panel">
            <div className="sr-parent-panel__label">PARENT</div>
            <div className="sr-parent-panel__name">
              {parentCat?.name || '—'}{' '}
              <span className="sr-parent-panel__suffix">(本体)</span>
            </div>
            <div className="sr-parent-panel__desc">
              本体が orchestrate、このサブルームで並列実行中。
              <br />
              merge: 検証 PASS 後 → main へ
            </div>
          </div>

          {/* worktree path footer */}
          <div className="sr-path-footer">
            ◆ worktree path:{' '}
            <span className="sr-path-footer__value">
              {session.path || `~/loom/worktrees/${branch.replace('/', '-')}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
