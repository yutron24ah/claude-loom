/**
 * SessionListView — redesign port of past session archive.
 *
 * WHY: M0.15 t8. Replaces hardcoded fixture / useSessionList (tRPC) with
 * useScenario().sessions to enable live-driven display from the daemon WS reducer.
 *
 * Visual SSoT: redesign/screens/sessions.jsx
 * Data SSoT: redesign/api/types.ts SessionItem / SessionVerdict
 * SPEC §3.6.14 / SCREEN_REQUIREMENTS §4.8
 *
 * Write hookup (transcript replay) deferred to Phase 5 post-M0.15.
 * M0.15 t8: read-only visual port, useScenario() driven.
 *
 * data-testid map:
 *   session-list              → outer container
 *   session-search-input      → text search <input>
 *   session-filter-agent      → agent filter <select>
 *   session-filter-verdict    → verdict filter <select>
 *   session-entry             → one row per session (in left list)
 *   session-verdict-badge     → PASS/FAIL badge chip per entry
 *   session-detail-panel      → right panel (selected session details)
 */
import React, { useState } from 'react';
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { SessionItem, SessionVerdict } from '@claude-loom/redesign/api/types';
import { CatSprite } from '../../components/CatSprite';
import { ROSTER } from '../room/roster';

// ---------------------------------------------------------------------------
// Helpers — typed constants avoid string literal scatter (Principle: avoid string literals)
// ---------------------------------------------------------------------------

/** WHY: verdict → CSS background color mapping, typed to SessionVerdict SSoT */
const VERDICT_BG: Record<SessionVerdict, string> = {
  PASS: 'var(--p-success)',
  FAIL: 'var(--p-error)',
};

