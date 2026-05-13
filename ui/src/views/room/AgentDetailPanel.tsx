/**
 * AgentDetailPanel — redesign-driven drawer overlay for agent detail.
 *
 * WHY this rewrite (M0.15 t7):
 * The previous version (M0.11.4 t10) used hardcoded fixture data:
 *   - DEFAULT_HISTORY (static array of fake commits)
 *   - hardcoded token values ("32.1k", "9.4k", "118k")
 *   - hardcoded currentTask fallback ("user.service.test.ts の RED → GREEN 確認中")
 *
 * This rewrite sources all live data from useScenario() per the redesign bundle
 * contract (redesign/screens/agent-detail.jsx is the visual SSoT).
 *
 * Visual layout: redesign/screens/agent-detail.jsx (drawer, fixed right panel)
 * Data shape:    redesign/api/types.ts (AgentState, StreamMsg, TokensByAgent)
 * Data source:   redesign/api/websocket.ts (useScenario hook)
 *
 * Backward-compat props preserved (for existing tests and callers):
 *   - onAttentionToggle, dispatchHistory, attention (M3.2 t2 features)
 * Backward-compat rendering preserved:
 *   - rpg-frame class, jp field, CatSprite size>=64, agent-dispatch-history,
 *     agent-attention-toggle data-testids
 */
import React, { useState } from 'react';
import type { RosterEntry } from '../../data/roster';
import { CatSprite } from '../../components/CatSprite';
import { AgentDetailNotes } from './AgentDetailNotes';
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { StreamMsg, TokensByAgent } from '@claude-loom/redesign/api/types';

// ---------------------------------------------------------------------------
// Status color mapping (no inline string literals — SPEC §3.6.10)
// ---------------------------------------------------------------------------
const STATUS_LABEL_COLOR: Record<string, string> = {
  busy: 'var(--p-warn, #f59e0b)',
  review: 'var(--p-accent, #6366f1)',
  idle: 'var(--p-stone, #78716c)',
  failed: 'var(--p-error, #ef4444)',
  completed: 'var(--p-success, #4ade80)',
};

// ---------------------------------------------------------------------------
// Backward-compat types (M3.2 t2 — dispatch history + attention toggle)
// WHY: kept as exported types to avoid breaking callers that import them
// ---------------------------------------------------------------------------
export interface DispatchHistoryEntry {
  subagentId: string;
  agentType: string;
  status: string;
  startedAt: Date;
  endedAt?: Date | null;
  resultSummary?: string | null;
}

/** Extended props preserving all M3.2 backward-compat features. */
export interface AgentDetailPanelProps {
  agent: RosterEntry & { attention?: boolean };
  onClose?: () => void;
  /** Called when the attention toggle is clicked. Receives the new flag value. */
  onAttentionToggle?: (flag: boolean) => void;
  /** Dispatch history entries for this agent's parent session. */
  dispatchHistory?: DispatchHistoryEntry[];
}

// ---------------------------------------------------------------------------
// Helper: format token count as human-readable short string
// WHY: avoid external deps, consistent display (YAGNI)
// ---------------------------------------------------------------------------
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

/**
 * Format a Date to HH:MM display string.
 * WHY: consistent display without external deps (YAGNI).
 */
