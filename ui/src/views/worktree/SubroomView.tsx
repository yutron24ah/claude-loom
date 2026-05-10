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
      className="rpg-frame pixel subroom-view"
      style={{
        width,
        padding: 0,
        fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
      }}
    >
      {/* HEADER STRIP — branch + clone identity */}
      <div
        style={{
          background: 'var(--p-accent)',
          color: 'white',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '3px solid var(--p-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ filter: 'drop-shadow(0 0 0 2px white)' }}>
            <CatSprite
              size={32}
              fur={parentCat?.fur || '#aaa'}
              cheek={parentCat?.cheek || '#fda'}
              hat={parentCat?.hat}
              pose="work"
            />
          </div>
          <div>
            <div style={{ fontSize: 9, opacity: 0.85, letterSpacing: '0.06em' }}>
              SUBROOM · WORKTREE
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.02em' }}>
              @{branch}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              background: statusColor,
              border: '2px solid white',
              animation: status === 'busy' ? 'subroom-pulse 1.2s ease-in-out infinite' : 'none',
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {status}
          </span>
        </div>
      </div>

      {/* BODY — 2 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 0 }}>
        {/* LEFT — current task + disk info + activity */}
        <div
          style={{
            padding: 16,
            borderRight: '2px dashed var(--p-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* NOW section — current task (last commit) */}
          <div>
            <div
              style={{
                fontSize: 9,
                color: 'var(--p-text-muted)',
                letterSpacing: '0.06em',
                marginBottom: 4,
              }}
            >
              ▶ NOW
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--p-text)',
                lineHeight: 1.4,
              }}
            >
              {session.task}
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '2px 6px',
                  background: 'var(--p-warn)',
                  color: 'white',
                  border: '2px solid var(--p-border)',
                }}
              >
                TDD: {session.tdd}
              </span>
              <span style={{ fontSize: 10, color: 'var(--p-text-muted)' }}>
                {session.tddDetail}
              </span>
            </div>
          </div>

          {/* Path / disk info */}
          {session.file && (
            <div
              style={{
                background: 'var(--p-tint)',
                border: '2px solid var(--p-border)',
                padding: '8px 10px',
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: 'var(--p-text-muted)',
                  letterSpacing: '0.04em',
                  marginBottom: 3,
                }}
              >
                PATH
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--p-text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {session.file}
              </div>
              {session.diskMB > 0 && (
                <div style={{ marginTop: 4, fontSize: 10, display: 'flex', gap: 10 }}>
                  <span style={{ color: 'var(--p-text-muted)' }}>
                    {session.diskMB} MB on disk
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ACTIVITY section */}
          <div>
            <div
              style={{
                fontSize: 9,
                color: 'var(--p-text-muted)',
                letterSpacing: '0.06em',
                marginBottom: 6,
              }}
            >
              ▶ ACTIVITY
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {session.activity.length > 0 ? (
                session.activity.map((a, i) => (
                  <div
                    key={i}
                    style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11 }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        color: 'var(--p-text-muted)',
                        width: 36,
                        flexShrink: 0,
                      }}
                    >
                      {a.t}
                    </span>
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 700,
                        padding: '1px 5px',
                        background: KIND_BG[a.k] || 'var(--p-stone)',
                        color: 'white',
                        border: '1.5px solid var(--p-border)',
                        width: 50,
                        textAlign: 'center',
                        flexShrink: 0,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {a.k}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        color: 'var(--p-text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {a.m}
                    </span>
                  </div>
                ))
              ) : (
                <span style={{ fontSize: 10, color: 'var(--p-text-muted)' }}>
                  — no recent activity
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — mini gantt + meta */}
        <div
          style={{
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* THIS BRANCH section — mini gantt */}
          <div>
            <div
              style={{
                fontSize: 9,
                color: 'var(--p-text-muted)',
                letterSpacing: '0.06em',
                marginBottom: 6,
              }}
            >
              ▶ THIS BRANCH · 1h
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {session.bars.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      fontSize: 8,
                      color: 'var(--p-text-muted)',
                      width: 60,
                      flexShrink: 0,
                      textAlign: 'right',
                    }}
                  >
                    {b.l}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 10,
                      background: 'var(--p-tint)',
                      border: '1px solid var(--p-border)',
                      position: 'relative',
                    }}
                  >
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
                    <div
                      style={{
                        position: 'absolute',
                        left: '95%',
                        top: -1,
                        bottom: -1,
                        width: 1,
                        background: 'var(--p-error)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PARENT meta panel */}
          <div
            style={{
              background: 'var(--p-tint)',
              border: '2px solid var(--p-border)',
              padding: '8px 10px',
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: 'var(--p-text-muted)',
                letterSpacing: '0.04em',
                marginBottom: 3,
              }}
            >
              PARENT
            </div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>
              {parentCat?.name || '—'}{' '}
              <span
                style={{
                  fontWeight: 400,
                  color: 'var(--p-text-muted)',
                  fontSize: 10,
                }}
              >
                (本体)
              </span>
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 10,
                color: 'var(--p-text-muted)',
                lineHeight: 1.4,
              }}
            >
              本体が orchestrate、このサブルームで並列実行中。
              <br />
              merge: 検証 PASS 後 → main へ
            </div>
          </div>

          {/* worktree path footer */}
          <div
            style={{
              fontSize: 9,
              color: 'var(--p-text-muted)',
              lineHeight: 1.4,
              paddingTop: 4,
              borderTop: '1px dashed var(--p-border)',
            }}
          >
            ◆ worktree path:{' '}
            <span style={{ fontWeight: 700, color: 'var(--p-text)' }}>
              {session.path || `~/loom/worktrees/${branch.replace('/', '-')}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
