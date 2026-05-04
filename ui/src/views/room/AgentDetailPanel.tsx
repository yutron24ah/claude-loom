/**
 * AgentDetailPanel — popup panel beside a cat showing status, history, and tokens.
 * WHY: ported from ui/prototype/screens-a.jsx AgentDetailPanel.
 * onClose default: calls useViewStore.setSelectedAgentId(null) per Task 9 spec.
 */
/**
 * WHY: CatSprite DOM component removed in M3.0 (Phaser sprites replace it).
 * AgentDetailPanel now uses a simple color circle for the agent avatar preview.
 * Pixel art avatar is deferred to M5 (frontend-design).
 */
import React, { useState } from 'react';
import { useViewStore } from '../../store/view';
import type { RosterEntry } from './roster';
import { AgentDetailNotes } from './AgentDetailNotes';

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
      className="bg-bg2 rounded-card shadow-token"
      style={{
        width: 320, padding: 16,
        border: '3px solid var(--p-border, #2a2a35)',
        fontFamily: 'ui-monospace, monospace',
        background: 'var(--p-paper, #f8f4ec)',
      }}
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

      {/* Sprite + name + role */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Agent avatar circle — placeholder. M5 replaces with pixel art cat sprite. */}
        <div style={{
          background: 'var(--p-tint, #e8e0d0)',
          border: '2px solid var(--p-border, #2a2a35)', padding: 4,
          width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: agent.fur ?? 'var(--p-accent, #6366f1)',
            border: '2px solid var(--p-border, #2a2a35)',
          }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--p-text, #1a1a2e)' }}>
            {agent.name}
          </div>
          <div style={{
            fontSize: 9, letterSpacing: '0.06em', color: 'var(--p-text-muted, #64748b)',
            marginTop: 2, textTransform: 'uppercase',
          }}>
            {agent.role} · {agent.breed}
          </div>
          <div style={{
            fontSize: 10, fontStyle: 'italic',
            color: 'var(--p-text-muted, #64748b)', marginTop: 6,
          }}>
            「{agent.quote}」
          </div>
        </div>
      </div>

      {/* Status chips */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        <span style={{ padding: '2px 6px', background: 'var(--p-tint, #e8e0d0)', border: '1px solid var(--p-border, #2a2a35)', fontSize: 9 }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--p-success, #4ade80)', marginRight: 3 }} />
          {agent.status ?? AGENT_STATUS.BUSY}
        </span>
        <span style={{ padding: '2px 6px', background: 'var(--p-tint, #e8e0d0)', border: '1px solid var(--p-border, #2a2a35)', fontSize: 9 }}>model: sonnet</span>
        <span style={{ padding: '2px 6px', background: 'var(--p-tint, #e8e0d0)', border: '1px solid var(--p-border, #2a2a35)', fontSize: 9 }}>friendly-mentor</span>
        {isAttention && (
          <span style={{ padding: '2px 6px', background: 'var(--p-tint, #e8e0d0)', border: '1px solid var(--p-border, #2a2a35)', fontSize: 9 }}>★ 注目</span>
        )}
      </div>

      {/* Token usage */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.06em', color: 'var(--p-text-muted, #64748b)', textTransform: 'uppercase', marginBottom: 4 }}>
          TOKEN — TODAY
        </div>
        <div style={{ display: 'flex', gap: 8, fontSize: 10 }}>
          <div>in <b>32.1k</b></div>
          <div>out <b>9.4k</b></div>
          <div>cache <b>118k</b></div>
        </div>
        <div style={{ marginTop: 4, height: 6, background: 'var(--p-tint, #e8e0d0)', border: '1px solid var(--p-border, #2a2a35)', position: 'relative' }}>
          <div style={{ width: '42%', height: '100%', background: 'var(--p-accent, #6366f1)' }} />
        </div>
      </div>

      {/* Current task */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.06em', color: 'var(--p-text-muted, #64748b)', textTransform: 'uppercase', marginBottom: 4 }}>
          NOW
        </div>
        <div style={{
          fontSize: 11, padding: 8,
          background: 'var(--p-tint, #e8e0d0)',
          border: '1px solid var(--p-border, #2a2a35)',
          color: 'var(--p-text, #1a1a2e)',
        }}>
          {agent.currentTask ?? 'user.service.test.ts の RED → GREEN 確認中'}
        </div>
      </div>

      {/* History */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.06em', color: 'var(--p-text-muted, #64748b)', textTransform: 'uppercase', marginBottom: 4 }}>
          HISTORY
        </div>
        {history.map((h) => (
          <div
            key={h.time}
            style={{
              display: 'flex', gap: 8, fontSize: 10,
              padding: '3px 0', color: 'var(--p-text, #1a1a2e)',
            }}
          >
            <span style={{ color: 'var(--p-text-muted, #64748b)' }}>{h.time}</span>
            <span>{h.text}</span>
          </div>
        ))}
      </div>

      {/* Dispatch History section — M3.2 t2 */}
      <div data-testid="agent-dispatch-history" style={{ marginTop: 14 }}>
        <div style={{
          fontSize: 9, letterSpacing: '0.06em',
          color: 'var(--p-text-muted, #64748b)', textTransform: 'uppercase', marginBottom: 4,
        }}>
          DISPATCH HISTORY
        </div>
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
                padding: '3px 0', color: 'var(--p-text, #1a1a2e)',
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

      {/* M3.2 t3 — notes section (separate component) */}
      <AgentDetailNotes agentId={agent.id} />

      {/* Action buttons */}
      <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
        <button style={{
          flex: 1, padding: '4px 8px', fontSize: 10, cursor: 'pointer',
          background: 'transparent', border: '2px solid var(--p-border, #2a2a35)',
          color: 'var(--p-text, #1a1a2e)', fontFamily: 'ui-monospace, monospace',
        }}>
          メモ
        </button>
        <button
          data-testid="agent-attention-toggle"
          aria-pressed={isAttention}
          data-attention={String(isAttention)}
          onClick={handleAttentionToggle}
          style={{
            flex: 1, padding: '4px 8px', fontSize: 10, cursor: 'pointer',
            background: isAttention ? 'var(--p-accent, #6366f1)' : 'transparent',
            border: '2px solid var(--p-border, #2a2a35)',
            color: isAttention ? 'white' : 'var(--p-text, #1a1a2e)',
            fontFamily: 'ui-monospace, monospace',
            fontWeight: isAttention ? 700 : 400,
          }}
        >
          ★ 注目
        </button>
      </div>
    </div>
  );
}
