/**
 * ConsistencyView M4 t5 TDD tests — RED phase.
 *
 * WHY: Verify extended ConsistencyView:
 *   1. severity-group-{high|medium|low} sections exist (data-testid)
 *   2. status filter controls change displayed findings
 *   3. action buttons trigger mutations (useConsistencyMutations)
 *   4. live data from useConsistencyFindings renders correctly
 *   5. loading / error / empty states
 *
 * Follows plan-live.test.tsx pattern: vi.mock hooks, test behavior not impl.
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { ConsistencyFinding } from '@claude-loom/daemon';

// ---------------------------------------------------------------------------
// Hoist mock factories before vi.mock calls
// ---------------------------------------------------------------------------
const {
  mockUseConsistencyFindings,
  mockUseConsistencyMutations,
  mockAcknowledge,
  mockMarkFixed,
  mockDismiss,
  mockOpenInEditor,
} = vi.hoisted(() => {
  const mockAcknowledge = vi.fn();
  const mockMarkFixed = vi.fn();
  const mockDismiss = vi.fn();
  const mockOpenInEditor = vi.fn();
  const mockUseConsistencyMutations = vi.fn(() => ({
    acknowledgeFinding: mockAcknowledge,
    markFindingFixed: mockMarkFixed,
    dismissFinding: mockDismiss,
    openInEditor: mockOpenInEditor,
    isAcknowledgePending: false,
    isMarkFixedPending: false,
    isDismissPending: false,
  }));
  const mockUseConsistencyFindings = vi.fn(() => ({
    data: undefined,
    isLoading: true,
    error: null,
  }));
  return {
    mockUseConsistencyFindings,
    mockUseConsistencyMutations,
    mockAcknowledge,
    mockMarkFixed,
    mockDismiss,
    mockOpenInEditor,
  };
});

vi.mock('@/live/useConsistencyFindings', () => ({
  useConsistencyFindings: mockUseConsistencyFindings,
}));

vi.mock('@/live/useConsistencyMutations', () => ({
  useConsistencyMutations: mockUseConsistencyMutations,
}));

// Import AFTER mocks are set up
import { ConsistencyViewLive } from '../../src/views/consistency/ConsistencyViewLive';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mockUseConsistencyFindings.mockClear();
  mockUseConsistencyMutations.mockClear();
  mockAcknowledge.mockClear();
  mockMarkFixed.mockClear();
  mockDismiss.mockClear();
  mockOpenInEditor.mockClear();
  // Default: no-op mutations
  mockUseConsistencyMutations.mockReturnValue({
    acknowledgeFinding: mockAcknowledge,
    markFindingFixed: mockMarkFixed,
    dismissFinding: mockDismiss,
    openInEditor: mockOpenInEditor,
    isAcknowledgePending: false,
    isMarkFixedPending: false,
    isDismissPending: false,
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConsistencyFinding(overrides: Partial<ConsistencyFinding> = {}): ConsistencyFinding {
  return {
    id: 1,
    specChangeId: 1,
    targetPath: 'docs/SPEC.md',
    severity: 'high',
    findingType: 'section_changed',
    description: 'Test finding description',
    suggestedChange: 'Fix it',
    status: 'open',
    createdAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('ConsistencyViewLive — loading state', () => {
  it('shows loading indicator when isLoading is true', () => {
    mockUseConsistencyFindings.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<ConsistencyViewLive />);
    expect(screen.getByTestId('consistency-loading')).toBeInTheDocument();
  });

  it('does not show finding rows while loading', () => {
    mockUseConsistencyFindings.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { container } = render(<ConsistencyViewLive />);
    expect(container.querySelectorAll('[data-testid="finding-row"]').length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

describe('ConsistencyViewLive — error state', () => {
  it('shows error message when error is set', () => {
    mockUseConsistencyFindings.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('connection failed'),
    });
    render(<ConsistencyViewLive />);
    expect(screen.getByTestId('consistency-error')).toBeInTheDocument();
  });

  it('does not show finding rows on error', () => {
    mockUseConsistencyFindings.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('failed'),
    });
    const { container } = render(<ConsistencyViewLive />);
    expect(container.querySelectorAll('[data-testid="finding-row"]').length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('ConsistencyViewLive — empty state', () => {
  it('shows empty state when data is empty array', () => {
    mockUseConsistencyFindings.mockReturnValue({ data: [], isLoading: false, error: null });
    render(<ConsistencyViewLive />);
    expect(screen.getByTestId('consistency-empty')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Severity grouping
// ---------------------------------------------------------------------------

describe('ConsistencyViewLive — severity grouping', () => {
  it('renders severity-group-high section when high findings exist', () => {
    const findings = [
      makeConsistencyFinding({ id: 1, severity: 'high', status: 'open' }),
    ];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    render(<ConsistencyViewLive />);
    expect(screen.getByTestId('severity-group-high')).toBeInTheDocument();
  });

  it('renders severity-group-medium section when medium findings exist', () => {
    const findings = [
      makeConsistencyFinding({ id: 2, severity: 'medium', status: 'open' }),
    ];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    render(<ConsistencyViewLive />);
    expect(screen.getByTestId('severity-group-medium')).toBeInTheDocument();
  });

  it('renders severity-group-low section when low findings exist', () => {
    const findings = [
      makeConsistencyFinding({ id: 3, severity: 'low', status: 'open' }),
    ];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    render(<ConsistencyViewLive />);
    expect(screen.getByTestId('severity-group-low')).toBeInTheDocument();
  });

  it('does not render severity-group-high when no high findings', () => {
    const findings = [
      makeConsistencyFinding({ id: 1, severity: 'low', status: 'open' }),
    ];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    render(<ConsistencyViewLive />);
    expect(screen.queryByTestId('severity-group-high')).not.toBeInTheDocument();
  });

  it('renders all 3 severity groups when mixed findings present', () => {
    const findings = [
      makeConsistencyFinding({ id: 1, severity: 'high', status: 'open' }),
      makeConsistencyFinding({ id: 2, severity: 'medium', status: 'open' }),
      makeConsistencyFinding({ id: 3, severity: 'low', status: 'open' }),
    ];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    render(<ConsistencyViewLive />);
    expect(screen.getByTestId('severity-group-high')).toBeInTheDocument();
    expect(screen.getByTestId('severity-group-medium')).toBeInTheDocument();
    expect(screen.getByTestId('severity-group-low')).toBeInTheDocument();
  });

  it('renders finding-row elements for each finding', () => {
    const findings = [
      makeConsistencyFinding({ id: 1, severity: 'high', status: 'open' }),
      makeConsistencyFinding({ id: 2, severity: 'medium', status: 'open' }),
    ];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    const { container } = render(<ConsistencyViewLive />);
    expect(container.querySelectorAll('[data-testid="finding-row"]').length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Status filter
// ---------------------------------------------------------------------------

describe('ConsistencyViewLive — status filter', () => {
  it('renders status filter control', () => {
    mockUseConsistencyFindings.mockReturnValue({ data: [], isLoading: false, error: null });
    render(<ConsistencyViewLive />);
    expect(screen.getByTestId('status-filter')).toBeInTheDocument();
  });

  it('shows all findings by default (no filter)', () => {
    const findings = [
      makeConsistencyFinding({ id: 1, severity: 'high', status: 'open' }),
      makeConsistencyFinding({ id: 2, severity: 'medium', status: 'acknowledged' }),
      makeConsistencyFinding({ id: 3, severity: 'low', status: 'fixed' }),
    ];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    const { container } = render(<ConsistencyViewLive />);
    expect(container.querySelectorAll('[data-testid="finding-row"]').length).toBe(3);
  });

  it('filters to only open findings when open filter selected', () => {
    const findings = [
      makeConsistencyFinding({ id: 1, severity: 'high', status: 'open' }),
      makeConsistencyFinding({ id: 2, severity: 'medium', status: 'acknowledged' }),
      makeConsistencyFinding({ id: 3, severity: 'low', status: 'fixed' }),
    ];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    const { container } = render(<ConsistencyViewLive />);

    const filter = screen.getByTestId('status-filter');
    fireEvent.change(filter, { target: { value: 'open' } });

    expect(container.querySelectorAll('[data-testid="finding-row"]').length).toBe(1);
  });

  it('filters to only acknowledged findings when acknowledged filter selected', () => {
    const findings = [
      makeConsistencyFinding({ id: 1, severity: 'high', status: 'open' }),
      makeConsistencyFinding({ id: 2, severity: 'medium', status: 'acknowledged' }),
      makeConsistencyFinding({ id: 3, severity: 'low', status: 'acknowledged' }),
    ];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    const { container } = render(<ConsistencyViewLive />);

    const filter = screen.getByTestId('status-filter');
    fireEvent.change(filter, { target: { value: 'acknowledged' } });

    expect(container.querySelectorAll('[data-testid="finding-row"]').length).toBe(2);
  });

  // Finding #10 (LOW): filter yields empty — filter-specific message shown
  it('shows filter-specific empty message when filter yields no results', () => {
    const findings = [
      makeConsistencyFinding({ id: 1, severity: 'high', status: 'open' }),
    ];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    render(<ConsistencyViewLive />);

    const filter = screen.getByTestId('status-filter');
    fireEvent.change(filter, { target: { value: 'fixed' } });

    // Should show filter-specific message, not the "no findings" message
    const emptyEl = screen.getByTestId('consistency-empty');
    expect(emptyEl).toBeInTheDocument();
    expect(emptyEl.textContent).toContain('フィルター');
  });
});

// ---------------------------------------------------------------------------
// Action buttons — mutation firing
// ---------------------------------------------------------------------------

describe('ConsistencyViewLive — action: Acknowledge', () => {
  it('renders action-ack button for open findings', () => {
    const findings = [makeConsistencyFinding({ id: 10, severity: 'high', status: 'open' })];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    render(<ConsistencyViewLive />);
    expect(screen.getByTestId('action-ack')).toBeInTheDocument();
  });

  it('clicking action-ack calls acknowledgeFinding with finding id', () => {
    const findings = [makeConsistencyFinding({ id: 10, severity: 'high', status: 'open' })];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    render(<ConsistencyViewLive />);

    fireEvent.click(screen.getByTestId('action-ack'));
    expect(mockAcknowledge).toHaveBeenCalledWith(10);
  });

  it('does not render action-ack for already acknowledged finding', () => {
    const findings = [makeConsistencyFinding({ id: 11, severity: 'high', status: 'acknowledged' })];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    render(<ConsistencyViewLive />);
    expect(screen.queryByTestId('action-ack')).not.toBeInTheDocument();
  });
});

describe('ConsistencyViewLive — action: Mark Fixed', () => {
  it('renders action-fix button for open findings', () => {
    const findings = [makeConsistencyFinding({ id: 10, severity: 'high', status: 'open' })];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    render(<ConsistencyViewLive />);
    expect(screen.getByTestId('action-fix')).toBeInTheDocument();
  });

  it('clicking action-fix calls markFindingFixed with finding id', () => {
    const findings = [makeConsistencyFinding({ id: 20, severity: 'medium', status: 'open' })];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    render(<ConsistencyViewLive />);

    fireEvent.click(screen.getByTestId('action-fix'));
    expect(mockMarkFixed).toHaveBeenCalledWith(20);
  });

  // Finding #7 (LOW): action-fix shown for acknowledged findings
  it('renders action-fix button for acknowledged findings', () => {
    const findings = [makeConsistencyFinding({ id: 11, severity: 'high', status: 'acknowledged' })];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    render(<ConsistencyViewLive />);
    expect(screen.getByTestId('action-fix')).toBeInTheDocument();
  });
});

describe('ConsistencyViewLive — action: Dismiss', () => {
  it('renders action-dismiss button for open findings', () => {
    const findings = [makeConsistencyFinding({ id: 10, severity: 'high', status: 'open' })];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    render(<ConsistencyViewLive />);
    expect(screen.getByTestId('action-dismiss')).toBeInTheDocument();
  });

  it('clicking action-dismiss calls dismissFinding with finding id', () => {
    const findings = [makeConsistencyFinding({ id: 30, severity: 'low', status: 'open' })];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    render(<ConsistencyViewLive />);

    fireEvent.click(screen.getByTestId('action-dismiss'));
    expect(mockDismiss).toHaveBeenCalledWith(30);
  });

  it('does not render action-dismiss for dismissed finding', () => {
    const findings = [makeConsistencyFinding({ id: 31, severity: 'high', status: 'dismissed' })];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    render(<ConsistencyViewLive />);
    expect(screen.queryByTestId('action-dismiss')).not.toBeInTheDocument();
  });
});

describe('ConsistencyViewLive — action: Open in Editor', () => {
  it('renders action-editor button for open findings', () => {
    const findings = [makeConsistencyFinding({ id: 10, severity: 'high', status: 'open' })];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    render(<ConsistencyViewLive />);
    expect(screen.getByTestId('action-editor')).toBeInTheDocument();
  });

  it('clicking action-editor calls openInEditor with finding targetPath', () => {
    const findings = [makeConsistencyFinding({ id: 40, severity: 'high', status: 'open', targetPath: 'docs/SPEC.md' })];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    render(<ConsistencyViewLive />);

    fireEvent.click(screen.getByTestId('action-editor'));
    expect(mockOpenInEditor).toHaveBeenCalledWith('docs/SPEC.md');
  });

  // Finding #8 (LOW): action-editor hidden for dismissed findings
  it('does not render action-editor for dismissed finding', () => {
    const findings = [makeConsistencyFinding({ id: 41, severity: 'high', status: 'dismissed' })];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    render(<ConsistencyViewLive />);
    expect(screen.queryByTestId('action-editor')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Data rendering
// ---------------------------------------------------------------------------

describe('ConsistencyViewLive — data rendering', () => {
  it('renders the consistency-view container', () => {
    mockUseConsistencyFindings.mockReturnValue({ data: [], isLoading: false, error: null });
    render(<ConsistencyViewLive />);
    expect(screen.getByTestId('consistency-view')).toBeInTheDocument();
  });

  it('renders finding description text', () => {
    const findings = [makeConsistencyFinding({ id: 1, description: 'A specific test description' })];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    render(<ConsistencyViewLive />);
    expect(screen.getByText('A specific test description')).toBeInTheDocument();
  });

  it('renders finding targetPath', () => {
    const findings = [makeConsistencyFinding({ id: 1, targetPath: 'agents/loom-developer.md' })];
    mockUseConsistencyFindings.mockReturnValue({ data: findings, isLoading: false, error: null });
    render(<ConsistencyViewLive />);
    expect(screen.getByText('agents/loom-developer.md')).toBeInTheDocument();
  });
});
