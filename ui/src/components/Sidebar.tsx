/**
 * Sidebar — navigation links for claude-loom views.
 *
 * WHY: M5 t4. Centralises route navigation so users can access views
 * without typing paths directly. Uses React Router NavLink for
 * active state styling.
 *
 * NAV_LINKS is the SSoT for navigation entries — add new routes here.
 * SPEC §3.6.10: no raw string literal paths scattered in components.
 *
 * data-testid: sidebar, sidebar-link-{id}
 */
import { NavLink } from 'react-router-dom';

// ---------------------------------------------------------------------------
// NAV_LINKS — SPEC §3.6.10: route path SSoT
// ---------------------------------------------------------------------------

const NAV_LINKS = [
  { id: 'plan',             path: '/plan',             label: 'Plan' },
  { id: 'gantt',            path: '/gantt',            label: 'Gantt' },
  { id: 'sessions',         path: '/sessions',         label: 'Sessions' },
  { id: 'consistency',      path: '/consistency',      label: 'Consistency' },
  { id: 'worktree',         path: '/worktree',         label: 'Worktree' },
  { id: 'retro',            path: '/retro',            label: 'Retro' },
  { id: 'customization',    path: '/customization',    label: 'Customization' },
  { id: 'guidance',         path: '/guidance',         label: 'Guidance' },
  // M5 t4: token usage meter
  { id: 'tokens',           path: '/tokens',           label: 'Tokens' },
  // M5 t3: project settings
  { id: 'project-settings', path: '/project-settings', label: 'Project Settings' },
] as const;

export function Sidebar(): JSX.Element {
  return (
    <nav
      data-testid="sidebar"
      className="flex flex-col gap-sp-1 p-sp-2 bg-bg2 border-r border-border h-full"
    >
      {NAV_LINKS.map((link) => (
        <NavLink
          key={link.id}
          to={link.path}
          data-testid={`sidebar-link-${link.id}`}
          className={({ isActive }) =>
            `px-sp-2 py-sp-1 text-fs-xs font-mono rounded-sm transition-colors ${
              isActive
                ? 'bg-accent text-bg1 font-bold'
                : 'text-fg2 hover:text-fg1 hover:bg-bg3'
            }`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
