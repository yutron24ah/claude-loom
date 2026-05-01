/**
 * PlanView — short-term TodoWrite mirror + long-term plan_items tree.
 *
 * WHY: SCREEN_REQUIREMENTS §3.x — two-pane plan view. Left pane mirrors the
 * current TodoWrite state (read-only). Right pane shows the long-term
 * plan_items tree from the daemon via live tRPC query.
 *
 * M2 Task 9: ported from prototype screens-b.jsx PlanView component.
 * M2 Task 10: right pane wired to live daemon via usePlanItems hook.
 * Left pane (short-term todos) remains mock data (M3 will add TodoWrite sync).
 * PlanItem type aligns with daemon/src/db/schema.ts planItems schema.
 */
import { usePlanItems } from '../../live/usePlanItems';
import type { PlanItem } from '@claude-loom/daemon';

/** Status of a todo or plan item. */
type ItemStatus = 'in_progress' | 'pending' | 'completed';

/** Short-term todo item (mirrors TodoWrite). */
interface TodoItem {
  status: ItemStatus;
  text: string;
}

/** Mock short-term todos — 5 items matching SCREEN_REQUIREMENTS. */
const MOCK_TODOS: TodoItem[] = [
  { status: 'in_progress', text: 'user.service.test.ts を GREEN にする' },
  { status: 'pending', text: 'freee OAuth callback の error path 確認' },
  { status: 'pending', text: '整合性 finding #12 を ack' },
  { status: 'completed', text: 'PR #41 verdict 提出' },
  { status: 'completed', text: 'spec §3.6.5 反映' },
];

/** Map status to Tailwind bg class for the status indicator square. */
function statusColorClass(status: ItemStatus): string {
  switch (status) {
    case 'in_progress':
      return 'bg-error'; // prototype uses warn color for in_progress
    case 'pending':
      return 'bg-fg2';
    case 'completed':
      return 'bg-success';
  }
}

/**
 * Map daemon PlanItem status ('todo' | 'doing' | 'done') to display color class.
 * WHY: daemon uses different status enum than the UI's display type.
 */
function daemonStatusColorClass(status: PlanItem['status']): string {
  switch (status) {
    case 'doing':
      return 'bg-error';
    case 'todo':
      return 'bg-fg2';
    case 'done':
      return 'bg-success';
  }
}

export function PlanView(): JSX.Element {
  const { data: planItems, isLoading, error } = usePlanItems();

  return (
    <div className="grid grid-cols-2 gap-sp-3 font-sans">
      {/* ---- Left pane: short-term todos ---- */}
      <div
        data-testid="plan-short-term"
        className="bg-bg2 border border-border rounded-card p-sp-4"
      >
        <h2 className="font-bold text-fs-sm tracking-wide text-fg1">
          短期 — TodoWrite (read-only)
        </h2>
        <p className="text-[9px] text-text-muted font-mono mt-[2px] mb-sp-3">
          session: pm-2026-05-01-am
        </p>

        {MOCK_TODOS.map((todo, i) => (
          <div
            key={i}
            data-testid="todo-item"
            className="flex items-start gap-sp-2 py-[6px] border-b border-dashed border-border text-fs-xs"
          >
            {/* Status square */}
            <span
              data-status={todo.status}
              className={`mt-[3px] w-3 h-3 shrink-0 border border-border ${statusColorClass(todo.status)}`}
            />
            {/* Text */}
            <span
              className={`flex-1 ${
                todo.status === 'completed'
                  ? 'line-through text-text-muted'
                  : 'text-fg1'
              }`}
            >
              {todo.text}
            </span>
            {/* Status label */}
            <span className="text-[9px] text-text-muted font-mono">{todo.status}</span>
          </div>
        ))}
      </div>

      {/* ---- Right pane: long-term plan tree (live tRPC) ---- */}
      <div
        data-testid="plan-long-term"
        className="bg-bg2 border border-border rounded-card p-sp-4"
      >
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-fs-sm tracking-wide text-fg1">
            長期 — plan_items ツリー
          </h2>
          {/* + add button — display only in M2 */}
          <button
            type="button"
            className="px-sp-2 py-[2px] text-[9px] bg-accent text-bg2 border border-border rounded-ctrl font-bold"
          >
            + 追加
          </button>
        </div>
        <p className="text-[9px] text-text-muted font-mono mt-[2px] mb-sp-3">
          編集可 · ファイル直編集と双方向同期
        </p>

        {/* Loading state */}
        {isLoading && (
          <p className="text-fs-xs text-text-muted font-mono">読み込み中…</p>
        )}

        {/* Error state */}
        {!isLoading && error !== null && (
          <p className="text-fs-xs text-error font-mono">接続エラー</p>
        )}

        {/* Empty state */}
        {!isLoading && error === null && planItems !== undefined && planItems.length === 0 && (
          <p
            data-testid="plan-empty-state"
            className="text-fs-xs text-text-muted font-mono"
          >
            plan_items なし — daemon に未登録
          </p>
        )}

        {/* Data: render live plan items from daemon */}
        {!isLoading && error === null && planItems !== undefined && planItems.length > 0 && (
          planItems.map((item, i) => {
            const level = item.parentId === null ? 0 : 1;
            return (
            <div
              key={item.id}
              data-testid="plan-item"
              data-level={level}
              className={`flex items-start gap-sp-2 py-[5px] text-fs-xs ${
                i < planItems.length - 1 ? 'border-b border-dashed border-border' : ''
              }`}
              style={{ paddingLeft: level * 18 }}
            >
              {/* Expand/indent marker */}
              <span className="text-text-muted">{level === 0 ? '▸' : '└'}</span>
              {/* Status square */}
              <span
                className={`mt-[3px] w-[10px] h-[10px] shrink-0 border border-border ${daemonStatusColorClass(item.status)}`}
              />
              {/* Title */}
              <span
                className={`flex-1 ${level === 0 ? 'font-bold' : 'font-normal'} text-fg1`}
              >
                {item.title}
              </span>
              {/* Status label */}
              <span className="text-[9px] text-text-muted font-mono">{item.status}</span>
            </div>
          );
          })
        )}
      </div>
    </div>
  );
}
