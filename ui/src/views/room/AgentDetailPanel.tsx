/**
 * AgentDetailPanel — RPG-style popup panel beside a cat showing status, history, and tokens.
 * WHY: M0.11.4 t10 full rewrite — ported from screens-a.jsx AgentDetailPanel (design source).
 * M3.2 t2 features (attention toggle + dispatch history) are kept alongside new RPG visual.
 * onClose default: calls useViewStore.setSelectedAgentId(null) per Task 9 spec.
 */
import React, { useState } from 'react';
import { useViewStore } from '../../store/view';
import type { RosterEntry } from './roster';
import { AgentDetailNotes } from './AgentDetailNotes';
import { CatSprite } from '../../components/CatSprite';

// ---------------------------------------------------------------------------
// Agent status constant values (SPEC §3.6.10 — no inline string literals)
// ---------------------------------------------------------------------------
export const AGENT_STATUS = {
  BUSY: 'busy',
  IDLE: 'idle',
  REVIEW: 'review',
  FAIL: 'fail',
  TDD: 'tdd',
} as const;

export type AgentStatus = typeof AGENT_STATUS[keyof typeof AGENT_STATUS];

export interface DispatchHistoryEntry {
  subagentId: string;
  agentType: string;
  status: string;
  startedAt: Date;
  endedAt?: Date | null;
  resultSummary?: string | null;
}

export interface AgentDetail extends RosterEntry {
  // UI-only fields extending the roster entry
  status?: AgentStatus;
  currentTask?: string;
  history?: Array<{ time: string; text: string }>;
  starred?: boolean;
  /** Attention flag — true when this agent is marked for follow-up. */
  attention?: boolean;
}

export interface AgentDetailPanelProps {
  agent: AgentDetail;
  onClose?: () => void;
  /** Called when the attention toggle is clicked. Receives the new flag value. */
  onAttentionToggle?: (flag: boolean) => void;
  /** Dispatch history entries for this agent's parent session. */
  dispatchHistory?: DispatchHistoryEntry[];
}

/**
 * Format a Date to HH:MM display string.
 * WHY: consistent display without external deps (YAGNI).
 */
function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const DEFAULT_HISTORY = [
  { time: '14:21', text: 'fix(auth): catch 漏れ 1件' },
  { time: '13:48', text: 'test: refresh_token rotation' },
  { time: '13:02', text: 'spec 整合: §3.6.5 反映' },
];

