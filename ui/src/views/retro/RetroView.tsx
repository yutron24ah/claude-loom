/**
 * RetroView — retrospective session player.
 *
 * WHY: M0.15 t12 redesign port — replaces M0.11.4 hardcoded fixture with
 * useScenario().retroSession (redesign/api/websocket), following the visual
 * SSoT in redesign/screens/retro.jsx.
 *
 * Layout: 2-column grid (left: lens cards + transcript player + scrubber,
 * right: findings list + action plan tally).
 *
 * Action buttons (accept/reject/defer/discuss) are noop in Phase 3.
 * Live transcript playback (jsonl replay) is timeline-display-only here;
 * full playback control is a future milestone scope.
 *
 * REQ-072.
 */

import { useState } from 'react';
import { useScenario } from '@claude-loom/redesign/api/websocket';
import { CatSprite } from '../../components/CatSprite';
import { ROSTER } from '../room/roster';
import type {
  RetroLensCard,
  RetroFinding,
  RetroTranscriptEntry,
  RetroLensSeverity,
  RetroFindingCategory,
} from '@claude-loom/redesign/api/types';
import '../../styles/screens/retro.css';

// -------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------

/** WHY: typed constants prevent string literal drift. */
const FINDING_ACTION = {
  ACCEPT: 'accept',
  REJECT: 'reject',
  DEFER: 'defer',
  DISCUSS: 'discuss',
} as const;

// WHY: severity color map is local to this view (mirrors redesign/screens/retro.jsx SEV map).
const SEV_COLOR: Record<RetroLensSeverity, string> = {
  high: 'var(--p-error)',
  med:  'var(--p-warn)',
  low:  'var(--p-stone)',
};

// WHY: kind color distinguishes transcript entry types visually.
const KIND_COLOR: Record<string, string> = {
  finding:  'var(--p-error)',
  verdict:  'var(--p-success)',
  rebuttal: 'var(--p-accent)',
  report:   'var(--p-stone)',
  intro:    'var(--p-stone)',
};

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/** Format seconds as "M:SS" for transcript timeline display. */
function fmtSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** WHY: maps status to dot CSS class for visual indicator. */
function statusDotClass(status: string): string {
  if (status === 'open')     return 'dot fail';
  if (status === 'deferred') return 'dot idle';
  if (status === 'accepted') return 'dot busy';
  if (status === 'dismissed') return 'dot review';
  return 'dot idle';
}

// -------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------

interface LensCardProps {
  lens: RetroLensCard;
}

function LensCardComponent({ lens }: LensCardProps): JSX.Element {
  // WHY: match redesign/screens/retro.jsx — uses CatSprite for known agents, 👤 for user/unknown
  const rosterById = Object.fromEntries(ROSTER.map((r) => [r.id, r]));
  const agentEntry = rosterById[lens.id];

  return (
    <div
      data-testid={`lens-card-${lens.id}`}
      data-is-user={lens.isUser ? 'true' : undefined}
      className="retro-lens-card"
      style={{
        background: lens.isUser ? 'var(--p-accent-soft)' : 'var(--p-paper)',
      }}
    >
      <div className="retro-lens-card__header">
        {/* CatSprite for known roster agents, 👤 for user or unknown */}
        {agentEntry && !lens.isUser
          ? (
            <CatSprite
              size={26}
              fur={agentEntry.fur}
              cheek={agentEntry.cheek}
              hat={agentEntry.hat}
              pose="sit"
            />
          )
          : <span className="retro-lens-card__icon">👤</span>
        }
        <div>
          <div className="retro-lens-card__name">
            {lens.lensName}
          </div>
          <div className="retro-lens-card__count">{lens.count} 件</div>
        </div>
      </div>
      {/* Severity dots */}
      <div className="retro-lens-card__sev-row">
        {lens.sev.map((s, i) => (
          <span
            key={i}
            className="retro-sev-dot"
            style={{ background: SEV_COLOR[s] }}
          />
        ))}
      </div>
    </div>
  );
}

interface TranscriptEntryProps {
  entry: RetroTranscriptEntry;
  index: number;
}

function TranscriptEntryRow({ entry, index }: TranscriptEntryProps): JSX.Element {
  const kindColor = KIND_COLOR[entry.kind] ?? 'var(--p-stone)';
  return (
    <div
      data-testid="transcript-entry"
      className="retro-entry"
    >
      <span className="retro-entry__ts">
        {fmtSec(entry.ts)}
      </span>
      <div className="retro-entry__body">
        <div className="retro-entry__who-row">
          <b>{entry.who}</b>
          <span
            data-testid={index === 0 || undefined}
            className="retro-entry__kind-badge"
            style={{ background: kindColor }}
          >
            {/* WHY: each kind appears once in transcript; testid is per-kind to satisfy the "kind icon" test */}
            <span data-testid={`transcript-kind-${entry.kind}`}>{entry.kind}</span>
          </span>
          {entry.refId && (
            <span className="retro-entry__ref-id">
              {entry.refId}
            </span>
          )}
        </div>
        <div className="retro-entry__text">{entry.text}</div>
      </div>
    </div>
  );
}

interface FindingRowProps {
  finding: RetroFinding;
}

