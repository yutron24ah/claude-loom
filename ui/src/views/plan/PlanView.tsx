/**
 * PlanView — short-term TodoWrite mirror + long-term plan_items tree.
 *
 * WHY: SCREEN_REQUIREMENTS §3.x — two-pane plan view. Left pane mirrors the
 * current TodoWrite state (read-only). Right pane shows the long-term
 * plan_items tree (display-only in M2; editing in M3).
 *
 * M2 Task 9: ported from prototype screens-b.jsx PlanView component.
 * Mock data hard-coded (M3 will wire to daemon tRPC).
 * PlanItem type aligns with daemon/src/db/schema.ts planItems schema.
 */

/** Status of a todo or plan item. */
type ItemStatus = 'in_progress' | 'pending' | 'completed';

/** Short-term todo item (mirrors TodoWrite). */
interface TodoItem {
  status: ItemStatus;
  text: string;
}

/** Long-term plan tree item.
 * Aligns with daemon PlanItem: { title, status, parentId (level 0 = milestone) }.
 */
interface PlanTreeItem {
  /** Nesting level: 0 = milestone, 1 = task */
  level: 0 | 1;
  title: string;
  status: ItemStatus;
  /** Optional task count display for milestones */
  count?: string;
}

/** Mock short-term todos — 5 items matching SCREEN_REQUIREMENTS. */
const MOCK_TODOS: TodoItem[] = [
  { status: 'in_progress', text: 'user.service.test.ts を GREEN にする' },
  { status: 'pending', text: 'freee OAuth callback の error path 確認' },
  { status: 'pending', text: '整合性 finding #12 を ack' },
  { status: 'completed', text: 'PR #41 verdict 提出' },
  { status: 'completed', text: 'spec §3.6.5 反映' },
];

/** Mock long-term plan — 1 milestone with 8 tasks = 9 items total. */
const MOCK_PLAN: PlanTreeItem[] = [
  { level: 0, title: 'M0.13 — Process Discipline', status: 'in_progress', count: '3/8' },
  { level: 1, title: 'discipline metrics 4種を header に表示', status: 'completed' },
  { level: 1, title: 'TDD 順序 violation 検出 hook', status: 'in_progress' },
  { level: 1, title: 'retro 統合（履歴 drill-down）', status: 'pending' },
  { level: 1, title: 'AppShell DisciplineHeader 組込み', status: 'completed' },
  { level: 1, title: 'GanttView mock data port', status: 'in_progress' },
  { level: 1, title: 'PlanView mock data port', status: 'in_progress' },
  { level: 1, title: 'RetroView mock data port', status: 'in_progress' },
  { level: 1, title: 'E2E smoke test', status: 'pending' },
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

export function PlanView(): JSX.Element {
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

      {/* ---- Right pane: long-term plan tree ---- */}
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

        {MOCK_PLAN.map((item, i) => (
          <div
            key={i}
            data-testid="plan-item"
            data-level={item.level}
            className={`flex items-start gap-sp-2 py-[5px] text-fs-xs ${
              i < MOCK_PLAN.length - 1 ? 'border-b border-dashed border-border' : ''
            }`}
            style={{ paddingLeft: item.level * 18 }}
          >
            {/* Expand/indent marker */}
            <span className="text-text-muted">{item.level === 0 ? '▸' : '└'}</span>
            {/* Status square */}
            <span
              className={`mt-[3px] w-[10px] h-[10px] shrink-0 border border-border ${statusColorClass(item.status)}`}
            />
            {/* Title */}
            <span className={`flex-1 ${item.level === 0 ? 'font-bold' : 'font-normal'} text-fg1`}>
              {item.title}
            </span>
            {/* Count for milestones */}
            {item.count !== undefined && (
              <span className="text-[9px] text-text-muted font-mono">{item.count}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
