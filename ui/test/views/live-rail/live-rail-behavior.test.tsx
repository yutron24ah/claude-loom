/**
 * LiveRail — empty-stream hint, dedup, inline-removal, tab filter tests (m0.19-t7d)
 *
 * WHY: Verify that:
 *   LR-EMPTY-01:    When stream is empty, the rail shows a Japanese hint text
 *                   (「静かです…」+ /loom-go 案内).
 *   LR-DUP-01:      Duplicate stream entries with identical content are both
 *                   shown (no client-side dedup) — confirming the component
 *                   does not silently drop duplicate entries.
 *   LR-INLINE-01:   LiveRail uses the `.rail` container class (no "inline"
 *                   layout token present).
 *   LR-TAB-REASONING-01: reasoning tab shows only reason-kind items.
 *   LR-TAB-TOOLS-01:     tools tab shows only tool-kind items.
 *
 * Design source: ui/src/views/room/LiveRail.tsx
 * Principle §8: test behavior visible to users.
 */
// covers: LR-EMPTY-01, LR-DUP-01, LR-INLINE-01, LR-TAB-REASONING-01, LR-TAB-TOOLS-01
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { LiveRail } from '../../../src/views/room/LiveRail';
import type { StreamMsg } from '@claude-loom/redesign/api/types';

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TOOL_ITEM: StreamMsg = {
  kind: 'tool',
  ts: '09:00',
  who: 'dev',
  tool: 'Edit',
  text: 'editing plan.md',
};

const REASON_ITEM: StreamMsg = {
  kind: 'reason',
  ts: '09:01',
  who: 'dev',
  tool: undefined,
  text: 'refining approach',
};

const DUPLICATE_ITEM: StreamMsg = {
  kind: 'tool',
  ts: '09:02',
  who: 'dev',
  tool: 'Read',
  text: 'same text duplicate',
};

const DUPLICATE_ITEM_COPY: StreamMsg = {
  kind: 'tool',
  ts: '09:03',
  who: 'dev',
  tool: 'Read',
  text: 'same text duplicate',
};

const MIXED_STREAM: StreamMsg[] = [
  { kind: 'tool', ts: '10:00', who: 'dev', tool: 'Bash', text: 'run tests' },
  { kind: 'reason', ts: '10:01', who: 'dev', tool: undefined, text: 'thinking...' },
  { kind: 'tool', ts: '10:02', who: 'pm', tool: 'Edit', text: 'writing plan' },
  { kind: 'reason', ts: '10:03', who: 'pm', tool: undefined, text: 'analyzing...' },
];

// ---------------------------------------------------------------------------
// LR-EMPTY-01: Empty stream shows hint
// ---------------------------------------------------------------------------

