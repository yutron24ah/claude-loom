/**
 * KptColumn — shared wrapper for a single KPT board column.
 *
 * WHY: Each of the 4 columns (KEEP / PROBLEM / CARRYOVER / TRY) needs
 * a consistent title + count badge + scrollable body. Extracting this
 * wrapper eliminates repetition (DRY) while keeping the 4 column
 * colour variants configurable (Composition over Inheritance).
 *
 * Colour map per spec (ui-arch.md §8.2.3):
 *   KEEP      → green  (--p-success)
 *   PROBLEM   → red    (--p-error)
 *   CARRYOVER → warn   (--p-warn)
 *   TRY       → accent (--p-accent)
 *
 * REQ-115.
 */
import type { ReactNode } from 'react';

export type KptColumnKind = 'keep' | 'problem' | 'carryover' | 'try';

interface KptColumnProps {
  kind: KptColumnKind;
  title: string;
  count: number;
  children?: ReactNode;
}

/** WHY: typed constant prevents string drift (spec/ui-arch.md §2.2). */
const COL_COLOR: Record<KptColumnKind, string> = {
  keep:      'var(--p-success)',
  problem:   'var(--p-error)',
  carryover: 'var(--p-warn)',
  try:       'var(--p-accent)',
};

export function KptColumn({ kind, title, count, children }: KptColumnProps): JSX.Element {
  const color = COL_COLOR[kind];
  return (
    <div
      data-testid={`kpt-col-${kind}`}
      className={`retro-kpt__col retro-kpt__col--${kind}`}
    >
      {/* Column header */}
      <div className="retro-kpt__col-header">
        <span
          className="retro-kpt__col-title"
          style={{ color }}
        >
          {title}
        </span>
        <span
          data-testid="kpt-col-count"
          className="retro-kpt__col-count"
          style={{ background: color }}
        >
          {count}
        </span>
      </div>
      {/* Scrollable body */}
      <div className="retro-kpt__col-body">
        {children}
      </div>
    </div>
  );
}
