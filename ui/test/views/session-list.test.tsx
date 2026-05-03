/**
 * SessionListView TDD tests — RED phase (M3.2 t1).
 *
 * WHY: Verify that SessionListView renders filter/sort controls and
 * list rows, handles live subscription updates, and shows
 * loading/empty/error states correctly.
 *
 * SPEC §3.6.10 compliance: filter/sort values must come from constants/enums,
 * never raw string literals in implementation. Tests assert rendered values
 * without caring about internal enum naming.
 *
 * We mock useSessionList entirely so no WS connection is needed.
 * We test BEHAVIOR (visible UI states) not implementation internals.
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Session } from '@claude-loom/daemon';

// ---------------------------------------------------------------------------
// Mock useSessionList hook
// ---------------------------------------------------------------------------
const { mockUseSessionList } = vi.hoisted(() => ({
  mockUseSessionList: vi.fn(),
}));

vi.mock('@/live/useSessionList', () => ({
  useSessionList: mockUseSessionList,
}));

// Import after mock is set up
import { SessionListView } from '../../src/views/session-list/SessionListView';

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    sessionId: 'sess-001',
    projectId: 'claude-loom',
    worktreePath: '/repos/claude-loom',
    role: 'pm',
    status: 'active',
    startedAt: new Date('2026-05-02T10:00:00Z'),
    endedAt: null,
    lastSeenAt: new Date('2026-05-02T10:05:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Default mock setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockUseSessionList.mockClear();
  mockUseSessionList.mockReturnValue({
    sessions: [],
    isLoading: false,
    error: null,
    projectFilter: null,
    roleFilter: null,
    sortOrder: 'desc',
    setProjectFilter: vi.fn(),
    setRoleFilter: vi.fn(),
    toggleSortOrder: vi.fn(),
  });
});

// ---------------------------------------------------------------------------
// Basic render
// ---------------------------------------------------------------------------

describe('SessionListView — basic render', () => {
  it('renders session-list container', () => {
    render(<SessionListView />);
    expect(screen.getByTestId('session-list')).toBeInTheDocument();
  });

  it('renders project filter dropdown', () => {
    render(<SessionListView />);
    expect(screen.getByTestId('session-filter-project')).toBeInTheDocument();
  });

  it('renders role filter control', () => {
    render(<SessionListView />);
    expect(screen.getByTestId('session-filter-role')).toBeInTheDocument();
  });

  it('renders sort toggle button', () => {
    render(<SessionListView />);
    expect(screen.getByTestId('session-sort-toggle')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('SessionListView — loading state', () => {
  it('shows loading indicator when isLoading is true', () => {
    mockUseSessionList.mockReturnValue({
      sessions: [],
      isLoading: true,
      error: null,
      projectFilter: null,
      roleFilter: null,
      sortOrder: 'desc',
      setProjectFilter: vi.fn(),
      setRoleFilter: vi.fn(),
      toggleSortOrder: vi.fn(),
    });
    render(<SessionListView />);
    expect(screen.getByTestId('session-list-loading')).toBeInTheDocument();
  });

  it('does not show session rows when loading', () => {
    mockUseSessionList.mockReturnValue({
      sessions: [makeSession()],
      isLoading: true,
      error: null,
      projectFilter: null,
      roleFilter: null,
      sortOrder: 'desc',
      setProjectFilter: vi.fn(),
      setRoleFilter: vi.fn(),
      toggleSortOrder: vi.fn(),
    });
    render(<SessionListView />);
    expect(screen.queryAllByTestId('session-row')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

describe('SessionListView — error state', () => {
  it('shows error message when error is present', () => {
    mockUseSessionList.mockReturnValue({
      sessions: [],
      isLoading: false,
      error: new Error('Connection failed'),
      projectFilter: null,
      roleFilter: null,
      sortOrder: 'desc',
      setProjectFilter: vi.fn(),
      setRoleFilter: vi.fn(),
      toggleSortOrder: vi.fn(),
    });
    render(<SessionListView />);
    expect(screen.getByTestId('session-list-error')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('SessionListView — empty state', () => {
  it('shows empty state when sessions array is empty', () => {
    render(<SessionListView />);
    expect(screen.getByTestId('session-list-empty')).toBeInTheDocument();
  });

  it('does not show session rows when empty', () => {
    render(<SessionListView />);
    expect(screen.queryAllByTestId('session-row')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Session rows
// ---------------------------------------------------------------------------

describe('SessionListView — session rows', () => {
  it('renders one session-row per session', () => {
    mockUseSessionList.mockReturnValue({
      sessions: [
        makeSession({ sessionId: 'sess-001' }),
        makeSession({ sessionId: 'sess-002', role: 'dev_parent' }),
        makeSession({ sessionId: 'sess-003', status: 'ended', role: null }),
      ],
      isLoading: false,
      error: null,
      projectFilter: null,
      roleFilter: null,
      sortOrder: 'desc',
      setProjectFilter: vi.fn(),
      setRoleFilter: vi.fn(),
      toggleSortOrder: vi.fn(),
    });
    render(<SessionListView />);
    expect(screen.getAllByTestId('session-row')).toHaveLength(3);
  });

  it('does not show empty state when sessions are present', () => {
    mockUseSessionList.mockReturnValue({
      sessions: [makeSession()],
      isLoading: false,
      error: null,
      projectFilter: null,
      roleFilter: null,
      sortOrder: 'desc',
      setProjectFilter: vi.fn(),
      setRoleFilter: vi.fn(),
      toggleSortOrder: vi.fn(),
    });
    render(<SessionListView />);
    expect(screen.queryByTestId('session-list-empty')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Filter interaction
// ---------------------------------------------------------------------------

describe('SessionListView — filter interaction', () => {
  it('calls setProjectFilter when project dropdown changes', () => {
    const setProjectFilter = vi.fn();
    mockUseSessionList.mockReturnValue({
      sessions: [],
      isLoading: false,
      error: null,
      projectFilter: null,
      roleFilter: null,
      sortOrder: 'desc',
      setProjectFilter,
      setRoleFilter: vi.fn(),
      toggleSortOrder: vi.fn(),
    });
    render(<SessionListView />);
    const dropdown = screen.getByTestId('session-filter-project');
    fireEvent.change(dropdown, { target: { value: 'claude-loom' } });
    expect(setProjectFilter).toHaveBeenCalledWith('claude-loom');
  });

  it('calls setRoleFilter when role filter changes', () => {
    const setRoleFilter = vi.fn();
    mockUseSessionList.mockReturnValue({
      sessions: [],
      isLoading: false,
      error: null,
      projectFilter: null,
      roleFilter: null,
      sortOrder: 'desc',
      setProjectFilter: vi.fn(),
      setRoleFilter,
      toggleSortOrder: vi.fn(),
    });
    render(<SessionListView />);
    const roleFilter = screen.getByTestId('session-filter-role');
    fireEvent.change(roleFilter, { target: { value: 'pm' } });
    expect(setRoleFilter).toHaveBeenCalledWith('pm');
  });
});

// ---------------------------------------------------------------------------
// Sort toggle interaction
// ---------------------------------------------------------------------------

describe('SessionListView — sort toggle', () => {
  it('calls toggleSortOrder when sort toggle is clicked', () => {
    const toggleSortOrder = vi.fn();
    mockUseSessionList.mockReturnValue({
      sessions: [],
      isLoading: false,
      error: null,
      projectFilter: null,
      roleFilter: null,
      sortOrder: 'desc',
      setProjectFilter: vi.fn(),
      setRoleFilter: vi.fn(),
      toggleSortOrder,
    });
    render(<SessionListView />);
    const sortBtn = screen.getByTestId('session-sort-toggle');
    fireEvent.click(sortBtn);
    expect(toggleSortOrder).toHaveBeenCalledOnce();
  });

  it('shows current sort direction in sort toggle', () => {
    mockUseSessionList.mockReturnValue({
      sessions: [],
      isLoading: false,
      error: null,
      projectFilter: null,
      roleFilter: null,
      sortOrder: 'asc',
      setProjectFilter: vi.fn(),
      setRoleFilter: vi.fn(),
      toggleSortOrder: vi.fn(),
    });
    render(<SessionListView />);
    const sortBtn = screen.getByTestId('session-sort-toggle');
    expect(sortBtn.textContent).toMatch(/asc/i);
  });
});

// ---------------------------------------------------------------------------
// Live subscription update (behavior test)
// ---------------------------------------------------------------------------

describe('SessionListView — live update via subscription', () => {
  it('renders updated session list when hook returns new sessions', () => {
    // Initially empty
    mockUseSessionList.mockReturnValueOnce({
      sessions: [],
      isLoading: false,
      error: null,
      projectFilter: null,
      roleFilter: null,
      sortOrder: 'desc',
      setProjectFilter: vi.fn(),
      setRoleFilter: vi.fn(),
      toggleSortOrder: vi.fn(),
    });
    const { rerender } = render(<SessionListView />);
    expect(screen.queryAllByTestId('session-row')).toHaveLength(0);

    // Subscription delivers a new session — hook now returns 1 session
    mockUseSessionList.mockReturnValueOnce({
      sessions: [makeSession({ sessionId: 'new-sess' })],
      isLoading: false,
      error: null,
      projectFilter: null,
      roleFilter: null,
      sortOrder: 'desc',
      setProjectFilter: vi.fn(),
      setRoleFilter: vi.fn(),
      toggleSortOrder: vi.fn(),
    });
    rerender(<SessionListView />);
    expect(screen.getAllByTestId('session-row')).toHaveLength(1);
  });
});
