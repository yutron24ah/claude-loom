/**
 * PMChatPanel — right-column Slack-style PM chat panel.
 *
 * WHY: Provides the PM session interface:
 * - CHAT tab: message log + input (user↔PM conversation)
 * - STREAM tab: agent stream rail (repurposed from room StreamRail)
 * - Risk-based approval routing: high → PMApprovalModal, med/low → PMApprovalToast
 * - PM not running → "▶ PM を起動" start button (POST /pm/start)
 *
 * Principle §1: Single responsibility — orchestrates chat panel sub-components.
 * Principle §5: Composition over inheritance — delegates approval rendering.
 * Principle §3: YAGNI — no collapse logic in M0.15 (AppShell Phase 4 concern).
 *
 * Design SSoT: redesign/screens/room.jsx PMChatPanel component (lines 289-391).
 */
import { useState, useRef, useEffect } from 'react';
import type { PMState, StreamMsg } from '@claude-loom/redesign/api/types';
import { PMApprovalModal } from './PMApprovalModal';
import { PMApprovalToast } from './PMApprovalToast';

export interface PMChatPanelProps {
  pm: PMState;
  stream: StreamMsg[];
  onSend: (text: string) => void;
  onStart: () => void;
  onPermission: (id: string, allow: boolean) => void;
}

