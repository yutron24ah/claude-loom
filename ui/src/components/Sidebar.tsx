/**
 * Sidebar — navigation links for claude-loom views.
 *
 * WHY: M5 t4. Centralises route navigation so users can access views
 * without typing paths directly. Uses React Router NavLink for
 * active state styling.
 *
 * M0.11.4 Phase C t16: RPG style — rpg-frame wrapping, dot for active/inactive
 * state, rpg-label for nav entry text.
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
      className="rpg-frame flex flex-col gap-sp-1 h-full"
    >
      {NAV_LINKS.map((link) => (
        <NavLink
          key={link.id}
          to={link.path}
          data-testid={`sidebar-link-${link.id}`}
          className={({ isActive }) =>
            `flex items-center gap-sp-2 px-sp-2 py-sp-1 transition-colors ${
              isActive
                ? 'bg-accent'
                : 'hover:bg-bg3'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {/* WHY: dot class for active/inactive state per RPG design language */}
              <span className={isActive ? 'dot busy' : 'dot idle'} />
              <span className="rpg-label">{link.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