function FindingRow({ finding: f }: FindingRowProps): JSX.Element {
  return (
    <div
      data-testid="finding-item"
      id={`finding-${f.id}`}
      // WHY: per-finding testid for direct access in tests
      {...{ 'data-finding-id': f.id }}
      className="retro-finding-item"
    >
      <div className="retro-finding-item__header">
        <span
          className="retro-finding-item__sev-bar"
          style={{ background: SEV_COLOR[f.sev] }}
        />
        <span className="retro-finding-item__id">{f.id}</span>
        <span className="retro-finding-item__title">{f.title}</span>
      </div>
      <div className="retro-finding-item__meta">
        {f.lens} · {f.target} · {f.status}
      </div>
      {/* Severity + category badges */}
      <div className="retro-finding-item__badges">
        <span
          data-testid="finding-sev"
          className="chip"
          style={{ background: SEV_COLOR[f.sev], color: 'white' }}
        >
          {f.sev}
        </span>
        <span data-testid="finding-category" className="chip">{f.category}</span>
        <span className={statusDotClass(f.status)} />
      </div>
      {/* Action buttons — noop in Phase 3 (Phase 5 write hookup) */}
      <div className="retro-finding-item__actions">
        <button type="button" className="btn-px success retro-action-btn" onClick={() => undefined}>
          {FINDING_ACTION.ACCEPT}
        </button>
        <button type="button" className="btn-px ghost retro-action-btn" onClick={() => undefined}>
          {FINDING_ACTION.REJECT}
        </button>
        <button type="button" className="btn-px ghost retro-action-btn" onClick={() => undefined}>
          {FINDING_ACTION.DEFER}
        </button>
        <button type="button" className="btn-px primary retro-action-btn" onClick={() => undefined}>
          {FINDING_ACTION.DISCUSS}
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------------

export function RetroView(): JSX.Element {
  const { retroSession: r } = useScenario();
  // WHY: cursor tracks which transcript entries are "visible" in the player.
  // Default = all entries visible (cursor at end).
  const [cursor, setCursor] = useState(r.transcript.length - 1);
  const visible = r.transcript.slice(0, cursor + 1);
  const dur = r.durationSec;

  return (
    <div
      data-testid="retro-view"
      className="retro-screen"
    >
      {/* LEFT — lens cards + transcript player + scrubber */}
      <div className="retro-left">

        {/* Session header */}
        <div className="retro-session-header">
          <div
            data-testid="retro-session-title"
            className="retro-session-header__title"
          >
            {r.title}
          </div>
          <span
            data-testid="retro-verdict-badge"
            className="chip"
            style={{ color: r.verdict === 'PASS' ? 'var(--p-success)' : 'var(--p-error)', fontWeight: 700 }}
          >
            verdict: {r.verdict}
          </span>
          <span className="chip">{Math.floor(dur / 60)} min</span>
          <div className="retro-session-header__spacer" />
          <button type="button" className="btn-px ghost" onClick={() => undefined}>archive →</button>
          <button type="button" className="btn-px primary" onClick={() => undefined}>+ 新 retro</button>
        </div>

        {/* Lens summary cards — 4 cards in a grid */}
        <div className="retro-lenses">
          {r.lenses.map((lens) => (
            <LensCardComponent key={lens.id} lens={lens} />
          ))}
        </div>

        {/* Transcript scroll */}
        <div className="retro-transcript">
          <div className="retro-transcript__label">
            SESSION TRANSCRIPT (session.jsonl)
          </div>
          {visible.map((entry, i) => (
            <TranscriptEntryRow key={i} entry={entry} index={i} />
          ))}
        </div>

        {/* Timeline scrubber */}
        <div className="retro-scrubber">
          <button
            type="button"
            className="btn-px ghost"
            onClick={() => setCursor((c) => Math.max(0, c - 1))}
          >
            ◂
          </button>
          <input
            type="range"
            min="0"
            max={r.transcript.length - 1}
            value={cursor}
            onChange={(e) => setCursor(+e.target.value)}
            className="retro-scrubber__range"
          />
          <button
            type="button"
            className="btn-px ghost"
            onClick={() => setCursor((c) => Math.min(r.transcript.length - 1, c + 1))}
          >
            ▸
          </button>
          <span className="retro-scrubber__counter">
            {cursor + 1}/{r.transcript.length}
          </span>
        </div>
      </div>

      {/* RIGHT — findings + action plan */}
      <div className="retro-right">

        {/* Findings list */}
        <div className="retro-findings">
          <div className="retro-findings__label">
            FINDINGS — retro 産出物
          </div>
          {r.findings.map((f) => (
            // WHY: data-testid="finding-{id}" needed for per-finding access in tests
            <div key={f.id} data-testid={`finding-${f.id}`}>
              <FindingRow finding={f} />
            </div>
          ))}
        </div>

        {/* Action plan tally */}
        <div
          data-testid="action-plan"
          className="retro-action-plan"
        >
          <div className="retro-action-plan__label">
            ACTION PLAN — aggregator が確定
          </div>
          {[
            { key: 'immediate', lbl: 'IMMEDIATE', n: r.actionPlan.immediate, c: 'var(--p-error)' },
            { key: 'milestone', lbl: 'MILESTONE', n: r.actionPlan.milestone, c: 'var(--p-warn)' },
            { key: 'deferred',  lbl: 'DEFERRED',  n: r.actionPlan.deferred,  c: 'var(--p-stone)' },
          ].map((b) => (
            <div key={b.lbl} className="retro-action-plan__row">
              <span className="retro-action-plan__row-label">{b.lbl}</span>
              <div className="retro-action-plan__bar-track">
                <div
                  className="retro-action-plan__bar-fill"
                  style={{ width: `${b.n * 20}%`, background: b.c }}
                />
              </div>
              <span
                data-testid={`action-plan-${b.key}`}
                className="retro-action-plan__count"
                style={{ color: b.c }}
              >
                {b.n}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
