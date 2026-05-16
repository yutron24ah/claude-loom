/**
 * Route definitions for claude-loom UI.
 * WHY: Centralise all routes in one place — AppShell wraps them all
 * via nested Routes pattern. Room is the index (default) route.
 *
 * Route map:
 *   /                 → Room canvas only (no panel)
 *   /plan             → PlanView panel
 *   /gantt            → GanttView panel
 *   /retro            → RetroView panel
 *   /worktree         → WorktreeView panel
 *   /consistency      → ConsistencyView panel
 *   /customization    → CustomizationView panel
 *   /guidance         → LearnedGuidanceView panel
 *   /sessions         → SessionListView panel (M3.2 t1)
 *   /project-settings → ProjectSettingsView panel (M5 t3)
 *   /tokens           → TokenMeterView panel (M5 t4)
 *   /agents/:id       → AgentDetailPanel
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './AppShell';
import { PlanView } from '../views/plan/PlanView';
import { GanttView } from '../views/gantt/GanttView';
import { RetroView } from '../views/retro/RetroView';
import { WorktreeView } from '../views/worktree/WorktreeView';
import { ConsistencyView } from '../views/consistency/ConsistencyView';
import { CustomizationView } from '../views/customization/CustomizationView';
import { LearnedGuidanceView } from '../views/guidance/LearnedGuidanceView';
import { SessionListView } from '../views/session-list/SessionListView';
import { ProjectSettingsView } from '../views/project-settings/ProjectSettingsView';
import { TokenMeterView } from '../views/tokens/TokenMeterView';
import { AgentDetailPanel } from '../views/room/AgentDetailPanel';

export function AppRouter(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          {/* Index route: Room canvas with no panel overlay */}
          <Route index element={null} />
          {/* Sibling screen routes (M0.17 S2 sibling routing 化、AppShell が isRoom ? <RoomView /> : <Outlet /> で分岐) */}
          <Route path="plan" element={<PlanView />} />
          <Route path="gantt" element={<GanttView />} />
          <Route path="retro" element={<RetroView />} />
          <Route path="worktree" element={<WorktreeView />} />
          <Route path="consistency" element={<ConsistencyView />} />
          <Route path="customization" element={<CustomizationView />} />
          <Route path="guidance" element={<LearnedGuidanceView />} />
          {/* M3.2 t1: Session list view */}
          <Route path="sessions" element={<SessionListView />} />
          {/* M5 t3: Project settings view */}
          <Route path="project-settings" element={<ProjectSettingsView />} />
          {/* M5 t4: Token usage meter */}
          <Route path="tokens" element={<TokenMeterView />} />
          <Route path="agents/:id" element={<AgentDetailPanel />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
