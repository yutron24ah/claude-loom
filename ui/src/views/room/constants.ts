/**
 * room/constants.ts — single source of truth for Room-screen labels,
 * agent ids, zone definitions, and magic numbers that aren't expressible
 * as CSS custom properties (which live in tokens.css).
 *
 * WHY: per G6 — strings and structured tables are tokenised here, never
 * inlined inside JSX. Components import these symbols instead of typing
 * "DEV PIT" inline.
 */

// ---------------------------------------------------------------------------
// Agent ids that occupy a desk in the open office.
// retro/* agents live in RetroGathering (out of scope for the room desks).
// ---------------------------------------------------------------------------
export const ROOM_AGENT_IDS = [
  'pm',
  'dev',
  'rev-code',
  'rev-test',
  'rev-sec',
] as const;

export type RoomAgentId = (typeof ROOM_AGENT_IDS)[number];

// ---------------------------------------------------------------------------
// Zone definitions — what each floor rug means.
// Colors come from CSS vars (--p-zone-*) so theme switches still work.
// Width/height/position ratios come from CSS vars too (--room-zone-*-ratio).
// ---------------------------------------------------------------------------
export interface ZoneSpec {
  id: 'dev' | 'pm' | 'review';
  label: string;
  /** CSS var name for the fill — read with getComputedStyle in tests if needed */
  tintVar: string;
  /** CSS var name for the label color (used at low opacity) */
  fgVar: string;
}

export const ZONES: readonly ZoneSpec[] = [
  { id: 'dev',    label: 'DEV PIT',  tintVar: '--p-zone-dev',    fgVar: '--p-zone-dev-fg' },
  { id: 'pm',     label: 'MANAGER',  tintVar: '--p-zone-pm',     fgVar: '--p-zone-pm-fg' },
  { id: 'review', label: 'REVIEW',   tintVar: '--p-zone-review', fgVar: '--p-zone-review-fg' },
] as const;

// ---------------------------------------------------------------------------
// Cold-start prompt copy.
// ---------------------------------------------------------------------------
export const COLD_START_COPY = {
  title: 'みんな寝てます 💤',
  body: 'このプロジェクトでは現在 claude code セッションが動いていません。前回の値は壁に貼ってあります。',
  startBtn: '▶ PM を起動',
  terminalHint: 'or terminal で',
  terminalCmd: '/loom-pm',
} as const;

// ---------------------------------------------------------------------------
// Live-rail tab labels (must match LiveRail's Tab type).
// ---------------------------------------------------------------------------
export const LIVE_RAIL_TABS = [
  { id: 'merged',    label: 'ALL' },
  { id: 'reasoning', label: 'reasoning' },
  { id: 'tools',     label: 'tools' },
] as const;

export type LiveRailTabId = (typeof LIVE_RAIL_TABS)[number]['id'];

// ---------------------------------------------------------------------------
// Max number of worktree clones we render above the dev desk.
// (More than this and they overlap the GanttPoster.)
// ---------------------------------------------------------------------------
export const MAX_SUBROOM_CLONES = 4;
export const SUBROOM_CLONE_GAP = 56; // px between clones (matches sprite size)
export const SUBROOM_CLONE_OFFSET_X = 60; // px from desk anchor
export const SUBROOM_CLONE_OFFSET_Y = -60; // px above desk anchor

// ---------------------------------------------------------------------------
// Minimum room canvas dimensions before we stop shrinking.
// ResizeObserver clamps to these floors.
// ---------------------------------------------------------------------------
export const ROOM_MIN_WIDTH = 900;
export const ROOM_MIN_HEIGHT = 560;

// ---------------------------------------------------------------------------
// Wall-poster y offset from the top of the wall area.
// ---------------------------------------------------------------------------
export const POSTER_TOP = 28;
