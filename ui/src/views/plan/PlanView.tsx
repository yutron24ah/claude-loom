/**
 * PlanView — short-term TodoWrite mirror + long-term plan_items tree.
 *
 * WHY: SCREEN_REQUIREMENTS §3.x — two-pane plan view. Left pane mirrors the
 * current TodoWrite state (read-only) via live tRPC subscription.
 * Right pane shows the long-term plan_items tree from the daemon via live tRPC query.
 *
 * M2 Task 9: ported from prototype screens-b.jsx PlanView component.
 * M2 Task 10: right pane wired to live daemon via usePlanItems hook.
 * M3.1 t1: left pane wired to live daemon via useTodoWrite hook (replaces MOCK_TODOS).
 * M3.1 t2: right pane edit-wired — + add button, status toggle, inline title edit.
 * PlanItem type aligns with daemon/src/db/schema.ts planItems schema.
 */
import { useState } from 'react';
import { usePlanItems } from '../../live/usePlanItems';
import { useTodoWrite } from '../../live/useTodoWrite';
import { usePlanMutations } from '../../live/usePlanMutations';
import type { PlanItem } from '@claude-loom/daemon';

/** Status of a todo or plan item. */
type ItemStatus = 'in_progress' | 'pending' | 'completed';

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

/**
 * Cycle status: todo → doing → done → todo.
 * WHY: single consistent cycle matches the daemon enum progression.
 */
function nextStatus(current: PlanItem['status']): PlanItem['status'] {
  switch (current) {
    case 'todo':
      return 'doing';
    case 'doing':
      return 'done';
    case 'done':
      return 'todo';
  }
}

export function PlanView(): JSX.Element {
  const { todos } = useTodoWrite();
  const { data: planItems, isLoading, error } = usePlanItems();
  const { upsertItem, updateItemStatus } = usePlanMutations();

  /**
   * editingId: which plan item is currently being inline-edited (null = none).
   * WHY: local UI state — does not need to live in a global store.
   */
  const [editingId, setEditingId] = useState<number | null>(null);

  /**
   * editingTitle: the current draft value while inline editing.
   * WHY: controlled input avoids contentEditable complexity (KISS).
   */
  const [editingTitle, setEditingTitle] = useState<string>('');

  /** Enter inline edit mode for a plan item. */
  function handleTitleClick(item: PlanItem): void {
    setEditingId(item.id);
    setEditingTitle(item.title);
  }

  /** Commit inline edit on blur — only fire upsert if title actually changed. */
  function handleTitleBlur(item: PlanItem): void {
    setEditingId(null);
    if (editingTitle !== item.title) {
      upsertItem({
        id: item.id,
        title: editingTitle,
        status: item.status,
        position: item.position,
        parentId: item.parentId,
        body: item.body,
        sourcePath: item.sourcePath,
      });
    }
  }

  /** Add a new root-level plan item. */
  function handleAddItem(): void {
    const position = planItems !== undefined ? planItems.length : 0;
    upsertItem({
      title: '新しいアイテム',
      status: 'todo',
      position,
      parentId: null,
    });
  }

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

        {todos.map((todo, i) => (
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

      {/* ---- Right pane: long-term plan tree (live tRPC, editable) ---- */}
      <div
        data-testid="plan-long-term"
        className="bg-bg2 border border-border rounded-card p-sp-4"
      >
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-fs-sm tracking-wide text-fg1">
            長期 — plan_items ツリー
          </h2>
          {/* + add button — fires upsert mutation (M3.1 t2) */}
          <button
            type="button"
            onClick={handleAddItem}
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

        {/* Data: render live plan items from daemon (editable) */}
        {!isLoading && error === null && planItems !== undefined && planItems.length > 0 && (
          planItems.map((item, i) => {
            const level = item.parentId === null ? 0 : 1;
            const isEditing = editingId === item.id;
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
                {/* Status square — clickable to cycle status */}
                <button
                  type="button"
                  data-testid="plan-item-status"
                  aria-label={`status: ${item.status}`}
                  onClick={() => updateItemStatus({ id: item.id, status: nextStatus(item.status) })}
                  className={`mt-[3px] w-[10px] h-[10px] shrink-0 border border-border cursor-pointer ${daemonStatusColorClass(item.status)}`}
                />
                {/* Title — click to enter inline edit mode */}
                {isEditing ? (
                  <input
                    data-testid={`plan-item-input-${item.id}`}
                    type="text"
                    value={editingTitle}
                    autoFocus
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => handleTitleBlur(item)}
                    className={`flex-1 bg-transparent border-b border-accent text-fs-xs outline-none ${
                      level === 0 ? 'font-bold' : 'font-normal'
                    } text-fg1`}
                  />
                ) : (
                  <span
                    data-testid={`plan-item-title-${item.id}`}
                    onClick={() => handleTitleClick(item)}
                    className={`flex-1 cursor-text ${level === 0 ? 'font-bold' : 'font-normal'} text-fg1`}
                  >
                    {item.title}
                  </span>
                )}
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
