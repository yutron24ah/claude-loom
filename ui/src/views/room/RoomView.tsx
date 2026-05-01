/**
 * RoomView — Kairosoft-style isometric dev office with all 13 cat agents.
 * WHY: ported from ui/prototype/room.jsx; DOM-based (no Phaser per Q4 brainstorm decision).
 * Inline style for pixel RPG CSS variable references; Tailwind for semantic tokens.
 * data-testid="room-canvas" must remain for AppShell tests (Task 5 contract).
 */
import React, { useState } from 'react';
import { DeskStation } from './DeskStation';
import { AgentDetailPanel } from './AgentDetailPanel';
import { ROSTER } from './roster';
import { useViewStore } from '../../store/view';
import type { DeskStatus } from './DeskStation';

export interface RoomViewProps {
  width?: number;
  height?: number;
  /** Pre-select an agent by id on mount */
  initialSelected?: string;
}

// WHY: mock runtime state — each entry augments ROSTER data with live UI-only fields.
// Once daemon is wired, this will be replaced by tRPC queries.
interface AgentRuntimeState {
  id: string;
  status: DeskStatus;
  task?: string;
  tdd?: string;
  scroll?: boolean;
  label?: string;
}

const RUNTIME_STATE: AgentRuntimeState[] = [
  { id: 'pm',             status: 'busy',   task: '仕様確認中',    label: 'PM',         scroll: true },
  { id: 'dev',            status: 'busy',   task: 'GREEN にする',   label: 'Dev',        tdd: 'GREEN', scroll: true },
  { id: 'rev',            status: 'review', task: 'verdict 草稿',   label: 'Reviewer' },
  { id: 'rev-code',       status: 'review', task: 'catch 漏れ 1',   label: 'Code Rev',   scroll: true },
  { id: 'rev-test',       status: 'busy',   task: 'coverage 確認',  label: 'Test Rev' },
  { id: 'rev-sec',        status: 'idle',                           label: 'Sec Rev',    scroll: true },
  { id: 'retro-pm',       status: 'busy',   task: 'retro 集合〜',   label: 'Retro PM' },
  { id: 'retro-research', status: 'busy',   task: 'ログ読み',       label: 'Researcher' },
  { id: 'retro-pj',       status: 'busy',   task: '成果物確認',     label: 'PJ Judge' },
  { id: 'retro-proc',     status: 'busy',   task: 'TDD 順序確認',   label: 'Process' },
  { id: 'retro-meta',     status: 'idle',                           label: 'Meta' },
  { id: 'retro-counter',  status: 'busy',   task: '反証確認',       label: 'Counter' },
  { id: 'retro-agg',      status: 'busy',   task: 'action plan',    label: 'Aggregator' },
];

/**
 * Floor/wall background SVG — matches prototype room.jsx RoomBackground.
 */
function RoomBackground({ width, height }: { width: number; height: number }): JSX.Element {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      style={{ position: 'absolute', inset: 0, imageRendering: 'pixelated' }}
    >
      <rect x="0" y="0" width={width} height={height * 0.3} fill="var(--p-wall, #d4c9b8)" />
      <rect x="0" y={height * 0.28} width={width} height="3" fill="var(--p-wood-dark, #7c5c40)" />
      <rect x="0" y={height * 0.31} width={width} height={height * 0.12} fill="var(--p-wall-2, #c4b8a5)" />
      <rect x="0" y={height * 0.42} width={width} height="2" fill="var(--p-wood-dark, #7c5c40)" />
      <rect x="0" y={height * 0.44} width={width} height={height * 0.56} fill="var(--p-bg-floor, #e8dcc8)" />
      {Array.from({ length: 14 }).map((_, i) => (
        <rect key={`v${i}`} x={i * (width / 14)} y={height * 0.44} width="1" height={height * 0.56} fill="var(--p-bg-floor-2, #d4c4a8)" opacity="0.6" />
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={`h${i}`} x="0" y={height * 0.44 + (i + 1) * 38} width={width} height="1" fill="var(--p-bg-floor-2, #d4c4a8)" opacity="0.4" />
      ))}
    </svg>
  );
}