function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// AgentDetailPanel component
// ---------------------------------------------------------------------------
export function AgentDetailPanel({
  agent,
  onClose,
  onAttentionToggle,
  dispatchHistory,
}: AgentDetailPanelProps): JSX.Element {
  const scenario = useScenario();

  // Local optimistic state for attention toggle (M3.2 t2 backward compat)
  // WHY: instant feedback without waiting for mutation round-trip.
  const [localAttention, setLocalAttention] = useState<boolean>(
    agent.attention ?? false,
  );

  function handleAttentionToggle(): void {
    const newFlag = !localAttention;
    setLocalAttention(newFlag);
    onAttentionToggle?.(newFlag);
  }

  // Resolve agent runtime state from scenario (undefined = not yet seen)
  const state = scenario.agents[agent.id] ?? { status: 'idle' as const };

  // Filter stream by agent name (design source: s.who === a?.name)
  // WHY: stream.who stores the display name (e.g. "サバ"), not the id ("dev")
  const streamForAgent: StreamMsg[] = (scenario.stream ?? []).filter(
    (s) => s.who === agent.name,
  );

  // Resolve token usage for this agent
  const tokenEntry: TokensByAgent | undefined = (
    scenario.tokens?.byAgent ?? []
  ).find((t) => t.agentId === agent.id);

  return (
    <div
      data-testid="agent-detail-panel"
      className="rpg-frame pixel"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        pointerEvents: 'auto',
      }}
    >
      {/* Backdrop — click to close */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 420,
          background: 'var(--p-paper, #faf7f0)',
          borderLeft: '3px solid var(--p-border, #2a2a35)',
          boxShadow: '-4px 0 0 0 var(--p-shadow, rgba(0,0,0,0.2))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ---- HEADER ---- */}
        <div
          style={{
            padding: '10px 14px',
            borderBottom: '2px solid var(--p-border, #2a2a35)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--p-tint, #e8e0d0)',
            flexShrink: 0,
          }}
        >
          <CatSprite
            size={64}
            fur={agent.fur}
            cheek={agent.cheek}
            hat={agent.hat ?? null}
            pose="sit"
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--p-text, #1a1a2e)',
              }}
            >
              {agent.name}
            </div>
            {/* jp: Japanese role name — design source + backward compat */}
            <div
              className="rpg-label"
              style={{ marginTop: 2, fontSize: 10 }}
            >
              {agent.jp}
            </div>
            <div
              className="rpg-label"
              style={{ marginTop: 2, fontSize: 10 }}
            >
              {agent.role} · {agent.breed}
            </div>
            {/* quote with Japanese quotation marks */}
            <div
              style={{
                fontSize: 10,
                fontStyle: 'italic',
                color: 'var(--p-text-muted, #64748b)',
                marginTop: 4,
              }}
            >
              「{agent.quote}」
            </div>
          </div>
        </div>

        {/* ---- STATUS + CLOSE row ---- */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            background: 'var(--p-tint, #e8e0d0)',
            borderBottom: '1px solid var(--p-border, #2a2a35)',
            flexShrink: 0,
          }}
        >
          <span
            data-testid="agent-detail-status"
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 6px',
              border: '1.5px solid var(--p-border, #2a2a35)',
              background:
                STATUS_LABEL_COLOR[state.status] ??
                'var(--p-stone, #78716c)',
              color: 'white',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {state.status}
          </span>
          <div style={{ flex: 1 }} />
          <button
            data-testid="agent-detail-close"
            onClick={onClose}
            style={{
              all: 'unset',
              cursor: 'pointer',
              fontSize: 12,
              padding: '2px 8px',
              border: '1px solid var(--p-border, #2a2a35)',
              background: 'var(--p-tint, #e8e0d0)',
              color: 'var(--p-text, #1a1a2e)',
            }}
          >
            ✕
          </button>
        </div>

        {/* ---- BODY (scrollable) ---- */}
        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>

          {/* NOW — current tool + reasoning (redesign §agent-detail.jsx) */}
          <div
            style={{
              fontSize: 9,
              color: 'var(--p-text-muted, #64748b)',
              letterSpacing: '0.06em',
              marginBottom: 6,
            }}
          >
            NOW
          </div>
          <div
            style={{
              padding: 10,
              background: 'var(--p-bg-sky, #f0f4f8)',
              border: '1.5px solid var(--p-border, #2a2a35)',
              marginBottom: 14,
              fontSize: 11,
            }}
          >
            {state.currentTool && (
              <div style={{ marginBottom: 4 }}>
                <span
                  data-testid="agent-detail-current-tool"
                  style={{
                    background: 'var(--p-warn, #f59e0b)',
                    color: 'white',
                    padding: '1px 5px',
                    fontSize: 8,
                    fontWeight: 700,
                    marginRight: 4,
                  }}
                >
                  {state.currentTool}
                </span>
              </div>
            )}
            {state.currentReasoning && (
              <div
                data-testid="agent-detail-current-reasoning"
                style={{
                  fontStyle: 'italic',
                  color: 'var(--p-text, #1a1a2e)',
                  lineHeight: 1.5,
                }}
              >
                "{state.currentReasoning}"
              </div>
            )}
            {!state.currentTool && !state.currentReasoning && (
              <div style={{ color: 'var(--p-text-muted, #64748b)' }}>
                idle. last seen: {state.lastSeenAt ?? '—'}
              </div>
            )}
          </div>

          {/* STREAM TAIL — filtered by agent name */}
          {streamForAgent.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 9,
                  color: 'var(--p-text-muted, #64748b)',
                  letterSpacing: '0.06em',
                  marginBottom: 6,
                }}
              >
                STREAM TAIL
              </div>
              <div
                style={{
                  marginBottom: 14,
                  background: 'var(--p-bg-sky, #f0f4f8)',
                  border: '1.5px solid var(--p-border, #2a2a35)',
                  padding: 8,
                }}
              >
                {streamForAgent.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 10,
                      padding: '3px 0',
                      borderBottom:
                        i < streamForAgent.length - 1
                          ? '1px dashed var(--p-border, #2a2a35)'
                          : 'none',
                    }}
                  >
                    <span
                      style={{
                        color: 'var(--p-text-muted, #64748b)',
                        fontSize: 8,
                        marginRight: 4,
                        fontFamily: 'ui-monospace, monospace',
                      }}
                    >
                      {s.ts}
                    </span>
                    {s.tool && (
                      <span
                        style={{
                          background: 'var(--p-warn, #f59e0b)',
                          color: 'white',
                          padding: '0 4px',
                          fontSize: 8,
                          fontWeight: 700,
                          marginRight: 4,
                        }}
                      >
                        {s.tool}
                      </span>
                    )}
                    <span
                      style={{
                        fontStyle: s.kind === 'reason' ? 'italic' : 'normal',
                      }}
                    >
                      {s.text}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TOKEN USAGE */}
          <div
            style={{
              fontSize: 9,
              color: 'var(--p-text-muted, #64748b)',
              letterSpacing: '0.06em',
              marginBottom: 6,
            }}
          >
            TOKEN — TODAY
          </div>
          <div
            data-testid="agent-detail-tokens"
            style={{
              marginBottom: 14,
              padding: 8,
              background: 'var(--p-bg-sky, #f0f4f8)',
              border: '1.5px solid var(--p-border, #2a2a35)',
              fontSize: 10,
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            {tokenEntry ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <div>
                  in <b>{fmtTokens(tokenEntry.input)}</b>
                </div>
                <div>
                  out <b>{fmtTokens(tokenEntry.output)}</b>
                </div>
                <div>
                  cache <b>{fmtTokens(tokenEntry.cacheRead)}</b>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--p-text-muted, #64748b)' }}>—</div>
            )}
          </div>

          {/* DISPATCH HISTORY — M3.2 t2 backward compat */}
          <div data-testid="agent-dispatch-history" style={{ marginTop: 14 }}>
            <div
              className="rpg-label"
              style={{ marginBottom: 4, fontSize: 9 }}
            >
              DISPATCH HISTORY
            </div>
            {!dispatchHistory || dispatchHistory.length === 0 ? (
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--p-text-muted, #64748b)',
                  fontStyle: 'italic',
                }}
              >
                No dispatches yet
              </div>
            ) : (
              dispatchHistory.map((entry) => (
                <div
                  key={entry.subagentId}
                  style={{
                    display: 'flex',
                    gap: 8,
                    fontSize: 10,
                    padding: '3px 0',
                    fontFamily: 'ui-monospace, monospace',
                    borderBottom: '1px solid var(--p-tint, #e8e0d0)',
                  }}
                >
                  <span
                    style={{
                      color: 'var(--p-text-muted, #64748b)',
                      minWidth: 40,
                    }}
                  >
                    {formatTime(entry.startedAt)}
                  </span>
                  <span style={{ flex: 1 }}>{entry.agentType}</span>
                  <span
                    style={{
                      fontSize: 9,
                      color:
                        entry.status === 'done'
                          ? 'var(--p-success, #4ade80)'
                          : entry.status === 'failed'
                            ? 'var(--p-error, #f87171)'
                            : 'var(--p-text-muted, #64748b)',
                    }}
                  >
                    {entry.status}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Notes section (existing sub-component, props interface unchanged) */}
          <AgentDetailNotes agentId={agent.id} />

          {/* ACTIONS — attention toggle (M3.2 t2 backward compat) */}
          <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
            <button
              className="btn-px ghost"
              style={{ flex: 1 }}
            >
              メモ
            </button>
            <button
              data-testid="agent-attention-toggle"
              aria-pressed={localAttention}
              data-attention={String(localAttention)}
              onClick={handleAttentionToggle}
              className={localAttention ? 'btn-px primary' : 'btn-px ghost'}
              style={{ flex: 1 }}
            >
              ★ 注目
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
