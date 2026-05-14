/**
 * AppShell (proposed v2) — overlay routing removed.
 *
 * Diff vs current ui/src/routing/AppShell.tsx:
 *
 * 1. NAV_GROUPS moved to ui/src/routing/constants.ts (G6).
 *
 * 2. Outlet is no longer mounted as a full-screen overlay.
 *    Old:  always render <RoomView/> at z-0; if pathname !== '/' overlay <Outlet/>
 *    New:  if pathname === '/' render <RoomView/>; otherwise render <Outlet/>
 *    WHY: the user confirmed this was unintentional. The overlay caused
 *    Drawer active state to be invisible (Room "shows through") and made
 *    every panel a modal, which is wrong. Routes are sibling screens.
 *
 * 3. Inline style objects gone — all sizing/colors via classes in shell.css.
 *    Only the dynamic right-column width and the drawer width animation use
 *    style props (because they depend on react state / responsive measure).
 *
 * 4. Escape-key handler removed — there's nothing to dismiss anymore.
 *
 * 5. PM-chat / LiveRail switch: when pm.running is false, mount <LiveRail/>
 *    instead of leaving the right column empty.
 */
import { useState } from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { RoomView } from '../views/room/RoomView';
import { LiveRail } from '../views/room/LiveRail';
import { ToastContainer } from '../notifications/ToastContainer';
import { PMChatPanel } from '../views/pm-chat/PMChatPanel';
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { DisciplineMetrics, ConnectionStatus } from '@claude-loom/redesign/api/types';
import { usePMSession } from '../live/usePMSession';
import { NAV_GROUPS, SCENARIO_KEYS, APP_COPY } from './constants';

/** Right column width — matches redesign/screens/room.jsx CHAT_W constant. */
const PM_PANEL_W = 340;
const LIVE_RAIL_W = 280;

// ---------------------------------------------------------------------------
// TopBar
// ---------------------------------------------------------------------------
interface TopBarProps {
  project: string;
  conn: ConnectionStatus;
  metrics: DisciplineMetrics;
  onDrawerToggle: () => void;
}

