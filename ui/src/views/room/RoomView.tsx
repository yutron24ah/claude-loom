/**
 * RoomView — Phaser hybrid: Phaser canvas for sprites + DOM AgentDetailPanel overlay.
 *
 * WHY (SPEC §3.6.9.1, M3.0 Phaser hybrid):
 * M2 was DOM-based (CatSprite + DeskStation). M3.0 replaces the DOM sprites with
 * Phaser 3 Graphics primitives (placeholders until M5 pixel art). The DOM layer
 * only retains AgentDetailPanel as an overlay — consistent with SPEC §3.6.9 hybrid
 * design philosophy.
 *
 * CRITICAL CONTRACT: `data-testid="room-canvas"` must remain on the wrapper div.
 * AppShell.test.tsx and main.test.tsx verify this attribute exists in the DOM.
 *
 * CatSprite.tsx and DeskStation.tsx are removed in this refactor (M3.0 Step 4).
 * Agent names/details are still accessible via AgentDetailPanel on sprite click.
 */
import React, { useState } from 'react';
import { PhaserCanvas } from './PhaserCanvas';
import { AgentDetailPanel } from './AgentDetailPanel';
import { ROSTER } from './roster';
import { useViewStore } from '../../store/view';
import type { Agent } from './PhaserCanvas';

export interface RoomViewProps {
  width?: number;
  height?: number;
  /** Pre-select an agent by id on mount */
  initialSelected?: string;
}

// WHY: mock runtime state for M3.0 — will be replaced by daemon tRPC subscription in M3.2.
// Status drives Phaser sprite color (idle=blue / busy=purple / fail=red) via agentSpriteSync.
const RUNTIME_STATUSES: Record<string, Agent['status']> = {
  pm:               'busy',
  dev:              'busy',
  rev:              'idle',
  'rev-code':       'idle',
  'rev-test':       'busy',
  'rev-sec':        'idle',
  'retro-pm':       'busy',
  'retro-research': 'busy',
  'retro-pj':       'busy',
  'retro-proc':     'busy',
  'retro-meta':     'idle',
  'retro-counter':  'busy',
  'retro-agg':      'busy',
};

export function RoomView({
  width = 1080,
  height = 660,
  initialSelected,
}: RoomViewProps): JSX.Element {
  const [sel, setSel] = useState<string | null>(initialSelected ?? null);

  // Build agent list for Phaser canvas — roster + mock status
  const agents: Agent[] = ROSTER.map((entry) => ({
    ...entry,
    status: RUNTIME_STATUSES[entry.id] ?? 'idle',
  }));

  const selectedAgent = sel ? ROSTER.find((r) => r.id === sel) : null;

  return (
    <div
      data-testid="room-canvas"
      style={{ position: 'relative', width, height, overflow: 'hidden' }}
    >
      {/* Phaser canvas layer — sprites + tile background */}
      <PhaserCanvas agents={agents} width={width} height={height} />

      {/* AgentDetailPanel DOM overlay — shown when a sprite is selected */}
      {selectedAgent && (
        <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 10 }}>
          <AgentDetailPanel
            agent={selectedAgent}
            onClose={() => {
              setSel(null);
              useViewStore.getState().setSelectedAgentId(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
