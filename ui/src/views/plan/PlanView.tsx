/**
 * PlanView — plan editor + done archive (redesign port, M0.15 t3).
 *
 * WHY redesign port: M0.15 §3.6.14 replaces the M3.1 tRPC-based
 * usePlanItems / useTodoWrite / usePlanMutations approach with a single
 * useScenario() hook that aggregates scenario state from the daemon WS
 * broadcaster. Write API reconnected in Phase 5 t16.
 *
 * SOURCE OF TRUTH for the visual layout: redesign/screens/plan.jsx (read-only).
 * SOURCE OF TRUTH for the data shape:    redesign/api/types.ts.
 *
 * Left pane:  milestones (active tab by default, done archive tab, edit tab).
 * Right pane: TodoWrite mirror (read-only, sticky).
 *
 * REQ-077
 */
import { useState } from 'react';
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { TodoStatus } from '@claude-loom/redesign/api/types';
import { usePlanMutations } from '../../live/usePlanMutations';

// -------------------------------------------------------------
// Status display constants (mirrors plan.jsx ST_GLYPH / ST_COLOR)
// WHY: typed constants avoid string-comparison bugs and are testable.
// -------------------------------------------------------------
const STATUS_GLYPH: Record<TodoStatus, string> = {
  completed: '✓',
  in_progress: '◐',
  pending: '○',
};

const STATUS_COLOR_VAR: Record<TodoStatus, string> = {
  completed: 'var(--p-success)',
  in_progress: 'var(--p-warn)',
  pending: 'var(--p-stone)',
};

// Tab keys match plan.jsx exactly.
type PlanTab = 'active' | 'done' | 'edit';

