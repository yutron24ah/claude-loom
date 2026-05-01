/**
 * TDD test for useViewStore (view.ts)
 * WHY: verifies the pure UI state machine for agent selection and panel open/close
 * before any implementation exists (RED commit).
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Import will fail until view.ts is created — RED phase
import { useViewStore } from '@/store/view';

describe('useViewStore — initial state', () => {
  beforeEach(() => {
    useViewStore.setState({ selectedAgentId: null, panelOpen: false });
  });

  it('should have selectedAgentId null on init', () => {
    const { selectedAgentId } = useViewStore.getState();
    expect(selectedAgentId).toBeNull();
  });

  it('should have panelOpen false on init', () => {
    const { panelOpen } = useViewStore.getState();
    expect(panelOpen).toBe(false);
  });
});

describe('useViewStore — setSelectedAgentId', () => {
  beforeEach(() => {
    useViewStore.setState({ selectedAgentId: null, panelOpen: false });
  });

  it('should update selectedAgentId to the given id', () => {
    useViewStore.getState().setSelectedAgentId('agent-1');
    expect(useViewStore.getState().selectedAgentId).toBe('agent-1');
  });

  it('should allow clearing selectedAgentId back to null', () => {
    useViewStore.setState({ selectedAgentId: 'agent-1', panelOpen: true });
    useViewStore.getState().setSelectedAgentId(null);
    expect(useViewStore.getState().selectedAgentId).toBeNull();
  });

  it('should update to different agent ids', () => {
    useViewStore.getState().setSelectedAgentId('agent-1');
    useViewStore.getState().setSelectedAgentId('agent-2');
    expect(useViewStore.getState().selectedAgentId).toBe('agent-2');
  });
});

describe('useViewStore — setPanelOpen', () => {
  beforeEach(() => {
    useViewStore.setState({ selectedAgentId: null, panelOpen: false });
  });

  it('should set panelOpen to true', () => {
    useViewStore.getState().setPanelOpen(true);
    expect(useViewStore.getState().panelOpen).toBe(true);
  });

  it('should set panelOpen to false', () => {
    useViewStore.setState({ selectedAgentId: null, panelOpen: true });
    useViewStore.getState().setPanelOpen(false);
    expect(useViewStore.getState().panelOpen).toBe(false);
  });

  it('should toggle panelOpen multiple times correctly', () => {
    useViewStore.getState().setPanelOpen(true);
    useViewStore.getState().setPanelOpen(false);
    useViewStore.getState().setPanelOpen(true);
    expect(useViewStore.getState().panelOpen).toBe(true);
  });
});
