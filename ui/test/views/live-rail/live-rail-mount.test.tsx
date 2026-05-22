/**
 * LiveRail mount + tab merged tests (M0.19 t6)
 *
 * WHY: Verify that:
 *   LR-MOUNT-01: LiveRail mounts and shows "⚡ LIVE STREAM" header when rendered
 *                in non-collapsed mode (the qa-suite case: scenario=idle, room mode)
 *   LR-TAB-MERGED-01: The merged (ALL) tab shows all stream items regardless of kind
 *
 * Design source: ui/src/views/room/LiveRail.tsx
 * The component is controlled by AppShell — these unit tests test LiveRail directly
 * with props to cover the mount/tab behavior at the unit level.
 */
// covers: LR-MOUNT-01, LR-TAB-MERGED-01
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { LiveRail } from '../../../src/views/room/LiveRail';
import type { StreamMsg } from '@claude-loom/redesign/api/types';

afterEach(() => {
  cleanup();
});

// Fixture: mixed stream with both 'tool' and 'reason' kind messages
const MIXED_STREAM: StreamMsg[] = [
  { kind: 'tool', ts: '10:00', who: 'dev', tool: 'Bash', text: 'run tests' },
  { kind: 'reason', ts: '10:01', who: 'dev', tool: undefined, text: 'thinking...' },
  { kind: 'tool', ts: '10:02', who: 'pm', tool: 'Edit', text: 'writing plan' },
  { kind: 'reason', ts: '10:03', who: 'pm', tool: undefined, text: 'analyzing...' },
];

// ---------------------------------------------------------------------------
// LR-MOUNT-01: LiveRail mounts with LIVE STREAM header in room/idle mode
// ---------------------------------------------------------------------------
describe('LiveRail — mount (LR-MOUNT-01)', () => {
  it('renders "⚡ LIVE STREAM" header when not collapsed', () => {
    render(<LiveRail stream={[]} collapsed={false} onToggle={() => {}} />);
    expect(screen.getByText(/⚡ LIVE STREAM/)).toBeInTheDocument();
  });

  it('renders the rail container when not collapsed', () => {
    const { container } = render(
      <LiveRail stream={[]} collapsed={false} onToggle={() => {}} />,
    );
    const rail = container.querySelector('.rail');
    expect(rail).not.toBeNull();
  });

  it('does NOT render rail content when collapsed=true', () => {
    const { container } = render(
      <LiveRail stream={[]} collapsed={true} onToggle={() => {}} />,
    );
    // collapsed renders null — no rail element
    const rail = container.querySelector('.rail');
    expect(rail).toBeNull();
  });

  it('renders ALL / reasoning / tools tabs', () => {
    render(<LiveRail stream={[]} collapsed={false} onToggle={() => {}} />);
    expect(screen.getByText('ALL')).toBeInTheDocument();
    expect(screen.getByText('reasoning')).toBeInTheDocument();
    expect(screen.getByText('tools')).toBeInTheDocument();
  });

  it('calls onToggle when the × close button is clicked', () => {
    let called = false;
    render(<LiveRail stream={[]} collapsed={false} onToggle={() => { called = true; }} />);
    fireEvent.click(screen.getByText('×'));
    expect(called).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// LR-TAB-MERGED-01: ALL tab shows all stream items (merged)
// ---------------------------------------------------------------------------
describe('LiveRail — merged tab (LR-TAB-MERGED-01)', () => {
  it('ALL tab is active by default', () => {
    render(<LiveRail stream={MIXED_STREAM} collapsed={false} onToggle={() => {}} />);
    const allTab = screen.getByText('ALL');
    expect(allTab.classList.contains('active')).toBe(true);
  });

  it('ALL tab shows all 4 stream items (tool + reason mixed)', () => {
    render(<LiveRail stream={MIXED_STREAM} collapsed={false} onToggle={() => {}} />);
    // In merged mode all entries should appear
    expect(screen.getByText('run tests')).toBeInTheDocument();
    expect(screen.getByText('thinking...')).toBeInTheDocument();
    expect(screen.getByText('writing plan')).toBeInTheDocument();
    expect(screen.getByText('analyzing...')).toBeInTheDocument();
  });

  it('ALL tab shows items from both tool and reason kinds', () => {
    const { container } = render(
      <LiveRail stream={MIXED_STREAM} collapsed={false} onToggle={() => {}} />,
    );
    const lines = container.querySelectorAll('.rail__line');
    // All 4 items visible in merged view
    expect(lines.length).toBe(4);
  });

  it('switching from ALL tab back to ALL tab still shows all items', () => {
    render(<LiveRail stream={MIXED_STREAM} collapsed={false} onToggle={() => {}} />);
    // Switch to reasoning then back to ALL
    fireEvent.click(screen.getByText('reasoning'));
    fireEvent.click(screen.getByText('ALL'));
    const allTab = screen.getByText('ALL');
    expect(allTab.classList.contains('active')).toBe(true);
    expect(screen.getByText('run tests')).toBeInTheDocument();
    expect(screen.getByText('thinking...')).toBeInTheDocument();
  });

  it('reasoning tab shows only reason-kind items', () => {
    render(<LiveRail stream={MIXED_STREAM} collapsed={false} onToggle={() => {}} />);
    fireEvent.click(screen.getByText('reasoning'));
    expect(screen.getByText('thinking...')).toBeInTheDocument();
    expect(screen.getByText('analyzing...')).toBeInTheDocument();
    // Tool items should NOT be visible
    expect(screen.queryByText('run tests')).toBeNull();
    expect(screen.queryByText('writing plan')).toBeNull();
  });

  it('tools tab shows only tool-kind items', () => {
    render(<LiveRail stream={MIXED_STREAM} collapsed={false} onToggle={() => {}} />);
    fireEvent.click(screen.getByText('tools'));
    expect(screen.getByText('run tests')).toBeInTheDocument();
    expect(screen.getByText('writing plan')).toBeInTheDocument();
    // Reason items should NOT be visible
    expect(screen.queryByText('thinking...')).toBeNull();
    expect(screen.queryByText('analyzing...')).toBeNull();
  });
});