/** Format duration from seconds to "Xh Ym" or "Ym" */
function fmtDur(sec: number): string {
  const m = Math.floor(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h${m % 60}m` : `${m}m`;
}

// ---------------------------------------------------------------------------
// Verdict Filter options
// ---------------------------------------------------------------------------

type VerdictFilterValue = 'all' | SessionVerdict;

const VERDICT_FILTER_OPTIONS: Array<{ value: VerdictFilterValue; label: string }> = [
  { value: 'all', label: '全 verdict' },
  { value: 'PASS', label: 'PASS' },
  { value: 'FAIL', label: 'FAIL' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SessionEntryProps {
  session: SessionItem;
  isSelected: boolean;
  onClick: () => void;
  rosterById: Record<string, (typeof ROSTER)[number]>;
}

function SessionEntry({ session, isSelected, onClick, rosterById }: SessionEntryProps): JSX.Element {
  const agent = rosterById[session.agentRoot];

  return (
    <button
      data-testid="session-entry"
      onClick={onClick}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'block',
        width: '100%',
        padding: '10px 12px',
        borderBottom: '1px dashed var(--p-border)',
        background: isSelected ? 'var(--p-accent-soft)' : 'transparent',
        borderLeft: isSelected ? '3px solid var(--p-accent)' : '3px solid transparent',
        boxSizing: 'border-box',
      }}
    >
      {/* Row 1: agent sprite + time + verdict + duration */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
        {agent && (
          <CatSprite size={20} fur={agent.fur} cheek={agent.cheek} hat={agent.hat} pose="sit" />
        )}
        <span
          style={{
            fontSize: 9,
            fontFamily: 'ui-monospace, monospace',
            color: 'var(--p-text-muted)',
          }}
        >
          {session.startedAt}
        </span>
        <span style={{ flex: 1 }} />
        <span
          data-testid="session-verdict-badge"
          style={{
            fontSize: 8,
            fontWeight: 700,
            padding: '0 4px',
            background: VERDICT_BG[session.verdict],
            color: 'white',
            border: '1px solid var(--p-border)',
          }}
        >
          {session.verdict}
        </span>
        <span
          style={{
            fontSize: 9,
            color: 'var(--p-text-muted)',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          {fmtDur(session.durationSec)}
        </span>
      </div>

      {/* Row 2: summary */}
      <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.4, marginBottom: 4 }}>
        {session.summary}
      </div>

      {/* Row 3: files + findings chips */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', fontSize: 8 }}>
        {session.filesTouched.slice(0, 3).map((f) => (
          <span
            key={f}
            style={{
              padding: '1px 4px',
              background: 'var(--p-tint)',
              border: '1px solid var(--p-border)',
              fontFamily: 'ui-monospace, monospace',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 140,
            }}
          >
            {f}
          </span>
        ))}
        {session.filesTouched.length > 3 && (
          <span style={{ color: 'var(--p-text-muted)' }}>+{session.filesTouched.length - 3}</span>
        )}
        {session.relatedFindings.length > 0 &&
          session.relatedFindings.map((f) => (
            <span
              key={f}
              style={{
                padding: '1px 4px',
                background: 'var(--p-warn)',
                color: 'white',
                border: '1px solid var(--p-border)',
              }}
            >
              ⚠ {f}
            </span>
          ))}
        {session.relatedRetro && (
          <span
            style={{
              padding: '1px 4px',
              background: 'var(--p-tint)',
              border: '1px solid var(--p-accent)',
              color: 'var(--p-accent)',
            }}
          >
            {session.relatedRetro}
          </span>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Detail Panel
// ---------------------------------------------------------------------------

interface SessionDetailPanelProps {
  session: SessionItem | null;
  rosterById: Record<string, (typeof ROSTER)[number]>;
  projectName: string;
}

function SessionDetailPanel({ session, rosterById, projectName }: SessionDetailPanelProps): JSX.Element {
  if (!session) {
    return (
      <div
        data-testid="session-detail-panel"
        style={{
          display: 'grid',
          placeItems: 'center',
          height: '100%',
          fontSize: 11,
          color: 'var(--p-text-muted)',
          textAlign: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
          左のリストから session を選ぶと、ここに
          <br />
          summary / 関連 file / 関連 retro / transcript player が表示されます。
        </div>
      </div>
    );
  }

  const agent = rosterById[session.agentRoot];

  return (
    <div data-testid="session-detail-panel">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {agent && (
          <CatSprite size={36} fur={agent.fur} cheek={agent.cheek} hat={agent.hat} pose="sit" />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{session.summary}</div>
          <div
            style={{
              fontSize: 9,
              fontFamily: 'ui-monospace, monospace',
              color: 'var(--p-text-muted)',
            }}
          >
            {session.id} · {session.startedAt} · {fmtDur(session.durationSec)} · {session.turns}{' '}
            turns
          </div>
        </div>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: '2px 6px',
            background: VERDICT_BG[session.verdict],
            color: 'white',
            border: '1.5px solid var(--p-border)',
          }}
        >
          {session.verdict}
        </span>
      </div>

      {/* Files + Related grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginBottom: 12,
        }}
      >
        {/* Files touched */}
        <div
          style={{
            padding: 10,
            background: 'var(--p-paper)',
            border: '2px solid var(--p-border)',
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
            FILES TOUCHED
          </div>
          {session.filesTouched.map((f) => (
            <div
              key={f}
              style={{
                fontSize: 10,
                fontFamily: 'ui-monospace, monospace',
                padding: '2px 0',
                color: 'var(--p-accent)',
              }}
            >
              ↗ {f}
            </div>
          ))}
        </div>

        {/* Related retro + findings */}
        <div
          style={{
            padding: 10,
            background: 'var(--p-paper)',
            border: '2px solid var(--p-border)',
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
            RELATED
          </div>
          {session.relatedRetro && (
            <div style={{ fontSize: 10, padding: '2px 0' }}>
              ◆ retro:{' '}
              <a style={{ color: 'var(--p-accent)', cursor: 'pointer' }}>
                {session.relatedRetro}
              </a>
            </div>
          )}
          {session.relatedFindings.length > 0 &&
            session.relatedFindings.map((f) => (
              <div key={f} style={{ fontSize: 10, padding: '2px 0' }}>
                ⚠ finding: <a style={{ color: 'var(--p-accent)', cursor: 'pointer' }}>{f}</a>
              </div>
            ))}
          {!session.relatedRetro && session.relatedFindings.length === 0 && (
            <div style={{ fontSize: 10, color: 'var(--p-text-muted)' }}>—</div>
          )}
        </div>
      </div>

      {/* Transcript replay placeholder */}
      <div
        style={{
          padding: 14,
          background: 'var(--p-paper)',
          border: '2px solid var(--p-border)',
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--p-text-muted)',
          lineHeight: 1.6,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: '0.06em',
            marginBottom: 8,
          }}
        >
          TRANSCRIPT REPLAY
        </div>
        <button className="btn-px primary" style={{ fontSize: 10, padding: '5px 12px' }}>
          ▶ 再生 (Retro と同じ player)
        </button>
        <div style={{ marginTop: 8, fontSize: 9 }}>
          実装時: <code>~/.claude/projects/{projectName}/{session.id}.jsonl</code> を読んで
          <br />
          Retro screen の transcript component を流用
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SessionListView(): JSX.Element {
  const sc = useScenario();
  const sessions: SessionItem[] = sc.sessions ?? [];

  const [searchQuery, setSearchQuery] = useState('');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilterValue>('all');
  const [selected, setSelected] = useState<SessionItem | null>(null);

  // Build roster lookup map (WHY: avoid repeated .find() in render)
  const rosterById = Object.fromEntries(ROSTER.map((r) => [r.id, r]));

  // Unique agent roots for dynamic filter options
  const agentRoots = Array.from(new Set(sessions.map((s) => s.agentRoot)));

  // Client-side filter — search by summary or filesTouched
  const filtered = sessions.filter((s) => {
    if (agentFilter !== 'all' && s.agentRoot !== agentFilter) return false;
    if (verdictFilter !== 'all' && s.verdict !== verdictFilter) return false;
    if (
      searchQuery !== '' &&
      !(s.summary + ' ' + s.filesTouched.join(' '))
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div
      data-testid="session-list"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        gridTemplateColumns: 'minmax(380px, 1fr) 1.4fr',
        gap: 0,
        background: 'var(--p-bg-sky)',
      }}
    >
      {/* LEFT — list + filters */}
      <div
        style={{
          borderRight: '3px solid var(--p-border)',
          background: 'var(--p-paper)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        {/* Header + search + filter bar */}
        <div
          style={{
            padding: '10px 12px',
            borderBottom: '2px solid var(--p-border)',
            flexShrink: 0,
          }}
        >
          {/* Title + count chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>❐ SESSIONS</div>
            <span className="chip">
              {filtered.length} / {sessions.length}
            </span>
          </div>

          {/* Search input */}
          <input
            data-testid="session-search-input"
            type="text"
            placeholder="🔍 summary / file name / PR…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '5px 8px',
              fontSize: 10,
              marginBottom: 6,
              border: '1.5px solid var(--p-border)',
              background: 'var(--p-tint)',
              fontFamily: 'ui-monospace, monospace',
              boxSizing: 'border-box',
            }}
          />

          {/* Filter bar: agent + verdict */}
          <div style={{ display: 'flex', gap: 4 }}>
            <select
              data-testid="session-filter-agent"
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              style={{
                flex: 1,
                padding: '3px',
                fontSize: 9,
                border: '1.5px solid var(--p-border)',
                background: 'var(--p-tint)',
              }}
            >
              <option value="all">全 agent</option>
              {agentRoots.map((id) => (
                <option key={id} value={id}>
                  {rosterById[id]?.name ?? id}
                </option>
              ))}
            </select>

            <select
              data-testid="session-filter-verdict"
              value={verdictFilter}
              onChange={(e) => setVerdictFilter(e.target.value as VerdictFilterValue)}
              style={{
                flex: 1,
                padding: '3px',
                fontSize: 9,
                border: '1.5px solid var(--p-border)',
                background: 'var(--p-tint)',
              }}
            >
              {VERDICT_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Session entry list */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {filtered.length === 0 && (
            <div
              style={{
                padding: 30,
                textAlign: 'center',
                fontSize: 10,
                color: 'var(--p-text-muted)',
              }}
            >
              条件にマッチする session はありません
            </div>
          )}
          {filtered.map((s) => (
            <SessionEntry
              key={s.id}
              session={s}
              isSelected={selected?.id === s.id}
              onClick={() => setSelected(s)}
              rosterById={rosterById}
            />
          ))}
        </div>
      </div>

      {/* RIGHT — detail panel */}
      <div style={{ minHeight: 0, overflow: 'auto', padding: 16 }}>
        <SessionDetailPanel
          session={selected}
          rosterById={rosterById}
          projectName={sc.project ?? ''}
        />
      </div>
    </div>
  );
}