export function PMChatPanel({
  pm,
  stream,
  onSend,
  onStart,
  onPermission,
}: PMChatPanelProps): JSX.Element {
  const [draft, setDraft] = useState('');
  const [tab, setTab] = useState<'chat' | 'stream'>('chat');
  const logRef = useRef<HTMLDivElement>(null);

  // Scroll chat log to bottom when new messages arrive
  useEffect(() => {
    if (tab === 'chat' && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [pm.messages.length, tab]);

  function handleSend(): void {
    if (!draft.trim()) return;
    onSend(draft.trim());
    setDraft('');
  }

  // risk-based approval routing
  const highRisk = pm.pendingApprovals.find((a) => a.risk === 'high');
  const nonHighRisk = pm.pendingApprovals.filter((a) => a.risk !== 'high');

  return (
    <div
      data-testid="pm-chat-panel"
      style={{
        width: 340,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--p-bg2, #1e2128)',
        borderLeft: '1px solid var(--p-border, #2a2d36)',
        position: 'relative',
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--p-border, #2a2d36)',
          padding: '0 8px',
        }}
      >
        <button
          data-testid="pm-tab-chat"
          onClick={() => setTab('chat')}
          style={{
            padding: '8px 12px',
            fontSize: 11,
            fontWeight: tab === 'chat' ? 700 : 400,
            background: 'none',
            border: 'none',
            borderBottom: tab === 'chat' ? '2px solid var(--p-accent, #4a8fc4)' : '2px solid transparent',
            color: tab === 'chat' ? 'var(--p-text, #ccc)' : 'var(--p-text-muted, #888)',
            cursor: 'pointer',
          }}
        >
          ◆ PM CHAT
        </button>
        <button
          data-testid="pm-tab-stream"
          onClick={() => setTab('stream')}
          style={{
            padding: '8px 12px',
            fontSize: 11,
            fontWeight: tab === 'stream' ? 700 : 400,
            background: 'none',
            border: 'none',
            borderBottom: tab === 'stream' ? '2px solid var(--p-accent, #4a8fc4)' : '2px solid transparent',
            color: tab === 'stream' ? 'var(--p-text, #ccc)' : 'var(--p-text-muted, #888)',
            cursor: 'pointer',
          }}
        >
          ⚡ STREAM
          {stream.length > 0 && (
            <span style={{ marginLeft: 4, fontSize: 9, background: 'var(--p-accent, #4a8fc4)', color: '#fff', borderRadius: 8, padding: '0 4px' }}>
              {stream.length}
            </span>
          )}
        </button>
      </div>

      {/* CHAT tab content */}
      {tab === 'chat' && (
        <>
          {/* Session header */}
          {pm.running && (
            <div
              style={{
                padding: '6px 12px',
                fontSize: 11,
                color: 'var(--p-text-muted, #888)',
                borderBottom: '1px solid var(--p-border, #2a2d36)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--p-ok, #4caf50)',
                  display: 'inline-block',
                }}
              />
              PM session
            </div>
          )}

          {/* Message log */}
          <div
            ref={logRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {pm.messages.map((m, i) => (
              <div
                key={i}
                data-testid="pm-message"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.who === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{ fontSize: 10, color: 'var(--p-text-muted, #888)', marginBottom: 2 }}>
                  {m.who === 'pm' ? 'PM' : 'you'}{' '}
                  <span>{m.ts}</span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    background: m.who === 'pm' ? 'var(--p-bg3, #252830)' : 'var(--p-accent, #4a8fc4)',
                    color: m.who === 'pm' ? 'var(--p-text, #ccc)' : '#fff',
                    padding: '6px 10px',
                    borderRadius: 8,
                    maxWidth: '80%',
                    wordBreak: 'break-word',
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input area or start button */}
          {pm.running ? (
            <div
              data-testid="pm-chat-input"
              style={{
                padding: '8px 12px',
                borderTop: '1px solid var(--p-border, #2a2d36)',
                display: 'flex',
                gap: 6,
                alignItems: 'flex-end',
              }}
            >
              <textarea
                data-testid="pm-chat-textarea"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
                }}
                placeholder="PM に話しかける… (⌘+Enter で送信)"
                rows={2}
                style={{
                  flex: 1,
                  resize: 'none',
                  fontSize: 12,
                  background: 'var(--p-bg1, #0d1117)',
                  color: 'var(--p-text, #ccc)',
                  border: '1px solid var(--p-border, #333)',
                  borderRadius: 4,
                  padding: '4px 8px',
                }}
              />
              <button
                data-testid="pm-send-button"
                onClick={handleSend}
                disabled={!draft.trim()}
                style={{
                  padding: '6px 12px',
                  fontSize: 11,
                  background: 'var(--p-accent, #4a8fc4)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: draft.trim() ? 'pointer' : 'not-allowed',
                  opacity: draft.trim() ? 1 : 0.5,
                }}
              >
                送信
              </button>
            </div>
          ) : (
            <div style={{ padding: '12px', borderTop: '1px solid var(--p-border, #2a2d36)' }}>
              <button
                data-testid="pm-start-button"
                onClick={onStart}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: 12,
                  background: 'var(--p-accent, #4a8fc4)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                ▶ PM を起動
              </button>
            </div>
          )}
        </>
      )}

      {/* STREAM tab content */}
      {tab === 'stream' && (
        <div
          data-testid="pm-stream-log"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 12px',
            fontFamily: 'var(--p-font-mono, monospace)',
            fontSize: 10,
          }}
        >
          {stream.length === 0 ? (
            <div style={{ color: 'var(--p-text-muted, #888)', fontStyle: 'italic' }}>
              stream is quiet
            </div>
          ) : (
            stream.map((s, i) => (
              <div key={i} style={{ marginBottom: 4, display: 'flex', gap: 6 }}>
                <span style={{ color: 'var(--p-text-muted, #888)' }}>{s.ts}</span>
                <span style={{ color: 'var(--p-accent, #4a8fc4)' }}>{s.who}</span>
                {s.kind === 'tool' && s.tool && (
                  <span style={{ color: 'var(--p-ok, #4caf50)' }}>{s.tool}</span>
                )}
                <span style={{ color: 'var(--p-text, #ccc)' }}>{s.text}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Approval toast stack (med/low risk) — rendered outside tab pane */}
      {nonHighRisk.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            right: 8,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {nonHighRisk.map((req) => (
            <PMApprovalToast key={req.id} request={req} onPermission={onPermission} />
          ))}
        </div>
      )}

      {/* High-risk modal — rendered as portal overlay */}
      {highRisk && <PMApprovalModal request={highRisk} onPermission={onPermission} />}
    </div>
  );
}
