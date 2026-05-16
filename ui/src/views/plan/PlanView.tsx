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
 * M0.17 Round 2 Phase B: inline styles replaced with screens/plan.css classes.
 * Dynamic values (progress bar width/color, status glyph color, strikethrough)
 * remain inline — they are computed at runtime and cannot be expressed as
 * static CSS class rules.
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
    <div className="plan-screen">
      {/* ---- Header bar ---- */}
      <div className="plan-header">
        <div className="plan-header__title">
          ≡ PLAN — plan_items.json + TodoWrite
        </div>
        <div className="plan-header__spacer" />
        {/* Tab switcher */}
        <div className="plan-tab-group">
          {(['active', 'done', 'edit'] as PlanTab[]).map((k) => {
            const label = k === 'active' ? '現行' : k === 'done' ? '完了 archive' : '編集';
            return (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`plan-tab${tab === k ? ' plan-tab--active' : ''}`}
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
      <div className="plan-body">
        {/* ==== LEFT: milestones ==== */}
        <div
          data-testid="plan-long-term"
          className="rpg-frame plan-milestones"
        >
          <div className="plan-milestones__label">
            <span className="rpg-title">
              {tab === 'done' ? 'DONE ARCHIVE' : 'ACTIVE MILESTONES'}
            </span>
          </div>

          {displayedMs.length === 0 && (
            <div className="plan-milestones__empty">
              {tab === 'done' ? '完了 milestone はまだありません' : 'active な milestone はありません'}
            </div>
          )}

          {displayedMs.map((m) => (
            <div
              key={m.id}
              data-testid="plan-milestone"
              className="plan-milestone"
            >
              {/* Milestone header */}
              <div className="plan-milestone__header">
                <span className="plan-milestone__id">
                  {m.id}
                </span>
                <span className="plan-milestone__title">{m.title}</span>
                <span className="plan-milestone__count">
                  {m.count}
                </span>
                {tab === 'edit' && (
                  /* WHY: disabled+title is honest UX (B8). Milestone editor is
                     Phase B/M1.x scope; a fake-active button misleads users. */
                  <button
                    type="button"
                    className="btn-px ghost plan-tab--ghost"
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
                className="plan-milestone__progress"
              >
                <div
                  data-testid="milestone-progress-fill"
                  className="plan-milestone__progress-fill"
                  style={{
                    width: `${m.progress * 100}%`,
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
                  className="plan-child"
                >
                  <span
                    data-status={c.st}
                    className="plan-child__glyph"
                    style={{ color: STATUS_COLOR_VAR[c.st] }}
                  >
                    {STATUS_GLYPH[c.st]}
                  </span>
                  <span
                    className="plan-child__text"
                    style={{
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
          className="rpg-frame plan-todos"
        >
          <div className="plan-todos__header">
            <div
              className="rpg-title plan-todos__title"
            >
              TODOS — TodoWrite mirror
            </div>
            <span
              data-testid="todos-updated-at"
              className="plan-todos__updated-at"
            >
              {todosUpdatedAt}
            </span>
          </div>

          {todos.map((t, i) => (
            <div
              key={i}
              data-testid="todo-item"
              className={`plan-todo-item${i < todos.length - 1 ? ' plan-todo-item--not-last' : ''}`}
            >
              {/* Status glyph */}
              <span
                data-status={t.status}
                className="plan-todo-item__glyph"
                style={{ color: STATUS_COLOR_VAR[t.status] }}
              >
                {STATUS_GLYPH[t.status]}
              </span>
              {/* Text */}
              <span
                className="plan-todo-item__text"
                style={{
                  textDecoration: t.status === 'completed' ? 'line-through' : 'none',
                  color: t.status === 'completed' ? 'var(--p-text-muted)' : 'var(--p-text)',
                }}
              >
                {t.text}
              </span>
            </div>
          ))}

          <div className="plan-todos__hint">
            ◆ TodoWrite tool が呼ばれる度に上書き同期。
            <br />
            ◆ ここは read-only mirror、編集は milestone 側で。
          </div>
        </div>
      </div>
    </div>
  );
}