describe('LiveRail — empty stream hint (LR-EMPTY-01)', () => {
  it('shows 静かです hint when stream is empty', () => {
    render(<LiveRail stream={[]} collapsed={false} onToggle={() => {}} />);
    expect(screen.getByText(/静かです/)).toBeInTheDocument();
  });

  it('shows /loom-go hint text in empty state', () => {
    render(<LiveRail stream={[]} collapsed={false} onToggle={() => {}} />);
    expect(screen.getByText(/loom-go/)).toBeInTheDocument();
  });

  it('does NOT show empty hint when stream has items', () => {
    render(<LiveRail stream={MIXED_STREAM} collapsed={false} onToggle={() => {}} />);
    expect(screen.queryByText(/静かです/)).toBeNull();
  });

  it('shows empty hint in reasoning tab when no reason-kind items', () => {
    // Only tool items → reasoning tab is empty
    render(
      <LiveRail
        stream={[TOOL_ITEM]}
        collapsed={false}
        onToggle={() => {}}
      />
    );
    fireEvent.click(screen.getByText('reasoning'));
    expect(screen.getByText(/静かです/)).toBeInTheDocument();
  });

  it('shows empty hint in tools tab when no tool-kind items', () => {
    // Only reason items → tools tab is empty
    render(
      <LiveRail
        stream={[REASON_ITEM]}
        collapsed={false}
        onToggle={() => {}}
      />
    );
    fireEvent.click(screen.getByText('tools'));
    expect(screen.getByText(/静かです/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// LR-DUP-01: Duplicate entries both shown (no silent dedup)
// ---------------------------------------------------------------------------

describe('LiveRail — duplicate entries shown (LR-DUP-01)', () => {
  it('renders both entries when two items have identical text', () => {
    const stream = [DUPLICATE_ITEM, DUPLICATE_ITEM_COPY];
    render(<LiveRail stream={stream} collapsed={false} onToggle={() => {}} />);
    // getAllByText returns both occurrences — dedup would return only 1
    const matches = screen.getAllByText('same text duplicate');
    expect(matches).toHaveLength(2);
  });

  it('renders N items when N items provided including duplicates', () => {
    const stream = [TOOL_ITEM, DUPLICATE_ITEM, DUPLICATE_ITEM_COPY, REASON_ITEM];
    const { container } = render(
      <LiveRail stream={stream} collapsed={false} onToggle={() => {}} />,
    );
    const lines = container.querySelectorAll('.rail__line');
    expect(lines).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// LR-INLINE-01: LiveRail uses rail container class (not inline layout)
// ---------------------------------------------------------------------------

describe('LiveRail — overlay/rail layout (LR-INLINE-01)', () => {
  it('renders a .rail container (column overlay, not inline in room grid)', () => {
    const { container } = render(
      <LiveRail stream={[]} collapsed={false} onToggle={() => {}} />,
    );
    // WHY: `.rail` is the class for the right-column overlay container.
    // If this were inline (rendered inside the room grid without its own column),
    // the class would differ. This confirms the overlay column pattern.
    const rail = container.querySelector('.rail');
    expect(rail).not.toBeNull();
  });

  it('renders nothing (null) when collapsed — overlay is fully unmounted', () => {
    const { container } = render(
      <LiveRail stream={[]} collapsed={true} onToggle={() => {}} />,
    );
    // No .rail element when collapsed (component returns null)
    expect(container.querySelector('.rail')).toBeNull();
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// LR-TAB-REASONING-01: reasoning tab shows only reason-kind items
// ---------------------------------------------------------------------------

describe('LiveRail — reasoning tab filter (LR-TAB-REASONING-01)', () => {
  it('reasoning tab shows only reason-kind items', () => {
    render(<LiveRail stream={MIXED_STREAM} collapsed={false} onToggle={() => {}} />);
    fireEvent.click(screen.getByText('reasoning'));
    expect(screen.getByText('thinking...')).toBeInTheDocument();
    expect(screen.getByText('analyzing...')).toBeInTheDocument();
    expect(screen.queryByText('run tests')).toBeNull();
    expect(screen.queryByText('writing plan')).toBeNull();
  });

  it('reasoning tab is active after clicking', () => {
    render(<LiveRail stream={MIXED_STREAM} collapsed={false} onToggle={() => {}} />);
    fireEvent.click(screen.getByText('reasoning'));
    expect(screen.getByText('reasoning').classList.contains('active')).toBe(true);
  });

  it('reasoning tab shows only 2 items from MIXED_STREAM (2 reason + 2 tool)', () => {
    const { container } = render(
      <LiveRail stream={MIXED_STREAM} collapsed={false} onToggle={() => {}} />,
    );
    fireEvent.click(screen.getByText('reasoning'));
    const lines = container.querySelectorAll('.rail__line');
    expect(lines).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// LR-TAB-TOOLS-01: tools tab shows only tool-kind items
// ---------------------------------------------------------------------------

describe('LiveRail — tools tab filter (LR-TAB-TOOLS-01)', () => {
  it('tools tab shows only tool-kind items', () => {
    render(<LiveRail stream={MIXED_STREAM} collapsed={false} onToggle={() => {}} />);
    fireEvent.click(screen.getByText('tools'));
    expect(screen.getByText('run tests')).toBeInTheDocument();
    expect(screen.getByText('writing plan')).toBeInTheDocument();
    expect(screen.queryByText('thinking...')).toBeNull();
    expect(screen.queryByText('analyzing...')).toBeNull();
  });

  it('tools tab is active after clicking', () => {
    render(<LiveRail stream={MIXED_STREAM} collapsed={false} onToggle={() => {}} />);
    fireEvent.click(screen.getByText('tools'));
    expect(screen.getByText('tools').classList.contains('active')).toBe(true);
  });

  it('tools tab shows only 2 items from MIXED_STREAM (2 tool + 2 reason)', () => {
    const { container } = render(
      <LiveRail stream={MIXED_STREAM} collapsed={false} onToggle={() => {}} />,
    );
    fireEvent.click(screen.getByText('tools'));
    const lines = container.querySelectorAll('.rail__line');
    expect(lines).toHaveLength(2);
  });

  it('switching from tools back to ALL shows all items', () => {
    render(<LiveRail stream={MIXED_STREAM} collapsed={false} onToggle={() => {}} />);
    fireEvent.click(screen.getByText('tools'));
    fireEvent.click(screen.getByText('ALL'));
    // After switching back to ALL, all 4 items should be visible
    expect(screen.getByText('run tests')).toBeInTheDocument();
    expect(screen.getByText('thinking...')).toBeInTheDocument();
    expect(screen.getByText('writing plan')).toBeInTheDocument();
    expect(screen.getByText('analyzing...')).toBeInTheDocument();
  });
});
