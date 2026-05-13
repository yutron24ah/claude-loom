/**
 * AppShell — redesign 全面移植 (M0.15 t14, REQ-075)
 *
 * WHY: Phase 4 — port redesign/Redesign App.html shell (TopBar + Drawer +
 * StatusBar + ScenarioPicker) to TypeScript/JSX using useScenario() as data
 * source. Replaces M0.11.4 hard-coded DisciplineHeader + Sidebar with the
 * redesign SSoT layout.
 *
 * Layout (grid 3-row: topbar / main / statusbar):
 *   - TopBar (36px): brand + project switcher + 4 metrics + conn + drawer toggle
 *   - Main row: Drawer (collapsible, 168px → 40px) + content area
 *     - Content: Room canvas (always mounted) + panel overlay + ScenarioPicker
 *     - Right column: PMChatPanel mount slot (z-5, 340px, t13 preserved)
 *   - StatusBar (24px): scenario label + events + project path
 *
 * Panel overlay routing (Hybrid C, unchanged from M0.11.4):
 *   - RoomView at z-0, always mounted
 *   - Route-specific panels at z-10 via Outlet
 *   - Escape key / background click → navigate('/')
 *
 * WHY no ConnectionBanner import: redesign TopBar shows conn status via
 * useScenario().conn. ConnectionBanner (which imports zustand connection store
 * → @claude-loom/daemon → zod) is superseded by the TopBar's conn dot.
 *
 * t13 PMChat panel mount slot is absolutely preserved: right column 340px,
 * z-5, showPmPanel condition, onSend/onStart/onPermission handlers unchanged.
 *
 * REQ-075: AppShell × redesign 全面移植
 */
import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { RoomView } from '../views/room/RoomView';
import { ToastContainer } from '../notifications/ToastContainer';
import { PMChatPanel } from '../views/pm-chat/PMChatPanel';
import { useScenario } from '@claude-loom/redesign/api/websocket';
import type { DisciplineMetrics, ConnectionStatus } from '@claude-loom/redesign/api/types';
import { usePMSession } from '../live/usePMSession';

