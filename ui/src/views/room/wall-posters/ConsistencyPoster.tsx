/**
 * ConsistencyPoster — small alert plaque for doc consistency findings.
 *
 * WHY: Ported from design source room.jsx L138-164 (M0.15 t15 redesign).
 * Scenario-driven: reads useScenario().findings to show NEW badge count
 * (high+open) and top 4 findings with severity color dots.
 * Uses Phase A CSS class tokens (.room-poster*).
 *
 * Previous implementation (M0.11.4) used hardcoded FINDINGS with fixed
 * "NEW 2" badge. This version counts dynamically from scenario data.
 */
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { FindingSeverity } from '@claude-loom/redesign/api/types';

// WHY: matches design source room.jsx L152-154 severity color mapping.
const SEV_COLOR: Record<FindingSeverity, string> = {
  high:   'var(--p-error)',
  medium: 'var(--p-warn)',
  low:    'var(--p-stone)',
};

export interface ConsistencyPosterProps {
  x: number;
  y: number;
  width: number;
  height: number;
  onClick: () => void;
}

export function ConsistencyPoster({ x, y, width, height, onClick }: ConsistencyPosterProps) {
  const scenario = useScenario();
  const findings = scenario.findings;

  // WHY: NEW badge = high severity AND open status, matching design source L139.
  const newCount = findings.filter((f) => f.sev === 'high' && f.status === 'open').length;

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
            background: newCount ? 'var(--p-error)' : 'var(--p-stone)',
            color: 'white',
            border: '1px solid var(--p-border)',
            letterSpacing: '0.04em',
          }}
        >
          NEW {newCount}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, padding: '4px 0' }}>
        {findings.slice(0, 4).map((f, i) => (
          <div
            key={i}
            data-testid="consistency-finding"
            style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 8, fontFamily: 'ui-monospace, monospace' }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                background: SEV_COLOR[f.sev],
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
              <strong style={{ color: 'var(--p-text)' }}>{f.id}</strong> {f.title}
            </span>
          </div>
        ))}
      </div>
      <div className="room-poster__footer">クリックで詳細</div>
    </button>
  );
}
