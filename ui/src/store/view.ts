/**
 * View store — UI state for agent selection and panel open/close.
 * WHY: decouples the panel visibility and agent selection state from URL routing.
 * URL (react-router useLocation) remains the single source of truth for
 * "which route is active", but this store captures derived panel UI state
 * so components don't have to thread URL params through prop chains.
 *
 * Note: currentRoute is intentionally NOT stored here — use useLocation() from
 * react-router-dom to read the current route (one-way: URL → component, not store).
 */
import { create } from 'zustand';

interface ViewState {
  selectedAgentId: string | null;
  panelOpen: boolean;
  setSelectedAgentId: (id: string | null) => void;
  setPanelOpen: (open: boolean) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  selectedAgentId: null,
  panelOpen: false,

  setSelectedAgentId: (id: string | null) => {
    set({ selectedAgentId: id });
  },

  setPanelOpen: (open: boolean) => {
    set({ panelOpen: open });
  },
}));