export function PlanView(): JSX.Element {
  const sc = useScenario();
  const [tab, setTab] = useState<PlanTab>('active');
  const { upsertItem } = usePlanMutations();

  const { todos, todosUpdatedAt, milestones } = sc;

  // Split milestones into done archive (progress >= 1) and active.
  const archive = milestones.filter((m) => m.progress >= 1);
  const activeMs = milestones.filter((m) => m.progress < 1);
  const displayedMs = tab === 'done' ? archive : activeMs;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        padding: 16,
        overflow: 'auto',
        background: 'var(--p-bg-sky)',
      }}
    >
      {/* ---- Header bar ---- */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}
      >
        <div style={{ fontSize: 14, fontWeight: 700 }}>
          ≡ PLAN — plan_items.json + TodoWrite
        </div>
        <div style={{ flex: 1 }} />
        {/* Tab switcher */}
        <div style={{ display: 'flex', border: '2px solid var(--p-border)' }}>
          {(['active', 'done', 'edit'] as PlanTab[]).map((k) => {
            const label = k === 'active' ? '現行' : k === 'done' ? '完了 archive' : '編集';
            return (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  padding: '3px 10px',
                  fontSize: 9,
                  fontWeight: 700,
                  background: tab === k ? 'var(--p-accent)' : 'var(--p-tint)',
                  color: tab === k ? 'white' : 'var(--p-text)',
                  borderRight: '1px solid var(--p-border)',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {/* + milestone — calls upsertItem to create a new plan item (M0.15 t16) */}
        <button
          type="button"
          className="btn-px primary"
          style={{ fontSize: 9, padding: '3px 8px' }}
          onClick={() => upsertItem({
            title: '新しい milestone',
            status: 'pending',
            position: 0,
          })}
        >
          + milestone
        </button>
      </div>

      {/* ---- Two-column body ---- */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 14,
          alignItems: 'flex-start',
        }}
      >
        {/* ==== LEFT: milestones ==== */}
        <div
          data-testid="plan-long-term"
          className="rpg-frame"
          style={{ padding: 0 }}
        >
          <div
            style={{
              fontSize: 9,
              color: 'var(--p-text-muted)',
              letterSpacing: '0.06em',
              marginBottom: 6,
              padding: '10px 12px 0',
            }}
          >
            <span className="rpg-title">
              {tab === 'done' ? 'DONE ARCHIVE' : 'ACTIVE MILESTONES'}
            </span>
          </div>

          {displayedMs.length === 0 && (
            <div
              style={{
                padding: 30,
                textAlign: 'center',
                border: '2px dashed var(--p-border)',
                background: 'var(--p-paper)',
                fontSize: 10,
                color: 'var(--p-text-muted)',
                margin: '0 12px 12px',
              }}
            >
              {tab === 'done' ? '完了 milestone はまだありません' : 'active な milestone はありません'}
            </div>
          )}

          {displayedMs.map((m) => (
            <div
              key={m.id}
              data-testid="plan-milestone"
              style={{
                padding: 12,
                marginBottom: 8,
                background: 'var(--p-paper)',
                border: '2px solid var(--p-border)',
                boxShadow: '3px 3px 0 0 var(--p-shadow)',
                margin: '0 12px 8px',
              }}
            >
              {/* Milestone header */}
              <div
                style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: 'ui-monospace, monospace',
                    color: 'var(--p-text-muted)',
                  }}
                >
                  {m.id}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{m.title}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: 'ui-monospace, monospace',
                    color: 'var(--p-text-muted)',
                  }}
                >
                  {m.count}
                </span>
                {tab === 'edit' && (
                  /* WHY: disabled+title is honest UX (B8). Milestone editor is
                     Phase B/M1.x scope; a fake-active button misleads users. */
                  <button
                    type="button"
                    className="btn-px ghost"
                    style={{ fontSize: 9, padding: '2px 6px' }}
                    disabled
                    title="milestone editor not yet implemented"
                  >
                    edit
                  </button>
                )}
              </div>

              {/* Progress bar */}
              <div
                data-testid="milestone-progress-bar"
                style={{
                  height: 6,
                  background: 'var(--p-tint)',
                  border: '1px solid var(--p-border)',
                  marginBottom: 8,
                }}
              >
                <div
                  data-testid="milestone-progress-fill"
                  style={{
                    width: `${m.progress * 100}%`,
                    height: '100%',
                    background:
                      m.progress >= 1 ? 'var(--p-success)' : 'var(--p-accent)',
                  }}
                />
              </div>

              {/* Children */}
              {m.children.map((c, i) => (
                <div
                  key={i}
                  data-testid="milestone-child"
                  style={{
                    display: 'flex',
                    gap: 6,
                    fontSize: 10,
                    padding: '2px 0',
                    alignItems: 'center',
                  }}
                >
                  <span
                    data-status={c.st}
                    style={{
                      color: STATUS_COLOR_VAR[c.st],
                      fontFamily: 'ui-monospace, monospace',
                      width: 12,
                    }}
                  >
                    {STATUS_GLYPH[c.st]}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      textDecoration: c.st === 'completed' ? 'line-through' : 'none',
                      color:
                        c.st === 'completed' ? 'var(--p-text-muted)' : 'var(--p-text)',
                    }}
                  >
                    {c.t}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* ==== RIGHT: TodoWrite mirror (sticky) ==== */}
        <div
          data-testid="plan-short-term"
          className="rpg-frame"
          style={{
            background: 'var(--p-paper)',
            border: '2px solid var(--p-border)',
            padding: 10,
            position: 'sticky',
            top: 16,
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}
          >
            <div
              className="rpg-title"
              style={{ fontSize: 9, color: 'var(--p-text-muted)', flex: 1 }}
            >
              TODOS — TodoWrite mirror
            </div>
            <span
              data-testid="todos-updated-at"
              style={{ fontSize: 8, color: 'var(--p-text-muted)' }}
            >
              {todosUpdatedAt}
            </span>
          </div>

          {todos.map((t, i) => (
            <div
              key={i}
              data-testid="todo-item"
              style={{
                display: 'flex',
                gap: 6,
                fontSize: 11,
                padding: '5px 0',
                borderBottom: i < todos.length - 1 ? '1px dashed var(--p-border)' : 'none',
                alignItems: 'flex-start',
              }}
            >
              {/* Status glyph */}
              <span
                data-status={t.status}
                style={{
                  color: STATUS_COLOR_VAR[t.status],
                  fontFamily: 'ui-monospace, monospace',
                  width: 14,
                  flexShrink: 0,
                  paddingTop: 1,
                }}
              >
                {STATUS_GLYPH[t.status]}
              </span>
              {/* Text */}
              <span
                style={{
                  flex: 1,
                  lineHeight: 1.4,
                  textDecoration: t.status === 'completed' ? 'line-through' : 'none',
                  color: t.status === 'completed' ? 'var(--p-text-muted)' : 'var(--p-text)',
                }}
              >
                {t.text}
              </span>
            </div>
          ))}

          <div
            style={{
              marginTop: 10,
              padding: 6,
              fontSize: 9,
              color: 'var(--p-text-muted)',
              background: 'var(--p-tint)',
              border: '1px dashed var(--p-border)',
              lineHeight: 1.5,
            }}
          >
            ◆ TodoWrite tool が呼ばれる度に上書き同期。
            <br />
            ◆ ここは read-only mirror、編集は milestone 側で。
          </div>
        </div>
      </div>
    </div>
  );
}
