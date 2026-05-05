/**
 * ConsistencyPoster — small alert plaque for doc consistency findings.
 *
 * WHY: Ported from design source room.jsx L289-307.
 * Shows NEW badge count, 3 finding rows with severity dots, and footer CTA.
 * Uses Phase A CSS class tokens (.room-poster*).
 */

export interface ConsistencyPosterProps {
  x: number;
  y: number;
  width: number;
  height: number;
  onClick: () => void;
}

interface Finding {
  sev: 'high' | 'medium' | 'low';
  c: string;
  t: string;
}

const FINDINGS: Finding[] = [
  { sev: 'high',   c: 'var(--p-error)', t: 'F-12 §3.6 ガント縦軸 矛盾' },
  { sev: 'high',   c: 'var(--p-error)', t: 'F-11 TDD 順序 乖離' },
  { sev: 'medium', c: 'var(--p-warn)',  t: 'F-09 hotfix CLI 古い' },
];

export function ConsistencyPoster({ x, y, width, height, onClick }: ConsistencyPosterProps) {
  return (
    <button
      className="room-poster room-poster--consistency"
      data-testid="consistency-poster"
      onClick={onClick}
      style={{ left: x, top: y, width, height }}
    >
      <div className="room-poster__header">
        <div className="room-poster__title" style={{ fontSize: 9 }}>📜 整合性 INBOX</div>
        <span
          style={{
            fontSize: 8,
            fontWeight: 700,
            padding: '1px 5px',
            background: 'var(--p-error)',
            color: 'white',
            border: '1px solid var(--p-border)',
            letterSpacing: '0.04em',
          }}
        >
          NEW 2
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, padding: '4px 0' }}>
        {FINDINGS.map((f, i) => (
          <div
            key={i}
            data-testid="consistency-finding"
            style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 8, fontFamily: 'ui-monospace, monospace' }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                background: f.c,
                border: '1px solid var(--p-border)',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: 'var(--p-text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {f.t}
            </span>
          </div>
        ))}
      </div>
      <div className="room-poster__footer">クリックで詳細</div>
    </button>
  );
}
