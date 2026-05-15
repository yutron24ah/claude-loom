/**
 * LiveRail (proposed new file) — right-column fallback when PM is offline.
 *
 * Source: redesign/screens/room.jsx L246-275.
 *
 * When scenario.pm.running === false:
 *   - PMChatPanel is hidden (AppShell already does this)
 *   - This rail shows the raw stream (tool/reasoning events) instead
 *   - Lets the user see *something* is happening even before PM starts
 *
 * Tabs: merged | reasoning | tools
 *
 * Mount point: AppShell.tsx, parallel to PMChatPanel branch:
 *   {showPmPanel
 *     ? <PMChatPanel ... />
 *     : <LiveRail stream={scenario.stream} ... />}
 */
import { useState } from 'react';
import type { StreamMsg } from '@claude-loom/redesign/api/types';

export interface LiveRailProps {
  stream: StreamMsg[];
  collapsed: boolean;
  onToggle: () => void;
}

type Tab = 'merged' | 'reasoning' | 'tools';

export function LiveRail({ stream, collapsed, onToggle }: LiveRailProps): JSX.Element {
  const [tab, setTab] = useState<Tab>('merged');

  // WHY: collapsed=true case is dead code — AppShell controls mount with
  // showLiveRail (false when collapsed), and renders its own rail-toggle button
  // (AppShell L~291). Returning null here instead of duplicating the toggle
  // removes the dead branch while keeping the prop for backwards compatibility.
  // The canonical toggle lives in AppShell to maintain single responsibility.
  if (collapsed) return null as unknown as JSX.Element;

  const filtered =
    tab === 'tools'
      ? stream.filter((s) => s.kind === 'tool')
      : tab === 'reasoning'
        ? stream.filter((s) => s.kind === 'reason')
        : stream;

  return (
    <div className="rail">
      <div className="rail__hdr">
        ⚡ LIVE STREAM
        <span className="x" onClick={onToggle} title="閉じる">
          ×
        </span>
      </div>
      <div className="rail__tabs">
        {(['merged', 'reasoning', 'tools'] as const).map((id) => (
          <div
            key={id}
            className={`rail__tab${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
            {id === 'merged' ? 'ALL' : id}
          </div>
        ))}
      </div>
      <div className="rail__body">
        {filtered.length === 0 && (
          <div
            style={{
              color: 'var(--p-text-muted)',
              fontSize: 10,
              padding: 12,
              textAlign: 'center',
            }}
          >
            静かです…
            <br />
            /loom-go で開発開始
          </div>
        )}
        {filtered.map((s, i) => (
          <div key={i} className={`rail__line ${s.kind}`}>
            <span className="ts">{s.ts}</span>
            <span className="who">{s.who}</span>
            {s.kind === 'tool' && s.tool && <span className="tool">{s.tool}</span>}
            {s.text}
          </div>
        ))}
      </div>
    </div>
  );
}