// ---------------------------------------------------------------------------
// NAV_GROUPS — redesign SSoT (Redesign App.html NAV_GROUPS constant)
// 3 groups, 11 nav items total.
// ---------------------------------------------------------------------------
const NAV_GROUPS = [
  {
    id: 'operate',
    label: 'OPERATE',
    items: [
      { id: 'room',        path: '/',            ico: '▦', label: 'Room' },
      { id: 'plan',        path: '/plan',         ico: '≡', label: 'Plan' },
      { id: 'gantt',       path: '/gantt',        ico: '▭', label: 'Gantt' },
      { id: 'sessions',    path: '/sessions',     ico: '❐', label: 'Sessions' },
      { id: 'consistency', path: '/consistency',  ico: '△', label: 'Consistency' },
    ],
  },
  {
    id: 'manage',
    label: 'MANAGE',
    items: [
      { id: 'worktree',      path: '/worktree',      ico: '⌗', label: 'Worktree' },
      { id: 'retro',         path: '/retro',          ico: '◆', label: 'Retro' },
      { id: 'customization', path: '/customization',  ico: '✦', label: 'Customization' },
      { id: 'guidance',      path: '/guidance',       ico: '❉', label: 'Guidance' },
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

// ---------------------------------------------------------------------------
// TopBar — brand + project + 4 metrics + conn + drawer toggle
// ---------------------------------------------------------------------------
interface TopBarProps {
  project: string;
  conn: ConnectionStatus;
  metrics: DisciplineMetrics;
  onDrawerToggle: () => void;
}

function TopBar({ project, conn, metrics, onDrawerToggle }: TopBarProps): JSX.Element {
  // Derive metric value class: ok / warn / err
  function metricClass(ok: boolean, warn?: boolean): string {
    if (warn) return 'warn';
    return ok ? 'ok' : 'err';
  }

  return (
    <div
      data-testid="topbar"
      className="top"
    >
      {/* Drawer toggle */}
      <button
        data-testid="topbar-drawer-toggle"
        className="top__menu"
        onClick={onDrawerToggle}
        title="Toggle drawer"
        aria-label="Toggle drawer"
      >
        ☰
      </button>

      {/* Brand */}
      <div data-testid="topbar-brand" className="top__brand">
        <div className="logo" />
        claude-loom
      </div>

      {/* Project switcher */}
      <button data-testid="topbar-project" className="top__pj" title="プロジェクト切替">
        ◆ {project} <span style={{ color: 'var(--p-text-muted)' }}>▾</span>
      </button>

      {/* 4 discipline metrics */}
      <div className="top__metrics">
        <div data-testid="metric-parallel" className="m">
          PARALLEL{' '}
          <span className={`v ${metricClass(metrics.parallel >= 0.5)}`}>
            {Math.round(metrics.parallel * 100)}%
          </span>
        </div>
        <div data-testid="metric-task-tool" className="m">
          TASK TOOL{' '}
          <span className={`v ${metrics.taskTool}`}>{metrics.taskToolLabel}</span>
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

      {/* Connection status */}
      <div data-testid="topbar-conn" className="top__conn">
        <span className={`dot ${conn === 'connected' ? 'busy' : 'fail'}`} />
        <span>{conn === 'connected' ? 'WS connected' : '再接続中…'}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drawer — 11 nav links across 3 groups, collapsible
// ---------------------------------------------------------------------------
interface DrawerProps {
  collapsed: boolean;
  /** current pathname for active state highlight */
  pathname: string;
}

function Drawer({ collapsed, pathname }: DrawerProps): JSX.Element {
  return (
    <div
      data-testid="drawer"
      data-collapsed={collapsed ? 'true' : undefined}
      className={`drawer${collapsed ? ' collapsed' : ''}`}
      style={{ width: collapsed ? 40 : 168 }}
    >
      {NAV_GROUPS.map((group) => (
        <div key={group.id}>
          {/* Group label — hidden when collapsed */}
          <div
            data-testid={`drawer-group-${group.id}`}
            className="drawer__group"
          >
            {group.label}
          </div>

          {/* Nav items */}
          {group.items.map((item) => {
            // Room is the index route — active when pathname is exactly '/'
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
                // WHY: NavLink end prop only needed for the Room (index) route
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

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Version footer — hidden when collapsed */}
      {!collapsed && (
        <div className="drawer__group" style={{ paddingBottom: 8 }}>
          v0.15 · 127.0.0.1:5757
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatusBar — scenario label + events + project path
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
        {conn === 'connected' ? 'WS connected' : '再接続中…'}
      </span>
      <span className="seg">
        scenario: <strong style={{ color: 'var(--p-text)' }}>{label}</strong>
      </span>
      <span className="seg">events seen</span>
      <span className="right">
        claude-loom @ <code>~/work/{project}</code>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScenarioPicker — idle/active/failed scenario switcher (dev/QA tool)
// Positioned in content area; adjusts right offset when rail is open.
// ---------------------------------------------------------------------------
interface ScenarioPickerProps {
  rightOffset?: number;
}

function ScenarioPicker({ rightOffset = 8 }: ScenarioPickerProps): JSX.Element {
  const SCENARIO_KEYS = ['idle', 'active', 'failed'] as const;

  // WHY: ScenarioPicker only writes the ?mock= URL param — no state needed.
  // In test env window.location.search is undefined so we guard with '?'.
  const current =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('mock') ?? ''
      : '';

  function activate(key: string): void {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (key) {
      url.searchParams.set('mock', key);
    } else {
      url.searchParams.delete('mock');
    }
    window.history.replaceState(null, '', url.toString());
    window.dispatchEvent(new Event('popstate'));
  }

  return (
    <div
      data-testid="scenario-picker"
      className={`scenario-picker${rightOffset === 8 ? ' no-rail' : ''}`}
      style={{ right: rightOffset }}
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
// AppShell — main layout orchestrator
// ---------------------------------------------------------------------------

/** Right column width — matches redesign/screens/room.jsx CHAT_W constant. */
const PM_PANEL_W = 340;

export function AppShell(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const scenario = useScenario();

  // Drawer collapse state — starts expanded
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);

  // Panel is visible when we're not at the root route
  const isPanelOpen = location.pathname !== '/';

  // Escape key dismisses panel → navigate to root
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape' && isPanelOpen) {
        navigate('/');
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPanelOpen, navigate]);

  function handlePanelBackgroundClick(): void {
    navigate('/');
  }

  // PM chat handlers — wired through usePMSession tRPC mutations (Phase 5 t17).
  // WHY: replaces direct fetch() stubs with typed tRPC mutations. WS events
  // (applyPmMessage / applyPmPermissionResolved) continue to drive UI state.
  const pmSession = usePMSession();

  function handlePmSend(text: string): void {
    pmSession.say(text);
  }

  function handlePmStart(): void {
    pmSession.start();
  }

  function handlePmPermission(id: string, allow: boolean): void {
    pmSession.permission(id, allow);
  }

  // WHY: show PMChatPanel when PM is running or there are pending approvals.
  // Panel stays visible on pending approvals even if PM crashed.
  const showPmPanel = scenario.pm.running || scenario.pm.pendingApprovals.length > 0;

  const m = scenario.disciplineMetrics;

  return (
    <div
      className="shell"
      style={{ display: 'grid', gridTemplateRows: '36px 1fr 24px', height: '100vh' }}
    >
      {/* ── TopBar ── */}
      <TopBar
        project={scenario.project}
        conn={scenario.conn}
        metrics={m}
        onDrawerToggle={() => setDrawerCollapsed((c) => !c)}
      />

      {/* ── Main row (Drawer + Content) ── */}
      <div
        className="main"
        style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'auto 1fr', minHeight: 0 }}
      >
        {/* Drawer — left sidebar, collapsible */}
        <Drawer collapsed={drawerCollapsed} pathname={location.pathname} />

        {/* Content area — Room canvas + panel overlay + ScenarioPicker + PMChat */}
        <div
          className="content"
          style={{
            position: 'relative',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          {/* Room canvas — always mounted at z-0 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              marginRight: showPmPanel ? PM_PANEL_W : 0,
            }}
          >
            <RoomView />
          </div>

          {/* PMChatPanel right column mount slot (M0.15 t13 preserved).
              WHY z-5: between room canvas (z-0) and panel overlay (z-10).
              Interface: pm / stream / onSend / onStart / onPermission unchanged. */}
          {showPmPanel && (
            <div
              data-testid="pm-chat-right-column"
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: PM_PANEL_W,
                zIndex: 5,
              }}
            >
              <PMChatPanel
                pm={scenario.pm}
                stream={scenario.stream}
                onSend={handlePmSend}
                onStart={handlePmStart}
                onPermission={handlePmPermission}
              />
            </div>
          )}

          {/* Panel overlay — only when not at root route.
              WHY: room canvas visible behind semi-transparent overlay.
              Escape key / background click → navigate('/') */}
          {isPanelOpen && (
            <div
              data-testid="view-panel"
              role="dialog"
              aria-modal="true"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10,
                marginRight: showPmPanel ? PM_PANEL_W : 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className="bg-bg1/80 backdrop-blur-sm"
              onClick={handlePanelBackgroundClick}
            >
              <Outlet />
            </div>
          )}

          {/* ScenarioPicker — dev/QA scenario switcher, top-right of content */}
          <ScenarioPicker rightOffset={showPmPanel ? PM_PANEL_W + 8 : 8} />

          {/* Toast container — z-50 above all layers */}
          <ToastContainer />
        </div>
      </div>

      {/* ── StatusBar ── */}
      <StatusBar
        label={scenario.label}
        project={scenario.project}
        conn={scenario.conn}
      />
    </div>
  );
}
