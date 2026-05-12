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
import type {
  RetroLensCard,
  RetroFinding,
  RetroTranscriptEntry,
  RetroLensSeverity,
  RetroFindingCategory,
} from '@claude-loom/redesign/api/types';

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
  return (
    <div
      data-testid={`lens-card-${lens.id}`}
      data-is-user={lens.isUser ? 'true' : undefined}
      style={{
        padding: 8,
        border: '2px solid var(--p-border)',
        background: lens.isUser ? 'var(--p-accent-soft)' : 'var(--p-paper)',
      }}
    >
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {/* isUser renders person icon */}
        {lens.isUser
          ? <span style={{ fontSize: 18 }}>👤</span>
          : <span style={{ fontSize: 18 }}>🔎</span>
        }
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {lens.lensName}
          </div>
          <div style={{ fontSize: 8, color: 'var(--p-text-muted)' }}>{lens.count} 件</div>
        </div>
      </div>
      {/* Severity dots */}
      <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
        {lens.sev.map((s, i) => (
          <span
            key={i}
            style={{ width: 12, height: 12, background: SEV_COLOR[s], border: '1px solid var(--p-border)', display: 'inline-block' }}
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
      style={{
        display: 'flex',
        gap: 8,
        padding: '6px 0',
        borderBottom: '1px dashed var(--p-border)',
        alignItems: 'flex-start',
      }}
    >
      <span style={{ fontSize: 9, color: 'var(--p-text-muted)', fontFamily: 'ui-monospace, monospace', width: 36, flexShrink: 0 }}>
        {fmtSec(entry.ts)}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9 }}>
          <b>{entry.who}</b>
          <span
            data-testid={index === 0 || undefined}
            style={{ marginLeft: 6, padding: '0 4px', background: kindColor, color: 'white', fontSize: 8, fontWeight: 700, letterSpacing: '0.04em' }}
          >
            {/* WHY: each kind appears once in transcript; testid is per-kind to satisfy the "kind icon" test */}
            <span data-testid={`transcript-kind-${entry.kind}`}>{entry.kind}</span>
          </span>
          {entry.refId && (
            <span style={{ marginLeft: 6, fontFamily: 'ui-monospace, monospace', color: 'var(--p-text-muted)' }}>
              {entry.refId}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, marginTop: 2, lineHeight: 1.5 }}>{entry.text}</div>
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
      style={{ padding: 8, marginBottom: 6, border: '1.5px solid var(--p-border)', background: 'var(--p-tint)' }}
    >
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
        <span style={{ width: 8, height: 22, background: SEV_COLOR[f.sev], display: 'inline-block', flexShrink: 0 }} />
        <span style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', color: 'var(--p-text-muted)' }}>{f.id}</span>
        <span style={{ fontSize: 11, fontWeight: 700, flex: 1 }}>{f.title}</span>
      </div>
      <div style={{ fontSize: 9, color: 'var(--p-text-muted)', marginBottom: 6, fontFamily: 'ui-monospace, monospace' }}>
        {f.lens} · {f.target} · {f.status}
      </div>
      {/* Severity + category badges */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 6, alignItems: 'center' }}>
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
      <div style={{ display: 'flex', gap: 4 }}>
        <button type="button" className="btn-px success" style={{ fontSize: 8, padding: '2px 6px' }} onClick={() => undefined}>
          {FINDING_ACTION.ACCEPT}
        </button>
        <button type="button" className="btn-px ghost" style={{ fontSize: 8, padding: '2px 6px' }} onClick={() => undefined}>
          {FINDING_ACTION.REJECT}
        </button>
        <button type="button" className="btn-px ghost" style={{ fontSize: 8, padding: '2px 6px' }} onClick={() => undefined}>
          {FINDING_ACTION.DEFER}
        </button>
        <button type="button" className="btn-px primary" style={{ fontSize: 8, padding: '2px 6px' }} onClick={() => undefined}>
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
      style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--p-bg-sky)',
        display: 'grid',
        gridTemplateColumns: '1fr 360px',
        gap: 12,
        padding: 16,
        overflow: 'hidden',
      }}
    >
      {/* LEFT — lens cards + transcript player + scrubber */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* Session header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div
            data-testid="retro-session-title"
            style={{ fontSize: 14, fontWeight: 700 }}
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
          <div style={{ flex: 1 }} />
          <button type="button" className="btn-px ghost" onClick={() => undefined}>archive →</button>
          <button type="button" className="btn-px primary" onClick={() => undefined}>+ 新 retro</button>
        </div>

        {/* Lens summary cards — 4 cards in a grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 10 }}>
          {r.lenses.map((lens) => (
            <LensCardComponent key={lens.id} lens={lens} />
          ))}
        </div>

        {/* Transcript scroll */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            border: '2px solid var(--p-border)',
            background: 'var(--p-paper)',
            padding: 10,
          }}
        >
          <div style={{ fontSize: 9, color: 'var(--p-text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>
            SESSION TRANSCRIPT (session.jsonl)
          </div>
          {visible.map((entry, i) => (
            <TranscriptEntryRow key={i} entry={entry} index={i} />
          ))}
        </div>

        {/* Timeline scrubber */}
        <div
          style={{
            marginTop: 8,
            padding: '6px 10px',
            border: '2px solid var(--p-border)',
            background: 'var(--p-paper)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
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
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn-px ghost"
            onClick={() => setCursor((c) => Math.min(r.transcript.length - 1, c + 1))}
          >
            ▸
          </button>
          <span style={{ fontSize: 9, color: 'var(--p-text-muted)', fontFamily: 'ui-monospace, monospace' }}>
            {cursor + 1}/{r.transcript.length}
          </span>
        </div>
      </div>

      {/* RIGHT — findings + action plan */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, gap: 10 }}>

        {/* Findings list */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            border: '2px solid var(--p-border)',
            background: 'var(--p-paper)',
            padding: 10,
          }}
        >
          <div style={{ fontSize: 9, color: 'var(--p-text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>
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
          style={{ border: '2px solid var(--p-border)', background: 'var(--p-paper)', padding: 10 }}
        >
          <div style={{ fontSize: 9, color: 'var(--p-text-muted)', letterSpacing: '0.06em', marginBottom: 6 }}>
            ACTION PLAN — aggregator が確定
          </div>
          {[
            { key: 'immediate', lbl: 'IMMEDIATE', n: r.actionPlan.immediate, c: 'var(--p-error)' },
            { key: 'milestone', lbl: 'MILESTONE', n: r.actionPlan.milestone, c: 'var(--p-warn)' },
            { key: 'deferred',  lbl: 'DEFERRED',  n: r.actionPlan.deferred,  c: 'var(--p-stone)' },
          ].map((b) => (
            <div key={b.lbl} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', width: 80 }}>{b.lbl}</span>
              <div style={{ flex: 1, height: 8, background: 'var(--p-tint)', border: '1px solid var(--p-border)' }}>
                <div style={{ width: `${b.n * 20}%`, height: '100%', background: b.c }} />
              </div>
              <span
                data-testid={`action-plan-${b.key}`}
                style={{ fontSize: 11, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: b.c, width: 24, textAlign: 'right' }}
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