function TopBar({ project, conn, metrics, onDrawerToggle }: TopBarProps): JSX.Element {
  const metricClass = (ok: boolean, warn?: boolean) => (warn ? 'warn' : ok ? 'ok' : 'err');
  return (
    <div data-testid="topbar" className="top">
      <button
        data-testid="topbar-drawer-toggle"
        className="top__menu"
        onClick={onDrawerToggle}
        title={APP_COPY.drawerToggleTitle}
        aria-label={APP_COPY.drawerToggleTitle}
      >
        ☰
      </button>
      <div data-testid="topbar-brand" className="top__brand">
        <div className="logo" />
        {APP_COPY.brand}
      </div>
      <button data-testid="topbar-project" className="top__pj" title={APP_COPY.projectSwitcherTitle}>
        ◆ {project} <span className="top__pj-caret">▾</span>
      </button>
      <div className="top__metrics">
        <div data-testid="metric-parallel" className="m">
          PARALLEL{' '}
          <span className={`v ${metricClass(metrics.parallel >= 0.5)}`}>
            {Math.round(metrics.parallel * 100)}%
          </span>
        </div>
        <div data-testid="metric-task-tool" className="m">
          TASK TOOL <span className={`v ${metrics.taskTool}`}>{metrics.taskToolLabel}</span>
        </div>
        <div data-testid="metric-tdd-order" className="m">
          TDD ORDER{' '}
          <span className={`v ${metricClass(!metrics.tddViolations)}`}>
            {metrics.tddViolations} VIOLATIONS
          </span>
        </div>
        <div data-testid="metric-verdict" className="m">
          VERDICT{' '}
          <span className={`v ${metrics.verdict === 'PASS' ? 'ok' : 'err'}`}>
            {metrics.verdict}
          </span>
        </div>
      </div>
      <div data-testid="topbar-conn" className="top__conn">
        <span className={`dot ${conn === 'connected' ? 'busy' : 'fail'}`} />
        <span>{conn === 'connected' ? APP_COPY.wsConnected : APP_COPY.wsReconnecting}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drawer
// ---------------------------------------------------------------------------
interface DrawerProps {
  collapsed: boolean;
  pathname: string;
}

function Drawer({ collapsed, pathname }: DrawerProps): JSX.Element {
  return (
    <div
      data-testid="drawer"
      data-collapsed={collapsed ? 'true' : undefined}
      className={`drawer${collapsed ? ' collapsed' : ''}`}
    >
      {NAV_GROUPS.map((group) => (
        <div key={group.id}>
          <div data-testid={`drawer-group-${group.id}`} className="drawer__group">
            {group.label}
          </div>
          {group.items.map((item) => {
            const isActive =
              item.id === 'room'
                ? pathname === '/'
                : pathname === item.path || pathname.startsWith(item.path + '/');
            return (
              <NavLink
                key={item.id}
                to={item.path}
                data-testid={`nav-link-${item.id}`}
                className={`nav-link${isActive ? ' active' : ''}`}
                end={item.id === 'room'}
                title={item.label}
              >
                <span className="ico">{item.ico}</span>
                {!collapsed && <span className="lbl">{item.label}</span>}
              </NavLink>
            );
          })}
        </div>
      ))}
      <div className="drawer__spacer" />
      {!collapsed && <div className="drawer__group drawer__version">{APP_COPY.versionLine}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatusBar
// ---------------------------------------------------------------------------
interface StatusBarProps {
  label: string;
  project: string;
  conn: ConnectionStatus;
}

function StatusBar({ label, project, conn }: StatusBarProps): JSX.Element {
  return (
    <div data-testid="statusbar" className="statusbar">
      <span className="seg">
        <span className={`dot ${conn === 'connected' ? 'busy' : 'fail'}`} />
        {conn === 'connected' ? APP_COPY.wsConnected : APP_COPY.wsReconnecting}
      </span>
      <span className="seg">
        scenario: <strong className="statusbar__scenario">{label}</strong>
      </span>
      <span className="seg">events seen</span>
      <span className="right">
        {APP_COPY.brand} @ <code>~/work/{project}</code>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScenarioPicker
// ---------------------------------------------------------------------------
interface ScenarioPickerProps {
  rightOffset: number;
}

function ScenarioPicker({ rightOffset }: ScenarioPickerProps): JSX.Element {
  const current =
    typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('mock') ?? '')
      : '';

  function activate(key: string): void {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (key) url.searchParams.set('mock', key);
    else url.searchParams.delete('mock');
    window.history.replaceState(null, '', url.toString());
    window.dispatchEvent(new Event('popstate'));
  }

  return (
    <div
      data-testid="scenario-picker"
      className={`scenario-picker${rightOffset === 8 ? ' no-rail' : ''}`}
      style={{ right: rightOffset }} /* WHY inline: depends on right-column width */
    >
      <span className="scenario-picker__label">SCENARIO</span>
      {SCENARIO_KEYS.map((k) => (
        <button
          key={k}
          className={`scenario-picker__btn${current === k ? ' on' : ''}`}
          onClick={() => activate(k)}
        >
          {k}
        </button>
      ))}
      <button
        className={`scenario-picker__btn${current === '' ? ' on' : ''}`}
        onClick={() => activate('')}
      >
        live
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AppShell
// ---------------------------------------------------------------------------
export function AppShell(): JSX.Element {
  const location = useLocation();
  const scenario = useScenario();
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [liveRailCollapsed, setLiveRailCollapsed] = useState(false);

  const pmSession = usePMSession();
  const showPmPanel =
    scenario.pm.running || scenario.pm.pendingApprovals.length > 0;
  const showLiveRail = !showPmPanel && !liveRailCollapsed && location.pathname === '/';

  // right-column reserved width — used to push ScenarioPicker left
  const rightColumnWidth = showPmPanel
    ? PM_PANEL_W
    : showLiveRail
      ? LIVE_RAIL_W
      : 0;

  const isRoom = location.pathname === '/';

  return (
    <div className="shell">
      <TopBar
        project={scenario.project}
        conn={scenario.conn}
        metrics={scenario.disciplineMetrics}
        onDrawerToggle={() => setDrawerCollapsed((c) => !c)}
      />
      <div className="main">
        <Drawer collapsed={drawerCollapsed} pathname={location.pathname} />
        <div className="content">
          {/* Route-driven content — Room or any other screen, *never* both */}
          {/* WHY wrapper: RoomView ResizeObserver observes the wrapper's contentRect;
              marginRight reserves space for the right column (PMChat / LiveRail)
              so LiveRail/PMChatPanel overlay (right: 0) does not cover PM desk
              (positions.pm.x = W*0.78). Dropped accidentally in proposed port. */}
          {isRoom ? (
            <div style={{ position: 'absolute', inset: 0, marginRight: rightColumnWidth }}>
              <RoomView />
            </div>
          ) : <Outlet />}

          {/* Right column: PMChat or LiveRail (Room only) */}
          {showPmPanel && (
            <div
              data-testid="pm-chat-right-column"
              className="right-column"
              style={{ width: PM_PANEL_W }}
            >
              <PMChatPanel
                pm={scenario.pm}
                stream={scenario.stream}
                onSend={(t) => pmSession.say(t)}
                onStart={() => pmSession.start()}
                onPermission={(id, allow) => pmSession.permission(id, allow)}
              />
            </div>
          )}
          {showLiveRail && (
            <LiveRail
              stream={scenario.stream}
              collapsed={false}
              onToggle={() => setLiveRailCollapsed(true)}
            />
          )}
          {!showPmPanel && liveRailCollapsed && isRoom && (
            <button className="rail-toggle" onClick={() => setLiveRailCollapsed(false)}>
              ⚡ LIVE
            </button>
          )}

          {isRoom && <ScenarioPicker rightOffset={rightColumnWidth + 8} />}
          <ToastContainer />
        </div>
      </div>
      <StatusBar label={scenario.label} project={scenario.project} conn={scenario.conn} />
    </div>
  );
}