export function RoomView({
  width = 1080,
  height = 660,
  initialSelected,
}: RoomViewProps): JSX.Element {
  const [sel, setSel] = useState<string | null>(initialSelected ?? null);

  // Build combined agent data (roster + runtime state)
  const agents = ROSTER.map((cat) => {
    const rt = RUNTIME_STATE.find((r) => r.id === cat.id);
    return {
      cat,
      status: (rt?.status ?? 'idle') as DeskStatus,
      task: rt?.task,
      tdd: rt?.tdd,
      scroll: rt?.scroll,
      label: rt?.label,
    };
  });

  // WHY: layout computed relative to width so the room scales gracefully.
  // Positions mirror prototype room.jsx positions array.
  const positions: Record<string, { x: number; y: number }> = {
    // Core island (center)
    pm:             { x: width / 2 - 50,  y: 220 },
    // Dev island (left)
    dev:            { x: 130,             y: 400 },
    // Review island (right)
    rev:            { x: width - 380,     y: 400 },
    'rev-code':     { x: width - 270,     y: 400 },
    'rev-test':     { x: width - 160,     y: 400 },
    'rev-sec':      { x: width - 270,     y: 480 },
    // Retro island (bottom row)
    'retro-pm':       { x: 60,              y: 540 },
    'retro-research': { x: 180,             y: 540 },
    'retro-pj':       { x: 300,             y: 540 },
    'retro-proc':     { x: 420,             y: 540 },
    'retro-meta':     { x: 540,             y: 540 },
    'retro-counter':  { x: 660,             y: 540 },
    'retro-agg':      { x: 780,             y: 540 },
  };

  const selectedAgent = sel ? agents.find((a) => a.cat.id === sel) : null;

  return (
    <div
      data-testid="room-canvas"
      style={{ position: 'relative', width, height, overflow: 'hidden' }}
    >
      <RoomBackground width={width} height={height} />

      {/* Wall signs */}
      <div style={{
        position: 'absolute', left: 20, top: 14, fontSize: 9, fontWeight: 700,
        fontFamily: 'ui-monospace, monospace', color: 'var(--p-text, #1a1a2e)',
        background: 'var(--p-paper, #f8f4ec)', border: '2px solid var(--p-border, #2a2a35)',
        padding: '2px 8px', boxShadow: '2px 2px 0 0 var(--p-shadow, rgba(0,0,0,0.2))',
        letterSpacing: '0.04em',
      }}>
        claude-loom — branch: main
      </div>

      {/* Island zone labels */}
      <div style={{
        position: 'absolute', left: width / 2 - 40, top: 200, fontSize: 9, fontWeight: 700,
        fontFamily: 'ui-monospace, monospace', color: 'var(--p-accent, #6366f1)',
        letterSpacing: '0.04em',
      }}>
        PM
      </div>
      <div style={{
        position: 'absolute', left: 120, top: 380, fontSize: 9, fontWeight: 700,
        fontFamily: 'ui-monospace, monospace', color: 'var(--p-accent, #6366f1)',
        letterSpacing: '0.04em',
      }}>
        DEV
      </div>
      <div style={{
        position: 'absolute', left: width - 380, top: 380, fontSize: 9, fontWeight: 700,
        fontFamily: 'ui-monospace, monospace', color: 'var(--p-accent, #6366f1)',
        letterSpacing: '0.04em',
      }}>
        REVIEW
      </div>
      <div style={{
        position: 'absolute', left: 60, top: 520, fontSize: 9, fontWeight: 700,
        fontFamily: 'ui-monospace, monospace', color: 'var(--p-accent, #6366f1)',
        letterSpacing: '0.04em',
      }}>
        RETRO
      </div>

      {/* Desk stations for all 13 agents */}
      {agents.map(({ cat, status, task, tdd, scroll, label }) => {
        const pos = positions[cat.id];
        if (!pos) return null;
        return (
          <DeskStation
            key={cat.id}
            x={pos.x}
            y={pos.y}
            cat={cat}
            status={status}
            task={task}
            tdd={tdd}
            scroll={scroll}
            label={label}
            selected={sel === cat.id}
            onClick={() => {
              const nextSel = sel === cat.id ? null : cat.id;
              setSel(nextSel);
              // WHY: sync to global view store so other panels can react
              useViewStore.getState().setSelectedAgentId(nextSel);
            }}
          />
        );
      })}

      {/* AgentDetailPanel overlay on selection */}
      {selectedAgent && (
        <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 10 }}>
          <AgentDetailPanel
            agent={selectedAgent.cat}
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
