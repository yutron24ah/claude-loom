/**
 * TDD RED: AgentDetailNotes component tests
 * WHY: verify notes section renders, add note form works, and delete works.
 * Tests behavior, not implementation (SPEC Principle 8).
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock tRPC client — exposes note.list.useQuery and note.create.useMutation
// WHY: vi.hoisted ensures mocks are created before vi.mock factory runs
// ---------------------------------------------------------------------------
const { mockUseQuery, mockUseMutation, mockDeleteMutation } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
  mockUseMutation: vi.fn(),
  mockDeleteMutation: vi.fn(),
}));

vi.mock('@/trpc/client', () => ({
  trpc: {
    note: {
      list: {
        useQuery: mockUseQuery,
      },
      create: {
        useMutation: mockUseMutation,
      },
      delete: {
        useMutation: mockDeleteMutation,
      },
    },
    useUtils: vi.fn(() => ({
      note: {
        list: { invalidate: vi.fn() },
      },
    })),
  },
  wsClient: {},
  trpcClient: {},
}));

// Import AFTER mock setup
import { AgentDetailNotes } from '../../src/views/room/AgentDetailNotes';

afterEach(() => {
  cleanup();
});

const mockMutate = vi.fn();
const mockDeleteMutate = vi.fn();

// covers: AD-NOTES-01
describe('AgentDetailNotes — basic render', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    mockUseMutation.mockReturnValue({ mutate: mockMutate, isPending: false });
    mockDeleteMutation.mockReturnValue({ mutate: mockDeleteMutate, isPending: false });
  });

  it('renders agent-notes-section data-testid', () => {
    render(<AgentDetailNotes agentId="agent-123" />);
    expect(screen.getByTestId('agent-notes-section')).toBeInTheDocument();
  });

  it('renders add note button with data-testid', () => {
    render(<AgentDetailNotes agentId="agent-123" />);
    expect(screen.getByTestId('agent-note-add-button')).toBeInTheDocument();
  });

  it('shows empty state when no notes', () => {
    render(<AgentDetailNotes agentId="agent-123" />);
    // No note items should be present when data is empty
    expect(screen.queryAllByTestId('agent-note-item')).toHaveLength(0);
  });
});

describe('AgentDetailNotes — notes list display', () => {
  beforeEach(() => {
    mockUseMutation.mockReturnValue({ mutate: mockMutate, isPending: false });
    mockDeleteMutation.mockReturnValue({ mutate: mockDeleteMutate, isPending: false });
  });

  it('renders note items when data is present', () => {
    mockUseQuery.mockReturnValue({
      data: [
        { id: 1, attachedType: 'subagent', attachedId: 'agent-123', content: 'First note', createdAt: new Date('2024-01-01') },
        { id: 2, attachedType: 'subagent', attachedId: 'agent-123', content: 'Second note', createdAt: new Date('2024-01-02') },
      ],
      isLoading: false,
    });
    render(<AgentDetailNotes agentId="agent-123" />);
    const items = screen.getAllByTestId('agent-note-item');
    expect(items).toHaveLength(2);
  });

  it('renders note content text', () => {
    mockUseQuery.mockReturnValue({
      data: [
        { id: 1, attachedType: 'subagent', attachedId: 'agent-123', content: 'Important observation', createdAt: new Date('2024-01-01') },
      ],
      isLoading: false,
    });
    render(<AgentDetailNotes agentId="agent-123" />);
    expect(screen.getByText('Important observation')).toBeInTheDocument();
  });
});

describe('AgentDetailNotes — add note form', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    mockUseMutation.mockReturnValue({ mutate: mockMutate, isPending: false });
    mockDeleteMutation.mockReturnValue({ mutate: mockDeleteMutate, isPending: false });
    mockMutate.mockClear();
  });

  it('shows textarea after clicking add note button', () => {
    render(<AgentDetailNotes agentId="agent-123" />);
    // Textarea should not be visible initially
    expect(screen.queryByTestId('agent-note-textarea')).not.toBeInTheDocument();
    // Click add button
    fireEvent.click(screen.getByTestId('agent-note-add-button'));
    // Textarea should appear
    expect(screen.getByTestId('agent-note-textarea')).toBeInTheDocument();
  });

  it('calls create mutation when submitting note text', async () => {
    render(<AgentDetailNotes agentId="agent-123" />);
    // Open form
    fireEvent.click(screen.getByTestId('agent-note-add-button'));
    // Type content
    const textarea = screen.getByTestId('agent-note-textarea');
    fireEvent.change(textarea, { target: { value: 'New note content' } });
    // Submit (press Enter or click save button)
    const saveButton = screen.getByTestId('agent-note-save-button');
    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          attachedType: 'subagent',
          attachedId: 'agent-123',
          content: 'New note content',
        })
      );
    });
  });

  it('hides form after save', async () => {
    render(<AgentDetailNotes agentId="agent-123" />);
    fireEvent.click(screen.getByTestId('agent-note-add-button'));
    const textarea = screen.getByTestId('agent-note-textarea');
    fireEvent.change(textarea, { target: { value: 'Test note' } });
    fireEvent.click(screen.getByTestId('agent-note-save-button'));
    await waitFor(() => {
      expect(screen.queryByTestId('agent-note-textarea')).not.toBeInTheDocument();
    });
  });
});

describe('AgentDetailNotes — delete note', () => {
  beforeEach(() => {
    mockUseMutation.mockReturnValue({ mutate: mockMutate, isPending: false });
    mockDeleteMutation.mockReturnValue({ mutate: mockDeleteMutate, isPending: false });
    mockDeleteMutate.mockClear();
  });

  it('calls delete mutation when delete button clicked', async () => {
    mockUseQuery.mockReturnValue({
      data: [
        { id: 42, attachedType: 'subagent', attachedId: 'agent-123', content: 'A note to delete', createdAt: new Date('2024-01-01') },
      ],
      isLoading: false,
    });
    render(<AgentDetailNotes agentId="agent-123" />);
    const deleteButton = screen.getByTestId('agent-note-delete-42');
    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(mockDeleteMutate).toHaveBeenCalledWith({ id: 42 });
    });
  });
});

describe('AgentDetailNotes — useNoteMutations hook integration', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    mockUseMutation.mockReturnValue({ mutate: mockMutate, isPending: false });
    mockDeleteMutation.mockReturnValue({ mutate: mockDeleteMutate, isPending: false });
  });

  it('queries notes with correct attachedType and agentId', () => {
    render(<AgentDetailNotes agentId="specific-agent-id" />);
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        attachedType: 'subagent',
        attachedId: 'specific-agent-id',
      })
    );
  });
});

describe('AgentDetailNotes — empty/whitespace guard (MEDIUM fix)', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    mockUseMutation.mockReturnValue({ mutate: mockMutate, isPending: false });
    mockDeleteMutation.mockReturnValue({ mutate: mockDeleteMutate, isPending: false });
    mockMutate.mockClear();
  });

  it('does not call create mutation when note text is empty', async () => {
    render(<AgentDetailNotes agentId="agent-123" />);
    // Open form
    fireEvent.click(screen.getByTestId('agent-note-add-button'));
    // Leave textarea empty, click save
    fireEvent.click(screen.getByTestId('agent-note-save-button'));
    // mutation must NOT be called
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('does not call create mutation when note text is whitespace-only', async () => {
    render(<AgentDetailNotes agentId="agent-123" />);
    // Open form
    fireEvent.click(screen.getByTestId('agent-note-add-button'));
    // Type only whitespace
    const textarea = screen.getByTestId('agent-note-textarea');
    fireEvent.change(textarea, { target: { value: '   \n  \t  ' } });
    // Click save
    fireEvent.click(screen.getByTestId('agent-note-save-button'));
    // mutation must NOT be called
    expect(mockMutate).not.toHaveBeenCalled();
  });
});

describe('AgentDetailNotes — cancel button (LOW fix)', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    mockUseMutation.mockReturnValue({ mutate: mockMutate, isPending: false });
    mockDeleteMutation.mockReturnValue({ mutate: mockDeleteMutate, isPending: false });
    mockMutate.mockClear();
  });

  it('hides form when cancel button is clicked', async () => {
    render(<AgentDetailNotes agentId="agent-123" />);
    // Open form
    fireEvent.click(screen.getByTestId('agent-note-add-button'));
    expect(screen.getByTestId('agent-note-textarea')).toBeInTheDocument();
    // Click cancel
    fireEvent.click(screen.getByTestId('agent-note-cancel-button'));
    // Form must be hidden
    await waitFor(() => {
      expect(screen.queryByTestId('agent-note-textarea')).not.toBeInTheDocument();
    });
  });

  it('clears note text when cancel button is clicked', async () => {
    render(<AgentDetailNotes agentId="agent-123" />);
    // Open form, type something
    fireEvent.click(screen.getByTestId('agent-note-add-button'));
    const textarea = screen.getByTestId('agent-note-textarea');
    fireEvent.change(textarea, { target: { value: 'draft text' } });
    // Cancel
    fireEvent.click(screen.getByTestId('agent-note-cancel-button'));
    // Re-open form — textarea should be blank
    fireEvent.click(screen.getByTestId('agent-note-add-button'));
    const textarea2 = screen.getByTestId('agent-note-textarea');
    expect((textarea2 as HTMLTextAreaElement).value).toBe('');
  });
});

describe('AgentDetailNotes — time-ascending sort (LOW fix)', () => {
  beforeEach(() => {
    mockUseMutation.mockReturnValue({ mutate: mockMutate, isPending: false });
    mockDeleteMutation.mockReturnValue({ mutate: mockDeleteMutate, isPending: false });
  });

  it('renders notes in time-ascending order regardless of data order', () => {
    // Data arrives newest-first — component must sort oldest-first
    mockUseQuery.mockReturnValue({
      data: [
        { id: 3, attachedType: 'subagent', attachedId: 'agent-123', content: 'Third note', createdAt: new Date('2024-01-03') },
        { id: 1, attachedType: 'subagent', attachedId: 'agent-123', content: 'First note', createdAt: new Date('2024-01-01') },
        { id: 2, attachedType: 'subagent', attachedId: 'agent-123', content: 'Second note', createdAt: new Date('2024-01-02') },
      ],
      isLoading: false,
    });
    render(<AgentDetailNotes agentId="agent-123" />);
    const items = screen.getAllByTestId('agent-note-item');
    expect(items).toHaveLength(3);
    // First rendered item should have the oldest content
    expect(items[0]).toHaveTextContent('First note');
    expect(items[1]).toHaveTextContent('Second note');
    expect(items[2]).toHaveTextContent('Third note');
  });
});
