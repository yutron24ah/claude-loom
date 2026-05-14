/**
 * routing/constants.ts — NAV_GROUPS + route labels.
 *
 * WHY: per G6 — these were defined as an inline `const NAV_GROUPS` inside
 * AppShell.tsx. Pulling them to a constants file makes them reusable
 * (e.g. a future "command palette" can re-derive its options from the
 * same source) and keeps AppShell.tsx focused on layout.
 */

export interface NavItem {
  /** stable id for tests + analytics */
  id: string;
  /** react-router path */
  path: string;
  /** single-char glyph for the drawer icon box */
  ico: string;
  /** display label */
  label: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: readonly NavItem[];
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: 'operate',
    label: 'OPERATE',
    items: [
      { id: 'room',        path: '/',            ico: '▦', label: 'Room' },
      { id: 'plan',        path: '/plan',        ico: '≡', label: 'Plan' },
      { id: 'gantt',       path: '/gantt',       ico: '▭', label: 'Gantt' },
      { id: 'sessions',    path: '/sessions',    ico: '❐', label: 'Sessions' },
      { id: 'consistency', path: '/consistency', ico: '△', label: 'Consistency' },
    ],
  },
  {
    id: 'manage',
    label: 'MANAGE',
    items: [
      { id: 'worktree',      path: '/worktree',      ico: '⌗', label: 'Worktree' },
      { id: 'retro',         path: '/retro',         ico: '◆', label: 'Retro' },
      { id: 'customization', path: '/customization', ico: '✦', label: 'Customization' },
      { id: 'guidance',      path: '/guidance',      ico: '❉', label: 'Guidance' },
    ],
  },
  {
    id: 'settings',
    label: 'SETTINGS',
    items: [
      { id: 'tokens',           path: '/tokens',           ico: '$', label: 'Tokens' },
      { id: 'project-settings', path: '/project-settings', ico: '⚙', label: 'Project Settings' },
    ],
  },
] as const;

/** Convenience flat list — useful for breadcrumbs / search. */
export const ALL_NAV_ITEMS: readonly NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** Dev/QA scenario picker keys. */
export const SCENARIO_KEYS = ['idle', 'active', 'failed'] as const;
export type ScenarioKey = (typeof SCENARIO_KEYS)[number];

/** App-level copy. */
export const APP_COPY = {
  brand: 'claude-loom',
  wsConnected: 'WS connected',
  wsReconnecting: '再接続中…',
  projectSwitcherTitle: 'プロジェクト切替',
  drawerToggleTitle: 'Toggle drawer',
  versionLine: 'v0.15 · 127.0.0.1:5757',
} as const;
