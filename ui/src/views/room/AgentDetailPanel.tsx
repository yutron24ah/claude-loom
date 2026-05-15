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
import '../../styles/screens/agent-detail.css';

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
      className="rpg-frame pixel ad-overlay"
    >
      {/* Backdrop — click to close */}
      <div onClick={onClose} className="ad-backdrop" />

      {/* Drawer panel */}
      <div className="ad-drawer">
        {/* ---- HEADER ---- */}
        <div className="ad-header">
          <CatSprite
            size={64}
            fur={agent.fur}
            cheek={agent.cheek}
            hat={agent.hat ?? null}
            pose="sit"
          />
          <div className="ad-header__identity">
            <div className="ad-header__name">{agent.name}</div>
            {/* jp: Japanese role name — design source + backward compat */}
            <div className="rpg-label ad-header__jp">{agent.jp}</div>
            <div className="rpg-label ad-header__role">{agent.role} · {agent.breed}</div>
            {/* quote with Japanese quotation marks */}
            <div className="ad-header__quote">「{agent.quote}」</div>
          </div>
        </div>

        {/* ---- STATUS + CLOSE row ---- */}
        <div className="ad-status-row">
          <span
            data-testid="agent-detail-status"
            className="ad-status-badge"
            style={{
              background:
                STATUS_LABEL_COLOR[state.status] ?? 'var(--p-stone, #78716c)',
            }}
          >
            {state.status}
          </span>
          <div className="ad-status-row__spacer" />
          <button
            data-testid="agent-detail-close"
            onClick={onClose}
            className="ad-close-btn"
          >
            ✕
          </button>
        </div>

        {/* ---- BODY (scrollable) ---- */}
        <div className="ad-body">

          {/* NOW — current tool + reasoning (redesign §agent-detail.jsx) */}
          <div className="ad-section-label">NOW</div>
          <div className="ad-now-panel">
            {state.currentTool && (
              <div className="ad-now-panel__tool-row">
                <span data-testid="agent-detail-current-tool" className="ad-tool-badge">
                  {state.currentTool}
                </span>
              </div>
            )}
            {state.currentReasoning && (
              <div data-testid="agent-detail-current-reasoning" className="ad-now-panel__reasoning">
                "{state.currentReasoning}"
              </div>
            )}
            {!state.currentTool && !state.currentReasoning && (
              <div className="ad-now-panel__idle">
                idle. last seen: {state.lastSeenAt ?? '—'}
              </div>
            )}
          </div>

          {/* STREAM TAIL — filtered by agent name */}
          {streamForAgent.length > 0 && (
            <>
              <div className="ad-section-label">STREAM TAIL</div>
              <div className="ad-stream-panel">
                {streamForAgent.map((s, i) => (
                  <div
                    key={i}
                    className="ad-stream-entry"
                    style={{
                      borderBottom:
                        i < streamForAgent.length - 1
                          ? '1px dashed var(--p-border, #2a2a35)'
                          : 'none',
                    }}
                  >
                    <span className="ad-stream-entry__ts">{s.ts}</span>
                    {s.tool && (
                      <span className="ad-stream-tool-badge">{s.tool}</span>
                    )}
                    <span style={{ fontStyle: s.kind === 'reason' ? 'italic' : 'normal' }}>
                      {s.text}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TOKEN USAGE */}
          <div className="ad-section-label">TOKEN — TODAY</div>
          <div data-testid="agent-detail-tokens" className="ad-token-panel">
            {tokenEntry ? (
              <div className="ad-token-row">
                <div>in <b>{fmtTokens(tokenEntry.input)}</b></div>
                <div>out <b>{fmtTokens(tokenEntry.output)}</b></div>
                <div>cache <b>{fmtTokens(tokenEntry.cacheRead)}</b></div>
              </div>
            ) : (
              <div className="ad-token-empty">—</div>
            )}
          </div>

          {/* DISPATCH HISTORY — M3.2 t2 backward compat */}
          <div data-testid="agent-dispatch-history" className="ad-dispatch-history">
            <div className="rpg-label ad-dispatch__section-label">
              DISPATCH HISTORY
            </div>
            {!dispatchHistory || dispatchHistory.length === 0 ? (
              <div className="ad-dispatch-empty">No dispatches yet</div>
            ) : (
              dispatchHistory.map((entry) => (
                <div key={entry.subagentId} className="ad-dispatch-entry">
                  <span className="ad-dispatch-entry__time">
                    {formatTime(entry.startedAt)}
                  </span>
                  <span className="ad-dispatch-entry__type">{entry.agentType}</span>
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
          <div className="ad-actions">
            <button className="btn-px ghost ad-actions__btn">メモ</button>
            <button
              data-testid="agent-attention-toggle"
              aria-pressed={localAttention}
              data-attention={String(localAttention)}
              onClick={handleAttentionToggle}
              className={`${localAttention ? 'btn-px primary' : 'btn-px ghost'} ad-actions__btn`}
            >
              ★ 注目
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
