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
import '../../styles/screens/sessions.css';

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
      className="sess-entry"
      style={{
        background: isSelected ? 'var(--p-accent-soft)' : 'transparent',
        borderLeft: isSelected ? '3px solid var(--p-accent)' : '3px solid transparent',
      }}
    >
      {/* Row 1: agent sprite + time + verdict + duration */}
      <div className="sess-entry__row1">
        {agent && (
          <CatSprite size={20} fur={agent.fur} cheek={agent.cheek} hat={agent.hat} pose="sit" />
        )}
        <span className="sess-entry__time">{session.startedAt}</span>
        <span className="sess-entry__spacer" />
        <span
          data-testid="session-verdict-badge"
          className="sess-entry__verdict"
          style={{ background: VERDICT_BG[session.verdict] }}
        >
          {session.verdict}
        </span>
        <span className="sess-entry__duration">{fmtDur(session.durationSec)}</span>
      </div>

      {/* Row 2: summary */}
      <div className="sess-entry__summary">{session.summary}</div>

      {/* Row 3: files + findings chips */}
      <div className="sess-entry__chips">
        {session.filesTouched.slice(0, 3).map((f) => (
          <span key={f} className="sess-entry__file-chip">{f}</span>
        ))}
        {session.filesTouched.length > 3 && (
          <span className="sess-entry__more">+{session.filesTouched.length - 3}</span>
        )}
        {session.relatedFindings.length > 0 &&
          session.relatedFindings.map((f) => (
            <span key={f} className="sess-entry__finding-chip">⚠ {f}</span>
          ))}
        {session.relatedRetro && (
          <span className="sess-entry__retro-chip">{session.relatedRetro}</span>
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
      <div data-testid="session-detail-panel" className="sess-detail-empty">
        <div>
          <div className="sess-detail-empty__icon">📂</div>
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
      <div className="sess-detail__header">
        {agent && (
          <CatSprite size={36} fur={agent.fur} cheek={agent.cheek} hat={agent.hat} pose="sit" />
        )}
        <div className="sess-detail__header-body">
          <div className="sess-detail__title">{session.summary}</div>
          <div className="sess-detail__meta">
            {session.id} · {session.startedAt} · {fmtDur(session.durationSec)} · {session.turns}{' '}
            turns
          </div>
        </div>
        <span
          className="sess-detail__verdict"
          style={{ background: VERDICT_BG[session.verdict] }}
        >
          {session.verdict}
        </span>
      </div>

      {/* Files + Related grid */}
      <div className="sess-detail__grid">
        {/* Files touched */}
        <div className="sess-detail__card">
          <div className="sess-detail__card-label">FILES TOUCHED</div>
          {session.filesTouched.map((f) => (
            <div key={f} className="sess-detail__file-row">↗ {f}</div>
          ))}
        </div>

        {/* Related retro + findings */}
        <div className="sess-detail__card">
          <div className="sess-detail__card-label">RELATED</div>
          {session.relatedRetro && (
            <div className="sess-detail__related-row">
              ◆ retro:{' '}
              <a className="sess-detail__related-link">{session.relatedRetro}</a>
            </div>
          )}
          {session.relatedFindings.length > 0 &&
            session.relatedFindings.map((f) => (
              <div key={f} className="sess-detail__related-row">
                ⚠ finding: <a className="sess-detail__related-link">{f}</a>
              </div>
            ))}
          {!session.relatedRetro && session.relatedFindings.length === 0 && (
            <div className="sess-detail__related-empty">—</div>
          )}
        </div>
      </div>

      {/* Transcript replay placeholder */}
      <div className="sess-detail__replay">
        <div className="sess-detail__replay-label">TRANSCRIPT REPLAY</div>
        <button className="btn-px primary sess-detail__replay-btn">
          ▶ 再生 (Retro と同じ player)
        </button>
        <div className="sess-detail__replay-hint">
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
    <div data-testid="session-list" className="sess-screen">
      {/* LEFT — list + filters */}
      <div className="sess-list-panel">
        {/* Header + search + filter bar */}
        <div className="sess-list-header">
          {/* Title + count chip */}
          <div className="sess-list-header__title-row">
            <div className="sess-list-header__title">❐ SESSIONS</div>
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
            className="sess-search-input"
          />

          {/* Filter bar: agent + verdict */}
          <div className="sess-filter-bar">
            <select
              data-testid="session-filter-agent"
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="sess-filter-select"
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
              className="sess-filter-select"
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
        <div className="sess-list-body">
          {filtered.length === 0 && (
            <div className="sess-list-empty">
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
      <div className="sess-detail-panel">
        <SessionDetailPanel
          session={selected}
          rosterById={rosterById}
          projectName={sc.project ?? ''}
        />
      </div>
    </div>
  );
}