export function AgentDetailPanel({
  agent,
  onClose,
  onAttentionToggle,
  dispatchHistory,
}: AgentDetailPanelProps): JSX.Element {
  // WHY: default onClose deselects the agent in the global view store (Task 9 spec §Done 4)
  const handleClose = onClose ?? (() => {
    useViewStore.getState().setSelectedAgentId(null);
  });

  // Local optimistic state for attention toggle.
  // WHY: instant feedback without waiting for mutation round-trip.
  const [localAttention, setLocalAttention] = useState<boolean>(agent.attention ?? false);

  const history = agent.history ?? DEFAULT_HISTORY;
  const isAttention = localAttention;

  function handleAttentionToggle(): void {
    const newFlag = !localAttention;
    setLocalAttention(newFlag);
    onAttentionToggle?.(newFlag);
  }

  return (
    <div
      data-testid="agent-detail-panel"
      className="rpg-frame pixel"
      style={{ width: 320, padding: 16 }}
    >
      {/* Header row with close button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button
          data-testid="agent-detail-close"
          onClick={handleClose}
          style={{
            all: 'unset', cursor: 'pointer',
            width: 24, height: 24, fontSize: 14, fontWeight: 700,
            textAlign: 'center', lineHeight: '24px',
            background: 'var(--p-tint, #e8e0d0)',
            border: '2px solid var(--p-border, #2a2a35)',
            color: 'var(--p-text, #1a1a2e)',
          }}
        >
          ×
        </button>
      </div>

      {/* Hero: CatSprite + cat metadata — design source screens-a.jsx L43-54 */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          background: 'var(--p-tint, #e8e0d0)',
          border: '2px solid var(--p-border, #2a2a35)',
          padding: 4,
        }}>
          <CatSprite
            size={72}
            fur={agent.fur}
            cheek={agent.cheek}
            hat={agent.hat ?? null}
            pose="sit"
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--p-text, #1a1a2e)' }}>
            {agent.name}
          </div>
          {/* jp: Japanese role name — design source renders agent.jp */}
          <div className="rpg-label" style={{ marginTop: 2 }}>
            {agent.jp}
          </div>
          <div className="rpg-label" style={{ marginTop: 2 }}>
            {agent.role} · {agent.breed}
          </div>
          {/* quote with Japanese quotation marks — design source L50-52 */}
          <div style={{
            fontSize: 10, fontStyle: 'italic',
            color: 'var(--p-text-muted, #64748b)', marginTop: 6,
          }}>
            「{agent.quote}」
          </div>
        </div>
      </div>

      {/* Status chips — design source L56-61 */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        <span className="chip">
          <span className={`dot ${agent.status ?? AGENT_STATUS.BUSY}`} />
          {' '}{agent.status ?? AGENT_STATUS.BUSY}
        </span>
        <span className="chip">model: sonnet</span>
        <span className="chip">friendly-mentor</span>
        {isAttention && (
          <span className="chip">★ 注目</span>
        )}
      </div>

      {/* Token usage — design source L63-71 */}
      <div style={{ marginTop: 14 }}>
        <div className="rpg-label" style={{ marginBottom: 4 }}>TOKEN — TODAY</div>
        <div style={{ display: 'flex', gap: 8, fontSize: 10, fontFamily: 'ui-monospace, monospace' }}>
          <div>in <b>32.1k</b></div>
          <div>out <b>9.4k</b></div>
          <div>cache <b>118k</b></div>
        </div>
        <div className="exp-bar" style={{ marginTop: 4 }}>
          <i style={{ width: '42%' }} />
        </div>
      </div>

      {/* Current task — design source L73-78 */}
      <div style={{ marginTop: 14 }}>
        <div className="rpg-label" style={{ marginBottom: 4 }}>NOW</div>
        <div style={{
          fontSize: 11, padding: 8,
          background: 'var(--p-tint, #e8e0d0)',
          border: '1px solid var(--p-border, #2a2a35)',
          color: 'var(--p-text, #1a1a2e)',
        }}>
          {agent.currentTask ?? 'user.service.test.ts の RED → GREEN 確認中'}
        </div>
      </div>

      {/* HISTORY — design source L80-92 */}
      <div style={{ marginTop: 14 }}>
        <div className="rpg-label" style={{ marginBottom: 4 }}>HISTORY</div>
        {history.map((h) => (
          <div
            key={h.time}
            style={{
              display: 'flex', gap: 8, fontSize: 10,
              padding: '3px 0', fontFamily: 'ui-monospace, monospace',
            }}
          >
            <span style={{ color: 'var(--p-text-muted, #64748b)' }}>{h.time}</span>
            <span>{h.text}</span>
          </div>
        ))}
      </div>

      {/* Dispatch History section — M3.2 t2 keep */}
      <div data-testid="agent-dispatch-history" style={{ marginTop: 14 }}>
        <div className="rpg-label" style={{ marginBottom: 4 }}>DISPATCH HISTORY</div>
        {(!dispatchHistory || dispatchHistory.length === 0) ? (
          <div style={{ fontSize: 10, color: 'var(--p-text-muted, #64748b)', fontStyle: 'italic' }}>
            No dispatches yet
          </div>
        ) : (
          dispatchHistory.map((entry) => (
            <div
              key={entry.subagentId}
              style={{
                display: 'flex', gap: 8, fontSize: 10,
                padding: '3px 0', fontFamily: 'ui-monospace, monospace',
                borderBottom: '1px solid var(--p-tint, #e8e0d0)',
              }}
            >
              <span style={{ color: 'var(--p-text-muted, #64748b)', minWidth: 40 }}>
                {formatTime(entry.startedAt)}
              </span>
              <span style={{ flex: 1 }}>{entry.agentType}</span>
              <span style={{
                fontSize: 9,
                color: entry.status === 'done'
                  ? 'var(--p-success, #4ade80)'
                  : entry.status === 'failed'
                  ? 'var(--p-error, #f87171)'
                  : 'var(--p-text-muted, #64748b)',
              }}>
                {entry.status}
              </span>
            </div>
          ))
        )}
      </div>

      {/* M3.2 t3 — notes section (separate component, touch禁止) */}
      <AgentDetailNotes agentId={agent.id} />

      {/* Action buttons — design source L94-97, attention toggle M3.2 t2 keep */}
      <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
        <button className="btn-px ghost" style={{ flex: 1 }}>メモ</button>
        <button
          data-testid="agent-attention-toggle"
          aria-pressed={isAttention}
          data-attention={String(isAttention)}
          onClick={handleAttentionToggle}
          className={isAttention ? 'btn-px primary' : 'btn-px ghost'}
          style={{ flex: 1 }}
        >
          ★ 注目
        </button>
      </div>
    </div>
  );
}
